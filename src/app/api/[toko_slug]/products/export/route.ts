import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-utils";
import { handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest, { params }: { params: { toko_slug: string } }) {
  try {
    const auth = getAuthUser(request);
    const tenantId = auth.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant tidak ditemukan" }, { status: 404 });
    }

    const search = request.nextUrl.searchParams.get("search") || "";

    const where: any = { tenantId, isActive: true };
    if (search) {
      where.nama = { contains: search, mode: "insensitive" };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        nama: true,
        kategori: true,
        hargaJual: true,
        hargaModal: true,
        stok: true,
        satuan: true,
        createdAt: true,
      },
    });

    // Generate CSV
    const header = "No,Nama Produk,Kategori,Harga Jual,Harga Modal,Stok,Satuan,Tanggal Ditambahkan\n";
    const rows = products.map((p, i) => {
      const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
      return [
        i + 1,
        escape(p.nama),
        p.kategori || "",
        p.hargaJual,
        p.hargaModal || 0,
        p.stok,
        p.satuan || "",
        p.createdAt.toISOString().split("T")[0],
      ].join(",");
    });

    const csv = "\uFEFF" + header + rows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="produk-${params.toko_slug}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
