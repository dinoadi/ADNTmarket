// ============================================================
// ADNTmarket.app — POST /api/auth/register (Super Admin only)
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, hashPassword } from "@/lib/auth";
import { createdResponse, errorResponse, handleApiError } from "@/lib/api-response";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nama: z.string().min(1),
  namaToko: z.string().min(1),
  slug: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan hyphens"),
});

export async function POST(request: NextRequest) {
  try {
    // Cek authorization Super Admin
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const decoded = verifyToken(authHeader.slice(7));
    if (decoded.role !== "SUPER_ADMIN") {
      return errorResponse("Forbidden: hanya Super Admin", 403);
    }

    const body = await request.json();
    const { email, password, nama, namaToko, slug } = registerSchema.parse(body);

    // Cek duplicate email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse("Email sudah terdaftar", 409);
    }

    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      return errorResponse("Slug sudah digunakan", 409);
    }

    // Buat tenant + user dalam transaksi
    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          namaToko,
          status: "AKTIF",
          statusAktif: true,
          tanggalMulai: new Date(),
          tanggalKedaluwarsa: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1)
          ),
        },
      });

      // Create default settings
      await tx.setting.create({
        data: {
          tenantId: tenant.id,
          footerStruk: "Terima kasih telah berbelanja",
          cetakStrukOtomatis: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          nama,
          role: "TENANT_ADMIN",
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    return createdResponse({
      id: result.user.id,
      email: result.user.email,
      nama: result.user.nama,
      tenantId: result.tenant.id,
      slug: result.tenant.slug,
      namaToko: result.tenant.namaToko,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
