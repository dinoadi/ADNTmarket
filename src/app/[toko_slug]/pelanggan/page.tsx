"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface Customer {
  id: string;
  nama: string;
  telepon: string | null;
  alamat: string | null;
  poin: number;
  createdAt: string;
}

export default function PelangganPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.toko_slug as string;

  const [token, setToken] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nama: "", telepon: "", alamat: "" });
  const [saving, setSaving] = useState(false);

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

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("limit", "200");
      const res = await fetch(`/api/${slug}/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch { toast.error("Gagal memuat pelanggan"); }
    finally { setLoading(false); }
  }, [token, slug, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openAdd = () => {
    setForm({ nama: "", telepon: "", alamat: "" });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setForm({ nama: c.nama, telepon: c.telepon ?? "", alamat: c.alamat ?? "" });
    setEditingId(c.id);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const url = editingId
        ? `/api/${slug}/customers/${editingId}`
        : `/api/${slug}/customers`;
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? "Pelanggan diperbarui" : "Pelanggan ditambahkan");
        setShowModal(false);
        fetchCustomers();
      } else {
        toast.error(data.error ?? "Gagal menyimpan");
      }
    } catch { toast.error("Gagal menyimpan pelanggan"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus pelanggan "${nama}"?`)) return;
    if (!token) return;
    try {
      const res = await fetch(`/api/${slug}/customers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Pelanggan dihapus");
        fetchCustomers();
      } else { toast.error(data.error ?? "Gagal menghapus"); }
    } catch { toast.error("Gagal menghapus pelanggan"); }
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
            <h1 className="text-lg font-bold text-surface-900">Pelanggan</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/${slug}/kasir`)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-100">Kasir</button>
            <button onClick={openAdd}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">+ Tambah</button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pelanggan..." className="w-full rounded-lg border border-surface-300 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3"> {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-white" />)} </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-200 bg-white py-16">
            <svg className="mb-3 h-12 w-12 text-surface-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p className="text-sm text-surface-500">Belum ada pelanggan</p>
            <button onClick={openAdd} className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Tambah Pelanggan</button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">
                    <th className="px-4 py-3 sm:px-6">Nama</th>
                    <th className="hidden px-4 py-3 sm:table-cell sm:px-6">Telepon</th>
                    <th className="hidden px-4 py-3 sm:table-cell sm:px-6">Alamat</th>
                    <th className="px-4 py-3 text-center sm:px-6">Poin</th>
                    <th className="px-4 py-3 text-right sm:px-6">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-surface-900 sm:px-6">{c.nama}</td>
                      <td className="hidden px-4 py-3 text-surface-500 sm:table-cell sm:px-6">{c.telepon || "-"}</td>
                      <td className="hidden px-4 py-3 text-surface-500 sm:table-cell sm:px-6">{c.alamat || "-"}</td>
                      <td className="px-4 py-3 text-center sm:px-6">
                        <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{c.poin}</span>
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(c)} className="rounded-md px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">Edit</button>
                          <button onClick={() => handleDelete(c.id, c.nama)} className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Hapus</button>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:items-center sm:pt-0">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg animate-slide-up rounded-2xl bg-white p-6 shadow-xl mx-4">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-surface-900">{editingId ? "Edit Pelanggan" : "Tambah Pelanggan"}</h2>
              <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-surface-600">Nama Pelanggan</label>
                <input type="text" required value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-surface-600">Telepon</label>
                <input type="tel" value={form.telepon}
                  onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-surface-600">Alamat</label>
                <textarea value={form.alamat} rows={2}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-surface-300 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50">Batal</button>
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-surface-300">
                  {saving ? "Menyimpan..." : editingId ? "Simpan" : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
