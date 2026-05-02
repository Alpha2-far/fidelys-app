/**
 * FIDELYS — Super Admin Shops List
 * Liste filtrable des boutiques avec actions
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Shop, ShopGroup } from '../../types/database';

interface ShopWithGroup extends Shop {
  shop_group?: Pick<ShopGroup, 'id' | 'name'> | null;
}

export default function ShopsListPage() {
  const [shops, setShops] = useState<ShopWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*, shop_groups(id, name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShops(data || []);
    } catch (err) {
      console.error('Erreur chargement boutiques:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredShops = shops.filter((shop) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && shop.subscription_status === 'active') ||
      (filter === 'suspended' && shop.subscription_status === 'suspended');

    const matchesSearch =
      !search ||
      shop.name.toLowerCase().includes(search.toLowerCase()) ||
      shop.slug.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold font-display text-primary">Boutiques</h1>
        <Link
          to="/super-admin/boutiques/nouvelle"
          className="px-4 py-2 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 transition-opacity text-center"
        >
          + Nouvelle boutique
        </Link>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Rechercher par nom ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            {(['all', 'active', 'suspended'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary text-bg-dark'
                    : 'bg-bg-surface text-text-muted hover:text-text'
                }`}
              >
                {f === 'all' ? 'Toutes' : f === 'active' ? 'Actives' : 'Suspendues'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 skeleton rounded-xl" />
            ))}
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            Aucune boutique trouvée
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-elevated border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">
                    Boutique
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">
                    Slug
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">
                    Groupe
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">
                    Clients
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-text-muted">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredShops.map((shop) => (
                  <tr
                    key={shop.id}
                    className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {shop.logo_url && (
                          <img
                            src={shop.logo_url}
                            alt={shop.name}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        )}
                        <span className="font-medium text-text">{shop.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{shop.slug}</td>
                    <td className="px-6 py-4">
                      {shop.shop_group ? (
                        <span className="text-primary">{shop.shop_group.name}</span>
                      ) : (
                        <span className="text-text-dim">Indépendante</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={shop.subscription_status} />
                    </td>
                    <td className="px-6 py-4 text-text-muted">—</td>
                    <td className="px-6 py-4 text-text-muted text-sm">
                      {new Date(shop.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/super-admin/boutiques/${shop.id}`}
                        className="text-primary hover:text-primary-light text-sm font-medium"
                      >
                        Voir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { bg: 'bg-success/10', text: 'text-success', label: 'Active' },
    suspended: { bg: 'bg-warning/10', text: 'text-warning', label: 'Suspendue' },
    expired: { bg: 'bg-error/10', text: 'text-error', label: 'Expirée' },
    trial: { bg: 'bg-info/10', text: 'text-info', label: 'Essai' },
  };
  const c = config[status as keyof typeof config] || config.active;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
