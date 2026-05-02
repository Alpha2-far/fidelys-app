import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  open:       boolean;
  onClose:    () => void;
  title?:     string;
  children:   React.ReactNode;
  maxWidth?:  number;
  hideClose?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, children, maxWidth = 480, hideClose = false }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Fermer sur Échap
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Bloquer le scroll du body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         1000,
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'center',
        background:     'rgba(12,24,16,0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation:      'modal-backdrop-in 0.2s ease-out both',
        padding:        '0 0',
      }}
    >
      <style>{`
        @keyframes modal-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-slide-up {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (min-width: 640px) {
          .modal-panel {
            border-radius: 20px !important;
            margin: auto !important;
            max-height: 90vh !important;
            border-bottom-left-radius: 20px !important;
            border-bottom-right-radius: 20px !important;
          }
        }
      `}</style>

      <div
        ref={panelRef}
        className="modal-panel"
        style={{
          background:          '#132317',
          border:              '1px solid rgba(255,255,255,0.08)',
          borderTopLeftRadius:  20,
          borderTopRightRadius: 20,
          borderBottomLeftRadius:  0,
          borderBottomRightRadius: 0,
          boxShadow:           '0 20px 60px rgba(12,24,16,0.8)',
          width:               '100%',
          maxWidth:            maxWidth,
          maxHeight:           '92dvh',
          overflowY:           'auto',
          display:             'flex',
          flexDirection:       'column',
          animation:           'modal-slide-up 0.3s cubic-bezier(0.32,0.72,0,1) both',
        }}
      >
        {/* Header */}
        {(title || !hideClose) && (
          <div style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            padding:         '1.25rem 1.5rem 0',
            flexShrink:      0,
          }}>
            {title && (
              <h2 style={{
                fontFamily:    "'Plus Jakarta Sans', sans-serif",
                fontWeight:    700,
                fontSize:      18,
                color:         '#F5F5F5',
                letterSpacing: '-0.3px',
                margin:        0,
              }}>
                {title}
              </h2>
            )}
            {!hideClose && (
              <button
                onClick={onClose}
                style={{
                  marginLeft:  'auto',
                  background:  'rgba(255,255,255,0.06)',
                  border:      'none',
                  borderRadius: 8,
                  width:       32,
                  height:      32,
                  display:     'flex',
                  alignItems:  'center',
                  justifyContent: 'center',
                  cursor:      'pointer',
                  color:       '#8EA598',
                  flexShrink:  0,
                  transition:  'background 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                aria-label="Fermer"
              >
                <X size={16} weight="bold" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '1.25rem 1.5rem 1.5rem', flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
