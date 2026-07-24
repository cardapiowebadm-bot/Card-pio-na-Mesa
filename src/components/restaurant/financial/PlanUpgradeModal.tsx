import React, { useState } from 'react';
import { X, Sparkles, Check, ChevronRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { useRestaurantBilling } from '../../../contexts/RestaurantBillingContext';
import { MasterPlan } from '../../../types';

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({ isOpen, onClose }) => {
  const { allPlans, currentPlan, requestPlanUpgrade } = useRestaurantBilling();
  const [requestingPlanId, setRequestingPlanId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestUpgrade = async (plan: MasterPlan) => {
    setRequestingPlanId(plan.id);
    await requestPlanUpgrade(plan.id);
    setRequestingPlanId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 my-8">
        
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md px-6 py-5 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 text-rose-600 p-2 rounded-2xl">
              <Sparkles className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-display">Planos e Upgrade</h3>
              <p className="text-xs text-slate-500">Compare nossos recursos e escolha o plano ideal para a escala do seu negócio</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {allPlans.map((plan) => {
              const isCurrent = currentPlan?.id === plan.id;
              const isPopular = plan.id === 'gourmet' || plan.order === 2;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-6 border transition-all flex flex-col justify-between ${
                    isCurrent 
                      ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20' 
                      : isPopular 
                        ? 'border-rose-500 bg-white shadow-xl ring-2 ring-rose-500/20' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {isPopular && !isCurrent && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-600 to-amber-500 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      Mais Popular
                    </span>
                  )}

                  {isCurrent && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      Seu Plano Atual
                    </span>
                  )}

                  <div>
                    <div className="mb-4">
                      <h4 className="text-lg font-bold text-slate-900 font-display">{plan.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>
                    </div>

                    <div className="my-4 pb-4 border-b border-slate-100">
                      <span className="text-3xl font-black text-slate-900 tracking-tight">
                        R$ {plan.price.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-500"> /mês</span>
                    </div>

                    {/* Limits */}
                    <div className="space-y-2 mb-6 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span className="font-medium">Mesas:</span>
                        <span className="font-bold text-slate-800">
                          {plan.limits?.maxTables === 0 || !plan.limits?.maxTables ? 'Ilimitadas' : `${plan.limits.maxTables} mesas`}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="font-medium">Garçons:</span>
                        <span className="font-bold text-slate-800">
                          {plan.limits?.maxWaiters === 0 ? 'Ilimitados' : `${plan.limits?.maxWaiters || 10} garçons`}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span className="font-medium">Trial Grátis:</span>
                        <span className="font-bold text-slate-800">{plan.limits?.trialDays || 14} dias</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2.5 my-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Recursos Incluídos:
                      </span>
                      {plan.features?.map((featId, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                          <div className="p-0.5 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="capitalize">{featId.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs cursor-default flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Plano Atual Ativo
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRequestUpgrade(plan)}
                        disabled={requestingPlanId !== null}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                          isPopular
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-900/10'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {requestingPlanId === plan.id ? 'Gerando Checkout...' : 'Contratar / Alterar Plano'}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info note */}
          <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Como funciona a contratação via Stripe?</strong> Ao clicar em "Contratar / Alterar Plano", você será redirecionado com segurança para o Checkout Oficial do Stripe. Após a confirmação do pagamento ou alteração, a liberação dos recursos e a atualização dos limites são automáticas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
