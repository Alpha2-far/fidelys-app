import { useEffect, useRef, useState } from 'react';
import {
  QrCode, Bell, Buildings, Trophy, ChartBar, DeviceMobile,
  CheckCircle, WhatsappLogo, ArrowRight, Star, CreditCard,
  InstagramLogo, LinkedinLogo,
} from '@phosphor-icons/react';

// ── Design tokens (brand.md — Dark Emerald) ───────────────────────────────────
const C = {
  bg:           '#0C1810',
  surface:      '#132317',
  card:         '#1A3020',
  hover:        '#2B4D36',
  border:       'rgba(255,255,255,0.06)',
  borderLight:  'rgba(255,255,255,0.10)',
  text:         '#F5F5F5',
  textMid:      '#8EA598',
  textDim:      '#5A7A68',
  primary:      '#0B7B5C',
  primaryLight: '#13A87D',
  primaryPale:  'rgba(11,123,92,0.15)',
  secondary:    '#D4922A',
  secondaryLt:  '#EDB84A',
};

const WHATSAPP_URL =
  'https://wa.me/22997000000?text=Bonjour%2C+je+suis+int%C3%A9ress%C3%A9+par+Fidelys+pour+ma+boutique.';

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Animated counter ──────────────────────────────────────────────────────────
function useCounter(target: number, started: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration]);
  return value;
}

// ── Reusable reveal wrapper ───────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Animated loyalty card mockup ──────────────────────────────────────────────
function CardMockup() {
  return (
    <>
      <style>{`
        @keyframes card-float {
          0%, 100% { transform: perspective(900px) rotateX(6deg) rotateY(-12deg) translateY(0px); }
          50%       { transform: perspective(900px) rotateX(4deg) rotateY(-9deg) translateY(-18px); }
        }
        @keyframes shimmer-slide {
          0%   { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(300%) skewX(-15deg); }
        }
        @keyframes pts-pop {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes bar-grow {
          from { width: 0; }
          to   { width: 68%; }
        }
      `}</style>

      {/* Glow behind the card */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 320,
          height: 200,
          borderRadius: 24,
          background: `radial-gradient(ellipse at center, rgba(11,123,92,0.45) 0%, rgba(11,123,92,0.12) 50%, transparent 75%)`,
          filter: 'blur(28px)',
        }} />
      </div>

      {/* The card itself */}
      <div style={{
        position: 'relative',
        width: 320,
        height: 196,
        borderRadius: 20,
        background: 'linear-gradient(135deg, #0B7B5C 0%, #075C44 40%, #A8711A 100%)',
        boxShadow: '0 32px 80px rgba(11,123,92,0.55), 0 8px 24px rgba(0,0,0,0.5)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        animation: 'card-float 4s ease-in-out infinite',
        transformStyle: 'preserve-3d',
      }}>
        {/* Shimmer */}
        <div style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          borderRadius: 20,
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '40%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
            animation: 'shimmer-slide 3.5s ease-in-out infinite',
          }} />
        </div>

        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -32, right: -32, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -24, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>
              Carte de fidélité
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 800, color: '#fff' }}>
              Aminata Diallo
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 8px' }}>
            <CreditCard size={18} weight="bold" color="#fff" />
          </div>
        </div>

        {/* Points */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 42,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1,
              animation: 'pts-pop 0.6s 0.8s cubic-bezier(0.34,1.56,0.64,1) both',
            }}>
              2 450
            </span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>pts</span>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 10, height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(to right, #EDB84A, #D4922A)',
              borderRadius: 99,
              animation: 'bar-grow 1.2s 1s ease-out both',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}>2 450 / 3 000 pts</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}>Palier Or</span>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#fff' }}>
            <Star size={11} weight="fill" color="#EDB84A" />
            Palier Or
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>BOUTIQUE CHEZ MAMIE</span>
        </div>
      </div>

      {/* Floating notification badge */}
      <div style={{
        position: 'absolute',
        top: -16,
        right: -16,
        background: '#132317',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 12,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        animation: 'card-float 4s 0.5s ease-in-out infinite',
        whiteSpace: 'nowrap',
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,160,90,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={16} weight="fill" color="#22A05A" />
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#F5F5F5' }}>+150 pts crédités !</p>
          <p style={{ fontSize: 10, color: '#8EA598' }}>Achat · 7 500 FCFA</p>
        </div>
      </div>

      {/* Floating QR hint */}
      <div style={{
        position: 'absolute',
        bottom: -20,
        left: -20,
        background: '#132317',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 12,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        animation: 'card-float 4s 1.5s ease-in-out infinite',
        whiteSpace: 'nowrap',
      }}>
        <QrCode size={20} weight="bold" color={C.primaryLight} />
        <p style={{ fontSize: 11, fontWeight: 600, color: '#F5F5F5' }}>Scanner en caisse</p>
      </div>
    </>
  );
}

