/**
 * FIDELYS — Edge Function: update-shop-status
 * Met à jour le statut d'une boutique (active/suspended/cancelled)
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
  shop_id: string;
  new_status: 'active' | 'suspended' | 'cancelled' | 'expired' | 'trial';
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
    const { shop_id, new_status } = body;

    if (!shop_id || !new_status) {
      throw new Error('shop_id et new_status sont requis');
    }

    const validStatuses = ['active', 'suspended', 'cancelled', 'expired', 'trial'];
    if (!validStatuses.includes(new_status)) {
      throw new Error(`Statut invalide. Valeurs acceptées: ${validStatuses.join(', ')}`);
    }

    const supabase = adminClient;

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, name, slug')
      .eq('id', shop_id)
      .single();

    if (shopError || !shop) {
      throw new Error('Boutique introuvable');
    }

    const { error: updateError } = await supabase
      .from('shops')
      .update({ subscription_status: new_status })
      .eq('id', shop_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        shop_id: shop.id,
        name: shop.name,
        slug: shop.slug,
        new_status,
        message: `Boutique ${new_status === 'active' ? 'réactivée' : new_status === 'suspended' ? 'suspendue' : 'mise à jour'}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('update-shop-status error:', error instanceof Error ? error.message : 'unknown');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: { ...getCorsHeaders(req.headers.get('Origin')), 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
