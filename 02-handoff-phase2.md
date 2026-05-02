# Fidelys — Phase 2 : Super-Admin Panel — Document de Handoff

> **Projet** : Fidelys — Plateforme SaaS multi-tenant de carte de fidélité digitale
> **Client** : ON AGENCY, Cotonou, Bénin
> **Phase** : 2/8 — Super-Admin Panel
> **Date** : 2026-05-01
> **Agent** : Backend

---

## ✅ Ce qui a été fait

### 1. Interface Super-Admin (React + TypeScript)

**Pages créées** :

| Page | Route | Description |
|------|-------|-------------|
| Login | `/super-admin/login` | Authentification avec vérification rôle `super_admin` |
| Dashboard | `/super-admin/dashboard` | Stats globales (boutiques, clients, groupes, MRR) |
| Liste boutiques | `/super-admin/boutiques` | Tableau filtrable avec statuts |
| Créer boutique | `/super-admin/boutiques/nouvelle` | Formulaire avec option groupe |
| Détail boutique | `/super-admin/boutiques/:shopId` | Voir/modifier/suspendre |
| Groupes | `/super-admin/groupes` | Gestion des chaînes/franchises |

**Composants** :
- `SuperAdminLayout` — Layout avec sidebar, logo Fidelys, navigation
- Design system : fond `#0F0F14`, surface `#1A1A24`, accents dorés `#D4A843`
- Glassmorphism, animations fade-in/slide-up, skeleton loading

### 2. Edge Functions Supabase (3 fonctions)

#### `onboard-shop`
**Endpoint** : `POST /functions/v1/onboard-shop`

**Input** :
```json
{
  "name": "Boutique du Quartier",
  "slug": "boutique-du-quartier",
  "owner_email": "proprietaire@example.com",
  "owner_phone": "+229 XX XX XX XX",
  "address": "Adresse complète",
  "group_id": "uuid-optionnel"
}
```

**Actions** :
1. Vérifie la disponibilité du slug
2. Vérifie l'existence du groupe (si fourni)
3. Génère un mot de passe temporaire (16 caractères aléatoires)
4. Crée le compte Supabase Auth du propriétaire
5. Insère la boutique avec `subscription_status = 'active'`
6. Crée le lien `shop_admins` (role = 'owner')
7. Insère 3 paliers de récompense par défaut :
   - **Bronze** : 100 pts → "-5% sur votre prochain achat"
   - **Argent** : 300 pts → "-10% sur votre prochain achat"
   - **Or** : 500 pts → "-15% + cadeau surprise"

**Output** :
```json
{
  "shop_id": "uuid",
  "slug": "boutique-du-quartier",
  "owner_user_id": "uuid",
  "temporary_password": "a1b2c3d4E5F6G7H8",
  "subdomain_url": "https://boutique-du-quartier.fidelys.app"
}
```

---

#### `create-shop-group`
**Endpoint** : `POST /functions/v1/create-shop-group`

**Input** :
```json
{
  "name": "Groupe ABC",
  "logo_url": "https://...",
  "primary_color": "#D4A843",
  "owner_user_id": "uuid",
  "share_points": true
}
```

**Actions** :
1. Vérifie que l'utilisateur propriétaire existe
2. Insère le groupe dans `shop_groups`

**Output** :
```json
{
  "group_id": "uuid",
  "name": "Groupe ABC",
  "share_points": true
}
```

---

#### `update-shop-status`
**Endpoint** : `POST /functions/v1/update-shop-status`

**Input** :
```json
{
  "shop_id": "uuid",
  "new_status": "suspended"
}
```

**Statuts valides** : `active`, `suspended`, `cancelled`, `expired`, `trial`

**Actions** :
1. Vérifie que la boutique existe
2. Met à jour `subscription_status`

**Output** :
```json
{
  "shop_id": "uuid",
  "name": "Nom Boutique",
  "slug": "slug",
  "new_status": "suspended",
  "message": "Boutique suspendue"
}
```

---

## 📁 Structure des fichiers

