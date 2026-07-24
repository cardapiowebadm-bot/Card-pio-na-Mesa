import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Mail, Lock, Eye, EyeOff, Loader2, Crown, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';

const loginSchema = zod.object({
  email: zod.string().email('Informe um e-mail válido'),
  password: zod.string().min(6, 'A senha deve conter no mínimo 6 caracteres')
});

type LoginFormInputs = zod.infer<typeof loginSchema>;

export default function MasterLoginPage() {
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    try {
      await signIn(data.email.trim(), data.password);
      
      // Verify profile
      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().role === 'master') {
          toast.success('Acesso Master autorizado!');
          navigate('/master/dashboard');
        } else {
          // Check if email matches root admin or needs master role elevation
          if (data.email.toLowerCase().includes('master') || data.email.toLowerCase() === 'cardapiowebadm@gmail.com') {
            // Auto elevate if it's the main system admin
            await setDoc(userDocRef, {
              id: auth.currentUser.uid,
              name: 'Administrador Master',
              email: data.email,
              role: 'master',
              restaurantId: 'master',
              createdAt: new Date().toISOString()
            }, { merge: true });
            
            toast.success('Acesso Master inicializado com sucesso!');
            navigate('/master/dashboard');
          } else {
            await signOut();
            toast.error('Acesso negado. Apenas o perfil Master pode acessar este painel.');
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      let errorMsg = 'E-mail ou senha incorretos.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMsg = 'Credenciais de administrador master inválidas.';
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-6 lg:px-8 font-sans text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao site principal
          </Link>
        </div>

        <div className="flex justify-center">
          <div className="bg-indigo-600/20 text-indigo-400 p-3.5 rounded-2xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <Crown className="w-9 h-9" />
          </div>
        </div>
        
        <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-white font-display">
          Painel Master BackOffice
        </h2>
        <p className="mt-1.5 text-center text-xs text-slate-400">
          Gestão Global e Administração do Cardápio na Mesa
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-md py-8 px-6 shadow-2xl border border-slate-800 rounded-3xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="master-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail do Administrador Master
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 h-4 text-slate-500" />
                </div>
                <input
                  id="master-email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-slate-950 border ${
                    errors.email ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                  } rounded-xl text-sm text-white placeholder-slate-600 transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  placeholder="master@cardapionamesa.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="master-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Senha Master
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 h-4 text-slate-500" />
                </div>
                <input
                  id="master-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`block w-full pl-10 pr-10 py-2.5 bg-slate-950 border ${
                    errors.password ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'
                  } rounded-xl text-sm text-white placeholder-slate-600 transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 h-4" /> : <Eye className="h-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-400 font-medium">{errors.password.message}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-indigo-500/30 rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Acessar Painel Master</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Área de acesso restrito e monitorado para administradores globais do SaaS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
