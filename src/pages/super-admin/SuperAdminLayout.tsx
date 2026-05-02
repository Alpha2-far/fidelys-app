import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ChartBar, Buildings, Storefront,
  SignOut, List, X,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV = [
  { path: '/super-admin/dashboard', label: 'Dashboard', Icon: ChartBar   },
  { path: '/super-admin/boutiques', label: 'Boutiques', Icon: Storefront },
  { path: '/super-admin/groupes',   label: 'Groupes',   Icon: Buildings  },
];

// ── Layout ────────────────────────────────────────────────────────────────────

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate  = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [open,      setOpen]      = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserEmail(data.user.email || '');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/super-admin/login');
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/super-admin/login');
  };

  // ── Shared sidebar content ─────────────────────────────────────────────────

  function SidebarContent() {
    return (
      <>
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Fidelys" className="h-8 w-auto object-contain" />
            <div>
              <p className="text-xs text-text-dim">Super Admin</p>
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

        {/* User + logout */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-elevated">
            <div className="text-sm min-w-0">
              <p className="text-text font-medium truncate max-w-[130px]">{userEmail}</p>
              <p className="text-text-dim text-xs">ON AGENCY</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Déconnexion"
              className="text-text-muted hover:text-error transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
    <div className="min-h-screen bg-bg-dark flex">

      {/* ── Desktop sidebar (lg+) ──────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 bg-bg-surface border-r border-border flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile: backdrop ───────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile: slide-in sidebar ───────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-bg-surface border-r border-border flex flex-col lg:hidden transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menu navigation"
      >
        <SidebarContent />
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
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
          <img src="/logo.png" alt="Fidelys" className="h-7 w-auto object-contain" />
          <span className="text-xs text-text-dim ml-1">Super Admin</span>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Close button overlay when mobile sidebar is open */}
      {open && (
        <button
          className="fixed top-4 right-4 z-[60] lg:hidden text-white bg-bg-elevated rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
          style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={20} aria-hidden />
        </button>
      )}
    </div>
  );
}
