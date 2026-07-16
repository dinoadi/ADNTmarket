// ============================================================
// ADNTmarket.app — CRUD Tenant (Super Admin)
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken, hashPassword } from "@/lib/auth";
import { successResponse, createdResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { parseSlug } from "@/lib/utils";

//─── Helper: verify Super Admin ──────────────────────────────
function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer "))
    throw new Error("UNAUTHORIZED");

  const decoded = verifyToken(authHeader.slice(7));
  if (decoded.role !== "SUPER_ADMIN")
    throw new Error("FORBIDDEN");

  return decoded;
}

//─── GET /api/tenants ───────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    getAuthUser(request);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const search = searchParams.get("search") ?? "";

    const where = search
      ? {
          OR: [
            { namaToko: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { users: true } } },
      }),
      prisma.tenant.count({ where }),
    ]);

    return successResponse(
      tenants.map((t) => ({
        id: t.id,
        slug: t.slug,
        namaToko: t.namaToko,
        alamat: t.alamat,
        telepon: t.telepon,
        statusAktif: t.statusAktif,
        status: t.status,
        tanggalMulai: t.tanggalMulai.toISOString(),
        tanggalKedaluwarsa: t.tanggalKedaluwarsa?.toISOString() ?? null,
        jumlahUser: t._count.users,
        createdAt: t.createdAt.toISOString(),
      })),
      { total, page, limit, totalPages: Math.ceil(total / limit) }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return errorResponse("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN")
      return errorResponse("Forbidden", 403);
    return handleApiError(error);
  }
}

const createTenantSchema = z.object({
  namaToko: z.string().min(1, "Nama toko wajib diisi"),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Slug tidak valid"),
  email: z.string().email(),
  password: z.string().min(6, "Password minimal 6 karakter"),
  tanggalKedaluwarsa: z.string().optional(),
});

//─── POST /api/tenants ──────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    getAuthUser(request);
    const body = await request.json();
    const data = createTenantSchema.parse(body);

    const slug = parseSlug(data.slug);

    // Cek duplikat
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return errorResponse("Slug sudah digunakan", 409);
    }

    const emailExists = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailExists) {
      return errorResponse("Email sudah terdaftar", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          namaToko: data.namaToko,
          status: "AKTIF",
          statusAktif: true,
          tanggalMulai: new Date(),
          tanggalKedaluwarsa: data.tanggalKedaluwarsa
            ? new Date(data.tanggalKedaluwarsa)
            : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
      });

      await tx.setting.create({
        data: {
          tenantId: tenant.id,
          footerStruk: "Terima kasih telah berbelanja",
          cetakStrukOtomatis: true,
        },
      });

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          nama: "Admin " + data.namaToko,
          role: "TENANT_ADMIN",
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    return createdResponse({
      id: result.tenant.id,
      slug: result.tenant.slug,
      namaToko: result.tenant.namaToko,
      email: result.user.email,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return errorResponse("Unauthorized", 401);
    if (error instanceof Error && error.message === "FORBIDDEN")
      return errorResponse("Forbidden", 403);
    return handleApiError(error);
  }
}
