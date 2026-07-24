import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Ban, 
  Copy, 
  QrCode, 
  Receipt as ReceiptIcon, 
  Edit3, 
  Copy as DuplicateIcon, 
  Calendar, 
  DollarSign, 
  Building2, 
  FileText, 
  Check, 
  Lock, 
  Sparkles,
  CreditCard
} from 'lucide-react';
import { Invoice, InvoicePaymentMethod } from '../../../types/financial';
import toast from 'react-hot-toast';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onMarkAsPaid: (invoice: Invoice, method: InvoicePaymentMethod, notes?: string) => Promise<void>;
  onCancelInvoice: (invoice: Invoice, reason: string) => Promise<void>;
  onDuplicateInvoice: (invoice: Invoice) => void;
  onOpenEdit: (invoice: Invoice) => void;
  onViewReceipt: (invoice: Invoice) => void;
}

export default function InvoiceDetailModal({
  invoice,
  onClose,
  onMarkAsPaid,
  onCancelInvoice,
  onDuplicateInvoice,
  onOpenEdit,
  onViewReceipt
}: InvoiceDetailModalProps) {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<InvoicePaymentMethod>('pix');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!invoice) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleCopyPayload = () => {
    if (invoice.pixPayload) {
      navigator.clipboard.writeText(invoice.pixPayload);
      setCopiedPayload(true);
      toast.success('Payload PIX copiado!');
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

  const handleCopyKey = () => {
    if (invoice.pixKey) {
      navigator.clipboard.writeText(invoice.pixKey);
      setCopiedKey(true);
      toast.success('Chave PIX copiada!');
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleConfirmPayment = async () => {
    try {
      setLoading(true);
      await onMarkAsPaid(invoice, selectedPayMethod, paymentNotes);
      toast.success('Fatura marcada como PAGA com sucesso!');
      setPayModalOpen(false);
    } catch {
      toast.error('Erro ao marcar fatura como paga.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    try {
      setLoading(true);
      await onCancelInvoice(invoice, cancelReason);
      toast.success('Fatura cancelada com sucesso!');
      setCancelModalOpen(false);
    } catch {
      toast.error('Erro ao cancelar fatura.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pago
          </span>
        );
      case 'em_aberto':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Em Aberto
          </span>
        );
      case 'vencido':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            Vencido
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <Ban className="w-3.5 h-3.5" />
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full text-slate-100 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg text-white">{invoice.number}</h3>
                {getStatusBadge(invoice.status)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Fatura de mensalidade do SaaS</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Main Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Restaurante */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                Restaurante
              </span>
              <p className="text-sm font-bold text-white truncate">{invoice.restaurantName}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">ID: {invoice.restaurantId}</p>
            </div>

            {/* Plano & Competencia */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Plano & Competência
              </span>
              <p className="text-sm font-bold text-white">{invoice.planName}</p>
              <p className="text-[11px] text-indigo-400 font-semibold mt-0.5">Competência: {invoice.competence}</p>
            </div>

            {/* Datas */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 sm:col-span-2 lg:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Datas de Vencimento
              </span>
              <p className="text-xs text-slate-300">
                Vencimento: <strong className="text-white">{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</strong>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Emissão: {new Date(invoice.issueDate).toLocaleDateString('pt-BR')}
              </p>
            </div>

          </div>

          {/* Breakdown Valores */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Detalhamento Financeiro
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Valor Base do Plano:</span>
                <span className="text-slate-200 font-medium">{formatCurrency(invoice.amount)}</span>
              </div>
              {invoice.discounts > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Descontos Aplicados:</span>
                  <span>- {formatCurrency(invoice.discounts)}</span>
                </div>
              )}
              {invoice.additions > 0 && (
                <div className="flex items-center justify-between text-amber-400">
                  <span>Acréscimos / Multa:</span>
                  <span>+ {formatCurrency(invoice.additions)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm font-bold text-white">
                <span>Valor Final Cobrado:</span>
                <span className="text-emerald-400 text-lg font-black">{formatCurrency(invoice.finalAmount)}</span>
              </div>
            </div>
          </div>

          {/* PIX Structure Visual Container */}
          {invoice.status !== 'cancelado' && (
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Estrutura PIX para Pagamento</h4>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                  PIX Instantâneo
                </span>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* QR Code image */}
                {invoice.pixQrCode && (
                  <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-200 shrink-0">
                    <img 
                      src={invoice.pixQrCode} 
                      alt="QR Code PIX" 
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                )}

                {/* PIX Payload & Details */}
                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Payload PIX (Copia e Cola):</label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 px-3">
                      <input 
                        type="text" 
                        readOnly 
                        value={invoice.pixPayload || ''} 
                        className="bg-transparent text-xs text-slate-300 font-mono flex-1 outline-none truncate"
                      />
                      <button
                        onClick={handleCopyPayload}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all"
                      >
                        {copiedPayload ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPayload ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 font-semibold block">Chave PIX SaaS:</span>
                      <div className="flex items-center justify-between text-slate-200 font-mono mt-0.5">
                        <span className="truncate">{invoice.pixKey || '000.000.000-00'}</span>
                        <button onClick={handleCopyKey} className="text-indigo-400 hover:text-indigo-300 ml-1">
                          {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 font-semibold block">TXID da Transação:</span>
                      <span className="text-slate-300 font-mono text-[11px] truncate block mt-0.5">{invoice.txid || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Observações Internas */}
          {invoice.internalNotes && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Observações Internas
              </span>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{invoice.internalNotes}</p>
            </div>
          )}

          {/* Timeline de Histórico */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Histórico da Cobrança
            </h4>

            <div className="space-y-3">
              {invoice.history && invoice.history.length > 0 ? (
                invoice.history.map((h, i) => (
                  <div key={i} className="flex gap-3 text-xs border-l-2 border-indigo-500/30 pl-3 py-0.5">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-200">{h.action}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">{h.details}</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {new Date(h.timestamp).toLocaleString('pt-BR')} &bull; por {h.performedBy}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Sem histórico de alterações.</p>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-900/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            {invoice.status === 'pago' ? (
              <button
                onClick={() => onViewReceipt(invoice)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
              >
                <ReceiptIcon className="w-4 h-4" />
                <span>Emitir Recibo</span>
              </button>
            ) : invoice.status !== 'cancelado' ? (
              <button
                onClick={() => setPayModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Marcar como Pago</span>
              </button>
            ) : null}

            <button
              onClick={() => onOpenEdit(invoice)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
              <span>Editar</span>
            </button>

            <button
              onClick={() => onDuplicateInvoice(invoice)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <DuplicateIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Duplicar</span>
            </button>
          </div>

          <div>
            {invoice.status !== 'cancelado' && invoice.status !== 'pago' && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl text-xs font-medium border border-rose-500/30 transition-all flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancelar Fatura</span>
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Pay Modal Confirmation */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Confirmar Pagamento da Fatura
            </h3>
            <p className="text-xs text-slate-400">
              Escolha a forma de pagamento e adicione observações. Um recibo será gerado automaticamente.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Meio de Pagamento:</label>
                <select
                  value={selectedPayMethod}
                  onChange={(e) => setSelectedPayMethod(e.target.value as InvoicePaymentMethod)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                >
                  <option value="pix">PIX Instantâneo</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit_card">Cartão de Débito</option>
                  <option value="bank_transfer">Transferência Bancária</option>
                  <option value="stripe">Stripe Gateway</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Observação do Pagamento (opcional):</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ex: Recebido via comprovante WhatsApp"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPayModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                {loading ? 'Confirmando...' : 'Confirmar e Emitir Recibo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal Confirmation */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 text-rose-400">
              <Ban className="w-5 h-5" />
              Cancelar Fatura #{invoice.number}
            </h3>
            <p className="text-xs text-slate-400">
              Informe o motivo do cancelamento para registro na auditoria do sistema.
            </p>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">Motivo do Cancelamento:</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Fatura gerada duplicada / Troca de plano"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
              >
                {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
