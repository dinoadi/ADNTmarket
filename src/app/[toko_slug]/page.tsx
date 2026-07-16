"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

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

  // Cek tenant availability
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

      // Simpan token & user
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

  // Tenant tidak ditemukan
  if (!tenantLoading && tenantError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 text-6xl font-bold text-surface-200">404</div>
          <h1 className="mb-2 text-xl font-bold text-surface-800">
            Toko Tidak Ditemukan
          </h1>
          <p className="mb-6 text-sm text-surface-500">
            Toko dengan nama &quot;{slug}&quot; tidak ditemukan. Periksa kembali
            nama toko Anda.
          </p>
          <button
            onClick={() => router.push("/")}
            className="rounded-md bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="mb-8 text-center">
          {tenantLoading ? (
            <div className="h-8 w-48 animate-pulse rounded bg-surface-200 mx-auto" />
          ) : (
            <>
              <h1 className="text-2xl font-bold text-surface-900">
                {tenantName}
              </h1>
              <p className="mt-1 text-sm text-surface-500">
                Masuk ke sistem kasir
              </p>
            </>
          )}
        </div>

        {/* Form Login */}
        <div className="rounded-lg border border-surface-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-surface-700"
              >
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
                className="w-full rounded-md border border-surface-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-surface-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                className="w-full rounded-md border border-surface-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || tenantLoading}
              className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
