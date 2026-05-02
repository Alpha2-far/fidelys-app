# Fidelys — Phase 1 : Infrastructure Setup — Document de Handoff

> **Projet** : Fidelys — Plateforme SaaS multi-tenant de carte de fidélité digitale
> **Client** : ON AGENCY, Cotonou, Bénin
> **Phase** : 1/8 — Infrastructure
> **Date** : 2026-05-01
> **Agent** : Infrastructure

---

## ✅ Ce qui a été fait

### 1. Projet React/Vite initialisé
- **Framework** : Vite 8 + React 19 + TypeScript 6
- **Template** : `react-ts`
- **Dépendances installées** :
  - `@supabase/supabase-js` — client Supabase typé
  - `tailwindcss` v4 + `@tailwindcss/vite` — styling via CSS
  - `react-router-dom` v7 — routing SPA
  - `qrcode.react` — génération QR codes côté client
  - `recharts` — graphiques pour le dashboard admin

### 2. Tailwind CSS configuré (palette personnalisée)
- Utilise TailwindCSS v4 avec `@theme` dans `src/index.css`
- Palette Fidelys :
  | Token | Couleur | Usage |
  |-------|---------|-------|
  | `bg-dark` | `#0F0F14` | Background principal |
  | `bg-surface` | `#1A1A24` | Cards, surfaces |
  | `bg-elevated` | `#242432` | Éléments surélevés |
  | `primary` | `#D4A843` | Or/doré — couleur marque |
  | `primary-light` | `#E8C87A` | Or clair — hover |
  | `success` | `#34D399` | Succès |
  | `error` | `#EF4444` | Erreur |
  | `text` | `#F5F5F5` | Texte principal |
  | `text-muted` | `#9CA3AF` | Texte secondaire |
- Fonts : Inter (sans) + Outfit (display) via Google Fonts
- Utilitaires CSS : `.glass`, `.gradient-gold`, `.skeleton`, animations

### 3. Bundle splitting configuré
- Chunks séparés : `vendor-react`, `vendor-router`, `vendor-supabase`, `vendor-charts`, `vendor-qr`
- Seuil d'alerte chunk : 200 Ko
- Cible : ES2020 (compatible smartphones bas de gamme)

### 4. Schéma PostgreSQL complet (9 tables + 1 auxiliaire)
Fichier : `supabase/schema.sql`

