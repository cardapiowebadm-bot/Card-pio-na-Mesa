import React from 'react';
import { BarChart3, TrendingUp, Users, ShieldAlert, FileSpreadsheet, Sparkles } from 'lucide-react';

export default function MasterReports() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Estrutura Preparada de Relatórios</span>
        </div>
        <h1 className="text-2xl font-bold text-white font-display">Relatórios, Métricas & Auditoria</h1>
        <p className="text-xs text-slate-400 mt-1">
          Estatísticas consolidadas de consumo do SaaS e registros globais de logs de auditoria.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-white">Relatório de Uso por Restaurante</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Acompanhe o volume total de comandas, chamados de garçom e tráfego de cardápio por estabelecimento.
          </p>
          <button disabled className="text-xs text-slate-500 font-semibold pt-2 block cursor-not-allowed">
            Exportar CSV / PDF (Em Breve)
          </button>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-white">Métricas de Faturamento & Conversão</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Gráficos comparativos de retenção (Churn), LTV (Lifetime Value) e tempo médio de permanência.
          </p>
          <button disabled className="text-xs text-slate-500 font-semibold pt-2 block cursor-not-allowed">
            Ver Gráficos (Em Breve)
          </button>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-white">Logs de Auditoria & Segurança</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Rastreamento de acessos Master, alterações de status e permissões concedidas aos restaurantes.
          </p>
          <button disabled className="text-xs text-slate-500 font-semibold pt-2 block cursor-not-allowed">
            Consultar Logs (Em Breve)
          </button>
        </div>
      </div>
    </div>
  );
}
