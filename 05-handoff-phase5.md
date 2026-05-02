# FIDELYS — Handoff Phase 5 : Notifications Push VAPID

**Statut** : ✅ Terminée  
**Date** : 2026-05-01  
**Agent** : fidelys-backend

---

## 📋 Résumé de la Phase 5

Cette phase implémente le système de notifications push VAPID pour la PWA Fidelys, permettant d'envoyer des notifications natives aux clients lorsqu'ils gagnent des points ou débloquent un nouveau palier.

---

## ✅ Livrables

### 1. Clés VAPID générées

```
Public Key: BFb51oZKsuPUoKyjt0A5ZJsKzPtfASviUHiJvDdw5BUpP13jTmnEe2Bvp1DFlDSJaoJ6tF5fjJzbQIcUfK6alJM
Private Key: z-VhJVhTAJQvMjFpnbPijvJ7cTpSXFKfsUObTR4i0Lk
```

**Action requise** : Stocker `VAPID_PRIVATE_KEY` dans Supabase Secrets :
- Dashboard Supabase > Edge Functions > Secrets
- Nom : `VAPID_PRIVATE_KEY`
- Valeur : `z-VhJVhTAJQvMjFpnbPijvJ7cTpSXFKfsUObTR4i0Lk`

La clé publique est déjà configurée dans `.env` :
```
VITE_VAPID_PUBLIC_KEY=BFb51oZKsuPUoKyjt0A5ZJsKzPtfASviUHiJvDdw5BUpP13jTmnEe2Bvp1DFlDSJaoJ6tF5fjJzbQIcUfK6alJM
```

---

### 2. Edge Function `send-notification`

**Chemin** : `supabase/functions/send-notification/index.ts`

**Input** :
```json
{
  "customer_id": "uuid",
  "title": "string",
  "message": "string",
  "type": "points_earned|tier_unlocked|custom",
  "shop_id": "uuid",
  "url": "/shop/uuid" // optionnel
}
```

