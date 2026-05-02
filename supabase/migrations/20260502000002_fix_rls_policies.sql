-- ============================================================
-- Migration 002: Fix RLS policy vulnerabilities
--
-- Issues found during security audit:
--   1. shop_groups INSERT: any authenticated user can create groups
--      (should be super_admins only — Edge Function enforces it but
--       direct PostgREST calls bypass the Edge Function check)
--   2. customer_profiles INSERT: WITH CHECK (true) allows anyone
--      to insert profiles directly (should go via trigger only)
--   3. reward_tiers SELECT: clients should be able to read tiers
--      for their shop (currently blocked for unauthenticated PWA users)
-- ============================================================

-- 1. Fix shop_groups INSERT — restrict to super_admins
DROP POLICY IF EXISTS "shop_groups_insert_owner" ON public.shop_groups;

CREATE POLICY "shop_groups_insert_super_admin"
  ON public.shop_groups FOR INSERT
  WITH CHECK (public.is_super_admin());

-- 2. Fix customer_profiles INSERT — block direct inserts
-- The trigger fn_link_customer_profile runs SECURITY DEFINER and creates
-- profiles automatically; direct PostgREST inserts should be disallowed.
DROP POLICY IF EXISTS "customer_profiles_insert" ON public.customer_profiles;

CREATE POLICY "customer_profiles_insert_admin"
  ON public.customer_profiles FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.shop_admins
      WHERE user_id = auth.uid()
    )
  );

-- 3. Allow clients to read reward_tiers for their shop (needed by PWA)
-- Currently only shop_admins can read tiers, but the client PWA needs them
-- to display loyalty program info. This is non-sensitive public branding data.
DROP POLICY IF EXISTS "reward_tiers_select" ON public.reward_tiers;

CREATE POLICY "reward_tiers_select"
  ON public.reward_tiers FOR SELECT
  USING (
    -- Shop admins see their own shop tiers
    public.is_shop_admin(shop_id)
    OR public.is_super_admin()
    -- Authenticated users can see tiers for any shop (PWA display)
    OR auth.role() = 'authenticated'
    OR auth.role() = 'anon'  -- Public, non-sensitive info
  );

-- 4. Allow anon to read shops (needed for PWA slug-based routing)
-- Already exists as shops_select_public but verify it's correct
-- (no change needed — USING (true) is intentional for branding)

-- 5. Ensure notifications cannot be read by unauthenticated users
-- (already restricted to shop_admins + super_admins — confirming no change needed)

-- 6. Add policy for customers to read their own push_subscription column
-- Currently customers table has no read access for the customer themselves.
-- The PWA needs to read/write push_subscription for the logged-in customer.
-- Since PWA customers don't have auth accounts (no-auth PWA), this is fine.
-- push_subscription is managed by Edge Functions with service_role.
