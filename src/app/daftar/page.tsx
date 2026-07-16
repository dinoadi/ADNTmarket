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
        // Kalau gagal generate snap token, arahkan ke halaman info
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
    <div className="min-vh-100 d-flex align-items-center bg-light py-5">
      <div className="container" style={{ maxWidth: 600 }}>
        <div className="text-center mb-4">
          <h1 className="fw-bold">{process.env.NEXT_PUBLIC_APP_NAME || "ADNTmarket"}</h1>
          <p className="text-muted">Daftarkan Toko Baru</p>
        </div>

        <div className="card shadow-sm">
          <div className="card-body p-4">
            {error && (
              <div className="alert alert-danger py-2 small">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Data Toko */}
              <h6 className="fw-bold mb-3">Data Toko</h6>
              <div className="mb-3">
                <label className="form-label small">Nama Toko</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="Toko ABC"
                  value={form.namaToko}
                  onChange={(e) => setForm({ ...form, namaToko: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small">
                  Slug Toko <span className="text-muted">(untuk URL: adntmarket.app/namaslug)</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="toko-abc"
                  value={form.slug}
                  onChange={(e) =>
                    setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                  }
                />
              </div>

              <div className="mb-3">
                <label className="form-label small">Alamat (opsional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Jl. Contoh No. 123"
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small">Telepon (opsional)</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="08123456789"
                  value={form.telepon}
                  onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                />
              </div>

              {/* Akun Admin */}
              <h6 className="fw-bold mb-3 mt-4">Akun Admin Toko</h6>
              <div className="mb-3">
                <label className="form-label small">Email</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  placeholder="admin@tokoabc.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small">Password</label>
                <input
                  type="password"
                  className="form-control"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              {/* Pilih Paket */}
              <h6 className="fw-bold mb-3 mt-4">Pilih Paket Sewa</h6>
              {plans.length === 0 ? (
                <p className="text-muted small">Memuat paket...</p>
              ) : (
                <div className="row g-2 mb-3">
                  {plans.map((plan) => (
                    <div className="col-sm-6" key={plan.id}>
                      <div
                        className={`card border cursor-pointer ${
                          selectedPlan === plan.id ? "border-primary bg-primary bg-opacity-10" : ""
                        }`}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        <div className="card-body p-3 text-center">
                          <h6 className="fw-bold mb-1">{plan.nama}</h6>
                          <p className="fs-5 fw-bold text-primary mb-1">{formatRupiah(plan.harga)}</p>
                          <small className="text-muted">{plan.deskripsi || `${plan.durasiHari} hari`}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-bold mt-2"
                disabled={step === "loading"}
              >
                {step === "loading" ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Memproses...
                  </>
                ) : (
                  "Daftar & Bayar Sekarang"
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-muted small mt-3">
          Sudah punya toko?{" "}
          <a href="/" className="text-decoration-none">
            Login di sini
          </a>
        </p>
      </div>
    </div>
  );
}
