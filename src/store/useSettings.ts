import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { SiteSettings } from '../types';

export const defaultSettings: SiteSettings = {
  id: 1,
  site_name: 'ACERVO DOS ANTIGOS',
  whatsapp: '5518981959696',
  phone: '(18) 98195-9696',
  email: 'contato@acervodosantigos.com',
  cnpj: '39.857.171/0001-77',
  address: 'Rua Quatorze, nº 1603 Centro Santa Fé do Sul – SP CEP: 15775-000',
  scroll_message: 'PEÇAS CLÁSSICAS PARA MÁQUINAS ETERNAS • ENVIAMOS PARA TODO O BRASIL',
  instagram: 'https://instagram.com/acervodosantigos',
  facebook: 'https://facebook.com/acervodosantigos'
};

interface SettingsState {
  settings: SiteSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
}

export const useSettings = create<SettingsState>((set) => ({
  settings: defaultSettings,
  isLoading: true,
  fetchSettings: async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*').limit(1).single();
      if (!error && data) {
        set({ settings: { ...defaultSettings, ...data }, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  }
}));
