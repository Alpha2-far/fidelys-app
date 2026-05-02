/**
 * FIDELYS — Super Admin Groups
 * Liste des groupes + modal création via create-shop-group
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface GroupRow {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  share_points: boolean;
  owner_user_id: string;
  created_at: string;
  shops: { id: string; name: string; slug: string }[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('shop_groups')
      .select('*, shops(id, name, slug)')
      .order('created_at', { ascending: false });
    setGroups((data as unknown as GroupRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const card = { backgroundColor: '#1A3020', border: '1px solid rgba(255,255,255,0.06)' };
  const font1: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
  const font2: React.CSSProperties = { fontFamily: "'Outfit', sans-serif" };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ ...font1, color: '#13A87D' }}>Groupes</h1>
          <p className="text-sm mt-1" style={{ ...font2, color: '#8EA598' }}>
            {groups.length} groupe{groups.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#D4922A,#EDB84A)', color: '#0C1810', ...font2 }}>
          + Nouveau groupe
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl h-48 animate-pulse" style={card} />
        )) : groups.length === 0 ? (
          <div className="col-span-full rounded-2xl p-12 text-center" style={card}>
            <p style={{ ...font2, color: '#8EA598' }}>Aucun groupe créé</p>
          </div>
        ) : groups.map((g) => (
          <div key={g.id} className="rounded-2xl p-6" style={{ ...card, boxShadow: '0 4px 16px rgba(11,123,92,0.12)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: g.primary_color || '#0B7B5C' }}>
                <span className="text-base font-bold" style={{ color: '#F5F5F5', ...font1 }}>
                  {g.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold truncate" style={{ color: '#F5F5F5', ...font1 }}>{g.name}</h3>
                <p className="text-sm" style={{ color: '#8EA598', ...font2 }}>
                  {g.shops?.length || 0} boutique{(g.shops?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="space-y-1 mb-4">
              {g.shops?.slice(0, 3).map((s) => (
                <p key={s.id} className="text-xs truncate" style={{ color: '#8EA598', ...font2 }}>• {s.name}</p>
              ))}
              {(g.shops?.length || 0) > 3 && (
                <p className="text-xs" style={{ color: '#5F7968', ...font2 }}>+ {(g.shops?.length || 0) - 3} autre(s)</p>
              )}
            </div>
            <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: g.share_points ? 'rgba(11,123,92,0.15)' : 'rgba(255,255,255,0.05)', color: g.share_points ? '#13A87D' : '#5F7968', ...font2 }}>
                {g.share_points ? 'Points partagés' : 'Indépendants'}
              </span>
              <Link to={`/super-admin/groupes/${g.id}`} className="text-sm font-medium hover:opacity-80"
                style={{ color: '#13A87D', ...font2 }}>Voir →</Link>
            </div>
          </div>
        ))}
      </div>

      {showModal && <CreateGroupModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [share, setShare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iStyle: React.CSSProperties = { backgroundColor: '#0C1810', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F5F5', fontFamily: "'Outfit', sans-serif" };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const { data, error: fn } = await supabase.functions.invoke('create-shop-group', {
        body: { name: name.trim(), owner_user_id: ownerId.trim(), share_points: share },
      });
      if (fn) throw fn; if (data?.error) throw new Error(data.error);
      onCreated();
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#1A3020', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-xl font-bold mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#13A87D' }}>Nouveau groupe</h2>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm mb-2" style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}>Nom *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={iStyle} placeholder="Groupe ABC…" />
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}>User ID propriétaire *</label>
            <input type="text" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none font-mono" style={iStyle} placeholder="UUID…" />
          </div>
          <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} style={{ accentColor: '#13A87D' }} className="w-5 h-5" />
            <div>
              <p className="text-sm font-medium" style={{ color: '#F5F5F5' }}>Partage de points</p>
              <p className="text-xs" style={{ color: '#8EA598' }}>Cumul cross-boutiques</p>
            </div>
          </label>
          {error && <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(214,60,60,0.1)', border: '1px solid rgba(214,60,60,0.2)', color: '#D63C3C' }}>{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#8EA598' }}>Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-3 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#D4922A,#EDB84A)', color: '#0C1810' }}>
              {loading ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
