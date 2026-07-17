import React, { useState } from 'react';
import { useCardapio } from '../contexts/CardapioContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  FileText, 
  Utensils,
  ChevronLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CardapioCart() {
  const { cart, updateCartQuantity, removeFromCart, checkoutCart, restaurant } = useCardapio();
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();

  // Notes map for individual products
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Totals calculations
  const subtotal = cart.reduce((acc, item) => {
    const priceNum = Number(item.price) || 0;
    const qtyNum = Number(item.quantity) || 0;
    return acc + (priceNum * qtyNum);
  }, 0);

  const serviceTax = restaurant?.serviceTaxEnabled !== false ? subtotal * 0.10 : 0;
  const total = subtotal + serviceTax;

  const handleUpdateNotes = (productId: string, val: string) => {
    setItemNotes(prev => ({ ...prev, [productId]: val }));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      // Map notes to cart items for the context
      const cartWithNotes = cart.map(item => ({
        ...item,
        notes: itemNotes[item.productId] || ''
      }));

      await checkoutCart(cartWithNotes);
      toast.success('Pedido enviado com sucesso para a cozinha!', {
        icon: '🍳',
        duration: 3000
      });
      navigate(`/menu/${restaurantId}/orders`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao processar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center text-center p-6 space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-slate-800">Seu carrinho está vazio</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-[240px] mx-auto">Navegue pelas delícias do cardápio e adicione seus pratos prediletos!</p>
        </div>
        <Link
          to={`/menu/${restaurantId}/home`}
          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar ao Cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <ShoppingCart className="w-5 h-5 text-rose-500" />
        <h2 className="font-display font-bold text-lg text-slate-800">Seu Carrinho</h2>
      </div>

      {/* Cart Items list */}
      <div className="space-y-4">
        {cart.map((item) => {
          const itemPrice = Number(item.price) || 0;
          const qty = Number(item.quantity) || 1;
          return (
            <div key={item.productId} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-3.5">
              <div className="flex gap-3">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
                
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 truncate">{item.name}</h4>
                    <p className="text-xs text-slate-500">R$ {itemPrice.toFixed(2)}</p>
                  </div>

                  {/* Quantity and Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                      <button
                        onClick={() => updateCartQuantity(item.productId, qty - 1)}
                        className="p-1 text-slate-500 hover:text-slate-800 transition-all"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold px-3 text-slate-700">{qty}</span>
                      <button
                        onClick={() => updateCartQuantity(item.productId, qty + 1)}
                        className="p-1 text-slate-500 hover:text-slate-800 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-50 transition-all"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Individual Item Observation Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={itemNotes[item.productId] || ''}
                  onChange={(e) => handleUpdateNotes(item.productId, e.target.value)}
                  placeholder="Alguma observação? (ex: sem cebola, ponto da carne)"
                  className="block w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bill summary breakdown */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">
          Resumo da Conta
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          {restaurant?.serviceTaxEnabled !== false && (
            <div className="flex justify-between text-slate-500">
              <span>Taxa de Serviço sugerida (10%)</span>
              <span>R$ {serviceTax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-slate-800 pt-2 border-t border-slate-50">
            <span>Total Estimado</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Confirm and send button */}
      <button
        onClick={handlePlaceOrder}
        disabled={loading}
        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-lg transition-all disabled:opacity-50"
      >
        <span>Enviar Pedido para Cozinha</span>
        <ArrowRight className="w-4 h-4" />
      </button>

    </div>
  );
}
