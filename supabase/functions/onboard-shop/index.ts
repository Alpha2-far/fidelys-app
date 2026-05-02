/**
 * FIDELYS — Edge Function: onboard-shop
 * Crée une nouvelle boutique avec son propriétaire et ses paliers de récompense
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  name: string;
  slug: string;
  owner_email: string;
  owner_phone: string;
  address: string;
  group_id?: string;
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
    const { name, slug, owner_email, owner_phone, address, group_id } = body;

    // Validation
    if (!name || !slug || !owner_email || !owner_phone || !address) {
      throw new Error('Tous les champs sont requis');
    }

    // Initialiser Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Vérifier que le slug est disponible
    const { data: existingShop } = await supabase
      .from('shops')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingShop) {
      throw new Error('Ce slug est déjà utilisé');
    }

    // 2. Vérifier si le groupe existe (si fourni)
    if (group_id) {
      const { data: group } = await supabase
        .from('shop_groups')
        .select('id')
        .eq('id', group_id)
        .single();

      if (!group) {
        throw new Error('Groupe inexistant');
      }
    }

    // 3. Générer un mot de passe temporaire
    const temporaryPassword = Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8).toUpperCase();

    // 4. Créer le compte Supabase Auth pour le propriétaire
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: owner_email,
      password: temporaryPassword,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        // User exists, get their ID
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === owner_email);
        if (!existingUser) {
          throw new Error('Erreur lors de la création du compte');
        }
        var ownerUserId = existingUser.id;
      } else {
        throw authError;
      }
    } else {
      ownerUserId = authData.user.id;
    }

    // 5. Créer la boutique
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .insert({
        name,
        slug,
        address,
        phone: owner_phone,
        group_id: group_id || null,
        subscription_status: 'active',
        subscription_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (shopError) throw shopError;

    // 6. Lier le propriétaire comme admin
    const { error: adminError } = await supabase.from('shop_admins').insert({
      shop_id: shop.id,
      user_id: ownerUserId,
      role: 'owner',
    });

    if (adminError) throw adminError;

    // 7. Créer les 3 paliers de récompense par défaut
    const defaultTiers = [
      {
        name: 'Bronze',
        points_required: 100,
        reward_description: '-5% sur votre prochain achat',
        reward_value: '-5%',
        sort_order: 1,
      },
      {
        name: 'Argent',
        points_required: 300,
        reward_description: '-10% sur votre prochain achat',
        reward_value: '-10%',
        sort_order: 2,
      },
      {
        name: 'Or',
        points_required: 500,
        reward_description: '-15% + cadeau surprise',
        reward_value: '-15% + cadeau',
        sort_order: 3,
      },
    ];

    const { error: tiersError } = await supabase.from('reward_tiers').insert(
      defaultTiers.map((tier) => ({
        ...tier,
        shop_id: shop.id,
        active: true,
      }))
    );

    if (tiersError) throw tiersError;

    // 8. Retourner les informations
    return new Response(
      JSON.stringify({
        shop_id: shop.id,
        slug: shop.slug,
        owner_user_id: ownerUserId,
        temporary_password: temporaryPassword,
        subdomain_url: `https://${shop.slug}.fidelys.app`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('onboard-shop error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
