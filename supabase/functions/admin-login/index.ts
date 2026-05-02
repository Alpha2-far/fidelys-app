/**
 * FIDELYS — Edge Function: admin-login
 * Authentification avec rate limiting pour les admins boutique et super-admins
 * SÉCURITÉ: 5 tentatives / 5 minutes par email
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://admin.fidelys.app',
  'https://fidelys-admin-dashboard.vercel.app',
  'https://fidelys.app',
  'https://fidelys-app.vercel.app',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

interface RequestBody {
  email: string;
  password: string;
}

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Méthode non autorisée');
    }

    const body: RequestBody = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Email invalide');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ── SÉCURITÉ P2: Rate limiting — 5 tentatives / 5 minutes ────────────────
    const { data: allowed, error: rateLimitError } = await adminClient.rpc('check_rate_limit', {
      p_identifier: email.toLowerCase(),
      p_action: 'login',
      p_max_attempts: 5,
      p_window_seconds: 300,
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError.message);
      // Fail open on error (don't block legitimate users due to DB issue)
    } else if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de tentatives. Réessayez dans 5 minutes.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '300' } }
      );
    }
    // ── FIN RATE LIMITING ─────────────────────────────────────────────────────

    // Attempt authentication
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      return new Response(
        JSON.stringify({ error: 'Email ou mot de passe incorrect' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success — reset rate limit counter
    await adminClient.rpc('reset_rate_limit', {
      p_identifier: email.toLowerCase(),
      p_action: 'login',
    });

    return new Response(
      JSON.stringify({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in,
        user: {
          id: authData.user?.id,
          email: authData.user?.email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('admin-login error:', error instanceof Error ? error.message : 'unknown');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { status: 400, headers: { ...getCorsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' } }
    );
  }
});
