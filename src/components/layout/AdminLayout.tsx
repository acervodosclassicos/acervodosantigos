import { useState } from 'react';
import { Outlet, Navigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../store/useAuth';
import { Package, ShoppingBag, Image as ImageIcon, Settings, LogOut, MessageSquare, Activity, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AdminLayout() {
  const { user, isAdmin, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Se o usuário não está logado ou não é admin
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4 text-center">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Acesso Restrito</h2>
        <p className="text-sm md:text-base text-zinc-400 mb-8 max-w-md">Esta área é reservada para administradores do Acervo dos Antigos.</p>
        <Link to="/" className="text-orange-500 hover:underline text-sm md:text-base">Voltar para a Loja</Link>
      </div>
    );
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    cn(
      "flex items-center px-3 py-3 md:py-2.5 rounded-sm text-sm font-medium transition-colors",
      isActive ? "text-white bg-zinc-800" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
    );

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const SidebarContent = () => (
    <>
      <div className="h-16 md:h-20 flex items-center justify-between px-6 border-b border-zinc-800">
        <Link to="/admin" onClick={closeMobileMenu} className="font-display font-bold text-lg md:text-xl tracking-tighter text-white leading-none">
          ACERVO <span className="text-orange-500">ADMIN</span>
        </Link>
        <button className="md:hidden text-zinc-400 hover:text-white" onClick={closeMobileMenu}>
          <X size={24} />
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 md:space-y-1">
        <NavLink to="/admin" end onClick={closeMobileMenu} className={navLinkClass}>
          <Package size={18} className="mr-3 text-orange-500" />
          Anúncios
        </NavLink>
        <NavLink to="/admin/pedidos" onClick={closeMobileMenu} className={navLinkClass}>
          <ShoppingBag size={18} className="mr-3 text-orange-500" />
          Pedidos dos Clientes
        </NavLink>
        <NavLink to="/admin/banners" onClick={closeMobileMenu} className={navLinkClass}>
          <ImageIcon size={18} className="mr-3 text-orange-500" />
          Banners da Loja
        </NavLink>
        <NavLink to="/admin/feedbacks" onClick={closeMobileMenu} className={navLinkClass}>
          <MessageSquare size={18} className="mr-3 text-orange-500" />
          Feedbacks
        </NavLink>
        <NavLink to="/admin/configuracoes" onClick={closeMobileMenu} className={navLinkClass}>
          <Settings size={18} className="mr-3 text-orange-500" />
          Configurações
        </NavLink>
        <NavLink to="/admin/diagnostico" onClick={closeMobileMenu} className={navLinkClass}>
          <Activity size={18} className="mr-3 text-orange-500" />
          Diagnóstico / Debug
        </NavLink>
      </nav>
      
      <div className="p-4 border-t border-zinc-800">
        <button 
          onClick={() => signOut()}
          className="flex items-center w-full px-3 py-3 md:py-2.5 rounded-sm text-sm font-medium text-zinc-400 hover:text-red-500 hover:bg-zinc-800 transition-colors"
        >
          <LogOut size={18} className="mr-3" />
          Sair do Painel
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100 font-sans">
      
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-zinc-900 border-r border-zinc-800 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Navigation */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={closeMobileMenu}></div>
          <aside className="relative w-4/5 max-w-sm bg-zinc-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 border-b border-zinc-800 bg-zinc-950 shrink-0">
          <div className="flex items-center">
            <button 
              className="mr-3 md:hidden text-zinc-400 hover:text-white p-1"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg md:text-xl font-semibold text-white truncate">Painel de Controle</h1>
          </div>
          <div className="flex items-center space-x-3 md:space-x-4">
            <span className="hidden sm:block text-xs md:text-sm text-zinc-400">Olá, Admin</span>
            <Link to="/" target="_blank" className="text-[10px] md:text-xs border border-zinc-700 px-2 py-1.5 md:px-3 rounded-sm hover:border-orange-500 hover:text-orange-500 transition-colors text-zinc-400 whitespace-nowrap">
              Ver Loja
            </Link>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-950">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