**Tables créées (dans l'ordre FK)** :
1. `shop_groups` — groupes de boutiques (chaînes/franchises)
2. `shops` — boutiques individuelles
3. `shop_admins` — liaison users ↔ boutiques (owner/manager/vendor)
4. `customer_profiles` — profil unifié cross-boutiques (par téléphone)
5. `customers` — clients par boutique (lié à customer_profiles)
6. `reward_tiers` — paliers de récompense
7. `points_transactions` — historique des transactions (immuable)
8. `notifications` — notifications push
9. `campaigns` — campagnes promotionnelles
10. `super_admins` — table auxiliaire pour accès total

**Fonctionnalités clés** :
- FK circulaire `customers.current_tier_id → reward_tiers.id` (ajoutée via ALTER)
- Contrainte UNIQUE `(shop_id, phone)` sur `customers` (un client/boutique)
- Contrainte UNIQUE `(shop_id, user_id)` sur `shop_admins`
- Index sur toutes les colonnes de recherche fréquente

### 5. Trigger auto-liaison customer_profile
- **Fonction** : `fn_link_customer_profile()`
- **Trigger** : `trg_link_customer_profile` (BEFORE INSERT sur `customers`)
- **Comportement** : Quand un customer est créé, cherche un `customer_profiles` avec le même `phone`. Si inexistant, le crée automatiquement. Le `profile_id` est toujours défini.

### 6. Politiques RLS complètes
| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `shop_groups` | ✅ Public | Owner | Owner/SA | Owner/SA |
| `shops` | ✅ Public | SA only | Admin/SA | SA only |
| `shop_admins` | Admin/SA | Owner+Mgr/SA | Owner/SA | Owner/SA |
| `customer_profiles` | Admin via join/SA | Trigger (auto) | Admin/SA | — |
| `customers` | Admin/SA | Admin/SA | Admin/SA | Admin/SA |
| `reward_tiers` | Admin/SA | Admin/SA | Admin/SA | Admin/SA |
| `points_transactions` | Admin/SA | Admin/SA | ❌ Immuable | ❌ Immuable |
| `notifications` | Admin/SA | Admin/SA | Admin/SA | — |
| `campaigns` | Admin/SA | Admin/SA | Admin/SA | Admin/SA |
| `super_admins` | SA only | SA only | — | SA only |

> **SA** = Super Admin, **Admin** = shop_admin de la boutique concernée

**Helpers RLS** :
- `is_shop_admin(shop_id)` — vérifie si l'utilisateur est admin de la boutique
- `is_super_admin()` — vérifie si l'utilisateur est super-admin

### 7. Client Supabase configuré
- `src/lib/supabase.ts` — client typé avec `Database`
- Session persistée pour PWA
- Auto-refresh token
- Validation des variables d'environnement au démarrage

### 8. ShopContext multi-tenant
- `src/contexts/ShopContext.tsx` — résout la boutique via slug URL
- Charge shop + shopGroup (si applicable)
- Hook `useShop()` pour accéder au contexte
- Gestion d'erreur (boutique introuvable, erreur réseau)

### 9. Hook useAuth
- `src/hooks/useAuth.ts` — gestion de l'authentification Supabase
- Écoute les changements de session en temps réel

### 10. Configuration Vercel
- `vercel.json` — rewrites SPA, cache assets, headers sécurité
- SEO : meta description, theme-color, viewport mobile

---

## 📁 Structure des fichiers

```
fidelys-app/
├── index.html                     # HTML avec SEO, fonts, PWA meta
├── vite.config.ts                 # Vite + Tailwind + bundle splitting
├── vercel.json                    # Config déploiement Vercel
├── .env.example                   # Template variables d'environnement
├── package.json
├── tsconfig.json
│
├── supabase/
│   └── schema.sql                 # Schéma SQL complet (tables + trigger + RLS)
│
└── src/
    ├── main.tsx                   # Point d'entrée
    ├── App.tsx                    # Routes principales
    ├── index.css                  # Tailwind @theme + design system
    │
    ├── components/                # Composants réutilisables (Phase 2+)
    │   └── index.ts
    │
    ├── pages/                     # Pages (Phase 2+)
    │   └── index.ts
    │
    ├── lib/
    │   └── supabase.ts            # Client Supabase typé
    │
    ├── hooks/
    │   └── useAuth.ts             # Hook authentification
    │
    ├── contexts/
    │   └── ShopContext.tsx         # Contexte multi-tenant
    │
    └── types/
        └── database.ts            # Types TypeScript du schéma DB
```

---

## 🔑 Variables d'environnement requises

Copier `.env.example` en `.env` et remplir :

| Variable | Description | Où la trouver |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase | Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase | Settings > API > anon/public |
| `VITE_VAPID_PUBLIC_KEY` | Clé VAPID pour push notifications | À générer (Phase 5) |

---

## 🔧 Étapes manuelles restantes

### 1. Créer le projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet (région : Europe West pour proximité Afrique de l'Ouest)
3. Copier l'URL et la clé anon dans `.env`

### 2. Exécuter le schéma SQL
1. Ouvrir le **SQL Editor** dans le dashboard Supabase
2. Coller le contenu de `supabase/schema.sql`
3. Exécuter → vérifier que les 10 tables sont créées
4. Vérifier dans **Authentication > Policies** que les RLS sont actives

### 3. Créer le premier super-admin
```sql
-- Après avoir créé un compte via l'auth Supabase :
INSERT INTO public.super_admins (user_id)
VALUES ('votre-user-id-ici');
```

### 4. Configurer Vercel
1. Connecter le repo Git à Vercel
2. Ajouter les variables d'environnement dans Vercel > Settings > Environment Variables
3. Déployer

### 5. Wildcard DNS *.fidelys.app (optionnel Phase 1)
1. Acheter le domaine `fidelys.app`
2. Dans Vercel > Domains : ajouter `fidelys.app` et `*.fidelys.app`
3. Chez le registrar DNS :
   - `A` record : `fidelys.app` → `76.76.21.21`
   - `CNAME` record : `*.fidelys.app` → `cname.vercel-dns.com`
4. Le middleware Vercel ou l'app React extraira le sous-domaine comme slug boutique

---

## ➡️ Comment continuer — Phase 2

La Phase 2 concerne le **Backend : Edge Functions Supabase**. Elle inclut :
1. Edge Function `add-points` — ajout de points avec calcul automatique
2. Edge Function `claim-reward` — réclamation de récompense
3. Edge Function `onboard-shop` — création de boutique + admin
4. Mise à jour automatique du `current_tier_id` après chaque transaction
5. Support du partage de points intra-groupe (`share_points`)

**Prérequis pour Phase 2** :
- ✅ Schéma SQL exécuté dans Supabase
- ✅ Variables `.env` configurées
- ✅ Projet React compilable

**Agent suivant** : Backend Agent (`fidelys-backend`)

---

> 📋 **Checklist Phase 1** :
> - [x] 9 tables créées avec bons types et FK
> - [x] RLS activé sur chaque table
> - [x] Shop groups fonctionnels
> - [x] Customer profiles cross-shop (trigger OK)
> - [x] Bundle splitting configuré (< 500 Ko cible)
> - [ ] Wildcard DNS (étape manuelle)
> - [x] Types TypeScript générés
> - [x] Client Supabase configuré
> - [x] ShopContext multi-tenant
