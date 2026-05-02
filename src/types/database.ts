/**
 * FIDELYS — Database Types
 * Types TypeScript miroir exact du schéma PostgreSQL (schema.sql)
 * Aucun type 'any' — strictement typé
 */

// ============================================
// Enums (CHECK constraints du schema.sql)
// ============================================

export type ShopAdminRole = 'owner' | 'manager' | 'vendor';

export type TransactionType = 'purchase' | 'reward_claim' | 'bonus' | 'adjustment';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'suspended' | 'cancelled';

// ============================================
// Row Types (SELECT result from each table)
// ============================================

/** shop_groups — Groupes de boutiques (chaînes/franchises) */
export interface ShopGroup {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  owner_user_id: string;
  share_points: boolean;
  created_at: string;
}

/** shops — Boutiques individuelles */
export interface Shop {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  welcome_message: string | null;
  currency_per_point: number;
  points_validity_days: number | null;
  address: string | null;
  phone: string | null;
  group_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_started_at: string | null;
  created_at: string;
}

/** shop_admins — Liaison utilisateurs ↔ boutiques */
export interface ShopAdmin {
  id: string;
  shop_id: string;
  user_id: string;
  role: ShopAdminRole;
  created_at: string;
}

/** customer_profiles — Profil unifié cross-boutiques (par téléphone) */
export interface CustomerProfile {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  birthday: string | null;
  created_at: string;
}

/** customers — Clients par boutique */
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

/** reward_tiers — Paliers de récompense */
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

/** points_transactions — Historique des transactions de points */
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

/** notifications — Historique des notifications */
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
  created_at: string;
}

/** campaigns — Campagnes promotionnelles */
export interface Campaign {
  id: string;
  shop_id: string;
  name: string;
  title: string;
  message: string;
  target_segment: string;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  status: CampaignStatus;
  created_by: string;
  created_at: string;
}

/** super_admins — Accès total pour les super-admins */
export interface SuperAdmin {
  user_id: string;
}

// ============================================
// Database schema type (Supabase client generic)
// ============================================

export interface Database {
  public: {
    Tables: {
      shop_groups: {
        Row: ShopGroup;
        Insert: {
          name: string;
          owner_user_id: string;
          id?: string;
          logo_url?: string | null;
          primary_color?: string | null;
          share_points?: boolean;
          created_at?: string;
        };
        Update: Partial<ShopGroup>;
        Relationships: [];
      };
      shops: {
        Row: Shop;
        Insert: {
          slug: string;
          name: string;
          id?: string;
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
          created_at?: string;
        };
        Update: Partial<Shop>;
        Relationships: [];
      };
      shop_admins: {
        Row: ShopAdmin;
        Insert: {
          shop_id: string;
          user_id: string;
          id?: string;
          role?: ShopAdminRole;
          created_at?: string;
        };
        Update: Partial<ShopAdmin>;
        Relationships: [];
      };
      customer_profiles: {
        Row: CustomerProfile;
        Insert: {
          phone: string;
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          birthday?: string | null;
          created_at?: string;
        };
        Update: Partial<CustomerProfile>;
        Relationships: [];
      };
      customers: {
        Row: Customer;
        Insert: {
          shop_id: string;
          phone: string;
          id?: string;
          profile_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          total_points?: number;
          lifetime_points?: number;
          push_subscription?: Record<string, unknown> | null;
          current_tier_id?: string | null;
          created_at?: string;
          last_visit_at?: string | null;
        };
        Update: Partial<Customer>;
        Relationships: [];
      };
      reward_tiers: {
        Row: RewardTier;
        Insert: {
          shop_id: string;
          name: string;
          points_required: number;
          reward_description: string;
          id?: string;
          reward_value?: string | null;
          active?: boolean;
          sort_order?: number;
        };
        Update: Partial<RewardTier>;
        Relationships: [];
      };
      points_transactions: {
        Row: PointsTransaction;
        Insert: {
          shop_id: string;
          customer_id: string;
          type: TransactionType;
          points: number;
          created_by: string;
          id?: string;
          purchase_amount?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<PointsTransaction>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: {
          shop_id: string;
          type: string;
          title: string;
          message: string;
          id?: string;
          customer_id?: string | null;
          status?: NotificationStatus;
          scheduled_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Notification>;
        Relationships: [];
      };
      campaigns: {
        Row: Campaign;
        Insert: {
          shop_id: string;
          name: string;
          title: string;
          message: string;
          target_segment: string;
          created_by: string;
          id?: string;
          scheduled_at?: string | null;
          sent_at?: string | null;
          sent_count?: number;
          status?: CampaignStatus;
          created_at?: string;
        };
        Update: Partial<Campaign>;
        Relationships: [];
      };
      super_admins: {
        Row: SuperAdmin;
        Insert: { user_id: string };
        Update: Partial<SuperAdmin>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
