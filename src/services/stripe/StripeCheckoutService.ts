import { StripeService } from './StripeService';

export interface CreateCheckoutSessionParams {
  restaurantId: string;
  planId: string;
  priceId?: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string | null;
  status: string;
}

export interface CreateCustomerPortalParams {
  customerId: string;
  returnUrl: string;
}

export interface CustomerPortalResponse {
  url: string;
}

export class StripeCheckoutService {
  /**
   * Prepara e cria uma sessão de Checkout do Stripe (Subscription Mode).
   */
  public static async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSessionResponse> {
    const stripe = StripeService.getStripeClient();

    // Determina o Price ID a ser utilizado
    const targetPriceId = params.priceId || StripeService.getPriceIdForPlan(params.planId);

    if (!stripe) {
      console.log('[StripeCheckoutService] [MOCK] Sessão de checkout criada para plano:', params.planId);
      return {
        sessionId: `cs_mock_${params.restaurantId}_${Date.now()}`,
        url: `${params.successUrl}?session_id=cs_mock_${params.restaurantId}_${Date.now()}&mock=true`,
        status: 'open'
      };
    }

    const sessionParams: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: targetPriceId,
          quantity: 1
        }
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        restaurantId: params.restaurantId,
        planId: params.planId,
        ...params.metadata
      }
    };

    if (params.customerId) {
      sessionParams.customer = params.customerId;
    } else if (params.customerEmail) {
      sessionParams.customer_email = params.customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      sessionId: session.id,
      url: session.url,
      status: session.status || 'open'
    };
  }

  /**
   * Prepara e cria uma sessão do Portal do Cliente do Stripe para gerenciamento de cobrança e cartões.
   */
  public static async createCustomerPortalSession(
    params: CreateCustomerPortalParams
  ): Promise<CustomerPortalResponse> {
    const stripe = StripeService.getStripeClient();

    if (!stripe || params.customerId.startsWith('cus_mock_')) {
      console.log('[StripeCheckoutService] [MOCK] Portal do cliente criado para customer:', params.customerId);
      return {
        url: `${params.returnUrl}?portal_mock=true`
      };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl
    });

    return {
      url: session.url
    };
  }
}
