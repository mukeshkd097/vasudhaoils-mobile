import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/common/Badge";
import { formatDate, formatQuantity } from "@/utils/formatters";
import type { Pickup } from "@/store/pickupStore";

interface PickupCardProps {
  pickup: Pickup;
  onPress?: () => void;
  onCancel?: () => void;
}

export function PickupCard({ pickup, onPress, onCancel }: PickupCardProps) {
  const colors = useColors();

  const canCancel = pickup.status === "pending" || pickup.status === "confirmed";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={styles.oilInfo}>
          <View style={[styles.oilDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.oilType, { color: colors.foreground }]}>{pickup.oil_type}</Text>
        </View>
        <Badge status={pickup.status} label={pickup.status} />
      </View>

      <View style={styles.details}>
        <View style={styles.detail}>
          <Feather name="package" size={14} color={colors.mutedForeground} />
          <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
            {formatQuantity(pickup.quantity, pickup.unit)}
          </Text>
        </View>
        <View style={styles.detail}>
          <Feather name="calendar" size={14} color={colors.mutedForeground} />
          <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
            {formatDate(pickup.pickup_date)}
          </Text>
        </View>
        <View style={styles.detail}>
          <Feather name="map-pin" size={14} color={colors.mutedForeground} />
          <Text style={[styles.detailText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {pickup.address}
          </Text>
        </View>
      </View>

      {canCancel && !!onCancel && (
        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: colors.border }]}
          onPress={onCancel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.cancelText, { color: colors.destructive }]}>Cancel</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  oilInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  oilDot: { width: 8, height: 8, borderRadius: 4 },
  oilType: { fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold" },
  details: { gap: 7 },
  detail: { flexDirection: "row", alignItems: "center", gap: 7 },
  detailText: { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", flex: 1 },
  cancelBtn: { alignSelf: "flex-end", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  cancelText: { fontSize: 13, fontFamily: "SpaceGrotesk_500Medium" },
});