```
fidelys-app/
├── src/
│   ├── pages/
│   │   └── super-admin/
│   │       ├── LoginPage.tsx              # Auth + vérif super_admin
│   │       ├── DashboardPage.tsx          # Stats globales
│   │       ├── ShopsListPage.tsx          # Liste filtrable
│   │       ├── CreateShopPage.tsx         # Formulaire + Edge Function
│   │       ├── ShopDetailPage.tsx         # Détail + actions
│   │       ├── GroupsPage.tsx             # Gestion groupes
│   │       └── SuperAdminLayout.tsx       # Layout sidebar
│   │
│   ├── lib/
│   │   └── supabase.ts                    # Client typé
│   │
│   ├── types/
│   │   └── database.ts                    # Types mis à jour
│   │
│   └── App.tsx                            # Routes super-admin
│
├── supabase/
│   └── functions/
│       ├── onboard-shop/
│       │   └── index.ts                   # Edge Function
│       ├── create-shop-group/
│       │   └── index.ts                   # Edge Function
│       ├── update-shop-status/
│       │   └── index.ts                   # Edge Function
│       └── import_map.json                # Import map Deno
│
└── 02-handoff-phase2.md                   # Ce document
```

---

## 🔑 Variables d'environnement requises

Les mêmes que Phase 1 + aucune nouvelle variable :

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `VITE_VAPID_PUBLIC_KEY` | Pour push notifications (Phase 5) |

**Variables côté serveur (Edge Functions)** :
- `SUPABASE_URL` — automatique Vercel
- `SUPABASE_SERVICE_ROLE_KEY` — clé admin pour les opérations privilégiées

---

## 🔧 Étapes manuelles restantes

### 1. Déployer les Edge Functions

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Login
supabase login

# Déployer les fonctions
cd supabase/functions
supabase functions deploy onboard-shop
supabase functions deploy create-shop-group
supabase functions deploy update-shop-status
```

### 2. Créer le premier super-admin

Après avoir exécuté le schéma SQL de Phase 1 :

```sql
-- 1. Créer un compte via l'auth Supabase (ou API)
-- 2. Récupérer l'user_id
-- 3. Insérer dans super_admins
INSERT INTO public.super_admins (user_id)
VALUES ('votre-user-id-ici');
```

### 3. Configurer les CORS (si nécessaire)

Les Edge Functions ont déjà les headers CORS (`*`). Pour restreindre :

```ts
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://super.fidelys.app',
  // ...
};
```

### 4. Tester le flux complet

1. Aller sur `/super-admin/login`
2. Se connecter avec le compte super-admin
3. Créer un groupe (optionnel)
4. Créer une nouvelle boutique
5. Noter le mot de passe temporaire affiché
6. Vérifier dans Supabase :
   - Table `shops` : nouvelle ligne
   - Table `shop_admins` : liaison owner
   - Table `reward_tiers` : 3 lignes (Bronze, Argent, Or)

---

## 🎨 Design — Spécifications

**Palette** :
- Fond : `#0F0F14`
- Surface : `#1A1A24`
- Élevé : `#242432`
- Primaire (or) : `#D4A843`
- Primaire clair : `#E8C87A`
- Succès : `#34D399`
- Erreur : `#EF4444`
- Texte : `#F5F5F5`
- Texte muted : `#9CA3AF`

**Typographie** :
- Body : Inter
- Display (titres) : Outfit

**Effets** :
- Glassmorphism : `backdrop-filter: blur(12px)` + border subtle
- Gradient or : `linear-gradient(135deg, #D4A843, #E8C87A)`
- Skeleton : animation pulse gauche-droite
- Transitions : `fade-in` (300ms), `slide-up` (400ms)

---

## ➡️ Comment continuer — Phase 3

La Phase 3 concerne le **Dashboard Admin Boutique** (`admin.fidelys.app` ou `:slug.fidelys.app/admin`).

**Fonctionnalités attendues** :
1. Auth shop_admin (owner/manager/vendor)
2. Dashboard boutique (stats locales)
3. Gestion des clients (liste, ajout, modification)
4. Ajout de points (manuel + QR code)
5. Gestion des paliers (récompenses)
6. Historique des transactions

**Prérequis** :
- ✅ Phase 1 (schéma DB)
- ✅ Phase 2 (super-admin fonctionnel)
- ✅ Edge Function `onboard-shop` déployée

**Agent suivant** : Frontend Agent (`fidelys-frontend`)

---

> 📋 **Checklist Phase 2** :
> - [x] Login super-admin avec vérif rôle
> - [x] Dashboard stats globales
> - [x] Liste boutiques filtrable
> - [x] Créer boutique + Edge Function
> - [x] Détail boutique (modifier/suspendre)
> - [x] Gestion des groupes
> - [x] Edge Function `onboard-shop`
> - [x] Edge Function `create-shop-group`
> - [x] Edge Function `update-shop-status`
> - [x] Build TypeScript réussi
> - [ ] Déploiement Edge Functions (manuel)
> - [ ] Création premier super-admin (manuel)
