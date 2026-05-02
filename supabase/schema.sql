-- ============================================
-- FIDELYS — Schéma PostgreSQL Complet
-- Plateforme SaaS multi-tenant de fidélité
-- ON AGENCY — Cotonou, Bénin
-- ============================================
-- À exécuter dans Supabase SQL Editor (dans l'ordre)
-- RLS activé sur toutes les tables
-- ============================================

-- ╔══════════════════════════════════════════╗
-- ║  EXTENSIONS                              ║
-- ╚══════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ╔══════════════════════════════════════════╗
-- ║  TABLE 1 : shop_groups                   ║
-- ║  Groupes de boutiques (chaînes/franchises)║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.shop_groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  logo_url    TEXT,
  primary_color TEXT,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_points  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_groups ENABLE ROW LEVEL SECURITY;

-- ╔══════════════════════════════════════════╗
-- ║  TABLE 2 : shops                         ║
-- ║  Boutiques individuelles                 ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.shops (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT UNIQUE NOT NULL,
  name                  TEXT NOT NULL,
  logo_url              TEXT,
  primary_color         TEXT,
  secondary_color       TEXT,
  welcome_message       TEXT,
  currency_per_point    INTEGER NOT NULL DEFAULT 500,
  points_validity_days  INTEGER,
  address               TEXT,
  phone                 TEXT,
  group_id              UUID REFERENCES public.shop_groups(id) ON DELETE SET NULL,
  subscription_status   TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'trial', 'expired', 'suspended', 'cancelled')),
  subscription_started_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- Index pour recherche par slug (utilisé à chaque chargement client)
CREATE INDEX IF NOT EXISTS idx_shops_slug ON public.shops(slug);

-- ╔══════════════════════════════════════════╗
-- ║  TABLE 3 : shop_admins                   ║
-- ║  Liaison utilisateurs ↔ boutiques        ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.shop_admins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'vendor'
    CHECK (role IN ('owner', 'manager', 'vendor')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un utilisateur ne peut avoir qu'un rôle par boutique
  UNIQUE(shop_id, user_id)
);

ALTER TABLE public.shop_admins ENABLE ROW LEVEL SECURITY;

-- Index pour lookup rapide par user_id (utilisé dans toutes les RLS)
CREATE INDEX IF NOT EXISTS idx_shop_admins_user_id ON public.shop_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_admins_shop_id ON public.shop_admins(shop_id);

-- ╔══════════════════════════════════════════╗
-- ║  TABLE 4 : customer_profiles             ║
-- ║  Profil unifié cross-boutiques (par tél) ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone       TEXT UNIQUE NOT NULL,
  first_name  TEXT,
  last_name   TEXT,
  email       TEXT,
  birthday    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- Index pour recherche par téléphone
CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON public.customer_profiles(phone);

-- ╔══════════════════════════════════════════╗
-- ║  TABLE 5 : customers                     ║
-- ║  Clients par boutique                    ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.customers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id           UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  profile_id        UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
  first_name        TEXT,
  last_name         TEXT,
  phone             TEXT NOT NULL,
  total_points      INTEGER NOT NULL DEFAULT 0,
  lifetime_points   INTEGER NOT NULL DEFAULT 0,
  push_subscription JSONB,
  current_tier_id   UUID,  -- FK ajoutée après création de reward_tiers
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_visit_at     TIMESTAMPTZ,
  -- Un même téléphone ne peut être enregistré qu'une fois par boutique
  UNIQUE(shop_id, phone)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Index composé pour recherche par boutique
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON public.customers(profile_id);

-- ╔══════════════════════════════════════════╗
-- ║  TABLE 6 : reward_tiers                  ║
-- ║  Paliers de récompense                   ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.reward_tiers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id             UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  points_required     INTEGER NOT NULL,
  reward_description  TEXT NOT NULL,
  reward_value        TEXT,
  active              BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.reward_tiers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reward_tiers_shop_id ON public.reward_tiers(shop_id);

-- FK circulaire : customers.current_tier_id → reward_tiers.id
ALTER TABLE public.customers
  ADD CONSTRAINT fk_customers_current_tier
  FOREIGN KEY (current_tier_id) REFERENCES public.reward_tiers(id)
  ON DELETE SET NULL;

-- ╔══════════════════════════════════════════╗
-- ║  TABLE 7 : points_transactions           ║
-- ║  Historique des transactions de points   ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.points_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type            TEXT NOT NULL
    CHECK (type IN ('purchase', 'reward_claim', 'bonus', 'adjustment')),
  points          INTEGER NOT NULL,
  purchase_amount INTEGER,
  note            TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_points_transactions_shop_id ON public.points_transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_customer_id ON public.points_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON public.points_transactions(created_at DESC);