// ── Section labels ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           6,
      background:    C.primaryPale,
      border:        `1px solid rgba(11,123,92,0.25)`,
      borderRadius:  99,
      padding:       '4px 14px',
      fontSize:      12,
      fontWeight:    600,
      color:         C.primaryLight,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
    }}>
      {children}
    </span>
  );
}

// ── Section title ─────────────────────────────────────────────────────────────
function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{
        fontFamily:    "'Plus Jakarta Sans', sans-serif",
        fontSize:      'clamp(28px, 5vw, 40px)',
        fontWeight:    800,
        color:         C.text,
        letterSpacing: '-1px',
        lineHeight:    1.15,
      }}>
        {children}
      </h2>
      {sub && (
        <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: C.textMid, lineHeight: 1.6, maxWidth: 560 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const statsReveal = useReveal(0.2);

  const c1 = useCounter(120,  statsReveal.visible, 1400);
  const c2 = useCounter(8500, statsReveal.visible, 1800);
  const c3 = useCounter(98,   statsReveal.visible, 1200);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── CSS ────────────────────────────────────────────────────────────────────
  const css = `
    html { scroll-behavior: smooth; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .lp-section { padding: clamp(4rem, 8vw, 7rem) clamp(1.25rem, 5vw, 4rem); }

    .lp-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
    }
    @media (max-width: 900px) {
      .lp-grid-3 { grid-template-columns: 1fr; }
    }

    .lp-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }
    @media (max-width: 640px) {
      .lp-grid-2 { grid-template-columns: 1fr; }
    }

    .feat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }
    @media (max-width: 900px) { .feat-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .feat-grid { grid-template-columns: 1fr; } }

    .hero-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
      min-height: 100dvh;
      padding: 6rem clamp(1.25rem, 5vw, 4rem) 4rem;
    }
    @media (max-width: 900px) {
      .hero-layout {
        grid-template-columns: 1fr;
        text-align: center;
        padding-top: 5rem;
        padding-bottom: 3rem;
        min-height: auto;
      }
      .hero-ctas { justify-content: center !important; }
      .hero-card-wrap { display: flex; justify-content: center; padding: 3rem 0; }
    }

    .glass-card {
      background: rgba(26,48,32,0.60);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      transition: border-color 200ms ease, transform 200ms ease;
    }
    .glass-card:hover {
      border-color: rgba(11,123,92,0.30);
      transform: translateY(-3px);
    }

    .step-connector {
      position: absolute;
      top: 32px;
      left: calc(50% + 48px);
      right: calc(-50% + 48px);
      height: 1px;
      background: linear-gradient(to right, rgba(11,123,92,0.4), rgba(11,123,92,0.1));
    }
    @media (max-width: 900px) { .step-connector { display: none; } }

    .nav-link {
      font-size: 14px;
      font-weight: 500;
      color: #8EA598;
      text-decoration: none;
      transition: color 150ms ease;
      font-family: 'Outfit', sans-serif;
    }
    .nav-link:hover { color: #F5F5F5; }

    @keyframes hero-fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .hero-text-1 { animation: hero-fade-up 0.7s 0.1s ease-out both; }
    .hero-text-2 { animation: hero-fade-up 0.7s 0.25s ease-out both; }
    .hero-text-3 { animation: hero-fade-up 0.7s 0.4s ease-out both; }
    .hero-text-4 { animation: hero-fade-up 0.7s 0.55s ease-out both; }
    .hero-card   { animation: hero-fade-up 0.9s 0.3s ease-out both; }

    .pricing-card {
      background: linear-gradient(160deg, #1A3020 0%, #132317 60%, #0C1810 100%);
      border: 1px solid rgba(212,146,42,0.30);
      border-radius: 24px;
      box-shadow: 0 0 60px rgba(212,146,42,0.08), 0 20px 60px rgba(0,0,0,0.4);
    }

    .cta-btn-wa {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #D4922A, #EDB84A);
      color: #0C1810;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 16px;
      padding: 0.875rem 1.75rem;
      border-radius: 12px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      min-height: 52px;
      box-shadow: 0 8px 24px rgba(212,146,42,0.35);
      transition: transform 150ms ease, box-shadow 150ms ease;
      white-space: nowrap;
    }
    .cta-btn-wa:hover {
      transform: scale(1.02);
      box-shadow: 0 12px 32px rgba(212,146,42,0.45);
    }

    .cta-btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.05);
      color: #8EA598;
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      font-size: 15px;
      padding: 0.875rem 1.5rem;
      border-radius: 12px;
      text-decoration: none;
      border: 1px solid rgba(255,255,255,0.08);
      cursor: pointer;
      min-height: 52px;
      transition: background 150ms ease, color 150ms ease;
      white-space: nowrap;
    }
    .cta-btn-ghost:hover {
      background: rgba(255,255,255,0.08);
      color: #F5F5F5;
    }
  `;

  const FEATURES = [
    { icon: QrCode,       title: 'QR Code unique',           desc: 'Identification instantanée en caisse. Aucune application à installer pour le client.' },
    { icon: Bell,         title: 'Notifications push',       desc: 'Alertes points crédités, paliers débloqués et promotions directement sur le téléphone.' },
    { icon: Buildings,    title: 'Multi-boutiques',          desc: 'Gérez plusieurs points de vente depuis un seul dashboard avec statistiques consolidées.' },
    { icon: Trophy,       title: 'Paliers personnalisés',    desc: 'Définissez vos propres paliers, récompenses et seuils adaptés à votre secteur.' },
    { icon: ChartBar,     title: 'Dashboard temps réel',     desc: 'Statistiques clients, transactions, taux de rétention — tout en un coup d\'œil.' },
    { icon: DeviceMobile, title: 'PWA installable',          desc: 'Application web installable sur l\'écran d\'accueil, sans passer par l\'App Store.' },
  ];

  const STEPS = [
    {
      num: '01',
      icon: Buildings,
      title: 'Créez votre boutique',
      desc: 'Inscription en 5 minutes. Personnalisez les couleurs, logo et programme de fidélité selon votre identité.',
    },
    {
      num: '02',
      icon: WhatsappLogo,
      title: 'Partagez le lien',
      desc: 'Vos clients reçoivent leur carte personnalisée par SMS ou WhatsApp. Aucun téléchargement requis.',
    },
    {
      num: '03',
      icon: Trophy,
      title: 'Fidélisez & récompensez',
      desc: 'Créditez les points à la caisse en un scan. Les clients voient leur solde et paliers en temps réel.',
    },
  ];

  const PRICING_FEATURES = [
    'Clients illimités',
    'Dashboard complet',
    'Notifications push illimitées',
    'QR Code de caisse',
    'Personnalisation boutique',
    'Analytics & export CSV',
    'Support WhatsApp prioritaire',
    'Mises à jour incluses',
  ];

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100dvh', fontFamily: "'Outfit', sans-serif" }}>
      <style>{css}</style>

      {/* ═══════════════════════════════════════ NAVBAR ══════════════════════════════════════ */}
      <header style={{
        position:       'fixed',
        top:            0,
        left:           0,
        right:          0,
        zIndex:         100,
        height:         64,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '0 clamp(1.25rem, 5vw, 3.5rem)',
        background:     scrolled ? 'rgba(12,24,16,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom:   scrolled ? `1px solid ${C.border}` : 'none',
        transition:     'background 300ms ease, border-color 300ms ease',
      }}>
        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Fidelys" style={{ height: 36, width: 'auto' }} />
        </a>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="lp-desktop-nav">
          <style>{`@media(max-width:768px){.lp-desktop-nav{display:none!important}}`}</style>
          <a href="#comment" className="nav-link">Comment ça marche</a>
          <a href="#fonctionnalites" className="nav-link">Fonctionnalités</a>
          <a href="#tarifs" className="nav-link">Tarifs</a>
        </nav>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/shop-admin/login" className="nav-link" style={{ display: 'none' }}>
            <style>{`.lp-admin-link{display:inline!important}@media(max-width:480px){.lp-admin-link{display:none!important}}`}</style>
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            7,
              background:     'linear-gradient(135deg, #D4922A, #EDB84A)',
              color:          '#0C1810',
              fontFamily:     "'Outfit', sans-serif",
              fontWeight:     700,
              fontSize:       13,
              padding:        '0.5rem 1rem',
              borderRadius:   8,
              textDecoration: 'none',
              whiteSpace:     'nowrap',
              transition:     'transform 150ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <WhatsappLogo size={15} weight="fill" />
            Démarrer
          </a>
        </div>
      </header>

      {/* ═══════════════════════════════════════ HERO ════════════════════════════════════════ */}
      <section style={{ background: `radial-gradient(ellipse 80% 60% at 20% 50%, rgba(11,123,92,0.12) 0%, transparent 65%), ${C.bg}` }}>
        <div className="hero-layout">
          {/* Left — text */}
          <div>
            {/* Badge */}
            <div className="hero-text-1" style={{ marginBottom: '1.5rem' }}>
              <span style={{
                display:       'inline-flex',
                alignItems:    'center',
                gap:           6,
                background:    'rgba(11,123,92,0.12)',
                border:        '1px solid rgba(11,123,92,0.22)',
                borderRadius:  99,
                padding:       '5px 14px',
                fontSize:      12,
                fontWeight:    600,
                color:         C.primaryLight,
                letterSpacing: '0.05em',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.primaryLight, display: 'inline-block', animation: 'badge-pulse 1.4s ease-in-out infinite' }} />
                <style>{`@keyframes badge-pulse { 0%,100%{opacity:1}50%{opacity:0.3} }`}</style>
                Fait à Cotonou · ON AGENCY
              </span>
            </div>

            {/* Headline */}
            <h1
              className="hero-text-2"
              style={{
                fontFamily:    "'Plus Jakarta Sans', sans-serif",
                fontSize:      'clamp(34px, 5.5vw, 56px)',
                fontWeight:    800,
                lineHeight:    1.1,
                letterSpacing: '-2px',
                marginBottom:  '1.25rem',
              }}
            >
              La carte de fidélité{' '}
              <span style={{
                background:           'linear-gradient(135deg, #D4922A, #EDB84A)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
                backgroundClip:       'text',
              }}>
                digitale
              </span>{' '}
              pour boutiques modernes
            </h1>

            {/* Tagline */}
            <p className="hero-text-3" style={{ fontSize: 'clamp(16px, 2vw, 19px)', color: C.textMid, lineHeight: 1.65, maxWidth: 480, marginBottom: '2.5rem' }}>
              Fidélisez vos clients, boostez vos ventes. Une carte digitale partagée par SMS ou WhatsApp — aucun téléchargement requis.
            </p>

            {/* CTAs */}
            <div className="hero-text-4 hero-ctas" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="cta-btn-wa">
                <WhatsappLogo size={20} weight="fill" />
                Démarrer sur WhatsApp
              </a>
              <a href="/shop-admin/login" className="cta-btn-ghost">
                Espace gérant
                <ArrowRight size={16} weight="bold" />
              </a>
            </div>

            {/* Social proof */}
            <p className="hero-text-4" style={{ fontSize: 13, color: C.textDim, marginTop: '1.5rem' }}>
              ✓ Gratuit 30 jours · ✓ Sans carte bancaire · ✓ Support WhatsApp inclus
            </p>
          </div>

          {/* Right — card mockup */}
          <div className="hero-card hero-card-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260, padding: '3rem 2rem' }}>
            <CardMockup />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ STATS ═══════════════════════════════════════ */}
      <section style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div
          ref={statsReveal.ref}
          style={{
            maxWidth:      1200,
            margin:        '0 auto',
            padding:       '3rem clamp(1.25rem, 5vw, 4rem)',
            display:       'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:           '1.5rem',
            textAlign:     'center',
          }}
        >
          {[
            { value: c1,   suffix: '+',  label: 'Boutiques actives',      unit: '' },
            { value: c2,   suffix: '+',  label: 'Clients fidélisés',      unit: '' },
            { value: c3,   suffix: '%',  label: 'Taux de satisfaction',   unit: '' },
          ].map(({ value, suffix, label }) => (
            <div key={label} style={{
              opacity:    statsReveal.visible ? 1 : 0,
              transform:  statsReveal.visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}>
              <p style={{
                fontFamily:    "'Plus Jakarta Sans', sans-serif",
                fontSize:      'clamp(32px, 5vw, 48px)',
                fontWeight:    800,
                letterSpacing: '-1.5px',
                background:    'linear-gradient(135deg, #D4922A, #EDB84A)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
                backgroundClip: 'text',
                lineHeight:    1.1,
              }}>
                {value.toLocaleString('fr-FR')}{suffix}
              </p>
              <p style={{ fontSize: 14, color: C.textMid, marginTop: 6, fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════ HOW IT WORKS ════════════════════════════════ */}
      <section id="comment" className="lp-section" style={{ background: C.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <SectionLabel>Comment ça marche</SectionLabel>
              <div style={{ marginTop: '1rem' }}>
                <SectionTitle sub="Lancez votre programme de fidélité en moins de 10 minutes, sans aucune compétence technique.">
                  Simple comme bonjour
                </SectionTitle>
              </div>
            </div>
          </Reveal>

          <div className="lp-grid-3" style={{ position: 'relative' }}>
            {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
              <Reveal key={num} delay={i * 120}>
                <div style={{ position: 'relative', textAlign: 'center', padding: '2rem 1.5rem' }}>
                  {/* Connector line */}
                  {i < STEPS.length - 1 && <div className="step-connector" />}

                  {/* Number + Icon */}
                  <div style={{ position: 'relative', display: 'inline-flex', marginBottom: '1.25rem' }}>
                    <div style={{
                      width:          72,
                      height:         72,
                      borderRadius:   20,
                      background:     C.primaryPale,
                      border:         `1px solid rgba(11,123,92,0.25)`,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      color:          C.primaryLight,
                      transition:     'transform 200ms ease, background 200ms ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.08) rotate(-4deg)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(11,123,92,0.25)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1) rotate(0)';
                      (e.currentTarget as HTMLElement).style.background = C.primaryPale;
                    }}
                    >
                      <Icon size={32} weight="bold" />
                    </div>
                    <span style={{
                      position:   'absolute',
                      top:        -10,
                      right:      -10,
                      width:      24,
                      height:     24,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #D4922A, #EDB84A)',
                      color:      '#0C1810',
                      fontSize:   11,
                      fontWeight: 800,
                      display:    'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {i + 1}
                    </span>
                  </div>

                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 10 }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.65 }}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FEATURES ════════════════════════════════════ */}
      <section id="fonctionnalites" className="lp-section" style={{ background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <div style={{ marginBottom: '3.5rem' }}>
              <SectionLabel>Fonctionnalités</SectionLabel>
              <div style={{ marginTop: '1rem' }}>
                <SectionTitle sub="Tout ce dont une boutique moderne a besoin pour fidéliser efficacement.">
                  Une plateforme complète,{' '}
                  <span style={{
                    background:           'linear-gradient(135deg, #0B7B5C, #13A87D)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor:  'transparent',
                    backgroundClip:       'text',
                  }}>
                    prête à l'emploi
                  </span>
                </SectionTitle>
              </div>
            </div>
          </Reveal>

          <div className="feat-grid">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{
                    width:          48,
                    height:         48,
                    borderRadius:   12,
                    background:     C.primaryPale,
                    border:         `1px solid rgba(11,123,92,0.20)`,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    color:          C.primaryLight,
                    marginBottom:   '1rem',
                    flexShrink:     0,
                  }}>
                    <Icon size={22} weight="bold" />
                  </div>
                  <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 8 }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.6 }}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ PRICING ═════════════════════════════════════ */}
      <section id="tarifs" className="lp-section" style={{ background: C.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <SectionLabel>Tarifs</SectionLabel>
              <div style={{ marginTop: '1rem' }}>
                <SectionTitle sub="Un seul plan. Tout inclus. Aucune surprise.">
                  Clair et sans surprise
                </SectionTitle>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              <div className="pricing-card" style={{ padding: 'clamp(2rem, 5vw, 3rem)' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <span style={{
                    display:       'inline-block',
                    background:    'linear-gradient(135deg, rgba(212,146,42,0.18), rgba(237,184,74,0.10))',
                    border:        '1px solid rgba(212,146,42,0.30)',
                    borderRadius:  99,
                    padding:       '4px 16px',
                    fontSize:      12,
                    fontWeight:    600,
                    color:         C.secondaryLt,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom:  '1.25rem',
                  }}>
                    ✦ Plan Boutique — Tout inclus
                  </span>

                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{
                      fontFamily:    "'Plus Jakarta Sans', sans-serif",
                      fontSize:      'clamp(42px, 8vw, 56px)',
                      fontWeight:    800,
                      letterSpacing: '-2px',
                      background:    'linear-gradient(135deg, #D4922A, #EDB84A)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor:  'transparent',
                      backgroundClip: 'text',
                      lineHeight:    1,
                    }}>
                      15 000
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 600, color: C.textMid, paddingBottom: 6 }}>FCFA</span>
                  </div>
                  <p style={{ fontSize: 14, color: C.textMid }}>par boutique · par mois</p>
                  <p style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>Essai gratuit 30 jours — sans engagement</p>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: C.border, marginBottom: '1.75rem' }} />

                {/* Feature list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '2rem' }}>
                  {PRICING_FEATURES.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle size={18} weight="fill" color={C.primaryLight} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: C.textMid, fontWeight: 500 }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="cta-btn-wa"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <WhatsappLogo size={20} weight="fill" />
                  Démarrer maintenant
                </a>

                <p style={{ textAlign: 'center', fontSize: 12, color: C.textDim, marginTop: '1rem' }}>
                  Réponse sous 2h · Paiement mobile money accepté
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════ CTA FINAL ═══════════════════════════════════ */}
      <section style={{
        background:   `linear-gradient(135deg, ${C.surface} 0%, rgba(11,123,92,0.15) 100%)`,
        borderTop:    `1px solid ${C.border}`,
        padding:      'clamp(4rem, 8vw, 6rem) clamp(1.25rem, 5vw, 4rem)',
        textAlign:    'center',
      }}>
        <Reveal>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <h2 style={{
              fontFamily:    "'Plus Jakarta Sans', sans-serif",
              fontSize:      'clamp(28px, 5vw, 40px)',
              fontWeight:    800,
              letterSpacing: '-1px',
              color:         C.text,
              marginBottom:  '1rem',
            }}>
              Prêt à fidéliser vos clients ?
            </h2>
            <p style={{ fontSize: 17, color: C.textMid, lineHeight: 1.6, marginBottom: '2.5rem' }}>
              Rejoignez les boutiques qui utilisent Fidelys pour créer des liens durables avec leurs clients.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="cta-btn-wa">
                <WhatsappLogo size={20} weight="fill" />
                Démarrer sur WhatsApp
              </a>
              <a href="/shop-admin/login" className="cta-btn-ghost">
                Espace gérant
                <ArrowRight size={16} weight="bold" />
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════════════════ FOOTER ══════════════════════════════════════ */}
      <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: 'clamp(3rem, 5vw, 4rem) clamp(1.25rem, 5vw, 4rem) 2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
            {/* Brand */}
            <div>
              <img src="/logo.png" alt="Fidelys" style={{ height: 36, width: 'auto', marginBottom: '1rem' }} />
              <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.65, maxWidth: 220 }}>
                Plateforme SaaS de fidélité digitale pour boutiques d'Afrique de l'Ouest.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: '1rem' }}>
                {[InstagramLogo, LinkedinLogo, WhatsappLogo].map((Icon, i) => (
                  <a key={i} href="#" style={{
                    width:          34,
                    height:         34,
                    borderRadius:   8,
                    background:     C.card,
                    border:         `1px solid ${C.border}`,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    color:          C.textMid,
                    textDecoration: 'none',
                    transition:     'color 150ms ease, border-color 150ms ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.primaryLight; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(11,123,92,0.30)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.textMid; (e.currentTarget as HTMLAnchorElement).style.borderColor = C.border; }}
                  >
                    <Icon size={16} weight="bold" />
                  </a>
                ))}
              </div>
            </div>

            {/* Produit */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>Produit</p>
              {['Fonctionnalités', 'Tarifs', 'Comment ça marche', 'Espace gérant'].map(link => (
                <a key={link} href="#" style={{ display: 'block', fontSize: 14, color: C.textMid, textDecoration: 'none', marginBottom: 8, transition: 'color 150ms ease' }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.textMid)}
                >
                  {link}
                </a>
              ))}
            </div>

            {/* ON AGENCY */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.textDim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>ON AGENCY</p>
              <p style={{ fontSize: 14, color: C.textMid, lineHeight: 1.6 }}>
                Agence digitale créative<br />
                Cotonou, Bénin 🇧🇯<br />
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer"
                  style={{ color: C.primaryLight, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <WhatsappLogo size={13} weight="fill" />
                  Nous contacter
                </a>
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ fontSize: 13, color: C.textDim }}>
              © {new Date().getFullYear()} Fidelys — ON AGENCY · Cotonou, Bénin
            </p>
            <p style={{ fontSize: 13, color: C.textDim }}>
              "Chaque achat est une promesse tenue."
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
