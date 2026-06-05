import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { formatQuantity, formatDate } from "@/utils/formatters";
import type { Pickup } from "@/store/pickupStore";

const CARD_BG = "#111a11";
const BORDER = "#1e3a1e";
const TEXT_PRIMARY = Colors.text.white;
const TEXT_MUTED = "#7a9a7a";
const GOLD = Colors.gold.main;

const STATUS_COLORS: Record<string, string> = {
  confirmed: Colors.status.info,
  in_transit: GOLD,
  completed: Colors.primary.accent,
  cancelled: Colors.status.error,
  skipped: "#7a9a7a",
  pending: "#7a9a7a",
};

function deriveOilBadge(oilType: string): { label: string; color: string } {
  const t = oilType.toLowerCase();
  if (t.includes("sesame")) return { label: "SESAME", color: "#d4a017" };
  if (t.includes("coconut")) return { label: "COCONUT", color: "#3dbfa8" };
  if (t.includes("groundnut") || t.includes("peanut")) return { label: "GROUND", color: "#c47a2b" };
  if (t.includes("sunflower")) return { label: "SUNFL.", color: "#e8c53a" };
  if (t.includes("mustard")) return { label: "MUSTARD", color: "#b8a030" };
  if (t.includes("castor")) return { label: "CASTOR", color: "#7ab87a" };
  const words = oilType.split(" ");
  return { label: words[0].toUpperCase().slice(0, 7), color: TEXT_MUTED };
}

function deriveStopType(notes: string | null): { label: string; color: string } | null {
  const t = (notes ?? "").toLowerCase();
  if (t.includes("hotel")) return { label: "HOTEL", color: "#a07858" };
  if (t.includes("restaurant") || t.includes("dhaba") || t.includes("eatery"))
    return { label: "RESTAURANT", color: "#d47a2b" };
  if (t.includes("canteen")) return { label: "CANTEEN", color: "#7ab87a" };
  if (t.includes("bakery")) return { label: "BAKERY", color: "#c47a9a" };
  if (t.includes("hospital") || t.includes("clinic"))
    return { label: "HOSPITAL", color: "#5a9ac4" };
  if (t.includes("school") || t.includes("college"))
    return { label: "SCHOOL", color: "#7a6ac4" };
  if (t.includes("factory") || t.includes("industrial"))
    return { label: "FACTORY", color: "#8a7a6a" };
  if (t.includes("residential") || t.includes("home") || t.includes("house"))
    return { label: "HOME", color: "#90b890" };
  return null;
}

interface RouteCardProps {
  pickup: Pickup;
  index: number;
  onNavigate?: () => void;
  onPickup?: () => void;
  onSkip?: () => void;
  isActive?: boolean;
  gpsAccuracy?: number | null;
}

