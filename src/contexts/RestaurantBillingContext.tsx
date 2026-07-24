import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { 
  Invoice, 
  Receipt, 
  Subscription, 
  PaymentHistoryLog, 
  RestaurantBillingInfo 
} from '../types/financial';
import { MasterPlan, Restaurant } from '../types';
import { InvoiceService } from '../services/financial/InvoiceService';
import { SubscriptionService } from '../services/financial/SubscriptionService';
import { ReceiptService } from '../services/financial/ReceiptService';
import { PaymentService } from '../services/financial/PaymentService';
import { PlanService } from '../services/PlanService';
import { BillingScheduler } from '../services/financial/BillingScheduler';
import { toast } from 'react-hot-toast';

interface RestaurantBillingContextData {
  loading: boolean;
  subscription: Subscription | null;
  currentPlan: MasterPlan | null;
  allPlans: MasterPlan[];
  invoices: Invoice[];
  receipts: Receipt[];
  historyLogs: PaymentHistoryLog[];
  billingInfo: RestaurantBillingInfo;
  restaurant: Restaurant | null;
  updateBillingInfo: (info: RestaurantBillingInfo) => Promise<void>;
  requestPlanUpgrade: (targetPlanId: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  openInvoice: Invoice | undefined;
  stats: {
    trialDaysRemaining: number;
    nextDueDate: string;
    subscriptionStatus: string;
    pendingCount: number;
    pendingTotal: number;
    overdueCount: number;
    overdueTotal: number;
  };
}

const RestaurantBillingContext = createContext<RestaurantBillingContextData>({} as RestaurantBillingContextData);

export const RestaurantBillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { restaurant, userProfile } = useAuth();
  const restaurantId = restaurant?.id || userProfile?.restaurantId;

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [allPlans, setAllPlans] = useState<MasterPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<MasterPlan | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [historyLogs, setHistoryLogs] = useState<PaymentHistoryLog[]>([]);
  const [billingInfo, setBillingInfo] = useState<RestaurantBillingInfo>({});

  // Carrega lista de planos mestre
  useEffect(() => {
    async function loadPlans() {
      try {
        const plans = await PlanService.getPlans();
        setAllPlans(plans);
      } catch (err) {
        console.error('Erro ao carregar planos:', err);
      }
    }
    loadPlans();
  }, []);

