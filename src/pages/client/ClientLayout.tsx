import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import { CreditCard, ClockCounterClockwise, QrCode } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { PushNotificationPrompt } from '../../components/PushNotificationPrompt';
import type { Shop, Customer, RewardTier } from '../../types/database';

// ── Design tokens Light Mode Crème (brand.md) ────────────────────────────────

export const C = {
  bg: '#F8F5EE',
  card: '#FFFFFF',
  subtle: '#EDE9DF',
  border: '#DDD8CE',
  textDark: '#0C1810',
  textMid: '#3D5248',
  textLight: '#8EA598',
  primary: '#0B7B5C',
  primaryDark: '#075C44',
  primaryLight: '#13A87D',
  primaryPale: '#E6F5F0',
  secondary: '#D4922A',
  secondaryPale: '#FDF4E3',
  accentPale: '#FEF0EB',
  success: '#22A05A',
  error: '#D63C3C',
};

export const S = {
  sm: '0 1px 3px rgba(11,123,92,0.08)',
  md: '0 4px 16px rgba(11,123,92,0.12)',
  lg: '0 8px 32px rgba(11,123,92,0.18)',
  gold: '0 4px 16px rgba(212,146,42,0.15)',
};

export const F = {
  heading: "'Plus Jakarta Sans', sans-serif",
  body: "'Outfit', sans-serif",
};

// ── Context ───────────────────────────────────────────────────────────────────

interface ClientContextValue {
  shop: Shop;
  customer: Customer;
  tiers: RewardTier[];
  primaryColor: string;
  secondaryColor: string;
  refetch: () => Promise<void>;
}

const ClientContext = createContext<ClientContextValue | null>(null);

export function useClientContext(): ClientContextValue {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClientContext doit être dans ClientLayout');
  return ctx;
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function ClientLayout() {
  const { slug, customerId } = useParams<{ slug: string; customerId: string }>();
  const location = useLocation();

  const [shop, setShop] = useState<Shop | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tiers, setTiers] = useState<RewardTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushDismissed, setPushDismissed] = useState(false);

  const fetchData = async () => {
    if (!slug || !customerId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: shopData, error: shopErr } = await supabase
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .single();

      if (shopErr || !shopData) {
        setError('Boutique introuvable');
        return;
      }

      const { data: customerData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('shop_id', shopData.id)
        .single();

      if (custErr || !customerData) {
        setError('Carte introuvable');
        return;
      }

      const { data: tiersData } = await supabase
        .from('reward_tiers')
        .select('*')
        .eq('shop_id', shopData.id)
        .eq('active', true)
        .order('points_required');

      setShop(shopData);
      setCustomer(customerData);
      setTiers(tiersData || []);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [slug, customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check localStorage pour le push prompt (par client)
  useEffect(() => {
    if (!customerId) return;
    const dismissed = localStorage.getItem(`fidelys-push-dismissed-${customerId}`) === '1';
    setPushDismissed(dismissed);
  }, [customerId]);

  const primaryColor = shop?.primary_color || C.primary;
  const secondaryColor = shop?.secondary_color || C.secondary;

  // Applique les CSS custom properties de branding dynamique
  useEffect(() => {
    document.documentElement.style.setProperty('--shop-primary', primaryColor);
    document.documentElement.style.setProperty('--shop-secondary', secondaryColor);
    return () => {
      document.documentElement.style.removeProperty('--shop-primary');
      document.documentElement.style.removeProperty('--shop-secondary');
    };
  }, [primaryColor, secondaryColor]);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.body }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: C.textLight, fontSize: 14 }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !shop || !customer) {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: F.body }}>
        <div style={{ textAlign: 'center', background: C.card, borderRadius: 20, padding: '2rem 1.75rem', boxShadow: S.md, maxWidth: 320, border: `1px solid ${C.border}` }}>
          <img src="/logo.png" alt="Fidelys" style={{ height: 40, width: 'auto', margin: '0 auto 1.25rem', display: 'block', opacity: 0.7 }} />
          <p style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 18, color: C.textDark, marginBottom: 8 }}>
            {error || 'Page introuvable'}
          </p>
          <p style={{ color: C.textMid, fontSize: 14, lineHeight: 1.5 }}>
            Vérifiez le lien envoyé par votre boutique.
          </p>
        </div>
      </div>
    );
  }

  const navBase = `/client/${slug}/c/${customerId}`;
  const navItems = [
    { path: navBase, label: 'Ma carte', Icon: CreditCard, exact: true },
    { path: `${navBase}/history`, label: 'Historique', Icon: ClockCounterClockwise, exact: false },
    { path: `${navBase}/qr`, label: 'Mon QR', Icon: QrCode, exact: false },
  ];

  const handlePushDismiss = () => {
    localStorage.setItem(`fidelys-push-dismissed-${customerId}`, '1');
    setPushDismissed(true);
  };

  return (
    <ClientContext.Provider value={{ shop, customer, tiers, primaryColor, secondaryColor, refetch: fetchData }}>
      <div style={{ minHeight: '100dvh', background: C.bg, fontFamily: F.body, color: C.textDark, maxWidth: 480, margin: '0 auto', position: 'relative' }}>

        {/* Header boutique */}
        <header style={{
          background: primaryColor,
          padding: '0.875rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          boxShadow: `0 2px 12px ${primaryColor}50`,
        }}>
          {shop.logo_url ? (
            <img src={shop.logo_url} alt={shop.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏪</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: F.heading, color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {shop.name}
            </p>
            {shop.welcome_message && (
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shop.welcome_message}
              </p>
            )}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
            Fidélité
          </p>
        </header>

        {/* Contenu */}
        <main style={{ paddingBottom: '5.5rem' }}>
          <Outlet />
        </main>

        {/* Prompt notifications push (1 seule fois) */}
        {!pushDismissed && (
          <PushNotificationPrompt
            customerId={customer.id}
            primaryColor={primaryColor}
            onDismiss={handlePushDismiss}
          />
        )}

        {/* Navigation bas */}
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          background: C.card,
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          zIndex: 40,
          boxShadow: '0 -4px 16px rgba(11,123,92,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0.65rem 0.25rem 0.55rem',
                  color: isActive ? primaryColor : C.textLight,
                  textDecoration: 'none',
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'color 0.15s ease',
                  gap: 3,
                  minHeight: 44,
                  justifyContent: 'center',
                }}
              >
                <item.Icon size={24} weight={isActive ? 'bold' : 'regular'} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </ClientContext.Provider>
  );
}
