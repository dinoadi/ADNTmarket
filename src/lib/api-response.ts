// ============================================================
// ADNTmarket.app — Standardized API Response Helpers
// ============================================================

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { TenantError } from "./tenant";

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Sukses response */
export function successResponse<T>(data: T, meta?: PaginationMeta) {
  return NextResponse.json(
    { success: true, data, ...(meta ? { meta } : {}) },
    { status: 200 }
  );
}

/** Created response (201) */
export function createdResponse<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

/** Error response */
export function errorResponse(
  message: string,
  statusCode: number = 400,
  code?: string
) {
  return NextResponse.json(
    { success: false, error: message, ...(code ? { code } : {}) },
    { status: statusCode }
  );
}

/** Handler error terpusat */
export function handleApiError(error: unknown) {
  // TenantError
  if (error instanceof TenantError) {
    return errorResponse(error.message, error.statusCode, error.code);
  }

  // Zod validation error
  if (error instanceof ZodError) {
    const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
    return errorResponse(messages.join(", "), 400, "VALIDATION_ERROR");
  }

  // Prisma known error
  if (error && typeof error === "object" && "code" in error) {
    const prismaError = error as { code: string; message?: string };
    if (prismaError.code === "P2002") {
      return errorResponse("Data sudah ada", 409, "DUPLICATE");
    }
    if (prismaError.code === "P2025") {
      return errorResponse("Data tidak ditemukan", 404, "NOT_FOUND");
    }
  }

  // JWT error
  if (error && typeof error === "object" && "name" in error) {
    const jwtError = error as { name: string; message: string };
    if (jwtError.name === "JsonWebTokenError") {
      return errorResponse("Token tidak valid", 401, "INVALID_TOKEN");
    }
    if (jwtError.name === "TokenExpiredError") {
      return errorResponse("Token sudah kedaluwarsa", 401, "TOKEN_EXPIRED");
    }
  }

  // Generic
  console.error("[API Error]", error);
  const message =
    error instanceof Error ? error.message : "Terjadi kesalahan server";
  return errorResponse(message, 500, "INTERNAL_ERROR");
}
