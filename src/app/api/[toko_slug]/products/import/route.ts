import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";
import { handleApiError } from "@/lib/api-response";
import { z } from "zod";

const KATEGORI_LIST = [
  "MAKANAN", "MINUMAN", "SEMBAKO", "SNACK", "MINYAK", "BERAS", "GULA",
  "TELUR", "SUSU", "ROKOK", "ALAT_TULIS", "KEBERSIHAN", "LAINNYA",
] as const;

export async function POST(request: NextRequest, { params }: { params: { toko_slug: string } }) {
  try {
    const auth = getAuthUser(request);
    const tenantId = auth.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant tidak ditemukan" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "File CSV wajib diupload" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    if (lines.length < 2) {
      return NextResponse.json({ success: false, error: "File CSV kosong atau hanya header" }, { status: 400 });
    }

    // Parse header
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(",").map((h) => h.replace(/"/g, "").trim());

    const namaIdx = headers.findIndex((h) => h.includes("nama"));
    const kategoriIdx = headers.findIndex((h) => h.includes("kategori"));
    const hargaJualIdx = headers.findIndex((h) => h.includes("harga jual"));
    const hargaModalIdx = headers.findIndex((h) => h.includes("harga modal"));
    const stokIdx = headers.findIndex((h) => h.includes("stok"));
    const satuanIdx = headers.findIndex((h) => h.includes("satuan"));

    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else { current += ch; }
      }
      result.push(current.trim());
      return result;
    };

    const results: { baris: number; nama: string; status: string; pesan?: string }[] = [];
    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const nama = cols[namaIdx]?.replace(/"/g, "")?.trim();
      if (!nama) { errors++; results.push({ baris: i + 1, nama: "-", status: "GAGAL", pesan: "Nama produk kosong" }); continue; }

      const kategoriRaw = cols[kategoriIdx]?.replace(/"/g, "")?.trim().toUpperCase() || "LAINNYA";
      const kategori = KATEGORI_LIST.includes(kategoriRaw as any) ? kategoriRaw : "LAINNYA";
      const hargaJual = parseInt(cols[hargaJualIdx]?.replace(/[^0-9]/g, "") || "0", 10);
      const hargaModal = parseInt(cols[hargaModalIdx]?.replace(/[^0-9]/g, "") || "0", 10);
      const stok = parseInt(cols[stokIdx]?.replace(/[^0-9]/g, "") || "0", 10);
      const satuan = cols[satuanIdx]?.replace(/"/g, "")?.trim() || "pcs";

      try {
        const existing = await prisma.product.findFirst({
          where: { nama, tenantId, isActive: true },
        });

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: { kategori, hargaJual, hargaModal, stok, satuan },
          });
          updated++;
          results.push({ baris: i + 1, nama, status: "DIPERBARUI" });
        } else {
          await prisma.product.create({
            data: { nama, kategori, hargaJual, hargaModal, stok, satuan, tenantId },
          });
          imported++;
          results.push({ baris: i + 1, nama, status: "DITAMBAHKAN" });
        }
      } catch (err: any) {
        errors++;
        results.push({ baris: i + 1, nama, status: "GAGAL", pesan: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      data: { imported, updated, errors, total: imported + updated + errors, details: results },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
