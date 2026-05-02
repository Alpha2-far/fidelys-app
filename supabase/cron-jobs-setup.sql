-- ============================================
-- FIDELYS — Configuration des Cron Jobs (Phase 7)
-- pg_cron pour Supabase
-- ============================================
-- À exécuter dans Supabase SQL Editor
-- Nécessite l'extension pg_cron activée
-- ============================================

-- ╔══════════════════════════════════════════╗
-- ║  1. ACTIVER L'EXTENSION pg_cron          ║
-- ╚══════════════════════════════════════════╝

-- Dans Supabase Dashboard > Database > Extensions, activer :
-- - pg_cron
-- - pg_net (pour les requêtes HTTP)

-- Vérifier que les extensions sont activées :
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- ╔══════════════════════════════════════════╗
-- ║  2. CONFIGURATION DES CRON JOBS          ║
-- ╚══════════════════════════════════════════╝

-- Note: Les Edge Functions doivent être déployées avant cette configuration.
-- Remplacer kkfnjwmioshgkukhhlqo par votre ID de projet Supabase.

-- Variable pour l'URL de base des fonctions
-- (à adapter selon votre environnement)
DO $$
DECLARE
  base_url TEXT := 'https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1';
  service_role TEXT := current_setting('app.settings_service_role_key', true);
BEGIN
  -- Si service_role_key n'est pas défini, utiliser une valeur par défaut
  IF service_role IS NULL THEN
    RAISE NOTICE 'service_role_key non défini, à configurer manuellement';
  END IF;
END $$;

-- ────────────────────────────────────────────
-- Cron 1: birthday-bonus (tous les jours à 07h00 UTC)
-- ────────────────────────────────────────────

SELECT cron.schedule(
  'birthday-bonus',
  '0 7 * * *',  -- Tous les jours à 07h00 UTC
  $$
  SELECT net.http_post(
    url := 'https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/birthday-bonus',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZm5qd21pb3NoZ2t1a2hobHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY0ODcwNiwiZXhwIjoyMDkzMjI0NzA2fQ.1cy9Tk2TvHxW0IWgScEpLv-i2xdxHPe648DwKO9ehks'
    ),
    body := jsonb_build_object('triggered_by', 'pg_cron'),
    timeout_milliseconds := 30000
  )
  $$
);

-- ────────────────────────────────────────────
-- Cron 2: dormant-reminder (tous les jours à 09h00 UTC)
-- ────────────────────────────────────────────

SELECT cron.schedule(
  'dormant-reminder',
  '0 9 * * *',  -- Tous les jours à 09h00 UTC
  $$
  SELECT net.http_post(
    url := 'https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/dormant-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZm5qd21pb3NoZ2t1a2hobHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY0ODcwNiwiZXhwIjoyMDkzMjI0NzA2fQ.1cy9Tk2TvHxW0IWgScEpLv-i2xdxHPe648DwKO9ehks'
    ),
    body := jsonb_build_object('triggered_by', 'pg_cron'),
    timeout_milliseconds := 60000
  )
  $$
);

-- ────────────────────────────────────────────
-- Cron 3: request-review (tous les jours à 10h00 UTC)
-- ────────────────────────────────────────────

SELECT cron.schedule(
  'request-review',
  '0 10 * * *',  -- Tous les jours à 10h00 UTC
  $$
  SELECT net.http_post(
    url := 'https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/request-review',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZm5qd21pb3NoZ2t1a2hobHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY0ODcwNiwiZXhwIjoyMDkzMjI0NzA2fQ.1cy9Tk2TvHxW0IWgScEpLv-i2xdxHPe648DwKO9ehks'
    ),
    body := jsonb_build_object('triggered_by', 'pg_cron'),
    timeout_milliseconds := 60000
  )
  $$
);

-- ╔══════════════════════════════════════════╗
-- ║  3. VÉRIFICATION DES JOBS PLANIFIÉS      ║
-- ╚══════════════════════════════════════════╝

-- Lister tous les cron jobs planifiés :
SELECT * FROM cron.job;

-- Vérifier l'historique des exécutions :
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- ╔══════════════════════════════════════════╗
-- ║  4. GESTION DES JOBS                     ║
-- ╚══════════════════════════════════════════╝

-- Pour désactiver un cron job :
-- SELECT cron.unschedule('birthday-bonus');

-- Pour supprimer un cron job :
-- SELECT cron.unschedule('dormant-reminder');
-- SELECT cron.unschedule('request-review');

-- Pour modifier un cron job, d'abord le supprimer puis le recréer

-- ╔══════════════════════════════════════════╗
-- ║  5. CONFIGURATION SUPPLÉMENTAIRE         ║
-- ╚══════════════════════════════════════════╝

-- Augmenter le timeout par défaut si nécessaire (en secondes) :
-- ALTER SYSTEM SET cron.timeout = 60;

-- Pour redémarrer le scheduler (si nécessaire) :
-- SELECT cron.restart();

-- ╔══════════════════════════════════════════╗
-- ║  NOTES IMPORTANTES                       ║
-- ╚══════════════════════════════════════════╝
--
-- 1. Remplacer kkfnjwmioshgkukhhlqo par votre ID de projet
-- 2. Remplacer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZm5qd21pb3NoZ2t1a2hobHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY0ODcwNiwiZXhwIjoyMDkzMjI0NzA2fQ.1cy9Tk2TvHxW0IWgScEpLv-i2xdxHPe648DwKO9ehks par votre clé de service
-- 3. Les Edge Functions doivent être déployées avant d'exécuter ce script
-- 4. pg_cron s'exécute en UTC — ajuster les heures si besoin
-- 5. Pour tester manuellement une fonction :
--    SELECT net.http_post(
--      url := 'https://kkfnjwmioshgkukhhlqo.supabase.co/functions/v1/birthday-bonus',
--      headers := jsonb_build_object('Content-Type', 'application/json'),
--      body := jsonb_build_object('test', true)
--    );
--
-- ============================================
-- FIN DE LA CONFIGURATION — Phase 7
-- ============================================
