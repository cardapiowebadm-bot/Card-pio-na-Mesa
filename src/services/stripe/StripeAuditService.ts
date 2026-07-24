import { StripeAuditEventType, PaymentHistoryLog } from '../../types/financial';

export interface StripeAuditEventPayload {
  restaurantId: string;
  restaurantName?: string;
  eventType: StripeAuditEventType;
  description: string;
  performedBy?: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export class StripeAuditService {
  /**
   * Prepara a estrutura para registro de auditoria de eventos Stripe.
   * Nesta etapa de infraestrutura, registra os logs de auditoria no console.
   */
  public static logAuditEvent(payload: StripeAuditEventPayload): PaymentHistoryLog {
    const auditLog: PaymentHistoryLog = {
      id: `stripe_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      restaurantId: payload.restaurantId,
      restaurantName: payload.restaurantName || 'Restaurante',
      action: payload.eventType,
      description: payload.description,
      performedBy: payload.performedBy || 'Stripe Webhook / System',
      amount: payload.amount,
      metadata: {
        stripeIntegration: true,
        ...payload.metadata
      }
    };

    console.log('[StripeAuditService] Evento de Auditoria Registrado (Estrutura Preparada):', auditLog);
    return auditLog;
  }

  /**
   * Mapeia eventos comuns do Stripe para descrições amigáveis no histórico.
   */
  public static getEventDescription(eventType: StripeAuditEventType, details?: string): string {
    switch (eventType) {
      case 'stripe_customer_created':
        return `Cliente Stripe criado para o restaurante${details ? `: ${details}` : ''}`;
      case 'stripe_checkout_started':
        return `Sessão de checkout Stripe iniciada${details ? `: ${details}` : ''}`;
      case 'stripe_checkout_completed':
        return `Checkout da assinatura concluído com sucesso${details ? `: ${details}` : ''}`;
      case 'stripe_subscription_created':
        return `Nova assinatura de plano criada via Stripe${details ? `: ${details}` : ''}`;
      case 'stripe_upgrade':
        return `Upgrade de plano solicitado e processado no Stripe${details ? `: ${details}` : ''}`;
      case 'stripe_downgrade':
        return `Downgrade de plano processado no Stripe${details ? `: ${details}` : ''}`;
      case 'stripe_canceled':
        return `Assinatura do Stripe cancelada${details ? `: ${details}` : ''}`;
      case 'stripe_renewal':
        return `Renovação de ciclo da assinatura confirmada no Stripe${details ? `: ${details}` : ''}`;
      case 'stripe_payment_failed':
        return `Falha no processamento de pagamento da fatura no Stripe${details ? `: ${details}` : ''}`;
      default:
        return `Evento do Stripe processado (${eventType})`;
    }
  }
}