export function RouteCard({
  pickup,
  index,
  onNavigate,
  onPickup,
  onSkip,
  isActive,
  gpsAccuracy,
}: RouteCardProps) {
  const statusColor = STATUS_COLORS[pickup.status] ?? TEXT_MUTED;
  const isCompleted =
    pickup.status === "completed" ||
    pickup.status === "cancelled" ||
    pickup.status === "skipped";
  const oilBadge = deriveOilBadge(pickup.oil_type);
  const stopType = deriveStopType(pickup.notes);
  const vendorLabel = pickup.vendor_name ?? `Stop #${index + 1}`;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: isActive ? GOLD : BORDER,
          borderWidth: isActive ? 1.5 : 1,
          opacity: isCompleted ? 0.55 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.indexBubble,
            { backgroundColor: isActive ? GOLD : "#1e3a1e" },
          ]}
        >
          <Text style={[styles.indexText, { color: isActive ? Colors.primary.deep : TEXT_MUTED }]}>
            {index + 1}
          </Text>
        </View>

        <View style={styles.titleBlock}>
          <View style={styles.titleLine}>
            <Text style={styles.vendorName} numberOfLines={1}>
              {vendorLabel}
            </Text>
          </View>
          <View style={styles.badgesRow}>
            <View style={[styles.oilBadge, { borderColor: oilBadge.color + "55" }]}>
              <Text style={[styles.oilBadgeText, { color: oilBadge.color }]}>
                {oilBadge.label}
              </Text>
            </View>
            {stopType && (
              <View style={[styles.stopTypeBadge, { borderColor: stopType.color + "55", backgroundColor: stopType.color + "18" }]}>
                <Text style={[styles.stopTypeText, { color: stopType.color }]}>
                  {stopType.label}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.oilType} numberOfLines={1}>
            {pickup.oil_type}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusColor + "22" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {pickup.status.replace("_", " ")}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Feather name="package" size={12} color={TEXT_MUTED} />
          <Text style={styles.detailText}>
            Est. {formatQuantity(pickup.quantity, pickup.unit)}
          </Text>
          {isActive && gpsAccuracy != null && (
            <View style={styles.accuracyPill}>
              <View
                style={[
                  styles.accuracyDot,
                  { backgroundColor: gpsAccuracy < 20 ? Colors.primary.accent : GOLD },
                ]}
              />
              <Text style={styles.accuracyText}>±{Math.round(gpsAccuracy)}m</Text>
            </View>
          )}
        </View>
        <View style={styles.detailRow}>
          <Feather name="map-pin" size={12} color={TEXT_MUTED} />
          <Text style={styles.detailText} numberOfLines={2}>
            {pickup.address}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="calendar" size={12} color={TEXT_MUTED} />
          <Text style={styles.detailText}>{formatDate(pickup.pickup_date)}</Text>
        </View>
      </View>

      {!isCompleted && (
        <View style={styles.actions}>
          {!!onNavigate && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.navBtn]}
              onPress={onNavigate}
              activeOpacity={0.8}
            >
              <Feather name="navigation" size={13} color={Colors.primary.accent} />
              <Text style={[styles.actionText, { color: Colors.primary.accent }]}>Navigate</Text>
            </TouchableOpacity>
          )}
          {!!onPickup && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.pickupBtn]}
              onPress={onPickup}
              activeOpacity={0.8}
            >
              <Feather name="package" size={13} color={Colors.primary.deep} />
              <Text style={[styles.actionText, { color: Colors.primary.deep }]}>Pickup</Text>
            </TouchableOpacity>
          )}
          {!!onSkip && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.skipBtn]}
              onPress={onSkip}
              activeOpacity={0.8}
            >
              <Feather name="skip-forward" size={13} color={Colors.status.error} />
              <Text style={[styles.actionText, { color: Colors.status.error }]}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  indexBubble: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
  },
  indexText: { fontSize: 13, fontFamily: "SpaceGrotesk_700Bold" },
  titleBlock: { flex: 1, gap: 4 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  vendorName: {
    fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", color: TEXT_PRIMARY,
  },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  oilBadge: {
    borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  oilBadgeText: { fontSize: 9, fontFamily: "SpaceGrotesk_700Bold", letterSpacing: 0.5 },
  stopTypeBadge: {
    borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  stopTypeText: { fontSize: 9, fontFamily: "SpaceGrotesk_700Bold", letterSpacing: 0.5 },
  oilType: { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_MUTED },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, flexShrink: 0,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "SpaceGrotesk_600SemiBold" },
  details: { gap: 6 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: {
    fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_MUTED, flex: 1,
  },
  accuracyPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#0a1a0a", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  accuracyDot: { width: 5, height: 5, borderRadius: 3 },
  accuracyText: { fontSize: 10, fontFamily: "SpaceGrotesk_500Medium", color: TEXT_MUTED },
  actions: { flexDirection: "row", gap: 8, marginTop: 2 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, borderRadius: 10,
  },
  navBtn: {
    backgroundColor: Colors.primary.accent + "18",
    borderWidth: 1, borderColor: Colors.primary.accent + "44",
  },
  pickupBtn: { backgroundColor: GOLD, flex: 2 },
  skipBtn: {
    backgroundColor: Colors.status.error + "18",
    borderWidth: 1, borderColor: Colors.status.error + "44",
  },
  actionText: { fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold" },
});
