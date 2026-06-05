import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheetModal, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetDefaultBackdropProps } from "@gorhom/bottom-sheet/src/components/bottomSheetBackdrop/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { useDriverStore } from "@/store/driverStore";
import { useLocation } from "@/hooks/useLocation";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { RouteCard } from "@/components/driver/RouteCard";
import { PickupForm } from "@/components/driver/PickupForm";
import type { PickupFormSubmitData } from "@/components/driver/PickupForm";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/Skeleton";
import {
  useListDriverPickups,
  getListDriverPickupsQueryKey,
  skipPickup,
  completePickup,
} from "@workspace/api-client-react";
import { Colors } from "@/constants/colors";
import type { Pickup } from "@/store/pickupStore";

const DARK = Colors.background.dark;
const HEADER_BG = Colors.primary.deep;
const GOLD = Colors.gold.main;
const TEXT_WHITE = Colors.text.white;
const TEXT_MUTED = "#7a9a7a";
const CARD_BORDER = "#1a3a1a";

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

export default function DriverRouteScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const {
    assignedPickups,
    setAssignedPickups,
    updateAssignedPickup,
    isOnDuty,
    setOnDuty,
    syncStatus,
    offlineQueue,
    scannedPrefill,
    setScannedPrefill,
    removeFromOfflineQueue,
  } = useDriverStore();
  const { currentLocation, isTracking } = useLocation();
  const { enqueue } = useOfflineSync();
  const params = useLocalSearchParams<{ pickupId?: string }>();

  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["70%", "95%"], []);
  const prevPickupIdRef = useRef<string | undefined>(undefined);

  const { data: driverPickups, isLoading, refetch } = useListDriverPickups({
    query: { enabled: !!profile?.id, queryKey: getListDriverPickupsQueryKey() },
  });

  // Sync React Query result into the driver store so existing rendering logic works
  useEffect(() => {
    if (driverPickups) {
      const mapped: Pickup[] = driverPickups.map((p) => ({
        ...p,
        quantity: Number(p.quantity),
        driver_id: p.driver_id ?? null,
        notes: p.notes ?? null,
        grade: p.grade ?? null,
        condition: p.condition ?? null,
        vendor_name: p.vendor_name ?? p.vendor_business ?? null,
        driver_name: null,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        qr_code: p.qr_code ?? null,
      }));
      setAssignedPickups(mapped);
    }
  }, [driverPickups, setAssignedPickups]);

  const renderBackdrop = useCallback(
    (props: BottomSheetDefaultBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.7} />
    ),
    [],
  );

  const showSuccess = () => {
    successAnim.setValue(1);
    Animated.timing(successAnim, {
      toValue: 0, duration: 1800, delay: 800, useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const { pickupId } = params;
    if (!pickupId || pickupId === prevPickupIdRef.current || assignedPickups.length === 0) return;
    const match = assignedPickups.find((p) => p.id === pickupId);
    if (match) {
      prevPickupIdRef.current = pickupId;
      setSelectedPickup(match);
      setTimeout(() => bottomSheetRef.current?.present(), 200);
    }
  }, [params.pickupId, assignedPickups.length]);

  const handlePickupPress = (pickup: Pickup) => {
    setSelectedPickup(pickup);
    setTimeout(() => bottomSheetRef.current?.present(), 80);
  };

  const handleSkip = (pickupId: string) => {
    Alert.alert("Skip Stop", "Mark this stop as skipped for today?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Skip",
        style: "destructive",
        onPress: async () => {
          const skipPayload = { status: "skipped" as const };
          try {
            await skipPickup(pickupId);
          } catch {
            await enqueue({ id: pickupId, payload: skipPayload, timestamp: Date.now(), retries: 0 });
          }
          updateAssignedPickup(pickupId, { status: "skipped" });
        },
      },
    ]);
  };

  const handleNavigate = (address: string) => {
    const encoded = encodeURIComponent(address);
    const url = Platform.OS === "ios"
      ? `maps://?q=${encoded}`
      : `https://maps.google.com/?q=${encoded}`;
    import("expo-linking").then(({ default: Linking }) => void Linking.openURL(url));
  };

  const handleFormSubmit = async (data: PickupFormSubmitData) => {
    if (!selectedPickup) return;
    setIsSubmitting(true);

    const completeBody = {
      status: "completed" as const,
      quantity: data.actual_quantity,
      unit: data.unit,
      ...(data.grade ? { grade: data.grade } : {}),
      ...(data.condition ? { condition: data.condition } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
      ...(data.latitude ? { latitude: data.latitude, longitude: data.longitude } : {}),
    };

    // Enqueue first so the action survives if the network call fails
    await enqueue({ id: selectedPickup.id, payload: completeBody, timestamp: Date.now(), retries: 0 });

    try {
      // The API atomically completes the pickup and creates the invoice
      await completePickup(selectedPickup.id, {
        quantity: data.actual_quantity,
        unit: data.unit,
        grade: data.grade as "A" | "B" | "C" | undefined,
        condition: data.condition,
        latitude: data.latitude,
        longitude: data.longitude,
        notes: data.notes,
      });
      // Remove from offline queue on success so it isn't retried
      removeFromOfflineQueue(selectedPickup.id);
    } catch { /* stays in offline queue for retry */ }

    updateAssignedPickup(selectedPickup.id, { status: "completed" });
    setScannedPrefill(null);
    bottomSheetRef.current?.dismiss();
    showSuccess();
    setIsSubmitting(false);
    setTimeout(() => setSelectedPickup(null), 400);
  };

  const firstName = profile?.full_name?.split(" ")[0] ?? "Driver";
  const vehicleNumber = profile?.vehicle_number ?? null;
  const pending = assignedPickups.filter((p) => p.status === "confirmed").length;
  const inTransit = assignedPickups.filter((p) => p.status === "in_transit").length;
  const completed = assignedPickups.filter((p) => p.status === "completed").length;
  const totalKg = assignedPickups.reduce((sum, p) => {
    const isKg = p.unit.toLowerCase().includes("kg");
    return sum + (isKg ? p.quantity : Math.round(p.quantity * 0.9));
  }, 0);
  const queueCount = offlineQueue.length;

  const gpsText = () => {
    if (!isOnDuty) return "Tap 'On Duty' to enable GPS";
    if (isTracking && currentLocation) {
      const acc = currentLocation.accuracy != null
        ? ` · ±${Math.round(currentLocation.accuracy)}m`
        : "";
      return `GPS Active${acc}`;
    }
    if (isTracking) return "Locating…";
    return "GPS Off";
  };

  const gpsDotColor = isTracking && currentLocation
    ? Colors.primary.accent
    : isTracking
    ? GOLD
    : Colors.status.error;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 52 : insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{todayLabel()}</Text>
            <View style={styles.nameLine}>
              <Text style={styles.driverName}>{firstName}</Text>
              {vehicleNumber && (
                <View style={styles.vehicleBadge}>
                  <Feather name="truck" size={10} color={GOLD} />
                  <Text style={styles.vehicleText}>{vehicleNumber}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.dutyBtn, isOnDuty ? styles.dutyBtnOn : styles.dutyBtnOff]}
            onPress={() => setOnDuty(!isOnDuty)}
            activeOpacity={0.8}
          >
            <View style={[styles.dutyDot, { backgroundColor: isOnDuty ? Colors.primary.deep : TEXT_MUTED }]} />
            <Text style={[styles.dutyText, { color: isOnDuty ? Colors.primary.deep : TEXT_MUTED }]}>
              {isOnDuty ? "On Duty" : "Off Duty"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gpsPill}>
          <View style={[styles.gpsDot, { backgroundColor: gpsDotColor }]} />
          <Text style={styles.gpsText} numberOfLines={1}>{gpsText()}</Text>
          {queueCount > 0 && (
            <View style={styles.queueBadge}>
              <Feather name="wifi-off" size={10} color={GOLD} />
              <Text style={styles.queueText}>{queueCount} queued</Text>
            </View>
          )}
          {syncStatus === "syncing" && queueCount === 0 && (
            <View style={styles.syncBadge}>
              <Text style={styles.syncText}>Syncing</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <StatBox label="Pending" value={pending} color={Colors.status.info} />
          <StatBox label="In Transit" value={inTransit} color={GOLD} />
          <StatBox label="Done" value={completed} color={Colors.primary.accent} />
          <StatBox label="Est. KG" value={totalKg} color={TEXT_MUTED} />
        </View>
      </View>

      <FlatList
        data={isLoading ? [] : assignedPickups}
        keyExtractor={(item) => item.id}
        style={{ flex: 1, backgroundColor: DARK }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={GOLD} />
        }
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            Today's Route — {assignedPickups.length} stop{assignedPickups.length !== 1 ? "s" : ""}
          </Text>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: 10 }}>
              {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
            </View>
          ) : (
            <EmptyState
              icon="map"
              title="No pickups assigned"
              description="Your assigned pickups will appear here once confirmed"
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item, index }) => (
          <RouteCard
            pickup={item}
            index={index}
            isActive={item.status === "in_transit"}
            gpsAccuracy={item.status === "in_transit" ? currentLocation?.accuracy ?? null : null}
            onNavigate={() => handleNavigate(item.address)}
            onPickup={() => handlePickupPress(item)}
            onSkip={() => handleSkip(item.id)}
          />
        )}
      />

      <Animated.View
        style={[
          styles.successToast,
          {
            opacity: successAnim,
            transform: [
              { translateY: successAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <Feather name="check-circle" size={18} color={Colors.primary.accent} />
        <Text style={styles.successText}>Pickup confirmed!</Text>
      </Animated.View>

      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
        keyboardBehavior="extend"
        onDismiss={() => {
          setScannedPrefill(null);
          setTimeout(() => setSelectedPickup(null), 300);
        }}
      >
        {selectedPickup && (
          <PickupForm
            pickup={selectedPickup}
            prefill={scannedPrefill}
            onSubmit={handleFormSubmit}
            isLoading={isSubmitting}
          />
        )}
      </BottomSheetModal>
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statBox, { borderColor: color + "33" }]}>
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  header: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: 20, paddingBottom: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: CARD_BORDER,
  },
  headerTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", gap: 12,
  },
  greeting: {
    fontSize: 11, fontFamily: "SpaceGrotesk_500Medium",
    color: "#90b890", letterSpacing: 0.3,
  },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  driverName: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold", color: TEXT_WHITE },
  vehicleBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: GOLD + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  vehicleText: { fontSize: 11, fontFamily: "SpaceGrotesk_600SemiBold", color: GOLD },
  dutyBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100, flexShrink: 0,
  },
  dutyBtnOn: { backgroundColor: GOLD },
  dutyBtnOff: { backgroundColor: "#1a2a1a", borderWidth: 1, borderColor: CARD_BORDER },
  dutyDot: { width: 8, height: 8, borderRadius: 4 },
  dutyText: { fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold" },
  gpsPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0a1a0a", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: CARD_BORDER,
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsText: { flex: 1, fontSize: 11, fontFamily: "SpaceGrotesk_500Medium", color: "#90b890" },
  queueBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: GOLD + "22", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  queueText: { fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold", color: GOLD },
  syncBadge: {
    backgroundColor: Colors.status.info + "22", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  syncText: { fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.status.info },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1, alignItems: "center", gap: 2, paddingVertical: 10,
    backgroundColor: "#0a1a0a", borderRadius: 10, borderWidth: 1,
  },
  statNum: { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_MUTED },
  list: { padding: 16, gap: 0 },
  sectionTitle: {
    fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold",
    color: TEXT_MUTED, marginBottom: 12, letterSpacing: 0.5,
  },
  successToast: {
    position: "absolute", bottom: 120, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.primary.mid, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 100, borderWidth: 1, borderColor: Colors.primary.accent + "44",
  },
  successText: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: TEXT_WHITE },
  sheetBg: { backgroundColor: "#0d1a0d" },
  sheetHandle: { backgroundColor: "#2a4a2a" },
});
