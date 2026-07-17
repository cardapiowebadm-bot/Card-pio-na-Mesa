import React, { useState } from 'react';
import { useCardapio } from '../contexts/CardapioContext';
import { 
  BellRing, 
  ShoppingCart, 
  Receipt, 
  UtensilsCrossed, 
  Volume2, 
  Sparkles,
  ChevronRight,
  HelpCircle,
  Clock,
  X
} from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CardapioLayout({ children }: { children: React.ReactNode }) {
  const { restaurant, activeSession, cart, callWaiter } = useCardapio();
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const location = useLocation();
  const [showCallModal, setShowCallModal] = useState(false);
  const [calling, setCalling] = useState(false);

  // Cart count
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleCallWaiter = async (reason: string) => {
    setCalling(true);
    try {
      await callWaiter(reason);
      toast.success('Garçom chamado! Um atendente está a caminho da sua mesa.');
      setShowCallModal(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao chamar garçom.');
    } finally {
      setCalling(false);
    }
  };

  const navItems = [
    {
      to: `/menu/${restaurantId}/home`,
      label: 'Cardápio',
      icon: <UtensilsCrossed className="w-5 h-5" />
    },
    {
      to: `/menu/${restaurantId}/orders`,
      label: 'Minha Conta',
      icon: <Receipt className="w-5 h-5" />
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24 text-slate-800">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          {restaurant?.logoUrl ? (
            <img 
              src={restaurant.logoUrl} 
              alt={restaurant.name} 
              className="w-10 h-10 rounded-full object-cover border border-slate-100"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
              {restaurant?.name?.charAt(0).toUpperCase() || 'M'}
            </div>
          )}
          
          <div>
            <h1 className="font-display font-bold text-sm text-slate-800">{restaurant?.name || 'Carregando...'}</h1>
            {activeSession && (
              <span className="text-[10px] bg-rose-50 text-rose-600 font-extrabold px-2 py-0.5 rounded-full uppercase mt-0.5 block w-max">
                Mesa {activeSession.tableNumber}
              </span>
            )}
          </div>
        </div>

        {/* Call Waiter CTA */}
        {activeSession && (
          <button
            onClick={() => setShowCallModal(true)}
            className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <BellRing className="w-3.5 h-3.5 animate-bounce" />
            Chamar Garçom
          </button>
        )}
      </header>

      {/* Main Screen */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4">
        {children}
      </main>

      {/* Persistent Bottom Bar for Mobile-first client */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 py-2.5 px-6 shadow-2xl flex items-center justify-around z-40 max-w-lg mx-auto rounded-t-3xl">
        {navItems.map((item) => {
          const active = location.pathname === item.to || 
            (item.to.endsWith('/home') && location.pathname.includes('/home')) || 
            (item.to.endsWith('/orders') && location.pathname.includes('/orders'));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold uppercase transition-all ${
                active ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Cart Icon trigger */}
        <Link
          to={`/menu/${restaurantId}/cart`}
          className={`relative flex flex-col items-center gap-1 text-[11px] font-bold uppercase transition-all ${
            location.pathname.includes('/cart') ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Carrinho</span>
          {cartItemsCount > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-rose-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-white">
              {cartItemsCount}
            </span>
          )}
        </Link>
      </nav>

      {/* Call Waiter Modal Selection */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCallModal(false)} />
          
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-10 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-display font-extrabold text-lg text-slate-800">Chamar Atendente</h3>
              <button onClick={() => setShowCallModal(false)} className="text-slate-400 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-500 text-xs mb-4">Selecione o motivo da solicitação para agilizarmos seu atendimento:</p>

            <div className="space-y-2">
              {[
                { reason: 'Fazer pedido', desc: 'Preciso de ajuda com o cardápio' },
                { reason: 'Trazer talheres', desc: 'Talher adicional ou copos' },
                { reason: 'Limpar mesa', desc: 'Remover pratos ou sujeira' },
                { reason: 'Outro assunto', desc: 'Outras solicitações diversas' }
              ].map((opt) => (
                <button
                  key={opt.reason}
                  onClick={() => handleCallWaiter(opt.reason)}
                  disabled={calling}
                  className="w-full text-left p-4 bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 rounded-2xl flex items-center justify-between transition-all group"
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 group-hover:text-rose-700">{opt.reason}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
