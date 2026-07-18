"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.toko_slug as string;

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [namaToko, setNamaToko] = useState("");
  const [alamat, setAlamat] = useState("");
  const [telepon, setTelepon] = useState("");
  const [footerStruk, setFooterStruk] = useState("");
  const [cetakOtomatis, setCetakOtomatis] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("adnt_token");
    if (!t) {
      router.push(`/${slug}`);
      return;
    }
    setToken(t);

    // Fetch settings
    fetch(`/api/${slug}/settings`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setFooterStruk(data.data.footerStruk ?? "");
          setCetakOtomatis(data.data.cetakStrukOtomatis ?? true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch tenant info via tenant-check
    fetch(`/api/tenant-check?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setNamaToko(data.data.namaToko ?? "");
          setAlamat(data.data.alamat ?? "");
          setTelepon(data.data.telepon ?? "");
        }
      })
      .catch(() => {});
  }, [slug, router]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/${slug}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          footerStruk,
          cetakStrukOtomatis: cetakOtomatis,
          alamat,
          telepon,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Pengaturan berhasil disimpan");
      } else {
        toast.error(data.error ?? "Gagal menyimpan");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Nav */}
      <div className="border-b border-surface-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/${slug}/kasir`)}
              className="text-surface-400 hover:text-surface-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-surface-900">Pengaturan Toko</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Toko */}
            <div className="rounded-lg border border-surface-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-surface-800">
                Informasi Toko
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-surface-700">
                    Nama Toko
                  </label>
                  <input
                    type="text"
                    value={namaToko}
                    readOnly
                    className="w-full rounded-md border border-surface-200 bg-surface-50 px-4 py-2.5 text-sm text-surface-600"
                  />
                  <p className="mt-1 text-xs text-surface-400">
                    Hubungi admin untuk mengubah nama toko
                  </p>
                </div>

                <Input
                  label="Alamat Toko"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Jl. Contoh No. 123"
                />

                <Input
                  label="Nomor Telepon"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="08123456789"
                />
              </div>
            </div>

            {/* Struk Settings */}
            <div className="rounded-lg border border-surface-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-surface-800">
                Pengaturan Struk
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-surface-700">
                    Footer Struk
                  </label>
                  <textarea
                    value={footerStruk}
                    onChange={(e) => setFooterStruk(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-surface-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    placeholder="Terima kasih telah berbelanja"
                  />
                  <p className="mt-1 text-xs text-surface-400">
                    Teks yang muncul di bagian bawah struk belanja
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="cetakOtomatis"
                    checked={cetakOtomatis}
                    onChange={(e) => setCetakOtomatis(e.target.checked)}
                    className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                  <label
                    htmlFor="cetakOtomatis"
                    className="text-sm font-medium text-surface-700"
                  >
                    Cetak struk otomatis setelah pembayaran
                  </label>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/${slug}/kasir`)}
              >
                Batal
              </Button>
              <Button
                onClick={handleSave}
                loading={saving}
              >
                Simpan Pengaturan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
