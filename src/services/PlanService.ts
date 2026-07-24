import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { MasterFeature, MasterPlan, Restaurant } from '../types';

export const DEFAULT_FEATURES: MasterFeature[] = [
  {
    id: 'qr_code_menu',
    name: 'Cardápio Digital via QR Code',
    description: 'Acesso instantâneo ao cardápio digital via leitura de QR Code',
    icon: 'QrCode',
    active: true,
    category: 'core'
  },
  {
    id: 'custom_qr_print',
    name: 'Impressão Personalizada de QR Code',
    description: 'Geração e impressão customizada de QR Codes por mesa',
    icon: 'Printer',
    active: true,
    category: 'core'
  },
  {
    id: 'kitchen_panel',
    name: 'Painel Completo da Cozinha',
    description: 'Visualização em tempo real de pedidos na cozinha (KDS)',
    icon: 'ChefHat',
    active: true,
    category: 'operations'
  },
  {
    id: 'order_filters',
    name: 'Filtros de Pedidos',
    description: 'Filtros avançados por status, horário, garçom e mesa',
    icon: 'Filter',
    active: true,
    category: 'operations'
  },
  {
    id: 'waiter_call',
    name: 'Chamada de Garçom',
    description: 'Notificações instantâneas quando o cliente solicita atendimento na mesa',
    icon: 'Bell',
    active: true,
    category: 'operations'
  },
  {
    id: 'print_orders',
    name: 'Impressão de Pedidos',
    description: 'Impressão direta de comandas para cozinha e bar',
    icon: 'Printer',
    active: true,
    category: 'operations'
  },
  {
    id: 'partial_delivery',
    name: 'Entrega Parcial de Pedidos',
    description: 'Permite entregar itens do pedido individualmente',
    icon: 'ShoppingBag',
    active: true,
    category: 'operations'
  },
  {
    id: 'audit_history',
    name: 'Histórico e Auditoria',
    description: 'Rastreabilidade completa de ações e alterações por sessão/mesa',
    icon: 'History',
    active: true,
    category: 'management'
  },
  {
    id: 'dashboard',
    name: 'Dashboard de Vendas',
    description: 'Painel gerencial com métricas em tempo real',
    icon: 'BarChart2',
    active: true,
    category: 'management'
  },
  {
    id: 'statistics',
    name: 'Estatísticas Avançadas',
    description: 'Análise de produtos mais vendidos e faturamento por horário',
    icon: 'TrendingUp',
    active: true,
    category: 'management'
  },
  {
    id: 'reports',
    name: 'Relatórios e Exportação',
    description: 'Geração de relatórios detalhados para gestão financeira',
    icon: 'FileText',
    active: true,
    category: 'management'
  },
  {
    id: 'gemini_ai',
    name: 'Inteligência Artificial Gemini',
    description: 'Geração automática de descrições e sugestões para o cardápio',
    icon: 'Sparkles',
    active: true,
    category: 'advanced'
  },
  {
    id: 'waiter_evaluation',
    name: 'Avaliação de Garçons',
    description: 'Sistema de feedback e avaliação do atendimento pela mesa (Estrutura Preparada)',
    icon: 'Star',
    active: true,
    category: 'advanced'
  },
  {
    id: 'team_training',
    name: 'Treinamento da Equipe',
    description: 'Módulo de onboarding e treinamento da equipe (Estrutura Preparada)',
    icon: 'GraduationCap',
    active: true,
    category: 'advanced'
  },
  {
    id: 'priority_support',
    name: 'Suporte Prioritário',
    description: 'Atendimento exclusivo e suporte prioritário via WhatsApp',
    icon: 'Headphones',
    active: true,
    category: 'advanced'
  },
  {
    id: 'online_reservations',
    name: 'Reservas Online',
    description: 'Módulo de agendamento e reservas online de mesas (Estrutura Add-on)',
    icon: 'Calendar',
    active: true,
    category: 'advanced'
  },
  {
    id: 'loyalty_program',
    name: 'Programa de Fidelidade',
    description: 'Gestão de pontos, cupons e fidelização de clientes (Estrutura Add-on)',
    icon: 'Award',
    active: true,
    category: 'advanced'
  }
];

