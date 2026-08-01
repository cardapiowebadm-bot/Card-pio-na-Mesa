import React, { useEffect, useState } from 'react';
import { useCardapio } from '../contexts/CardapioContext';
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
  ReceiptText, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  QrCode, 
  ArrowLeft,
  ChevronRight,
  Smile,
  DollarSign,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CardapioOrders() {
  const { activeSession, restaurant, requestPayment } = useCardapio();
  const [orders, setOrders] = useState<Order[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Rating state
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [ratingSubmitting, setRatingSubmitting] = useState<boolean>(false);
  const [ratingDismissed, setRatingDismissed] = useState<boolean>(false);

  const handleSubmitRating = async () => {
    if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
      toast.error('Por favor, selecione de 1 a 5 estrelas.');
      return;
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    if (!apiBase) {
      toast.error('Erro de configuração: VITE_API_BASE_URL não configurada.');
      return;
    }
    if (!restaurant?.id || !activeSession?.id) return;

    setRatingSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/api/waiters/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableSessionId: activeSession.id,
          rating: selectedRating,
          comment: ratingComment.trim()
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao enviar avaliação.');
      }
      toast.success('Obrigado pela sua avaliação!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao enviar avaliação.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Load orders for this session in real-time
  useEffect(() => {
    if (!activeSession?.id) return;

    const q = query(
      collection(db, 'orders'),
      where('tableSessionId', '==', activeSession.id)
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
  }, [activeSession?.id]);

  // Compute session totals
  const subtotal = orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.subtotal, 0);

  let serviceTax = 0;
  if (restaurant?.serviceTaxEnabled !== false) {
    const taxType = restaurant?.serviceTaxType || 'percentage';
    const taxVal = restaurant?.serviceTaxValue !== undefined ? restaurant.serviceTaxValue : 10;
    if (taxType === 'fixed') {
      serviceTax = taxVal;
    } else {
      serviceTax = (taxVal / 100) * subtotal;
    }
  }

  let couvert = 0;
  if (restaurant?.couvertEnabled) {
    const couvertType = restaurant?.couvertType || 'fixed';
    const couvertVal = restaurant?.couvertValue !== undefined ? restaurant.couvertValue : 0;
    if (couvertType === 'fixed') {
      couvert = couvertVal;
    } else {
      couvert = (couvertVal / 100) * subtotal;
    }
  }

  const total = subtotal + serviceTax + couvert;

  const handleRequestCheckout = async (method: 'pix' | 'card' | 'cash') => {
    if (!activeSession) return;
    try {
      if (requestPayment) {
        await requestPayment(method);
      } else {
        await updateDoc(doc(db, 'tableSessions', activeSession.id), {
          paymentMethod: method,
          paymentStatus: 'pending'
        });
      }
      const label = method === 'pix' ? 'PIX' : method === 'card' ? 'CARTÃO' : 'DINHEIRO';
      toast.success(`Fechamento solicitado via ${label}! Aguarde a confirmação de um atendente.`);
      setShowCheckoutModal(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao solicitar fechamento de conta.');
    }
  };

  if (activeSession?.paymentStatus === 'paid') {
    const waiterIdForRating = activeSession.ratedWaiterId || activeSession.waiterId;
    const waiterNameForRating = activeSession.ratedWaiterName || activeSession.waiterName || 'Atendente';
    const canRate = restaurant?.enableWaiterRating && waiterIdForRating && !activeSession.ratingSubmitted && !ratingDismissed;

    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center text-center p-6 space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
          <Smile className="w-10 h-10" />
        </div>
        <div>
          <h3 className="font-display font-bold text-xl text-slate-800">Pagamento Confirmado!</h3>
          <p className="text-slate-500 text-xs mt-1.5 max-w-[260px] mx-auto">Muito obrigado pela visita. Sua comanda foi fechada e a mesa liberada. Volte sempre!</p>
        </div>

        {/* Rating Section */}
        {canRate && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm max-w-sm w-full mt-4 text-center space-y-3 animate-fade-in">
            <div className="flex items-center justify-center gap-1.5 text-amber-500 mb-1">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Avalie seu atendimento</span>
            </div>
            <p className="text-xs text-slate-500">
              Como foi o atendimento com <strong className="text-slate-800">{waiterNameForRating}</strong>?
            </p>

            {/* Stars */}
            <div className="flex justify-center items-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 ${
                      (hoverRating || selectedRating) >= star
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Optional Comment */}
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value.slice(0, 500))}
              placeholder="Deixe um comentário opcional..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none"
            />
            <p className="text-[10px] text-slate-400 text-right">{ratingComment.length}/500</p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRatingDismissed(true)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-xl transition-all"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={handleSubmitRating}
                disabled={ratingSubmitting || !selectedRating}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
              >
                {ratingSubmitting ? 'Enviando...' : 'Enviar avaliação'}
              </button>
            </div>
          </div>
        )}

        {activeSession.ratingSubmitted && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-2xl p-4 max-w-sm w-full mt-4 text-center text-xs font-semibold flex items-center justify-center gap-2">
            <Star className="w-4 h-4 fill-emerald-600 text-emerald-600" />
            <span>Obrigado! Sua avaliação foi registrada com sucesso.</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <ReceiptText className="w-5 h-5 text-rose-500" />
        <h2 className="font-display font-bold text-lg text-slate-800">Minha Conta</h2>
      </div>

      {/* Orders tracking */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Pedidos Enviados</h3>
        
        {orders.length === 0 ? (
          <div className="bg-white border border-slate-100 p-8 rounded-2xl text-center shadow-sm">
            <p className="text-slate-400 text-xs">Você não realizou nenhum pedido nessa mesa ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const timeStr = new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={o.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-3">
                  <div className="flex justify-between items-start border-b border-slate-50 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Horário: {timeStr}</span>
                      <h4 className="font-bold text-xs text-slate-500 mt-0.5">Pedido #{o.id.substring(0, 5).toUpperCase()}</h4>
                    </div>

                    <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      o.status === 'pending' 
                        ? 'bg-amber-50 text-amber-600 animate-pulse' 
                        : o.status === 'preparing' 
                          ? 'bg-blue-50 text-blue-600' 
                          : o.status === 'cancelled'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {o.status === 'pending' ? 'Pendente' : o.status === 'preparing' ? 'Em Preparo' : o.status === 'cancelled' ? 'Cancelado' : 'Entregue'}
                    </span>
                  </div>

                  {/* Cancellation Reason Context */}
                  {o.status === 'cancelled' && (
                    <div className="bg-red-50/60 border border-red-100/40 p-2.5 rounded-xl text-[11px] text-red-700 font-medium space-y-1">
                      <p><span className="font-bold">Motivo do cancelamento:</span> {o.cancelReason}</p>
                      {o.cancelledAt && (
                        <p className="text-[10px] text-slate-400 font-normal">
                          Cancelado em: {new Date(o.cancelledAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div className={`space-y-2 text-xs ${o.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {o.items.map((item, idx) => {
                      const isItemDelivered = item.status === 'delivered';
                      return (
                        <div key={idx} className="flex justify-between items-start gap-2">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-slate-800">{item.quantity}x {item.name}</span>
                              {o.status === 'preparing' && (
                                <span className={`text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                  isItemDelivered 
                                    ? 'bg-emerald-50 text-emerald-600' 
                                    : 'bg-blue-50 text-blue-600 animate-pulse'
                                }`}>
                                  {isItemDelivered ? 'Entregue' : 'Em Preparo'}
                                </span>
                              )}
                            </span>
                            {item.notes && (
                              <span className="text-[10px] text-red-500 font-semibold mt-0.5 italic">Obs: {item.notes}</span>
                            )}
                          </div>
                          <span className="font-semibold text-slate-500 shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-xs font-bold text-slate-800 pt-1.5 border-t border-slate-50">
                    <span>Subtotal</span>
                    <span>R$ {o.total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bill summary and checkout request */}
      {orders.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">Consumo Consolidado</h4>
            
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Total dos Pratos</span>
                <span className="font-semibold">R$ {subtotal.toFixed(2)}</span>
              </div>
              {restaurant?.serviceTaxEnabled !== false && (
                <div className="flex justify-between">
                  <span>
                    Taxa de Serviço ({
                      (restaurant?.serviceTaxType || 'percentage') === 'percentage'
                        ? `${restaurant?.serviceTaxValue !== undefined ? restaurant.serviceTaxValue : 10}%`
                        : `R$ ${(restaurant?.serviceTaxValue !== undefined ? restaurant.serviceTaxValue : 10).toFixed(2)}`
                    })
                  </span>
                  <span className="font-semibold">R$ {serviceTax.toFixed(2)}</span>
                </div>
              )}
              {restaurant?.couvertEnabled && (
                <div className="flex justify-between">
                  <span>
                    Couvert Artístico ({
                      (restaurant?.couvertType || 'fixed') === 'percentage'
                        ? `${restaurant?.couvertValue !== undefined ? restaurant.couvertValue : 0}%`
                        : `R$ ${(restaurant?.couvertValue !== undefined ? restaurant.couvertValue : 0).toFixed(2)}`
                    })
                  </span>
                  <span className="font-semibold">R$ {couvert.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-800 pt-2 border-t border-slate-50">
                <span>TOTAL ACUMULADO</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Waiting approval badge if already requested */}
            {activeSession?.paymentMethod ? (
              <div className="bg-amber-50 text-amber-800 p-3.5 rounded-xl text-center text-xs font-bold border border-amber-100/60 animate-pulse">
                Aguardando confirmação de pagamento do atendente via {activeSession.paymentMethod.toUpperCase()}
              </div>
            ) : (
              <button
                onClick={() => setShowCheckoutModal(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl shadow transition-all flex justify-center items-center gap-1.5"
              >
                <QrCode className="w-4 h-4" />
                Fechar Conta / Pagar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal Selection */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCheckoutModal(false)} />
          
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl z-10 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-display font-extrabold text-lg text-slate-800">Como deseja pagar?</h3>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 p-1 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-500 text-xs mb-4">Selecione o método de pagamento preferido. O garçom irá até a sua mesa para concluir:</p>

            <div className="space-y-2">
              <button
                onClick={() => handleRequestCheckout('pix')}
                className="w-full text-left p-4 bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 rounded-2xl flex items-center justify-between transition-all group"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-800 group-hover:text-rose-700">Pagar com PIX</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Gerar chave Pix ou QR Code na mesa</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500" />
              </button>

              <button
                onClick={() => handleRequestCheckout('card')}
                className="w-full text-left p-4 bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 rounded-2xl flex items-center justify-between transition-all group"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-800 group-hover:text-rose-700">Pagar com Cartão (Crédito/Débito)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Trazer a maquininha até a mesa</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500" />
              </button>

              <button
                onClick={() => handleRequestCheckout('cash')}
                className="w-full text-left p-4 bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-100 rounded-2xl flex items-center justify-between transition-all group"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-800 group-hover:text-rose-700">Pagar com Dinheiro</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Pagar em dinheiro diretamente ao atendente</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
