import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDriverStore } from "@/store/driverStore";
import { PickupForm } from "@/components/driver/PickupForm";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/common/Badge";
import { formatQuantity, formatDate } from "@/utils/formatters";
import { completePickup } from "@workspace/api-client-react";
import { useToast } from "@/components/common/Toast";
import type { Pickup } from "@/store/pickupStore";
import type { PickupFormData } from "@/utils/validators";

export default function DriverPickupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assignedPickups, updateAssignedPickup } = useDriverStore();
  const { show, ToastComponent } = useToast();
  const [selected, setSelected] = useState<Pickup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inTransit = assignedPickups.filter((p) => p.status === "in_transit");

  const handleFormSubmit = async (data: PickupFormData & { latitude?: number; longitude?: number }) => {
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await completePickup(selected.id, {
        quantity: data.actual_quantity,
        unit: data.unit,
        grade: data.grade as "A" | "B" | "C" | undefined,
        condition: data.condition,
        ...(data.latitude ? { latitude: data.latitude, longitude: data.longitude } : {}),
      });
      updateAssignedPickup(selected.id, { status: "completed" });
      show({ message: "Pickup confirmed!", type: "success" });
      setSelected(null);
    } catch {
      show({ message: "Failed to confirm pickup", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ToastComponent />
      <View
        style={[
          styles.topBar,
          { paddingTop: Platform.OS === "web" ? 67 : insets.top, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Confirm Pickups</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {inTransit.length} in transit
        </Text>
      </View>

      <FlatList
        data={inTransit}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="package"
            title="No active pickups"
            description="Start a pickup from the Route tab to confirm it here"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setSelected(item)}
            activeOpacity={0.8}
          >
            <View style={styles.cardRow}>
              <View style={[styles.cardIcon, { backgroundColor: colors.amberLight }]}>
                <Feather name="package" size={22} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.oilType, { color: colors.foreground }]}>{item.oil_type}</Text>
                <Text style={[styles.detail, { color: colors.mutedForeground }]}>
                  {formatQuantity(item.quantity, item.unit)} · {formatDate(item.pickup_date)}
                </Text>
                <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
              <Badge status={item.status} label={item.status} size="sm" />
            </View>
            <View style={[styles.confirmHint, { backgroundColor: colors.primary + "10" }]}>
              <Text style={[styles.confirmHintText, { color: colors.primary }]}>
                Tap to confirm
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Confirm Pickup</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <PickupForm
              pickup={selected}
              onSubmit={handleFormSubmit}
              isLoading={isSubmitting}
            />
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 26, fontFamily: "SpaceGrotesk_700Bold", marginTop: 8 },
  subtitle: { fontSize: 14, fontFamily: "SpaceGrotesk_400Regular", marginTop: 2 },
  list: { padding: 20 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  cardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, gap: 3 },
  oilType: { fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold" },
  detail: { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular" },
  address: { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular" },
  confirmHint: { paddingVertical: 10, alignItems: "center" },
  confirmHintText: { fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold" },
});
