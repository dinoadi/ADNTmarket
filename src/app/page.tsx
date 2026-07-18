"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function HomePage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [mode, setMode] = useState<"toko" | "admin">("toko");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      } catch { /* ignore */ }
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
    setAdminLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error ?? "Login gagal");
        setAdminLoading(false);
        return;
      }
      const userData = data.data.user;
      if (userData.role !== "SUPER_ADMIN") {
        toast.error("Akun ini bukan Super Admin");
        setAdminLoading(false);
        return;
      }
      localStorage.setItem("adnt_token", data.data.token);
      localStorage.setItem("adnt_user", JSON.stringify(userData));
      toast.success("Selamat datang, " + userData.nama);
      router.push("/admin");
    } catch {
      toast.error("Terjadi kesalahan jaringan");
      setAdminLoading(false);
    }
  };

  const features = [
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125V9M6 6h12M3 6h18m-6 8.25h2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75H15m-6 0H6.75a.75.75 0 01-.75-.75v-1.5a.75.75 0 01.75-.75H9m3-3V9m0 2.25v3" />
        </svg>
      ),
      title: "Kasir Cepat & Tepat",
      desc: "Input produk dengan scan barcode atau pencarian cepat. Shortcut nominal rupiah, kalkulasi diskon otomatis, dan cetak struk thermal 58mm langsung.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      title: "Laporan Real-time",
      desc: "Pantau omzet, laba kotor, dan jumlah transaksi harian. Semua data tersimpan aman dan bisa diakses kapan saja dari dashboard.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      ),
      title: "Manajemen Stok",
      desc: "Catat stok produk otomatis setiap transaksi. Dapatkan peringatan saat stok menipis. Kelola produk, kategori, dan harga dengan mudah.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      title: "Multi-Tenant SaaS",
      desc: "Satu platform untuk banyak toko. Setiap toko punya data terisolasi. Cocok untuk pemilik usaha dengan banyak cabang atau penyedia layanan POS.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      title: "Aman & Terpercaya",
      desc: "Data tersimpan aman di cloud dengan akses terenkripsi. Setiap toko memiliki credential sendiri. Hak akses terpisah untuk pemilik dan kasir.",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      title: "Cetak Struk Thermal",
      desc: "Dukungan cetak struk ukuran 58mm. Format struk otomatis dengan nama toko, daftar belanja, total, dan kembalian. Bisa langsung dari browser.",
    },
  ];

  const scrollToLogin = () => {
    const el = document.getElementById("login-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-30 border-b border-surface-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              A
            </div>
            <span className="text-lg font-bold tracking-tight text-surface-900">
              ADNT<span className="text-brand-600">market</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-6 sm:flex">
            <button onClick={() => { const el = document.getElementById("fitur"); el?.scrollIntoView({ behavior: "smooth" }); }}
              className="text-sm font-medium text-surface-600 hover:text-surface-900">
              Fitur
            </button>
            <a href="/daftar" className="text-sm font-medium text-surface-600 hover:text-surface-900">
              Daftar
            </a>
            <button
              onClick={scrollToLogin}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Masuk
            </button>
          </div>

          {/* Mobile Nav Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100 sm:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"} />
            </svg>
          </button>
        </div>

        {/* Mobile Nav Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-surface-200 bg-white px-4 py-4 sm:hidden">
            <div className="flex flex-col gap-3">
              <button onClick={() => { setMobileMenuOpen(false); const el = document.getElementById("fitur"); el?.scrollIntoView({ behavior: "smooth" }); }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-surface-600 hover:bg-surface-100 text-left">
                Fitur
              </button>
              <a href="/daftar" onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-surface-600 hover:bg-surface-100">
                Daftar
              </a>
              <button
                onClick={() => { setMobileMenuOpen(false); scrollToLogin(); }}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white text-center"
              >
                Masuk
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-blue-50" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="flex h-2 w-2 rounded-full bg-brand-500" />
              POS Kasir Digital untuk UMKM Indonesia
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-surface-900 sm:text-5xl lg:text-6xl">
              Kasir Toko{" "}
              <span className="bg-gradient-to-r from-brand-600 to-blue-600 bg-clip-text text-transparent">
                Semakin Mudah
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-surface-500 sm:text-lg">
              Catat transaksi, kelola stok, cetak struk thermal 58mm. 
              Platform kasir digital khusus untuk toko sembako, kelontong, dan UMKM Indonesia.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={scrollToLogin}
                className="w-full rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand-200 transition-all hover:bg-brand-700 hover:shadow-lg sm:w-auto"
              >
                Mulai Bertransaksi
              </button>
              <button
                onClick={() => { const el = document.getElementById("fitur"); el?.scrollIntoView({ behavior: "smooth" }); }}
                className="w-full rounded-xl border-2 border-surface-200 bg-white px-6 py-3 text-sm font-semibold text-surface-700 transition-all hover:border-surface-300 hover:bg-surface-50 sm:w-auto"
              >
                Lihat Fitur
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-surface-100 bg-surface-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
            <div>
              <p className="text-3xl font-bold text-surface-900">Multi-Toko</p>
              <p className="mt-1 text-sm text-surface-500">Satu platform, banyak toko</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-surface-900">58mm</p>
              <p className="mt-1 text-sm text-surface-500">Dukungan struk thermal</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-surface-900">Real-time</p>
              <p className="mt-1 text-sm text-surface-500">Laporan instant</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-surface-900">Cloud</p>
              <p className="mt-1 text-sm text-surface-500">Akses di mana saja</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Fitur ── */}
      <section id="fitur" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-surface-900">Fitur Lengkap untuk Toko Anda</h2>
            <p className="mt-3 text-base text-surface-500">
              Semua yang Anda butuhkan untuk menjalankan kasir toko secara profesional.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-surface-100 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-base font-semibold text-surface-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-surface-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Login / CTA ── */}
      <section id="login-section" className="border-t border-surface-100 bg-gradient-to-b from-white to-surface-50 py-16 sm:py-20">
        <div className="mx-auto max-w-sm px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-surface-900">Mulai Sekarang</h2>
            <p className="mt-2 text-sm text-surface-500">
              Masuk ke toko Anda atau daftar untuk membuat toko baru.
            </p>
          </div>

          <div className="mt-8 mb-6 flex rounded-xl border border-surface-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setMode("toko")}
              className={"flex-1 rounded-lg py-2 text-sm font-medium transition-all " + (mode === "toko"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-surface-500 hover:text-surface-700")}
            >
              Akses Toko
            </button>
            <button
              onClick={() => setMode("admin")}
              className={"flex-1 rounded-lg py-2 text-sm font-medium transition-all " + (mode === "admin"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-surface-500 hover:text-surface-700")}
            >
              Admin
            </button>
          </div>

          {mode === "toko" ? (
            <div className="animate-fade-in space-y-5">
              <div>
                <h3 className="text-base font-semibold text-surface-900">Akses Toko Anda</h3>
                <p className="mt-1 text-sm text-surface-500">
                  Masukkan slug toko untuk masuk ke halaman kasir.
                </p>
              </div>
              <form onSubmit={handleAccessToko} className="space-y-4">
                <div>
                  <label htmlFor="slug" className="mb-1 block text-sm font-medium text-surface-700">Nama Toko</label>
                  <input id="slug" type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                    placeholder="Contoh: tokopakkris" autoFocus={mode === "toko"}
                    className="w-full rounded-xl border border-surface-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                  <p className="mt-1.5 text-xs text-surface-400">
                    contoh: tokopakkris, tokobudi, sembakomakmur
                  </p>
                </div>
                <button type="submit"
                  className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700">
                  Masuk ke Toko
                </button>
              </form>
              <div className="text-center">
                <a href="/daftar" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  Belum punya toko? Daftar di sini
                </a>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in space-y-5">
              <div>
                <h3 className="text-base font-semibold text-surface-900">Login Admin</h3>
                <p className="mt-1 text-sm text-surface-500">
                  Masuk sebagai administrator platform.
                </p>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label htmlFor="adminEmail" className="mb-1 block text-sm font-medium text-surface-700">Email</label>
                  <input id="adminEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@adntmarket.app" autoFocus={mode === "admin"}
                    className="w-full rounded-xl border border-surface-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                </div>
                <div>
                  <label htmlFor="adminPassword" className="mb-1 block text-sm font-medium text-surface-700">Password</label>
                  <input id="adminPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full rounded-xl border border-surface-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                </div>
                <button type="submit" disabled={adminLoading}
                  className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:bg-surface-300 disabled:text-surface-500">
                  {adminLoading ? "Memproses..." : "Masuk"}
                </button>
              </form>
            </div>
          )}

          <p className="mt-10 text-center text-xs text-surface-400">
            &copy; {new Date().getFullYear()} ADNTmarket.app &mdash; Platform Kasir Digital untuk UMKM
          </p>
        </div>
      </section>
    </div>
  );
}
