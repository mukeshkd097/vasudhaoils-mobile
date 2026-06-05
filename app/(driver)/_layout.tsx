import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

const TAB_BG = Colors.background.dark;
const ACTIVE = Colors.gold.main;
const INACTIVE = "#4a6b4a";

function NativeDriverTabs() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>Route</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scanner">
        <Icon sf={{ default: "qrcode.viewfinder", selected: "qrcode.viewfinder" }} />
        <Label>Scan</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <Label>History</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicDriverTabs() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();

  const tabIcon = (name: string, sfName: string) =>
    ({ color, size }: { color: string; size: number }) =>
      isIOS ? (
        <SymbolView name={sfName as never} tintColor={color} size={size} />
      ) : (
        <Feather name={name as keyof typeof Feather.glyphMap} size={size - 2} color={color} />
      );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : TAB_BG,
          borderTopWidth: 1,
          borderTopColor: "#1a3a1a",
          elevation: 0,
          paddingBottom: insets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: TAB_BG }]} />
          ) : null,
        tabBarLabelStyle: { fontFamily: "SpaceGrotesk_500Medium", fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Route", tabBarIcon: tabIcon("map", "map") }} />
      <Tabs.Screen
        name="pickup"
        options={{ href: null, title: "Pickup", tabBarIcon: tabIcon("package", "cube.box") }}
      />
      <Tabs.Screen name="scanner" options={{ title: "Scan", tabBarIcon: tabIcon("camera", "qrcode.viewfinder") }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarIcon: tabIcon("clock", "clock") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("user", "person") }} />
    </Tabs>
  );
}

export default function DriverLayout() {
  const content = isLiquidGlassAvailable() ? <NativeDriverTabs /> : <ClassicDriverTabs />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        {content}
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
