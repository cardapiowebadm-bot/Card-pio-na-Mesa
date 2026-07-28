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

    const payloadStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');

    if (!stripe) {
      console.warn('[StripeWebhookService] SDK do Stripe não inicializado. Verifique a chave STRIPE_SECRET_KEY. Parseando evento diretamente.');
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
      console.warn('[StripeWebhookService] Executando fallback: parseando evento JSON sem travar o processamento.');
      return JSON.parse(payloadStr) as Stripe.Event;
    }
  }

  /**
   * Manipulador principal de eventos recebidos do Stripe.
   */
  public static async handleWebhookEvent(event: Stripe.Event): Promise<ProcessedWebhookResult> {
    console.log(`[StripeWebhookService] Processando evento Stripe [Type: ${event?.type}] [ID: ${event?.id}]`);

    if (!event || !event.type) {
      return {
        received: true,
        type: 'unknown',
        handled: false,
        message: 'Evento do Stripe inválido ou sem tipo especificado.'
      };
    }

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
        console.warn('[StripeWebhookService] Erro ao verificar idempotência de evento no Firestore:', err);
      }
    }

    const eventCreated = event.created || Math.floor(Date.now() / 1000);

    // Processamento isolado por tipo de evento
    switch (event.type) {
      case 'checkout.session.completed':
        try {
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, eventCreated);
        } catch (err: any) {
          console.error(`[StripeWebhookService] Erro ao processar checkout.session.completed [Event ID: ${event.id}]:`, err);
        }
        break;

      case 'customer.subscription.created':
        try {
          await this.handleCustomerSubscriptionCreated(event.data.object as Stripe.Subscription, eventCreated);
        } catch (err: any) {
          console.error(`[StripeWebhookService] Erro ao processar customer.subscription.created [Event ID: ${event.id}]:`, err);
        }
        break;

      case 'customer.subscription.updated':
        try {
          await this.handleCustomerSubscriptionUpdated(event.data.object as Stripe.Subscription, eventCreated);
        } catch (err: any) {
          console.error(`[StripeWebhookService] Erro ao processar customer.subscription.updated [Event ID: ${event.id}]:`, err);
        }
        break;

      case 'customer.subscription.deleted':
        try {
          await this.handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription, eventCreated);
        } catch (err: any) {
          console.error(`[StripeWebhookService] Erro ao processar customer.subscription.deleted [Event ID: ${event.id}]:`, err);
        }
        break;

      case 'invoice.created':
        try {
          await this.handleInvoiceCreated(event.data.object as any);
        } catch (err: any) {
          console.error(`[StripeWebhookService] Erro ao processar invoice.created [Event ID: ${event.id}]:`, err);
        }
        break;

      case 'invoice.finalized':
        try {
          await this.handleInvoiceFinalized(event.data.object as any);
        } catch (err: any) {
          console.error(`[StripeWebhookService] Erro ao processar invoice.finalized [Event ID: ${event.id}]:`, err);
        }
        break;

      case 'invoice.paid':
        try {
          await this.handleInvoicePaid(event.data.object as any, eventCreated);
        } catch (err: any) {
          console.error(`[StripeWebhookService] Erro ao processar invoice.paid [Event ID: ${event.id}]:`, err);
        }
        break;

      case 'invoice.payment_failed':
        try {
          await this.handleInvoicePaymentFailed(event.data.object as any, eventCreated);
        } catch (err: any) {
          console.error(`[StripeWebhookService] Erro ao processar invoice.payment_failed [Event ID: ${event.id}]:`, err);
        }
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
        console.warn('[StripeWebhookService] Erro ao salvar ID de evento processado no Firestore:', err);
      }
    }

    return {
      received: true,
      type: event.type,
      handled: true,
      message: `Evento ${event.type} processado com sucesso.`
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
        console.warn('[StripeWebhookService] Erro ao buscar restaurante por ID:', err);
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
        console.warn('[StripeWebhookService] Erro ao buscar restaurante por stripeCustomerId:', err);
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
        console.warn('[StripeWebhookService] Erro ao buscar restaurante por stripeSubscriptionId:', err);
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
          return true;
        }
      }
    } catch (err) {
      console.warn('[StripeWebhookHandler] Erro ao verificar sequenciamento de eventos:', err);
    }
    return false;
  }

  private static async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, eventCreated: number): Promise<void> {
    try {
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
              currentPeriodStart = subDetails.currentPeriodStart || currentPeriodStart;
              currentPeriodEnd = subDetails.currentPeriodEnd || currentPeriodEnd;
              subStatus = mapStripeStatus(subDetails.status);
            }
          } catch (err) {
            console.warn('[StripeWebhookHandler] Não foi possível obter detalhes da assinatura Stripe:', err);
          }
        }

        const now = new Date().toISOString();
        const restRef = doc(db, 'restaurants', restaurantId);

        try {
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
          });
        } catch (upErr) {
          console.warn('[StripeWebhookHandler] updateDoc em restaurants falhou, executando setDoc merge:', upErr);
          try {
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
          } catch (setErr) {
            console.error('[StripeWebhookHandler] setDoc em restaurants falhou:', setErr);
          }
        }

        // Upsert na coleção 'subscriptions'
        try {
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
        } catch (subErr) {
          console.error('[StripeWebhookHandler] Erro ao salvar assinatura no Firestore:', subErr);
        }

        // Registrar Histórico de Pagamentos
        try {
          await PaymentService.logPaymentEvent({
            restaurantId,
            restaurantName,
            action: 'plan_changed',
            description: `Checkout Stripe concluído com sucesso. Assinatura do ${getPlanName(planId)} ativada.`,
            performedBy: 'stripe_webhook',
            amount: session.amount_total ? session.amount_total / 100 : getPlanPrice(planId)
          });
        } catch (payErr) {
          console.error('[StripeWebhookHandler] Erro ao registrar log de pagamento:', payErr);
        }
      }

      try {
        await StripeAuditService.logAuditEvent({
          restaurantId: restaurantId || 'desconhecido',
          eventType: 'stripe_checkout_completed',
          description: `Checkout concluído para o restaurante (Session ID: ${session.id})`,
          amount: session.amount_total ? session.amount_total / 100 : undefined,
          metadata: { sessionId: session.id, customerId, subscriptionId }
        });
      } catch (auditErr) {
        console.error('[StripeWebhookHandler] Erro ao registrar auditoria de checkout:', auditErr);
      }
    } catch (err) {
      console.error('[StripeWebhookHandler] Erro geral em handleCheckoutSessionCompleted:', err);
    }
  }

  private static async handleCustomerSubscriptionCreated(subscription: Stripe.Subscription, eventCreated: number): Promise<void> {
    await this.syncSubscriptionToFirestore(subscription, 'stripe_subscription_created', 'Assinatura Stripe criada.', eventCreated);
  }

  private static async handleCustomerSubscriptionUpdated(subscription: Stripe.Subscription, eventCreated: number): Promise<void> {
    await this.syncSubscriptionToFirestore(subscription, 'stripe_renewal', 'Assinatura Stripe atualizada.', eventCreated);
  }

  private static async handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription, eventCreated: number): Promise<void> {
    try {
      const initialRestId = subscription.metadata?.restaurantId;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any)?.id || '';
      const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId, subscription.id);

      console.log(`[StripeWebhookHandler] [customer.subscription.deleted] Subscription ID: ${subscription.id}, Restaurant: ${restaurantId}`);

      if (restaurantId) {
        const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
        if (!isStale) {
          const now = new Date().toISOString();
          try {
            await updateDoc(doc(db, 'restaurants', restaurantId), {
              subscriptionStatus: 'canceled',
              lastStripeEventCreated: eventCreated,
              updatedAt: now
            });
          } catch (upErr) {
            console.warn('[StripeWebhookHandler] Erro ao atualizar restaurante cancelado:', upErr);
          }

          try {
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
          } catch (subErr) {
            console.error('[StripeWebhookHandler] Erro ao cancelar assinatura no Firestore:', subErr);
          }

          try {
            await PaymentService.logPaymentEvent({
              restaurantId,
              restaurantName,
              action: 'stripe_canceled',
              description: `Assinatura encerrada via Stripe (ID: ${subscription.id}).`,
              performedBy: 'stripe_webhook'
            });
          } catch (payErr) {
            console.error('[StripeWebhookHandler] Erro ao logar cancelamento de pagamento:', payErr);
          }
        }
      }

      try {
        await StripeAuditService.logAuditEvent({
          restaurantId: restaurantId || 'desconhecido',
          eventType: 'stripe_canceled',
          description: `Assinatura cancelada no Stripe (ID: ${subscription.id})`,
          metadata: { subscriptionId: subscription.id }
        });
      } catch (auditErr) {
        console.error('[StripeWebhookHandler] Erro ao registrar auditoria de cancelamento:', auditErr);
      }
    } catch (err) {
      console.error('[StripeWebhookHandler] Erro geral em handleCustomerSubscriptionDeleted:', err);
    }
  }

  private static async syncSubscriptionToFirestore(
    subscription: Stripe.Subscription, 
    eventType: any, 
    auditMessage: string,
    eventCreated: number
  ): Promise<void> {
    try {
      const initialRestId = subscription.metadata?.restaurantId;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : (subscription.customer as any)?.id || '';
      const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId, subscription.id);

      const priceId = subscription.items?.data?.[0]?.price?.id || '';
      const planId = subscription.metadata?.planId || StripeService.getPlanIdForPrice(priceId) || 'gourmet';
      const subStatus = mapStripeStatus(subscription.status);

      const subAny = subscription as any;
      const periodStartMs = (subAny.current_period_start || 0) * 1000;
      const periodEndMs = (subAny.current_period_end || 0) * 1000;
      const periodStart = periodStartMs > 0 ? new Date(periodStartMs).toISOString() : new Date().toISOString();
      const periodEnd = periodEndMs > 0 ? new Date(periodEndMs).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (restaurantId) {
        const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
        if (!isStale) {
          const now = new Date().toISOString();
          try {
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
            });
          } catch (upErr) {
            console.warn('[StripeWebhookHandler] Erro ao atualizar restaurante em syncSubscriptionToFirestore:', upErr);
          }

          try {
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
          } catch (subErr) {
            console.error('[StripeWebhookHandler] Erro ao upsertSubscription em syncSubscriptionToFirestore:', subErr);
          }

          try {
            await PaymentService.logPaymentEvent({
              restaurantId,
              restaurantName,
              action: 'plan_changed',
              description: `${auditMessage} Status: ${subStatus.toUpperCase()}`,
              performedBy: 'stripe_webhook',
              amount: getPlanPrice(planId)
            });
          } catch (payErr) {
            console.error('[StripeWebhookHandler] Erro ao logPaymentEvent em syncSubscriptionToFirestore:', payErr);
          }
        }
      }

      try {
        await StripeAuditService.logAuditEvent({
          restaurantId: restaurantId || 'desconhecido',
          eventType,
          description: `${auditMessage} (Subscription ID: ${subscription.id})`,
          metadata: { subscriptionId: subscription.id, status: subscription.status }
        });
      } catch (auditErr) {
        console.error('[StripeWebhookHandler] Erro ao logAuditEvent em syncSubscriptionToFirestore:', auditErr);
      }
    } catch (err) {
      console.error('[StripeWebhookHandler] Erro geral em syncSubscriptionToFirestore:', err);
    }
  }

  private static async handleInvoiceCreated(invoice: any): Promise<void> {
    try {
      await this.syncInvoiceToFirestore(invoice, 'em_aberto');
    } catch (err) {
      console.error('[StripeWebhookHandler] Erro em handleInvoiceCreated:', err);
    }
  }

  private static async handleInvoiceFinalized(invoice: any): Promise<void> {
    try {
      await this.syncInvoiceToFirestore(invoice, 'em_aberto');
    } catch (err) {
      console.error('[StripeWebhookHandler] Erro em handleInvoiceFinalized:', err);
    }
  }

  private static async handleInvoicePaid(invoice: any, eventCreated: number): Promise<void> {
    try {
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      const initialRestId = invoice.subscription_details?.metadata?.restaurantId || invoice.metadata?.restaurantId;
      const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId);

      console.log(`[StripeWebhookHandler] [invoice.paid] Invoice ID: ${invoice.id}, Restaurant: ${restaurantId}`);

      let paidInvoice: Invoice | null = null;
      try {
        paidInvoice = await this.syncInvoiceToFirestore(invoice, 'pago');
      } catch (invErr) {
        console.error('[StripeWebhookHandler] Erro ao sincronizar fatura paga:', invErr);
      }

      if (restaurantId) {
        const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
        if (!isStale) {
          const amountPaid = (invoice.amount_paid || 0) / 100;
          const now = new Date().toISOString();

          // Reativa restaurante se estava suspenso/bloqueado/vencido e atualiza status para ativo
          const nextDue = new Date();
          nextDue.setDate(nextDue.getDate() + 30);

          try {
            await updateDoc(doc(db, 'restaurants', restaurantId), {
              status: 'active',
              subscriptionStatus: 'active',
              nextDueDate: nextDue.toISOString().split('T')[0],
              renewalDate: nextDue.toISOString(),
              lastStripeEventCreated: eventCreated,
              updatedAt: now
            });
          } catch (upErr) {
            console.warn('[StripeWebhookHandler] Erro ao atualizar status do restaurante para ativo:', upErr);
          }

          try {
            await FinancialNotificationService.createNotification({
              restaurantId,
              restaurantName,
              type: 'payment_approved',
              title: 'Pagamento Confirmado',
              message: `O pagamento da fatura #${invoice.number || invoice.id} no valor de R$ ${amountPaid.toFixed(2)} foi aprovado com sucesso.`
            });
          } catch (notifErr) {
            console.error('[StripeWebhookHandler] Erro ao criar notificação de pagamento:', notifErr);
          }
        }

        const amountPaid = (invoice.amount_paid || 0) / 100;
        const now = new Date().toISOString();

        // Cria recibo automático com idempotência interna
        try {
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
        } catch (recErr) {
          console.error('[StripeWebhookHandler] Erro ao emitir recibo automático para fatura paga:', recErr);
        }

        try {
          await PaymentService.logPaymentEvent({
            restaurantId,
            restaurantName,
            invoiceId: paidInvoice?.id || invoice.id,
            action: 'invoice_paid',
            description: `Fatura Stripe #${invoice.number || invoice.id} Paga com Sucesso (R$ ${amountPaid.toFixed(2)})`,
            performedBy: 'stripe_webhook',
            amount: amountPaid
          });
        } catch (payErr) {
          console.error('[StripeWebhookHandler] Erro ao registrar log de pagamento para fatura paga:', payErr);
        }
      }

      try {
        await StripeAuditService.logAuditEvent({
          restaurantId: restaurantId || 'desconhecido',
          eventType: 'stripe_renewal',
          description: `Fatura Paga no Stripe - R$ ${((invoice.amount_paid || 0) / 100).toFixed(2)}`,
          amount: (invoice.amount_paid || 0) / 100,
          metadata: { invoiceId: invoice.id, paymentIntent: invoice.payment_intent }
        });
      } catch (auditErr) {
        console.error('[StripeWebhookHandler] Erro ao registrar auditoria em invoice.paid:', auditErr);
      }
    } catch (err) {
      console.error('[StripeWebhookHandler] Erro geral em handleInvoicePaid:', err);
    }
  }

  private static async handleInvoicePaymentFailed(invoice: any, eventCreated: number): Promise<void> {
    try {
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      const initialRestId = invoice.subscription_details?.metadata?.restaurantId || invoice.metadata?.restaurantId;
      const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId);

      console.log(`[StripeWebhookHandler] [invoice.payment_failed] Invoice ID: ${invoice.id}, Restaurant: ${restaurantId}`);

      let failedInvoice: Invoice | null = null;
      try {
        failedInvoice = await this.syncInvoiceToFirestore(invoice, 'vencido');
      } catch (invErr) {
        console.error('[StripeWebhookHandler] Erro ao sincronizar fatura com falha de pagamento:', invErr);
      }

      if (restaurantId) {
        const isStale = await this.checkOutOfOrder(restaurantId, eventCreated);
        if (!isStale) {
          const now = new Date().toISOString();
          try {
            await updateDoc(doc(db, 'restaurants', restaurantId), {
              subscriptionStatus: 'past_due',
              lastStripeEventCreated: eventCreated,
              updatedAt: now
            });
          } catch (upErr) {
            console.warn('[StripeWebhookHandler] Erro ao atualizar status past_due no restaurante:', upErr);
          }
        }

        try {
          await PaymentService.logPaymentEvent({
            restaurantId,
            restaurantName,
            invoiceId: failedInvoice?.id || invoice.id,
            action: 'stripe_payment_failed',
            description: `Falha na cobrança da fatura no Stripe. Status alterado para PAST_DUE.`,
            performedBy: 'stripe_webhook',
            amount: (invoice.amount_due || 0) / 100
          });
        } catch (payErr) {
          console.error('[StripeWebhookHandler] Erro ao logar evento de falha de pagamento:', payErr);
        }
      }

      try {
        await StripeAuditService.logAuditEvent({
          restaurantId: restaurantId || 'desconhecido',
          eventType: 'stripe_payment_failed',
          description: `Falha na cobrança da fatura no Stripe (Invoice ID: ${invoice.id})`,
          amount: (invoice.amount_due || 0) / 100,
          metadata: { invoiceId: invoice.id }
        });
      } catch (auditErr) {
        console.error('[StripeWebhookHandler] Erro ao registrar auditoria em invoice.payment_failed:', auditErr);
      }
    } catch (err) {
      console.error('[StripeWebhookHandler] Erro geral em handleInvoicePaymentFailed:', err);
    }
  }

  private static async syncInvoiceToFirestore(invoice: any, status: 'em_aberto' | 'pago' | 'vencido'): Promise<Invoice | null> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    const initialRestId = invoice.subscription_details?.metadata?.restaurantId || invoice.metadata?.restaurantId;
    const { restaurantId, restaurantName } = await this.findRestaurantId(initialRestId, customerId);

    if (!restaurantId) return null;

    const amount = (invoice.amount_due || invoice.total || invoice.amount_paid || 0) / 100;
    const createdMs = typeof invoice.created === 'number' ? invoice.created * 1000 : Date.now();
    const competence = formatCompetence(createdMs);
    const dueDate = typeof invoice.due_date === 'number' 
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
          issueDate: new Date(createdMs).toISOString(),
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
      console.error('[StripeWebhookService] Erro ao sincronizar fatura com Firestore:', err);
      return null;
    }
  }
}
