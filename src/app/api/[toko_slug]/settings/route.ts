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
});

//─── PATCH /api/:slug/settings ──────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const { tenantId } = getTenantInfo(request);
    if (!tenantId) return errorResponse("Tenant tidak ditemukan", 404);

    const body = await request.json();
    const data = updateSettingsSchema.parse(body);

    const settings = await prisma.setting.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
    });

    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