  // Carrega informações financeiras de cobrança do restaurante
  useEffect(() => {
    if (!restaurantId) return;

    async function loadRestaurantBilling() {
      try {
        const docRef = doc(db, 'restaurants', restaurantId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.billingInfo) {
            setBillingInfo(data.billingInfo);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados de cobrança do restaurante:', err);
      }
    }

    loadRestaurantBilling();

    // Executa verificação de automações de ciclo de vida financeiro (Trials, Inadimplência, Alertas)
    BillingScheduler.runAllAutomations().catch(err => {
      console.warn('Erro na execução automática do BillingScheduler:', err);
    });
  }, [restaurantId]);

  // Assinaturas em tempo real filtradas estritamente pelo restaurantId (Multi-tenant)
  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Inscrição em Assinatura
    const unsubSub = SubscriptionService.subscribeToSubscriptionByRestaurant(restaurantId, (sub) => {
      setSubscription(sub);
      if (sub && allPlans.length > 0) {
        const found = allPlans.find(p => p.id === sub.planId);
        if (found) setCurrentPlan(found);
      }
    });

    // 2. Inscrição em Faturas
    const unsubInv = InvoiceService.subscribeToInvoicesByRestaurant(restaurantId, (items) => {
      setInvoices(items);
    });

    // 3. Inscrição em Recibos
    const unsubRec = ReceiptService.subscribeToReceiptsByRestaurant(restaurantId, (items) => {
      setReceipts(items);
    });

    // 4. Inscrição em Histórico
    const unsubHist = PaymentService.subscribeToPaymentHistoryByRestaurant(restaurantId, (logs) => {
      setHistoryLogs(logs);
      setLoading(false);
    });

    return () => {
      unsubSub();
      unsubInv();
      unsubRec();
      unsubHist();
    };
  }, [restaurantId, allPlans]);

  // Atualiza plano atual com base no id do plano na assinatura ou restaurante
  useEffect(() => {
    if (allPlans.length > 0) {
      const planId = subscription?.planId || restaurant?.plan || 'gourmet';
      const found = allPlans.find(p => p.id === planId) || allPlans[0];
      if (found) setCurrentPlan(found);
    }
  }, [subscription, restaurant, allPlans]);

  // Atualização dos Dados de Cobrança
  const updateBillingInfo = async (info: RestaurantBillingInfo) => {
    if (!restaurantId) return;
    try {
      const ref = doc(db, 'restaurants', restaurantId);
      await updateDoc(ref, {
        billingInfo: info,
        updatedAt: new Date().toISOString()
      });
      setBillingInfo(info);

      await PaymentService.logPaymentEvent({
        restaurantId,
        restaurantName: restaurant?.name || 'Restaurante',
        action: 'billing_info_updated',
        description: 'Dados cadastrais de cobrança atualizados pelo restaurante',
        performedBy: userProfile?.name || 'proprietario'
      });

      toast.success('Dados de cobrança salvos com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar dados de cobrança:', err);
      toast.error('Erro ao salvar dados de cobrança.');
      throw err;
    }
  };

  // Redireciona para o Portal do Cliente do Stripe para gerenciamento de cartões e faturas
  const openCustomerPortal = async () => {
    if (!restaurantId) return;
    try {
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '';
      const toastId = toast.loading('Acessando Portal do Cliente Stripe...');
      let customerId = restaurant?.stripeCustomerId;

      // Se não possui stripeCustomerId, cria automaticamente
      if (!customerId) {
        const resCust = await fetch(`${apiBase}/api/stripe/customer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId,
            name: restaurant?.name || 'Restaurante',
            email: restaurant?.ownerEmail || billingInfo.contactEmail || 'financeiro@restaurante.com',
            phone: restaurant?.phone || billingInfo.contactPhone,
            documentNumber: billingInfo.documentNumber
          })
        });
        const custData = await resCust.json();
        if (custData.customer?.id) {
          customerId = custData.customer.id;
          await updateDoc(doc(db, 'restaurants', restaurantId), {
            stripeCustomerId: customerId,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        }
      }

      if (!customerId) {
        toast.dismiss(toastId);
        toast.error('Não foi possível identificar o cliente no Stripe.');
        return;
      }

      const appUrl = window.location.origin;
      const res = await fetch(`${apiBase}/api/stripe/customer-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          returnUrl: `${appUrl}/admin/financial`
        })
      });

      const data = await res.json();
      toast.dismiss(toastId);

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Erro ao obter link do Portal do Cliente.');
      }
    } catch (err: any) {
      console.error('Erro ao abrir Portal do Cliente:', err);
      toast.error('Erro ao conectar com o Portal do Cliente Stripe.');
    }
  };

  // Solicitação de Contratação/Upgrade de Plano via Stripe Checkout Official
  const requestPlanUpgrade = async (targetPlanId: string) => {
    if (!restaurantId) return;
    try {
      const targetPlan = allPlans.find(p => p.id === targetPlanId);
      const planName = targetPlan?.name || targetPlanId;
      const toastId = toast.loading(`Iniciando Checkout do ${planName}...`);

      let customerId = restaurant?.stripeCustomerId;

      // 1. Garantir que o restaurante possui stripeCustomerId no Stripe
      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '';
      if (!customerId) {
        try {
          const resCust = await fetch(`${apiBase}/api/stripe/customer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurantId,
              name: restaurant?.name || 'Restaurante',
              email: restaurant?.ownerEmail || billingInfo.contactEmail || 'financeiro@restaurante.com',
              phone: restaurant?.phone || billingInfo.contactPhone,
              documentNumber: billingInfo.documentNumber
            })
          });
          const custData = await resCust.json();
          if (custData.customer?.id) {
            customerId = custData.customer.id;
            await updateDoc(doc(db, 'restaurants', restaurantId), {
              stripeCustomerId: customerId,
              updatedAt: new Date().toISOString()
            }).catch(() => {});
          }
        } catch (custErr) {
          console.warn('Erro ao criar cliente no Stripe:', custErr);
        }
      }

      // 2. Registrar evento de histórico
      await PaymentService.logPaymentEvent({
        restaurantId,
        restaurantName: restaurant?.name || 'Restaurante',
        action: 'upgrade_requested',
        description: `Iniciando checkout oficial do Stripe para o ${planName}`,
        performedBy: userProfile?.name || 'proprietario',
        metadata: { targetPlanId, planName, customerId }
      });

      // 3. Criar Sessão de Checkout
      const appUrl = window.location.origin;
      const resSession = await fetch(`${apiBase}/api/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          planId: targetPlanId,
          customerId,
          customerEmail: restaurant?.ownerEmail || billingInfo.contactEmail || 'financeiro@restaurante.com',
          successUrl: `${appUrl}/admin/financial?status=success&plan=${targetPlanId}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${appUrl}/admin/financial?status=cancelled`
        })
      });

      const sessionData = await resSession.json();
      toast.dismiss(toastId);

      if (sessionData.session?.url) {
        toast.success(`Redirecionando para o Stripe Checkout...`);
        window.location.href = sessionData.session.url;
      } else {
        toast.error('Não foi possível gerar a página de pagamento.');
      }
    } catch (err) {
      console.error('Erro ao registrar solicitação de upgrade:', err);
      toast.error('Erro ao iniciar processo de pagamento Stripe.');
    }
  };

  // Fatura aberta/vencida mais recente
  const openInvoice = invoices.find(i => i.status === 'em_aberto' || i.status === 'vencido');

  // Cálculos das estatísticas para o Dashboard do Restaurante
  const pendingInvoices = invoices.filter(i => i.status === 'em_aberto');
  const overdueInvoices = invoices.filter(i => i.status === 'vencido');

  const pendingTotal = pendingInvoices.reduce((acc, i) => acc + (i.finalAmount || 0), 0);
  const overdueTotal = overdueInvoices.reduce((acc, i) => acc + (i.finalAmount || 0), 0);

  // Cálculo de dias restantes do Trial
  let trialDaysRemaining = 0;
  if (subscription?.isTrial && subscription?.trialEndDate) {
    const end = new Date(subscription.trialEndDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    trialDaysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  const nextDueDate = openInvoice?.dueDate || subscription?.renewalDate || restaurant?.nextDueDate || 'Indefinido';
  const subscriptionStatus = subscription?.status || 'active';

  const stats = {
    trialDaysRemaining,
    nextDueDate,
    subscriptionStatus,
    pendingCount: pendingInvoices.length,
    pendingTotal,
    overdueCount: overdueInvoices.length,
    overdueTotal
  };

  return (
    <RestaurantBillingContext.Provider value={{
      loading,
      subscription,
      currentPlan,
      allPlans,
      invoices,
      receipts,
      historyLogs,
      billingInfo,
      restaurant,
      updateBillingInfo,
      requestPlanUpgrade,
      openCustomerPortal,
      openInvoice,
      stats
    }}>
      {children}
    </RestaurantBillingContext.Provider>
  );
};

export const useRestaurantBilling = () => {
  const context = useContext(RestaurantBillingContext);
  if (!context) {
    throw new Error('useRestaurantBilling deve ser usado dentro de um RestaurantBillingProvider');
  }
  return context;
};
