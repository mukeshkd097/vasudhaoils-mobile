import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { router } from "expo-router";
import type { UserRole } from "@/constants/Config";
import { supabase } from "@/lib/supabase";
import { secureStorage, storage } from "@/lib/storage";

const ACCESS_TOKEN_KEY = "vasudha_access_token";

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  business_name: string | null;
  address: string | null;
  vehicle_number: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Role chosen at login; profile.role takes precedence once a profile loads. */
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (initialized: boolean) => void;

  /** Persist a verified session + selected role, storing the token in SecureStore. */
  login: (session: Session, role: UserRole) => Promise<void>;
  /** Sign out of Supabase and clear all persisted auth state. */
  logout: () => Promise<void>;
  /** Refresh the Supabase session and update the store. */
  refreshSession: () => Promise<Session | null>;
  /** Load the persisted role from storage (used on cold start). */
  hydrateRole: () => Promise<void>;

  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null, isAuthenticated: !!session });
    if (session?.access_token) {
      void secureStorage.set(ACCESS_TOKEN_KEY, session.access_token);
    } else {
      void secureStorage.remove(ACCESS_TOKEN_KEY);
    }
  },

  setProfile: (profile) =>
    set({ profile, role: profile?.role ?? get().role }),

  setRole: (role) => {
    set({ role });
    if (role) void storage.set(storage.keys.USER_ROLE, role);
    else void storage.remove(storage.keys.USER_ROLE);
  },

  setLoading: (isLoading) => set({ isLoading }),

  setInitialized: (isInitialized) => set({ isInitialized }),

  login: async (session, role) => {
    await secureStorage.set(ACCESS_TOKEN_KEY, session.access_token);
    await storage.set(storage.keys.USER_ROLE, role);
    set({
      session,
      user: session.user,
      role,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
    } finally {
      await secureStorage.remove(ACCESS_TOKEN_KEY);
      await storage.remove(storage.keys.USER_ROLE);
      set({
        session: null,
        user: null,
        profile: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
      });
      // Explicit navigation — do not rely solely on AuthGuard's reactive Redirect
      router.replace("/(auth)/login" as never);
    }
  },

  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      const { data: current } = await supabase.auth.getSession();
      const session = current.session ?? null;
      get().setSession(session);
      return session;
    }
    get().setSession(data.session);
    return data.session;
  },

  hydrateRole: async () => {
    const stored = await storage.get(storage.keys.USER_ROLE);
    if (stored === "vendor" || stored === "driver") {
      set({ role: stored });
    }
  },

  reset: () =>
    set({
      session: null,
      user: null,
      profile: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
