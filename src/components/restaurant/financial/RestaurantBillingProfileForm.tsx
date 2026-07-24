import React, { useState, useEffect } from 'react';
import { Building2, Save, Mail, Phone, MapPin, User, FileText, CheckCircle2 } from 'lucide-react';
import { useRestaurantBilling } from '../../../contexts/RestaurantBillingContext';
import { RestaurantBillingInfo } from '../../../types/financial';

export const RestaurantBillingProfileForm: React.FC = () => {
  const { billingInfo, updateBillingInfo, restaurant } = useRestaurantBilling();
  const [formData, setFormData] = useState<RestaurantBillingInfo>({
    companyName: '',
    tradeName: '',
    documentNumber: '',
    stateRegistration: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (billingInfo) {
      setFormData({
        companyName: billingInfo.companyName || restaurant?.name || '',
        tradeName: billingInfo.tradeName || restaurant?.name || '',
        documentNumber: billingInfo.documentNumber || '',
        stateRegistration: billingInfo.stateRegistration || '',
        contactName: billingInfo.contactName || '',
        contactEmail: billingInfo.contactEmail || '',
        contactPhone: billingInfo.contactPhone || '',
        zipCode: billingInfo.zipCode || '',
        street: billingInfo.street || '',
        number: billingInfo.number || '',
        complement: billingInfo.complement || '',
        neighborhood: billingInfo.neighborhood || '',
        city: billingInfo.city || '',
        state: billingInfo.state || ''
      });
    }
  }, [billingInfo, restaurant]);

  const handleChange = (field: keyof RestaurantBillingInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateBillingInfo(formData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-rose-100 text-rose-600 p-2.5 rounded-2xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">Dados Cadastrais e Cobrança</h3>
            <p className="text-xs text-slate-500">Mantenha as informações jurídicas do seu estabelecimento atualizadas para emissão de faturas</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-900/10 inline-flex items-center gap-2 hover:shadow-lg active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {/* Grid: Company Details */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-rose-500" />
          Identificação da Empresa
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Razão Social</label>
            <input
              type="text"
              required
              placeholder="Ex: Restaurante Exemplo LTDA"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Fantasia</label>
            <input
              type="text"
              required
              placeholder="Ex: Cantina do Chef"
              value={formData.tradeName}
              onChange={(e) => handleChange('tradeName', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ ou CPF</label>
            <input
              type="text"
              required
              placeholder="00.000.000/0001-00"
              value={formData.documentNumber}
              onChange={(e) => handleChange('documentNumber', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Inscrição Estadual (Opcional)</label>
            <input
              type="text"
              placeholder="Isento ou Número"
              value={formData.stateRegistration}
              onChange={(e) => handleChange('stateRegistration', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Grid: Financial Contact */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-rose-500" />
          Contato Financeiro
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Responsável Financeiro</label>
            <input
              type="text"
              placeholder="Nome do responsável"
              value={formData.contactName}
              onChange={(e) => handleChange('contactName', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Financeiro</label>
            <input
              type="email"
              placeholder="financeiro@empresa.com"
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone Financeiro / WhatsApp</label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={formData.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Grid: Address */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          Endereço de Cobrança
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">CEP</label>
            <input
              type="text"
              placeholder="00000-000"
              value={formData.zipCode}
              onChange={(e) => handleChange('zipCode', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Logradouro / Rua</label>
            <input
              type="text"
              placeholder="Av. Principal, Rua..."
              value={formData.street}
              onChange={(e) => handleChange('street', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Número</label>
            <input
              type="text"
              placeholder="123"
              value={formData.number}
              onChange={(e) => handleChange('number', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Complemento</label>
            <input
              type="text"
              placeholder="Sala 01, Bloco B..."
              value={formData.complement}
              onChange={(e) => handleChange('complement', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bairro</label>
            <input
              type="text"
              placeholder="Centro..."
              value={formData.neighborhood}
              onChange={(e) => handleChange('neighborhood', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
            <input
              type="text"
              placeholder="São Paulo..."
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">UF</label>
            <input
              type="text"
              maxLength={2}
              placeholder="SP"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 uppercase font-mono"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
