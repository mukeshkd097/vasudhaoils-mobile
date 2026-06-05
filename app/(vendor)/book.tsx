import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "@/components/common/Toast";
import { usePickups } from "@/hooks/usePickups";
import { useAuthStore } from "@/store/authStore";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/Fonts";
import { Config } from "@/constants/Config";

interface DayOption {
  date: Date;
  iso: string;
  dayName: string;
  dayNum: string;
  month: string;
  isToday: boolean;
}

function localDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDays(): DayOption[] {
  const days: DayOption[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push({
      date: d,
      iso: localDateISO(d),
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: String(d.getDate()),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      isToday: i === 0,
    });
  }
  return days;
}

export default function BookPickupScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuthStore();
  const { bookPickup } = usePickups();
  const { show, ToastComponent } = useToast();

  const days = useMemo(buildDays, []);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [oilType, setOilType] = useState<string>(Config.oilTypes[0]);
  const [quantity, setQuantity] = useState(10);
  const [address, setAddress] = useState(profile?.address ?? "");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);

  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!success) return;
    Animated.spring(successScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => router.replace("/(vendor)/history"), 1800);
    return () => clearTimeout(t);
  }, [success, successScale]);

  const canSubmit = !!selectedDay && !!slot && quantity > 0;

  const handleSubmit = async () => {
    if (!user?.id) {
      show({ message: "Session expired. Please login again.", type: "error" });
      return;
    }
    if (!canSubmit || !selectedDay) {
      show({ message: "Please select a date and time slot", type: "error" });
      return;
    }
    if (address.trim().length < 5) {
      show({ message: "Please enter your pickup address (at least 5 characters)", type: "error" });
      return;
    }
    try {
      await bookPickup.mutateAsync({
        oil_type: oilType,
        quantity,
        unit: "Litres",
        pickup_date: selectedDay,
        address: address.trim(),
        notes: notes ? `[${slot}] ${notes}` : `[${slot}]`,
      });
      setSuccess(true);
    } catch (err) {
      const apiMsg =
        err != null && typeof err === "object" && "data" in err
          ? (err as { data?: { error?: string } }).data?.error
          : undefined;
      const message = apiMsg ?? (err instanceof Error ? err.message : "Failed to book pickup. Try again.");
      show({ message, type: "error" });
    }
  };

  if (success) {
    return (
      <View style={styles.successRoot}>
        <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
          <Feather name="check" size={54} color={Colors.text.white} />
        </Animated.View>
        <Text style={styles.successTitle}>Pickup Booked!</Text>
        <Text style={styles.successSub}>We'll notify you once a driver is assigned.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ToastComponent />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: (Platform.OS === "web" ? 24 : insets.top) + 16,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Book a pickup</Text>
        <Text style={styles.subtitle}>Schedule a used cooking oil collection</Text>

        <Text style={styles.label}>Select date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayRow}
        >
          {days.map((d) => {
            const selected = selectedDay === d.iso;
            const disabled = d.isToday;
            return (
              <TouchableOpacity
                key={d.iso}
                activeOpacity={0.85}
                disabled={disabled}
                onPress={() => setSelectedDay(d.iso)}
                style={[
                  styles.dayCard,
                  selected && styles.dayCardActive,
                  disabled && styles.dayCardDisabled,
                ]}
              >
                <Text style={[styles.dayName, selected && styles.dayTextActive]}>{d.dayName}</Text>
                <Text style={[styles.dayNum, selected && styles.dayTextActive]}>{d.dayNum}</Text>
                <Text style={[styles.dayMonth, selected && styles.dayTextActive]}>
                  {disabled ? "Today" : d.month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Time slot</Text>
        <View style={styles.slotRow}>
          {Config.timeSlots.map((s) => {
            const selected = slot === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                activeOpacity={0.85}
                onPress={() => setSlot(s.id)}
                style={[styles.slotChip, selected && styles.slotChipActive]}
              >
                <Text style={[styles.slotLabel, selected && styles.slotLabelActive]}>{s.label}</Text>
                <Text style={[styles.slotHint, selected && styles.slotHintActive]}>{s.hint}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Oil type</Text>
        <View style={styles.oilRow}>
          {Config.oilTypes.map((oil) => {
            const selected = oilType === oil;
            return (
              <TouchableOpacity
                key={oil}
                activeOpacity={0.85}
                onPress={() => setOilType(oil)}
                style={[styles.oilChip, selected && styles.oilChipActive]}
              >
                <Text style={[styles.oilText, selected && styles.oilTextActive]}>{oil}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Quantity (Litres)</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setQuantity((q) => Math.max(1, q - 5))}
          >
            <Feather name="minus" size={20} color={Colors.primary.deep} />
          </TouchableOpacity>
          <View style={styles.stepValueWrap}>
            <TextInput
              value={String(quantity)}
              onChangeText={(t) => setQuantity(Math.max(0, Number(t.replace(/\D/g, "")) || 0))}
              keyboardType="number-pad"
              style={styles.stepValue}
            />
            <Text style={styles.stepUnit}>L</Text>
          </View>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setQuantity((q) => q + 5)}>
            <Feather name="plus" size={20} color={Colors.primary.deep} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Pickup address</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Your pickup address"
          placeholderTextColor={Colors.text.muted}
          multiline
          style={styles.notes}
        />

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special instructions for the driver"
          placeholderTextColor={Colors.text.muted}
          multiline
          style={styles.notes}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={!canSubmit || bookPickup.isPending}
          style={[styles.submit, { opacity: !canSubmit || bookPickup.isPending ? 0.5 : 1 }]}
        >
          {bookPickup.isPending ? (
            <ActivityIndicator size="small" color={Colors.primary.deep} />
          ) : (
            <Text style={styles.submitText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 26, fontFamily: Fonts.bold, color: Colors.text.primary },
  subtitle: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.text.muted, marginTop: 2 },
  label: { fontSize: 15, fontFamily: Fonts.semibold, color: Colors.text.primary, marginTop: 24, marginBottom: 12 },
  dayRow: { gap: 10, paddingRight: 8 },
  dayCard: {
    width: 64,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.background.card,
    borderWidth: 1.5,
    borderColor: "#e2e2dd",
  },
  dayCardActive: { backgroundColor: Colors.gold.main, borderColor: Colors.gold.main },
  dayCardDisabled: { backgroundColor: "#ececec", borderColor: "#ececec", opacity: 0.55 },
  dayName: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.text.muted },
  dayNum: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.text.primary },
  dayMonth: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.text.muted },
  dayTextActive: { color: Colors.primary.deep },
  slotRow: { flexDirection: "row", gap: 10 },
  slotChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    gap: 2,
    backgroundColor: Colors.background.card,
    borderWidth: 1.5,
    borderColor: "#e2e2dd",
  },
  slotChipActive: { backgroundColor: Colors.primary.deep, borderColor: Colors.primary.deep },
  slotLabel: { fontSize: 14, fontFamily: Fonts.semibold, color: Colors.text.primary },
  slotLabelActive: { color: Colors.text.white },
  slotHint: { fontSize: 10, fontFamily: Fonts.regular, color: Colors.text.muted },
  slotHintActive: { color: "rgba(255,255,255,0.7)" },
  oilRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  oilChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: Colors.background.card,
    borderWidth: 1.5,
    borderColor: "#e2e2dd",
  },
  oilChipActive: { backgroundColor: Colors.primary.light, borderColor: Colors.primary.light },
  oilText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.text.secondary },
  oilTextActive: { color: Colors.text.white },
  stepper: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.gold.light,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValueWrap: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.background.card,
    borderWidth: 1.5,
    borderColor: "#e2e2dd",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  stepValue: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.text.primary, textAlign: "center", minWidth: 40 },
  stepUnit: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.text.muted },
  notes: {
    minHeight: 80,
    borderRadius: 14,
    backgroundColor: Colors.background.card,
    borderWidth: 1.5,
    borderColor: "#e2e2dd",
    padding: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.text.primary,
    textAlignVertical: "top",
  },
  submit: {
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.gold.main,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  submitText: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.primary.deep },
  successRoot: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.primary.light,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 24, fontFamily: Fonts.bold, color: Colors.text.primary },
  successSub: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.text.muted, textAlign: "center" },
});
