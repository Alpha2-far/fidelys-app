/**
 * FIDELYS — Edge Function: create-shop-group
 * Crée un nouveau groupe de boutiques (chaîne / franchise)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  name: string;
  logo_url?: string;
  primary_color?: string;
  owner_user_id: string;
  share_points: boolean;
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
    const { name, logo_url, primary_color, owner_user_id, share_points } = body;

    // Validation
    if (!name || !owner_user_id) {
      throw new Error('Nom et owner_user_id sont requis');
    }

    // Initialiser Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier que l'utilisateur existe
    const { data: user, error: userError } = await supabase.auth.admin.getUser(owner_user_id);
    if (userError || !user) {
      throw new Error('Utilisateur propriétaire inexistant');
    }

    // Créer le groupe
    const { data: group, error: groupError } = await supabase
      .from('shop_groups')
      .insert({
        name,
        logo_url: logo_url || null,
        primary_color: primary_color || null,
        owner_user_id,
        share_points,
      })
      .select()
      .single();

    if (groupError) throw groupError;

    return new Response(
      JSON.stringify({
        group_id: group.id,
        name: group.name,
        share_points: group.share_points,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('create-shop-group error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
