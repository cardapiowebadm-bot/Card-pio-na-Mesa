import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Users, 
  Calendar 
} from 'lucide-react';
import { FinancialKPIs as FinancialKPIsType } from '../../../services/financial';

interface FinancialKPIsProps {
  kpis: FinancialKPIsType;
}

export default function FinancialKPIs({ kpis }: FinancialKPIsProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Receita Mensal Prevista */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Receita Mensal Prevista</span>
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-display tracking-tight">
          {formatCurrency(kpis.expectedMonthlyRevenue)}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
          <span>Projeção atual do mês</span>
          <span className="text-indigo-400 font-bold">100% faturamento</span>
        </div>
      </div>

      {/* KPI 2: Receita Recebida */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Receita Recebida</span>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-emerald-400 font-display tracking-tight">
          {formatCurrency(kpis.receivedRevenue)}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
          <span>Pagamentos confirmados</span>
          <span className="text-emerald-400 font-bold">Pago</span>
        </div>
      </div>

      {/* KPI 3: Receita Pendente */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-amber-500/50 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Receita Pendente</span>
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-amber-400 font-display tracking-tight">
          {formatCurrency(kpis.pendingRevenue)}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
          <span>Em aberto & Vencidos</span>
          <span className="text-amber-400 font-bold">Aguardando</span>
        </div>
      </div>

      {/* KPI 4: Assinaturas Ativas */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-sky-500/50 transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Assinaturas Ativas</span>
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-display tracking-tight">
          {kpis.totalActiveSubscriptions} <span className="text-xs font-normal text-slate-400">assinantes</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
          <span>Adimplentes: <strong className="text-emerald-400">{kpis.compliantCount}</strong></span>
          <span>Inadimplentes: <strong className="text-rose-400">{kpis.defaultingCount}</strong></span>
        </div>
      </div>

      {/* Quick Summary Strip */}
      <div className="sm:col-span-2 lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Restaurantes Adimplentes: <strong className="text-white">{kpis.compliantCount}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Restaurantes Inadimplentes: <strong className="text-rose-300">{kpis.defaultingCount}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Trials Ativos: <strong className="text-amber-300">{kpis.activeTrialsCount}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span>Trials Encerrando (&le; 7 dias): <strong className="text-sky-300">{kpis.endingTrialsCount}</strong></span>
        </div>
      </div>
    </div>
  );
}
