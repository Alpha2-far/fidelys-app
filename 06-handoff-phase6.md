# HANDOFF PHASE 6 — Système de Campagnes Broadcast

**Projet** : Fidelys V1  
**Agent** : `fidelys-backend`  
**Durée** : 2 jours  
**Statut** : ✅ Implémenté

---

## CONTEXTE

Fidelys V1, Phases 1-5 OK. Notifications push VAPID fonctionnelles.

---

## LIVRABLES PHASE 6

### 1. Edge Function `send-campaign`

**Chemin** : `fidelys-app/supabase/functions/send-campaign/index.ts`

**Rôle** : Envoie une campagne de notifications push à un segment de clients.

**Input** :
```json
{
  "campaign_id": "uuid",
  "shop_id": "uuid" // optionnel
}
```

**Segments supportés** :
- `all` — Tous les clients de la boutique
- `tier:[tier_name]` — Clients d'un palier spécifique (Bronze, Argent, Or)
- `dormant` — Clients sans visite depuis >30 jours
- `recent` — Nouveaux clients (<7 jours)
- `group:[group_id]` — Tous les clients de toutes les boutiques d'un groupe

**Actions** :
1. SELECT campagne avec vérification du statut
2. Résolution du segment et récupération des clients cibles
3. Pour chaque client avec `push_subscription` :
   - Appel à l'API Web Push VAPID
   - Logger dans `notifications` (sent/failed)
4. UPDATE campagne : `status = 'sent'`, `sent_count`, `sent_at`
5. Retourne `{ total_targeted, total_sent, total_failed }`

**Gestion d'erreurs** :
- 410 Gone → subscription expirée, supprimée de la DB
- Autres erreurs → loggé dans `notifications` avec `status = 'failed'`

---

### 2. Edge Function `scheduled-campaigns`

**Chemin** : `fidelys-app/supabase/functions/scheduled-campaigns/index.ts`

**Rôle** : Invoquée par pg_cron chaque minute pour envoyer les campagnes programmées.

**Déclencheur** :
```sql
SELECT cron.schedule(
  'scheduled-campaigns',
  '* * * * *',  -- Toutes les minutes
  $$SELECT net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/scheduled-campaigns',
    headers := '{"Authorization": "Bearer <service_key>"}',
    body := '{}'::jsonb
  )$$
);
```

**Logique** :
1. SELECT campagnes WHERE `status = 'scheduled'` AND `scheduled_at <= now()`
2. Pour chaque campagne : POST à `send-campaign`
3. Retourne `{ processed, total, message }`

---

### 3. Page Dashboard Admin — Campagnes

**Chemin** : `fidelys-skills/fidelys-admin-dashboard/src/pages/CampaignsPage.tsx`

**Fonctionnalités** :

#### Liste des campagnes
- Tableau avec nom, segment, date, statut, nb destinataires
- Badges de statut : Brouillon, Programmée, Envoi en cours, Envoyée, Annulée
- Bouton Envoyer pour les brouillons
- Bouton Voir le détail (à venir)

#### Créer une campagne
- **Titre** : max 60 caractères
- **Message** : max 200 caractères avec compteur
- **Segment cible** :
  - Tous les clients
  - Par palier → dropdown Bronze/Argent/Or
  - Clients dormants (>30 jours)
  - Nouveaux clients (<7 jours)
  - Si shop_group : "Tout le groupe [nom]"
- **Date d'envoi** : datetime-local ou vide pour "Maintenant"
- **Aperçu** : preview visuelle de la notification
- **Destinataires estimés** : calculé en temps réel

#### Confirmation d'envoi
- Modale avec résumé de la campagne
- Nombre de destinataires
- Bouton "Envoyer à X clients"
- Avertissement d'irréversibilité

---

### 4. Schéma de base de données

**Table `campaigns`** (déjà existante dans schema.sql) :

```sql
CREATE TABLE IF NOT EXISTS public.campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name            TEXT,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  target_segment  TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ,
  sent_count      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_campaigns_shop_id ON public.campaigns(shop_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON public.campaigns(scheduled_at);
```

**Politiques RLS** (déjà dans schema.sql) :
- SELECT/INSERT/UPDATE/DELETE : `is_shop_admin(shop_id)` ou super-admin

---

## CONFIGURATION SUPABASE

### 1. Déployer les Edge Functions

```bash
cd fidelys-app/supabase/functions
deno deploy send-campaign
deno deploy scheduled-campaigns
```

