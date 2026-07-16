// ============================================================
// ADNTmarket.app — Seed Data untuk Development
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ADNTmarket database...\n");

  // ── 1. Super Admin ─────────────────────────────────────
  const superAdminPassword = await bcrypt.hash("admin123", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@adntmarket.app" },
    update: {},
    create: {
      email: "admin@adntmarket.app",
      passwordHash: superAdminPassword,
      nama: "Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log("✅ Super Admin: admin@adntmarket.app / admin123");

  // ── 2. Demo Tenant: Toko Pak Kris ──────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "tokopakkris" },
    update: {},
    create: {
      slug: "tokopakkris",
      namaToko: "Toko Pak Kris",
      alamat: "Jl. Merdeka No. 123, Jakarta",
      telepon: "08123456789",
      statusAktif: true,
      status: "AKTIF",
      tanggalMulai: new Date("2024-01-01"),
      tanggalKedaluwarsa: new Date("2026-12-31"),
    },
  });

  // ── 3. Tenant Admin ────────────────────────────────────
  const tenantPassword = await bcrypt.hash("kasir123", 12);
  await prisma.user.upsert({
    where: { email: "kris@tokopakkris.com" },
    update: {},
    create: {
      email: "kris@tokopakkris.com",
      passwordHash: tenantPassword,
      nama: "Pak Kris",
      role: "TENANT_ADMIN",
      tenantId: tenant.id,
      isActive: true,
    },
  });
  console.log("✅ Tenant Admin: kris@tokopakkris.com / kasir123");

  // ── 4. Products ────────────────────────────────────────
  const products = [
    { nama: "Beras Ramos 5kg", barcode: "8991002101160", kategori: "BERAS" as const, hargaJual: 72000, hargaModal: 68000, stok: 50, satuan: "karung" },
    { nama: "Beras Setra Ramos 10kg", barcode: "8991002101221", kategori: "BERAS" as const, hargaJual: 140000, hargaModal: 132000, stok: 30, satuan: "karung" },
    { nama: "Gula Pasir Gulaku 1kg", barcode: "8999909020034", kategori: "GULA" as const, hargaJual: 18000, hargaModal: 16500, stok: 100, satuan: "pcs" },
    { nama: "Gula Pasir Lokal 1kg", barcode: "8997002800130", kategori: "GULA" as const, hargaJual: 16000, hargaModal: 14800, stok: 80, satuan: "pcs" },
    { nama: "Minyak Goreng Tropical 2L", barcode: "8996001600148", kategori: "MINYAK" as const, hargaJual: 45000, hargaModal: 42000, stok: 40, satuan: "botol" },
    { nama: "Minyak Goreng Sania 2L", barcode: "8995070100530", kategori: "MINYAK" as const, hargaJual: 42000, hargaModal: 39000, stok: 45, satuan: "botol" },
    { nama: "Minyak Goreng Bimoli 2L", barcode: "8992692100947", kategori: "MINYAK" as const, hargaJual: 48000, hargaModal: 45000, stok: 35, satuan: "botol" },
    { nama: "Telur Ayam 1kg", barcode: "2001202300001", kategori: "TELUR" as const, hargaJual: 28000, hargaModal: 26000, stok: 60, satuan: "kg" },
    { nama: "Telur Ayam 1/2kg", barcode: "2001202300002", kategori: "TELUR" as const, hargaJual: 15000, hargaModal: 13500, stok: 40, satuan: "pcs" },
    { nama: "Susu Kental Manis Frisian Flag", barcode: "8992752100016", kategori: "SUSU" as const, hargaJual: 12000, hargaModal: 10800, stok: 80, satuan: "kaleng" },
    { nama: "Susu Kental Manis Indomilk", barcode: "8992959100012", kategori: "SUSU" as const, hargaJual: 12000, hargaModal: 10700, stok: 75, satuan: "kaleng" },
    { nama: "Susu UHT Ultra Milk 1L", barcode: "8991002300112", kategori: "SUSU" as const, hargaJual: 19000, hargaModal: 17500, stok: 30, satuan: "kotak" },
    { nama: "Indomie Goreng", barcode: "8991002100606", kategori: "MAKANAN" as const, hargaJual: 3500, hargaModal: 3000, stok: 200, satuan: "pcs" },
    { nama: "Indomie Kuah Soto", barcode: "8991002100620", kategori: "MAKANAN" as const, hargaJual: 3500, hargaModal: 3000, stok: 180, satuan: "pcs" },
    { nama: "Mie Sedap Goreng", barcode: "8998866200037", kategori: "MAKANAN" as const, hargaJual: 3500, hargaModal: 2900, stok: 160, satuan: "pcs" },
    { nama: "Kopiko 78s", barcode: "8992802100018", kategori: "SNACK" as const, hargaJual: 5000, hargaModal: 4200, stok: 120, satuan: "pcs" },
    { nama: "Biskuit Roma Kelapa", barcode: "8991102106515", kategori: "SNACK" as const, hargaJual: 12000, hargaModal: 10800, stok: 50, satuan: "pcs" },
    { nama: "Taro Net 75gr", barcode: "8992802100032", kategori: "SNACK" as const, hargaJual: 7500, hargaModal: 6500, stok: 60, satuan: "pcs" },
    { nama: "Air Mineral Aqua 1.5L", barcode: "8886008101125", kategori: "MINUMAN" as const, hargaJual: 7000, hargaModal: 6000, stok: 100, satuan: "botol" },
    { nama: "Air Mineral Le Minerale 1.5L", barcode: "8997002800104", kategori: "MINUMAN" as const, hargaJual: 6500, hargaModal: 5500, stok: 90, satuan: "botol" },
    { nama: "Teh Botol Sosro 500ml", barcode: "8991002100651", kategori: "MINUMAN" as const, hargaJual: 7000, hargaModal: 6000, stok: 70, satuan: "botol" },
    { nama: "Coca-Cola 390ml", barcode: "8995282100035", kategori: "MINUMAN" as const, hargaJual: 8000, hargaModal: 6800, stok: 55, satuan: "kaleng" },
    { nama: "Rokok Surya 16", barcode: "8999909100040", kategori: "ROKOK" as const, hargaJual: 28000, hargaModal: 26500, stok: 40, satuan: "slop" },
    { nama: "Rokok Sampoerna A Mild", barcode: "8999909100033", kategori: "ROKOK" as const, hargaJual: 38000, hargaModal: 36000, stok: 35, satuan: "slop" },
    { nama: "Sabun Lifebuoy", barcode: "8999999012345", kategori: "KEBERSIHAN" as const, hargaJual: 5000, hargaModal: 4200, stok: 40, satuan: "pcs" },
    { nama: "Shampo Clear 70ml", barcode: "8999999012346", kategori: "KEBERSIHAN" as const, hargaJual: 7000, hargaModal: 6000, stok: 30, satuan: "pcs" },
    { nama: "Pasta Gigi Pepsodent", barcode: "8999999012347", kategori: "KEBERSIHAN" as const, hargaJual: 8000, hargaModal: 6800, stok: 35, satuan: "pcs" },
    { nama: "Sabun Cuci Piring Sunlight", barcode: "8999999012348", kategori: "KEBERSIHAN" as const, hargaJual: 12000, hargaModal: 10500, stok: 25, satuan: "botol" },
    { nama: "Buku Tulis SIDU 38 lembar", barcode: "8999999012349", kategori: "ALAT_TULIS" as const, hargaJual: 5000, hargaModal: 4000, stok: 100, satuan: "pcs" },
    { nama: "Pulpen Pilot Faster", barcode: "8999999012350", kategori: "ALAT_TULIS" as const, hargaJual: 3000, hargaModal: 2500, stok: 80, satuan: "pcs" },
  ];

  // Hapus produk existing untuk menghindari duplikat barcode
  await prisma.product.deleteMany({ where: { tenantId: tenant.id } });

  for (const product of products) {
    await prisma.product.create({
      data: { ...product, tenantId: tenant.id },
    });
  }
  console.log(`✅ ${products.length} produk created`);

  // ── 5. Settings ─────────────────────────────────────────
  await prisma.setting.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      footerStruk: "Terima kasih telah berbelanja\nBarang yang sudah dibeli tidak dapat dikembalikan",
      cetakStrukOtomatis: true,
    },
  });
  console.log("✅ Settings created");

  // ── 6. Customers ────────────────────────────────────────
  const customers = [
    { nama: "Budi Santoso", telepon: "08123456781", alamat: "Jl. Melati No. 1, Jakarta" },
    { nama: "Siti Nurhaliza", telepon: "08123456782", alamat: "Jl. Mawar No. 5, Jakarta" },
    { nama: "Ahmad Hidayat", telepon: "08123456783", alamat: "Jl. Kenanga No. 10, Jakarta" },
  ];

  for (const customer of customers) {
    const existing = await prisma.customer.findFirst({
      where: { nama: customer.nama, tenantId: tenant.id },
    });
    if (!existing) {
      await prisma.customer.create({
        data: { ...customer, tenantId: tenant.id },
      });
    }
  }
  console.log("✅ 3 customers created");

  // Demo transactions skipped (SQLite compatibility)

  // ── Selesai ─────────────────────────────────────────────
  console.log("\n" + "=".repeat(45));
  console.log("🎉  Seeding Complete!");
  console.log("=".repeat(45));
  console.log("\n📧 Super Admin:");
  console.log("   Email:    admin@adntmarket.app");
  console.log("   Password: admin123");
  console.log("\n📧 Tenant Admin (Toko Pak Kris):");
  console.log("   Email:    kris@tokopakkris.com");
  console.log("   Password: kasir123");
  console.log("\n🔗 Akses:");
  console.log("   Tenant:   http://localhost:3000/tokopakkris");
  console.log("   Admin:    http://localhost:3000/admin");
  console.log("=".repeat(45));
}

main().catch((e) => {
  console.error("❌ Seed error:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
