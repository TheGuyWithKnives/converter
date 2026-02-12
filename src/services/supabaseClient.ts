import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Bezpečné vytvoření klienta - pokud chybí klíče, aplikace nespadne, jen vypíše varování
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Uživatel se musí přihlásit při každém spuštění aplikace
        autoRefreshToken: false,
      }
    })
  : (() => {
      console.warn('⚠️ POZOR: Chybí Supabase API klíče v .env souboru! Backend funkce nebudou fungovat.');
      return createClient('https://placeholder.supabase.co', 'placeholder', {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
    })();