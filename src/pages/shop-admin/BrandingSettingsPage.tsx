import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useShopAdminContext } from './ShopAdminLayout';

interface BrandForm {
  name: string;
  welcome_message: string;
  primary_color: string;
  secondary_color: string;
  address: string;
  phone: string;
}

export default function BrandingSettingsPage() {
  const { shopId, shop: initialShop } = useShopAdminContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<BrandForm>({
    name: '',
    welcome_message: '',
    primary_color: '#0B7B5C',
    secondary_color: '#D4922A',
    address: '',
    phone: '',
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialShop) {
      setForm({
        name: initialShop.name || '',
        welcome_message: initialShop.welcome_message || '',
        primary_color: initialShop.primary_color || '#0B7B5C',
        secondary_color: initialShop.secondary_color || '#D4922A',
        address: initialShop.address || '',
        phone: initialShop.phone || '',
      });
      setLogoPreview(initialShop.logo_url || null);
    }
  }, [initialShop]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo trop lourd (max 2 Mo)');
      return;
    }
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      let logoUrl = initialShop?.logo_url ?? null;

      if (logo) {
        const ext = logo.name.split('.').pop() || 'png';
        const path = `shops/${shopId}/logo.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('shop-assets')
          .upload(path, logo, { upsert: true });
        if (uploadErr) throw new Error('Erreur upload logo : ' + uploadErr.message);
        const { data: urlData } = supabase.storage.from('shop-assets').getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }

      const { error: updateErr } = await supabase
        .from('shops')
        .update({
          name: form.name.trim(),
          welcome_message: form.welcome_message.trim() || null,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          logo_url: logoUrl,
        })
        .eq('id', shopId);

      if (updateErr) throw updateErr;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-primary">Personnalisation</h1>
        <p className="text-text-muted text-sm mt-1">Configurez l'apparence de la carte de vos clients</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">

        {/* Logo */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Logo de la boutique</h2>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-2xl bg-bg-elevated border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors flex-shrink-0"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">🏪</span>
              )}
            </button>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-bg-elevated text-text hover:bg-bg-surface transition-colors text-sm"
              >
                Choisir un fichier
              </button>
              <p className="text-text-dim text-xs mt-2">PNG, JPG ou SVG · Max 2 Mo</p>
              {logo && <p className="text-primary text-xs mt-1">✓ {logo.name}</p>}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
        </div>

        {/* Infos boutique */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text mb-1">Informations</h2>
          <Field label="Nom de la boutique">
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:outline-none"
              placeholder="Ex: Boutique Kemi"
            />
          </Field>
          <Field label={`Message d'accueil (affiché sur la carte) — ${form.welcome_message.length}/80`}>
            <input
              type="text"
              value={form.welcome_message}
              onChange={e => setForm({ ...form, welcome_message: e.target.value.slice(0, 80) })}
              className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:outline-none"
              placeholder="Ex: Merci de votre fidélité !"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Adresse">
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:outline-none"
                placeholder="Ex: Akpakpa, Cotonou"
              />
            </Field>
            <Field label="Téléphone">
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:outline-none"
                placeholder="+229 97..."
              />
            </Field>
          </div>
        </div>

        {/* Couleurs */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-text mb-1">Couleurs de la marque</h2>
          <p className="text-text-muted text-sm mb-5">Personnalisent la carte client et les notifications</p>

          <div className="grid grid-cols-2 gap-6 mb-5">
            <ColorPicker
              label="Couleur principale"
              hint="Carte, boutons, accents"
              value={form.primary_color}
              onChange={v => setForm({ ...form, primary_color: v })}
            />
            <ColorPicker
              label="Couleur secondaire"
              hint="Récompenses, dégradé"
              value={form.secondary_color}
              onChange={v => setForm({ ...form, secondary_color: v })}
            />
          </div>

          {/* Aperçu carte */}
          <div className="mt-1 p-4 rounded-xl border border-border">
            <p className="text-text-dim text-xs mb-3">Aperçu de la carte client</p>
            <div
              style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color}CC)`, borderRadius: 14, padding: '1.25rem', color: '#fff', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: -16, right: -16, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <p style={{ fontSize: 10, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Carte de fidélité</p>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{form.name || 'Votre boutique'}</p>
              <p style={{ fontWeight: 800, fontSize: 28 }}>1 250 pts</p>
            </div>
          </div>
        </div>

        {error && <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm">{error}</div>}
        {success && <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm">✓ Modifications sauvegardées !</div>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl gradient-gold text-bg-dark font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
        </button>
      </form>
    </div>
  );
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-muted mb-2">{label}</label>
      {children}
    </div>
  );
}

function ColorPicker({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-muted mb-3">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl border-2 border-border relative overflow-hidden cursor-pointer hover:scale-105 transition-transform flex-shrink-0">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ transform: 'scale(2)' }}
          />
          <div className="w-full h-full rounded-xl" style={{ background: value }} />
        </div>
        <div>
          <p className="text-text font-mono text-sm">{value.toUpperCase()}</p>
          <p className="text-text-dim text-xs">{hint}</p>
        </div>
      </div>
    </div>
  );
}
