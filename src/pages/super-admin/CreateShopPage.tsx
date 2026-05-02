/**
 * FIDELYS — Super Admin Create Shop
 * Formulaire complet. Validation slug unique en temps réel.
 * Soumission via Edge Function onboard-shop. Redirect après création.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  slug: string;
  owner_email: string;
  owner_phone: string;
  address: string;
  group_id: string;
}

interface GroupOption {
  id: string;
  name: string;
}

// ── Composant principal ──────────────────────────────────────────────────────

export default function CreateShopPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    owner_email: '',
    owner_phone: '',
    address: '',
    group_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Charger les groupes disponibles
  useEffect(() => {
    const loadGroups = async () => {
      const { data } = await supabase.from('shop_groups').select('id, name').order('name');
      if (data) setGroups(data);
    };
    loadGroups();
  }, []);

  // Vérification slug en temps réel avec debounce
  useEffect(() => {
    if (formData.slug.length < 3) {
      setSlugStatus('idle');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('shops')
        .select('id')
        .eq('slug', formData.slug)
        .single();
      setSlugStatus(data ? 'taken' : 'available');
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.slug]);

  // Auto-generate slug from name
  const handleNameChange = useCallback((name: string) => {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 63);
    setFormData((prev) => ({ ...prev, name, slug }));
  }, []);

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('onboard-shop', {
        body: {
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          owner_email: formData.owner_email.trim(),
          owner_phone: formData.owner_phone.trim(),
          address: formData.address.trim(),
          group_id: formData.group_id || undefined,
        },
      });

      if (fnError) throw fnError;

      // Vérifier si la réponse contient une erreur métier
      if (data?.error) throw new Error(data.error);

      setSuccess(`Boutique "${formData.name}" créée avec succès ! Redirection…`);
      setTimeout(() => {
        navigate(`/super-admin/boutiques/${data?.shop_id ?? ''}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la boutique');
    } finally {
      setLoading(false);
    }
  };

  // ── Input style helper ─────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    backgroundColor: '#0C1810',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#F5F5F5',
    fontFamily: "'Outfit', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    color: '#8EA598',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.875rem',
    fontWeight: 500,
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate('/super-admin/boutiques')}
          className="text-sm mb-6 transition-opacity hover:opacity-80"
          style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}
        >
          ← Retour aux boutiques
        </button>

        {/* Header */}
        <h1
          className="text-3xl font-bold mb-2"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: '#13A87D',
            letterSpacing: '-0.5px',
          }}
        >
          Nouvelle boutique
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}
        >
          Créez une boutique avec ses paliers de récompense par défaut. Un compte sera
          automatiquement créé pour le propriétaire.
        </p>

        {/* Form card */}
        <div
          className="rounded-2xl p-6 lg:p-8"
          style={{
            backgroundColor: '#1A3020',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 16px rgba(11,123,92,0.12)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nom */}
            <div>
              <label htmlFor="create-name" className="block mb-2" style={labelStyle}>
                Nom de la boutique <span style={{ color: '#D63C3C' }}>*</span>
              </label>
              <input
                id="create-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#13A87D'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                placeholder="Ex: Boutique du Quartier"
              />
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="create-slug" className="block mb-2" style={labelStyle}>
                Slug (identifiant URL) <span style={{ color: '#D63C3C' }}>*</span>
              </label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: '#5F7968', fontFamily: "'Outfit', sans-serif" }}
                >
                  fidelys.app/
                </span>
                <input
                  id="create-slug"
                  type="text"
                  value={formData.slug}
                  onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                  pattern="[a-z0-9-]{2,63}"
                  className="w-full pl-24 pr-28 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#13A87D'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  placeholder="boutique-du-quartier"
                />
                {/* Slug feedback */}
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium">
                  {slugStatus === 'checking' && (
                    <span style={{ color: '#8EA598' }}>Vérification…</span>
                  )}
                  {slugStatus === 'available' && (
                    <span style={{ color: '#22A05A' }}>✓ Disponible</span>
                  )}
                  {slugStatus === 'taken' && (
                    <span style={{ color: '#D63C3C' }}>✗ Déjà utilisé</span>
                  )}
                </span>
              </div>
            </div>

            {/* Groupe (optionnel) */}
            <div>
              <label htmlFor="create-group" className="block mb-2" style={labelStyle}>
                Groupe (optionnel)
              </label>
              <select
                id="create-group"
                value={formData.group_id}
                onChange={(e) => updateField('group_id', e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors appearance-none"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#13A87D'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <option value="">Aucun — boutique indépendante</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="pt-2" />

            <p
              className="text-xs uppercase tracking-wider font-medium"
              style={{ color: '#5F7968', fontFamily: "'Outfit', sans-serif" }}
            >
              Informations propriétaire
            </p>

            {/* Email */}
            <div>
              <label htmlFor="create-email" className="block mb-2" style={labelStyle}>
                Email du propriétaire <span style={{ color: '#D63C3C' }}>*</span>
              </label>
              <input
                id="create-email"
                type="email"
                value={formData.owner_email}
                onChange={(e) => updateField('owner_email', e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#13A87D'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                placeholder="proprietaire@example.com"
              />
              <p className="mt-1 text-xs" style={{ color: '#5F7968', fontFamily: "'Outfit', sans-serif" }}>
                Un compte sera créé automatiquement. Mot de passe temporaire envoyé par email.
              </p>
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="create-phone" className="block mb-2" style={labelStyle}>
                Téléphone du propriétaire <span style={{ color: '#D63C3C' }}>*</span>
              </label>
              <input
                id="create-phone"
                type="tel"
                value={formData.owner_phone}
                onChange={(e) => updateField('owner_phone', e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#13A87D'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                placeholder="+229 XX XX XX XX"
              />
            </div>

            {/* Adresse */}
            <div>
              <label htmlFor="create-address" className="block mb-2" style={labelStyle}>
                Adresse <span style={{ color: '#D63C3C' }}>*</span>
              </label>
              <textarea
                id="create-address"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors resize-none"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#13A87D'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                placeholder="Adresse complète de la boutique…"
              />
            </div>

            {/* Messages */}
            {error && (
              <div
                className="p-3 rounded-xl text-sm"
                style={{
                  backgroundColor: 'rgba(214,60,60,0.1)',
                  border: '1px solid rgba(214,60,60,0.2)',
                  color: '#D63C3C',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="p-3 rounded-xl text-sm"
                style={{
                  backgroundColor: 'rgba(34,160,90,0.1)',
                  border: '1px solid rgba(34,160,90,0.2)',
                  color: '#22A05A',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {success}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/super-admin/boutiques')}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: '#8EA598',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || slugStatus === 'taken'}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #D4922A, #EDB84A)',
                  color: '#0C1810',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {loading ? 'Création en cours…' : 'Créer la boutique'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
