import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MagnifyingGlass, UserCircle } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../../components/ui';
import { useShopAdminContext } from './ShopAdminLayout';
import type { Customer } from '../../types/database';

export default function CustomersListPage() {
  const { shopId } = useShopAdminContext();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    if (shopId) loadCustomers();
  }, [shopId]);

  const loadCustomers = async () => {
    if (!shopId) return;
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shopId)
      .order('total_points', { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.phone.includes(q) ||
      (c.first_name || '').toLowerCase().includes(q) ||
      (c.last_name  || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold font-display text-primary">Clients</h1>
        <span className="text-text-muted text-sm">{customers.length} client{customers.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Search */}
      <div className="glass rounded-2xl p-4 mb-6">
        <label htmlFor="customer-search" className="sr-only">Rechercher un client</label>
        <div className="relative">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none"
            aria-hidden
          />
          <input
            id="customer-search"
            type="search"
            placeholder="Téléphone, prénom ou nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: 16 }}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={search ? <MagnifyingGlass /> : <Users />}
            title={search ? 'Aucun résultat' : 'Aucun client enregistré'}
            description={
              search
                ? `Aucun client ne correspond à "${search}".`
                : 'Vos clients apparaîtront ici après leur première visite.'
            }
            compact
          />
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/shop-admin/clients/${c.id}`)}
                aria-label={`Voir le profil de ${c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.phone}`}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-bg-elevated/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                style={{ minHeight: 64 }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold flex-shrink-0"
                    aria-hidden
                  >
                    {c.first_name
                      ? <span>{c.first_name[0].toUpperCase()}</span>
                      : <UserCircle size={22} weight="bold" />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-text text-sm">
                      {c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.phone}
                    </p>
                    <p className="text-text-dim text-xs">{c.phone}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-primary text-sm">{c.total_points.toLocaleString()} pts</p>
                  <p className="text-text-dim text-xs">
                    {c.last_visit_at
                      ? `Visite: ${new Date(c.last_visit_at).toLocaleDateString('fr-FR')}`
                      : 'Nouveau'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
