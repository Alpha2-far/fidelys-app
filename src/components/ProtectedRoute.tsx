/**
 * FIDELYS — ProtectedRoute
 * Composant de protection des routes admin
 * - Vérifie session active via useAuthContext
 * - Vérifie le rôle dans super_admins ou shop_admins
 * - Redirige vers login si pas autorisé
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ============================================
// Types
// ============================================

type RequiredRole = 'super_admin' | 'shop_admin';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: RequiredRole;
}

type RouteStatus = 'loading' | 'authorized' | 'denied';

// ============================================
// Composant
// ============================================

/**
 * Route protégée avec vérification de rôle.
 *
 * @example
 * <ProtectedRoute requiredRole="super_admin">
 *   <SuperAdminLayout />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuthContext();
  const [status, setStatus] = useState<RouteStatus>('loading');

  useEffect(() => {
    // Attendre que l'auth soit prête
    if (authLoading) return;

    // Pas de user → accès refusé
    if (!user) {
      setStatus('denied');
      return;
    }

    // Vérifier le rôle dans la table appropriée
    const checkRole = async () => {
      try {
        if (requiredRole === 'super_admin') {
          const { data, error } = await supabase
            .from('super_admins')
            .select('user_id')
            .eq('user_id', user.id)
            .single();

          if (error || !data) {
            setStatus('denied');
            return;
          }
          setStatus('authorized');
        } else if (requiredRole === 'shop_admin') {
          const { data, error } = await supabase
            .from('shop_admins')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

          if (error || !data || data.length === 0) {
            setStatus('denied');
            return;
          }
          setStatus('authorized');
        }
      } catch {
        setStatus('denied');
      }
    };

    checkRole();
  }, [user, authLoading, requiredRole]);

  // Redirection selon le rôle demandé
  const loginPath = requiredRole === 'super_admin'
    ? '/super-admin/login'
    : '/shop-admin/login';

  // Loading spinner (brand-compliant: dark emerald)
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0C1810' }}>
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#0B7B5C', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
}

// ============================================
// Shortcuts (rétrocompatibilité avec l'ancien fichier)
// ============================================

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole="super_admin">{children}</ProtectedRoute>;
}

export function ShopAdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole="shop_admin">{children}</ProtectedRoute>;
}
