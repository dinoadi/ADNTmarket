// ============================================================
// ADNTmarket.app — CRUD Users (Super Admin only)
// GET  /api/users     → List users (paginated, filter by tenant)
// POST /api/users     → Create user within a tenant
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, hashPassword } from "@/lib/auth";
import { successResponse, createdResponse, errorResponse, handleApiError } from "@/lib/api-response";

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const decoded = verifyToken(authHeader.slice(7));
  if (decoded.role !== "SUPER_ADMIN") throw new Error("FORBIDDEN");
  return decoded;
}

//─── GET /api/users ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    getAuthUser(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const search = searchParams.get("search") ?? "";
    const tenantId = searchParams.get("tenantId") ?? "";
    const role = searchParams.get("role") ?? "";

    const where: Record<string, unknown> = {};

    if (tenantId) where.tenantId = tenantId;
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
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return errorResponse("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN")
      return errorResponse("Forbidden", 403);
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
    getAuthUser(request);
    const body = await request.json();
    const data = createUserSchema.parse(body);

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
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return errorResponse("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN")
      return errorResponse("Forbidden", 403);
    return handleApiError(error);
  }
}
