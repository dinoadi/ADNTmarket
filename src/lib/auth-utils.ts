// ============================================================
// ADNTmarket.app — Shared Auth Utilities untuk API Routes
// ============================================================

import { NextRequest } from "next/server";
import { verifyToken } from "./auth";
import { errorResponse } from "./api-response";

export type Role = "SUPER_ADMIN" | "TENANT_ADMIN" | "KASIR";

export interface AuthUser {
  userId: string;
  role: Role;
  tenantId?: string;
}

/**
 * Verifikasi token & validasi role.
 * Mengembalikan decoded payload jika valid.
 * Melempar NextResponse error jika tidak valid (panggil dengan throw).
 */
export function getAuthUser(
  request: NextRequest,
  allowedRoles?: Role[]
): AuthUser {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }

  let decoded: AuthUser;
  try {
    decoded = verifyToken(authHeader.slice(7)) as AuthUser;
  } catch {
    throw errorResponse("Token tidak valid", 401, "INVALID_TOKEN");
  }

  if (!decoded.role) {
    throw errorResponse("Token tidak memiliki role", 403, "FORBIDDEN");
  }

  if (allowedRoles && !allowedRoles.includes(decoded.role as Role)) {
    throw errorResponse("Akses ditolak", 403, "FORBIDDEN");
  }

  return decoded;
}

/**
 * Cek apakah user yang login adalah SUPER_ADMIN
 */
export function isSuperAdmin(role: string): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * Cek apakah user yang login adalah TENANT_ADMIN
 */
export function isTenantAdmin(role: string): boolean {
  return role === "TENANT_ADMIN";
}

/**
 * Cek apakah user yang login adalah KASIR
 */
export function isKasir(role: string): boolean {
  return role === "KASIR";
}

/**
 * Dapatkan role name yang user-friendly
 */
export function getRoleLabel(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "TENANT_ADMIN":
      return "Admin Toko";
    case "KASIR":
      return "Kasir";
    default:
      return role;
  }
}
