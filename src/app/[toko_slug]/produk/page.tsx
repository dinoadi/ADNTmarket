"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import type { ProductData, KategoriProduk } from "@/types";

const KATEGORI_LIST: Array<{ label: string; value: KategoriProduk | "" }> = [
  { label: "Semua", value: "" },
  { label: "Makanan", value: "MAKANAN" },
  { label: "Minuman", value: "MINUMAN" },
  { label: "Sembako", value: "SEMBAKO" },
  { label: "Snack", value: "SNACK" },
  { label: "Minyak", value: "MINYAK" },
  { label: "Beras", value: "BERAS" },
  { label: "Gula", value: "GULA" },
  { label: "Telur", value: "TELUR" },
  { label: "Susu", value: "SUSU" },
  { label: "Rokok", value: "ROKOK" },
  { label: "Alat Tulis", value: "ALAT_TULIS" },
  { label: "Kebersihan", value: "KEBERSIHAN" },
  { label: "Lainnya", value: "LAINNYA" },
];

interface ProductForm {
  nama: string;
  // barcode removed -- input manual
  kategori: KategoriProduk;
  hargaJual: number;
  hargaModal: number;
  stok: number;
  satuan: string;
}

const emptyForm: ProductForm = {
  nama: "",
  // barcode removed
  kategori: "LAINNYA",
  hargaJual: 0,
  hargaModal: 0,
  stok: 0,
  satuan: "pcs",
};

