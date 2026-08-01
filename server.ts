import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { adminDb, getAdminApp } from './src/services/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { 
  StripeService, 
  StripeCustomerService, 
  StripeCheckoutService, 
  StripeWebhookService 
} from './src/services/stripe/index';
import { BillingScheduler } from './src/services/financial/BillingScheduler';

dotenv.config();

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? (Number(process.env.PORT) || 3000) : 3000;

// Configuração de CORS universal para permitir acesso do Netlify (https://cardapionamesa.netlify.app), Cloud Run e domínios locais
app.use((req, res, next) => {
  const origin = (req.headers.origin as string) || '';
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-scheduler-secret, stripe-signature, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Webhook do Stripe precisa de raw body para validação de assinatura se enviado como stream
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = (req.headers['stripe-signature'] as string) || '';
    let payload = req.body;

    if (Buffer.isBuffer(payload)) {
      payload = payload.toString('utf-8');
    } else if (typeof payload === 'object') {
      payload = JSON.stringify(payload);
    }

    let event: any;
    try {
      event = StripeWebhookService.constructEventAndVerifySignature(payload, sig);
    } catch (err: any) {
      console.error('Falha na validação da assinatura do Webhook Stripe:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const result = await StripeWebhookService.handleWebhookEvent(event);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Webhook Endpoint] ERRO CRÍTICO no processamento do webhook Stripe:', error);
    return res.status(500).json({ 
      received: false, 
      handled: false, 
      message: 'Erro interno ao processar e gravar evento do webhook.',
      error: error.message || 'Erro de processamento no servidor.'
    });
  }
});

app.use(express.json());

// --- ENDPOINTS STRIPE (ESTRUTURA DE INFRAESTRUTURA) ---

app.get('/api/stripe/config', (req, res) => {
  try {
    const config = StripeService.getConfig();
    res.json({
      configured: config.hasSecretKey,
      publishableKey: config.publishableKey,
      prices: config.prices
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stripe/customer', async (req, res) => {
  try {
    const { restaurantId, name, email, phone, documentNumber, metadata } = req.body;
    const cleanRestaurantId = String(restaurantId || '').trim();
    if (!cleanRestaurantId || !email) {
      return res.status(400).json({ error: 'restaurantId e email são obrigatórios.' });
    }

    const customer = await StripeCustomerService.createCustomer({
      restaurantId: cleanRestaurantId,
      name: name || 'Restaurante',
      email,
      phone,
      documentNumber,
      metadata
    });

    res.json({ success: true, customer });
  } catch (error: any) {
    console.error('Erro no endpoint POST /api/stripe/customer:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar cliente Stripe.' });
  }
});

app.post('/api/stripe/checkout', async (req, res) => {
  try {
    const { restaurantId, planId, priceId, customerId, customerEmail, successUrl, cancelUrl, metadata } = req.body;
    const cleanRestaurantId = String(restaurantId || '').trim();
    if (!cleanRestaurantId || !planId) {
      return res.status(400).json({ error: 'restaurantId e planId são obrigatórios.' });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const finalSuccessUrl = successUrl || `${appUrl}/admin/financial?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${appUrl}/admin/financial?status=cancelled`;

    const session = await StripeCheckoutService.createCheckoutSession({
      restaurantId: cleanRestaurantId,
      planId,
      priceId,
      customerId,
      customerEmail,
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
      metadata
    });

    res.json({ success: true, session });
  } catch (error: any) {
    console.error('Erro no endpoint POST /api/stripe/checkout:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar sessão de checkout Stripe.' });
  }
});

app.post('/api/stripe/customer-portal', async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'customerId é obrigatório.' });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const finalReturnUrl = returnUrl || `${appUrl}/admin/financial`;

    const portal = await StripeCheckoutService.createCustomerPortalSession({
      customerId,
      returnUrl: finalReturnUrl
    });

    res.json({ success: true, url: portal.url });
  } catch (error: any) {
    console.error('Erro no endpoint POST /api/stripe/customer-portal:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar portal do cliente Stripe.' });
  }
});

