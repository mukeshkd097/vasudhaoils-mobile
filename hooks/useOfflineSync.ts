import { useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDriverStore, type OfflinePickupUpdate } from "@/store/driverStore";
import {
  skipPickup,
  startTransit,
  completePickup,
} from "@workspace/api-client-react";
import { Config } from "@/constants/Config";

const QUEUE_KEY = "@vasudha_offline_queue";
const POLL_INTERVAL_MS = 15_000;
const MAX_RETRIES = 8;

function backoffMs(retries: number): number {
  return Math.min(1000 * Math.pow(2, Math.min(retries, 10)), 60_000);
}

async function isOnline(): Promise<boolean> {
  const base = Config.apiUrl || Config.supabaseUrl;
  if (!base) return false;
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(base.replace(/\/+$/, ""), {
      method: "HEAD",
      signal: ctrl.signal,
    });
    clearTimeout(id);
    return res.status < 500;
  } catch {
    return false;
  }
}

async function syncItem(item: OfflinePickupUpdate): Promise<void> {
  const { status, quantity, unit, grade, condition, latitude, longitude, notes } = item.payload;

  if (status === "skipped") {
    await skipPickup(item.id);
  } else if (status === "in_transit") {
    await startTransit(item.id);
  } else if (status === "completed") {
    if (quantity == null || !unit) throw new Error("Missing quantity/unit in completed payload");
    await completePickup(item.id, {
      quantity,
      unit,
      grade: grade as "A" | "B" | "C" | undefined,
      condition,
      latitude,
      longitude,
      notes,
    });
  } else {
    throw new Error(`Unknown offline payload status: ${status}`);
  }
}

export function useOfflineSync() {
  const { offlineQueue, addToOfflineQueue, removeFromOfflineQueue, setSyncStatus } =
    useDriverStore();
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRetryRef = useRef<Record<string, number>>({});

  const persistQueue = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        QUEUE_KEY,
        JSON.stringify(useDriverStore.getState().offlineQueue),
      );
    } catch { /* storage error */ }
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) return;
      const items: OfflinePickupUpdate[] = JSON.parse(raw) as OfflinePickupUpdate[];
      items.forEach((item) => addToOfflineQueue(item));
    } catch { /* ignore */ }
  }, [addToOfflineQueue]);

  const processQueue = useCallback(async () => {
    const queue = useDriverStore.getState().offlineQueue;
    if (queue.length === 0) { setSyncStatus("idle"); return; }

    const online = await isOnline();
    if (!online) { setSyncStatus("error"); return; }

    const now = Date.now();
    const due = queue.filter((item) => {
      const last = lastRetryRef.current[item.id] ?? 0;
      return now - last >= backoffMs(item.retries);
    });
    if (due.length === 0) return;

    setSyncStatus("syncing");
    let anyFailed = false;

    for (const item of due) {
      lastRetryRef.current[item.id] = now;
      try {
        await syncItem(item);
        removeFromOfflineQueue(item.id);
        delete lastRetryRef.current[item.id];
      } catch (err) {
        anyFailed = true;
        const nextRetries = item.retries + 1;
        if (nextRetries >= MAX_RETRIES) {
          // Permanent failure — drop rather than retry forever
          removeFromOfflineQueue(item.id);
          delete lastRetryRef.current[item.id];
          console.warn("[OfflineSync] dropping item after max retries", item.id, err);
        } else {
          addToOfflineQueue({ ...item, retries: nextRetries });
        }
      }
    }

    await persistQueue();
    setSyncStatus(anyFailed ? "error" : "idle");
  }, [addToOfflineQueue, removeFromOfflineQueue, setSyncStatus, persistQueue]);

  const enqueue = useCallback(
    async (item: OfflinePickupUpdate) => {
      addToOfflineQueue(item);
      await AsyncStorage.setItem(
        QUEUE_KEY,
        JSON.stringify(useDriverStore.getState().offlineQueue),
      ).catch(() => {});
      void processQueue();
    },
    [addToOfflineQueue, processQueue],
  );

  useEffect(() => {
    void loadQueue().then(() => void processQueue());
    syncTimerRef.current = setInterval(() => void processQueue(), POLL_INTERVAL_MS);
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [loadQueue, processQueue]);

  return {
    enqueue,
    processQueue,
    queueLength: offlineQueue.length,
  };
}
