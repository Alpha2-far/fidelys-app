import { useClientContext, C, S, F } from './ClientLayout';

export default function CardPage() {
  const { shop, customer, tiers, primaryColor, secondaryColor } = useClientContext();

  const sorted = [...tiers].sort((a, b) => a.points_required - b.points_required);
  const currentTier = [...sorted].reverse().find(t => customer.total_points >= t.points_required) ?? null;
  const nextTier = sorted.find(t => customer.total_points < t.points_required) ?? null;

  const prevPts = currentTier?.points_required ?? 0;
  const progress = nextTier
    ? Math.min(100, ((customer.total_points - prevPts) / (nextTier.points_required - prevPts)) * 100)
    : 100;

  const fullName = customer.first_name
    ? `${customer.first_name} ${customer.last_name || ''}`.trim()
    : customer.phone;

  return (
    <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes countUp { from { opacity: 0.4; } to { opacity: 1; } }
      `}</style>

      {/* ── Message de bienvenue ── */}
      {shop.welcome_message && (
        <div style={{
          background: C.primaryPale,
          borderRadius: 12,
          padding: '0.875rem 1.125rem',
          border: `1px solid ${primaryColor}20`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          animation: 'fadeUp 0.3s ease-out both',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>👋</span>
          <p style={{ fontSize: 14, color: primaryColor, fontWeight: 500, lineHeight: 1.4 }}>
            {shop.welcome_message}
          </p>
        </div>
      )}

      {/* ── Carte principale ── */}
      <div style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor}CC 100%)`,
        borderRadius: 20,
        padding: '1.75rem',
        color: '#fff',
        boxShadow: `0 8px 32px ${primaryColor}45`,
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeUp 0.35s ease-out both',
      }}>
        {/* Cercles décoratifs */}
        <div style={{ position: 'absolute', top: -24, right: -24, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -32, right: 16, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>
            Carte de fidélité
          </p>
          <p style={{ fontFamily: F.heading, fontSize: 21, fontWeight: 800, lineHeight: 1.2, marginBottom: '1.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fullName}
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
            <span style={{ fontFamily: F.heading, fontSize: 50, fontWeight: 800, lineHeight: 1, animation: 'countUp 0.4s ease both' }}>
              {customer.total_points.toLocaleString('fr-FR')}
            </span>
            <span style={{ fontSize: 16, opacity: 0.8, marginBottom: 8 }}>pts</span>
          </div>

          {currentTier ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.22)', borderRadius: 99, padding: '4px 14px', fontSize: 13, fontWeight: 600 }}>
              🏆 {currentTier.name}
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '4px 14px', fontSize: 13, opacity: 0.85 }}>
              Aucun palier encore
            </span>
          )}
        </div>
      </div>

      {/* ── Progression vers le prochain palier ── */}
      {nextTier && (
        <div style={{ background: C.card, borderRadius: 16, padding: '1.25rem', boxShadow: S.sm, border: `1px solid ${C.border}`, animation: 'fadeUp 0.4s 0.05s ease-out both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 14, color: C.textDark }}>
              Prochain palier : {nextTier.name}
            </p>
            <p style={{ fontSize: 13, color: C.textMid, fontWeight: 600 }}>
              {(nextTier.points_required - customer.total_points).toLocaleString()} pts
            </p>
          </div>
          <div style={{ height: 8, background: C.subtle, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.max(4, progress)}%`,
              background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}99)`,
              borderRadius: 99,
              transition: 'width 0.7s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <p style={{ fontSize: 12, color: C.textLight }}>
              {customer.total_points.toLocaleString()} / {nextTier.points_required.toLocaleString()} pts
            </p>
            {nextTier.reward_description && (
              <p style={{ fontSize: 12, color: primaryColor, fontWeight: 500 }}>
                🎁 {nextTier.reward_description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Récompense actuelle ── */}
      {currentTier && (
        <div style={{ background: C.secondaryPale, borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(212,146,42,0.2)', boxShadow: S.gold, animation: 'fadeUp 0.4s 0.1s ease-out both' }}>
          <p style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 14, color: '#A8711A', marginBottom: 5 }}>
            🎁 Votre récompense {currentTier.name}
          </p>
          <p style={{ fontSize: 15, color: '#6B4A10', fontWeight: 500, lineHeight: 1.4 }}>
            {currentTier.reward_description}
          </p>
          {currentTier.reward_value && (
            <p style={{ fontSize: 13, color: '#A8711A', marginTop: 4 }}>{currentTier.reward_value}</p>
          )}
          <p style={{ fontSize: 12, color: '#A8711A', opacity: 0.8, marginTop: 10, lineHeight: 1.5 }}>
            Montrez cette carte en caisse pour bénéficier de votre récompense.
          </p>
        </div>
      )}

      {/* ── Tous les paliers ── */}
      {sorted.length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: '1.25rem', boxShadow: S.sm, border: `1px solid ${C.border}`, animation: 'fadeUp 0.4s 0.15s ease-out both' }}>
          <p style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 14, color: C.textDark, marginBottom: '0.875rem' }}>
            Programme de fidélité
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map((tier) => {
              const reached = customer.total_points >= tier.points_required;
              const isCurrent = currentTier?.id === tier.id;
              return (
                <div key={tier.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: reached ? C.primaryPale : C.subtle,
                  border: `1px solid ${isCurrent ? `${primaryColor}40` : reached ? `${primaryColor}25` : 'transparent'}`,
                  transition: 'background 0.2s ease',
                }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13, color: reached ? primaryColor : C.textMid }}>
                      {reached ? '✓ ' : ''}{tier.name}
                    </p>
                    <p style={{ fontSize: 12, color: C.textLight, marginTop: 1 }}>{tier.reward_description}</p>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: reached ? primaryColor : C.textLight, whiteSpace: 'nowrap', marginLeft: 8 }}>
                    {tier.points_required.toLocaleString()} pts
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Footer boutique ── */}
      <div style={{ textAlign: 'center', padding: '0.25rem 0 0.5rem' }}>
        {(shop.address || shop.phone) && (
          <p style={{ fontSize: 12, color: C.textLight, marginBottom: 8 }}>
            {shop.address && `📍 ${shop.address}`}
            {shop.address && shop.phone && ' · '}
            {shop.phone && `📞 ${shop.phone}`}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.5 }}>
          <img src="/logo.png" alt="Fidelys" style={{ height: 18, width: 'auto' }} />
        </div>
      </div>
    </div>
  );
}
