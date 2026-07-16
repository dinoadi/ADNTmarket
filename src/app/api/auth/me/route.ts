// ============================================================
// ADNTmarket.app — GET /api/auth/me
// ============================================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { tenant: true },
    });

    if (!user) {
      return errorResponse("User tidak ditemukan", 404);
    }

    return successResponse({
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenant?.slug,
      tenantNama: user.tenant?.namaToko,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
