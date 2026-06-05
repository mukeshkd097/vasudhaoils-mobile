import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLocation } from "@/hooks/useLocation";

interface GpsCaptureProps {
  onCapture?: (coords: { latitude: number; longitude: number }) => void;
}

export function GpsCapture({ onCapture }: GpsCaptureProps) {
  const colors = useColors();
  const { currentLocation, isLoading, error, getCurrentLocation } = useLocation();

  const handleCapture = async () => {
    const coords = await getCurrentLocation();
    if (coords) onCapture?.(coords);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.greenLight }]}>
        <Feather name="map-pin" size={22} color={colors.green} />
      </View>
      <View style={styles.info}>
        {currentLocation ? (
          <>
            <Text style={[styles.coordsLabel, { color: colors.mutedForeground }]}>GPS Captured</Text>
            <Text style={[styles.coords, { color: colors.foreground }]}>
              {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
            </Text>
            {currentLocation.accuracy != null && (
              <Text style={[styles.accuracy, { color: colors.mutedForeground }]}>
                Accuracy: ±{Math.round(currentLocation.accuracy)}m
              </Text>
            )}
          </>
        ) : (
          <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
            {error ?? "Tap to capture GPS location"}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: currentLocation ? colors.greenLight : colors.primary }]}
        onPress={handleCapture}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={currentLocation ? colors.green : colors.primaryForeground} />
        ) : (
          <Feather
            name={currentLocation ? "refresh-cw" : "crosshair"}
            size={18}
            color={currentLocation ? colors.green : colors.primaryForeground}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  coordsLabel: { fontSize: 11, fontFamily: "SpaceGrotesk_500Medium" },
  coords: { fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold" },
  accuracy: { fontSize: 11, fontFamily: "SpaceGrotesk_400Regular" },
  placeholder: { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular" },
  btn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
