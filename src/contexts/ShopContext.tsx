/**
 * FIDELYS — Shop Context
 * Contexte multi-tenant : identifie la boutique courante
 *
 * Deux modes de chargement :
 *  1. Shop-admin : charge la boutique depuis shop_admins → shops selon user_id
 *  2. Client PWA : charge la boutique depuis le slug URL
 *
 * Expose : shop, shopGroup, loading, error, refetchShop()
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from './AuthContext';
import type { Shop, ShopGroup, ShopAdmin } from '../types/database';

// ============================================
// Types
// ============================================

type ShopLoadMode = 'slug' | 'admin';

interface ShopContextValue {
  /** Boutique courante (null si pas encore chargée ou introuvable) */
  shop: Shop | null;
  /** Groupe de la boutique (null si boutique indépendante) */
  shopGroup: ShopGroup | null;
  /** Rôle de l'admin courant dans la boutique (null si mode client) */
  adminRole: ShopAdmin['role'] | null;
  /** true pendant le chargement initial */
  loading: boolean;
  /** Message d'erreur si le chargement échoue */
  error: string | null;
  /** Recharger les données de la boutique */
  refetchShop: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

// ============================================
// Provider
// ============================================

interface ShopProviderProps {
  children: ReactNode;
  /** Mode slug : charge la boutique depuis le slug URL (client PWA) */
  slug?: string;
  /** Mode admin : charge la boutique depuis shop_admins selon le user connecté */
  mode?: ShopLoadMode;
}

export function ShopProvider({ slug, mode = 'slug', children }: ShopProviderProps) {
  const { user } = useAuthContext();

  const [shop, setShop] = useState<Shop | null>(null);
  const [shopGroup, setShopGroup] = useState<ShopGroup | null>(null);
  const [adminRole, setAdminRole] = useState<ShopAdmin['role'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charge le groupe associé à une boutique
   */
  const fetchGroup = useCallback(async (groupId: string): Promise<ShopGroup | null> => {
    const { data } = await supabase
      .from('shop_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    return (data as ShopGroup | null) ?? null;
  }, []);

  /**
   * Mode SLUG : charge la boutique par slug (client PWA)
   */
  const fetchBySlug = useCallback(async () => {
    if (!slug) {
      setError('Aucun slug fourni');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .single();

      if (shopError || !shopData) {
        const errMsg = shopError?.code === 'PGRST116'
          ? 'Boutique introuvable'
          : 'Erreur de chargement';
        setError(errMsg);
        setShop(null);
        setShopGroup(null);
        return;
      }

      const typedShop = shopData as Shop;
      setShop(typedShop);
      setAdminRole(null);

      // Charger le groupe si la boutique en fait partie
      if (typedShop.group_id) {
        const group = await fetchGroup(typedShop.group_id);
        setShopGroup(group);
      } else {
        setShopGroup(null);
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [slug, fetchGroup]);

  /**
   * Mode ADMIN : charge la boutique depuis shop_admins → shops selon user_id
   */
  const fetchByAdmin = useCallback(async () => {
    if (!user) {
      setError('Non authentifié');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Trouver le premier shop_admin lié à cet utilisateur
      const { data: adminData, error: adminError } = await supabase
        .from('shop_admins')
        .select('shop_id, role')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (adminError || !adminData) {
        setError('Aucune boutique associée à ce compte');
        setShop(null);
        setShopGroup(null);
        setAdminRole(null);
        return;
      }

      const typedAdmin = adminData as Pick<ShopAdmin, 'shop_id' | 'role'>;
      setAdminRole(typedAdmin.role);

      // 2. Charger la boutique
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', typedAdmin.shop_id)
        .single();

      if (shopError || !shopData) {
        setError('Boutique introuvable');
        setShop(null);
        setShopGroup(null);
        return;
      }

      const typedShop = shopData as Shop;
      setShop(typedShop);

      // 3. Charger le groupe si la boutique en fait partie
      if (typedShop.group_id) {
        const group = await fetchGroup(typedShop.group_id);
        setShopGroup(group);
      } else {
        setShopGroup(null);
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [user, fetchGroup]);

  /**
   * Fetch selon le mode
   */
  const fetchShop = useCallback(async () => {
    if (mode === 'admin') {
      await fetchByAdmin();
    } else {
      await fetchBySlug();
    }
  }, [mode, fetchByAdmin, fetchBySlug]);

  // Auto-fetch au mount et quand les dépendances changent
  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  return (
    <ShopContext.Provider
      value={{
        shop,
        shopGroup,
        adminRole,
        loading,
        error,
        refetchShop: fetchShop,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

// ============================================
// Hook consommateur
// ============================================

/**
 * Hook pour accéder au contexte de la boutique courante.
 * Doit être utilisé à l'intérieur d'un <ShopProvider>.
 *
 * @example
 * const { shop, loading, error } = useShop();
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage message={error} />;
 * return <h1>{shop?.name}</h1>;
 */
export function useShop(): ShopContextValue {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop() doit être utilisé à l\'intérieur d\'un <ShopProvider>');
  }
  return context;
}

export default ShopContext;
