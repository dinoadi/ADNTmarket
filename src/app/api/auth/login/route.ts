// ============================================================
// ADNTmarket.app — POST /api/auth/login
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Cari user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      return errorResponse("Email atau password salah", 401);
    }

    if (!user.isActive) {
      return errorResponse("Akun telah dinonaktifkan", 403);
    }

    // Verifikasi password
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return errorResponse("Email atau password salah", 401);
    }

    // Check tenant status jika bukan super admin
    if (user.role !== "SUPER_ADMIN" && user.tenant) {
      const now = new Date();
      const isExpired =
        user.tenant.tanggalKedaluwarsa &&
        new Date(user.tenant.tanggalKedaluwarsa) < now;

      if (!user.tenant.statusAktif || isExpired) {
        return errorResponse("Masa sewa toko telah berakhir", 403);
      }
    }

    // Sign JWT
    const token = signToken({
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId ?? undefined,
    });

    return successResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        nama: user.nama,
        role: user.role,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
