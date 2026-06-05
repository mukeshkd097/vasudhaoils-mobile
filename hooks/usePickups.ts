import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPickups,
  useCreatePickup,
  useCancelPickup,
  getListPickupsQueryKey,
  type PickupWithDriver,
  type CreatePickupBody,
} from "@workspace/api-client-react";
import type { Pickup } from "@/store/pickupStore";

function toPickup(p: PickupWithDriver): Pickup {
  return {
    ...p,
    quantity: Number(p.quantity),
    driver_id: p.driver_id ?? null,
    notes: p.notes ?? null,
    grade: p.grade ?? null,
    condition: p.condition ?? null,
    driver_name: p.driver_name ?? null,
    vendor_name: null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    qr_code: p.qr_code ?? null,
  };
}

export function usePickups() {
  const queryClient = useQueryClient();

  const { data: rawPickups = [], isLoading, refetch } = useListPickups();
  const pickups = rawPickups.map(toPickup);

  const bookPickupMutation = useCreatePickup({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListPickupsQueryKey() });
      },
    },
  });

  const bookPickup = {
    ...bookPickupMutation,
    mutateAsync: (body: CreatePickupBody) => bookPickupMutation.mutateAsync(body),
    isPending: bookPickupMutation.isPending,
  };

  const cancelPickupMutation = useCancelPickup({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListPickupsQueryKey() });
      },
    },
  });

  const cancelPickup = {
    ...cancelPickupMutation,
    mutateAsync: (id: string) => cancelPickupMutation.mutateAsync(id),
  };

  const getPickupById = useCallback(
    (id: string) => pickups.find((p) => p.id === id) ?? null,
    [pickups],
  );

  const getByStatus = useCallback(
    (status: string) => pickups.filter((p) => p.status === status),
    [pickups],
  );

  const completed = getByStatus("completed");
  const totalKg = completed.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

  return {
    pickups,
    isLoading,
    refetch,
    bookPickup,
    cancelPickup,
    getPickupById,
    getByStatus,
    pending: getByStatus("pending"),
    confirmed: getByStatus("confirmed"),
    inTransit: getByStatus("in_transit"),
    completed,
    totalKg,
    completedCount: completed.length,
  };
}
