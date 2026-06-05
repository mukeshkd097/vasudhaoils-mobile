import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/common/Badge";
import { formatCurrency, formatDate } from "@/utils/formatters";
import type { Invoice } from "@/hooks/useInvoices";

interface InvoiceCardProps {
  invoice: Invoice;
  onPress?: () => void;
  onDownload?: () => void;
}

export function InvoiceCard({ invoice, onPress, onDownload }: InvoiceCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.amberLight }]}>
          <Feather name="file-text" size={20} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.number, { color: colors.foreground }]}>
            INV-{invoice.invoice_number}
          </Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            Issued {formatDate(invoice.issued_date)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: colors.foreground }]}>
            {formatCurrency(Number(invoice.amount))}
          </Text>
          <Badge status={invoice.status} label={invoice.status} size="sm" />
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.dueRow}>
          <Feather name="clock" size={12} color={colors.mutedForeground} />
          <Text style={[styles.due, { color: colors.mutedForeground }]}>
            Due {formatDate(invoice.due_date)}
          </Text>
        </View>
        {!!onDownload && (
          <TouchableOpacity onPress={onDownload} style={styles.downloadBtn}>
            <Feather name="download" size={14} color={colors.primary} />
            <Text style={[styles.downloadText, { color: colors.primary }]}>PDF</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 3 },
  number: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold" },
  date: { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular" },
  right: { alignItems: "flex-end", gap: 4 },
  amount: { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  due: { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular" },
  downloadBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  downloadText: { fontSize: 13, fontFamily: "SpaceGrotesk_500Medium" },
});
