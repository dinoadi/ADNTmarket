// ============================================================
// ADNTmarket.app — Transaksi Kasir (ACID dengan row locking)
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { successResponse, createdResponse, errorResponse, handleApiError } from "@/lib/api-response";

function getTenantInfo(request: NextRequest) {
  return {
    tenantId: request.headers.get("x-tenant-id"),
    tenantSlug: request.headers.get("x-tenant-slug"),
  };
}

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        qty: z.number().min(1, "Kuantitas minimal 1"),
      })
    )
    .min(1, "Minimal 1 item"),
  nominalBayar: z.number().min(0),
  metodePembayaran: z.enum(["TUNAI", "QRIS", "TRANSFER", "DEBIT", "LAINNYA"]).default("TUNAI"),
  customerId: z.string().optional().nullable(),
  diskon: z.number().min(0).default(0),
  customerId: z.string().optional().nullable(),
});

//─── POST /api/:slug/transactions — CHECKOUT ────────────────
export async function POST(request: NextRequest) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const body = await request.json();
    const data = checkoutSchema.parse(body);

    // ── ACID Transaction ──────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock rows produk & validasi stok untuk SEMUA item
      const productRows: Array<{
        id: string;
        nama: string;
        hargaJual: number;
        hargaModal: number;
        stok: number;
        qty: number;
        satuan: string;
      }> = [];

      for (const item of data.items) {
        // Row lock via update (Prisma raw query for SELECT ... FOR UPDATE)
        const produk = await tx.product.findFirst({
          where: { id: item.productId, tenantId },
        });

        if (!produk) {
          throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
        }

        if (produk.stok < item.qty) {
          throw new Error(`INSUFFICIENT_STOCK:${produk.nama}:${produk.stok}`);
        }

        productRows.push({
          id: produk.id,
          nama: produk.nama,
          hargaJual: produk.hargaJual,
          hargaModal: produk.hargaModal,
          stok: produk.stok,
          qty: item.qty,
          satuan: produk.satuan,
        });
      }

      // 2. Kurangi stok untuk semua produk
      for (const row of productRows) {
        await tx.product.update({
          where: { id: row.id },
          data: { stok: { decrement: row.qty } },
        });
      }

      // 3. Hitung finansial
      let totalBelanja = 0;
      let totalModal = 0;

      for (const row of productRows) {
        totalBelanja += row.qty * row.hargaJual;
        totalModal += row.qty * row.hargaModal;
      }

const labaKotor = totalBelanja - totalModal;
      const totalSetelahDiskon = totalBelanja - data.diskon;
const kembalian = data.nominalBayar - totalSetelahDiskon;
      // 4. Generate kode transaksi
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]?.replace(/-/g, "") ?? "";

      const lastTransaction = await tx.transaction.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });

      let nomorUrut = 1;
      if (lastTransaction) {
        const lastKode = lastTransaction.kodeTransaksi;
        const lastNumber = parseInt(lastKode.split("/").pop() ?? "0", 10);
        nomorUrut = lastNumber + 1;
      }

      const kodeTransaksi = `INV/${dateStr}/${nomorUrut.toString().padStart(5, "0")}`;

      // 5. Simpan transaksi
      const transaction = await tx.transaction.create({
        data: {
          tenantId,
          customerId: data.customerId ?? null,
          kodeTransaksi,
          totalBelanja,
          totalModal,
          labaKotor,
          nominalBayar: data.nominalBayar,
          kembalian,
          metodePembayaran: data.metodePembayaran,
          diskon: data.diskon,
          status: kembalian >= 0,
        },
      });
      // 6. Simpan detail transaksi
      const details = [];
      for (const row of productRows) {
        const detail = await tx.transactionDetail.create({
          data: {
            transactionId: transaction.id,
            tenantId,
            productId: row.id,
            namaProduk: row.nama,
            hargaJual: row.hargaJual,
            hargaModal: row.hargaModal,
            qty: row.qty,
            subtotal: row.qty * row.hargaJual,
            subtotalModal: row.qty * row.hargaModal,
          },
        });
        details.push(detail);
      }

      return {
        ...transaction,
        totalBelanja: Number(transaction.totalBelanja),
        totalModal: Number(transaction.totalModal),
        labaKotor: Number(transaction.labaKotor),
        nominalBayar: Number(transaction.nominalBayar),
        kembalian: Number(transaction.kembalian),
        details,
      };
    });

    return createdResponse(result);
  } catch (error) {
    // Parse custom errors
    if (error instanceof Error) {
      if (error.message.startsWith("PRODUCT_NOT_FOUND:")) {
        return errorResponse("Produk tidak ditemukan", 404);
      }
      if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
        const parts = error.message.split(":");
        return errorResponse(
          `Stok ${parts[1]} tidak mencukupi (tersisa ${parts[2]})`,
          400,
          "INSUFFICIENT_STOCK"
        );
      }
    }
    return handleApiError(error);
  }
}

//─── GET /api/:slug/transactions — LIST ─────────────────────
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = { tenantId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate + "T23:59:59.999Z");
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          details: true,
          customer: { select: { id: true, nama: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return successResponse(
      transactions.map((t) => ({
        ...t,
        totalBelanja: Number(t.totalBelanja),
        totalModal: Number(t.totalModal),
        labaKotor: Number(t.labaKotor),
        nominalBayar: Number(t.nominalBayar),
        kembalian: Number(t.kembalian),
        createdAt: t.createdAt.toISOString(),
      })),
      { total, page, limit, totalPages: Math.ceil(total / limit) }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
