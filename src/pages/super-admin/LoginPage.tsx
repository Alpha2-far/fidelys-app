import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, EyeIcon, EyeSlashIcon, ChartBar, Buildings, Storefront } from '@phosphor-icons/react';
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

// ── Dashboard Mockup ──────────────────────────────────────────────────────────

function DashboardMockup() {
  const stats = [
    { Icon: Storefront, label: 'Boutiques', value: '24' },
    { Icon: ChartBar,   label: 'Transactions', value: '1 842' },
    { Icon: Buildings,  label: 'Groupes', value: '6' },
  ];

  return (
    <div style={{
      width:        300,
      borderRadius: 16,
      background:   'rgba(255,255,255,0.04)',
      border:       '1px solid rgba(255,255,255,0.08)',
      overflow:     'hidden',
      boxShadow:    '0 24px 48px rgba(0,0,0,0.40)',
      flexShrink:   0,
    }}>
      {/* Top bar */}
      <div style={{
        background: 'rgba(11,123,92,0.15)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {['#E05C38', '#D4922A', '#13A87D'].map(c => (
          <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />
        ))}
        <span style={{ fontFamily: FONTS.body, fontSize: 11, color: 'rgba(255,255,255,0.30)', marginLeft: 8 }}>
          super.fidelys.app
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        <p style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.90)', marginBottom: 12 }}>
          Dashboard ON AGENCY
        </p>

        {/* Stat cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stats.map(({ Icon, label, value }) => (
            <div key={label} style={{
              display:      'flex',
              alignItems:   'center',
              gap:          10,
              background:   'rgba(255,255,255,0.04)',
              borderRadius: 8,
              padding:      '8px 12px',
              border:       '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: 28, height: 28,
                borderRadius: 6,
                background: 'rgba(11,123,92,0.20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={14} color="#13A87D" weight="bold" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: FONTS.body, fontSize: 10, color: 'rgba(255,255,255,0.40)', lineHeight: 1 }}>{label}</p>
                <p style={{ fontFamily: FONTS.heading, fontWeight: 700, fontSize: 14, color: '#FFFFFF', lineHeight: 1, marginTop: 2 }}>{value}</p>
              </div>
              <div style={{ height: 20, width: 40, background: 'rgba(19,168,125,0.15)', borderRadius: 4, display: 'flex', alignItems: 'flex-end', padding: '0 2px', gap: 2 }}>
                {[6, 10, 8, 14, 12, 16, 20].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: h, background: '#13A87D', borderRadius: '2px 2px 0 0', opacity: 0.6 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
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
      const { data: adminCheck, error: adminError } = await supabase
        .from('super_admins').select('user_id').eq('user_id', data.user.id).single();
      if (adminError || !adminCheck) {
        await supabase.auth.signOut();
        throw new Error('Acces refuse : compte super-admin requis');
      }
      navigate('/super-admin/dashboard');
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
    'Supervision multi-boutiques',
    'Déploiements de campagnes',
    'Monitoring en temps réel',
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
        background:     'linear-gradient(145deg, #0A1510 0%, #0C1810 40%, #132317 100%)',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
        padding:        '60px 56px',
        position:       'relative',
        overflow:       'hidden',
        flexShrink:     0,
      }}>
        {/* Orbs */}
        <div style={{ position:'absolute', top:'8%', right:'-4%', width:260, height:260, borderRadius:'50%', background:'rgba(11,123,92,0.07)', filter:'blur(50px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'12%', left:'-6%', width:200, height:200, borderRadius:'50%', background:'rgba(212,146,42,0.05)', filter:'blur(40px)', pointerEvents:'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 400 }}>
          {/* Logo + Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <img src="/logo.png" alt="Fidelys" style={{ height: 120, objectFit: 'contain' }} />
            <span style={{
              fontFamily:    FONTS.body,
              fontSize:      10,
              fontWeight:    600,
              color:         '#EDB84A',
              background:    'rgba(212,146,42,0.12)',
              border:        '1px solid rgba(212,146,42,0.25)',
              borderRadius:  99,
              padding:       '3px 8px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
            }}>
              ON AGENCY
            </span>
          </div>

          {/* Tagline */}
          <p style={{ fontFamily: FONTS.body, fontSize: 17, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 36 }}>
            Chaque achat est une promesse tenue.
          </p>

          {/* Séparateur */}
          <div style={{ width: 48, height: 1, background: 'rgba(255,255,255,0.10)', marginBottom: 36 }} />

          {/* Bullets */}
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

          {/* Dashboard mockup */}
          <DashboardMockup />
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
            display:       'inline-flex',
            alignItems:    'center',
            gap:           6,
            fontFamily:    FONTS.body,
            fontWeight:    700,
            fontSize:      11,
            color:         '#0B7B5C',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            marginBottom:  14,
          }}>
            Espace Super Admin
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
            Connectez-vous pour gérer l'infrastructure Fidelys.
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
                placeholder="admin@fidelys.app"
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
                    position:   'absolute',
                    right:      12,
                    top:        '50%',
                    transform:  'translateY(-50%)',
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    color:      '#8EA598',
                    display:    'flex',
                    alignItems: 'center',
                    padding:    4,
                    transition: 'color 200ms',
                  }}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <a href="#"
                   style={{ fontFamily: FONTS.body, fontSize: 13, color: '#0B7B5C', textDecoration: 'none', transition: 'opacity 200ms' }}
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
                transition:   'background 200ms, transform 200ms',
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
              Réservé aux administrateurs système.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
