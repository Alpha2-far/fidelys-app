/**
 * FIDELYS — Edge Function: request-review
 * Cron job quotidien (10h UTC) : demande d'avis aux clients ayant acheté il y a ~24h
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Initialiser Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Sélectionner les transactions d'achat des dernières 24h (fenêtre 23h-25h)
    const now = new Date();
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);

    const { data: transactions, error: transactionsError } = await supabase
      .from('points_transactions')
      .select('id, shop_id, customer_id, created_at')
      .eq('type', 'purchase')
      .gte('created_at', twentyFiveHoursAgo.toISOString())
      .lte('created_at', twentyThreeHoursAgo.toISOString());

    if (transactionsError) {
      throw new Error('Erreur lors de la récupération des transactions');
    }

    if (!transactions || transactions.length === 0) {
      return new Response(
        JSON.stringify({ total_checked: 0, total_sent: 0, total_skipped: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Pour chaque transaction, vérifier qu'on n'a pas déjà envoyé de review_request
    const notificationUrl = `${supabaseUrl}/functions/v1/send-notification`;

    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const transaction of transactions) {
      const { shop_id, customer_id } = transaction;

      // Vérifier si une notification review_request existe déjà pour cette transaction
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'review_request')
        .eq('customer_id', customer_id)
        .eq('shop_id', shop_id)
        .gte('created_at', transaction.created_at)
        .single();

      if (existingNotification) {
        totalSkipped++;
        continue;
      }

      // Récupérer le nom de la boutique
      const { data: shop } = await supabase
        .from('shops')
        .select('name')
        .eq('id', shop_id)
        .single();

      const shopName = shop?.name || 'notre boutique';

      // 3. Envoyer la notification de demande d'avis
      try {
        const response = await fetch(notificationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            customer_id,
            title: 'Votre avis compte ! ⭐',
            message: `Comment s'est passée votre visite chez ${shopName} ? Donnez-nous votre avis !`,
            type: 'review_request',
            shop_id,
            url: `/shop/${shop_id}`,
          }),
        });

        const result = await response.json();

        if (result.status === 'sent' || result.status === 'no_subscription') {
          totalSent++;
        } else {
          totalFailed++;
        }
      } catch (error) {
        console.error('request-review: erreur envoi notification:', error);
        totalFailed++;
      }
    }

    return new Response(
      JSON.stringify({
        total_checked: transactions.length,
        total_sent: totalSent,
        total_skipped: totalSkipped,
        total_failed: totalFailed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('request-review error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
