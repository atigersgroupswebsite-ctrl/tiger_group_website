// ==============================================================================
// File: src/server/supabaseServer.ts
// Description: Minimal server-side Supabase client + auth helper.
//   ZERO dependencies on payment, email, or PDF modules — prevents browser-only
//   libs (jspdf, canvas) from crashing Vercel Node.js serverless at module init.
// ==============================================================================

import { createClient } from "@supabase/supabase-js";

let _supabaseServer: any = null;

const DEFAULT_SUPABASE_URL = "https://bhfxqtaesvfsbdckgeka.supabase.co";

function isValidKey(val: string | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim().replace(/^["']|["']$/g, "");
  if (!trimmed || trimmed === '""' || trimmed === "''") return false;
  if (trimmed.includes("placeholder") || trimmed.includes("your-")) return false;
  return true;
}

export function getSupabaseServer(): any {
  if (!_supabaseServer) {
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      DEFAULT_SUPABASE_URL;

    let supabaseServiceKey = "";

    if (isValidKey(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim().replace(/^["']|["']$/g, "");
    } else if (isValidKey(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)) {
      supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!.trim().replace(/^["']|["']$/g, "");
    } else if (isValidKey(process.env.SUPABASE_ANON_KEY)) {
      supabaseServiceKey = process.env.SUPABASE_ANON_KEY!.trim().replace(/^["']|["']$/g, "");
    } else if (isValidKey(process.env.VITE_SUPABASE_ANON_KEY)) {
      supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY!.trim().replace(/^["']|["']$/g, "");
    }

    if (!supabaseServiceKey) {
      throw new Error(
        "Missing required server environment variable: SUPABASE_SERVICE_ROLE_KEY is not defined or configured with placeholder text."
      );
    }

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
