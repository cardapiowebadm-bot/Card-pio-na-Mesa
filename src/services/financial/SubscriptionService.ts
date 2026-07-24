import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Subscription, SubscriptionStatus } from '../../types/financial';
import { PaymentService } from './PaymentService';

export class SubscriptionService {
  /**
   * Assinatura em tempo real de todas as assinaturas do SaaS
   */
  static subscribeToSubscriptions(callback: (subscriptions: Subscription[]) => void): () => void {
    const q = query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const items: Subscription[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() } as Subscription));
      callback(items);
    }, (err) => {
      console.error('Erro ao assinar assinaturas:', err);
    });
  }

  /**
   * Assinatura em tempo real da assinatura de um restaurante específico
   */
  static subscribeToSubscriptionByRestaurant(restaurantId: string, callback: (subscription: Subscription | null) => void): () => void {
    const q = query(collection(db, 'subscriptions'), where('restaurantId', '==', restaurantId));
    return onSnapshot(q, (snap) => {
      if (snap.empty) {
        callback(null);
      } else {
        const docData = snap.docs[0];
        callback({ id: docData.id, ...docData.data() } as Subscription);
      }
    }, (err) => {
      console.error(`Erro ao assinar assinatura do restaurante ${restaurantId}:`, err);
    });
  }

  /**
   * Cria ou atualiza a assinatura de um restaurante
   */
  static async upsertSubscription(subData: Partial<Subscription> & { restaurantId: string; restaurantName: string }): Promise<void> {
    try {
      const id = subData.id || doc(collection(db, 'subscriptions')).id;
      const ref = doc(db, 'subscriptions', id);

      const payload: Subscription = {
        id,
        restaurantId: subData.restaurantId,
        restaurantName: subData.restaurantName,
        planId: subData.planId || 'gourmet',
        planName: subData.planName || 'Plano Gourmet',
        price: subData.price ?? 189.00,
        status: subData.status || 'active',
        startDate: subData.startDate || new Date().toISOString(),
        renewalDate: subData.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: subData.autoRenew ?? true,
        isTrial: subData.isTrial ?? false,
        trialStartDate: subData.trialStartDate,
        trialEndDate: subData.trialEndDate,
        canceledAt: subData.canceledAt,
        cancelReason: subData.cancelReason,
        
        // Campos Stripe Preparados
        stripeSubscriptionId: subData.stripeSubscriptionId || '',
        stripePriceId: subData.stripePriceId || '',
        stripeProductId: subData.stripeProductId || '',
        stripeCheckoutSessionId: subData.stripeCheckoutSessionId || '',
        stripeStatus: subData.stripeStatus || '',

        createdAt: subData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(ref, payload, { merge: true });

      await PaymentService.logPaymentEvent({
        restaurantId: subData.restaurantId,
        restaurantName: subData.restaurantName,
        action: 'plan_changed',
        description: `Assinatura do plano ${payload.planName} atualizada para status ${payload.status}`,
        performedBy: 'master_admin',
        amount: payload.price
      });
    } catch (err) {
      console.error('Erro ao salvar assinatura:', err);
      throw err;
    }
  }

  /**
   * Cancela a assinatura de um restaurante
   */
  static async cancelSubscription(subscriptionId: string, restaurantId: string, restaurantName: string, reason?: string): Promise<void> {
    try {
      const ref = doc(db, 'subscriptions', subscriptionId);
      const now = new Date().toISOString();
      
      await updateDoc(ref, {
        status: 'canceled',
        canceledAt: now,
        cancelReason: reason || 'Cancelado pelo administrador Master',
        updatedAt: now
      });

      await PaymentService.logPaymentEvent({
        restaurantId,
        restaurantName,
        action: 'invoice_canceled',
        description: `Assinatura cancelada. Motivo: ${reason || 'Sem motivo informado'}`,
        performedBy: 'master_admin'
      });
    } catch (err) {
      console.error('Erro ao cancelar assinatura:', err);
      throw err;
    }
  }
}
