export const Config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
  appName: "Vasudha Oils",
  appVersion: "1.0.0",

  // ── Business registration — REPLACE BEFORE PRODUCTION ──────────────────
  gstin: "21XXXXX0000X1ZX",            // TODO: replace with real GSTIN
  udyam: "UDYAM-OD-19-0164282",
  /** WhatsApp number for vendor registration & vendor dashboard CTA (with country code, no +) */
  registerWhatsappNumber: "919876543210", // TODO: replace with real WhatsApp number

  oilTypes: ["Sesame Oil", "Coconut Oil", "Groundnut Oil", "Sunflower Oil", "Mustard Oil", "Castor Oil"] as const,
  /** "KG" and "Kg" are kept as-is to match existing database values — do not rename */
  units: ["Litres", "KG", "Kg"] as const,
  containerTypes: ["Drum", "Can", "Barrel", "Bag", "Tanker"] as const,

  ratePerLitre: 25,  // ₹ per litre — update to match current procurement rate
  ratePerKg: 22,     // ₹ per kg   — update to match current procurement rate

  timeSlots: [
    { id: "morning", label: "Morning", hint: "8 AM – 12 PM" },
    { id: "afternoon", label: "Afternoon", hint: "12 – 4 PM" },
    { id: "evening", label: "Evening", hint: "4 – 8 PM" },
  ] as const,

  pickupStatuses: {
    pending: "pending",
    confirmed: "confirmed",
    in_transit: "in_transit",
    completed: "completed",
    cancelled: "cancelled",
    skipped: "skipped",
  } as const,

  invoiceStatuses: {
    draft: "draft",
    sent: "sent",
    paid: "paid",
    overdue: "overdue",
  } as const,

  userRoles: {
    vendor: "vendor",
    driver: "driver",
  } as const,

  pagination: {
    defaultLimit: 20,
  },
} as const;

export type OilType = (typeof Config.oilTypes)[number];
export type Unit = (typeof Config.units)[number];
export type ContainerType = (typeof Config.containerTypes)[number];
export type PickupStatus = (typeof Config.pickupStatuses)[keyof typeof Config.pickupStatuses];
export type InvoiceStatus = (typeof Config.invoiceStatuses)[keyof typeof Config.invoiceStatuses];
export type UserRole = (typeof Config.userRoles)[keyof typeof Config.userRoles];
