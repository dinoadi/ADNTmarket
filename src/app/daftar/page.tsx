"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  nama: string;
  durasiHari: number;
  harga: number;
  deskripsi: string | null;
}

export default function DaftarPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "payment" | "loading">("form");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [snapToken, setSnapToken] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    slug: "",
    namaToko: "",
    alamat: "",
    telepon: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [snapLoaded, setSnapLoaded] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Ambil daftar paket
  useEffect(() => {
    fetch("/api/subscription-plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPlans(data.data);
      });
  }, []);

  // Load Midtrans Snap script
  useEffect(() => {
    if (typeof window === "undefined") return;
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    if (!clientKey) return;

    const script = document.createElement("script");
    script.src =
      process.env.NODE_ENV === "production"
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    script.onload = () => setSnapLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Buka Snap payment
  useEffect(() => {
    if (step === "payment" && snapToken && snapLoaded && window.snap) {
      window.snap.pay(snapToken, {
        onSuccess: () => {
          router.push(`/daftar/sukses?order_id=${orderId}`);
        },
        onPending: () => {
          router.push(`/daftar/sukses?order_id=${orderId}&status=pending`);
        },
        onClose: () => {
          setStep("form");
          setError("Pembayaran dibatalkan, kamu bisa bayar nanti");
        },
      });
    }
  }, [step, snapToken, snapLoaded, orderId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedPlan) {
      setError("Pilih paket sewa terlebih dahulu");
      return;
    }

    setStep("loading");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, planId: selectedPlan }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error);
        setStep("form");
        return;
      }

      setOrderId(data.data.payment.orderId);

      if (data.data.payment.snapToken) {
        setSnapToken(data.data.payment.snapToken);
        setStep("payment");
      } else {
        router.push(`/daftar/sukses?order_id=${data.data.payment.orderId}&status=manual`);
      }
    } catch {
      setError("Gagal terhubung ke server, coba lagi");
      setStep("form");
    }
  };

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 to-blue-50 py-8">
      <div className="mx-auto w-full max-w-lg px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-surface-900">
            {process.env.NEXT_PUBLIC_APP_NAME || "ADNTmarket"}
          </h1>
          <p className="mt-1 text-sm text-surface-500">Daftarkan Toko Baru</p>
        </div>

        <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Data Toko */}
            <h6 className="mb-3 text-sm font-bold text-surface-800">Data Toko</h6>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-surface-600">Nama Toko</label>
              <input
                type="text"
                required
                placeholder="Toko ABC"
                value={form.namaToko}
                onChange={(e) => setForm({ ...form, namaToko: e.target.value })}
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-surface-600">
                Slug Toko <span className="text-surface-400">(untuk URL: adntmarket.app/namaslug)</span>
              </label>
              <input
                type="text"
                required
                placeholder="toko-abc"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                }
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-surface-600">Alamat (opsional)</label>
              <input
                type="text"
                placeholder="Jl. Contoh No. 123"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-surface-600">Telepon (opsional)</label>
              <input
                type="tel"
                placeholder="08123456789"
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Akun Admin */}
            <h6 className="mb-3 mt-6 text-sm font-bold text-surface-800">Akun Admin Toko</h6>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-surface-600">Email</label>
              <input
                type="email"
                required
                placeholder="admin@tokoabc.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-surface-600">Password</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Pilih Paket */}
            <h6 className="mb-3 mt-6 text-sm font-bold text-surface-800">Pilih Paket Sewa</h6>
            {plans.length === 0 ? (
              <p className="text-sm text-surface-400">Memuat paket...</p>
            ) : (
              <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${
                      selectedPlan === plan.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-surface-200 bg-white hover:border-surface-300"
                    }`}
                  >
                    <h6 className="mb-1 text-sm font-bold text-surface-800">{plan.nama}</h6>
                    <p className="mb-1 text-lg font-bold text-brand-600">{formatRupiah(plan.harga)}</p>
                    <small className="text-surface-400">{plan.deskripsi || `${plan.durasiHari} hari`}</small>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={step === "loading"}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:bg-surface-300 disabled:text-surface-500"
            >
              {step === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses...
                </span>
              ) : (
                "Daftar & Bayar Sekarang"
              )}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-surface-500">
          Sudah punya toko?{" "}
          <a href="/" className="font-medium text-brand-600 hover:text-brand-700">
            Login di sini
          </a>
        </p>
      </div>
    </div>
  );
}
