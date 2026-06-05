import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import { useDriverStore } from "@/store/driverStore";
import { formatPhone } from "@/utils/formatters";
import { Colors } from "@/constants/colors";

const DARK = Colors.background.dark;
const HEADER_BG = Colors.primary.deep;
const GOLD = Colors.gold.main;
const TEXT_WHITE = Colors.text.white;
const TEXT_MUTED = "#7a9a7a";
const CARD_BG = "#111a11";
const CARD_BORDER = "#1e3a1e";

export default function DriverProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuthStore();
  const { signOut } = useAuth();
  const { assignedPickups, isOnDuty, offlineQueue } = useDriverStore();

  const completed = assignedPickups.filter((p) => p.status === "completed").length;
  const total = assignedPickups.length;

  const handleSignOut = () => {
    // Alert.alert uses window.confirm() on web, which is blocked inside iframes.
    // Call signOut directly on web; show the native dialog on device.
    if (Platform.OS === "web") {
      void signOut();
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => void signOut() },
    ]);
  };

  const initials = profile?.full_name
    ?.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() ?? "D";

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 110 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 52 : insets.top + 8 },
        ]}
      >
        <View style={styles.avatarRing}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? "Driver"}</Text>
        <View style={styles.badgeRow}>
          {profile?.vehicle_number && (
            <View style={styles.vehicleBadge}>
              <Feather name="truck" size={11} color={GOLD} />
              <Text style={styles.vehicleText}>{profile.vehicle_number}</Text>
            </View>
          )}
          <View style={[styles.roleBadge, isOnDuty && styles.roleBadgeActive]}>
            <View style={[styles.roleDot, { backgroundColor: isOnDuty ? Colors.primary.accent : TEXT_MUTED }]} />
            <Text style={[styles.roleText, { color: isOnDuty ? Colors.primary.accent : TEXT_MUTED }]}>
              {isOnDuty ? "On Duty" : "Off Duty"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Colors.primary.accent }]}>{completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: GOLD }]}>{total}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: offlineQueue.length > 0 ? Colors.status.warning : TEXT_MUTED }]}>
            {offlineQueue.length}
          </Text>
          <Text style={styles.statLabel}>Queued</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <MenuRow icon="phone" label="Phone" value={profile?.phone ? formatPhone(profile.phone) : (user?.phone ?? "—")} />
          <View style={styles.divider} />
          <MenuRow icon="truck" label="Vehicle" value={profile?.vehicle_number ?? "Not set"} />
          <View style={styles.divider} />
          <MenuRow icon="user" label="Role" value="Driver" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuRow} onPress={() => {}}>
            <View style={styles.menuIcon}>
              <Feather name="help-circle" size={17} color={TEXT_MUTED} />
            </View>
            <Text style={styles.menuLabel}>Help & Support</Text>
            <Feather name="chevron-right" size={15} color={TEXT_MUTED} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuRow} onPress={handleSignOut}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.status.error + "18" }]}>
              <Feather name="log-out" size={17} color={Colors.status.error} />
            </View>
            <Text style={[styles.menuLabel, { color: Colors.status.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function MenuRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.menuRow}>
      <View style={styles.menuIcon}>
        <Feather name={icon as keyof typeof Feather.glyphMap} size={17} color={TEXT_MUTED} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  content: { gap: 20 },
  header: {
    backgroundColor: HEADER_BG,
    alignItems: "center", gap: 10, paddingBottom: 24,
    borderBottomWidth: 1, borderBottomColor: "#1a3a1a",
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primary.mid,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: GOLD + "44",
  },
  initials: { fontSize: 30, fontFamily: "SpaceGrotesk_700Bold", color: TEXT_WHITE },
  name: { fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: TEXT_WHITE },
  badgeRow: { flexDirection: "row", gap: 8 },
  vehicleBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100,
    backgroundColor: GOLD + "22",
  },
  vehicleText: { fontSize: 12, fontFamily: "SpaceGrotesk_600SemiBold", color: GOLD },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100,
    backgroundColor: "#1a2a1a", borderWidth: 1, borderColor: CARD_BORDER,
  },
  roleBadgeActive: {
    backgroundColor: Colors.primary.accent + "18",
    borderColor: Colors.primary.accent + "44",
  },
  roleDot: { width: 7, height: 7, borderRadius: 3.5 },
  roleText: { fontSize: 12, fontFamily: "SpaceGrotesk_600SemiBold" },
  statsRow: {
    flexDirection: "row", gap: 10, paddingHorizontal: 20,
  },
  statBox: {
    flex: 1, backgroundColor: CARD_BG, borderRadius: 14,
    borderWidth: 1, borderColor: CARD_BORDER,
    paddingVertical: 14, alignItems: "center", gap: 4,
  },
  statNum: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_MUTED },
  section: { paddingHorizontal: 20, gap: 8 },
  sectionLabel: {
    fontSize: 11, fontFamily: "SpaceGrotesk_600SemiBold",
    color: TEXT_MUTED, letterSpacing: 1.2,
  },
  card: { backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, overflow: "hidden" },
  divider: { height: 1, backgroundColor: CARD_BORDER, marginLeft: 56 },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#1a2a1a",
    alignItems: "center", justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_WHITE },
  menuValue: { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_MUTED },
});
