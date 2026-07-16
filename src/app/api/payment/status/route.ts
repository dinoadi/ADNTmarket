import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "order_id diperlukan" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { merchantOrderId: orderId },
      include: {
        tenant: {
          select: { slug: true, namaToko: true, statusAktif: true, status: true },
        },
        plan: {
          select: { nama: true, durasiHari: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: payment.status,
        amount: payment.amount,
        planName: payment.plan.nama,
        tenantSlug: payment.tenant.slug,
        tenantNama: payment.tenant.namaToko,
        tenantAktif: payment.tenant.statusAktif,
        metodePembayaran: payment.metodePembayaran,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error("Payment status error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat status" },
      { status: 500 }
    );
  }
}
