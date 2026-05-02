import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShopAdminContext } from './ShopAdminLayout';
import type { Campaign } from '../../types/database';

const SEGMENTS = [
  { value: 'all', label: 'Tous les clients' },
  { value: 'active', label: 'Clients actifs (30j)' },
  { value: 'dormant', label: 'Clients dormants (90j+)' },
  { value: 'top', label: 'Top clients (500+ pts)' },
];

export default function CampaignsPage() {
  const { shopId } = useShopAdminContext();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (shopId) loadCampaigns();
  }, [shopId]);

  const loadCampaigns = async () => {
    if (!shopId) return;
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  };

  const statusConfig: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Brouillon', cls: 'bg-bg-elevated text-text-muted' },
    scheduled: { label: 'Planifiée', cls: 'bg-info/10 text-info' },
    sending: { label: 'En cours', cls: 'bg-warning/10 text-warning' },
    sent: { label: 'Envoyée', cls: 'bg-success/10 text-success' },
    cancelled: { label: 'Annulée', cls: 'bg-error/10 text-error' },
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-display text-primary">Campagnes</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 transition-opacity"
        >
          + Nouvelle campagne
        </button>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-text-muted">Aucune campagne créée</div>
        ) : (
          <div className="divide-y divide-border/50">
            {campaigns.map((c) => {
              const sc = statusConfig[c.status] || statusConfig.draft;
              return (
                <div key={c.id} className="px-6 py-4 flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-text">{c.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.label}</span>
                    </div>
                    <p className="text-text-muted text-sm truncate">{c.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-dim">
                      <span>🎯 {SEGMENTS.find(s => s.value === c.target_segment)?.label || c.target_segment}</span>
                      {c.scheduled_at && <span>📅 {new Date(c.scheduled_at).toLocaleDateString('fr-FR')}</span>}
                      {c.sent_count > 0 && <span>📨 {c.sent_count} envois</span>}
                    </div>
                  </div>
                  <p className="text-text-dim text-xs whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <CreateCampaignModal
          shopId={shopId!}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadCampaigns(); }}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({ shopId, onClose, onCreated }: { shopId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', title: '', message: '', target_segment: 'all', scheduled_at: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('campaigns').insert({
      shop_id: shopId,
      name: form.name,
      title: form.title,
      message: form.message,
      target_segment: form.target_segment,
      scheduled_at: form.scheduled_at || null,
      status: form.scheduled_at ? 'scheduled' : 'draft',
      created_by: user!.id,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass rounded-2xl p-6 w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold font-display text-primary mb-4">Nouvelle campagne</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nom de la campagne">
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
              className="input" placeholder="Ex: Promotion Ramadan" />
          </Field>
          <Field label="Titre de la notification">
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
              className="input" placeholder="Ex: 🎉 Offre spéciale pour vous !" />
          </Field>
          <Field label="Message">
            <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} required
              rows={3} className="input resize-none"
              placeholder="Ex: Profitez de -20% sur tous nos produits ce weekend..." />
          </Field>
          <Field label="Segment cible">
            <select value={form.target_segment} onChange={e => setForm({...form, target_segment: e.target.value})}
              className="input">
              {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Planifier pour (optionnel)">
            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})}
              className="input" />
          </Field>

          {error && <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-bg-elevated text-text hover:bg-bg-surface transition-colors">Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl gradient-gold text-bg-dark font-medium hover:opacity-90 disabled:opacity-50">
              {loading ? 'Création...' : 'Créer la campagne'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-muted mb-2">{label}</label>
      {children}
    </div>
  );
}

