import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, User, X, Heart, ShieldCheck, Truck, CreditCard, MessageCircle, HelpCircle } from 'lucide-react';
import { useCart } from '../../store/useCart';
import { useAuth } from '../../store/useAuth';
import { useFavorites } from '../../store/useFavorites';
import { useSettings } from '../../store/useSettings';
import { formatWhatsAppNumber } from '../../lib/utils';

export default function Navbar() {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const cartItemsCount = useCart((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const favoritesCount = useFavorites((state) => state.items.length);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearchOpen(false);
    }
  };

  const whatsappNumber = formatWhatsAppNumber(settings?.whatsapp);

  const navCategories = [
    { name: 'Ver Catálogo', path: '/produtos' },
    { name: 'Chevrolet Opala', path: '/categoria/opala' },
    { name: 'Chevrolet Omega', path: '/categoria/omega' },
    { name: 'VW Gol Quadrado', path: '/categoria/gol-quadrado' },
    { name: 'Fusca', path: '/categoria/fusca' },
    { name: 'Ford Corcel', path: '/categoria/corcel' },
    { name: 'Bicicletas & Antiguidades', path: '/categoria/bicicletas' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B0D10]/95 backdrop-blur-md border-b border-[#2B303A]">
      {/* Top Bar - Refined Trust Strip */}
      <div className="bg-[#141820] border-b border-[#2B303A]/70 text-[#A4ABB7] text-[11px] py-1.5 px-4 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <ShieldCheck size={13} className="text-[#FF7048]" />
              <strong className="text-white font-medium">Compra Segura:</strong> Transações 100% Criptografadas
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <Truck size={13} className="text-[#FF7048]" />
              Envio Especializado: Rodonaves, Jadlog e Correios
            </span>
            <span className="hidden lg:flex items-center gap-1.5">
              <CreditCard size={13} className="text-[#FF7048]" />
              PIX com Aprovação Imediata ou Cartão em até 12x
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/como-comprar" className="hover:text-white transition-colors flex items-center gap-1">
              <HelpCircle size={12} className="text-[#FF7048]" />
              Como Comprar
            </Link>
            <span className="text-[#2B303A]" aria-hidden="true">|</span>
            <a 
              href={`https://wa.me/${whatsappNumber}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#A4ABB7] hover:text-[#10B981] transition-colors flex items-center gap-1"
            >
              <MessageCircle size={12} className="text-[#10B981]" />
              Atendimento WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Logo Group */}
          <Link to="/" className="flex flex-col shrink-0 group">
            <div className="flex items-center tracking-tighter">
              <span className="font-display font-bold text-lg sm:text-2xl text-[#F5F5F5] group-hover:text-white transition-colors">
                ACERVO DOS <span className="text-[#FF7048]">ANTIGOS</span>
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#A4ABB7] tracking-[0.25em] uppercase font-semibold mt-0.5">
              Peças Clássicas & Raridades
            </span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden lg:flex flex-1 max-w-2xl mx-6">
            <form onSubmit={handleSearch} className="w-full relative">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busque por veículo, modelo, ano ou código da peça..." 
                className="w-full bg-[#141820] border border-[#2B303A] text-[#F5F5F5] text-xs sm:text-sm rounded-sm py-2.5 sm:py-3 pl-4 pr-11 focus:outline-none focus:border-[#FF7048] focus:ring-1 focus:ring-[#FF7048] transition-all placeholder:text-[#A4ABB7]/60"
              />
              <button 
                type="submit" 
                aria-label="Pesquisar"
                className="absolute right-0 top-0 h-full px-3.5 text-[#A4ABB7] hover:text-[#FF7048] transition-colors flex items-center justify-center cursor-pointer"
              >
                <Search size={18} />
              </button>
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-5">
            {/* Mobile Search Toggle */}
            <button 
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="lg:hidden text-[#A4ABB7] hover:text-white p-2 rounded-sm border border-transparent hover:border-[#2B303A] transition-colors cursor-pointer"
              aria-label="Abrir busca"
            >
              <Search size={20} />
            </button>

            {/* Favoritos */}
            <Link 
              to="/favoritos" 
              className="relative text-[#A4ABB7] hover:text-white p-2 rounded-sm border border-transparent hover:border-[#2B303A] transition-colors flex items-center group"
              title="Meus Favoritos"
            >
              <Heart size={20} className="group-hover:text-[#FF7048] transition-colors" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1 text-[9px] font-bold text-white bg-[#FF7048] rounded-full min-w-[16px] h-4">
                  {favoritesCount}
                </span>
              )}
            </Link>

            {/* Minha Conta */}
            <Link 
              to="/minha-conta" 
              className="text-[#A4ABB7] hover:text-white p-2 sm:px-3 sm:py-2 rounded-sm border border-[#2B303A]/70 hover:border-[#FF7048]/50 bg-[#141820] transition-all flex items-center gap-2 group"
            >
              <User size={18} className="text-[#FF7048]" />
              <span className="hidden xl:inline text-xs font-semibold text-[#F5F5F5] group-hover:text-[#FF7048] transition-colors">
                {user ? 'Minha Conta' : 'Entrar / Cadastro'}
              </span>
            </Link>
            
            {/* Carrinho */}
            <Link 
              to="/carrinho" 
              className="relative text-[#F5F5F5] bg-[#141820] border border-[#2B303A] hover:border-[#FF7048] p-2 sm:px-3 sm:py-2 rounded-sm transition-all flex items-center gap-2 group cursor-pointer"
              title="Carrinho de Compras"
            >
              <ShoppingCart size={19} className="group-hover:text-[#FF7048] transition-colors" />
              <span className="hidden sm:inline text-xs font-semibold">Carrinho</span>
              {cartItemsCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-[#FF7048] rounded-full min-w-[16px] h-4">
                  {cartItemsCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar (Expandable) */}
      {isMobileSearchOpen && (
        <div className="lg:hidden px-4 pb-3 pt-1 bg-[#141820] border-t border-[#2B303A]">
          <form onSubmit={handleSearch} className="w-full relative flex items-center">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar peça, veículo ou código..." 
              autoFocus
              className="w-full bg-[#0B0D10] border border-[#2B303A] text-[#F5F5F5] rounded-sm py-2.5 pl-3.5 pr-10 text-xs focus:outline-none focus:border-[#FF7048]"
            />
            <button 
              type="submit" 
              aria-label="Buscar"
              className="absolute right-9 top-0 h-full px-2 text-[#A4ABB7] hover:text-[#FF7048]"
            >
              <Search size={16} />
            </button>
            <button 
              type="button" 
              onClick={() => setIsMobileSearchOpen(false)}
              aria-label="Fechar busca"
              className="ml-2 p-2 text-[#A4ABB7] hover:text-white"
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Categories Navigation Bar (Desktop + Mobile Horizontal Scroll) */}
      <nav className="border-t border-[#2B303A]/80 bg-[#141820]/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex items-center gap-1 sm:gap-6 h-11 overflow-x-auto no-scrollbar text-xs font-semibold text-[#A4ABB7]">
            {navCategories.map((cat) => {
              const isActive = location.pathname === cat.path;
              return (
                <li key={cat.path} className="shrink-0">
                  <Link 
                    to={cat.path} 
                    className={`py-1.5 px-2.5 rounded-sm transition-all whitespace-nowrap block ${
                      isActive 
                        ? 'text-white bg-[#1B2029] border border-[#FF7048]/50 font-bold' 
                        : 'hover:text-[#F5F5F5] hover:bg-[#1B2029]/60'
                    }`}
                  >
                    {cat.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </header>
  );
}
