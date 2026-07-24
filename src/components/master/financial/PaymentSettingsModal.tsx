import React, { useState, useEffect } from 'react';
import { X, Save, QrCode, Lock, Sparkles, Check, DollarSign } from 'lucide-react';
import { PaymentSettings } from '../../../types/financial';
import { PaymentService } from '../../../services/financial';
import toast from 'react-hot-toast';

interface PaymentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentSettingsModal({ isOpen, onClose }: PaymentSettingsModalProps) {
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('cnpj');
  const [pixBeneficiary, setPixBeneficiary] = useState('Cardápio na Mesa SaaS');
  const [pixCity, setPixCity] = useState('São Paulo');
  const [autoGenerateInvoices, setAutoGenerateInvoices] = useState(true);
  const [defaultDueDays, setDefaultDueDays] = useState(5);
  const [stripePublicKey, setStripePublicKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      PaymentService.getPaymentSettings().then(st => {
        setPixKey(st.pixKey || '');
        setPixKeyType(st.pixKeyType || 'cnpj');
        setPixBeneficiary(st.pixBeneficiary || 'Cardápio na Mesa SaaS');
        setPixCity(st.pixCity || 'São Paulo');
        setAutoGenerateInvoices(st.autoGenerateInvoices ?? true);
        setDefaultDueDays(st.defaultDueDays ?? 5);
        setStripePublicKey(st.stripePublicKey || '');
        setStripeSecretKey(st.stripeSecretKey || '');
        setStripeWebhookSecret(st.stripeWebhookSecret || '');
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await PaymentService.savePaymentSettings({
        pixKey,
        pixKeyType,
        pixBeneficiary,
        pixCity,
        autoGenerateInvoices,
        defaultDueDays,
        stripePublicKey,
        stripeSecretKey,
        stripeWebhookSecret
      });
      toast.success('Configurações de pagamento salvas!');
      onClose();
    } catch {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden my-8">
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Configurações de Pagamento & Gateway</h3>
              <p className="text-xs text-slate-400">Parâmetros de recebimento PIX e chaves Stripe do SaaS</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          {/* Configurações PIX */}
          <div className="space-y-3 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              Parâmetros PIX do Recebedor
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Chave PIX *</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Ex: 00.000.000/0001-00 ou email"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Tipo de Chave</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="cnpj">CNPJ</option>
                  <option value="cpf">CPF</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nome do Beneficiário</label>
                <input
                  type="text"
                  value={pixBeneficiary}
                  onChange={(e) => setPixBeneficiary(e.target.value)}
                  placeholder="Cardápio na Mesa SaaS"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Cidade do Beneficiário</label>
                <input
                  type="text"
                  value={pixCity}
                  onChange={(e) => setPixCity(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Regras de Cobrança */}
          <div className="space-y-3 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-400" />
              Regras Automáticas de Cobrança
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Dias para Vencimento Padrão</label>
                <input
                  type="number"
                  value={defaultDueDays}
                  onChange={(e) => setDefaultDueDays(parseInt(e.target.value) || 5)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-4 sm:pt-0">
                <input
                  type="checkbox"
                  id="autoInvoice"
                  checked={autoGenerateInvoices}
                  onChange={(e) => setAutoGenerateInvoices(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-800 focus:ring-indigo-500"
                />
                <label htmlFor="autoInvoice" className="text-xs text-slate-300 cursor-pointer select-none">
                  Gerar mensalidades automaticamente no vencimento
                </label>
              </div>
            </div>
          </div>

          {/* Estrutura Stripe Preparada */}
          <div className="space-y-3 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-400" />
                Estrutura Stripe Gateway (Preparada para Próxima Etapa)
              </h4>
              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                Estrutura Pronta
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Stripe Publishable Key (pk_test_...):</label>
                <input
                  type="text"
                  value={stripePublicKey}
                  onChange={(e) => setStripePublicKey(e.target.value)}
                  placeholder="pk_test_..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 font-mono outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Stripe Secret Key (sk_test_...):</label>
                <input
                  type="password"
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  placeholder="sk_test_..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 font-mono outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Stripe Webhook Signing Secret (whsec_...):</label>
                <input
                  type="password"
                  value={stripeWebhookSecret}
                  onChange={(e) => setStripeWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 font-mono outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              <Save className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar Configurações'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
