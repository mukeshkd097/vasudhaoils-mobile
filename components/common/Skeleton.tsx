import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 20, borderRadius = 8, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as ViewStyle["width"],
          height,
          borderRadius,
          backgroundColor: colors.muted,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={48} height={48} borderRadius={12} />
        <View style={styles.flex}>
          <Skeleton height={16} width="60%" />
          <Skeleton height={13} width="40%" />
        </View>
      </View>
      <Skeleton height={13} />
      <Skeleton height={13} width="80%" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 16 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  flex: { flex: 1, gap: 6 },
});
