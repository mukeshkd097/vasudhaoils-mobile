import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Vibration,
  Dimensions,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/Fonts";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/components/common/Toast";
import * as Haptics from "expo-haptics";
import type { UserRole } from "@/constants/Config";

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const MAX_RESENDS = 3;
const { width: SW, height: SH } = Dimensions.get("window");

// Responsive box size: 6 boxes, 6px gaps, 32px padding each side
// BOX_W caps at 46 so 6 boxes always fit; BOX_H is taller for a nicer card shape
const BOX_GAP = 6;
const BOX_W = Math.min(46, Math.floor((SW - 64 - (OTP_LENGTH - 1) * BOX_GAP) / OTP_LENGTH));
const BOX_H = 56;

// ─── Stable particle config (module-level — no re-creation on re-render) ─────

const PARTICLES = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  x: ((Math.sin(i * 1.37) + 1) / 2) * SW,
  size: 4 + (i % 4) * 3,
  duration: 3500 + (i % 4) * 1200,
  delay: (i * 550) % 3200,
}));

const CONFETTI_COUNT = 16;
const CONFETTI_ANGLES = Array.from(
  { length: CONFETTI_COUNT },
  (_, i) => (i / CONFETTI_COUNT) * 2 * Math.PI
);
const CONFETTI_PALETTE = [
  Colors.gold.main,
  Colors.primary.accent,
  "#ff6b6b",
  Colors.gold.light,
  "#60a5fa",
  "#a78bfa",
  "#4ade80",
];

// ─── FloatingParticle ─────────────────────────────────────────────────────────

function FloatingParticle({
  x,
  size,
  duration,
  delay,
}: {
  x: number;
  size: number;
  duration: number;
  delay: number;
}) {
  const y = useSharedValue(SH + 20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const run = () => {
      y.value = SH + 20;
      opacity.value = 0;
      y.value = withDelay(delay, withTiming(-60, { duration, easing: Easing.linear }));
      opacity.value = withDelay(
        delay,
        withSequence(
          withTiming(0.5, { duration: 600 }),
          withTiming(0.5, { duration: Math.max(0, duration - 1200) }),
          withTiming(0,   { duration: 600 })
        )
      );
    };
    run();
    const id = setInterval(run, duration + delay + 500);
    return () => clearInterval(id);
  }, []);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: x,
    top: 0,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: Colors.gold.main,
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={style} />;
}

function FloatingParticles() {
  // Skip on web — too many animated nodes in an iframe context
  if (Platform.OS === "web") return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PARTICLES.map((p) => (
        <FloatingParticle key={p.id} {...p} />
      ))}
    </View>
  );
}

// ─── ConfettiPiece ────────────────────────────────────────────────────────────

function ConfettiPiece({
  angle,
  active,
  index,
}: {
  angle: number;
  active: boolean;
  index: number;
}) {
  const color   = CONFETTI_PALETTE[index % CONFETTI_PALETTE.length];
  const dist    = 80 + (index % 5) * 22;
  const isRound = index % 3 === 0;

  const x       = useSharedValue(0);
  const y       = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rot     = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    x.value       = withSpring(Math.cos(angle) * dist,       { damping: 7, stiffness: 70 });
    y.value       = withSpring(Math.sin(angle) * dist - 24,  { damping: 7, stiffness: 70 });
    opacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(650, withTiming(0, { duration: 500 }))
    );
    rot.value = withTiming(index % 2 === 0 ? 480 : -480, { duration: 1100 });
  }, [active]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rot.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        { backgroundColor: color, borderRadius: isRound ? 4 : 1 },
        style,
      ]}
    />
  );
}

// ─── TimerRing ────────────────────────────────────────────────────────────────

