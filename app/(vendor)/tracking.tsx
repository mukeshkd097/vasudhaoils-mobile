import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Linking,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { Colors } from "@/constants/colors";

const GOLD = Colors.gold.main;
const GREEN_DEEP = Colors.primary.deep;
const GREEN_MID = Colors.primary.mid;
const GREEN_ACCENT = Colors.primary.accent;
const DARK_BG = "#0a0f0a";

const BHUBANESWAR = { latitude: 20.2961, longitude: 85.8245 };

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d2d3a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#374151" }] },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f5a623" }],
  },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#374151" }],
  },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#111827" }] },
];

const TIMELINE_STEPS = [
  { key: "confirmed", label: "Confirmed" },
  { key: "driver_assigned", label: "Assigned" },
  { key: "in_transit", label: "En Route" },
  { key: "arrived", label: "Arrived" },
  { key: "completed", label: "Done" },
];

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    driver_assigned: 1,
    in_transit: 2,
    arrived: 3,
    completed: 4,
  };
  return map[status] ?? 0;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Coord {
  latitude: number;
  longitude: number;
}

interface DriverLocation extends Coord {
  heading: number | null;
  speed: number | null;
}

interface PickupInfo {
  id: string;
  status: string;
  oil_type: string;
  quantity: number;
  unit: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  driver_id: string | null;
}

interface DriverProfile {
  full_name: string | null;
  vehicle_number: string | null;
  phone: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = React.ComponentType<any>;

interface MapsModule {
  default: AnyComponent;
  Marker: AnyComponent;
  Polyline: AnyComponent;
}

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const { pickupId } = useLocalSearchParams<{ pickupId?: string }>();
  const { profile } = useAuthStore();

  const [pickup, setPickup] = useState<PickupInfo | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [etaText, setEtaText] = useState<string | null>(null);
  const [distKm, setDistKm] = useState<number | null>(null);
  const [completedVisible, setCompletedVisible] = useState(false);
  const [mapsModule, setMapsModule] = useState<MapsModule | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pickupRef = useRef<PickupInfo | null>(null);

