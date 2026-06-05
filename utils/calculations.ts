export function calculatePickupTotal(quantity: number, pricePerUnit: number): number {
  return quantity * pricePerUnit;
}

export function calculateGST(amount: number, rate = 0.18): number {
  return amount * rate;
}

export function calculateInvoiceTotal(subtotal: number, gstRate = 0.18): {
  subtotal: number;
  gst: number;
  total: number;
} {
  const gst = calculateGST(subtotal, gstRate);
  return { subtotal, gst, total: subtotal + gst };
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function summarizePickups(pickups: { quantity: number; oil_type: string }[]): Record<string, number> {
  return pickups.reduce(
    (acc, p) => {
      acc[p.oil_type] = (acc[p.oil_type] ?? 0) + p.quantity;
      return acc;
    },
    {} as Record<string, number>
  );
}
