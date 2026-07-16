// ============================================================
// ADNTmarket.app — GET /api/:slug/transactions/:id
// ============================================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

function getTenantInfo(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  return { tenantId };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const transaction = await prisma.transaction.findFirst({
      where: { id: params.id, tenantId },
      include: {
        details: true,
        customer: { select: { id: true, nama: true, telepon: true } },
      },
    });

    if (!transaction) {
      return errorResponse("Transaksi tidak ditemukan", 404);
    }

    return successResponse({
      ...transaction,
      totalBelanja: Number(transaction.totalBelanja),
      totalModal: Number(transaction.totalModal),
      labaKotor: Number(transaction.labaKotor),
      nominalBayar: Number(transaction.nominalBayar),
      kembalian: Number(transaction.kembalian),
      createdAt: transaction.createdAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
