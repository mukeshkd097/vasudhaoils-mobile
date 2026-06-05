import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

function NativeVendorTabs() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="book">
        <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
        <Label>Book</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <Label>History</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="invoices">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Invoices</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tracking" hidden>
        <Icon sf={{ default: "location", selected: "location.fill" }} />
        <Label>Tracking</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicVendorTabs() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();

  const tabIcon = (name: string, sfName: string) =>
    ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
      <View style={tabStyles.iconWrap}>
        {isIOS ? (
          <SymbolView name={sfName as never} tintColor={color} size={size} />
        ) : (
          <Feather
            name={name as keyof typeof Feather.glyphMap}
            size={26}
            color={color}
          />
        )}
        {focused && <View style={tabStyles.activeDot} />}
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.gold.main,
        tabBarInactiveTintColor: Colors.primary.light,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Colors.text.white,
          borderTopWidth: 1,
          borderTopColor: "#ececec",
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          height: 64 + insets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.text.white }]} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.text.white }]} />
          ) : null,
        tabBarLabelStyle: { fontFamily: "SpaceGrotesk_500Medium", fontSize: 10 },
        tabBarIconStyle: { marginBottom: -2 },
      }}
      screenListeners={{
        tabPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home", "house") }} />
      <Tabs.Screen name="book" options={{ title: "Book", tabBarIcon: tabIcon("plus-circle", "plus.circle") }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarIcon: tabIcon("clock", "clock") }} />
      <Tabs.Screen name="invoices" options={{ title: "Invoices", tabBarIcon: tabIcon("file-text", "doc.text") }} />
      <Tabs.Screen name="tracking" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("user", "person") }} />
    </Tabs>
  );
}

export default function VendorLayout() {
  if (isLiquidGlassAvailable()) return <NativeVendorTabs />;
  return <ClassicVendorTabs />;
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gold.main,
  },
});
