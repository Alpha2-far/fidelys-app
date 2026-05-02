-- ============================================================
-- FIDELYS — Configuration des Cron Jobs
-- SÉCURITÉ: Ne jamais committer la service_role key ici.
-- Ce fichier utilise Supabase Vault pour lire la clé de façon sécurisée.
--
-- ÉTAPE 1 — Stocker la clé dans Vault (une seule fois) :
--   SELECT vault.create_secret(
--     'VOTRE_SERVICE_ROLE_KEY_ICI',
--     'service_role_key',
--     'Clé service_role pour les cron jobs pg_cron'
--   );
--
-- ÉTAPE 2 — Activer les extensions dans Dashboard > Database > Extensions :
--   - pg_cron
--   - pg_net
--   - supabase_vault (Vault)
--
-- ÉTAPE 3 — Exécuter ce fichier dans le SQL Editor
-- ============================================================

-- Vérifier que les extensions sont disponibles
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- Supprimer les anciens jobs si existants
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN ('birthday-bonus', 'dormant-reminder', 'request-review', 'scheduled-campaigns');

-- ────────────────────────────────────────────
-- Cron 1: birthday-bonus (tous les jours à 07h00 UTC)
-- ────────────────────────────────────────────
SELECT cron.schedule(
  'birthday-bonus',
  '0 7 * * *',
  format(
    'SELECT net.http_post(url:=''https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/birthday-bonus'',headers:=''{"Content-Type":"application/json","Authorization":"Bearer %s"}''::jsonb,body:=''{"triggered_by":"pg_cron"}''::jsonb,timeout_milliseconds:=30000)',
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  )
);

-- ────────────────────────────────────────────
-- Cron 2: dormant-reminder (tous les jours à 09h00 UTC)
-- ────────────────────────────────────────────
SELECT cron.schedule(
  'dormant-reminder',
  '0 9 * * *',
  format(
    'SELECT net.http_post(url:=''https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/dormant-reminder'',headers:=''{"Content-Type":"application/json","Authorization":"Bearer %s"}''::jsonb,body:=''{"triggered_by":"pg_cron"}''::jsonb,timeout_milliseconds:=60000)',
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  )
);

-- ────────────────────────────────────────────
-- Cron 3: request-review (tous les jours à 10h00 UTC)
-- ────────────────────────────────────────────
SELECT cron.schedule(
  'request-review',
  '0 10 * * *',
  format(
    'SELECT net.http_post(url:=''https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/request-review'',headers:=''{"Content-Type":"application/json","Authorization":"Bearer %s"}''::jsonb,body:=''{"triggered_by":"pg_cron"}''::jsonb,timeout_milliseconds:=60000)',
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  )
);

-- ────────────────────────────────────────────
-- Cron 4: scheduled-campaigns (toutes les minutes)
-- ────────────────────────────────────────────
SELECT cron.schedule(
  'scheduled-campaigns',
  '* * * * *',
  format(
    'SELECT net.http_post(url:=''https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/scheduled-campaigns'',headers:=''{"Content-Type":"application/json","Authorization":"Bearer %s"}''::jsonb,body:=''{}''::jsonb,timeout_milliseconds:=30000)',
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  )
);

-- Vérification
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;

-- Historique des exécutions récentes
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
