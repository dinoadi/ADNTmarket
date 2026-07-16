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
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("adnt_theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
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

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("adnt_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("adnt_theme", "light");
    }
  };

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

  return (
    <div className="min-h-screen bg-white dark:bg-surface-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 border-b border-surface-200 bg-white/90 backdrop-blur dark:border-surface-800 dark:bg-surface-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              A
            </div>
            <span className="text-lg font-bold tracking-tight text-surface-900 dark:text-white">
              ADNT<span className="text-blue-600">market</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
              title={dark ? "Mode Terang" : "Mode Gelap"}
            >
              {dark ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>

            <div className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-surface-50 p-0.5 dark:border-surface-700 dark:bg-surface-800">
              <button
                onClick={() => setMode("toko")}
                className={"rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors " + (mode === "toko"
                  ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                  : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200")}
              >
                Toko
              </button>
              <button
                onClick={() => setMode("admin")}
                className={"rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors " + (mode === "admin"
                  ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                  : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200")}
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-surface-200 dark:border-surface-800">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              POS Kasir untuk UMKM
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-surface-900 dark:text-white sm:text-5xl">
              Kasir Toko
              <br />
              <span className="text-blue-600 dark:text-blue-400">Semakin Mudah</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-surface-500 dark:text-surface-400">
              Catat transaksi, atur stok, cetak struk thermal 58mm.
              <br />
              Platform kasir digital untuk toko sembako, kelontong, dan UMKM.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  const el = document.getElementById("login-section");
                  if (el) { setMode("toko"); el.scrollIntoView({ behavior: "smooth" }); }
                }}
                className="btn-primary text-base"
              >
                Mulai Bertransaksi
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById("fitur");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="btn-secondary text-base"
              >
                Lihat Fitur
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Angka */}
      <section className="border-b border-surface-200 bg-surface-50 dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">30+</p>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Produk per Toko</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">Multi-Tenant</p>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Data Terisolasi</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">58mm</p>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Struk Thermal</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="border-b border-surface-200 dark:border-surface-800">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="mb-3 text-center text-2xl font-bold text-surface-900 dark:text-white">
            Kenapa ADNTmarket?
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-center text-sm text-surface-500 dark:text-surface-400">
            Dibuat khusus untuk kebutuhan kasir toko UMKM Indonesia.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="card p-5">
              <h3 className="mb-1.5 text-sm font-semibold text-surface-900 dark:text-white">Kasir Cepat</h3>
              <p className="text-sm leading-relaxed text-surface-500 dark:text-surface-400">
                Scan barcode, pilih produk, input nominal dengan shortcut Rupiah. Transaksi selesai dalam detik.
              </p>
            </div>
            <div className="card p-5">
              <h3 className="mb-1.5 text-sm font-semibold text-surface-900 dark:text-white">Multi-Tenant</h3>
              <p className="text-sm leading-relaxed text-surface-500 dark:text-surface-400">
                Setiap toko punya data sendiri. Cocok untuk pemilik banyak cabang atau platform SaaS.
              </p>
            </div>
            <div className="card p-5">
              <h3 className="mb-1.5 text-sm font-semibold text-surface-900 dark:text-white">Laporan Otomatis</h3>
              <p className="text-sm leading-relaxed text-surface-500 dark:text-surface-400">
                Omzet, laba, modal, dan riwayat transaksi terekam otomatis. Pantau kapan saja.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Login */}
      <section id="login-section" className="py-16 sm:py-20">
        <div className="mx-auto max-w-sm px-6">
          <div className="mb-6 flex rounded-lg border border-surface-200 bg-surface-50 p-1 dark:border-surface-700 dark:bg-surface-800">
            <button
              onClick={() => setMode("toko")}
              className={"flex-1 rounded-md py-2 text-sm font-medium transition-colors " + (mode === "toko"
                ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                : "text-surface-500 hover:text-surface-700 dark:text-surface-400")}
            >
              Akses Toko
            </button>
            <button
              onClick={() => setMode("admin")}
              className={"flex-1 rounded-md py-2 text-sm font-medium transition-colors " + (mode === "admin"
                ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                : "text-surface-500 hover:text-surface-700 dark:text-surface-400")}
            >
              Admin
            </button>
          </div>

          {mode === "toko" ? (
            <div className="animate-fade-in space-y-4">
              <div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-white">Akses Toko Anda</h3>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  Masukkan slug toko untuk masuk ke halaman kasir.
                </p>
              </div>
              <form onSubmit={handleAccessToko} className="space-y-4">
                <div>
                  <label htmlFor="slug" className="label">Nama Toko</label>
                  <input id="slug" type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                    placeholder="Contoh: tokopakkris" autoFocus={mode === "toko"} className="input" />
                  <p className="mt-1.5 text-xs text-surface-400 dark:text-surface-500">
                    contoh: tokopakkris, tokobudi, sembakomakmur
                  </p>
                </div>
                <button type="submit" className="btn-primary w-full">Masuk ke Toko</button>
              </form>
            </div>
          ) : (
            <div className="animate-fade-in space-y-4">
              <div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-white">Login Admin</h3>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                  Masuk sebagai administrator platform.
                </p>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label htmlFor="adminEmail" className="label">Email</label>
                  <input id="adminEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@adntmarket.app" autoFocus={mode === "admin"} className="input" />
                </div>
                <div>
                  <label htmlFor="adminPassword" className="label">Password</label>
                  <input id="adminPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password" className="input" />
                </div>
                <button type="submit" disabled={adminLoading} className="btn-primary w-full">
                  {adminLoading ? "Memproses..." : "Masuk"}
                </button>
              </form>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-surface-400 dark:text-surface-500">
            &copy; 2024 ADNTmarket.app
          </p>
        </div>
      </section>
    </div>
  );
}
