import React from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type BadgeVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'error' | 'neutral';
type BadgeSize    = 'sm' | 'md';

interface BadgeProps {
  variant?:  BadgeVariant;
  size?:     BadgeSize;
  dot?:      boolean;
  pulse?:    boolean;
  children:  React.ReactNode;
  style?:    React.CSSProperties;
}

// ── Config ────────────────────────────────────────────────────────────────────

const VARIANTS: Record<BadgeVariant, { bg: string; color: string; dot: string }> = {
  primary:   { bg: 'rgba(11,123,92,0.18)',   color: '#13A87D',  dot: '#0B7B5C'  },
  secondary: { bg: 'rgba(212,146,42,0.18)',  color: '#EDB84A',  dot: '#D4922A'  },
  accent:    { bg: 'rgba(224,92,56,0.18)',   color: '#F58265',  dot: '#E05C38'  },
  success:   { bg: 'rgba(34,160,90,0.18)',   color: '#22A05A',  dot: '#22A05A'  },
  error:     { bg: 'rgba(214,60,60,0.18)',   color: '#D63C3C',  dot: '#D63C3C'  },
  neutral:   { bg: 'rgba(255,255,255,0.06)', color: '#8EA598',  dot: '#5A7A68'  },
};

const SIZES: Record<BadgeSize, { fontSize: number; padding: string; dotSize: number }> = {
  sm: { fontSize: 11, padding: '2px 8px',   dotSize: 6 },
  md: { fontSize: 12, padding: '3px 10px',  dotSize: 7 },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function Badge({
  variant = 'neutral',
  size    = 'md',
  dot     = false,
  pulse   = false,
  children,
  style,
}: BadgeProps) {
  const { bg, color, dot: dotColor } = VARIANTS[variant];
  const sz = SIZES[size];

  return (
    <>
      {pulse && (
        <style>{`
          @keyframes badge-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50%       { transform: scale(1.6); opacity: 0; }
          }
        `}</style>
      )}
      <span
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          gap:            sz.dotSize - 1,
          background:     bg,
          color,
          fontSize:       sz.fontSize,
          fontWeight:     600,
          fontFamily:     "'Outfit', sans-serif",
          padding:        sz.padding,
          borderRadius:   9999,
          letterSpacing:  '0.04em',
          textTransform:  'uppercase',
          whiteSpace:     'nowrap',
          ...style,
        }}
      >
        {dot && (
          <span style={{ position: 'relative', display: 'inline-flex', width: sz.dotSize, height: sz.dotSize, flexShrink: 0 }}>
            {pulse && (
              <span
                style={{
                  position:     'absolute',
                  inset:        0,
                  borderRadius: '50%',
                  background:   dotColor,
                  animation:    'badge-pulse 1.4s ease-in-out infinite',
                }}
              />
            )}
            <span
              style={{
                position:     'relative',
                display:      'block',
                width:        sz.dotSize,
                height:       sz.dotSize,
                borderRadius: '50%',
                background:   dotColor,
              }}
            />
          </span>
        )}
        {children}
      </span>
    </>
  );
}
