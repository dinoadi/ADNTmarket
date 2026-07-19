// ============================================================
// ADNTmarket.app — CRUD Users (Super Admin & Tenant Admin)
// SUPER_ADMIN → full access
// TENANT_ADMIN → hanya user di tenant-nya sendiri, hanya KASIR
// GET  /api/users     → List users (paginated, filter by tenant)
// POST /api/users     → Create user within a tenant
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { successResponse, createdResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth-utils";

//─── GET /api/users ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthUser(request, ["SUPER_ADMIN", "TENANT_ADMIN"]);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const search = searchParams.get("search") ?? "";
    const tenantId = searchParams.get("tenantId") ?? "";
    const role = searchParams.get("role") ?? "";

    const where: Record<string, unknown> = {};

    // TENANT_ADMIN hanya bisa melihat user di tenant-nya sendiri
    if (auth.role === "TENANT_ADMIN") {
      where.tenantId = auth.tenantId;
    } else {
      if (tenantId) where.tenantId = tenantId;
    }

    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { nama: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
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
      }),
      prisma.user.count({ where }),
    ]);

    return successResponse(users, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return handleApiError(error);
  }
}

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password minimal 6 karakter"),
  nama: z.string().min(1, "Nama wajib diisi"),
  role: z.enum(["TENANT_ADMIN", "KASIR"]),
  tenantId: z.string().min(1, "Tenant wajib dipilih"),
});

//─── POST /api/users ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthUser(request, ["SUPER_ADMIN", "TENANT_ADMIN"]);
    const body = await request.json();
    const data = createUserSchema.parse(body);

    // TENANT_ADMIN: hanya bisa create KASIR di tenant-nya sendiri
    if (auth.role === "TENANT_ADMIN") {
      if (data.role !== "KASIR") {
        return errorResponse("Admin toko hanya bisa membuat akun Kasir", 403);
      }
      if (data.tenantId !== auth.tenantId) {
        return errorResponse("Anda hanya bisa membuat user untuk toko Anda sendiri", 403);
      }
    }

    // Cek tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } });
    if (!tenant) {
      return errorResponse("Tenant tidak ditemukan", 404);
    }

    // Cek email duplicate
    const emailExists = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailExists) {
      return errorResponse("Email sudah terdaftar", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        nama: data.nama,
        role: data.role,
        tenantId: data.tenantId,
      },
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

    return createdResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}
