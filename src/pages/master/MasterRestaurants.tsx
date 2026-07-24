import React, { useState, useMemo } from 'react';
import { useMaster } from '../../contexts/MasterContext';
import { useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  Clock, 
  Edit3, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  CreditCard, 
  X, 
  Check, 
  Loader2,
  ShieldAlert,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { Restaurant, RestaurantStatus } from '../../types';
import toast from 'react-hot-toast';

export default function MasterRestaurants() {
  const { restaurants, plans, loading, updateRestaurantStatus, updateRestaurantDetails } = useMaster();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modals state
  const [detailModalRestaurant, setDetailModalRestaurant] = useState<Restaurant | null>(null);
  const [editModalRestaurant, setEditModalRestaurant] = useState<Restaurant | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
    phone: '',
    city: '',
    state: '',
    address: '',
    plan: 'gourmet',
    nextDueDate: ''
  });

  // Open detail if URL has ?id=...
  React.useEffect(() => {
    if (selectedId && restaurants.length > 0) {
      const found = restaurants.find(r => r.id === selectedId);
      if (found) {
        setDetailModalRestaurant(found);
      }
    }
  }, [selectedId, restaurants]);

  // Filtered list
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      const matchSearch = 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.ownerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.ownerEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.city || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const status = r.status || 'active';
      const matchStatus = statusFilter === 'all' || status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [restaurants, searchTerm, statusFilter]);

  const handleOpenEdit = (r: Restaurant) => {
    setEditModalRestaurant(r);
    setEditForm({
      name: r.name || '',
      ownerName: r.ownerName || '',
      ownerEmail: r.ownerEmail || '',
      phone: r.phone || '',
      city: r.city || '',
      state: r.state || '',
      address: r.address || '',
      plan: (r.plan as any) || 'gourmet',
      nextDueDate: r.nextDueDate || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalRestaurant) return;
    setSubmitting(true);
    try {
      await updateRestaurantDetails(editModalRestaurant.id, editForm);
      setEditModalRestaurant(null);
      if (detailModalRestaurant && detailModalRestaurant.id === editModalRestaurant.id) {
        setDetailModalRestaurant(prev => prev ? { ...prev, ...editForm } : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (r: Restaurant, newStatus: RestaurantStatus) => {
    try {
      await updateRestaurantStatus(r.id, newStatus);
      if (detailModalRestaurant && detailModalRestaurant.id === r.id) {
        setDetailModalRestaurant(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const statusBadges: Record<string, { label: string; class: string; icon: any }> = {
    active: { label: 'Ativo', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    suspended: { label: 'Suspenso', class: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: AlertTriangle },
    blocked: { label: 'Bloqueado', class: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: Ban },
    trial: { label: 'Em Teste', class: 'bg-sky-500/10 text-sky-400 border-sky-500/30', icon: Clock }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Gestão de Restaurantes</h1>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie acessos, licenças, dados cadastrais e permissões dos clientes SaaS.
          </p>
        </div>
        <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl font-medium">
          Total: <span className="text-indigo-400 font-bold">{restaurants.length}</span> estabelecimentos
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, proprietário, e-mail ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-xl overflow-x-auto text-xs font-medium">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'active', label: 'Ativos' },
              { id: 'suspended', label: 'Suspensos' },
              { id: 'blocked', label: 'Bloqueados' },
              { id: 'trial', label: 'Em Teste' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            Carregando lista de estabelecimentos...
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Nenhum restaurante encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Estabelecimento</th>
                  <th className="py-3.5 px-4">Proprietário / E-mail</th>
                  <th className="py-3.5 px-4">Telefone</th>
                  <th className="py-3.5 px-4">Cidade/UF</th>
                  <th className="py-3.5 px-4">Cadastro</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Plano</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredRestaurants.map(r => {
                  const currentStatus = r.status || 'active';
                  const badge = statusBadges[currentStatus] || statusBadges.active;
                  const BadgeIcon = badge.icon;

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4 font-semibold text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 font-bold text-xs border border-slate-700 shrink-0">
                            {r.name.charAt(0)}
                          </div>
                          <div>
                            <span className="block">{r.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono font-normal">ID: {r.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-200">{r.ownerName || 'Não informado'}</div>
                        <div className="text-[11px] text-slate-500">{r.ownerEmail || 'Não informado'}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-400">{r.phone || 'Não informado'}</td>
                      <td className="py-4 px-4 text-slate-400">
                        {r.city ? `${r.city}${r.state ? ` - ${r.state}` : ''}` : 'Não informado'}
                      </td>
                      <td className="py-4 px-4 text-slate-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : 'Recente'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${badge.class}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-300 capitalize">
                        {r.plan || 'Gourmet'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setDetailModalRestaurant(r)}
                            className="p-1.5 text-indigo-400 hover:text-white bg-slate-800 hover:bg-indigo-600 rounded-lg transition-all"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
                            title="Editar Dados Cadastrais"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {detailModalRestaurant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative animate-fade-in my-8">
            <button
              onClick={() => {
                setDetailModalRestaurant(null);
                setSearchParams({});
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title Header */}
            <div className="flex items-center gap-3 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-lg">
                {detailModalRestaurant.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white font-display">{detailModalRestaurant.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400 font-mono">ID: {detailModalRestaurant.id}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs font-semibold text-indigo-400 capitalize">Plano {detailModalRestaurant.plan || 'Gourmet'}</span>
                </div>
              </div>
            </div>

            {/* Quick Status Control Buttons */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Gerenciar Status de Acesso
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleStatusChange(detailModalRestaurant, 'active')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    (detailModalRestaurant.status || 'active') === 'active'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-900 hover:bg-emerald-950/50 text-emerald-400 border-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ativar
                </button>

                <button
                  onClick={() => handleStatusChange(detailModalRestaurant, 'suspended')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    detailModalRestaurant.status === 'suspended'
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                      : 'bg-slate-900 hover:bg-amber-950/50 text-amber-400 border-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Suspender
                </button>

                <button
                  onClick={() => handleStatusChange(detailModalRestaurant, 'blocked')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    detailModalRestaurant.status === 'blocked'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                      : 'bg-slate-900 hover:bg-rose-950/50 text-rose-400 border-slate-800'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  Bloquear
                </button>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/50 border border-slate-800/80 p-4 rounded-2xl space-y-3">
                <h3 className="font-bold text-slate-300 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-800">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Proprietário & Contato
                </h3>
                <div className="space-y-2 text-slate-400">
                  <p><strong className="text-slate-200">Nome:</strong> {detailModalRestaurant.ownerName || 'Não informado'}</p>
                  <p className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-500" />
                    <strong className="text-slate-200">E-mail:</strong> {detailModalRestaurant.ownerEmail || 'Não informado'}
                  </p>
                  <p className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    <strong className="text-slate-200">Telefone:</strong> {detailModalRestaurant.phone || 'Não informado'}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800/80 p-4 rounded-2xl space-y-3">
                <h3 className="font-bold text-slate-300 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  Endereço & Localização
                </h3>
                <div className="space-y-2 text-slate-400">
                  <p><strong className="text-slate-200">Endereço:</strong> {detailModalRestaurant.address || 'Não informado'}</p>
                  <p><strong className="text-slate-200">Cidade/UF:</strong> {detailModalRestaurant.city ? `${detailModalRestaurant.city}${detailModalRestaurant.state ? ` - ${detailModalRestaurant.state}` : ''}` : 'Não informado'}</p>
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <strong className="text-slate-200">Cadastro:</strong> {detailModalRestaurant.createdAt ? new Date(detailModalRestaurant.createdAt).toLocaleString('pt-BR') : 'Não informado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Plan & Renewal prepared block */}
            <div className="bg-slate-950/50 border border-slate-800/80 p-4 rounded-2xl space-y-2 text-xs">
              <h3 className="font-bold text-slate-300 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-800">
                <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                Assinatura & Faturamento (Estrutura Preparada)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-slate-400 pt-1">
                <div>
                  <span className="block text-[10px] text-slate-500 font-semibold uppercase">Plano Vigente</span>
                  <span className="text-sm font-bold text-white capitalize">{detailModalRestaurant.plan || 'Gourmet'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 font-semibold uppercase">Próximo Vencimento</span>
                  <span className="text-sm font-bold text-indigo-300">
                    {detailModalRestaurant.nextDueDate ? new Date(detailModalRestaurant.nextDueDate).toLocaleDateString('pt-BR') : 'Não definido'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  const r = detailModalRestaurant;
                  setDetailModalRestaurant(null);
                  handleOpenEdit(r);
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all"
              >
                <Edit3 className="w-4 h-4" />
                Editar Dados Cadastrais
              </button>
              <button
                onClick={() => {
                  setDetailModalRestaurant(null);
                  setSearchParams({});
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalRestaurant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative my-8">
            <button
              onClick={() => setEditModalRestaurant(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-lg font-bold text-white font-display">Editar Dados Cadastrais</h2>
              <p className="text-xs text-slate-400 mt-0.5">{editModalRestaurant.name}</p>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome do Estabelecimento</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nome do Proprietário</label>
                  <input
                    type="text"
                    value={editForm.ownerName}
                    onChange={e => setEditForm({ ...editForm, ownerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editForm.ownerEmail}
                    onChange={e => setEditForm({ ...editForm, ownerEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-300 font-medium mb-1">Telefone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-300 font-medium mb-1">Cidade</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-slate-300 font-medium mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editForm.state}
                    onChange={e => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Plano Atribuído</label>
                  <select
                    value={editForm.plan}
                    onChange={e => setEditForm({ ...editForm, plan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (R$ {p.price ? p.price.toFixed(2) : '0.00'}/mês)
                      </option>
                    ))}
                    <option value="trial">Período de Teste (Trial)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Próximo Vencimento</label>
                  <input
                    type="date"
                    value={editForm.nextDueDate ? editForm.nextDueDate.split('T')[0] : ''}
                    onChange={e => setEditForm({ ...editForm, nextDueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalRestaurant(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
