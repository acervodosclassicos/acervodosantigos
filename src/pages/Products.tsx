import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Filter, ChevronDown, Search, ArrowLeft, X, SlidersHorizontal } from 'lucide-react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { setLocalCache } from '../lib/api';
import ProductCard from '../components/ProductCard';
import type { Product, Category } from '../types';

const PREDEFINED_CATEGORIES = [
  { slug: 'opala', name: 'Chevrolet Opala', match: ['opala'] },
  { slug: 'omega', name: 'Chevrolet Omega', match: ['omega', 'suprema'] },
  { slug: 'gol-quadrado', name: 'VW Gol Quadrado', match: ['gol'] },
  { slug: 'fusca', name: 'Fusca', match: ['fusca', 'beetle'] },
  { slug: 'corcel', name: 'Ford Corcel', match: ['corcel', 'belina'] },
  { slug: 'bicicletas', name: 'Bicicletas & Antiguidades', match: ['bicicleta', 'antigo', 'antiga', 'baleiro'] },
];

export default function Products() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'recentes' | 'menor-preco' | 'maior-preco'>('recentes');
  const [conditionFilter, setConditionFilter] = useState<'todos' | 'novo' | 'usado'>('todos');

  useEffect(() => {
    async function fetchData() {
      if (!hasSupabaseConfig) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch categories from DB
        const { data: catData } = await supabase.from('categories').select('*').eq('is_active', true);
        if (catData && catData.length > 0) {
          setCategories(catData);
        }

        // Fetch products
        let query = supabase
          .from('products')
          .select('*, images:product_images(*), category:categories(*)')
          .in('status', ['ativo', 'esgotado'])
          .order('created_at', { ascending: false });

        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,vehicle.ilike.%${searchQuery}%,part_code.ilike.%${searchQuery}%`);
        }

        const { data: prodData, error } = await query;
        if (error) throw error;

        const prods = (prodData || []) as Product[];
        setProducts(prods);
        
        // Cache for instant navigation
        prods.forEach((p) => {
          if (p.slug) {
            setLocalCache(`product_${p.slug}`, p, 15 * 60 * 1000);
          }
        });
      } catch (err) {
        console.error('Error fetching catalog data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [searchQuery]);

  // Determine current active category title and description
  const activeCategoryInfo = useMemo(() => {
    if (!slug) return null;
    const dbCat = categories.find(c => c.slug === slug);
    if (dbCat) return { name: dbCat.name, description: dbCat.description };
    const predefined = PREDEFINED_CATEGORIES.find(c => c.slug === slug);
    if (predefined) return { name: predefined.name, description: `Peças originais e componentes selecionados para ${predefined.name}.` };
    return { name: slug.toUpperCase(), description: 'Peças selecionadas para este modelo.' };
  }, [slug, categories]);

  // Filter products by category slug and condition
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by category slug if present
    if (slug) {
      const predefined = PREDEFINED_CATEGORIES.find(c => c.slug === slug);
      result = result.filter((p) => {
        // 1. Direct category slug match
        if (p.category?.slug === slug) return true;

        // 2. Predefined keyword matching on vehicle, title, description
        if (predefined) {
          const haystack = `${p.vehicle || ''} ${p.title || ''} ${p.description || ''}`.toLowerCase();
          return predefined.match.some(keyword => haystack.includes(keyword));
        }

        // 3. Fallback check: slug included in vehicle or title
        const cleanSlug = slug.replace(/-/g, ' ').toLowerCase();
        const haystack = `${p.vehicle || ''} ${p.title || ''}`.toLowerCase();
        return haystack.includes(cleanSlug);
      });
    }

    // Filter by condition
    if (conditionFilter !== 'todos') {
      result = result.filter(p => {
        const cond = (p.condition || '').toLowerCase();
        if (conditionFilter === 'novo') return cond.includes('novo') || cond.includes('nova');
        if (conditionFilter === 'usado') return cond.includes('usad') || cond.includes('restaurad');
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'menor-preco') return a.price - b.price;
      if (sortBy === 'maior-preco') return b.price - a.price;
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });

    return result;
  }, [products, slug, conditionFilter, sortBy]);

  return (
    <div className="bg-[#0B0D10] text-[#F5F5F5] min-h-screen py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header / Breadcrumb */}
        <div className="mb-8 border-b border-[#2B303A] pb-6 sm:pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#A4ABB7] mb-2">
              <Link to="/" className="hover:text-white transition-colors">Início</Link>
              <span>/</span>
              <span className="text-[#F5F5F5] font-medium">
                {searchQuery ? 'Busca' : slug ? activeCategoryInfo?.name : 'Catálogo Completo'}
              </span>
            </div>

            <h1 className="font-display font-bold text-2xl sm:text-4xl text-[#F5F5F5] tracking-tight">
              {searchQuery 
                ? `Resultados para "${searchQuery}"` 
                : activeCategoryInfo 
                  ? activeCategoryInfo.name 
                  : 'Catálogo de Peças Clássicas'}
            </h1>

            <p className="text-xs sm:text-sm text-[#A4ABB7] mt-1.5 max-w-2xl">
              {activeCategoryInfo?.description || 'Explore peças originais, componentes de época e itens raros para seu veículo.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#A4ABB7] font-medium">
              Mostrando <strong className="text-white">{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Mobile Filters Toggle Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button 
              className="flex-1 flex items-center justify-between p-3.5 bg-[#141820] border border-[#2B303A] rounded-sm text-sm font-semibold text-[#F5F5F5] cursor-pointer"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-[#FF7048]" />
                Filtrar por Categoria e Condição
              </span>
              <ChevronDown size={16} className={`transition-transform ${isMobileFiltersOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Sidebar / Filters */}
          <aside className={`${isMobileFiltersOpen ? 'block' : 'hidden'} lg:block w-full lg:w-72 shrink-0`}>
            <div className="bg-[#141820] border border-[#2B303A] rounded-sm p-5 sm:p-6 space-y-6 lg:sticky lg:top-28">
              
              {/* Category Links */}
              <div>
                <h3 className="text-xs font-bold text-[#FF7048] uppercase tracking-wider mb-3">
                  Categorias Principais
                </h3>
                <ul className="space-y-1 text-sm">
                  <li>
                    <Link 
                      to="/produtos" 
                      onClick={() => setIsMobileFiltersOpen(false)}
                      className={`block py-2 px-3 rounded-sm transition-all ${
                        !slug && !searchQuery 
                          ? 'bg-[#1B2029] text-white font-bold border-l-2 border-[#FF7048]' 
                          : 'text-[#A4ABB7] hover:text-white hover:bg-[#1B2029]/50'
                      }`}
                    >
                      Todas as Peças
                    </Link>
                  </li>
                  {PREDEFINED_CATEGORIES.map(cat => (
                    <li key={cat.slug}>
                      <Link 
                        to={`/categoria/${cat.slug}`}
                        onClick={() => setIsMobileFiltersOpen(false)}
                        className={`block py-2 px-3 rounded-sm transition-all ${
                          slug === cat.slug 
                            ? 'bg-[#1B2029] text-white font-bold border-l-2 border-[#FF7048]' 
                            : 'text-[#A4ABB7] hover:text-white hover:bg-[#1B2029]/50'
                        }`}
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Condition Filter */}
              <div className="pt-5 border-t border-[#2B303A]">
                <h3 className="text-xs font-bold text-[#FF7048] uppercase tracking-wider mb-3">
                  Condição da Peça
                </h3>
                <div className="flex flex-col gap-1.5 text-xs">
                  {[
                    { id: 'todos', label: 'Todas as condições' },
                    { id: 'usado', label: 'Usadas / Originais' },
                    { id: 'novo', label: 'Novas de Estoque Antigo (NOS)' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setConditionFilter(c.id as any)}
                      className={`text-left py-1.5 px-3 rounded-sm transition-all cursor-pointer ${
                        conditionFilter === c.id 
                          ? 'bg-[#1B2029] text-white font-bold border border-[#FF7048]/50' 
                          : 'text-[#A4ABB7] hover:text-white hover:bg-[#1B2029]/50'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sorting Filter */}
              <div className="pt-5 border-t border-[#2B303A]">
                <h3 className="text-xs font-bold text-[#FF7048] uppercase tracking-wider mb-2">
                  Ordenação
                </h3>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-[#0B0D10] border border-[#2B303A] text-[#F5F5F5] rounded-sm py-2 px-3 focus:outline-none focus:border-[#FF7048] text-xs cursor-pointer"
                >
                  <option value="recentes">Mais recentes</option>
                  <option value="menor-preco">Menor preço</option>
                  <option value="maior-preco">Maior preço</option>
                </select>
              </div>

              {/* Reset active filters */}
              {(slug || searchQuery || conditionFilter !== 'todos') && (
                <div className="pt-4 border-t border-[#2B303A]">
                  <Link 
                    to="/produtos"
                    onClick={() => {
                      setConditionFilter('todos');
                      setIsMobileFiltersOpen(false);
                    }}
                    className="w-full flex items-center justify-center py-2 px-3 text-xs text-[#A4ABB7] hover:text-white bg-[#0B0D10] border border-[#2B303A] hover:border-[#FF7048] rounded-sm transition-all"
                  >
                    <X size={13} className="mr-1.5" />
                    Limpar Todos os Filtros
                  </Link>
                </div>
              )}

            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
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
            ) : filteredProducts.length === 0 ? (
              <div className="bg-[#141820] border border-[#2B303A] rounded-sm p-8 sm:p-14 text-center flex flex-col items-center justify-center">
                <Search size={44} className="text-[#A4ABB7]/60 mb-4" />
                <h3 className="text-lg sm:text-xl font-bold text-[#F5F5F5] mb-2">
                  Nenhuma peça encontrada para estes critérios
                </h3>
                <p className="text-xs sm:text-sm text-[#A4ABB7] mb-6 max-w-md">
                  Tente alterar seus termos de busca ou remover os filtros de categoria e condição para visualizar todo o estoque.
                </p>
                <Link 
                  to="/produtos" 
                  onClick={() => setConditionFilter('todos')}
                  className="inline-flex items-center px-6 py-2.5 bg-[#FF7048] hover:bg-[#ff5d30] text-white text-xs font-bold uppercase rounded-sm transition-all"
                >
                  Ver Catálogo Completo
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
