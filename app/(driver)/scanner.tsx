import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDriverStore } from "@/store/driverStore";
import { useToast } from "@/components/common/Toast";
import { Colors } from "@/constants/colors";
import * as Haptics from "expo-haptics";

const GOLD = Colors.gold.main;
const FRAME_SIZE = 240;
const CORNER = 26;
const THICKNESS = 3;
const TEXT_MUTED = "#7a9a7a";

interface ParsedQR {
  id?: string;
  oil_type?: string;
  vendor_id?: string;
  quantity?: number;
  unit?: string;
  address?: string;
  container_type?: string;
}

function tryParseQR(raw: string): ParsedQR | null {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (typeof obj === "object" && obj !== null) {
      return {
        id: typeof obj.id === "string" ? obj.id : undefined,
        oil_type: typeof obj.oil_type === "string" ? obj.oil_type : undefined,
        vendor_id: typeof obj.vendor_id === "string" ? obj.vendor_id : undefined,
        quantity: typeof obj.quantity === "number" ? obj.quantity : undefined,
        unit: typeof obj.unit === "string" ? obj.unit : undefined,
        address: typeof obj.address === "string" ? obj.address : undefined,
        container_type:
          typeof obj.container_type === "string" ? obj.container_type : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { setScannedCode, setScannedPrefill, scannedCode, assignedPickups } = useDriverStore();
  const { show, ToastComponent } = useToast();
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(true);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [parsedPayload, setParsedPayload] = useState<ParsedQR | null>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLineAnim]);

  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, FRAME_SIZE - 2],
  });

  const processCode = (raw: string) => {
    setIsScanning(false);
    setLastScanned(raw);
    setScannedCode(raw);

    const parsed = tryParseQR(raw);
    setParsedPayload(parsed);

    const matchedById = parsed?.id
      ? assignedPickups.find((p) => p.id === parsed.id)
      : null;
    const matchedByQr = !matchedById
      ? assignedPickups.find((p) => p.qr_code === raw)
      : null;
    const matched = matchedById ?? matchedByQr;

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (parsed) {
      setScannedPrefill({
        pickup_id: matched?.id ?? parsed.id,
        oil_type: parsed.oil_type,
        quantity: parsed.quantity,
        unit: parsed.unit,
        container_type: parsed.container_type,
        vendor_id: parsed.vendor_id,
        address: parsed.address,
      });
    }

    if (matched) {
      show({ message: `Matched: ${matched.oil_type} — opening form`, type: "success" });
      setTimeout(() => {
        router.push({ pathname: "/(driver)", params: { pickupId: matched.id } });
      }, 700);
    } else if (parsed?.oil_type) {
      show({ message: `QR: ${parsed.oil_type} — no matching stop found`, type: "info" });
    } else {
      show({ message: `Code scanned: ${raw.slice(0, 30)}`, type: "info" });
    }

    setTimeout(() => setIsScanning(true), 2500);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!isScanning || data === lastScanned) return;
    processCode(data);
  };

  const handleManualSubmit = () => {
    const code = manualInput.trim();
    if (!code) return;
    setManualVisible(false);
    setManualInput("");
    processCode(code);
  };

  const handleClear = () => {
    setScannedCode(null);
    setScannedPrefill(null);
    setLastScanned(null);
    setParsedPayload(null);
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.background.dark }]}>
        <Text style={styles.permDesc}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: Colors.background.dark }]}>
        <View style={styles.permIcon}>
          <Feather name="camera-off" size={32} color={TEXT_MUTED} />
        </View>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permDesc}>
          Allow camera access to scan QR codes on pickup containers
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View style={[styles.center, { backgroundColor: Colors.background.dark }]}>
        <View style={styles.permIcon}>
          <Feather name="camera" size={32} color={TEXT_MUTED} />
        </View>
        <Text style={styles.permTitle}>Scanner not available on web</Text>
        <Text style={styles.permDesc}>Use the Expo Go app on your phone to scan QR codes</Text>
        <TouchableOpacity style={styles.permBtn} onPress={() => setManualVisible(true)}>
          <Text style={styles.permBtnText}>Enter Code Manually</Text>
        </TouchableOpacity>
        <ManualEntryModal
          visible={manualVisible}
          value={manualInput}
          onChange={setManualInput}
          onSubmit={handleManualSubmit}
          onClose={() => { setManualVisible(false); setManualInput(""); }}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ToastComponent />
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "code39", "ean13", "ean8"] }}
        enableTorch={flashEnabled}
      />

      <View style={styles.overlay}>
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.scanTitle}>Scan QR Code</Text>
          <Text style={styles.scanSubtitle}>Point at a pickup container QR code</Text>
          <View style={styles.topActions}>
            <TouchableOpacity
              style={[styles.iconBtn, flashEnabled && styles.iconBtnActive]}
              onPress={() => setFlashEnabled(!flashEnabled)}
            >
              <Feather name="zap" size={18} color={flashEnabled ? Colors.primary.deep : "#fff"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setManualVisible(true)}>
              <Feather name="edit-3" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]}
            />
          </View>
        </View>

        <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 100 }]}>
          {scannedCode ? (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Feather name="check-circle" size={16} color={Colors.primary.accent} />
                <Text style={styles.resultTitle}>Code Scanned</Text>
                <TouchableOpacity
                  onPress={handleClear}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              </View>
              {parsedPayload?.oil_type ? (
                <View style={styles.parsedRows}>
                  <ParsedRow label="Oil Type" value={parsedPayload.oil_type} />
                  {parsedPayload.quantity !== undefined && (
                    <ParsedRow
                      label="Quantity"
                      value={`${parsedPayload.quantity} ${parsedPayload.unit ?? ""}`}
                    />
                  )}
                  {parsedPayload.container_type && (
                    <ParsedRow label="Container" value={parsedPayload.container_type} />
                  )}
                  {parsedPayload.address && (
                    <ParsedRow label="Address" value={parsedPayload.address} />
                  )}
                  {parsedPayload.id && (
                    <View style={styles.navigatingHint}>
                      <Feather name="arrow-right-circle" size={13} color={GOLD} />
                      <Text style={styles.navigatingText}>Navigating to pickup form…</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.resultRaw} numberOfLines={2}>
                  {scannedCode}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.hint}>
              {isScanning ? "Scanning…" : "Code processed"}
            </Text>
          )}
        </View>
      </View>

      <ManualEntryModal
        visible={manualVisible}
        value={manualInput}
        onChange={setManualInput}
        onSubmit={handleManualSubmit}
        onClose={() => { setManualVisible(false); setManualInput(""); }}
      />
    </View>
  );
}

function ParsedRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.parsedRow}>
      <Text style={styles.parsedLabel}>{label}</Text>
      <Text style={styles.parsedValue}>{value}</Text>
    </View>
  );
}

function ManualEntryModal({
  visible,
  value,
  onChange,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  value: string;
  onChange: (t: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.manualOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.manualSheet}>
          <View style={styles.manualHandle} />
          <Text style={styles.manualTitle}>Enter Code Manually</Text>
          <TextInput
            style={styles.manualInput}
            value={value}
            onChangeText={onChange}
            placeholder="Paste or type pickup code…"
            placeholderTextColor={TEXT_MUTED}
            autoCapitalize="none"
            autoFocus
            selectionColor={GOLD}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
          <View style={styles.manualActions}>
            <TouchableOpacity style={styles.manualCancelBtn} onPress={onClose}>
              <Text style={styles.manualCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manualConfirmBtn} onPress={onSubmit}>
              <Text style={styles.manualConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  permIcon: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: "center", justifyContent: "center", backgroundColor: "#111a11",
  },
  permTitle: {
    fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: "#fff", textAlign: "center",
  },
  permDesc: {
    fontSize: 14, fontFamily: "SpaceGrotesk_400Regular",
    color: TEXT_MUTED, textAlign: "center", lineHeight: 20,
  },
  permBtn: {
    backgroundColor: GOLD, paddingHorizontal: 24, paddingVertical: 13,
    borderRadius: 12, marginTop: 8,
  },
  permBtnText: {
    fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.primary.deep,
  },
  overlay: { flex: 1, justifyContent: "space-between" },
  topBar: { alignItems: "center", gap: 6, paddingHorizontal: 20, paddingBottom: 12 },
  scanTitle: { fontSize: 20, fontFamily: "SpaceGrotesk_700Bold", color: "#fff" },
  scanSubtitle: {
    fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: "rgba(255,255,255,0.65)",
  },
  topActions: { flexDirection: "row", gap: 12, marginTop: 6 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  iconBtnActive: { backgroundColor: GOLD },
  frameWrap: { alignItems: "center", justifyContent: "center", flex: 1 },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE, position: "relative", overflow: "hidden" },
  corner: { position: "absolute", width: CORNER, height: CORNER, borderColor: GOLD },
  tl: { top: 0, left: 0, borderTopWidth: THICKNESS, borderLeftWidth: THICKNESS, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderTopWidth: THICKNESS, borderRightWidth: THICKNESS, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderBottomWidth: THICKNESS, borderLeftWidth: THICKNESS, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderBottomWidth: THICKNESS, borderRightWidth: THICKNESS, borderBottomRightRadius: 4 },
  scanLine: {
    position: "absolute", left: 6, right: 6, height: 2,
    backgroundColor: GOLD, opacity: 0.85,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6,
  },
  bottomArea: { alignItems: "center", paddingHorizontal: 20, gap: 8 },
  resultCard: {
    backgroundColor: "rgba(0,0,0,0.82)", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.primary.accent + "44",
    maxWidth: 360, width: "100%", gap: 10,
  },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultTitle: { flex: 1, color: "#fff", fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold" },
  resultRaw: {
    color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "SpaceGrotesk_400Regular",
  },
  parsedRows: { gap: 6 },
  parsedRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  parsedLabel: { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_MUTED },
  parsedValue: {
    fontSize: 12, fontFamily: "SpaceGrotesk_600SemiBold", color: "#fff",
    textAlign: "right", flex: 1,
  },
  navigatingHint: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  navigatingText: { fontSize: 12, fontFamily: "SpaceGrotesk_500Medium", color: GOLD },
  hint: {
    fontSize: 13, fontFamily: "SpaceGrotesk_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
  manualOverlay: {
    flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)",
  },
  manualSheet: {
    backgroundColor: "#0d1a0d", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 16, borderTopWidth: 1, borderColor: "#1e3a1e",
  },
  manualHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#2a4a2a", alignSelf: "center", marginBottom: 4,
  },
  manualTitle: { fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: "#fff" },
  manualInput: {
    backgroundColor: "#111a11", borderWidth: 1.5, borderColor: "#1e3a1e",
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: "#fff", fontSize: 15, fontFamily: "SpaceGrotesk_400Regular",
  },
  manualActions: { flexDirection: "row", gap: 12 },
  manualCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: "center", backgroundColor: "#1a2a1a",
  },
  manualCancelText: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", color: TEXT_MUTED },
  manualConfirmBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    alignItems: "center", backgroundColor: GOLD,
  },
  manualConfirmText: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.primary.deep },
});
