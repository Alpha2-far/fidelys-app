/**
 * FIDELYS — Edge Function: dormant-reminder
 * Cron job quotidien (09h UTC) : rappel aux clients inactifs depuis 30+ jours
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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // ── VULN-010 FIX: PostgREST ne supporte pas les subqueries — deux étapes ───
    // Étape 1: récupérer les customer_id déjà relancés dans les 30 derniers jours
    const { data: recentlyNotified } = await supabase
      .from('notifications')
      .select('customer_id')
      .eq('type', 'dormant_reminder')
      .gte('sent_at', thirtyDaysAgo.toISOString());

    const excludedIds = (recentlyNotified as { customer_id: string }[] | null)?.map(n => n.customer_id) ?? [];

    // Étape 2: clients inactifs depuis 30+ jours, hors ceux déjà relancés
    let query = supabase
      .from('customers')
      .select('id, shop_id, first_name')
      .lt('last_visit_at', thirtyDaysAgo.toISOString());

    if (excludedIds.length > 0) {
      query = query.not('id', 'in', `(${excludedIds.map(id => `"${id}"`).join(',')})`);
    }

    const { data: customers, error: customersError } = await query;
    // ── FIN FIX ───────────────────────────────────────────────────────────────

    if (customersError) {
      throw new Error('Erreur lors de la récupération des clients inactifs');
    }

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ total_checked: 0, total_sent: 0, total_skipped: 0 }),
        { headers: internalHeaders, status: 200 }
      );
    }

    // 2. Envoyer les notifications de rappel
    const notificationUrl = `${supabaseUrl}/functions/v1/send-notification`;
    let totalSent = 0;
    let totalFailed = 0;

    for (const customer of customers as { id: string; shop_id: string; first_name: string | null }[]) {
      const { id: customer_id, shop_id, first_name } = customer;

      const { data: shop } = await supabase
        .from('shops')
        .select('name')
        .eq('id', shop_id)
        .single();

      const shopName = shop?.name || 'notre boutique';
      const customerName = first_name || 'cher client';

      try {
        const response = await fetch(notificationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            customer_id,
            title: `${shopName} vous attend ! 👋`,
            message: `Ça fait un moment ${customerName} ! Passez nous voir, de belles surprises vous attendent.`,
            type: 'dormant_reminder',
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
        console.error('dormant-reminder: erreur envoi notification:', error);
        totalFailed++;
      }
    }

    return new Response(
      JSON.stringify({
        total_checked: customers.length,
        total_sent: totalSent,
        total_failed: totalFailed,
      }),
      { headers: internalHeaders, status: 200 }
    );
  } catch (error) {
    console.error('dormant-reminder error:', error instanceof Error ? error.message : 'unknown');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: internalHeaders, status: 400 }
    );
  }
});
