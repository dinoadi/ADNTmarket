// ============================================================
// ADNTmarket.app — Sayabayar.com Payment Gateway Library
// Dokumentasi API: https://sayabayar.com/docs
// ============================================================

const SAYABAYAR_BASE = "https://api.sayabayar.com/v1";

interface SayabayarConfig {
  apiKey: string;
}

interface CreateInvoiceParams {
  customerName: string;
  customerEmail: string;
  amount: number;
  description: string;
  redirectUrl?: string;
  expiredMinutes?: number; // 60–10080, default 1440 (24 jam)
}

interface InvoiceResponse {
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

interface SayabayarResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

function getConfig(): SayabayarConfig {
  return {
    apiKey: process.env.SAYABAYAR_API_KEY || "",
  };
}

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
    throw new Error(
      `Sayabayar API error (${res.status}): ${errorBody}`
    );
  }

  return res.json();
}

/**
 * Buat invoice pembayaran baru.
 * Channel preference: 'platform' (default) | 'client' (pakai channel aktif)
 * Payment method opsional: 'qris' | 'bca_transfer'
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
 */
export function generateOrderId(): string {
  const date = new Date();
  const ts = date.getTime().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ADNT-${ts}-${rand}`;
}

/**
 * Parse webhook payload dari Sayabayar.
 * Saat status invoice berubah, Sayabayar POST ke webhook endpoint kita.
 * Format: `{ success: true, data: InvoiceResponse }`
 */
export function parseWebhookPayload(payload: Record<string, unknown>): {
  invoiceId: string;
  status: "pending" | "paid" | "expired";
  amount: number;
  paidAt?: string;
} {
  // Sayabayar mengirim data langsung atau dalam `data` field
  const data = (payload.data ?? payload) as Record<string, unknown>;

  return {
    invoiceId: (data.id ?? data.invoice_id) as string,
    status: (data.status as "pending" | "paid" | "expired") ?? "pending",
    amount: Number(data.amount ?? 0),
    paidAt: data.paid_at as string | undefined,
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
    default:
      return "PENDING";
  }
}
