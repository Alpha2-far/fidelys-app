-- ============================================================
-- FIDELYS — Setup pg_cron Jobs
-- SÉCURITÉ: Ne jamais committer la service_role key ici.
-- Utiliser Supabase Vault ou substituer __SERVICE_ROLE_KEY__
-- avant d'exécuter ce fichier (ex: via script CI/CD).
--
-- Pour obtenir la clé: Dashboard → Settings → API → service_role
-- Pour exécuter: Supabase SQL Editor (JAMAIS committer avec la vraie clé)
-- ============================================================

-- Supprimer si déjà planifiés
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('birthday-bonus','dormant-reminder','request-review','scheduled-campaigns');

-- Birthday bonus - 07h00 UTC
SELECT cron.schedule(
  'birthday-bonus',
  '0 7 * * *',
  format(
    'SELECT net.http_post(url:=''https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/birthday-bonus'',headers:=''{"Content-Type":"application/json","Authorization":"Bearer %s"}''::jsonb,body:=''{"triggered_by":"pg_cron"}''::jsonb,timeout_milliseconds:=30000)',
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  )
);

-- Dormant reminder - 09h00 UTC
SELECT cron.schedule(
  'dormant-reminder',
  '0 9 * * *',
  format(
    'SELECT net.http_post(url:=''https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/dormant-reminder'',headers:=''{"Content-Type":"application/json","Authorization":"Bearer %s"}''::jsonb,body:=''{"triggered_by":"pg_cron"}''::jsonb,timeout_milliseconds:=60000)',
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  )
);

-- Request review - 10h00 UTC
SELECT cron.schedule(
  'request-review',
  '0 10 * * *',
  format(
    'SELECT net.http_post(url:=''https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/request-review'',headers:=''{"Content-Type":"application/json","Authorization":"Bearer %s"}''::jsonb,body:=''{"triggered_by":"pg_cron"}''::jsonb,timeout_milliseconds:=60000)',
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  )
);

-- Scheduled campaigns - toutes les minutes
SELECT cron.schedule(
  'scheduled-campaigns',
  '* * * * *',
  format(
    'SELECT net.http_post(url:=''https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/scheduled-campaigns'',headers:=''{"Content-Type":"application/json","Authorization":"Bearer %s"}''::jsonb,body:=''{}''::jsonb,timeout_milliseconds:=30000)',
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
  )
);

-- ============================================================
-- ÉTAPE REQUISE: Stocker la service_role key dans Vault
-- Exécuter UNE SEULE FOIS dans le SQL Editor:
--
-- SELECT vault.create_secret(
--   'REMPLACER_PAR_VOTRE_SERVICE_ROLE_KEY',
--   'service_role_key',
--   'Clé service_role pour les cron jobs pg_cron'
-- );
-- ============================================================

-- Vérification
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
