import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  TouchableOpacity,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { usePickups } from "@/hooks/usePickups";
import { useInvoices } from "@/hooks/useInvoices";
import { SkeletonCard } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/Fonts";
import { Config } from "@/constants/Config";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/utils/formatters";
import type { Pickup } from "@/store/pickupStore";
import type { Invoice } from "@/hooks/useInvoices";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatProps {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
  highlight?: boolean;
}

function HeaderStat({ icon, value, label, highlight }: StatProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Feather
          name={icon}
          size={16}
          color={highlight ? Colors.gold.main : Colors.primary.accent}
        />
      </View>
      <Text
        style={[styles.statValue, highlight && { color: Colors.gold.main }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface ActionProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  variant: "gold" | "outline";
  disabled?: boolean;
  onPress: () => void;
}

function QuickAction({ icon, label, variant, disabled, onPress }: ActionProps) {
  const gold = variant === "gold";
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionCard,
        gold ? styles.actionGold : styles.actionOutline,
        disabled && { opacity: 0.4 },
      ]}
    >
      <Feather name={icon} size={22} color={gold ? Colors.primary.deep : Colors.primary.mid} />
      <Text
        style={[styles.actionText, { color: gold ? Colors.primary.deep : Colors.primary.mid }]}
        numberOfLines={2}
        textBreakStrategy="balanced"
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RecentPickupRow({
  pickup,
  invoice,
  onPress,
}: {
  pickup: Pickup;
  invoice: Invoice | null;
  onPress: () => void;
}) {
  const grade = pickup.grade as "A" | "B" | "C" | null | undefined;
  const gradeColor = grade ? Colors.grade[grade] ?? Colors.grade.B : null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.pickupRow}
    >
      <View style={styles.pickupLeft}>
        <Text style={styles.pickupDate}>{formatDate(pickup.pickup_date)}</Text>
        <Text style={styles.pickupDriver} numberOfLines={1}>
          {pickup.driver_name ?? "Driver to be assigned"}
        </Text>
      </View>
      <View style={styles.pickupRight}>
        <Text style={styles.pickupQty}>
          {Number(pickup.quantity).toLocaleString("en-IN")} {pickup.unit}
        </Text>
        <View style={styles.pickupMeta}>
          {grade && gradeColor && (
            <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
              <Text style={styles.gradeText}>{grade}</Text>
            </View>
          )}
          {invoice && (
            <Text style={styles.pickupAmount}>{formatCurrency(invoice.amount)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Empty state specific to pickups — richer than the generic component
function PickupsEmptyState({ onBook }: { onBook: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>🛢️</Text>
      <Text style={styles.emptyTitle}>No pickups yet</Text>
      <Text style={styles.emptyDesc}>Book your first pickup to get started</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onBook} activeOpacity={0.85}>
        <Text style={styles.emptyBtnText}>Book Pickup</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── VendorDashboard ──────────────────────────────────────────────────────────

export default function VendorDashboard() {
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuthStore();
  const { pickups, isLoading, refetch, totalKg, completedCount, pending, confirmed, inTransit } =
    usePickups();
  const { totalDue, byPickupId, refetch: refetchInvoices } = useInvoices();
  const [refreshing, setRefreshing] = useState(false);

  // Vendor business name fetched directly from the vendors table
  const [businessName, setBusinessName] = useState<string | null>(
    profile?.business_name ?? null
  );

  // Today's UCO rate from oil_prices table
  const [ucoRate, setUcoRate] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("vendors")
      .select("name, business_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setBusinessName(
            (data.business_name as string | null) ??
            (data.name as string | null) ??
            null
          );
        }
      });
  }, [user?.id]);

  const fetchUcoRate = useCallback(() => {
    supabase
      .from("oil_prices")
      .select("rate")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.rate != null) setUcoRate(Number(data.rate));
      });
  }, []);

  useEffect(() => { fetchUcoRate(); }, [fetchUcoRate]);

  const displayName =
    businessName ??
    profile?.full_name?.split(" ")[0] ??
    "Vendor";

  const today = formatDate(new Date().toISOString(), "EEEE, d MMMM yyyy");
  const notifCount = pending.length + confirmed.length;
  const hasPickupToday = [...confirmed, ...inTransit].some((p) => isToday(p.pickup_date));
  const recent = pickups.slice(0, 5);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchInvoices()]);
    fetchUcoRate();
    setRefreshing(false);
  }, [refetch, refetchInvoices, fetchUcoRate]);

  const openWhatsApp = () => {
    void Linking.openURL(`https://wa.me/${Config.registerWhatsappNumber}`);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isLoading}
          onRefresh={onRefresh}
          tintColor={Colors.gold.main}
          colors={[Colors.gold.main]}
        />
      }
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[Colors.primary.deep, Colors.primary.mid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          { paddingTop: (Platform.OS === "web" ? 24 : insets.top) + 16 },
        ]}
      >
        {/* Top row: greeting + bell */}
        <View style={styles.headerTop}>
          <View style={styles.flex}>
            <Text style={styles.greeting} numberOfLines={1}>
              {greetingForNow()}, {displayName}
            </Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity
            style={styles.bell}
            activeOpacity={0.8}
            onPress={() => {}}
          >
            <Feather name="bell" size={20} color={Colors.text.white} />
            {notifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notifCount > 9 ? "9+" : notifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* UCO rate pill */}
        {ucoRate != null && (
          <View style={styles.ratePill}>
            <View style={styles.rateDot} />
            <Text style={styles.rateText}>Today's rate: ₹{ucoRate}/kg</Text>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <HeaderStat
            icon="droplet"
            value={totalKg.toLocaleString("en-IN")}
            label="kg collected"
          />
          <HeaderStat
            icon="check-circle"
            value={String(completedCount)}
            label="pickups done"
          />
          <HeaderStat
            icon="credit-card"
            value={formatCurrency(totalDue)}
            label="amount due"
            highlight
          />
        </View>
      </LinearGradient>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <View style={styles.body}>

        {/* Quick actions grid */}
        <View style={styles.actionsGrid}>
          <QuickAction
            icon="plus-circle"
            label="Book Pickup"
            variant="gold"
            onPress={() => router.push("/(vendor)/book")}
          />
          <QuickAction
            icon="file-text"
            label="My Invoices"
            variant="outline"
            onPress={() => router.push("/(vendor)/invoices")}
          />
          <QuickAction
            icon="map-pin"
            label="Track Driver"
            variant="outline"
            disabled={!hasPickupToday}
            onPress={() => router.push("/(vendor)/tracking")}
          />
          <QuickAction
            icon="message-circle"
            label="WhatsApp Us"
            variant="outline"
            onPress={openWhatsApp}
          />
        </View>

        {/* Welcome / motivational card — only when no pickups yet */}
        {!isLoading && recent.length === 0 && (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>Ready for today's pickups? 🌿</Text>
            <Text style={styles.welcomeSubtext}>
              Tap Book Pickup to schedule your next collection
            </Text>
          </View>
        )}

        {/* Recent pickups section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent pickups</Text>
          {pickups.length > 0 && (
            <TouchableOpacity onPress={() => router.push("/(vendor)/history")}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.listCard}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : recent.length === 0 ? (
          <PickupsEmptyState onBook={() => router.push("/(vendor)/book")} />
        ) : (
          <View style={styles.listCard}>
            {recent.map((p, i) => (
              <React.Fragment key={p.id}>
                {i > 0 && <View style={styles.divider} />}
                <RecentPickupRow
                  pickup={p}
                  invoice={byPickupId(p.id)}
                  onPress={() => router.push("/(vendor)/invoices")}
                />
              </React.Fragment>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
  },
  android: { elevation: 4 },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.text.white,
  },
  date: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.gold.main,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.primary.deep,
  },

  // UCO rate pill
  ratePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  rateDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary.accent,
  },
  rateText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.text.white,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  statIcon: { marginBottom: 2 },
  statValue: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: Colors.text.white,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: "rgba(255,255,255,0.65)",
  },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },

  // Quick actions
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    width: "48%",
    flexGrow: 1,
    height: 88,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 8,
    ...cardShadow,
  },
  actionGold: { backgroundColor: Colors.gold.main },
  actionOutline: {
    backgroundColor: Colors.background.card,
    borderWidth: 1.5,
    borderColor: "#e0e8e4",
  },
  actionText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    textAlign: "center",
  },

  // Welcome card
  welcomeCard: {
    backgroundColor: "rgba(245,166,35,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,166,35,0.3)",
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  welcomeTitle: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.text.primary,
  },
  welcomeSubtext: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.text.secondary,
    lineHeight: 19,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },
  viewAll: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.primary.light,
  },

  // Pickup list card
  listCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#ececec",
    ...cardShadow,
  },
  divider: { height: 1, backgroundColor: "#f0f0ec" },
  pickupRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  pickupLeft: { flex: 1, gap: 3 },
  pickupDate: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.text.primary,
  },
  pickupDriver: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
  },
  pickupRight: { alignItems: "flex-end", gap: 5 },
  pickupQty: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.text.primary,
  },
  pickupMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gradeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.primary.deep },
  pickupAmount: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.gold.dark,
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIcon: { fontSize: 48, marginBottom: 4 },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.text.secondary,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: Colors.gold.main,
  },
  emptyBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.primary.deep,
  },
});
