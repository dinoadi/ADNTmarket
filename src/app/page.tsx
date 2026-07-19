"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  BarChart3,
  Package,
  Users,
  ShieldCheck,
  Printer,
  ArrowRight,
  Menu,
  X,
  ChevronRight,
  Star,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Redirect if already logged in
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

  // Navbar scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  }, []);

  const features = [
    {
      icon: ShoppingCart,
      title: "Kasir Cepat & Tepat",
      desc: "Input produk dengan scan barcode atau pencarian cepat. Shortcut nominal rupiah, kalkulasi diskon otomatis, dan cetak struk thermal 58mm langsung.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: BarChart3,
      title: "Laporan Real-time",
      desc: "Pantau omzet, laba kotor, dan jumlah transaksi harian. Semua data tersimpan aman dan bisa diakses kapan saja dari dashboard.",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      icon: Package,
      title: "Manajemen Stok",
      desc: "Catat stok produk otomatis setiap transaksi. Dapatkan peringatan saat stok menipis. Kelola produk, kategori, dan harga dengan mudah.",
      gradient: "from-violet-500 to-purple-500",
    },
    {
      icon: Users,
      title: "Multi-Tenant SaaS",
      desc: "Satu platform untuk banyak toko. Setiap toko punya data terisolasi. Cocok untuk pemilik usaha dengan banyak cabang atau penyedia layanan POS.",
      gradient: "from-orange-500 to-amber-500",
    },
    {
      icon: ShieldCheck,
      title: "Aman & Terpercaya",
      desc: "Data tersimpan aman di cloud dengan akses terenkripsi. Setiap toko memiliki credential sendiri. Hak akses terpisah untuk pemilik dan kasir.",
      gradient: "from-rose-500 to-pink-500",
    },
    {
      icon: Printer,
      title: "Cetak Struk Thermal",
      desc: "Dukungan cetak struk ukuran 58mm. Format struk otomatis dengan nama toko, daftar belanja, total, dan kembalian. Bisa langsung dari browser.",
      gradient: "from-sky-500 to-indigo-500",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-surface-950">
      {/* ═══════════════════════════════════════════════════
           NAVBAR
           ═══════════════════════════════════════════════════ */}
      <nav
        className={
          "fixed inset-x-0 top-0 z-50 transition-all duration-300 " +
          (scrolled
            ? "border-b border-surface-200/80 bg-white/90 shadow-sm backdrop-blur-xl dark:border-surface-800 dark:bg-surface-950/90"
            : "bg-transparent")
        }
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm transition-transform hover:scale-105">
              A
            </div>
            <span className="text-lg font-bold tracking-tight text-surface-900 dark:text-white">
              ADNT<span className="text-brand-600">market</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-1 sm:flex">
            <button
              onClick={() => scrollTo("fitur")}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
            >
              Fitur
            </button>
            <Link
              href="/daftar"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
            >
              Daftar
            </Link>
            <div className="ml-3 h-5 w-px bg-surface-200 dark:bg-surface-700" />
            <Link
              href="/masuk"
              className="ml-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md"
            >
              Masuk
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-surface-100 sm:hidden dark:hover:bg-surface-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="border-t border-surface-200 bg-white px-4 py-4 shadow-lg sm:hidden dark:border-surface-800 dark:bg-surface-950">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => scrollTo("fitur")}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
              >
                <Star className="h-4 w-4" />
                Fitur
              </button>
              <Link
                href="/daftar"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
              >
                <Users className="h-4 w-4" />
                Daftar
              </Link>
              <div className="my-2 h-px bg-surface-100 dark:bg-surface-800" />
              <Link
                href="/masuk"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Masuk
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════
           HERO
           ═══════════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] overflow-hidden pt-24">
        {/* Animated background blobs */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-blue-50 dark:from-surface-950 dark:via-surface-950 dark:to-brand-950" />
        <div className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] animate-pulse-glow rounded-full bg-brand-300/20 blur-[150px] dark:bg-brand-600/10" />
        <div className="pointer-events-none absolute -right-40 top-20 h-[500px] w-[500px] animate-float-delayed rounded-full bg-blue-300/20 blur-[150px] dark:bg-blue-600/10" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-[400px] w-[400px] animate-float rounded-full bg-cyan-300/10 blur-[120px] dark:bg-cyan-600/10" />

        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Floating decorative elements */}
        <div className="pointer-events-none absolute left-[10%] top-1/4 h-16 w-16 animate-float rounded-2xl border border-brand-200/50 bg-white/30 backdrop-blur-sm dark:border-brand-700/30 dark:bg-brand-900/20" />
        <div className="pointer-events-none absolute right-[15%] top-1/3 h-12 w-12 animate-float-delayed rounded-full border border-blue-200/50 bg-white/30 backdrop-blur-sm dark:border-blue-700/30 dark:bg-blue-900/20" />
        <div className="pointer-events-none absolute bottom-1/4 right-[20%] h-20 w-20 animate-float rounded-full border border-cyan-200/50 bg-white/20 backdrop-blur-sm dark:border-cyan-700/30 dark:bg-cyan-900/20" />

        {/* Hero content */}
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8 lg:pb-28 lg:pt-32">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="animate-fade-in mb-6 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-medium text-brand-700 dark:border-brand-700/50 dark:bg-brand-900/30 dark:text-brand-300">
              <span className="flex h-2 w-2 rounded-full bg-brand-500" />
              POS Kasir Digital untuk UMKM Indonesia
            </div>

            {/* Main heading */}
            <h1 className="animate-slide-up text-4xl font-extrabold leading-[1.1] tracking-tight text-surface-900 dark:text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              Kasir Toko{" "}
              <span className="bg-gradient-to-r from-brand-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Semakin Mudah
              </span>
              <br />
              Bisnis{" "}
              <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                Semakin Maju
              </span>
            </h1>

            {/* Description */}
            <p className="animate-slide-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-surface-500 dark:text-surface-400 sm:text-lg">
              Catat transaksi, kelola stok, cetak struk thermal 58mm.
              Platform kasir digital khusus untuk toko sembako, kelontong,
              dan UMKM Indonesia — semuanya dari browser.
            </p>

            {/* CTA Buttons */}
            <div className="animate-slide-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/masuk"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition-all hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-300 sm:w-auto dark:shadow-brand-900/30"
              >
                Mulai Bertransaksi
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                onClick={() => scrollTo("fitur")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-surface-200 bg-white px-7 py-3 text-sm font-semibold text-surface-700 shadow-sm transition-all hover:border-surface-300 hover:bg-surface-50 hover:shadow-md sm:w-auto dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-600 dark:hover:bg-surface-800"
              >
                Lihat Fitur
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Social Proof */}
            <div className="animate-fade-in mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <div className="flex -space-x-2">
                {[
                  "bg-blue-400",
                  "bg-emerald-400",
                  "bg-violet-400",
                  "bg-amber-400",
                  "bg-rose-400",
                ].map((c, i) => (
                  <div
                    key={i}
                    className={
                      "h-9 w-9 rounded-full border-2 border-white ring-2 ring-white dark:border-surface-900 dark:ring-surface-950 " +
                      c
                    }
                  />
                ))}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-surface-900 dark:text-white">
                  <span className="text-brand-600">100+</span> UMKM
                  telah bergabung
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Dari Sabang sampai Merauke
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
           STATS BAR
           ═══════════════════════════════════════════════════ */}
      <section className="relative border-y border-surface-100 bg-surface-50/80 dark:border-surface-800 dark:bg-surface-900/50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
            {[
              { value: "Multi-Toko", label: "Satu platform, banyak toko", icon: Users },
              { value: "58mm", label: "Dukungan struk thermal", icon: Printer },
              { value: "Real-time", label: "Laporan instan", icon: BarChart3 },
              { value: "Cloud", label: "Akses di mana saja", icon: ShieldCheck },
            ].map((stat) => (
              <div key={stat.value} className="group">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:group-hover:bg-brand-900/50">
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-lg font-bold text-surface-900 dark:text-white sm:text-xl">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400 sm:text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
           FITUR
           ═══════════════════════════════════════════════════ */}
      <section
        id="fitur"
        className="relative overflow-hidden py-16 sm:py-24"
      >
        {/* Background decoration */}
        <div className="pointer-events-none absolute -right-40 top-1/2 h-96 w-96 rounded-full bg-brand-100/30 blur-[100px] dark:bg-brand-900/20" />
        <div className="pointer-events-none absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-blue-100/30 blur-[100px] dark:bg-blue-900/20" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-700/50 dark:bg-brand-900/30 dark:text-brand-300">
              <span className="flex h-1.5 w-1.5 rounded-full bg-brand-500" />
              Mengapa ADNTmarket?
            </div>
            <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
              Fitur Lengkap untuk{" "}
              <span className="gradient-text">Toko Anda</span>
            </h2>
            <p className="mt-3 text-base text-surface-500 dark:text-surface-400">
              Semua yang Anda butuhkan untuk menjalankan kasir toko secara
              profesional.
            </p>
          </div>

          {/* Features grid */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border border-surface-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-100 hover:shadow-lg dark:border-surface-800 dark:bg-surface-900 dark:hover:border-brand-700/50"
              >
                {/* Hover gradient overlay */}
                <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-brand-50/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100 dark:from-brand-900/20" />

                {/* Icon */}
                <div
                  className={
                    "relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm " +
                    f.gradient
                  }
                >
                  <f.icon className="h-6 w-6" />
                </div>

                {/* Content */}
                <h3 className="relative mb-2 text-base font-semibold text-surface-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="relative text-sm leading-relaxed text-surface-500 dark:text-surface-400">
                  {f.desc}
                </p>

                {/* Bottom accent line */}
                <div className="relative mt-4 h-0.5 w-0 rounded-full bg-gradient-to-r from-brand-500/50 to-transparent transition-all group-hover:w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
           CTA
           ═══════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-surface-100 bg-gradient-to-b from-white to-surface-50 py-16 dark:border-surface-800 dark:from-surface-950 dark:to-surface-900 sm:py-20">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-brand-200/20 blur-[100px] dark:bg-brand-700/10" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-blue-200/20 blur-[100px] dark:bg-blue-700/10" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">
            Siap{" "}
            <span className="bg-gradient-to-r from-brand-600 to-blue-600 bg-clip-text text-transparent">
              Memodernisasi
            </span>{" "}
            Kasir Toko Anda?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-surface-500 dark:text-surface-400">
            Bergabung dengan 100+ UMKM di seluruh Indonesia yang sudah
            beralih ke ADNTmarket. Gratis biaya pendaftaran, bayar sesuai
            paket yang Anda pilih.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/masuk"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-200 transition-all hover:bg-brand-700 hover:shadow-lg sm:w-auto dark:shadow-brand-900/30"
            >
              Masuk ke Toko
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/daftar"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-surface-200 bg-white px-7 py-3.5 text-sm font-bold text-brand-600 shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50 hover:shadow-md sm:w-auto dark:border-surface-700 dark:bg-surface-900 dark:text-brand-400 dark:hover:border-brand-600 dark:hover:bg-brand-900/20"
            >
              Daftar Toko Baru
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-6 text-xs text-surface-400 dark:text-surface-500">
            Tidak perlu kartu kredit. Mulai gratis, bayar saat scalable.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
           FOOTER
           ═══════════════════════════════════════════════════ */}
      <footer className="border-t border-surface-200 bg-surface-50 dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                  A
                </div>
                <span className="text-base font-bold tracking-tight text-surface-900 dark:text-white">
                  ADNT<span className="text-brand-600">market</span>
                </span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-surface-500 dark:text-surface-400">
                Platform POS kasir digital multi-tenant untuk UMKM
                Indonesia. Catat transaksi, kelola stok, cetak struk
                thermal — semua dari browser.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                Produk
              </h4>
              <ul className="space-y-2">
                {["Fitur", "Harga", "API"].map((item) => (
                  <li key={item}>
                    <button
                      onClick={() => scrollTo("fitur")}
                      className="text-sm text-surface-600 transition-colors hover:text-brand-600 dark:text-surface-400 dark:hover:text-brand-400"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Links */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                Akun
              </h4>
              <ul className="space-y-2">
                {[
                  { label: "Masuk", href: "/masuk" },
                  { label: "Daftar", href: "/daftar" },
                  { label: "Admin", href: "/masuk" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-surface-600 transition-colors hover:text-brand-600 dark:text-surface-400 dark:hover:text-brand-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Links */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                Perusahaan
              </h4>
              <ul className="space-y-2">
                {[
                  { label: "Tentang", href: "#" },
                  { label: "Kontak", href: "#" },
                  { label: "Kebijakan Privasi", href: "#" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-surface-600 transition-colors hover:text-brand-600 dark:text-surface-400 dark:hover:text-brand-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-surface-200 pt-6 dark:border-surface-800">
            <p className="text-center text-xs text-surface-400 dark:text-surface-500">
              &copy; {new Date().getFullYear()} ADNTmarket.app &mdash;
              Platform Kasir Digital untuk UMKM Indonesia. Hak cipta
              dilindungi.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