// Endpoint do Agendador de Automações Financeiras (Cloud Scheduler / Cron)
app.all('/api/scheduler/billing-check', async (req, res) => {
  try {
    const schedulerSecret = process.env.SCHEDULER_SECRET;
    
    // Se SCHEDULER_SECRET estiver configurada no backend, exige autenticação
    if (schedulerSecret) {
      const authHeader = String(req.headers.authorization || '').trim();
      const secretHeader = String(req.headers['x-scheduler-secret'] || '').trim();
      
      const isBearerValid = authHeader === `Bearer ${schedulerSecret}`;
      const isHeaderValid = secretHeader === schedulerSecret;

      if (!isBearerValid && !isHeaderValid) {
        return res.status(401).json({ error: 'Acesso não autorizado ao agendador financeiro. Autenticação por cabeçalho inválida.' });
      }
    }

    const force = req.query.force === 'true' || req.body?.force === true;
    const result = await BillingScheduler.runAllAutomations(force);
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Erro no endpoint /api/scheduler/billing-check:', error);
    res.status(500).json({ error: error.message || 'Erro ao executar automações financeiras.' });
  }
});


// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn("GEMINI_API_KEY is not defined. AI functions will return error.");
}

// Ensure AI is available
function getAiClient() {
  if (!ai) {
    throw new Error('GEMINI_API_KEY environment variable is not defined.');
  }
  return ai;
}

// AI Endpoints
app.post('/api/gemini/generate-description', async (req, res) => {
  try {
    const { name, category, details } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const client = getAiClient();
    const prompt = `Gere uma descrição profissional, atraente e extremamente apetitosa para um prato de restaurante com os seguintes dados:
Nome: ${name}
Categoria: ${category || 'Não especificada'}
Detalhes/Ingredientes: ${details || 'Nenhum detalhe fornecido'}

A descrição deve ser curta (máximo 3 frases), elegante e convencer o cliente a comprar. Escreva em Português do Brasil.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ result: response.text?.trim() });
  } catch (error: any) {
    console.error("AI Generate Description Error:", error);
    res.status(500).json({ error: error.message || 'Erro ao gerar descrição do prato.' });
  }
});

app.post('/api/gemini/suggest-names', async (req, res) => {
  try {
    const { ingredients, category } = req.body;
    if (!ingredients) {
      return res.status(400).json({ error: 'Ingredients are required' });
    }

    const client = getAiClient();
    const prompt = `Sugira 5 nomes criativos, gourmet e comerciais para pratos baseados nos seguintes ingredientes ou conceito:
Ingredientes/Conceito: ${ingredients}
Categoria: ${category || 'Geral'}

Retorne apenas uma lista simples de 5 itens numerados de 1 a 5, sem outros comentários ou introduções.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ result: response.text?.trim() });
  } catch (error: any) {
    console.error("AI Suggest Names Error:", error);
    res.status(500).json({ error: error.message || 'Erro ao sugerir nomes.' });
  }
});

app.post('/api/gemini/correct-text', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const client = getAiClient();
    const prompt = `Corrija a gramática, ortografia e melhore o estilo e elegância do seguinte texto para um cardápio de restaurante de forma profissional:
Texto: "${text}"

Retorne apenas o texto corrigido e polido, sem aspas, explicações, observações ou introduções.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ result: response.text?.trim() });
  } catch (error: any) {
    console.error("AI Correct Text Error:", error);
    res.status(500).json({ error: error.message || 'Erro ao corrigir texto.' });
  }
});

app.post('/api/gemini/translate-menu', async (req, res) => {
  try {
    const { name, description, targetLanguage } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const lang = targetLanguage || 'Inglês';

    const client = getAiClient();
    const prompt = `Traduza o nome e a descrição do prato do cardápio a seguir para o idioma: ${lang}.
Nome Original: ${name}
Descrição Original: ${description || 'Sem descrição'}

Retorne a resposta EXCLUSIVAMENTE em formato JSON com as seguintes chaves:
{
  "name": "nome traduzido",
  "description": "descrição traduzida"
}
Não adicione tags markdown de código (como \`\`\`json), nem introduções ou explicações. Retorne apenas o JSON puro.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    let cleanedText = response.text?.trim() || '{}';
    // Remove markdown codeblock backticks if Gemini includes them
    cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();

    try {
      const parsed = JSON.parse(cleanedText);
      res.json(parsed);
    } catch (parseError) {
      console.error("JSON Parsing Error from Gemini:", cleanedText);
      res.json({ name: `${name} (${lang})`, description: `${description} (${lang})` });
    }
  } catch (error: any) {
    console.error("AI Translate Error:", error);
    res.status(500).json({ error: error.message || 'Erro ao traduzir cardápio.' });
  }
});

app.post('/api/gemini/suggest-promotions', async (req, res) => {
  try {
    const { products } = req.body; // Array of product objects: { name, price, category }
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    const client = getAiClient();
    const productsList = products.map(p => `- ${p.name} (R$ ${p.price}) [${p.category}]`).join('\n');

    const prompt = `Com base nesta lista de produtos disponíveis em meu restaurante:
${productsList}

Sugira 3 ideias de promoções atraentes, combos de vendas casadas (combos de prato + bebida, combos de casal, etc.) ou descontos estratégicos.
Para cada promoção sugira:
1. Um nome atrativo para a promoção
2. Quais produtos compõem o combo
3. O preço sugerido com o desconto estratégico
4. Um breve argumento de venda explicando por que essa promoção é lucrativa e atrativa.

Escreva de forma atraente, profissional e objetiva em Português do Brasil.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ result: response.text?.trim() });
  } catch (error: any) {
    console.error("AI Suggest Promotions Error:", error);
    res.status(500).json({ error: error.message || 'Erro ao sugerir promoções.' });
  }
});

