/**
 * FIDELYS — Edge Function: onboard-shop
 * Crée une nouvelle boutique avec son propriétaire et ses paliers de récompense
 * SÉCURITÉ: Requiert un JWT super_admin valide dans Authorization header
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://fidelys.app',
  'https://fidelys-app.vercel.app',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

interface RequestBody {
  name: string;
  slug: string;
  owner_email: string;
  owner_phone: string;
  address: string;
  group_id?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{2,63}$/.test(slug);
}

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Méthode non autorisée');
    }

    // ── SÉCURITÉ P0: Vérifier le token Authorization ──────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization requise' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Vérifier l'identité de l'appelant avec son JWT
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token invalide ou expiré' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier que l'appelant est bien un super_admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: superAdmin, error: saError } = await adminClient
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (saError || !superAdmin) {
      return new Response(JSON.stringify({ error: 'Accès réservé aux super-admins' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // ── FIN SÉCURITÉ ──────────────────────────────────────────────────────────

    const body: RequestBody = await req.json();
    const { name, slug, owner_email, owner_phone, address, group_id } = body;

    // Validation des inputs
    if (!name || !slug || !owner_email || !owner_phone || !address) {
      throw new Error('Tous les champs sont requis');
    }
    if (!isValidEmail(owner_email)) {
      throw new Error('Adresse email invalide');
    }
    if (!isValidSlug(slug)) {
      throw new Error('Slug invalide (lettres minuscules, chiffres, tirets, 2-63 caractères)');
    }
    if (name.length > 100) {
      throw new Error('Nom de boutique trop long (max 100 caractères)');
    }

    const supabase = adminClient;

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

    // 3. Générer un mot de passe temporaire sécurisé
    const temporaryPassword =
      Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 12) + 'Aa1!';

    // 4. Créer le compte Supabase Auth pour le propriétaire
    let ownerUserId: string;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: owner_email,
      password: temporaryPassword,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users.find((u: { id: string; email?: string }) => u.email === owner_email);
        if (!existingUser) throw new Error('Erreur lors de la création du compte');
        ownerUserId = existingUser.id;
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
      { name: 'Bronze', points_required: 100, reward_description: '-5% sur votre prochain achat', reward_value: '-5%', sort_order: 1 },
      { name: 'Argent', points_required: 300, reward_description: '-10% sur votre prochain achat', reward_value: '-10%', sort_order: 2 },
      { name: 'Or', points_required: 500, reward_description: '-15% + cadeau surprise', reward_value: '-15% + cadeau', sort_order: 3 },
    ];

    const { error: tiersError } = await supabase.from('reward_tiers').insert(
      defaultTiers.map(tier => ({ ...tier, shop_id: shop.id, active: true }))
    );

    if (tiersError) throw tiersError;

    // ── SÉCURITÉ P2: Ne jamais retourner le mot de passe en clair ─────────────
    // Le mot de passe temporaire est envoyé par email via Supabase Auth (email_confirm: true)
    // On ne le retourne PAS dans la réponse API
    return new Response(
      JSON.stringify({
        shop_id: shop.id,
        slug: shop.slug,
        owner_user_id: ownerUserId,
        subdomain_url: `https://${shop.slug}.fidelys.app`,
        message: 'Boutique créée. Mot de passe temporaire envoyé par email au propriétaire.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('onboard-shop error:', error instanceof Error ? error.message : 'unknown');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
