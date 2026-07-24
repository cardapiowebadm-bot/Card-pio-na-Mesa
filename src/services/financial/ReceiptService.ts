import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  query, 
  where,
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Receipt, InvoicePaymentMethod } from '../../types/financial';
import { PaymentService } from './PaymentService';

export class ReceiptService {
  /**
   * Assinatura em tempo real de recibos emitidos
   */
  static subscribeToReceipts(callback: (receipts: Receipt[]) => void): () => void {
    const q = query(collection(db, 'receipts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const items: Receipt[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() } as Receipt));
      callback(items);
    }, (err) => {
      console.error('Erro ao assinar recibos:', err);
    });
  }

  /**
   * Assinatura em tempo real dos recibos de um restaurante específico
   */
  static subscribeToReceiptsByRestaurant(restaurantId: string, callback: (receipts: Receipt[]) => void): () => void {
    const q = query(
      collection(db, 'receipts'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const items: Receipt[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() } as Receipt));
      callback(items);
    }, (err) => {
      console.error(`Erro ao assinar recibos do restaurante ${restaurantId}:`, err);
    });
  }

  /**
   * Emite um novo recibo para uma fatura paga
   */
  static async createReceipt(params: {
    invoiceId: string;
    restaurantId: string;
    restaurantName: string;
    planName: string;
    amount: number;
    paymentMethod: InvoicePaymentMethod;
    paidAt: string;
    notes?: string;
    performedBy?: string;
  }): Promise<Receipt> {
    try {
      // Verifica se já existe um recibo emitido para esta fatura
      if (params.invoiceId) {
        const existingQ = query(collection(db, 'receipts'), where('invoiceId', '==', params.invoiceId));
        const existingSnap = await getDocs(existingQ);
        if (!existingSnap.empty) {
          const docData = existingSnap.docs[0];
          console.log(`[ReceiptService] Recibo já existente para a fatura ${params.invoiceId} (${docData.id}). Retornando existente.`);
          return { id: docData.id, ...docData.data() } as Receipt;
        }
      }

      const year = new Date().getFullYear();
      const countSnap = await getDocs(collection(db, 'receipts'));
      const nextNum = (countSnap.size + 1).toString().padStart(4, '0');
      const number = `REC-${year}-${nextNum}`;
      const id = doc(collection(db, 'receipts')).id;

      const receipt: Receipt = {
        id,
        number,
        invoiceId: params.invoiceId,
        restaurantId: params.restaurantId,
        restaurantName: params.restaurantName,
        planName: params.planName,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        paidAt: params.paidAt,
        notes: params.notes || `Recibo referente ao pagamento da fatura #${params.invoiceId}`,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'receipts', id), receipt);

      // Log no histórico
      await PaymentService.logPaymentEvent({
        restaurantId: params.restaurantId,
        restaurantName: params.restaurantName,
        invoiceId: params.invoiceId,
        action: 'receipt_issued',
        description: `Recibo #${number} emitido no valor de R$ ${params.amount.toFixed(2)}`,
        performedBy: params.performedBy || 'master_admin',
        amount: params.amount
      });

      return receipt;
    } catch (err) {
      console.error('Erro ao emitir recibo:', err);
      throw err;
    }
  }
}
