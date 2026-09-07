// ==============================================================================
// File: src/lib/supabaseClient.ts
// Description: Client-Side (Browser-Safe) Supabase Instance
// SECURITY: Uses ONLY VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// 1. Resolve Supabase URL (supports standard VITE_SUPABASE_URL and fallbacks)
const rawUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  (import.meta.env.VITE_PUBLIC_SUPABASE_URL as string | undefined) ||
  '';

// 2. Resolve Anon / Publishable Key (supports VITE_SUPABASE_ANON_KEY and VITE_SUPABASE_PUBLISHABLE_KEY)
const rawAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  '';

// Normalize URL (strip trailing slashes)
const supabaseUrl = rawUrl.trim().replace(/\/+$/, '');
const supabaseAnonKey = rawAnonKey.trim();

// Check if properly configured with real credentials (not placeholder)
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')
);

// Safe diagnostic descriptor (never exposes actual key values or secrets)
export const supabaseDiagnostics = {
  isConfigured: isSupabaseConfigured,
  hasUrl: Boolean(supabaseUrl),
  hasKey: Boolean(supabaseAnonKey),
  urlHost: (() => {
    if (!supabaseUrl) return 'NOT_CONFIGURED';
    try {
      return new URL(supabaseUrl).host;
    } catch {
      return 'INVALID_URL_FORMAT';
    }
  })(),
  configuredKeyVariable: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
    ? 'VITE_SUPABASE_ANON_KEY'
    : (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
      ? 'VITE_SUPABASE_PUBLISHABLE_KEY'
      : (import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string | undefined)
        ? 'VITE_PUBLIC_SUPABASE_ANON_KEY'
        : 'NONE'
};

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase Client] Environment variables are missing or incomplete in the build environment:\n' +
    '  - VITE_SUPABASE_URL: ' + (supabaseDiagnostics.hasUrl ? 'DETECTED' : 'MISSING') + '\n' +
    '  - VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY: ' + (supabaseDiagnostics.hasKey ? 'DETECTED' : 'MISSING') + '\n' +
    'For Vercel production deployment, configure these in Project Settings -> Environment Variables and redeploy.'
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
