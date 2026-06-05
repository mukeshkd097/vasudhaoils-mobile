import { create } from "zustand";
import type { PickupStatus, OilType, Unit } from "@/constants/Config";

export interface Pickup {
  id: string;
  vendor_id: string;
  driver_id: string | null;
  oil_type: OilType | string;
  quantity: number;
  unit: Unit | string;
  status: PickupStatus | string;
  pickup_date: string;
  address: string;
  notes: string | null;
  grade?: "A" | "B" | "C" | string | null;
  condition?: string | null;
  driver_name?: string | null;
  vendor_name?: string | null;
  latitude: number | null;
  longitude: number | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

interface BookingDraft {
  oil_type: string;
  quantity: number;
  unit: string;
  pickup_date: string;
  address: string;
  notes: string;
}

interface PickupStore {
  pickups: Pickup[];
  activePickup: Pickup | null;
  bookingDraft: Partial<BookingDraft>;
  isLoading: boolean;

  setPickups: (pickups: Pickup[]) => void;
  addPickup: (pickup: Pickup) => void;
  updatePickup: (id: string, updates: Partial<Pickup>) => void;
  setActivePickup: (pickup: Pickup | null) => void;
  setBookingDraft: (draft: Partial<BookingDraft>) => void;
  clearBookingDraft: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const usePickupStore = create<PickupStore>((set) => ({
  pickups: [],
  activePickup: null,
  bookingDraft: {},
  isLoading: false,

  setPickups: (pickups) => set({ pickups }),

  addPickup: (pickup) =>
    set((state) => ({ pickups: [pickup, ...state.pickups] })),

  updatePickup: (id, updates) =>
    set((state) => ({
      pickups: state.pickups.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  setActivePickup: (activePickup) => set({ activePickup }),

  setBookingDraft: (draft) =>
    set((state) => ({ bookingDraft: { ...state.bookingDraft, ...draft } })),

  clearBookingDraft: () => set({ bookingDraft: {} }),

  setLoading: (isLoading) => set({ isLoading }),
}));
