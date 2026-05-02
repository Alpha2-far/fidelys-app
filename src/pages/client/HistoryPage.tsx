import { useState, useEffect } from 'react';
import { CreditCard, Star, Gift, Wrench } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { useClientContext, C, S, F } from './ClientLayout';
import type { PointsTransaction, TransactionType } from '../../types/database';

// ── Config par type de transaction ───────────────────────────────────────────

interface TxConfig {
  label: string;
  color: string;
  debit: boolean;
}

const TX_CONFIG: Record<TransactionType, TxConfig> = {
  purchase:     { label: 'Achat',       color: C.primary,   debit: false },
  bonus:        { label: 'Bonus',       color: '#D4922A',   debit: false },
  reward_claim: { label: 'Récompense',  color: C.error,     debit: true  },
  adjustment:   { label: 'Ajustement',  color: C.textMid,   debit: false },
};

function TxIcon({ type, color }: { type: TransactionType; color: string }) {
  const props = { size: 20, weight: 'bold' as const, color };
  switch (type) {
    case 'purchase':     return <CreditCard {...props} />;
    case 'bonus':        return <Star {...props} />;
    case 'reward_claim': return <Gift {...props} />;
    default:             return <Wrench {...props} />;
  }
}

// ── Formatage date relative ───────────────────────────────────────────────────

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1)   return "À l'instant";
  if (minutes < 60)  return `Il y a ${minutes} min`;
  if (hours < 24)    return `Il y a ${hours}h`;
  if (days === 1)    return 'Hier';
  if (days < 7)      return `Il y a ${days} jours`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Page historique ───────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { customer, primaryColor } = useClientContext();
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions(data || []);
      setLoading(false);
    })();
  }, [customer.id]);

  return (
    <div style={{ padding: '1.5rem 1.25rem' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <h1 style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 22, color: C.textDark, marginBottom: '1.25rem', letterSpacing: '-0.5px', animation: 'fadeUp 0.3s ease-out both' }}>
        Historique des points
      </h1>

      {/* Solde */}
      <div style={{
        background: C.primaryPale,
        borderRadius: 14,
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: `1px solid ${primaryColor}20`,
        animation: 'fadeUp 0.35s 0.05s ease-out both',
      }}>
        <p style={{ fontSize: 14, color: primaryColor, fontWeight: 500 }}>Solde actuel</p>
        <p style={{ fontFamily: F.heading, fontSize: 22, fontWeight: 800, color: primaryColor }}>
          {customer.total_points.toLocaleString()} pts
        </p>
      </div>

      {/* Liste */}
      <div style={{ background: C.card, borderRadius: 16, boxShadow: S.sm, border: `1px solid ${C.border}`, overflow: 'hidden', animation: 'fadeUp 0.4s 0.08s ease-out both' }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.primary, borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: 44, marginBottom: 10 }}>📭</p>
            <p style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 16, color: C.textDark, marginBottom: 4 }}>Aucune transaction</p>
            <p style={{ fontSize: 13, color: C.textLight }}>Vos achats apparaîtront ici.</p>
          </div>
        ) : (
          transactions.map((tx, i) => {
            const cfg = TX_CONFIG[tx.type] ?? TX_CONFIG.adjustment;
            return (
              <div key={tx.id} style={{
                padding: '1rem 1.25rem',
                borderBottom: i < transactions.length - 1 ? `1px solid ${C.subtle}` : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
              }}>
                {/* Icône Phosphor */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: cfg.debit ? C.accentPale : C.primaryPale,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <TxIcon type={tx.type} color={cfg.color} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: C.textDark, marginBottom: 2 }}>
                    {cfg.label}
                    {tx.purchase_amount ? ` — ${tx.purchase_amount.toLocaleString()} FCFA` : ''}
                  </p>
                  {tx.note && (
                    <p style={{ fontSize: 12, color: C.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                      {tx.note}
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: C.textLight }}>
                    {relativeDate(tx.created_at)}
                  </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 16, color: cfg.debit ? C.error : primaryColor }}>
                    {cfg.debit ? '−' : '+'}{Math.abs(tx.points).toLocaleString()}
                  </p>
                  <p style={{ fontSize: 11, color: C.textLight }}>pts</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!loading && transactions.length > 0 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: C.textLight, marginTop: '1rem' }}>
          {transactions.length} transaction{transactions.length > 1 ? 's' : ''} affichée{transactions.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
