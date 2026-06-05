import { useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { session, user, profile, isLoading, setLoading } = useAuthStore();

  const signInWithPhone = useCallback(async (phone: string): Promise<{ error: string | null }> => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: { channel: "sms" },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : "Unknown error" };
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const verifyOtp = useCallback(
    async (
      phone: string,
      token: string,
    ): Promise<{ error: string | null; session: Session | null }> => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token,
          type: "sms",
        });
        if (error) return { error: error.message, session: null };
        return { error: null, session: data.session };
      } catch (e: unknown) {
        return {
          error: e instanceof Error ? e.message : "Unknown error",
          session: null,
        };
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  const { logout } = useAuthStore();

  const signOut = useCallback(async (): Promise<void> => {
    await logout();
  }, [logout]);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return data;
  }, []);

  return {
    session,
    user,
    profile,
    isLoading,
    isAuthenticated: !!session,
    role: profile?.role ?? null,
    signInWithPhone,
    verifyOtp,
    signOut,
    fetchProfile,
  };
}
