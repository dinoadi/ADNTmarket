// ============================================================
// ADNTmarket.app — CRUD Voucher (Super Admin only)
// ============================================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import {
  successResponse,
  createdResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";

function generateKode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let kode = "VOC-";
  for (let i = 0; i < 8; i++) {
    kode += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) kode += "-";
  }
  return kode;
}

function checkSuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const decoded = verifyToken(authHeader.slice(7));
  if (decoded.role !== "SUPER_ADMIN") return null;
  return decoded;
}

// GET /api/vouchers — list semua voucher
export async function GET(request: NextRequest) {
  try {
    const admin = checkSuperAdmin(request);
    if (!admin) return errorResponse("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const where = activeOnly ? { isActive: true } : {};

    const vouchers = await prisma.voucher.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return successResponse(vouchers);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/vouchers — create voucher
export async function POST(request: NextRequest) {
  try {
    const admin = checkSuperAdmin(request);
    if (!admin) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { durasiHari, deskripsi, kuota, kode } = body;

    if (!durasiHari || durasiHari < 1) {
      return errorResponse("Durasi hari minimal 1", 400);
    }

    const voucher = await prisma.voucher.create({
      data: {
        kode: kode || generateKode(),
        durasiHari: Number(durasiHari),
        deskripsi: deskripsi || null,
        kuota: kuota ? Number(kuota) : 1,
      },
    });

    return createdResponse(voucher);
  } catch (error) {
    return handleApiError(error);
  }
}
