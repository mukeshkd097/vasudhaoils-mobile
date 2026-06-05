import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, View, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastProps extends ToastConfig {
  visible: boolean;
  onHide: () => void;
}

const COLORS: Record<ToastType, { bg: string; text: string; icon: string }> = {
  success: { bg: "#166534", text: "#FFFFFF", icon: "check-circle" },
  error: { bg: "#DC2626", text: "#FFFFFF", icon: "x-circle" },
  info: { bg: "#1D4ED8", text: "#FFFFFF", icon: "info" },
  warning: { bg: "#D97706", text: "#FFFFFF", icon: "alert-circle" },
};

export function Toast({ visible, message, type = "info", duration = 3000, onHide }: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      ]).start();
      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 250, useNativeDriver: true }),
        ]).start(() => onHide());
      }, duration);
      return () => clearTimeout(t);
    }
  }, [visible, duration, opacity, translateY, onHide]);

  if (!visible) return null;

  const scheme = COLORS[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: (Platform.OS === "web" ? 67 : insets.top) + 12,
          backgroundColor: scheme.bg,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Feather name={scheme.icon as "info"} size={18} color={scheme.text} />
      <Text style={[styles.message, { color: scheme.text }]}>{message}</Text>
    </Animated.View>
  );
}

export function useToast() {
  const [toast, setToast] = React.useState<{ visible: boolean } & ToastConfig>({
    visible: false,
    message: "",
    type: "info",
  });

  const show = (config: ToastConfig) =>
    setToast({ ...config, visible: true });

  const hide = () => setToast((prev) => ({ ...prev, visible: false }));

  const ToastComponent = () => (
    <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hide} />
  );

  return { show, hide, ToastComponent };
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  message: { fontSize: 14, fontFamily: "SpaceGrotesk_500Medium", flex: 1 },
});
