/**
 * FIDELYS — Edge Function: birthday-bonus
 * Cron job quotidien (07h UTC) : notification d'anniversaire aux clients
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

    // 1. Sélectionner les clients dont c'est l'anniversaire aujourd'hui
    // On compare mois et jour uniquement (ignore l'année)
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, shop_id, profile_id, first_name')
      .not('profile_id', 'is', null);

    if (customersError) {
      throw new Error('Erreur lors de la récupération des clients');
    }

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ total_checked: 0, total_sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Filtrer les clients dont l'anniversaire est aujourd'hui
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // getMonth() retourne 0-11
    const currentDay = today.getDate();

    const profileIds = customers.map(c => c.profile_id);

    const { data: profiles, error: profilesError } = await supabase
      .from('customer_profiles')
      .select('id, birthday')
      .in('id', profileIds);

    if (profilesError) {
      throw new Error('Erreur lors de la récupération des profils');
    }

    // Mapper les birthdays aux customers
    const birthdayMap = new Map<string, Date>();
    if (profiles) {
      for (const profile of profiles) {
        if (profile.birthday) {
          birthdayMap.set(profile.id, new Date(profile.birthday));
        }
      }
    }

    const birthdayCustomers = customers.filter(customer => {
      const birthday = birthdayMap.get(customer.profile_id!);
      if (!birthday) return false;

      const birthMonth = birthday.getMonth() + 1;
      const birthDay = birthday.getDate();

      return birthMonth === currentMonth && birthDay === currentDay;
    });

    if (birthdayCustomers.length === 0) {
      return new Response(
        JSON.stringify({ total_checked: customers.length, total_sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Envoyer les notifications d'anniversaire
    const notificationUrl = `${supabaseUrl}/functions/v1/send-notification`;

    let totalSent = 0;
    let totalFailed = 0;

    for (const customer of birthdayCustomers) {
      const { id: customer_id, shop_id, first_name } = customer;

      // Récupérer le nom de la boutique
      const { data: shop } = await supabase
        .from('shops')
        .select('name')
        .eq('id', shop_id)
        .single();

      const shopName = shop?.name || 'notre boutique';

      // Personnaliser le message avec le prénom si disponible
      const customerName = first_name || '';

      // 3. Envoyer la notification d'anniversaire
      try {
        const response = await fetch(notificationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            customer_id,
            title: `Joyeux anniversaire ${customerName ? customerName + ' !' : '🎂'} 🎂🎉`,
            message: `${shopName} vous souhaite un très bon anniversaire !`,
            type: 'birthday',
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
        console.error('birthday-bonus: erreur envoi notification:', error);
        totalFailed++;
      }
    }

    return new Response(
      JSON.stringify({
        total_checked: customers.length,
        total_birthday: birthdayCustomers.length,
        total_sent: totalSent,
        total_failed: totalFailed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('birthday-bonus error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
