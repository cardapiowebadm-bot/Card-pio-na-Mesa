import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc,
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product, Category } from '../types';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Sparkles, 
  Image as ImageIcon, 
  Check, 
  X, 
  Languages, 
  HelpCircle,
  TrendingDown,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminProducts() {
  const { userProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [available, setAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  const [prepareTime, setPrepareTime] = useState('15');

  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [aiIngredients, setAiIngredients] = useState('');

  useEffect(() => {
    if (!userProfile?.restaurantId) return;

    // Listen to products
    const qProd = query(collection(db, 'products'), where('restaurantId', '==', userProfile.restaurantId));
    const unsubProd = onSnapshot(qProd, (snap) => {
      const items: Product[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as Product));
      setProducts(items);
      setLoading(false);
    });

    // Listen to categories
    const qCat = query(collection(db, 'categories'), where('restaurantId', '==', userProfile.restaurantId));
    const unsubCat = onSnapshot(qCat, (snap) => {
      const items: Category[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as Category));
      items.sort((a, b) => a.index - b.index);
      setCategories(items);
    });

    return () => {
      unsubProd();
      unsubCat();
    };
  }, [userProfile?.restaurantId]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPrice('');
    setImageUrl('');
    setCategoryId(categories[0]?.id || '');
    setAvailable(true);
    setFeatured(false);
    setOnSale(false);
    setSalePrice('');
    setPrepareTime('15');
    setShowForm(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setDescription(prod.description);
    setPrice(prod.price.toString());
    setImageUrl(prod.imageUrl);
    setCategoryId(prod.categoryId);
    setAvailable(prod.available);
    setFeatured(prod.featured);
    setOnSale(prod.onSale);
    setSalePrice(prod.salePrice?.toString() || '');
    setPrepareTime(prod.prepareTime.toString());
    setShowForm(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !categoryId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const payload = {
      name,
      description,
      price: parseFloat(price),
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60', // high quality placeholder
      categoryId,
      available,
      featured,
      onSale,
      salePrice: salePrice ? parseFloat(salePrice) : undefined,
      prepareTime: parseInt(prepareTime) || 15,
      restaurantId: userProfile?.restaurantId,
      createdAt: new Date().toISOString()
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), payload);
        toast.success('Produto atualizado!');
      } else {
        const docRef = doc(collection(db, 'products'));
        await setDoc(docRef, { ...payload, id: docRef.id });
        toast.success('Produto criado com sucesso!');
      }
      setShowForm(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar produto');
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${prod.name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'products', prod.id));
      toast.success('Produto excluído');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao excluir produto');
    }
  };

  // AI Gemini Tools Integration (proxied server-side)
  const handleAiGenerateDescription = async () => {
    if (!name) {
      toast.error('Por favor, informe o nome do produto primeiro!');
      return;
    }
    setAiLoading(true);
    try {
      const selectedCat = categories.find(c => c.id === categoryId)?.name || '';
      const response = await fetch('/api/gemini/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category: selectedCat, details: description }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setDescription(data.result);
      toast.success('Descrição gourmet criada!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro de comunicação com a IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiSuggestNames = async () => {
    if (!aiIngredients) {
      toast.error('Informe os ingredientes principais para sugerirmos nomes!');
      return;
    }
    setAiLoading(true);
    try {
      const selectedCat = categories.find(c => c.id === categoryId)?.name || '';
      const response = await fetch('/api/gemini/suggest-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: aiIngredients, category: selectedCat }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setAiSuggestions(data.result);
      toast.success('Sugestões geradas abaixo!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao consultar IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiCorrectText = async () => {
    if (!description && !name) {
      toast.error('Preencha o nome ou a descrição para corrigirmos.');
      return;
    }
    setAiLoading(true);
    try {
      const textToCorrect = description || name;
      const response = await fetch('/api/gemini/correct-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToCorrect }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (description) {
        setDescription(data.result);
      } else {
        setName(data.result);
      }
      toast.success('Texto corrigido e polido!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro de IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiTranslate = async (lang: string) => {
    if (!name) {
      toast.error('Informe ao menos o nome para tradução.');
      return;
    }
    setAiLoading(true);
    try {
      const response = await fetch('/api/gemini/translate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, targetLanguage: lang }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setName(data.name);
      setDescription(data.description);
      toast.success(`Traduzido com sucesso para o ${lang}!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro de tradução por IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiSuggestPromos = async () => {
    if (products.length === 0) {
      toast.error('Você precisa ter produtos cadastrados para sugerir combos.');
      return;
    }
    setAiLoading(true);
    try {
      const prodsPayload = products.map(p => ({
        name: p.name,
        price: p.price,
        category: categories.find(c => c.id === p.categoryId)?.name || ''
      }));

      const response = await fetch('/api/gemini/suggest-promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: prodsPayload }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setAiSuggestions(data.result);
      toast.success('Ideias de combos criadas!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro de IA.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-3xl text-slate-800 tracking-tight">Gestão de Produtos</h2>
          <p className="text-slate-500 text-sm mt-1">Crie, edite e organize seu menu com apoio da Inteligência Artificial.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Ideas button */}
          <button
            onClick={handleAiSuggestPromos}
            disabled={aiLoading}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-rose-500" />}
            Sugerir Combos IA
          </button>

          <button
            onClick={handleOpenCreate}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Produto
          </button>
        </div>
      </div>

      {/* AI Output Section if exists */}
      {aiSuggestions && (
        <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 relative overflow-hidden shadow-md animate-fade-in">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl" />
          <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
              Sua Consultoria de IA (Gemini 3.5)
            </h3>
            <button
              onClick={() => setAiSuggestions('')}
              className="text-slate-500 hover:text-slate-300 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
            {aiSuggestions}
          </div>
        </div>
      )}

      {/* Main product management layout (Form Modal vs Grid) */}
      {showForm ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h3 className="font-display font-bold text-lg text-slate-800">
              {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left/Center Column: Fields */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Prato *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Hambúrguer Clássico"
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Categoria *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  >
                    <option value="">Selecione...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição Detalhada</label>
                  
                  {/* AI Copywriter buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAiGenerateDescription}
                      disabled={aiLoading}
                      className="text-rose-600 hover:text-rose-700 font-semibold text-[10px] flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg"
                      title="Gera descrição chamativa baseado no nome"
                    >
                      <Sparkles className="w-3 h-3 text-rose-500" />
                      Criar Cópia IA
                    </button>
                    <button
                      type="button"
                      onClick={handleAiCorrectText}
                      disabled={aiLoading}
                      className="text-slate-600 hover:text-slate-800 font-semibold text-[10px] flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg"
                      title="Corrige gramática e tom de voz"
                    >
                      Polir Texto IA
                    </button>
                  </div>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Suculento blend de 150g, queijo cheddar derretido, maionese artesanal da casa servido no pão brioche selado na manteiga."
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 h-28 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="29.90"
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Preparo (minutos)</label>
                  <input
                    type="number"
                    value={prepareTime}
                    onChange={(e) => setPrepareTime(e.target.value)}
                    placeholder="15"
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Preço Promo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="24.90"
                    disabled={!onSale}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <input
                    id="onSale"
                    type="checkbox"
                    checked={onSale}
                    onChange={(e) => setOnSale(e.target.checked)}
                    className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-slate-300 rounded-lg"
                  />
                  <label htmlFor="onSale" className="ml-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Em Promoção
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">URL da Imagem do Prato</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ImageIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 bg-[#fafafa] border border-slate-100 p-4 rounded-2xl">
                <div className="flex items-center">
                  <input
                    id="available"
                    type="checkbox"
                    checked={available}
                    onChange={(e) => setAvailable(e.target.checked)}
                    className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-slate-300 rounded-lg"
                  />
                  <label htmlFor="available" className="ml-2 block text-sm font-semibold text-slate-700">
                    Disponível para venda
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="featured"
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-slate-300 rounded-lg"
                  />
                  <label htmlFor="featured" className="ml-2 block text-sm font-semibold text-slate-700">
                    Prato Destaque (Topo)
                  </label>
                </div>
              </div>

            </div>

            {/* Right Column: AI Suggestions and Translate tools */}
            <div className="lg:col-span-1 bg-slate-50 border border-slate-200/50 rounded-3xl p-5 space-y-6">
              
              {/* Translate module */}
              <div>
                <h4 className="font-display font-bold text-sm text-slate-800 flex items-center gap-1.5 mb-3">
                  <Languages className="w-4 h-4 text-rose-500 shrink-0" />
                  Tradução Rápida IA
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAiTranslate('Inglês')}
                    className="bg-white hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    🇬🇧 Para o Inglês
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAiTranslate('Espanhol')}
                    className="bg-white hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    🇪🇸 Para o Espanhol
                  </button>
                </div>
              </div>

              {/* Name suggester */}
              <div className="border-t border-slate-200/60 pt-4 space-y-3">
                <h4 className="font-display font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  Sugerir Nomes IA
                </h4>
                <p className="text-[10px] text-slate-400">Insira ingredientes chaves (separados por vírgula) para sugerir nomes:</p>
                <input
                  type="text"
                  value={aiIngredients}
                  onChange={(e) => setAiIngredients(e.target.value)}
                  placeholder="Mignon, funghi, creme de leite"
                  className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={handleAiSuggestNames}
                  disabled={aiLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] py-2 rounded-xl flex justify-center items-center gap-1 transition-all"
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-rose-500" />}
                  Gerar 5 Nomes Sugeridos
                </button>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="lg:col-span-3 border-t border-slate-100 pt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all"
              >
                Salvar Produto
              </button>
            </div>

          </form>
        </div>
      ) : (
        /* Products Grid listing */
        <div>
          {products.length === 0 ? (
            <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center shadow-sm">
              <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-800 mb-1">Nenhum produto cadastrado</h3>
              <p className="text-slate-500 text-sm">Cadastre seus pratos clicando no botão "Cadastrar Produto" acima.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((prod) => {
                const categoryName = categories.find(c => c.id === prod.categoryId)?.name || 'Geral';
                return (
                  <div key={prod.id} className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow transition-all flex flex-col justify-between">
                    <div className="relative h-44 bg-slate-100">
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Badge overlays */}
                      <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/60 text-white">
                          {categoryName}
                        </span>
                        {!prod.available && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-600 text-white">
                            Indisponível
                          </span>
                        )}
                        {prod.featured && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-white">
                            Destaque
                          </span>
                        )}
                        {prod.onSale && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" />
                            Oferta
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">{prod.name}</h4>
                        <p className="text-slate-500 text-xs mt-1 leading-relaxed line-clamp-2">{prod.description || 'Sem descrição cadastrada.'}</p>
                      </div>

                      {/* Switch for Availability */}
                      <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-100/80">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Disponibilidade
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${prod.available !== false ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {prod.available !== false ? 'Disponível' : 'Indisponível'}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const currentStatus = prod.available !== false;
                                await updateDoc(doc(db, 'products', prod.id), { available: !currentStatus });
                                toast.success(!currentStatus ? 'Produto disponível para venda!' : 'Produto indisponível para venda!');
                              } catch (e) {
                                console.error(e);
                                toast.error('Erro ao atualizar disponibilidade');
                              }
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              prod.available !== false ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                prod.available !== false ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div>
                          {prod.onSale && prod.salePrice ? (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-bold text-rose-600">R$ {prod.salePrice.toFixed(2)}</span>
                              <span className="text-[11px] text-slate-400 line-through">R$ {prod.price.toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-slate-800">R$ {prod.price.toFixed(2)}</span>
                          )}
                          <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Preparo: {prod.prepareTime} min</p>
                        </div>

                        {/* Card controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-600 p-2 rounded-xl transition-all"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
