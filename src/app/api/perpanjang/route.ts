// ============================================================
// ADNTmarket.app — POST /api/perpanjang
// Perpanjang sewa toko dengan voucher
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded || !decoded.tenantId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - hanya untuk admin toko" },
        { status: 401 },
      );
    }

    const { voucherCode } = await req.json();
    if (!voucherCode) {
      return NextResponse.json(
        { success: false, error: "Kode voucher harus diisi" },
        { status: 400 },
      );
    }

    const voucher = await prisma.voucher.findUnique({
      where: { kode: voucherCode.toUpperCase() },
    });

    if (!voucher) {
      return NextResponse.json(
        { success: false, error: "Voucher tidak ditemukan" },
        { status: 404 },
      );
    }

    if (!voucher.isActive) {
      return NextResponse.json(
        { success: false, error: "Voucher sudah tidak aktif" },
        { status: 400 },
      );
    }

    if (voucher.terpakai >= voucher.kuota) {
      return NextResponse.json(
        { success: false, error: "Kuota voucher sudah habis" },
        { status: 400 },
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: decoded.tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Toko tidak ditemukan" },
        { status: 404 },
      );
    }

    // Perpanjang tanggal kedaluwarsa
    const sekarang = new Date();
    const baseDate =
      tenant.tanggalKedaluwarsa && tenant.tanggalKedaluwarsa > sekarang
        ? tenant.tanggalKedaluwarsa
        : sekarang;

    const tanggalKedaluwarsaBaru = new Date(
      baseDate.getTime() + voucher.durasiHari * 24 * 60 * 60 * 1000,
    );

    await prisma.$transaction([
      prisma.tenant.update({
        where: { id: decoded.tenantId },
        data: {
          status: "AKTIF",
          statusAktif: true,
          tanggalKedaluwarsa: tanggalKedaluwarsaBaru,
        },
      }),
      prisma.voucher.update({
        where: { id: voucher.id },
        data: { terpakai: voucher.terpakai + 1 },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        message: `Sewa diperpanjang sampai ${tanggalKedaluwarsaBaru.toLocaleDateString("id-ID")}`,
        tanggalKedaluwarsaBaru,
      },
    });
  } catch (error) {
    console.error("Perpanjang gagal:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperpanjang sewa" },
      { status: 500 },
    );
  }
}
