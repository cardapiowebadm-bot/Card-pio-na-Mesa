import React, { useState } from 'react';
import { useCardapio } from '../contexts/CardapioContext';
import { Search, Sparkles, Plus, Clock, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CardapioHome() {
  const { products, categories, addToCart } = useCardapio();
  const [selectedCatId, setSelectedCatId] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');

  // Extract featured products
  const featuredProducts = products.filter(p => p.featured);

  // Filtered products list
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCatId === 'all' || p.categoryId === selectedCatId;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.description?.toLowerCase().includes(search.toLowerCase());
                          
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (product: any) => {
    if (product.available === false) {
      toast.error('Este produto não está disponível no momento.');
      return;
    }
    addToCart(product);
    toast.success(`${product.name} adicionado ao carrinho!`, {
      icon: '🛒',
      duration: 1500
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4.5 w-4.5 text-slate-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="O que deseja saborear hoje?"
          className="block w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-sm"
        />
      </div>

      {/* Featured Products Carousel / Highlight section */}
      {featuredProducts.length > 0 && !search && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Destaques da Casa
          </h3>
          
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {featuredProducts.map((prod) => (
              <div 
                key={prod.id} 
                className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm shrink-0 w-64 snap-start flex flex-col justify-between"
              >
                <div className="h-32 bg-slate-100 relative">
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {prod.onSale && (
                    <span className="absolute top-2.5 right-2.5 bg-emerald-600 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <TrendingDown className="w-2.5 h-2.5" />
                      Oferta
                    </span>
                  )}
                  {prod.available === false && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-600 text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
                        Indisponível
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm truncate">{prod.name}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{prod.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      {prod.onSale && prod.salePrice ? (
                        <span className="text-sm font-extrabold text-rose-600">R$ {prod.salePrice.toFixed(2)}</span>
                      ) : (
                        <span className="text-sm font-extrabold text-slate-800">R$ {prod.price.toFixed(2)}</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleAddToCart(prod)}
                      disabled={prod.available === false}
                      className={`p-1.5 rounded-xl transition-all shadow-sm ${
                        prod.available === false 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Horizontal Rail Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCatId('all')}
          className={`px-4 py-2 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
            selectedCatId === 'all' 
              ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/10' 
              : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-100'
          }`}
        >
          Ver Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
              selectedCatId === cat.id 
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/10' 
                : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-100'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products Listing */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Opções Disponíveis
        </h3>

        {filteredProducts.length === 0 ? (
          <p className="text-slate-400 text-xs py-8 text-center">Nenhum produto disponível nesta categoria.</p>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((prod) => (
              <div 
                key={prod.id} 
                className="bg-white border border-slate-100 p-3 rounded-2xl flex gap-3 shadow-sm items-center hover:scale-[1.005] transition-all"
              >
                {/* Product Thumbnail */}
                <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 relative">
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {prod.onSale && (
                    <span className="absolute top-1 left-1 bg-emerald-600 text-white font-bold text-[8px] px-1 rounded-md">
                      %
                    </span>
                  )}
                  {prod.available === false && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-1">
                      <span className="bg-red-600 text-white font-bold text-[7px] uppercase tracking-wider px-1 py-0.5 rounded text-center">
                        Indisponível
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between h-20">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm truncate">{prod.name}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{prod.description || 'Sem descrição.'}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      {prod.onSale && prod.salePrice ? (
                        <>
                          <span className="text-sm font-extrabold text-rose-600">R$ {prod.salePrice.toFixed(2)}</span>
                          <span className="text-[10px] text-slate-400 line-through">R$ {prod.price.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-sm font-extrabold text-slate-800">R$ {prod.price.toFixed(2)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {prod.prepareTime}m
                      </span>
                      <button
                        onClick={() => handleAddToCart(prod)}
                        disabled={prod.available === false}
                        className={`p-1.5 rounded-xl transition-all ${
                          prod.available === false
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
