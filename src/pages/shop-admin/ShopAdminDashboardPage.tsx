import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Star, Receipt, CreditCard, Gift, Wrench } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../../components/ui';
import { useShopAdminContext } from './ShopAdminLayout';

interface Stats {
  totalClients: number;
  newThisWeek: number;
  pointsThisWeek: number;
  transactionsThisMonth: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  points: number;
  purchase_amount: number | null;
  created_at: string;
  customer: { first_name: string | null; last_name: string | null; phone: string } | null;
}

type TxType = 'purchase' | 'reward_claim' | 'bonus' | string;

function TxIcon({ type }: { type: TxType }) {
  const props = { size: 20, weight: 'bold' as const };
  if (type === 'purchase')     return <CreditCard {...props} className="text-primary" />;
  if (type === 'reward_claim') return <Gift {...props} className="text-error" />;
  if (type === 'bonus')        return <Star {...props} className="text-secondary" />;
  return <Wrench {...props} className="text-text-muted" />;
}

export default function ShopAdminDashboardPage() {
  const { shopId, shop } = useShopAdminContext();
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [recent,  setRecent]  = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shopId) loadData();
  }, [shopId]);

  const loadData = async () => {
    if (!shopId) return;
    const weekAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [totalClients, newClients, weekTx, monthTx, recentTx] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('shop_id', shopId),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('shop_id', shopId).gte('created_at', weekAgo),
      supabase.from('points_transactions').select('points').eq('shop_id', shopId).eq('type', 'purchase').gte('created_at', weekAgo),
      supabase.from('points_transactions').select('*', { count: 'exact', head: true }).eq('shop_id', shopId).gte('created_at', monthAgo),
      supabase.from('points_transactions')
        .select('id, type, points, purchase_amount, created_at, customers(first_name, last_name, phone)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    setStats({
      totalClients:        totalClients.count ?? 0,
      newThisWeek:         newClients.count ?? 0,
      pointsThisWeek:      (weekTx.data || []).reduce((sum, t) => sum + t.points, 0),
      transactionsThisMonth: monthTx.count ?? 0,
    });

    setRecent((recentTx.data || []).map((t: any) => ({
      ...t,
      customer: t.customers || null,
    })));

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="glass rounded-2xl p-6 skeleton h-28" />)}
        </div>
        <div className="glass rounded-2xl skeleton h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-display text-primary">Dashboard</h1>
          <p className="text-text-muted text-sm mt-1">{shop?.name}</p>
        </div>
        <Link
          to="/shop-admin/clients"
          className="px-4 py-2 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 transition-opacity text-sm"
        >
          + Créditer un client
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total clients"         value={stats!.totalClients.toLocaleString()}         Icon={Users}    />
        <StatCard title="Nouveaux (7j)"          value={`+${stats!.newThisWeek}`}                     Icon={UserPlus} accent />
        <StatCard title="Points crédités (7j)"  value={stats!.pointsThisWeek.toLocaleString()}       Icon={Star}     />
        <StatCard title="Transactions (30j)"    value={stats!.transactionsThisMonth.toLocaleString()} Icon={Receipt}  />
      </div>

      {/* Transactions récentes */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Transactions récentes</h2>
          <Link to="/shop-admin/clients" className="text-primary text-sm hover:opacity-80">
            Voir tous les clients →
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title="Aucune transaction"
            description="Les achats et récompenses de vos clients apparaîtront ici."
            action={{ label: 'Créditer un client', onClick: () => {}, variant: 'secondary' }}
            compact
          />
        ) : (
          <div className="divide-y divide-border/50">
            {recent.map((tx) => (
              <div key={tx.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-bg-elevated flex items-center justify-center flex-shrink-0">
                    <TxIcon type={tx.type} />
                  </div>
                  <div>
                    <p className="text-text text-sm font-medium">
                      {tx.customer?.first_name
                        ? `${tx.customer.first_name} ${tx.customer.last_name || ''}`.trim()
                        : tx.customer?.phone || 'Client inconnu'}
                    </p>
                    <p className="text-text-dim text-xs">
                      {tx.type === 'purchase' ? 'Achat' : tx.type === 'reward_claim' ? 'Récompense' : 'Bonus'}
                      {tx.purchase_amount ? ` — ${tx.purchase_amount.toLocaleString()} FCFA` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${tx.type === 'reward_claim' ? 'text-error' : 'text-success'}`}>
                    {tx.type === 'reward_claim' ? '−' : '+'}{tx.points} pts
                  </p>
                  <p className="text-text-dim text-xs">
                    {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title, value, Icon, accent = false,
}: {
  title: string;
  value: string;
  Icon: React.ComponentType<{ size?: number; weight?: 'regular' | 'bold'; className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5 animate-slide-up">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
        <Icon size={18} weight="bold" className={accent ? 'text-success' : 'text-primary'} />
      </div>
      <p className="text-text-muted text-xs mb-1">{title}</p>
      <p className={`text-2xl font-bold font-display ${accent ? 'text-success' : 'text-primary'}`}>{value}</p>
    </div>
  );
}
