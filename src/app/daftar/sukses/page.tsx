"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Clock, ArrowRight, Store, Loader2 } from "lucide-react";

function SuksesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const status = searchParams.get("status");
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [tenantNama, setTenantNama] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    // Poll status setiap 3 detik untuk pending payments
    let interval: NodeJS.Timeout;

    const checkStatus = () => {
      fetch(`/api/payment/status?order_id=${orderId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setPaymentStatus(data.data.status);
            setTenantSlug(data.data.tenantSlug);
            setTenantNama(data.data.tenantNama);

            // Kalau sudah SETTLED, redirect ke toko
            if (data.data.status === "SETTLED" && data.data.tenantSlug) {
              clearInterval(interval);
              setTimeout(() => {
                router.push(`/${data.data.tenantSlug}/kasir`);
              }, 3000);
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    checkStatus();
    interval = setInterval(checkStatus, 3000);

    return () => clearInterval(interval);
  }, [orderId, router]);

  const isSettled = paymentStatus === "SETTLED";
  const isPending = paymentStatus === "PENDING" || status === "pending";
  const isManual = status === "manual";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-50 to-blue-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-sm">
              A
            </div>
            <span className="text-lg font-bold tracking-tight text-surface-900">
              ADNT<span className="text-brand-600">market</span>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm">
          {loading ? (
            <div className="py-6">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-brand-600" />
              <p className="text-sm text-surface-500">Mengecek status pembayaran...</p>
            </div>
          ) : isSettled ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-surface-900">Pembayaran Berhasil!</h2>
              <p className="mt-2 text-sm text-surface-500">
                Toko <span className="font-semibold text-surface-700">{tenantNama || "kamu"}</span> sudah aktif dan siap digunakan.
              </p>
              <p className="mt-1 text-xs text-surface-400">
                Mengarahkan ke halaman kasir...
              </p>

              <div className="mt-6 space-y-2.5">
                {tenantSlug && (
                  <Link
                    href={`/${tenantSlug}/kasir`}
                    className="group flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md"
                  >
                    <Store className="h-4 w-4" />
                    Buka Toko Sekarang
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
                <Link
                  href="/masuk"
                  className="block rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-50"
                >
                  Ke Halaman Login
                </Link>
              </div>
            </>
          ) : isManual ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-surface-900">Menunggu Pembayaran</h2>
              <p className="mt-2 text-sm text-surface-500">
                Pendaftaran berhasil! Silakan selesaikan pembayaran melalui link yang sudah dikirim.
              </p>
              <p className="mt-1 text-xs text-surface-400">
                ID Pesanan: <code className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-xs">{orderId}</code>
              </p>
              <p className="mt-4 text-xs text-surface-400">
                Status akan diperbarui otomatis setelah pembayaran dikonfirmasi.
              </p>

              <div className="mt-6">
                <Link
                  href="/masuk"
                  className="block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md"
                >
                  Cek Status di Admin
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-surface-900">Menunggu Konfirmasi</h2>
              <p className="mt-2 text-sm text-surface-500">
                Pembayaran sedang diverifikasi. Proses ini biasanya memakan waktu beberapa saat.
              </p>
              <p className="mt-1 text-xs text-surface-400">
                ID Pesanan: <code className="rounded bg-surface-100 px-1.5 py-0.5 font-mono text-xs">{orderId}</code>
              </p>
              <p className="mt-4 text-xs text-surface-400">
                Halaman ini akan diperbarui otomatis saat pembayaran dikonfirmasi.
              </p>

              <div className="mt-6">
                <Link
                  href="/masuk"
                  className="block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md"
                >
                  Cek Status
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-surface-400">
          Ada kendala? Hubungi tim support ADNTmarket
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-50 to-blue-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-brand-600" />
          <p className="text-sm text-surface-500">Mengecek status pembayaran...</p>
        </div>
      </div>
    </div>
  );
}

export default function SuksesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuksesContent />
    </Suspense>
  );
}
