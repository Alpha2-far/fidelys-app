/**
 * FIDELYS — Edge Function: birthday-bonus
 * Cron job quotidien (07h UTC) : notification d'anniversaire aux clients
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

    // 1. Sélectionner les clients avec un profil (potentiel anniversaire)
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
        { headers: internalHeaders, status: 200 }
      );
    }

    // Filtrer les clients dont l'anniversaire est aujourd'hui
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    type CustomerRow = { id: string; shop_id: string; profile_id: string | null; first_name: string | null };
    const typedCustomers = customers as CustomerRow[];
    const profileIds = typedCustomers.map((c: CustomerRow) => c.profile_id);

    const { data: profiles, error: profilesError } = await supabase
      .from('customer_profiles')
      .select('id, birthday')
      .in('id', profileIds);

    if (profilesError) {
      throw new Error('Erreur lors de la récupération des profils');
    }

    const birthdayMap = new Map<string, Date>();
    if (profiles) {
      for (const profile of profiles as { id: string; birthday: string | null }[]) {
        if (profile.birthday) {
          birthdayMap.set(profile.id, new Date(profile.birthday));
        }
      }
    }

    const birthdayCustomers = typedCustomers.filter((customer: CustomerRow) => {
      const birthday = birthdayMap.get(customer.profile_id!);
      if (!birthday) return false;
      return (birthday.getMonth() + 1) === currentMonth && birthday.getDate() === currentDay;
    });

    if (birthdayCustomers.length === 0) {
      return new Response(
        JSON.stringify({ total_checked: customers.length, total_sent: 0 }),
        { headers: internalHeaders, status: 200 }
      );
    }

    // 2. Envoyer les notifications d'anniversaire
    const notificationUrl = `${supabaseUrl}/functions/v1/send-notification`;
    let totalSent = 0;
    let totalFailed = 0;

    for (const customer of birthdayCustomers as CustomerRow[]) {
      const { id: customer_id, shop_id, first_name } = customer;

      const { data: shop } = await supabase
        .from('shops')
        .select('name')
        .eq('id', shop_id)
        .single();

      const shopName = shop?.name || 'notre boutique';
      const customerName = first_name || '';

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
      { headers: internalHeaders, status: 200 }
    );
  } catch (error) {
    console.error('birthday-bonus error:', error instanceof Error ? error.message : 'unknown');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: internalHeaders, status: 400 }
    );
  }
});
