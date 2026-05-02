/**
 * FIDELYS — Super Admin Dashboard
 * KPIs réels : total boutiques, actives, total clients, transactions du mois
 * Liste 5 dernières boutiques. Loading skeletons.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Shop } from '../../types/database';

// ── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  shopsCount: number;
  activeShops: number;
  customersCount: number;
  groupsCount: number;
  monthTransactions: number;
}

// ── Composant principal ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentShops, setRecentShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Toutes les requêtes en parallèle
      const [
        shopsRes,
        activeRes,
        customersRes,
        groupsRes,
        monthTxRes,
        recentRes,
      ] = await Promise.all([
        supabase.from('shops').select('*', { count: 'exact', head: true }),
        supabase.from('shops').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('shop_groups').select('*', { count: 'exact', head: true }),
        supabase.from('points_transactions').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('shops').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        shopsCount: shopsRes.count ?? 0,
        activeShops: activeRes.count ?? 0,
        customersCount: customersRes.count ?? 0,
        groupsCount: groupsRes.count ?? 0,
        monthTransactions: monthTxRes.count ?? 0,
      });

      setRecentShops((recentRes.data as Shop[]) ?? []);
    } catch {
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ── Loading skeletons ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div
          className="h-10 w-48 rounded-lg mb-8"
          style={{ backgroundColor: '#1A3020' }}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-6 h-32 animate-pulse"
              style={{ backgroundColor: '#1A3020' }}
            />
          ))}
        </div>
        <div
          className="rounded-2xl p-6 h-64 animate-pulse"
          style={{ backgroundColor: '#1A3020' }}
        />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            backgroundColor: '#1A3020',
            border: '1px solid rgba(214,60,60,0.2)',
          }}
        >
          <p style={{ color: '#D63C3C', fontFamily: "'Outfit', sans-serif" }}>{error}</p>
          <button
            onClick={loadDashboard}
            className="mt-4 px-4 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgba(11,123,92,0.15)',
              color: '#13A87D',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const kpis = [
    {
      label: 'Boutiques',
      value: stats!.shopsCount.toString(),
      sub: `${stats!.activeShops} actives`,
      color: '#0B7B5C',
      bgColor: 'rgba(11,123,92,0.15)',
    },
    {
      label: 'Clients',
      value: stats!.customersCount.toLocaleString('fr-FR'),
      sub: 'Tous les comptes',
      color: '#13A87D',
      bgColor: 'rgba(19,168,125,0.12)',
    },
    {
      label: 'Transactions/mois',
      value: stats!.monthTransactions.toLocaleString('fr-FR'),
      sub: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      color: '#D4922A',
      bgColor: 'rgba(212,146,42,0.15)',
    },
    {
      label: 'Groupes',
      value: stats!.groupsCount.toString(),
      sub: 'Chaînes / franchises',
      color: '#0B7B5C',
      bgColor: 'rgba(11,123,92,0.15)',
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <h1
        className="text-3xl font-bold mb-8"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: '#13A87D',
          letterSpacing: '-0.5px',
        }}
      >
        Dashboard
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl p-6"
            style={{
              backgroundColor: '#1A3020',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 4px 16px rgba(11,123,92,0.12)',
            }}
          >
            <p
              className="text-sm mb-1"
              style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}
            >
              {kpi.label}
            </p>
            <p
              className="text-3xl font-bold mb-2"
              style={{
                color: kpi.color,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-1px',
              }}
            >
              {kpi.value}
            </p>
            <span
              className="inline-block px-2 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: kpi.bgColor,
                color: kpi.color,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {kpi.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Dernières boutiques + Actions rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dernières boutiques */}
        <div
          className="lg:col-span-2 rounded-2xl p-6"
          style={{
            backgroundColor: '#1A3020',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 16px rgba(11,123,92,0.12)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#F5F5F5' }}
            >
              Dernières boutiques
            </h2>
            <Link
              to="/super-admin/boutiques"
              className="text-sm"
              style={{ color: '#13A87D', fontFamily: "'Outfit', sans-serif" }}
            >
              Voir tout →
            </Link>
          </div>

          {recentShops.length === 0 ? (
            <p
              className="text-center py-8"
              style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}
            >
              Aucune boutique créée
            </p>
          ) : (
            <div className="space-y-3">
              {recentShops.map((shop) => (
                <Link
                  key={shop.id}
                  to={`/super-admin/boutiques/${shop.id}`}
                  className="flex items-center justify-between p-3 rounded-xl transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#2B4D36';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: shop.primary_color || '#0B7B5C',
                      }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: '#F5F5F5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        {shop.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p
                        className="font-medium truncate"
                        style={{ color: '#F5F5F5', fontFamily: "'Outfit', sans-serif" }}
                      >
                        {shop.name}
                      </p>
                      <p
                        className="text-xs truncate"
                        style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}
                      >
                        {shop.slug}.fidelys.app
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={shop.subscription_status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: '#1A3020',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 16px rgba(11,123,92,0.12)',
          }}
        >
          <h2
            className="text-lg font-bold mb-4"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#F5F5F5' }}
          >
            Actions rapides
          </h2>
          <div className="space-y-3">
            <Link
              to="/super-admin/boutiques/nouvelle"
              className="flex items-center gap-3 p-3 rounded-xl font-medium transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #D4922A, #EDB84A)',
                color: '#0C1810',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              <span className="text-lg">+</span>
              Nouvelle boutique
            </Link>
            <Link
              to="/super-admin/boutiques"
              className="flex items-center gap-3 p-3 rounded-xl transition-colors"
              style={{
                backgroundColor: 'rgba(11,123,92,0.15)',
                color: '#13A87D',
                border: '1px solid rgba(11,123,92,0.2)',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Gérer les boutiques
            </Link>
            <Link
              to="/super-admin/groupes"
              className="flex items-center gap-3 p-3 rounded-xl transition-colors"
              style={{
                backgroundColor: 'rgba(11,123,92,0.15)',
                color: '#13A87D',
                border: '1px solid rgba(11,123,92,0.2)',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Gérer les groupes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: 'rgba(34,160,90,0.15)', color: '#22A05A', label: 'Active' },
    trial: { bg: 'rgba(42,125,212,0.15)', color: '#2A7DD4', label: 'Essai' },
    suspended: { bg: 'rgba(212,146,42,0.15)', color: '#D4922A', label: 'Suspendue' },
    expired: { bg: 'rgba(214,60,60,0.15)', color: '#D63C3C', label: 'Expirée' },
    cancelled: { bg: 'rgba(214,60,60,0.15)', color: '#D63C3C', label: 'Annulée' },
  };
  const c = configs[status] ?? configs.active;
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-medium flex-shrink-0"
      style={{
        backgroundColor: c.bg,
        color: c.color,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {c.label}
    </span>
  );
}
