/**
 * FIDELYS — Hook: usePushNotification
 * Gestion de l'abonnement aux notifications push pour la PWA
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Convertit une clé publique VAPID en format Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

interface UsePushNotificationResult {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<void>;
  error: string | null;
}

/**
 * Hook pour gérer l'abonnement aux notifications push
 */
export function usePushNotification(customerId?: string): UsePushNotificationResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [error, setError] = useState<string | null>(null);

  // Vérifier si les notifications sont supportées
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);

      // Vérifier la permission actuelle
      setPermission(Notification.permission);
    }
  }, []);

  // Vérifier l'état d'abonnement au chargement
  useEffect(() => {
    if (!isSupported || !customerId) return;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          setIsSubscribed(true);
        } else {
          setIsSubscribed(false);
        }
      } catch (err) {
        console.error('Erreur vérification subscription:', err);
      }
    };

    checkSubscription();
  }, [isSupported, customerId]);

  /**
   * Demander la permission et s'abonner aux notifications
   */
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Les notifications push ne sont pas supportées sur cet appareil');
      return;
    }

    try {
      setError(null);

      // 1. Demander la permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError('Permission refusée');
        return;
      }

      // 2. Enregistrer le service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // 3. S'abonner au push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // 4. Sauvegarder l'abonnement dans Supabase
      if (customerId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('customers')
          .update({ push_subscription: subscription.toJSON() })
          .eq('id', customerId);

        if (updateError) {
          console.error('Erreur sauvegarde subscription:', updateError);
          // Désubscrire en cas d'erreur
          await subscription.unsubscribe();
          throw new Error('Erreur lors de la sauvegarde de l\'abonnement');
        }
      }

      setIsSubscribed(true);
    } catch (err: any) {
      console.error('Erreur subscription push:', err);
      setError(err.message || 'Erreur lors de l\'abonnement');
    }
  }, [isSupported, customerId, VAPID_PUBLIC_KEY]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    error,
  };
}