export const DEFAULT_PLANS: MasterPlan[] = [
  {
    id: 'bistro',
    name: 'Plano Bistrô',
    description: 'Ideal para pequenos estabelecimentos, cafés e lanchonetes',
    price: 99.00,
    active: true,
    order: 1,
    limits: {
      maxTables: 10,
      maxWaiters: 3,
      maxAdminUsers: 2,
      trialDays: 14
    },
    features: [
      'qr_code_menu',
      'custom_qr_print',
      'kitchen_panel',
      'order_filters',
      'waiter_call',
      'print_orders',
      'partial_delivery',
      'dashboard'
    ]
  },
  {
    id: 'gourmet',
    name: 'Plano Gourmet',
    description: 'Perfeito para restaurantes em expansão com foco em agilidade e estatísticas',
    price: 189.00,
    active: true,
    order: 2,
    limits: {
      maxTables: 0, // 0 = ilimitado
      maxWaiters: 10,
      maxAdminUsers: 5,
      trialDays: 14
    },
    features: [
      'qr_code_menu',
      'custom_qr_print',
      'kitchen_panel',
      'order_filters',
      'waiter_call',
      'print_orders',
      'partial_delivery',
      'audit_history',
      'dashboard',
      'statistics',
      'reports',
      'gemini_ai'
    ]
  },
  {
    id: 'chef',
    name: 'Plano Chef Premium',
    description: 'Solução completa sem limites com IA, relatórios avançados e suporte prioritário',
    price: 299.00,
    active: true,
    order: 3,
    limits: {
      maxTables: 0, // ilimitado
      maxWaiters: 0, // ilimitado
      maxAdminUsers: 0, // ilimitado
      trialDays: 14
    },
    features: [
      'qr_code_menu',
      'custom_qr_print',
      'kitchen_panel',
      'order_filters',
      'waiter_call',
      'print_orders',
      'partial_delivery',
      'audit_history',
      'dashboard',
      'statistics',
      'reports',
      'gemini_ai',
      'waiter_evaluation',
      'team_training',
      'priority_support',
      'online_reservations',
      'loyalty_program'
    ]
  }
];

