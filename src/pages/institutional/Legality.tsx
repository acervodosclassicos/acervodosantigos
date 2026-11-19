import { useState, useEffect } from 'react';
import { supabase, hasSupabaseConfig } from '../../lib/supabase';
import type { SiteSettings } from '../../types';
import { Building2 } from 'lucide-react';

export default function Legality() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      if (!hasSupabaseConfig) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await supabase.from('site_settings').select('*').single();
        if (data) {
          setSettings(data as SiteSettings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, []);

  return (
    <div className="bg-zinc-950 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        <div className="mb-12">
          <h1 className="font-display font-bold text-4xl text-white mb-4">Informações Legais</h1>
          <p className="text-zinc-400">Dados cadastrais da empresa.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-sm">
          <div className="flex items-center mb-8">
            <Building2 size={32} className="text-orange-500 mr-4" />
            <h2 className="text-2xl font-bold text-white">Dados Empresariais</h2>
          </div>

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
              <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
              <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
            </div>
          ) : settings && (settings.cnpj || settings.address) ? (
            <div className="space-y-6 text-zinc-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-zinc-800/50 pb-4">
                <div className="text-zinc-500 font-medium text-sm uppercase tracking-wider">Razão Social / Nome</div>
                <div className="sm:col-span-2 font-medium text-white">{settings.site_name || 'Acervo dos Antigos'}</div>
              </div>
              
              {settings.cnpj && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-zinc-800/50 pb-4">
                  <div className="text-zinc-500 font-medium text-sm uppercase tracking-wider">CNPJ</div>
                  <div className="sm:col-span-2 text-white">{settings.cnpj}</div>
                </div>
              )}
              
              {settings.address && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-zinc-800/50 pb-4">
                  <div className="text-zinc-500 font-medium text-sm uppercase tracking-wider">Endereço Sede</div>
                  <div className="sm:col-span-2 text-white">{settings.address}</div>
                </div>
              )}
              
              {(settings.email || settings.phone) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-zinc-800/50 pb-4">
                  <div className="text-zinc-500 font-medium text-sm uppercase tracking-wider">Contato Legal</div>
                  <div className="sm:col-span-2 text-white">
                    {settings.email && <div>{settings.email}</div>}
                    {settings.phone && <div>{settings.phone}</div>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-500 mb-2">As informações empresariais completas estão sendo atualizadas pelo administrador.</p>
              <p className="text-zinc-600 text-sm">Elas serão disponibilizadas nesta seção em breve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
