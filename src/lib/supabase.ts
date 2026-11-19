/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const rawUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  ''
).trim();

const rawKey = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  ''
).trim();

const isValidHttpUrl = (str: string) => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const hasSupabaseConfig = Boolean(
  rawUrl && 
  rawKey && 
  isValidHttpUrl(rawUrl) && 
  !rawUrl.includes('Sua URL')
);

// Safe fallback proxy for unconfigured environments preventing runtime crashes
const createFallbackClient = () => {
  const queryBuilder: any = {
    select: () => queryBuilder,
    insert: () => queryBuilder,
    update: () => queryBuilder,
    upsert: () => queryBuilder,
    delete: () => queryBuilder,
    eq: () => queryBuilder,
    in: () => queryBuilder,
    order: () => queryBuilder,
    limit: () => queryBuilder,
    single: async () => ({ data: null, error: { message: 'Banco de dados não configurado' } }),
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
  };

  return {
    from: () => queryBuilder,
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ error: { message: 'Autenticação indisponível sem credenciais Supabase' } }),
      signUp: async () => ({ error: { message: 'Autenticação indisponível sem credenciais Supabase' } }),
      signOut: async () => ({ error: null }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: 'Armazenamento offline' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
};

export const supabase = hasSupabaseConfig
  ? createClient(rawUrl, rawKey)
  : (createFallbackClient() as any);
