import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import { Colors } from "@/constants/colors";

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string, fmt = "dd MMM yyyy"): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatDateRelative(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "hh:mm a");
  } catch {
    return "";
  }
}

export function formatQuantity(qty: number, unit: string): string {
  return `${qty.toLocaleString("en-IN")} ${unit}`;
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

export function formatInvoiceNumber(num: string): string {
  return `INV-${num.toUpperCase()}`;
}

export function getStatusColor(status: string): { bg: string; text: string } {
  switch (status.toLowerCase()) {
    case "pending":
      return { bg: Colors.gold.light, text: Colors.gold.dark };
    case "confirmed":
      return { bg: "#dbeafe", text: "#1e40af" };
    case "assigned":
      return { bg: "#e0e7ff", text: "#3730a3" };
    case "en_route":
    case "in_transit":
      return { bg: "#ede9fe", text: "#5b21b6" };
    case "completed":
    case "paid":
      return { bg: Colors.grade.A, text: Colors.primary.deep };
    case "cancelled":
    case "overdue":
      return { bg: Colors.grade.C, text: "#991b1b" };
    case "sent":
      return { bg: "#dbeafe", text: "#1e40af" };
    case "draft":
      return { bg: Colors.background.secondary, text: Colors.text.secondary };
    default:
      return { bg: Colors.background.secondary, text: Colors.text.secondary };
  }
}

export type Grade = "A" | "B" | "C";

export function getGradeColor(grade: Grade): { bg: string; text: string } {
  switch (grade) {
    case "A":
      return { bg: Colors.grade.A, text: Colors.primary.deep };
    case "B":
      return { bg: Colors.grade.B, text: Colors.gold.dark };
    case "C":
      return { bg: Colors.grade.C, text: "#991b1b" };
  }
}

export type SyncState = "synced" | "pending";

export function getSyncColor(state: SyncState): { bg: string; text: string } {
  switch (state) {
    case "synced":
      return { bg: Colors.grade.A, text: Colors.primary.deep };
    case "pending":
      return { bg: Colors.gold.light, text: Colors.gold.dark };
  }
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
