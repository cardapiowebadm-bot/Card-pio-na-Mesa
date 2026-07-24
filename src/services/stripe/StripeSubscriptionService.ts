import { StripeService } from './StripeService';

export interface StripeSubscriptionDetails {
  id: string;
  customerId: string;
  status: string;
  priceId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  metadata: Record<string, string>;
}

export interface StripeInvoiceDetails {
  id: string;
  number: string | null;
  customerId: string;
  subscriptionId: string | null;
  amountDue: number;
  amountPaid: number;
  status: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  createdAt: string;
}

export class StripeSubscriptionService {
  /**
   * Consulta os detalhes de uma assinatura Stripe ativa ou inativa.
   */
  public static async getSubscription(subscriptionId: string): Promise<StripeSubscriptionDetails | null> {
    const stripe = StripeService.getStripeClient();

    if (!stripe || subscriptionId.startsWith('sub_mock_')) {
      console.log('[StripeSubscriptionService] [MOCK] Obtida assinatura simulated:', subscriptionId);
      return {
        id: subscriptionId,
        customerId: 'cus_mock_123',
        status: 'active',
        priceId: 'price_mock_gourmet',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: { isMock: 'true' }
      };
    }

    try {
      const sub: any = await stripe.subscriptions.retrieve(subscriptionId);
      return {
        id: sub.id,
        customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
        status: sub.status,
        priceId: sub.items?.data[0]?.price?.id || null,
        currentPeriodStart: new Date((sub.current_period_start || 0) * 1000).toISOString(),
        currentPeriodEnd: new Date((sub.current_period_end || 0) * 1000).toISOString(),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        metadata: sub.metadata || {}
      };
    } catch (error) {
      console.error('[StripeSubscriptionService] Erro ao buscar assinatura:', error);
      throw error;
    }
  }

  /**
   * Cancela uma assinatura Stripe (imediatamente ou ao final do período vigente).
   */
  public static async cancelSubscription(
    subscriptionId: string, 
    atPeriodEnd: boolean = true
  ): Promise<StripeSubscriptionDetails> {
    const stripe = StripeService.getStripeClient();

    if (!stripe || subscriptionId.startsWith('sub_mock_')) {
      console.log('[StripeSubscriptionService] [MOCK] Cancelada assinatura simulated:', subscriptionId, 'atPeriodEnd:', atPeriodEnd);
      return {
        id: subscriptionId,
        customerId: 'cus_mock_123',
        status: atPeriodEnd ? 'active' : 'canceled',
        priceId: 'price_mock_gourmet',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: atPeriodEnd,
        canceledAt: new Date().toISOString(),
        metadata: { isMock: 'true' }
      };
    }

    if (atPeriodEnd) {
      const updated: any = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      return {
        id: updated.id,
        customerId: typeof updated.customer === 'string' ? updated.customer : updated.customer.id,
        status: updated.status,
        priceId: updated.items?.data[0]?.price?.id || null,
        currentPeriodStart: new Date((updated.current_period_start || 0) * 1000).toISOString(),
        currentPeriodEnd: new Date((updated.current_period_end || 0) * 1000).toISOString(),
        cancelAtPeriodEnd: updated.cancel_at_period_end,
        canceledAt: updated.canceled_at ? new Date(updated.canceled_at * 1000).toISOString() : null,
        metadata: updated.metadata || {}
      };
    } else {
      const canceled: any = await stripe.subscriptions.cancel(subscriptionId);
      return {
        id: canceled.id,
        customerId: typeof canceled.customer === 'string' ? canceled.customer : canceled.customer.id,
        status: canceled.status,
        priceId: canceled.items?.data[0]?.price?.id || null,
        currentPeriodStart: new Date((canceled.current_period_start || 0) * 1000).toISOString(),
        currentPeriodEnd: new Date((canceled.current_period_end || 0) * 1000).toISOString(),
        cancelAtPeriodEnd: canceled.cancel_at_period_end,
        canceledAt: canceled.canceled_at ? new Date(canceled.canceled_at * 1000).toISOString() : null,
        metadata: canceled.metadata || {}
      };
    }
  }

  /**
   * Altera o plano/preço da assinatura no Stripe (Upgrade ou Downgrade).
   */
  public static async updateSubscriptionPlan(
    subscriptionId: string, 
    newPlanId: string,
    customPriceId?: string
  ): Promise<StripeSubscriptionDetails> {
    const stripe = StripeService.getStripeClient();
    const targetPriceId = customPriceId || StripeService.getPriceIdForPlan(newPlanId);

    if (!stripe || subscriptionId.startsWith('sub_mock_')) {
      console.log('[StripeSubscriptionService] [MOCK] Alterado plano da assinatura simulated:', subscriptionId, 'novo plano:', newPlanId);
      return {
        id: subscriptionId,
        customerId: 'cus_mock_123',
        status: 'active',
        priceId: targetPriceId,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: { isMock: 'true', planId: newPlanId }
      };
    }

    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = sub.items.data[0]?.id;

    if (!itemId) {
      throw new Error('Assinatura não possui itens válidos para atualização.');
    }

    const updated: any = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: itemId,
          price: targetPriceId
        }
      ],
      metadata: {
        ...sub.metadata,
        planId: newPlanId
      }
    });

    return {
      id: updated.id,
      customerId: typeof updated.customer === 'string' ? updated.customer : updated.customer.id,
      status: updated.status,
      priceId: updated.items?.data[0]?.price?.id || null,
      currentPeriodStart: new Date((updated.current_period_start || 0) * 1000).toISOString(),
      currentPeriodEnd: new Date((updated.current_period_end || 0) * 1000).toISOString(),
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      canceledAt: updated.canceled_at ? new Date(updated.canceled_at * 1000).toISOString() : null,
      metadata: updated.metadata || {}
    };
  }

  /**
   * Consulta a lista de faturas Stripe de um determinado cliente.
   */
  public static async getCustomerInvoices(customerId: string): Promise<StripeInvoiceDetails[]> {
    const stripe = StripeService.getStripeClient();

    if (!stripe || customerId.startsWith('cus_mock_')) {
      console.log('[StripeSubscriptionService] [MOCK] Faturas simuladas obtidas para customer:', customerId);
      return [
        {
          id: `in_mock_${Date.now()}`,
          number: 'INV-MOCK-001',
          customerId,
          subscriptionId: 'sub_mock_123',
          amountDue: 14900, // R$ 149,00 em centavos
          amountPaid: 14900,
          status: 'paid',
          hostedInvoiceUrl: 'https://stripe.com',
          invoicePdf: 'https://stripe.com',
          createdAt: new Date().toISOString()
        }
      ];
    }

    const list = await stripe.invoices.list({
      customer: customerId,
      limit: 20
    });

    return list.data.map((inv: any) => ({
      id: inv.id,
      number: inv.number,
      customerId: typeof inv.customer === 'string' ? inv.customer : (inv.customer?.id || customerId),
      subscriptionId: typeof inv.subscription === 'string' ? inv.subscription : (inv.subscription?.id || null),
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      status: inv.status,
      hostedInvoiceUrl: inv.hosted_invoice_url || null,
      invoicePdf: inv.invoice_pdf || null,
      createdAt: new Date(inv.created * 1000).toISOString()
    }));
  }
}
