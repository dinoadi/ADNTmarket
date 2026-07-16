// ============================================================
// ADNTmarket.app — GET/PATCH/DELETE /api/tenants/:id
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const decoded = verifyToken(authHeader.slice(7));
  if (decoded.role !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  return decoded;
}

//─── GET /api/tenants/:id ───────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    getAuthUser(request);
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { users: true } },
        users: { select: { id: true, email: true, nama: true, role: true, isActive: true } },
      },
    });

    if (!tenant) {
      return errorResponse("Tenant tidak ditemukan", 404);
    }

    return successResponse({
      ...tenant,
      tanggalMulai: tenant.tanggalMulai.toISOString(),
      tanggalKedaluwarsa: tenant.tanggalKedaluwarsa?.toISOString() ?? null,
      createdAt: tenant.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN"))
      return errorResponse(error.message === "UNAUTHORIZED" ? "Unauthorized" : "Forbidden", 401);
    return handleApiError(error);
  }
}

const updateTenantSchema = z.object({
  namaToko: z.string().min(1).optional(),
  alamat: z.string().nullable().optional(),
  telepon: z.string().nullable().optional(),
  statusAktif: z.boolean().optional(),
  status: z.enum(["AKTIF", "SUSPENDED", "NONAKTIF"]).optional(),
  tanggalKedaluwarsa: z.string().nullable().optional(),
});

//─── PATCH /api/tenants/:id ─────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    getAuthUser(request);
    const body = await request.json();
    const data = updateTenantSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.namaToko !== undefined) updateData.namaToko = data.namaToko;
    if (data.alamat !== undefined) updateData.alamat = data.alamat;
    if (data.telepon !== undefined) updateData.telepon = data.telepon;
    if (data.statusAktif !== undefined) updateData.statusAktif = data.statusAktif;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.tanggalKedaluwarsa !== undefined) {
      updateData.tanggalKedaluwarsa = data.tanggalKedaluwarsa ? new Date(data.tanggalKedaluwarsa) : null;
    }

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: updateData,
    });

    return successResponse({
      ...tenant,
      tanggalMulai: tenant.tanggalMulai.toISOString(),
      tanggalKedaluwarsa: tenant.tanggalKedaluwarsa?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN"))
      return errorResponse(error.message === "UNAUTHORIZED" ? "Unauthorized" : "Forbidden", 401);
    return handleApiError(error);
  }
}

//─── DELETE /api/tenants/:id ────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    getAuthUser(request);

    // Hapus semua data terkait
    await prisma.$transaction(async (tx) => {
      await tx.transactionDetail.deleteMany({ where: { transaction: { tenantId: params.id } } });
      await tx.transaction.deleteMany({ where: { tenantId: params.id } });
      await tx.product.deleteMany({ where: { tenantId: params.id } });
      await tx.customer.deleteMany({ where: { tenantId: params.id } });
      await tx.setting.deleteMany({ where: { tenantId: params.id } });
      await tx.user.deleteMany({ where: { tenantId: params.id } });
      await tx.tenant.delete({ where: { id: params.id } });
    });

    return successResponse({ message: "Tenant berhasil dihapus" });
  } catch (error) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN"))
      return errorResponse(error.message === "UNAUTHORIZED" ? "Unauthorized" : "Forbidden", 401);
    return handleApiError(error);
  }
}
