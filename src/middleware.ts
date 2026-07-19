// ============================================================
// ADNTmarket.app — Edge Middleware (Tenant Check + Auth)
// ============================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/tenant-check",
  "/_next",
  "/favicon",
  "/api/tenants",
  "/api/payment/",
  "/api/register",
  "/api/users",
  "/api/subscription-plans",
  "/api/admin",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass untuk public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Static assets
  if (pathname.startsWith("/static") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // ── Tenant route: /:toko_slug atau /api/:toko_slug ──
  const tenantMatch = pathname.match(/^\/(?:api\/)?([^\/]+)/);
  const slug = tenantMatch?.[1];

  // Root path (/) — allow
  if (!slug || slug === "") {
    return NextResponse.next();
  }

  // Admin route — skip tenant check
  if (slug === "admin") {
    return NextResponse.next();
  }

  // Validasi format slug (hanya alfanumerik dan hyphens)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Format slug tidak valid" },
        { status: 400 }
      );
    }
    return NextResponse.next();
  }

  // Untuk rute API tenant, verifikasi tenant via header
  try {
    const baseUrl = request.nextUrl.origin;
    const tenantCheckUrl = `${baseUrl}/api/tenant-check?slug=${slug}`;
    const tenantRes = await fetch(tenantCheckUrl, {
      headers: { "x-forwarded-proto": "https" },
    });

    if (!tenantRes.ok) {
      const data = await tenantRes.json().catch(() => ({}));

      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            error: data.error ?? "Toko tidak ditemukan",
            code: "TENANT_NOT_FOUND",
          },
          { status: tenantRes.status }
        );
      }

      // Redirect ke halaman suspended
      if (tenantRes.status === 403) {
        return NextResponse.redirect(
          new URL(`/${slug}/suspended`, request.url)
        );
      }

      // Tenant tidak ditemukan — redirect ke 404 page
      return NextResponse.rewrite(new URL("/404", request.url));
    }

    const tenantData = await tenantRes.json();
    const tenant = tenantData.data;

    // Lanjutkan request dengan header tenant
    const headers = new Headers(request.headers);
    headers.set("x-tenant-slug", slug);
    headers.set("x-tenant-id", tenant.id);
    headers.set("x-tenant-nama", tenant.namaToko);
    headers.set("x-tenant-telepon", tenant.telepon ?? "");
    headers.set("x-tenant-alamat", tenant.alamat ?? "");

    return NextResponse.next({ request: { headers } });
  } catch {
    // Fallback: allow jika service unreachable (development)
    const headers = new Headers(request.headers);
    headers.set("x-tenant-slug", slug);
    return NextResponse.next({ request: { headers } });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
