import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  Receipt as ReceiptIcon, 
  QrCode, 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  Settings, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Ban, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Building2, 
  Eye, 
  Printer,
  Calendar,
  Layers,
  History,
  X,
  Play
} from 'lucide-react';
import { useMaster } from '../../contexts/MasterContext';
import { 
  InvoiceService, 
  SubscriptionService, 
  ReceiptService, 
  PaymentService, 
  BillingService 
} from '../../services/financial';
import { Invoice, Subscription, Receipt, PaymentHistoryLog, InvoicePaymentMethod } from '../../types/financial';
import FinancialKPIs from '../../components/master/financial/FinancialKPIs';
import InvoicesTable from '../../components/master/financial/InvoicesTable';
import InvoiceDetailModal from '../../components/master/financial/InvoiceDetailModal';
import NewInvoiceModal from '../../components/master/financial/NewInvoiceModal';
import ReceiptModal from '../../components/master/financial/ReceiptModal';
import SubscriptionsTable from '../../components/master/financial/SubscriptionsTable';
import PaymentSettingsModal from '../../components/master/financial/PaymentSettingsModal';
import toast from 'react-hot-toast';

export default function MasterFinancial() {
  const { restaurants, plans } = useMaster();

  // Estados dos dados financeiros
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [historyLogs, setHistoryLogs] = useState<PaymentHistoryLog[]>([]);

  // Estados da UI
  const [activeTab, setActiveTab] = useState<'invoices' | 'subscriptions' | 'receipts' | 'audit' | 'stripe'>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [newInvoiceModalOpen, setNewInvoiceModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Modal de edição de fatura
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDiscounts, setEditDiscounts] = useState<number>(0);
  const [editAdditions, setEditAdditions] = useState<number>(0);
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Assinaturas em tempo real do Firestore
  useEffect(() => {
    const unsubInvoices = InvoiceService.subscribeToInvoices(setInvoices);
    const unsubSubs = SubscriptionService.subscribeToSubscriptions(setSubscriptions);
    const unsubReceipts = ReceiptService.subscribeToReceipts(setReceipts);
    const unsubHistory = PaymentService.subscribeToPaymentHistory(setHistoryLogs);

    return () => {
      unsubInvoices();
      unsubSubs();
      unsubReceipts();
      unsubHistory();
    };
  }, []);

  // KPIs calculados via BillingService
  const kpis = useMemo(() => {
    return BillingService.calculateKPIs(restaurants, invoices, subscriptions);
  }, [restaurants, invoices, subscriptions]);

  // Handler: Criar nova fatura
  const handleCreateInvoice = async (data: {
    restaurantId: string;
    restaurantName: string;
    planId: string;
    planName: string;
    amount: number;
    discounts: number;
    additions: number;
    competence: string;
    dueDate: string;
    internalNotes: string;
  }) => {
    await InvoiceService.createInvoice({
      ...data,
      performedBy: 'master_admin'
    });
  };

  // Handler: Marcar como pago
  const handleMarkAsPaid = async (invoice: Invoice, method: InvoicePaymentMethod, notes?: string) => {
    await InvoiceService.markAsPaid(invoice, method, 'master_admin', notes);
    // Atualiza fatura selecionada no modal se aberta
    if (selectedInvoice && selectedInvoice.id === invoice.id) {
      setSelectedInvoice(prev => prev ? { ...prev, status: 'pago' } : null);
    }
  };

  // Handler: Cancelar fatura
  const handleCancelInvoice = async (invoice: Invoice, reason: string) => {
    await InvoiceService.cancelInvoice(invoice, reason, 'master_admin');
    if (selectedInvoice && selectedInvoice.id === invoice.id) {
      setSelectedInvoice(prev => prev ? { ...prev, status: 'cancelado' } : null);
    }
  };

  // Handler: Duplicar fatura para próximo mês
  const handleDuplicateInvoice = async (invoice: Invoice) => {
    try {
      // Calcula próxima competência (MM/AAAA) e próximo vencimento (+ 30 dias)
      const currentDue = new Date(invoice.dueDate);
      currentDue.setDate(currentDue.getDate() + 30);
      const nextDueStr = currentDue.toISOString().split('T')[0];
      
      const parts = invoice.competence.split('/');
      let nextMonth = parseInt(parts[0] || '1') + 1;
      let nextYear = parseInt(parts[1] || '2026');
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      const nextComp = `${nextMonth.toString().padStart(2, '0')}/${nextYear}`;

      await InvoiceService.duplicateInvoice(invoice, nextComp, nextDueStr, 'master_admin');
      toast.success(`Fatura duplicada para a competência ${nextComp}!`);
    } catch {
      toast.error('Erro ao duplicar fatura.');
    }
  };

  // Handler: Abrir edição de fatura
  const handleOpenEdit = (invoice: Invoice) => {
    setEditInvoice(invoice);
    setEditAmount(invoice.amount);
    setEditDiscounts(invoice.discounts);
    setEditAdditions(invoice.additions);
    setEditDueDate(invoice.dueDate);
    setEditNotes(invoice.internalNotes || '');
  };

  // Handler: Salvar edição de fatura
  const handleSaveEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInvoice) return;

    try {
      setEditLoading(true);
      await InvoiceService.updateInvoice(editInvoice.id, {
        amount: Number(editAmount),
        discounts: Number(editDiscounts),
        additions: Number(editAdditions),
        dueDate: editDueDate,
        internalNotes: editNotes,
        performedBy: 'master_admin'
      }, editInvoice);
      toast.success('Fatura atualizada!');
      setEditInvoice(null);
      if (selectedInvoice && selectedInvoice.id === editInvoice.id) {
        setSelectedInvoice(null);
      }
    } catch {
      toast.error('Erro ao atualizar fatura.');
    } finally {
      setEditLoading(false);
    }
  };

  // Handler: Ver recibo de uma fatura
  const handleViewReceiptByInvoice = (invoice: Invoice) => {
    const r = receipts.find(rec => rec.invoiceId === invoice.id);
    if (r) {
      setSelectedReceipt(r);
    } else {
      // Gera recibo virtual se não encontrado
      setSelectedReceipt({
        id: `rec_${invoice.id}`,
        number: `REC-${new Date().getFullYear()}-0001`,
        invoiceId: invoice.id,
        restaurantId: invoice.restaurantId,
        restaurantName: invoice.restaurantName,
        planName: invoice.planName,
        amount: invoice.finalAmount,
        paymentMethod: invoice.paymentMethod || 'pix',
        paidAt: invoice.paidAt || new Date().toISOString(),
        notes: `Comprovante de pagamento referente à fatura #${invoice.number}`,
        createdAt: new Date().toISOString()
      });
    }
  };

  // Handler: Cancelar assinatura
  const handleCancelSubscription = async (subId: string, restId: string, restName: string) => {
    try {
      await SubscriptionService.cancelSubscription(subId, restId, restName, 'Cancelado pelo administrador no BackOffice Master');
      toast.success(`Assinatura de ${restName} cancelada com sucesso.`);
    } catch {
      toast.error('Erro ao cancelar assinatura.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Page Title & Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Gestão Financeira & Cobranças SaaS</span>
          </div>
          <h1 className="text-2xl font-black text-white font-display tracking-tight">Financeiro & Faturamento</h1>
          <p className="text-xs text-slate-400 mt-1">
            Controle de mensalidades, faturas, emissão de PIX, recibos e recebimentos dos restaurantes.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const tid = toast.loading('Executando automações financeiras...');
              try {
                const response = await fetch('/api/scheduler/billing-check?force=true', { method: 'POST' });
                const data = await response.json();
                const res = data.result || {};
                toast.dismiss(tid);
                toast.success(`Automações concluídas! Trials expirados: ${res.expiredTrialsCount || 0}, Bloqueados por inadimplência: ${res.blockedUnpaidCount || 0}, Alertas gerados: ${res.notificationsCount || 0}`);
              } catch (err: any) {
                toast.dismiss(tid);
                toast.error('Erro ao executar automações.');
              }
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/30 flex items-center gap-2 transition-all"
            title="Executar robô de verificação de trials, inadimplência e alertas"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Rodar Automações</span>
          </button>

          <button
            onClick={() => setSettingsModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 flex items-center gap-2 transition-all"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Configurações PIX & Stripe</span>
          </button>

          <button
            onClick={() => setNewInvoiceModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Fatura</span>
          </button>
        </div>
      </div>

      {/* Real-time KPIs Indicator Cards */}
      <FinancialKPIs kpis={kpis} />

      {/* Tabs Navigation Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'invoices', label: 'Gestão de Faturas', icon: FileText, count: invoices.length },
          { id: 'subscriptions', label: 'Assinaturas SaaS', icon: CreditCard, count: subscriptions.length },
          { id: 'receipts', label: 'Recibos Emitidos', icon: ReceiptIcon, count: receipts.length },
          { id: 'audit', label: 'Histórico & Auditoria', icon: History, count: historyLogs.length },
          { id: 'stripe', label: 'Gateway & Stripe Prep', icon: Lock, tag: 'Pronto' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
              {tab.tag && (
                <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded-md font-bold uppercase">
                  {tab.tag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Faturas */}
      {activeTab === 'invoices' && (
        <InvoicesTable
          invoices={invoices}
          restaurants={restaurants}
          plans={plans}
          onSelectInvoice={(inv) => setSelectedInvoice(inv)}
          onMarkAsPaid={(inv, method) => handleMarkAsPaid(inv, method)}
          onViewReceipt={(inv) => handleViewReceiptByInvoice(inv)}
          onDuplicateInvoice={(inv) => handleDuplicateInvoice(inv)}
        />
      )}

      {/* Tab Content 2: Assinaturas */}
      {activeTab === 'subscriptions' && (
        <SubscriptionsTable
          subscriptions={subscriptions}
          restaurants={restaurants}
          plans={plans}
          onCancelSubscription={handleCancelSubscription}
        />
      )}

      {/* Tab Content 3: Recibos */}
      {activeTab === 'receipts' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ReceiptIcon className="w-4 h-4 text-emerald-400" />
              Recibos Financeiros Emitidos
            </h3>
            <span className="text-xs text-slate-400">{receipts.length} recibos registrados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Número</th>
                  <th className="py-3.5 px-4 font-bold">Restaurante</th>
                  <th className="py-3.5 px-4 font-bold">Plano</th>
                  <th className="py-3.5 px-4 font-bold">Valor Pago</th>
                  <th className="py-3.5 px-4 font-bold">Meio Pagamento</th>
                  <th className="py-3.5 px-4 font-bold">Data Pagamento</th>
                  <th className="py-3.5 px-4 font-bold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {receipts.length > 0 ? (
                  receipts.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{rec.number}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{rec.restaurantName}</td>
                      <td className="py-3.5 px-4 text-slate-300">{rec.planName}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">{formatCurrency(rec.amount)}</td>
                      <td className="py-3.5 px-4 uppercase font-semibold text-slate-300">{rec.paymentMethod}</td>
                      <td className="py-3.5 px-4 text-slate-300">{new Date(rec.paidAt).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedReceipt(rec)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold flex items-center gap-1.5 ml-auto text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Ver Recibo</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Nenhum recibo emitido até o momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 4: Histórico & Auditoria Financeira */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Auditoria & Histórico de Operações Financeiras
            </h3>
            <span className="text-xs text-slate-400">{historyLogs.length} eventos gravados</span>
          </div>

          <div className="space-y-3">
            {historyLogs.length > 0 ? (
              historyLogs.map((log) => (
                <div key={log.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.restaurantName}</span>
                      <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1">{log.description}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {new Date(log.timestamp).toLocaleString('pt-BR')} &bull; por {log.performedBy}
                    </span>
                  </div>

                  {log.amount && (
                    <div className="text-right font-bold text-emerald-400 font-display text-sm shrink-0">
                      {formatCurrency(log.amount)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-slate-500">
                Nenhuma alteração financeira registrada até o momento.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 5: Gateway & Stripe Prepared Architecture */}
      {activeTab === 'stripe' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-2xl">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">Arquitetura Stripe Ready</h2>
              <p className="text-xs text-slate-400">
                Estrutura completa do banco de dados, DTOs e interfaces preparada para futura habilitação da API do Stripe.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
              <span className="font-bold text-indigo-400 block">Stripe Customer Mapping</span>
              <p className="text-slate-400">Campos <code className="text-white font-mono bg-slate-900 px-1 py-0.5 rounded">stripeCustomerId</code> prontos na coleção de restaurantes.</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
              <span className="font-bold text-emerald-400 block">Stripe Subscriptions & Prices</span>
              <p className="text-slate-400">Suporte a <code className="text-white font-mono bg-slate-900 px-1 py-0.5 rounded">stripeSubscriptionId</code>, <code className="text-white font-mono bg-slate-900 px-1 py-0.5 rounded">stripePriceId</code> e renovação automática.</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
              <span className="font-bold text-amber-400 block">Checkout Sessions & Webhooks</span>
              <p className="text-slate-400">Estrutura preparada para receber webhooks do Stripe de pagamento confirmado/falho.</p>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="font-bold text-white text-xs block">Pronto para Integração sem Regressões</span>
                <p className="text-[11px] text-slate-400">Toda a camada financeira utiliza o padrão desacoplado SOLID (BillingService, InvoiceService, SubscriptionService).</p>
              </div>
            </div>
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs"
            >
              Inserir Chaves Stripe
            </button>
          </div>
        </div>
      )}

      {/* Modals Container */}
      <NewInvoiceModal
        isOpen={newInvoiceModalOpen}
        onClose={() => setNewInvoiceModalOpen(false)}
        restaurants={restaurants}
        plans={plans}
        onCreateInvoice={handleCreateInvoice}
      />

      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onMarkAsPaid={handleMarkAsPaid}
        onCancelInvoice={handleCancelInvoice}
        onDuplicateInvoice={handleDuplicateInvoice}
        onOpenEdit={handleOpenEdit}
        onViewReceipt={handleViewReceiptByInvoice}
      />

      <ReceiptModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />

      <PaymentSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      {/* Edit Invoice Modal */}
      {editInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Editar Fatura #{editInvoice.number}</h3>
              <button onClick={() => setEditInvoice(null)} className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditInvoice} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Valor Base (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editDiscounts}
                    onChange={(e) => setEditDiscounts(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-emerald-400 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Acréscimo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAdditions}
                    onChange={(e) => setEditAdditions(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-amber-400 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Data de Vencimento</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Observações Internas</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditInvoice(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
