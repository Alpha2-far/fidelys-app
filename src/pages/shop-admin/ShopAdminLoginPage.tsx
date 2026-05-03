import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';

// ── Styles partagés ───────────────────────────────────────────────────────────

const FONTS = {
  heading: '"Plus Jakarta Sans", sans-serif',
  body:    '"Outfit", sans-serif',
};

const inputBase: React.CSSProperties = {
  width:        '100%',
  background:   '#FFFFFF',
  border:       '1.5px solid #DDD8CE',
  borderRadius: 8,
  padding:      '14px 16px',
  fontSize:     16,
  fontFamily:   FONTS.body,
  color:        '#0C1810',
  outline:      'none',
  transition:   'border-color 200ms, box-shadow 200ms',
  boxSizing:    'border-box',
};

// ── PWA Card Mockup ───────────────────────────────────────────────────────────

function CardMockup() {
  return (
    <div style={{
      width:        288,
      height:       172,
      borderRadius: 20,
      background:   'linear-gradient(135deg, #0B7B5C 0%, #075941 100%)',
      padding:      '20px 22px',
      position:     'relative',
      overflow:     'hidden',
      boxShadow:    '0 24px 48px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.08)',
      flexShrink:   0,
    }}>
      {/* Orb décoratif */}
      <div style={{
        position:     'absolute',
        top: -30, right: -30,
        width:        100,
        height:       100,
        borderRadius: '50%',
        background:   'rgba(255,255,255,0.06)',
        filter:       'blur(12px)',
      }} />
      <div style={{
        position:     'absolute',
        bottom: -20, left: -20,
        width:        80,
        height:       80,
        borderRadius: '50%',
        background:   'rgba(19,163,125,0.20)',
        filter:       'blur(16px)',
      }} />

      {/* Header carte */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div>
          <img
            src="/logo.png"
            alt="Fidelys"
            style={{ height: 22, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
          />
          <p style={{ fontFamily: FONTS.body, fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Carte de fidélité</p>
        </div>
        {/* QR code simulé */}
        <div style={{
          width: 40, height: 40,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 6,
          padding: 4,
          backdropFilter: 'blur(4px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 1.5,
        }}>
          {Array.from({ length: 25 }).map((_, i) => {
            const corners = [0, 2, 4, 10, 14, 20, 22, 24];
            const fill = corners.includes(i) || Math.random() > 0.55;
            return (
              <div key={i} style={{
                borderRadius: 1,
                background: fill ? 'rgba(255,255,255,0.85)' : 'transparent',
              }} />
            );
          })}
        </div>
      </div>

      {/* Nom client simulé */}
      <div style={{ marginTop: 14, position: 'relative', zIndex: 1 }}>
        <div style={{ height: 6, width: 88, background: 'rgba(255,255,255,0.20)', borderRadius: 99 }} />
        <div style={{ height: 5, width: 56, background: 'rgba(255,255,255,0.12)', borderRadius: 99, marginTop: 6 }} />
      </div>

      {/* Points */}
      <div style={{ position: 'absolute', bottom: 18, right: 22, zIndex: 1, textAlign: 'right' }}>
        <p style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 22, color: '#FFFFFF', lineHeight: 1 }}>1 250</p>
        <p style={{ fontFamily: FONTS.body, fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>points</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShopAdminLoginPage() {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const { data: adminRow, error: adminError } = await supabase
        .from('shop_admins').select('id, shop_id').eq('user_id', data.user.id).limit(1).single();
      if (adminError || !adminRow) {
        await supabase.auth.signOut();
        throw new Error('Acces refuse : aucune boutique associee a ce compte');
      }
      navigate('/shop-admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    ...inputBase,
    borderColor: focusedField === field ? '#0B7B5C' : '#DDD8CE',
    boxShadow:   focusedField === field ? '0 0 0 3px rgba(11,123,92,0.15)' : 'none',
  });

  const BULLETS = [
    'Carte client active en 5 minutes',
    'Notifications push illimitées',
    'Tableau de bord en temps réel',
  ];

  return (
    <div style={{
      minHeight:  '100dvh',
      display:    'flex',
      fontFamily: FONTS.body,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Outfit:wght@400;500;600&display=swap');

        @media (max-width: 767px) {
          .login-left  { display: none !important; }
          .login-right { width: 100% !important; }
          .login-mobile-header { display: flex !important; }
        }
        @media (min-width: 768px) {
          .login-mobile-header { display: none !important; }
        }
      `}</style>

      {/* ── Mobile header ─────────────────────────────────────────────────── */}
      <div className="login-mobile-header" style={{
        display:        'none',
        position:       'fixed',
        top: 0, left: 0, right: 0,
        zIndex:         10,
        background:     '#0C1810',
        padding:        '18px 24px',
        justifyContent: 'center',
        alignItems:     'center',
        borderBottom:   '1px solid rgba(255,255,255,0.06)',
      }}>
        <img src="/logo.png" alt="Fidelys" style={{ height: 44, objectFit: 'contain' }} />
      </div>

      {/* ── Colonne gauche ─────────────────────────────────────────────────── */}
      <div className="login-left" style={{
        width:          '50%',
        background:     'linear-gradient(145deg, #0C1810 0%, #132317 50%, #1A3020 100%)',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
        padding:        '60px 56px',
        position:       'relative',
        overflow:       'hidden',
        flexShrink:     0,
      }}>
        {/* Orbs de fond */}
        <div style={{ position:'absolute', top:'10%', right:'-5%', width:240, height:240, borderRadius:'50%', background:'rgba(11,123,92,0.08)', filter:'blur(40px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'15%', left:'-8%', width:200, height:200, borderRadius:'50%', background:'rgba(11,123,92,0.05)', filter:'blur(50px)', pointerEvents:'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ marginBottom: 12 }}>
            <img src="/logo.png" alt="Fidelys" style={{ height: 140, objectFit: 'contain' }} />
          </div>

          {/* Tagline */}
          <p style={{ fontFamily: FONTS.body, fontSize: 17, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 36 }}>
            Chaque achat est une promesse tenue.
          </p>

          {/* Séparateur */}
          <div style={{ width: 48, height: 1, background: 'rgba(255,255,255,0.10)', marginBottom: 36 }} />

          {/* Bullet points */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 52 }}>
            {BULLETS.map((text) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(11,123,92,0.18)',
                  border:     '1px solid rgba(11,123,92,0.30)',
                  display:    'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <CheckIcon size={13} weight="bold" color="#13A87D" />
                </div>
                <span style={{ fontFamily: FONTS.body, fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Mockup carte PWA */}
          <CardMockup />
        </div>
      </div>

      {/* ── Colonne droite ─────────────────────────────────────────────────── */}
      <div className="login-right" style={{
        width:          '50%',
        background:     '#F8F5EE',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
        padding:        'clamp(80px, 8vw, 60px) clamp(24px, 7vw, 60px)',
      }}>
        <div style={{ maxWidth: 420, width: '100%', margin: '0 auto' }}>

          {/* Overline */}
          <span style={{
            display:       'inline-block',
            fontFamily:    FONTS.body,
            fontWeight:    700,
            fontSize:      11,
            color:         '#0B7B5C',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            marginBottom:  14,
          }}>
            Espace Gérant
          </span>

          {/* H1 */}
          <h1 style={{
            fontFamily:    FONTS.heading,
            fontWeight:    800,
            fontSize:      'clamp(28px, 4vw, 36px)',
            color:         '#0C1810',
            letterSpacing: '-1px',
            lineHeight:    1.15,
            marginBottom:  10,
          }}>
            Bon retour.
          </h1>

          {/* Sous-titre */}
          <p style={{ fontFamily: FONTS.body, fontSize: 14, color: '#3D5248', lineHeight: 1.6, marginBottom: 36 }}>
            Connectez-vous pour gérer votre programme de fidélité.
          </p>

          {/* Formulaire */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Email */}
            <div>
              <label htmlFor="email" style={{ display: 'block', fontFamily: FONTS.body, fontWeight: 600, fontSize: 12, color: '#3D5248', marginBottom: 6 }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
                placeholder="gerant@boutique.com"
                style={inputStyle('email')}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" style={{ display: 'block', fontFamily: FONTS.body, fontWeight: 600, fontSize: 12, color: '#3D5248', marginBottom: 6 }}>
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  placeholder="••••••••"
                  style={{ ...inputStyle('password'), paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position:       'absolute',
                    right:          12,
                    top:            '50%',
                    transform:      'translateY(-50%)',
                    background:     'none',
                    border:         'none',
                    cursor:         'pointer',
                    color:          '#8EA598',
                    display:        'flex',
                    alignItems:     'center',
                    padding:        4,
                    transition:     'color 200ms',
                  }}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <a href="#" style={{ fontFamily: FONTS.body, fontSize: 13, color: '#0B7B5C', textDecoration: 'none', transition: 'opacity 200ms' }}
                   onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                   onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div style={{
                padding:      '12px 14px',
                borderRadius: 8,
                background:   'rgba(214,60,60,0.08)',
                border:       '1px solid rgba(214,60,60,0.20)',
                fontFamily:   FONTS.body,
                fontSize:     13,
                color:        '#C0392B',
                lineHeight:   1.5,
              }}>
                {error}
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width:        '100%',
                height:       52,
                background:   loading ? 'rgba(212,146,42,0.6)' : '#D4922A',
                color:        '#FFFFFF',
                border:       'none',
                borderRadius: 8,
                fontFamily:   FONTS.body,
                fontWeight:   600,
                fontSize:     16,
                cursor:       loading ? 'not-allowed' : 'pointer',
                boxShadow:    '0 4px 16px rgba(212,146,42,0.30)',
                transition:   'background 200ms, transform 200ms, box-shadow 200ms',
                marginTop:    4,
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#c28424'; e.currentTarget.style.transform = 'scale(1.01)'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = loading ? 'rgba(212,146,42,0.6)' : '#D4922A'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <p style={{ fontFamily: FONTS.body, fontSize: 12, color: '#8EA598' }}>
              Réservé aux gérants de boutique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
