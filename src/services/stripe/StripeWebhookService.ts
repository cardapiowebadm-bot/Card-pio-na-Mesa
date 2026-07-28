import Stripe from 'stripe';
import { StripeService } from './StripeService';
import { StripeSubscriptionService } from './StripeSubscriptionService';
import { SubscriptionStatus } from '../../types/financial';
import { 
  adminDb, 
  FIREBASE_ADMIN_PROJECT_ID, 
  FIREBASE_ADMIN_DATABASE_ID 
} from '../firebaseAdmin';

export interface ProcessedWebhookResult {
  received: boolean;
  type: string;
  handled: boolean;
  message: string;
}

function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case 'active': return 'active';
    case 'trialing': return 'trial';
    case 'past_due': return 'past_due';
    case 'unpaid': return 'unpaid';
    case 'canceled': return 'canceled';
    case 'paused': return 'paused';
    case 'incomplete':
    case 'incomplete_expired': return 'expired';
    default: return 'active';
  }
}

function getPlanName(planId: string): string {
  switch (planId) {
    case 'bistro': return 'Plano Bistrô';
    case 'gourmet': return 'Plano Gourmet';
    case 'chef': return 'Plano Chef';
    default: return `Plano ${planId ? planId.charAt(0).toUpperCase() + planId.slice(1) : 'Gourmet'}`;
  }
}

function getPlanPrice(planId: string): number {
  switch (planId) {
    case 'bistro': return 99.00;
    case 'gourmet': return 189.00;
    case 'chef': return 299.00;
    default: return 189.00;
  }
}

