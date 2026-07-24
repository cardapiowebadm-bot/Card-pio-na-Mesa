import Stripe from 'stripe';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { StripeService } from './StripeService';
import { StripeAuditService } from './StripeAuditService';
import { StripeSubscriptionService } from './StripeSubscriptionService';
import { SubscriptionService } from '../financial/SubscriptionService';
import { ReceiptService } from '../financial/ReceiptService';
import { PaymentService } from '../financial/PaymentService';
import { FinancialNotificationService } from '../financial/FinancialNotificationService';
import { BillingScheduler } from '../financial/BillingScheduler';
import { SubscriptionStatus, Invoice } from '../../types/financial';

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
   * Constrói e valida o evento do webhook utilizando a chave secreta de webhook (STRIPE_WEBHOOK_SECRET).
   */
  public static constructEventAndVerifySignature(
    rawBody: string | Buffer,
    signature: string
  ): Stripe.Event {
    const stripe = StripeService.getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe) {
      throw new Error('SDK do Stripe não inicializado. Verifique a chave STRIPE_SECRET_KEY.');
    }

    if (!webhookSecret || webhookSecret.trim() === '') {
      console.warn('[StripeWebhookService] STRIPE_WEBHOOK_SECRET não configurado. Assinatura não verificada rigorosamente.');
      if (typeof rawBody === 'string') {
        return JSON.parse(rawBody) as Stripe.Event;
      } else {
        return JSON.parse(rawBody.toString('utf-8')) as Stripe.Event;
      }
    }

    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  /**
   * Manipulador principal de eventos recebidos do Stripe.
   */
  public static async handleWebhookEvent(event: Stripe.Event): Promise<ProcessedWebhookResult> {
    console.log(`[StripeWebhookService] Processando evento Stripe [Type: ${event.type}] [ID: ${event.id}]`);

    // 1. Verificação de Idempotência: Ignorar se event.id já foi processado anteriormente
    if (event?.id) {
      try {
        const eventRef = doc(db, 'stripe_processed_events', event.id);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
          console.log(`[StripeWebhookService] Evento ${event.id} (${event.type}) já processado previamente. Ignorando reenvio.`);
          return {
            received: true,
            type: event.type,
            handled: true,
            message: `Evento ${event.id} já processado anteriormente.`
          };
        }
      } catch (err) {
        console.warn('Erro ao verificar idempotência de evento no Firestore:', err);
      }
    }

    const eventCreated = event.created || Math.floor(Date.now() / 1000);

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

    // 2. Registrar evento como processado para garantir idempotência em reenvios
    if (event?.id) {
      try {
        await setDoc(doc(db, 'stripe_processed_events', event.id), {
          processedAt: new Date().toISOString(),
          type: event.type,
          created: eventCreated
        });
      } catch (err) {
        console.warn('Erro ao salvar ID de evento processado:', err);
      }
    }

    return {
      received: true,
      type: event.type,
      handled: true,
      message: `Evento ${event.type} processado e sincronizado com sucesso no Firestore.`
    };
  }

  // --- BUSCA AUXILIAR DE RESTAURANTE ---
  private static async findRestaurantId(
    metadataRestId?: string, 
    customerId?: string, 
    subscriptionId?: string
  ): Promise<{ restaurantId: string | null; restaurantName: string }> {
    if (metadataRestId && metadataRestId !== 'desconhecido') {
      try {
        const restSnap = await getDoc(doc(db, 'restaurants', metadataRestId));
        if (restSnap.exists()) {
          return { restaurantId: metadataRestId, restaurantName: restSnap.data().name || 'Restaurante' };
        }
      } catch (err) {
        console.warn('Erro ao buscar restaurante por ID:', err);
      }
    }

    if (customerId) {
      try {
        const q = query(collection(db, 'restaurants'), where('stripeCustomerId', '==', customerId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          return { restaurantId: d.id, restaurantName: d.data().name || 'Restaurante' };
        }
      } catch (err) {
        console.warn('Erro ao buscar restaurante por stripeCustomerId:', err);
      }
    }

    if (subscriptionId) {
      try {
        const q = query(collection(db, 'restaurants'), where('stripeSubscriptionId', '==', subscriptionId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          return { restaurantId: d.id, restaurantName: d.data().name || 'Restaurante' };
        }
      } catch (err) {
        console.warn('Erro ao buscar restaurante por stripeSubscriptionId:', err);
      }
    }

    return { restaurantId: metadataRestId || null, restaurantName: 'Restaurante' };
  }

  // --- HANDLERS COM SINCRONIZAÇÃO NO FIRESTORE ---

  private static async checkOutOfOrder(restaurantId: string, eventCreated: number): Promise<boolean> {
    try {
      const restSnap = await getDoc(doc(db, 'restaurants', restaurantId));
      if (restSnap.exists()) {
        const data = restSnap.data();
        if (data.lastStripeEventCreated && data.lastStripeEventCreated > eventCreated) {
          console.warn(`[StripeWebhookHandler] Evento fora de ordem detectado (evento: ${eventCreated}, existente: ${data.lastStripeEventCreated}). Ignorando atualização de estado.`);
          return true; // É um evento antigo fora de ordem
        }
      }
    } catch (err) {
      console.warn('Erro ao verificar sequenciamento de eventos:', err);
    }
    return false;
  }

  private static async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, eventCreated: number): Promise<void> {
    const initialRestId = session.metadata?.restaurantId || 'desconhecido';
    const planId = session.metadata?.planId || 'gourmet';
    const customerId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id || '';
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id || '';

    const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId, subscriptionId);

    console.log(`[StripeWebhookHandler] [checkout.session.completed] Session: ${session.id}, Restaurant: ${restaurantId}`);

    if (restaurantId) {
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
            currentPeriodStart = subDetails.currentPeriodStart;
            currentPeriodEnd = subDetails.currentPeriodEnd;
            subStatus = mapStripeStatus(subDetails.status);
          }
        } catch (err) {
          console.warn('Não foi possível obter detalhes da assinatura Stripe:', err);
        }
      }

      const now = new Date().toISOString();
      const restRef = doc(db, 'restaurants', restaurantId);

      await updateDoc(restRef, {
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
      }).catch(async () => {
        await setDoc(restRef, {
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
      });

      // Upsert na coleção 'subscriptions'
      await SubscriptionService.upsertSubscription({
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
        stripeStatus: subStatus
      });

      // Registrar Histórico de Pagamentos e Auditoria
      await PaymentService.logPaymentEvent({
        restaurantId,
        restaurantName,
        action: 'plan_changed',
        description: `Checkout Stripe concluído com sucesso. Assinatura do ${getPlanName(planId)} ativada.`,
        performedBy: 'stripe_webhook',
        amount: session.amount_total ? session.amount_total / 100 : getPlanPrice(planId)
      });
    }

    await StripeAuditService.logAuditEvent({
      restaurantId: restaurantId || 'desconhecido',
      eventType: 'stripe_checkout_completed',
      description: `Checkout concluído para o restaurante (Session ID: ${session.id})`,
      amount: session.amount_total ? session.amount_total / 100 : undefined,
      metadata: { sessionId: session.id, customerId, subscriptionId }
    });
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

    console.log(`[StripeWebhookHandler] [customer.subscription.deleted] Subscription ID: ${subscription.id}, Restaurant: ${restaurantId}`);

    if (restaurantId) {
      const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
      if (isStale) return;

      const now = new Date().toISOString();
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        subscriptionStatus: 'canceled',
        lastStripeEventCreated: eventCreated,
        updatedAt: now
      }).catch(() => {});

      await SubscriptionService.upsertSubscription({
        restaurantId,
        restaurantName,
        planId: subscription.metadata?.planId || 'gourmet',
        planName: getPlanName(subscription.metadata?.planId || 'gourmet'),
        price: getPlanPrice(subscription.metadata?.planId || 'gourmet'),
        status: 'canceled',
        canceledAt: now,
        cancelReason: 'Cancelado no Stripe',
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        stripeStatus: 'canceled'
      });

      await PaymentService.logPaymentEvent({
        restaurantId,
        restaurantName,
        action: 'stripe_canceled',
        description: `Assinatura encerrada via Stripe (ID: ${subscription.id}).`,
        performedBy: 'stripe_webhook'
      });
    }

    await StripeAuditService.logAuditEvent({
      restaurantId: restaurantId || 'desconhecido',
      eventType: 'stripe_canceled',
      description: `Assinatura cancelada no Stripe (ID: ${subscription.id})`,
      metadata: { subscriptionId: subscription.id }
    });
  }

  private static async syncSubscriptionToFirestore(
    subscription: Stripe.Subscription, 
    eventType: any, 
    auditMessage: string,
    eventCreated: number
  ): Promise<void> {
    const initialRestId = subscription.metadata?.restaurantId;
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any)?.id || '';
    const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId, subscription.id);

    const priceId = subscription.items?.data[0]?.price?.id || '';
    const planId = subscription.metadata?.planId || StripeService.getPlanIdForPrice(priceId) || 'gourmet';
    const subStatus = mapStripeStatus(subscription.status);

    const subAny = subscription as any;
    const periodStart = new Date((subAny.current_period_start || 0) * 1000).toISOString();
    const periodEnd = new Date((subAny.current_period_end || 0) * 1000).toISOString();

    if (restaurantId) {
      const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
      if (isStale) return;

      const now = new Date().toISOString();
      await updateDoc(doc(db, 'restaurants', restaurantId), {
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
      }).catch(() => {});

      await SubscriptionService.upsertSubscription({
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
        stripeStatus: subscription.status
      });

      await PaymentService.logPaymentEvent({
        restaurantId,
        restaurantName,
        action: 'plan_changed',
        description: `${auditMessage} Status: ${subStatus.toUpperCase()}`,
        performedBy: 'stripe_webhook',
        amount: getPlanPrice(planId)
      });
    }

    await StripeAuditService.logAuditEvent({
      restaurantId: restaurantId || 'desconhecido',
      eventType,
      description: `${auditMessage} (Subscription ID: ${subscription.id})`,
      metadata: { subscriptionId: subscription.id, status: subscription.status }
    });
  }

  private static async handleInvoiceCreated(invoice: any): Promise<void> {
    await this.syncInvoiceToFirestore(invoice, 'em_aberto');
  }

  private static async handleInvoiceFinalized(invoice: any): Promise<void> {
    await this.syncInvoiceToFirestore(invoice, 'em_aberto');
  }

  private static async handleInvoicePaid(invoice: any, eventCreated: number): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    const initialRestId = invoice.subscription_details?.metadata?.restaurantId || invoice.metadata?.restaurantId;
    const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId);

    console.log(`[StripeWebhookHandler] [invoice.paid] Invoice ID: ${invoice.id}, Restaurant: ${restaurantId}`);

    const paidInvoice = await this.syncInvoiceToFirestore(invoice, 'pago');

    if (restaurantId) {
      const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
      if (!isStale) {
        const amountPaid = (invoice.amount_paid || 0) / 100;
        const now = new Date().toISOString();

        // Reativa restaurante se estava suspenso/bloqueado/vencido e atualiza status para ativo
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + 30);

        await updateDoc(doc(db, 'restaurants', restaurantId), {
          status: 'active',
          subscriptionStatus: 'active',
          nextDueDate: nextDue.toISOString().split('T')[0],
          renewalDate: nextDue.toISOString(),
          lastStripeEventCreated: eventCreated,
          updatedAt: now
        }).catch(() => {});

        await FinancialNotificationService.createNotification({
          restaurantId,
          restaurantName,
          type: 'payment_approved',
          title: 'Pagamento Confirmado',
          message: `O pagamento da fatura #${invoice.number || invoice.id} no valor de R$ ${amountPaid.toFixed(2)} foi aprovado com sucesso.`
        });
      }

      const amountPaid = (invoice.amount_paid || 0) / 100;
      const now = new Date().toISOString();

      // Cria recibo automático com idempotência interna
      await ReceiptService.createReceipt({
        invoiceId: paidInvoice?.id || invoice.id,
        restaurantId,
        restaurantName,
        planName: paidInvoice?.planName || 'Plano Gourmet',
        amount: amountPaid,
        paymentMethod: 'stripe',
        paidAt: now,
        notes: `Recibo de pagamento da Fatura Stripe #${invoice.number || invoice.id}`,
        performedBy: 'stripe_webhook'
      });

      await PaymentService.logPaymentEvent({
        restaurantId,
        restaurantName,
        invoiceId: paidInvoice?.id || invoice.id,
        action: 'invoice_paid',
        description: `Fatura Stripe #${invoice.number || invoice.id} Paga com Sucesso (R$ ${amountPaid.toFixed(2)})`,
        performedBy: 'stripe_webhook',
        amount: amountPaid
      });
    }

    await StripeAuditService.logAuditEvent({
      restaurantId: restaurantId || 'desconhecido',
      eventType: 'stripe_renewal',
      description: `Fatura Paga no Stripe - R$ ${((invoice.amount_paid || 0) / 100).toFixed(2)}`,
      amount: (invoice.amount_paid || 0) / 100,
      metadata: { invoiceId: invoice.id, paymentIntent: invoice.payment_intent }
    });
  }

  private static async handleInvoicePaymentFailed(invoice: any, eventCreated: number): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    const initialRestId = invoice.subscription_details?.metadata?.restaurantId || invoice.metadata?.restaurantId;
    const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId);

    console.log(`[StripeWebhookHandler] [invoice.payment_failed] Invoice ID: ${invoice.id}, Restaurant: ${restaurantId}`);

    const failedInvoice = await this.syncInvoiceToFirestore(invoice, 'vencido');

    if (restaurantId) {
      const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
      if (!isStale) {
        const now = new Date().toISOString();
        await updateDoc(doc(db, 'restaurants', restaurantId), {
          subscriptionStatus: 'past_due',
          lastStripeEventCreated: eventCreated,
          updatedAt: now
        }).catch(() => {});
      }

      await PaymentService.logPaymentEvent({
        restaurantId,
        restaurantName,
        invoiceId: failedInvoice?.id || invoice.id,
        action: 'stripe_payment_failed',
        description: `Falha na cobrança da fatura no Stripe. Status alterado para PAST_DUE.`,
        performedBy: 'stripe_webhook',
        amount: (invoice.amount_due || 0) / 100
      });
    }

    await StripeAuditService.logAuditEvent({
      restaurantId: restaurantId || 'desconhecido',
      eventType: 'stripe_payment_failed',
      description: `Falha na cobrança da fatura no Stripe (Invoice ID: ${invoice.id})`,
      amount: (invoice.amount_due || 0) / 100,
      metadata: { invoiceId: invoice.id }
    });
  }

  private static async syncInvoiceToFirestore(invoice: any, status: 'em_aberto' | 'pago' | 'vencido'): Promise<Invoice | null> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    const initialRestId = invoice.subscription_details?.metadata?.restaurantId || invoice.metadata?.restaurantId;
    const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId);

    if (!restaurantId) return null;

    const amount = (invoice.amount_due || invoice.total || 0) / 100;
    const competence = formatCompetence((invoice.created || 0) * 1000);
    const dueDate = invoice.due_date 
      ? new Date(invoice.due_date * 1000).toISOString().split('T')[0] 
      : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const stripeInvoiceId = invoice.id;

    // Busca fatura existente por stripeInvoiceId
    try {
      const q = query(collection(db, 'invoices'), where('stripeInvoiceId', '==', stripeInvoiceId));
      const snap = await getDocs(q);

      const now = new Date().toISOString();

      if (!snap.empty) {
        const existingDoc = snap.docs[0];
        const existingData = existingDoc.data() as Invoice;

        await updateDoc(existingDoc.ref, {
          status,
          paidAt: status === 'pago' ? now : existingData.paidAt,
          hostedInvoiceUrl: invoice.hosted_invoice_url || existingData.pixQrCode || '',
          invoicePdf: invoice.invoice_pdf || '',
          stripeStatus: invoice.status || status,
          updatedAt: now
        });

        return { ...existingData, id: existingDoc.id, status };
      } else {
        const id = doc(collection(db, 'invoices')).id;
        const number = invoice.number || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newInvoice: Invoice = {
          id,
          number,
          restaurantId,
          restaurantName,
          planId: invoice.metadata?.planId || 'gourmet',
          planName: getPlanName(invoice.metadata?.planId || 'gourmet'),
          amount,
          discounts: 0,
          additions: 0,
          finalAmount: amount,
          competence,
          issueDate: new Date((invoice.created || 0) * 1000).toISOString(),
          dueDate,
          status,
          paidAt: status === 'pago' ? now : undefined,
          paymentMethod: 'stripe',
          internalNotes: `Fatura gerada pelo Stripe (${stripeInvoiceId})`,
          stripeInvoiceId,
          stripeStatus: invoice.status || status,
          pixQrCode: invoice.hosted_invoice_url || '',
          createdAt: now,
          updatedAt: now
        };

        await setDoc(doc(db, 'invoices', id), newInvoice);
        return newInvoice;
      }
    } catch (err) {
      console.error('Erro ao sincronizar fatura com Firestore:', err);
      return null;
    }
  }
}
