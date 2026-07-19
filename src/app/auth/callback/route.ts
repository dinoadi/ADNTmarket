import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (!code) {
    return NextResponse.redirect(`${origin}/masuk?error=auth_failed`);
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user?.email) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(`${origin}/masuk?error=auth_failed`);
    }

    // Cari user di database kita via email dari Google
    const user = await prisma.user.findUnique({
      where: { email: data.user.email },
      include: { tenant: true },
    });

    if (!user) {
      // User Google belum terdaftar di ADNTmarket — redirect ke daftar
      return NextResponse.redirect(`${origin}/masuk?error=not_registered`);
    }

    if (!user.isActive) {
      return NextResponse.redirect(`${origin}/masuk?error=inactive`);
    }

    // Generate JWT token sesuai format auth.ts
    const JWT_SECRET =
      process.env.JWT_SECRET ||
      "adntmarket-super-secret-jwt-key-change-in-production";
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Encode token & user data sebagai query params ke halaman masuk
    const userData = {
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenant?.slug || null,
    };

    const encodedToken = encodeURIComponent(token);
    const encodedUser = encodeURIComponent(JSON.stringify(userData));

    return NextResponse.redirect(
      `${origin}/masuk?google_success=true&token=${encodedToken}&user=${encodedUser}`
    );
  } catch (err) {
    console.error("Auth callback error:", err);
    return NextResponse.redirect(`${origin}/masuk?error=auth_failed`);
  }
}
