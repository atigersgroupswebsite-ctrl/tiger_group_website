// ==============================================================================
// File: src/server/supabaseServer.ts
// Description: Minimal server-side Supabase client + auth helper.
//   ZERO dependencies on payment, email, or PDF modules — prevents browser-only
//   libs (jspdf, canvas) from crashing Vercel Node.js serverless at module init.
// ==============================================================================

import { createClient } from "@supabase/supabase-js";

let _supabaseServer: any = null;

export function getSupabaseServer(): any {
  if (!_supabaseServer) {
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      "https://bhfxqtaesvfsbdckgeka.supabase.co";
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "";
    _supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabaseServer;
}

export async function authenticateRequest(authHeader: string | undefined | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false as const, error: "Missing or malformed Authorization header" };
  }
  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const { data: { user }, error } = await getSupabaseServer().auth.getUser(token);
    if (error || !user) {
      return { authenticated: false as const, error: "Invalid or expired authentication token" };
    }
    return { authenticated: true as const, user };
  } catch (err: any) {
    return { authenticated: false as const, error: (err as Error).message || "Authentication error" };
  }
}