function formatCompetence(timestampMs: number): string {
  const d = new Date(timestampMs || Date.now());
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${year}`;
}

export class StripeWebhookService {
  /**
   * Constrói e valida o evento do webhook utilizando a chave secreta (STRIPE_WEBHOOK_SECRET).
   */
  public static constructEventAndVerifySignature(
    rawBody: string | Buffer,
    signature: string
  ): Stripe.Event {
    const stripe = StripeService.getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const payloadStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');

    if (!stripe) {
      console.warn('[StripeWebhookService] SDK do Stripe não inicializado. Parseando evento diretamente sem validação de assinatura.');
      return JSON.parse(payloadStr) as Stripe.Event;
    }

    if (!webhookSecret || webhookSecret.trim() === '') {
      console.warn('[StripeWebhookService] STRIPE_WEBHOOK_SECRET não configurado. Parseando evento sem validação estrita de assinatura.');
      return JSON.parse(payloadStr) as Stripe.Event;
    }

    try {
      return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error('[StripeWebhookService] Falha ao verificar assinatura com STRIPE_WEBHOOK_SECRET:', err.message);
      throw new Error(`Falha na validação de assinatura do webhook Stripe: ${err.message}`);
    }
  }

  /**
   * Manipulador principal de eventos recebidos do Stripe.
   */
  public static async handleWebhookEvent(event: Stripe.Event): Promise<ProcessedWebhookResult> {
    console.log(`[StripeWebhookService] Processing Stripe Event [Type: ${event?.type}] [ID: ${event?.id}] | Project: "${FIREBASE_ADMIN_PROJECT_ID}" | Database: "${FIREBASE_ADMIN_DATABASE_ID}"`);

    if (!event || !event.type) {
      return {
        received: true,
        type: 'unknown',
        handled: false,
        message: 'Evento do Stripe inválido ou sem tipo especificado.'
      };
    }

    // 1. Verificação de Idempotência
    if (event?.id) {
      try {
        const eventDoc = await adminDb.collection('stripe_processed_events').doc(event.id).get();
        if (eventDoc.exists) {
          console.log(`[StripeWebhookService] Evento ${event.id} (${event.type}) já processado previamente. Ignorando reenvio.`);
          return {
            received: true,
            type: event.type,
            handled: true,
            message: `Evento ${event.id} já processado anteriormente.`
          };
        }
      } catch (err) {
        console.warn('[StripeWebhookService] Alerta na verificação de idempotência no Firestore:', err);
      }
    }

    const eventCreated = event.created || Math.floor(Date.now() / 1000);

    // Processamento isolado por tipo de evento
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, eventCreated);
        break;

      case 'customer.subscription.created':
        await this.handleCustomerSubscriptionCreated(event.data.object as Stripe.Subscription, eventCreated);
        break;

      case 'customer.subscription.updated':
        await this.handleCustomerSubscriptionUpdated(event.data.object as Stripe.Subscription, eventCreated);
        break;

      case 'customer.subscription.deleted':
        await this.handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription, eventCreated);
        break;

      case 'invoice.created':
        await this.handleInvoiceCreated(event.data.object as any);
        break;

      case 'invoice.finalized':
        await this.handleInvoiceFinalized(event.data.object as any);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as any, eventCreated);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as any, eventCreated);
        break;

      default:
        console.log(`[StripeWebhookService] Evento não mapeado ignorado: ${event.type}`);
        return {
          received: true,
          type: event.type,
          handled: false,
          message: `Evento ${event.type} recebido e ignorado.`
        };
    }

    // 2. Registrar evento como processado
    if (event?.id) {
      try {
        await adminDb.collection('stripe_processed_events').doc(event.id).set({
          processedAt: new Date().toISOString(),
          type: event.type,
          created: eventCreated,
          projectId: FIREBASE_ADMIN_PROJECT_ID,
          databaseId: FIREBASE_ADMIN_DATABASE_ID
        });
      } catch (err) {
        console.warn('[StripeWebhookService] Erro ao registrar ID de evento processado no Firestore:', err);
      }
    }

    return {
      received: true,
      type: event.type,
      handled: true,
      message: `Evento ${event.type} processado com sucesso.`
    };
  }

  // --- BUSCA DETERMINÍSTICA DE RESTAURANTE ---
  private static async findRestaurantId(
    metadataRestId?: string, 
    customerId?: string, 
    subscriptionId?: string,
    customerEmail?: string
  ): Promise<{ restaurantId: string | null; restaurantName: string }> {
    // 1. Busca Direta por metadata restaurantId
    if (metadataRestId && metadataRestId !== 'desconhecido') {
      try {
        const restDoc = await adminDb.collection('restaurants').doc(metadataRestId).get();
        if (restDoc.exists) {
          const name = restDoc.data()?.name || 'Restaurante';
          console.log(`[StripeWebhookService] Restaurante localizado via metadata.restaurantId: ${metadataRestId} ("${name}")`);
          return { restaurantId: metadataRestId, restaurantName: name };
        } else {
          console.warn(`[StripeWebhookService] Metadata restaurantId ${metadataRestId} fornecido, mas documento não existe no Firestore.`);
        }
      } catch (err) {
        console.warn(`[StripeWebhookService] Erro ao buscar documento em restaurants/${metadataRestId}:`, err);
      }
    }

    // 2. Busca por stripeCustomerId
    if (customerId) {
      try {
        const snap = await adminDb.collection('restaurants').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const name = docSnap.data().name || 'Restaurante';
          console.log(`[StripeWebhookService] Restaurante localizado via stripeCustomerId ${customerId}: ${docSnap.id} ("${name}")`);
          return { restaurantId: docSnap.id, restaurantName: name };
        }
      } catch (err) {
        console.warn(`[StripeWebhookService] Erro ao buscar restaurante por stripeCustomerId (${customerId}):`, err);
      }
    }

    // 3. Busca por stripeSubscriptionId
    if (subscriptionId) {
      try {
        const snap = await adminDb.collection('restaurants').where('stripeSubscriptionId', '==', subscriptionId).limit(1).get();
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const name = docSnap.data().name || 'Restaurante';
          console.log(`[StripeWebhookService] Restaurante localizado via stripeSubscriptionId ${subscriptionId}: ${docSnap.id} ("${name}")`);
          return { restaurantId: docSnap.id, restaurantName: name };
        }
      } catch (err) {
        console.warn(`[StripeWebhookService] Erro ao buscar restaurante por stripeSubscriptionId (${subscriptionId}):`, err);
      }
    }

    // 4. Busca por email (Fallback secundário)
    if (customerEmail) {
      try {
        const snap = await adminDb.collection('restaurants').where('email', '==', customerEmail).limit(1).get();
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const name = docSnap.data().name || 'Restaurante';
          console.log(`[StripeWebhookService] Restaurante localizado via email (${customerEmail}): ${docSnap.id} ("${name}")`);
          return { restaurantId: docSnap.id, restaurantName: name };
        }
      } catch (err) {
        console.warn(`[StripeWebhookService] Erro ao buscar restaurante por email (${customerEmail}):`, err);
      }
    }

    console.error(`[StripeWebhookService] RESTAURANTE NÃO ENCONTRADO! Parametros: metadataRestId=${metadataRestId}, customerId=${customerId}, subId=${subscriptionId}, email=${customerEmail}`);
    return { restaurantId: null, restaurantName: 'Restaurante' };
  }

  private static async checkOutOfOrder(restaurantId: string, eventCreated: number): Promise<boolean> {
    try {
      const restDoc = await adminDb.collection('restaurants').doc(restaurantId).get();
      if (restDoc.exists) {
        const data = restDoc.data();
        if (data?.lastStripeEventCreated && data.lastStripeEventCreated > eventCreated) {
          console.warn(`[StripeWebhookService] Evento fora de ordem detectado (evento: ${eventCreated}, existente no Firestore: ${data.lastStripeEventCreated}). Ignorando atualização obsoleta.`);
          return true;
        }
      }
    } catch (err) {
      console.warn('[StripeWebhookService] Erro ao verificar sequenciamento de eventos:', err);
    }
    return false;
  }

  // --- HANDLERS COM GRAVAÇÃO CRÍTICA NO FIRESTORE (ADMIN SDK) ---

  private static async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, eventCreated: number): Promise<void> {
    const initialRestId = session.metadata?.restaurantId || (session as any).subscription_data?.metadata?.restaurantId || 'desconhecido';
    const planId = session.metadata?.planId || (session as any).subscription_data?.metadata?.planId || 'gourmet';
    const customerId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id || '';
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id || '';
    const customerEmail = session.customer_details?.email || session.customer_email || undefined;

    const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId, subscriptionId, customerEmail);

    console.log(`[StripeWebhookService] [checkout.session.completed] Session: ${session.id}, Restaurant: ${restaurantId}, Customer: ${customerId}, Plan: ${planId}`);

    if (!restaurantId) {
      throw new Error(`[checkout.session.completed] Falha crítica: Impossível identificar restaurante para a sessão Stripe ${session.id}.`);
    }

    const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
    if (isStale) return;

    let priceId = '';
    let currentPeriodStart = new Date().toISOString();
    let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let subStatus: SubscriptionStatus = 'active';

    if (subscriptionId) {
      try {
        const subDetails = await StripeSubscriptionService.getSubscription(subscriptionId);
        if (subDetails) {
          priceId = subDetails.priceId || '';
          currentPeriodStart = subDetails.currentPeriodStart || currentPeriodStart;
          currentPeriodEnd = subDetails.currentPeriodEnd || currentPeriodEnd;
          subStatus = mapStripeStatus(subDetails.status);
        }
      } catch (err) {
        console.warn('[StripeWebhookService] Não foi possível consultar detalhes da assinatura diretamente no Stripe:', err);
      }
    }

    const now = new Date().toISOString();

    // GRAVAÇÃO CRÍTICA 1: Atualizar Restaurante no Firestore via Firebase Admin SDK
    try {
      await adminDb.collection('restaurants').doc(restaurantId).set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        subscriptionStatus: subStatus,
        plan: planId,
        planId: planId,
        startDate: currentPeriodStart,
        currentPeriodStart,
        currentPeriodEnd,
        nextDueDate: currentPeriodEnd.split('T')[0],
        renewalDate: currentPeriodEnd,
        lastStripeEventCreated: eventCreated,
        updatedAt: now
      }, { merge: true });

      console.log(`[StripeWebhookService] [SUCCESS] Documento restaurants/${restaurantId} atualizado com Sucesso! Plano: ${planId}, Status: ${subStatus}`);
    } catch (dbErr: any) {
      console.error(`[StripeWebhookService] [CRITICAL ERROR] Falha ao gravar atualização do restaurante ${restaurantId} no Firestore:`, dbErr);
      throw new Error(`Erro de persistência no Firestore (restaurants/${restaurantId}): ${dbErr.message}`);
    }

    // GRAVAÇÃO CRÍTICA 2: Upsert na coleção 'subscriptions' via Firebase Admin SDK
    try {
      const subDocRef = adminDb.collection('subscriptions').doc(`sub_${restaurantId}`);
      await subDocRef.set({
        id: `sub_${restaurantId}`,
        restaurantId,
        restaurantName,
        planId,
        planName: getPlanName(planId),
        price: getPlanPrice(planId),
        status: subStatus,
        startDate: currentPeriodStart,
        renewalDate: currentPeriodEnd,
        autoRenew: true,
        isTrial: false,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        stripeStatus: subStatus,
        updatedAt: now,
        createdAt: now
      }, { merge: true });

      console.log(`[StripeWebhookService] [SUCCESS] Documento subscriptions/sub_${restaurantId} atualizado com Sucesso!`);
    } catch (subErr: any) {
      console.error(`[StripeWebhookService] [CRITICAL ERROR] Falha ao gravar documento de assinatura no Firestore:`, subErr);
      throw new Error(`Erro de persistência no Firestore (subscriptions/sub_${restaurantId}): ${subErr.message}`);
    }

    // Operações secundárias (não-fatais)
    try {
      await adminDb.collection('payment_history').add({
        restaurantId,
        restaurantName,
        action: 'plan_changed',
        description: `Checkout Stripe concluído com sucesso. Assinatura do ${getPlanName(planId)} ativada.`,
        performedBy: 'stripe_webhook',
        amount: session.amount_total ? session.amount_total / 100 : getPlanPrice(planId),
        timestamp: now,
        createdAt: now
      });
    } catch (payErr) {
      console.warn('[StripeWebhookService] Falha não-fatal ao criar log de pagamento:', payErr);
    }

    try {
      await adminDb.collection('stripe_audit_logs').add({
        restaurantId,
        eventType: 'stripe_checkout_completed',
        description: `Checkout concluído para o restaurante (Session ID: ${session.id})`,
        amount: session.amount_total ? session.amount_total / 100 : undefined,
        metadata: { sessionId: session.id, customerId, subscriptionId, planId },
        timestamp: now
      });
    } catch (auditErr) {
      console.warn('[StripeWebhookService] Falha não-fatal ao criar registro de auditoria:', auditErr);
    }
  }

  private static async handleCustomerSubscriptionCreated(subscription: Stripe.Subscription, eventCreated: number): Promise<void> {
    await this.syncSubscriptionToFirestore(subscription, 'stripe_subscription_created', 'Assinatura Stripe criada.', eventCreated);
  }

  private static async handleCustomerSubscriptionUpdated(subscription: Stripe.Subscription, eventCreated: number): Promise<void> {
    await this.syncSubscriptionToFirestore(subscription, 'stripe_renewal', 'Assinatura Stripe atualizada.', eventCreated);
  }

  private static async handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription, eventCreated: number): Promise<void> {
    const initialRestId = subscription.metadata?.restaurantId;
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any)?.id || '';
    const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId, subscription.id);

    console.log(`[StripeWebhookService] [customer.subscription.deleted] Subscription ID: ${subscription.id}, Restaurant: ${restaurantId}`);

    if (!restaurantId) {
      console.warn(`[StripeWebhookService] Assinatura ${subscription.id} cancelada, mas nenhum restaurante associado foi localizado.`);
      return;
    }

    const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
    if (isStale) return;

    const now = new Date().toISOString();

    // GRAVAÇÃO CRÍTICA: Cancelar restaurante no Firestore
    try {
      await adminDb.collection('restaurants').doc(restaurantId).set({
        subscriptionStatus: 'canceled',
        lastStripeEventCreated: eventCreated,
        updatedAt: now
      }, { merge: true });

      await adminDb.collection('subscriptions').doc(`sub_${restaurantId}`).set({
        status: 'canceled',
        canceledAt: now,
        cancelReason: 'Cancelado no Stripe',
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        stripeStatus: 'canceled',
        updatedAt: now
      }, { merge: true });

      console.log(`[StripeWebhookService] [SUCCESS] Restaurante ${restaurantId} e assinatura marcados como CANCELADOS.`);
    } catch (dbErr: any) {
      console.error(`[StripeWebhookService] Erro ao gravar cancelamento no Firestore:`, dbErr);
      throw new Error(`Erro ao persistir cancelamento no Firestore: ${dbErr.message}`);
    }

    // Operações secundárias
    try {
      await adminDb.collection('payment_history').add({
        restaurantId,
        restaurantName,
        action: 'stripe_canceled',
        description: `Assinatura encerrada via Stripe (ID: ${subscription.id}).`,
        performedBy: 'stripe_webhook',
        timestamp: now
      });
    } catch (err) {
      console.warn('[StripeWebhookService] Alerta em log de pagamento:', err);
    }
  }

  private static async syncSubscriptionToFirestore(
    subscription: Stripe.Subscription, 
    eventType: string, 
    auditMessage: string,
    eventCreated: number
  ): Promise<void> {
    const initialRestId = subscription.metadata?.restaurantId;
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any)?.id || '';
    const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId, subscription.id);

    console.log(`[StripeWebhookService] [syncSubscriptionToFirestore] Event: ${eventType}, SubID: ${subscription.id}, Restaurant: ${restaurantId}`);

    if (!restaurantId) {
      throw new Error(`[${eventType}] Falha crítica: Não foi possível localizar o restaurante para a assinatura ${subscription.id}.`);
    }

    const priceId = subscription.items?.data?.[0]?.price?.id || '';
    const planId = subscription.metadata?.planId || StripeService.getPlanIdForPrice(priceId) || 'gourmet';
    const subStatus = mapStripeStatus(subscription.status);

    const subAny = subscription as any;
    const periodStartMs = (subAny.current_period_start || 0) * 1000;
    const periodEndMs = (subAny.current_period_end || 0) * 1000;
    const periodStart = periodStartMs > 0 ? new Date(periodStartMs).toISOString() : new Date().toISOString();
    const periodEnd = periodEndMs > 0 ? new Date(periodEndMs).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
    if (isStale) return;

    const now = new Date().toISOString();

    // GRAVAÇÃO CRÍTICA: Atualizar restaurante e assinatura no Firestore
    try {
      await adminDb.collection('restaurants').doc(restaurantId).set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        subscriptionStatus: subStatus,
        plan: planId,
        planId: planId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        nextDueDate: periodEnd.split('T')[0],
        renewalDate: periodEnd,
        lastStripeEventCreated: eventCreated,
        updatedAt: now
      }, { merge: true });

      await adminDb.collection('subscriptions').doc(`sub_${restaurantId}`).set({
        id: `sub_${restaurantId}`,
        restaurantId,
        restaurantName,
        planId,
        planName: getPlanName(planId),
        price: getPlanPrice(planId),
        status: subStatus,
        startDate: periodStart,
        renewalDate: periodEnd,
        autoRenew: !subAny.cancel_at_period_end,
        isTrial: subStatus === 'trial' || subStatus === 'trialing',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeStatus: subscription.status,
        updatedAt: now
      }, { merge: true });

      console.log(`[StripeWebhookService] [SUCCESS] Sincronização de assinatura concluída com sucesso no Firestore para restaurante ${restaurantId} (Plano: ${planId}, Status: ${subStatus})`);
    } catch (dbErr: any) {
      console.error(`[StripeWebhookService] [CRITICAL ERROR] Erro na gravação do plano/assinatura no Firestore:`, dbErr);
      throw new Error(`Erro de persistência de assinatura no Firestore: ${dbErr.message}`);
    }

    // Operações secundárias
    try {
      await adminDb.collection('payment_history').add({
        restaurantId,
        restaurantName,
        action: 'plan_changed',
        description: `${auditMessage} Status: ${subStatus.toUpperCase()} (Plano: ${getPlanName(planId)})`,
        performedBy: 'stripe_webhook',
        amount: getPlanPrice(planId),
        timestamp: now
      });
    } catch (payErr) {
      console.warn('[StripeWebhookService] Falha não-fatal ao logar pagamento:', payErr);
    }
  }

  private static async handleInvoiceCreated(invoice: any): Promise<void> {
    try {
      await this.syncInvoiceToFirestore(invoice, 'em_aberto');
    } catch (err) {
      console.warn('[StripeWebhookService] Erro não-fatal em handleInvoiceCreated:', err);
    }
  }

  private static async handleInvoiceFinalized(invoice: any): Promise<void> {
    try {
      await this.syncInvoiceToFirestore(invoice, 'em_aberto');
    } catch (err) {
      console.warn('[StripeWebhookService] Erro não-fatal em handleInvoiceFinalized:', err);
    }
  }

  private static async handleInvoicePaid(invoice: any, eventCreated: number): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    const initialRestId = invoice.subscription_details?.metadata?.restaurantId || invoice.metadata?.restaurantId;
    const customerEmail = invoice.customer_email || undefined;
    const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId, invoice.subscription, customerEmail);

    console.log(`[StripeWebhookService] [invoice.paid] Invoice ID: ${invoice.id}, Restaurant: ${restaurantId}`);

    if (!restaurantId) {
      throw new Error(`[invoice.paid] Falha crítica: Não foi possível determinar o restaurante da fatura ${invoice.id}.`);
    }

    const amountPaid = (invoice.amount_paid || 0) / 100;
    const now = new Date().toISOString();

    // GRAVAÇÃO CRÍTICA 1: Sincronizar Fatura como 'pago'
    let invoiceId = invoice.id;
    try {
      const invSnap = await adminDb.collection('invoices').where('stripeInvoiceId', '==', invoice.id).limit(1).get();
      if (!invSnap.empty) {
        const invDoc = invSnap.docs[0];
        invoiceId = invDoc.id;
        await invDoc.ref.set({
          status: 'pago',
          paidAt: now,
          hostedInvoiceUrl: invoice.hosted_invoice_url || '',
          invoicePdf: invoice.invoice_pdf || '',
          stripeStatus: invoice.status || 'paid',
          updatedAt: now
        }, { merge: true });
      } else {
        const number = invoice.number || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const createdMs = typeof invoice.created === 'number' ? invoice.created * 1000 : Date.now();
        const dueDate = typeof invoice.due_date === 'number' 
          ? new Date(invoice.due_date * 1000).toISOString().split('T')[0] 
          : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const newInvoiceData = {
          id: invoice.id,
          number,
          restaurantId,
          restaurantName,
          planId: invoice.metadata?.planId || 'gourmet',
          planName: getPlanName(invoice.metadata?.planId || 'gourmet'),
          amount: amountPaid,
          discounts: 0,
          additions: 0,
          finalAmount: amountPaid,
          competence: formatCompetence(createdMs),
          issueDate: new Date(createdMs).toISOString(),
          dueDate,
          status: 'pago',
          paidAt: now,
          paymentMethod: 'stripe',
          internalNotes: `Fatura gerada e paga pelo Stripe (${invoice.id})`,
          stripeInvoiceId: invoice.id,
          stripeStatus: invoice.status || 'paid',
          pixQrCode: invoice.hosted_invoice_url || '',
          createdAt: now,
          updatedAt: now
        };
        await adminDb.collection('invoices').doc(invoice.id).set(newInvoiceData, { merge: true });
      }
      console.log(`[StripeWebhookService] [SUCCESS] Fatura ${invoice.id} sincronizada como 'pago' no Firestore.`);
    } catch (invErr: any) {
      console.error(`[StripeWebhookService] Erro crítico ao atualizar fatura no Firestore:`, invErr);
      throw new Error(`Erro de atualização da fatura no Firestore: ${invErr.message}`);
    }

    // GRAVAÇÃO CRÍTICA 2: Reativar Restaurante se Estava Suspenso/Vencido e Atualizar Próxima Vencimento
    const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
    if (!isStale) {
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + 30);

      try {
        await adminDb.collection('restaurants').doc(restaurantId).set({
          status: 'active',
          subscriptionStatus: 'active',
          nextDueDate: nextDue.toISOString().split('T')[0],
          renewalDate: nextDue.toISOString(),
          lastStripeEventCreated: eventCreated,
          updatedAt: now
        }, { merge: true });

        console.log(`[StripeWebhookService] [SUCCESS] Restaurante ${restaurantId} ativado com sucesso após invoice.paid.`);
      } catch (restErr: any) {
        console.error(`[StripeWebhookService] Erro ao atualizar status do restaurante ${restaurantId}:`, restErr);
        throw new Error(`Erro ao atualizar status do restaurante após pagamento da fatura: ${restErr.message}`);
      }
    }

    // Operações secundárias
    try {
      await adminDb.collection('receipts').doc(`rec_${invoice.id}`).set({
        id: `rec_${invoice.id}`,
        invoiceId,
        restaurantId,
        restaurantName,
        planName: getPlanName(invoice.metadata?.planId || 'gourmet'),
        amount: amountPaid,
        paymentMethod: 'stripe',
        paidAt: now,
        notes: `Recibo de pagamento da Fatura Stripe #${invoice.number || invoice.id}`,
        performedBy: 'stripe_webhook',
        createdAt: now
      }, { merge: true });
    } catch (recErr) {
      console.warn('[StripeWebhookService] Falha ao gerar recibo no Firestore:', recErr);
    }

    try {
      await adminDb.collection('financial_notifications').add({
        restaurantId,
        restaurantName,
        type: 'payment_approved',
        title: 'Pagamento Confirmado',
        message: `O pagamento da fatura #${invoice.number || invoice.id} no valor de R$ ${amountPaid.toFixed(2)} foi aprovado com sucesso.`,
        read: false,
        createdAt: now
      });
    } catch (notifErr) {
      console.warn('[StripeWebhookService] Falha ao criar notificação de pagamento:', notifErr);
    }
  }

  private static async handleInvoicePaymentFailed(invoice: any, eventCreated: number): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    const initialRestId = invoice.subscription_details?.metadata?.restaurantId || invoice.metadata?.restaurantId;
    const customerEmail = invoice.customer_email || undefined;
    const { restaurantId } = await this.findRestaurantId(initialRestId, customerId, invoice.subscription, customerEmail);

    console.log(`[StripeWebhookService] [invoice.payment_failed] Invoice ID: ${invoice.id}, Restaurant: ${restaurantId}`);

    if (restaurantId) {
      const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
      if (!isStale) {
        const now = new Date().toISOString();
        try {
          await adminDb.collection('restaurants').doc(restaurantId).set({
            subscriptionStatus: 'past_due',
            lastStripeEventCreated: eventCreated,
            updatedAt: now
          }, { merge: true });
        } catch (upErr) {
          console.warn('[StripeWebhookService] Erro ao atualizar status past_due no restaurante:', upErr);
        }
      }
    }
  }

  private static async syncInvoiceToFirestore(invoice: any, status: 'em_aberto' | 'pago' | 'vencido'): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    const initialRestId = invoice.subscription_details?.metadata?.restaurantId || invoice.metadata?.restaurantId;
    const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId, invoice.subscription);

    if (!restaurantId) return;

    const amount = (invoice.amount_due || invoice.total || invoice.amount_paid || 0) / 100;
    const createdMs = typeof invoice.created === 'number' ? invoice.created * 1000 : Date.now();
    const competence = formatCompetence(createdMs);
    const dueDate = typeof invoice.due_date === 'number' 
      ? new Date(invoice.due_date * 1000).toISOString().split('T')[0] 
      : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const now = new Date().toISOString();

    await adminDb.collection('invoices').doc(invoice.id).set({
      id: invoice.id,
      number: invoice.number || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      restaurantId,
      restaurantName,
      planId: invoice.metadata?.planId || 'gourmet',
      planName: getPlanName(invoice.metadata?.planId || 'gourmet'),
      amount,
      discounts: 0,
      additions: 0,
      finalAmount: amount,
      competence,
      issueDate: new Date(createdMs).toISOString(),
      dueDate,
      status,
      paidAt: status === 'pago' ? now : null,
      paymentMethod: 'stripe',
      internalNotes: `Fatura gerada pelo Stripe (${invoice.id})`,
      stripeInvoiceId: invoice.id,
      stripeStatus: invoice.status || status,
      pixQrCode: invoice.hosted_invoice_url || '',
      updatedAt: now
    }, { merge: true });
  }
}
