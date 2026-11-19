import { ShoppingCart, Search, CreditCard, Truck } from 'lucide-react';

export default function HowToBuy() {
  return (
    <div className="bg-zinc-950 min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        <div className="mb-12 text-center">
          <h1 className="font-display font-bold text-4xl text-white mb-4">Como Comprar</h1>
          <p className="text-zinc-400 text-lg">Um guia simples para garantir a sua peça clássica.</p>
        </div>

        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
          
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-12 h-12 rounded-full border border-zinc-800 bg-zinc-900 text-orange-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(234,88,12,0.1)]">
              <Search size={24} />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-sm border border-zinc-800 bg-zinc-900/50">
              <h3 className="font-bold text-white text-lg mb-2">1. Encontre a peça</h3>
              <p className="text-zinc-400 text-sm">Navegue pelas categorias ou utilize a barra de busca para encontrar a peça exata para o seu projeto de restauração.</p>
            </div>
          </div>

          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-12 h-12 rounded-full border border-zinc-800 bg-zinc-900 text-orange-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(234,88,12,0.1)]">
              <ShoppingCart size={24} />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-sm border border-zinc-800 bg-zinc-900/50">
              <h3 className="font-bold text-white text-lg mb-2">2. Adicione ao Carrinho</h3>
              <p className="text-zinc-400 text-sm">Confira as informações, compatibilidade e fotos no anúncio. Clique em "Comprar Agora" ou adicione ao carrinho se quiser mais itens.</p>
            </div>
          </div>

          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-12 h-12 rounded-full border border-zinc-800 bg-zinc-900 text-orange-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(234,88,12,0.1)]">
              <CreditCard size={24} />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-sm border border-zinc-800 bg-zinc-900/50">
              <h3 className="font-bold text-white text-lg mb-2">3. Dados e Pagamento Seguro</h3>
              <p className="text-zinc-400 text-sm">Preencha seus dados de entrega. O pagamento é realizado em um ambiente externo 100% criptografado (Mercado Pago, PagSeguro, etc). Não armazenamos seus cartões.</p>
            </div>
          </div>

          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-12 h-12 rounded-full border border-zinc-800 bg-zinc-900 text-orange-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(234,88,12,0.1)]">
              <Truck size={24} />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-sm border border-zinc-800 bg-zinc-900/50">
              <h3 className="font-bold text-white text-lg mb-2">4. Acompanhe o Envio</h3>
              <p className="text-zinc-400 text-sm">Assim que o pagamento for confirmado, embalaremos sua peça com total segurança. Você receberá o código de rastreio para acompanhar até sua garagem.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
