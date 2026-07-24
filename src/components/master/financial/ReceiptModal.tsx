import React from 'react';
import { X, Printer, Receipt as ReceiptIcon, CheckCircle2, Building2, Calendar, ShieldCheck } from 'lucide-react';
import { Receipt } from '../../../types/financial';

interface ReceiptModalProps {
  receipt: Receipt | null;
  onClose: () => void;
}

export default function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full text-slate-100 shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 print:hidden">
          <div className="flex items-center gap-2 text-emerald-400">
            <ReceiptIcon className="w-5 h-5" />
            <span className="font-bold text-sm text-white font-display">Comprovante de Recibo Oficial</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-8 bg-white text-slate-900 font-sans space-y-6 print:p-0 print:bg-white print:text-black">
          
          {/* Header SaaS */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                <h1 className="font-extrabold text-xl font-display tracking-tight text-slate-900">Cardápio na Mesa SaaS</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">Plataforma de Gestão de Cardápios & Pedidos</p>
              <p className="text-[10px] text-slate-400">CNPJ: 00.000.000/0001-00 &bull; São Paulo, SP</p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs uppercase tracking-wider">
                Recibo Pago
              </span>
              <p className="text-sm font-bold font-mono text-slate-900 mt-2">{receipt.number}</p>
              <p className="text-[10px] text-slate-500">{new Date(receipt.paidAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Recibo Body */}
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Recebemos de:</span>
                <strong className="text-slate-900 font-bold">{receipt.restaurantName}</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Referente ao:</span>
                <strong className="text-indigo-600 font-semibold">{receipt.planName}</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Forma de Pagamento:</span>
                <strong className="uppercase font-semibold">{receipt.paymentMethod}</strong>
              </div>
            </div>

            {/* Total Paid Block */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Valor Total Pago</span>
                <span className="text-[10px] text-slate-400">Fatura ID: #{receipt.invoiceId}</span>
              </div>
              <div className="text-2xl font-black font-display text-emerald-400">
                {formatCurrency(receipt.amount)}
              </div>
            </div>

            {/* Notes */}
            {receipt.notes && (
              <div className="border border-slate-200 rounded-xl p-3 text-xs text-slate-600 bg-slate-50">
                <strong className="text-slate-800 block text-[10px] uppercase font-bold mb-0.5">Observações:</strong>
                {receipt.notes}
              </div>
            )}
          </div>

          {/* Receipt Footer */}
          <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-1">
            <p className="flex items-center justify-center gap-1 font-semibold text-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Documento assinado digitalmente e emitido pelo módulo financeiro central.
            </p>
            <p>Este recibo é válido como comprovante de quitação da competência indicada.</p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
          >
            Fechar
          </button>
          
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>

      </div>
    </div>
  );
}