export default function ProdukPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.toko_slug as string;

  const [token, setToken] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState<KategoriProduk | "">("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; errors: number; total: number; details: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("adnt_token");
    const storedUser = localStorage.getItem("adnt_user");
    if (!storedToken) { router.push(`/${slug}`); return; }
    setToken(storedToken);
    try {
      const user = JSON.parse(storedUser ?? "{}");
      if (user.tenantSlug !== slug) { router.push(`/${slug}`); }
    } catch { /* ignore */ }
  }, [slug, router]);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (kategori) params.set("kategori", kategori);
      params.set("limit", "200");
      const res = await fetch(`/api/${slug}/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch { toast.error("Gagal memuat produk"); }
    finally { setLoading(false); }
  }, [token, slug, search, kategori]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (product: ProductData) => {
    setForm({
      nama: product.nama,
      // barcode: product.barcode ?? "", -- removed
      kategori: product.kategori,
      hargaJual: product.hargaJual,
      hargaModal: product.hargaModal,
      stok: product.stok,
      satuan: product.satuan,
    });
    setEditingId(product.id);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const url = editingId
        ? `/api/${slug}/products/${editingId}`
        : `/api/${slug}/products`;
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? "Produk diperbarui" : "Produk ditambahkan");
        setShowModal(false);
        fetchProducts();
      } else {
        toast.error(data.error ?? "Gagal menyimpan");
      }
    } catch { toast.error("Gagal menyimpan produk"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus produk "${nama}"?`)) return;
    if (!token) return;
    try {
      const res = await fetch(`/api/${slug}/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Produk dihapus");
        fetchProducts();
      } else { toast.error(data.error ?? "Gagal menghapus"); }
    } catch { toast.error("Gagal menghapus produk"); }
  };

  const handleExport = () => {
    window.open(`/api/${slug}/products/export`, "_blank");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/${slug}/products/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(data.data);
        toast.success(`Import selesai: ${data.data.imported} baru, ${data.data.updated} diperbarui`);
        fetchProducts();
      } else {
        toast.error(data.error ?? "Gagal import");
      }
    } catch {
      toast.error("Gagal import produk");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      {/* Header */}
      <div className="border-b border-surface-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/${slug}/kasir`)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-surface-900">Produk</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file" accept=".csv" className="hidden"
              onChange={handleImportFile}
            />
            <button
              onClick={handleImportClick}
              className="rounded-lg border border-surface-200 px-3 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-100 disabled:opacity-50"
              disabled={importing}
            >
              {importing ? "Mengimport..." : "Import"}
            </button>
            <button
              onClick={handleExport}
              className="rounded-lg border border-surface-200 px-3 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-100"
            >
              Export
            </button>
            <button
              onClick={() => router.push(`/${slug}/kasir`)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-100"
            >Kasir</button>
            <button
              onClick={openAdd}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
            >+ Tambah</button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {/* Search & Filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full rounded-lg border border-surface-300 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {KATEGORI_LIST.map((k) => (
              <button key={k.value}
                onClick={() => setKategori(k.value)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  kategori === k.value ? "bg-brand-600 text-white" : "bg-white text-surface-600 border border-surface-200 hover:bg-surface-50"
                }`}
              >{k.label}</button>
            ))}
          </div>
        </div>

        {/* Product Table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-200 bg-white py-16">
            <svg className="mb-3 h-12 w-12 text-surface-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="text-sm text-surface-500">Belum ada produk</p>
            <button onClick={openAdd} className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Tambah Produk Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
                    <th className="px-4 py-3 sm:px-6">Nama</th>
                    <th className="px-4 py-3 sm:px-6">Kategori</th>
                    <th className="px-4 py-3 text-right sm:px-6">Harga Jual</th>
                    <th className="hidden px-4 py-3 text-right sm:table-cell sm:px-6">Modal</th>
                    <th className="px-4 py-3 text-center sm:px-6">Stok</th>
                    <th className="px-4 py-3 text-right sm:px-6">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3 sm:px-6">
                        <div className="font-medium text-surface-900">{p.nama}</div>
                        {/* barcode display removed -- input manual */}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <span className="inline-block rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-medium text-surface-600">
                          {p.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-surface-900 sm:px-6">
                        {formatRupiah(p.hargaJual)}
                      </td>
                      <td className="hidden px-4 py-3 text-right text-surface-500 sm:table-cell sm:px-6">
                        {formatRupiah(p.hargaModal)}
                      </td>
                      <td className="px-4 py-3 text-center sm:px-6">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.stok <= 0 ? "bg-red-100 text-red-700" :
                          p.stok <= 5 ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {p.stok} {p.satuan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(p)}
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(p.id, p.nama)}
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:items-center sm:pt-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg animate-slide-up rounded-2xl bg-white p-6 shadow-xl mx-4">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-surface-900">
                {editingId ? "Edit Produk" : "Tambah Produk"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-surface-600">Nama Produk</label>
                <input type="text" required value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-surface-600">Kategori</label>
                <select value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value as KategoriProduk })}
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  {KATEGORI_LIST.filter((k) => k.value).map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-surface-600">Harga Jual (Rp)</label>
                  <input type="number" required min={0} value={form.hargaJual || ""}
                    onChange={(e) => setForm({ ...form, hargaJual: Number(e.target.value) })}
                    className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-surface-600">Harga Modal (Rp)</label>
                  <input type="number" min={0} value={form.hargaModal || ""}
                    onChange={(e) => setForm({ ...form, hargaModal: Number(e.target.value) })}
                    className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-surface-600">Stok</label>
                  <input type="number" min={0} value={form.stok}
                    onChange={(e) => setForm({ ...form, stok: Number(e.target.value) })}
                    className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-surface-600">Satuan</label>
                  <input type="text" value={form.satuan}
                    onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                    className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-surface-300 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
                >Batal</button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-surface-300"
                >{saving ? "Menyimpan..." : editingId ? "Simpan" : "Tambah"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Result Modal */}
      {importResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setImportResult(null)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-surface-900">Import Selesai</h3>
              <p className="mt-1 text-sm text-surface-500">
                {importResult.imported} ditambahkan, {importResult.updated} diperbarui, {importResult.errors} gagal
              </p>
            </div>
            {importResult.errors > 0 && (
              <div className="mb-4 max-h-40 space-y-1 overflow-y-auto rounded-lg bg-red-50 p-3">
                {importResult.details.filter((d: any) => d.status === "GAGAL").map((d: any, i: number) => (
                  <p key={i} className="text-xs text-red-700">
                    Baris {d.baris}: {d.nama} — {d.pesan}
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={() => setImportResult(null)}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
