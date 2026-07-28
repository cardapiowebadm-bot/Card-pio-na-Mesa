import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { 
  StripeService, 
  StripeCustomerService, 
  StripeCheckoutService, 
  StripeWebhookService 
} from './src/services/stripe/index';
import { BillingScheduler } from './src/services/financial/BillingScheduler';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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
    if (!restaurantId || !email) {
      return res.status(400).json({ error: 'restaurantId e email são obrigatórios.' });
    }

    const customer = await StripeCustomerService.createCustomer({
      restaurantId,
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
    if (!restaurantId || !planId) {
      return res.status(400).json({ error: 'restaurantId e planId são obrigatórios.' });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const finalSuccessUrl = successUrl || `${appUrl}/admin/financial?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${appUrl}/admin/financial?status=cancelled`;

    const session = await StripeCheckoutService.createCheckoutSession({
      restaurantId,
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
    
    // Se a chave secreta do agendador não estiver configurada no backend Cloud Run, bloqueia por segurança
    if (!schedulerSecret) {
      return res.status(401).json({ error: 'Acesso não autorizado. SCHEDULER_SECRET não configurada no servidor.' });
    }

    const authHeader = String(req.headers.authorization || '').trim();
    const secretHeader = String(req.headers['x-scheduler-secret'] || '').trim();
    
    const isBearerValid = authHeader === `Bearer ${schedulerSecret}`;
    const isHeaderValid = secretHeader === schedulerSecret;

    if (!isBearerValid && !isHeaderValid) {
      return res.status(401).json({ error: 'Acesso não autorizado ao agendador financeiro. Autenticação por cabeçalho inválida.' });
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
