import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Config } from "@/constants/Config";

const GOLD = Colors.gold.main;
const GOLD_DEEP = Colors.primary.deep;
const CARD_BG = "#111a11";
const BORDER = "#1e3a1e";
const TEXT_WHITE = Colors.text.white;
const TEXT_MUTED = "#7a9a7a";

interface QtyPickerProps {
  value: number;
  unit: string;
  onChangeValue: (v: number) => void;
  onChangeUnit: (u: string) => void;
  error?: string;
}

export function QtyPicker({ value, unit, onChangeValue, onChangeUnit, error }: QtyPickerProps) {
  const dec5 = () => onChangeValue(Math.max(0, value - 5));
  const dec1 = () => onChangeValue(Math.max(0, value - 1));
  const inc1 = () => onChangeValue(value + 1);
  const inc5 = () => onChangeValue(value + 5);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.stepBtn, styles.stepBtnMuted]} onPress={dec5} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={[styles.stepLabel, { color: TEXT_MUTED }]}>−5</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.stepBtn, styles.stepBtnMuted]} onPress={dec1} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Feather name="minus" size={16} color={TEXT_WHITE} />
        </TouchableOpacity>
        <TextInput
          style={[
            styles.input,
            { color: TEXT_WHITE, borderColor: error ? Colors.status.error : BORDER },
          ]}
          value={value.toString()}
          onChangeText={(t) => onChangeValue(Number(t.replace(/[^0-9.]/g, "")) || 0)}
          keyboardType="numeric"
          textAlign="center"
          placeholderTextColor={TEXT_MUTED}
          selectionColor={GOLD}
        />
        <TouchableOpacity style={[styles.stepBtn, styles.stepBtnGold]} onPress={inc1} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Feather name="plus" size={16} color={GOLD_DEEP} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.stepBtn, styles.stepBtnGold]} onPress={inc5} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={[styles.stepLabel, { color: GOLD_DEEP }]}>+5</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.units}>
        {Config.units.map((u) => (
          <TouchableOpacity
            key={u}
            style={[
              styles.unitBtn,
              { borderColor: unit === u ? GOLD : BORDER },
              unit === u && { backgroundColor: GOLD + "22" },
            ]}
            onPress={() => onChangeUnit(u)}
          >
            <Text style={[styles.unitText, { color: unit === u ? GOLD : TEXT_MUTED }]}>
              {u}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    width: 38, height: 44, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  stepBtnMuted: { backgroundColor: "#1a2a1a" },
  stepBtnGold: { backgroundColor: GOLD },
  stepLabel: { fontSize: 13, fontFamily: "SpaceGrotesk_700Bold" },
  input: {
    flex: 1, height: 52, borderWidth: 1.5, borderRadius: 12,
    fontSize: 22, fontFamily: "SpaceGrotesk_700Bold",
    backgroundColor: CARD_BG,
  },
  units: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  unitBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  unitText: { fontSize: 13, fontFamily: "SpaceGrotesk_500Medium" },
  error: { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.status.error },
});
