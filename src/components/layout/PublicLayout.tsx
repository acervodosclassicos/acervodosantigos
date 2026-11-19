import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useSettings } from '../../store/useSettings';
import { formatWhatsAppNumber } from '../../lib/utils';

export default function PublicLayout() {
  const { settings, fetchSettings } = useSettings();
  const location = useLocation();

  useEffect(() => {
    fetchSettings();
  }, []);

  const whatsappNumber = formatWhatsAppNumber(settings?.whatsapp);
  const isProductPage = location.pathname.startsWith('/produto/');
  const isCheckoutFlow = 
    location.pathname === '/checkout' || 
    location.pathname === '/pedido-confirmado' || 
    location.pathname === '/pagamento-confirmado';

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0D10] text-[#F5F5F5] font-sans">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      
      {/* Floating WhatsApp Button: hidden on mobile on product, checkout, and confirmation screens to avoid covering buttons */}
      <a 
        href={`https://wa.me/${whatsappNumber}`} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`${
          isProductPage || isCheckoutFlow ? 'hidden md:flex' : 'flex'
        } fixed bottom-[80px] md:bottom-6 right-4 md:right-6 bg-[#10B981] hover:bg-emerald-600 text-white w-13 h-13 md:w-14 md:h-14 rounded-full items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.6)] border border-emerald-400/40 transition-transform hover:scale-105 active:scale-95 z-50`}
        aria-label="Falar no WhatsApp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </a>
    </div>
  );
}
