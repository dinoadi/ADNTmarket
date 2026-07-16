// ============================================================
// ADNTmarket.app — CRUD Products (tenant-scoped)
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { successResponse, createdResponse, errorResponse, handleApiError } from "@/lib/api-response";

const kategoriList = [
  "MAKANAN", "MINUMAN", "SEMBAKO", "SNACK", "MINYAK",
  "BERAS", "GULA", "TELUR", "SUSU", "ROKOK",
  "OBAT", "ALAT_TULIS", "KEBERSIHAN", "LAINNYA",
] as const;

//─── Helper: get tenant from middleware header ──────────────
function getTenantInfo(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  const tenantSlug = request.headers.get("x-tenant-slug");
  return { tenantId, tenantSlug };
}

//─── GET /api/:slug/products ────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") ?? "";
    const kategori = searchParams.get("kategori") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));

    const where: Record<string, unknown> = { tenantId };

    if (search) {
      where.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (kategori && kategoriList.includes(kategori as typeof kategoriList[number])) {
      where.kategori = kategori;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { nama: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return successResponse(products, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const createProductSchema = z.object({
  nama: z.string().min(1, "Nama produk wajib diisi"),
  barcode: z.string().optional().nullable(),
  kategori: z.enum(kategoriList).default("LAINNYA"),
  hargaJual: z.number().min(0, "Harga jual tidak boleh negatif"),
  hargaModal: z.number().min(0, "Harga modal tidak boleh negatif"),
  stok: z.number().min(0, "Stok tidak boleh negatif").default(0),
  satuan: z.string().default("pcs"),
});

//─── POST /api/:slug/products ───────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const body = await request.json();
    const data = createProductSchema.parse(body);

    // Cek duplicate barcode
    if (data.barcode) {
      const existing = await prisma.product.findFirst({
        where: { barcode: data.barcode, tenantId },
      });
      if (existing) {
        return errorResponse("Barcode sudah terdaftar", 409);
      }
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        tenantId,
      },
    });

    return createdResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}
