import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Order } from '../types';
import { 
  Check, 
  Clock, 
  Play, 
  X, 
  UtensilsCrossed, 
  ReceiptText, 
  Printer 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminOrders() {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'delivered'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.restaurantId) return;

    // Load active orders of today
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', userProfile.restaurantId),
      where('createdAt', '>=', startOfToday.toISOString())
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const items: Order[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as Order));
      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(items);
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile?.restaurantId]);

  const handleUpdateStatus = async (orderId: string, nextStatus: 'preparing' | 'delivered' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: nextStatus });
      
      const messages = {
        preparing: 'Pedido enviado para preparo!',
        delivered: 'Pedido marcado como entregue!',
        cancelled: 'Pedido cancelado.'
      };
      toast.success(messages[nextStatus]);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar pedido');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return o.status !== 'cancelled';
    return o.status === filter;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl text-slate-800 tracking-tight">Cozinha & Pedidos</h2>
          <p className="text-slate-500 text-sm mt-1">Monitore e gerencie o fluxo de preparo dos pratos em tempo real.</p>
        </div>

        {/* Status Filters */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 overflow-x-auto">
          {[
            { value: 'all', label: 'Todos os Ativos' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'preparing', label: 'Em Preparo' },
            { value: 'delivered', label: 'Entregues' }
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value as any)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                filter === btn.value 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center shadow-sm">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
          <h3 className="font-semibold text-slate-800 mb-1">Sem pedidos no momento</h3>
          <p className="text-slate-500 text-sm">Novos pedidos feitos pelos clientes aparecerão aqui instantaneamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const dateStr = new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div 
                key={order.id} 
                className={`bg-white border rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[300px] transition-all relative ${
                  order.status === 'pending' 
                    ? 'border-red-200 ring-2 ring-red-500/10' 
                    : order.status === 'preparing' 
                      ? 'border-blue-200 ring-2 ring-blue-500/10' 
                      : 'border-slate-100'
                }`}
              >
                
                {/* Order Meta Header */}
                <div>
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h3 className="font-display font-extrabold text-xl text-slate-800">Mesa {order.tableNumber}</h3>
                      <p className="text-slate-400 text-xs mt-0.5 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Feito às {dateStr}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      order.status === 'pending' 
                        ? 'bg-red-50 text-red-600 animate-pulse' 
                        : order.status === 'preparing' 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {order.status === 'pending' ? 'Pendente' : order.status === 'preparing' ? 'Em Preparo' : 'Entregue'}
                    </span>
                  </div>

                  {/* Customer context */}
                  <div className="bg-[#fafafa] border border-slate-100 px-3 py-2 rounded-xl text-xs text-slate-600 font-semibold mb-4">
                    Cliente: {order.customerName}
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-start text-xs text-slate-700">
                        <div className="flex items-start gap-2 max-w-[80%]">
                          <span className="bg-slate-100 text-slate-600 font-extrabold px-1.5 py-0.5 rounded text-[10px] shrink-0">
                            {item.quantity}x
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">{item.name}</p>
                            {item.notes && (
                              <p className="text-[10px] text-red-500 font-semibold mt-0.5 italic">Obs: {item.notes}</p>
                            )}
                          </div>
                        </div>
                        <span className="font-semibold text-slate-500">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer totals & action buttons */}
                <div className="border-t border-slate-100 pt-4 mt-6 space-y-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold text-slate-400">Total do Pedido</span>
                    <span className="text-lg font-bold text-slate-800">R$ {order.total.toFixed(2)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {order.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                          className="bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 text-slate-600 font-semibold text-xs py-2.5 rounded-xl transition-all"
                        >
                          Recusar
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'preparing')}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Preparar
                        </button>
                      </>
                    ) : order.status === 'preparing' ? (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                        className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all"
                      >
                        <Check className="w-4 h-4" />
                        Marcar como Entregue
                      </button>
                    ) : (
                      <div className="col-span-2 text-center text-slate-400 text-xs font-semibold py-2">
                        Pedido entregue com sucesso!
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
