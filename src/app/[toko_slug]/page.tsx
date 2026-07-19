"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Store } from "lucide-react";

export default function TenantLoginPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.toko_slug as string;

  const [tenantName, setTenantName] = useState("");
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkTenant() {
      try {
        const res = await fetch(`/api/tenant-check?slug=${slug}`);
        const data = await res.json();
        if (!data.success) {
          setTenantError(data.error ?? "Toko tidak ditemukan");
          setTenantLoading(false);
          return;
        }
        setTenantName(data.data.namaToko);
      } catch {
        setTenantError("Gagal memuat data toko");
      } finally {
        setTenantLoading(false);
      }
    }
    if (slug) checkTenant();
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
      localStorage.setItem("adnt_token", data.data.token);
      localStorage.setItem("adnt_user", JSON.stringify(data.data.user));
      toast.success("Login berhasil");
      router.push(`/${slug}/kasir`);
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  if (!tenantLoading && tenantError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-warm-50 px-4 dark:bg-surface-950">
        <div className="w-full max-w-md text-center">
          <p className="font-serif text-8xl font-bold text-warm-200 dark:text-surface-800">
            404
          </p>
          <h1 className="mt-4 font-serif text-2xl font-bold text-surface-900 dark:text-warm-100">
            Toko Tidak Ditemukan
          </h1>
          <p className="mt-2 text-sm text-surface-500 dark:text-warm-400">
            Toko dengan nama &quot;{slug}&quot; tidak ditemukan. Periksa kembali nama toko Anda.
          </p>
          <button
            onClick={() => router.push("/")}
            className="btn-primary mt-8"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-warm-50 px-4 dark:bg-surface-950">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          {/* Logo */}
          <Link href="/" className="mx-auto mb-6 flex w-fit items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-serif font-bold text-white">
              A
            </div>
          </Link>

          {tenantLoading ? (
            <div className="mx-auto h-7 w-48 animate-pulse rounded bg-warm-200 dark:bg-surface-700" />
          ) : (
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/30">
                <Store className="h-6 w-6" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-surface-900 dark:text-warm-100">
                {tenantName}
              </h1>
              <p className="mt-1 text-sm text-surface-500 dark:text-warm-400">
                Masuk ke sistem kasir
              </p>
            </>
          )}
        </div>

        <div className="card p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tokokamu.com"
                required
                autoFocus
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading || tenantLoading}
              className="btn-primary w-full justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses...
                </span>
              ) : (
                <>
                  Masuk ke Kasir
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-surface-500 dark:text-warm-400">
          <Link href="/masuk" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Login sebagai admin
          </Link>
        </p>
      </div>
    </div>
  );
}
