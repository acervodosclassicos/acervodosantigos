import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowUpRight } from 'lucide-react';
import { useFavorites } from '../store/useFavorites';
import { formatCurrency } from '../lib/utils';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  className?: string;
  key?: React.Key;
}

export default function ProductCard({ product, className = '' }: ProductCardProps) {
  const { addItem: addFavorite, removeItem: removeFavorite, isFavorite } = useFavorites();
  const favorite = isFavorite(product.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favorite) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  const primaryImage = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1580274455006-2594aee9fc4f?auto=format&fit=crop&q=80&w=800';
  const hasRealDiscount = Boolean(product.previous_price && product.previous_price > product.price);
  const discountPercent = hasRealDiscount 
    ? Math.round(((product.previous_price! - product.price) / product.previous_price!) * 100) 
    : 0;

  const isSoldOut = product.status === 'esgotado';

  return (
    <article
      className={`group relative flex flex-col bg-[#141820] border border-[#2B303A] rounded-sm overflow-hidden transition-all duration-300 hover:border-[#FF7048]/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] ${className}`}
    >
      {/* Top Image Container */}
      <Link 
        to={`/produto/${product.slug}`}
        className="relative aspect-square w-full overflow-hidden bg-[#0B0D10] block"
        title={product.title}
      >
        {/* Badges container */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
          {isSoldOut ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-zinc-800 text-zinc-300 border border-zinc-700">
              Esgotado
            </span>
          ) : product.badge ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#FF7048] text-white">
              {product.badge}
            </span>
          ) : null}

          {hasRealDiscount && discountPercent > 0 && !isSoldOut && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-sm bg-[#0B0D10]/80 backdrop-blur-sm border border-[#2B303A] flex items-center justify-center text-[#A4ABB7] hover:text-[#FF7048] hover:border-[#FF7048]/50 transition-all cursor-pointer group/fav"
        >
          <Heart 
            size={16} 
            className={`transition-transform duration-200 group-hover/fav:scale-110 ${
              favorite ? 'fill-[#FF7048] text-[#FF7048]' : 'text-zinc-400'
            }`} 
          />
        </button>

        {/* Product Image */}
        <img
          src={primaryImage}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Subtle hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141820] via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity pointer-events-none" />
      </Link>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata: Vehicle & Condition */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#A4ABB7] font-medium tracking-wide mb-2 truncate">
            {product.vehicle && <span className="truncate">{product.vehicle}</span>}
            {product.vehicle && product.condition && <span aria-hidden="true">·</span>}
            {product.condition && <span className="shrink-0">{product.condition}</span>}
          </div>

          {/* Title */}
          <Link 
            to={`/produto/${product.slug}`}
            className="block group-hover:text-[#FF7048] transition-colors"
            title={product.title}
          >
            <h3 className="text-sm sm:text-base font-semibold text-[#F5F5F5] leading-snug line-clamp-2 min-h-[2.5rem]">
              {product.title}
            </h3>
          </Link>
        </div>

        {/* Pricing & CTA */}
        <div className="mt-4 pt-3.5 border-t border-[#2B303A]/60 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div>
              {hasRealDiscount && (
                <span className="block text-[11px] text-[#A4ABB7] line-through">
                  {formatCurrency(product.previous_price!)}
                </span>
              )}
              <span className="font-display font-bold text-lg sm:text-xl text-[#F5F5F5] tracking-tight">
                {formatCurrency(product.price)}
              </span>
            </div>
            {product.stock !== undefined && product.stock > 0 && product.stock <= 3 && !isSoldOut && (
              <span className="text-[10px] text-amber-400/90 font-medium">
                Últimas {product.stock} unid.
              </span>
            )}
          </div>

          <Link
            to={`/produto/${product.slug}`}
            className="w-full flex items-center justify-center py-2 px-3 rounded-sm text-xs sm:text-sm font-semibold text-[#F5F5F5] bg-[#1B2029] border border-[#2B303A] hover:border-[#FF7048] hover:bg-[#FF7048] hover:text-white transition-all duration-200 group/btn"
          >
            <span>Ver Detalhes</span>
            <ArrowUpRight size={14} className="ml-1.5 text-[#A4ABB7] group-hover/btn:text-white group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </article>
  );
}
