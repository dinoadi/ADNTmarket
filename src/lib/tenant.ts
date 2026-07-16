// ============================================================
// ADNTmarket.app — Validasi & konteks Tenant
// ============================================================

import { prisma } from "./prisma";

export class TenantError extends Error {
  constructor(
    message: string,
    public statusCode: number = 404,
    public code?: string
  ) {
    super(message);
    this.name = "TenantError";
  }
}

/** Cari tenant berdasarkan slug */
export async function getTenantBySlug(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { settings: true },
  });
  return tenant;
}

/** Validasi akses tenant — throw jika suspended/kedaluwarsa */
export async function validateTenantAccess(slug: string) {
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    throw new TenantError("Toko tidak ditemukan", 404, "TENANT_NOT_FOUND");
  }

  const now = new Date();
  const isExpired =
    tenant.tanggalKedaluwarsa && new Date(tenant.tanggalKedaluwarsa) < now;

  if (!tenant.statusAktif || isExpired) {
    // Auto-suspend
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: "SUSPENDED",
        statusAktif: false,
      },
    });

    throw new TenantError(
      "Masa sewa telah berakhir. Silakan perpanjang sewa.",
      403,
      "TENANT_SUSPENDED"
    );
  }

  return tenant;
}

/** Sanitasi data tenant untuk response publik */
export function formatTenantResponse(tenant: {
  id: string;
  slug: string;
  namaToko: string;
  alamat: string | null;
  telepon: string | null;
  statusAktif: boolean;
  status: string;
  tanggalMulai: Date;
  tanggalKedaluwarsa: Date | null;
  logoUrl: string | null;
}) {
  return {
    id: tenant.id,
    slug: tenant.slug,
    namaToko: tenant.namaToko,
    alamat: tenant.alamat,
    telepon: tenant.telepon,
    statusAktif: tenant.statusAktif,
    status: tenant.status,
    tanggalMulai: tenant.tanggalMulai.toISOString(),
    tanggalKedaluwarsa: tenant.tanggalKedaluwarsa?.toISOString() ?? null,
    logoUrl: tenant.logoUrl,
  };
}
