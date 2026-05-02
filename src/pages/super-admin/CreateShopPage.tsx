/**
 * FIDELYS — Super Admin Create Shop
 * Formulaire de création de boutique avec option de groupe
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { ShopGroup } from '../../types/database';

export default function CreateShopPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Pick<ShopGroup, 'id' | 'name'>[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    owner_email: '',
    owner_phone: '',
    address: '',
    group_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const { data } = await supabase.from('shop_groups').select('id, name');
    if (data) setGroups(data);
  };

  // Vérifier la disponibilité du slug
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.slug.length >= 3) {
        const { data } = await supabase
          .from('shops')
          .select('id')
          .eq('slug', formData.slug)
          .single();
        setSlugAvailable(!data);
      } else {
        setSlugAvailable(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Appel à l'Edge Function onboard-shop
      const { data, error: fnError } = await supabase.functions.invoke('onboard-shop', {
        body: {
          name: formData.name,
          slug: formData.slug,
          owner_email: formData.owner_email,
          owner_phone: formData.owner_phone,
          address: formData.address,
          group_id: formData.group_id || undefined,
        },
      });

      if (fnError) throw fnError;

      alert(
        `Boutique créée avec succès !\n\nIdentifiants propriétaire :\nEmail: ${formData.owner_email}\nMot de passe: ${data.temporary_password}\n\nURL: ${data.subdomain_url}`
      );
      navigate('/super-admin/boutiques');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création boutique');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/super-admin/boutiques')}
          className="text-text-muted hover:text-text mb-4"
        >
          ← Retour
        </button>

        <h1 className="text-3xl font-bold font-display text-primary mb-2">Nouvelle boutique</h1>
        <p className="text-text-muted mb-8">
          Créez une nouvelle boutique avec ses paliers de récompense par défaut
        </p>

        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Nom de la boutique
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary"
                placeholder="Ex: Boutique du Quartier"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Slug (identifiant URL)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim">
                  fidelys.app/
                </span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                  }
                  required
                  className="w-full pl-24 pr-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary"
                  placeholder="boutique-du-quartier"
                  pattern="[a-z0-9-]+"
                />
                {slugAvailable !== null && (
                  <span
                    className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${
                      slugAvailable ? 'text-success' : 'text-error'
                    }`}
                  >
                    {slugAvailable ? '✓ Disponible' : '✗ Déjà utilisé'}
                  </span>
                )}
              </div>
            </div>

            {/* Groupe (optionnel) */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Groupe (optionnel)
              </label>
              <select
                value={formData.group_id}
                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary"
              >
                <option value="">Aucun (boutique indépendante)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Email propriétaire */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Email du propriétaire
              </label>
              <input
                type="email"
                value={formData.owner_email}
                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary"
                placeholder="proprietaire@example.com"
              />
            </div>

            {/* Téléphone propriétaire */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">
                Téléphone du propriétaire
              </label>
              <input
                type="tel"
                value={formData.owner_phone}
                onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary"
                placeholder="+229 XX XX XX XX"
              />
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Adresse</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary resize-none"
                placeholder="Adresse complète de la boutique..."
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/super-admin/boutiques')}
                className="flex-1 px-4 py-3 rounded-xl bg-bg-elevated text-text hover:bg-bg-surface transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || slugAvailable === false}
                className="flex-1 px-4 py-3 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer la boutique'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
