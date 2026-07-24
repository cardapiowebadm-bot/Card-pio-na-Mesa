import React, { useState } from 'react';
import { Search, Receipt as ReceiptIcon, Eye, Printer, Calendar } from 'lucide-react';
import { useRestaurantBilling } from '../../../contexts/RestaurantBillingContext';
import { Receipt } from '../../../types/financial';

interface RestaurantReceiptsTableProps {
  onSelectReceipt: (receipt: Receipt) => void;
}

export const RestaurantReceiptsTable: React.FC<RestaurantReceiptsTableProps> = ({ onSelectReceipt }) => {
  const { receipts } = useRestaurantBilling();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReceipts = receipts.filter((rec) => 
    rec.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.planName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-display">Recibos Emitidos</h3>
          <p className="text-xs text-slate-500">Comprovantes oficiais de quitação de mensalidades</p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar recibo ou fatura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-6">Número do Recibo</th>
              <th className="py-3.5 px-6">Plano</th>
              <th className="py-3.5 px-6">Data de Pagamento</th>
              <th className="py-3.5 px-6">Método</th>
              <th className="py-3.5 px-6">Valor Pago</th>
              <th className="py-3.5 px-6 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <ReceiptIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Nenhum recibo emitido até o momento.
                </td>
              </tr>
            ) : (
              filteredReceipts.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/60 transition-all">
                  <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                    <ReceiptIcon className="w-4 h-4 text-rose-500 shrink-0" />
                    #{rec.number}
                  </td>

                  <td className="py-4 px-6 font-semibold text-slate-800">
                    {rec.planName}
                  </td>

                  <td className="py-4 px-6 text-slate-600">
                    {new Date(rec.paidAt).toLocaleString('pt-BR')}
                  </td>

                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold uppercase">
                      {rec.paymentMethod}
                    </span>
                  </td>

                  <td className="py-4 px-6 font-black text-emerald-700">
                    R$ {rec.amount.toFixed(2)}
                  </td>

                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => onSelectReceipt(rec)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all inline-flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualizar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
