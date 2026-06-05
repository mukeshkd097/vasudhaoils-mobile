import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = "inbox", title, description, actionLabel, onAction }: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={28} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {!!description && (
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>{description}</Text>
      )}
      {!!actionLabel && !!onAction && (
        <Button label={actionLabel} onPress={onAction} size="sm" style={styles.btn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 12 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontFamily: "SpaceGrotesk_600SemiBold", textAlign: "center" },
  desc: { fontSize: 14, fontFamily: "SpaceGrotesk_400Regular", textAlign: "center", maxWidth: 260 },
  btn: { marginTop: 4 },
});
