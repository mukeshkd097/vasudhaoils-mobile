import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/Fonts";
import { Config, type UserRole } from "@/constants/Config";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/common/Toast";
import { phone10Schema } from "@/utils/validators";

function OilDropLogo({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M50 6 C50 6 84 44 84 66 A34 34 0 1 1 16 66 C16 44 50 6 50 6 Z"
        fill={Colors.gold.main}
      />
      <Path
        d="M50 30 C40 38 36 50 40 64 C52 58 58 46 56 32 C54 31 52 30 50 30 Z"
        fill={Colors.primary.deep}
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithPhone, isLoading } = useAuth();
  const { setRole } = useAuthStore();
  const { show, ToastComponent } = useToast();

  const [phone, setPhone] = useState("");
  const [role, setSelectedRole] = useState<UserRole>("vendor");
  const [error, setError] = useState<string | null>(null);

  const isValid = /^\d{10}$/.test(phone);

  const handleSendOtp = async () => {
    setError(null);
    const result = phone10Schema.safeParse(phone);
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "Enter a valid 10 digit number");
      return;
    }

    const formattedPhone = `+91${phone}`;
    const { error: authError } = await signInWithPhone(formattedPhone);
    if (authError) {
      show({ message: authError, type: "error" });
      return;
    }
    setRole(role);
    router.push({
      pathname: "/(auth)/otp",
      params: { phone: formattedPhone, role },
    });
  };

  const handleRegister = () => {
    const url = `https://wa.me/${Config.registerWhatsappNumber}?text=${encodeURIComponent(
      "Hi, I would like to register as a new vendor with Vasudha Oils.",
    )}`;
    void Linking.openURL(url);
  };

  return (
    <View style={styles.root}>
      <ToastComponent />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: (Platform.OS === "web" ? 60 : insets.top) + 48,
              paddingBottom: insets.bottom + 32,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandSection}>
            <OilDropLogo size={80} />
            <Text style={styles.appName}>Welcome to Vasudha Oils</Text>
            <Text style={styles.tagline}>Turning Waste Into Worth</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Enter your WhatsApp number</Text>
            <View
              style={[
                styles.phoneField,
                error ? { borderColor: Colors.status.error } : null,
              ]}
            >
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>+91</Text>
              </View>
              <TextInput
                value={phone}
                onChangeText={(t) => {
                  setPhone(t.replace(/\D/g, "").slice(0, 10));
                  setError(null);
                }}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="98765 43210"
                placeholderTextColor={Colors.text.muted}
                style={styles.phoneInput}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (isValid) void handleSendOtp();
                }}
              />
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.roleRow}>
              {(["vendor", "driver"] as UserRole[]).map((r) => {
                const selected = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    activeOpacity={0.85}
                    onPress={() => setSelectedRole(r)}
                    style={[
                      styles.roleBtn,
                      selected ? styles.roleBtnActive : styles.roleBtnInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        { color: selected ? Colors.primary.deep : Colors.text.white },
                      ]}
                    >
                      {r === "vendor" ? "Vendor" : "Driver"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSendOtp}
              disabled={!isValid || isLoading}
              style={[styles.cta, { opacity: !isValid || isLoading ? 0.5 : 1 }]}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color={Colors.primary.deep} />
                  <Text style={styles.ctaText}>Sending...</Text>
                </>
              ) : (
                <Text style={styles.ctaText}>Send OTP via SMS</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerWrap}
              onPress={handleRegister}
              activeOpacity={0.7}
            >
              <Text style={styles.registerText}>
                New vendor? <Text style={styles.registerLink}>Register here</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primary.deep },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  brandSection: { alignItems: "center", gap: 8 },
  appName: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.text.white,
    marginTop: 12,
    textAlign: "center",
  },
  tagline: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.primary.accent,
  },
  form: { marginTop: 48, gap: 16 },
  label: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.text.white,
  },
  phoneField: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: Colors.text.white,
    overflow: "hidden",
  },
  prefix: {
    paddingLeft: 16,
    paddingRight: 10,
    height: "100%",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#e2e2dd",
  },
  prefixText: { fontSize: 16, fontFamily: Fonts.semibold, color: Colors.primary.deep },
  phoneInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.text.primary,
  },
  error: { fontSize: 13, fontFamily: Fonts.regular, color: "#ffb4b4", marginTop: -6 },
  roleRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  roleBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBtnActive: { backgroundColor: Colors.gold.main },
  roleBtnInactive: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
  },
  roleText: { fontSize: 16, fontFamily: Fonts.semibold },
  cta: {
    flexDirection: "row",
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.gold.main,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  ctaText: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.primary.deep },
  registerWrap: { alignItems: "center", marginTop: 8 },
  registerText: { fontSize: 14, fontFamily: Fonts.regular, color: "rgba(255,255,255,0.8)" },
  registerLink: { fontFamily: Fonts.semibold, color: Colors.gold.light },
});
