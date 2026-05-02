import React, { useState, useId } from 'react';
import { Eye, EyeSlash, MagnifyingGlass } from '@phosphor-icons/react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?:       string;
  error?:       string;
  helper?:      string;
  icon?:        React.ReactNode;
  size?:        'sm' | 'md' | 'lg';
}

// ── Styles ────────────────────────────────────────────────────────────────────

const SIZES = {
  sm: { fontSize: 14, padding: '0.5rem 0.875rem', height: 36 },
  md: { fontSize: 16, padding: '0.65rem 1rem',    height: 44 },
  lg: { fontSize: 16, padding: '0.875rem 1.125rem', height: 52 },
};

const C = {
  surface:   '#1A3020',
  border:    'rgba(255,255,255,0.08)',
  borderFocus: '#0B7B5C',
  text:      '#F5F5F5',
  placeholder: '#5A7A68',
  label:     '#8EA598',
  error:     '#D63C3C',
  helper:    '#5A7A68',
  icon:      '#5A7A68',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function Input({
  label,
  error,
  helper,
  icon,
  size = 'md',
  type = 'text',
  id: externalId,
  style,
  ...rest
}: InputProps) {
  const autoId = useId();
  const id = externalId ?? autoId;

  const [focused,  setFocused]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const isPassword = type === 'password';
  const isSearch   = type === 'search';
  const inputType  = isPassword ? (showPass ? 'text' : 'password') : type;

  const sz = SIZES[size];
  const hasLeftIcon  = !!icon || isSearch;
  const hasRightIcon = isPassword;

  const wrapStyle: React.CSSProperties = {
    position:       'relative',
    display:        'flex',
    alignItems:     'center',
    background:     C.surface,
    border:         `1px solid ${error ? C.error : focused ? C.borderFocus : C.border}`,
    borderRadius:   12,
    boxShadow:      focused ? `0 0 0 3px ${error ? 'rgba(214,60,60,0.15)' : 'rgba(11,123,92,0.15)'}` : 'none',
    transition:     'border-color 150ms ease, box-shadow 150ms ease',
  };

  const inputStyle: React.CSSProperties = {
    flex:           1,
    background:     'transparent',
    border:         'none',
    outline:        'none',
    color:          C.text,
    fontFamily:     "'Outfit', sans-serif",
    fontSize:       sz.fontSize,     // 16px on md/lg — prevents iOS zoom
    lineHeight:     1.5,
    padding:        sz.padding,
    paddingLeft:    hasLeftIcon  ? `calc(${sz.padding.split(' ')[1]} + 28px)` : sz.padding.split(' ')[1],
    paddingRight:   hasRightIcon ? `calc(${sz.padding.split(' ')[1]} + 28px)` : sz.padding.split(' ')[1],
    height:         sz.height,
    width:          '100%',
    ...style,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize:     13,
            fontWeight:   500,
            color:        error ? C.error : C.label,
            fontFamily:   "'Outfit', sans-serif",
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </label>
      )}

      {/* Input wrapper */}
      <div style={wrapStyle}>
        {/* Left icon */}
        {hasLeftIcon && (
          <span style={{ position: 'absolute', left: 12, display: 'flex', color: C.icon, pointerEvents: 'none' }}>
            {isSearch ? <MagnifyingGlass size={16} weight="bold" /> : icon}
          </span>
        )}

        <input
          id={id}
          type={inputType}
          style={inputStyle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />

        {/* Right icon — show/hide password */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            style={{
              position:   'absolute',
              right:      12,
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              color:      C.icon,
              display:    'flex',
              padding:    4,
            }}
            tabIndex={-1}
            aria-label={showPass ? 'Masquer' : 'Afficher'}
          >
            {showPass ? <EyeSlash size={16} weight="bold" /> : <Eye size={16} weight="bold" />}
          </button>
        )}
      </div>

      {/* Error / Helper */}
      {error && (
        <p style={{ fontSize: 12, color: C.error, fontFamily: "'Outfit', sans-serif" }}>{error}</p>
      )}
      {!error && helper && (
        <p style={{ fontSize: 12, color: C.helper, fontFamily: "'Outfit', sans-serif" }}>{helper}</p>
      )}
    </div>
  );
}
