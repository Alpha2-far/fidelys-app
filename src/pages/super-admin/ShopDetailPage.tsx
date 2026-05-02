/**
 * FIDELYS — Super Admin Shop Detail
 * Voir/modifier une boutique, suspendre/réactiver, changer de groupe
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Shop, ShopGroup } from '../../types/database';

export default function ShopDetailPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [groups, setGroups] = useState<Pick<ShopGroup, 'id' | 'name'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Shop>>({});

  useEffect(() => {
    if (shopId) loadShop();
    loadGroups();
  }, [shopId]);

  const loadShop = async () => {
    if (!shopId) return;
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();
    if (error || !data) {
      navigate('/super-admin/boutiques');
      return;
    }
    setShop(data);
    setFormData(data);
    setLoading(false);
  };

  const loadGroups = async () => {
    const { data } = await supabase.from('shop_groups').select('id, name');
    if (data) setGroups(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setSaving(true);
    const updateData: any = { ...formData };
    delete updateData.id;
    delete updateData.created_at;
    const { error } = await (supabase.from('shops') as any)
      .update(updateData)
      .eq('id', shopId);
    if (error) alert('Erreur: ' + error.message);
    else {
      alert('Boutique mise à jour');
      loadShop();
    }
    setSaving(false);
  };

  const handleToggleStatus = async () => {
    if (!shopId || !shop) return;
    const newStatus = shop.subscription_status === 'active' ? 'suspended' : 'active';
    if (!confirm(`Voulez-vous ${newStatus === 'active' ? 'réactiver' : 'suspendre'} cette boutique ?`))
      return;

    const { error } = await supabase.functions.invoke('update-shop-status', {
      body: { shop_id: shopId, new_status: newStatus },
    });

    if (error) alert('Erreur: ' + error.message);
    else loadShop();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="glass rounded-2xl p-6 skeleton h-96" />
      </div>
    );
  }

  if (!shop) return null;

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/super-admin/boutiques')} className="text-text-muted hover:text-text">
            ← Retour
          </button>
          <h1 className="text-3xl font-bold font-display text-primary flex-1">{shop.name}</h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              shop.subscription_status === 'active'
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning'
            }`}
          >
            {shop.subscription_status === 'active' ? 'Active' : 'Suspendue'}
          </span>
        </div>

        {/* Info card */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-bg-elevated flex items-center justify-center text-3xl">
                🏪
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-text">{shop.name}</h2>
              <p className="text-text-muted">
                <span className="text-primary">fidelys.app/{shop.slug}</span>
              </p>
              <p className="text-text-dim text-sm mt-1">{shop.address}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-text-dim text-sm">Téléphone</p>
              <p className="text-text">{shop.phone || '—'}</p>
            </div>
            <div>
              <p className="text-text-dim text-sm">Groupe</p>
              <p className="text-text">{shop.group_id ? groups.find((g) => g.id === shop.group_id)?.name : 'Indépendante'}</p>
            </div>
            <div>
              <p className="text-text-dim text-sm">1 point = </p>
              <p className="text-text">{shop.currency_per_point} FCFA</p>
            </div>
            <div>
              <p className="text-text-dim text-sm">Validité points</p>
              <p className="text-text">{shop.points_validity_days ? `${shop.points_validity_days} jours` : 'Illimitée'}</p>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-text mb-4">Modifier la boutique</h3>

          <div>
            <label className="block text-sm text-text-muted mb-2">Nom</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-2">Slug</label>
            <input
              type="text"
              value={formData.slug || ''}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-2">Groupe</label>
            <select
              value={formData.group_id || ''}
              onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary"
            >
              <option value="">Indépendante</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-2">Statut</label>
            <select
              value={formData.subscription_status || 'active'}
              onChange={(e) => setFormData({ ...formData, subscription_status: e.target.value as Shop['subscription_status'] })}
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspendue</option>
              <option value="expired">Expirée</option>
              <option value="trial">Essai</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleToggleStatus}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                shop.subscription_status === 'active'
                  ? 'bg-warning/10 text-warning hover:bg-warning/20'
                  : 'bg-success/10 text-success hover:bg-success/20'
              }`}
            >
              {shop.subscription_status === 'active' ? 'Suspendre' : 'Réactiver'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
