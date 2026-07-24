import Stripe from 'stripe';

export interface StripeConfig {
  publishableKey: string;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  prices: {
    bistro: string;
    gourmet: string;
    chef: string;
  };
}

export class StripeService {
  private static stripeInstance: Stripe | null = null;

  /**
   * Obtém a instância do SDK do Stripe com inicialização preguiçosa (Lazy Initialization).
   * Evita erros em tempo de carregamento do módulo se a chave secreta ainda não estiver configurada.
   */
  public static getStripeClient(): Stripe | null {
    if (!this.stripeInstance) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (secretKey && secretKey.trim().length > 0) {
        this.stripeInstance = new Stripe(secretKey, {
          apiVersion: '2025-02-24.acacia' as any,
          appInfo: {
            name: 'Cardápio na Mesa',
            version: '1.0.0'
          }
        });
      }
    }
    return this.stripeInstance;
  }

  /**
   * Retorna as configurações públicas e identificadores de preço configurados no ambiente.
   */
  public static getConfig(): StripeConfig {
    return {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim() !== ''),
      hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET.trim() !== ''),
      prices: {
        bistro: process.env.STRIPE_PRICE_BISTRO || '',
        gourmet: process.env.STRIPE_PRICE_GOURMET || '',
        chef: process.env.STRIPE_PRICE_CHEF || ''
      }
    };
  }

  /**
   * Retorna o ID do Preço Stripe correspondente ao código do plano interno.
   */
  public static getPriceIdForPlan(planId: string): string {
    const config = this.getConfig();
    switch (planId.toLowerCase()) {
      case 'bistro':
      case 'bistro_monthly':
        return config.prices.bistro;
      case 'gourmet':
      case 'gourmet_monthly':
        return config.prices.gourmet;
      case 'chef':
      case 'chef_monthly':
        return config.prices.chef;
      default:
        return config.prices.bistro;
    }
  }

  /**
   * Retorna o ID do plano interno a partir do Price ID do Stripe.
   */
  public static getPlanIdForPrice(priceId: string): string | null {
    const config = this.getConfig();
    if (priceId && priceId === config.prices.bistro) return 'bistro';
    if (priceId && priceId === config.prices.gourmet) return 'gourmet';
    if (priceId && priceId === config.prices.chef) return 'chef';
    return null;
  }

  /**
   * Verifica se a infraestrutura do Stripe está pronta para uso.
   */
  public static isConfigured(): boolean {
    const config = this.getConfig();
    return config.hasSecretKey;
  }
}
