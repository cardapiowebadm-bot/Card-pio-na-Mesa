import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  Clock, 
  Ban, 
  Sparkles, 
  Lock,
  Building2,
  Calendar
} from 'lucide-react';
import { Subscription } from '../../../types/financial';
import { Restaurant, MasterPlan } from '../../../types';

interface SubscriptionsTableProps {
  subscriptions: Subscription[];
  restaurants: Restaurant[];
  plans: MasterPlan[];
  onCancelSubscription: (subscriptionId: string, restaurantId: string, restaurantName: string) => Promise<void>;
}

export default function SubscriptionsTable({
  subscriptions,
  restaurants,
  plans,
  onCancelSubscription
}: SubscriptionsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredSubs = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.planName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Ativa
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3 h-3" />
            Avaliação
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Ban className="w-3 h-3" />
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar assinatura por restaurante ou plano..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'active', label: 'Ativas' },
            { id: 'trialing', label: 'Em Avaliação' },
            { id: 'canceled', label: 'Canceladas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-bold">Restaurante</th>
                <th className="py-3.5 px-4 font-bold">Plano Contratado</th>
                <th className="py-3.5 px-4 font-bold">Mensalidade</th>
                <th className="py-3.5 px-4 font-bold">Renovação</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">Stripe Prep</th>
                <th className="py-3.5 px-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredSubs.length > 0 ? (
                filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {sub.restaurantName}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-300">
                      {sub.planName}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      {formatCurrency(sub.price)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {new Date(sub.renewalDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(sub.status)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-1 rounded-md border border-slate-800 font-mono">
                        {sub.stripeSubscriptionId ? sub.stripeSubscriptionId : 'stripe_sub_prep'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {sub.status !== 'canceled' && (
                        <button
                          onClick={() => onCancelSubscription(sub.id, sub.restaurantId, sub.restaurantName)}
                          className="text-rose-400 hover:text-rose-300 text-xs font-semibold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Nenhuma assinatura encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
