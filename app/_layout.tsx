import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack, useRootNavigationState, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { registerForPushNotifications } from "@/lib/notifications";
import { useNotificationDeepLink } from "@/hooks/useNotificationDeepLink";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { Config } from "@/constants/Config";

// Configure API client base URL and auth token getter once at module load.
// getSession() handles token refresh automatically (unlike reading Zustand directly).
setBaseUrl(Config.apiUrl || null);
setAuthTokenGetter(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
});

// Ensure module-level side effects in notifications.ts run (handler registration)
import "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard() {
  const segments = useSegments();
  const navState = useRootNavigationState();
  const {
    session,
    profile,
    role: selectedRole,
    setSession,
    setProfile,
    setInitialized,
    isInitialized,
    hydrateRole,
  } = useAuthStore();

  const effectiveRole = profile?.role ?? selectedRole;

  // ── Supabase auth listener ────────────────────────────────────────────────
  useEffect(() => {
    void hydrateRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", newSession.user.id)
          .single();
        setProfile(data ?? null);
      } else {
        setProfile(null);
      }
      setInitialized(true);
    });

    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s) setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setProfile, setInitialized, hydrateRole]);

  // ── Register push token once profile is loaded ────────────────────────────
  useEffect(() => {
    if (profile?.id) {
      void registerForPushNotifications(profile.id);
    }
  }, [profile?.id]);

  // ── Deep-link navigation from notification taps ───────────────────────────
  useNotificationDeepLink(effectiveRole ?? null);

  // ── Route guard ───────────────────────────────────────────────────────────
  if (!navState?.key || !isInitialized) return null;

  const inAuthGroup = segments[0] === "(auth)";
  const inVendorGroup = segments[0] === "(vendor)";
  const inDriverGroup = segments[0] === "(driver)";

  if (!session && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  if (session) {
    const role = effectiveRole;
    if (role === "vendor" && !inVendorGroup) {
      return <Redirect href="/(vendor)" />;
    }
    if (role === "driver" && !inDriverGroup) {
      return <Redirect href="/(driver)" />;
    }
    if (!role && !inVendorGroup && !inDriverGroup) {
      return <Redirect href="/(vendor)" />;
    }
  }

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
