import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Parsing notifikasi
    const { parseNotification, getPaymentStatus } = await import("@/lib/midtrans");
    const notification = parseNotification(payload);
    const newStatus = getPaymentStatus(notification);

    // Cari payment berdasarkan merchantOrderId
    const payment = await prisma.payment.findUnique({
      where: { merchantOrderId: notification.orderId },
      include: { plan: true },
    });

    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 });
    }

    // Update payment status
    const updateData: Record<string, unknown> = {
      status: newStatus,
      transactionId: notification.orderId,
      metodePembayaran: notification.paymentType,
    };

    if (newStatus === "SETTLED") {
      updateData.paidAt = new Date();
    }

    await prisma.payment.update({
      where: { merchantOrderId: notification.orderId },
      data: updateData as any,
    });

    // Kalau payment SETTLED, aktifkan tenant
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
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Midtrans notification error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
