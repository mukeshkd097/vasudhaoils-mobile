import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { format, addDays, startOfToday } from "date-fns";
import { useColors } from "@/hooks/useColors";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  error?: string;
  minDate?: Date;
  maxDays?: number;
}

export function DatePicker({ value, onChange, label, error, minDate, maxDays = 30 }: DatePickerProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  const today = minDate ?? startOfToday();
  const dates = Array.from({ length: maxDays }, (_, i) => addDays(today, i));

  const displayValue = value
    ? format(new Date(value), "EEE, dd MMM yyyy")
    : "Select date";

  return (
    <View style={styles.container}>
      {!!label && (
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      )}
      <TouchableOpacity
        style={[
          styles.trigger,
          { borderColor: error ? colors.destructive : colors.border, backgroundColor: colors.card },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Feather name="calendar" size={18} color={colors.mutedForeground} />
        <Text
          style={[
            styles.triggerText,
            { color: value ? colors.foreground : colors.mutedForeground },
          ]}
        >
          {displayValue}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
      {!!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border, top: Platform.OS === "web" ? "50%" : "35%" },
            ]}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Pick a Date</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={dates}
              keyExtractor={(item) => item.toISOString()}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              renderItem={({ item }) => {
                const iso = format(item, "yyyy-MM-dd");
                const isSelected = value === iso;
                return (
                  <TouchableOpacity
                    style={[
                      styles.dateItem,
                      isSelected && { backgroundColor: colors.primary + "18" },
                    ]}
                    onPress={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.dayName, { color: colors.mutedForeground }]}>
                      {format(item, "EEE")}
                    </Text>
                    <Text style={[styles.dateNum, { color: isSelected ? colors.primary : colors.foreground }]}>
                      {format(item, "dd")}
                    </Text>
                    <Text style={[styles.monthName, { color: colors.mutedForeground }]}>
                      {format(item, "MMM")}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              horizontal
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontFamily: "SpaceGrotesk_500Medium" },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
  },
  triggerText: { flex: 1, fontSize: 15, fontFamily: "SpaceGrotesk_400Regular" },
  error: { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    maxHeight: 240,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 16, fontFamily: "SpaceGrotesk_600SemiBold" },
  list: { padding: 12 },
  dateItem: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 2,
    marginHorizontal: 4,
    minWidth: 64,
  },
  dayName: { fontSize: 11, fontFamily: "SpaceGrotesk_400Regular" },
  dateNum: { fontSize: 20, fontFamily: "SpaceGrotesk_700Bold" },
  monthName: { fontSize: 11, fontFamily: "SpaceGrotesk_400Regular" },
});
