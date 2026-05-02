/**
 * FIDELYS — Shop Context
 * Contexte multi-tenant : identifie la boutique courante via le slug URL
 * Architecture : slug extrait de l'URL → fetch shop data → contexte global
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Shop, ShopGroup } from '../types/database';

// ============================================
// Types
// ============================================

interface ShopContextValue {
  /** Boutique courante (null si pas encore chargée ou introuvable) */
  shop: Shop | null;
  /** Groupe de la boutique (null si boutique indépendante) */
  shopGroup: ShopGroup | null;
  /** true pendant le chargement initial */
  loading: boolean;
  /** Message d'erreur si le chargement échoue */
  error: string | null;
  /** Recharger les données de la boutique */
  refetch: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

// ============================================
// Provider
// ============================================

interface ShopProviderProps {
  /** Slug de la boutique (extrait de l'URL, ex: "boutique-kemi") */
  slug: string;
  children: ReactNode;
}

export function ShopProvider({ slug, children }: ShopProviderProps) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopGroup, setShopGroup] = useState<ShopGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShop = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Charger la boutique par slug
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .single() as { data: Shop | null; error: { code?: string; message: string } | null };

      if (shopError) {
        if (shopError.code === 'PGRST116') {
          setError('Boutique introuvable');
        } else {
          setError('Erreur de chargement');
        }
        setShop(null);
        setShopGroup(null);
        return;
      }

      if (!shopData) {
        setError('Boutique introuvable');
        setShop(null);
        setShopGroup(null);
        return;
      }

      setShop(shopData);

      // 2. Si la boutique fait partie d'un groupe, charger le groupe
      if (shopData.group_id) {
        const { data: groupData } = await supabase
          .from('shop_groups')
          .select('*')
          .eq('id', shopData.group_id)
          .single() as { data: ShopGroup | null; error: unknown };

        setShopGroup(groupData || null);
      } else {
        setShopGroup(null);
      }
    } catch (err) {
      setError('Erreur réseau');
      console.error('[ShopContext] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchShop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <ShopContext.Provider value={{ shop, shopGroup, loading, error, refetch: fetchShop }}>
      {children}
    </ShopContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

/**
 * Hook pour accéder au contexte de la boutique courante.
 * Doit être utilisé à l'intérieur d'un <ShopProvider>.
 *
 * @example
 * const { shop, loading } = useShop();
 * if (loading) return <Spinner />;
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
