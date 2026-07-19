"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Download } from "lucide-react";
import type { StatsData, TransactionData } from "@/types";

type Periode = "today" | "week" | "month" | "custom";

const PERIODE_LIST: Array<{ label: string; value: Periode | "" }> = [
  { label: "Hari Ini", value: "today" },
  { label: "Minggu Ini", value: "week" },
  { label: "Bulan Ini", value: "month" },
  { label: "Kustom", value: "custom" },
];

export default function LaporanPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.toko_slug as string;

  const [token, setToken] = useState<string | null>(null);
  const [periode, setPeriode] = useState<Periode>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [stats, setStats] = useState<StatsData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const t = localStorage.getItem("adnt_token");
    if (!t) {
      router.push(`/${slug}`);
      return;
    }
    setToken(t);
  }, [slug, router]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("periode", periode);
      if (periode === "custom") {
        if (customStart) params.set("startDate", customStart);
        if (customEnd) params.set("endDate", customEnd);
      }
      params.set("page", String(page));
      params.set("limit", "10");

      const [statsRes, txRes] = await Promise.all([
        fetch(`/api/${slug}/transactions/stats?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/${slug}/transactions?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const statsData = await statsRes.json();
      const txData = await txRes.json();

      if (statsData.success) setStats(statsData.data);
      if (txData.success) {
        setTransactions(txData.data);
        setTotalPages(txData.meta?.totalPages ?? 1);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, slug, periode, customStart, customEnd, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
            <h1 className="text-lg font-bold text-surface-900">Laporan Keuangan</h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/${slug}/transactions/export?periode=${periode}${periode === "custom" && customStart ? `&startDate=${customStart}` : ""}${periode === "custom" && customEnd ? `&endDate=${customEnd}` : ""}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-surface-200 bg-white px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </a>
            <button
              onClick={() => { localStorage.removeItem("adnt_token"); localStorage.removeItem("adnt_user"); router.push(`/${slug}`); }}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Keluar
            </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl p-6">
        {/* Periode Filter */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {PERIODE_LIST.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                setPeriode(p.value as Periode);
                setPage(1);
              }}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                periode === p.value
                  ? "bg-brand-600 text-white"
                  : "bg-white text-surface-600 hover:bg-surface-100 border border-surface-200"
              }`}
            >
              {p.label}
            </button>
          ))}

          {periode === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-md border border-surface-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
              />
              <span className="text-surface-400">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-md border border-surface-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
              />
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-100" />
            ))}
          </div>
        ) : stats ? (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Total Omzet</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">
                {formatRupiah(stats.totalOmzet)}
              </p>
            </div>
            <div className="rounded-lg border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Laba Kotor</p>
              <p className="mt-1 text-xl font-bold text-brand-600">
                {formatRupiah(stats.totalLaba)}
              </p>
            </div>
            <div className="rounded-lg border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Total Modal</p>
              <p className="mt-1 text-xl font-bold text-surface-600">
                {formatRupiah(stats.totalModal)}
              </p>
            </div>
            <div className="rounded-lg border border-surface-200 bg-white p-4">
              <p className="text-xs font-medium text-surface-500">Transaksi</p>
              <p className="mt-1 text-xl font-bold text-surface-900">
                {stats.totalTransaksi}
              </p>
            </div>
          </div>
        ) : null}

        {/* Transactions Table */}
        <div className="rounded-lg border border-surface-200 bg-white">
          <div className="border-b border-surface-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-surface-800">
              Riwayat Transaksi
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-surface-50" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-surface-400">
              Belum ada transaksi
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100 text-left text-xs font-medium text-surface-500">
                      <th className="px-4 py-3">Kode</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Tunai</th>
                      <th className="px-4 py-3 text-right">Kembali</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-surface-50 text-surface-700 last:border-0 hover:bg-surface-50"
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {tx.kodeTransaksi}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {formatDate(tx.createdAt, "short")}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {tx.details?.length ?? 0} item
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatRupiah(tx.totalBelanja)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatRupiah(tx.nominalBayar)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatRupiah(tx.kembalian)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              tx.status
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {tx.status ? "Lunas" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-surface-100 px-4 py-3">
                  <p className="text-xs text-surface-500">
                    Halaman {page} dari {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="rounded-md border border-surface-200 px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-50 disabled:opacity-50"
                    >
                      Sebelumnya
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="rounded-md border border-surface-200 px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-50 disabled:opacity-50"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
