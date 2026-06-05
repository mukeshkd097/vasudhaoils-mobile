import React, { forwardRef, useRef, useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/Fonts";

const FIELD_HEIGHT = 52;
const BORDER_RADIUS = 12;

function fieldBorder(error?: string, focused?: boolean): string {
  if (error) return Colors.status.error;
  if (focused) return Colors.primary.mid;
  return "#e2e2dd";
}

// ---------- Base Input ----------
interface BaseInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  showPasswordToggle?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

const InputBase = forwardRef<TextInput, BaseInputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      containerStyle,
      showPasswordToggle,
      secureTextEntry,
      clearable,
      onClear,
      value,
      onChangeText,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);
    const [focused, setFocused] = useState(false);

    return (
      <View style={[styles.container, containerStyle]}>
        {!!label && <Text style={styles.label}>{label}</Text>}
        <View
          style={[
            styles.fieldWrapper,
            { borderColor: fieldBorder(error, focused) },
          ]}
        >
          {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[
              styles.input,
              { paddingLeft: leftIcon ? 0 : 14 },
            ]}
            placeholderTextColor={Colors.text.muted}
            secureTextEntry={isSecure}
            {...rest}
          />
          {clearable && !!value && (
            <TouchableOpacity
              style={styles.iconRight}
              onPress={() => {
                onClear?.();
                onChangeText?.("");
              }}
            >
              <Feather name="x" size={18} color={Colors.text.muted} />
            </TouchableOpacity>
          )}
          {showPasswordToggle && (
            <TouchableOpacity
              style={styles.iconRight}
              onPress={() => setIsSecure((p) => !p)}
            >
              <Feather
                name={isSecure ? "eye-off" : "eye"}
                size={18}
                color={Colors.text.muted}
              />
            </TouchableOpacity>
          )}
          {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!error && !!hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
    );
  },
);
InputBase.displayName = "Input";

// ---------- Phone +91 ----------
interface PhoneInputProps {
  label?: string;
  error?: string;
  hint?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
}

function PhoneInput({
  label,
  error,
  hint,
  value,
  onChangeText,
  placeholder = "98765 43210",
  containerStyle,
}: PhoneInputProps) {
  const [focused, setFocused] = useState(false);
  const handleChange = (t: string) =>
    onChangeText(t.replace(/\D/g, "").slice(0, 10));

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.fieldWrapper,
          { borderColor: fieldBorder(error, focused) },
        ]}
      >
        <View style={styles.prefix}>
          <Text style={styles.prefixText}>+91</Text>
        </View>
        <TextInput
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { paddingLeft: 8 }]}
          keyboardType="number-pad"
          maxLength={10}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.muted}
        />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!error && !!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

// ---------- Number with stepper ----------
interface NumberInputProps {
  label?: string;
  error?: string;
  hint?: string;
  value: number;
  onChangeNumber: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  containerStyle?: ViewStyle;
}

function NumberInput({
  label,
  error,
  hint,
  value,
  onChangeNumber,
  min = 0,
  max = 9999,
  step = 1,
  suffix,
  containerStyle,
}: NumberInputProps) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const setValue = (n: number) => onChangeNumber(clamp(n));

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.fieldWrapper,
          { borderColor: fieldBorder(error, false), paddingHorizontal: 4 },
        ]}
      >
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => setValue(value - step)}
          disabled={value <= min}
        >
          <Feather
            name="minus"
            size={18}
            color={value <= min ? Colors.text.muted : Colors.primary.deep}
          />
        </TouchableOpacity>
        <TextInput
          value={String(value)}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/\D/g, ""), 10);
            setValue(Number.isFinite(n) ? n : min);
          }}
          keyboardType="number-pad"
          style={[styles.input, styles.numberInput]}
        />
        {!!suffix && <Text style={styles.suffix}>{suffix}</Text>}
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => setValue(value + step)}
          disabled={value >= max}
        >
          <Feather
            name="plus"
            size={18}
            color={value >= max ? Colors.text.muted : Colors.primary.deep}
          />
        </TouchableOpacity>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!error && !!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

// ---------- OTP (6 boxes) ----------
interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoFocus?: boolean;
}

