"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
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
      number: "01",
      title: "Kasir Cepat",
      desc: "Scan barcode, input nominal, cetak struk thermal 58mm. Semua dalam hitungan detik. Kuantitas, diskon, dan total otomatis.",
    },
    {
      number: "02",
      title: "Laporan Harian",
      desc: "Omzet, laba kotor, jumlah transaksi — langsung terlihat di dashboard. Data real-time, bisa diakses dari mana saja.",
    },
    {
      number: "03",
      title: "Stok Terpantau",
      desc: "Setiap transaksi kurangi stok otomatis. Dapat notifikasi saat barang menipis. Kelola produk, kategori, dan harga dengan mudah.",
    },
    {
      number: "04",
      title: "Multi-Toko",
      desc: "Satu platform, banyak toko. Data terisolasi per tenant. Cocok untuk pemilik usaha dengan cabang atau penyedia POS.",
    },
  ];

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-surface-950">
      {/* ══════════════════════════════════════
           NAVBAR
           ══════════════════════════════════════ */}
      <nav
        className={
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 " +
          (scrolled
            ? "border-b border-warm-200/80 bg-warm-50/90 backdrop-blur-xl dark:border-surface-800 dark:bg-surface-950/90"
            : "bg-transparent")
        }
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-serif font-bold text-white">
              A
            </div>
            <span className="text-lg font-serif font-bold tracking-tight text-surface-900 dark:text-warm-100">
              ADNTmarket
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden items-center gap-8 sm:flex">
            <button
              onClick={() => scrollTo("fitur")}
              className="text-sm text-surface-500 transition-colors hover:text-surface-900 dark:text-warm-400 dark:hover:text-warm-100"
            >
              Fitur
            </button>
            <Link
              href="/daftar"
              className="text-sm text-surface-500 transition-colors hover:text-surface-900 dark:text-warm-400 dark:hover:text-warm-100"
            >
              Daftar
            </Link>
            <div className="h-4 w-px bg-warm-200 dark:bg-surface-700" />
            <Link
              href="/masuk"
              className="inline-flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-5 py-2.5 text-sm font-semibold text-surface-800 shadow-sm transition-all hover:shadow-md dark:border-surface-600 dark:bg-surface-800 dark:text-warm-200"
            >
              Masuk
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-warm-100 sm:hidden dark:hover:bg-surface-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-warm-200 bg-warm-50 px-6 py-5 shadow-lg sm:hidden dark:border-surface-800 dark:bg-surface-950">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => scrollTo("fitur")}
                className="rounded-lg px-3 py-2.5 text-sm text-surface-600 transition-colors hover:bg-warm-100 dark:text-warm-300 dark:hover:bg-surface-800"
              >
                Fitur
              </button>
              <Link
                href="/daftar"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-surface-600 transition-colors hover:bg-warm-100 dark:text-warm-300 dark:hover:bg-surface-800"
              >
                Daftar
              </Link>
              <div className="h-px bg-warm-200 dark:bg-surface-700" />
              <Link
                href="/masuk"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Masuk
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════
           HERO
           ══════════════════════════════════════ */}
      <section className="relative min-h-[85vh] pt-32 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="animate-fade-in mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
              POS Kasir Digital
            </p>
            <h1 className="animate-slide-up text-5xl font-serif leading-[1.05] tracking-tight text-surface-900 dark:text-warm-100 sm:text-6xl lg:text-7xl">
              Kasir toko{" "}
              <span className="italic text-brand-500">lebih sederhana.</span>
              <br />
              Bisnis{" "}
              <span className="italic text-brand-500">makin terkontrol.</span>
            </h1>
            <p className="animate-slide-up mt-6 max-w-xl text-base leading-relaxed text-surface-500 dark:text-warm-400 sm:text-lg">
              Catat transaksi, kelola stok, cetak struk thermal. Platform
              kasir digital untuk UMKM Indonesia — langsung dari browser.
            </p>
            <div className="animate-slide-up mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/masuk"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-900 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-surface-800 hover:shadow-md dark:bg-warm-100 dark:text-surface-900 dark:hover:bg-warm-200"
              >
                Mulai Bertransaksi
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => scrollTo("fitur")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-warm-200 bg-white px-7 py-3.5 text-sm font-semibold text-surface-700 shadow-sm transition-all hover:shadow-md dark:border-surface-600 dark:bg-surface-800 dark:text-warm-200"
              >
                Lihat Fitur
              </button>
            </div>
          </div>

          {/* Decorative — subtle right-side text */}
          <div className="pointer-events-none absolute right-8 top-1/3 hidden select-none lg:block">
            <p className="vertical-rl text-[10px] font-semibold uppercase tracking-[0.25em] text-warm-300 dark:text-surface-700">
              Untuk UMKM Indonesia
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
           FITUR
           ══════════════════════════════════════ */}
      <section id="fitur" className="border-t border-warm-200 py-20 dark:border-surface-800 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 sm:mb-20">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
              Kenapa ADNTmarket
            </p>
            <h2 className="text-3xl font-serif leading-tight text-surface-900 dark:text-warm-100 sm:text-4xl lg:text-5xl">
              Fitur esensial,{" "}
              <span className="italic text-brand-500">tanpa embel-embel.</span>
            </h2>
          </div>

          <div className="grid gap-12 sm:gap-16">
            {features.map((f, i) => (
              <div
                key={i}
                className="group grid gap-6 sm:grid-cols-5 sm:gap-12"
              >
                {/* Number */}
                <div className="sm:col-span-1">
                  <span className="font-serif text-4xl font-bold text-warm-300 dark:text-surface-600 sm:text-5xl">
                    {f.number}
                  </span>
                </div>
                {/* Content */}
                <div className="sm:col-span-4">
                  <h3 className="text-xl font-serif font-bold text-surface-900 dark:text-warm-100 sm:text-2xl">
                    {f.title}
                  </h3>
                  <p className="mt-3 max-w-lg text-base leading-relaxed text-surface-500 dark:text-warm-400">
                    {f.desc}
                  </p>
                </div>
                {/* Subtle divider (except last) */}
                {i < features.length - 1 && (
                  <div className="col-span-full -mb-6 h-px bg-warm-100 dark:bg-surface-800 sm:-mb-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
           STATS / TRUST
           ══════════════════════════════════════ */}
      <section className="border-t border-warm-200 bg-warm-100/50 py-16 dark:border-surface-800 dark:bg-surface-900/30 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { value: "100+", label: "UMKM Bergabung" },
              { value: "58mm", label: "Cetak Struk Thermal" },
              { value: "Real-time", label: "Laporan Instan" },
              { value: "Cloud", label: "Akses di Mana Saja" },
            ].map((s) => (
              <div key={s.value} className="text-center">
                <p className="font-serif text-2xl font-bold text-surface-900 dark:text-warm-100 sm:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-surface-500 dark:text-warm-400 sm:text-sm">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
           CTA
           ══════════════════════════════════════ */}
      <section className="border-t border-warm-200 py-20 dark:border-surface-800 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-serif leading-tight text-surface-900 dark:text-warm-100 sm:text-4xl lg:text-5xl">
              Siap{" "}
              <span className="italic text-brand-500">modernisasi</span>{" "}
              kasir toko Anda?
            </h2>
            <p className="mt-4 text-base text-surface-500 dark:text-warm-400">
              100+ UMKM di seluruh Indonesia sudah beralih. Gratis
              pendaftaran, bayar sesuai paket.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/masuk"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-900 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-surface-800 hover:shadow-md dark:bg-warm-100 dark:text-surface-900 dark:hover:bg-warm-200"
              >
                Masuk ke Toko
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/daftar"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-warm-200 bg-white px-7 py-3.5 text-sm font-semibold text-surface-700 shadow-sm transition-all hover:shadow-md dark:border-surface-600 dark:bg-surface-800 dark:text-warm-200"
              >
                Daftar Toko Baru
              </Link>
            </div>
            <p className="mt-6 text-xs text-surface-400 dark:text-surface-600">
              Tidak perlu kartu kredit. Mulai kapan saja.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
           FOOTER
           ══════════════════════════════════════ */}
      <footer className="border-t border-warm-200 py-12 dark:border-surface-800">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-serif font-bold text-white">
                A
              </div>
              <span className="text-sm font-serif font-bold text-surface-900 dark:text-warm-100">
                ADNTmarket
              </span>
            </Link>
            <div className="flex items-center gap-6 text-xs text-surface-500 dark:text-warm-400">
              <button onClick={() => scrollTo("fitur")} className="transition-colors hover:text-surface-900 dark:hover:text-warm-100">
                Fitur
              </button>
              <Link href="/daftar" className="transition-colors hover:text-surface-900 dark:hover:text-warm-100">
                Daftar
              </Link>
              <Link href="/masuk" className="transition-colors hover:text-surface-900 dark:hover:text-warm-100">
                Masuk
              </Link>
            </div>
            <p className="text-[11px] text-surface-400 dark:text-surface-600">
              &copy; {new Date().getFullYear()} ADNTmarket
            </p>
          </div>
        </div>
      </footer>

      {/* Noise overlay */}
      <div className="noise" />
    </div>
  );
}
