/**
 * FIDELYS — Edge Function: credit-points
 * Crédite des points à un client et envoie des notifications push
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  shop_id: string;
  customer_id: string;
  points: number;
  purchase_amount?: number;
  note?: string;
  /** true = envoyer une notification push (défaut: true) */
  send_notification?: boolean;
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
    const { shop_id, customer_id, points, purchase_amount, note, send_notification = true } = body;

    // Validation
    if (!shop_id || !customer_id || !points) {
      throw new Error('shop_id, customer_id et points sont requis');
    }

    if (points <= 0) {
      throw new Error('Les points doivent être positifs');
    }

    // Initialiser Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Vérifier que le client existe et appartient à la boutique
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*, current_tier_id, shop_id')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error('Client introuvable');
    }

    if (customer.shop_id !== shop_id) {
      throw new Error('Le client n\'appartient pas à cette boutique');
    }

    // 2. Récupérer la boutique pour les infos
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('name, slug')
      .eq('id', shop_id)
      .single();

    if (shopError || !shop) {
      throw new Error('Boutique introuvable');
    }

    // 3. Calculer les nouveaux points
    const newTotalPoints = customer.total_points + points;
    const newLifetimePoints = customer.lifetime_points + points;

    // 4. Vérifier si le client change de palier
    const { data: tiers, error: tiersError } = await supabase
      .from('reward_tiers')
      .select('id, name, points_required')
      .eq('shop_id', shop_id)
      .eq('active', true)
      .order('points_required', { ascending: true });

    if (tiersError) {
      console.error('Erreur récupération paliers:', tiersError);
    }

    let newTierId = customer.current_tier_id;
    let tierChanged = false;
    let newTierName = null;

    if (tiers && tiers.length > 0) {
      // Trouver le meilleur palier atteint
      const eligibleTiers = tiers.filter((t) => newTotalPoints >= t.points_required);
      if (eligibleTiers.length > 0) {
        const bestTier = eligibleTiers[eligibleTiers.length - 1];
        if (bestTier.id !== customer.current_tier_id) {
          newTierId = bestTier.id;
          tierChanged = true;
          newTierName = bestTier.name;
        }
      }
    }

    // 5. Mettre à jour le client
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        total_points: newTotalPoints,
        lifetime_points: newLifetimePoints,
        current_tier_id: newTierId,
        last_visit_at: new Date().toISOString(),
      })
      .eq('id', customer_id);

    if (updateError) {
      throw updateError;
    }

    // 6. Enregistrer la transaction
    const { error: transactionError } = await supabase
      .from('points_transactions')
      .insert({
        shop_id,
        customer_id,
        type: 'purchase',
        points,
        purchase_amount: purchase_amount || null,
        note: note || null,
        created_by: auth.uid() || 'system', // Sera défini par l'appelant
      });

    if (transactionError) {
      console.error('Erreur transaction:', transactionError);
      // On continue malgré l'erreur de transaction
    }

    // 7. Envoyer les notifications push
    let notificationSent = false;
    let tierNotificationSent = false;

    if (send_notification) {
      const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`;

      // Notification de points gagnés
      try {
        const notificationBody = {
          customer_id,
          title: 'Points gagnés !',
          message: `Vous avez gagné ${points} points chez ${shop.name} !`,
          type: 'points_earned',
          shop_id,
          url: `/${shop.slug}`,
        };

        await fetch(notificationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(notificationBody),
        });
        notificationSent = true;
      } catch (notifError) {
        console.error('Erreur notification points:', notifError);
      }

      // Notification de changement de palier
      if (tierChanged && newTierName) {
        try {
          const tierNotificationBody = {
            customer_id,
            title: 'Nouveau palier débloqué !',
            message: `🎉 Félicitations ! Vous êtes maintenant ${newTierName} chez ${shop.name} !`,
            type: 'tier_unlocked',
            shop_id,
            url: `/${shop.slug}`,
          };

          await fetch(notificationUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify(tierNotificationBody),
          });
          tierNotificationSent = true;
        } catch (tierNotifError) {
          console.error('Erreur notification palier:', tierNotifError);
        }
      }
    }

    // 8. Retourner le résultat
    return new Response(
      JSON.stringify({
        success: true,
        customer_id,
        new_total_points: newTotalPoints,
        new_lifetime_points: newLifetimePoints,
        tier_changed: tierChanged,
        new_tier_name: newTierName,
        notifications: {
          points_sent: notificationSent,
          tier_sent: tierNotificationSent,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('credit-points error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
