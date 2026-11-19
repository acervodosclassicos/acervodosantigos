import { ShieldCheck, Lock, CreditCard, Server } from 'lucide-react';

export default function Security() {
  return (
    <div className="bg-zinc-950 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        <div className="text-center mb-16">
          <ShieldCheck size={64} className="text-orange-500 mx-auto mb-6" />
          <h1 className="font-display font-bold text-4xl text-white mb-4">Segurança da Compra</h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Garantir a segurança dos seus dados e a integridade da sua compra é a nossa prioridade número um.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-sm">
            <Lock size={32} className="text-orange-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Conexão Segura</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Toda a navegação na Acervo dos Antigos é protegida por certificados SSL de ponta a ponta. Isso significa que qualquer dado trafegado entre o seu dispositivo e nossos servidores é criptografado, impedindo a interceptação por terceiros.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-sm">
            <CreditCard size={32} className="text-orange-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Pagamento Externo Criptografado</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              <strong>Nós não armazenamos os dados do seu cartão de crédito.</strong> O momento do pagamento ocorre exclusivamente no ambiente seguro das processadoras financeiras homologadas (como Mercado Pago e PagSeguro), que possuem os mais altos padrões PCI-DSS.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-sm">
            <Server size={32} className="text-orange-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Proteção de Informações</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Seus dados de endereço e contato são armazenados em bancos de dados em nuvem com alta segurança (Supabase) e são utilizados exclusivamente para o faturamento e envio das suas peças.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-sm">
            <ShieldCheck size={32} className="text-orange-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Atendimento Humanizado</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Cuidado com golpes. Nós só entramos em contato através dos nossos canais oficiais listados no site (WhatsApp e E-mail oficiais). Em caso de qualquer dúvida sobre um pedido, acione imediatamente o nosso suporte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
