/**
 * FIDELYS — Edge Function: request-review
 * Cron job quotidien (10h UTC) : demande d'avis aux clients ayant acheté il y a ~24h
 * SÉCURITÉ: Appelée uniquement par pg_cron (service_role key requise)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  const internalHeaders = { 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204 });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { status: 405, headers: internalHeaders });
    }

    // ── SÉCURITÉ P0: Uniquement callable par pg_cron (service_role key) ────────
    const authHeader = req.headers.get('Authorization');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!authHeader || authHeader !== `Bearer ${supabaseServiceKey}`) {
      return new Response(JSON.stringify({ error: 'Réservé à un usage interne' }), {
        status: 403,
        headers: internalHeaders,
      });
    }
    // ── FIN SÉCURITÉ ──────────────────────────────────────────────────────────

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
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
        { headers: internalHeaders, status: 200 }
      );
    }

    // 2. Pour chaque transaction, vérifier qu'on n'a pas déjà envoyé de review_request
    const notificationUrl = `${supabaseUrl}/functions/v1/send-notification`;
    let totalSent = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const transaction of transactions as { id: string; shop_id: string; customer_id: string; created_at: string }[]) {
      const { shop_id, customer_id } = transaction;

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

      const { data: shop } = await supabase
        .from('shops')
        .select('name')
        .eq('id', shop_id)
        .single();

      const shopName = shop?.name || 'notre boutique';

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
      { headers: internalHeaders, status: 200 }
    );
  } catch (error) {
    console.error('request-review error:', error instanceof Error ? error.message : 'unknown');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: internalHeaders, status: 400 }
    );
  }
});
