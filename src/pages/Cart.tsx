import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowLeft, ShieldCheck, ArrowRight } from 'lucide-react';
import { useCart } from '../store/useCart';
import { formatCurrency } from '../lib/utils';

export default function Cart() {
  const { items, removeItem, updateQuantity, getCartTotal } = useCart();
  const navigate = useNavigate();

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity > 0) {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="bg-[#0B0D10] text-[#F5F5F5] min-h-[65vh] flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-[#141820] border border-[#2B303A] rounded-full flex items-center justify-center mb-6 text-[#FF7048]">
          <ShoppingBag size={36} />
        </div>
        <h2 className="font-display text-2xl font-bold text-[#F5F5F5] mb-2">Seu carrinho está vazio</h2>
        <p className="text-[#A4ABB7] text-center max-w-md mb-8 text-sm leading-relaxed">
          Navegue pelo nosso acervo de peças clássicas e adicione os componentes que você procura para seu projeto.
        </p>
        <Link 
          to="/produtos" 
          className="px-8 py-3.5 bg-[#FF7048] hover:bg-[#ff5d30] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-[0_4px_20px_rgba(255,112,72,0.3)]"
        >
          Explorar Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D10] text-[#F5F5F5] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 border-b border-[#2B303A] pb-6 flex items-baseline justify-between">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#F5F5F5]">Meu Carrinho</h1>
          <span className="text-xs text-[#A4ABB7]">
            {items.length} {items.length === 1 ? 'produto selecionado' : 'produtos selecionados'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Cart Items */}
          <div className="lg:col-span-8">
            <div className="bg-[#141820] border border-[#2B303A] rounded-sm overflow-hidden">
              {/* Header */}
              <div className="hidden sm:grid grid-cols-12 gap-4 p-4 border-b border-[#2B303A] text-xs font-semibold text-[#A4ABB7] uppercase tracking-wider">
                <div className="col-span-6">Peça</div>
                <div className="col-span-3 text-center">Quantidade</div>
                <div className="col-span-2 text-right">Subtotal</div>
                <div className="col-span-1"></div>
              </div>
              
              {/* Items */}
              <ul className="divide-y divide-[#2B303A]">
                {items.map(({ product, quantity }) => (
                  <li key={product.id} className="p-4 sm:p-5">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link 
                        to={`/produto/${product.slug}`} 
                        className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-[#0B0D10] border border-[#2B303A] rounded-sm overflow-hidden block" 
                        title={product.title}
                      >
                        <img 
                          src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=200'} 
                          alt={product.title} 
                          className="w-full h-full object-cover" 
                        />
                      </Link>
                      
                      {/* Product Details & Actions */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div className="pr-2">
                            <Link to={`/produto/${product.slug}`} title={product.title}>
                              <h3 className="text-[#F5F5F5] font-semibold text-sm sm:text-base hover:text-[#FF7048] transition-colors line-clamp-2 leading-snug">
                                {product.title}
                              </h3>
                            </Link>
                            <div className="text-xs text-[#A4ABB7] mt-1">
                              {product.vehicle ? `${product.vehicle} · ` : ''}Condição: {product.condition}
                            </div>
                          </div>
                          <div className="hidden sm:block text-right">
                            <div className="font-bold text-[#F5F5F5] font-display text-base whitespace-nowrap">
                              {formatCurrency(product.price * quantity)}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-end mt-3 sm:mt-4">
                          <div className="flex items-center gap-4">
                            <div className="text-[#FF7048] font-bold sm:hidden text-sm">
                              {formatCurrency(product.price)}
                            </div>
                            
                            {/* Quantity Selector */}
                            <div className="flex items-center border border-[#2B303A] rounded-sm bg-[#0B0D10] overflow-hidden h-8">
                              <button 
                                onClick={() => handleQuantityChange(product.id, quantity - 1)}
                                className="px-3 h-full flex items-center justify-center text-[#A4ABB7] hover:text-white hover:bg-[#1B2029] transition-colors focus:outline-none cursor-pointer"
                                aria-label="Diminuir quantidade"
                              >
                                -
                              </button>
                              <span className="px-2 text-xs font-semibold text-white min-w-[2rem] text-center border-l border-r border-[#2B303A] h-full flex items-center justify-center">
                                {quantity}
                              </span>
                              <button 
                                onClick={() => handleQuantityChange(product.id, quantity + 1)}
                                disabled={quantity >= product.stock}
                                className="px-3 h-full flex items-center justify-center text-[#A4ABB7] hover:text-white hover:bg-[#1B2029] transition-colors focus:outline-none disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                aria-label="Aumentar quantidade"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <button 
                            onClick={() => removeItem(product.id)}
                            className="text-[#A4ABB7] hover:text-red-400 transition-colors rounded-sm hover:bg-[#1B2029] p-1.5 cursor-pointer"
                            aria-label="Remover item"
                            title="Remover do carrinho"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mt-6 flex justify-between items-center">
              <Link to="/produtos" className="text-xs sm:text-sm font-semibold text-[#FF7048] hover:text-white transition-colors flex items-center">
                <ArrowLeft size={15} className="mr-2" /> Continuar Comprando
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-[#141820] border border-[#2B303A] rounded-sm p-6 lg:sticky lg:top-28">
              <h2 className="font-display font-bold text-lg text-white mb-5 border-b border-[#2B303A] pb-4">
                Resumo da Compra
              </h2>
              
              <div className="space-y-3 mb-6 text-xs text-[#A4ABB7]">
                <div className="flex justify-between">
                  <span>Subtotal das peças</span>
                  <span className="text-[#F5F5F5] font-semibold">{formatCurrency(getCartTotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frete</span>
                  <span className="text-[#10B981] font-medium">Calculado na próxima etapa</span>
                </div>
              </div>
              
              <div className="border-t border-[#2B303A] pt-4 mb-6">
                <div className="flex justify-between items-baseline">
                  <span className="text-[#F5F5F5] font-bold text-sm">Total Estimado</span>
                  <span className="text-[#F5F5F5] font-display font-bold text-2xl tracking-tight">
                    {formatCurrency(getCartTotal())}
                  </span>
                </div>
                <p className="text-[11px] text-[#A4ABB7] mt-1.5 text-right">Pagamento via PIX ou Cartão em até 12x</p>
              </div>
              
              <button 
                onClick={handleCheckout}
                className="w-full py-4 bg-[#FF7048] hover:bg-[#ff5d30] text-white font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-[0_4px_20px_rgba(255,112,72,0.35)] flex items-center justify-center cursor-pointer"
              >
                <span>Continuar para Identificação</span>
                <ArrowRight size={16} className="ml-2" />
              </button>
              
              <div className="mt-5 pt-5 border-t border-[#2B303A]/70 flex items-start text-xs text-[#A4ABB7] leading-relaxed">
                <ShieldCheck size={16} className="text-[#10B981] mr-2 shrink-0 mt-0.5" />
                <p>Compra segura com criptografia de ponta a ponta. Seus dados cadastrais e de pagamento estão protegidos.</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
