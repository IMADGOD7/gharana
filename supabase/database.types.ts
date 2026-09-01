// ============================================================
// Database Types — generated from schema (T0.2)
// Run: npx supabase gen types typescript --project-id <id> > ...
// This is a manual representation for development.
// ============================================================

export type ProfileRole = 'partner' | 'admin';
export type SubmissionStatus = 'draft' | 'submitted' | 'changes_requested' | 'approved' | 'rejected';
export type ReviewAction = 'approve' | 'reject' | 'request_changes';
export type MediaType = 'image' | 'video';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: ProfileRole;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerProfile {
  id: string;
  user_id: string;
  brand_name: string;
  bio: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  partner_id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  established_year: number | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  partner_id: string;
  title: string;
  description: string;
  category: string | null;
  tags: string[];
  price_min: number | null;
  price_max: number | null;
  currency: string;
  status: SubmissionStatus;
  admin_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductStory {
  id: string;
  product_id: string;
  inspiration: string;
  crafting_process: string;
  materials_used: string;
  time_to_create: string | null;
  cultural_significance: string;
  created_at: string;
  updated_at: string;
}

export interface Maker {
  id: string;
  product_id: string;
  name: string;
  bio: string;
  craft_technique: string;
  years_of_experience: number | null;
  location: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductMedia {
  id: string;
  product_id: string;
  media_type: MediaType;
  storage_path: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface SubmissionHistory {
  id: string;
  product_id: string;
  action: ReviewAction;
  from_status: SubmissionStatus;
  to_status: SubmissionStatus;
  notes: string | null;
  reviewed_by: string | null;
  created_at: string;
}

// Database schema reference
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'email'>>;
      };
      partner_profiles: {
        Row: PartnerProfile;
        Insert: Omit<PartnerProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PartnerProfile, 'id'>>;
      };
      shops: {
        Row: Shop;
        Insert: Omit<Shop, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Shop, 'id'>>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Product, 'id'>>;
      };
      product_stories: {
        Row: ProductStory;
        Insert: Omit<ProductStory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProductStory, 'id'>>;
      };
      makers: {
        Row: Maker;
        Insert: Omit<Maker, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Maker, 'id'>>;
      };
      product_media: {
        Row: ProductMedia;
        Insert: Omit<ProductMedia, 'id' | 'created_at'>;
        Update: Partial<Omit<ProductMedia, 'id'>>;
      };
      submission_history: {
        Row: SubmissionHistory;
        Insert: Omit<SubmissionHistory, 'id' | 'created_at'>;
        Update: Partial<Omit<SubmissionHistory, 'id'>>;
      };
    };
  };
}
