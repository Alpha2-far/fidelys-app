/**
 * FIDELYS — Edge Function: send-notification
 * Envoie une notification push VAPID à un client
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  customer_id: string;
  title: string;
  message: string;
  type: string;
  shop_id: string;
  url?: string;
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
    const { customer_id, title, message, type, shop_id, url } = body;

    // Validation
    if (!customer_id || !title || !message || !type || !shop_id) {
      throw new Error('Tous les champs sont requis');
    }

    // Initialiser Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer l'abonnement push du client
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('push_subscription, profile_id')
      .eq('id', customer_id)
      .single();

    if (customerError) {
      throw new Error('Client introuvable');
    }

    // 2. Si pas d'abonnement, retour silencieux (pas d'erreur)
    if (!customer?.push_subscription) {
      // Logger quand même la notification tentée
      await supabase.from('notifications').insert({
        shop_id,
        customer_id,
        type,
        title,
        message,
        status: 'pending',
        scheduled_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ status: 'no_subscription' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // 3. Configurer web-push avec les clés VAPID
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

    webpush.setVapidDetails(
      'mailto:notifications@fidelys.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    // 4. Envoyer la notification
    const subscription = customer.push_subscription;

    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title,
          body: message,
          data: {
            type,
            shop_id,
            customer_id,
            url: url || `/shop/${shop_id}`,
          },
        })
      );

      // 5. Logger la notification envoyée
      await supabase.from('notifications').insert({
        shop_id,
        customer_id,
        type,
        title,
        message,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ status: 'sent' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (pushError: any) {
      // 6. Gérer l'erreur 410 (subscription expirée)
      if (pushError.statusCode === 410) {
        // Subscription expirée, la supprimer
        await supabase
          .from('customers')
          .update({ push_subscription: null })
          .eq('id', customer_id);

        await supabase.from('notifications').insert({
          shop_id,
          customer_id,
          type,
          title,
          message,
          status: 'failed',
        });

        return new Response(
          JSON.stringify({ status: 'subscription_expired' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Autre erreur
      await supabase.from('notifications').insert({
        shop_id,
        customer_id,
        type,
        title,
        message,
        status: 'failed',
      });

      throw pushError;
    }
  } catch (error) {
    console.error('send-notification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
