import colors from "@/constants/colors";

/**
 * Returns the flat design tokens for the app.
 *
 * The token surface is preserved from the original scaffold for backward
 * compatibility with existing screens. All values are remapped from the
 * canonical `Colors` palette (constants/Colors.ts) via constants/colors.ts.
 *
 * The app is light-only by design; dark surfaces are opted into per
 * component (e.g. `<Card variant="dark" />`).
 */
export function useColors() {
  return { ...colors.light, radius: colors.radius };
}
