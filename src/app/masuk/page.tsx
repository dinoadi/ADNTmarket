"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Eye, EyeOff, ArrowRight, Store, ShieldCheck } from "lucide-react";

export default function MasukPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"toko" | "admin">("toko");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Handle Google OAuth redirect & session check on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam === "auth_failed") {
      setError("Autentikasi gagal. Silakan coba lagi.");
    } else if (errorParam === "not_registered") {
      setError("Email Google Anda belum terdaftar. Silakan daftar dulu.");
    } else if (errorParam === "inactive") {
      setError("Akun Anda tidak aktif. Hubungi admin.");
    }

    // Handle Google OAuth success
    const googleSuccess = params.get("google_success");
    if (googleSuccess === "true") {
      const token = params.get("token");
      const userDataParam = params.get("user");
      if (token && userDataParam) {
        try {
          const userData = JSON.parse(decodeURIComponent(userDataParam));
          localStorage.setItem("adnt_token", token);
          localStorage.setItem("adnt_user", JSON.stringify(userData));
          window.history.replaceState({}, document.title, "/masuk");
          if (userData.tenantSlug) {
            router.push("/" + userData.tenantSlug + "/kasir");
          } else {
            router.push("/admin");
          }
          return;
        } catch {
          /* ignore */
        }
      }
    }

    // Check existing session
    const existingToken = localStorage.getItem("adnt_token");
    const existingUser = localStorage.getItem("adnt_user");
    if (existingToken && existingUser) {
      try {
        const parsed = JSON.parse(existingUser);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body =
        mode === "toko"
          ? { slug, password }
          : { email, password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Login gagal. Periksa kembali data Anda.");
        setLoading(false);
        return;
      }

      localStorage.setItem("adnt_token", data.data.token);
      localStorage.setItem("adnt_user", JSON.stringify(data.data.user));

      if (data.data.user.tenantSlug) {
        router.push("/" + data.data.user.tenantSlug + "/kasir");
      } else if (data.data.user.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/admin");
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch {
      setError("Gagal login dengan Google.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-warm-50 dark:bg-surface-950">
      {/* ─── Brand Panel (kiri) ─────────────── */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-surface-900 p-12 lg:flex dark:bg-surface-950">
        {/* Noise overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
          }}
        />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-serif font-bold text-white">
              A
            </div>
            <span className="font-serif text-lg font-bold text-warm-100">
              ADNTmarket
            </span>
          </Link>
        </div>

        <div className="relative space-y-8">
          {[
            { icon: Store, title: "Akses Toko", desc: "Masuk dengan slug toko — langsung ke halaman kasir atau dashboard toko Anda." },
            { icon: ShieldCheck, title: "Akses Admin", desc: "Login dengan email untuk panel admin dan manajemen pengguna." },
          ].map((item, i) => (
            <div key={i} className="group flex items-start gap-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-warm-200 transition-colors group-hover:bg-white/10">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-serif text-base font-bold text-warm-100">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-warm-400">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative">
          <p className="text-xs text-warm-500">
            &copy; {new Date().getFullYear()} ADNTmarket
          </p>
        </div>
      </div>

      {/* ─── Form Panel (kanan) ────────────── */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <Link href="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-serif font-bold text-white">
              A
            </div>
            <span className="font-serif text-base font-bold text-surface-900 dark:text-warm-100">
              ADNTmarket
            </span>
          </Link>

          <h1 className="font-serif text-2xl font-bold text-surface-900 dark:text-warm-100">
            {mode === "toko" ? "Masuk ke Toko" : "Login Admin"}
          </h1>
          <p className="mt-1.5 text-sm text-surface-500 dark:text-warm-400">
            {mode === "toko"
              ? "Gunakan slug toko untuk akses langsung."
              : "Login dengan email admin."}
          </p>

          {/* Mode toggle */}
          <div className="mt-8 flex rounded-xl border border-warm-200 bg-warm-100/50 p-1 dark:border-surface-700 dark:bg-surface-800/50">
            <button
              onClick={() => setMode("toko")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                mode === "toko"
                  ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-warm-100"
                  : "text-surface-500 hover:text-surface-700 dark:text-warm-400 dark:hover:text-warm-200"
              }`}
            >
              Akses Toko
            </button>
            <button
              onClick={() => setMode("admin")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                mode === "admin"
                  ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-warm-100"
                  : "text-surface-500 hover:text-surface-700 dark:text-warm-400 dark:hover:text-warm-200"
              }`}
            >
              Admin
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {mode === "toko" ? (
              <div>
                <label className="label" htmlFor="slug">
                  Slug Toko
                </label>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="contoh: tokopakkris"
                  className="input"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@email.com"
                  className="input"
                  required
                />
              </div>
            )}

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="input pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 transition-colors hover:text-surface-600 dark:hover:text-warm-300"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center gap-2 border border-brand-700 bg-brand-600"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses...
                </span>
              ) : (
                <>
                  {mode === "toko" ? "Masuk Toko" : "Login Admin"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Google Sign-In */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-warm-200 dark:border-surface-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-warm-50 px-3 text-surface-400 dark:bg-surface-950 dark:text-surface-500">
                atau
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-warm-200 bg-white px-4 py-3 text-sm font-medium text-surface-700 shadow-sm transition-all hover:bg-warm-50 hover:shadow-md disabled:opacity-50 dark:border-surface-600 dark:bg-surface-800 dark:text-warm-200 dark:hover:bg-surface-700"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Memproses..." : "Lanjutkan dengan Google"}
          </button>

          {/* Register link */}
          <p className="mt-6 text-center text-xs text-surface-500 dark:text-warm-400">
            Belum punya toko?{" "}
            <Link href="/daftar" className="font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400">
              Daftar di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
