import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";
import { handleApiError } from "@/lib/api-response";
import { formatRupiah } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { toko_slug: string } }) {
  try {
    const auth = getAuthUser(request);
    const tenantId = auth.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant tidak ditemukan" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const periode = searchParams.get("periode") || "today";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Date filter
    let dateFilter: Date | undefined;
    let now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    if (periode === "today") {
      dateFilter = startOfDay(now);
    } else if (periode === "week") {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      dateFilter = startOfDay(weekStart);
    } else if (periode === "month") {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const where: any = { tenantId, deletedAt: null };
    if (periode === "custom" && startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + "T23:59:59.999Z"),
      };
    } else if (dateFilter) {
      where.createdAt = { gte: dateFilter };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        details: { select: { namaProduk: true, qty: true, hargaJual: true, subtotal: true } },
        customer: { select: { nama: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Generate CSV
    const header = "No,Kode Transaksi,Tanggal,Metode Bayar,Pelanggan,Items,Total Belanja,Diskon,Total Setelah Diskon,Nominal Bayar,Kembalian,Status\n";
    const rows = transactions.map((tx, i) => {
      const tgl = tx.createdAt.toLocaleDateString("id-ID") + " " + tx.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const items = tx.details.map((d) => `${d.namaProduk}(${d.qty})`).join("; ");
      const metode = tx.metodePembayaran || "TUNAI";
      const pelanggan = tx.customer?.nama || "-";
      const totalSetelahDiskon = tx.totalBelanja - (tx.diskon || 0);
      // Escape CSV fields
      const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return [
        i + 1,
        tx.kodeTransaksi,
        tgl,
        metode,
        escape(pelanggan),
        escape(items),
        tx.totalBelanja,
        tx.diskon || 0,
        totalSetelahDiskon,
        tx.nominalBayar,
        tx.kembalian,
        tx.status ? "Lunas" : "Pending",
      ].join(",");
    });

    const csv = "\uFEFF" + header + rows.join("\n"); // BOM for Excel UTF-8

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-keuangan-${params.toko_slug}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
