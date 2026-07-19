// ============================================================
// ADNTmarket.app — GET/PATCH/DELETE /api/users/:id
// SUPER_ADMIN → full access
// TENANT_ADMIN → hanya user di tenant-nya sendiri, hanya KASIR
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth-utils";

/** Helper: pastikan TENANT_ADMIN punya akses ke user ini */
function assertTenantAccess(auth: { role: string; tenantId?: string }, targetUser: { role: string; tenantId: string | null }) {
  if (auth.role === "TENANT_ADMIN") {
    // TENANT_ADMIN hanya bisa manage KASIR di tenant-nya
    if (targetUser.role !== "KASIR") {
      return errorResponse("Admin toko hanya bisa mengelola akun Kasir", 403);
    }
    if (targetUser.tenantId !== auth.tenantId) {
      return errorResponse("Anda hanya bisa mengelola user di toko Anda sendiri", 403);
    }
  }
  return null; // allowed
}

//─── GET /api/users/:id ──────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthUser(request, ["SUPER_ADMIN", "TENANT_ADMIN"]);
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

    // Check tenant access
    const accessError = assertTenantAccess(auth, user);
    if (accessError) return accessError;

    return successResponse(user);
  } catch (error) {
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
    const auth = getAuthUser(request, ["SUPER_ADMIN", "TENANT_ADMIN"]);
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    // Cari user target
    const targetUser = await prisma.user.findUnique({ where: { id: params.id } });
    if (!targetUser) {
      return errorResponse("User tidak ditemukan", 404);
    }

    // Check tenant access
    const accessError = assertTenantAccess(auth, targetUser);
    if (accessError) return accessError;

    // TENANT_ADMIN tidak bisa mengubah role menjadi TENANT_ADMIN
    if (auth.role === "TENANT_ADMIN" && data.role === "TENANT_ADMIN") {
      return errorResponse("Admin toko tidak bisa mengubah role menjadi Admin Toko", 403);
    }

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
    return handleApiError(error);
  }
}

//─── DELETE /api/users/:id ───────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthUser(request, ["SUPER_ADMIN", "TENANT_ADMIN"]);

    const targetUser = await prisma.user.findUnique({ where: { id: params.id } });
    if (!targetUser) {
      return errorResponse("User tidak ditemukan", 404);
    }

    // Prevent deleting SUPER_ADMIN accounts
    if (targetUser.role === "SUPER_ADMIN") {
      return errorResponse("Tidak dapat menghapus akun Super Admin", 403);
    }

    // Check tenant access
    const accessError = assertTenantAccess(auth, targetUser);
    if (accessError) return accessError;

    await prisma.user.delete({ where: { id: params.id } });

    return successResponse({ message: "User berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}
