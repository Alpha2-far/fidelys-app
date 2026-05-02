/**
 * FIDELYS — Super Admin Groups
 * Gestion des groupes de boutiques (chaînes / franchises)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { ShopGroup, Shop } from '../../types/database';

interface GroupWithShops extends ShopGroup {
  shops?: Pick<Shop, 'id' | 'name' | 'slug'>[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupWithShops[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_groups')
        .select('*, shops(id, name, slug)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (err) {
      console.error('Erreur chargement groupes:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold font-display text-primary">Groupes de boutiques</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 transition-opacity"
        >
          + Nouveau groupe
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass rounded-2xl p-6 skeleton h-48" />
          ))
        ) : groups.length === 0 ? (
          <div className="col-span-full glass rounded-2xl p-8 text-center text-text-muted">
            Aucun groupe créé
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="glass rounded-2xl p-6 animate-slide-up hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-4 mb-4">
                {group.logo_url ? (
                  <img
                    src={group.logo_url}
                    alt={group.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center text-2xl">
                    🏢
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold font-display text-text truncate">{group.name}</h3>
                  <p className="text-text-dim text-sm">
                    {group.shops?.length || 0} boutique{group.shops?.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {group.shops?.slice(0, 3).map((shop) => (
                  <div key={shop.id} className="text-sm text-text-muted truncate">
                    • {shop.name}
                  </div>
                ))}
                {(group.shops?.length || 0) > 3 && (
                  <div className="text-sm text-text-dim">
                    + {(group.shops?.length || 0) - 3} autre(s)
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    group.share_points
                      ? 'bg-primary/10 text-primary'
                      : 'bg-bg-elevated text-text-dim'
                  }`}
                >
                  {group.share_points ? 'Points partagés' : 'Points indépendants'}
                </span>
                <Link
                  to={`/super-admin/groupes/${group.id}`}
                  className="text-primary hover:text-primary-light text-sm font-medium"
                >
                  Voir →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadGroups();
          }}
        />
      )}
    </div>
  );
}

function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [sharePoints, setSharePoints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Trouver l'user ID par email
      const { data: users, error: userError } = await supabase.auth.admin.listUsers();
      if (userError) throw userError;

      const owner = users.users.find((u) => u.email === ownerEmail);
      if (!owner) throw new Error('Utilisateur non trouvé');

      const { error: insertError } = await (supabase.from('shop_groups') as any)
        .insert({
          name,
          owner_user_id: owner.id,
          share_points: sharePoints,
        });

      if (insertError) throw insertError;
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création groupe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
        <h2 className="text-xl font-semibold font-display text-primary mb-4">
          Nouveau groupe de boutiques
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Nom du groupe</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary"
              placeholder="Ex: Groupe ABC, Franchise XYZ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Email du propriétaire
            </label>
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary"
              placeholder="proprietaire@example.com"
            />
          </div>

          <label className="flex items-center gap-3 p-4 rounded-xl bg-bg-surface border border-border cursor-pointer">
            <input
              type="checkbox"
              checked={sharePoints}
              onChange={(e) => setSharePoints(e.target.checked)}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <p className="text-text font-medium">Partage de points</p>
              <p className="text-text-dim text-sm">
                Les clients cumulent des points dans toutes les boutiques du groupe
              </p>
            </div>
          </label>

          {error && <div className="text-error text-sm">{error}</div>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-bg-elevated text-text hover:bg-bg-surface transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
