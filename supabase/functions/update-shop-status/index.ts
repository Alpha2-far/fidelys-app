/**
 * FIDELYS — Edge Function: update-shop-status
 * Met à jour le statut d'une boutique (active/suspended/cancelled)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  shop_id: string;
  new_status: 'active' | 'suspended' | 'cancelled' | 'expired' | 'trial';
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
    const { shop_id, new_status } = body;

    // Validation
    if (!shop_id || !new_status) {
      throw new Error('shop_id et new_status sont requis');
    }

    const validStatuses = ['active', 'suspended', 'cancelled', 'expired', 'trial'];
    if (!validStatuses.includes(new_status)) {
      throw new Error(`Statut invalide. Valeurs acceptées: ${validStatuses.join(', ')}`);
    }

    // Initialiser Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier que la boutique existe
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id, name, slug')
      .eq('id', shop_id)
      .single();

    if (shopError || !shop) {
      throw new Error('Boutique introuvable');
    }

    // Mettre à jour le statut
    const { error: updateError } = await supabase
      .from('shops')
      .update({ subscription_status: new_status })
      .eq('id', shop_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        shop_id: shop.id,
        name: shop.name,
        slug: shop.slug,
        new_status,
        message: `Boutique ${new_status === 'active' ? 'réactivée' : new_status === 'suspended' ? 'suspendue' : 'mise à jour'}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('update-shop-status error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
