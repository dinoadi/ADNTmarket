// ============================================================
// ADNTmarket.app — POST /api/vouchers/validate
// Validasi & redeem voucher (public)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { kode } = await request.json();

    if (!kode || typeof kode !== "string") {
      return NextResponse.json(
        { success: false, error: "Kode voucher harus diisi" },
        { status: 400 },
      );
    }

    const voucher = await prisma.voucher.findUnique({
      where: { kode: kode.toUpperCase() },
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

    return NextResponse.json({
      success: true,
      data: {
        kode: voucher.kode,
        durasiHari: voucher.durasiHari,
        deskripsi: voucher.deskripsi,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Gagal validasi voucher" },
      { status: 500 },
    );
  }
}
