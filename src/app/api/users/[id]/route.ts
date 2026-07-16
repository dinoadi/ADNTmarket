// ============================================================
// ADNTmarket.app — GET/PATCH/DELETE /api/users/:id
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, hashPassword } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const decoded = verifyToken(authHeader.slice(7));
  if (decoded.role !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  return decoded;
}

//─── GET /api/users/:id ──────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    getAuthUser(request);
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        nama: true,
        role: true,
        isActive: true,
        tenantId: true,
        createdAt: true,
        tenant: { select: { namaToko: true, slug: true } },
      },
    });

    if (!user) {
      return errorResponse("User tidak ditemukan", 404);
    }

    return successResponse(user);
  } catch (error) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN"))
      return errorResponse(error.message === "UNAUTHORIZED" ? "Unauthorized" : "Forbidden", 401);
    return handleApiError(error);
  }
}

const updateUserSchema = z.object({
  nama: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["TENANT_ADMIN", "KASIR"]).optional(),
  isActive: z.boolean().optional(),
});

//─── PATCH /api/users/:id ────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    getAuthUser(request);
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.nama !== undefined) updateData.nama = data.nama;
    if (data.email !== undefined) {
      const dup = await prisma.user.findFirst({
        where: { email: data.email, id: { not: params.id } },
      });
      if (dup) return errorResponse("Email sudah digunakan", 409);
      updateData.email = data.email;
    }
    if (data.password !== undefined) updateData.passwordHash = await hashPassword(data.password);
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nama: true,
        role: true,
        isActive: true,
        tenantId: true,
        createdAt: true,
        tenant: { select: { namaToko: true, slug: true } },
      },
    });

    return successResponse(user);
  } catch (error) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN"))
      return errorResponse(error.message === "UNAUTHORIZED" ? "Unauthorized" : "Forbidden", 401);
    return handleApiError(error);
  }
}

//─── DELETE /api/users/:id ───────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    getAuthUser(request);

    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) {
      return errorResponse("User tidak ditemukan", 404);
    }

    // Prevent deleting SUPER_ADMIN accounts
    if (user.role === "SUPER_ADMIN") {
      return errorResponse("Tidak dapat menghapus akun Super Admin", 403);
    }

    await prisma.user.delete({ where: { id: params.id } });

    return successResponse({ message: "User berhasil dihapus" });
  } catch (error) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN"))
      return errorResponse(error.message === "UNAUTHORIZED" ? "Unauthorized" : "Forbidden", 401);
    return handleApiError(error);
  }
}
