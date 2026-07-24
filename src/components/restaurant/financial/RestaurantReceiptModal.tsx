import React from 'react';
import { X, Printer, CheckCircle2, Building, Receipt as ReceiptIcon } from 'lucide-react';
import { Receipt } from '../../../types/financial';

interface RestaurantReceiptModalProps {
  receipt: Receipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RestaurantReceiptModal: React.FC<RestaurantReceiptModalProps> = ({ receipt, isOpen, onClose }) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 my-8 overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-rose-600 p-2 rounded-xl text-white">
              <ReceiptIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg font-display">Recibo de Pagamento</h3>
              <p className="text-xs text-slate-400">#{receipt.number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              title="Imprimir Recibo"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Card Body */}
        <div id="printable-receipt" className="p-8 space-y-6">
          <div className="text-center pb-6 border-b border-slate-100">
            <div className="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-600 mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">R$ {receipt.amount.toFixed(2)}</h4>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block mt-2">
              Pagamento Confirmado
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Estabelecimento / Sacado:</span>
              <span className="font-bold text-slate-900">{receipt.restaurantName}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Plano Contratado:</span>
              <span className="font-semibold text-slate-800">{receipt.planName}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Data de Pagamento:</span>
              <span className="font-semibold text-slate-800">
                {new Date(receipt.paidAt).toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Método de Pagamento:</span>
              <span className="font-semibold uppercase text-slate-800">{receipt.paymentMethod}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Fatura de Origem:</span>
              <span className="font-semibold text-slate-800">#{receipt.invoiceId}</span>
            </div>

            {receipt.notes && (
              <div className="py-2 border-b border-slate-100">
                <span className="text-slate-500 block mb-1">Observações:</span>
                <p className="text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {receipt.notes}
                </p>
              </div>
            )}
          </div>

          <div className="text-center pt-4 text-[10px] text-slate-400">
            <p className="font-semibold text-slate-500">Cardápio na Mesa SaaS - CNPJ 00.000.000/0001-00</p>
            <p>Este recibo é válido como comprovante de quitação para os serviços prestados.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
