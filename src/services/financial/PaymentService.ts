import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  query, 
  where,
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { PaymentSettings, PaymentMethodConfig, PaymentHistoryLog } from '../../types/financial';

export class PaymentService {
  private static SETTINGS_DOC_ID = 'main_settings';

  /**
   * Obtém as configurações de pagamento (Chave PIX, Stripe configs, etc)
   */
  static async getPaymentSettings(): Promise<PaymentSettings> {
    try {
      const docRef = doc(db, 'payment_settings', this.SETTINGS_DOC_ID);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as PaymentSettings;
      }
      
      // Configuração padrão inicial
      const defaultConfig: PaymentSettings = {
        pixKey: '00000000000',
        pixKeyType: 'cnpj',
        pixBeneficiary: 'Cardápio na Mesa SaaS',
        pixCity: 'São Paulo',
        autoGenerateInvoices: true,
        defaultDueDays: 5,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, defaultConfig);
      return { id: this.SETTINGS_DOC_ID, ...defaultConfig };
    } catch (err) {
      console.error('Erro ao buscar configurações de pagamento:', err);
      return {
        pixKey: '00.000.000/0001-00',
        pixKeyType: 'cnpj',
        pixBeneficiary: 'Cardápio na Mesa SaaS',
        pixCity: 'São Paulo',
        autoGenerateInvoices: true,
        defaultDueDays: 5
      };
    }
  }

  /**
   * Salva configurações de pagamento do SaaS
   */
  static async savePaymentSettings(settings: Partial<PaymentSettings>): Promise<void> {
    try {
      const docRef = doc(db, 'payment_settings', this.SETTINGS_DOC_ID);
      const payload = {
        ...settings,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, payload, { merge: true });
    } catch (err) {
      console.error('Erro ao salvar configurações de pagamento:', err);
      throw err;
    }
  }

  /**
   * Obtém lista de métodos de pagamento suportados pelo SaaS
   */
  static async getPaymentMethods(): Promise<PaymentMethodConfig[]> {
    try {
      const snap = await getDocs(collection(db, 'payment_methods'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentMethodConfig));
      }

      // Métodos padrões caso a coleção esteja vazia
      const defaults: PaymentMethodConfig[] = [
        { id: 'pix', type: 'pix', enabled: true, label: 'PIX Instantâneo' },
        { id: 'credit_card', type: 'credit_card', enabled: true, label: 'Cartão de Crédito' },
        { id: 'debit_card', type: 'debit_card', enabled: true, label: 'Cartão de Débito' },
        { id: 'stripe', type: 'stripe', enabled: false, label: 'Stripe Global (Em Preparação)' }
      ];

      for (const m of defaults) {
        await setDoc(doc(db, 'payment_methods', m.id), m);
      }
      return defaults;
    } catch (err) {
      console.error('Erro ao buscar métodos de pagamento:', err);
      return [];
    }
  }

  /**
   * Registra um evento no histórico financeiro/auditoria
   */
  static async logPaymentEvent(event: Omit<PaymentHistoryLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const cleanEvent = JSON.parse(JSON.stringify({
        ...event,
        timestamp: new Date().toISOString()
      }));
      await addDoc(collection(db, 'payment_history'), cleanEvent);
    } catch (err) {
      console.warn('Erro ao gravar log do histórico financeiro:', err);
    }
  }

  /**
   * Inscrição em tempo real no histórico financeiro
   */
  static subscribeToPaymentHistory(callback: (logs: PaymentHistoryLog[]) => void): () => void {
    const q = query(collection(db, 'payment_history'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
      const logs: PaymentHistoryLog[] = [];
      snap.forEach(d => logs.push({ id: d.id, ...d.data() } as PaymentHistoryLog));
      callback(logs);
    }, (err) => {
      console.error('Erro na assinatura do histórico financeiro:', err);
    });
  }

  /**
   * Inscrição em tempo real no histórico financeiro de um restaurante específico
   */
  static subscribeToPaymentHistoryByRestaurant(restaurantId: string, callback: (logs: PaymentHistoryLog[]) => void): () => void {
    const q = query(
      collection(db, 'payment_history'),
      where('restaurantId', '==', restaurantId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const logs: PaymentHistoryLog[] = [];
      snap.forEach(d => logs.push({ id: d.id, ...d.data() } as PaymentHistoryLog));
      callback(logs);
    }, (err) => {
      console.error(`Erro na assinatura do histórico financeiro do restaurante ${restaurantId}:`, err);
    });
  }
}