// --- ENDPOINT PARA CRIAÇÃO E ENVIO DE PEDIDOS (SERVER-SIDE VIA FIREBASE ADMIN) ---
app.post('/api/orders', async (req, res) => {
  try {
    const { restaurantId, tableSessionId, items, createdBy, waiterId, waiterName } = req.body;

    const cleanRestaurantId = String(restaurantId || '').trim();
    const cleanTableSessionId = String(tableSessionId || '').trim();

    if (!cleanRestaurantId) {
      return res.status(400).json({ success: false, error: 'ID do restaurante não informado.' });
    }
    if (!cleanTableSessionId) {
      return res.status(400).json({ success: false, error: 'Sessão da mesa não informada.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'O carrinho está vazio.' });
    }

    // 1. Validar existência do Restaurante e obter configurações de taxas
    const restDoc = await adminDb.collection('restaurants').doc(cleanRestaurantId).get();
    if (!restDoc.exists) {
      return res.status(400).json({ success: false, error: 'Restaurante não encontrado.' });
    }
    const restaurantData = restDoc.data() || {};

    // 2. Validar existência e status da Sessão da Mesa
    const sessionDoc = await adminDb.collection('tableSessions').doc(cleanTableSessionId).get();
    if (!sessionDoc.exists) {
      return res.status(400).json({ success: false, error: 'Sessão da mesa não encontrada.' });
    }
    const sessionData = sessionDoc.data() || {};

    if (sessionData.status !== 'active') {
      return res.status(400).json({ success: false, error: 'A sessão desta mesa não está ativa.' });
    }

    const tableId = sessionData.tableId || '';
    const tableNumber = sessionData.tableNumber || 0;
    const customerName = sessionData.customerName || 'Cliente';
    const customerPhone = sessionData.customerPhone || '';

    // Consultar pedidos anteriores na mesma sessão para evitar cobrança duplicada de taxas fixas
    const sessionOrdersSnap = await adminDb
      .collection('orders')
      .where('tableSessionId', '==', cleanTableSessionId)
      .get();

    const hasServiceTaxBefore = sessionOrdersSnap.docs.some(
      doc => (doc.data().serviceTax || 0) > 0
    );
    const hasCouvertBefore = sessionOrdersSnap.docs.some(
      doc => (doc.data().couvert || 0) > 0
    );

    // 3. Validar produtos existentes, ativos, quantidades e RE-CONSULTAR PREÇOS NO FIRESTORE
    let serverSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const productId = String(item.productId || '').trim();
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const notes = String(item.notes || '').trim().substring(0, 300);

      if (!productId) {
        return res.status(400).json({ success: false, error: 'ID de produto inválido no carrinho.' });
      }

      const prodDoc = await adminDb.collection('products').doc(productId).get();
      if (!prodDoc.exists) {
        return res.status(400).json({ success: false, error: `Produto não encontrado no cardápio (ID: ${productId}).` });
      }

      const prodData = prodDoc.data() || {};

      if (prodData.available === false) {
        return res.status(400).json({
          success: false,
          error: `O produto "${prodData.name || 'solicitado'}" não está disponível no momento.`
        });
      }

      // Preço oficial do Firestore (sem confiar no preço enviado pelo navegador)
      let unitPrice = Number(prodData.price) || 0;
      if (prodData.onSale && typeof prodData.salePrice === 'number' && prodData.salePrice >= 0) {
        unitPrice = prodData.salePrice;
      }

      const itemSubtotal = unitPrice * quantity;
      serverSubtotal += itemSubtotal;

      validatedItems.push({
        productId,
        name: prodData.name || 'Produto',
        price: unitPrice,
        quantity,
        notes
      });
    }

    // 4. Calcular Taxa de Serviço e Couvert no Servidor
    let serviceTaxValue = 0;
    if (restaurantData.serviceTaxEnabled !== false) {
      const taxType = restaurantData.serviceTaxType || 'percentage';
      const taxVal = restaurantData.serviceTaxValue !== undefined ? Number(restaurantData.serviceTaxValue) : 10;
      if (taxType === 'percentage') {
        serviceTaxValue = (taxVal / 100) * serverSubtotal;
      } else {
        serviceTaxValue = hasServiceTaxBefore ? 0 : taxVal;
      }
    }

    let couvertValue = 0;
    if (restaurantData.couvertEnabled) {
      const couvertType = restaurantData.couvertType || 'fixed';
      const couvertVal = restaurantData.couvertValue !== undefined ? Number(restaurantData.couvertValue) : 0;
      if (couvertType === 'percentage') {
        couvertValue = (couvertVal / 100) * serverSubtotal;
      } else {
        couvertValue = hasCouvertBefore ? 0 : couvertVal;
      }
    }

    const serverTotal = serverSubtotal + serviceTaxValue + couvertValue;

    // 5. Gravar Pedido no Firestore usando firebaseAdmin
    const nowIso = new Date().toISOString();
    const orderRef = adminDb.collection('orders').doc();

    const orderCreatedBy = createdBy === 'waiter' ? 'waiter' : 'customer';
    const effectiveWaiterId = waiterId || sessionData.waiterId || null;
    const effectiveWaiterName = waiterName || sessionData.waiterName || null;

    const newOrder: Record<string, any> = {
      id: orderRef.id,
      tableSessionId: cleanTableSessionId,
      tableId,
      tableNumber,
      restaurantId: cleanRestaurantId,
      items: validatedItems,
      subtotal: serverSubtotal,
      serviceTax: serviceTaxValue,
      couvert: couvertValue,
      total: serverTotal,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
      customerName,
      customerPhone,
      createdBy: orderCreatedBy
    };

    if (effectiveWaiterId) newOrder.waiterId = effectiveWaiterId;
    if (effectiveWaiterName) newOrder.waiterName = effectiveWaiterName;

    await orderRef.set(newOrder);

    // 6. Atualizar Histórico na Sessão da Mesa (Server-Side)
    try {
      const orderCode = orderRef.id.substring(0, 5).toUpperCase();
      const actionUserType = orderCreatedBy === 'waiter' ? 'waiter' : 'customer';
      const actionUserName = orderCreatedBy === 'waiter' ? (effectiveWaiterName || 'Garçom') : customerName;

      await adminDb.collection('tableSessions').doc(cleanTableSessionId).update({
        history: FieldValue.arrayUnion({
          timestamp: nowIso,
          action: 'Pedido Realizado',
          userType: actionUserType,
          userName: actionUserName,
          details: `Realizou o pedido #${orderCode} no total de R$ ${serverTotal.toFixed(2)}.`
        })
      });
    } catch (histErr: any) {
      console.warn('[POST /api/orders] Aviso ao atualizar histórico da sessão:', histErr.message);
    }

    // 7. Criar Notificação para a Cozinha/Painel (Server-Side)
    try {
      await adminDb.collection('notifications').add({
        restaurantId: cleanRestaurantId,
        type: 'new_order',
        message: `Novo pedido de R$ ${serverTotal.toFixed(2)} para a Mesa ${tableNumber}`,
        status: 'unread',
        referenceId: orderRef.id,
        tableNumber,
        createdAt: nowIso
      });
    } catch (notifErr: any) {
      console.warn('[POST /api/orders] Aviso ao criar notificação:', notifErr.message);
    }

    // 8. Atualizar Status da Mesa para Ocupada (Server-Side)
    if (tableId) {
      try {
        await adminDb.collection('tables').doc(tableId).update({
          status: 'occupied'
        });
      } catch (tblErr: any) {
        console.warn('[POST /api/orders] Aviso ao atualizar mesa:', tblErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      orderId: orderRef.id,
      total: serverTotal,
      message: 'Pedido enviado com sucesso para a cozinha!'
    });
  } catch (error: any) {
    console.error('[POST /api/orders] ERRO CRÍTICO no envio de pedido:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar e salvar pedido no servidor.',
      details: error.message || 'Erro desconhecido.'
    });
  }
});

// --- ENDPOINT PARA CADASTRO DE GARÇONS (SERVER-SIDE VIA FIREBASE ADMIN) ---
app.post('/api/waiters', async (req, res) => {
  try {
    const rawEmailInput = String(req.body.email || req.body.login || '').trim().toLowerCase();
    const rawLoginInput = String(req.body.login || '').trim().toLowerCase();

    let email = rawEmailInput;
    if (!email && rawLoginInput) {
      email = rawLoginInput.includes('@') ? rawLoginInput : `${rawLoginInput}@temp.cardapionamesa.com`;
    } else if (email && !email.includes('@')) {
      email = `${email}@temp.cardapionamesa.com`;
    }

    const name = String(req.body.name || req.body.nome || '').trim();
    const phone = String(req.body.phone || req.body.telefone || '').trim();
    const password = String(req.body.password || req.body.senha || req.body.passwordTemp || '').trim();
    const restaurantId = String(req.body.restaurantId || '').trim();
    const rawLogin = rawLoginInput || (email.split('@')[0] || '').trim();

    // 1. Validações de campos obrigatórios
    if (!name) {
      return res.status(400).json({ success: false, error: 'Nome do garçom é obrigatório.' });
    }
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Telefone do garçom é obrigatório.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Informe um e-mail válido.' });
    }

    // Validação de senha: min 8 caracteres, 1 letra, 1 número
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, error: 'A senha deve ter pelo menos 8 caracteres.' });
    }
    if (!/[a-zA-Z]/.test(password)) {
      return res.status(400).json({ success: false, error: 'A senha deve conter pelo menos uma letra.' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ success: false, error: 'A senha deve conter pelo menos um número.' });
    }

    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'ID do restaurante é obrigatório.' });
    }

    const adminAuth = getAdminAuth(getAdminApp());

    // 2. Criar o usuário no Firebase Auth usando Firebase Admin
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });
    } catch (authErr: any) {
      if (
        authErr.code === 'auth/email-already-in-use' ||
        authErr.message?.includes('already in use') ||
        authErr.message?.includes('already exists')
      ) {
        return res.status(409).json({ success: false, error: 'Este e-mail já está cadastrado.' });
      }
      if (
        authErr.code === 'auth/invalid-email' ||
        authErr.message?.includes('invalid email')
      ) {
        return res.status(400).json({ success: false, error: 'Informe um e-mail válido.' });
      }
      console.error('[POST /api/waiters] Erro ao criar usuário no Auth:', authErr);
      return res.status(400).json({ success: false, error: authErr.message || 'Erro ao criar usuário do garçom.' });
    }

    const uid = userRecord.uid;
    const nowIso = new Date().toISOString();

    // 3. Criar o documento na coleção 'waiters' (NÃO salvar a senha no Firestore)
    const waiterRef = adminDb.collection('waiters').doc();
    const waiterDocData = {
      id: waiterRef.id,
      restaurantId,
      name,
      nome: name,
      phone,
      telefone: phone,
      login: rawLogin,
      email,
      status: 'active',
      isFirstAccess: true,
      userId: uid,
      uid,
      role: 'waiter',
      createdAt: nowIso,
      updatedAt: nowIso
    };
    await waiterRef.set(waiterDocData);

    // 4. Criar o documento correspondente na coleção 'users' (NÃO salvar a senha no Firestore)
    const userDocData = {
      id: uid,
      uid,
      name,
      nome: name,
      email,
      phone,
      telefone: phone,
      role: 'waiter',
      restaurantId,
      waiterDocId: waiterRef.id,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso
    };
    await adminDb.collection('users').doc(uid).set(userDocData, { merge: true });

    return res.status(201).json({
      success: true,
      uid,
      waiterId: waiterRef.id,
      message: 'Garçom cadastrado com sucesso!'
    });
  } catch (error: any) {
    console.error('[POST /api/waiters] ERRO CRÍTICO ao cadastrar garçom:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao cadastrar garçom no servidor.',
      details: error.message || 'Erro desconhecido.'
    });
  }
});

// Setup Vite Dev Server / Static files
async function start() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
          } else if (filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
          }
        }
      }));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

start();
