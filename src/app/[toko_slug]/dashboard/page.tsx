"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils";

type Periode = "today" | "week" | "month";

interface Stats {
  totalOmzet: number;
  totalModal: number;
  totalLaba: number;
  totalTransaksi: number;
  periode: { start: string | null; end: string | null };
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.toko_slug as string;

  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState<Periode>("today");

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

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/${slug}/transactions/stats?periode=${periode}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, slug, periode]);

  const statCards = stats ? [
    { label: "Omzet", value: formatRupiah(stats.totalOmzet), color: "text-brand-600", bg: "bg-brand-50" },
    { label: "Laba Kotor", value: formatRupiah(stats.totalLaba), color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Modal", value: formatRupiah(stats.totalModal), color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Transaksi", value: stats.totalTransaksi.toString(), color: "text-blue-600", bg: "bg-blue-50" },
  ] : [];

  const quickLinks = [
    {
      title: "Kasir",
      desc: "Buka halaman kasir untuk transaksi",
      href: `/${slug}/kasir`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125V9M6 6h12M3 6h18m-6 8.25h2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75H15m-6 0H6.75a.75.75 0 01-.75-.75v-1.5a.75.75 0 01.75-.75H9m3-3V9m0 2.25v3" />
        </svg>
      ),
    },
    {
      title: "Produk",
      desc: "Kelola daftar produk & stok",
      href: `/${slug}/produk`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
    },
    {
      title: "Laporan",
      desc: "Lihat riwayat transaksi & rekap",
      href: `/${slug}/laporan`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      title: "Pelanggan",
      desc: "Data pelanggan & loyalitas",
      href: `/${slug}/pelanggan`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    {
      title: "Pengaturan",
      desc: "Atur footer struk & info toko",
      href: `/${slug}/pengaturan`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="border-b border-surface-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-lg font-bold text-surface-900">Dashboard</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/${slug}/kasir`)}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
              Buka Kasir
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {/* Periode Filter */}
        <div className="mb-6 flex gap-1.5 rounded-xl border border-surface-200 bg-white p-1 w-fit">
          {[
            { key: "today", label: "Hari Ini" },
            { key: "week", label: "Minggu Ini" },
            { key: "month", label: "Bulan Ini" },
          ].map((p) => (
            <button key={p.key}
              onClick={() => setPeriode(p.key as Periode)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                periode === p.key ? "bg-brand-600 text-white shadow-sm" : "text-surface-500 hover:text-surface-700"
              }`}
            >{p.label}</button>
          ))}
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : stats ? (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statCards.map((s, i) => (
              <div key={i} className="rounded-2xl border border-surface-200 bg-white p-5 transition-all hover:shadow-sm">
                <p className="text-xs font-medium text-surface-500">{s.label}</p>
                <p className={`mt-2 text-xl font-bold sm:text-2xl ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Quick Links */}
        <h2 className="mb-4 text-sm font-semibold text-surface-700">Menu Cepat</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {quickLinks.map((link, i) => (
            <button
              key={i}
              onClick={() => router.push(link.href)}
              className="group rounded-2xl border border-surface-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                {link.icon}
              </div>
              <h3 className="text-sm font-semibold text-surface-900">{link.title}</h3>
              <p className="mt-1 text-xs text-surface-500">{link.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
