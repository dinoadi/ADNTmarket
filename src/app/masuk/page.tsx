"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Store,
  Shield,
  ArrowRight,
  ChevronRight,
  ShoppingBag,
  BarChart3,
  Package,
  Sparkles,
} from "lucide-react";

export default function MasukPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"toko" | "admin">("toko");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adnt_token");
    const user = localStorage.getItem("adnt_user");
    if (token && user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed.tenantSlug) {
          router.push("/" + parsed.tenantSlug + "/kasir");
        } else if (parsed.role === "SUPER_ADMIN") {
          router.push("/admin");
        }
      } catch {
        /* ignore */
      }
    }
  }, [router]);

  const handleAccessToko = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) {
      toast.error("Masukkan nama toko");
      return;
    }
    router.push("/" + slug.toLowerCase().replace(/\s+/g, ""));
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Masukkan email dan password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error ?? "Login gagal");
        setLoading(false);
        return;
      }
      const userData = data.data.user;
      if (userData.role !== "SUPER_ADMIN") {
        toast.error("Akun ini bukan Super Admin");
        setLoading(false);
        return;
      }
      localStorage.setItem("adnt_token", data.data.token);
      localStorage.setItem("adnt_user", JSON.stringify(userData));
      toast.success("Selamat datang, " + userData.nama);
      router.push("/admin");
    } catch {
      toast.error("Terjadi kesalahan jaringan");
      setLoading(false);
    }
  };

  const benefits = [
    { icon: ShoppingBag, label: "Kasir Cepat" },
    { icon: BarChart3, label: "Laporan Real-time" },
    { icon: Package, label: "Manajemen Stok" },
    { icon: Sparkles, label: "Multi-Tenant" },
  ];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ── Left: Brand Panel ── */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 px-8 py-10 lg:w-1/2 lg:px-12 lg:py-14">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-32 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute left-1/3 top-1/3 h-64 w-64 rounded-full bg-brand-400/10 blur-[100px]" />

        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Top */}
        <div className="relative z-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-bold text-white backdrop-blur-sm transition-transform group-hover:scale-105">
              A
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              ADNT<span className="text-blue-300">market</span>
            </span>
          </Link>
        </div>

        {/* Center */}
        <div className="relative z-10 my-auto py-12">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-blue-200 backdrop-blur-sm">
            <span className="flex h-1.5 w-1.5 rounded-full bg-blue-400" />
            POS Kasir Digital UMKM
          </div>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            Kelola Toko{" "}
            <span className="bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
              Lebih Mudah
            </span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-blue-100/80">
            Catat transaksi, kelola stok, cetak struk thermal 58mm. Platform
            kasir digital khusus untuk toko sembako, kelontong, dan UMKM
            Indonesia.
          </p>

          {/* Benefits row */}
          <div className="mt-8 flex flex-wrap gap-3">
            {benefits.map((b) => (
              <div
                key={b.label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-blue-100 backdrop-blur-sm"
              >
                <b.icon className="h-3.5 w-3.5" />
                {b.label}
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex -space-x-2">
              {[
                "bg-blue-400",
                "bg-cyan-400",
                "bg-indigo-400",
                "bg-teal-400",
              ].map((c, i) => (
                <div
                  key={i}
                  className={`h-8 w-8 rounded-full border-2 border-brand-800 ${c}`}
                />
              ))}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Digunakan oleh 100+ toko
              </p>
              <p className="text-xs text-blue-200/70">
                Di seluruh Indonesia
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-sm text-blue-200/60">
          &copy; {new Date().getFullYear()} ADNTmarket.app
        </div>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="flex flex-1 items-center justify-center bg-surface-50 px-6 py-10 lg:px-12">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                A
              </div>
              <span className="text-lg font-bold tracking-tight text-surface-900">
                ADNT<span className="text-brand-600">market</span>
              </span>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-surface-900">
              Selamat Datang
            </h2>
            <p className="mt-1 text-sm text-surface-500">
              Masuk untuk melanjutkan
            </p>
          </div>

          {/* Mode toggle */}
          <div className="mb-8 flex rounded-xl border border-surface-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setMode("toko")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
                mode === "toko"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-surface-500 hover:text-surface-700"
              }`}
            >
              <Store className="h-4 w-4" />
              Akses Toko
            </button>
            <button
              onClick={() => setMode("admin")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
                mode === "admin"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-surface-500 hover:text-surface-700"
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin
            </button>
          </div>

          {mode === "toko" ? (
            <form onSubmit={handleAccessToko} className="space-y-5">
              <div>
                <label
                  htmlFor="slug"
                  className="mb-1.5 block text-sm font-medium text-surface-700"
                >
                  Nama Toko
                </label>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="Contoh: tokopakkris"
                  autoFocus
                  className="w-full rounded-xl border border-surface-300 bg-white px-4 py-2.5 text-sm text-surface-900 outline-none transition-all placeholder:text-surface-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
                <p className="mt-1.5 text-xs text-surface-400">
                  Masukkan slug/nama toko Anda
                </p>
              </div>
              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-200 transition-all hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-300"
              >
                Masuk ke Toko
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="adminEmail"
                  className="mb-1.5 block text-sm font-medium text-surface-700"
                >
                  Email
                </label>
                <input
                  id="adminEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@adntmarket.app"
                  autoFocus
                  className="w-full rounded-xl border border-surface-300 bg-white px-4 py-2.5 text-sm text-surface-900 outline-none transition-all placeholder:text-surface-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label
                  htmlFor="adminPassword"
                  className="mb-1.5 block text-sm font-medium text-surface-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="adminPassword"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full rounded-xl border border-surface-300 bg-white px-4 py-2.5 pr-10 text-sm text-surface-900 outline-none transition-all placeholder:text-surface-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-200 transition-all hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-300 disabled:bg-surface-300 disabled:text-surface-500 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-surface-500">
              Belum punya toko?{" "}
              <Link
                href="/daftar"
                className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
              >
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
