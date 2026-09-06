// ==============================================================================
// File: src/lib/supabaseServer.ts
// Description: Server-Only Supabase Administration Instance
// SECURITY:
//   - EXCLUSIVELY FOR SECURE BACKEND / API / EDGE / SERVER CONTEXTS
//   - NEVER CALL OR IMPORT IN CLIENT BROWSER CODE
//   - USES SUPABASE_SERVICE_ROLE_KEY (WITHOUT VITE_ PREFIX)
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

declare const process: { env: Record<string, string | undefined> } | undefined;

export const getSupabaseServerClient = () => {
  // Runtime guard against client-side execution
  if (typeof window !== 'undefined') {
    throw new Error(
      'FATAL SECURITY VIOLATION: Server-side Supabase client was accessed in a browser runtime. ' +
      'The service role key must never be sent to or executed within client-side code.'
    );
  }

  const serverEnv = typeof process !== 'undefined' ? process.env : {};
  const supabaseUrl = serverEnv.SUPABASE_URL;
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing required server environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined.'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};
