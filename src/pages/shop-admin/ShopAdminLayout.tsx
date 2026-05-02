import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  ChartBar, Users, Megaphone, Trophy, PaintBrush,
  SignOut, List, X, Storefront,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import type { Shop } from '../../types/database';

// ── Context ───────────────────────────────────────────────────────────────────

interface ShopAdminContextValue {
  shop: Shop | null;
  shopId: string | null;
  role: string | null;
}

const ShopAdminContext = createContext<ShopAdminContextValue>({ shop: null, shopId: null, role: null });

export function useShopAdminContext() {
  return useContext(ShopAdminContext);
}

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV = [
  { path: '/shop-admin/dashboard',      label: 'Dashboard',       Icon: ChartBar   },
  { path: '/shop-admin/clients',        label: 'Clients',         Icon: Users      },
  { path: '/shop-admin/campagnes',      label: 'Campagnes',       Icon: Megaphone  },
  { path: '/shop-admin/programme',      label: 'Programme',       Icon: Trophy     },
  { path: '/shop-admin/personnalisation', label: 'Personnalisation', Icon: PaintBrush },
];

// ── Layout ────────────────────────────────────────────────────────────────────

export default function ShopAdminLayout() {
  const location = useLocation();
  const navigate  = useNavigate();
  const [shop,    setShop]    = useState<Shop | null>(null);
  const [shopId,  setShopId]  = useState<string | null>(null);
  const [role,    setRole]    = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);

  // Close sidebar whenever the route changes
  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    loadShopContext();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/shop-admin/login');
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const loadShopContext = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/shop-admin/login'); return; }

    const { data: adminRow } = await supabase
      .from('shop_admins')
      .select('shop_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single() as { data: { shop_id: string; role: string } | null; error: unknown };

    if (!adminRow) { navigate('/shop-admin/login'); return; }

    const { data: shopData } = await supabase
      .from('shops')
      .select('*')
      .eq('id', adminRow.shop_id)
      .single();

    setShop(shopData || null);
    setShopId(adminRow.shop_id);
    setRole(adminRow.role);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/shop-admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Shared sidebar content ─────────────────────────────────────────────────

  function SidebarContent() {
    return (
      <>
        {/* Shop header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            {shop?.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0" aria-hidden>
                <Storefront size={20} weight="bold" className="text-bg-dark" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold font-display text-text truncate">{shop?.name || '—'}</p>
              <p className="text-xs text-text-dim">Espace Gérant</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1" aria-label="Navigation principale">
          {NAV.map(({ path, label, Icon }) => {
            const active = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-text-muted hover:text-text hover:bg-bg-elevated'
                }`}
                style={{ minHeight: 44 }}
              >
                <Icon size={20} weight={active ? 'bold' : 'regular'} aria-hidden />
                <span className="font-medium text-sm">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: role + logout */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-elevated">
            <div className="text-sm min-w-0">
              <p className="text-text font-medium capitalize truncate">{role}</p>
              <p className="text-text-dim text-xs truncate">/{shop?.slug}</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Déconnexion"
              className="text-text-muted hover:text-error transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary p-1"
              style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <SignOut size={18} weight="bold" aria-hidden />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <ShopAdminContext.Provider value={{ shop, shopId, role }}>
      <div className="min-h-screen bg-bg-dark flex">

        {/* ── Desktop sidebar (lg+) ─────────────────────────────────────────── */}
        <aside className="hidden lg:flex w-64 bg-bg-surface border-r border-border flex-col flex-shrink-0">
          <SidebarContent />
        </aside>

        {/* ── Mobile: backdrop ─────────────────────────────────────────────── */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
        )}

        {/* ── Mobile: slide-in sidebar ──────────────────────────────────────── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-bg-surface border-r border-border flex flex-col lg:hidden transition-transform duration-300 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Menu navigation"
        >
          <SidebarContent />
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Mobile top bar */}
          <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-bg-surface border-b border-border">
            <button
              onClick={() => setOpen(true)}
              aria-label="Ouvrir le menu"
              className="text-text-muted hover:text-text transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <List size={22} aria-hidden />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt="" aria-hidden className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-lg gradient-gold flex items-center justify-center flex-shrink-0" aria-hidden>
                  <Storefront size={14} weight="bold" className="text-bg-dark" />
                </div>
              )}
              <span className="font-semibold font-display text-text text-sm truncate">{shop?.name || 'Fidelys'}</span>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Déconnexion"
              className="ml-auto text-text-muted hover:text-error transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <SignOut size={18} weight="bold" aria-hidden />
            </button>
          </header>

          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Close mobile sidebar with Escape */}
      {open && (
        <button
          className="fixed top-4 right-4 z-[60] lg:hidden text-white bg-bg-elevated rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
          style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={20} aria-hidden />
        </button>
      )}
    </ShopAdminContext.Provider>
  );
}
