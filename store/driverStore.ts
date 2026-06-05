import { create } from "zustand";
import type { Pickup } from "./pickupStore";

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface OfflinePickupUpdate {
  id: string;
  payload: {
    status: string;
    quantity?: number;
    unit?: string;
    grade?: string;
    condition?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  };
  timestamp: number;
  retries: number;
}

export interface ScannedPrefill {
  pickup_id?: string;
  oil_type?: string;
  quantity?: number;
  unit?: string;
  container_type?: string;
  vendor_id?: string;
  address?: string;
}

interface DriverStore {
  assignedPickups: Pickup[];
  currentLocation: LocationCoords | null;
  activeRoute: Pickup | null;
  isOnDuty: boolean;
  scannedCode: string | null;
  scannedPrefill: ScannedPrefill | null;
  offlineQueue: OfflinePickupUpdate[];
  syncStatus: "idle" | "syncing" | "error";

  setAssignedPickups: (pickups: Pickup[]) => void;
  updateAssignedPickup: (id: string, updates: Partial<Pickup>) => void;
  setCurrentLocation: (location: LocationCoords | null) => void;
  setActiveRoute: (pickup: Pickup | null) => void;
  setOnDuty: (isOnDuty: boolean) => void;
  setScannedCode: (code: string | null) => void;
  setScannedPrefill: (prefill: ScannedPrefill | null) => void;
  addToOfflineQueue: (item: OfflinePickupUpdate) => void;
  removeFromOfflineQueue: (id: string) => void;
  clearOfflineQueue: () => void;
  setSyncStatus: (status: "idle" | "syncing" | "error") => void;
  reset: () => void;
}

export const useDriverStore = create<DriverStore>((set) => ({
  assignedPickups: [],
  currentLocation: null,
  activeRoute: null,
  isOnDuty: false,
  scannedCode: null,
  scannedPrefill: null,
  offlineQueue: [],
  syncStatus: "idle",

  setAssignedPickups: (assignedPickups) => set({ assignedPickups }),

  updateAssignedPickup: (id, updates) =>
    set((state) => ({
      assignedPickups: state.assignedPickups.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  setActiveRoute: (activeRoute) => set({ activeRoute }),
  setOnDuty: (isOnDuty) => set({ isOnDuty }),
  setScannedCode: (scannedCode) => set({ scannedCode }),
  setScannedPrefill: (scannedPrefill) => set({ scannedPrefill }),

  addToOfflineQueue: (item) =>
    set((state) => ({
      offlineQueue: [...state.offlineQueue.filter((q) => q.id !== item.id), item],
    })),

  removeFromOfflineQueue: (id) =>
    set((state) => ({
      offlineQueue: state.offlineQueue.filter((q) => q.id !== id),
    })),

  clearOfflineQueue: () => set({ offlineQueue: [] }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),

  reset: () =>
    set({
      assignedPickups: [],
      currentLocation: null,
      activeRoute: null,
      isOnDuty: false,
      scannedCode: null,
      scannedPrefill: null,
      offlineQueue: [],
      syncStatus: "idle",
    }),
}));
