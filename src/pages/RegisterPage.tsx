import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { ChefHat, Mail, Lock, User, Store, Phone, MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const registerSchema = zod.object({
  name: zod.string().min(2, 'O nome do proprietário deve conter no mínimo 2 caracteres'),
  email: zod.string().email('Por favor, informe um e-mail válido'),
  password: zod.string().min(6, 'A senha deve conter no mínimo 6 caracteres'),
  restaurantName: zod.string().min(3, 'O nome do restaurante deve conter no mínimo 3 caracteres'),
  phone: zod.string().min(10, 'Informe um telefone válido (DDD + Número)'),
  address: zod.string().min(5, 'Informe o endereço completo do estabelecimento')
});

type RegisterFormInputs = zod.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [operationNotAllowedError, setOperationNotAllowedError] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterFormInputs) => {
    setLoading(true);
    setOperationNotAllowedError(false);
    try {
      await signUp(
        data.email,
        data.password,
        data.name,
        data.restaurantName,
        data.phone,
        data.address
      );
      toast.success('Parabéns! Sua conta e restaurante foram criados com sucesso!');
      navigate('/admin');
    } catch (error: any) {
      console.error(error);
      let errorMsg = 'Erro ao criar conta. Verifique os dados informados.';
      if (error.code === 'auth/operation-not-allowed') {
        setOperationNotAllowedError(true);
        errorMsg = 'A autenticação por E-mail/Senha precisa ser ativada no Firebase.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'Este endereço de e-mail já está sendo utilizado.';
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-rose-600 text-white p-2.5 rounded-2xl shadow-sm">
              <ChefHat className="w-8 h-8" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-slate-800">Cardápio na Mesa</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Crie seu restaurante em segundos
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Já possui conta?{' '}
          <Link to="/login" className="font-semibold text-rose-600 hover:text-rose-500">
            Acesse seu painel clicando aqui
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-100 sm:rounded-3xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            {/* Seção 1: Dados do Proprietário */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Dados do Proprietário
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                    Nome Completo
                  </label>
                  <div className="mt-1.5 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      {...register('name')}
                      className={`block w-full pl-9 pr-3 py-2 bg-slate-50 border ${
                        errors.name ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-rose-500'
                      } rounded-xl text-sm transition-all focus:outline-none focus:ring-2`}
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    E-mail do Administrador
                  </label>
                  <div className="mt-1.5 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      {...register('email')}
                      className={`block w-full pl-9 pr-3 py-2 bg-slate-50 border ${
                        errors.email ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-rose-500'
                      } rounded-xl text-sm transition-all focus:outline-none focus:ring-2`}
                      placeholder="joao@restaurante.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Senha de Acesso
                </label>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    {...register('password')}
                    className={`block w-full pl-9 pr-3 py-2 bg-slate-50 border ${
                      errors.password ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-rose-500'
                    } rounded-xl text-sm transition-all focus:outline-none focus:ring-2`}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Seção 2: Dados do Restaurante */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Dados do Restaurante
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="restaurantName" className="block text-sm font-medium text-slate-700">
                    Nome Fantasia
                  </label>
                  <div className="mt-1.5 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Store className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="restaurantName"
                      type="text"
                      {...register('restaurantName')}
                      className={`block w-full pl-9 pr-3 py-2 bg-slate-50 border ${
                        errors.restaurantName ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-rose-500'
                      } rounded-xl text-sm transition-all focus:outline-none focus:ring-2`}
                      placeholder="Ex: Pizzaria Bella Italia"
                    />
                  </div>
                  {errors.restaurantName && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.restaurantName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                    Telefone / WhatsApp
                  </label>
                  <div className="mt-1.5 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="phone"
                      type="text"
                      {...register('phone')}
                      className={`block w-full pl-9 pr-3 py-2 bg-slate-50 border ${
                        errors.phone ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-rose-500'
                      } rounded-xl text-sm transition-all focus:outline-none focus:ring-2`}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="address" className="block text-sm font-medium text-slate-700">
                  Endereço Completo
                  <span className="text-slate-400 text-xs font-normal"> (Rua, Número, Bairro, Cidade)</span>
                </label>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="address"
                    type="text"
                    {...register('address')}
                    className={`block w-full pl-9 pr-3 py-2 bg-slate-50 border ${
                      errors.address ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-rose-500'
                    } rounded-xl text-sm transition-all focus:outline-none focus:ring-2`}
                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista - São Paulo/SP"
                  />
                </div>
                {errors.address && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.address.message}</p>
                )}
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
                <p className="text-[10px] text-amber-600 pt-1">Após salvar no console, você já poderá criar seu estabelecimento normalmente!</p>
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
                  'Criar Meu Cardápio Grátis'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
