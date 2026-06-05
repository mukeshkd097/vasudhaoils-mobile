/**
 * Canonical Vasudha Oils palette.
 *
 * Use `Colors` directly in new code. The legacy default-export
 * (`colors.light.*`) is kept for backward compatibility with screens
 * and the `useColors()` hook — every legacy token is remapped from
 * the canonical `Colors` palette so the brand redesign cascades
 * without touching individual screens.
 */
export const Colors = {
  primary: {
    deep: "#0f3d2e",
    mid: "#1a5c42",
    light: "#2d9b6f",
    accent: "#2dd4a0",
  },
  gold: {
    main: "#f5a623",
    light: "#fde68a",
    dark: "#b87d0e",
  },
  background: {
    primary: "#f8f7f4",
    secondary: "#f0f0ec",
    card: "#ffffff",
    dark: "#0a0f0a",
  },
  text: {
    primary: "#1a1a1a",
    secondary: "#555555",
    muted: "#888888",
    white: "#ffffff",
  },
  status: {
    success: "#2dd4a0",
    warning: "#f5a623",
    error: "#ff4d4d",
    info: "#60a5fa",
  },
  grade: {
    A: "#d1fae5",
    B: "#fef3c7",
    C: "#fee2e2",
  },
};

/**
 * Legacy flat token surface used by `useColors()` and existing screens.
 * Mapping rationale:
 *  - primary           -> gold.main          (gold is the call-to-action color)
 *  - primaryForeground -> primary.deep       (dark green text on gold buttons)
 *  - secondary         -> soft green tint
 *  - accent            -> primary.accent     (bright teal-green highlight)
 *  - destructive       -> status.error
 *  - success           -> primary.accent
 *  - warning           -> gold.main
 *  - greenLight/amberLight -> Colors.grade.A / Colors.gold.light
 */
const colors = {
  light: {
    text: Colors.text.primary,
    tint: Colors.gold.main,

    background: Colors.background.primary,
    foreground: Colors.text.primary,

    card: Colors.background.card,
    cardForeground: Colors.text.primary,

    primary: Colors.gold.main,
    primaryForeground: Colors.primary.deep,

    secondary: "#e8f2ec",
    secondaryForeground: Colors.primary.deep,

    muted: Colors.background.secondary,
    mutedForeground: Colors.text.muted,

    accent: Colors.primary.accent,
    accentForeground: Colors.primary.deep,

    destructive: Colors.status.error,
    destructiveForeground: Colors.text.white,

    success: Colors.primary.accent,
    successForeground: Colors.primary.deep,

    warning: Colors.gold.main,
    warningForeground: Colors.primary.deep,

    border: "#e2e2dd",
    input: "#e2e2dd",

    green: Colors.primary.mid,
    greenLight: Colors.grade.A,
    amber: Colors.gold.main,
    amberLight: Colors.gold.light,
  },
  radius: 12,
};

export default colors;
