// ============================================================
// ADNTmarket.app — Settings API (tenant-scoped)
// ============================================================

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

function getTenantInfo(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  return { tenantId };
}

//─── GET /api/:slug/settings ────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    let settings = await prisma.setting.findUnique({ where: { tenantId } });

    // Auto-create jika belum ada
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          tenantId,
          footerStruk: "Terima kasih telah berbelanja",
          cetakStrukOtomatis: true,
        },
      });
    }

    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

const updateSettingsSchema = z.object({
  footerStruk: z.string().nullable().optional(),
  headerStruk: z.string().nullable().optional(),
  pajakPersen: z.number().nullable().optional(),
  cetakStrukOtomatis: z.boolean().optional(),
  alamat: z.string().nullable().optional(),
  telepon: z.string().nullable().optional(),
  namaToko: z.string().optional(),
});

//─── PATCH /api/:slug/settings ──────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const body = await request.json();
    const data = updateSettingsSchema.parse(body);

    // Update settings
    await prisma.setting.upsert({
      where: { tenantId },
      update: {
        footerStruk: data.footerStruk,
        headerStruk: data.headerStruk,
        pajakPersen: data.pajakPersen,
        cetakStrukOtomatis: data.cetakStrukOtomatis,
      },
      create: {
        tenantId,
        footerStruk: data.footerStruk ?? "Terima kasih telah berbelanja",
        headerStruk: data.headerStruk ?? null,
        pajakPersen: data.pajakPersen ?? null,
        cetakStrukOtomatis: data.cetakStrukOtomatis ?? true,
      },
    });

    // Update tenant info jika disertakan
    const tenantUpdate: Record<string, unknown> = {};
    if (data.alamat !== undefined) tenantUpdate.alamat = data.alamat;
    if (data.telepon !== undefined) tenantUpdate.telepon = data.telepon;
    if (data.namaToko !== undefined) tenantUpdate.namaToko = data.namaToko;

    if (Object.keys(tenantUpdate).length > 0) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: tenantUpdate,
      });
    }

    // Fetch final settings
    const settings = await prisma.setting.findUnique({ where: { tenantId } });

    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