  useEffect(() => { pickupRef.current = pickup; }, [pickup]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      void import("react-native-maps").then((m) =>
        setMapsModule({ default: m.default, Marker: m.Marker, Polyline: m.Polyline })
      );
    }
  }, []);

  const startPulse = useCallback(() => {
    pulseAnim.setValue(1);
    pulseOpacity.setValue(0.6);
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [pulseAnim, pulseOpacity]);

  const fitMap = useCallback((dCoord: Coord, vCoord: Coord) => {
    mapRef.current?.fitToCoordinates([dCoord, vCoord], {
      edgePadding: { top: 120, right: 60, bottom: 300, left: 60 },
      animated: true,
    });
  }, []);

  const handleNewLocation = useCallback(
    (loc: { latitude: number; longitude: number; heading?: number | null; speed?: number | null }) => {
      const p = pickupRef.current;
      const vendorLat = p?.latitude ?? BHUBANESWAR.latitude;
      const vendorLng = p?.longitude ?? BHUBANESWAR.longitude;

      setDriverLocation({
        latitude: loc.latitude,
        longitude: loc.longitude,
        heading: loc.heading ?? null,
        speed: loc.speed ?? null,
      });

      const km = haversineKm(loc.latitude, loc.longitude, vendorLat, vendorLng);
      const mins = Math.round((km / 30) * 60);
      setDistKm(km);
      setEtaText(`${km.toFixed(1)} km · ~${mins} min`);

      startPulse();
      fitMap(
        { latitude: loc.latitude, longitude: loc.longitude },
        { latitude: vendorLat, longitude: vendorLng }
      );
    },
    [startPulse, fitMap]
  );

  useEffect(() => {
    if (!pickupId) return;
    void (async () => {
      const { data: p } = await supabase
        .from("pickups")
        .select("*")
        .eq("id", pickupId)
        .single();
      if (!p) return;
      setPickup(p as PickupInfo);
      if ((p as PickupInfo).status === "completed") setCompletedVisible(true);

      const driverId = (p as PickupInfo).driver_id;
      if (!driverId) return;

      const { data: d } = await supabase
        .from("profiles")
        .select("full_name, vehicle_number, phone")
        .eq("id", driverId)
        .single();
      if (d) setDriver(d as DriverProfile);

      const { data: loc } = await supabase
        .from("driver_locations")
        .select("latitude, longitude, heading, speed")
        .eq("driver_id", driverId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .single();
      if (loc) handleNewLocation(loc as { latitude: number; longitude: number; heading: number | null; speed: number | null });
    })();
  }, [pickupId, handleNewLocation]);

  useEffect(() => {
    const driverId = pickup?.driver_id;
    if (!driverId || !pickupId) return;

    channelRef.current = supabase
      .channel(`driver-location-${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_locations",
          filter: `driver_id=eq.${driverId}`,
        },
        (payload) => {
          const row = payload.new as { latitude: number; longitude: number; heading?: number | null; speed?: number | null };
          handleNewLocation(row);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pickups",
          filter: `id=eq.${pickupId}`,
        },
        (payload) => {
          const updated = payload.new as PickupInfo;
          setPickup((prev) => (prev ? { ...prev, status: updated.status } : prev));
          if (updated.status === "completed") {
            setTimeout(() => setCompletedVisible(true), 500);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) void supabase.removeChannel(channelRef.current);
    };
  }, [pickup?.driver_id, pickupId, handleNewLocation]);

  useEffect(() => { startPulse(); }, [startPulse]);

  const vendorCoord: Coord = {
    latitude: pickup?.latitude ?? BHUBANESWAR.latitude,
    longitude: pickup?.longitude ?? BHUBANESWAR.longitude,
  };
  const driverCoord: Coord | null = driverLocation
    ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
    : null;

  const driverName = driver?.full_name ?? "Driver";
  const vehicleNum = driver?.vehicle_number ?? "—";
  const phone = driver?.phone ?? null;

  const handleCall = () => { if (phone) void Linking.openURL(`tel:${phone}`); };
  const handleWhatsApp = () => {
    if (!phone) return;
    const num = phone.replace(/[^0-9]/g, "");
    const cleaned = num.startsWith("91") ? num : `91${num}`;
    void Linking.openURL(
      `https://wa.me/${cleaned}?text=Hi%20${encodeURIComponent(driverName)}%2C%20I'm%20tracking%20my%20oil%20pickup.`
    );
  };

  const renderMap = () => {
    if (Platform.OS === "web" || !mapsModule) {
      return (
        <View style={styles.mapFallback}>
          <Feather name="map" size={40} color={GREEN_ACCENT} />
          <Text style={styles.mapFallbackText}>Map available on mobile</Text>
          {driverCoord && (
            <Text style={styles.mapFallbackSub}>
              Driver: {driverCoord.latitude.toFixed(4)}, {driverCoord.longitude.toFixed(4)}
            </Text>
          )}
        </View>
      );
    }

    const MV = mapsModule.default;
    const MK = mapsModule.Marker;
    const PL = mapsModule.Polyline;

    return (
      <MV
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={{
          ...vendorCoord,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <MK coordinate={vendorCoord} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.vendorMarkerWrap}>
            <View style={styles.vendorMarker}>
              <Feather name="home" size={14} color="#fff" />
            </View>
            <View style={styles.markerLabel}>
              <Text style={styles.markerLabelText} numberOfLines={1}>
                {profile?.business_name ?? profile?.full_name ?? "You"}
              </Text>
            </View>
          </View>
        </MK>

        {driverCoord && (
          <>
            <PL
              coordinates={[driverCoord, vendorCoord]}
              strokeColor={GOLD}
              strokeWidth={2.5}
              lineDashPattern={[8, 6]}
            />
            <MK coordinate={driverCoord} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.driverMarkerWrap}>
                <Animated.View
                  style={[
                    styles.driverPulse,
                    { transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
                  ]}
                />
                <View style={styles.driverMarker}>
                  <Feather name="truck" size={14} color={GREEN_DEEP} />
                </View>
                <View style={styles.markerLabel}>
                  <Text style={styles.markerLabelText} numberOfLines={1}>
                    {driverName}
                  </Text>
                </View>
              </View>
            </MK>
          </>
        )}
      </MV>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: Platform.OS === "web" ? 0 : insets.top }]}>
      <StatusTimeline
        stepIndex={getStepIndex(pickup?.status ?? "confirmed")}
      />

      <View style={styles.mapContainer}>
        {renderMap()}

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.topInfoPill}>
          <View style={[styles.liveIndicator, { backgroundColor: GREEN_ACCENT }]} />
          <Text style={styles.liveText}>LIVE</Text>
          {etaText && <Text style={styles.etaPillText}>{etaText}</Text>}
        </View>
      </View>

      <DriverInfoCard
        name={driverName}
        vehicleNumber={vehicleNum}
        distKm={distKm}
        etaText={etaText}
        onCall={phone ? handleCall : null}
        onWhatsApp={phone ? handleWhatsApp : null}
        insets={insets}
      />

      <Modal
        visible={completedVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCompletedVisible(false)}
      >
        <View style={styles.completedOverlay}>
          <View style={styles.completedSheet}>
            <View style={styles.completedIcon}>
              <Feather name="check-circle" size={40} color={GREEN_ACCENT} />
            </View>
            <Text style={styles.completedTitle}>Pickup Complete!</Text>
            <Text style={styles.completedSub}>
              {pickup?.quantity ?? "–"} {pickup?.unit ?? ""} of{" "}
              {pickup?.oil_type ?? "oil"} collected
            </Text>
            <View style={styles.invoiceHint}>
              <Feather name="message-circle" size={14} color={GOLD} />
              <Text style={styles.invoiceHintText}>Invoice ready on WhatsApp</Text>
            </View>
            <TouchableOpacity
              style={styles.completedBtn}
              onPress={() => {
                setCompletedVisible(false);
                router.replace("/(vendor)/invoices");
              }}
            >
              <Feather name="file-text" size={16} color={GREEN_DEEP} />
              <Text style={styles.completedBtnText}>View Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setCompletedVisible(false); router.back(); }}
              style={styles.dismissBtn}
            >
              <Text style={styles.dismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatusTimeline({ stepIndex }: { stepIndex: number }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.timeline}>
      {TIMELINE_STEPS.map((step, i) => {
        const done = i < stepIndex;
        const active = i === stepIndex;

        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <View
                style={[
                  styles.tlConnector,
                  { backgroundColor: done ? GOLD : "#2a3a2a" },
                ]}
              />
            )}
            <View style={styles.tlStep}>
              <View style={styles.tlDotWrap}>
                {active ? (
                  <Animated.View
                    style={[styles.tlDotActive, { transform: [{ scale: pulseAnim }] }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.tlDot,
                      { backgroundColor: done ? GOLD : "#2a3a2a" },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.tlLabel,
                  done && styles.tlLabelDone,
                  active && styles.tlLabelActive,
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

interface DriverInfoCardProps {
  name: string;
  vehicleNumber: string;
  distKm: number | null;
  etaText: string | null;
  onCall: (() => void) | null;
  onWhatsApp: (() => void) | null;
  insets: { bottom: number };
}

function DriverInfoCard({
  name,
  vehicleNumber,
  distKm,
  etaText,
  onCall,
  onWhatsApp,
  insets,
}: DriverInfoCardProps) {
  const etaMins = etaText?.split("~")[1]?.trim() ?? null;
  return (
    <View style={[styles.infoCard, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.infoRow}>
        <View style={styles.driverAvatar}>
          <Feather name="user" size={24} color={GREEN_ACCENT} />
        </View>
        <View style={styles.driverDetails}>
          <Text style={styles.driverName}>{name}</Text>
          <Text style={styles.vehicleNum}>{vehicleNumber}</Text>
          {distKm != null && (
            <Text style={styles.distText}>{distKm.toFixed(1)} km away</Text>
          )}
        </View>
        {etaMins && (
          <View style={styles.etaBlock}>
            <Text style={styles.etaLabel}>ETA</Text>
            <Text style={styles.etaValue}>~{etaMins}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.callBtn,
            !onCall && styles.actionBtnDisabled,
          ]}
          onPress={onCall ?? undefined}
          activeOpacity={onCall ? 0.8 : 1}
        >
          <Feather name="phone" size={16} color={onCall ? GREEN_ACCENT : "#3a5a3a"} />
          <Text
            style={[styles.actionBtnText, { color: onCall ? GREEN_ACCENT : "#3a5a3a" }]}
          >
            Call Driver
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.waBtn,
            !onWhatsApp && styles.actionBtnDisabled,
          ]}
          onPress={onWhatsApp ?? undefined}
          activeOpacity={onWhatsApp ? 0.8 : 1}
        >
          <Feather name="message-circle" size={16} color={onWhatsApp ? GREEN_DEEP : "#3a5a3a"} />
          <Text
            style={[
              styles.actionBtnText,
              { color: onWhatsApp ? GREEN_DEEP : "#3a5a3a" },
            ]}
          >
            WhatsApp
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK_BG },

  timeline: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1a0d",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1a3a1a",
    height: 64,
  },
  tlConnector: { flex: 1, height: 2 },
  tlStep: { alignItems: "center", gap: 4 },
  tlDotWrap: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tlDot: { width: 10, height: 10, borderRadius: 5 },
  tlDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GREEN_ACCENT,
  },
  tlLabel: {
    fontSize: 9,
    fontFamily: "SpaceGrotesk_400Regular",
    color: "#3a5a3a",
    textAlign: "center",
    width: 46,
  },
  tlLabelDone: { color: GOLD, fontFamily: "SpaceGrotesk_600SemiBold" },
  tlLabelActive: { color: GREEN_ACCENT, fontFamily: "SpaceGrotesk_600SemiBold" },

  mapContainer: { flex: 1, backgroundColor: "#111827" },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#111827",
  },
  mapFallbackText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_500Medium",
    color: "#6b7280",
  },
  mapFallbackSub: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_400Regular",
    color: "#4a6b4a",
  },

  backBtn: {
    position: "absolute",
    top: 12,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  topInfoPill: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1a3a1a",
  },
  liveIndicator: { width: 7, height: 7, borderRadius: 4 },
  liveText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_700Bold",
    color: GREEN_ACCENT,
    letterSpacing: 1.5,
  },
  etaPillText: { fontSize: 12, fontFamily: "SpaceGrotesk_500Medium", color: "#e5e7eb" },

  vendorMarkerWrap: { alignItems: "center", gap: 3 },
  vendorMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GREEN_MID,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: GREEN_ACCENT,
  },
  driverMarkerWrap: { alignItems: "center", gap: 3 },
  driverPulse: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: GOLD,
  },
  driverMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 1,
  },
  markerLabel: {
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: 100,
  },
  markerLabelText: {
    fontSize: 10,
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#fff",
  },

  infoCard: {
    backgroundColor: "#0d1a0d",
    borderTopWidth: 1,
    borderTopColor: "#1a3a1a",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1a3a1a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: GREEN_ACCENT + "66",
  },
  driverDetails: { flex: 1, gap: 3 },
  driverName: { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold", color: "#fff" },
  vehicleNum: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_500Medium",
    color: "#7a9a7a",
    letterSpacing: 1,
  },
  distText: { fontSize: 13, fontFamily: "SpaceGrotesk_500Medium", color: GREEN_ACCENT },
  etaBlock: { alignItems: "flex-end", gap: 2 },
  etaLabel: { fontSize: 10, fontFamily: "SpaceGrotesk_400Regular", color: "#7a9a7a" },
  etaValue: { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold", color: GOLD },

  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  callBtn: {
    borderColor: GREEN_ACCENT + "66",
    backgroundColor: GREEN_ACCENT + "10",
  },
  waBtn: { borderColor: GOLD + "66", backgroundColor: GOLD },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold" },

  completedOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  completedSheet: {
    backgroundColor: "#0d1a0d",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderColor: "#1a3a1a",
  },
  completedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GREEN_ACCENT + "18",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: GREEN_ACCENT + "44",
  },
  completedTitle: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold", color: "#fff" },
  completedSub: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_400Regular",
    color: "#7a9a7a",
    textAlign: "center",
  },
  invoiceHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GOLD + "18",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  invoiceHintText: { fontSize: 13, fontFamily: "SpaceGrotesk_500Medium", color: GOLD },
  completedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    width: "100%",
    justifyContent: "center",
    marginTop: 4,
  },
  completedBtnText: { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: GREEN_DEEP },
  dismissBtn: { paddingVertical: 8 },
  dismissText: { fontSize: 14, fontFamily: "SpaceGrotesk_500Medium", color: "#7a9a7a" },
});
