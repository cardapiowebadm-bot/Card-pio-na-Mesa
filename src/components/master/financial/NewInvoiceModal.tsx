import React, { useState } from 'react';
import { X, Plus, DollarSign, Calendar, Building2, FileText } from 'lucide-react';
import { Restaurant, MasterPlan } from '../../../types';
import toast from 'react-hot-toast';

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: Restaurant[];
  plans: MasterPlan[];
  onCreateInvoice: (data: {
    restaurantId: string;
    restaurantName: string;
    planId: string;
    planName: string;
    amount: number;
    discounts: number;
    additions: number;
    competence: string;
    dueDate: string;
    internalNotes: string;
  }) => Promise<void>;
}

export default function NewInvoiceModal({
  isOpen,
  onClose,
  restaurants,
  plans,
  onCreateInvoice
}: NewInvoiceModalProps) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [amount, setAmount] = useState<number>(189);
  const [discounts, setDiscounts] = useState<number>(0);
  const [additions, setAdditions] = useState<number>(0);
  
  // Competência padrão (mês/ano atual)
  const today = new Date();
  const defaultCompetence = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  const [competence, setCompetence] = useState(defaultCompetence);

  // Vencimento padrão (+ 5 dias)
  const defaultDue = new Date(today.setDate(today.getDate() + 5)).toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState(defaultDue);
  const [internalNotes, setInternalNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRestaurantChange = (restId: string) => {
    setSelectedRestaurantId(restId);
    const rest = restaurants.find(r => r.id === restId);
    if (rest) {
      const plan = plans.find(p => p.id === (rest.planId || rest.plan));
      if (plan) {
        setSelectedPlanId(plan.id);
        setAmount(plan.price);
      }
    }
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setAmount(plan.price);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantId) {
      toast.error('Selecione um restaurante');
      return;
    }

    const rest = restaurants.find(r => r.id === selectedRestaurantId);
    const plan = plans.find(p => p.id === selectedPlanId);

    try {
      setLoading(true);
      await onCreateInvoice({
        restaurantId: selectedRestaurantId,
        restaurantName: rest?.name || 'Restaurante',
        planId: selectedPlanId || 'gourmet',
        planName: plan?.name || 'Plano Gourmet',
        amount: Number(amount) || 0,
        discounts: Number(discounts) || 0,
        additions: Number(additions) || 0,
        competence,
        dueDate,
        internalNotes
      });
      toast.success('Fatura gerada com sucesso!');
      onClose();
    } catch {
      toast.error('Erro ao gerar fatura.');
    } finally {
      setLoading(false);
    }
  };

  const finalAmount = Math.max(0, (amount || 0) - (discounts || 0) + (additions || 0));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full text-slate-100 shadow-2xl overflow-hidden my-8">
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Gerar Nova Fatura</h3>
              <p className="text-xs text-slate-400">Emita cobrança avulsa ou mensal para o restaurante</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Selecionar Restaurante */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Restaurante *</label>
            <select
              value={selectedRestaurantId}
              onChange={(e) => handleRestaurantChange(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
            >
              <option value="">-- Selecione o Restaurante --</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.city || 'SaaS'})
                </option>
              ))}
            </select>
          </div>

          {/* Selecionar Plano */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Plano Relacionado</label>
              <select
                value={selectedPlanId}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value="">-- Selecione o Plano --</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - R$ {p.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Competência (MM/AAAA) *</label>
              <input
                type="text"
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                required
                placeholder="Ex: 07/2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Valores: Base, Desconto, Acréscimo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Valor Base (R$)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Desconto (R$)</label>
              <input
                type="number"
                step="0.01"
                value={discounts}
                onChange={(e) => setDiscounts(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Acréscimo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={additions}
                onChange={(e) => setAdditions(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Data de Vencimento & Resumo do Valor Final */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-slate-950 border border-slate-800/80 p-4 rounded-2xl">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Data de Vencimento *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Final Calculado</span>
              <span className="text-xl font-black text-emerald-400 font-display">
                R$ {finalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Observações Internas */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Observações Internas</label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              placeholder="Instruções ou notas sobre esta fatura..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Gerando...' : 'Gerar Fatura Agora'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