function OTPInput({
  length = 6,
  value,
  onChange,
  error,
  autoFocus = true,
}: OTPInputProps) {
  const refs = useRef<Array<TextInput | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const setDigit = (i: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length > 1) {
      // paste
      const next = (value + cleaned).replace(/\D/g, "").slice(0, length);
      onChange(next);
      const focusIdx = Math.min(next.length, length - 1);
      refs.current[focusIdx]?.focus();
      return;
    }
    const arr = digits.slice();
    arr[i] = cleaned;
    const joined = arr.join("");
    onChange(joined);
    if (cleaned && i < length - 1) refs.current[i + 1]?.focus();
    if (!cleaned && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={styles.otpRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => {
              refs.current[i] = r;
            }}
            value={d}
            onChangeText={(t) => setDigit(i, t)}
            keyboardType="number-pad"
            maxLength={length}
            autoFocus={autoFocus && i === 0}
            selectTextOnFocus
            style={[
              styles.otpBox,
              {
                borderColor: error
                  ? Colors.status.error
                  : d
                    ? Colors.primary.mid
                    : "#e2e2dd",
              },
            ]}
          />
        ))}
      </View>
      {!!error && <Text style={[styles.error, { textAlign: "center" }]}>{error}</Text>}
    </View>
  );
}

// ---------- Select ----------
export interface SelectOption {
  label: string;
  value: string;
}

interface SelectInputProps {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  value?: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  containerStyle?: ViewStyle;
}

function SelectInput({
  label,
  error,
  hint,
  placeholder = "Select…",
  value,
  options,
  onChange,
  containerStyle,
}: SelectInputProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={[
          styles.fieldWrapper,
          { borderColor: fieldBorder(error, open), paddingHorizontal: 14 },
        ]}
      >
        <Text
          style={[
            styles.selectText,
            { color: selected ? Colors.text.primary : Colors.text.muted },
          ]}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={Colors.text.muted} />
      </TouchableOpacity>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!error && !!hint && <Text style={styles.hint}>{hint}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet}>
            {!!label && <Text style={styles.modalTitle}>{label}</Text>}
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={[
                      styles.modalRow,
                      isSelected && { backgroundColor: Colors.grade.A },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalRowText,
                        isSelected && { color: Colors.primary.deep },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Feather name="check" size={18} color={Colors.primary.deep} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ---------- Search ----------
interface SearchInputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  error?: string;
}

function SearchInput({
  value,
  onChangeText,
  placeholder = "Search…",
  containerStyle,
  error,
}: SearchInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.fieldWrapper,
          { borderColor: fieldBorder(error, focused) },
        ]}
      >
        <View style={styles.iconLeft}>
          <Feather name="search" size={18} color={Colors.text.muted} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.muted}
          style={[styles.input, { paddingLeft: 0 }]}
        />
        {!!value && (
          <TouchableOpacity
            style={styles.iconRight}
            onPress={() => onChangeText("")}
          >
            <Feather name="x" size={18} color={Colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

// ---------- Compound export ----------
type InputComponent = typeof InputBase & {
  Phone: typeof PhoneInput;
  Number: typeof NumberInput;
  OTP: typeof OTPInput;
  Select: typeof SelectInput;
  Search: typeof SearchInput;
};

const InputWithSubcomponents = InputBase as InputComponent;
InputWithSubcomponents.Phone = PhoneInput;
InputWithSubcomponents.Number = NumberInput;
InputWithSubcomponents.OTP = OTPInput;
InputWithSubcomponents.Select = SelectInput;
InputWithSubcomponents.Search = SearchInput;

export const Input = InputWithSubcomponents;

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { gap: 6 },
  label: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.text.primary,
  },
  fieldWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS,
    height: FIELD_HEIGHT,
    backgroundColor: Colors.background.card,
    overflow: "hidden",
  },
  iconLeft: { paddingLeft: 14, paddingRight: 6 },
  iconRight: { paddingHorizontal: 14 },
  input: {
    flex: 1,
    fontSize: 15,
    paddingRight: 14,
    height: "100%",
    color: Colors.text.primary,
    fontFamily: Fonts.regular,
  },
  prefix: {
    paddingLeft: 14,
    paddingRight: 8,
    height: "100%",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#e2e2dd",
  },
  prefixText: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.primary.deep,
  },
  stepBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: Colors.background.secondary,
  },
  numberInput: {
    textAlign: "center",
    fontFamily: Fonts.semibold,
    paddingRight: 0,
  },
  suffix: {
    fontSize: 13,
    color: Colors.text.muted,
    fontFamily: Fonts.medium,
    paddingHorizontal: 6,
  },
  otpRow: { flexDirection: "row", gap: 10, justifyContent: "center" },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1.5,
    fontSize: 22,
    fontFamily: Fonts.bold,
    textAlign: "center",
    color: Colors.text.primary,
    backgroundColor: Colors.background.card,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  error: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.status.error,
  },
  hint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.text.muted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.background.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.text.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalRowText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.text.primary,
  },
});
