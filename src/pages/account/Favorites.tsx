import { Link } from 'react-router-dom';
import { useFavorites } from '../../store/useFavorites';
import { useCart } from '../../store/useCart';
import { formatCurrency } from '../../lib/utils';
import { HeartCrack, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import ProductCard from '../../components/ProductCard';

export default function Favorites() {
  const { items, removeItem } = useFavorites();
  const { addItem } = useCart();

  return (
    <div className="bg-[#0B0D10] text-[#F5F5F5] min-h-[70vh] py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8 border-b border-[#2B303A] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">Meus Favoritos</h1>
            <p className="text-xs sm:text-sm text-[#A4ABB7] mt-1.5">Peças salvas para seu projeto ou restauração.</p>
          </div>
          <span className="text-xs text-[#A4ABB7]">
            {items.length} {items.length === 1 ? 'item salvo' : 'itens salvos'}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="bg-[#141820] border border-[#2B303A] rounded-sm p-10 sm:p-14 text-center flex flex-col items-center justify-center max-w-md mx-auto">
            <HeartCrack size={44} className="text-[#FF7048] mb-4" />
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">Você ainda não salvou nenhuma peça</h3>
            <p className="text-xs sm:text-sm text-[#A4ABB7] mb-6">Navegue pelo nosso catálogo e clique no ícone de coração para salvar itens de seu interesse.</p>
            <Link to="/produtos" className="inline-flex items-center px-6 py-2.5 bg-[#FF7048] hover:bg-[#ff5d30] text-white text-xs font-bold uppercase rounded-sm transition-all">
              Explorar Catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