function TimerRing({ seconds, total }: { seconds: number; total: number }) {
  const R   = 24;
  const sw  = 2.5;
  const cx  = R + sw;
  const dim = cx * 2;
  const C   = 2 * Math.PI * R;
  const offset = C * (1 - seconds / total);

  return (
    <View style={[styles.timerRingWrap, { width: dim, height: dim }]}>
      <Svg width={dim} height={dim} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={cx} cy={cx} r={R}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={sw}
          fill="none"
        />
        {/* Depleting arc — starts from 12 o'clock */}
        <Circle
          cx={cx} cy={cx} r={R}
          stroke={Colors.gold.main}
          strokeWidth={sw}
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90, ${cx}, ${cx})`}
        />
      </Svg>
      <Text style={styles.timerDigit}>{seconds}</Text>
    </View>
  );
}

// ─── LoadingDots ──────────────────────────────────────────────────────────────

function LoadingDots() {
  const d0 = useSharedValue(1);
  const d1 = useSharedValue(1);
  const d2 = useSharedValue(1);

  useEffect(() => {
    const pulse = (sv: { value: number }, delayMs: number) => {
      sv.value = withRepeat(
        withDelay(
          delayMs,
          withSequence(
            withTiming(0.25, { duration: 340 }),
            withTiming(1,    { duration: 340 })
          )
        ),
        -1,
        false
      );
    };
    pulse(d0, 0);
    pulse(d1, 180);
    pulse(d2, 360);
  }, []);

  const s0 = useAnimatedStyle(() => ({ opacity: d0.value }));
  const s1 = useAnimatedStyle(() => ({ opacity: d1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value }));

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, s0]} />
      <Animated.View style={[styles.dot, s1]} />
      <Animated.View style={[styles.dot, s2]} />
    </View>
  );
}

// ─── Phone formatter ─────────────────────────────────────────────────────────
// Turns "+919197403202" → "+91 91974 03202" (and similar country codes)

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12) {
    // CC(2) + 10-digit mobile — e.g. India +91
    return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 11) {
    // CC(1) + 10-digit — e.g. US +1
    return `+${digits.slice(0, 1)} ${digits.slice(1, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 10) {
    // No country code — split 5+5
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return raw; // unknown shape — show as-is
}

// ─── OtpScreen ────────────────────────────────────────────────────────────────

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { phone, role } = useLocalSearchParams<{ phone: string; role: UserRole }>();
  const { verifyOtp, signInWithPhone, isLoading } = useAuth();
  const { login, setRole } = useAuthStore();
  const { show, ToastComponent } = useToast();

  const [otp,          setOtp]          = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [hasError,     setHasError]     = useState(false);
  const [expired,      setExpired]      = useState(false);
  const [countdown,    setCountdown]    = useState(RESEND_SECONDS);
  const [resendCount,  setResendCount]  = useState(0);
  const [verified,     setVerified]     = useState(false);

  const inputRefs   = useRef<(TextInput | null)[]>([]);
  const verifyingRef = useRef(false);

  // ── Shared values ──────────────────────────────────────────────────────────
  const screenOpacity   = useSharedValue(1);

  const logoScale       = useSharedValue(0);
  const logoY           = useSharedValue(-50);
  const logoFloat       = useSharedValue(0);

  const titleX          = useSharedValue(-SW * 0.6);
  const titleOpacity    = useSharedValue(0);
  const subtitleX       = useSharedValue(SW * 0.6);
  const subtitleOpacity = useSharedValue(0);

  // One shared value per box — hooks cannot be called inside loops
  const b0 = useSharedValue(0.35);
  const b1 = useSharedValue(0.35);
  const b2 = useSharedValue(0.35);
  const b3 = useSharedValue(0.35);
  const b4 = useSharedValue(0.35);
  const b5 = useSharedValue(0.35);
  const boxSVs = useMemo(() => [b0, b1, b2, b3, b4, b5], []);

  const btnY       = useSharedValue(80);
  const btnOpacity = useSharedValue(0);
  const btnScale   = useSharedValue(1);

  const shakeX       = useSharedValue(0);
  const successScale = useSharedValue(0);
  const resendScale  = useSharedValue(0);

  // ── Entrance animations ────────────────────────────────────────────────────
  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 11, stiffness: 140 });
    logoY.value     = withSpring(0, { damping: 14 });

    // Continuous gentle float — 3 s loop
    logoFloat.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming( 8, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Title slides from left (300 ms delay)
    titleX.value       = withDelay(300, withSpring(0, { damping: 20, stiffness: 180 }));
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 350 }));

    // Subtitle slides from right (500 ms delay)
    subtitleX.value       = withDelay(500, withSpring(0, { damping: 20, stiffness: 180 }));
    subtitleOpacity.value = withDelay(500, withTiming(1, { duration: 350 }));

    // OTP boxes stagger pop-in (100 ms between each, starting at 620 ms)
    boxSVs.forEach((sv, i) => {
      sv.value = withDelay(
        620 + i * 100,
        withSpring(1, { damping: 15, stiffness: 200 })
      );
    });

    // Verify button slides up (920 ms delay)
    btnY.value       = withDelay(920, withSpring(0, { damping: 18, stiffness: 160 }));
    btnOpacity.value = withDelay(920, withTiming(1, { duration: 350 }));
  }, []);

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) {
      resendScale.value = withSpring(1, { damping: 10, stiffness: 200 });
      return;
    }
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const triggerShake = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (Platform.OS !== "web") Vibration.vibrate(300);
    shakeX.value = withSequence(
      withTiming(-12, { duration: 45 }),
      withTiming( 12, { duration: 45 }),
      withTiming(-10, { duration: 45 }),
      withTiming( 10, { duration: 45 }),
      withTiming( -5, { duration: 45 }),
      withTiming(  0, { duration: 45 })
    );
  }, []);

  const resetBoxes = useCallback(() => {
    setOtp(Array(OTP_LENGTH).fill(""));
    requestAnimationFrame(() => inputRefs.current[0]?.focus());
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submit = useCallback(
    async (code: string) => {
      if (verifyingRef.current) return;
      verifyingRef.current = true;
      setHasError(false);
      setExpired(false);

      const { error, session } = await verifyOtp(phone ?? "", code);
      verifyingRef.current = false;

      if (error) {
        const msg = error.toLowerCase();
        if (msg.includes("expired")) {
          setExpired(true);
        }
        if (msg.includes("network") || msg.includes("fetch")) {
          show({ message: "Network error. Please try again.", type: "error" });
        } else {
          setHasError(true);
          triggerShake();
          resetBoxes();
        }
        return;
      }

      // ── Success path ────────────────────────────────────────────────────
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setVerified(true);
      successScale.value = withSpring(1, { damping: 10 });
      setTimeout(() => {
        const selectedRole = (role as UserRole) ?? "vendor";
        setRole(selectedRole);
        if (session) void login(session, selectedRole);
        screenOpacity.value = withTiming(0, { duration: 600 });
        // AuthGuard handles the actual redirect once session/profile load
      }, 1500);
    },
    [phone, role, verifyOtp, login, setRole, show, triggerShake, resetBoxes]
  );

  // ── Input handlers ─────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (text: string, index: number) => {
      const cleaned = text.replace(/[^0-9]/g, "");
      if (hasError) setHasError(false);
      if (expired)  setExpired(false);

      // Paste full code
      if (cleaned.length > 1) {
        const filled = Array(OTP_LENGTH).fill("").map((_, i) => cleaned[i] ?? "");
        setOtp(filled);
        if (filled.every(Boolean)) {
          inputRefs.current[OTP_LENGTH - 1]?.blur();
          void submit(filled.join(""));
        }
        return;
      }

      const digit = cleaned.slice(-1);
      const next  = [...otp];
      next[index] = digit;
      setOtp(next);

      if (digit) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Small bounce when a digit lands
        boxSVs[index].value = withSequence(
          withSpring(1.18, { damping: 8 }),
          withSpring(1,    { damping: 14 })
        );
        if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
      }

      if (next.join("").length === OTP_LENGTH && !next.includes("")) {
        inputRefs.current[index]?.blur();
        void submit(next.join(""));
      }
    },
    [otp, hasError, expired, submit, boxSVs]
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const next = [...otp];
        next[index - 1] = "";
        setOtp(next);
      }
    },
    [otp]
  );

  const handleFocus = useCallback(
    (index: number) => {
      setFocusedIndex(index);
      boxSVs[index].value = withSpring(1.06, { damping: 15 });
    },
    [boxSVs]
  );

  const handleBlur = useCallback(
    (index: number) => {
      setFocusedIndex(-1);
      boxSVs[index].value = withSpring(1, { damping: 15 });
    },
    [boxSVs]
  );

  const handleVerifyPress = useCallback(() => {
    btnScale.value = withSequence(withSpring(0.95), withSpring(1));
    const code = otp.join("");
    if (code.length !== OTP_LENGTH || otp.includes("")) {
      setHasError(true);
      triggerShake();
      return;
    }
    void submit(code);
  }, [otp, triggerShake, submit]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || resendCount >= MAX_RESENDS) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resendScale.value = withTiming(0, { duration: 150 });
    const { error } = await signInWithPhone(phone ?? "");
    if (error) {
      show({ message: error, type: "error" });
      resendScale.value = withSpring(1);
      return;
    }
    setResendCount((c) => c + 1);
    setCountdown(RESEND_SECONDS);
    setExpired(false);
    setHasError(false);
    resetBoxes();
    show({ message: "OTP sent again via SMS", type: "info" });
  }, [countdown, resendCount, phone, signInWithPhone, show, resetBoxes]);

  // ── Animated styles ────────────────────────────────────────────────────────
  const screenStyle   = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const logoStyle     = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { translateY: logoY.value + logoFloat.value },
    ],
  }));
  const titleStyle    = useAnimatedStyle(() => ({
    transform: [{ translateX: titleX.value }],
    opacity: titleOpacity.value,
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: subtitleX.value }],
    opacity: subtitleOpacity.value,
  }));

  // Individual box animated styles (no hooks in loops)
  const aBox0 = useAnimatedStyle(() => ({ transform: [{ scale: b0.value }] }));
  const aBox1 = useAnimatedStyle(() => ({ transform: [{ scale: b1.value }] }));
  const aBox2 = useAnimatedStyle(() => ({ transform: [{ scale: b2.value }] }));
  const aBox3 = useAnimatedStyle(() => ({ transform: [{ scale: b3.value }] }));
  const aBox4 = useAnimatedStyle(() => ({ transform: [{ scale: b4.value }] }));
  const aBox5 = useAnimatedStyle(() => ({ transform: [{ scale: b5.value }] }));
  const boxAnimStyles = [aBox0, aBox1, aBox2, aBox3, aBox4, aBox5];

  const shakeStyle   = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const btnWrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: btnY.value }, { scale: btnScale.value }],
    opacity: btnOpacity.value,
  }));
  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));
  const resendBounce = useAnimatedStyle(() => ({
    transform: [{ scale: resendScale.value }],
    opacity: resendScale.value,
  }));

  // ── Box border / background (React state drives this, no animation needed) ─
  const getBoxColorStyle = (index: number) => {
    if (verified) {
      return {
        borderColor: Colors.primary.accent,
        backgroundColor: "rgba(45,212,160,0.18)",
        ...(Platform.OS !== "web" && {
          shadowColor: Colors.primary.accent,
          shadowOpacity: 0.5,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        }),
      };
    }
    if (hasError || expired) {
      return {
        borderColor: Colors.status.error,
        backgroundColor: "rgba(255,77,77,0.1)",
        ...(Platform.OS !== "web" && {
          shadowColor: Colors.status.error,
          shadowOpacity: 0.4,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          elevation: 4,
        }),
      };
    }
    if (focusedIndex === index) {
      return {
        borderColor: Colors.gold.main,
        borderWidth: 2,
        backgroundColor: "rgba(245,166,35,0.12)",
        ...(Platform.OS !== "web" && {
          shadowColor: Colors.gold.main,
          shadowOpacity: 0.8,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }),
      };
    }
    if (otp[index]) {
      return {
        borderColor: Colors.primary.accent,
        backgroundColor: "rgba(45,212,160,0.1)",
      };
    }
    return {
      borderColor: "rgba(255,255,255,0.2)",
      backgroundColor: "rgba(255,255,255,0.05)",
    };
  };

  const canResend    = countdown === 0 && resendCount < MAX_RESENDS;
  const noMoreResend = resendCount >= MAX_RESENDS;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <ToastComponent />
      <FloatingParticles />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: (Platform.OS === "web" ? 60 : insets.top) + 12,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Back ─────────────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.65)" />
          </TouchableOpacity>

          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <Animated.View style={[styles.logoWrap, logoStyle]}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <Text style={styles.logoEmoji}>🛢️</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Title ────────────────────────────────────────────────────── */}
          <Animated.Text style={[styles.title, titleStyle]}>
            Verify your number
          </Animated.Text>

          {/* ── Subtitle ─────────────────────────────────────────────────── */}
          <Animated.Text style={[styles.subtitle, subtitleStyle]}>
            OTP sent to{" "}
            <Text style={styles.phoneHighlight}>{formatPhone(phone ?? "")}</Text>
          </Animated.Text>

          {/* ── OTP boxes ────────────────────────────────────────────────── */}
          <Animated.View style={[styles.otpRow, shakeStyle]}>
            {otp.map((digit, i) => (
              <Animated.View
                key={i}
                style={[styles.otpBox, getBoxColorStyle(i), boxAnimStyles[i]]}
              >
                <TextInput
                  ref={(r) => { inputRefs.current[i] = r; }}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  onFocus={() => handleFocus(i)}
                  onBlur={() => handleBlur(i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  autoFocus={i === 0}
                  textContentType="oneTimeCode"
                  selectTextOnFocus
                  caretHidden
                />
              </Animated.View>
            ))}
          </Animated.View>

          {/* ── Confetti burst (zero-size origin centred on OTP row) ──────── */}
          {verified && (
            <View style={styles.confettiOrigin} pointerEvents="none">
              {CONFETTI_ANGLES.map((angle, i) => (
                <ConfettiPiece key={i} angle={angle} active={verified} index={i} />
              ))}
            </View>
          )}

          {/* ── Success checkmark ────────────────────────────────────────── */}
          {verified && (
            <Animated.View style={[styles.successWrap, successStyle]}>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={styles.successLabel}>Verified!</Text>
            </Animated.View>
          )}

          {/* ── Error / expired label ─────────────────────────────────────── */}
          {(hasError || expired) && !verified && (
            <Text style={styles.errorText}>
              {expired
                ? "OTP expired — tap Resend below"
                : "Incorrect OTP. Please try again."}
            </Text>
          )}

          {/* ── Verify button ─────────────────────────────────────────────── */}
          <Animated.View style={[styles.btnWrap, btnWrapStyle]}>
            <TouchableOpacity
              style={[
                styles.btn,
                verified && styles.btnSuccess,
                isLoading && !verified && styles.btnDisabled,
              ]}
              onPress={handleVerifyPress}
              disabled={isLoading || verified}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <View style={styles.btnRow}>
                  <LoadingDots />
                  <Text style={styles.btnText}>Verifying…</Text>
                </View>
              ) : verified ? (
                <Text style={styles.btnText}>✓  Verified</Text>
              ) : (
                <Text style={styles.btnText}>Verify OTP →</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* ── Resend / timer ────────────────────────────────────────────── */}
          <View style={styles.resendSection}>
            {noMoreResend ? (
              <Text style={styles.resendMuted}>
                Maximum resend attempts reached
              </Text>
            ) : canResend ? (
              <Animated.View style={resendBounce}>
                <TouchableOpacity style={styles.resendBtn} onPress={handleResend}>
                  <Feather
                    name="refresh-cw"
                    size={13}
                    color={Colors.gold.main}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.resendActive}>Resend OTP</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : Platform.OS !== "web" ? (
              <View style={styles.timerRow}>
                <TimerRing seconds={countdown} total={RESEND_SECONDS} />
                <Text style={styles.timerLabel}>Resend in</Text>
              </View>
            ) : (
              <Text style={styles.resendMuted}>Resend in {countdown}s</Text>
            )}
            {resendCount > 0 && resendCount < MAX_RESENDS && (
              <Text style={styles.resendCount}>
                {MAX_RESENDS - resendCount} resend
                {MAX_RESENDS - resendCount > 1 ? "s" : ""} left
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.primary.deep },
  flex:    { flex: 1 },
  content: { paddingHorizontal: 32, flexGrow: 1 },

  back: { alignSelf: "flex-start", padding: 6, marginBottom: 20 },

  logoWrap:  { alignSelf: "center", marginBottom: 32 },
  logoRing:  {
    width: 90, height: 90, borderRadius: 24,
    borderWidth: 1, borderColor: "rgba(245,166,35,0.25)",
    backgroundColor: "rgba(245,166,35,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  logoInner: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: "rgba(245,166,35,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  logoEmoji: { fontSize: 34 },

  title: {
    fontSize: 26, fontFamily: Fonts.bold,
    color: Colors.text.white,
    textAlign: "center", marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, fontFamily: Fonts.regular,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center", marginBottom: 40,
  },
  phoneHighlight: {
    fontFamily: Fonts.semibold, color: Colors.gold.light,
  },

  otpRow: {
    flexDirection: "row", gap: BOX_GAP,
    justifyContent: "center", marginBottom: 28,
  },
  otpBox: {
    width: BOX_W, height: BOX_H, borderRadius: 14,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  otpInput: {
    width: "100%", height: "100%",
    fontSize: 22, fontFamily: Fonts.bold,
    color: Colors.text.white,
    textAlign: "center",
    includeFontPadding: false,
  },

  confettiOrigin: {
    alignSelf: "center", width: 0, height: 0,
    marginTop: -14, marginBottom: 14,
  },
  confettiPiece: { position: "absolute", width: 8, height: 8 },

  successWrap:  { alignItems: "center", marginBottom: 8 },
  successEmoji: { fontSize: 44 },
  successLabel: {
    fontSize: 16, fontFamily: Fonts.semibold,
    color: Colors.primary.accent, marginTop: 4,
  },

  errorText: {
    fontSize: 13, fontFamily: Fonts.medium,
    color: "#ffb4b4",
    textAlign: "center", marginBottom: 8,
  },

  btnWrap:    { width: "100%", marginBottom: 16 },
  btn: {
    height: 56, borderRadius: 14,
    backgroundColor: Colors.gold.main,
    alignItems: "center", justifyContent: "center",
  },
  btnSuccess:  { backgroundColor: Colors.primary.accent },
  btnDisabled: { opacity: 0.55 },
  btnText: {
    fontSize: 16, fontFamily: Fonts.bold,
    color: Colors.primary.deep, letterSpacing: 0.3,
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  dotsRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary.deep },

  resendSection: { alignItems: "center", gap: 6, marginTop: 4 },
  resendBtn: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(245,166,35,0.12)",
    borderWidth: 1, borderColor: "rgba(245,166,35,0.25)",
  },
  resendActive: {
    fontSize: 14, fontFamily: Fonts.semibold, color: Colors.gold.main,
  },
  resendMuted: {
    fontSize: 14, fontFamily: Fonts.regular,
    color: "rgba(255,255,255,0.45)",
  },
  resendCount: {
    fontSize: 12, fontFamily: Fonts.regular,
    color: "rgba(255,255,255,0.35)",
  },

  timerRow:     { flexDirection: "row", alignItems: "center", gap: 10 },
  timerRingWrap:{ alignItems: "center", justifyContent: "center" },
  timerDigit: {
    fontSize: 12, fontFamily: Fonts.bold, color: Colors.gold.main,
  },
  timerLabel: {
    fontSize: 13, fontFamily: Fonts.regular,
    color: "rgba(255,255,255,0.45)",
  },
});
