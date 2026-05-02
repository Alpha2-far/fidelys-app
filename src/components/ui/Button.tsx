import React from 'react';
import { CircleNotch } from '@phosphor-icons/react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  icon?:      React.ReactNode;
  fullWidth?: boolean;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const BASE: React.CSSProperties = {
  display:        'inline-flex',
  alignItems:     'center',
  justifyContent: 'center',
  gap:            8,
  border:         'none',
  cursor:         'pointer',
  fontFamily:     "'Outfit', sans-serif",
  fontWeight:     600,
  letterSpacing:  '0.01em',
  transition:     'transform 150ms ease, opacity 150ms ease, box-shadow 150ms ease',
  borderRadius:   8,
  whiteSpace:     'nowrap',
  userSelect:     'none',
};

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #D4922A, #EDB84A)',
    color:      '#0C1810',
    boxShadow:  '0 4px 16px rgba(212,146,42,0.30)',
  },
  secondary: {
    background: 'transparent',
    color:      '#0B7B5C',
    border:     '2px solid #0B7B5C',
    boxShadow:  'none',
  },
  danger: {
    background: '#D63C3C',
    color:      '#fff',
    boxShadow:  '0 4px 16px rgba(214,60,60,0.25)',
  },
  ghost: {
    background: 'rgba(255,255,255,0.04)',
    color:      '#8EA598',
    border:     '1px solid rgba(255,255,255,0.08)',
    boxShadow:  'none',
  },
};

const SIZES: Record<Size, React.CSSProperties> = {
  sm: { fontSize: 13, padding: '0.4rem 0.875rem', minHeight: 32 },
  md: { fontSize: 15, padding: '0.625rem 1.25rem', minHeight: 44 },
  lg: { fontSize: 16, padding: '0.875rem 1.75rem', minHeight: 52 },
};

// ── Component ──────────────────────────────────────────────────────────────────

export function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  icon,
  fullWidth = false,
  disabled,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const computedStyle: React.CSSProperties = {
    ...BASE,
    ...VARIANTS[variant],
    ...SIZES[size],
    width:   fullWidth ? '100%' : undefined,
    opacity: isDisabled ? 0.55 : 1,
    cursor:  isDisabled ? 'not-allowed' : 'pointer',
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) e.currentTarget.style.transform = 'scale(1.02)';
    onMouseEnter?.(e);
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    onMouseLeave?.(e);
  };
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) e.currentTarget.style.transform = 'scale(0.98)';
    onMouseDown?.(e);
  };
  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1.02)';
    onMouseUp?.(e);
  };

  return (
    <button
      disabled={isDisabled}
      style={computedStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      {...rest}
    >
      {loading ? (
        <span style={{ animation: 'spin 0.7s linear infinite', display: 'flex' }}>
          <CircleNotch size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} weight="bold" />
        </span>
      ) : icon ? (
        <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      ) : null}
      {children}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
