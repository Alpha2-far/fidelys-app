import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserCircle, CreditCard, Gift, Star, Wrench,
  WarningCircle, ArrowClockwise, Receipt,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../../components/ui';
import { useShopAdminContext } from './ShopAdminLayout';
import type { Customer, PointsTransaction, RewardTier } from '../../types/database';

type TxType = 'purchase' | 'reward_claim' | 'bonus' | string;

function TxIcon({ type }: { type: TxType }) {
  const props = { size: 18, weight: 'bold' as const };
  if (type === 'purchase')     return <CreditCard {...props} className="text-primary" />;
  if (type === 'reward_claim') return <Gift {...props} className="text-error" />;
  if (type === 'bonus')        return <Star {...props} className="text-secondary" />;
  return <Wrench {...props} className="text-text-muted" />;
}

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { shopId } = useShopAdminContext();
  const navigate = useNavigate();

  const [customer,     setCustomer]     = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [tiers,        setTiers]        = useState<RewardTier[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote,   setCreditNote]   = useState('');
  const [crediting,    setCrediting]    = useState(false);
  const [creditError,  setCreditError]  = useState<string | null>(null);

  useEffect(() => {
    if (customerId && shopId) loadData();
  }, [customerId, shopId]);

  const loadData = async () => {
    setError(null);
    setLoading(true);
    try {
      const [custRes, txRes, tiersRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', customerId!).eq('shop_id', shopId!).single(),
        supabase.from('points_transactions').select('*').eq('customer_id', customerId!).order('created_at', { ascending: false }).limit(20),
        supabase.from('reward_tiers').select('*').eq('shop_id', shopId!).eq('active', true).order('points_required'),
      ]);
      if (custRes.error || !custRes.data) throw new Error('Client introuvable');
      setCustomer(custRes.data);
      setTransactions(txRes.data || []);
      setTiers(tiersRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !shopId) return;
    setCreditError(null);
    setCrediting(true);
    try {
      const amount = parseInt(creditAmount);
      if (isNaN(amount) || amount <= 0) throw new Error('Montant invalide');
      const { error } = await supabase.functions.invoke('credit-points', {
        body: { shop_id: shopId, customer_id: customerId, purchase_amount: amount, note: creditNote || undefined },
      });
      if (error) throw error;
      setCreditAmount('');
      setCreditNote('');
      loadData();
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setCrediting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="skeleton rounded-2xl h-8 w-24 mb-4" />
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="glass rounded-2xl skeleton h-40" />
          <div className="glass rounded-2xl skeleton h-52" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-error/10 flex items-center justify-center">
            <WarningCircle size={28} weight="bold" className="text-error" aria-hidden />
          </div>
          <p className="font-semibold text-text mb-2">Impossible de charger le client</p>
          <p className="text-text-muted text-sm mb-6">{error}</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowClockwise size={16} weight="bold" aria-hidden />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const currentTier = tiers.filter(t => customer.total_points >= t.points_required).pop();
  const nextTier    = tiers.find(t => customer.total_points < t.points_required);

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <button
        onClick={() => navigate('/shop-admin/clients')}
        aria-label="Retour à la liste des clients"
        className="inline-flex items-center gap-2 text-text-muted hover:text-text mb-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1"
      >
        <ArrowLeft size={16} aria-hidden />
        <span className="text-sm">Retour</span>
      </button>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Client header */}
        <div className="glass rounded-2xl p-6 flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0"
            aria-hidden
          >
            {customer.first_name
              ? customer.first_name[0].toUpperCase()
              : <UserCircle size={28} weight="bold" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold font-display text-text truncate">
              {customer.first_name ? `${customer.first_name} ${customer.last_name || ''}`.trim() : customer.phone}
            </h1>
            <p className="text-text-muted text-sm">{customer.phone}</p>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <div>
                <p className="text-text-dim text-xs">Points actuels</p>
                <p className="text-2xl font-bold text-primary">{customer.total_points.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-text-dim text-xs">Points cumulés</p>
                <p className="text-lg font-semibold text-text">{customer.lifetime_points.toLocaleString()}</p>
              </div>
              {currentTier && (
                <div>
                  <p className="text-text-dim text-xs">Palier</p>
                  <p className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{currentTier.name}</p>
                </div>
              )}
            </div>
            {nextTier && (
              <div className="mt-3">
                <p className="text-text-dim text-xs mb-1">
                  Prochain palier : <strong className="text-text">{nextTier.name}</strong> — {(nextTier.points_required - customer.total_points).toLocaleString()} pts manquants
                </p>
                <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden w-48" role="progressbar" aria-valuenow={customer.total_points} aria-valuemax={nextTier.points_required}>
                  <div
                    className="h-full gradient-gold rounded-full"
                    style={{ width: `${Math.min(100, (customer.total_points / nextTier.points_required) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Credit form */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Créditer des points</h2>
          <form onSubmit={handleCredit} className="space-y-4">
            <div>
              <label htmlFor="credit-amount" className="block text-sm text-text-muted mb-2">Montant de l'achat (FCFA)</label>
              <input
                id="credit-amount"
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                required
                min="1"
                placeholder="Ex: 5000"
                style={{ fontSize: 16 }}
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label htmlFor="credit-note" className="block text-sm text-text-muted mb-2">Note (optionnel)</label>
              <input
                id="credit-note"
                type="text"
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                placeholder="Ex: Achat téléphone"
                style={{ fontSize: 16 }}
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            {creditError && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm" role="alert">{creditError}</div>
            )}
            <button
              type="submit"
              disabled={crediting}
              className="w-full py-3 rounded-xl gradient-gold text-bg-dark font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: 48 }}
            >
              {crediting ? 'Crédit en cours...' : 'Créditer les points'}
            </button>
          </form>
        </div>

        {/* History */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text">Historique ({transactions.length})</h2>
          </div>
          {transactions.length === 0 ? (
            <EmptyState
              icon={<Receipt />}
              title="Aucune transaction"
              description="L'historique des points de ce client apparaîtra ici."
              compact
            />
          ) : (
            <div className="divide-y divide-border/50">
              {transactions.map((tx) => (
                <div key={tx.id} className="px-6 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center flex-shrink-0" aria-hidden>
                      <TxIcon type={tx.type} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-text text-sm font-medium">
                        {tx.type === 'purchase' ? 'Achat' : tx.type === 'reward_claim' ? 'Récompense' : 'Bonus'}
                        {tx.purchase_amount ? ` — ${tx.purchase_amount.toLocaleString()} FCFA` : ''}
                      </p>
                      {tx.note && <p className="text-text-dim text-xs truncate">{tx.note}</p>}
                      <p className="text-text-dim text-xs">{new Date(tx.created_at).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                  <p className={`font-bold text-sm flex-shrink-0 ${tx.type === 'reward_claim' ? 'text-error' : 'text-success'}`}>
                    {tx.type === 'reward_claim' ? '−' : '+'}{tx.points} pts
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
