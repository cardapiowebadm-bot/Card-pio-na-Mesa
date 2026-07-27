import React from 'react';
import { Sparkles, ArrowUpRight, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
import { useRestaurantBilling } from '../../../contexts/RestaurantBillingContext';

interface RestaurantPlanCardProps {
  onOpenUpgradeModal: () => void;
}

export const RestaurantPlanCard: React.FC<RestaurantPlanCardProps> = ({ onOpenUpgradeModal }) => {
  const { currentPlan, subscription, stats, openCustomerPortal } = useRestaurantBilling();

  const isTrial = subscription?.isTrial || false;
  const trialDays = stats.trialDaysRemaining;

  const statusMap: Record<string, { label: string; bg: string; text: string }> = {
    active: { label: 'Assinatura Ativa', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' },
    trial: { label: 'Período de Avaliação', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' },
    trialing: { label: 'Período de Avaliação', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' },
    past_due: { label: 'Pagamento Pendente', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' },
    unpaid: { label: 'Não Pago', bg: 'bg-rose-100 text-rose-800 border-rose-300', text: 'text-rose-800' },
    canceled: { label: 'Cancelada', bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700' },
    paused: { label: 'Pausada', bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700' },
    expired: { label: 'Expirada', bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700' },
  };

  const currentStatus = statusMap[stats.subscriptionStatus] || statusMap.active;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
      {/* Background Subtle Accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${currentStatus.bg}`}>
                {currentStatus.label}
              </span>
              {isTrial && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <Clock className="w-3.5 h-3.5" />
                  {trialDays} {trialDays === 1 ? 'dia restante' : 'dias restantes'}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 font-display mt-2">
              {currentPlan?.name || 'Plano Gourmet'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentPlan?.description || 'Plano atual contratado para o seu restaurante.'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              R$ {currentPlan?.price ? currentPlan.price.toFixed(2) : '189,00'}
            </span>
            <span className="text-xs text-slate-500 block">/mês</span>
          </div>
        </div>

        {/* Limits Grid */}
        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Limites de Mesas</span>
            <p className="text-lg font-bold text-slate-800 mt-0.5">
              {currentPlan?.limits?.maxTables === 0 || !currentPlan?.limits?.maxTables 
                ? 'Ilimitadas' 
                : `${currentPlan.limits.maxTables} mesas`}
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Limites de Garçons</span>
            <p className="text-lg font-bold text-slate-800 mt-0.5">
              {currentPlan?.limits?.maxWaiters === 0 
                ? 'Ilimitados' 
                : `${currentPlan?.limits?.maxWaiters || 10} garçons`}
            </p>
          </div>
        </div>

        {/* Renewal & Dates */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-rose-500" />
            Renovação automática Stripe
          </span>
          <span className="font-semibold text-slate-700">
            Próxima cobrança: {stats.nextDueDate}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={openCustomerPortal}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-all shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
          Gerenciar Assinatura (Portal Stripe)
        </button>

        <button
          onClick={onOpenUpgradeModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-md shadow-rose-900/10 hover:shadow-lg active:scale-95 shrink-0"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          Alterar / Contratar Plano
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
