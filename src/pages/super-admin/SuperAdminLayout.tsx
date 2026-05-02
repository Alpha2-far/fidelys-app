/**
 * FIDELYS — Super Admin Layout
 * Layout avec sidebar pour toutes les pages super-admin
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const user = supabase.auth.getUser();
    user.then(({ data }) => {
      if (data.user) setUserEmail(data.user.email || '');
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/super-admin/login');
    });

    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/super-admin/login');
  };

  const navItems = [
    { path: '/super-admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/super-admin/boutiques', label: 'Boutiques', icon: '🏪' },
    { path: '/super-admin/groupes', label: 'Groupes', icon: '🏢' },
  ];

  return (
    <div className="min-h-screen bg-bg-dark flex">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-surface border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
              <span className="text-xl font-bold text-bg-dark font-display">F</span>
            </div>
            <div>
              <p className="font-semibold font-display text-primary">Fidelys</p>
              <p className="text-xs text-text-dim">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-text-muted hover:text-text hover:bg-bg-elevated'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-elevated">
            <div className="text-sm">
              <p className="text-text font-medium truncate max-w-[120px]">{userEmail}</p>
              <p className="text-text-dim text-xs">Super Admin</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-text-muted hover:text-error transition-colors"
              title="Déconnexion"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
