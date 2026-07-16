"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SuksesPage() {
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
    <div className="min-vh-100 d-flex align-items-center bg-light py-5">
      <div className="container" style={{ maxWidth: 500 }}>
        <div className="card shadow-sm text-center">
          <div className="card-body p-5">
            {loading ? (
              <>
                <div className="spinner-border text-primary mb-3" />
                <p>Mengecek status pembayaran...</p>
              </>
            ) : (
              <>
                <div className="display-6 mb-3">
                  {isSuccess ? "✅" : "⏳"}
                </div>

                <h4 className="fw-bold mb-2">
                  {isSuccess ? "Pembayaran Berhasil!" : "Menunggu Pembayaran"}
                </h4>

                <p className="text-muted mb-1">
                  {isSuccess
                    ? "Toko kamu sudah aktif dan siap digunakan."
                    : "Kami masih menunggu konfirmasi pembayaran."}
                </p>

                {status === "pending" && (
                  <p className="text-muted small">
                    Silakan selesaikan pembayaran melalui link yang sudah dikirim.
                  </p>
                )}

                {paymentStatus === "PENDING" && (
                  <p className="text-muted small">
                    Pembayaran sedang diverifikasi, maksimal 1x24 jam.
                  </p>
                )}

                <p className="small text-muted mb-4">
                  ID Pesanan: <code>{orderId}</code>
                </p>

                <div className="d-grid gap-2">
                  {tenantSlug && isSuccess && (
                    <Link
                      href={`/${tenantSlug}/kasir`}
                      className="btn btn-primary fw-bold py-2"
                    >
                      Buka Toko Sekarang
                    </Link>
                  )}
                  <Link href="/admin" className="btn btn-outline-secondary py-2">
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
