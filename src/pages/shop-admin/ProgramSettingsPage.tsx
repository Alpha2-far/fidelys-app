import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShopAdminContext } from './ShopAdminLayout';
import type { RewardTier } from '../../types/database';

const TIER_ICONS = ['🥉', '🥈', '🥇', '💎', '👑'];

export default function ProgramSettingsPage() {
  const { shopId, shop } = useShopAdminContext();
  const [ratio, setRatio] = useState(500);
  const [validityDays, setValidityDays] = useState<number | ''>('');
  const [tiers, setTiers] = useState<RewardTier[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);
  const [editTier, setEditTier] = useState<RewardTier | null>(null);

  useEffect(() => {
    if (shop) {
      setRatio(shop.currency_per_point || 500);
      setValidityDays(shop.points_validity_days ?? '');
    }
    if (shopId) loadTiers();
  }, [shopId, shop]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTiers = async () => {
    if (!shopId) return;
    const { data } = await supabase
      .from('reward_tiers')
      .select('*')
      .eq('shop_id', shopId)
      .order('points_required');
    setTiers(data || []);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setSaving(true);
    setError(null);

    const { error: err } = await supabase
      .from('shops')
      .update({
        currency_per_point: ratio,
        points_validity_days: validityDays === '' ? null : Number(validityDays),
      })
      .eq('id', shopId);

    if (err) setError(err.message);
    else { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    setSaving(false);
  };

  const handleToggleTier = async (tier: RewardTier) => {
    await supabase.from('reward_tiers').update({ active: !tier.active }).eq('id', tier.id);
    loadTiers();
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('Supprimer ce palier définitivement ?')) return;
    await supabase.from('reward_tiers').delete().eq('id', tierId);
    loadTiers();
  };

  const examplePoints = Math.floor(5000 / ratio);

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-primary">Programme de fidélité</h1>
        <p className="text-text-muted text-sm mt-1">Définissez les règles et les récompenses de votre programme</p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* Règles de calcul */}
        <form onSubmit={handleSaveProgram} className="glass rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-text">Règles de calcul</h2>

          {/* Ratio FCFA / point */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-3">Ratio FCFA → points</label>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-text-muted text-sm">1 point pour</span>
              <input
                type="number"
                value={ratio}
                onChange={e => setRatio(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                required
                className="w-28 px-4 py-2 rounded-xl bg-bg-surface border border-border text-text text-center font-semibold focus:border-primary focus:outline-none"
              />
              <span className="text-text-muted text-sm">FCFA dépensés</span>
            </div>
            <p className="text-text-dim text-xs mt-2">
              Exemple : achat de 5 000 FCFA = <strong className="text-text">{examplePoints} point{examplePoints > 1 ? 's' : ''}</strong>
            </p>
          </div>

          {/* Durée de validité */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-3">Durée de validité des points</label>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="number"
                value={validityDays}
                onChange={e => setValidityDays(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                placeholder="illimitée"
                className="w-28 px-4 py-2 rounded-xl bg-bg-surface border border-border text-text text-center focus:border-primary focus:outline-none"
              />
              <span className="text-text-muted text-sm">jours (vide = illimitée)</span>
            </div>
            <p className="text-text-dim text-xs mt-2">
              {validityDays
                ? `Les points expirent ${validityDays} jours après le dernier achat.`
                : 'Les points n\'expirent jamais.'}
            </p>
          </div>

          {error && <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">✓ Règles sauvegardées !</div>}

          <button type="submit" disabled={saving} className="w-full py-3 rounded-xl gradient-gold text-bg-dark font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? 'Sauvegarde...' : 'Sauvegarder les règles'}
          </button>
        </form>

        {/* Paliers de fidélité */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text">Paliers de fidélité</h2>
              <p className="text-text-dim text-xs mt-0.5">
                {tiers.filter(t => t.active).length} actif{tiers.filter(t => t.active).length > 1 ? 's' : ''} sur {tiers.length}
              </p>
            </div>
            <button
              onClick={() => { setEditTier(null); setShowTierModal(true); }}
              className="px-4 py-2 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 transition-opacity text-sm"
            >
              + Ajouter
            </button>
          </div>

          {tiers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-3xl mb-3">🎖️</p>
              <p className="text-text-muted text-sm">Aucun palier défini.</p>
              <p className="text-text-dim text-xs mt-1">Ajoutez des paliers pour motiver vos clients à revenir.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {tiers.map((tier, i) => (
                <div key={tier.id} className="px-6 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${tier.active ? 'bg-primary/10' : 'bg-bg-elevated'}`}>
                    {TIER_ICONS[i] ?? '🏆'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold ${tier.active ? 'text-text' : 'text-text-muted'}`}>{tier.name}</p>
                      {!tier.active && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-bg-elevated text-text-dim">Inactif</span>
                      )}
                      <span className="text-text font-bold text-sm">{tier.points_required.toLocaleString()} pts</span>
                    </div>
                    <p className="text-text-muted text-sm truncate">{tier.reward_description}</p>
                    {tier.reward_value && (
                      <p className="text-primary text-xs mt-0.5">{tier.reward_value}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => { setEditTier(tier); setShowTierModal(true); }}
                      className="p-2 rounded-lg bg-bg-elevated hover:bg-bg-surface text-text-muted hover:text-text transition-colors"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleToggleTier(tier)}
                      className={`p-2 rounded-lg transition-colors ${tier.active ? 'bg-warning/10 text-warning hover:bg-warning/20' : 'bg-success/10 text-success hover:bg-success/20'}`}
                      title={tier.active ? 'Désactiver' : 'Activer'}
                    >
                      {tier.active ? '⏸' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleDeleteTier(tier.id)}
                      className="p-2 rounded-lg bg-error/10 hover:bg-error/20 text-error transition-colors"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showTierModal && (
        <TierModal
          shopId={shopId!}
          tier={editTier}
          nextOrder={tiers.length + 1}
          onClose={() => setShowTierModal(false)}
          onSaved={() => { setShowTierModal(false); loadTiers(); }}
        />
      )}
    </div>
  );
}

// ── Modal création / édition palier ──────────────────────────────────────────

interface TierModalProps {
  shopId: string;
  tier: RewardTier | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

function TierModal({ shopId, tier, nextOrder, onClose, onSaved }: TierModalProps) {
  const [form, setForm] = useState({
    name: tier?.name || '',
    points_required: tier?.points_required?.toString() || '',
    reward_description: tier?.reward_description || '',
    reward_value: tier?.reward_value || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const pts = parseInt(form.points_required);
    if (isNaN(pts) || pts < 1) {
      setError('Le nombre de points doit être supérieur à 0');
      setLoading(false);
      return;
    }

    const payload = {
      shop_id: shopId,
      name: form.name.trim(),
      points_required: pts,
      reward_description: form.reward_description.trim(),
      reward_value: form.reward_value.trim() || null,
      active: true,
      sort_order: tier?.sort_order ?? nextOrder,
    };

    const { error: err } = tier
      ? await supabase.from('reward_tiers').update(payload).eq('id', tier.id)
      : await supabase.from('reward_tiers').insert(payload);

    if (err) { setError(err.message); setLoading(false); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
      <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
        <h2 className="text-xl font-semibold font-display text-primary mb-5">
          {tier ? 'Modifier le palier' : 'Nouveau palier'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Nom du palier</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:outline-none"
              placeholder="Ex: Bronze, Argent, Or"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Points requis pour atteindre ce palier</label>
            <input
              type="number"
              value={form.points_required}
              onChange={e => setForm({ ...form, points_required: e.target.value })}
              required
              min="1"
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:outline-none"
              placeholder="Ex: 500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Description de la récompense</label>
            <input
              type="text"
              value={form.reward_description}
              onChange={e => setForm({ ...form, reward_description: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:outline-none"
              placeholder="Ex: -10% sur votre prochain achat"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Valeur (optionnel)</label>
            <input
              type="text"
              value={form.reward_value}
              onChange={e => setForm({ ...form, reward_value: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:outline-none"
              placeholder="Ex: -10%, cadeau surprise, livraison offerte"
            />
          </div>
          {error && <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">{error}</div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-bg-elevated text-text hover:bg-bg-surface transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? 'Sauvegarde...' : tier ? 'Modifier' : 'Créer le palier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
