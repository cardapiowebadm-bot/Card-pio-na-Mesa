import { Invoice, Subscription } from '../../types/financial';
import { Restaurant } from '../../types';

export interface FinancialKPIs {
  expectedMonthlyRevenue: number; // Receita Mensal Prevista
  receivedRevenue: number;        // Receita Recebida
  pendingRevenue: number;         // Receita Pendente
  compliantCount: number;         // Restaurantes Adimplentes
  defaultingCount: number;        // Restaurantes Inadimplentes
  activeTrialsCount: number;      // Trials Ativos
  endingTrialsCount: number;      // Trials Encerrando (<= 7 dias)
  totalActiveSubscriptions: number;// Total de Assinaturas Ativas
}

export class BillingService {
  /**
   * Calcula indicadores financeiros em tempo real com base em restaurantes e faturas do mês atual
   */
  static calculateKPIs(restaurants: Restaurant[], invoices: Invoice[], subscriptions: Subscription[]): FinancialKPIs {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const now = new Date();

    let expectedMonthlyRevenue = 0;
    let receivedRevenue = 0;
    let pendingRevenue = 0;
    
    // Adimplentes e Inadimplentes
    const defaultingRestaurantIds = new Set<string>();
    const paidRestaurantIds = new Set<string>();

    invoices.forEach(inv => {
      // Receita Recebida
      if (inv.status === 'pago') {
        receivedRevenue += inv.finalAmount;
        paidRestaurantIds.add(inv.restaurantId);
      }
      
      // Receita Pendente
      if (inv.status === 'em_aberto' || inv.status === 'vencido') {
        pendingRevenue += inv.finalAmount;
        if (inv.status === 'vencido') {
          defaultingRestaurantIds.add(inv.restaurantId);
        }
      }
    });

    // Receita Prevista = Receita Recebida + Receita Pendente + Valor de planos ativos sem fatura gerada
    let activeSubsCount = 0;
    let activeTrials = 0;
    let endingTrials = 0;

    restaurants.forEach(rest => {
      if (rest.status === 'trial') {
        activeTrials++;
        // Verifica se trial encerra em <= 7 dias
        if (rest.createdAt) {
          const created = new Date(rest.createdAt);
          const trialEnd = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
          const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft >= 0 && daysLeft <= 7) {
            endingTrials++;
          }
        }
      }

      if (rest.status === 'active' || rest.status === 'trial') {
        activeSubsCount++;
      }
    });

    expectedMonthlyRevenue = receivedRevenue + pendingRevenue;

    const defaultingCount = defaultingRestaurantIds.size;
    const totalActiveRest = restaurants.filter(r => r.status === 'active').length;
    const compliantCount = Math.max(0, totalActiveRest - defaultingCount);

    return {
      expectedMonthlyRevenue,
      receivedRevenue,
      pendingRevenue,
      compliantCount,
      defaultingCount,
      activeTrialsCount: activeTrials,
      endingTrialsCount: endingTrials,
      totalActiveSubscriptions: activeSubsCount || subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length
    };
  }

  /**
   * Estrutura de preparação para futura geração automática de mensalidades recorrentes
   */
  static async prepareMonthlyBillingRun(): Promise<{ ready: boolean; message: string }> {
    // Método stub/interface pronta para automação futura de cron / webhooks / Stripe
    return {
      ready: true,
      message: 'Estrutura do BillingService pronta para rotinas automáticas de mensalidades e Stripe Webhooks.'
    };
  }
}
