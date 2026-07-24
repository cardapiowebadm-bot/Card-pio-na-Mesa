import React from 'react';
import { usePlan } from '../contexts/PlanContext';
import { ShieldAlert, Sparkles, X, Check } from 'lucide-react';

export default function UpgradeModal() {
  const { upgradeModalData, closeUpgradeModal, activePlan, plans } = usePlan();

  if (!upgradeModalData || !upgradeModalData.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
        <button
          onClick={closeUpgradeModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-rose-600 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-500">Recurso Exclusivo</span>
            <h3 className="text-lg font-bold text-slate-900">{upgradeModalData.title}</h3>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 text-sm text-slate-600 leading-relaxed">
          {upgradeModalData.message}
        </div>

        {activePlan && (
          <div className="mb-6">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Seu plano atual:</p>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/80 border border-slate-200">
              <span className="font-semibold text-slate-800">{activePlan.name}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-medium">
                R$ {activePlan.price.toFixed(2)}/mês
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={closeUpgradeModal}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm transition-all"
          >
            Entendido
          </button>
          <a
            href="https://wa.me/?text=Olá!%20Gostaria%20de%20solicitar%20o%20upgrade%20do%20meu%20plano%20no%20Cardápio%20na%20Mesa."
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeUpgradeModal}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-all shadow-md shadow-rose-200 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Solicitar Upgrade
          </a>
        </div>
      </div>
    </div>
  );
}
