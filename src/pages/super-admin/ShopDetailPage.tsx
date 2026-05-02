/**
 * FIDELYS — Super Admin Shop Detail
 * Fetch boutique + admin + stats clients. Actions suspendre/réactiver
 * via Edge Function update-shop-status.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

interface ShopDetail {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string | null;
  logo_url: string | null;
  primary_color: string | null;
  group_id: string | null;
  subscription_status: string;
  subscription_started_at: string | null;
  currency_per_point: number;
  points_validity_days: number | null;
  created_at: string;
}

interface ShopAdmin {
  user_id: string;
  role: string;
  user_email?: string;
}

interface GroupOption {
  id: string;
  name: string;
}

// ── Composant principal ──────────────────────────────────────────────────────

export default function ShopDetailPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [admins, setAdmins] = useState<ShopAdmin[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const loadShop = useCallback(async () => {
    if (!shopId) return;
    try {
      setLoading(true);

      const [shopRes, adminsRes, groupsRes, clientsRes, txRes] = await Promise.all([
        supabase.from('shops').select('*').eq('id', shopId).single(),
        supabase.from('shop_admins').select('user_id, role').eq('shop_id', shopId),
        supabase.from('shop_groups').select('id, name').order('name'),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('points_transactions').select('*', { count: 'exact', head: true }).eq('shop_id', shopId),
      ]);

      if (shopRes.error || !shopRes.data) {
        navigate('/super-admin/boutiques');
        return;
      }

      setShop(shopRes.data as ShopDetail);
      setAdmins((adminsRes.data as ShopAdmin[]) ?? []);
      setGroups((groupsRes.data as GroupOption[]) ?? []);
      setClientsCount(clientsRes.count ?? 0);
      setTxCount(txRes.count ?? 0);
    } catch {
      navigate('/super-admin/boutiques');
    } finally {
      setLoading(false);
    }
  }, [shopId, navigate]);

  useEffect(() => {
    loadShop();
  }, [loadShop]);

  const handleToggleStatus = async (newStatus: 'active' | 'suspended') => {
    if (!shopId) return;
    setStatusLoading(true);
    setFeedback(null);

    try {
      const { data, error } = await supabase.functions.invoke('update-shop-status', {
        body: { shop_id: shopId, new_status: newStatus },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setFeedback({ type: 'success', msg: `Boutique ${newStatus === 'active' ? 'réactivée' : 'suspendue'} avec succès` });
      loadShop();
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 w-48 rounded-lg animate-pulse" style={{ backgroundColor: '#1A3020' }} />
          <div className="h-48 rounded-2xl animate-pulse" style={{ backgroundColor: '#1A3020' }} />
          <div className="h-64 rounded-2xl animate-pulse" style={{ backgroundColor: '#1A3020' }} />
        </div>
      </div>
    );
  }

  if (!shop) return null;

  // ── Status config ──────────────────────────────────────────────────────────

  const statusConfigs: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: 'rgba(34,160,90,0.15)', color: '#22A05A', label: 'Active' },
    trial: { bg: 'rgba(42,125,212,0.15)', color: '#2A7DD4', label: 'Essai' },
    suspended: { bg: 'rgba(212,146,42,0.15)', color: '#D4922A', label: 'Suspendue' },
    expired: { bg: 'rgba(214,60,60,0.15)', color: '#D63C3C', label: 'Expirée' },
    cancelled: { bg: 'rgba(214,60,60,0.15)', color: '#D63C3C', label: 'Annulée' },
  };
  const sc = statusConfigs[shop.subscription_status] ?? statusConfigs.active;

  const groupName = shop.group_id
    ? groups.find((g) => g.id === shop.group_id)?.name ?? 'Inconnu'
    : 'Indépendante';

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate('/super-admin/boutiques')}
          className="text-sm mb-6 transition-opacity hover:opacity-80"
          style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}
        >
          ← Retour aux boutiques
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: shop.primary_color || '#0B7B5C' }}
          >
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span
                className="text-xl font-bold"
                style={{ color: '#F5F5F5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {shop.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl font-bold truncate"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                color: '#F5F5F5',
                letterSpacing: '-0.5px',
              }}
            >
              {shop.name}
            </h1>
            <p className="text-sm" style={{ color: '#13A87D', fontFamily: "'Outfit', sans-serif" }}>
              {shop.slug}.fidelys.app
            </p>
          </div>
          <span
            className="px-4 py-1.5 rounded-full text-xs font-medium flex-shrink-0"
            style={{ backgroundColor: sc.bg, color: sc.color, fontFamily: "'Outfit', sans-serif" }}
          >
            {sc.label}
          </span>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className="p-3 rounded-xl text-sm mb-6"
            style={{
              backgroundColor: feedback.type === 'success' ? 'rgba(34,160,90,0.1)' : 'rgba(214,60,60,0.1)',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(34,160,90,0.2)' : 'rgba(214,60,60,0.2)'}`,
              color: feedback.type === 'success' ? '#22A05A' : '#D63C3C',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {feedback.msg}
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Clients', value: clientsCount.toString(), color: '#0B7B5C' },
            { label: 'Transactions', value: txCount.toLocaleString('fr-FR'), color: '#13A87D' },
            { label: '1 pt =', value: `${shop.currency_per_point} FCFA`, color: '#D4922A' },
            { label: 'Validité', value: shop.points_validity_days ? `${shop.points_validity_days}j` : '∞', color: '#0B7B5C' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4"
              style={{
                backgroundColor: '#1A3020',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <p className="text-xs mb-1" style={{ color: '#5F7968', fontFamily: "'Outfit', sans-serif" }}>
                {s.label}
              </p>
              <p
                className="text-xl font-bold"
                style={{ color: s.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Détails */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Infos boutique */}
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: '#1A3020',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 4px 16px rgba(11,123,92,0.12)',
            }}
          >
            <h3
              className="text-sm font-bold uppercase tracking-wider mb-4"
              style={{ color: '#5F7968', fontFamily: "'Outfit', sans-serif" }}
            >
              Informations
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Adresse', value: shop.address || '—' },
                { label: 'Téléphone', value: shop.phone || '—' },
                { label: 'Groupe', value: groupName },
                { label: 'Créée le', value: new Date(shop.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) },
                { label: 'Abonnement depuis', value: shop.subscription_started_at ? new Date(shop.subscription_started_at).toLocaleDateString('fr-FR') : '—' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-baseline gap-4">
                  <span className="text-sm flex-shrink-0" style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}>
                    {row.label}
                  </span>
                  <span
                    className="text-sm text-right truncate"
                    style={{ color: '#F5F5F5', fontFamily: "'Outfit', sans-serif" }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Admins */}
          <div
            className="rounded-2xl p-6"
            style={{
              backgroundColor: '#1A3020',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 4px 16px rgba(11,123,92,0.12)',
            }}
          >
            <h3
              className="text-sm font-bold uppercase tracking-wider mb-4"
              style={{ color: '#5F7968', fontFamily: "'Outfit', sans-serif" }}
            >
              Administrateurs ({admins.length})
            </h3>
            {admins.length === 0 ? (
              <p className="text-sm" style={{ color: '#8EA598', fontFamily: "'Outfit', sans-serif" }}>
                Aucun administrateur assigné
              </p>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.user_id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(11,123,92,0.15)' }}
                      >
                        <span className="text-xs" style={{ color: '#13A87D' }}>👤</span>
                      </div>
                      <div>
                        <p
                          className="text-sm font-mono truncate max-w-[180px]"
                          style={{ color: '#F5F5F5', fontSize: '0.75rem' }}
                        >
                          {admin.user_id.slice(0, 8)}…
                        </p>
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: admin.role === 'owner' ? 'rgba(212,146,42,0.15)' : 'rgba(11,123,92,0.15)',
                        color: admin.role === 'owner' ? '#D4922A' : '#13A87D',
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      {admin.role === 'owner' ? 'Propriétaire' : 'Admin'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: '#1A3020',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 16px rgba(11,123,92,0.12)',
          }}
        >
          <h3
            className="text-sm font-bold uppercase tracking-wider mb-4"
            style={{ color: '#5F7968', fontFamily: "'Outfit', sans-serif" }}
          >
            Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            {shop.subscription_status === 'active' ? (
              <button
                onClick={() => handleToggleStatus('suspended')}
                disabled={statusLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: 'rgba(212,146,42,0.15)',
                  color: '#D4922A',
                  border: '1px solid rgba(212,146,42,0.2)',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {statusLoading ? 'En cours…' : 'Suspendre la boutique'}
              </button>
            ) : (
              <button
                onClick={() => handleToggleStatus('active')}
                disabled={statusLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: 'rgba(34,160,90,0.15)',
                  color: '#22A05A',
                  border: '1px solid rgba(34,160,90,0.2)',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {statusLoading ? 'En cours…' : 'Réactiver la boutique'}
              </button>
            )}
            <a
              href={`https://${shop.slug}.fidelys.app`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: '#8EA598',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Ouvrir la boutique ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
