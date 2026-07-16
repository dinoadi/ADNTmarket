// ============================================================
// ADNTmarket.app — Fungsi utilitas umum
// ============================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabung class Tailwind dengan resolusi konflik */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format angka ke Rupiah: 15000 → "Rp 15.000" */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format tanggal ke locale Indonesia */
export function formatDate(
  date: Date | string,
  format: "short" | "long" | "full" = "short"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Jakarta",
  };

  if (format === "short") {
    options.day = "2-digit";
    options.month = "2-digit";
    options.year = "numeric";
  } else if (format === "long") {
    options.day = "2-digit";
    options.month = "short";
    options.year = "numeric";
  } else {
    options.day = "2-digit";
    options.month = "long";
    options.year = "numeric";
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return d.toLocaleDateString("id-ID", options);
}

/** Format tanggal ke ISO untuk API */
export function formatDateISO(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0] ?? "";
}

/** Generate kode transaksi: INV/20241201/00001 */
export function generateKodeTransaksi(
  tanggal: Date,
  nomorUrut: number
): string {
  const tgl = tanggal.toISOString().split("T")[0]?.replace(/-/g, "") ?? "";
  return `INV/${tgl}/${nomorUrut.toString().padStart(5, "0")}`;
}

/** Normalisasi slug: "Toko Pak Kris" → "tokopakkris" */
export function parseSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Debounce utility */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Safe JSON parse */
export function safeJsonParse<T>(str: string | null, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/** Pagination helper */
export function getPaginationParams(
  searchParams: URLSearchParams
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  return { page, limit, skip: (page - 1) * limit };
}
