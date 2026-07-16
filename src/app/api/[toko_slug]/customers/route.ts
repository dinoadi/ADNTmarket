// ============================================================
// ADNTmarket.app — CRUD Customers (tenant-scoped)
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { successResponse, createdResponse, errorResponse, handleApiError } from "@/lib/api-response";

function getTenantInfo(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  return { tenantId };
}

//─── GET /api/:slug/customers ───────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { telepon: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return successResponse(customers, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const createCustomerSchema = z.object({
  nama: z.string().min(1, "Nama pelanggan wajib diisi"),
  telepon: z.string().optional().nullable(),
  alamat: z.string().optional().nullable(),
});

//─── POST /api/:slug/customers ──────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const body = await request.json();
    const data = createCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: { ...data, tenantId },
    });

    return createdResponse(customer);
  } catch (error) {
    return handleApiError(error);
  }
}
