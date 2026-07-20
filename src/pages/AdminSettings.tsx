import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch, addDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  QrCode, 
  Download, 
  Printer, 
  Settings, 
  MapPin, 
  Phone, 
  Sliders, 
  Paintbrush,
  Sparkles,
  Link as LinkIcon,
  Loader2,
  Trash2,
  AlertTriangle,
  Users,
  UserPlus,
  Lock,
  Check,
  X,
  Eye,
  KeyRound,
  Shield,
  Smartphone
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const { userProfile, restaurant, loading } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [themeColor, setThemeColor] = useState('#e11d48'); // rose-600 default
  const [serviceTaxEnabled, setServiceTaxEnabled] = useState(true);
  const [serviceTaxType, setServiceTaxType] = useState<'percentage' | 'fixed'>('percentage');
  const [serviceTaxValue, setServiceTaxValue] = useState<string>('10');
  const [couvertEnabled, setCouvertEnabled] = useState(false);
  const [couvertType, setCouvertType] = useState<'percentage' | 'fixed'>('fixed');
  const [couvertValue, setCouvertValue] = useState<string>('0');
  const [saving, setSaving] = useState(false);
  const [confirmType, setConfirmType] = useState<'customers' | 'orders' | 'dashboard' | null>(null);
  const [cleaning, setCleaning] = useState(false);

  // Waiter Management states
  const [activeTab, setActiveTab] = useState<'general' | 'waiters'>('general');
  const [waiters, setWaiters] = useState<any[]>([]);
  const [loadingWaiters, setLoadingWaiters] = useState(false);
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const [editingWaiter, setEditingWaiter] = useState<any | null>(null);

  const [waiterName, setWaiterName] = useState('');
  const [waiterPhone, setWaiterPhone] = useState('');
  const [waiterLogin, setWaiterLogin] = useState('');
  const [waiterPasswordTemp, setWaiterPasswordTemp] = useState('');

  const fetchWaiters = async () => {
    if (!userProfile?.restaurantId) return;
    setLoadingWaiters(true);
    try {
      const q = query(
        collection(db, 'waiters'),
        where('restaurantId', '==', userProfile.restaurantId)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setWaiters(list);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar lista de garçons');
    } finally {
      setLoadingWaiters(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'waiters') {
      fetchWaiters();
    }
  }, [activeTab, userProfile?.restaurantId]);

  const handleSaveWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiterName.trim() || !waiterPhone.trim() || !waiterLogin.trim() || !waiterPasswordTemp.trim()) {
      toast.error('Preencha todos os campos do garçom');
      return;
    }

    if (!userProfile?.restaurantId) return;

    try {
      if (!editingWaiter) {
        // Check for login duplicate in restaurant
        const dupQuery = query(
          collection(db, 'waiters'),
          where('restaurantId', '==', userProfile.restaurantId),
          where('login', '==', waiterLogin.trim())
        );
        const dupSnap = await getDocs(dupQuery);
        if (!dupSnap.empty) {
          toast.error('Este login já está em uso por outro garçom.');
          return;
        }

        await addDoc(collection(db, 'waiters'), {
          restaurantId: userProfile.restaurantId,
          name: waiterName.trim(),
          phone: waiterPhone.trim(),
          login: waiterLogin.trim(),
          passwordTemp: waiterPasswordTemp.trim(),
          status: 'active',
          isFirstAccess: true,
          createdAt: new Date().toISOString()
        });
        toast.success('Garçom cadastrado com sucesso!');
      } else {
        const waiterRef = doc(db, 'waiters', editingWaiter.id);
        const updateData: any = {
          name: waiterName.trim(),
          phone: waiterPhone.trim()
        };

        if (editingWaiter.isFirstAccess) {
          // Check for login duplicate if login was changed
          if (editingWaiter.login !== waiterLogin.trim()) {
            const dupQuery = query(
              collection(db, 'waiters'),
              where('restaurantId', '==', userProfile.restaurantId),
              where('login', '==', waiterLogin.trim())
            );
            const dupSnap = await getDocs(dupQuery);
            if (!dupSnap.empty) {
              toast.error('Este login já está em uso por outro garçom.');
              return;
            }
          }
          updateData.login = waiterLogin.trim();
          updateData.passwordTemp = waiterPasswordTemp.trim();
        }

        await updateDoc(waiterRef, updateData);
        toast.success('Garçom atualizado com sucesso!');
      }

      setShowWaiterModal(false);
      setEditingWaiter(null);
      setWaiterName('');
      setWaiterPhone('');
      setWaiterLogin('');
      setWaiterPasswordTemp('');
      fetchWaiters();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar garçom');
    }
  };

  const handleToggleWaiterStatus = async (waiter: any) => {
    try {
      const waiterRef = doc(db, 'waiters', waiter.id);
      const newStatus = waiter.status === 'active' ? 'inactive' : 'active';
      await updateDoc(waiterRef, { status: newStatus });
      toast.success(`Garçom ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso!`);
      fetchWaiters();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao alterar status do garçom');
    }
  };

  const handleDeleteWaiter = async (waiterId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este garçom? Esta ação é irreversível.')) return;
    try {
      const waiterRef = doc(db, 'waiters', waiterId);
      const snap = await getDoc(waiterRef);
      if (snap.exists()) {
        const waiterData = snap.data();
        if (waiterData.userId) {
          await deleteDoc(doc(db, 'users', waiterData.userId));
        }
      }
      await deleteDoc(waiterRef);
      toast.success('Garçom excluído com sucesso!');
      fetchWaiters();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir garçom');
    }
  };

  const handleExecuteCleanup = async () => {
    if (!confirmType || !userProfile?.restaurantId) return;

    setCleaning(true);
    try {
      if (confirmType === 'customers') {
        const q = query(
          collection(db, 'tableSessions'),
          where('restaurantId', '==', userProfile.restaurantId),
          where('status', '==', 'closed')
        );
        const snap = await getDocs(q);
        
        if (snap.empty) {
          toast.success('Nenhum histórico de cliente para limpar.');
          setConfirmType(null);
          return;
        }

        const batch = writeBatch(db);
        snap.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        toast.success('Histórico de clientes removido com sucesso!');
      } 
      else if (confirmType === 'orders' || confirmType === 'dashboard') {
        // Find active sessions so we can protect their orders
        const qActiveSessions = query(
          collection(db, 'tableSessions'),
          where('restaurantId', '==', userProfile.restaurantId),
          where('status', '==', 'active')
        );
        const activeSnap = await getDocs(qActiveSessions);
        const activeSessionIds = new Set<string>();
        activeSnap.forEach(docSnap => activeSessionIds.add(docSnap.id));

        // Load all orders
        const qOrders = query(
          collection(db, 'orders'),
          where('restaurantId', '==', userProfile.restaurantId)
        );
        const ordersSnap = await getDocs(qOrders);

        // Filters orders to delete (not associated with active sessions)
        const ordersToDelete: any[] = [];
        ordersSnap.forEach((docSnap) => {
          const orderData = docSnap.data();
          if (!activeSessionIds.has(orderData.tableSessionId)) {
            ordersToDelete.push(docSnap.ref);
          }
        });

        if (ordersToDelete.length === 0) {
          toast.success(
            confirmType === 'orders' 
              ? 'Nenhum pedido de sessão fechada para limpar.' 
              : 'Nenhum registro de desempenho para limpar.'
          );
          setConfirmType(null);
          return;
        }

        const batchSize = 500;
        for (let i = 0; i < ordersToDelete.length; i += batchSize) {
          const chunk = ordersToDelete.slice(i, i + batchSize);
          const batch = writeBatch(db);
          chunk.forEach((ref) => {
            batch.delete(ref);
          });
          await batch.commit();
        }

        toast.success(
          confirmType === 'orders' 
            ? 'Registros de cozinha e pedidos removidos com sucesso!' 
            : 'Dados do painel de desempenho removidos com sucesso!'
        );
      }
      setConfirmType(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao executar a limpeza dos registros');
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name || '');
      setPhone(restaurant.phone || '');
      setAddress(restaurant.address || '');
      setLogoUrl(restaurant.logoUrl || '');
      setThemeColor(restaurant.themeColor || '#e11d48');
      setServiceTaxEnabled(restaurant.serviceTaxEnabled !== false);
      setServiceTaxType(restaurant.serviceTaxType || 'percentage');
      setServiceTaxValue(String(restaurant.serviceTaxValue !== undefined ? restaurant.serviceTaxValue : 10));
      setCouvertEnabled(!!restaurant.couvertEnabled);
      setCouvertType(restaurant.couvertType || 'fixed');
      setCouvertValue(String(restaurant.couvertValue !== undefined ? restaurant.couvertValue : 0));
    }
  }, [restaurant]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const sTaxVal = parseFloat(serviceTaxValue) || 0;
      const cVal = parseFloat(couvertValue) || 0;

      await updateDoc(doc(db, 'restaurants', userProfile!.restaurantId), {
        name,
        phone,
        address,
        logoUrl: logoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&auto=format&fit=crop&q=60',
        themeColor,
        serviceTaxEnabled,
        serviceTaxType,
        serviceTaxValue: sTaxVal,
        serviceTax: serviceTaxType === 'percentage' ? sTaxVal : 10, // backward compat
        couvertEnabled,
        couvertType,
        couvertValue: cVal
      });
      toast.success('Configurações salvas com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaultColor = async () => {
    const defaultColor = '#e11d48';
    setThemeColor(defaultColor);
    
    if (!userProfile?.restaurantId) return;
    
    try {
      await updateDoc(doc(db, 'restaurants', userProfile.restaurantId), {
        themeColor: defaultColor
      });
      toast.success('Cor padrão restaurada e salva com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao restaurar cor padrão');
    }
  };

  // Build real digital menu URL for this restaurant
  const appUrl = window.location.origin;
  const menuUrl = `${appUrl}/menu/${userProfile?.restaurantId}`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(menuUrl)}`;

  // Print QR Code Flyer function
  const handlePrintQRCode = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Por favor, permita popups para imprimir o QR Code.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir QR Code - ${name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              text-align: center;
              padding: 40px;
              color: #1e293b;
              margin: 0;
            }
            .container {
              max-width: 500px;
              margin: 40px auto;
              padding: 40px;
              border: 3px dashed ${themeColor};
              border-radius: 40px;
              background-color: #ffffff;
              box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            }
            .logo {
              width: 70px;
              height: 70px;
              border-radius: 20px;
              object-fit: cover;
              margin-bottom: 16px;
            }
            h1 {
              font-size: 28px;
              font-weight: 800;
              margin: 0 0 8px 0;
              letter-spacing: -1px;
            }
            p {
              font-size: 15px;
              color: #64748b;
              margin: 0 0 30px 0;
              font-weight: 500;
            }
            .qr-wrapper {
              display: inline-block;
              padding: 20px;
              background-color: #f8fafc;
              border-radius: 30px;
              margin-bottom: 30px;
            }
            .qr-image {
              width: 280px;
              height: 280px;
              display: block;
            }
            .footer {
              font-size: 16px;
              font-weight: 700;
              color: ${themeColor};
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            @media print {
              body { padding: 0; }
              .container {
                box-shadow: none;
                margin: 0 auto;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoUrl ? `<img class="logo" src="${logoUrl}" />` : ''}
            <h1>${name}</h1>
            <p>Escaneie o QR Code abaixo para abrir nosso Cardápio Digital direto do seu celular!</p>
            <div class="qr-wrapper">
              <img class="qr-image" src="${qrCodeApiUrl}" />
            </div>
            <div class="footer">Cardápio na Mesa</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Download QR Code PNG function
  const handleDownloadPNG = async () => {
    try {
      const response = await fetch(qrCodeApiUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `qrcode_${name.toLowerCase().replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('QR Code baixado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao baixar imagem');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-3xl text-slate-800 tracking-tight">
          {activeTab === 'general' ? 'Configurações Gerais' : 'Gerenciamento de Garçons'}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          {activeTab === 'general' 
            ? 'Gerencie a identidade visual, taxas e gere o QR Code exclusivo do estabelecimento.'
            : 'Cadastre, edite, ative/desative e controle os garçons do seu restaurante.'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`pb-3 font-semibold text-sm transition-all relative ${
            activeTab === 'general' ? 'text-rose-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Geral
          {activeTab === 'general' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full animate-fade-in" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('waiters')}
          className={`pb-3 font-semibold text-sm transition-all relative ${
            activeTab === 'waiters' ? 'text-rose-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Garçons
          {activeTab === 'waiters' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full animate-fade-in" />
          )}
        </button>
      </div>

      {activeTab === 'general' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Form Column */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-2 space-y-6">
          
          {/* Identity Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="font-display font-semibold text-base text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
              <Sliders className="w-5 h-5 text-rose-500" />
              Informações do Restaurante
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome Fantasia *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">WhatsApp / Telefone *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Endereço Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">URL da Logomarca (PNG/JPG)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://suaimagem.com/logo.png"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Cor Temática do Cardápio</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-12 h-10 border border-slate-200 rounded-xl cursor-pointer bg-slate-50"
                  />
                  <input
                    type="text"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRestoreDefaultColor}
                  className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  Restaurar Cor Padrão
                </button>
              </div>
            </div>
          </div>

          {/* Parameters Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="font-display font-semibold text-base text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
              <Sliders className="w-5 h-5 text-rose-500" />
              Parâmetros e Regras de Negócio
            </h3>

            {/* Taxa de Serviço Section */}
            <div className="bg-slate-50 p-5 rounded-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Cobrar Taxa de Serviço</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Ao ativar, o sistema adicionará a taxa configurada de serviço na comanda dos clientes.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={serviceTaxEnabled}
                  onChange={(e) => setServiceTaxEnabled(e.target.checked)}
                  className="h-5 w-5 text-rose-600 focus:ring-rose-500 border-slate-300 rounded-lg shrink-0 cursor-pointer"
                />
              </div>

              {serviceTaxEnabled && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Tipo de Cobrança
                    </label>
                    <select
                      value={serviceTaxType}
                      onChange={(e) => setServiceTaxType(e.target.value as 'percentage' | 'fixed')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="percentage">Percentual (%)</option>
                      <option value="fixed">Valor Fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Valor da Taxa
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-medium">
                        {serviceTaxType === 'percentage' ? '%' : 'R$'}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={serviceTaxValue}
                        onChange={(e) => setServiceTaxValue(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Couvert Artístico Section */}
            <div className="bg-slate-50 p-5 rounded-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Cobrar Couvert Artístico</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Ao ativar, o sistema adicionará o couvert artístico configurado na comanda dos clientes.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={couvertEnabled}
                  onChange={(e) => setCouvertEnabled(e.target.checked)}
                  className="h-5 w-5 text-rose-600 focus:ring-rose-500 border-slate-300 rounded-lg shrink-0 cursor-pointer"
                />
              </div>

              {couvertEnabled && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Tipo de Cobrança
                    </label>
                    <select
                      value={couvertType}
                      onChange={(e) => setCouvertType(e.target.value as 'percentage' | 'fixed')}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="fixed">Valor Fixo (R$)</option>
                      <option value="percentage">Percentual (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Valor do Couvert
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-medium">
                        {couvertType === 'percentage' ? '%' : 'R$'}
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={couvertValue}
                        onChange={(e) => setCouvertValue(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-sm hover:shadow flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salvar Configurações
            </button>
          </div>

        </form>

        {/* QR Code Column */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="font-display font-semibold text-base text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
            <QrCode className="w-5 h-5 text-rose-500" />
            QR Code do Estabelecimento
          </h3>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-3xl">
              <img
                src={qrCodeApiUrl}
                alt="QR Code"
                className="w-48 h-48 rounded-2xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-800">Cardápio Único por Mesa</h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
                Imprima este QR Code e coloque em todas as mesas. Os clientes escolhem a mesa no primeiro acesso!
              </p>
            </div>

            <div className="w-full space-y-2">
              <button
                onClick={handlePrintQRCode}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl transition-all shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Imprimir Flyer QR Code
              </button>

              <button
                onClick={handleDownloadPNG}
                className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs py-2.5 rounded-xl border border-slate-200 transition-all"
              >
                <Download className="w-4 h-4" />
                Baixar QR Code PNG
              </button>
            </div>

            {/* Quick Link box */}
            <div className="bg-rose-50 border border-rose-100/50 p-3 rounded-2xl w-full text-left space-y-1">
              <span className="text-[9px] font-bold uppercase text-rose-500 tracking-wider">Link Direto do Cardápio</span>
              <p className="text-xs text-rose-700 truncate font-semibold select-all cursor-pointer">{menuUrl}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Seção de Limpeza de Registros */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6" id="section-clear-records">
        <h3 className="font-display font-semibold text-base text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
          <Trash2 className="w-5 h-5 text-rose-500" />
          Limpeza de Registros
        </h3>
        <p className="text-xs text-slate-500">
          Apague de forma segura os dados históricos do sistema. Esta ação é irreversível e não afetará estabelecimentos, usuários, mesas, produtos, categorias, configurações, QR Codes ou atendimentos em andamento.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Botão 1 */}
          <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between space-y-3 border border-slate-100" id="card-clear-customers">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Histórico de Clientes</h4>
              <p className="text-[11px] text-slate-500 mt-1">Remove permanentemente o histórico de visitas e consumo de clientes de sessões finalizadas.</p>
            </div>
            <button
              id="btn-clear-customers"
              type="button"
              onClick={() => setConfirmType('customers')}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs py-2.5 px-4 rounded-xl transition-all border border-rose-100 shadow-sm"
            >
              Limpar Histórico de Clientes
            </button>
          </div>

          {/* Botão 2 */}
          <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between space-y-3 border border-slate-100" id="card-clear-orders">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cozinha & Pedidos</h4>
              <p className="text-[11px] text-slate-500 mt-1">Apaga do sistema todos os registros de pedidos que foram finalizados ou cancelados.</p>
            </div>
            <button
              id="btn-clear-orders"
              type="button"
              onClick={() => setConfirmType('orders')}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs py-2.5 px-4 rounded-xl transition-all border border-rose-100 shadow-sm"
            >
              Limpar Cozinha & Pedidos
            </button>
          </div>

          {/* Botão 3 */}
          <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-between space-y-3 border border-slate-100" id="card-clear-dashboard">
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Painel de Desempenho</h4>
              <p className="text-[11px] text-slate-500 mt-1">Apaga o histórico de vendas para zerar e reiniciar os gráficos e estatísticas de vendas.</p>
            </div>
            <button
              id="btn-clear-dashboard"
              type="button"
              onClick={() => setConfirmType('dashboard')}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs py-2.5 px-4 rounded-xl transition-all border border-rose-100 shadow-sm"
            >
              Limpar Painel de Desempenho
            </button>
          </div>
        </div>
      </div>
    </>
  ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white border border-slate-100 rounded-3xl p-6 shadow-sm gap-4">
            <div>
              <h3 className="font-display font-semibold text-lg text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-500" />
                Quadro de Garçons
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Gerencie as credenciais e status de acesso da equipe de atendimento.
              </p>
            </div>
            <button
              id="btn-add-waiter"
              type="button"
              onClick={() => {
                setEditingWaiter(null);
                setWaiterName('');
                setWaiterPhone('');
                setWaiterLogin('');
                setWaiterPasswordTemp('');
                setShowWaiterModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              Adicionar Garçom
            </button>
          </div>

          {loadingWaiters ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-12 shadow-sm text-center">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500 mt-2">Carregando garçons...</p>
            </div>
          ) : waiters.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-12 shadow-sm text-center space-y-3">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-semibold text-sm text-slate-800">Nenhum garçom cadastrado</h4>
                <p className="text-xs text-slate-500">Cadastre garçons para que eles possam gerenciar mesas e realizar pedidos de forma integrada.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {waiters.map((waiter) => (
                <div
                  key={waiter.id}
                  className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-display font-semibold text-sm text-slate-800 truncate max-w-[150px]">
                          {waiter.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{waiter.phone}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                          waiter.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {waiter.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl space-y-2 border border-slate-100 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Acesso Provisório:</span>
                        <span className="font-semibold text-slate-700 font-mono">{waiter.login}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Senha Provisória:</span>
                        <span className="font-semibold text-slate-700 font-mono">{waiter.passwordTemp}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Primeiro Acesso:</span>
                        <span className={`font-bold ${waiter.isFirstAccess ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {waiter.isFirstAccess ? 'Pendente' : 'Concluído'}
                        </span>
                      </div>
                      {waiter.email && (
                        <div className="flex justify-between text-slate-500 truncate pt-1 border-t border-slate-200/50">
                          <span>E-mail Definitivo:</span>
                          <span className="font-semibold text-slate-700 max-w-[120px] truncate" title={waiter.email}>{waiter.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-50">
                    <button
                      type="button"
                      onClick={() => handleToggleWaiterStatus(waiter)}
                      className={`flex-1 text-[11px] font-bold py-2 rounded-xl transition-all border ${
                        waiter.status === 'active'
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                          : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                      }`}
                    >
                      {waiter.status === 'active' ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingWaiter(waiter);
                        setWaiterName(waiter.name);
                        setWaiterPhone(waiter.phone);
                        setWaiterLogin(waiter.login);
                        setWaiterPasswordTemp(waiter.passwordTemp);
                        setShowWaiterModal(true);
                      }}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] py-2 px-3 rounded-xl transition-all"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWaiter(waiter.id)}
                      className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold text-[11px] py-2 px-3 rounded-xl transition-all"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Waiter Create/Edit Modal */}
          {showWaiterModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <form
                onSubmit={handleSaveWaiter}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-100 animate-fade-in space-y-4"
              >
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <h3 className="font-display font-bold text-lg text-slate-800">
                    {editingWaiter ? 'Editar Garçom' : 'Cadastrar Novo Garçom'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWaiterModal(false);
                      setEditingWaiter(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={waiterName}
                      onChange={(e) => setWaiterName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Telefone *
                    </label>
                    <input
                      type="text"
                      required
                      value={waiterPhone}
                      onChange={(e) => setWaiterPhone(e.target.value)}
                      placeholder="Ex: (11) 99999-9999"
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Login Temporário *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={editingWaiter && !editingWaiter.isFirstAccess}
                      value={waiterLogin}
                      onChange={(e) => setWaiterLogin(e.target.value)}
                      placeholder="Ex: joao.garcom"
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {editingWaiter && !editingWaiter.isFirstAccess && (
                      <p className="text-[10px] text-slate-400 mt-1">O login provisório não pode ser alterado após o primeiro acesso.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Senha Temporária *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={editingWaiter && !editingWaiter.isFirstAccess}
                      value={waiterPasswordTemp}
                      onChange={(e) => setWaiterPasswordTemp(e.target.value)}
                      placeholder="Ex: 123456"
                      className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {editingWaiter && !editingWaiter.isFirstAccess && (
                      <p className="text-[10px] text-slate-400 mt-1">A senha provisória não pode ser alterada após o primeiro acesso.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWaiterModal(false);
                      setEditingWaiter(null);
                    }}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs py-2.5 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-sm hover:shadow transition-all"
                  >
                    Salvar Garçom
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="modal-confirm-cleanup">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-100 animate-fade-in space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-display font-extrabold text-lg text-slate-800">Ação Irreversível</h3>
            </div>
            
            <p className="text-slate-600 text-xs leading-relaxed">
              {confirmType === 'customers' && 'Tem certeza de que deseja apagar todo o histórico de visitas e consumo de clientes? Esta ação removerá permanentemente todos os registros de sessões fechadas. As mesas e sessões ativas continuarão funcionando normalmente.'}
              {confirmType === 'orders' && 'Tem certeza de que deseja limpar os registros de cozinha e pedidos? Todos os pedidos finalizados (entregues ou cancelados) de sessões fechadas serão excluídos permanentemente. Pedidos de mesas ativas serão totalmente preservados.'}
              {confirmType === 'dashboard' && 'Tem certeza de que deseja limpar o Painel de Desempenho? Esta ação removerá os dados de vendas e faturamento históricos (pedidos finalizados de sessões fechadas), reiniciando os gráficos e estatísticas do painel.'}
            </p>

            <div className="bg-red-50 border border-red-100 p-3.5 rounded-2xl">
              <p className="text-[10px] text-red-800 font-bold leading-normal uppercase tracking-wider">
                * Atenção: Os dados excluídos não poderão ser recuperados sob nenhuma hipótese.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                id="btn-cancel-cleanup"
                type="button"
                disabled={cleaning}
                onClick={() => setConfirmType(null)}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                id="btn-confirm-cleanup"
                type="button"
                disabled={cleaning}
                onClick={handleExecuteCleanup}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {cleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
