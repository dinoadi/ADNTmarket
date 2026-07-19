"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatRupiah, formatDate } from "@/lib/utils";

type Tab = "dashboard" | "toko" | "pengguna";
type TenantStatus = "AKTIF" | "SUSPENDED" | "NONAKTIF";

interface TenantItem {
  id: string;
  slug: string;
  namaToko: string;
  alamat: string | null;
  telepon: string | null;
  statusAktif: boolean;
  status: TenantStatus;
  tanggalMulai: string;
  tanggalKedaluwarsa: string | null;
  jumlahUser: number;
  createdAt: string;
}

interface UserItem {
  id: string;
  email: string;
  nama: string;
  role: string;
  isActive: boolean;
  tenantId: string | null;
  createdAt: string;
  tenant: { namaToko: string; slug: string } | null;
}

interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [userTenantId, setUserTenantId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pengguna");
  const [dark, setDark] = useState(false);

  // Tenants
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantMeta, setTenantMeta] = useState<PageMeta | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");

  // Users
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [userMeta, setUserMeta] = useState<PageMeta | null>(null);
  const [userSearch, setUserSearch] = useState("");

  // Create Tenant
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [ctForm, setCtForm] = useState({ namaToko: "", slug: "", email: "", password: "" });
  const [ctLoading, setCtLoading] = useState(false);

  // Edit Tenant
  const [editTenant, setEditTenant] = useState<TenantItem | null>(null);
  const [etForm, setEtForm] = useState({ namaToko: "", alamat: "", telepon: "" });
  const [etLoading, setEtLoading] = useState(false);

  // Create User
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [cuForm, setCuForm] = useState({ nama: "", email: "", password: "", role: "KASIR", tenantId: "" });
  const [cuLoading, setCuLoading] = useState(false);

  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isTenantAdmin = userRole === "TENANT_ADMIN";

  useEffect(() => {
    const t = localStorage.getItem("adnt_token");
    const u = localStorage.getItem("adnt_user");

    if (!t) { router.push("/"); return; }

    try {
      const parsed = JSON.parse(u ?? "{}");

      // SUPER_ADMIN dan TENANT_ADMIN bisa akses admin panel
      if (parsed.role !== "SUPER_ADMIN" && parsed.role !== "TENANT_ADMIN") {
        toast.error("Akses ditolak");
        router.push("/");
        return;
      }

      setUserName(parsed.nama || "Admin");
      setUserRole(parsed.role);
      setUserTenantId(parsed.tenantId ?? null);

      // TENANT_ADMIN langsung ke tab pengguna
      if (parsed.role === "TENANT_ADMIN") {
        setTab("pengguna");
      } else {
        setTab("dashboard");
      }
    } catch { router.push("/"); return; }

    setToken(t);

    const saved = localStorage.getItem("adnt_theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, [router]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("adnt_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("adnt_theme", "light");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adnt_token");
    localStorage.removeItem("adnt_user");
    router.push("/");
  };

  //─── Fetch Tenants ─────────────────────────────────────────
  const fetchTenants = useCallback(async () => {
    if (!token) return;
    setTenantsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(tenantPage));
      params.set("limit", "10");
      if (tenantSearch) params.set("search", tenantSearch);

      const res = await fetch(`/api/tenants?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTenants(data.data);
        setTenantMeta(data.meta);
      }
    } catch { toast.error("Gagal memuat data toko"); }
    finally { setTenantsLoading(false); }
  }, [token, tenantPage, tenantSearch]);

  useEffect(() => { if (isSuperAdmin) fetchTenants(); }, [fetchTenants, isSuperAdmin]);

  //─── Fetch Users ───────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(userPage));
      params.set("limit", "10");
      if (userSearch) params.set("search", userSearch);

      // TENANT_ADMIN hanya melihat user tenant-nya sendiri
      if (isTenantAdmin && userTenantId) {
        params.set("tenantId", userTenantId);
      }

      const res = await fetch(`/api/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setUserMeta(data.meta);
      }
    } catch { toast.error("Gagal memuat data pengguna"); }
    finally { setUsersLoading(false); }
  }, [token, userPage, userSearch, isTenantAdmin, userTenantId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  //─── Create Tenant ─────────────────────────────────────────
  const handleCreateTenant = async () => {
    if (!token) return;
    setCtLoading(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(ctForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Toko berhasil dibuat");
        setShowCreateTenant(false);
        setCtForm({ namaToko: "", slug: "", email: "", password: "" });
        fetchTenants();
      } else {
        toast.error(data.error ?? "Gagal membuat toko");
      }
    } catch { toast.error("Terjadi kesalahan"); }
    finally { setCtLoading(false); }
  };

  //─── Edit Tenant ───────────────────────────────────────────
  const openEditTenant = (t: TenantItem) => {
    setEditTenant(t);
    setEtForm({ namaToko: t.namaToko, alamat: t.alamat ?? "", telepon: t.telepon ?? "" });
  };

  const handleEditTenant = async () => {
    if (!token || !editTenant) return;
    setEtLoading(true);
    try {
      const res = await fetch(`/api/tenants/${editTenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          namaToko: etForm.namaToko,
          alamat: etForm.alamat || null,
          telepon: etForm.telepon || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Profil toko diperbarui");
        setEditTenant(null);
        fetchTenants();
      } else {
        toast.error(data.error ?? "Gagal memperbarui");
      }
    } catch { toast.error("Terjadi kesalahan"); }
    finally { setEtLoading(false); }
  };

  //─── Toggle Tenant Status ──────────────────────────────────
  const handleToggleStatus = async (tenant: TenantItem) => {
    if (!token) return;
    const newStatus = tenant.status === "AKTIF" ? "SUSPENDED" : "AKTIF";
    try {
      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statusAktif: newStatus === "AKTIF", status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Toko ${newStatus === "AKTIF" ? "diaktifkan" : "dinonaktifkan"}`);
        fetchTenants();
      } else {
        toast.error(data.error ?? "Gagal");
      }
    } catch { toast.error("Terjadi kesalahan"); }
  };

  //─── Delete Tenant ─────────────────────────────────────────
  const handleDeleteTenant = async (tenant: TenantItem) => {
    if (!token) return;
    if (!confirm(`Hapus semua data toko "${tenant.namaToko}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Toko dihapus");
        fetchTenants();
      } else {
        toast.error(data.error ?? "Gagal menghapus");
      }
    } catch { toast.error("Terjadi kesalahan"); }
  };

  //─── Create User ───────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!token) return;
    setCuLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(cuForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Pengguna berhasil dibuat");
        setShowCreateUser(false);
        setCuForm({ nama: "", email: "", password: "", role: "KASIR", tenantId: "" });
        fetchUsers();
      } else {
        toast.error(data.error ?? "Gagal membuat pengguna");
      }
    } catch { toast.error("Terjadi kesalahan"); }
    finally { setCuLoading(false); }
  };

  //─── Delete User ───────────────────────────────────────────
  const handleDeleteUser = async (user: UserItem) => {
    if (!token) return;
    if (!confirm(`Hapus pengguna "${user.nama}" (${user.email})?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Pengguna dihapus");
        fetchUsers();
      } else {
        toast.error(data.error ?? "Gagal menghapus");
      }
    } catch { toast.error("Terjadi kesalahan"); }
  };

  //─── Toggle User Status ────────────────────────────────────
  const handleToggleUserStatus = async (user: UserItem) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Pengguna ${user.isActive ? "dinonaktifkan" : "diaktifkan"}`);
        fetchUsers();
      } else {
        toast.error(data.error ?? "Gagal");
      }
    } catch { toast.error("Terjadi kesalahan"); }
  };

  const totalTenants = tenantMeta?.total ?? 0;
  const activeTenants = tenants.filter((t) => t.status === "AKTIF").length;
  const totalUsers = userMeta?.total ?? 0;

  // Tabs yang tersedia berdasarkan role
  const availableTabs: [Tab, string][] = isSuperAdmin
    ? [["dashboard", "Dashboard"], ["toko", "Toko"], ["pengguna", "Pengguna"]]
    : [["pengguna", "Pengguna"]];

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* ─── Navbar ─────────────────────────────────── */}
      <nav className="sticky top-0 z-30 border-b border-surface-200 bg-white/90 backdrop-blur dark:border-surface-800 dark:bg-surface-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              A
            </div>
            <span className="text-base font-bold tracking-tight text-surface-900 dark:text-white">
              Admin<span className="text-blue-600">Panel</span>
            </span>
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {isSuperAdmin ? "Super Admin" : "Admin Toko"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-400 dark:text-surface-500">
              {userName}
            </span>
            <button
              onClick={toggleDark}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
              title={dark ? "Mode Terang" : "Mode Gelap"}
            >
              {dark ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
            <button onClick={handleLogout} className="btn-ghost text-xs text-red-600 dark:text-red-400">
              Keluar
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Tabs ───────────────────────────────────── */}
      <div className="border-b border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto flex max-w-6xl gap-1 px-6">
          {availableTabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={
                "px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px " +
                (tab === key
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content ────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6 py-6">

        {/* ═══ DASHBOARD ═══════════════════════════════ */}
        {isSuperAdmin && tab === "dashboard" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">Dashboard</h2>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Ringkasan platform ADNTmarket
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-surface-500 dark:text-surface-400">
                  Total Toko
                </p>
                <p className="mt-1.5 text-3xl font-bold text-surface-900 dark:text-white">
                  {totalTenants}
                </p>
              </div>
              <div className="card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-surface-500 dark:text-surface-400">
                  Toko Aktif
                </p>
                <p className="mt-1.5 text-3xl font-bold text-green-600 dark:text-green-400">
                  {activeTenants}
                </p>
              </div>
              <div className="card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-surface-500 dark:text-surface-400">
                  Total Pengguna
                </p>
                <p className="mt-1.5 text-3xl font-bold text-surface-900 dark:text-white">
                  {totalUsers}
                </p>
              </div>
            </div>

            <div className="card">
              <div className="border-b border-surface-100 px-5 py-3 dark:border-surface-700">
                <h3 className="text-sm font-semibold text-surface-900 dark:text-white">Toko Terbaru</h3>
              </div>
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {tenants.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">{t.namaToko}</p>
                      <p className="text-xs text-surface-400">{t.slug} &middot; {t.jumlahUser} pengguna</p>
                    </div>
                    <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " + (
                      t.status === "AKTIF" ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    )}>
                      {t.status}
                    </span>
                  </div>
                ))}
                {tenants.length === 0 && (
                  <p className="px-5 py-6 text-center text-sm text-surface-400">Belum ada toko</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TOKO ════════════════════════════════════ */}
        {isSuperAdmin && tab === "toko" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">Manajemen Toko</h2>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Kelola semua toko dalam platform
                </p>
              </div>
              <button onClick={() => setShowCreateTenant(true)} className="btn-primary text-sm">
                + Tambah Toko
              </button>
            </div>

            {/* Search */}
            <input
              placeholder="Cari toko..."
              value={tenantSearch}
              onChange={(e) => { setTenantSearch(e.target.value); setTenantPage(1); }}
              className="input max-w-xs"
            />

            {/* Table */}
            <div className="card overflow-hidden">
              {tenantsLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
                  ))}
                </div>
              ) : tenants.length === 0 ? (
                <div className="p-8 text-center text-sm text-surface-400">Belum ada toko</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-100 bg-surface-50 text-left text-xs font-medium text-surface-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400">
                          <th className="px-4 py-3">Toko</th>
                          <th className="px-4 py-3">Slug</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Pengguna</th>
                          <th className="px-4 py-3">Berakhir</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenants.map((tenant) => (
                          <tr key={tenant.id} className="border-b border-surface-50 text-surface-700 last:border-0 hover:bg-surface-50 dark:border-surface-800 dark:text-surface-300 dark:hover:bg-surface-800/50">
                            <td className="px-4 py-3 font-medium dark:text-white">{tenant.namaToko}</td>
                            <td className="px-4 py-3 font-mono text-xs text-surface-500">{tenant.slug}</td>
                            <td className="px-4 py-3">
                              <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " + (
                                tenant.status === "AKTIF" ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                tenant.status === "SUSPENDED" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              )}>
                                {tenant.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-surface-500">{tenant.jumlahUser}</td>
                            <td className="px-4 py-3 text-xs text-surface-500">
                              {tenant.tanggalKedaluwarsa ? formatDate(tenant.tanggalKedaluwarsa, "short") : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => openEditTenant(tenant)} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20">
                                  Edit
                                </button>
                                <button onClick={() => handleToggleStatus(tenant)} className={"rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors " + (
                                  tenant.status === "AKTIF"
                                    ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                                    : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                )}>
                                  {tenant.status === "AKTIF" ? "Nonaktifkan" : "Aktifkan"}
                                </button>
                                <button onClick={() => handleDeleteTenant(tenant)} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {tenantMeta && tenantMeta.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-surface-100 px-4 py-3 dark:border-surface-700">
                      <p className="text-xs text-surface-500">
                        Halaman {tenantMeta.page} dari {tenantMeta.totalPages} ({tenantMeta.total} total)
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setTenantPage((p) => Math.max(1, p - 1))} disabled={tenantPage <= 1} className="btn-ghost text-xs">
                          Sebelumnya
                        </button>
                        <button onClick={() => setTenantPage((p) => Math.min(tenantMeta.totalPages, p + 1))} disabled={tenantPage >= tenantMeta.totalPages} className="btn-ghost text-xs">
                          Selanjutnya
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ PENGGUNA ════════════════════════════════ */}
        {tab === "pengguna" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">Manajemen Pengguna</h2>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  {isTenantAdmin ? "Kelola akun kasir untuk toko Anda" : "Kelola pengguna untuk setiap toko"}
                </p>
              </div>
              <button onClick={() => {
                // TENANT_ADMIN: set tenantId otomatis
                if (isTenantAdmin && userTenantId) {
                  setCuForm((f) => ({ ...f, tenantId: userTenantId }));
                }
                setShowCreateUser(true);
              }} className="btn-primary text-sm">
                + Tambah Pengguna
              </button>
            </div>

            {/* Search */}
            <input
              placeholder="Cari pengguna..."
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
              className="input max-w-xs"
            />

            {/* Table */}
            <div className="card overflow-hidden">
              {usersLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="p-8 text-center text-sm text-surface-400">Belum ada pengguna</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-100 bg-surface-50 text-left text-xs font-medium text-surface-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-400">
                          <th className="px-4 py-3">Nama</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Role</th>
                          {isSuperAdmin && <th className="px-4 py-3">Toko</th>}
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-surface-50 text-surface-700 last:border-0 hover:bg-surface-50 dark:border-surface-800 dark:text-surface-300 dark:hover:bg-surface-800/50">
                            <td className="px-4 py-3 font-medium dark:text-white">{user.nama}</td>
                            <td className="px-4 py-3 text-xs text-surface-500">{user.email}</td>
                            <td className="px-4 py-3">
                              <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " + (
                                user.role === "TENANT_ADMIN" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300"
                              )}>
                                {user.role === "TENANT_ADMIN" ? "Admin Toko" : "Kasir"}
                              </span>
                            </td>
                            {isSuperAdmin && (
                              <td className="px-4 py-3 text-xs text-surface-500">
                                {user.tenant?.namaToko ?? "—"}
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " + (
                                user.isActive ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              )}>
                                {user.isActive ? "Aktif" : "Nonaktif"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => handleToggleUserStatus(user)} className={"rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors " + (
                                  user.isActive
                                    ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                                    : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                )}>
                                  {user.isActive ? "Nonaktifkan" : "Aktifkan"}
                                </button>
                                <button onClick={() => handleDeleteUser(user)} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                                  Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {userMeta && userMeta.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-surface-100 px-4 py-3 dark:border-surface-700">
                      <p className="text-xs text-surface-500">
                        Halaman {userMeta.page} dari {userMeta.totalPages} ({userMeta.total} total)
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage <= 1} className="btn-ghost text-xs">
                          Sebelumnya
                        </button>
                        <button onClick={() => setUserPage((p) => Math.min(userMeta.totalPages, p + 1))} disabled={userPage >= userMeta.totalPages} className="btn-ghost text-xs">
                          Selanjutnya
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODAL: Create Tenant ══════════════════════════════ */}
      {isSuperAdmin && showCreateTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-surface-900">
            <h3 className="mb-4 text-base font-bold text-surface-900 dark:text-white">Tambah Toko Baru</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Nama Toko</label>
                <input
                  value={ctForm.namaToko}
                  onChange={(e) => setCtForm((f) => ({
                    ...f,
                    namaToko: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9-]/g, ""),
                  }))}
                  placeholder="Toko Contoh"
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Slug (URL)</label>
                <input
                  value={ctForm.slug}
                  onChange={(e) => setCtForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="tokocontoh"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Email Admin</label>
                <input
                  type="email"
                  value={ctForm.email}
                  onChange={(e) => setCtForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="admin@tokocontoh.com"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={ctForm.password}
                  onChange={(e) => setCtForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 karakter"
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCreateTenant(false)} className="btn-secondary text-sm">
                  Batal
                </button>
                <button
                  onClick={handleCreateTenant}
                  disabled={!ctForm.namaToko || !ctForm.slug || !ctForm.email || ctForm.password.length < 6}
                  className="btn-primary text-sm"
                >
                  {ctLoading ? "Membuat..." : "Buat Toko"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Edit Tenant ════════════════════════════════ */}
      {isSuperAdmin && editTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-surface-900">
            <h3 className="mb-4 text-base font-bold text-surface-900 dark:text-white">
              Edit Profil Toko
            </h3>
            <div className="space-y-3">
              <div>
                <label className="label">Nama Toko</label>
                <input
                  value={etForm.namaToko}
                  onChange={(e) => setEtForm((f) => ({ ...f, namaToko: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Alamat</label>
                <textarea
                  value={etForm.alamat}
                  onChange={(e) => setEtForm((f) => ({ ...f, alamat: e.target.value }))}
                  className="input min-h-[60px] resize-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="label">Telepon</label>
                <input
                  value={etForm.telepon}
                  onChange={(e) => setEtForm((f) => ({ ...f, telepon: e.target.value }))}
                  placeholder="0812-xxxx-xxxx"
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditTenant(null)} className="btn-secondary text-sm">
                  Batal
                </button>
                <button onClick={handleEditTenant} className="btn-primary text-sm">
                  {etLoading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Create User ════════════════════════════════ */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-surface-900">
            <h3 className="mb-4 text-base font-bold text-surface-900 dark:text-white">Tambah Pengguna Baru</h3>
            <div className="space-y-3">
              {/* Select Toko — hanya untuk SUPER_ADMIN */}
              {isSuperAdmin ? (
                <div>
                  <label className="label">Toko</label>
                  <select
                    value={cuForm.tenantId}
                    onChange={(e) => setCuForm((f) => ({ ...f, tenantId: e.target.value }))}
                    className="input"
                  >
                    <option value="">Pilih toko...</option>
                    {tenants.filter((t) => t.status === "AKTIF").map((t) => (
                      <option key={t.id} value={t.id}>{t.namaToko}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label">Toko</label>
                  <input
                    value={tenants.find((t) => t.id === userTenantId)?.namaToko ?? "Toko Anda"}
                    className="input bg-surface-50 text-surface-500"
                    disabled
                  />
                </div>
              )}
              <div>
                <label className="label">Nama</label>
                <input
                  value={cuForm.nama}
                  onChange={(e) => setCuForm((f) => ({ ...f, nama: e.target.value }))}
                  placeholder="Nama pengguna"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={cuForm.email}
                  onChange={(e) => setCuForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@tokocontoh.com"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={cuForm.password}
                  onChange={(e) => setCuForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 karakter"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Role</label>
                {isSuperAdmin ? (
                  <select
                    value={cuForm.role}
                    onChange={(e) => setCuForm((f) => ({ ...f, role: e.target.value }))}
                    className="input"
                  >
                    <option value="KASIR">Kasir</option>
                    <option value="TENANT_ADMIN">Admin Toko</option>
                  </select>
                ) : (
                  <input
                    value="Kasir"
                    className="input bg-surface-50 text-surface-500"
                    disabled
                  />
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCreateUser(false)} className="btn-secondary text-sm">
                  Batal
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={!cuForm.tenantId || !cuForm.nama || !cuForm.email || cuForm.password.length < 6}
                  className="btn-primary text-sm"
                >
                  {cuLoading ? "Membuat..." : "Buat Pengguna"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
