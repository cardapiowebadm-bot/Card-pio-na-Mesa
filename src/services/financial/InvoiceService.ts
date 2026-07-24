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
import { Invoice, InvoiceStatus, InvoicePaymentMethod, InvoiceHistoryEntry } from '../../types/financial';
import { PaymentService } from './PaymentService';
import { ReceiptService } from './ReceiptService';

export class InvoiceService {
  /**
   * Assinatura em tempo real de faturas do SaaS
   */
  static subscribeToInvoices(callback: (invoices: Invoice[]) => void): () => void {
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const items: Invoice[] = [];
      snap.forEach(d => {
        const data = d.data() as Invoice;
        // Atualiza dinamicamente status para 'vencido' se a data passou e status é 'em_aberto'
        let currentStatus = data.status;
        if (currentStatus === 'em_aberto' && data.dueDate) {
          const due = new Date(data.dueDate);
          due.setHours(23, 59, 59, 999);
          if (new Date() > due) {
            currentStatus = 'vencido';
          }
        }
        items.push({ ...data, id: d.id, status: currentStatus });
      });
      callback(items);
    }, (err) => {
      console.error('Erro ao assinar faturas:', err);
    });
  }

  /**
   * Assinatura em tempo real de faturas de um restaurante específico
   */
  static subscribeToInvoicesByRestaurant(restaurantId: string, callback: (invoices: Invoice[]) => void): () => void {
    const q = query(
      collection(db, 'invoices'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const items: Invoice[] = [];
      snap.forEach(d => {
        const data = d.data() as Invoice;
        let currentStatus = data.status;
        if (currentStatus === 'em_aberto' && data.dueDate) {
          const due = new Date(data.dueDate);
          due.setHours(23, 59, 59, 999);
          if (new Date() > due) {
            currentStatus = 'vencido';
          }
        }
        items.push({ ...data, id: d.id, status: currentStatus });
      });
      callback(items);
    }, (err) => {
      console.error(`Erro ao assinar faturas do restaurante ${restaurantId}:`, err);
    });
  }

  /**
   * Gera número sequencial de fatura (ex: INV-2026-0001)
   */
  private static async generateInvoiceNumber(): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const snap = await getDocs(collection(db, 'invoices'));
      const nextNum = (snap.size + 1).toString().padStart(4, '0');
      return `INV-${year}-${nextNum}`;
    } catch {
      return `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }

  /**
   * Cria uma nova fatura
   */
  static async createInvoice(params: {
    restaurantId: string;
    restaurantName: string;
    planId: string;
    planName: string;
    amount: number;
    discounts?: number;
    additions?: number;
    competence: string; // ex: '07/2026'
    dueDate: string; // YYYY-MM-DD
    internalNotes?: string;
    performedBy?: string;
  }): Promise<Invoice> {
    try {
      const id = doc(collection(db, 'invoices')).id;
      const number = await this.generateInvoiceNumber();
      const now = new Date().toISOString();
      const discounts = params.discounts || 0;
      const additions = params.additions || 0;
      const finalAmount = Math.max(0, params.amount - discounts + additions);

      // Busca configurações de PIX para injetar QR Code e Payload PIX mockados/reais
      const settings = await PaymentService.getPaymentSettings();

      // Mock de payload PIX estático / estruturado
      const txid = `TX${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const pixPayload = `00020126580014BR.GOV.BCB.PIX0114${settings.pixKey}520400005303986540${finalAmount.toFixed(2)}5802BR5920${settings.pixBeneficiary.substring(0,20)}6009${settings.pixCity.substring(0,9)}62070503***6304`;

      const initialHistory: InvoiceHistoryEntry[] = [
        {
          timestamp: now,
          action: 'Criação da Fatura',
          performedBy: params.performedBy || 'master_admin',
          details: `Fatura #${number} gerada para ${params.restaurantName} no valor de R$ ${finalAmount.toFixed(2)}.`
        }
      ];

      const invoice: Invoice = {
        id,
        number,
        restaurantId: params.restaurantId,
        restaurantName: params.restaurantName,
        planId: params.planId,
        planName: params.planName,
        amount: params.amount,
        discounts,
        additions,
        finalAmount,
        competence: params.competence,
        issueDate: now,
        dueDate: params.dueDate,
        status: 'em_aberto',
        internalNotes: params.internalNotes || '',
        history: initialHistory,
        
        // Estrutura PIX
        pixQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixPayload)}`,
        pixPayload,
        pixKey: settings.pixKey,
        txid,
        pixCreatedAt: now,
        pixStatus: 'pending',

        // Estrutura Stripe
        stripeInvoiceId: '',
        stripePaymentIntentId: '',
        stripeCheckoutSessionId: '',
        stripeStatus: '',

        createdAt: now,
        updatedAt: now
      };

      await setDoc(doc(db, 'invoices', id), invoice);

      await PaymentService.logPaymentEvent({
        restaurantId: params.restaurantId,
        restaurantName: params.restaurantName,
        invoiceId: id,
        action: 'invoice_created',
        description: `Fatura #${number} criada para ${params.restaurantName} (${params.competence})`,
        performedBy: params.performedBy || 'master_admin',
        amount: finalAmount
      });

      return invoice;
    } catch (err) {
      console.error('Erro ao criar fatura:', err);
      throw err;
    }
  }

  /**
   * Atualiza os dados de uma fatura existente
   */
  static async updateInvoice(invoiceId: string, updates: {
    amount?: number;
    discounts?: number;
    additions?: number;
    dueDate?: string;
    internalNotes?: string;
    performedBy?: string;
  }, existingInvoice: Invoice): Promise<void> {
    try {
      const now = new Date().toISOString();
      const amount = updates.amount ?? existingInvoice.amount;
      const discounts = updates.discounts ?? existingInvoice.discounts;
      const additions = updates.additions ?? existingInvoice.additions;
      const finalAmount = Math.max(0, amount - discounts + additions);

      const historyEntry: InvoiceHistoryEntry = {
        timestamp: now,
        action: 'Edição de Fatura',
        performedBy: updates.performedBy || 'master_admin',
        details: `Fatura atualizada. Valor final: R$ ${finalAmount.toFixed(2)}, Vencimento: ${updates.dueDate || existingInvoice.dueDate}`
      };

      const history = [...(existingInvoice.history || []), historyEntry];

      await updateDoc(doc(db, 'invoices', invoiceId), {
        amount,
        discounts,
        additions,
        finalAmount,
        dueDate: updates.dueDate || existingInvoice.dueDate,
        internalNotes: updates.internalNotes ?? existingInvoice.internalNotes,
        history,
        updatedAt: now
      });

      await PaymentService.logPaymentEvent({
        restaurantId: existingInvoice.restaurantId,
        restaurantName: existingInvoice.restaurantName,
        invoiceId,
        action: 'invoice_updated',
        description: `Fatura #${existingInvoice.number} alterada pelo administrador`,
        performedBy: updates.performedBy || 'master_admin',
        amount: finalAmount
      });
    } catch (err) {
      console.error('Erro ao atualizar fatura:', err);
      throw err;
    }
  }

  /**
   * Marca uma fatura como paga e gera o recibo correspondente
   */
  static async markAsPaid(invoice: Invoice, paymentMethod: InvoicePaymentMethod, performedBy?: string, notes?: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const historyEntry: InvoiceHistoryEntry = {
        timestamp: now,
        action: 'Pagamento Confirmado',
        performedBy: performedBy || 'master_admin',
        details: `Pagamento recebido via ${paymentMethod.toUpperCase()}. Status alterado para PAGO.`
      };

      const history = [...(invoice.history || []), historyEntry];

      // Atualiza a fatura
      await updateDoc(doc(db, 'invoices', invoice.id), {
        status: 'pago',
        paidAt: now,
        paymentMethod,
        pixStatus: paymentMethod === 'pix' ? 'paid' : invoice.pixStatus,
        pixPaidAt: paymentMethod === 'pix' ? now : invoice.pixPaidAt,
        history,
        updatedAt: now
      });

      // Atualiza data do próximo vencimento do restaurante para + 30 dias
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + 30);
      try {
        await updateDoc(doc(db, 'restaurants', invoice.restaurantId), {
          nextDueDate: nextDue.toISOString().split('T')[0]
        });
      } catch (errRest) {
        console.warn('Erro ao atualizar data de vencimento do restaurante:', errRest);
      }

      // Gera recibo automático
      await ReceiptService.createReceipt({
        invoiceId: invoice.id,
        restaurantId: invoice.restaurantId,
        restaurantName: invoice.restaurantName,
        planName: invoice.planName,
        amount: invoice.finalAmount,
        paymentMethod,
        paidAt: now,
        notes: notes || `Recibo gerado automaticamente para a fatura #${invoice.number}`,
        performedBy
      });

      await PaymentService.logPaymentEvent({
        restaurantId: invoice.restaurantId,
        restaurantName: invoice.restaurantName,
        invoiceId: invoice.id,
        action: 'invoice_paid',
        description: `Fatura #${invoice.number} marcada como PAGA via ${paymentMethod}`,
        performedBy: performedBy || 'master_admin',
        amount: invoice.finalAmount
      });
    } catch (err) {
      console.error('Erro ao marcar fatura como paga:', err);
      throw err;
    }
  }

  /**
   * Cancela uma fatura
   */
  static async cancelInvoice(invoice: Invoice, reason?: string, performedBy?: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const historyEntry: InvoiceHistoryEntry = {
        timestamp: now,
        action: 'Fatura Cancelada',
        performedBy: performedBy || 'master_admin',
        details: `Fatura cancelada. Motivo: ${reason || 'Cancelamento solicitado pelo Master'}`
      };

      const history = [...(invoice.history || []), historyEntry];

      await updateDoc(doc(db, 'invoices', invoice.id), {
        status: 'cancelado',
        history,
        updatedAt: now
      });

      await PaymentService.logPaymentEvent({
        restaurantId: invoice.restaurantId,
        restaurantName: invoice.restaurantName,
        invoiceId: invoice.id,
        action: 'invoice_canceled',
        description: `Fatura #${invoice.number} cancelada. Motivo: ${reason || 'Não informado'}`,
        performedBy: performedBy || 'master_admin'
      });
    } catch (err) {
      console.error('Erro ao cancelar fatura:', err);
      throw err;
    }
  }

  /**
   * Duplica uma fatura para uma nova competência
   */
  static async duplicateInvoice(invoice: Invoice, newCompetence: string, newDueDate: string, performedBy?: string): Promise<Invoice> {
    return this.createInvoice({
      restaurantId: invoice.restaurantId,
      restaurantName: invoice.restaurantName,
      planId: invoice.planId,
      planName: invoice.planName,
      amount: invoice.amount,
      discounts: invoice.discounts,
      additions: invoice.additions,
      competence: newCompetence,
      dueDate: newDueDate,
      internalNotes: `Duplicada a partir da fatura #${invoice.number}. ${invoice.internalNotes || ''}`,
      performedBy
    });
  }
}