**Logique** :
1. SELECT `push_subscription` FROM `customers` WHERE id = customer_id
2. Si null → retour `{ status: 'no_subscription' }` (pas d'erreur)
3. Envoi via `webpush.sendNotification()` avec les clés VAPID
4. INSERT dans `notifications` avec status='sent'
5. Si erreur 410 (subscription expirée) → UPDATE `customers` SET `push_subscription` = null
6. Retour `{ status: 'sent' | 'failed' | 'no_subscription' | 'subscription_expired' }`

**Déploiement** :
```bash
npx supabase functions deploy send-notification
```

---

### 3. Edge Function `credit-points`

**Chemin** : `supabase/functions/credit-points/index.ts`

**Logique** :
- Crédite les points au client
- Détecte le changement de palier (tier)
- Envoie automatiquement les notifications :
  - "Vous avez gagné [X] points chez [boutique] !"
  - "🎉 Félicitations ! Vous êtes maintenant [palier] !" (si tier_changed)

**Input** :
```json
{
  "shop_id": "uuid",
  "customer_id": "uuid",
  "points": 100,
  "purchase_amount": 5000,
  "note": "Achat du 01/05/2026",
  "send_notification": true // par défaut
}
```

**Déploiement** :
```bash
npx supabase functions deploy credit-points
```

---

### 4. Service Worker PWA

**Chemin** : `public/sw.js`

**Fonctionnalités** :
- Cache des assets statiques (stratégie cache-first)
- Gestion des événements `push` pour afficher les notifications natives
- Gestion du clic sur notification → ouvre la page de la boutique concernée

**Nouveaux fichiers** :
- `public/sw.js` — Service worker complet
- `public/manifest.json` — Manifeste PWA
- `index.html` — Mis à jour avec `<link rel="manifest">`

---

### 5. Hook React `usePushNotification`

**Chemin** : `src/hooks/usePushNotification.ts`

**Usage** :
```tsx
import { usePushNotification } from '../hooks/usePushNotification';

function MyComponent({ customerId }) {
  const {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    error
  } = usePushNotification(customerId);

  return (
    <button onClick={subscribe} disabled={isSubscribed}>
      {isSubscribed ? 'Abonné' : 'Activer les notifications'}
    </button>
  );
}
```

---

### 6. Composant `PushNotificationPrompt`

**Chemin** : `src/components/PushNotificationPrompt.tsx`

**Comportement** :
- S'affiche automatiquement après 10 secondes (ne pas demander immédiatement)
- Ne s'affiche pas si :
  - Déjà abonné
  - Permission refusée
  - Notifications non supportées
- Dismissible avec "Plus tard"

**Usage** :
```tsx
import { PushNotificationPrompt } from './components';

function CustomerCardPage() {
  const { customerId } = useParams();

  return (
    <>
      {/* ... contenu de la page ... */}
      <PushNotificationPrompt
        customerId={customerId}
        onDismiss={() => console.log('Prompt dismissed')}
      />
    </>
  );
}
```

---

## 🧪 Tests à effectuer

### 1. Réception sur Chrome Android
- [ ] Ouvrir la PWA sur Chrome Android
- [ ] Attendre 10 secondes → le prompt doit s'afficher
- [ ] Cliquer "Activer"
- [ ] Dans le super-admin, créditer des points à un client
- [ ] Vérifier réception de la notification "Vous avez gagné X points"

### 2. Notification de changement de palier
- [ ] Créditer suffisamment de points pour changer de palier
- [ ] Vérifier réception de la notification "🎉 Félicitations ! Vous êtes maintenant [palier]"

### 3. Test avec app fermée
- [ ] Fermer complètement la PWA
- [ ] Créditer des points
- [ ] Vérifier que la notification arrive quand même (notification système)

### 4. Fallback sans subscription
- [ ] Dans Supabase, mettre `push_subscription` = null pour un client
- [ ] Créditer des points
- [ ] Vérifier qu'il n'y a pas de crash (statut 'no_subscription')

### 5. Expiration de subscription (erreur 410)
- [ ] Simuler une erreur 410 (ou attendre qu'une subscription expire)
- [ ] Vérifier que `push_subscription` est mis à null automatiquement

---

## 📁 Fichiers créés/modifiés

| Fichier | Description |
|---------|-------------|
| `.env` | Ajout `VITE_VAPID_PUBLIC_KEY` |
| `supabase/functions/send-notification/index.ts` | Edge Function d'envoi push |
| `supabase/functions/credit-points/index.ts` | Edge Function de crédit avec notifications |
| `public/sw.js` | Service worker PWA |
| `public/manifest.json` | Manifeste PWA |
| `index.html` | Ajout `<link rel="manifest">` |
| `src/hooks/usePushNotification.ts` | Hook d'abonnement push |
| `src/components/PushNotificationPrompt.tsx` | Composant de demande d'activation |
| `src/components/index.ts` | Export du composant |
| `05-handoff-phase5.md` | Ce document |

---

## 🔐 Configuration Supabase requise

### 1. Secrets Edge Functions

Aller dans **Dashboard Supabase > Edge Functions > Secrets** et ajouter :

```
VAPID_PRIVATE_KEY=z-VhJVhTAJQvMjFpnbPijvJ7cTpSXFKfsUObTR4i0Lk
```

### 2. Déploiement des fonctions

```bash
cd fidelys-app

# Déployer send-notification
npx supabase functions deploy send-notification

# Déployer credit-points
npx supabase functions deploy credit-points
```

---

## 🚀 Prochaines étapes

### Phase 6 — Campagnes Broadcast
- Edge Function `send-campaign` avec segmentation :
  - "all", "tier:bronze", "dormant" (>30j), "recent" (<7j)
  - Option d'envoyer à tout un groupe de boutiques
- Logger chaque envoi dans `notifications`

### Phase 7 — Cron Jobs
- `dormant-reminder` : rappel clients >30j sans visite
- `birthday-bonus` : notification + bonus anniversaire
- Planification via `pg_cron` à 08h00 UTC quotidien

---

## 📝 Notes techniques

- **UX** : La demande de permission attend 10 secondes avant de s'afficher (meilleure acceptation)
- **Fallback** : Si la permission est refusée, un bandeau "Activer les notifications" peut être affiché dans les paramètres (à implémenter)
- **Erreur 410** : Gérée automatiquement pour nettoyer les subscriptions expirées
- **Notifications** : Utilisent l'API Web Push standard, compatible Chrome Android et Safari iOS 16.4+

---

**Fin de la Phase 5** ✅
