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
import { Order, Product } from '../types';
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
  const { userProfile, restaurant } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'delivered'>('all');
  const [loading, setLoading] = useState(true);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ [orderId: string]: number[] }>({});

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
      setPrintingOrder(null);
    }, 250);
  };

  const handleCancelOrder = async () => {
    if (!cancellingOrder) return;
    if (!cancelReason.trim()) {
      toast.error('O motivo do cancelamento é obrigatório');
      return;
    }

    try {
      await updateDoc(doc(db, 'orders', cancellingOrder.id), {
        status: 'cancelled',
        cancelReason: cancelReason.trim(),
        cancelledAt: new Date().toISOString()
      });
      toast.success('Pedido cancelado com sucesso!');
      setCancellingOrder(null);
      setCancelReason('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao cancelar o pedido');
    }
  };

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

  useEffect(() => {
    if (!userProfile?.restaurantId) return;

    const q = query(
      collection(db, 'products'),
      where('restaurantId', '==', userProfile.restaurantId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const items: Product[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as Product));
      setProducts(items);
    });

    return unsubscribe;
  }, [userProfile?.restaurantId]);

  const handleToggleItemSelection = (orderId: string, index: number) => {
    setSelectedItems(prev => {
      const current = prev[orderId] || [];
      const updated = current.includes(index)
        ? current.filter(i => i !== index)
        : [...current, index];
      return { ...prev, [orderId]: updated };
    });
  };

  const handleDeliverSelectedItems = async (order: Order) => {
    const selectedIndices = selectedItems[order.id] || [];
    if (selectedIndices.length === 0) {
      toast.error('Selecione pelo menos um item para entregar');
      return;
    }

    try {
      const updatedItems = order.items.map((item, index) => {
        if (selectedIndices.includes(index)) {
          return { ...item, status: 'delivered' as const };
        }
        return item;
      });

      const allDelivered = updatedItems.every(item => item.status === 'delivered');
      
      const updatePayload: any = {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      };

      if (allDelivered) {
        updatePayload.status = 'delivered';
      }

      await updateDoc(doc(db, 'orders', order.id), updatePayload);

      setSelectedItems(prev => {
        const copy = { ...prev };
        delete copy[order.id];
        return copy;
      });

      if (allDelivered) {
        toast.success('Todos os itens foram entregues. Pedido finalizado!');
      } else {
        toast.success('Itens selecionados foram entregues com sucesso!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao entregar os itens selecionados');
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: 'preparing' | 'delivered' | 'cancelled') => {
    try {
      const payload: any = { status: nextStatus };
      if (nextStatus === 'delivered') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          payload.items = order.items.map(item => ({
            ...item,
            status: 'delivered' as const
          }));
        }
      }
      await updateDoc(doc(db, 'orders', orderId), payload);
      
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
                    
                    {/* Status Badge & Print */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePrint(order)}
                        className="bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 p-1.5 rounded-xl transition-all flex items-center justify-center shadow-sm hover:shadow"
                        title="Imprimir Pedido"
                        id={`print-btn-${order.id}`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
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
                  </div>

                  {/* Customer context */}
                  <div className="bg-[#fafafa] border border-slate-100 px-3 py-2 rounded-xl text-xs text-slate-600 font-semibold mb-4">
                    Cliente: {order.customerName}
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    {order.items.map((item, index) => {
                      const isDelivered = item.status === 'delivered';
                      const isPreparing = order.status === 'preparing';
                      const isSelected = selectedItems[order.id]?.includes(index) || false;

                      return (
                        <div key={index} className="flex justify-between items-start text-xs text-slate-700">
                          <div className="flex items-start gap-2 max-w-[80%]">
                            {isPreparing && (
                              <div className="flex items-center h-4 shrink-0">
                                {isDelivered ? (
                                  <span className="text-emerald-500" title="Item já entregue">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </span>
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleItemSelection(order.id, index)}
                                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                                    id={`item-checkbox-${order.id}-${index}`}
                                  />
                                )}
                              </div>
                            )}
                            <span className={`bg-slate-100 text-slate-600 font-extrabold px-1.5 py-0.5 rounded text-[10px] shrink-0 ${isDelivered ? 'opacity-50' : ''}`}>
                              {item.quantity}x
                            </span>
                            <div>
                              <p className={`font-semibold ${isDelivered ? 'text-slate-400 line-through font-normal' : 'text-slate-800'}`}>
                                {item.name}
                              </p>
                              {item.notes && (
                                <p className="text-[10px] text-red-500 font-semibold mt-0.5 italic">Obs: {item.notes}</p>
                              )}
                            </div>
                          </div>
                          <span className={`font-semibold ${isDelivered ? 'text-slate-400' : 'text-slate-500'}`}>
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
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
                          onClick={() => {
                            setCancellingOrder(order);
                            setCancelReason('');
                          }}
                          className="bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 text-slate-600 font-semibold text-xs py-2.5 rounded-xl transition-all"
                        >
                          Cancelar Pedido
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
                      <>
                        <button
                          onClick={() => {
                            setCancellingOrder(order);
                            setCancelReason('');
                          }}
                          className="bg-slate-50 hover:bg-red-50 hover:text-red-600 border border-slate-200 text-slate-600 font-semibold text-xs py-2.5 rounded-xl transition-all"
                        >
                          Cancelar Pedido
                        </button>
                        {(selectedItems[order.id] || []).length > 0 ? (
                          <button
                            onClick={() => handleDeliverSelectedItems(order)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all animate-pulse"
                          >
                            <Check className="w-4 h-4" />
                            Entregar Selecionados
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'delivered')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all"
                          >
                            <Check className="w-4 h-4" />
                            Entregar Tudo
                          </button>
                        )}
                      </>
                    ) : order.status === 'cancelled' ? (
                      <div className="col-span-2 text-center text-red-500 text-xs font-semibold py-2">
                        Pedido cancelado!
                      </div>
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

      {/* Modal de Cancelamento */}
      {cancellingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-100 animate-fade-in space-y-4">
            <div>
              <h3 className="font-display font-extrabold text-lg text-slate-800">Cancelar Pedido</h3>
              <p className="text-slate-500 text-xs mt-1">
                Você está prestes a cancelar o pedido da <strong>Mesa {cancellingOrder.tableNumber}</strong> feito por <strong>{cancellingOrder.customerName}</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Motivo do Cancelamento <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Prato indisponível / Cliente desistiu..."
                className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 h-24 resize-none transition-all"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancellingOrder(null);
                  setCancelReason('');
                }}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs py-2.5 rounded-xl transition-all"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-sm hover:shadow transition-all"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Container de Impressão Térmica (Oculto na tela, visível na impressão) */}
      <div id="thermal-print-coupon" className="hidden print:block text-black bg-white">
        {printingOrder && (
          <div className="flex flex-col font-mono text-xs space-y-1" style={{ width: '80mm', maxWidth: '100%', margin: '0 auto', color: '#000', backgroundColor: '#fff' }}>
            {/* Restaurant Name */}
            <div className="text-center font-bold text-sm uppercase">
              {restaurant?.name || 'Restaurante'}
            </div>
            
            <div className="text-center">--------------------------------</div>
            
            {/* Table & Order Title */}
            <div className="text-center font-extrabold text-base uppercase">
              MESA {printingOrder.tableNumber}
            </div>
            
            <div className="text-center">--------------------------------</div>
            
            {/* Order Info */}
            <div className="space-y-0.5 text-[10px]">
              <div><strong>PEDIDO:</strong> #{printingOrder.id.substring(0, 8).toUpperCase()}</div>
              <div><strong>CLIENTE:</strong> {printingOrder.customerName.toUpperCase()}</div>
              <div><strong>DATA/HORA:</strong> {new Date(printingOrder.createdAt).toLocaleString('pt-BR')}</div>
            </div>
            
            <div className="text-center">--------------------------------</div>
            
            {/* Items Section Title */}
            <div className="font-bold text-center uppercase tracking-wider">ITENS PARA PREPARO</div>
            
            <div className="text-center">--------------------------------</div>
            
            {/* Items List */}
            <div className="space-y-2">
              {printingOrder.items.map((item, idx) => {
                const product = products.find(p => p.id === item.productId);
                const prepTime = product?.prepareTime;
                
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-xs flex justify-between">
                      <span>{item.quantity}x {item.name.toUpperCase()}</span>
                    </div>
                    
                    {item.notes && (
                      <div className="pl-4 font-bold text-[10px] italic">
                        * OBS: {item.notes.toUpperCase()}
                      </div>
                    )}
                    
                    {prepTime && prepTime > 0 ? (
                      <div className="pl-4 text-[9px]">
                        * TEMPO DE PREPARO: {prepTime} MIN
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            
            <div className="text-center">--------------------------------</div>
            
            {/* Summary info */}
            <div className="flex justify-between font-bold text-xs pt-0.5">
              <span>TOTAL DE ITENS:</span>
              <span>{printingOrder.items.reduce((acc, item) => acc + item.quantity, 0)}</span>
            </div>
            
            <div className="text-center">--------------------------------</div>
            <div className="text-center text-[9px] text-gray-500 uppercase mt-1">
              Controle de Produção / Cozinha
            </div>
            <div className="h-12"></div> {/* blank space to help tear the paper */}
          </div>
        )}
      </div>

      {/* Estilos para Impressão */}
      <style>{`
        @media print {
          /* Esconder toda a aplicação */
          body * {
            visibility: hidden !important;
          }
          /* Mostrar apenas o container de impressão */
          #thermal-print-coupon, #thermal-print-coupon * {
            visibility: visible !important;
          }
          #thermal-print-coupon {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            display: block !important;
          }
          @page {
            margin: 0 !important;
            size: auto !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #fff !important;
          }
        }
      `}</style>

    </div>
  );
}
