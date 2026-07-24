import React, { useState } from 'react';
import { Settings, Shield, Bell, Key, Database, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MasterSettings() {
  const [trialDays, setTrialDays] = useState('14');
  const [supportEmail, setSupportEmail] = useState('suporte@cardapionamesa.com');
  const [autoBlockExpired, setAutoBlockExpired] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configurações do BackOffice salvas com sucesso!');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Configurações Globais</span>
        </div>
        <h1 className="text-2xl font-bold text-white font-display">Configurações do BackOffice</h1>
        <p className="text-xs text-slate-400 mt-1">
          Parâmetros globais da plataforma, padrões de trial, avisos e regras de segurança.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Trial & Onboarding Settings */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Settings className="w-4 h-4 text-indigo-400" />
            Parâmetros de Novos Cadastros (Trial)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Dias de Degustação Gratuita (Trial)
              </label>
              <input
                type="number"
                value={trialDays}
                onChange={e => setTrialDays(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                E-mail de Suporte Global
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Security & Access Policies */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Shield className="w-4 h-4 text-indigo-400" />
            Políticas de Acesso & Bloqueio Automático
          </h2>

          <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div>
              <span className="text-xs font-semibold text-white block">Bloqueio Automático por Inadimplência</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Suspender automaticamente estabelecimentos após 5 dias de atraso na mensalidade.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoBlockExpired}
              onChange={e => setAutoBlockExpired(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-700 bg-slate-900 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
}
