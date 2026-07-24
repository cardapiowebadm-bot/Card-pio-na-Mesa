import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Crown, 
  LayoutDashboard, 
  Store, 
  CreditCard, 
  DollarSign, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';

interface MasterLayoutProps {
  children: React.ReactNode;
}

export default function MasterLayout({ children }: MasterLayoutProps) {
  const { userProfile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', path: '/master/dashboard', icon: LayoutDashboard },
    { name: 'Restaurantes', path: '/master/restaurants', icon: Store },
    { name: 'Planos & Recursos', path: '/master/plans', icon: Layers },
    { name: 'Assinaturas', path: '/master/subscriptions', icon: CreditCard },
    { name: 'Financeiro', path: '/master/financial', icon: DollarSign, tag: 'Estrutura' },
    { name: 'Relatórios', path: '/master/reports', icon: BarChart3, tag: 'Estrutura' },
    { name: 'Configurações', path: '/master/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/master/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col bg-slate-900 border-r border-slate-800">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800/80">
          <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white p-2 rounded-xl shadow-md shadow-indigo-600/20">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-bold text-base tracking-tight text-white block leading-tight">Cardápio na Mesa</span>
            <span className="text-[10px] font-semibold tracking-wider text-indigo-400 uppercase">BackOffice Master</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/master/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.tag && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold tracking-wide uppercase ${
                    isActive ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                  }`}>
                    {item.tag}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Admin Info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
              {userProfile?.name?.charAt(0) || 'M'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{userProfile?.name || 'Admin Master'}</p>
              <p className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Root Master
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-rose-400 text-xs font-medium rounded-xl border border-slate-700/50 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair do BackOffice</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header - Topbar */}
        <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 h-16 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-bold text-sm text-white">BackOffice Master</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-500">Plataforma Global</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-indigo-400 font-medium">Multi-Tenant Admin</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-full text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sistema Operacional</span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex flex-col p-6 animate-fade-in">
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-indigo-400" />
                <span className="font-bold text-base text-white">Painel Master</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="py-6 space-y-2 flex-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
                      isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </div>
                    {item.tag && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                        {item.tag}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 border border-slate-800 text-rose-400 text-sm font-semibold rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair do Painel Master</span>
            </button>
          </div>
        )}

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
