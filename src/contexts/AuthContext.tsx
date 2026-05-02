/**
 * FIDELYS — AuthContext
 * Contexte React global d'authentification
 * Wrap useAuth dans un provider accessible partout via useAuthContext()
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

interface AuthContextValue {
  /** Utilisateur Supabase connecté (null si déconnecté) */
  user: User | null;
  /** Session Supabase active (null si pas de session) */
  session: Session | null;
  /** true pendant la vérification initiale de session */
  loading: boolean;
  /** Connexion par email/password */
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  /** Déconnexion */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================
// Provider
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// Hook consommateur
// ============================================

/**
 * Hook pour accéder au contexte d'authentification.
 * Doit être utilisé à l'intérieur d'un <AuthProvider>.
 *
 * @example
 * const { user, signIn, signOut, loading } = useAuthContext();
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      'useAuthContext() doit être utilisé à l\'intérieur d\'un <AuthProvider>'
    );
  }
  return context;
}

export default AuthContext;
