"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Building2, Globe, MapPin, Phone, Mail, Lock } from "lucide-react";

interface Plan {
  id: string;
  nama: string;
  durasiHari: number;
  harga: number;
  deskripsi: string | null;
}

export default function DaftarPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "loading">("form");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [form, setForm] = useState({
    slug: "",
    namaToko: "",
    alamat: "",
    telepon: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/subscription-plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPlans(data.data);
      });
  }, []);

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

      const paymentUrl = data.data.payment.paymentUrl;
      const orderId = data.data.payment.orderId;

      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        router.push(`/daftar/sukses?order_id=${orderId}&status=manual`);
      }
    } catch {
      setError("Gagal terhubung ke server, coba lagi");
      setStep("form");
    }
  };

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);

  const InputField = ({
    label,
    icon: Icon,
    ...props
  }: {
    label: string;
    icon?: React.ElementType;
    type?: string;
    required?: boolean;
    placeholder?: string;
    value: string;
    minLength?: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-surface-400 dark:text-surface-500">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          className={`input ${Icon ? "pl-10" : ""}`}
          {...props}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-surface-950">
      {/* ─── Navbar ─────────────── */}
      <nav className="border-b border-warm-200 bg-white/80 backdrop-blur-xl dark:border-surface-800 dark:bg-surface-950/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-serif font-bold text-white">
              A
            </div>
            <span className="font-serif text-base font-bold text-surface-900 dark:text-warm-100">
              ADNTmarket
            </span>
          </Link>
          <Link
            href="/masuk"
            className="text-sm font-semibold text-surface-500 transition-colors hover:text-surface-900 dark:text-warm-400 dark:hover:text-warm-100"
          >
            Masuk
          </Link>
        </div>
      </nav>

      {/* ─── Form ──────────────── */}
      <div className="mx-auto w-full max-w-lg px-6 py-12">
        <h1 className="font-serif text-2xl font-bold text-surface-900 dark:text-warm-100">
          Daftarkan Toko Baru
        </h1>
        <p className="mt-1.5 text-sm text-surface-500 dark:text-warm-400">
          Isi data toko dan pilih paket untuk memulai.
        </p>

        <div className="card mt-8 p-6 sm:p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Data Toko */}
            <div>
              <h2 className="mb-4 font-serif text-lg font-bold text-surface-900 dark:text-warm-100">
                Data Toko
              </h2>
              <div className="space-y-4">
                <InputField
                  label="Nama Toko"
                  icon={Building2}
                  type="text"
                  required
                  placeholder="Toko ABC"
                  value={form.namaToko}
                  onChange={(e) => setForm({ ...form, namaToko: e.target.value })}
                />
                <InputField
                  label="Slug Toko"
                  icon={Globe}
                  type="text"
                  required
                  placeholder="toko-abc"
                  value={form.slug}
                  onChange={(e) =>
                    setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                  }
                />
                <p className="-mt-2 text-[11px] text-surface-400 dark:text-surface-500">
                  URL toko: adntmarket.app/{form.slug || "slug"}
                </p>
                <InputField
                  label="Alamat"
                  icon={MapPin}
                  type="text"
                  placeholder="Jl. Contoh No. 123"
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                />
                <InputField
                  label="Telepon"
                  icon={Phone}
                  type="tel"
                  placeholder="08123456789"
                  value={form.telepon}
                  onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                />
              </div>
            </div>

            {/* Akun Admin */}
            <div>
              <h2 className="mb-4 font-serif text-lg font-bold text-surface-900 dark:text-warm-100">
                Akun Admin
              </h2>
              <div className="space-y-4">
                <InputField
                  label="Email"
                  icon={Mail}
                  type="email"
                  required
                  placeholder="admin@tokoabc.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <InputField
                  label="Password"
                  icon={Lock}
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            {/* Pilih Paket */}
            <div>
              <h2 className="mb-4 font-serif text-lg font-bold text-surface-900 dark:text-warm-100">
                Pilih Paket
              </h2>
              {plans.length === 0 ? (
                <p className="text-sm text-surface-400">Memuat paket...</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {plans.map((plan) => {
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all ${
                          isSelected
                            ? "border-brand-500 bg-brand-50 shadow-sm dark:border-brand-400 dark:bg-brand-950/30"
                            : "border-warm-200 bg-white hover:border-warm-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-surface-500"
                        }`}
                      >
                        {isSelected && (
                          <div className="mb-2 flex justify-center">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}
                        <h3 className={`text-sm font-bold ${isSelected ? "text-brand-700 dark:text-brand-400" : "text-surface-800 dark:text-warm-200"}`}>
                          {plan.nama}
                        </h3>
                        <p className={`mt-1 font-serif text-lg font-bold ${isSelected ? "text-brand-600 dark:text-brand-400" : "text-surface-900 dark:text-warm-100"}`}>
                          {formatRupiah(plan.harga)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-surface-400 dark:text-surface-500">
                          {plan.deskripsi || `${plan.durasiHari} hari`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={step === "loading"}
              className="btn-primary w-full justify-center gap-2"
            >
              {step === "loading" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses...
                </span>
              ) : (
                <>
                  Daftar & Bayar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-surface-500 dark:text-warm-400">
          Sudah punya toko?{" "}
          <Link href="/masuk" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Login di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