-- ╔══════════════════════════════════════════╗
-- ║  TABLE 8 : notifications                 ║
-- ║  Historique des notifications            ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_at  TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_shop_id ON public.notifications(shop_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON public.notifications(customer_id);

-- ╔══════════════════════════════════════════╗
-- ║  TABLE 9 : campaigns                     ║
-- ║  Campagnes promotionnelles               ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  target_segment  TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_campaigns_shop_id ON public.campaigns(shop_id);

-- ╔══════════════════════════════════════════╗
-- ║  TABLE AUXILIAIRE : super_admins         ║
-- ║  Accès total pour les super-admins       ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- ╔══════════════════════════════════════════╗
-- ║  TRIGGER : Auto-liaison customer_profile ║
-- ╚══════════════════════════════════════════╝

-- Fonction : quand un customer est inséré, chercher ou créer le customer_profile
CREATE OR REPLACE FUNCTION public.fn_link_customer_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Chercher un profil existant avec le même téléphone
  SELECT id INTO v_profile_id
  FROM public.customer_profiles
  WHERE phone = NEW.phone;

  -- Si aucun profil trouvé, en créer un
  IF v_profile_id IS NULL THEN
    INSERT INTO public.customer_profiles (phone, first_name, last_name)
    VALUES (NEW.phone, NEW.first_name, NEW.last_name)
    RETURNING id INTO v_profile_id;
  END IF;

  -- Lier le customer au profil
  NEW.profile_id := v_profile_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger BEFORE INSERT pour que profile_id soit défini avant l'insertion
CREATE TRIGGER trg_link_customer_profile
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_link_customer_profile();


-- ╔══════════════════════════════════════════════════╗
-- ║  POLITIQUES RLS (Row Level Security)             ║
-- ║  Architecture multi-tenant avec shop_id          ║
-- ╚══════════════════════════════════════════════════╝

-- ────────────────────────────────────────────
-- Fonction helper : vérifie si l'utilisateur est admin d'une boutique
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_shop_admin(p_shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.shop_admins
    WHERE shop_id = p_shop_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Fonction helper : vérifie si l'utilisateur est super-admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ────────────────────────────────────────────
-- shop_groups : SELECT public (branding)
-- ────────────────────────────────────────────

CREATE POLICY "shop_groups_select_public"
  ON public.shop_groups FOR SELECT
  USING (true);

CREATE POLICY "shop_groups_insert_super_admin"
  ON public.shop_groups FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "shop_groups_update_owner"
  ON public.shop_groups FOR UPDATE
  USING (auth.uid() = owner_user_id OR public.is_super_admin());

CREATE POLICY "shop_groups_delete_owner"
  ON public.shop_groups FOR DELETE
  USING (auth.uid() = owner_user_id OR public.is_super_admin());

-- ────────────────────────────────────────────
-- shops : SELECT public (branding côté client)
-- ────────────────────────────────────────────

CREATE POLICY "shops_select_public"
  ON public.shops FOR SELECT
  USING (true);

CREATE POLICY "shops_insert_admin"
  ON public.shops FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "shops_update_admin"
  ON public.shops FOR UPDATE
  USING (public.is_shop_admin(id) OR public.is_super_admin());

CREATE POLICY "shops_delete_admin"
  ON public.shops FOR DELETE
  USING (public.is_super_admin());

-- ────────────────────────────────────────────
-- shop_admins : accès restreint
-- ────────────────────────────────────────────

CREATE POLICY "shop_admins_select"
  ON public.shop_admins FOR SELECT
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "shop_admins_insert"
  ON public.shop_admins FOR INSERT
  WITH CHECK (
    -- Seuls les owners/managers peuvent ajouter des admins
    EXISTS (
      SELECT 1 FROM public.shop_admins
      WHERE shop_id = shop_admins.shop_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
    )
    OR public.is_super_admin()
  );

CREATE POLICY "shop_admins_update"
  ON public.shop_admins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_admins sa
      WHERE sa.shop_id = shop_admins.shop_id
      AND sa.user_id = auth.uid()
      AND sa.role = 'owner'
    )
    OR public.is_super_admin()
  );

CREATE POLICY "shop_admins_delete"
  ON public.shop_admins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_admins sa
      WHERE sa.shop_id = shop_admins.shop_id
      AND sa.user_id = auth.uid()
      AND sa.role = 'owner'
    )
    OR public.is_super_admin()
  );

-- ────────────────────────────────────────────
-- customer_profiles : SELECT par phone match
-- ────────────────────────────────────────────

