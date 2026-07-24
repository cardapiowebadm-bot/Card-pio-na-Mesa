import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  Receipt as ReceiptIcon, 
  Copy as DuplicateIcon, 
  Clock, 
  AlertCircle, 
  Ban, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Building2,
  DollarSign
} from 'lucide-react';
import { Invoice, InvoiceStatus, InvoicePaymentMethod } from '../../../types/financial';
import { Restaurant, MasterPlan } from '../../../types';

interface InvoicesTableProps {
  invoices: Invoice[];
  restaurants: Restaurant[];
  plans: MasterPlan[];
  onSelectInvoice: (invoice: Invoice) => void;
  onMarkAsPaid: (invoice: Invoice, method: InvoicePaymentMethod) => Promise<void>;
  onViewReceipt: (invoice: Invoice) => void;
  onDuplicateInvoice: (invoice: Invoice) => void;
}

export default function InvoicesTable({
  invoices,
  restaurants,
  plans,
  onSelectInvoice,
  onMarkAsPaid,
  onViewReceipt,
  onDuplicateInvoice
}: InvoicesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [restaurantFilter, setRestaurantFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [competenceFilter, setCompetenceFilter] = useState<string>('all');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Lista de competências únicas encontradas nas faturas
  const competencesList = useMemo(() => {
    const setComp = new Set<string>();
    invoices.forEach(inv => {
      if (inv.competence) setComp.add(inv.competence);
    });
    return Array.from(setComp);
  }, [invoices]);

  // Filtro inteligente
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Busca em tempo real por número ou nome do restaurante
      const matchesSearch = 
        inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.internalNotes && inv.internalNotes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Status
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

      // Restaurante
      const matchesRestaurant = restaurantFilter === 'all' || inv.restaurantId === restaurantFilter;

      // Plano
      const matchesPlan = planFilter === 'all' || inv.planId === planFilter;

      // Competência
      const matchesCompetence = competenceFilter === 'all' || inv.competence === competenceFilter;

      return matchesSearch && matchesStatus && matchesRestaurant && matchesPlan && matchesCompetence;
    });
  }, [invoices, searchTerm, statusFilter, restaurantFilter, planFilter, competenceFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'pago':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Pago
          </span>
        );
      case 'em_aberto':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Em Aberto
          </span>
        );
      case 'vencido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            Vencido
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <Ban className="w-3 h-3" />
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Search & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Real-time search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por fatura (#INV-...), restaurante ou observação..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Status Quick Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'em_aberto', label: 'Em Aberto' },
              { id: 'pago', label: 'Pagas' },
              { id: 'vencido', label: 'Vencidas' },
              { id: 'cancelado', label: 'Canceladas' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Dropdowns Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60">
          
          {/* Restaurant Filter */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={restaurantFilter}
              onChange={(e) => { setRestaurantFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-xs text-slate-200 w-full outline-none cursor-pointer"
            >
              <option value="all">Todos os Restaurantes</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-xs text-slate-200 w-full outline-none cursor-pointer"
            >
              <option value="all">Todos os Planos</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Competence Filter */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={competenceFilter}
              onChange={(e) => { setCompetenceFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-xs text-slate-200 w-full outline-none cursor-pointer"
            >
              <option value="all">Todas as Competências</option>
              {competencesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-bold">Número</th>
                <th className="py-3.5 px-4 font-bold">Restaurante</th>
                <th className="py-3.5 px-4 font-bold">Plano</th>
                <th className="py-3.5 px-4 font-bold">Valor Final</th>
                <th className="py-3.5 px-4 font-bold">Competência</th>
                <th className="py-3.5 px-4 font-bold">Vencimento</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {paginatedInvoices.length > 0 ? (
                paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors group">
                    
                    {/* Número */}
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                      {inv.number}
                    </td>

                    {/* Restaurante */}
                    <td className="py-3.5 px-4 font-bold text-white">
                      {inv.restaurantName}
                    </td>

                    {/* Plano */}
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {inv.planName}
                    </td>

                    {/* Valor Final */}
                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      {formatCurrency(inv.finalAmount)}
                    </td>

                    {/* Competência */}
                    <td className="py-3.5 px-4 text-slate-400 font-semibold">
                      {inv.competence}
                    </td>

                    {/* Vencimento */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(inv.status)}
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        <button
                          onClick={() => onSelectInvoice(inv)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                          title="Ver Detalhes da Fatura"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {inv.status !== 'pago' && inv.status !== 'cancelado' && (
                          <button
                            onClick={() => onMarkAsPaid(inv, 'pix')}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-all"
                            title="Marcar como Pago"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {inv.status === 'pago' && (
                          <button
                            onClick={() => onViewReceipt(inv)}
                            className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-all"
                            title="Emitir Recibo"
                          >
                            <ReceiptIcon className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onDuplicateInvoice(inv)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                          title="Duplicar Fatura"
                        >
                          <DuplicateIcon className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Nenhuma fatura encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Exibindo página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
