// ============================================================
// ADNTmarket.app — GET /api/:slug/transactions/stats
// ============================================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

function getTenantInfo(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  return { tenantId };
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const { searchParams } = request.nextUrl;
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    const periode = searchParams.get("periode"); // today, week, month, custom
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (periode) {
      case "today":
        startDate = startOfDay;
        endDate = new Date(startOfDay.getTime() + 86400000);
        break;
      case "week": {
        const dayOfWeek = startOfDay.getDay();
        startDate = new Date(startOfDay);
        startDate.setDate(startDate.getDate() - dayOfWeek);
        endDate = new Date(startDate.getTime() + 7 * 86400000);
        break;
      }
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case "custom":
        if (searchParams.get("startDate")) {
          startDate = new Date(searchParams.get("startDate")!);
        }
        if (searchParams.get("endDate")) {
          endDate = new Date(searchParams.get("endDate")! + "T23:59:59.999Z");
        }
        break;
    }

    const where: Record<string, unknown> = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = startDate;
      if (endDate) (where.createdAt as Record<string, unknown>).lte = endDate;
    }

    // Ambil semua transaksi di periode untuk kalkulasi
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        totalBelanja: true,
        totalModal: true,
        labaKotor: true,
        id: true,
      },
    });

    const stats = {
      totalOmzet: 0,
      totalModal: 0,
      totalLaba: 0,
      totalTransaksi: transactions.length,
      periode: {
        start: startDate?.toISOString() ?? null,
        end: endDate?.toISOString() ?? null,
      },
    };

    for (const t of transactions) {
      stats.totalOmzet += Number(t.totalBelanja);
      stats.totalModal += Number(t.totalModal);
      stats.totalLaba += Number(t.labaKotor);
    }

    return successResponse(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
