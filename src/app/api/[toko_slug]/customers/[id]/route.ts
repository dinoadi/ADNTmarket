// ============================================================
// ADNTmarket.app — GET/PATCH/DELETE Customer by ID
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";

function getTenantInfo(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  return { tenantId };
}

//─── GET /api/:slug/customers/:id ────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ toko_slug: string; id: string }> }
) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const { id } = await params;
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
    });

    if (!customer) return errorResponse("Pelanggan tidak ditemukan", 404);
    return successResponse(customer);
  } catch (error) {
    return handleApiError(error);
  }
}

const updateCustomerSchema = z.object({
  nama: z.string().min(1).optional(),
  telepon: z.string().nullable().optional(),
  alamat: z.string().nullable().optional(),
});

//─── PATCH /api/:slug/customers/:id ──────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ toko_slug: string; id: string }> }
) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const { id } = await params;
    const existing = await prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return errorResponse("Pelanggan tidak ditemukan", 404);

    const body = await request.json();
    const data = updateCustomerSchema.parse(body);

    const customer = await prisma.customer.update({
      where: { id },
      data,
    });

    return successResponse(customer);
  } catch (error) {
    return handleApiError(error);
  }
}

//─── DELETE /api/:slug/customers/:id ─────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ toko_slug: string; id: string }> }
) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const { id } = await params;
    const existing = await prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return errorResponse("Pelanggan tidak ditemukan", 404);

    await prisma.customer.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
