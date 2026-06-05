import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import type { NotificationData } from "@/lib/notifications";
import type { UserRole } from "@/constants/Config";

/**
 * Listens for notification taps and navigates to the correct screen.
 * Should be called once inside the root navigator (after navigation is ready).
 */
export function useNotificationDeepLink(role: UserRole | null) {
  // useLastNotificationResponse is not available on web — Platform.OS is a
  // build-time constant so this conditional hook call is safe in React Native.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const lastNotification = Platform.OS !== "web" ? Notifications.useLastNotificationResponse() : null;

  useEffect(() => {
    if (!lastNotification || !role) return;

    const data =
      lastNotification.notification.request.content.data as NotificationData;
    const { screen, pickupId, invoiceId, stopId } = data;

    if (!screen) return;

    if (role === "vendor") {
      switch (screen) {
        case "history":
          router.push(
            pickupId
              ? (`/(vendor)/history?pickupId=${pickupId}` as never)
              : ("/(vendor)/history" as never)
          );
          break;
        case "tracking":
          router.push(
            pickupId
              ? (`/(vendor)/tracking?pickupId=${pickupId}` as never)
              : ("/(vendor)/tracking" as never)
          );
          break;
        case "invoices":
          router.push(
            invoiceId
              ? (`/(vendor)/invoices?invoiceId=${invoiceId}` as never)
              : ("/(vendor)/invoices" as never)
          );
          break;
        default:
          router.push("/(vendor)" as never);
      }
    } else if (role === "driver") {
      switch (screen) {
        case "route":
          router.push(
            stopId
              ? (`/(driver)?pickupId=${stopId}` as never)
              : ("/(driver)" as never)
          );
          break;
        default:
          router.push("/(driver)" as never);
      }
    }
  }, [lastNotification, role]);
}
