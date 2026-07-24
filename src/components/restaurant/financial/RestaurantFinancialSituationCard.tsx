import React from 'react';
import { CreditCard, AlertTriangle, CheckCircle2, Clock, QrCode, ArrowRight } from 'lucide-react';
import { useRestaurantBilling } from '../../../contexts/RestaurantBillingContext';
import { Invoice } from '../../../types/financial';

interface RestaurantFinancialSituationCardProps {
  onPayInvoice: (invoice: Invoice) => void;
}

export const RestaurantFinancialSituationCard: React.FC<RestaurantFinancialSituationCardProps> = ({ onPayInvoice }) => {
  const { openInvoice, stats, invoices } = useRestaurantBilling();

  const latestInvoice = openInvoice || invoices[0];

  const hasOverdue = stats.overdueCount > 0;
  const hasPending = stats.pendingCount > 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${hasOverdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700'}`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">Situação Financeira</h4>
              <p className="text-xs text-slate-500">Resumo da sua mensalidade SaaS</p>
            </div>
          </div>

          {hasOverdue ? (
            <span className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              Fatura Vencida
            </span>
          ) : hasPending ? (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              Fatura Em Aberto
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Adimplente
            </span>
          )}
        </div>

        {/* Highlighted Invoice Box */}
        {latestInvoice ? (
          <div className={`p-4 rounded-2xl border mb-5 ${
            latestInvoice.status === 'vencido' 
              ? 'bg-rose-50/50 border-rose-200' 
              : latestInvoice.status === 'em_aberto' 
                ? 'bg-amber-50/30 border-amber-200'
                : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  {latestInvoice.status === 'pago' ? 'Última Fatura Paga' : 'Próxima Fatura'} (#{latestInvoice.number})
                </span>
                <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                  R$ {latestInvoice.finalAmount.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Competência: <span className="font-semibold text-slate-700">{latestInvoice.competence}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Vencimento
                </span>
                <p className={`text-sm font-bold mt-1 ${latestInvoice.status === 'vencido' ? 'text-rose-600' : 'text-slate-800'}`}>
                  {latestInvoice.dueDate ? new Date(latestInvoice.dueDate).toLocaleDateString('pt-BR') : 'A definir'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-5 text-center text-slate-500 text-xs">
            Nenhuma fatura gerada até o momento.
          </div>
        )}

        {/* Quick Counters */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Em Aberto</span>
            <p className="text-base font-bold text-slate-800 mt-0.5">
              R$ {stats.pendingTotal.toFixed(2)} <span className="text-xs font-normal text-slate-500">({stats.pendingCount})</span>
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Vencidas</span>
            <p className={`text-base font-bold mt-0.5 ${stats.overdueCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              R$ {stats.overdueTotal.toFixed(2)} <span className="text-xs font-normal text-slate-500">({stats.overdueCount})</span>
            </p>
          </div>
        </div>
      </div>

      {/* Pay Now Button */}
      {openInvoice && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => onPayInvoice(openInvoice)}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 hover:shadow-lg active:scale-98"
          >
            <QrCode className="w-4 h-4" />
            Pagar Fatura Agora (PIX / Cartão)
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
      )}
    </div>
  );
};
