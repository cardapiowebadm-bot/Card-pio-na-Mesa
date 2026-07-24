import React, { useState } from 'react';
import { X, QrCode, Copy, Check, Calendar, Receipt, FileText, CreditCard, ShieldCheck, Printer } from 'lucide-react';
import { Invoice } from '../../../types/financial';
import { toast } from 'react-hot-toast';

interface RestaurantInvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RestaurantInvoiceDetailModal: React.FC<RestaurantInvoiceDetailModalProps> = ({ invoice, isOpen, onClose }) => {
  const [copiedPix, setCopiedPix] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'pix' | 'card' | 'history'>('pix');

  if (!isOpen || !invoice) return null;

  const handleCopyPix = () => {
    if (invoice.pixPayload) {
      navigator.clipboard.writeText(invoice.pixPayload);
      setCopiedPix(true);
      toast.success('Código PIX Copia e Cola copiado!');
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const statusBadgeMap: Record<string, { label: string; bg: string; text: string }> = {
    em_aberto: { label: 'Em Aberto', bg: 'bg-amber-100 text-amber-800 border-amber-200', text: 'text-amber-700' },
    pago: { label: 'Pago', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', text: 'text-emerald-700' },
    vencido: { label: 'Vencido', bg: 'bg-rose-100 text-rose-800 border-rose-200', text: 'text-rose-700' },
    cancelado: { label: 'Cancelado', bg: 'bg-slate-100 text-slate-800 border-slate-200', text: 'text-slate-700' }
  };

  const badge = statusBadgeMap[invoice.status] || statusBadgeMap.em_aberto;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 my-8">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md px-6 py-5 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2.5 rounded-2xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 font-display">Fatura #{invoice.number}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-slate-500">Competência {invoice.competence} • Emissão: {new Date(invoice.issueDate).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              title="Imprimir Fatura"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Box */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Valor Total</span>
                <p className="text-3xl font-black text-white tracking-tight mt-1">
                  R$ {invoice.finalAmount.toFixed(2)}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Plano: <span className="font-semibold text-white">{invoice.planName}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Data de Vencimento</span>
                <p className={`text-base font-bold mt-1 ${invoice.status === 'vencido' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Options Tabs (Only if open/overdue) */}
          {(invoice.status === 'em_aberto' || invoice.status === 'vencido') && (
            <div>
              <div className="flex gap-2 border-b border-slate-100 pb-3 mb-4">
                <button
                  onClick={() => setSelectedTab('pix')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                    selectedTab === 'pix' 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/10' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  Pagar via PIX
                </button>
                <button
                  onClick={() => setSelectedTab('card')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                    selectedTab === 'card' 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Cartão de Crédito
                </button>
                <button
                  onClick={() => setSelectedTab('history')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                    selectedTab === 'history' 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Histórico
                </button>
              </div>

              {/* PIX Tab */}
              {selectedTab === 'pix' && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 text-center">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-4">
                    Escaneie o QR Code abaixo pelo aplicativo do seu banco:
                  </span>

                  <div className="inline-block p-4 bg-white rounded-2xl shadow-md border border-slate-100 mb-4">
                    <img 
                      src={invoice.pixQrCode || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invoice.pixPayload || '')}`} 
                      alt="PIX QR Code" 
                      className="w-48 h-48 mx-auto"
                    />
                  </div>

                  <p className="text-xs text-slate-500 mb-3">Chave PIX ou PIX Copia e Cola:</p>

                  <div className="flex items-center gap-2 max-w-md mx-auto">
                    <input
                      type="text"
                      readOnly
                      value={invoice.pixPayload || '00020126580014BR.GOV.BCB.PIX...'}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 truncate focus:outline-none"
                    />
                    <button
                      onClick={handleCopyPix}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                    >
                      {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedPix ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Credit Card Tab */}
              {selectedTab === 'card' && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 text-center">
                  <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-800 text-sm">Pagamento via Cartão de Crédito</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    A estrutura de Checkout via Stripe para cartões de crédito está configurada e pronta para ser habilitada na próxima etapa.
                  </p>
                  <button
                    disabled
                    className="px-6 py-2.5 bg-slate-200 text-slate-500 rounded-2xl text-xs font-bold cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Stripe Checkout (Em Breve)
                  </button>
                </div>
              )}

              {/* History Tab */}
              {selectedTab === 'history' && (
                <div className="space-y-3">
                  {invoice.history?.map((h, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-800 block">{h.action}</span>
                        <p className="text-slate-600 mt-0.5">{h.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                        {new Date(h.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Paid Invoice Confirmation */}
          {invoice.status === 'pago' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-emerald-900 text-base">Fatura Paga com Sucesso</h4>
              <p className="text-xs text-emerald-700 mt-1">
                Confirmado em {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString('pt-BR') : 'Data não informada'} via {invoice.paymentMethod?.toUpperCase() || 'PIX'}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
