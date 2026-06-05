import { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { useDriverStore } from "@/store/driverStore";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";

export const BG_LOCATION_TASK = "VASUDHA_LOCATION_TASK";

const UPLOAD_INTERVAL_MOVING_MS = 10_000;
const UPLOAD_INTERVAL_STATIONARY_MS = 20_000;
const STATIONARITY_SPEED_THRESHOLD = 0.5;
const STATIONARITY_CONSECUTIVE = 3;

async function uploadCoords(
  driverId: string,
  lat: number,
  lng: number,
  accuracy: number | null,
  speed?: number | null,
  heading?: number | null
) {
  try {
    await supabase.from("driver_locations").insert({
      driver_id: driverId,
      latitude: lat,
      longitude: lng,
      accuracy,
      heading: heading ?? null,
      speed: speed ?? null,
    });
  } catch { /* offline */ }
}

if (Platform.OS !== "web") {
  TaskManager.defineTask(
    BG_LOCATION_TASK,
    async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
      if (error) return;
      const { locations } = data as { locations: Location.LocationObject[] };
      const loc = locations[locations.length - 1];
      if (!loc) return;

      const { profile } = useAuthStore.getState();
      if (!profile?.id) return;

      const speed = loc.coords.speed ?? 0;
      const isStationary = speed < STATIONARITY_SPEED_THRESHOLD;

      useDriverStore.getState().setCurrentLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      });

      if (!isStationary) {
        await uploadCoords(
          profile.id,
          loc.coords.latitude,
          loc.coords.longitude,
          loc.coords.accuracy,
          loc.coords.speed,
          loc.coords.heading
        );
      }
    }
  );
}

export function useLocation() {
  const { setCurrentLocation, currentLocation, isOnDuty } = useDriverStore();
  const { profile } = useAuthStore();

  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [bgPermissionStatus, setBgPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isStationary, setIsStationary] = useState(false);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const uploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stationaryCountRef = useRef(0);
  const lastSpeedRef = useRef<number>(1);

  const requestPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      setPermissionStatus("granted" as Location.PermissionStatus);
      return true;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status);
    return status === "granted";
  }, []);

  const requestBgPermission = useCallback(async () => {
    if (Platform.OS === "web") return false;
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      setBgPermissionStatus(status);
      return status === "granted";
    } catch {
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (Platform.OS === "web") {
        return new Promise<{ latitude: number; longitude: number; accuracy: number | null }>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const coords = {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                };
                setCurrentLocation(coords);
                resolve(coords);
              },
              (err) => reject(new Error(err.message))
            );
          }
        );
      }
      const granted = await requestPermission();
      if (!granted) { setError("Location permission denied"); return null; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      };
      setCurrentLocation(coords);
      return coords;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to get location");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [requestPermission, setCurrentLocation]);

  const scheduleUpload = useCallback(
    (stationary: boolean) => {
      if (uploadTimerRef.current) clearTimeout(uploadTimerRef.current);
      const delay = stationary ? UPLOAD_INTERVAL_STATIONARY_MS : UPLOAD_INTERVAL_MOVING_MS;

      uploadTimerRef.current = setTimeout(async () => {
        const current = useDriverStore.getState().currentLocation;
        const driverId = useAuthStore.getState().profile?.id;
        if (current && driverId) {
          const speed = lastSpeedRef.current;
          const nowStationary = speed < STATIONARITY_SPEED_THRESHOLD;
          await uploadCoords(driverId, current.latitude, current.longitude, current.accuracy, speed);
          scheduleUpload(nowStationary);
        }
      }, delay);
    },
    []
  );

  const startTracking = useCallback(async () => {
    if (Platform.OS === "web") return;
    const granted = await requestPermission();
    if (!granted) return;

    setIsTracking(true);
    stationaryCountRef.current = 0;

    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
      (loc) => {
        const speed = loc.coords.speed ?? 0;
        lastSpeedRef.current = speed;

        if (speed < STATIONARITY_SPEED_THRESHOLD) {
          stationaryCountRef.current = Math.min(
            stationaryCountRef.current + 1,
            STATIONARITY_CONSECUTIVE + 1
          );
        } else {
          stationaryCountRef.current = 0;
        }

        const nowStationary = stationaryCountRef.current >= STATIONARITY_CONSECUTIVE;
        setIsStationary(nowStationary);

        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        });
      }
    );
    watchRef.current = sub;
    scheduleUpload(false);

    const hasBg = await requestBgPermission();
    if (hasBg) {
      const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK).catch(() => false);
      if (!alreadyRunning) {
        await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 20000,
          distanceInterval: 30,
          foregroundService: {
            notificationTitle: "Vasudha Oils",
            notificationBody: "Tracking location while on duty",
            notificationColor: "#0f3d2e",
          },
          pausesUpdatesAutomatically: false,
        }).catch(() => {});
      }
    }
  }, [requestPermission, requestBgPermission, setCurrentLocation, scheduleUpload]);

  const stopTracking = useCallback(async () => {
    watchRef.current?.remove();
    watchRef.current = null;
    if (uploadTimerRef.current) {
      clearTimeout(uploadTimerRef.current);
      uploadTimerRef.current = null;
    }
    setIsTracking(false);
    setIsStationary(false);
    if (Platform.OS !== "web") {
      const running = await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK).catch(() => false);
      if (running) await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!isOnDuty) {
      void stopTracking();
      return;
    }
    void startTracking();
    return () => { void stopTracking(); };
  }, [isOnDuty, startTracking, stopTracking]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      void (async () => {
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(status);
        const bg = await Location.getBackgroundPermissionsAsync().catch(() => ({
          status: "undetermined" as Location.PermissionStatus,
        }));
        setBgPermissionStatus(bg.status);
      })();
    }
  }, []);

  return {
    currentLocation,
    permissionStatus,
    bgPermissionStatus,
    isGranted: permissionStatus === "granted",
    isTracking,
    isStationary,
    error,
    isLoading,
    requestPermission,
    requestBgPermission,
    getCurrentLocation,
    startTracking,
    stopTracking,
  };
}
