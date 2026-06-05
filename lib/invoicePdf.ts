import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { format, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Config } from "@/constants/Config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceRenderData {
  invoice_no: string;
  invoice_date: string;
  due_date: string;
  status: string;

  vendor_name: string;
  vendor_address: string;
  vendor_phone: string;

  driver_name: string;
  quality_grade: string;
  collected_at: string;

  oil_type: string;
  qty_kg: number;
  unit: string;
  rate_per_kg: number;

  subtotal: number;
  cgst: number;
  sgst: number;
  total_amount: number;
}

// ─── Number → Words (Indian system) ──────────────────────────────────────────

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigits(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}

function threeDigits(n: number): string {
  if (n < 100) return twoDigits(n);
  const rem = n % 100;
  return ONES[Math.floor(n / 100)] + " Hundred" + (rem ? " and " + twoDigits(rem) : "");
}

export function numberToWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "Zero";

  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const rest = n % 1_000;

  const parts: string[] = [];
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (rest) parts.push(threeDigits(rest));

  return parts.join(" ");
}

// ─── Date helpers (no external dep in template) ───────────────────────────────

function fmtDate(iso: string): string {
  try { return format(parseISO(iso), "dd MMM yyyy"); }
  catch { return iso; }
}

function fmtDateTime(iso: string): string {
  try { return format(parseISO(iso), "dd MMM yyyy, hh:mm a"); }
  catch { return iso; }
}

function fmtPhone(raw: string | null): string {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "");
  const digits = d.startsWith("91") && d.length === 12 ? d.slice(2) : d.slice(-10);
  return digits.length === 10
    ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
    : `+91 ${raw}`;
}

// ─── HTML template ────────────────────────────────────────────────────────────

