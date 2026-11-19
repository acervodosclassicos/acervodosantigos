import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, AlertTriangle } from 'lucide-react';
import { SiteSettings } from '../../types';

export default function AdminSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*').limit(1).single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setSettings(data);
      } else {
        // Init default if empty
        setSettings({
          id: 1,
          site_name: 'ACERVO DOS ANTIGOS',
          whatsapp: '',
          phone: '',
          email: '',
          cnpj: '',
          address: '',
          scroll_message: '',
          instagram: '',
          facebook: ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('site_settings').upsert([settings]);
      if (error) throw error;
      showToast('Configurações salvas com sucesso!');
    } catch (err: any) {
      showToast('Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => prev ? { ...prev, [name]: value } : null);
  };

  if (isLoading) return <div className="text-white">Carregando configurações...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Configurações do Site</h2>
        <p className="text-zinc-400">Gerencie as informações institucionais, contato e textos gerais da loja.</p>
      </div>

      <div className="space-y-6">
        {/* Identidade e Institucional */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">Identidade e Avisos</h3>
          
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Nome da Loja</label>
            <input 
              name="site_name" value={settings?.site_name || ''} onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Texto Rolante (Topo do site)</label>
            <textarea 
              name="scroll_message" value={settings?.scroll_message || ''} onChange={handleChange} rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Contato */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">Contato e Redes Sociais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">WhatsApp (Apenas números, ex: 5511999999999)</label>
              <input 
                name="whatsapp" value={settings?.whatsapp || ''} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Telefone Fixo</label>
              <input 
                name="phone" value={settings?.phone || ''} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">E-mail</label>
              <input 
                name="email" value={settings?.email || ''} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Instagram (URL)</label>
              <input 
                name="instagram" value={settings?.instagram || ''} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Dados Empresariais */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">Dados Empresariais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">CNPJ</label>
              <input 
                name="cnpj" value={settings?.cnpj || ''} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Endereço Completo</label>
              <input 
                name="address" value={settings?.address || ''} onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm py-2 px-3 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save size={18} className="mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-medium text-sm px-5 py-3 rounded-sm shadow-2xl animate-in fade-in duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
