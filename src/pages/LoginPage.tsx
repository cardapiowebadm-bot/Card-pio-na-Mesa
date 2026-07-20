import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { ChefHat, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const loginSchema = zod.object({
  email: zod.string().min(3, 'Por favor, informe um e-mail válido ou login temporário'),
  password: zod.string().min(6, 'A senha deve conter no mínimo 6 caracteres')
});

type LoginFormInputs = zod.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [operationNotAllowedError, setOperationNotAllowedError] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    setOperationNotAllowedError(false);
    try {
      const isEmail = data.email.includes('@');
      if (isEmail) {
        await signIn(data.email, data.password);
        toast.success('Login realizado com sucesso!');
        navigate('/admin');
      } else {
        // Waiter temporary login verification
        const q = query(
          collection(db, 'waiters'),
          where('login', '==', data.email.trim())
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          toast.error('Usuário ou senha incorretos.');
          return;
        }

        const waiterDoc = snap.docs[0];
        const waiterData = waiterDoc.data();

        if (waiterData.status === 'inactive') {
          toast.error('Este usuário está desativado pelo administrador.');
          return;
        }

        if (waiterData.passwordTemp !== data.password) {
          toast.error('Usuário ou senha incorretos.');
          return;
        }

        if (waiterData.isFirstAccess) {
          toast.success('Primeiro acesso detectado! Vamos definir suas credenciais definitivas.');
          navigate(`/waiter/setup?waiterId=${waiterDoc.id}`);
        } else {
          toast.error('Seu cadastro já foi concluído. Por favor, faça login utilizando seu e-mail cadastrado.');
        }
      }
    } catch (error: any) {
      console.error(error);
      let errorMsg = 'Falha ao realizar login. Verifique suas credenciais.';
      if (error.code === 'auth/operation-not-allowed') {
        setOperationNotAllowedError(true);
        errorMsg = 'A autenticação por E-mail/Senha precisa ser ativada no Firebase.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMsg = 'E-mail ou senha inválidos.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMsg = 'E-mail ou senha incorretos.';
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-rose-600 text-white p-2.5 rounded-2xl shadow-sm">
              <ChefHat className="w-8 h-8" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-slate-800">Cardápio na Mesa</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Acesse seu painel administrativo
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Ou{' '}
          <Link to="/register" className="font-semibold text-rose-600 hover:text-rose-500">
            crie sua conta gratuita em poucos minutos
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-100 sm:rounded-3xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Endereço de E-mail
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${
                    errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-rose-500 focus:border-rose-500'
                  } rounded-xl text-sm transition-all focus:outline-none focus:ring-2`}
                  placeholder="seuemail@exemplo.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Sua Senha
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`block w-full pl-10 pr-10 py-2.5 bg-slate-50 border ${
                    errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-rose-500 focus:border-rose-500'
                  } rounded-xl text-sm transition-all focus:outline-none focus:ring-2`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-slate-300 rounded-lg"
                  defaultChecked
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                  Lembrar-me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-semibold text-rose-600 hover:text-rose-500">
                  Esqueceu a senha?
                </Link>
              </div>
            </div>

            {operationNotAllowedError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs space-y-2 animate-fade-in shadow-sm">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  ⚠️ Ativação Necessária no Firebase
                </p>
                <p>O método de autenticação por <strong>E-mail/Senha</strong> não está habilitado no seu console Firebase.</p>
                <p className="font-semibold">Siga os passos abaixo para ativar:</p>
                <ol className="list-decimal pl-4 space-y-1 text-amber-700">
                  <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline font-bold text-amber-900 hover:text-amber-700">Firebase Console</a>.</li>
                  <li>Selecione o seu projeto correspondente.</li>
                  <li>No menu esquerdo, vá em <strong>Build &gt; Authentication</strong> (ou apenas <strong>Authentication</strong>).</li>
                  <li>Clique na aba <strong>Sign-in method</strong> no topo da página.</li>
                  <li>Clique em <strong>Adicionar novo provedor</strong> (Add provider) e escolha a opção <strong>E-mail/Senha</strong> (Email/Password).</li>
                  <li>Habilite a opção principal <strong>E-mail/Senha</strong> (e deixe desmarcada a opção de link sem senha, a menos que queira) e clique em <strong>Salvar</strong> (Save).</li>
                </ol>
                <p className="text-[10px] text-amber-600 pt-1">Após salvar no console, você já poderá se cadastrar ou entrar normalmente!</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Entrar no Painel'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
