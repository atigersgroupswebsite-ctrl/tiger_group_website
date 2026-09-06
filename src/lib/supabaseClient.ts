// ==============================================================================
// File: src/lib/supabaseClient.ts
// Description: Client-Side (Browser-Safe) Supabase Instance
// SECURITY: Uses ONLY VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Graceful development notice without halting application execution
  console.info(
    '[Supabase] Client credentials not detected in environment. Operating in mock/local fallback mode.'
  );
}

// Instantiate client-side Supabase client (using anon key with RLS enforcement)
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
