// ============================================================
// ADNTmarket.app — Cek status tenant (dipanggil middleware)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug, formatTenantResponse, TenantError } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { success: false, error: "Parameter slug diperlukan" },
      { status: 400 }
    );
  }

  try {
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Toko tidak ditemukan", code: "TENANT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Cek expired
    const now = new Date();
    const isExpired =
      tenant.tanggalKedaluwarsa && new Date(tenant.tanggalKedaluwarsa) < now;

    if (!tenant.statusAktif || isExpired) {
      // Auto-suspend via prisma langsung
      const { prisma } = await import("@/lib/prisma");
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: "SUSPENDED", statusAktif: false },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Masa sewa telah berakhir",
          code: "TENANT_SUSPENDED",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatTenantResponse(tenant),
    });
  } catch (error) {
    if (error instanceof TenantError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
