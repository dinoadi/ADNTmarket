import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { durasiHari: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("Gagal mengambil paket sewa:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat paket sewa" },
      { status: 500 }
    );
  }
}
