import React, { useState } from 'react';
import { useCardapio } from '../contexts/CardapioContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ChefHat, ArrowRight, User, Phone, Clipboard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getThemeShades } from '../services/theme';

export default function CardapioWelcome() {
  const { restaurant, startSession, activeSession, loading: globalLoading, error: globalError } = useCardapio();
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();

  const [tableNum, setTableNum] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);

  // If already has activeSession loaded, redirect right away
  React.useEffect(() => {
    if (activeSession) {
      navigate(`/menu/${restaurantId}/home`);
    }
  }, [activeSession, restaurantId]);

  // Log error if restaurant cannot be found
  React.useEffect(() => {
    if (globalError) {
      console.error(`[CardapioWelcome] Erro ao carregar estabelecimento com ID: ${restaurantId}. Detalhes:`, globalError);
    }
  }, [globalError, restaurantId]);

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
    const tableInt = parseInt(tableNum);
    if (!tableInt || isNaN(tableInt)) {
      toast.error('Por favor, informe o número da mesa.');
      return;
    }
    if (!name.trim()) {
      toast.error('Por favor, preencha o seu nome.');
      return;
    }
    if (phone.length < 10) {
      toast.error('Informe um telefone válido com DDD.');
      return;
    }

    setLoading(true);
    try {
      await startSession(tableInt, name, phone, cpf || undefined);
      toast.success(`Bem-vindo, ${name}!`);
      navigate(`/menu/${restaurantId}/home`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao abrir comanda da mesa.');
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
            Por favor, informe seus dados e o número da mesa para acessar o cardápio digital.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white border border-slate-100 w-full max-w-sm rounded-3xl p-6 shadow-sm">
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
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Seu Nome *</label>
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
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Celular / WhatsApp *</label>
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
              <span>CPF na Nota?</span>
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
                placeholder="Apenas números"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Acessar Cardápio</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>
      </div>

    </div>
  );
}
