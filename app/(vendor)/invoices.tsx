import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  RefreshControl,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInvoices, type Invoice } from "@/hooks/useInvoices";
import { useAuthStore } from "@/store/authStore";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/Skeleton";
import { useToast } from "@/components/common/Toast";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/Fonts";
import { formatCurrency, formatDate, getStatusColor, getGradeColor } from "@/utils/formatters";
import type { Grade } from "@/utils/formatters";
import {
  fetchInvoiceRenderData,
  downloadInvoice,
  shareInvoiceOnWhatsApp,
  numberToWords,
  type InvoiceRenderData,
} from "@/lib/invoicePdf";

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const { invoices, isLoading, refetch, totalPaid, totalDue } = useInvoices();
  const { show, ToastComponent } = useToast();

  const [selected, setSelected] = useState<Invoice | null>(null);
  const [renderData, setRenderData] = useState<InvoiceRenderData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fetch full render data whenever a modal is opened
  useEffect(() => {
    if (!selected) { setRenderData(null); return; }
    setLoadingData(true);
    fetchInvoiceRenderData(selected.id)
      .then(setRenderData)
      .catch(() => setRenderData(null))
      .finally(() => setLoadingData(false));
  }, [selected?.id]);

  const handleDownload = async () => {
    if (!renderData) return;
    try {
      setBusy(true);
      await downloadInvoice(renderData);
    } catch {
      show({ message: "Could not generate PDF", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!renderData) return;
    try {
      setBusy(true);
      await shareInvoiceOnWhatsApp(renderData);
    } catch {
      show({ message: "Could not share invoice", type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ToastComponent />

      <FlatList
        data={isLoading ? [] : invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={Colors.primary.deep}
          />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View
            style={[
              styles.header,
              {
                paddingTop:
                  (Platform.OS === "web" ? 24 : insets.top) + 8,
              },
            ]}
          >
            <Text style={styles.title}>Invoices</Text>
            <View style={styles.summaryRow}>
              <SummaryCard
                label="Paid"
                value={formatCurrency(totalPaid)}
                bg={Colors.grade.A}
                color={Colors.primary.deep}
              />
              <SummaryCard
                label="Pending"
                value={formatCurrency(totalDue)}
                bg={Colors.gold.light}
                color={Colors.gold.dark}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletons}>
              {[1, 2, 3].map((k) => (
                <SkeletonCard key={k} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="file-text"
              title="No invoices yet"
              description="Invoices will appear after pickups are completed"
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <InvoiceRow item={item} onPress={() => setSelected(item)} />
        )}
      />

      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.modalHandle} />

            {selected && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 20, paddingBottom: 8 }}
              >
                {/* Header */}
                <View style={styles.modalTopRow}>
                  <View>
                    <Text style={styles.modalNumber}>
                      INV-{selected.invoice_number}
                    </Text>
                    <Text style={styles.modalIssued}>
                      Issued {formatDate(selected.issued_date)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelected(null)}
                    style={styles.modalClose}
                  >
                    <Feather name="x" size={22} color={Colors.text.primary} />
                  </TouchableOpacity>
                </View>

                {/* Amount hero */}
                {loadingData ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator color={Colors.primary.deep} />
                  </View>
                ) : renderData ? (
                  <>
                    <AmountHero renderData={renderData} />
                    <TaxBreakdown renderData={renderData} />
                    <CollectionDetails renderData={renderData} />
                    <AmountWords total={renderData.total_amount} />
                  </>
                ) : (
                  <FallbackAmount invoice={selected} />
                )}

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnOutline]}
                    onPress={handleDownload}
                    disabled={busy || !renderData}
                  >
                    {busy ? (
                      <ActivityIndicator
                        size="small"
                        color={Colors.primary.mid}
                      />
                    ) : (
                      <>
                        <Feather
                          name="download"
                          size={18}
                          color={Colors.primary.mid}
                        />
                        <Text
                          style={[
                            styles.actionBtnText,
                            { color: Colors.primary.mid },
                          ]}
                        >
                          PDF
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnGold]}
                    onPress={handleWhatsApp}
                    disabled={busy || !renderData}
                  >
                    <Feather
                      name="share-2"
                      size={18}
                      color={Colors.primary.deep}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: Colors.primary.deep },
                      ]}
                    >
                      WhatsApp
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InvoiceRow({
  item,
  onPress,
}: {
  item: Invoice;
  onPress: () => void;
}) {
  const paid = item.status === "paid";
  const { bg, text } = getStatusColor(item.status);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.invCard}
      onPress={onPress}
    >
      <View style={[styles.invIcon, { backgroundColor: bg }]}>
        <Feather
          name="file-text"
          size={20}
          color={text}
        />
      </View>
      <View style={styles.flex}>
        <Text style={styles.invNumber}>INV-{item.invoice_number}</Text>
        <Text style={styles.invDate}>Due {formatDate(item.due_date)}</Text>
      </View>
      <View style={styles.invRight}>
        <Text style={styles.invAmount}>{formatCurrency(Number(item.amount))}</Text>
        <View style={[styles.statusPill, { backgroundColor: bg }]}>
          <Text style={[styles.statusPillText, { color: text }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SummaryCard({
  label,
  value,
  bg,
  color,
}: {
  label: string;
  value: string;
  bg: string;
  color: string;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: bg }]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

function AmountHero({ renderData: d }: { renderData: InvoiceRenderData }) {
  const { bg, text } = getStatusColor(d.status);
  return (
    <View style={styles.amountHero}>
      <Text style={styles.amountLabel}>Total (incl. GST)</Text>
      <Text style={styles.amountValue}>
        ₹{d.total_amount.toLocaleString("en-IN")}
      </Text>
      <View style={[styles.statusPill, { backgroundColor: bg }]}>
        <Text style={[styles.statusPillText, { color: text }]}>
          {d.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

function TaxBreakdown({ renderData: d }: { renderData: InvoiceRenderData }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tax Breakdown</Text>
      <View style={styles.detailCard}>
        <DetailRow
          label={`${d.oil_type} — Grade ${d.quality_grade}`}
          value={`${d.qty_kg} ${d.unit} × ₹${d.rate_per_kg}`}
          bold
        />
        <DetailRow label="Subtotal" value={`₹${d.subtotal.toLocaleString("en-IN")}`} />
        <DetailRow label="CGST @ 9%" value={`₹${d.cgst.toLocaleString("en-IN")}`} />
        <DetailRow label="SGST @ 9%" value={`₹${d.sgst.toLocaleString("en-IN")}`} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>
            ₹{d.total_amount.toLocaleString("en-IN")}
          </Text>
        </View>
      </View>
    </View>
  );
}

function CollectionDetails({ renderData: d }: { renderData: InvoiceRenderData }) {
  const gradeVal = d.quality_grade as Grade;
  const gradeColors = ["A", "B", "C"].includes(gradeVal)
    ? getGradeColor(gradeVal)
    : { bg: "#f3f4f6", text: "#374151" };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Collection Details</Text>
      <View style={styles.detailCard}>
        <DetailRow label="Vendor" value={d.vendor_name} />
        <DetailRow label="Address" value={d.vendor_address} />
        <DetailRow label="Phone" value={d.vendor_phone} />
        <DetailRow label="Driver" value={d.driver_name} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Grade</Text>
          <View
            style={[
              styles.gradeBadge,
              { backgroundColor: gradeColors.bg },
            ]}
          >
            <Text style={[styles.gradeBadgeText, { color: gradeColors.text }]}>
              Grade {d.quality_grade}
            </Text>
          </View>
        </View>
        <DetailRow label="Collected" value={d.collected_at} />
        <DetailRow label="Invoice Date" value={d.invoice_date} />
        <DetailRow label="Due Date" value={d.due_date} isLast />
      </View>
    </View>
  );
}

function AmountWords({ total }: { total: number }) {
  return (
    <View style={styles.wordsBox}>
      <Feather name="info" size={12} color={Colors.text.muted} />
      <Text style={styles.wordsText}>
        <Text style={{ fontFamily: Fonts.semibold }}>Amount in words: </Text>
        {numberToWords(total)} Rupees Only
      </Text>
    </View>
  );
}

function FallbackAmount({ invoice }: { invoice: Invoice }) {
  return (
    <View style={styles.amountHero}>
      <Text style={styles.amountLabel}>Amount</Text>
      <Text style={styles.amountValue}>{formatCurrency(Number(invoice.amount))}</Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  bold,
  isLast,
}: {
  label: string;
  value: string;
  bold?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.detailRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, bold && { fontFamily: Fonts.bold }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
  list: { paddingHorizontal: 20 },
  header: { gap: 16, marginBottom: 16 },
  title: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryCard: { flex: 1, borderRadius: 18, padding: 16, gap: 6 },
  summaryLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.text.secondary,
  },
  summaryValue: { fontSize: 22, fontFamily: Fonts.bold },
  skeletons: { gap: 12 },

  invCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ececec",
  },
  invIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  invNumber: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.text.primary,
  },
  invDate: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginTop: 3,
  },
  invRight: { alignItems: "flex-end", gap: 5 },
  invAmount: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  statusPillText: { fontSize: 10, fontFamily: Fonts.bold },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: "92%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d0d0c8",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalNumber: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },
  modalIssued: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    marginTop: 3,
  },
  modalClose: { padding: 4 },

  loadingWrap: { paddingVertical: 40, alignItems: "center" },

  amountHero: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
    backgroundColor: Colors.background.secondary,
    borderRadius: 18,
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.text.muted,
  },
  amountValue: {
    fontSize: 36,
    fontFamily: Fonts.bold,
    color: Colors.text.primary,
  },

  section: { gap: 10 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.text.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  detailCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ececec",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0ec",
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.text.primary,
    textAlign: "right",
    flex: 1,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.primary.deep,
  },
  totalValue: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.primary.deep,
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  gradeBadgeText: { fontSize: 12, fontFamily: Fonts.bold },

  wordsBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary.mid,
  },
  wordsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
    lineHeight: 18,
    fontStyle: "italic",
  },

  actionRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: Colors.primary.light,
  },
  actionBtnGold: { backgroundColor: Colors.gold.main },
  actionBtnText: { fontSize: 15, fontFamily: Fonts.semibold },
});
