// ============================================================
// ADNTmarket.app — Webhook Notifikasi Pembayaran
// Menerima callback dari Sayabayar.com saat status invoice berubah
//
// Setup di dashboard Sayabayar:
//   Endpoint URL: https://adntmarket.netlify.app/api/payment/notification
//   Events: invoice.paid, invoice.expired, invoice.cancelled
//   Webhook Secret: set di environment variable SAYABAYAR_WEBHOOK_SECRET
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseWebhookPayload,
  mapPaymentStatus,
  verifyWebhookSignature,
  type WebhookPayload,
} from "@/lib/sayabayar";

/**
 * Status events dari Sayabayar yang perlu diproses:
 * - invoice.paid  → SETTLED + aktivasi tenant
 * - invoice.expired → EXPIRED
 * - invoice.cancelled → FAILED
 */
export async function POST(req: NextRequest) {
  try {
    // Baca raw body untuk verifikasi signature
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const eventHeader = req.headers.get("x-webhook-event") || "";

    // Logging
    console.log("[Webhook] Event:", eventHeader, "| Status header:", signature ? "present" : "missing");

    // Verifikasi signature HMAC-SHA256
    if (signature) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error("[Webhook] Invalid signature — possible forgery");
        return NextResponse.json(
          { success: false, error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else {
      console.warn("[Webhook] No signature — skipping verification (dev mode?)");
    }

    // Parse payload
    const payload: WebhookPayload = JSON.parse(rawBody);
    const notification = parseWebhookPayload(payload);
    const { event, invoiceId } = notification;

    console.log(`[Webhook] Processing ${event} for invoice ${invoiceId}`);

    // Cari payment berdasarkan sayabayarInvoiceId
    let payment = await prisma.payment.findFirst({
      where: { sayabayarInvoiceId: invoiceId },
      include: { plan: true, tenant: true },
    });

    // Fallback: cari berdasarkan merchantOrderId (legacy)
    if (!payment) {
      console.log("[Webhook] Payment not found by sayabayarInvoiceId, trying merchantOrderId...");
      // invoice_number kita gunakan sebagai fallback
      const invNum = notification.invoiceNumber;
      if (invNum) {
        // Cari payment yang merchantOrderId mengandung invoice_number
        const allPayments = await prisma.payment.findMany({
          where: { sayabayarInvoiceId: null },
          include: { plan: true, tenant: true },
          take: 20,
          orderBy: { createdAt: "desc" },
        });
        payment = allPayments.find((p) =>
          p.merchantOrderId.includes(invNum.slice(-8))
        ) ?? null;
      }
    }

    if (!payment) {
      console.warn(`[Webhook] Payment not found for invoice: ${invoiceId}`);
      return NextResponse.json({ success: true }); // 200 agar tidak retry
    }

    // Proses berdasarkan event
    const newStatus = mapPaymentStatus(notification.status);

    const updateData: Record<string, unknown> = {
      status: newStatus,
      transactionId: invoiceId,
      metodePembayaran: notification.paymentChannel || null,
    };

    if (event === "invoice.paid" || newStatus === "SETTLED") {
      updateData.paidAt = notification.paidAt ?? new Date();
    }

    // Update payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: updateData as any,
    });

    console.log(`[Webhook] Payment ${payment.id} updated to ${newStatus}`);

    // Kalau SETTLED, aktifkan tenant & set masa berlaku
    if (newStatus === "SETTLED" && payment.tenantId) {
      const now = new Date();
      const durasi = payment.plan.durasiHari;
      const expiredAt = new Date(now.getTime() + durasi * 24 * 60 * 60 * 1000);

      await prisma.tenant.update({
        where: { id: payment.tenantId },
        data: {
          statusAktif: true,
          status: "AKTIF",
          tanggalMulai: payment.tenant?.tanggalMulai ?? now,
          tanggalKedaluwarsa: expiredAt,
        },
      });

      console.log(`[Webhook] Tenant ${payment.tenantId} activated until ${expiredAt.toISOString()}`);
    }

    // Kalau expired/cancelled, nonaktifkan tenant
    if ((event === "invoice.expired" || event === "invoice.cancelled") && payment.tenantId) {
      await prisma.tenant.update({
        where: { id: payment.tenantId },
        data: {
          statusAktif: false,
          status: event === "invoice.expired" ? "NONAKTIF" : "SUSPENDED",
        },
      });

      console.log(`[Webhook] Tenant ${payment.tenantId} deactivated (${event})`);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

/** GET — untuk verifikasi endpoint oleh Sayabayar */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "ADNTmarket Payment Webhook",
    version: "2.0",
  });
}
