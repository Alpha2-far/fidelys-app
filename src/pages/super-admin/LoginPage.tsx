/**
 * FIDELYS — Super Admin Login
 * Authentification avec vérification du rôle super_admin
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Vérifier que l'utilisateur est super_admin
      const { data: adminCheck, error: adminError } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', data.user.id)
        .single();

      if (adminError || !adminCheck) {
        await supabase.auth.signOut();
        throw new Error('Accès refusé : compte super-admin requis');
      }

      navigate('/super-admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-gold flex items-center justify-center animate-pulse-glow">
            <span className="text-2xl font-bold text-bg-dark font-display">F</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-primary">Fidelys</h1>
          <p className="text-text-muted text-sm mt-1">Super Admin Panel</p>
        </div>

        {/* Formulaire */}
        <div className="glass rounded-2xl p-8 animate-slide-up">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-muted mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="admin@fidelys.app"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-muted mb-2">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border text-text focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
                {error}
              </div>
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

        <p className="text-center text-text-muted text-xs mt-6">
          Réservé aux administrateurs système
        </p>
      </div>
    </div>
  );
}
