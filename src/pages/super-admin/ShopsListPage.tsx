/**
 * FIDELYS — Super Admin Shops List
 * Fetch shops avec join shop_groups. Recherche, filtres par status,
 * pagination 10/page. Badge couleur par status.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

interface ShopRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  subscription_status: string;
  created_at: string;
  group_id: string | null;
  shop_groups: { id: string; name: string } | null;
  customers: { count: number }[];
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'expired' | 'trial' | 'cancelled';

const PAGE_SIZE = 10;

// ── Composant principal ──────────────────────────────────────────────────────

export default function ShopsListPage() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const loadShops = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('shops')
        .select('id, name, slug, logo_url, primary_color, subscription_status, created_at, group_id, shop_groups(id, name), customers(count)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (filter !== 'all') {
        query = query.eq('subscription_status', filter);
      }

      if (search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,slug.ilike.%${search.trim()}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;
      setShops((data as unknown as ShopRow[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err) {
      console.error('Erreur chargement boutiques:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadShops();
    }, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [loadShops, search]);

  // Reset page quand on change un filtre ou la recherche
  useEffect(() => {
    setPage(0);
  }, [filter, search]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'active', label: 'Actives' },
    { key: 'trial', label: 'Essai' },
    { key: 'suspended', label: 'Suspendues' },
    { key: 'expired', label: 'Expirées' },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl font-bold"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: '#13A87D',
              letterSpacing: '-0.5px',
            }}
          >
            Boutiques
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}
          >
            {totalCount} boutique{totalCount !== 1 ? 's' : ''} au total
          </p>
        </div>
        <Link
          to="/super-admin/boutiques/nouvelle"
          className="px-5 py-2.5 rounded-xl font-medium text-sm transition-opacity hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #D4922A, #EDB84A)',
            color: '#0C1810',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          + Nouvelle boutique
        </Link>
      </div>

      {/* Filtres */}
      <div
        className="rounded-2xl p-4 mb-6"
        style={{
          backgroundColor: '#1A3020',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Rechercher par nom ou slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
            style={{
              backgroundColor: '#0C1810',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#F5F5F5',
              fontFamily: "'Outfit', sans-serif",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#13A87D'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          />
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  backgroundColor: filter === f.key ? '#0B7B5C' : 'rgba(255,255,255,0.05)',
                  color: filter === f.key ? '#F5F5F5' : '#8EA598',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: '#1A3020',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 16px rgba(11,123,92,0.12)',
        }}
      >
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl animate-pulse"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              />
            ))}
          </div>
        ) : shops.length === 0 ? (
          <div
            className="p-12 text-center"
            style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}
          >
            <p className="text-lg mb-2">Aucune boutique trouvée</p>
            <p className="text-sm" style={{ color: '#5F7968' }}>
              {search ? 'Essayez avec d\'autres termes de recherche' : 'Commencez par créer une boutique'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Boutique', 'Slug', 'Groupe', 'Statut', 'Clients', 'Date', ''].map((h) => (
                      <th
                        key={h}
                        className={`px-6 py-3.5 text-xs font-medium uppercase tracking-wider ${h === '' ? 'text-right' : 'text-left'}`}
                        style={{ color: '#5F7968', fontFamily: "'Outfit', sans-serif" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop) => {
                    const clientCount = shop.customers?.[0]?.count ?? 0;
                    return (
                      <tr
                        key={shop.id}
                        className="transition-colors"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#2B4D36'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                      >
                        {/* Boutique */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: shop.primary_color || '#0B7B5C',
                              }}
                            >
                              {shop.logo_url ? (
                                <img src={shop.logo_url} alt={shop.name} className="w-full h-full rounded-lg object-cover" />
                              ) : (
                                <span
                                  className="text-xs font-bold"
                                  style={{ color: '#F5F5F5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                >
                                  {shop.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span
                              className="font-medium truncate max-w-[160px]"
                              style={{ color: '#F5F5F5', fontFamily: "'Outfit', sans-serif" }}
                            >
                              {shop.name}
                            </span>
                          </div>
                        </td>

                        {/* Slug */}
                        <td className="px-6 py-4">
                          <span
                            className="text-sm font-mono"
                            style={{ color: '#8EA598' }}
                          >
                            {shop.slug}
                          </span>
                        </td>

                        {/* Groupe */}
                        <td className="px-6 py-4">
                          {shop.shop_groups ? (
                            <span
                              className="text-sm"
                              style={{ color: '#13A87D', fontFamily: "'Outfit', sans-serif" }}
                            >
                              {shop.shop_groups.name}
                            </span>
                          ) : (
                            <span
                              className="text-sm"
                              style={{ color: '#5F7968', fontFamily: "'Outfit', sans-serif" }}
                            >
                              Indépendante
                            </span>
                          )}
                        </td>

                        {/* Statut */}
                        <td className="px-6 py-4">
                          <StatusBadge status={shop.subscription_status} />
                        </td>

                        {/* Clients */}
                        <td className="px-6 py-4">
                          <span
                            className="text-sm font-medium"
                            style={{ color: '#F5F5F5', fontFamily: "'Outfit', sans-serif" }}
                          >
                            {clientCount}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4">
                          <span
                            className="text-sm"
                            style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}
                          >
                            {new Date(shop.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/super-admin/boutiques/${shop.id}`}
                            className="text-sm font-medium transition-opacity hover:opacity-80"
                            style={{ color: '#13A87D', fontFamily: "'Outfit', sans-serif" }}
                          >
                            Voir →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p
                  className="text-xs"
                  style={{ color: '#5F7968', fontFamily: "'Outfit', sans-serif" }}
                >
                  Page {page + 1} sur {totalPages} — {totalCount} résultat{totalCount !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      color: '#8EA598',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    ← Précédent
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      color: '#8EA598',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
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
      className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
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
