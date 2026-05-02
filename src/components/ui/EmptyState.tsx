import React from 'react';
import { Button } from './Button';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?:        React.ReactNode;
  title:        string;
  description?: string;
  action?:      { label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'ghost' };
  style?:       React.CSSProperties;
  compact?:     boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action, style, compact = false }: EmptyStateProps) {
  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        textAlign:      'center',
        padding:        compact ? '2rem 1.5rem' : '3.5rem 2rem',
        gap:            compact ? 12 : 16,
        ...style,
      }}
    >
      {/* Icon container */}
      {icon && (
        <div
          style={{
            width:          compact ? 52 : 64,
            height:         compact ? 52 : 64,
            borderRadius:   16,
            background:     'rgba(11,123,92,0.12)',
            border:         '1px solid rgba(11,123,92,0.20)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            color:          '#0B7B5C',
            flexShrink:     0,
          }}
        >
          {/* Clone icon with forced size */}
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: compact ? 24 : 28 })
            : icon}
        </div>
      )}

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p
          style={{
            fontFamily:    "'Plus Jakarta Sans', sans-serif",
            fontWeight:    700,
            fontSize:      compact ? 15 : 17,
            color:         '#F5F5F5',
            letterSpacing: '-0.2px',
          }}
        >
          {title}
        </p>
        {description && (
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize:   compact ? 13 : 14,
              color:      '#8EA598',
              lineHeight: 1.55,
              maxWidth:   320,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {/* CTA */}
      {action && (
        <Button
          variant={action.variant ?? 'secondary'}
          size={compact ? 'sm' : 'md'}
          onClick={action.onClick}
          style={{ marginTop: 4 }}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
