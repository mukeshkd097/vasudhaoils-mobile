import React from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  type ViewStyle,
  type PressableProps,
} from "react-native";
import { BlurView } from "expo-blur";
import { Colors } from "@/constants/colors";

type CardVariant = "default" | "dark" | "glass" | "pressable";

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
  padding?: number;
  elevated?: boolean;
  onPress?: PressableProps["onPress"];
}

export function Card({
  children,
  variant = "default",
  style,
  padding = 16,
  elevated = true,
  onPress,
}: CardProps) {
  const base: ViewStyle = {
    ...styles.card,
    padding,
    ...(elevated ? styles.elevated : null),
  };

  if (variant === "glass") {
    return (
      <BlurView
        intensity={Platform.OS === "ios" ? 40 : 80}
        tint="light"
        style={[
          base,
          {
            backgroundColor: "rgba(255,255,255,0.55)",
            borderColor: "rgba(255,255,255,0.6)",
          },
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  if (variant === "dark") {
    return (
      <View
        style={[
          base,
          { backgroundColor: Colors.background.dark, borderColor: "#1a1f1a" },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  if (variant === "pressable" || onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: "rgba(15,61,46,0.08)" }}
        style={({ pressed }) => [
          base,
          {
            backgroundColor: Colors.background.card,
            borderColor: "#e2e2dd",
            opacity: pressed && Platform.OS !== "android" ? 0.85 : 1,
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        base,
        { backgroundColor: Colors.background.card, borderColor: "#e2e2dd" },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
