-- ============================================================
-- Migration 003: Login rate limiting infrastructure
--
-- Implements PG-side rate limiting for login endpoints.
-- Edge Functions (or auth hooks) call check_rate_limit() before
-- attempting authentication to block brute-force attacks.
--
-- Usage from Edge Function:
--   const { data: allowed } = await supabase.rpc('check_rate_limit', {
--     p_identifier: email,        -- email or IP
--     p_action: 'login',
--     p_max_attempts: 5,
--     p_window_seconds: 300       -- 5 minutes
--   });
--   if (!allowed) return 429 Too Many Requests;
-- ============================================================

-- Table: rate_limit_attempts
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier  TEXT NOT NULL,        -- email, IP, or composite key
  action      TEXT NOT NULL,        -- 'login', 'password_reset', etc.
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success     BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write rate_limit_attempts (Edge Functions use service_role)
CREATE POLICY "rate_limit_service_only"
  ON public.rate_limit_attempts
  USING (false);    -- No direct access — only via SECURITY DEFINER functions

-- Index for fast lookups by identifier + action + recent window
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_action
  ON public.rate_limit_attempts(identifier, action, attempted_at DESC);

-- Auto-cleanup: delete attempts older than 24h (runs on insert)
CREATE OR REPLACE FUNCTION public.fn_cleanup_rate_limit_attempts()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.rate_limit_attempts
  WHERE attempted_at < now() - INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_cleanup_rate_limit
  AFTER INSERT ON public.rate_limit_attempts
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.fn_cleanup_rate_limit_attempts();

-- ── Core function: check + record an attempt ──────────────────────────────────
-- Returns TRUE if the attempt is allowed, FALSE if rate limited.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier      TEXT,
  p_action          TEXT,
  p_max_attempts    INTEGER DEFAULT 5,
  p_window_seconds  INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_count INTEGER;
BEGIN
  -- Count failed attempts in the window
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM public.rate_limit_attempts
  WHERE identifier = p_identifier
    AND action = p_action
    AND success = false
    AND attempted_at > now() - (p_window_seconds || ' seconds')::INTERVAL;

  IF v_attempt_count >= p_max_attempts THEN
    -- Record the blocked attempt (success = false)
    INSERT INTO public.rate_limit_attempts (identifier, action, success)
    VALUES (p_identifier, p_action, false);
    RETURN false;
  END IF;

  -- Record the attempt (caller will update success=true on success)
  INSERT INTO public.rate_limit_attempts (identifier, action, success)
  VALUES (p_identifier, p_action, false);

  RETURN true;
END;
$$;

-- ── Function: mark last attempt as successful ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_rate_limit_success(
  p_identifier TEXT,
  p_action     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.rate_limit_attempts
  SET success = true
  WHERE id = (
    SELECT id FROM public.rate_limit_attempts
    WHERE identifier = p_identifier
      AND action = p_action
    ORDER BY attempted_at DESC
    LIMIT 1
  );
END;
$$;

-- ── Function: clear rate limit (on successful auth or manual reset) ───────────
CREATE OR REPLACE FUNCTION public.reset_rate_limit(
  p_identifier TEXT,
  p_action     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rate_limit_attempts
  WHERE identifier = p_identifier
    AND action = p_action
    AND success = false;
END;
$$;

-- Grant execute to service_role (Edge Functions)
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_rate_limit_success TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit TO service_role;
