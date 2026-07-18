"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuksesContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const status = searchParams.get("status");
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    fetch(`/api/payment/status?order_id=${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPaymentStatus(data.data.status);
          setTenantSlug(data.data.tenantSlug);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  const isSuccess = status === "pending" || paymentStatus === "PENDING" || paymentStatus === "SETTLED";

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 py-5">
      <div className="mx-auto w-full max-w-sm">
        <div className="rounded-lg border border-surface-200 bg-white text-center shadow-sm">
          <div className="p-8">
            {loading ? (
              <>
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                <p className="text-sm text-surface-500">Mengecek status pembayaran...</p>
              </>
            ) : (
              <>
                <div className="mb-3 text-4xl">
                  {isSuccess ? "\u2705" : "\u23F3"}
                </div>

                <h4 className="mb-2 text-lg font-bold text-surface-900">
                  {isSuccess ? "Pembayaran Berhasil!" : "Menunggu Pembayaran"}
                </h4>

                <p className="mb-1 text-sm text-surface-500">
                  {isSuccess
                    ? "Toko kamu sudah aktif dan siap digunakan."
                    : "Kami masih menunggu konfirmasi pembayaran."}
                </p>

                {status === "pending" && (
                  <p className="text-xs text-surface-400">
                    Silakan selesaikan pembayaran melalui link yang sudah dikirim.
                  </p>
                )}

                {paymentStatus === "PENDING" && (
                  <p className="text-xs text-surface-400">
                    Pembayaran sedang diverifikasi, maksimal 1x24 jam.
                  </p>
                )}

                <p className="mb-4 text-xs text-surface-400">
                  ID Pesanan: <code className="rounded bg-surface-100 px-1.5 py-0.5 text-xs font-mono">{orderId}</code>
                </p>

                <div className="space-y-2">
                  {tenantSlug && isSuccess && (
                    <Link
                      href={`/${tenantSlug}/kasir`}
                      className="block rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                    >
                      Buka Toko Sekarang
                    </Link>
                  )}
                  <Link
                    href="/admin"
                    className="block rounded-lg border border-surface-200 px-4 py-2.5 text-center text-sm font-medium text-surface-600 transition-colors hover:bg-surface-50"
                  >
                    Ke Dashboard Admin
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 py-5">
      <div className="mx-auto w-full max-w-sm">
        <div className="rounded-lg border border-surface-200 bg-white text-center shadow-sm">
          <div className="p-8">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            <p className="text-sm text-surface-500">Mengecek status pembayaran...</p>
          </div>
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
