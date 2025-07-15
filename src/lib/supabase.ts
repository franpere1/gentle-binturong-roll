import { createClient } from '@supabase/supabase-js';

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase URL or Anon Key is missing. Please check your .env file.");
      // Fallback or throw error if environment variables are not set
      // For a production app, you might want to throw an error or show a more prominent message
    }

    export const supabase = createClient(supabaseUrl, supabaseAnonKey);