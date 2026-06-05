import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/Skeleton";
import { formatDate, formatQuantity } from "@/utils/formatters";
import { Colors } from "@/constants/colors";
import type { Pickup } from "@/store/pickupStore";

const DARK = Colors.background.dark;
const HEADER_BG = Colors.primary.deep;
const GOLD = Colors.gold.main;
const TEXT_WHITE = Colors.text.white;
const TEXT_MUTED = "#7a9a7a";
const CARD_BG = "#111a11";
const CARD_BORDER = "#1e3a1e";

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: Colors.primary.accent + "22", text: Colors.primary.accent },
  B: { bg: Colors.gold.main + "22", text: Colors.gold.main },
  C: { bg: Colors.status.error + "22", text: Colors.status.error },
};

export default function DriverHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const [history, setHistory] = useState<Pickup[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    const { data } = await supabase
      .from("pickups")
      .select("*")
      .eq("driver_id", profile.id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false });
    setHistory((data ?? []) as Pickup[]);
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
  }, [profile?.id]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 52 : insets.top + 8 }]}>
        <View>
          <Text style={styles.title}>Completed Pickups</Text>
          <Text style={styles.count}>{history.length} total pickups</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: GOLD + "22" }]}>
          <Text style={[styles.countBadgeText, { color: GOLD }]}>{history.length}</Text>
        </View>
      </View>

      <FlatList
        data={isLoading ? [] : history}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={GOLD} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: 10 }}>
              {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
            </View>
          ) : (
            <EmptyState
              icon="check-circle"
              title="No completed pickups"
              description="Pickups you complete will appear here"
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const gradeStyle = item.grade ? GRADE_COLORS[item.grade] : null;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.oilType}>{item.oil_type}</Text>
                  <View style={styles.metaRow}>
                    <Feather name="package" size={11} color={TEXT_MUTED} />
                    <Text style={styles.metaText}>{formatQuantity(item.quantity, item.unit)}</Text>
                    <View style={styles.dot} />
                    <Feather name="calendar" size={11} color={TEXT_MUTED} />
                    <Text style={styles.metaText}>{formatDate(item.pickup_date)}</Text>
                  </View>
                </View>
                {gradeStyle && (
                  <View style={[styles.gradeBadge, { backgroundColor: gradeStyle.bg }]}>
                    <Text style={[styles.gradeText, { color: gradeStyle.text }]}>
                      Grade {item.grade}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.addressRow}>
                <Feather name="map-pin" size={11} color={TEXT_MUTED} />
                <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
              </View>
              <View style={[styles.completedBar, { backgroundColor: Colors.primary.accent + "22" }]}>
                <Feather name="check-circle" size={12} color={Colors.primary.accent} />
                <Text style={[styles.completedText, { color: Colors.primary.accent }]}>
                  Pickup completed
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  header: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: "#1a3a1a",
  },
  title: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold", color: TEXT_WHITE },
  count: { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_MUTED, marginTop: 2 },
  countBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  countBadgeText: { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold" },
  list: { padding: 16, gap: 0 },
  card: {
    backgroundColor: CARD_BG, borderRadius: 16,
    borderWidth: 1, borderColor: CARD_BORDER, overflow: "hidden", gap: 10, padding: 16,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardLeft: { flex: 1, gap: 4 },
  oilType: { fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold", color: TEXT_WHITE },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  metaText: { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_MUTED },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: TEXT_MUTED },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  gradeText: { fontSize: 12, fontFamily: "SpaceGrotesk_600SemiBold" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  address: { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_MUTED, flex: 1 },
  completedBar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8,
  },
  completedText: { fontSize: 12, fontFamily: "SpaceGrotesk_500Medium" },
});
