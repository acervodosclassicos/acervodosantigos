import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube, ShieldCheck, CreditCard, Truck, MessageCircle, ChevronDown } from 'lucide-react';
import { useSettings } from '../../store/useSettings';
import { cn } from '../../lib/utils';

export default function Footer() {
  const { settings } = useSettings();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const formatWhatsApp = (num: string) => {
    if (!num) return '';
    // Format simple 5511999999999 to (11) 99999-9999
    if (num.length >= 12 && num.startsWith('55')) {
       return `(${num.substring(2,4)}) ${num.substring(4,9)}-${num.substring(9)}`;
    }
    return num;
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const MobileAccordion = ({ title, id, children }: { title: string, id: string, children: React.ReactNode }) => {
    const isOpen = openSection === id;
    
    return (
      <div className="md:hidden border-b border-zinc-800">
        <button 
          onClick={() => toggleSection(id)}
          className="w-full py-4 flex justify-between items-center text-left"
        >
          <h3 className="font-display font-bold text-white text-base uppercase tracking-wider">{title}</h3>
          <ChevronDown size={18} className={cn("text-zinc-500 transition-transform duration-300", isOpen && "rotate-180")} />
        </button>
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-96 pb-6 opacity-100" : "max-h-0 opacity-0"
        )}>
          {children}
        </div>
      </div>
    );
  };

  return (
    <footer className="bg-[#0B0D10] border-t border-[#2B303A] pt-12 md:pt-16 pb-24 md:pb-10 text-[#A4ABB7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* DESKTOP GRID */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* INSTITUTIONAL */}
          <div>
            <h3 className="font-display font-bold text-white text-base mb-6 uppercase tracking-wider">Institucional</h3>
            <ul className="space-y-3.5 text-xs text-[#A4ABB7]">
              <li><Link to="/sobre" className="hover:text-[#FF7048] transition-colors">Sobre a Garagem</Link></li>
              <li><Link to="/como-comprar" className="hover:text-[#FF7048] transition-colors">Como Comprar</Link></li>
              <li><Link to="/seguranca" className="hover:text-[#FF7048] transition-colors">Segurança da Compra</Link></li>
              <li><Link to="/privacidade" className="hover:text-[#FF7048] transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-[#FF7048] transition-colors">Termos de Uso</Link></li>
              <li><Link to="/legalidade" className="hover:text-[#FF7048] transition-colors">Legalidade</Link></li>
            </ul>
          </div>

          {/* ATENDIMENTO */}
          <div>
            <h3 className="font-display font-bold text-white text-base mb-6 uppercase tracking-wider">Atendimento</h3>
            <ul className="space-y-3.5 text-xs text-[#A4ABB7]">
              {settings?.phone && (
                <li className="flex items-center">
                  <span className="text-[#FF7048] font-bold mr-2.5">☏</span>
                  <span className="text-[#F5F5F5]">{settings.phone}</span>
                </li>
              )}
              <li className="flex items-center">
                <span className="text-[#FF7048] font-bold mr-2.5">@</span>
                <a href={`mailto:${settings?.email || 'contato@acervodosantigos.com.br'}`} className="hover:text-white transition-colors">
                  {settings?.email || 'contato@acervodosantigos.com.br'}
                </a>
              </li>
              <li className="pt-2 text-[#A4ABB7]/80 leading-relaxed">
                Segunda a Sexta: 08h às 18h<br/>Sábado: 08h às 12h
              </li>
            </ul>
          </div>

          {/* COMPRA SEGURA */}
          <div>
            <h3 className="font-display font-bold text-white text-base mb-6 uppercase tracking-wider">Compra Segura</h3>
            <ul className="space-y-4 text-xs text-[#A4ABB7]">
              <li className="flex items-start">
                <ShieldCheck size={18} className="text-[#FF7048] mr-3 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#F5F5F5] font-medium text-xs">Ambiente Seguro</span>
                  <span className="text-[#A4ABB7] text-[11px] leading-relaxed">Transações 100% protegidas e criptografadas.</span>
                </div>
              </li>
              <li className="flex items-start">
                <CreditCard size={18} className="text-[#FF7048] mr-3 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#F5F5F5] font-medium text-xs">PIX e Cartão</span>
                  <span className="text-[#A4ABB7] text-[11px] leading-relaxed">Aprovação imediata via PIX ou parcele em até 12x.</span>
                </div>
              </li>
              <li className="flex items-start">
                <Truck size={18} className="text-[#FF7048] mr-3 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#F5F5F5] font-medium text-xs">Envio Especializado</span>
                  <span className="text-[#A4ABB7] text-[11px] leading-relaxed">Embalagens reforçadas via Rodonaves, Jadlog e Correios.</span>
                </div>
              </li>
            </ul>
          </div>

          {/* EMPRESA & SOCIAL */}
          <div>
            <h3 className="font-display font-bold text-white text-base mb-6 uppercase tracking-wider">{settings?.site_name || 'Acervo dos Antigos'}</h3>
            <div className="text-xs text-[#A4ABB7] space-y-1.5 mb-6">
              <p className="text-[#F5F5F5] font-medium">ACERVO DOS ANTIGOS COMERCIO LTDA</p>
              <p>CNPJ: {settings?.cnpj || '00.000.000/0001-00'}</p>
              <p className="leading-relaxed">{settings?.address || 'São Paulo - SP'}</p>
            </div>
            
            <h4 className="text-white text-xs font-semibold mb-3 uppercase tracking-wider">Siga nossa Garagem</h4>
            <div className="flex items-center space-x-3">
              <a href={settings?.instagram || '#'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-sm bg-[#141820] border border-[#2B303A] flex items-center justify-center text-[#A4ABB7] hover:text-[#FF7048] hover:border-[#FF7048] transition-colors" aria-label="Instagram">
                <Instagram size={17} />
              </a>
              <a href={settings?.facebook || '#'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-sm bg-[#141820] border border-[#2B303A] flex items-center justify-center text-[#A4ABB7] hover:text-[#FF7048] hover:border-[#FF7048] transition-colors" aria-label="Facebook">
                <Facebook size={17} />
              </a>
              <a href="#" className="w-9 h-9 rounded-sm bg-[#141820] border border-[#2B303A] flex items-center justify-center text-[#A4ABB7] hover:text-[#FF7048] hover:border-[#FF7048] transition-colors" aria-label="YouTube">
                <Youtube size={17} />
              </a>
            </div>
          </div>

        </div>

        {/* MOBILE ACCORDIONS */}
        <div className="md:hidden mb-10">
          <MobileAccordion title="Institucional" id="institucional">
            <ul className="space-y-3 text-xs text-[#A4ABB7]">
              <li><Link to="/sobre" className="hover:text-[#FF7048] transition-colors block">Sobre a Garagem</Link></li>
              <li><Link to="/como-comprar" className="hover:text-[#FF7048] transition-colors block">Como Comprar</Link></li>
              <li><Link to="/seguranca" className="hover:text-[#FF7048] transition-colors block">Segurança da Compra</Link></li>
              <li><Link to="/privacidade" className="hover:text-[#FF7048] transition-colors block">Política de Privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-[#FF7048] transition-colors block">Termos de Uso</Link></li>
              <li><Link to="/legalidade" className="hover:text-[#FF7048] transition-colors block">Legalidade</Link></li>
            </ul>
          </MobileAccordion>

          <MobileAccordion title="Atendimento" id="atendimento">
            <ul className="space-y-3 text-xs text-[#A4ABB7]">
              {settings?.phone && (
                <li className="flex items-center">
                  <span className="text-[#FF7048] font-bold mr-3 shrink-0">☏</span>
                  <span className="text-[#F5F5F5]">{settings.phone}</span>
                </li>
              )}
              <li className="flex items-center truncate">
                <span className="text-[#FF7048] font-bold mr-3 shrink-0">@</span>
                <a href={`mailto:${settings?.email || 'contato@acervodosantigos.com.br'}`} className="hover:text-white transition-colors truncate">
                  {settings?.email || 'contato@acervodosantigos.com.br'}
                </a>
              </li>
              <li className="pt-1 text-[#A4ABB7] text-xs">
                Segunda a Sexta: 08h às 18h<br/>Sábado: 08h às 12h
              </li>
            </ul>
          </MobileAccordion>

          <MobileAccordion title="Compra Segura" id="seguranca">
             <ul className="space-y-3.5 text-xs text-[#A4ABB7]">
              <li className="flex items-start">
                <ShieldCheck size={16} className="text-[#FF7048] mr-2.5 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#F5F5F5] font-medium text-xs">Ambiente Seguro</span>
                  <span className="text-[#A4ABB7] text-[11px] mt-0.5 block">Pagamento 100% criptografado.</span>
                </div>
              </li>
              <li className="flex items-start">
                <CreditCard size={16} className="text-[#FF7048] mr-2.5 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#F5F5F5] font-medium text-xs">PIX e Cartão</span>
                  <span className="text-[#A4ABB7] text-[11px] mt-0.5 block">Parcele em até 12x ou pague via PIX.</span>
                </div>
              </li>
              <li className="flex items-start">
                <Truck size={16} className="text-[#FF7048] mr-2.5 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[#F5F5F5] font-medium text-xs">Envio Especializado</span>
                  <span className="text-[#A4ABB7] text-[11px] mt-0.5 block">Rodonaves, Jadlog e Correios.</span>
                </div>
              </li>
            </ul>
          </MobileAccordion>

          <div className="mt-8 border border-[#2B303A] p-5 rounded-sm bg-[#141820] text-center">
            <h3 className="font-display font-bold text-white text-sm mb-3 uppercase tracking-wider">{settings?.site_name || 'Acervo dos Antigos'}</h3>
            <div className="text-xs text-[#A4ABB7] space-y-1 mb-5">
              <p className="text-[#F5F5F5]">ACERVO DOS ANTIGOS COMERCIO LTDA</p>
              <p>CNPJ: {settings?.cnpj || '00.000.000/0001-00'}</p>
              <p>{settings?.address || 'São Paulo - SP'}</p>
            </div>
            
            <div className="flex items-center justify-center space-x-3">
              <a href={settings?.instagram || '#'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-sm bg-[#1B2029] border border-[#2B303A] flex items-center justify-center text-[#A4ABB7] hover:text-[#FF7048] hover:border-[#FF7048] transition-colors" aria-label="Instagram">
                <Instagram size={17} />
              </a>
              <a href={settings?.facebook || '#'} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-sm bg-[#1B2029] border border-[#2B303A] flex items-center justify-center text-[#A4ABB7] hover:text-[#FF7048] hover:border-[#FF7048] transition-colors" aria-label="Facebook">
                <Facebook size={17} />
              </a>
              <a href="#" className="w-9 h-9 rounded-sm bg-[#1B2029] border border-[#2B303A] flex items-center justify-center text-[#A4ABB7] hover:text-[#FF7048] hover:border-[#FF7048] transition-colors" aria-label="YouTube">
                <Youtube size={17} />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#2B303A] flex flex-col md:flex-row justify-between items-center text-[11px] text-[#A4ABB7] text-center md:text-left gap-2 md:gap-0">
          <p>© {new Date().getFullYear()} {settings?.site_name || 'Acervo dos Antigos'}. Peças Clássicas & Colecionáveis. Todos os direitos reservados.</p>
          <p className="text-[#A4ABB7]/80">Excelência em Restauração Automotiva.</p>
        </div>
      </div>
    </footer>
  );
}
