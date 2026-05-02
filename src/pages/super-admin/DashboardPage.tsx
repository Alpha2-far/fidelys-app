/**
 * FIDELYS — Super Admin Dashboard
 * Stats globales : boutiques, clients, MRR, groupes
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  shopsCount: number;
  activeShops: number;
  customersCount: number;
  groupsCount: number;
  estimatedMRR: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Compter les boutiques
      const shopsCount = await supabase
        .from('shops')
        .select('*', { count: 'exact', head: true });

      // Compter les boutiques actives
      const activeShops = await supabase
        .from('shops')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active');

      // Compter les clients (customer_profiles uniques)
      const customersCount = await supabase
        .from('customer_profiles')
        .select('*', { count: 'exact', head: true });

      // Compter les groupes
      const groupsCount = await supabase
        .from('shop_groups')
        .select('*', { count: 'exact', head: true });

      setStats({
        shopsCount: shopsCount.count ?? 0,
        activeShops: activeShops.count ?? 0,
        customersCount: customersCount.count ?? 0,
        groupsCount: groupsCount.count ?? 0,
        estimatedMRR: (shopsCount.count ?? 0) * 5000, // 5000 FCFA/boutique/mois (exemple)
      });
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-2xl p-6 skeleton h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in">
      <h1 className="text-3xl font-bold font-display text-primary mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Boutiques"
          value={stats!.shopsCount.toString()}
          subtitle={`${stats!.activeShops} actives`}
          icon="🏪"
        />
        <StatCard
          title="Clients"
          value={stats!.customersCount.toLocaleString()}
          subtitle="Profils uniques"
          icon="👥"
        />
        <StatCard
          title="Groupes"
          value={stats!.groupsCount.toString()}
          subtitle="Chaînes / franchises"
          icon="🏢"
        />
        <StatCard
          title="MRR Estimé"
          value={`${(stats!.estimatedMRR / 1000).toFixed(0)}K FCFA`}
          subtitle="Revenu mensuel"
          icon="💰"
        />
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-semibold font-display text-text mb-4">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/super-admin/boutiques"
            className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
          >
            Gérer les boutiques
          </Link>
          <Link
            to="/super-admin/groupes"
            className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
          >
            Gérer les groupes
          </Link>
          <Link
            to="/super-admin/boutiques/nouvelle"
            className="px-4 py-2 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 transition-opacity"
          >
            + Nouvelle boutique
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="glass rounded-2xl p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{icon}</span>
      </div>
      <p className="text-text-muted text-sm mb-1">{title}</p>
      <p className="text-3xl font-bold font-display text-primary">{value}</p>
      <p className="text-text-dim text-xs mt-2">{subtitle}</p>
    </div>
  );
}
