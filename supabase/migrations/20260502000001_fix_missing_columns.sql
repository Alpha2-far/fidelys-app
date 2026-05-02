-- ============================================================
-- Migration 001: Fix missing columns discovered during security audit
--
-- Issues:
--   1. notifications.created_at missing — used by request-review function
--   2. campaigns.sent_at missing — used by send-campaign function
--   3. shops.subscription_status CHECK constraint too restrictive (missing 'cancelled')
-- ============================================================

-- 1. Add created_at to notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill: use sent_at or now() for existing rows
UPDATE public.notifications
  SET created_at = COALESCE(sent_at, scheduled_at, now())
  WHERE created_at = now() AND (sent_at IS NOT NULL OR scheduled_at IS NOT NULL);

-- 2. Add sent_at to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- 3. Fix shops.subscription_status constraint to include 'cancelled'
-- (send-campaign uses 'cancelled' status but schema only allows 'active','trial','expired','suspended')
ALTER TABLE public.shops
  DROP CONSTRAINT IF EXISTS shops_subscription_status_check;

ALTER TABLE public.shops
  ADD CONSTRAINT shops_subscription_status_check
  CHECK (subscription_status IN ('active', 'trial', 'expired', 'suspended', 'cancelled'));

-- 4. Performance indexes for cron functions
-- dormant-reminder uses: notifications WHERE type = 'dormant_reminder' AND sent_at >= ?
CREATE INDEX IF NOT EXISTS idx_notifications_type_sent_at
  ON public.notifications(type, sent_at)
  WHERE sent_at IS NOT NULL;

-- request-review uses: notifications WHERE type = 'review_request' AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_notifications_type_created_at
  ON public.notifications(type, created_at);

-- birthday-bonus uses: customer_profiles WHERE birthday IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_customer_profiles_birthday
  ON public.customer_profiles(birthday)
  WHERE birthday IS NOT NULL;

-- scheduled-campaigns uses: campaigns WHERE status = 'scheduled' AND scheduled_at <= now()
CREATE INDEX IF NOT EXISTS idx_campaigns_status_scheduled_at
  ON public.campaigns(status, scheduled_at)
  WHERE status = 'scheduled';

-- points_transactions for request-review window query
CREATE INDEX IF NOT EXISTS idx_points_transactions_type_created_at
  ON public.points_transactions(type, created_at)
  WHERE type = 'purchase';
