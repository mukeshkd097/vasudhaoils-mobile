import { useListInvoices, type Invoice as ApiInvoice } from "@workspace/api-client-react";

export type Invoice = ApiInvoice;

export function useInvoices() {
  const { data: invoices = [], isLoading, refetch } = useListInvoices();

  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const totalDue = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const byPickupId = (pickupId: string): Invoice | null =>
    invoices.find((i) => i.pickup_id === pickupId) ?? null;

  return { invoices, isLoading, refetch, totalPaid, totalDue, byPickupId };
}
