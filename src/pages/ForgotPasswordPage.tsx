import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { ChefHat, Mail, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const forgotPasswordSchema = zod.object({
  email: zod.string().email('Por favor, informe um e-mail válido')
});

type ForgotPasswordInputs = zod.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInputs>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data: ForgotPasswordInputs) => {
    setLoading(true);
    try {
      await resetPassword(data.email);
      setSent(true);
      toast.success('Link de recuperação enviado com sucesso!');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao enviar recuperação. Verifique o e-mail informado.');
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
          Recuperar sua senha
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Enviaremos um link de alteração de senha para o seu e-mail.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-100 sm:rounded-3xl sm:px-10">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl text-sm font-medium">
                Link enviado! Acesse a caixa de entrada do seu e-mail para redefinir sua senha.
              </div>
              <Link
                to="/login"
                className="w-full flex justify-center py-3 px-4 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Voltar para o Login
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Seu E-mail Cadastrado
                </label>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={`block w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${
                      errors.email ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-rose-500'
                    } rounded-xl text-sm transition-all focus:outline-none focus:ring-2`}
                    placeholder="seuemail@exemplo.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Link to="/login" className="flex items-center gap-1.5 text-sm font-semibold text-rose-600 hover:text-rose-500">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para o login
                </Link>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Enviar Link de Recuperação'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
