import React from 'react';
import { History, CheckCircle2, FileText, Sparkles, AlertTriangle, RefreshCw, UserCheck } from 'lucide-react';
import { useRestaurantBilling } from '../../../contexts/RestaurantBillingContext';
import { PaymentHistoryLog } from '../../../types/financial';

export const RestaurantHistoryTimeline: React.FC = () => {
  const { historyLogs } = useRestaurantBilling();

  const getActionIcon = (action: PaymentHistoryLog['action']) => {
    switch (action) {
      case 'invoice_paid':
        return <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600"><CheckCircle2 className="w-4 h-4" /></div>;
      case 'invoice_created':
        return <div className="p-2 rounded-xl bg-amber-100 text-amber-600"><FileText className="w-4 h-4" /></div>;
      case 'upgrade_requested':
      case 'plan_changed':
        return <div className="p-2 rounded-xl bg-rose-100 text-rose-600"><Sparkles className="w-4 h-4" /></div>;
      case 'billing_info_updated':
        return <div className="p-2 rounded-xl bg-blue-100 text-blue-600"><UserCheck className="w-4 h-4" /></div>;
      case 'invoice_canceled':
        return <div className="p-2 rounded-xl bg-slate-100 text-slate-600"><AlertTriangle className="w-4 h-4" /></div>;
      default:
        return <div className="p-2 rounded-xl bg-slate-100 text-slate-600"><RefreshCw className="w-4 h-4" /></div>;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
        <div className="p-2 bg-slate-900 text-white rounded-xl">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-display">Histórico Financeiro</h3>
          <p className="text-xs text-slate-500">Linha do tempo auditável de eventos financeiros do seu restaurante</p>
        </div>
      </div>

      {historyLogs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Nenhum evento registrado até o momento.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100">
          {historyLogs.map((log) => (
            <div key={log.id} className="relative flex items-start gap-4">
              <div className="absolute -left-6 top-0">
                {getActionIcon(log.action)}
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 text-xs">{log.description}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100/80">
                  <span>Por: <strong className="text-slate-700">{log.performedBy}</strong></span>
                  {log.amount && (
                    <span>Valor: <strong className="text-slate-900">R$ {log.amount.toFixed(2)}</strong></span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
