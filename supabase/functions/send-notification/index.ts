/**
 * FIDELYS — Edge Function: send-notification
 * Envoie une notification push VAPID à un client
 * SÉCURITÉ: Appelée uniquement en interne (service_role key requise)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

serve(async (req: Request) => {
  // Pas de CORS public — fonction interne uniquement
  const internalHeaders = { 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204 });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), { status: 405, headers: internalHeaders });
    }

    // ── SÉCURITÉ P0: Uniquement callable avec service_role key ────────────────
    const authHeader = req.headers.get('Authorization');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!authHeader || authHeader !== `Bearer ${supabaseServiceKey}`) {
      return new Response(JSON.stringify({ error: 'Réservé à un usage interne' }), {
        status: 403,
        headers: internalHeaders,
      });
    }
    // ── FIN SÉCURITÉ ──────────────────────────────────────────────────────────

    const body = await req.json();
    const { customer_id, title, message, type, shop_id, url } = body;

    if (!customer_id || !title || !message || !type || !shop_id) {
      return new Response(JSON.stringify({ error: 'Tous les champs sont requis' }), { status: 400, headers: internalHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer l'abonnement push du client
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('push_subscription, shop_id')
      .eq('id', customer_id)
      .single();

    if (customerError) {
      return new Response(JSON.stringify({ error: 'Client introuvable' }), { status: 404, headers: internalHeaders });
    }

    // ── SÉCURITÉ P0: Vérifier que le customer appartient bien au shop demandé ─
    if (customer.shop_id !== shop_id) {
      return new Response(JSON.stringify({ error: 'Incohérence shop/client' }), { status: 403, headers: internalHeaders });
    }

    // 2. Si pas d'abonnement, retour silencieux
    if (!customer?.push_subscription) {
      await supabase.from('notifications').insert({
        shop_id, customer_id, type, title, message, status: 'pending', scheduled_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ status: 'no_subscription' }), { status: 200, headers: internalHeaders });
    }

    // 3. Configurer web-push
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

    webpush.setVapidDetails('mailto:notifications@fidelys.app', vapidPublicKey, vapidPrivateKey);

    try {
      await webpush.sendNotification(
        customer.push_subscription,
        JSON.stringify({
          title,
          body: message,
          data: { type, shop_id, customer_id, url: url || `/shop/${shop_id}` },
        })
      );

      await supabase.from('notifications').insert({
        shop_id, customer_id, type, title, message, status: 'sent', sent_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ status: 'sent' }), { status: 200, headers: internalHeaders });
    } catch (pushError: unknown) {
      const err = pushError as { statusCode?: number };

      if (err.statusCode === 410) {
        await supabase.from('customers').update({ push_subscription: null }).eq('id', customer_id);
        await supabase.from('notifications').insert({ shop_id, customer_id, type, title, message, status: 'failed' });
        return new Response(JSON.stringify({ status: 'subscription_expired' }), { status: 200, headers: internalHeaders });
      }

      await supabase.from('notifications').insert({ shop_id, customer_id, type, title, message, status: 'failed' });
      throw pushError;
    }
  } catch (error) {
    console.error('send-notification error:', error instanceof Error ? error.message : 'unknown');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { status: 400, headers: internalHeaders }
    );
  }
});
