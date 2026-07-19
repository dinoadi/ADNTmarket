// ============================================================
// ADNTmarket.app — Webhook Notifikasi Pembayaran
// Menerima callback dari Sayabayar.com saat status invoice berubah
//
// Setup di dashboard Sayabayar:
//   Endpoint URL: https://adntmarket.netlify.app/api/payment/notification
//   Method: POST
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWebhookPayload, mapPaymentStatus } from "@/lib/sayabayar";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log("Webhook Sayabayar received:", JSON.stringify(payload));

    // Parse webhook payload
    const notification = parseWebhookPayload(payload);

    // Cari payment berdasarkan sayabayarInvoiceId
    let payment = await prisma.payment.findFirst({
      where: { sayabayarInvoiceId: notification.invoiceId },
      include: { plan: true },
    });

    // Fallback: cari berdasarkan merchantOrderId
    if (!payment && (payload as any).merchant_order_id) {
      payment = await prisma.payment.findUnique({
        where: { merchantOrderId: (payload as any).merchant_order_id },
        include: { plan: true },
      });
    }

    if (!payment) {
      console.warn("Payment not found for invoice:", notification.invoiceId);
      // Tetap return 200 agar Sayabayar tidak retry terus
      return NextResponse.json({ success: true });
    }

    const newStatus = mapPaymentStatus(notification.status);

    // Update payment status
    const updateData: Record<string, unknown> = {
      status: newStatus,
      transactionId: notification.invoiceId,
    };

    if (newStatus === "SETTLED") {
      updateData.paidAt = notification.paidAt
        ? new Date(notification.paidAt)
        : new Date();
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: updateData as any,
    });

    // Kalau payment SETTLED, aktifkan tenant & set masa berlaku
    if (newStatus === "SETTLED" && payment.tenantId) {
      const now = new Date();
      const expiredAt = new Date(now.getTime() + payment.plan.durasiHari * 24 * 60 * 60 * 1000);

      await prisma.tenant.update({
        where: { id: payment.tenantId },
        data: {
          statusAktif: true,
          status: "AKTIF",
          tanggalMulai: now,
          tanggalKedaluwarsa: expiredAt,
        },
      });

      console.log(`Tenant ${payment.tenantId} activated until ${expiredAt.toISOString()}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook Sayabayar error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

// Sayabayar juga bisa melakukan GET untuk verifikasi endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook endpoint ADNTmarket",
  });
}
