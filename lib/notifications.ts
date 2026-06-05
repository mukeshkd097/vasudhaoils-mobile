import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

// ─── Global notification handler (side-effect on import) ────────────────────
// setNotificationHandler is a no-op / unavailable on web — guard it.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Android channel ─────────────────────────────────────────────────────────
async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("vasudha-default", {
    name: "Vasudha Oils",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#f5a623",
    sound: "default",
    showBadge: true,
  });
}

// ─── Token registration ───────────────────────────────────────────────────────
export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) return null;

  await ensureAndroidChannel();

  const existingPerms = await Notifications.getPermissionsAsync();
  // `granted` exists at runtime on PermissionResponse; cast to access it
  let isGranted = (existingPerms as unknown as { granted: boolean }).granted;

  if (!isGranted) {
    const requested = await Notifications.requestPermissionsAsync();
    isGranted = (requested as unknown as { granted: boolean }).granted;
  }

  if (!isGranted) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined;

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    token = result.data;
  } catch {
    return null;
  }

  // Save to profiles table (non-blocking)
  void supabase.from("profiles").update({ push_token: token }).eq("id", userId);

  return token;
}

// ─── Notification types ───────────────────────────────────────────────────────
export type VendorNotificationType =
  | "pickup_confirmed"
  | "driver_assigned"
  | "driver_en_route"
  | "pickup_completed"
  | "invoice_ready";

export type DriverNotificationType =
  | "route_assigned"
  | "new_pickup_request";

export type NotificationType = VendorNotificationType | DriverNotificationType;

export interface NotificationData {
  type?: NotificationType;
  screen?: string;
  pickupId?: string;
  invoiceId?: string;
  stopId?: string;
  id?: string;
}

// ─── Content builders ─────────────────────────────────────────────────────────
export function buildNotificationContent(
  type: NotificationType,
  params: Record<string, string | number>
): Notifications.NotificationContentInput {
  switch (type) {
    case "pickup_confirmed":
      return {
        title: "Pickup Confirmed ✅",
        body: `Your pickup on ${params.date} at ${params.time}`,
        data: { type, screen: "history", pickupId: params.pickupId },
        sound: "default",
      };
    case "driver_assigned":
      return {
        title: "Driver Assigned 🚛",
        body: `${params.driverName} — ${params.vehicleNumber}`,
        data: { type, screen: "tracking", pickupId: params.pickupId },
        sound: "default",
      };
    case "driver_en_route":
      return {
        title: "Driver En Route 📍",
        body: "Tap to track live location",
        data: { type, screen: "tracking", pickupId: params.pickupId },
        sound: "default",
      };
    case "pickup_completed":
      return {
        title: "Pickup Complete ✅",
        body: `${params.quantity} ${params.unit} collected. Invoice ready.`,
        data: { type, screen: "invoices", invoiceId: params.invoiceId },
        sound: "default",
      };
    case "invoice_ready":
      return {
        title: "Invoice Ready 📄",
        body: `${params.invoiceNumber} · ₹${params.amount}`,
        data: { type, screen: "invoices", invoiceId: params.invoiceId },
        sound: "default",
      };
    case "route_assigned":
      return {
        title: "Route Ready 🗺️",
        body: `${params.stopCount} stops assigned for today`,
        data: { type, screen: "route" },
        sound: "default",
      };
    case "new_pickup_request":
      return {
        title: "New Request ⚡",
        body: `${params.vendorName} needs pickup`,
        data: { type, screen: "route", stopId: params.stopId },
        sound: "default",
      };
  }
}

// ─── Schedule local (dev / testing) ──────────────────────────────────────────
export async function scheduleLocalNotification(
  type: NotificationType,
  params: Record<string, string | number>
): Promise<void> {
  const content = buildNotificationContent(type, params);
  await Notifications.scheduleNotificationAsync({
    content,
    trigger: null,
  });
}