CREATE POLICY "customer_profiles_select_own"
  ON public.customer_profiles FOR SELECT
  USING (
    -- Un client voit son propre profil (via JWT phone claim)
    -- Note : nécessite un custom claim ou une Edge Function
    -- Pour l'instant, les admins de boutiques ayant ce client y ont accès
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.shop_admins sa ON sa.shop_id = c.shop_id
      WHERE c.profile_id = customer_profiles.id
      AND sa.user_id = auth.uid()
    )
    OR public.is_super_admin()
  );

CREATE POLICY "customer_profiles_insert"
  ON public.customer_profiles FOR INSERT
  WITH CHECK (
    -- Trigger fn_link_customer_profile (SECURITY DEFINER) gère les inserts automatiques
    -- Inserts directs réservés aux admins
    public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.shop_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "customer_profiles_update"
  ON public.customer_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.shop_admins sa ON sa.shop_id = c.shop_id
      WHERE c.profile_id = customer_profiles.id
      AND sa.user_id = auth.uid()
    )
    OR public.is_super_admin()
  );

-- ────────────────────────────────────────────
-- customers : accès par shop_admins
-- ────────────────────────────────────────────

CREATE POLICY "customers_select"
  ON public.customers FOR SELECT
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "customers_insert"
  ON public.customers FOR INSERT
  WITH CHECK (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "customers_update"
  ON public.customers FOR UPDATE
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "customers_delete"
  ON public.customers FOR DELETE
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

-- ────────────────────────────────────────────
-- reward_tiers : accès par shop_admins
-- ────────────────────────────────────────────

CREATE POLICY "reward_tiers_select"
  ON public.reward_tiers FOR SELECT
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "reward_tiers_insert"
  ON public.reward_tiers FOR INSERT
  WITH CHECK (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "reward_tiers_update"
  ON public.reward_tiers FOR UPDATE
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "reward_tiers_delete"
  ON public.reward_tiers FOR DELETE
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

-- ────────────────────────────────────────────
-- points_transactions : accès par shop_admins
-- ────────────────────────────────────────────

CREATE POLICY "points_transactions_select"
  ON public.points_transactions FOR SELECT
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "points_transactions_insert"
  ON public.points_transactions FOR INSERT
  WITH CHECK (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

-- Pas de UPDATE/DELETE sur les transactions (immuable)

-- ────────────────────────────────────────────
-- notifications : accès par shop_admins
-- ────────────────────────────────────────────

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

-- ────────────────────────────────────────────
-- campaigns : accès par shop_admins
-- ────────────────────────────────────────────

CREATE POLICY "campaigns_select"
  ON public.campaigns FOR SELECT
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "campaigns_insert"
  ON public.campaigns FOR INSERT
  WITH CHECK (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "campaigns_update"
  ON public.campaigns FOR UPDATE
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

CREATE POLICY "campaigns_delete"
  ON public.campaigns FOR DELETE
  USING (
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
  );

-- ────────────────────────────────────────────
-- super_admins : seuls les super-admins voient la table
-- ────────────────────────────────────────────

CREATE POLICY "super_admins_select"
  ON public.super_admins FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admins_insert"
  ON public.super_admins FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admins_delete"
  ON public.super_admins FOR DELETE
  USING (public.is_super_admin());


-- ╔══════════════════════════════════════════╗
-- ║  TABLE AUXILIAIRE : rate_limit_attempts  ║
-- ║  Rate limiting login (brute-force)       ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier   TEXT NOT NULL,
  action       TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success      BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limit_service_only"
  ON public.rate_limit_attempts
  USING (false);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_action
  ON public.rate_limit_attempts(identifier, action, attempted_at DESC);

CREATE OR REPLACE FUNCTION public.fn_cleanup_rate_limit_attempts()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.rate_limit_attempts WHERE attempted_at < now() - INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_cleanup_rate_limit
  AFTER INSERT ON public.rate_limit_attempts
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.fn_cleanup_rate_limit_attempts();

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier     TEXT,
  p_action         TEXT,
  p_max_attempts   INTEGER DEFAULT 5,
  p_window_seconds INTEGER DEFAULT 300
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_attempts
  WHERE identifier = p_identifier AND action = p_action
    AND success = false
    AND attempted_at > now() - (p_window_seconds || ' seconds')::INTERVAL;

  INSERT INTO public.rate_limit_attempts (identifier, action, success)
  VALUES (p_identifier, p_action, false);

  RETURN v_count < p_max_attempts;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_rate_limit(p_identifier TEXT, p_action TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.rate_limit_attempts
  WHERE identifier = p_identifier AND action = p_action AND success = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit TO service_role;


-- ╔══════════════════════════════════════════╗
-- ║  FIN DU SCHÉMA                           ║
-- ╚══════════════════════════════════════════╝
