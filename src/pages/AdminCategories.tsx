import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Category } from '../types';
import { Plus, Edit, Trash2, X, MoveUp, MoveDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCategories() {
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!userProfile?.restaurantId) return;

    const q = query(collection(db, 'categories'), where('restaurantId', '==', userProfile.restaurantId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const items: Category[] = [];
      snap.forEach(d => items.push({ ...d.data(), id: d.id } as Category));
      items.sort((a, b) => a.index - b.index);
      setCategories(items);
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile?.restaurantId]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setShowForm(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setShowForm(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), { name });
        toast.success('Categoria editada');
      } else {
        const nextIndex = categories.length;
        const docRef = doc(collection(db, 'categories'));
        await setDoc(docRef, {
          id: docRef.id,
          name,
          index: nextIndex,
          restaurantId: userProfile?.restaurantId,
          createdAt: new Date().toISOString()
        });
        toast.success('Categoria criada!');
      }
      setShowForm(false);
      setName('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar categoria');
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Deseja excluir a categoria "${cat.name}"? Isso não removerá os produtos, mas eles perderão o vínculo.`)) return;

    try {
      await deleteDoc(doc(db, 'categories', cat.id));
      toast.success('Categoria excluída');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir');
    }
  };

  // Reorder index helper
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;

    try {
      const batch = writeBatch(db);
      const currentCat = categories[index];
      const targetCat = categories[targetIdx];

      batch.update(doc(db, 'categories', currentCat.id), { index: targetIdx });
      batch.update(doc(db, 'categories', targetCat.id), { index: index });

      await batch.commit();
      toast.success('Ordenação atualizada');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao reordenar');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-3xl text-slate-800 tracking-tight">Categorias do Cardápio</h2>
          <p className="text-slate-500 text-sm mt-1">Defina as seções do seu menu (ex: Entradas, Burgers, Bebidas) e ajuste a ordem.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm hover:shadow flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h3 className="font-display font-semibold text-sm text-slate-800">
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSaveCategory} className="flex gap-2 items-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Sobremesas Especiais"
              className="flex-1 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
            <button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              Salvar
            </button>
          </form>
        </div>
      )}

      {/* Listing */}
      {categories.length === 0 ? (
        <div className="bg-white border border-slate-100 p-12 rounded-3xl text-center shadow-sm">
          <p className="text-slate-400 text-sm">Nenhuma categoria criada.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {categories.map((cat, index) => (
              <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400 w-6">#{index + 1}</span>
                  <span className="font-semibold text-sm text-slate-700">{cat.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Reorder actions */}
                  <button
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                    title="Mover para Cima"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === categories.length - 1}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                    title="Mover para Baixo"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>

                  {/* Actions */}
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all ml-4"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
