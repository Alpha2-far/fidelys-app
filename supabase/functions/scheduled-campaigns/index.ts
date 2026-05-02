/**
 * FIDELYS — Edge Function: scheduled-campaigns
 * Invoquée par pg_cron chaque minute pour envoyer les campagnes programmées
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
        { headers: internalHeaders, status: 200 }
      );
    }

    // 2. Envoyer chaque campagne via send-campaign (appel interne avec service_role)
    let processed = 0;
    const functionsUrl = `${supabaseUrl.replace('/rest/v1', '')}/functions/v1`;

    for (const campaign of campaigns as { id: string; shop_id: string }[]) {
      try {
        const response = await fetch(`${functionsUrl}/send-campaign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ campaign_id: campaign.id }),
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
        message: `${processed}/${campaigns.length} campagnes traitées`,
      }),
      { headers: internalHeaders, status: 200 }
    );
  } catch (error) {
    console.error('scheduled-campaigns error:', error instanceof Error ? error.message : 'unknown');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { headers: internalHeaders, status: 400 }
    );
  }
});
