import React from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type SkeletonVariant = 'text' | 'card' | 'avatar' | 'table-row';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?:   string | number;
  height?:  string | number;
  lines?:   number;
  style?:   React.CSSProperties;
}

// ── Base skeleton block ────────────────────────────────────────────────────────

function Block({ w, h, r = 8, style }: { w?: string | number; h?: string | number; r?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="skeleton"
      style={{
        width:        w ?? '100%',
        height:       h ?? 16,
        borderRadius: r,
        flexShrink:   0,
        ...style,
      }}
    />
  );
}

// ── Variants ──────────────────────────────────────────────────────────────────

function TextSkeleton({ lines = 3, width, height }: { lines?: number; width?: string | number; height?: string | number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Block
          key={i}
          h={height ?? 14}
          w={i === lines - 1 ? '65%' : width ?? '100%'}
          r={4}
        />
      ))}
    </div>
  );
}

function CardSkeleton({ width, height }: { width?: string | number; height?: string | number }) {
  return (
    <div
      style={{
        background:   '#1A3020',
        border:       '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding:      '1.25rem',
        width:        width ?? '100%',
        height:       height,
        display:      'flex',
        flexDirection: 'column',
        gap:          12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Block w={44} h={44} r={12} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Block h={14} w="60%" />
          <Block h={12} w="40%" />
        </div>
      </div>
      <Block h={12} />
      <Block h={12} w="80%" />
      <Block h={12} w="55%" />
    </div>
  );
}

function AvatarSkeleton({ width, height }: { width?: string | number; height?: string | number }) {
  const size = height ?? width ?? 44;
  return <Block w={size} h={size} r={9999} />;
}

function TableRowSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0.875rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <Block w={36} h={36} r={8} />
      <Block h={13} w="30%" />
      <Block h={13} w="20%" style={{ marginLeft: 'auto' }} />
      <Block h={13} w={60} />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function Skeleton({ variant = 'text', width, height, lines = 3, style }: SkeletonProps) {
  return (
    <div style={style}>
      {variant === 'text'      && <TextSkeleton lines={lines} width={width} height={height} />}
      {variant === 'card'      && <CardSkeleton width={width} height={height} />}
      {variant === 'avatar'    && <AvatarSkeleton width={width} height={height} />}
      {variant === 'table-row' && <TableRowSkeleton />}
    </div>
  );
}

// ── Convenience: Skeleton.Text, Skeleton.Card etc. ────────────────────────────

Skeleton.Text      = (p: { lines?: number; width?: string|number; height?: string|number }) => <TextSkeleton {...p} />;
Skeleton.Card      = (p: { width?: string|number; height?: string|number }) => <CardSkeleton {...p} />;
Skeleton.Avatar    = (p: { size?: string|number }) => <AvatarSkeleton width={p.size} height={p.size} />;
Skeleton.TableRow  = () => <TableRowSkeleton />;
