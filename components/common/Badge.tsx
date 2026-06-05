import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/Fonts";
import {
  formatStatusLabel,
  getGradeColor,
  getStatusColor,
  getSyncColor,
  type Grade,
  type SyncState,
} from "@/utils/formatters";

type BadgeKind = "status" | "grade" | "sync";

interface BadgeProps {
  label?: string;
  kind?: BadgeKind;
  status?: string;
  grade?: Grade;
  sync?: SyncState;
  bg?: string;
  textColor?: string;
  size?: "sm" | "md";
}

export function Badge({
  label,
  kind,
  status,
  grade,
  sync,
  bg,
  textColor,
  size = "md",
}: BadgeProps) {
  const resolved = resolveColors({ kind, status, grade, sync, bg, textColor });
  const displayLabel = resolveLabel({ kind, status, grade, sync, label });

  return (
    <View
      style={[
        styles.badge,
        size === "sm" ? styles.sm : styles.md,
        { backgroundColor: resolved.bg },
      ]}
    >
      <Text
        style={[
          styles.text,
          size === "sm" ? styles.textSm : styles.textMd,
          { color: resolved.text },
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

function resolveColors(args: {
  kind?: BadgeKind;
  status?: string;
  grade?: Grade;
  sync?: SyncState;
  bg?: string;
  textColor?: string;
}): { bg: string; text: string } {
  const fallback = {
    bg: args.bg ?? Colors.background.secondary,
    text: args.textColor ?? Colors.text.secondary,
  };
  const kind = args.kind ?? (args.grade ? "grade" : args.sync ? "sync" : args.status ? "status" : undefined);

  if (kind === "grade" && args.grade) return getGradeColor(args.grade);
  if (kind === "sync" && args.sync) return getSyncColor(args.sync);
  if (kind === "status" && args.status) return getStatusColor(args.status);
  return fallback;
}

function resolveLabel(args: {
  kind?: BadgeKind;
  status?: string;
  grade?: Grade;
  sync?: SyncState;
  label?: string;
}): string {
  if (args.label) return args.label;
  if (args.grade) return `Grade ${args.grade}`;
  if (args.sync) return args.sync === "synced" ? "Synced" : "Pending Sync";
  if (args.status) return formatStatusLabel(args.status);
  return "";
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  sm: { paddingHorizontal: 8, paddingVertical: 2 },
  md: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontFamily: Fonts.semibold, letterSpacing: 0.2 },
  textSm: { fontSize: 10 },
  textMd: { fontSize: 12 },
});
