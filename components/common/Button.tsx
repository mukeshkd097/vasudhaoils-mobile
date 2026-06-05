import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  type TouchableOpacityProps,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/Fonts";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<TouchableOpacityProps, "style"> {
  label: string;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
}

export function Button({
  label,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  haptic = true,
  onPress,
  disabled,
  ...rest
}: ButtonProps) {
  const handlePress: TouchableOpacityProps["onPress"] = (e) => {
    if (haptic) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(e);
  };

  const variantStyle = getVariantStyle(variant);
  const labelColor = getLabelColor(variant);

  return (
    <TouchableOpacity
      style={[
        styles.base,
        sizeStyles[size],
        variantStyle,
        { opacity: disabled || isLoading ? 0.55 : 1 },
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.75}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={labelColor} />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.label,
              getLabelSizeStyle(size),
              { color: labelColor },
              textStyle,
            ]}
          >
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

function getVariantStyle(variant: Variant): ViewStyle {
  switch (variant) {
    case "primary":
      return { backgroundColor: Colors.gold.main };
    case "secondary":
      return {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: Colors.primary.deep,
      };
    case "outline":
      return {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: Colors.gold.main,
      };
    case "ghost":
      return { backgroundColor: "transparent" };
    case "danger":
      return { backgroundColor: Colors.status.error };
  }
}

function getLabelColor(variant: Variant): string {
  switch (variant) {
    case "primary":
      return Colors.primary.deep;
    case "secondary":
      return Colors.primary.deep;
    case "outline":
      return Colors.gold.dark;
    case "ghost":
      return Colors.primary.deep;
    case "danger":
      return Colors.text.white;
  }
}

function getLabelSizeStyle(size: Size): TextStyle {
  switch (size) {
    case "sm":
      return { fontSize: 13 };
    case "md":
      return { fontSize: 15 };
    case "lg":
      return { fontSize: 17 };
  }
}

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { paddingVertical: 8, paddingHorizontal: 14, gap: 6 },
  md: { paddingVertical: 13, paddingHorizontal: 20, gap: 8 },
  lg: { paddingVertical: 16, paddingHorizontal: 24, gap: 10 },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  label: {
    fontFamily: Fonts.semibold,
    letterSpacing: 0.2,
  },
});
