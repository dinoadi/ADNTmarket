// ============================================================
// ADNTmarket.app — Voucher by ID (Super Admin only)
// ============================================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";

function checkSuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const decoded = verifyToken(authHeader.slice(7));
  if (decoded.role !== "SUPER_ADMIN") return null;
  return decoded;
}

// PATCH /api/vouchers/[id] — update voucher
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const admin = checkSuperAdmin(request);
    if (!admin) return errorResponse("Unauthorized", 401);

    const { id } = params;
    const body = await request.json();

    const existing = await prisma.voucher.findUnique({ where: { id } });
    if (!existing) return errorResponse("Voucher tidak ditemukan", 404);

    const data: Record<string, unknown> = {};
    if (body.durasiHari) data.durasiHari = Number(body.durasiHari);
    if (body.deskripsi !== undefined) data.deskripsi = body.deskripsi;
    if (body.kuota !== undefined) data.kuota = Number(body.kuota);
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.kode) data.kode = body.kode;

    const voucher = await prisma.voucher.update({
      where: { id },
      data,
    });

    return successResponse(voucher);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/vouchers/[id] — hapus voucher
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const admin = checkSuperAdmin(request);
    if (!admin) return errorResponse("Unauthorized", 401);

    const { id } = params;
    const existing = await prisma.voucher.findUnique({ where: { id } });
    if (!existing) return errorResponse("Voucher tidak ditemukan", 404);

    await prisma.voucher.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
