// ============================================================
// ADNTmarket.app — GET/PATCH/DELETE /api/:slug/products/:id
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth-utils";

const kategoriList = [
  "MAKANAN", "MINUMAN", "SEMBAKO", "SNACK", "MINYAK",
  "BERAS", "GULA", "TELUR", "SUSU", "ROKOK",
  "OBAT", "ALAT_TULIS", "KEBERSIHAN", "LAINNYA",
] as const;



//─── GET /api/:slug/products/:id ────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthUser(request);
    const tenantId = auth.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId },
    });

    if (!product) {
      return errorResponse("Produk tidak ditemukan", 404);
    }

    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}

const updateProductSchema = z.object({
  nama: z.string().min(1).optional(),
  // barcode: z.string().nullable().optional(), -- removed, input manual
  kategori: z.enum(kategoriList).optional(),
  hargaJual: z.number().min(0).optional(),
  hargaModal: z.number().min(0).optional(),
  stok: z.number().min(0).optional(),
  satuan: z.string().optional(),
  isActive: z.boolean().optional(),
});

//─── PATCH /api/:slug/products/:id ──────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthUser(request);
    const tenantId = auth.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const body = await request.json();
    const data = updateProductSchema.parse(body);

    // Verifikasi produk milik tenant ini
    const existing = await prisma.product.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) {
      return errorResponse("Produk tidak ditemukan", 404);
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
    });

    return successResponse(product);
  } catch (error) {
    return handleApiError(error);
  }
}

//─── DELETE /api/:slug/products/:id ─────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthUser(request);
    const tenantId = auth.tenantId;
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const existing = await prisma.product.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) {
      return errorResponse("Produk tidak ditemukan", 404);
    }

    await prisma.product.delete({ where: { id: params.id } });

    return successResponse({ message: "Produk berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}
