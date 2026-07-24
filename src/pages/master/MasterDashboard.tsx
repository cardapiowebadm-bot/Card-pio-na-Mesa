import React from 'react';
import { useMaster } from '../../contexts/MasterContext';
import { Link } from 'react-router-dom';
import { 
  Store, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Sparkles,
  Building2,
  Calendar,
  CreditCard
} from 'lucide-react';

export default function MasterDashboard() {
  const { restaurants, stats, loading } = useMaster();

  const indicatorCards = [
    {
      title: 'Total de Restaurantes',
      value: stats.total,
      icon: Store,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      description: 'Cadastrados na plataforma'
    },
    {
      title: 'Restaurantes Ativos',
      value: stats.active,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      description: 'Acesso liberado e operando'
    },
    {
      title: 'Restaurantes Suspensos',
      value: stats.suspended,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      description: 'Acesso pausado temporariamente'
    },
    {
      title: 'Restaurantes Bloqueados',
      value: stats.blocked,
      icon: Ban,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      description: 'Acesso restrito por inadimplência'
    },
    {
      title: 'Em Período de Teste',
      value: stats.trial,
      icon: Clock,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      description: 'Trial gratuito de degustação'
    },
    {
      title: 'Mensalidade Vencida',
      value: stats.expired,
      icon: AlertCircle,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      description: 'Cobrança pendente de renovação'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Painel Executivo Master</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Visão Geral da Plataforma</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Acompanhe os indicadores de crescimento, status de licenças e atividade dos estabelecimentos clientes.
            </p>
          </div>
          <Link
            to="/master/restaurants"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all shrink-0"
          >
            <Building2 className="w-4 h-4" />
            <span>Gerenciar Restaurantes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Grid of Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {indicatorCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`bg-slate-900/80 border ${card.borderColor} rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between`}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400">{card.title}</span>
                <div className={`${card.bgColor} ${card.color} p-2.5 rounded-xl`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white font-display tracking-tight">
                  {loading ? '...' : card.value}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{card.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Registered Restaurants Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Últimos Restaurantes Cadastrados</h2>
            <p className="text-xs text-slate-400">Restaurantes e estabelecimentos clientes registrados na plataforma.</p>
          </div>
          <Link
            to="/master/restaurants"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Ver todos ({restaurants.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Carregando dados dos estabelecimentos...</div>
        ) : restaurants.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">Nenhum restaurante cadastrado até o momento.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Estabelecimento</th>
                  <th className="py-3 px-4">Proprietário / E-mail</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {restaurants.slice(0, 5).map((r) => {
                  const statusColors: Record<string, string> = {
                    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    blocked: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                    trial: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                  };
                  const statusLabels: Record<string, string> = {
                    active: 'Ativo',
                    suspended: 'Suspenso',
                    blocked: 'Bloqueado',
                    trial: 'Em Teste'
                  };
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 font-bold text-xs border border-slate-700">
                            {r.name.charAt(0)}
                          </div>
                          <span>{r.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{r.ownerName || 'Não informado'}</div>
                        <div className="text-[11px] text-slate-500">{r.ownerEmail || 'Não informado'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{r.phone || 'Não informado'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${statusColors[r.status || 'active']}`}>
                          {statusLabels[r.status || 'active']}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-300 font-medium capitalize">{r.plan || 'Gourmet'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/master/restaurants?id=${r.id}`}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline"
                        >
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
