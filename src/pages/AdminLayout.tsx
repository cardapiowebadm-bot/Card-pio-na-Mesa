import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChefHat, 
  LayoutDashboard, 
  Grid3X3, 
  UtensilsCrossed, 
  FolderHeart, 
  ReceiptText, 
  UsersRound, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Volume2, 
  VolumeX,
  Sparkles
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { RestaurantNotification } from '../types';
import toast from 'react-hot-toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, restaurant, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<RestaurantNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sound generator
  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 150);
    } catch (e) {
      console.error("Error playing alert sound:", e);
    }
  };

  // Listen to unread notifications for the restaurant
  useEffect(() => {
    if (loading) return;
    if (!userProfile?.restaurantId) {
      if (!loading && !userProfile) {
        navigate('/login');
      }
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('restaurantId', '==', userProfile.restaurantId),
      where('status', '==', 'unread')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifs: RestaurantNotification[] = [];
      let shouldPlaySound = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          shouldPlaySound = true;
          const data = change.doc.data();
          toast.success(data.message, {
            duration: 5000,
            icon: '🔔'
          });
        }
      });

      snapshot.forEach((doc) => {
        newNotifs.push({ ...doc.data(), id: doc.id } as RestaurantNotification);
      });

      setNotifications(newNotifs);
      
      if (shouldPlaySound && newNotifs.length > 0) {
        playAlertSound();
      }
    });

    return unsubscribe;
  }, [userProfile?.restaurantId, loading]);

  // Security route guard based on role
  useEffect(() => {
    if (loading) return;
    if (!userProfile) return;

    const currentPath = location.pathname;
    const matchedItem = [
      { to: "/admin", allowedRoles: ['owner', 'manager'] },
      { to: "/admin/tables", allowedRoles: ['owner', 'manager', 'waiter'] },
      { to: "/admin/orders", allowedRoles: ['owner', 'manager', 'waiter', 'cozinha'] },
      { to: "/admin/products", allowedRoles: ['owner', 'manager'] },
      { to: "/admin/categories", allowedRoles: ['owner', 'manager'] },
      { to: "/admin/customers", allowedRoles: ['owner', 'manager', 'waiter'] },
      { to: "/admin/settings", allowedRoles: ['owner', 'manager'] }
    ].find(item => item.to === currentPath);

    if (matchedItem && !matchedItem.allowedRoles.includes(userProfile.role)) {
      if (userProfile.role === 'waiter') {
        navigate('/admin/tables');
      } else if (userProfile.role === 'cozinha') {
        navigate('/admin/orders');
      } else {
        navigate('/');
      }
    }
  }, [location.pathname, userProfile, loading, navigate]);

  const handleMarkAllRead = async () => {
    try {
      for (const n of notifications) {
        await updateDoc(doc(db, 'notifications', n.id), { status: 'read' });
      }
      setNotifications([]);
      toast.success('Notificações limpas');
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Até logo!');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <ChefHat className="w-12 h-12 text-rose-600 animate-bounce" />
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return null; // Let useEffect redirect
  }

  const role = userProfile.role;

  // Navigation Items according to User Roles
  const navItems = [
    {
      to: "/admin",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      allowedRoles: ['owner', 'manager']
    },
    {
      to: "/admin/tables",
      label: "Mesas",
      icon: <Grid3X3 className="w-5 h-5" />,
      allowedRoles: ['owner', 'manager', 'waiter']
    },
    {
      to: "/admin/orders",
      label: "Pedidos",
      icon: <UtensilsCrossed className="w-5 h-5" />,
      allowedRoles: ['owner', 'manager', 'waiter', 'cozinha']
    },
    {
      to: "/admin/products",
      label: "Produtos",
      icon: <ReceiptText className="w-5 h-5" />,
      allowedRoles: ['owner', 'manager']
    },
    {
      to: "/admin/categories",
      label: "Categorias",
      icon: <FolderHeart className="w-5 h-5" />,
      allowedRoles: ['owner', 'manager']
    },
    {
      to: "/admin/customers",
      label: "Clientes",
      icon: <UsersRound className="w-5 h-5" />,
      allowedRoles: ['owner', 'manager', 'waiter']
    },
    {
      to: "/admin/settings",
      label: "Configurações",
      icon: <Settings className="w-5 h-5" />,
      allowedRoles: ['owner', 'manager']
    }
  ].filter(item => item.allowedRoles.includes(role));

  const roleLabels: Record<string, string> = {
    owner: 'Proprietário',
    manager: 'Gerente',
    waiter: 'Garçom',
    cozinha: 'Cozinha'
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex font-sans selection:bg-rose-100 selection:text-rose-800">
      
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 text-white shrink-0 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-rose-600 text-white p-1.5 rounded-xl">
              <ChefHat className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Painel SaaS</span>
          </div>
        </div>

        {/* Restaurant Profile Info */}
        <div className="p-4 mx-4 my-4 bg-slate-800/40 border border-slate-800/50 rounded-2xl">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Restaurante</p>
          <h4 className="font-semibold text-sm text-slate-200 truncate mt-0.5">{restaurant?.name || 'Estabelecimento'}</h4>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-slate-400 font-medium">Perfil: {roleLabels[role]}</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active 
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/10' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {/* Audio toggle */}
          <button 
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              toast.success(soundEnabled ? 'Alertas sonoros desativados' : 'Alertas sonoros ativados');
            }}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-800/50 hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-all"
          >
            <span className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-rose-500" /> : <VolumeX className="w-4 h-4" />}
              Som de Alertas
            </span>
            <span className="text-[10px] uppercase">{soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-red-950/20 hover:text-red-400 transition-all text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* Main Content & Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <h1 className="font-display font-bold text-xl text-slate-800 hidden md:block">
              {restaurant?.name || 'Cardápio na Mesa'}
            </h1>
          </div>

          {/* Quick Actions & Notifications */}
          <div className="flex items-center gap-4">
            
            {/* Visual demo notification hub */}
            <div className="relative">
              <button 
                onClick={handleMarkAllRead}
                className="relative p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"
                title="Limpar notificações"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>

            {/* Menu shortcut link */}
            <a 
              href={`/menu/${restaurant?.id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ver Cardápio Digital
            </a>

            {/* User Profile Info */}
            <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 truncate">{userProfile.name}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{roleLabels[role]}</p>
              </div>
            </div>

          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative w-64 max-w-xs bg-slate-900 text-white flex flex-col p-6 h-full shadow-2xl">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-2 mb-8 mt-2">
                <div className="bg-rose-600 text-white p-1.5 rounded-xl">
                  <ChefHat className="w-5 h-5" />
                </div>
                <span className="font-display font-bold text-lg">Cardápio na Mesa</span>
              </div>

              <div className="mb-6 p-4 bg-slate-800/40 border border-slate-800/50 rounded-2xl">
                <p className="text-xs text-slate-500 font-semibold uppercase">Restaurante</p>
                <h4 className="font-bold text-sm text-slate-200 mt-0.5">{restaurant?.name}</h4>
                <p className="text-[11px] text-rose-400 font-semibold mt-1">{roleLabels[role]}</p>
              </div>

              <nav className="flex-1 space-y-1">
                {navItems.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        active 
                          ? 'bg-rose-600 text-white' 
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="pt-6 border-t border-slate-800 space-y-2">
                <a 
                  href={`/menu/${restaurant?.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-rose-600 text-white font-semibold text-xs py-2.5 rounded-xl shadow-sm hover:shadow transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Visualizar Cardápio
                </a>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-red-950/20 hover:text-red-400 transition-all text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Render Child Component */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
