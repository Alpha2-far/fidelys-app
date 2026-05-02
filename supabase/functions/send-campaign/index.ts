/**
 * FIDELYS — Edge Function: send-campaign
 * Envoie une campagne de notifications push à un segment de clients
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  campaign_id: string;
  shop_id?: string;  // Optionnel si déjà dans la campaign
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== 'POST') {
      throw new Error('Méthode non autorisée');
    }

    const body: RequestBody = await req.json();
    const { campaign_id, shop_id } = body;

    if (!campaign_id) {
      throw new Error('campaign_id est requis');
    }

    // Initialiser Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
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

    // Vérifier le statut
    if (campaign.status === 'sent') {
      throw new Error('Cette campagne a déjà été envoyée');
    }

    const campaignShopId = shop_id || campaign.shop_id;

    // 2. Résoudre le segment et récupérer les clients cibles
    let query = supabase
      .from('customers')
      .select('id, push_subscription, first_name')
      .eq('shop_id', campaignShopId)
      .not('push_subscription', 'is', null);

    const segment = campaign.target_segment;

    // Segment: tier:[tier_name]
    if (segment.startsWith('tier:')) {
      const tierName = segment.replace('tier:', '');
      query = query.eq('current_tier_id', (
        await supabase
          .from('reward_tiers')
          .select('id')
          .eq('shop_id', campaignShopId)
          .eq('name', tierName)
          .single()
      ).data?.id || null);
    }
    // Segment: dormant (>30 jours sans visite)
    else if (segment === 'dormant') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.lt('last_visit_at', thirtyDaysAgo.toISOString());
    }
    // Segment: recent (<7 jours depuis création)
    else if (segment === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte('created_at', sevenDaysAgo.toISOString());
    }
    // Segment: group:[group_id]
    else if (segment.startsWith('group:')) {
      const groupId = segment.replace('group:', '');
      const { data: groupShops } = await supabase
        .from('shops')
        .select('id')
        .eq('group_id', groupId);

      const shopIds = groupShops?.map(s => s.id) || [];
      if (shopIds.length === 0) {
        throw new Error('Aucune boutique trouvée dans ce groupe');
      }
      query = supabase
        .from('customers')
        .select('id, push_subscription, first_name')
        .in('shop_id', shopIds)
        .not('push_subscription', 'is', null);
    }
    // Segment: all (défaut - déjà filtré par shop_id)

    const { data: customers, error: customersError } = await query;

    if (customersError) {
      throw new Error('Erreur lors de la récupération des clients');
    }

    if (!customers || customers.length === 0) {
      // Mettre à jour la campagne
      await supabase
        .from('campaigns')
        .update({
          status: 'sent',
          sent_count: 0,
          sent_at: new Date().toISOString()
        })
        .eq('id', campaign_id);

      return new Response(
        JSON.stringify({ total_targeted: 0, total_sent: 0, total_failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 3. Envoyer les notifications
    let totalSent = 0;
    let totalFailed = 0;

    // Récupérer les clés VAPID
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

    // Import web-push dynamiquement
    const webpush = await import('https://esm.sh/web-push@3.6.7');
    webpush.default.setVapidDetails(
      'mailto:notifications@fidelys.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    for (const customer of customers) {
      try {
        const subscription = customer.push_subscription;

        await webpush.default.sendNotification(
          subscription,
          JSON.stringify({
            title: campaign.title,
            body: campaign.message,
            data: {
              type: 'campaign',
              shop_id: campaignShopId,
              customer_id: customer.id,
              campaign_id: campaign_id,
              url: `/shop/${campaignShopId}`,
            },
          })
        );

        // Logger la notification envoyée
        await supabase.from('notifications').insert({
          shop_id: campaignShopId,
          customer_id: customer.id,
          type: 'campaign',
          title: campaign.title,
          message: campaign.message,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });

        totalSent++;
      } catch (pushError: any) {
        // Gérer l'erreur 410 (subscription expirée)
        if (pushError.statusCode === 410) {
          await supabase
            .from('customers')
            .update({ push_subscription: null })
            .eq('id', customer.id);
        }

        // Logger l'échec
        await supabase.from('notifications').insert({
          shop_id: campaignShopId,
          customer_id: customer.id,
          type: 'campaign',
          title: campaign.title,
          message: campaign.message,
          status: 'failed',
        });

        totalFailed++;
      }
    }

    // 4. Mettre à jour la campagne
    await supabase
      .from('campaigns')
      .update({
        status: 'sent',
        sent_count: totalSent,
        sent_at: new Date().toISOString()
      })
      .eq('id', campaign_id);

    return new Response(
      JSON.stringify({
        total_targeted: customers.length,
        total_sent: totalSent,
        total_failed: totalFailed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('send-campaign error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
