// ============================================================
// ADNTmarket.app — Sayabayar.com Payment Gateway Library
// Dokumentasi API: https://sayabayar.com/docs
// ============================================================

import crypto from "crypto";

const SAYABAYAR_BASE = "https://api.sayabayar.com/v1";

// ── Types ──────────────────────────────────────────────────

interface SayabayarConfig {
  apiKey: string;
}

export interface CreateInvoiceParams {
  customerName: string;
  customerEmail: string;
  amount: number;
  description: string;
  redirectUrl?: string;
  expiredMinutes?: number; // 60–10080, default 1440 (24 jam)
}

export interface InvoiceResponse {
  id: string;
  invoice_number: string;
  amount: number;
  amount_to_pay: number;
  unique_code: number;
  payment_url: string;
  redirect_url: string | null;
  status: "pending" | "paid" | "expired";
  expired_at: string;
  created_at: string;
  payment_channel?: {
    channel_type: string;
    channel_owner: string;
    account_name: string;
    unique_code: number;
    amount_to_pay: number;
    qris_string?: string;
    expired_at: string;
  };
}

// ── Webhook Types ─────────────────────────────────────────

export type WebhookEvent = "invoice.paid" | "invoice.expired" | "invoice.cancelled";

export interface WebhookPayload {
  event: WebhookEvent;
  data: {
    invoice_id: string;
    invoice_number: string;
    amount: number;
    amount_unique: number;
    status: string;
    payment_channel: string;
    paid_at: string;
  };
  timestamp: string;
}

export interface ParsedWebhookNotification {
  event: WebhookEvent;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  paymentChannel: string;
  paidAt?: Date;
}

interface SayabayarResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

// ── Config ─────────────────────────────────────────────────

function getConfig(): SayabayarConfig {
  return {
    apiKey: process.env.SAYABAYAR_API_KEY || "",
  };
}

/** Webhook secret dari dashboard Sayabayar */
export function getWebhookSecret(): string {
  return process.env.SAYABAYAR_WEBHOOK_SECRET || "";
}

// ── HTTP Client ────────────────────────────────────────────

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<SayabayarResponse<T>> {
  const config = getConfig();
  const url = `${SAYABAYAR_BASE}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Sayabayar API error (${res.status}): ${errorBody}`);
  }

  return res.json();
}

// ── API Functions ──────────────────────────────────────────

/**
 * Buat invoice pembayaran baru.
 * Channel preference: 'client' — user pilih metode bayar sendiri
 */
export async function createInvoice(
  params: CreateInvoiceParams
): Promise<SayabayarResponse<InvoiceResponse>> {
  return apiRequest<InvoiceResponse>("/invoices", {
    method: "POST",
    body: JSON.stringify({
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      amount: params.amount,
      description: params.description,
      channel_preference: "client",
      redirect_url: params.redirectUrl,
      expired_minutes: params.expiredMinutes ?? 1440,
    }),
  });
}

/**
 * Cek status invoice berdasarkan ID Sayabayar
 */
export async function getInvoice(
  invoiceId: string
): Promise<SayabayarResponse<InvoiceResponse>> {
  return apiRequest<InvoiceResponse>(`/invoices/${invoiceId}`);
}

/**
 * Daftar invoice (opsional: filter by status & page)
 */
export async function listInvoices(params?: {
  status?: string;
  page?: number;
}): Promise<SayabayarResponse<InvoiceResponse[]>> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  const qs = query.toString();
  return apiRequest<InvoiceResponse[]>(`/invoices${qs ? `?${qs}` : ""}`);
}

/**
 * Cek saldo merchant
 */
export async function getBalance(): Promise<
  SayabayarResponse<{
    balance_available: number;
    balance_pending?: number;
  }>
> {
  return apiRequest("/balance");
}

/**
 * Generate order ID unik untuk ADNTmarket
 * Format: ADNT-XXXX-XXXXX
 */
export function generateOrderId(): string {
  const date = new Date();
  const ts = date.getTime().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ADNT-${ts}-${rand}`;
}

// ── Webhook Handling ───────────────────────────────────────

/**
 * Verifikasi signature HMAC-SHA256 dari header X-Webhook-Signature.
 * Gunakan raw body (sebelum JSON.parse) untuk verifikasi.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = getWebhookSecret();
  if (!secret) {
    console.warn("SAYABAYAR_WEBHOOK_SECRET not set — skipping signature verification");
    return true; // pasrah kalau secret belum diset
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Parse webhook payload dari Sayabayar ke format yang seragam.
 * Format: { event: "invoice.paid", data: { invoice_id, ... }, timestamp }
 */
export function parseWebhookPayload(
  payload: WebhookPayload
): ParsedWebhookNotification {
  const { event, data } = payload;

  return {
    event,
    invoiceId: data.invoice_id,
    invoiceNumber: data.invoice_number,
    amount: data.amount,
    status: data.status,
    paymentChannel: data.payment_channel,
    paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
  };
}

/**
 * Map status Sayabayar ke status Payment model
 */
export function mapPaymentStatus(
  sayabayarStatus: string
): "PENDING" | "SETTLED" | "EXPIRED" | "FAILED" {
  switch (sayabayarStatus) {
    case "paid":
      return "SETTLED";
    case "expired":
      return "EXPIRED";
    case "pending":
      return "PENDING";
    case "cancelled":
      return "FAILED";
    default:
      return "PENDING";
  }
}
