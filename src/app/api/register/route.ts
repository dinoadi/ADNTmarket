import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, namaToko, alamat, telepon, email, password, planId } = body;

    // Validasi input
    if (!slug || !namaToko || !email || !password || !planId) {
      return NextResponse.json(
        { success: false, error: "Semua field harus diisi" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    // Validasi slug format
    const slugRegex = /^[a-z0-9-]{3,30}$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { success: false, error: "Slug hanya boleh huruf kecil, angka, dan strip (3-30 karakter)" },
        { status: 400 }
      );
    }

    // Cek slug sudah dipakai
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      return NextResponse.json(
        { success: false, error: "Slug sudah digunakan, pilih slug lain" },
        { status: 409 }
      );
    }

    // Cek email sudah dipakai
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email sudah terdaftar" },
        { status: 409 }
      );
    }

    // Ambil paket
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, error: "Paket tidak tersedia" },
        { status: 400 }
      );
    }

    // Hitung tanggal kedaluwarsa
    const now = new Date();
    const expiredAt = new Date(now.getTime() + plan.durasiHari * 24 * 60 * 60 * 1000);

    // Generate order ID untuk Midtrans
    const { generateOrderId, createSnapToken } = await import("@/lib/midtrans");
    const orderId = generateOrderId();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Buat tenant + user + payment dalam 1 transaksi
    const tenant = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          namaToko,
          alamat: alamat || null,
          telepon: telepon || null,
          statusAktif: false, // belum aktif sampai bayar
          status: "NONAKTIF",
          tanggalMulai: null,
          tanggalKedaluwarsa: null,
        },
      });

      await tx.user.create({
        data: {
          email,
          passwordHash,
          nama: `Admin ${namaToko}`,
          role: "TENANT_ADMIN",
          tenantId: tenant.id,
          isActive: true,
        },
      });

      // Bikin payment record
      const paymentExpiredAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 jam
      const payment = await tx.payment.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          amount: plan.harga,
          status: "PENDING",
          merchantOrderId: orderId,
          pembeliNama: `Admin ${namaToko}`,
          pembeliEmail: email,
          pembeliTelepon: telepon || null,
          expiredAt: paymentExpiredAt,
        },
      });

      return { tenant, payment };
    });

    // Generate Snap token dari Midtrans
    let snapToken: string | null = null;
    try {
      snapToken = await createSnapToken({
        orderId,
        amount: plan.harga,
        customerName: `Admin ${namaToko}`,
        customerEmail: email,
        customerPhone: telepon || undefined,
        planName: plan.nama,
      });
    } catch (midtransError) {
      console.error("Midtrans error:", midtransError);
      // Tetap lanjut, snap token bisa digenerate ulang nanti
    }

    // Update snapToken di payment
    if (snapToken) {
      await prisma.payment.update({
        where: { merchantOrderId: orderId },
        data: { snapToken },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          slug: tenant.tenant.slug,
          namaToko: tenant.tenant.namaToko,
        },
        payment: {
          orderId,
          amount: plan.harga,
          snapToken,
          planName: plan.nama,
        },
      },
    });
  } catch (error) {
    console.error("Registrasi gagal:", error);
    return NextResponse.json(
      { success: false, error: "Registrasi gagal, coba lagi" },
      { status: 500 }
    );
  }
}
