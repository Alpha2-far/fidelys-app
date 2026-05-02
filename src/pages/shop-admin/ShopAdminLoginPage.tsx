import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function ShopAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const { data: adminRow, error: adminError } = await supabase
        .from('shop_admins')
        .select('id, shop_id')
        .eq('user_id', data.user.id)
        .limit(1)
        .single();

      if (adminError || !adminRow) {
        await supabase.auth.signOut();
        throw new Error('Accès refusé : aucune boutique associée à ce compte');
      }

      navigate('/shop-admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Fidelys" className="h-12 mx-auto mb-4 object-contain" />
          <p className="text-text-muted text-sm mt-1">Espace Gérant</p>
        </div>

        <div className="glass rounded-2xl p-8 animate-slide-up">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-muted mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                style={{ fontSize: 16 }}
                placeholder="gerant@boutique.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-muted mb-2">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                style={{ fontSize: 16 }}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-gold text-bg-dark font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-text-muted text-xs mt-6">Réservé aux gérants de boutique</p>
      </div>
    </div>
  );
}