export function buildTaxInvoiceHtml(d: InvoiceRenderData): string {
  const paid = d.status === "paid";
  const subtotalFmt = d.subtotal.toLocaleString("en-IN");
  const cgstFmt = d.cgst.toLocaleString("en-IN");
  const sgstFmt = d.sgst.toLocaleString("en-IN");
  const totalFmt = d.total_amount.toLocaleString("en-IN");
  const amtWords = numberToWords(d.total_amount);
  const gradeBg: Record<string, string> = { A: "#d1fae5", B: "#fef3c7", C: "#fee2e2" };
  const gradeFg: Record<string, string> = { A: "#0f3d2e", B: "#92400e", C: "#991b1b" };
  const gradeColor = gradeFg[d.quality_grade] ?? "#374151";
  const gradeBgColor = gradeBg[d.quality_grade] ?? "#f3f4f6";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      padding: 36px;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0f3d2e;
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    .brand { font-size: 24px; font-weight: 700; color: #0f3d2e; letter-spacing: -0.5px; }
    .tagline { color: #2dd4a0; font-size: 11px; margin-top: 3px; }
    .brand-sub { color: #555; font-size: 11px; margin-top: 8px; line-height: 1.6; }
    .invoice-title { font-size: 20px; font-weight: 700; color: #0f3d2e; text-align: right; }
    .invoice-meta { font-size: 12px; color: #555; text-align: right; margin-top: 6px; line-height: 1.7; }
    .parties { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
    .parties td { vertical-align: top; padding: 14px 16px; background: #f9fafb;
      border: 1px solid #e5e7eb; width: 50%; }
    .parties td:first-child { border-radius: 8px 0 0 8px; }
    .parties td:last-child { border-radius: 0 8px 8px 0; border-left: none; }
    .section-label { font-size: 10px; font-weight: 700; color: #6b7280;
      letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
    .party-name { font-size: 15px; font-weight: 700; color: #0f3d2e; margin-bottom: 4px; }
    .party-detail { font-size: 12px; color: #555; line-height: 1.6; }
    .badge {
      display: inline-block; padding: 3px 10px; border-radius: 100px;
      font-size: 11px; font-weight: 700;
      background: ${gradeBgColor}; color: ${gradeColor};
    }
    table.items { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    table.items thead tr { background: #0f3d2e; color: #fff; }
    table.items th { padding: 11px 14px; text-align: left; font-size: 12px;
      font-weight: 600; letter-spacing: 0.3px; }
    table.items td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb;
      font-size: 13px; }
    table.items tbody tr:last-child td { border-bottom: none; }
    table.items tbody tr { background: #f9fafb; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 0; }
    table.totals { width: 280px; border-collapse: collapse; }
    table.totals td { padding: 9px 14px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
    table.totals td:last-child { text-align: right; font-weight: 600; }
    tr.total-row { background: #0f3d2e; }
    tr.total-row td { color: #fff; font-size: 16px; font-weight: 700;
      padding: 12px 14px; border-bottom: none; }
    tr.total-row td:first-child { border-radius: 0 0 0 8px; }
    tr.total-row td:last-child { border-radius: 0 0 8px 0; }
    .words { font-size: 12px; color: #555; font-style: italic;
      margin-top: 20px; padding: 12px 16px; background: #f9fafb;
      border-left: 3px solid #0f3d2e; border-radius: 0 6px 6px 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;
      display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-note { font-size: 11px; color: #9ca3af; }
    .stamp {
      border: 2px solid ${paid ? "#0f3d2e" : "#f5a623"};
      border-radius: 6px; padding: 6px 14px;
      font-size: 13px; font-weight: 700;
      color: ${paid ? "#0f3d2e" : "#92400e"};
      background: ${paid ? "#d1fae5" : "#fef3c7"};
      letter-spacing: 1px;
    }
    ${paid ? `
    .paid-watermark {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg);
      font-size: 100px; font-weight: 900; color: rgba(15,61,46,0.07);
      pointer-events: none; white-space: nowrap; z-index: 0;
    }` : ""}
  </style>
</head>
<body>
  ${paid ? '<div class="paid-watermark">PAID</div>' : ""}

  <div class="header">
    <div>
      <div class="brand">VASUDHA OILS</div>
      <div class="tagline">Turning Waste Into Worth</div>
      <div class="brand-sub">
        Bhubaneswar, Odisha 751001<br/>
        GSTIN: ${Config.gstin}<br/>
        Udyam: ${Config.udyam}
      </div>
    </div>
    <div>
      <div class="invoice-title">TAX INVOICE</div>
      <div class="invoice-meta">
        <strong>${d.invoice_no}</strong><br/>
        Issued: ${d.invoice_date}<br/>
        Due: ${d.due_date}
      </div>
    </div>
  </div>

  <table class="parties">
    <tr>
      <td>
        <div class="section-label">Bill To</div>
        <div class="party-name">${d.vendor_name}</div>
        <div class="party-detail">
          ${d.vendor_address}<br/>
          ${d.vendor_phone}
        </div>
      </td>
      <td>
        <div class="section-label">Collection Details</div>
        <div class="party-detail">
          <strong>Driver:</strong> ${d.driver_name}<br/>
          <strong>Grade:</strong>&nbsp;<span class="badge">Grade ${d.quality_grade}</span><br/>
          <strong>Collected:</strong> ${d.collected_at}
        </div>
      </td>
    </tr>
  </table>

  <table class="items">
    <thead>
      <tr>
        <th>HSN</th>
        <th>Description</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>38110</td>
        <td>${d.oil_type} — Grade ${d.quality_grade}</td>
        <td>${d.qty_kg.toLocaleString("en-IN")} ${d.unit}</td>
        <td>₹${d.rate_per_kg}/${d.unit}</td>
        <td>₹${subtotalFmt}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals-wrap">
    <table class="totals">
      <tr>
        <td>Subtotal</td>
        <td>₹${subtotalFmt}</td>
      </tr>
      <tr>
        <td>CGST @ 9%</td>
        <td>₹${cgstFmt}</td>
      </tr>
      <tr>
        <td>SGST @ 9%</td>
        <td>₹${sgstFmt}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL</td>
        <td>₹${totalFmt}</td>
      </tr>
    </table>
  </div>

  <div class="words">
    <strong>Amount in words:</strong> ${amtWords} Rupees Only
  </div>

  <div class="footer">
    <div class="footer-note">
      Computer generated invoice. No signature required.<br/>
      For queries: vasudha.oils@gmail.com
    </div>
    <div class="stamp">${d.status.toUpperCase()}</div>
  </div>
</body>
</html>`;
}

// ─── Fetch all data needed to render the invoice ──────────────────────────────

export async function fetchInvoiceRenderData(
  invoiceId: string
): Promise<InvoiceRenderData> {
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();
  if (invErr || !inv) throw new Error("Invoice not found");

  const [pickupRes, vendorRes] = await Promise.all([
    supabase.from("pickups").select("*").eq("id", inv.pickup_id).single(),
    supabase.from("profiles").select("*").eq("id", inv.vendor_id).single(),
  ]);

  const pickup = pickupRes.data;
  const vendor = vendorRes.data;

  const driverRes = pickup?.driver_id
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", pickup.driver_id)
        .single()
    : { data: null };
  const driver = driverRes.data;

  const unit = pickup?.unit ?? "kg";
  const qty = pickup?.quantity ?? 0;
  const isLitre = unit.toLowerCase().includes("litre") || unit.toLowerCase() === "l";
  const ratePerUnit = isLitre ? Config.ratePerLitre : Config.ratePerKg;
  const subtotal = inv.amount; // stored amount is pre-tax
  const cgst = Math.round(subtotal * 0.09);
  const sgst = Math.round(subtotal * 0.09);
  const total_amount = subtotal + cgst + sgst;

  const collectedAt = pickup?.updated_at ?? pickup?.created_at ?? inv.created_at;

  return {
    invoice_no: inv.invoice_number,
    invoice_date: fmtDate(inv.issued_date),
    due_date: fmtDate(inv.due_date),
    status: inv.status,

    vendor_name: vendor?.business_name ?? vendor?.full_name ?? "Vendor",
    vendor_address: vendor?.address ?? "Bhubaneswar, Odisha",
    vendor_phone: fmtPhone(vendor?.phone ?? null),

    driver_name: driver?.full_name ?? "Vasudha Driver",
    quality_grade: pickup?.grade ?? "A",
    collected_at: fmtDateTime(collectedAt),

    oil_type: pickup?.oil_type ?? "Used Cooking Oil",
    qty_kg: qty,
    unit: unit,
    rate_per_kg: ratePerUnit,

    subtotal,
    cgst,
    sgst,
    total_amount,
  };
}

// ─── PDF generation ───────────────────────────────────────────────────────────

export async function generateInvoicePDF(data: InvoiceRenderData): Promise<string> {
  const html = buildTaxInvoiceHtml(data);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

// ─── Download (share as PDF) ──────────────────────────────────────────────────

export async function downloadInvoice(data: InvoiceRenderData): Promise<void> {
  if (Platform.OS === "web") {
    await Print.printAsync({ html: buildTaxInvoiceHtml(data) });
    return;
  }
  const uri = await generateInvoicePDF(data);
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Invoice ${data.invoice_no}`,
      UTI: "com.adobe.pdf",
    });
  }
}

// ─── WhatsApp share ───────────────────────────────────────────────────────────

export async function shareInvoiceOnWhatsApp(data: InvoiceRenderData): Promise<void> {
  if (Platform.OS === "web") {
    await Print.printAsync({ html: buildTaxInvoiceHtml(data) });
    return;
  }
  const uri = await generateInvoicePDF(data);
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Share Invoice ${data.invoice_no}`,
      UTI: "com.adobe.pdf",
    });
  }
}
