// ============================================================
// ADNTmarket.app — Registrasi Toko Baru + Invoice Sayabayar
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateOrderId, createInvoice } from "@/lib/sayabayar";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, namaToko, alamat, telepon, email, password, planId } = body;

    // ── Validasi input ──────────────────────────────────────
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

    // ── Ambil paket ─────────────────────────────────────────
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, error: "Paket tidak tersedia" },
        { status: 400 }
      );
    }

    // ── Generate order ID & buat tenant ─────────────────────
    const now = new Date();
    const orderId = generateOrderId();
    const passwordHash = await bcrypt.hash(password, 12);

    const { tenant, payment } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          namaToko,
          alamat: alamat || null,
          telepon: telepon || null,
          statusAktif: false,
          status: "NONAKTIF",
          tanggalMulai: undefined,
          tanggalKedaluwarsa: undefined,
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

      const paymentExpiredAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
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

    // ── Buat invoice di Sayabayar ───────────────────────────
    const rootUrl = process.env.NEXT_PUBLIC_APP_URL || "https://adntmarket.netlify.app";
    let sayabayarPaymentUrl: string | null = null;
    let sayabayarInvoiceId: string | null = null;

    try {
      const invoice = await createInvoice({
        customerName: `Admin ${namaToko}`,
        customerEmail: email,
        amount: plan.harga,
        description: `Paket Sewa ${plan.nama} - ${namaToko}`,
        redirectUrl: `${rootUrl}/daftar/sukses?order_id=${orderId}`,
        expiredMinutes: 1440, // 24 jam
      });

      sayabayarPaymentUrl = invoice.data.payment_url;
      sayabayarInvoiceId = invoice.data.id;

      // Simpan invoice info ke database
      await prisma.payment.update({
        where: { merchantOrderId: orderId },
        data: {
          sayabayarInvoiceId,
          sayabayarPaymentUrl,
        },
      });
    } catch (sayabayarError) {
      console.error("Sayabayar invoice error:", sayabayarError);
      // Tetap lanjut — payment_url bisa dibuat ulang nanti
    }

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          slug: tenant.slug,
          namaToko: tenant.namaToko,
        },
        payment: {
          orderId,
          amount: plan.harga,
          paymentUrl: sayabayarPaymentUrl,
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
