import { createClient } from "@supabase/supabase-js";
import { Config } from "@/constants/Config";
import { supabaseSecureStorage } from "@/lib/secureStoreAdapter";

if (__DEV__ && (!Config.supabaseUrl || !Config.supabaseAnonKey)) {
  console.error(
    "[Vasudha] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is not set.\n" +
    "Add them in Replit → Secrets (or .env for local dev). The app will not work without them."
  );
}

export const supabase = createClient(
  Config.supabaseUrl,
  Config.supabaseAnonKey,
  {
    auth: {
      storage: supabaseSecureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: "vendor" | "driver";
          business_name: string | null;
          address: string | null;
          vehicle_number: string | null;
          push_token: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      pickups: {
        Row: {
          id: string;
          vendor_id: string;
          driver_id: string | null;
          oil_type: string;
          quantity: number;
          unit: string;
          status: string;
          pickup_date: string;
          address: string;
          notes: string | null;
          grade: string | null;
          condition: string | null;
          latitude: number | null;
          longitude: number | null;
          qr_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pickups"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["pickups"]["Insert"]>;
      };
      invoices: {
        Row: {
          id: string;
          pickup_id: string;
          vendor_id: string;
          invoice_number: string;
          amount: number;
          status: string;
          due_date: string;
          issued_date: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invoices"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
      driver_locations: {
        Row: {
          id: string;
          driver_id: string;
          latitude: number;
          longitude: number;
          accuracy: number | null;
          heading: number | null;
          speed: number | null;
          recorded_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["driver_locations"]["Row"], "id" | "recorded_at">;
        Update: Partial<Database["public"]["Tables"]["driver_locations"]["Insert"]>;
      };
    };
  };
};
