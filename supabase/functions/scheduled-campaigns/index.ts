/**
 * FIDELYS — Edge Function: scheduled-campaigns
 * Invoquée par pg_cron chaque minute pour envoyer les campagnes programmées
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
    // Only accept POST (appel interne depuis pg_cron)
    if (req.method !== 'POST') {
      throw new Error('Méthode non autorisée');
    }

    // Initialiser Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Trouver les campagnes à envoyer
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, shop_id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (campaignsError) {
      throw new Error('Erreur lors de la récupération des campagnes');
    }

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'Aucune campagne à envoyer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 2. Envoyer chaque campagne
    let processed = 0;
    const functionsUrl = Deno.env.get('SUPABASE_FUNCTIONS_URL') ?? supabaseUrl.replace('/rest/v1', '/functions/v1');

    for (const campaign of campaigns) {
      try {
        // Appeler send-campaign pour chaque campagne
        const response = await fetch(`${functionsUrl}/send-campaign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaign_id: campaign.id,
            shop_id: campaign.shop_id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Erreur campagne ${campaign.id}:`, errorData);
          continue;
        }

        processed++;
      } catch (error) {
        console.error(`Erreur campagne ${campaign.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        processed,
        total: campaigns.length,
        message: `${processed}/${campaigns.length} campagnes traitées`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('scheduled-campaigns error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
