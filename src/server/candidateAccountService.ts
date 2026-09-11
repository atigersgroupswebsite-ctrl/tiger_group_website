// ==============================================================================
// File: src/server/candidateAccountService.ts
// Description: Server-Side Candidate Account Creation Service via Supabase Auth Admin
// Brand: A TIGER GROUPS — Certified Recruitment & Manpower Solutions
// Security: Server-only execution. Passwords handled strictly by Supabase Auth.
//           Zero plaintext passwords stored in application tables.
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

export interface CandidateRegisterPayload {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

export interface CandidateRegisterResult {
  success: boolean;
  userId?: string;
  email?: string;
  code?: string;
  error?: string;
}

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const DEFAULT_SUPABASE_URL = 'https://bhfxqtaesvfsbdckgeka.supabase.co';
const DEFAULT_SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZnhxdGFlc3Zmc2JkY2tnZWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODYxNjg3NSwiZXhwIjoyMTA0MTkyODc1fQ.wgYwkEqnhRs-sdi7YRx_A6nUYuCOhvVwuF54M1HeU-k';

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    DEFAULT_SUPABASE_KEY;

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * Ensures a candidate's email is confirmed so email verification never blocks login.
 */
export async function confirmCandidateEmailServerHandler(
  email: string
): Promise<{ status: number; data: { success: boolean; error?: string } }> {
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return { status: 400, data: { success: false, error: 'A valid email address is required.' } };
  }

  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { data: profile } = await supabaseAdmin
      .from('candidate_profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    let targetId = profile?.id;
    if (!targetId) {
      const { data: listRes } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
      const matched = listRes?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
      targetId = matched?.id;
    }

    if (targetId) {
      await supabaseAdmin.auth.admin.updateUserById(targetId, { email_confirm: true });
      return { status: 200, data: { success: true } };
    }
    return { status: 404, data: { success: false, error: 'Candidate account not found.' } };
  } catch (err: any) {
    return { status: 500, data: { success: false, error: err.message || 'Error updating confirmation status.' } };
  }
}

/**
 * Server-side handler for creating candidate accounts via Supabase Auth Admin.
 * Marks email_confirm = true so the candidate can immediately authenticate
 * with password without email verification friction.
 */
export async function registerCandidateServerHandler(
  payload: CandidateRegisterPayload
): Promise<{ status: number; data: CandidateRegisterResult }> {
  const cleanEmail = payload.email?.trim().toLowerCase();
  const password = payload.password;
  const fullName = payload.fullName?.trim() || '';
  const phone = payload.phone?.trim() || '';

  // 1. Syntactic validation
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return {
      status: 400,
      data: { success: false, code: 'INVALID_EMAIL', error: 'A valid email address is required.' }
    };
  }

  // 2. Password strength validation (minimum 8 characters)
  if (!password || password.length < 8) {
    return {
      status: 400,
      data: {
        success: false,
        code: 'WEAK_PASSWORD',
        error: 'Password must be at least 8 characters long.'
      }
    };
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    // 4. Create auth user with confirmed email
    const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role: 'CANDIDATE'
      }
    });

    if (createErr) {
      // Discriminate existing account
      const errMsg = createErr.message.toLowerCase();
      if (errMsg.includes('already') || errMsg.includes('registered') || errMsg.includes('exists') || createErr.status === 422) {
        // Auto-confirm existing user email so they are never blocked by unconfirmed email state
        try {
          const { data: profile } = await supabaseAdmin
            .from('candidate_profiles')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle();

          let targetId = profile?.id;
          if (!targetId) {
            const { data: listRes } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
            const matched = listRes?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
            targetId = matched?.id;
          }

          if (targetId) {
            await supabaseAdmin.auth.admin.updateUserById(targetId, { email_confirm: true });
          }
        } catch (confirmErr) {
          console.warn('[CANDIDATE_AUTH] Auto-confirm existing candidate notice:', confirmErr);
        }

        return {
          status: 409,
          data: {
            success: false,
            code: 'USER_EXISTS',
            error: 'An account with this email already exists. Please log in with your password to continue.'
          }
        };
      }

      return {
        status: 400,
        data: {
          success: false,
          code: createErr.code || 'SIGNUP_FAILED',
          error: createErr.message || 'Unable to create candidate account.'
        }
      };
    }

    const userId = createData.user.id;

    // 5. Upsert candidate profile record
    try {
      await supabaseAdmin.from('candidate_profiles').upsert({
        id: userId,
        email: cleanEmail,
        full_name: fullName,
        phone,
        updated_at: new Date().toISOString()
      });
    } catch (profErr) {
      console.warn('[CANDIDATE_AUTH] Profile record creation warning:', profErr);
    }

    // 6. Log account creation in activity logs (NO PASSWORDS LOGGED)
    try {
      await supabaseAdmin.from('activity_logs').insert({
        action: 'CANDIDATE_ACCOUNT_CREATED',
        description: `Candidate account created for ${cleanEmail}.`,
        metadata: {
          user_id: userId,
          email: cleanEmail,
          created_at: new Date().toISOString()
        }
      });
    } catch (logErr) {
      console.warn('[CANDIDATE_AUTH] Activity log warning:', logErr);
    }

    return {
      status: 201,
      data: {
        success: true,
        userId,
        email: cleanEmail
      }
    };
  } catch (err: any) {
    console.error('[CANDIDATE_AUTH_ERROR]', err);
    return {
      status: 500,
      data: {
        success: false,
        code: 'INTERNAL_ERROR',
        error: err?.message || 'Server error creating candidate account.'
      }
    };
  }
}
