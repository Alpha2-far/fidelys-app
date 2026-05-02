import { useState, useEffect } from 'react';
import { Bell, X } from '@phosphor-icons/react';
import { usePushNotification } from '../hooks/usePushNotification';

// Design tokens Light Crème (brand.md)
const C = {
  card: '#FFFFFF',
  border: '#DDD8CE',
  textDark: '#0C1810',
  textMid: '#3D5248',
  textLight: '#8EA598',
  primary: '#0B7B5C',
  primaryPale: '#E6F5F0',
  secondary: '#D4922A',
  secondaryPale: '#FDF4E3',
  error: '#D63C3C',
};

const S = {
  lg: '0 8px 32px rgba(11,123,92,0.18)',
};

interface PushNotificationPromptProps {
  customerId?: string;
  primaryColor?: string;
  onDismiss: () => void;
}

export function PushNotificationPrompt({ customerId, primaryColor = C.primary, onDismiss }: PushNotificationPromptProps) {
  const [visible, setVisible] = useState(false);
  const { isSupported, isSubscribed, permission, subscribe, error } = usePushNotification(customerId);

  // Affiche après 10 secondes — ne demande jamais si déjà abonné ou refusé
  useEffect(() => {
    if (!isSupported || isSubscribed || permission === 'denied') return;

    const timer = setTimeout(() => setVisible(true), 10000);
    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission]);

  const handleEnable = async () => {
    await subscribe();
    setVisible(false);
    onDismiss();
  };

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  if (!visible || !isSupported || isSubscribed || permission === 'denied') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 2rem)',
      maxWidth: 440,
      zIndex: 50,
      animation: 'slideUp 0.3s ease-out both',
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div style={{
        background: C.card,
        borderRadius: 16,
        padding: '1rem 1.125rem',
        boxShadow: S.lg,
        border: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}>
        {/* Icône Bell */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: C.secondaryPale,
          border: '1px solid rgba(212,146,42,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Bell size={22} weight="bold" color={C.secondary} />
        </div>

        {/* Texte + boutons */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: C.textDark,
            marginBottom: 4,
          }}>
            Activez les notifications
          </p>
          <p style={{ fontSize: 13, color: C.textLight, lineHeight: 1.45, marginBottom: '0.75rem' }}>
            Recevez vos points gagnés et alertes de paliers débloqués en temps réel.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleEnable}
              style={{
                flex: 1,
                padding: '0.55rem 0.875rem',
                background: primaryColor,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 44,
                transition: 'transform 0.15s ease',
                fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Activer
            </button>
            <button
              onClick={handleDismiss}
              style={{
                padding: '0.55rem 0.875rem',
                background: 'transparent',
                color: C.textLight,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                minHeight: 44,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Plus tard
            </button>
          </div>

          {error && (
            <p style={{ fontSize: 12, color: C.error, marginTop: 6 }}>{error}</p>
          )}
        </div>

        {/* Fermer */}
        <button
          onClick={handleDismiss}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: C.textLight,
            padding: 0,
          }}
          aria-label="Fermer"
        >
          <X size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
}
