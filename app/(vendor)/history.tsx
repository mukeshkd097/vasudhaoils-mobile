import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePickups } from "@/hooks/usePickups";
import { useInvoices } from "@/hooks/useInvoices";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/Fonts";
import { formatCurrency, formatDate, formatStatusLabel } from "@/utils/formatters";
import type { Pickup } from "@/store/pickupStore";

const FILTERS = ["All", "Pending", "Completed"] as const;
type Filter = (typeof FILTERS)[number];

const PAGE_SIZE = 8;

function statusColor(status: string): string {
  switch (status) {
    case "completed":
      return Colors.primary.light;
    case "in_transit":
      return Colors.status.info;
    case "confirmed":
      return Colors.gold.dark;
    case "cancelled":
      return Colors.status.error;
    default:
      return Colors.text.muted;
  }
}

function HistoryCard({
  pickup,
  amount,
  invoiceNumber,
  onPress,
}: {
  pickup: Pickup;
  amount: number | null;
  invoiceNumber: string | null;
  onPress: () => void;
}) {
  const grade = pickup.grade as "A" | "B" | "C" | null | undefined;
  const gradeColor = grade ? Colors.grade[grade] ?? Colors.grade.B : null;
  const accent = statusColor(pickup.status);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.card}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.flex}>
            <Text style={styles.cardOil}>{pickup.oil_type}</Text>
            <Text style={styles.cardDate}>{formatDate(pickup.pickup_date)}</Text>
          </View>
          <View style={styles.cardTopRight}>
            <Text style={styles.cardQty}>
              {Number(pickup.quantity).toLocaleString("en-IN")} {pickup.unit}
            </Text>
            {grade && gradeColor && (
              <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
                <Text style={styles.gradeText}>Grade {grade}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={[styles.statusPill, { backgroundColor: accent + "1a" }]}>
            <Text style={[styles.statusText, { color: accent }]}>
              {formatStatusLabel(pickup.status)}
            </Text>
          </View>
          <View style={styles.cardBottomRight}>
            {invoiceNumber && (
              <TouchableOpacity style={styles.invoiceLink} onPress={onPress}>
                <Feather name="file-text" size={13} color={Colors.primary.light} />
                <Text style={styles.invoiceText}>INV-{invoiceNumber}</Text>
              </TouchableOpacity>
            )}
            {amount != null && <Text style={styles.amount}>{formatCurrency(amount)}</Text>}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { pickups, isLoading, refetch } = usePickups();
  const { byPickupId } = useInvoices();
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (activeFilter === "Pending") {
      return pickups.filter((p) => ["pending", "confirmed", "in_transit"].includes(p.status));
    }
    if (activeFilter === "Completed") {
      return pickups.filter((p) => p.status === "completed");
    }
    return pickups;
  }, [pickups, activeFilter]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.topBar,
          { paddingTop: (Platform.OS === "web" ? 24 : insets.top) + 8 },
        ]}
      >
        <Text style={styles.title}>Pickup history</Text>
        <View style={styles.tabs}>
          {FILTERS.map((f) => {
            const active = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => {
                  setActiveFilter(f);
                  setPage(1);
                }}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={isLoading ? [] : visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary.deep} />
        }
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore) setPage((p) => p + 1);
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletons}>
              {[1, 2, 3].map((k) => (
                <SkeletonCard key={k} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="clock"
              title="No pickups found"
              description="Your pickups will appear here"
            />
          )
        }
        renderItem={({ item }) => {
          const inv = byPickupId(item.id);
          return (
            <HistoryCard
              pickup={item}
              amount={inv != null ? Number(inv.amount) : null}
              invoiceNumber={inv?.invoice_number ?? null}
              onPress={() => router.push("/(vendor)/invoices")}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={
          hasMore ? <Text style={styles.loadingMore}>Loading more…</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 14, backgroundColor: Colors.background.card, gap: 14 },
  title: { fontSize: 26, fontFamily: Fonts.bold, color: Colors.text.primary },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 100,
    alignItems: "center",
    backgroundColor: Colors.background.secondary,
  },
  tabActive: { backgroundColor: Colors.primary.deep },
  tabText: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.text.muted },
  tabTextActive: { color: Colors.text.white },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  card: {
    flexDirection: "row",
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ececec",
    overflow: "hidden",
  },
  accent: { width: 5 },
  cardBody: { flex: 1, padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardOil: { fontSize: 16, fontFamily: Fonts.semibold, color: Colors.text.primary },
  cardDate: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.text.muted, marginTop: 2 },
  cardTopRight: { alignItems: "flex-end", gap: 5 },
  cardQty: { fontSize: 15, fontFamily: Fonts.semibold, color: Colors.text.primary },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  gradeText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.primary.deep },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 11, fontFamily: Fonts.semibold },
  cardBottomRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  invoiceLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  invoiceText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.primary.light },
  amount: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.gold.dark },
  skeletons: { gap: 12 },
  loadingMore: { textAlign: "center", paddingVertical: 16, fontFamily: Fonts.regular, color: Colors.text.muted },
});
