import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  color?: string;
  trend?: { value: number; label: string };
}

export function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  const colors = useColors();
  const iconColor = color ?? colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + "18" }]}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {trend != null && (
        <View style={styles.trend}>
          <Feather
            name={trend.value >= 0 ? "trending-up" : "trending-down"}
            size={12}
            color={trend.value >= 0 ? colors.success : colors.destructive}
          />
          <Text
            style={[styles.trendText, { color: trend.value >= 0 ? colors.success : colors.destructive }]}
          >
            {Math.abs(trend.value)}% {trend.label}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    minWidth: 150,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold", marginTop: 2 },
  label: { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular" },
  trend: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  trendText: { fontSize: 11, fontFamily: "SpaceGrotesk_500Medium" },
});
