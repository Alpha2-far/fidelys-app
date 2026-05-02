/**
 * FIDELYS — Database Types
 * Types TypeScript correspondant au schéma PostgreSQL Supabase
 * Généré manuellement pour Phase 1 — à remplacer par supabase gen types plus tard
 */

// ============================================
// Enums
// ============================================

export type ShopAdminRole = 'owner' | 'manager' | 'vendor';

export type TransactionType = 'purchase' | 'reward_claim' | 'bonus' | 'adjustment';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'suspended';

// ============================================
// Table Types
// ============================================

/** Groupe de boutiques (chaînes / franchises) */
export interface ShopGroup {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  owner_user_id: string;
  /** true = les points sont partagés entre boutiques du groupe */
  share_points: boolean;
  created_at: string;
}

/** Boutique individuelle */
export interface Shop {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  welcome_message: string | null;
  /** Montant en FCFA pour 1 point (défaut: 500) */
  currency_per_point: number;
  /** Durée de validité des points en jours (null = illimité) */
  points_validity_days: number | null;
  address: string | null;
  phone: string | null;
  /** Lien vers le groupe (null = boutique indépendante) */
  group_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_started_at: string | null;
  created_at: string;
}

/** Administrateur d'une boutique */
export interface ShopAdmin {
  id: string;
  shop_id: string;
  user_id: string;
  role: ShopAdminRole;
  created_at: string;
}

/** Profil client unifié (cross-boutiques, identifié par téléphone) */
export interface CustomerProfile {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  birthday: string | null;
  created_at: string;
}

/** Client d'une boutique spécifique */
export interface Customer {
  id: string;
  shop_id: string;
  profile_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  total_points: number;
  lifetime_points: number;
  push_subscription: Record<string, unknown> | null;
  current_tier_id: string | null;
  created_at: string;
  last_visit_at: string | null;
}

/** Palier de récompense */
export interface RewardTier {
  id: string;
  shop_id: string;
  name: string;
  points_required: number;
  reward_description: string;
  reward_value: string | null;
  active: boolean;
  sort_order: number;
}

/** Transaction de points */
export interface PointsTransaction {
  id: string;
  shop_id: string;
  customer_id: string;
  type: TransactionType;
  points: number;
  purchase_amount: number | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

/** Notification */
export interface Notification {
  id: string;
  shop_id: string;
  customer_id: string | null;
  type: string;
  title: string;
  message: string;
  status: NotificationStatus;
  scheduled_at: string | null;
  sent_at: string | null;
}

/** Campagne promotionnelle */
export interface Campaign {
  id: string;
  shop_id: string;
  name: string;
  title: string;
  message: string;
  target_segment: string;
  scheduled_at: string | null;
  sent_count: number;
  status: CampaignStatus;
  created_by: string;
  created_at: string;
}

/** Super admin (accès total) */
export interface SuperAdmin {
  user_id: string;
}

// ============================================
// Database schema type (Supabase-compatible)
// ============================================

export interface Database {
  public: {
    Tables: {
      shop_groups: {
        Row: ShopGroup;
        Insert: {
          name: string;
          logo_url?: string | null;
          primary_color?: string | null;
          owner_user_id: string;
          share_points?: boolean;
          id?: string;
          created_at?: string;
        };
        Update: Partial<ShopGroup>;
      };
      shops: {
        Row: Shop;
        Insert: {
          name: string;
          slug: string;
          logo_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          welcome_message?: string | null;
          currency_per_point?: number;
          points_validity_days?: number | null;
          address?: string | null;
          phone?: string | null;
          group_id?: string | null;
          subscription_status?: SubscriptionStatus;
          subscription_started_at?: string | null;
          id?: string;
          created_at?: string;
        };
        Update: Partial<Shop>;
      };
      shop_admins: {
        Row: ShopAdmin;
        Insert: {
          shop_id: string;
          user_id: string;
          role?: ShopAdminRole;
          id?: string;
          created_at?: string;
        };
        Update: Partial<ShopAdmin>;
      };
      customer_profiles: {
        Row: CustomerProfile;
        Insert: {
          phone: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          birthday?: string | null;
          id?: string;
          created_at?: string;
        };
        Update: Partial<CustomerProfile>;
      };
      customers: {
        Row: Customer;
        Insert: {
          shop_id: string;
          profile_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          phone: string;
          total_points?: number;
          lifetime_points?: number;
          push_subscription?: Record<string, unknown> | null;
          current_tier_id?: string | null;
          id?: string;
          created_at?: string;
          last_visit_at?: string | null;
        };
        Update: Partial<Customer>;
      };
      reward_tiers: {
        Row: RewardTier;
        Insert: {
          shop_id: string;
          name: string;
          points_required: number;
          reward_description?: string;
          reward_value?: string | null;
          active?: boolean;
          sort_order?: number;
          id?: string;
        };
        Update: Partial<RewardTier>;
      };
      points_transactions: {
        Row: PointsTransaction;
        Insert: {
          shop_id: string;
          customer_id: string;
          type: TransactionType;
          points: number;
          purchase_amount?: number | null;
          note?: string | null;
          created_by: string;
          id?: string;
          created_at?: string;
        };
        Update: Partial<PointsTransaction>;
      };
      notifications: {
        Row: Notification;
        Insert: {
          shop_id: string;
          customer_id?: string | null;
          type: string;
          title: string;
          message: string;
          status?: NotificationStatus;
          id?: string;
          scheduled_at?: string | null;
          sent_at?: string | null;
        };
        Update: Partial<Notification>;
      };
      campaigns: {
        Row: Campaign;
        Insert: {
          shop_id: string;
          name: string;
          title: string;
          message: string;
          target_segment: string;
          scheduled_at?: string | null;
          sent_count?: number;
          status?: CampaignStatus;
          created_by: string;
          id?: string;
          created_at?: string;
        };
        Update: Partial<Campaign>;
      };
      super_admins: {
        Row: SuperAdmin;
        Insert: { user_id: string };
        Update: Partial<SuperAdmin>;
      };
    };
  };
}
