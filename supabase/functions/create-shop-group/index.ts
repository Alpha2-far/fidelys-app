/**
 * FIDELYS — Edge Function: create-shop-group
 * Crée un nouveau groupe de boutiques (chaîne / franchise)
 * SÉCURITÉ: Requiert un JWT super_admin valide dans Authorization header
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
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
  name: string;
  logo_url?: string;
  primary_color?: string;
  owner_user_id: string;
  share_points: boolean;
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

    // ── SÉCURITÉ P0: Vérifier le token Authorization ──────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization requise' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token invalide ou expiré' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: superAdmin, error: saError } = await adminClient
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (saError || !superAdmin) {
      return new Response(JSON.stringify({ error: 'Accès réservé aux super-admins' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // ── FIN SÉCURITÉ ──────────────────────────────────────────────────────────

    const body: RequestBody = await req.json();
    const { name, logo_url, primary_color, owner_user_id, share_points } = body;

    if (!name || !owner_user_id) {
      throw new Error('Nom et owner_user_id sont requis');
    }
    if (name.length > 100) {
      throw new Error('Nom trop long (max 100 caractères)');
    }

    const supabase = adminClient;

    const { data: ownerUser, error: ownerError } = await supabase.auth.admin.getUser(owner_user_id);
    if (ownerError || !ownerUser) {
      throw new Error('Utilisateur propriétaire inexistant');
    }

    const { data: group, error: groupError } = await supabase
      .from('shop_groups')
      .insert({
        name,
        logo_url: logo_url || null,
        primary_color: primary_color || null,
        owner_user_id,
        share_points,
      })
      .select()
      .single();

    if (groupError) throw groupError;

    return new Response(
      JSON.stringify({
        group_id: group.id,
        name: group.name,
        share_points: group.share_points,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('create-shop-group error:', error instanceof Error ? error.message : 'unknown');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: { ...getCorsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
