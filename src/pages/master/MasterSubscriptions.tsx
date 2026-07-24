import React from 'react';
import { useMaster } from '../../contexts/MasterContext';
import { CreditCard, Calendar, Check, AlertCircle, RefreshCw, Shield, Sparkles } from 'lucide-react';

export default function MasterSubscriptions() {
  const { restaurants } = useMaster();

  const plansList = [
    { name: 'Plano Bistro', price: 'R$ 99,00/mês', limit: 'Até 10 mesas', count: restaurants.filter(r => r.plan === 'bistro').length },
    { name: 'Plano Gourmet', price: 'R$ 189,00/mês', limit: 'Mesas ilimitadas + IA', count: restaurants.filter(r => (r.plan || 'gourmet') === 'gourmet').length },
    { name: 'Plano Chef Premium', price: 'R$ 299,00/mês', limit: 'Multilojas + Suporte 24/7', count: restaurants.filter(r => r.plan === 'chef').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Estrutura Preparada de Assinaturas</span>
        </div>
        <h1 className="text-2xl font-bold text-white font-display">Gestão de Assinaturas e Planos</h1>
        <p className="text-xs text-slate-400 mt-1">
          Visão geral dos contratos, planos SaaS ativos e renovações recorrentes dos clientes.
        </p>
      </div>

      {/* Plan Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plansList.map((plan, i) => (
          <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{plan.name}</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md font-semibold">
                {plan.count} ativos
              </span>
            </div>
            <p className="text-xl font-extrabold text-indigo-400 font-display">{plan.price}</p>
            <p className="text-[11px] text-slate-400">{plan.limit}</p>
          </div>
        ))}
      </div>

      {/* Subscription List Table Structure */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white">Contratos & Assinaturas Ativas</h2>
            <p className="text-xs text-slate-400">Acompanhamento do status de ciclo de cobrança por estabelecimento.</p>
          </div>
          <button disabled className="text-xs bg-slate-800 text-slate-500 font-semibold px-3 py-1.5 rounded-xl cursor-not-allowed">
            Módulo de Gateway Integrado (Em Breve)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Restaurante</th>
                <th className="py-3 px-4">Plano</th>
                <th className="py-3 px-4">Status Pagamento</th>
                <th className="py-3 px-4">Próxima Renovação</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {restaurants.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">{r.name}</td>
                  <td className="py-3.5 px-4 capitalize">{r.plan || 'Gourmet'}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <Check className="w-3 h-3" />
                      Em Dia
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString('pt-BR') : 'Mensal Autogerido'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="text-[11px] text-indigo-400 hover:underline font-semibold">
                      Alterar Plano
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
