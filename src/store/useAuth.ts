import { create } from 'zustand';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAdmin: false,
  isInitialized: false,

  initialize: async () => {
    if (!hasSupabaseConfig) {
      console.warn('Supabase environment variables not found. Running in offline/mock mode.');
      set({ isInitialized: true });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let isAdmin = false;
      if (session?.user) {
        // Fetch role from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        isAdmin = profile?.role?.toLowerCase() === 'admin';
      }

      set({ 
        session, 
        user: session?.user || null, 
        isAdmin,
        isInitialized: true 
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        let isNewSessionAdmin = false;
        
        if (newSession?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', newSession.user.id)
            .single();
            
          isNewSessionAdmin = profile?.role?.toLowerCase() === 'admin';
        }

        set({ 
          session: newSession, 
          user: newSession?.user || null, 
          isAdmin: isNewSessionAdmin 
        });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isInitialized: true });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, isAdmin: false });
  }
}));