Ou via Supabase CLI :
```bash
supabase functions deploy send-campaign
supabase functions deploy scheduled-campaigns
```

### 2. Activer pg_cron

Dans Supabase Dashboard > Database > Extensions :
```sql
-- Activer pg_cron (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Activer pg_net pour les appels HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 3. Configurer le cron job

```sql
-- Toutes les minutes, vérifier les campagnes programmées
SELECT cron.schedule(
  'scheduled-campaigns',
  '* * * * *',
  $$SELECT net.http_post(
    url := 'https://<VOTRE_PROJET>.supabase.co/functions/v1/scheduled-campaigns',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}',
    body := '{}'::jsonb
  )$$
);

-- Vérifier les jobs planifiés
SELECT * FROM cron.job;
```

### 4. Variables d'environnement

Les Edge Functions nécessitent :
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

À configurer dans Supabase Dashboard > Edge Functions > Secrets.

---

## TESTS À EFFECTUER

### Test 1 : Création de campagne
- [ ] Créer une campagne avec segment "all"
- [ ] Vérifier le compteur de destinataires
- [ ] Vérifier l'aperçu de notification

### Test 2 : Envoi immédiat
- [ ] Créer une campagne sans date
- [ ] Cliquer sur "Envoyer"
- [ ] Vérifier les notifications dans la table `notifications`
- [ ] Vérifier `sent_count` et `status = 'sent'`

### Test 3 : Campagne programmée
- [ ] Créer une campagne avec date future
- [ ] Vérifier `status = 'scheduled'`
- [ ] Attendre l'heure programmée
- [ ] Vérifier que le cron job a déclenché l'envoi

### Test 4 : Segments
- [ ] Segment "tier:Bronze" — vérifier que seuls les clients Bronze reçoivent
- [ ] Segment "dormant" — vérifier filtre last_visit_at > 30j
- [ ] Segment "recent" — vérifier filtre created_at < 7j
- [ ] Segment "group:uuid" — vérifier toutes les boutiques du groupe

### Test 5 : Gestion d'erreurs
- [ ] Client sans subscription — pas d'erreur, loggé
- [ ] Subscription expirée (410) — supprimée de la DB
- [ ] Échec push — loggé dans `notifications` avec `status = 'failed'`

---

## ARCHITECTURE TECHNIQUE

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Admin (React)                                    │
│  - CampaignsPage.tsx                                        │
│  - Création, liste, envoi de campagnes                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ POST /functions/v1/send-campaign
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Edge Function: send-campaign                               │
│  1. Récupère la campagne                                    │
│  2. Résout le segment → liste des clients                   │
│  3. Boucle sur les clients :                                │
│     - webpush.sendNotification()                            │
│     - INSERT notifications (sent/failed)                    │
│  4. UPDATE campaigns (status, sent_count, sent_at)          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  pg_cron (toutes les minutes)                               │
│  SELECT campagnes WHERE scheduled <= now()                  │
│  → POST /functions/v1/scheduled-campaigns                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Edge Function: scheduled-campaigns                         │
│  - Boucle sur les campagnes trouvées                        │
│  - Appelle send-campaign pour chacune                       │
└─────────────────────────────────────────────────────────────┘
```

---

## SÉCURITÉ

- **RLS** : Seuls les admins de la boutique peuvent créer/voir/modifier/supprimer leurs campagnes
- **VAPID** : Clés stockées dans Supabase Secrets, jamais exposées côté client
- **Rate limiting** : À configurer dans Supabase pour éviter les abus (ex: 10 campagnes/heure)

---

## ÉVOLUTIONS V2

- [ ] Template de campagnes (économisez des modèles)
- [ ] A/B testing de titres/messages
- [ ] Statistiques d'ouverture/clic (si supporté par le client push)
- [ ] Exclusion : clients ayant déjà reçu une campagne similaire
- [ ] Planning récurrent (ex: tous les lundis à 9h)

---

## NOTES

- La table `campaigns` était déjà présente dans le schéma Phase 1 (préparation)
- Les notifications de type `campaign` sont logguées dans `notifications.type`
- Le segment `group:` nécessite que `share_points` soit configuré sur le groupe
- Les campagnes envoyées ne peuvent pas être renvoyées (statut `sent`)

---

**Prochaine phase** : Phase 7 — Cron Jobs Automatiques  
**Handoff Phase 7** : `07-handoff-phase7.md`
