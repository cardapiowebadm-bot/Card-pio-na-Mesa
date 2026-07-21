import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { updateEmail, updatePassword } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { ChefHat, Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WaiterSetupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const waiterId = searchParams.get('waiterId');

  const [waiterData, setWaiterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!waiterId) {
      toast.error('ID do garçom não informado.');
      navigate('/login');
      return;
    }

    const fetchWaiter = async () => {
      try {
        const docRef = doc(db, 'waiters', waiterId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          toast.error('Garçom não encontrado.');
          navigate('/login');
          return;
        }

        const data = snap.data();
        if (!data.isFirstAccess) {
          toast.error('Este garçom já configurou sua conta definitiva.');
          navigate('/login');
          return;
        }

        setWaiterData(data);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao buscar dados do garçom.');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchWaiter();
  }, [waiterId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha definitiva deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error('Sessão inválida. Por favor, realize login novamente.');
        navigate('/login');
        return;
      }

      // 1. Update Email and Password in the existing Firebase Auth User (preserving UID)
      await updateEmail(user, email);
      await updatePassword(user, password);

      // 2. Update existing user profile in users collection with the new definitive email
      const userProfileRef = doc(db, 'users', user.uid);
      await updateDoc(userProfileRef, {
        email: email
      });

      // 3. Update status in waiters collection
      const waiterRef = doc(db, 'waiters', waiterId!);
      await updateDoc(waiterRef, {
        isFirstAccess: false,
        email: email
      });

      toast.success('Conta definitiva configurada com sucesso!');
      
      // Give a tiny moment for AuthState to update, then navigate to admin area
      setTimeout(() => {
        navigate('/admin/tables');
      }, 1000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está sendo utilizado por outro usuário.');
      } else if (err.code === 'auth/invalid-email') {
        toast.error('Por favor, insira um endereço de e-mail válido.');
      } else if (err.code === 'auth/requires-recent-login') {
        toast.error('Por segurança, sua sessão expirou. Faça login novamente com os dados provisórios.');
        navigate('/login');
      } else {
        toast.error('Falha ao configurar credenciais definitivas.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Buscando informações do garçom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <div className="bg-rose-600 text-white p-2.5 rounded-2xl shadow-sm">
              <ChefHat className="w-8 h-8" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-slate-800">Cardápio na Mesa</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Configurar Acesso Definitivo
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Olá, <span className="font-semibold text-rose-600">{waiterData?.name}</span>! Defina seu e-mail e senha para acessar o sistema.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-100 sm:rounded-3xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Nome Completo (Readonly) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Nome Completo
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={waiterData?.name || ''}
                  disabled
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* Telefone (Readonly) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Telefone de Contato
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={waiterData?.phone || ''}
                  disabled
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* E-mail (Input) */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Seu endereço de e-mail *
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none transition-all"
                  placeholder="exemplo@restaurante.com"
                />
              </div>
            </div>

            {/* Senha (Input) */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Senha Definitiva *
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            {/* Confirmar Senha (Input) */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Confirmar Senha Definitiva *
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none transition-all"
                  placeholder="Repita a senha"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={saving}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Concluir Configuração e Entrar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
