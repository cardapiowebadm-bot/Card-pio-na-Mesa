import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Receipt, 
  History, 
  Building2, 
  Sparkles, 
  LayoutDashboard, 
  FileText, 
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RestaurantBillingProvider, useRestaurantBilling } from '../contexts/RestaurantBillingContext';
import { RestaurantPlanCard } from '../components/restaurant/financial/RestaurantPlanCard';
import { RestaurantFinancialSituationCard } from '../components/restaurant/financial/RestaurantFinancialSituationCard';
import { RestaurantInvoicesTable } from '../components/restaurant/financial/RestaurantInvoicesTable';
import { RestaurantReceiptsTable } from '../components/restaurant/financial/RestaurantReceiptsTable';
import { RestaurantHistoryTimeline } from '../components/restaurant/financial/RestaurantHistoryTimeline';
import { RestaurantBillingProfileForm } from '../components/restaurant/financial/RestaurantBillingProfileForm';
import { PlanUpgradeModal } from '../components/restaurant/financial/PlanUpgradeModal';
import { RestaurantInvoiceDetailModal } from '../components/restaurant/financial/RestaurantInvoiceDetailModal';
import { RestaurantReceiptModal } from '../components/restaurant/financial/RestaurantReceiptModal';
import { Invoice, Receipt as ReceiptType } from '../types/financial';

const RestaurantFinancialContent: React.FC = () => {
  const { loading, restaurant, openInvoice, stats } = useRestaurantBilling();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'receipts' | 'history' | 'profile'>('dashboard');

  // Modal States
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Monitora retorno do Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');

    if (status === 'success') {
      toast.success('Checkout Stripe concluído com sucesso! Sua assinatura e recursos foram atualizados.', { duration: 6000 });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'cancelled') {
      toast.error('O processo de checkout no Stripe foi cancelado.', { duration: 5000 });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleOpenPayModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceModalOpen(true);
  };

  const handleSelectReceipt = (receipt: ReceiptType) => {
    setSelectedReceipt(receipt);
    setIsReceiptModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Carregando portal financeiro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Page Title & Navigation Tabs Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-full border border-rose-200">
              Financeiro do Restaurante
            </span>
            {stats.overdueCount > 0 && (
              <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-full flex items-center gap-1 border border-rose-200 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                Pendência Financeira
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 font-display tracking-tight">
            Portal Financeiro & Assinatura
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie seu plano, mensalidades, faturas, recibos e dados de cobrança
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'invoices', label: 'Faturas', icon: <FileText className="w-4 h-4" /> },
            { id: 'receipts', label: 'Recibos', icon: <Receipt className="w-4 h-4" /> },
            { id: 'history', label: 'Histórico', icon: <History className="w-4 h-4" /> },
            { id: 'profile', label: 'Dados de Cobrança', icon: <Building2 className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Main Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RestaurantPlanCard onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)} />
            <RestaurantFinancialSituationCard onPayInvoice={handleOpenPayModal} />
          </div>

          {/* Quick Invoices Table View */}
          <RestaurantInvoicesTable 
            onSelectInvoice={(inv) => {
              setSelectedInvoice(inv);
              setIsInvoiceModalOpen(true);
            }} 
            onPayInvoice={handleOpenPayModal} 
          />
        </div>
      )}

      {/* TAB CONTENT: INVOICES */}
      {activeTab === 'invoices' && (
        <RestaurantInvoicesTable 
          onSelectInvoice={(inv) => {
            setSelectedInvoice(inv);
            setIsInvoiceModalOpen(true);
          }} 
          onPayInvoice={handleOpenPayModal} 
        />
      )}

      {/* TAB CONTENT: RECEIPTS */}
      {activeTab === 'receipts' && (
        <RestaurantReceiptsTable onSelectReceipt={handleSelectReceipt} />
      )}

      {/* TAB CONTENT: HISTORY */}
      {activeTab === 'history' && (
        <RestaurantHistoryTimeline />
      )}

      {/* TAB CONTENT: BILLING PROFILE */}
      {activeTab === 'profile' && (
        <RestaurantBillingProfileForm />
      )}

      {/* MODALS */}
      <PlanUpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />

      <RestaurantInvoiceDetailModal 
        invoice={selectedInvoice} 
        isOpen={isInvoiceModalOpen} 
        onClose={() => setIsInvoiceModalOpen(false)} 
      />

      <RestaurantReceiptModal 
        receipt={selectedReceipt} 
        isOpen={isReceiptModalOpen} 
        onClose={() => setIsReceiptModalOpen(false)} 
      />
    </div>
  );
};

export const AdminFinancial: React.FC = () => {
  return (
    <RestaurantBillingProvider>
      <RestaurantFinancialContent />
    </RestaurantBillingProvider>
  );
};

export default AdminFinancial;
