import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  QrCode, 
  ChefHat, 
  Bell, 
  Smartphone, 
  DollarSign, 
  Check, 
  HelpCircle, 
  ArrowRight, 
  MessageSquare,
  Users,
  Shield,
  Clock,
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const features = [
    {
      icon: <QrCode className="w-6 h-6 text-rose-500" />,
      title: "QR Code Único",
      description: "Um único QR Code por restaurante. O cliente escaneia, escolhe a mesa e faz o pedido sem instalar nada."
    },
    {
      icon: <Bell className="w-6 h-6 text-rose-500" />,
      title: "Chamados em Tempo Real",
      description: "Alertas imediatos no painel quando o cliente solicita o garçom, pede a conta ou faz um pedido novo."
    },
    {
      icon: <Sparkles className="w-6 h-6 text-rose-500" />,
      title: "Inteligência Artificial",
      description: "Gere descrições gourmet de pratos, sugira nomes criativos, traduza o cardápio e monte combos lucrativos com o Gemini."
    },
    {
      icon: <ChefHat className="w-6 h-6 text-rose-500" />,
      title: "Gestão Multissetorial",
      description: "Níveis de acesso dedicados para Proprietários, Gerentes, Garçons e Cozinha com painéis específicos."
    },
    {
      icon: <Smartphone className="w-6 h-6 text-rose-500" />,
      title: "PWA & Mobile-First",
      description: "O cardápio carrega instantaneamente no celular do cliente como se fosse um aplicativo nativo e rápido."
    },
    {
      icon: <DollarSign className="w-6 h-6 text-rose-500" />,
      title: "Fechamento Simples",
      description: "O cliente revisa o consumo da mesa, escolhe pagar via PIX ou Cartão e o garçom recebe o aviso direto no terminal."
    }
  ];

  const benefits = [
    {
      title: "Redução de Custos",
      desc: "Economize com cardápios físicos rasgados ou desatualizados. Mude preços e pratos em tempo real."
    },
    {
      title: "Aumento do Ticket Médio",
      desc: "Combos inteligentes sugeridos por IA e facilidade de compra induzem o cliente a pedir mais itens."
    },
    {
      title: "Garçom Mais Produtivo",
      desc: "Menos tempo anotando pedidos e mais tempo servindo, limpando mesas e fidelizando clientes."
    },
    {
      title: "Isolamento Multi-Tenant",
      desc: "Seus dados, produtos, clientes e faturamento 100% seguros e isolados de outros restaurantes."
    }
  ];

  const plans = [
    {
      name: "Plano Bistro",
      price: "99",
      description: "Para pequenos estabelecimentos, cafeterias e food trucks.",
      features: [
        "Até 10 mesas",
        "Cardápio digital via QR Code",
        "Painel de pedidos básico",
        "Suporte por e-mail",
        "Relatórios mensais"
      ],
      popular: false
    },
    {
      name: "Plano Gourmet",
      price: "189",
      description: "Perfeito para restaurantes, pizzarias, hamburguerias e bares em crescimento.",
      features: [
        "Mesas ilimitadas",
        "Gerador e gerador de QR Code PDF/PNG",
        "Módulo de Inteligência Artificial Gemini",
        "Painéis para Garçom e Cozinha",
        "Suporte prioritário via WhatsApp",
        "Chamados de garçom em tempo real",
        "Estatísticas e faturamento diários"
      ],
      popular: true
    },
    {
      name: "Plano Chef Premium",
      price: "299",
      description: "Para redes de restaurantes e estabelecimentos de alta densidade.",
      features: [
        "Tudo do Plano Gourmet",
        "Multilojas integradas (SaaS custom)",
        "Níveis de acesso avançados e auditoria",
        "Hospedagem em subdomínio dedicado",
        "Gerente de conta exclusivo",
        "Suporte 24/7 com SLA",
        "Treinamento de equipe completo"
      ],
      popular: false
    }
  ];

  const faqs = [
    {
      q: "Como o cliente acessa o cardápio?",
      a: "O cliente aponta a câmera do celular para o QR Code impresso na mesa ou no balcão. Ele é direcionado ao cardápio digital do seu estabelecimento, informa a mesa e já pode começar a pedir imediatamente, sem baixar nada."
    },
    {
      q: "Preciso ter um QR Code para cada mesa?",
      a: "Não! O sistema utiliza apenas um único QR Code genérico para o restaurante. Ao escanear, o cliente informa voluntariamente o número de sua mesa no celular, simplificando imensamente a impressão e a colagem dos adesivos."
    },
    {
      q: "O que é a comanda da mesa?",
      a: "No painel administrativo, você acompanha em tempo real cada mesa ativa através de uma Comanda digital. Nela, é exibido o nome do cliente, horário de entrada, todos os itens já pedidos com seus status de preparo, valores individuais e o total acumulado."
    },
    {
      q: "Como funciona a Inteligência Artificial?",
      a: "O sistema possui o módulo Gemini integrado. Ele ajuda a criar descrições gourmet irresistíveis para seus pratos, traduzir todo o cardápio em espanhol ou inglês de forma profissional para turistas, sugerir promoções baseadas nos itens mais vendidos e corrigir textos."
    },
    {
      q: "O faturamento e os dados são seguros?",
      a: "Sim, absolutamente. Desenvolvemos o sistema utilizando uma arquitetura Multi-Tenant isolada via Firebase Cloud. Cada restaurante possui chaves criptográficas e regras de segurança que impedem totalmente o cruzamento de dados ou faturamentos."
    }
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-rose-100 selection:text-rose-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#fafafa]/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="bg-rose-600 text-white p-2 rounded-xl shadow-sm">
            <ChefHat className="w-6 h-6" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-slate-800">Cardápio na Mesa</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#beneficios" className="hover:text-rose-600 transition-colors">Benefícios</a>
          <a href="#recursos" className="hover:text-rose-600 transition-colors">Recursos</a>
          <a href="#planos" className="hover:text-rose-600 transition-colors">Planos</a>
          <a href="#perguntas" className="hover:text-rose-600 transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-rose-600 transition-colors">
            Entrar
          </Link>
          <Link to="/register" className="bg-rose-600 hover:bg-rose-700 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all">
            Criar Conta
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-20 max-w-5xl mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-semibold mb-6"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Micro SaaS de Cardápio Digital Multi-Tenant
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-display text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight mb-6"
        >
          Transforme as mesas do seu restaurante em <span className="text-rose-600">vendas inteligentes</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed"
        >
          Seu cardápio interativo e profissional via QR Code. Economize tempo de garçom, gere comandas digitais em tempo real e crie descrições gourmet irresistíveis com Inteligência Artificial.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/register" className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-semibold px-8 py-3.5 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group">
            Começar Agora Grátis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#como-funciona" className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-8 py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center">
            Ver como funciona
          </a>
        </motion.div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="bg-white border-y border-slate-100 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-slate-900 mb-4">Por que escolher o Cardápio na Mesa?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Desenvolvido com foco absoluto em velocidade, usabilidade e faturamento. Veja o impacto que causamos no seu negócio.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, i) => (
              <div key={i} className="bg-[#fafafa] border border-slate-100 p-6 rounded-2xl">
                <div className="bg-rose-50 text-rose-600 w-10 h-10 rounded-xl flex items-center justify-center mb-4 font-semibold text-sm">
                  0{i + 1}
                </div>
                <h3 className="font-semibold text-lg text-slate-800 mb-2">{benefit.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold text-slate-900 mb-4">Fluxo de Funcionamento Simplificado</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Sem enrolação. O seu cliente chega, pede e paga com total autonomia.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="flex flex-col items-center text-center">
            <div className="bg-rose-100 text-rose-700 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <QrCode className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-3">1. Escanear & Identificar</h3>
            <p className="text-slate-600 text-sm max-w-xs leading-relaxed">
              O cliente escaneia o QR Code do restaurante, digita o número da mesa e se identifica rapidamente por nome, telefone e CPF (opcional).
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="bg-rose-100 text-rose-700 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <ChefHat className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-3">2. Escolher & Pedir</h3>
            <p className="text-slate-600 text-sm max-w-xs leading-relaxed">
              Ele navega pelas categorias, adiciona observações aos pratos e finaliza o pedido. A cozinha e o garçom recebem o pedido instantaneamente.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="bg-rose-100 text-rose-700 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <DollarSign className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-3">3. Fechar & Pagar</h3>
            <p className="text-slate-600 text-sm max-w-xs leading-relaxed">
              Pelo próprio celular o cliente confere tudo que consumiu, solicita a chave PIX ou a maquininha, e o garçom encerra o atendimento no painel.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="recursos" className="bg-white border-y border-slate-100 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-slate-900 mb-4">Funcionalidades do Painel de Controle</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Tudo que você precisa para controlar o faturamento e a produção das mesas em uma interface moderna e integrada.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, i) => (
              <div key={i} className="border border-slate-100 p-8 rounded-3xl hover:border-slate-200 transition-all shadow-sm hover:shadow-md bg-white">
                <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  {feat.icon}
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2">{feat.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section id="planos" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold text-slate-900 mb-4">Planos Flexíveis para Qualquer Tamanho</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Comece gratuitamente e escolha o plano perfeito quando seu faturamento crescer.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div 
              key={i} 
              className={`border rounded-3xl p-8 relative flex flex-col justify-between transition-all bg-white shadow-sm ${
                plan.popular ? 'border-rose-500 ring-1 ring-rose-500 scale-105 z-10' : 'border-slate-100'
              }`}
            >
              <div>
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Mais Popular
                  </span>
                )}
                <h3 className="font-bold text-xl text-slate-800 mb-1">{plan.name}</h3>
                <p className="text-slate-500 text-xs mb-6">{plan.description}</p>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-slate-500 text-sm font-semibold">R$</span>
                  <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                  <span className="text-slate-500 text-sm">/mês</span>
                </div>

                <ul className="space-y-3.5 mb-8 text-sm text-slate-600">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link 
                to="/register" 
                className={`w-full py-3 rounded-xl text-center font-semibold text-sm transition-all shadow-sm ${
                  plan.popular 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                }`}
              >
                Assinar Plano
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="perguntas" className="bg-white border-y border-slate-100 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-slate-900 mb-4">Perguntas Frequentes</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Tem alguma dúvida? Encontre as respostas mais comuns sobre o micro SaaS.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-slate-100 rounded-2xl overflow-hidden bg-[#fafafa]">
                <button 
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between font-semibold text-slate-800 hover:bg-slate-100/50 transition-all"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    {faq.q}
                  </span>
                  <span className="text-slate-400 font-bold text-lg">{activeFaq === i ? '−' : '+'}</span>
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-6 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-6 max-w-4xl mx-auto">
        <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-xl">
            <span className="text-rose-400 font-semibold text-sm mb-2 block">Dúvidas ou Suporte?</span>
            <h2 className="font-display text-3xl font-bold mb-4">Pronto para digitalizar seu atendimento?</h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-8">
              Nossa equipe está à disposição para ajudar você a configurar o cardápio e treinar seus funcionários. Entre em contato por e-mail ou agende uma chamada.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="mailto:suporte@cardapionamesa.com" className="bg-white hover:bg-slate-100 text-slate-900 font-semibold px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
                suporte@cardapionamesa.com
              </a>
              <a href="https://wa.me/5511999999999" target="_blank" rel="noreferrer" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
                <MessageSquare className="w-4 h-4" />
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-rose-600 text-white p-1.5 rounded-lg">
              <ChefHat className="w-4 h-4" />
            </div>
            <span className="font-display font-bold tracking-tight text-slate-800">Cardápio na Mesa</span>
          </div>

          <p className="text-slate-500 text-xs">
            &copy; {new Date().getFullYear()} Cardápio na Mesa SaaS. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="#" className="hover:text-rose-600">Termos de Uso</a>
            <a href="#" className="hover:text-rose-600">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
