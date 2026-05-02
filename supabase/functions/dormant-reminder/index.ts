/**
 * FIDELYS — Edge Function: dormant-reminder
 * Cron job quotidien (09h UTC) : rappel aux clients inactifs depuis 30+ jours
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

    // 1. Sélectionner les clients inactifs depuis 30+ jours
    // Exclure ceux qui ont déjà reçu un dormant_reminder dans les 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, shop_id, first_name, last_name, phone')
      .lt('last_visit_at', thirtyDaysAgo.toISOString())
      .not('id', 'in', supabase
        .from('notifications')
        .select('customer_id')
        .eq('type', 'dormant_reminder')
        .gte('sent_at', thirtyDaysAgo.toISOString())
      );

    if (customersError) {
      throw new Error('Erreur lors de la récupération des clients inactifs');
    }

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ total_checked: 0, total_sent: 0, total_skipped: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Envoyer les notifications de rappel
    const notificationUrl = `${supabaseUrl}/functions/v1/send-notification`;

    let totalSent = 0;
    let totalFailed = 0;

    for (const customer of customers) {
      const { id: customer_id, shop_id, first_name } = customer;

      // Récupérer le nom de la boutique
      const { data: shop } = await supabase
        .from('shops')
        .select('name')
        .eq('id', shop_id)
        .single();

      const shopName = shop?.name || 'notre boutique';

      // Personnaliser le message avec le prénom si disponible
      const customerName = first_name || 'cher client';

      // 3. Envoyer la notification de rappel
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('dormant-reminder error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
