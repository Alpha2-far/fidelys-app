/**
 * FIDELYS — Edge Function: send-campaign
 * Envoie une campagne de notifications push à un segment de clients
 * SÉCURITÉ: Vérifie que l'appelant est admin de la boutique concernée
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

interface RequestBody {
  campaign_id: string;
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

    // Appel interne depuis scheduled-campaigns : service_role key autorisé directement
    const isInternalCall = authHeader === `Bearer ${supabaseServiceKey}`;

    let userId: string | null = null;

    if (!isInternalCall) {
      // Appel depuis le dashboard admin : vérifier le JWT utilisateur
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
      userId = user.id;
    }

    const body: RequestBody = await req.json();
    const { campaign_id } = body;

    if (!campaign_id) {
      throw new Error('campaign_id est requis');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer la campagne
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campagne introuvable');
    }

    if (campaign.status === 'sent') {
      throw new Error('Cette campagne a déjà été envoyée');
    }

    // ── SÉCURITÉ P0: Vérifier que l'appelant est admin de la boutique ─────────
    // Les appels internes (pg_cron → scheduled-campaigns) sont exemptés
    if (!isInternalCall && userId) {
      const { data: adminCheck, error: adminCheckError } = await supabase
        .from('shop_admins')
        .select('shop_id')
        .eq('user_id', userId)
        .eq('shop_id', campaign.shop_id)
        .single();

      if (adminCheckError || !adminCheck) {
        return new Response(JSON.stringify({ error: 'Accès refusé: vous n\'êtes pas admin de cette boutique' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    // ── FIN SÉCURITÉ ──────────────────────────────────────────────────────────

    const campaignShopId = campaign.shop_id;

    // 2. Résoudre le segment
    let query = supabase
      .from('customers')
      .select('id, push_subscription, first_name')
      .eq('shop_id', campaignShopId)
      .not('push_subscription', 'is', null);

    const segment = campaign.target_segment;

    if (segment.startsWith('tier:')) {
      const tierName = segment.replace('tier:', '');
      const { data: tierData } = await supabase
        .from('reward_tiers')
        .select('id')
        .eq('shop_id', campaignShopId)
        .eq('name', tierName)
        .single();
      query = query.eq('current_tier_id', tierData?.id || null);
    } else if (segment === 'dormant') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.lt('last_visit_at', thirtyDaysAgo.toISOString());
    } else if (segment === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte('created_at', sevenDaysAgo.toISOString());
    } else if (segment.startsWith('group:')) {
      const groupId = segment.replace('group:', '');
      const { data: groupShops } = await supabase
        .from('shops')
        .select('id')
        .eq('group_id', groupId);

      const shopIds = (groupShops as { id: string }[] | null)?.map((s) => s.id) || [];
      if (shopIds.length === 0) throw new Error('Aucune boutique trouvée dans ce groupe');

      query = supabase
        .from('customers')
        .select('id, push_subscription, first_name')
        .in('shop_id', shopIds)
        .not('push_subscription', 'is', null);
    }

    const { data: customers, error: customersError } = await query;

    if (customersError) throw new Error('Erreur lors de la récupération des clients');

    if (!customers || customers.length === 0) {
      await supabase.from('campaigns').update({ status: 'sent', sent_count: 0, sent_at: new Date().toISOString() }).eq('id', campaign_id);
      return new Response(
        JSON.stringify({ total_targeted: 0, total_sent: 0, total_failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 3. Envoyer les notifications
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

    const webpush = await import('https://esm.sh/web-push@3.6.7');
    webpush.default.setVapidDetails('mailto:notifications@fidelys.app', vapidPublicKey, vapidPrivateKey);

    let totalSent = 0;
    let totalFailed = 0;

    for (const customer of (customers as { id: string; push_subscription: unknown }[])) {
      try {
        await webpush.default.sendNotification(
          customer.push_subscription,
          JSON.stringify({
            title: campaign.title,
            body: campaign.message,
            data: { type: 'campaign', shop_id: campaignShopId, customer_id: customer.id, campaign_id, url: `/shop/${campaignShopId}` },
          })
        );

        await supabase.from('notifications').insert({
          shop_id: campaignShopId, customer_id: customer.id, type: 'campaign',
          title: campaign.title, message: campaign.message, status: 'sent', sent_at: new Date().toISOString(),
        });
        totalSent++;
      } catch (pushError: unknown) {
        const err = pushError as { statusCode?: number };
        if (err.statusCode === 410) {
          await supabase.from('customers').update({ push_subscription: null }).eq('id', customer.id);
        }
        await supabase.from('notifications').insert({
          shop_id: campaignShopId, customer_id: customer.id, type: 'campaign',
          title: campaign.title, message: campaign.message, status: 'failed',
        });
        totalFailed++;
      }
    }

    // 4. Mettre à jour la campagne
    await supabase.from('campaigns').update({
      status: 'sent', sent_count: totalSent, sent_at: new Date().toISOString(),
    }).eq('id', campaign_id);

    return new Response(
      JSON.stringify({ total_targeted: customers.length, total_sent: totalSent, total_failed: totalFailed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('send-campaign error:', error instanceof Error ? error.message : 'unknown');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
