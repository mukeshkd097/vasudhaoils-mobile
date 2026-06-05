import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import Constants from "expo-constants";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import { useUpdateProfile } from "@workspace/api-client-react";
import { useToast } from "@/components/common/Toast";
import { profileSchema } from "@/utils/validators";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/Fonts";
import { formatPhone } from "@/utils/formatters";

interface FormState {
  full_name: string;
  business_name: string;
  address: string;
  vehicle_number: string;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, profile, setProfile, logout } = useAuthStore();
  const { show, ToastComponent } = useToast();
  const updateProfileMutation = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    full_name: profile?.full_name ?? "",
    business_name: profile?.business_name ?? "",
    address: profile?.address ?? "",
    vehicle_number: profile?.vehicle_number ?? "",
  });

  const [notifyPickups, setNotifyPickups] = useState(true);
  const [notifyInvoices, setNotifyInvoices] = useState(true);
  const [notifyPromos, setNotifyPromos] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const initials = (profile?.full_name ?? "V")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const startEdit = () => {
    setForm({
      full_name: profile?.full_name ?? "",
      business_name: profile?.business_name ?? "",
      address: profile?.address ?? "",
      vehicle_number: profile?.vehicle_number ?? "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      show({ message: parsed.error.issues[0]?.message ?? "Invalid details", type: "error" });
      return;
    }
    if (!session) {
      show({ message: "Session expired. Please login again.", type: "error" });
      return;
    }
    try {
      const updated = await updateProfileMutation.mutateAsync({
        full_name: parsed.data.full_name,
        business_name: parsed.data.business_name,
        address: parsed.data.address,
        vehicle_number: parsed.data.vehicle_number,
      });
      // Keep local auth store in sync with the server response
      if (profile) setProfile({ ...profile, ...updated });
      setEditing(false);
      show({ message: "Profile updated", type: "success" });
    } catch (err) {
      const apiMsg =
        err != null && typeof err === "object" && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : undefined;
      const message = apiMsg ?? (err instanceof Error ? err.message : "Could not save profile");
      show({ message, type: "error" });
    }
  };

  const confirmLogout = () => {
    if (Platform.OS === "web") {
      void logout();
      return;
    }
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void logout() },
    ]);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: (Platform.OS === "web" ? 24 : insets.top) + 8,
        paddingBottom: insets.bottom + 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ToastComponent />

      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? "Vendor"}</Text>
        {!!profile?.business_name && <Text style={styles.business}>{profile.business_name}</Text>}
        {!!profile?.phone && <Text style={styles.phone}>{formatPhone(profile.phone)}</Text>}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Business details</Text>
          {!editing && (
            <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
              <Feather name="edit-2" size={14} color={Colors.primary.mid} />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <View style={styles.form}>
            <Field label="Full name" value={form.full_name} onChange={(v) => setForm((f) => ({ ...f, full_name: v }))} />
            <Field
              label="Business name"
              value={form.business_name}
              onChange={(v) => setForm((f) => ({ ...f, business_name: v }))}
            />
            <Field
              label="Address"
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              multiline
            />
            <Field
              label="Vehicle number"
              value={form.vehicle_number}
              onChange={(v) => setForm((f) => ({ ...f, vehicle_number: v }))}
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formBtn, styles.cancelBtn]}
                onPress={() => setEditing(false)}
                disabled={updateProfileMutation.isPending}
              >
                <Text style={[styles.formBtnText, { color: Colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, styles.saveBtn]}
                onPress={handleSave}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.primary.deep} />
                ) : (
                  <Text style={[styles.formBtnText, { color: Colors.primary.deep }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <InfoRow icon="user" label="Full name" value={profile?.full_name ?? "—"} />
            <InfoRow icon="briefcase" label="Business" value={profile?.business_name ?? "—"} />
            <InfoRow icon="map-pin" label="Address" value={profile?.address ?? "—"} />
            <InfoRow icon="truck" label="Vehicle" value={profile?.vehicle_number ?? "—"} last />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.infoCard}>
          <ToggleRow
            label="Pickup updates"
            description="Driver assigned, en route, completed"
            value={notifyPickups}
            onValueChange={setNotifyPickups}
          />
          <ToggleRow
            label="Invoice alerts"
            description="New invoices and payment reminders"
            value={notifyInvoices}
            onValueChange={setNotifyInvoices}
          />
          <ToggleRow
            label="Promotions"
            description="Offers and announcements"
            value={notifyPromos}
            onValueChange={setNotifyPromos}
            last
          />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.85}>
          <Feather name="log-out" size={18} color={Colors.status.error} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
        <Text style={styles.version}>Vasudha Oils v{appVersion}</Text>
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[styles.input, multiline && styles.inputMultiline]}
        multiline={multiline}
        placeholderTextColor={Colors.text.muted}
      />
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={16} color={Colors.primary.mid} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  last,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, last && { borderBottomWidth: 0 }]}>
      <View style={styles.flex}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#d0d0c8", true: Colors.primary.light }}
        thumbColor={Colors.text.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
  headerCard: { alignItems: "center", paddingVertical: 24, gap: 6 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary.deep,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: { fontSize: 32, fontFamily: Fonts.bold, color: Colors.gold.main },
  name: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.text.primary },
  business: { fontSize: 15, fontFamily: Fonts.medium, color: Colors.primary.light },
  phone: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.text.muted },
  section: { paddingHorizontal: 20, marginTop: 24, gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.text.primary },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  editText: { fontSize: 14, fontFamily: Fonts.semibold, color: Colors.primary.mid },
  infoCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ececec",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0ec",
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.text.muted },
  infoValue: { fontSize: 15, fontFamily: Fonts.semibold, color: Colors.text.primary, marginTop: 2 },
  form: { gap: 14 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.text.secondary },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.background.card,
    borderWidth: 1.5,
    borderColor: "#e2e2dd",
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.text.primary,
  },
  inputMultiline: { height: 80, paddingTop: 12, textAlignVertical: "top" },
  formActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  formBtn: { flex: 1, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cancelBtn: { backgroundColor: Colors.background.secondary },
  saveBtn: { backgroundColor: Colors.gold.main },
  formBtnText: { fontSize: 15, fontFamily: Fonts.semibold },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0ec",
  },
  toggleLabel: { fontSize: 15, fontFamily: Fonts.semibold, color: Colors.text.primary },
  toggleDesc: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.text.muted, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#fdecec",
  },
  logoutText: { fontSize: 16, fontFamily: Fonts.semibold, color: Colors.status.error },
  version: { textAlign: "center", fontSize: 12, fontFamily: Fonts.regular, color: Colors.text.muted, marginTop: 8 },
});
