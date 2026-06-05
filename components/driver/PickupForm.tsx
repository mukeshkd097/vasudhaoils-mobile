import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Platform,
  ScrollView,
} from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Colors } from "@/constants/colors";
import { Button } from "@/components/common/Button";
import { QtyPicker } from "./QtyPicker";
import { GpsCapture } from "./GpsCapture";
import { pickupFormSchema, type PickupFormData } from "@/utils/validators";
import { Config } from "@/constants/Config";
import type { Pickup } from "@/store/pickupStore";
import type { ScannedPrefill } from "@/store/driverStore";

const GOLD = Colors.gold.main;
const GOLD_DEEP = Colors.primary.deep;
const BORDER = "#1e3a1e";
const TEXT_WHITE = Colors.text.white;
const TEXT_MUTED = "#7a9a7a";
const SECTION_BG = "#0d1a0d";
const INPUT_BG = "#111a11";

const GRADES: Array<{ key: "A" | "B" | "C"; label: string; color: string; bg: string }> = [
  { key: "A", label: "Grade A", color: Colors.primary.accent, bg: Colors.primary.accent + "22" },
  { key: "B", label: "Grade B", color: Colors.gold.main, bg: Colors.gold.main + "22" },
  { key: "C", label: "Grade C", color: Colors.status.error, bg: Colors.status.error + "22" },
];

const CONDITIONS = ["Good", "Slightly Degraded", "Degraded", "Poor"];

export interface PickupFormSubmitData extends PickupFormData {
  latitude?: number;
  longitude?: number;
  photoUri?: string;
}

interface PickupFormProps {
  pickup: Pickup;
  prefill?: ScannedPrefill | null;
  onSubmit: (data: PickupFormSubmitData) => void;
  isLoading?: boolean;
}

