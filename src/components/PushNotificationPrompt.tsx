/**
 * FIDELYS — Composant: PushNotificationPrompt
 * Affiche une invitation à activer les notifications push après un délai
 */

import { useState, useEffect } from 'react';
import { usePushNotification } from '../hooks/usePushNotification';

interface PushNotificationPromptProps {
  customerId?: string;
  onDismiss: () => void;
}

export function PushNotificationPrompt({ customerId, onDismiss }: PushNotificationPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const { isSupported, isSubscribed, permission, subscribe, error } = usePushNotification(customerId);

  // Afficher le prompt après 10 secondes (UX : ne pas demander immédiatement)
  useEffect(() => {
    // Ne pas montrer si déjà abonné ou permission refusée
    if (isSubscribed || permission === 'denied') {
      return;
    }

    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 10000); // 10 secondes

    return () => clearTimeout(timer);
  }, [isSubscribed, permission]);

  const handleEnable = async () => {
    await subscribe();
    setShowPrompt(false);
    onDismiss();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss();
  };

  if (!isSupported || !showPrompt || isSubscribed || permission === 'denied') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-bg-surface border border-border rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
            <span className="text-xl">🔔</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-primary font-semibold text-sm mb-1">
              Activez les notifications
            </h3>
            <p className="text-text-muted text-xs mb-3">
              Recevez des alertes pour vos points gagnés et nouveaux paliers débloqués.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                className="flex-1 px-4 py-2 rounded-xl gradient-gold text-bg-dark text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Activer
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 rounded-xl bg-bg-dark border border-border text-text-muted text-sm hover:bg-bg-surface transition-colors"
              >
                Plus tard
              </button>
            </div>
            {error && (
              <p className="text-error text-xs mt-2">{error}</p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-text-muted hover:text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
