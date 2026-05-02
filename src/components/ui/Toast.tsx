import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, WarningCircle, Info, X } from '@phosphor-icons/react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id:       string;
  type:     ToastType;
  title?:   string;
  message:  string;
  duration: number;
}

type Listener = (toasts: ToastItem[]) => void;

// ── Singleton store (module-level, no Context required) ────────────────────────

class ToastStore {
  private items: ToastItem[] = [];
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private notify() {
    const snapshot = [...this.items];
    this.listeners.forEach(fn => fn(snapshot));
  }

  add(type: ToastType, message: string, title?: string, duration = 4000): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.items = [...this.items, { id, type, message, title, duration }];
    this.notify();
    setTimeout(() => this.remove(id), duration + 300); // +300 for exit animation
    return id;
  }

  remove(id: string) {
    this.items = this.items.filter(t => t.id !== id);
    this.notify();
  }
}

const store = new ToastStore();

// ── Public API ─────────────────────────────────────────────────────────────────

export const toast = {
  success: (message: string, title?: string) => store.add('success', message, title),
  error:   (message: string, title?: string) => store.add('error',   message, title),
  warning: (message: string, title?: string) => store.add('warning', message, title),
  info:    (message: string, title?: string) => store.add('info',    message, title),
};

export function useToast() {
  return { toast };
}

// ── Config par type ───────────────────────────────────────────────────────────

const CONFIG: Record<ToastType, { icon: React.ElementType; bg: string; border: string; iconColor: string }> = {
  success: { icon: CheckCircle,   bg: 'rgba(26,48,32,0.97)',  border: 'rgba(34,160,90,0.35)',   iconColor: '#22A05A' },
  error:   { icon: XCircle,       bg: 'rgba(40,18,18,0.97)',  border: 'rgba(214,60,60,0.35)',   iconColor: '#D63C3C' },
  warning: { icon: WarningCircle, bg: 'rgba(40,32,12,0.97)',  border: 'rgba(212,146,42,0.35)',  iconColor: '#D4922A' },
  info:    { icon: Info,          bg: 'rgba(12,24,40,0.97)',  border: 'rgba(42,125,212,0.35)',  iconColor: '#2A7DD4' },
};

// ── Single toast item ─────────────────────────────────────────────────────────

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const { icon: Icon, bg, border, iconColor } = CONFIG[item.type];

  useEffect(() => {
    // Micro-delay so CSS transition fires
    const t = setTimeout(() => setVisible(true), 16);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(item.id), 300);
    }, item.duration);
    return () => clearTimeout(t);
  }, [item.duration, item.id, onDismiss]);

  return (
    <div
      style={{
        display:        'flex',
        alignItems:     'flex-start',
        gap:            12,
        background:     bg,
        border:         `1px solid ${border}`,
        borderRadius:   12,
        padding:        '0.875rem 1rem',
        boxShadow:      '0 8px 32px rgba(0,0,0,0.40)',
        backdropFilter: 'blur(12px)',
        minWidth:       280,
        maxWidth:       360,
        transition:     'opacity 0.3s ease, transform 0.3s ease',
        opacity:        visible ? 1 : 0,
        transform:      visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
        pointerEvents:  'auto',
      }}
    >
      <Icon size={20} weight="fill" color={iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.title && (
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#F5F5F5', marginBottom: 2 }}>
            {item.title}
          </p>
        )}
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: '#8EA598', lineHeight: 1.45 }}>
          {item.message}
        </p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(item.id), 300); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A7A68', padding: 2, display: 'flex', flexShrink: 0 }}
        aria-label="Fermer"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}

// ── Container (à placer une fois dans App.tsx) ─────────────────────────────────

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => store.subscribe(setToasts), []);

  const dismiss = useCallback((id: string) => store.remove(id), []);

  if (toasts.length === 0) return null;

  return createPortal(
    <>
      <style>{`
        @media (min-width: 640px) {
          .toast-viewport {
            bottom: auto !important;
            top: 1.25rem !important;
            right: 1.25rem !important;
            left: auto !important;
            transform: none !important;
            align-items: flex-end !important;
          }
        }
      `}</style>
      <div
        className="toast-viewport"
        style={{
          position:       'fixed',
          bottom:         '1.25rem',
          left:           '50%',
          transform:      'translateX(-50%)',
          zIndex:         9999,
          display:        'flex',
          flexDirection:  'column',
          gap:            8,
          alignItems:     'center',
          pointerEvents:  'none',
        }}
      >
        {toasts.map(item => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </>,
    document.body
  );
}
