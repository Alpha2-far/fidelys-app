/**
 * FIDELYS — Edge Function: claim-reward
 * Valide une récompense palier : déduit les points requis et enregistre la transaction.
 * SÉCURITÉ : vérifie que l'appelant est admin de la boutique concernée.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── CORS ──────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://admin.fidelys.app',
  'https://fidelys-admin-dashboard.vercel.app',
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface RequestBody {
  shop_id: string;
  customer_id: string;
  tier_id: string;
  note?: string;
}

interface Tier {
  id: string;
  name: string;
  points_required: number;
  reward_description: string;
  active: boolean;
}

interface Customer {
  id: string;
  shop_id: string;
  total_points: number;
  current_tier_id: string | null;
  push_subscription: Record<string, unknown> | null;
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Méthode non autorisée' }, 405);
    }

    // ── Authentification ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Authorization requise' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Vérifier l'identité du caller avec sa clé JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Token invalide ou expiré' }, 401);
    }

    // ── Validation du body ────────────────────────────────────────────────────
    const body: RequestBody = await req.json();
    const { shop_id, customer_id, tier_id, note } = body;

    if (!shop_id || !customer_id || !tier_id) {
      return json({ error: 'shop_id, customer_id et tier_id sont requis' }, 400);
    }

    // ── Autorisation : l'appelant doit être admin de cette boutique ───────────
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: adminCheck } = await supabase
      .from('shop_admins')
      .select('shop_id')
      .eq('user_id', user.id)
      .eq('shop_id', shop_id)
      .single();

    if (!adminCheck) {
      return json({ error: 'Accès refusé : vous n\'êtes pas admin de cette boutique' }, 403);
    }

    // ── Charger le palier ─────────────────────────────────────────────────────
    const { data: tier, error: tierError } = await supabase
      .from('reward_tiers')
      .select('id, name, points_required, reward_description, active')
      .eq('id', tier_id)
      .eq('shop_id', shop_id)
      .single() as { data: Tier | null; error: unknown };

    if (tierError || !tier) {
      return json({ error: 'Palier introuvable dans cette boutique' }, 404);
    }
    if (!tier.active) {
      return json({ error: `Le palier "${tier.name}" est inactif` }, 400);
    }

    // ── Charger le client ─────────────────────────────────────────────────────
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, shop_id, total_points, current_tier_id, push_subscription')
      .eq('id', customer_id)
      .eq('shop_id', shop_id)
      .single() as { data: Customer | null; error: unknown };

    if (customerError || !customer) {
      return json({ error: 'Client introuvable dans cette boutique' }, 404);
    }

    // ── Vérifier le solde ─────────────────────────────────────────────────────
    if (customer.total_points < tier.points_required) {
      return json({
        error: `Points insuffisants : le client a ${customer.total_points} pts, ${tier.name} requiert ${tier.points_required} pts`,
      }, 400);
    }

    const pointsDeducted = tier.points_required;
    const newTotalPoints = customer.total_points - pointsDeducted;

    // ── Recalculer le palier actuel après déduction ───────────────────────────
    const { data: allTiers } = await supabase
      .from('reward_tiers')
      .select('id, points_required')
      .eq('shop_id', shop_id)
      .eq('active', true)
      .order('points_required', { ascending: true }) as { data: { id: string; points_required: number }[] | null };

    let newTierId: string | null = null;
    if (allTiers && allTiers.length > 0) {
      const eligible = allTiers.filter(t => newTotalPoints >= t.points_required);
      if (eligible.length > 0) newTierId = eligible[eligible.length - 1].id;
    }

    // ── Mettre à jour le solde du client ──────────────────────────────────────
    const { error: updateError } = await supabase
      .from('customers')
      .update({ total_points: newTotalPoints, current_tier_id: newTierId })
      .eq('id', customer_id);

    if (updateError) throw updateError;

    // ── Enregistrer la transaction ────────────────────────────────────────────
    const { error: txError } = await supabase
      .from('points_transactions')
      .insert({
        shop_id,
        customer_id,
        type: 'reward_claim',
        points: pointsDeducted,
        purchase_amount: null,
        note: note?.trim() || `Récompense ${tier.name} validée`,
        created_by: user.id,
      });

    if (txError) throw txError;

    // ── Notification push au client ───────────────────────────────────────────
    try {
      const { data: shop } = await supabase
        .from('shops')
        .select('name, slug')
        .eq('id', shop_id)
        .single() as { data: { name: string; slug: string } | null };

      if (shop && customer.push_subscription) {
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            customer_id,
            title: '🎁 Récompense utilisée !',
            message: `Votre récompense "${tier.name}" a été validée chez ${shop.name}. Solde restant : ${newTotalPoints.toLocaleString()} pts.`,
            type: 'reward_claim',
            shop_id,
            url: `/${shop.slug}`,
          }),
        });
      }
    } catch (notifErr) {
      // La notification est non-bloquante
      console.error('[claim-reward] Notification error:', notifErr);
    }

    // ── Réponse ───────────────────────────────────────────────────────────────
    return json({
      success: true,
      customer_id,
      tier_name: tier.name,
      points_deducted: pointsDeducted,
      new_total_points: newTotalPoints,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('[claim-reward]', msg);
    return json({ error: msg }, 400);
  }
});
