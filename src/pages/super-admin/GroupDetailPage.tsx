/**
 * FIDELYS — Super Admin Group Detail
 * Détail d'un groupe : paramètres, liste des boutiques, édition
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface ShopInGroup {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
}

interface GroupData {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  share_points: boolean;
  owner_user_id: string;
  created_at: string;
  shops: ShopInGroup[];
}

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [sharePoints, setSharePoints] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('shop_groups')
      .select('*, shops(id, name, slug, subscription_status)')
      .eq('id', groupId)
      .single();
    if (error || !data) { navigate('/super-admin/groupes'); return; }
    const g = data as unknown as GroupData;
    setGroup(g);
    setName(g.name);
    setSharePoints(g.share_points);
    setLoading(false);
  }, [groupId, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    setSaving(true);
    setFeedback(null);
    const { error } = await supabase
      .from('shop_groups')
      .update({ name, share_points: sharePoints })
      .eq('id', groupId);
    if (error) setFeedback({ type: 'error', msg: error.message });
    else { setFeedback({ type: 'success', msg: 'Groupe mis à jour' }); load(); }
    setSaving(false);
  };

  const font1: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
  const font2: React.CSSProperties = { fontFamily: "'Outfit', sans-serif" };
  const card: React.CSSProperties = { backgroundColor: '#1A3020', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px rgba(11,123,92,0.12)' };
  const iStyle: React.CSSProperties = { backgroundColor: '#0C1810', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F5F5', ...font2 };

  const statusCfg: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: 'rgba(34,160,90,0.15)', color: '#22A05A', label: 'Active' },
    trial: { bg: 'rgba(42,125,212,0.15)', color: '#2A7DD4', label: 'Essai' },
    suspended: { bg: 'rgba(212,146,42,0.15)', color: '#D4922A', label: 'Suspendue' },
    expired: { bg: 'rgba(214,60,60,0.15)', color: '#D63C3C', label: 'Expirée' },
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="h-8 w-48 rounded-lg animate-pulse" style={{ backgroundColor: '#1A3020' }} />
          <div className="h-48 rounded-2xl animate-pulse" style={{ backgroundColor: '#1A3020' }} />
          <div className="h-64 rounded-2xl animate-pulse" style={{ backgroundColor: '#1A3020' }} />
        </div>
      </div>
    );
  }
  if (!group) return null;

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/super-admin/groupes')} className="text-sm mb-6 hover:opacity-80"
          style={{ color: '#8EA598', ...font2 }}>← Retour aux groupes</button>

        <h1 className="text-2xl font-bold mb-6" style={{ ...font1, color: '#F5F5F5' }}>{group.name}</h1>

        {feedback && (
          <div className="p-3 rounded-xl text-sm mb-6" style={{
            backgroundColor: feedback.type === 'success' ? 'rgba(34,160,90,0.1)' : 'rgba(214,60,60,0.1)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(34,160,90,0.2)' : 'rgba(214,60,60,0.2)'}`,
            color: feedback.type === 'success' ? '#22A05A' : '#D63C3C', ...font2,
          }}>{feedback.msg}</div>
        )}

        {/* Edit form */}
        <form onSubmit={handleSave} className="rounded-2xl p-6 mb-6 space-y-5" style={card}>
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#5F7968', ...font2 }}>Paramètres</h3>
          <div>
            <label className="block text-sm mb-2" style={{ color: '#8EA598', ...font2 }}>Nom du groupe</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={iStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#13A87D'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }} />
          </div>
          <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <input type="checkbox" checked={sharePoints} onChange={(e) => setSharePoints(e.target.checked)}
              className="w-5 h-5" style={{ accentColor: '#13A87D' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#F5F5F5', ...font2 }}>Partage de points</p>
              <p className="text-xs" style={{ color: '#8EA598', ...font2 }}>Cumul cross-boutiques</p>
            </div>
          </label>
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#D4922A,#EDB84A)', color: '#0C1810', ...font2 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>

        {/* Boutiques list */}
        <div className="rounded-2xl overflow-hidden" style={card}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="font-bold" style={{ ...font1, color: '#F5F5F5' }}>
              Boutiques ({group.shops.length})
            </h3>
          </div>
          {group.shops.length === 0 ? (
            <div className="p-8 text-center" style={{ color: '#8EA598', ...font2 }}>
              Aucune boutique dans ce groupe
            </div>
          ) : (
            <div>
              {group.shops.map((shop) => {
                const sc = statusCfg[shop.subscription_status] ?? statusCfg.active;
                return (
                  <div key={shop.id} className="px-6 py-4 flex items-center justify-between transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#2B4D36'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                    <div>
                      <p className="font-medium" style={{ color: '#F5F5F5', ...font2 }}>{shop.name}</p>
                      <p className="text-xs" style={{ color: '#8EA598', ...font2 }}>/{shop.slug}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: sc.bg, color: sc.color, ...font2 }}>{sc.label}</span>
                      <Link to={`/super-admin/boutiques/${shop.id}`} className="text-sm font-medium hover:opacity-80"
                        style={{ color: '#13A87D', ...font2 }}>Voir →</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