export class PlanService {
  /**
   * Obtém lista de todos os planos mestre cadastrados
   */
  static async getPlans(): Promise<MasterPlan[]> {
    try {
      const snap = await getDocs(collection(db, 'master_plans'));
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as MasterPlan));
        return items.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
      return DEFAULT_PLANS;
    } catch (err) {
      console.warn('Erro ao carregar planos do Firestore:', err);
      return DEFAULT_PLANS;
    }
  }

  /**
   * Verifica se o restaurante está no período de Trial ativo.
   */
  static isTrialActive(restaurant: Restaurant | null): boolean {
    if (!restaurant) return false;
    if (restaurant.status === 'trial' || restaurant.plan === 'trial') return true;

    if (restaurant.createdAt) {
      const createdDate = new Date(restaurant.createdAt).getTime();
      const trialDays = 14;
      const trialDurationMs = trialDays * 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      if (now - createdDate < trialDurationMs) {
        return true;
      }
    }
    return false;
  }

  /**
   * Retorna os dias restantes do Trial.
   */
  static getRemainingTrialDays(restaurant: Restaurant | null, defaultTrialDays = 14): number {
    if (!restaurant) return 0;
    if (!restaurant.createdAt) return defaultTrialDays;

    const createdDate = new Date(restaurant.createdAt).getTime();
    const trialDurationMs = defaultTrialDays * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const remainingMs = (createdDate + trialDurationMs) - now;
    if (remainingMs <= 0) return 0;
    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  }

  /**
   * Retorna o objeto do plano associado ao restaurante.
   */
  static getRestaurantPlan(restaurant: Restaurant | null, plans: MasterPlan[]): MasterPlan | null {
    if (!restaurant) return null;
    const activePlans = plans.length > 0 ? plans : DEFAULT_PLANS;
    const planKey = restaurant.planId || restaurant.plan || 'gourmet';
    const found = activePlans.find(p => p.id === planKey);
    if (found) return found;

    return activePlans.find(p => p.id === 'gourmet') || activePlans[0] || null;
  }

  /**
   * Valida se um recurso específico está habilitado para o restaurante.
   * Suporta validação por Add-on individual contratado pelo restaurante.
   */
  static hasFeature(
    restaurant: Restaurant | null,
    featureId: string,
    plans: MasterPlan[],
    features: MasterFeature[]
  ): boolean {
    if (!restaurant) return true;

    const activeFeatures = features.length > 0 ? features : DEFAULT_FEATURES;
    const featureObj = activeFeatures.find(f => f.id === featureId);
    
    // Se o recurso foi desativado globalmente pelo Master, bloqueia
    if (featureObj && !featureObj.active) {
      return false;
    }

    // Suporte a Add-on individual liberado diretamente para o restaurante
    if (restaurant.addOns && Array.isArray(restaurant.addOns) && restaurant.addOns.includes(featureId)) {
      return true;
    }

    // Se estiver em Trial, libera todos os recursos ativos
    if (this.isTrialActive(restaurant)) {
      return true;
    }

    const currentPlan = this.getRestaurantPlan(restaurant, plans);
    if (!currentPlan) return true;

    return currentPlan.features ? currentPlan.features.includes(featureId) : false;
  }

  /**
   * Retorna o menor plano necessário para liberar um recurso.
   */
  static getMinPlanForFeature(featureId: string, plans: MasterPlan[]): MasterPlan | null {
    const activePlans = (plans.length > 0 ? plans : DEFAULT_PLANS).filter(p => p.active);
    const sorted = [...activePlans].sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const p of sorted) {
      if (p.features && p.features.includes(featureId)) {
        return p;
      }
    }
    return sorted[sorted.length - 1] || null;
  }

  /**
   * Retorna a mensagem amigável de bloqueio (ex: "Disponível no Plano Gourmet").
   */
  static getFeatureLockMessage(featureId: string, plans: MasterPlan[]): string {
    const minPlan = this.getMinPlanForFeature(featureId, plans);
    if (minPlan) {
      return `Disponível no ${minPlan.name}`;
    }
    return 'Disponível no Plano Chef Premium';
  }

  /**
   * Valida o limite de mesas para o restaurante.
   */

  static canAddTable(
    restaurant: Restaurant | null,
    currentTableCount: number,
    plans: MasterPlan[]
  ): { allowed: boolean; max: number; planName: string } {
    if (!restaurant) return { allowed: true, max: 0, planName: '' };

    if (this.isTrialActive(restaurant)) {
      return { allowed: true, max: 0, planName: 'Trial' };
    }

    const currentPlan = this.getRestaurantPlan(restaurant, plans);
    if (!currentPlan) return { allowed: true, max: 0, planName: '' };

    const maxTables = currentPlan.limits?.maxTables || 0;
    if (maxTables === 0) {
      return { allowed: true, max: 0, planName: currentPlan.name };
    }

    const allowed = currentTableCount < maxTables;
    return { allowed, max: maxTables, planName: currentPlan.name };
  }

  /**
   * Valida o limite de garçons para o restaurante.
   */
  static canAddWaiter(
    restaurant: Restaurant | null,
    currentWaiterCount: number,
    plans: MasterPlan[]
  ): { allowed: boolean; max: number; planName: string } {
    if (!restaurant) return { allowed: true, max: 0, planName: '' };

    if (this.isTrialActive(restaurant)) {
      return { allowed: true, max: 0, planName: 'Trial' };
    }

    const currentPlan = this.getRestaurantPlan(restaurant, plans);
    if (!currentPlan) return { allowed: true, max: 0, planName: '' };

    const maxWaiters = currentPlan.limits?.maxWaiters || 0;
    if (maxWaiters === 0) {
      return { allowed: true, max: 0, planName: currentPlan.name };
    }

    const allowed = currentWaiterCount < maxWaiters;
    return { allowed, max: maxWaiters, planName: currentPlan.name };
  }
}