export function PickupForm({ pickup, prefill, onSubmit, isLoading }: PickupFormProps) {
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [pendingData, setPendingData] = useState<PickupFormData | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PickupFormData>({
    resolver: zodResolver(pickupFormSchema),
    defaultValues: {
      actual_quantity: pickup.quantity,
      unit: pickup.unit,
      grade: undefined,
      condition: "Good",
      container_type: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (!prefill) return;
    if (prefill.quantity != null) setValue("actual_quantity", prefill.quantity);
    if (prefill.unit) setValue("unit", prefill.unit);
    if (prefill.container_type) setValue("container_type", prefill.container_type);
  }, [prefill, setValue]);

  const unit = watch("unit");
  const quantity = watch("actual_quantity");
  const grade = watch("grade");
  const condition = watch("condition");
  const containerType = watch("container_type");

  const handleCameraCapture = async () => {
    if (Platform.OS === "web") return;
    if (!cameraPermission?.granted) {
      const perm = await requestCameraPermission();
      if (!perm.granted) return;
    }
    setCameraVisible(true);
  };

  const handleTakePicture = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7, skipProcessing: true });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setCameraVisible(false);
      }
    } catch { /* camera error */ }
  };

  const handleReviewPress = handleSubmit((data) => {
    setPendingData(data);
    setConfirmVisible(true);
  });

  const handleConfirm = () => {
    if (!pendingData) return;
    setConfirmVisible(false);
    onSubmit({ ...pendingData, ...gpsCoords, ...(photoUri ? { photoUri } : {}) });
  };

  const gradeStyle = GRADES.find((g) => g.key === grade);

  return (
    <>
      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.handle} />

        {prefill?.oil_type && (
          <View style={styles.prefillBanner}>
            <Feather name="zap" size={12} color={GOLD} />
            <Text style={styles.prefillText}>Pre-filled from QR scan</Text>
          </View>
        )}

        <View style={[styles.oilHeader, { backgroundColor: SECTION_BG }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.oilLabel}>OIL TYPE</Text>
            <Text style={styles.oilName}>{pickup.oil_type}</Text>
          </View>
          <View style={styles.expectedBadge}>
            <Text style={styles.expectedText}>
              Expected: {pickup.quantity} {pickup.unit}
            </Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>ACTUAL QUANTITY</Text>
          <Controller
            control={control}
            name="actual_quantity"
            render={() => (
              <QtyPicker
                value={quantity}
                unit={unit}
                onChangeValue={(v) => setValue("actual_quantity", v)}
                onChangeUnit={(u) => setValue("unit", u)}
                error={errors.actual_quantity?.message}
              />
            )}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CONTAINER TYPE</Text>
          <View style={styles.chips}>
            {Config.containerTypes.map((ct) => (
              <TouchableOpacity
                key={ct}
                style={[
                  styles.chip,
                  { borderColor: containerType === ct ? GOLD : BORDER },
                  containerType === ct && { backgroundColor: GOLD + "22" },
                ]}
                onPress={() => setValue("container_type", containerType === ct ? undefined : ct)}
              >
                <Text style={[styles.chipText, { color: containerType === ct ? GOLD : TEXT_MUTED }]}>
                  {ct}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>OIL GRADE</Text>
          <View style={styles.chips}>
            {GRADES.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[
                  styles.chip,
                  { borderColor: grade === g.key ? g.color : BORDER },
                  grade === g.key && { backgroundColor: g.bg },
                ]}
                onPress={() => setValue("grade", grade === g.key ? undefined : g.key)}
              >
                <Text style={[styles.chipText, { color: grade === g.key ? g.color : TEXT_MUTED }]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>CONDITION</Text>
          <View style={styles.chips}>
            {CONDITIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.chip,
                  { borderColor: condition === c ? GOLD : BORDER },
                  condition === c && { backgroundColor: GOLD + "22" },
                ]}
                onPress={() => setValue("condition", c)}
              >
                <Text style={[styles.chipText, { color: condition === c ? GOLD : TEXT_MUTED }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>PHOTO</Text>
          {photoUri ? (
            <View style={styles.photoRow}>
              <Image source={{ uri: photoUri }} style={styles.thumbnail} />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={styles.photoNote}>Photo captured</Text>
                <TouchableOpacity style={styles.retakeBtn} onPress={handleCameraCapture}>
                  <Feather name="refresh-cw" size={12} color={TEXT_MUTED} />
                  <Text style={styles.retakeBtnText}>Retake</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setPhotoUri(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={16} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoBtn} onPress={handleCameraCapture}>
              <Feather name="camera" size={20} color={TEXT_MUTED} />
              <Text style={styles.photoBtnText}>Capture photo of container</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>GPS LOCATION</Text>
          <GpsCapture onCapture={(coords) => setGpsCoords(coords)} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>NOTES (OPTIONAL)</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.notesInput}
                value={value}
                onChangeText={onChange}
                placeholder="Any remarks about this pickup…"
                placeholderTextColor={TEXT_MUTED}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                selectionColor={GOLD}
              />
            )}
          />
        </View>

        <Button
          label="Review & Confirm"
          isLoading={isLoading}
          onPress={handleReviewPress}
          size="lg"
          style={styles.submit}
        />
      </BottomSheetScrollView>

      <Modal
        visible={cameraVisible}
        animationType="slide"
        onRequestClose={() => setCameraVisible(false)}
      >
        <View style={styles.cameraRoot}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

          <View style={styles.cameraOverlay}>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => setCameraVisible(false)}
            >
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.cameraBottomBar}>
              <Text style={styles.cameraHint}>Point at the container label</Text>
              <TouchableOpacity style={styles.captureBtn} onPress={handleTakePicture}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.summarySheet}>
            <View style={styles.summaryHandle} />
            <Text style={styles.summaryTitle}>Confirm Pickup Details</Text>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <View style={styles.summaryRows}>
                <SummaryRow label="Oil Type" value={pickup.oil_type} />
                <SummaryRow
                  label="Quantity"
                  value={`${pendingData?.actual_quantity ?? ""} ${pendingData?.unit ?? ""}`}
                />
                {pendingData?.container_type && (
                  <SummaryRow label="Container" value={pendingData.container_type} />
                )}
                {pendingData?.grade && (
                  <SummaryRow
                    label="Grade"
                    value={`Grade ${pendingData.grade}`}
                    valueColor={gradeStyle?.color}
                  />
                )}
                {pendingData?.condition && (
                  <SummaryRow label="Condition" value={pendingData.condition} />
                )}
                {gpsCoords && (
                  <SummaryRow
                    label="GPS"
                    value={`${gpsCoords.latitude.toFixed(5)}, ${gpsCoords.longitude.toFixed(5)}`}
                  />
                )}
                {photoUri && <SummaryRow label="Photo" value="1 photo captured" />}
                {pendingData?.notes ? (
                  <SummaryRow label="Notes" value={pendingData.notes} />
                ) : null}
              </View>
            </ScrollView>

            <View style={styles.summaryActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleConfirm}>
                <Feather name="check" size={16} color={GOLD_DEEP} />
                <Text style={styles.submitBtnText}>Submit Pickup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SummaryRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 18, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#2a4a2a", alignSelf: "center", marginBottom: 8,
  },
  prefillBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: GOLD + "18", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: GOLD + "33",
  },
  prefillText: { fontSize: 12, fontFamily: "SpaceGrotesk_500Medium", color: GOLD },
  oilHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderRadius: 12, gap: 12,
  },
  oilLabel: {
    fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold",
    color: TEXT_MUTED, letterSpacing: 1.2, marginBottom: 4,
  },
  oilName: { fontSize: 20, fontFamily: "SpaceGrotesk_700Bold", color: TEXT_WHITE },
  expectedBadge: {
    backgroundColor: GOLD + "22", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  expectedText: { fontSize: 12, fontFamily: "SpaceGrotesk_500Medium", color: GOLD },
  field: { gap: 8 },
  fieldLabel: {
    fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold",
    color: TEXT_MUTED, letterSpacing: 1.2,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: "SpaceGrotesk_500Medium" },
  photoBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER, borderStyle: "dashed",
    backgroundColor: INPUT_BG,
  },
  photoBtnText: { fontSize: 14, fontFamily: "SpaceGrotesk_500Medium", color: TEXT_MUTED },
  photoRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 12,
    backgroundColor: INPUT_BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
  },
  thumbnail: { width: 64, height: 64, borderRadius: 8 },
  photoNote: { fontSize: 13, fontFamily: "SpaceGrotesk_500Medium", color: TEXT_WHITE },
  retakeBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  retakeBtnText: { fontSize: 11, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_MUTED },
  notesInput: {
    backgroundColor: INPUT_BG, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 12, padding: 14, color: TEXT_WHITE,
    fontSize: 14, fontFamily: "SpaceGrotesk_400Regular", minHeight: 80,
  },
  submit: { marginTop: 4 },
  cameraRoot: { flex: 1, backgroundColor: "#000" },
  cameraOverlay: {
    flex: 1, justifyContent: "space-between",
    paddingTop: 60, paddingBottom: 48,
  },
  cameraCloseBtn: {
    alignSelf: "flex-start", marginLeft: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
  },
  cameraBottomBar: { alignItems: "center", gap: 16 },
  cameraHint: {
    fontSize: 14, fontFamily: "SpaceGrotesk_400Regular",
    color: "rgba(255,255,255,0.75)", textAlign: "center",
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  captureInner: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: "#fff",
  },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  summarySheet: {
    backgroundColor: "#0d1a0d", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16, borderTopWidth: 1, borderColor: "#1e3a1e",
  },
  summaryHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#2a4a2a", alignSelf: "center", marginBottom: 4,
  },
  summaryTitle: { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold", color: TEXT_WHITE },
  summaryRows: { gap: 12 },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", gap: 12,
  },
  summaryLabel: {
    fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: TEXT_MUTED, flex: 1,
  },
  summaryValue: {
    fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold", color: TEXT_WHITE,
    flex: 2, textAlign: "right",
  },
  summaryActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  editBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: "center", backgroundColor: "#1a2a1a",
    borderWidth: 1, borderColor: BORDER,
  },
  editBtnText: { fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", color: TEXT_MUTED },
  submitBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: GOLD,
  },
  submitBtnText: { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: GOLD_DEEP },
});
