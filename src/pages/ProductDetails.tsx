import { useState, useEffect, useCallback, useRef, type TouchEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  Truck, 
  MessageCircle, 
  Heart, 
  Info, 
  AlertCircle, 
  Share2, 
  Copy, 
  ShoppingBag, 
  RotateCw,
  X,
  ZoomIn,
  Check,
  CreditCard
} from 'lucide-react';
import { useCart } from '../store/useCart';
import { useFavorites } from '../store/useFavorites';
import { formatCurrency, cn, formatWhatsAppNumber } from '../lib/utils';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { getProductBySlug } from '../lib/api';
import type { Product, SiteSettings } from '../types';

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem, clearCart } = useCart();
  const { addItem: addFavorite, removeItem: removeFavorite, isFavorite } = useFavorites();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const touchMoved = useRef<boolean>(false);
  const lastSwipeTime = useRef<number>(0);

  const loadData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setHasError(false);

    try {
      // 1. Fetch product with SWR cache + automatic retry
      const { product: initialProduct } = await getProductBySlug(slug, (freshProduct) => {
        setProduct(freshProduct);
      });

      if (initialProduct) {
        setProduct(initialProduct);
        setHasError(false);
      } else {
        setHasError(true);
      }

      // 2. Fetch site settings in parallel without blocking product
      if (hasSupabaseConfig) {
        supabase
          .from('site_settings')
          .select('*')
          .limit(1)
          .single()
          .then(({ data }) => {
            if (data) setSettings(data as any);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('Error fetching product data:', err);
      // Only set error if we don't have product in state
      if (!product) {
        setHasError(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    setSelectedImage(0);
    setIsZoomOpen(false);
    loadData();
  }, [slug, loadData]);

  // Update document title and OpenGraph meta tags in client
  useEffect(() => {
    if (!product) return;
    const priceFormatted = product.price ? formatCurrency(product.price) : '';
    const cleanTitle = `${product.title} - ${priceFormatted} | ACERVO DOS ANTIGOS`;
    document.title = cleanTitle;

    const setMetaTag = (property: string, content: string, isName = false) => {
      const attr = isName ? 'name' : 'property';
      let element = document.querySelector(`meta[${attr}="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const firstImage = product.images?.[0]?.url;
    if (firstImage) {
      setMetaTag('og:image', firstImage);
      setMetaTag('og:image:secure_url', firstImage);
      setMetaTag('twitter:image', firstImage, true);
    }
    
    setMetaTag('og:title', cleanTitle);
    setMetaTag('twitter:title', cleanTitle, true);

    const cleanRawDesc = (product.description || '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[*#_~`]/g, '')
      .trim();

    const descParts = [
      `💰 Valor: ${priceFormatted}`,
      product.vehicle ? `Veículo: ${product.vehicle}` : null,
      product.condition ? `Condição: ${product.condition}` : null
    ].filter(Boolean).join(' • ');

    const desc = `${descParts} — ${cleanRawDesc.slice(0, 160)}${cleanRawDesc.length > 160 ? '...' : ''}`;
    
    setMetaTag('og:description', desc);
    setMetaTag('twitter:description', desc, true);
    setMetaTag('description', desc, true);
    setMetaTag('og:url', window.location.href);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);
  }, [product]);

  const productImages = product?.images?.length 
    ? product.images.map(img => img.url) 
    : ['https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&q=80&w=800'];

  const nextImage = useCallback(() => {
    if (productImages.length <= 1) return;
    setSelectedImage(prev => (prev + 1) % productImages.length);
  }, [productImages.length]);

  const prevImage = useCallback(() => {
    if (productImages.length <= 1) return;
    setSelectedImage(prev => (prev - 1 + productImages.length) % productImages.length);
  }, [productImages.length]);

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    touchMoved.current = false;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || e.touches.length !== 1) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = Math.abs(currentX - touchStartX.current);
    const diffY = Math.abs(currentY - touchStartY.current);

    // If movement is more than 8 pixels in any direction, mark as moved
    if (diffX > 8 || diffY > 8) {
      touchMoved.current = true;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const diffX = touchStartX.current - endX;
    const diffY = touchStartY.current - endY;
    const elapsedTime = Date.now() - touchStartTime.current;

    // A swipe must have moved at least 32px horizontally, predominantly horizontal, within 650ms
    if (Math.abs(diffX) > 32 && Math.abs(diffX) > Math.abs(diffY) * 1.15 && elapsedTime < 650) {
      lastSwipeTime.current = Date.now();
      if (diffX > 0) {
        // Swiped left -> next photo
        nextImage();
      } else {
        // Swiped right -> prev photo
        prevImage();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleImageClick = () => {
    // If a swipe or finger drag occurred, or if recent touch movement happened, NEVER open zoom
    if (touchMoved.current || Date.now() - lastSwipeTime.current < 450) {
      return;
    }
    setIsZoomOpen(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isZoomOpen) {
        if (e.key === 'Escape') {
          setIsZoomOpen(false);
        } else if (e.key === 'ArrowRight') {
          nextImage();
        } else if (e.key === 'ArrowLeft') {
          prevImage();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomOpen, nextImage, prevImage]);

  // Lock body scroll when modal is open so the background page never scrolls or gestures behind it
  useEffect(() => {
    if (isZoomOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isZoomOpen]);

  const handleAddToCart = () => {
    if (!product) return;
    setIsAdding(true);
    addItem(product, 1);
    setTimeout(() => {
      setIsAdding(false);
      navigate('/carrinho');
    }, 400);
  };

  const handleBuyNow = () => {
    if (!product || product.stock === 0) return;
    
    // Direct Buy Now: Always reset cart so it contains ONLY this specific product!
    // This prevents any other product's payment link or items from bleeding into checkout.
    clearCart();
    addItem(product, 1);
    navigate('/checkout');
  };

  const handleShare = async () => {
    if (!product) return;
    const url = window.location.origin + '/produto/' + product.slug;
    const priceFormatted = product.price ? ` - ${formatCurrency(product.price)}` : '';
    const text = `Confira "${product.title}"${priceFormatted} no Acervo dos Antigos:\n${url}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: `${product.title}${priceFormatted}`, text, url });
      } catch (err) {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(url);
      setHasCopiedLink(true);
      setTimeout(() => setHasCopiedLink(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-zinc-950">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const whatsappNumber = formatWhatsAppNumber(settings?.whatsapp);

  if (!product) {
    const readableSlug = slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Peça';
    const whatsappFallbackUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Tentei acessar a peça "${readableSlug}" no site do Acervo dos Antigos. Essa peça ainda está disponível?`)}`;

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-zinc-950 text-white p-4 text-center">
        <AlertCircle size={48} className="text-orange-500 mb-4 animate-pulse" />
        <h2 className="text-xl md:text-2xl font-bold mb-2">Não conseguimos abrir este anúncio no momento</h2>
        <p className="text-zinc-400 mb-6 max-w-md text-sm md:text-base">
          Pode ser uma oscilação temporária na conexão ou o anúncio pode ter sido atualizado.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm mb-6">
          <button 
            onClick={() => loadData()}
            className="w-full flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-sm transition-colors text-sm"
          >
            <RotateCw size={16} className="mr-2" />
            Tentar novamente
          </button>
          
          <a 
            href={whatsappFallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-sm transition-colors text-sm shadow-md"
          >
            <MessageCircle size={16} className="mr-2" />
            Consultar no WhatsApp
          </a>
        </div>

        <Link to="/produtos" className="text-xs md:text-sm text-zinc-500 hover:text-orange-500 transition-colors">
          Ou ver todas as peças do catálogo
        </Link>
      </div>
    );
  }

  const productUrl = window.location.origin + '/produto/' + product.slug;
  const whatsappMsg = encodeURIComponent(`Olá! Olha essa peça que encontrei no Acervo dos Antigos:\n\n${product.title}\n\n${productUrl}`);

  const installmentValue = product.price > 0 ? (product.price / 12) : 0;
  const paymentMethods = product.payment_methods || ['PIX', 'Cartão de crédito'];

  return (
    <div className="bg-[#0B0D10] text-[#F5F5F5] py-6 md:py-12 pb-28 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb & Share */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <nav className="flex items-center text-xs md:text-sm text-[#A4ABB7] overflow-x-auto whitespace-nowrap scrollbar-none">
            <Link to="/" className="hover:text-white transition-colors">Início</Link>
            <ChevronRight size={14} className="mx-1 md:mx-2 shrink-0 text-[#2B303A]" />
            <Link to="/produtos" className="hover:text-white transition-colors">Catálogo</Link>
            <ChevronRight size={14} className="mx-1 md:mx-2 shrink-0 text-[#2B303A]" />
            <span className="text-[#F5F5F5] font-medium truncate max-w-[200px] md:max-w-xs" title={product.title}>{product.title}</span>
          </nav>
          <button 
            onClick={handleShare}
            className="flex items-center justify-center w-full sm:w-auto text-xs sm:text-sm text-[#A4ABB7] hover:text-white transition-colors bg-[#141820] border border-[#2B303A] hover:border-[#FF7048] px-3.5 py-2 rounded-sm shrink-0 cursor-pointer"
            title="Compartilhar Peça"
          >
            <Share2 size={15} className="mr-2 text-[#FF7048]" />
            Compartilhar Peça
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
          
          {/* Gallery Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <div 
              className="bg-[#141820] border border-[#2B303A] rounded-sm overflow-hidden aspect-square sm:aspect-4/3 relative mb-3 md:mb-4 group select-none cursor-pointer"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleImageClick}
            >
              {product.badge && (
                <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 bg-[#FF7048] text-white text-[10px] md:text-xs font-bold px-2.5 py-1 tracking-wider rounded-sm shadow-md uppercase">
                  {product.badge}
                </div>
              )}

              {/* Photo Counter Badge */}
              {productImages.length > 1 && (
                <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10 bg-[#0B0D10]/80 backdrop-blur-md text-white text-[11px] font-mono font-semibold px-2.5 py-1 rounded-sm border border-[#2B303A] shadow-md pointer-events-none">
                  {selectedImage + 1} / {productImages.length}
                </div>
              )}

              {/* Left Arrow Button (Prev) */}
              {productImages.length > 1 && (
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    prevImage(); 
                  }}
                  className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 bg-[#0B0D10]/85 hover:bg-[#FF7048] active:scale-90 text-white rounded-full border border-[#2B303A] shadow-2xl flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Foto anterior"
                  title="Foto anterior"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {/* Main Image */}
              <img 
                src={productImages[selectedImage]} 
                alt={product.title} 
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                className="w-full h-full object-contain pointer-events-none select-none"
              />

              {/* Right Arrow Button (Next) */}
              {productImages.length > 1 && (
                <button 
                  type="button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    nextImage(); 
                  }}
                  className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 bg-[#0B0D10]/85 hover:bg-[#FF7048] active:scale-90 text-white rounded-full border border-[#2B303A] shadow-2xl flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Próxima foto"
                  title="Próxima foto"
                >
                  <ChevronRight size={22} />
                </button>
              )}

              {/* Zoom In Indicator Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomOpen(true);
                }}
                className="absolute bottom-2.5 right-2.5 z-20 bg-[#0B0D10]/85 hover:bg-[#141820] active:scale-95 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-sm border border-[#2B303A] flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                title="Clique para ampliar"
              >
                <ZoomIn size={14} className="text-[#FF7048]" />
                <span className="hidden sm:inline">Ampliar Foto</span>
              </button>
            </div>
            
            {/* Thumbnails */}
            {productImages.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3">
                {productImages.map((img, idx) => (
                  <button 
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      "aspect-square rounded-sm overflow-hidden border-2 transition-all cursor-pointer bg-[#141820]",
                      selectedImage === idx ? "border-[#FF7048] opacity-100 scale-102" : "border-[#2B303A] opacity-60 hover:opacity-100"
                    )}
                  >
                    <img 
                      src={img} 
                      alt={`Miniatura ${idx + 1}`} 
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                      className="w-full h-full object-cover select-none pointer-events-none" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="mb-5 md:mb-6">
              <h1 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-[#F5F5F5] leading-tight mb-3 md:mb-4">
                {product.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="text-[#FF7048] bg-[#FF7048]/10 px-2.5 py-1 rounded-sm border border-[#FF7048]/25 uppercase">
                  Condição: {product.condition}
                </span>
                {product.vehicle && (
                  <span className="text-[#F5F5F5] bg-[#141820] px-2.5 py-1 rounded-sm border border-[#2B303A]">
                    {product.vehicle}
                  </span>
                )}
                <span className={cn(
                  "px-2.5 py-1 rounded-sm border",
                  product.stock > 0 
                    ? "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10" 
                    : "text-red-400 border-red-400/20 bg-red-400/10"
                )}>
                  {product.stock > 0 ? `${product.stock} em estoque` : 'Esgotado'}
                </span>
              </div>
            </div>

            <div className="bg-[#141820] border border-[#2B303A] p-5 rounded-sm mb-6">
              {product.previous_price && product.previous_price > product.price && (
                <div className="text-[#A4ABB7] line-through text-xs md:text-sm mb-1">
                  {formatCurrency(product.previous_price)}
                </div>
              )}
              <div className="font-display font-bold text-3xl md:text-4xl text-[#F5F5F5] tracking-tight">
                {formatCurrency(product.price)}
              </div>
              
              {installmentValue > 0 && paymentMethods.includes('Cartão de crédito') && (
                <div className="text-[#10B981] font-semibold text-xs md:text-sm mt-2 flex items-center gap-1.5">
                  <CreditCard size={15} />
                  <span>Em até 12x de {formatCurrency(installmentValue)} no cartão</span>
                </div>
              )}
              
              <div className="mt-3.5 pt-3.5 border-t border-[#2B303A]/70 flex gap-2 flex-wrap text-xs text-[#A4ABB7]">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  PIX Instantâneo
                </span>
                <span aria-hidden="true">·</span>
                <span>Cartão em até 12x</span>
                <span aria-hidden="true">·</span>
                <span>Checkout Direto</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 mb-8">
              <div className="hidden md:block">
                <button 
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="w-full py-4 px-6 bg-[#FF7048] hover:bg-[#ff5d30] disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-sm transition-all flex items-center justify-center text-base uppercase tracking-wider mb-3 shadow-[0_4px_25px_rgba(255,112,72,0.35)] cursor-pointer"
                >
                  <ShoppingBag size={20} className="mr-2" />
                  {product.stock === 0 ? 'Produto Esgotado' : 'Comprar Agora'}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2.5">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(productUrl);
                    setHasCopiedLink(true);
                    setTimeout(() => setHasCopiedLink(false), 2500);
                  }}
                  className="py-3 px-3.5 bg-[#141820] border border-[#2B303A] hover:border-[#FF7048] text-[#F5F5F5] font-semibold rounded-sm transition-colors text-xs flex items-center justify-center cursor-pointer"
                >
                  {hasCopiedLink ? (
                    <span className="text-[#10B981] flex items-center">
                      <Check size={15} className="mr-1.5" /> Link Copiado!
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Copy size={15} className="mr-1.5 text-[#FF7048]" /> Copiar Link
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => isFavorite(product.id) ? removeFavorite(product.id) : addFavorite(product)}
                  className="py-3 px-3.5 bg-[#141820] border border-[#2B303A] hover:border-[#FF7048] text-[#F5F5F5] font-semibold rounded-sm transition-colors text-xs flex items-center justify-center cursor-pointer group"
                >
                  <Heart size={15} className={cn("mr-1.5 transition-colors", isFavorite(product.id) ? "fill-[#FF7048] text-[#FF7048]" : "text-[#A4ABB7] group-hover:text-[#FF7048]")} /> 
                  {isFavorite(product.id) ? 'Favoritado' : 'Favoritar'}
                </button>
              </div>

              <a 
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex w-full py-3.5 px-6 bg-transparent border border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-white font-semibold rounded-sm transition-all items-center justify-center mt-3 cursor-pointer"
              >
                <MessageCircle size={19} className="mr-2" />
                Tirar Dúvidas pelo WhatsApp
              </a>
            </div>

            {/* Technical Specifications */}
            <div className="bg-[#141820] border border-[#2B303A] p-5 rounded-sm">
              <h3 className="font-bold text-white uppercase tracking-wider text-xs mb-4 flex items-center">
                <Info size={15} className="text-[#FF7048] mr-2" />
                Ficha Técnica & Compatibilidade
              </h3>
              
              <dl className="space-y-3 text-xs">
                <div className="grid grid-cols-3 py-1 border-b border-[#2B303A]/40">
                  <dt className="text-[#A4ABB7]">Condição</dt>
                  <dd className="col-span-2 text-[#F5F5F5] font-medium">{product.condition}</dd>
                </div>
                {product.vehicle && (
                  <div className="grid grid-cols-3 py-1 border-b border-[#2B303A]/40">
                    <dt className="text-[#A4ABB7]">Veículo</dt>
                    <dd className="col-span-2 text-[#F5F5F5] font-medium">{product.vehicle}</dd>
                  </div>
                )}
                {product.part_code && (
                  <div className="grid grid-cols-3 py-1 border-b border-[#2B303A]/40">
                    <dt className="text-[#A4ABB7]">Cód. Peça</dt>
                    <dd className="col-span-2 text-[#F5F5F5] font-mono font-medium">{product.part_code}</dd>
                  </div>
                )}
                {product.compatibility && (
                  <div className="grid grid-cols-3 py-1">
                    <dt className="text-[#A4ABB7]">Compatibilidade</dt>
                    <dd className="col-span-2 text-[#F5F5F5] font-medium leading-relaxed">{product.compatibility}</dd>
                  </div>
                )}
              </dl>
            </div>
            
            {/* Security Guarantee Box */}
            <div className="mt-5 flex flex-col space-y-2.5 text-xs text-[#A4ABB7] border border-[#2B303A] bg-[#141820]/60 p-4 rounded-sm">
              <div className="flex items-center">
                <ShieldCheck size={16} className="text-[#FF7048] mr-2.5 shrink-0" />
                Compra segura processada com proteção total ao cliente.
              </div>
              <div className="flex items-center">
                <Truck size={16} className="text-[#FF7048] mr-2.5 shrink-0" />
                Despachamos em até 2 dias úteis via transportadora (Rodonaves/Jadlog/Correios).
              </div>
            </div>

          </div>
        </div>

        {/* Detailed Description */}
        {product.description && (
          <div className="mt-12 md:mt-16 pt-8 md:pt-12 border-t border-[#2B303A]">
            <h2 className="font-display font-bold text-xl md:text-2xl text-[#F5F5F5] mb-4">Descrição Detalhada</h2>
            <div className="bg-[#141820] border border-[#2B303A] p-6 rounded-sm text-sm sm:text-base text-[#A4ABB7] leading-relaxed whitespace-pre-wrap">
              {product.description}
            </div>
          </div>
        )}
        
      </div>

      {/* MOBILE STICKY BUY BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0D10]/95 backdrop-blur-md border-t border-[#2B303A] p-3 shadow-[0_-4px_25px_rgba(0,0,0,0.8)]">
        <div className="flex gap-2">
          <button 
            onClick={handleBuyNow}
            disabled={product.stock === 0}
            className="flex-1 py-3 px-3 bg-[#FF7048] hover:bg-[#ff5d30] disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-sm flex items-center justify-center text-sm shadow-md cursor-pointer"
          >
            <ShoppingBag size={18} className="mr-2" />
            {product.stock === 0 ? 'Esgotado' : 'Comprar Agora'}
          </button>
          <a 
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 flex-shrink-0 bg-[#10B981] hover:bg-emerald-600 text-white rounded-sm flex items-center justify-center cursor-pointer"
            aria-label="WhatsApp"
          >
            <MessageCircle size={22} />
          </a>
        </div>
      </div>

      {/* FULLSCREEN IN-APP ZOOM LIGHTBOX (NO SUPABASE URL, NO EXTERNAL TAB, PROMINENT CLOSE BUTTON) */}
      {isZoomOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col select-none animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          {/* Header Bar */}
          <div 
            className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 pr-4 truncate">
              <h3 className="text-white font-semibold text-sm sm:text-base truncate">{product.title}</h3>
              <p className="text-zinc-400 text-xs mt-0.5">
                Foto {selectedImage + 1} de {productImages.length} • Deslize ou use as setas para navegar
              </p>
            </div>

            <button 
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-red-400/50 transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-xl"
              title="Fechar zoom (Esc)"
              aria-label="Fechar zoom"
            >
              <X size={20} className="shrink-0" />
              <span>Fechar</span>
            </button>
          </div>

          {/* Main Zoom Display with Touch Swipe & Arrow Controls */}
          <div 
            className="flex-1 relative flex items-center justify-center p-2 sm:p-6 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {productImages.length > 1 && (
              <button 
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  prevImage(); 
                }}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-50 w-13 h-13 sm:w-16 sm:h-16 bg-black/85 hover:bg-black active:scale-90 text-white rounded-full border-2 border-white/30 shadow-2xl flex items-center justify-center transition-all cursor-pointer"
                aria-label="Foto anterior"
                title="Foto anterior"
              >
                <ChevronLeft size={32} />
              </button>
            )}

            <img 
              src={productImages[selectedImage]} 
              alt={product.title} 
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
              className="max-w-[88vw] max-h-[72vh] sm:max-h-[76vh] object-contain shadow-2xl rounded-sm select-none"
              onClick={(e) => e.stopPropagation()}
            />

            {productImages.length > 1 && (
              <button 
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  nextImage(); 
                }}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-50 w-13 h-13 sm:w-16 sm:h-16 bg-black/85 hover:bg-black active:scale-90 text-white rounded-full border-2 border-white/30 shadow-2xl flex items-center justify-center transition-all cursor-pointer"
                aria-label="Próxima foto"
                title="Próxima foto"
              >
                <ChevronRight size={32} />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails */}
          {productImages.length > 1 && (
            <div 
              className="p-3 sm:p-4 bg-zinc-950/80 border-t border-zinc-800/80 overflow-x-auto flex justify-center gap-2 sm:gap-3 shrink-0 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {productImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  className={cn(
                    "w-12 h-12 sm:w-16 sm:h-16 rounded-sm overflow-hidden border-2 transition-all shrink-0 cursor-pointer",
                    selectedImage === idx ? "border-orange-500 scale-105" : "border-zinc-800 opacity-60 hover:opacity-100"
                  )}
                >
                  <img 
                    src={img} 
                    alt={`Miniatura ${idx + 1}`} 
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                    className="w-full h-full object-cover select-none pointer-events-none" 
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
