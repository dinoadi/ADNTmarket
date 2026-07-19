"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import { ShoppingCart, Package, FileText, Users, Settings, ArrowRight, LayoutDashboard } from "lucide-react";

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

  const statCards = stats
    ? [
        { label: "Omzet", value: formatRupiah(stats.totalOmzet), accent: "text-brand-600", bar: "bg-brand-500" },
        { label: "Laba Kotor", value: formatRupiah(stats.totalLaba), accent: "text-emerald-600", bar: "bg-emerald-500" },
        { label: "Modal", value: formatRupiah(stats.totalModal), accent: "text-amber-600", bar: "bg-amber-500" },
        { label: "Transaksi", value: stats.totalTransaksi.toString(), accent: "text-blue-600", bar: "bg-blue-500" },
      ]
    : [];

  const quickLinks = [
    { title: "Kasir", desc: "Buka halaman kasir untuk transaksi", href: `/${slug}/kasir`, icon: ShoppingCart },
    { title: "Produk", desc: "Kelola daftar produk & stok", href: `/${slug}/produk`, icon: Package },
    { title: "Laporan", desc: "Lihat riwayat transaksi & rekap", href: `/${slug}/laporan`, icon: FileText },
    { title: "Pelanggan", desc: "Data pelanggan & loyalitas", href: `/${slug}/pelanggan`, icon: Users },
    { title: "Pengaturan", desc: "Atur footer struk & info toko", href: `/${slug}/pengaturan`, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-surface-950">
      {/* ─── Header ─────────────── */}
      <div className="border-b border-warm-200 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-surface-800 dark:bg-surface-950/80 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-5 w-5 text-brand-600" />
            <h1 className="font-serif text-xl font-bold text-surface-900 dark:text-warm-100">
              Dashboard
            </h1>
          </div>
          <button
            onClick={() => router.push(`/${slug}/kasir`)}
            className="btn-primary gap-2 px-5 py-2 text-xs"
          >
            Buka Kasir
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {/* ─── Periode Filter ────── */}
        <div className="mb-6 flex w-fit gap-1 rounded-xl border border-warm-200 bg-white p-1 dark:border-surface-700 dark:bg-surface-800">
          {[
            { key: "today" as const, label: "Hari Ini" },
            { key: "week" as const, label: "Minggu Ini" },
            { key: "month" as const, label: "Bulan Ini" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriode(p.key)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                periode === p.key
                  ? "bg-surface-900 text-white shadow-sm dark:bg-warm-100 dark:text-surface-900"
                  : "text-surface-500 hover:text-surface-700 dark:text-warm-400 dark:hover:text-warm-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ─── Stats Cards ───────── */}
        {loading ? (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white dark:bg-surface-800" />
            ))}
          </div>
        ) : stats ? (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statCards.map((s, i) => (
              <div
                key={i}
                className="card overflow-hidden p-5 transition-all hover:shadow-md"
              >
                <div className="mb-1 h-1 w-8 rounded-full" />
                <p className="text-xs font-medium text-surface-500 dark:text-warm-400">{s.label}</p>
                <p className={`mt-1.5 font-serif text-xl font-bold sm:text-2xl ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* ─── Quick Links ───────── */}
        <h2 className="mb-4 text-sm font-semibold text-surface-600 dark:text-warm-400">
          Menu Cepat
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {quickLinks.map((link, i) => {
            const Icon = link.icon;
            return (
              <button
                key={i}
                onClick={() => router.push(link.href)}
                className="card group p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100 dark:bg-brand-950/30 dark:text-brand-400 dark:group-hover:bg-brand-950/50">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-surface-900 dark:text-warm-100">{link.title}</h3>
                <p className="mt-1 text-xs text-surface-500 dark:text-warm-400">{link.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
