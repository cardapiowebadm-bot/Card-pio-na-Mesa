import React, { useState } from 'react';
import { useMaster } from '../../contexts/MasterContext';
import { MasterPlan, MasterFeature } from '../../types';
import { 
  Layers, 
  Sparkles, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  ShieldAlert, 
  DollarSign, 
  Users, 
  Utensils, 
  QrCode, 
  Printer, 
  ChefHat, 
  Filter, 
  Bell, 
  ShoppingBag, 
  History, 
  BarChart2, 
  TrendingUp, 
  FileText, 
  Star, 
  GraduationCap, 
  Headphones,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  QrCode,
  Printer,
  ChefHat,
  Filter,
  Bell,
  ShoppingBag,
  History,
  BarChart2,
  TrendingUp,
  FileText,
  Sparkles,
  Star,
  GraduationCap,
  Headphones,
  Users,
  Utensils
};

export default function MasterPlans() {
  const { plans, features, savePlan, deletePlan, saveFeature, deleteFeature, loading } = useMaster();
  const [activeTab, setActiveTab] = useState<'plans' | 'features'>('plans');

  // Modal States - Plans
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<MasterPlan> | null>(null);

  // Modal States - Features
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Partial<MasterFeature> | null>(null);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'plan' | 'feature'; id: string; name: string } | null>(null);

  // Form states for Plan
  const [planId, setPlanId] = useState('');
  const [planName, setPlanName] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [planPrice, setPlanPrice] = useState('99.00');
  const [planActive, setPlanActive] = useState(true);
  const [planOrder, setPlanOrder] = useState('1');
  const [maxTables, setMaxTables] = useState('10');
  const [maxWaiters, setMaxWaiters] = useState('3');
  const [maxAdminUsers, setMaxAdminUsers] = useState('2');
  const [trialDays, setTrialDays] = useState('14');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  // Form states for Feature
  const [featId, setFeatId] = useState('');
  const [featName, setFeatName] = useState('');
  const [featDesc, setFeatDesc] = useState('');
  const [featIcon, setFeatIcon] = useState('Sparkles');
  const [featActive, setFeatActive] = useState(true);
  const [featCategory, setFeatCategory] = useState<'core' | 'operations' | 'management' | 'advanced'>('operations');

  const handleOpenPlanModal = (plan?: MasterPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanId(plan.id);
      setPlanName(plan.name);
      setPlanDesc(plan.description);
      setPlanPrice(plan.price ? plan.price.toString() : '0');
      setPlanActive(plan.active ?? true);
      setPlanOrder(plan.order ? plan.order.toString() : '1');
      setMaxTables(plan.limits?.maxTables !== undefined ? plan.limits.maxTables.toString() : '0');
      setMaxWaiters(plan.limits?.maxWaiters !== undefined ? plan.limits.maxWaiters.toString() : '0');
      setMaxAdminUsers(plan.limits?.maxAdminUsers !== undefined ? plan.limits.maxAdminUsers.toString() : '0');
      setTrialDays(plan.limits?.trialDays !== undefined ? plan.limits.trialDays.toString() : '14');
      setSelectedFeatures(plan.features || []);
    } else {
      setEditingPlan(null);
      setPlanId('custom_plan_' + Math.random().toString(36).substr(2, 6));
      setPlanName('');
      setPlanDesc('');
      setPlanPrice('99.00');
      setPlanActive(true);
      setPlanOrder((plans.length + 1).toString());
      setMaxTables('10');
      setMaxWaiters('3');
      setMaxAdminUsers('2');
      setTrialDays('14');
      setSelectedFeatures(features.map(f => f.id));
    }
    setShowPlanModal(true);
  };

  const handleSavePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) {
      toast.error('Informe o nome do plano');
      return;
    }

    const payload: MasterPlan = {
      id: planId.trim() || 'plan_' + Math.random().toString(36).substr(2, 6),
      name: planName.trim(),
      description: planDesc.trim(),
      price: parseFloat(planPrice) || 0,
      active: planActive,
      order: parseInt(planOrder, 10) || 1,
      limits: {
        maxTables: parseInt(maxTables, 10) || 0,
        maxWaiters: parseInt(maxWaiters, 10) || 0,
        maxAdminUsers: parseInt(maxAdminUsers, 10) || 0,
        trialDays: parseInt(trialDays, 10) || 14
      },
      features: selectedFeatures
    };

    try {
      await savePlan(payload);
      setShowPlanModal(false);
    } catch (err) {
      // handled in context
    }
  };

  const handleOpenFeatureModal = (feature?: MasterFeature) => {
    if (feature) {
      setEditingFeature(feature);
      setFeatId(feature.id);
      setFeatName(feature.name);
      setFeatDesc(feature.description);
      setFeatIcon(feature.icon || 'Sparkles');
      setFeatActive(feature.active ?? true);
      setFeatCategory(feature.category || 'operations');
    } else {
      setEditingFeature(null);
      setFeatId('');
      setFeatName('');
      setFeatDesc('');
      setFeatIcon('Sparkles');
      setFeatActive(true);
      setFeatCategory('operations');
    }
    setShowFeatureModal(true);
  };

  const handleSaveFeatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featName.trim()) {
      toast.error('Informe o nome do recurso');
      return;
    }

    const cleanId = featId.trim() ? featId.trim().toLowerCase().replace(/\s+/g, '_') : featName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

    const payload: MasterFeature = {
      id: cleanId,
      name: featName.trim(),
      description: featDesc.trim(),
      icon: featIcon,
      active: featActive,
      category: featCategory
    };

    try {
      await saveFeature(payload);
      setShowFeatureModal(false);
    } catch (err) {
      // handled in context
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'plan') {
        await deletePlan(deleteTarget.id);
      } else {
        await deleteFeature(deleteTarget.id);
      }
      setDeleteTarget(null);
    } catch (err) {
      // handled
    }
  };

  const toggleFeatureInPlan = (fId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(fId) ? prev.filter(id => id !== fId) : [...prev, fId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Módulo de Gestão BackOffice</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Planos & Recursos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Defina dinamicamente os limites, valores e permissões dos planos de assinatura da plataforma.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'plans'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Planos ({plans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('features')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'features'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Recursos ({features.length})</span>
          </button>
        </div>
      </div>

      {/* PLANOS TAB */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Planos Cadastrados</h2>
              <p className="text-xs text-slate-400">Restaurantes vinculados assumirão estes limites e permissões automaticamente.</p>
            </div>
            <button
              onClick={() => handleOpenPlanModal()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Plano</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-slate-900 border ${
                  plan.active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/50 opacity-60'
                } rounded-2xl p-6 flex flex-col justify-between relative group transition-all`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 border border-indigo-500/30 px-2.5 py-1 rounded-md">
                      Ordem #{plan.order}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                        plan.active ? 'bg-emerald-950 border border-emerald-500/30 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {plan.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-4">{plan.description}</p>

                  <div className="flex items-baseline gap-1 mb-6 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-2xl font-extrabold text-white">R$ {plan.price ? plan.price.toFixed(2) : '0.00'}</span>
                    <span className="text-xs text-slate-400">/mês</span>
                  </div>

                  {/* Limits List */}
                  <div className="space-y-2 mb-6">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Limites do Plano:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950/50 border border-slate-800 p-2.5 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Mesas:</span>
                        <span className="font-bold text-slate-200">
                          {plan.limits?.maxTables === 0 || !plan.limits?.maxTables ? 'Ilimitado' : `${plan.limits.maxTables} mesas`}
                        </span>
                      </div>
                      <div className="bg-slate-950/50 border border-slate-800 p-2.5 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Garçons:</span>
                        <span className="font-bold text-slate-200">
                          {plan.limits?.maxWaiters === 0 || !plan.limits?.maxWaiters ? 'Ilimitado' : `${plan.limits.maxWaiters} garçons`}
                        </span>
                      </div>
                      <div className="bg-slate-950/50 border border-slate-800 p-2.5 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Admins:</span>
                        <span className="font-bold text-slate-200">
                          {plan.limits?.maxAdminUsers === 0 || !plan.limits?.maxAdminUsers ? 'Ilimitado' : `${plan.limits.maxAdminUsers} usuários`}
                        </span>
                      </div>
                      <div className="bg-slate-950/50 border border-slate-800 p-2.5 rounded-lg">
                        <span className="text-slate-400 block text-[10px]">Trial:</span>
                        <span className="font-bold text-indigo-400">
                          {plan.limits?.trialDays || 14} dias
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Features Badge Count */}
                  <div className="border-t border-slate-800/80 pt-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Recursos Habilitados:</span>
                      <span className="font-semibold text-indigo-400">
                        {plan.features?.length || 0} de {features.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {plan.features?.slice(0, 6).map(fId => {
                        const featObj = features.find(f => f.id === fId);
                        return (
                          <span key={fId} className="text-[10px] bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            {featObj?.name || fId}
                          </span>
                        );
                      })}
                      {(plan.features?.length || 0) > 6 && (
                        <span className="text-[10px] bg-indigo-950/50 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                          +{(plan.features?.length || 0) - 6} outros
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 border-t border-slate-800/80 pt-4 mt-6">
                  <button
                    onClick={() => handleOpenPlanModal(plan)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar Plano</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ type: 'plan', id: plan.id, name: plan.name })}
                    className="p-2 bg-slate-800/60 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-700/50 hover:border-rose-800/50 rounded-xl transition-all"
                    title="Excluir Plano"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECURSOS TAB */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Recursos do Sistema (Features)</h2>
              <p className="text-xs text-slate-400">Cadastre e gerencie os módulos e funcionalidades que podem ser vinculados aos planos.</p>
            </div>
            <button
              onClick={() => handleOpenFeatureModal()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Recurso</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-950/50">
                    <th className="py-3.5 px-4 font-semibold">Recurso / Módulo</th>
                    <th className="py-3.5 px-4 font-semibold">Identificador (ID)</th>
                    <th className="py-3.5 px-4 font-semibold">Categoria</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {features.map((feat) => {
                    const IconComp = ICON_MAP[feat.icon] || Sparkles;
                    return (
                      <tr key={feat.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-semibold text-white block">{feat.name}</span>
                              <span className="text-[11px] text-slate-400">{feat.description}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {feat.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
                            {feat.category || 'operacional'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                            feat.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${feat.active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                            {feat.active ? 'Ativo Global' : 'Desativado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenFeatureModal(feat)}
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                              title="Editar Recurso"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'feature', id: feat.id, name: feat.name })}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/50 transition-colors"
                              title="Excluir Recurso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PLANO */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingPlan ? `Editar ${editingPlan.name}` : 'Criar Novo Plano'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure as informações gerais, limites operacionais e recursos liberados.</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlanSubmit} className="space-y-6">
              {/* Informações Gerais */}
              <div>
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Informações Gerais</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">ID do Plano (Código)</label>
                    <input
                      type="text"
                      value={planId}
                      onChange={(e) => setPlanId(e.target.value)}
                      disabled={!!editingPlan}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white disabled:opacity-50"
                      placeholder="ex: bistro"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Plano</label>
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-500"
                      placeholder="ex: Plano Bistrô"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
                    <textarea
                      value={planDesc}
                      onChange={(e) => setPlanDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-500"
                      placeholder="Descrição sucinta do plano para exibição"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Valor Mensal (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={planPrice}
                      onChange={(e) => setPlanPrice(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Ordem de Exibição</label>
                    <input
                      type="number"
                      value={planOrder}
                      onChange={(e) => setPlanOrder(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-white block">Plano Ativo para Contratação</span>
                      <span className="text-[11px] text-slate-400 block">Planos inativos não ficam visíveis no site principal</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planActive}
                        onChange={(e) => setPlanActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Limites */}
              <div className="border-t border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Limites Operacionais (0 = Ilimitado)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Máx. Mesas</label>
                    <input
                      type="number"
                      value={maxTables}
                      onChange={(e) => setMaxTables(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Máx. Garçons</label>
                    <input
                      type="number"
                      value={maxWaiters}
                      onChange={(e) => setMaxWaiters(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Máx. Admins</label>
                    <input
                      type="number"
                      value={maxAdminUsers}
                      onChange={(e) => setMaxAdminUsers(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Dias de Trial</label>
                    <input
                      type="number"
                      value={trialDays}
                      onChange={(e) => setTrialDays(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Recursos Permissões */}
              <div className="border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Recursos Incluídos neste Plano</h4>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedFeatures(features.map(f => f.id))}
                      className="text-indigo-400 hover:underline font-semibold"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFeatures([])}
                      className="text-slate-400 hover:underline"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  {features.map((feat) => {
                    const isChecked = selectedFeatures.includes(feat.id);
                    return (
                      <label
                        key={feat.id}
                        onClick={() => toggleFeatureInPlan(feat.id)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-indigo-950/40 border-indigo-500/40 text-white' 
                            : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by label onClick
                          className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-xs font-medium block leading-tight">{feat.name}</span>
                          <span className="text-[10px] text-slate-500 block line-clamp-1">{feat.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  Salvar Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR RECURSO */}
      {showFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingFeature ? `Editar Recurso` : 'Novo Recurso (Feature)'}
                  </h3>
                  <p className="text-xs text-slate-400">Cadastre o identificador único e metadados do recurso.</p>
                </div>
              </div>
              <button
                onClick={() => setShowFeatureModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFeatureSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ID do Recurso (Chave única)</label>
                <input
                  type="text"
                  value={featId}
                  onChange={(e) => setFeatId(e.target.value)}
                  disabled={!!editingFeature}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono disabled:opacity-50"
                  placeholder="ex: waiter_evaluation"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Recurso</label>
                <input
                  type="text"
                  value={featName}
                  onChange={(e) => setFeatName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-500"
                  placeholder="ex: Avaliação de Garçons"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição</label>
                <textarea
                  value={featDesc}
                  onChange={(e) => setFeatDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-indigo-500"
                  placeholder="Explique resumidamente a utilidade do recurso"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                  <select
                    value={featCategory}
                    onChange={(e) => setFeatCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                  >
                    <option value="core">Essencial (Core)</option>
                    <option value="operations">Operacional</option>
                    <option value="management">Gestão</option>
                    <option value="advanced">Avançado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ícone</label>
                  <select
                    value={featIcon}
                    onChange={(e) => setFeatIcon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                  >
                    {Object.keys(ICON_MAP).map(iconName => (
                      <option key={iconName} value={iconName}>{iconName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-white block">Ativo na Plataforma</span>
                  <span className="text-[11px] text-slate-400 block">Se desativado, fica indisponível para todos os planos</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featActive}
                    onChange={(e) => setFeatActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFeatureModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  Salvar Recurso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Confirmar Exclusão</h3>
            </div>
            <p className="text-xs text-slate-300 mb-6">
              Tem certeza que deseja remover o {deleteTarget.type === 'plan' ? 'plano' : 'recurso'} <strong>"{deleteTarget.name}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/30"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
