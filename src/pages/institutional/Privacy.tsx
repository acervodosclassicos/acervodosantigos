export default function Privacy() {
  return (
    <div className="bg-zinc-950 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        <div className="mb-12">
          <h1 className="font-display font-bold text-4xl text-white mb-4">Política de Privacidade</h1>
          <p className="text-zinc-400">Última atualização: {new Date().getFullYear()}</p>
        </div>

        <div className="prose prose-invert prose-orange max-w-none text-zinc-300 leading-relaxed text-sm">
          <p>
            A privacidade dos visitantes e clientes da <strong>Acervo dos Antigos</strong> é de extrema importância para nós. Esta política descreve como coletamos, usamos, armazenamos e protegemos as suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD).
          </p>

          <h3 className="text-white font-bold mt-8 mb-4">1. Dados Coletados</h3>
          <p>Durante a sua navegação e processo de compra, podemos coletar os seguintes dados:</p>
          <ul>
            <li><strong>Dados de Identificação:</strong> Nome completo, CPF (para emissão de documentos fiscais).</li>
            <li><strong>Dados de Contato:</strong> E-mail, Telefone, WhatsApp.</li>
            <li><strong>Dados de Entrega:</strong> Endereço completo (CEP, rua, número, bairro, cidade, estado).</li>
            <li><strong>Dados de Navegação:</strong> Endereço IP, tipo de navegador, páginas acessadas, origem do acesso (via cookies essenciais).</li>
          </ul>

          <h3 className="text-white font-bold mt-8 mb-4">2. Finalidade do Uso</h3>
          <p>As informações coletadas são utilizadas exclusivamente para:</p>
          <ul>
            <li>Processamento, faturamento e envio de pedidos.</li>
            <li>Atendimento ao cliente e suporte sobre a compra.</li>
            <li>Comunicação de atualizações de status de pedidos.</li>
            <li>Prevenção a fraudes e garantia de segurança do ambiente.</li>
          </ul>

          <h3 className="text-white font-bold mt-8 mb-4">3. Compartilhamento de Dados</h3>
          <p>A Acervo dos Antigos não vende ou aluga seus dados. O compartilhamento ocorre apenas quando estritamente necessário com:</p>
          <ul>
            <li><strong>Provedores de Pagamento:</strong> Mercado Pago, PagSeguro ou equivalentes, para o processamento financeiro. Não armazenamos dados do seu cartão.</li>
            <li><strong>Transportadoras:</strong> Correios, Rodonaves, Jadlog ou equivalentes, apenas com os dados necessários para a entrega da mercadoria.</li>
          </ul>

          <h3 className="text-white font-bold mt-8 mb-4">4. Armazenamento e Segurança</h3>
          <p>
            Adotamos práticas rigorosas de segurança. Nossos servidores utilizam criptografia e controle de acesso (Row Level Security) garantindo que apenas profissionais autorizados tenham acesso aos dados essenciais para o envio do seu pedido.
          </p>

          <h3 className="text-white font-bold mt-8 mb-4">5. Seus Direitos</h3>
          <p>
            Você tem o direito de solicitar a visualização, alteração, correção ou exclusão dos seus dados pessoais dos nossos servidores a qualquer momento, acessando a área "Minha Conta" ou entrando em contato pelos nossos canais oficiais de atendimento.
          </p>
        </div>
      </div>
    </div>
  );
}
