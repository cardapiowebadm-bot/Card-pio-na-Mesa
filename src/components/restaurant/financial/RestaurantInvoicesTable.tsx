import React, { useState } from 'react';
import { Search, Filter, Eye, QrCode, FileText, CheckCircle2, AlertTriangle, Clock, Download, Printer } from 'lucide-react';
import { useRestaurantBilling } from '../../../contexts/RestaurantBillingContext';
import { Invoice, InvoiceStatus } from '../../../types/financial';

interface RestaurantInvoicesTableProps {
  onSelectInvoice: (invoice: Invoice) => void;
  onPayInvoice: (invoice: Invoice) => void;
}

export const RestaurantInvoicesTable: React.FC<RestaurantInvoicesTableProps> = ({ onSelectInvoice, onPayInvoice }) => {
  const { invoices } = useRestaurantBilling();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');

  // Multi-tenant filtered items
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.competence.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.planName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'todos' || inv.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const statusBadgeMap: Record<InvoiceStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    em_aberto: { label: 'Em Aberto', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
    pago: { label: 'Pago', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    vencido: { label: 'Vencido', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    cancelado: { label: 'Cancelado', bg: 'bg-slate-100 text-slate-700 border-slate-200', text: 'text-slate-700', icon: <Clock className="w-3.5 h-3.5" /> }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      
      {/* Header Controls */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-display">Suas Faturas</h3>
          <p className="text-xs text-slate-500">Histórico completo de cobranças e faturas do seu estabelecimento</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar fatura ou competência..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {[
              { id: 'todos', label: 'Todas' },
              { id: 'em_aberto', label: 'Em Aberto' },
              { id: 'pago', label: 'Pagas' },
              { id: 'vencido', label: 'Vencidas' },
              { id: 'cancelado', label: 'Canceladas' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedStatus === st.id 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-6">Fatura</th>
              <th className="py-3.5 px-6">Plano / Competência</th>
              <th className="py-3.5 px-6">Emissão</th>
              <th className="py-3.5 px-6">Vencimento</th>
              <th className="py-3.5 px-6">Valor</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Nenhuma fatura encontrada.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const badge = statusBadgeMap[inv.status] || statusBadgeMap.em_aberto;

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-all">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      #{inv.number}
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-800 block">{inv.planName}</span>
                      <span className="text-[11px] text-slate-500">Comp. {inv.competence}</span>
                    </td>

                    <td className="py-4 px-6 text-slate-600">
                      {new Date(inv.issueDate).toLocaleDateString('pt-BR')}
                    </td>

                    <td className={`py-4 px-6 font-semibold ${inv.status === 'vencido' ? 'text-rose-600' : 'text-slate-700'}`}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('pt-BR') : '-'}
                    </td>

                    <td className="py-4 px-6 font-black text-slate-900">
                      R$ {inv.finalAmount.toFixed(2)}
                    </td>

                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(inv.status === 'em_aberto' || inv.status === 'vencido') && (
                          <button
                            onClick={() => onPayInvoice(inv)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Pagar
                          </button>
                        )}

                        <button
                          onClick={() => onSelectInvoice(inv)}
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                          title="Ver Detalhes da Fatura"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
