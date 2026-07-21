import React, { useState, useEffect } from 'react';
import { useCardapio } from '../contexts/CardapioContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ChefHat, ArrowRight, User, Phone, Clipboard, Loader2, Users, PlusCircle, ClipboardList, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { getThemeShades } from '../services/theme';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function CardapioWelcome() {
  const { restaurant, startSession, activeSession, loading: globalLoading, error: globalError, joinSession } = useCardapio();
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [tableNum, setTableNum] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);

  // Waiter Mode specific states
  const [waiterTab, setWaiterTab] = useState<'new_table' | 'active_tables'>('new_table');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // If already has activeSession loaded, redirect right away
  useEffect(() => {
    if (activeSession) {
      navigate(`/menu/${restaurantId}/home`);
    }
  }, [activeSession, restaurantId, navigate]);

  // Support pre-filled table number from URL query parameters (e.g. ?mesa=3 or ?table=3)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const mesaParam = searchParams.get('mesa') || searchParams.get('table') || searchParams.get('m') || searchParams.get('t');
    if (mesaParam) {
      const parsed = parseInt(mesaParam);
      if (parsed && !isNaN(parsed)) {
        setTableNum(parsed.toString());
      }
    }
  }, []);

  // Log error if restaurant cannot be found
  useEffect(() => {
    if (globalError) {
      console.error(`[CardapioWelcome] Erro ao carregar estabelecimento com ID: ${restaurantId}. Detalhes:`, globalError);
    }
  }, [globalError, restaurantId]);

  // Fetch active sessions for Waiter Mode in real-time
  useEffect(() => {
    if (userProfile?.role !== 'waiter' || !restaurantId) return;

    setLoadingSessions(true);
    const q = query(
      collection(db, 'tableSessions'),
      where('restaurantId', '==', restaurantId),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => a.tableNumber - b.tableNumber);
      setActiveSessions(list);
      setLoadingSessions(false);
    }, (err) => {
      console.error(err);
      setLoadingSessions(false);
    });

    return unsubscribe;
  }, [userProfile, restaurantId]);

  // If restaurant is still loading, show a beautiful loader
  if (globalLoading && !restaurant) {
    return (
      <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Carregando cardápio digital...</p>
        </div>
      </div>
    );
  }

  // If there's an error, or restaurant doesn't exist and not loading
  if (globalError || (!restaurant && !globalLoading)) {
    return (
      <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 font-sans px-4">
        <div className="bg-white border border-slate-100 w-full max-w-sm rounded-3xl p-6 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <ChefHat className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-lg text-slate-800">Cardápio Indisponível</h3>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Não conseguimos encontrar este estabelecimento. Verifique se o link ou QR Code do cardápio está correto.
            </p>
          </div>
          <p className="text-[10px] text-slate-400 bg-slate-50 py-1.5 px-3 rounded-lg font-mono">
            Restaurante: {restaurantId || 'N/A'}
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const tableInt = parseInt(tableNum);
    if (!tableInt || isNaN(tableInt)) {
      toast.error('Por favor, informe o número da mesa.');
      return;
    }
    if (!name.trim()) {
      toast.error(userProfile?.role === 'waiter' ? 'Por favor, informe o nome do cliente.' : 'Por favor, preencha o seu nome.');
      return;
    }
    if (phone.length < 10) {
      toast.error('Informe um telefone válido com DDD.');
      return;
    }

    if (cpf && cpf.trim().length !== 11) {
      toast.error('O CPF deve ter exatamente 11 dígitos.');
      return;
    }

    setLoading(true);
    try {
      if (userProfile?.role === 'waiter') {
        await startSession(
          tableInt, 
          name, 
          phone, 
          cpf, 
          userProfile.id, 
          userProfile.name, 
          'waiter'
        );
        toast.success(`Mesa ${tableInt} aberta com sucesso!`);
      } else {
        await startSession(tableInt, name, phone, cpf || undefined);
        toast.success(`Bem-vindo, ${name}!`);
      }
      navigate(`/menu/${restaurantId}/home`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao abrir comanda da mesa.');
    } finally {
      setLoading(false);
    }
  };

  const themeColor = restaurant?.themeColor || '#e11d48';
  const shades = getThemeShades(themeColor);

  return (
    <div className="cardapio-theme min-h-[85vh] flex flex-col justify-center items-center py-6 font-sans">
      <style>{`
        .cardapio-theme {
          --color-rose-50: ${shades[50]};
          --color-rose-100: ${shades[100]};
          --color-rose-500: ${shades[500]};
          --color-rose-600: ${shades[600]};
          --color-rose-700: ${shades[700]};
          --color-rose-900: ${shades[900]};
          --theme-primary: ${shades[600]};
        }
      `}</style>
      
      {/* Restaurant Header */}
      <div className="text-center space-y-3 mb-8">
        {restaurant?.logoUrl ? (
          <img 
            src={restaurant.logoUrl} 
            alt={restaurant.name} 
            className="w-16 h-16 rounded-full object-cover mx-auto shadow border border-slate-100"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center mx-auto shadow-md">
            <ChefHat className="w-8 h-8" />
          </div>
        )}
        
        <div>
          <h2 className="font-display font-extrabold text-2xl text-slate-800 tracking-tight">
            {restaurant?.name || 'Seja Bem-vindo!'}
          </h2>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed max-w-[280px] mx-auto">
            {userProfile?.role === 'waiter' 
              ? 'Painel do Garçom - Atendimento de Mesas e Comandas' 
              : 'Por favor, informe seus dados e o número da mesa para acessar o cardápio digital.'}
          </p>
        </div>
      </div>

      {/* Waiter Mode Tab Selector */}
      {userProfile?.role === 'waiter' && (
        <div className="flex bg-slate-100 p-1 rounded-2xl w-full max-w-sm mb-4 border border-slate-200/50">
          <button
            onClick={() => setWaiterTab('new_table')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
              waiterTab === 'new_table'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Mesa</span>
          </button>
          <button
            onClick={() => setWaiterTab('active_tables')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all ${
              waiterTab === 'active_tables'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Mesas Ativas ({activeSessions.length})</span>
          </button>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white border border-slate-100 w-full max-w-sm rounded-3xl p-6 shadow-sm">
        {userProfile?.role === 'waiter' && waiterTab === 'active_tables' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Mesa Ativa</span>
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Ao Vivo</span>
            </div>
            
            {loadingSessions ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 text-rose-600 animate-spin" />
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <ClipboardList className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                <p>Nenhuma mesa ativa no momento.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/60 border border-slate-100 rounded-2xl transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded-lg shadow-2xs">Mesa {session.tableNumber}</span>
                        {session.waiterName && (
                          <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md font-medium">Garçom: {session.waiterName.split(' ')[0]}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 font-medium truncate max-w-[140px] pl-0.5">{session.customerName}</p>
                    </div>
                    <button
                      onClick={() => {
                        joinSession(session);
                        toast.success(`Entrou na Mesa ${session.tableNumber}!`);
                        navigate(`/menu/${restaurantId}/home`);
                      }}
                      className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-xs transition-all"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Atender</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Table Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Número da Mesa *</label>
              <input
                type="number"
                min="1"
                value={tableNum}
                onChange={(e) => setTableNum(e.target.value)}
                placeholder="Ex: 5"
                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                required
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {userProfile?.role === 'waiter' ? 'Nome do Cliente *' : 'Seu Nome *'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {userProfile?.role === 'waiter' ? 'Celular do Cliente *' : 'Celular / WhatsApp *'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: 11999999999"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>
            </div>

            {/* Optional CPF */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>{userProfile?.role === 'waiter' ? 'CPF do Cliente' : 'CPF na Nota?'}</span>
                <span className="text-[10px] text-slate-300 font-normal lowercase">(opcional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Clipboard className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  maxLength={11}
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                  placeholder="Apenas números (11 dígitos)"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono font-semibold text-slate-700"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`w-full mt-4 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all ${
                loading ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{userProfile?.role === 'waiter' ? 'Iniciar Comanda / Abrir Mesa' : 'Acessar Cardápio'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>
        )}
      </div>

    </div>
  );
}
