import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Truck, 
  ShieldCheck, 
  CreditCard, 
  Wrench, 
  ArrowRight, 
  MessageCircle, 
  AlertCircle, 
  Star,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { formatWhatsAppNumber } from '../lib/utils';
import { getHomeData } from '../lib/api';
import ProductCard from '../components/ProductCard';
import type { Product, Banner, Feedback, SiteSettings } from '../types';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const bundle = await getHomeData();
        setProducts(bundle.products);
        setBanners(bundle.banners);
        setFeedbacks(bundle.feedbacks);
        setSettings(bundle.settings);
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Visual Categories with high quality, distinct representative photography
  const categories = [
    { 
      name: 'Chevrolet Opala', 
      slug: 'opala', 
      tagline: 'Coupê, Sedan e Caravan',
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800' 
    },
    { 
      name: 'Chevrolet Omega', 
      slug: 'omega', 
      tagline: 'GLS, CD e Suprema',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800' 
    },
    { 
      name: 'VW Gol Quadrado', 
      slug: 'gol-quadrado', 
      tagline: 'GTS, GTI, CL e GL',
      image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800' 
    },
    { 
      name: 'Fusca', 
      slug: 'fusca', 
      tagline: 'Linha Aircooled & Clássicos',
      image: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&q=80&w=800' 
    },
    { 
      name: 'Ford Corcel', 
      slug: 'corcel', 
      tagline: 'Corcel I, II e Belina',
      image: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80&w=800' 
    },
    { 
      name: 'Bicicletas & Raridades', 
      slug: 'bicicletas', 
      tagline: 'Monark, Caloi e Itens de Época',
      image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=800' 
    },
  ];

  const isCtaBanner = (b: Banner) => 
    b.link === '#cta' || 
    b.link === '#rodape' || 
    b.mobile_image_url === 'rodape' ||
    b.mobile_image_url === '#cta' ||
    b.link?.toLowerCase().includes('cta') ||
    b.link?.toLowerCase().includes('rodape') ||
    b.title?.toLowerCase().includes('ajuda') ||
    b.title?.toLowerCase().includes('rodape') ||
    b.title?.toLowerCase().includes('rodapé') ||
    b.subtitle?.toLowerCase().includes('ajuda');

  const ctaBanner = banners.find(isCtaBanner) || (banners.length > 1 ? banners[banners.length - 1] : null);
  const mainBanners = banners.filter(b => b.id !== ctaBanner?.id);
  const mainBanner = mainBanners.length > 0 ? mainBanners[0] : null;

  // Cinematic high-contrast automotive photograph
  const bannerImage = mainBanner?.desktop_image_url || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=85&w=2400";
  const bannerLink = mainBanner?.link || "/produtos";
  
  const ctaTitle = ctaBanner?.title || "PRECISA DE UMA PEÇA RARA OU ESPECÍFICA?";
  const ctaSubtitle = ctaBanner?.subtitle || "Consulte os especialistas da Acervo dos Antigos. Temos um estoque dinâmico com componentes originais e peças de lote ainda não catalogadas.";
  const ctaBtnText = ctaBanner?.button_text || "CONSULTAR PELO WHATSAPP";
  
  const whatsappNumber = formatWhatsAppNumber(settings?.whatsapp);

  const ctaButtonHref = (ctaBanner?.link && ctaBanner.link !== '#cta' && ctaBanner.link !== '#rodape')
    ? ctaBanner.link
    : `https://wa.me/${whatsappNumber}?text=Olá!%20Procuro%20uma%20peça%20específica%20na%20Acervo%20dos%20Antigos.`;

  return (
    <div className="flex flex-col bg-[#0B0D10] text-[#F5F5F5]">
      
      {/* 1. HERO — Primeira Impressão */}
      <section className="relative min-h-[520px] sm:min-h-[580px] lg:min-h-[640px] w-full bg-[#0B0D10] flex items-center overflow-hidden border-b border-[#2B303A]">
        {/* Cinematic Automotive Backdrop */}
        <div className="absolute inset-0 z-0">
          <img 
            src={bannerImage} 
            alt="Carro clássico Acervo dos Antigos" 
            className="w-full h-full object-cover object-center scale-100 filter brightness-90 contrast-110"
          />
          {/* Subtle architectural gradient for text legibility without burying the vehicle */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] via-[#0B0D10]/75 to-[#0B0D10]/30 sm:bg-gradient-to-r sm:from-[#0B0D10] sm:via-[#0B0D10]/85 sm:to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,112,72,0.08),transparent_70%)] pointer-events-none" />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16 sm:py-24">
          <div className="max-w-2xl">
            
            {/* Clean Typographic Tagline (Anti-Slop: Zero Pill) */}
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-widest text-[#FF7048] uppercase mb-4 sm:mb-6">
              <span>PEÇAS CLÁSSICAS</span>
              <span aria-hidden="true">·</span>
              <span>ORIGINALIDADE</span>
              <span aria-hidden="true">·</span>
              <span>HISTÓRIA</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display font-bold text-3xl sm:text-5xl lg:text-6xl text-[#F5F5F5] tracking-tight leading-[1.08] mb-5 sm:mb-6">
              PEÇAS CLÁSSICAS.<br />
              <span className="text-[#FF7048]">MÁQUINAS ETERNAS.</span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base lg:text-lg text-[#A4ABB7] mb-8 sm:mb-10 max-w-xl leading-relaxed">
              Encontre peças originais, raridades e componentes selecionados para manter viva a história dos grandes automóveis.
            </p>

            {/* Primary Action Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <Link 
                to={bannerLink} 
                className="inline-flex items-center justify-center px-7 py-3.5 sm:py-4 text-sm font-bold tracking-wide uppercase text-white bg-[#FF7048] hover:bg-[#ff5d30] rounded-sm transition-all shadow-[0_4px_20px_rgba(255,112,72,0.3)] hover:shadow-[0_6px_25px_rgba(255,112,72,0.45)] group cursor-pointer"
              >
                <span>Explorar Catálogo</span>
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Link>

              <Link
                to="/como-comprar"
                className="inline-flex items-center justify-center px-6 py-3.5 sm:py-4 text-sm font-semibold text-[#F5F5F5] bg-[#141820]/80 hover:bg-[#1B2029] border border-[#2B303A] hover:border-[#FF7048]/50 rounded-sm transition-all text-center"
              >
                Como Comprar
              </Link>
            </div>

            {/* Verified Highlights */}
            <div className="mt-10 sm:mt-12 pt-6 border-t border-[#2B303A]/70 flex flex-wrap items-center gap-6 text-xs text-[#A4ABB7]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span className="text-[#F5F5F5] font-medium">Catálogo Real & Atualizado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF7048]" />
                <span className="text-[#F5F5F5] font-medium">Envio Rodonaves & Jadlog</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span className="text-[#F5F5F5] font-medium">Suporte Direto via WhatsApp</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. BENEFÍCIOS E CONFIANÇA */}
      <section className="border-b border-[#2B303A] bg-[#141820] py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            <div className="flex items-start p-4 rounded-sm bg-[#1B2029]/70 border border-[#2B303A] transition-colors hover:border-[#FF7048]/40">
              <ShieldCheck className="text-[#FF7048] w-7 h-7 sm:w-8 sm:h-8 shrink-0 mr-3.5 mt-0.5" />
              <div>
                <h3 className="font-bold text-[#F5F5F5] text-sm">Compra Segura</h3>
                <p className="text-xs text-[#A4ABB7] mt-1 leading-relaxed">Ambiente protegido e transações 100% criptografadas.</p>
              </div>
            </div>

            <div className="flex items-start p-4 rounded-sm bg-[#1B2029]/70 border border-[#2B303A] transition-colors hover:border-[#FF7048]/40">
              <CreditCard className="text-[#FF7048] w-7 h-7 sm:w-8 sm:h-8 shrink-0 mr-3.5 mt-0.5" />
              <div>
                <h3 className="font-bold text-[#F5F5F5] text-sm">PIX e Cartão</h3>
                <p className="text-xs text-[#A4ABB7] mt-1 leading-relaxed">Aprovação imediata via PIX ou parcele em até 12x.</p>
              </div>
            </div>

            <div className="flex items-start p-4 rounded-sm bg-[#1B2029]/70 border border-[#2B303A] transition-colors hover:border-[#FF7048]/40">
              <Truck className="text-[#FF7048] w-7 h-7 sm:w-8 sm:h-8 shrink-0 mr-3.5 mt-0.5" />
              <div>
                <h3 className="font-bold text-[#F5F5F5] text-sm">Envio Especializado</h3>
                <p className="text-xs text-[#A4ABB7] mt-1 leading-relaxed">Embalagens reforçadas com Rodonaves, Jadlog e Correios.</p>
              </div>
            </div>

            <div className="flex items-start p-4 rounded-sm bg-[#1B2029]/70 border border-[#2B303A] transition-colors hover:border-[#FF7048]/40">
              <Wrench className="text-[#FF7048] w-7 h-7 sm:w-8 sm:h-8 shrink-0 mr-3.5 mt-0.5" />
              <div>
                <h3 className="font-bold text-[#F5F5F5] text-sm">Curadoria Técnica</h3>
                <p className="text-xs text-[#A4ABB7] mt-1 leading-relaxed">Componentes selecionados e fotos reais de cada peça.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. CATEGORIAS COM IDENTIDADE VISUAL */}
      <section className="py-16 sm:py-20 bg-[#0B0D10] border-b border-[#2B303A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 sm:mb-12 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#FF7048] uppercase tracking-wider mb-2">
                <Sparkles size={14} />
                <span>Navegação por Modelo</span>
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#F5F5F5] tracking-tight">
                Categorias em Destaque
              </h2>
              <p className="text-sm text-[#A4ABB7] mt-1.5">
                Selecione seu modelo para acessar peças compatíveis e originais.
              </p>
            </div>

            <Link 
              to="/produtos" 
              className="text-xs sm:text-sm font-semibold text-[#FF7048] hover:text-white flex items-center transition-colors group"
            >
              <span>Ver todas as categorias</span>
              <ArrowRight size={16} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {categories.map((category) => (
              <Link 
                key={category.slug} 
                to={`/categoria/${category.slug}`}
                className="group relative h-48 sm:h-56 rounded-sm overflow-hidden flex flex-col justify-end p-3.5 sm:p-4 bg-[#141820] border border-[#2B303A] hover:border-[#FF7048]/70 transition-all duration-300 hover:shadow-[0_8px_25px_rgba(0,0,0,0.6)]"
              >
                {/* Background Photography */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <img 
                    src={category.image} 
                    alt={category.name}
                    loading="lazy"
                    className="w-full h-full object-cover object-center filter brightness-90 group-hover:scale-108 transition-transform duration-700 ease-out" 
                  />
                  {/* Subtle dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] via-[#0B0D10]/60 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />
                  <div className="absolute inset-0 border border-inset border-white/5 pointer-events-none" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <span className="text-[10px] text-[#A4ABB7] block line-clamp-1 mb-1">
                    {category.tagline}
                  </span>
                  <h3 className="font-display font-bold text-sm sm:text-base text-[#F5F5F5] group-hover:text-[#FF7048] transition-colors leading-snug">
                    {category.name}
                  </h3>
                  <div className="mt-2 flex items-center text-[10px] font-semibold text-[#FF7048] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Ver peças</span>
                    <ArrowUpRight size={12} className="ml-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* 4. VITRINE DE PRODUTOS — Destaques do Acervo */}
      <section className="py-16 sm:py-24 bg-[#0B0D10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 sm:mb-12 gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#FF7048] uppercase tracking-wider mb-2">
                <span>Garagem Ativa</span>
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-[#F5F5F5] tracking-tight">
                Peças em Destaque
              </h2>
              <p className="text-sm text-[#A4ABB7] mt-1.5">
                Componentes autênticos, revisados e prontos para envio imediato.
              </p>
            </div>

            <Link 
              to="/produtos" 
              className="text-xs sm:text-sm font-semibold text-[#FF7048] hover:text-white flex items-center transition-colors group"
            >
              <span>Explorar todo o acervo ({products.length} itens)</span>
              <ArrowRight size={16} className="ml-1.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 py-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-[#141820] border border-[#2B303A] rounded-sm p-4 animate-pulse h-80 flex flex-col justify-between">
                  <div className="aspect-square bg-[#1B2029] rounded-sm mb-4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-[#1B2029] rounded w-2/3" />
                    <div className="h-4 bg-[#1B2029] rounded w-full" />
                    <div className="h-5 bg-[#1B2029] rounded w-1/2 pt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-[#141820] border border-[#2B303A] rounded-sm p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
              <AlertCircle size={44} className="text-[#FF7048] mb-4" />
              <h3 className="text-lg font-bold text-[#F5F5F5] mb-2">Catálogo em fase de catalogação</h3>
              <p className="text-sm text-[#A4ABB7] mb-6">Estamos cadastrando novas peças no sistema. Fale com nosso atendimento pelo WhatsApp para verificar itens em estoque físico.</p>
              <a
                href={ctaButtonHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-[#FF7048] text-white text-xs font-bold uppercase rounded-sm hover:bg-[#ff5d30] transition-colors"
              >
                <MessageCircle size={16} className="mr-2" />
                Falar com a Garagem
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          
          <div className="mt-12 sm:mt-16 text-center">
            <Link 
              to="/produtos"
              className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 border border-[#2B303A] hover:border-[#FF7048] text-[#F5F5F5] hover:text-[#FF7048] bg-[#141820] font-semibold text-sm rounded-sm transition-all"
            >
              <span>Ver Catálogo Completo com Filtros</span>
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>

        </div>
      </section>

      {/* 5. FEEDBACKS / DEPOIMENTOS DE CLIENTES */}
      {!isLoading && feedbacks.length > 0 && (
        <section className="py-16 sm:py-20 bg-[#141820] border-t border-[#2B303A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center max-w-xl mx-auto">
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#F5F5F5]">
                Depoimentos da Comunidade
              </h2>
              <p className="text-sm text-[#A4ABB7] mt-2">
                A experiência de colecionadores e restauradores que confiam na Acervo dos Antigos.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="bg-[#1B2029] border border-[#2B303A] p-6 sm:p-7 rounded-sm flex flex-col justify-between">
                  <div>
                    <div className="flex text-[#FF7048] mb-4 gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={15} className={i < (fb.rating || 5) ? "fill-[#FF7048]" : "text-[#2B303A]"} />
                      ))}
                    </div>
                    <p className="text-sm text-[#F5F5F5] italic leading-relaxed mb-6">
                      "{fb.text}"
                    </p>
                  </div>
                  <div className="flex items-center pt-4 border-t border-[#2B303A]/60">
                    <div className="w-9 h-9 bg-[#141820] border border-[#2B303A] rounded-full overflow-hidden mr-3 shrink-0 flex items-center justify-center text-xs font-bold text-[#FF7048]">
                      {fb.photo_url ? (
                        <img src={fb.photo_url} alt={fb.name} className="w-full h-full object-cover" />
                      ) : (
                        fb.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F5F5F5]">{fb.name}</h4>
                      {fb.vehicle && <p className="text-xs text-[#A4ABB7]">{fb.vehicle}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* 6. CONTATO & ATENDIMENTO ESPECIALIZADO */}
      <section className="py-16 sm:py-20 relative overflow-hidden bg-[#141820] border-t border-[#2B303A]">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <span className="text-xs font-bold text-[#FF7048] uppercase tracking-widest mb-3 block">
            ATENDIMENTO PERSONALIZADO
          </span>
          <h2 className="font-display font-bold text-2xl sm:text-4xl text-[#F5F5F5] mb-4">
            {ctaTitle}
          </h2>
          <p className="text-sm sm:text-base text-[#A4ABB7] mb-8 max-w-2xl mx-auto leading-relaxed">
            {ctaSubtitle}
          </p>
          <a 
            href={ctaButtonHref}
            target={ctaButtonHref.startsWith('http') ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#FF7048] hover:bg-[#ff5d30] text-white font-bold text-sm uppercase tracking-wide rounded-sm transition-all shadow-[0_4px_25px_rgba(255,112,72,0.35)] cursor-pointer"
          >
            <MessageCircle className="mr-2" size={19} />
            {ctaBtnText}
          </a>
        </div>
      </section>

    </div>
  );
}
