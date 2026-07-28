import { adminDb } from '../firebaseAdmin';

export type FinancialNotificationType = 
  | 'subscription_expiring_soon'
  | 'payment_pending'
  | 'payment_approved'
  | 'subscription_canceled'
  | 'trial_ending_soon'
  | 'trial_ended'
  | 'plan_changed'
  | 'subscription_blocked'
  | 'subscription_reactivated';

export interface FinancialNotificationEvent {
  id?: string;
  restaurantId: string;
  restaurantName?: string;
  type: FinancialNotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read?: boolean;
  createdAt: string;
}

export class FinancialNotificationService {
  /**
   * Registra uma notificação/alerta financeiro preparado para integração futura com Email/WhatsApp
   */
  static async createNotification(event: Omit<FinancialNotificationEvent, 'id' | 'createdAt'>): Promise<string> {
    try {
      const payload = JSON.parse(JSON.stringify({
        ...event,
        read: false,
        createdAt: new Date().toISOString()
      }));

      // Grava na coleção 'financial_notifications'
      const docRef = await adminDb.collection('financial_notifications').add(payload);

      // Também grava na coleção 'notifications' para aparecer no Header do Restaurante
      const genericPayload = JSON.parse(JSON.stringify({
        restaurantId: event.restaurantId,
        type: event.type,
        title: event.title,
        message: event.message,
        status: 'unread',
        createdAt: new Date().toISOString()
      }));
      await adminDb.collection('notifications').add(genericPayload).catch(err => console.warn('Erro ao salvar notificação genérica:', err));

      console.log(`[FinancialNotificationService] Alerta financeiro registrado [${event.type}] para restaurante ${event.restaurantId}`);
      return docRef.id;
    } catch (err) {
      console.error('Erro ao criar notificação financeira:', err);
      return '';
    }
  }

  /**
   * Obtém notificações financeiras recentes do restaurante
   */
  static async getRestaurantNotifications(restaurantId: string, limitCount = 20): Promise<FinancialNotificationEvent[]> {
    try {
      const snap = await adminDb.collection('financial_notifications')
        .where('restaurantId', '==', restaurantId)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialNotificationEvent));
    } catch (err) {
      console.warn('Erro ao buscar notificações financeiras:', err);
      return [];
    }
  }
}

