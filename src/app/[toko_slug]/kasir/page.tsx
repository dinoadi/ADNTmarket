"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { ReceiptContent } from "@/components/kasir/ReceiptContent";
import type { CartItem, KategoriProduk, ProductData, TransactionData } from "@/types";

const KATEGORI_LIST: Array<{ label: string; value: string }> = [
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

const SHORTCUT_NOMINAL = [10000, 20000, 50000, 100000];

export default function CashierPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.toko_slug as string;
  const searchRef = useRef<HTMLInputElement>(null);

  // Auth
  const [token, setToken] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState({ namaToko: "", telepon: "", alamat: "" });

  // Products
  const [products, setProducts] = useState<ProductData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("");
  const [productsLoading, setProductsLoading] = useState(true);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<TransactionData | null>(null);

  // Payment
  const [nominalBayar, setNominalBayar] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metodePembayaran, setMetodePembayaran] = useState("TUNAI");
  const [diskon, setDiskon] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; nama: string } | null>(null);
  const [customers, setCustomers] = useState<Array<{ id: string; nama: string }>>([]);
  // Settings (footer untuk struk)
  const [footerStruk, setFooterStruk] = useState("Terima kasih telah berbelanja");

  // ── Init ─────────────────────────────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem("adnt_token");
    const storedUser = localStorage.getItem("adnt_user");

    if (!storedToken) {
      router.push(`/${slug}`);
      return;
    }

    setToken(storedToken);

    // Parse user untuk info tenant
    try {
      const user = JSON.parse(storedUser ?? "{}");
      if (user.tenantSlug !== slug) {
        // Wrong tenant, redirect
        router.push(`/${slug}`);
        return;
      }
      if (user.tenantNama) {
        setTenantInfo((prev) => ({ ...prev, namaToko: user.tenantNama }));
      }
    } catch { /* ignore */ }

    // Fetch settings untuk tenant info
    fetch(`/api/${slug}/settings`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setFooterStruk(data.data.footerStruk ?? "Terima kasih telah berbelanja");
        }
      })
      .catch(() => {});

    // Fetch tenant info dari middleware header
    fetch(`/api/${slug}/settings`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setTenantInfo((prev) => ({
            ...prev,
            telepon: data.data.telepon ?? "",
            alamat: data.data.alamat ?? "",
          }));
        }
      })
      .catch(() => {});

    // Auto-focus search input
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [slug, router]);

    // Fetch customers
    fetch(`/api/${slug}/customers?limit=200`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
.then((r) => r.json())
.then((data) => {
      if (data.success) setCustomers(data.data);
    })
.catch(() => {});

  // ── Fetch Products ──────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setProductsLoading(true);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedKategori) params.set("kategori", selectedKategori);
      params.set("limit", "100");

      const res = await fetch(`/api/${slug}/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setProducts(data.data);
      }
    } catch {
      toast.error("Gagal memuat produk");
    } finally {
      setProductsLoading(false);
    }
  }, [token, slug, searchQuery, selectedKategori]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Cart Logic ───────────────────────────────────────────
  const addToCart = (product: ProductData) => {
    if (product.stok <= 0) {
      toast.error(`Stok ${product.nama} habis`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        // Cek stok
        if (existing.qty >= product.stok) {
          toast.error(`Stok ${product.nama} tidak mencukupi`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                qty: item.qty + 1,
                subtotal: (item.qty + 1) * item.hargaJual,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          nama: product.nama,
          hargaJual: product.hargaJual,
          qty: 1,
          stok: product.stok,
          subtotal: product.hargaJual,
        },
      ];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const newQty = item.qty + delta;
          if (newQty <= 0) return null; // remove item
          if (newQty > item.stok) {
            toast.error(`Stok ${item.nama} tidak mencukupi`);
            return item;
          }
          return { ...item, qty: newQty, subtotal: newQty * item.hargaJual };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

const totalBelanja = cart.reduce((sum, item) => sum + item.subtotal, 0);
const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalSetelahDiskon = totalBelanja - diskon;
const kembalian = nominalBayar - totalSetelahDiskon;
  // ── Checkout ─────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Keranjang belanja kosong");
      return;
    }
    if (nominalBayar < totalSetelahDiskon) {
      toast.error("Nominal bayar kurang dari total setelah diskon");
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch(`/api/${slug}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            qty: item.qty,
          })),
          nominalBayar,
          metodePembayaran,
          diskon,
          customerId: selectedCustomer?.id ?? null,
        }),
      });

      if (!data.success) {
        toast.error(data.error ?? "Transaksi gagal");
        setIsProcessing(false);
        return;
      }

      // Success
      toast.success("Pembayaran berhasil!");
      setLastTransaction(data.data);
      setShowReceipt(true);

      // Reset cart & refresh products
      setCart([]);
      setNominalBayar(0);
      fetchProducts();
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Print Receipt ────────────────────────────────────────
  const handlePrint = () => {
    if (!lastTransaction) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Izinkan pop-up untuk mencetak struk");
      return;
    }

    const receiptData = {
      namaToko: tenantInfo.namaToko || slug,
      alamat: tenantInfo.alamat,
      telepon: tenantInfo.telepon,
      kodeTransaksi: lastTransaction.kodeTransaksi,
      metodePembayaran: lastTransaction.metodePembayaran,
      diskon: lastTransaction.diskon,
      items: (lastTransaction.details ?? []).map((d) => ({
        nama: d.namaProduk,
        qty: d.qty,
        hargaJual: d.hargaJual,
        subtotal: d.subtotal,
      })),
      totalBelanja: lastTransaction.totalBelanja,
      nominalBayar: lastTransaction.nominalBayar,
      kembalian: lastTransaction.kembalian,
      footerStruk,
      tanggal: lastTransaction.createdAt,
    };
    printWindow.document.write(`
      <html>
        <head>
          <title>Struk Belanja</title>
          <link rel="stylesheet" href="/globals.css" />
          <style>
            @page { size: 58mm auto; margin: 0; }
            @media print {
              body { font-family: 'Courier New', monospace; font-size: 10px; }
              body * { display: block !important; }
            }
          </style>
        </head>
        <body>
          <div id="receipt-root"></div>
          <script>
            document.getElementById('receipt-root').innerHTML = ${JSON.stringify(
              renderReceiptHTML(receiptData)
            )};
            window.print();
            window.close();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

const handleNewTransaction = () => {
  setShowReceipt(false);
  setLastTransaction(null);
  setSearchQuery("");
  setNominalBayar(0);
  setDiskon(0);
  setSelectedCustomer(null);
  setMetodePembayaran("TUNAI");
  setTimeout(() => searchRef.current?.focus(), 100);
};

  // ── Shortcut Nominal ─────────────────────────────────────
  const addNominal = (amount: number) => {
    if (amount === 0) {
      setNominalBayar(totalBelanja);
    } else {
      setNominalBayar((prev) => prev + amount);
    }
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <div className="no-print flex items-center justify-between border-b border-surface-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-surface-900">
            {tenantInfo.namaToko || slug}
          </h1>
          <span className="text-xs text-surface-400">Kasir</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/${slug}/laporan`)}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100"
          >
            Laporan
          </button>
          <button
            onClick={() => router.push(`/${slug}/pengaturan`)}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100"
          >
            Pengaturan
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("adnt_token");
              localStorage.removeItem("adnt_user");
              router.push(`/${slug}`);
            }}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* ── Split Screen ────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ═══ LEFT PANEL: Product Catalog (60%) ════════ */}
        <div className="no-print flex w-[60%] flex-col border-r border-surface-200">
          {/* Search Bar - Auto Focus */}
          <div className="border-b border-surface-100 p-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk (scan barcode)..."
                className="w-full rounded-md border border-surface-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Category Pills */}
            <div className="mt-3 flex gap-1.5 overflow-x-auto">
              {KATEGORI_LIST.map((k) => (
                <button
                  key={k.value}
                  onClick={() => setSelectedKategori(k.value)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedKategori === k.value
                      ? "bg-brand-600 text-white"
                      : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {productsLoading ? (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-md bg-surface-100"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-surface-400">
                  {searchQuery
                    ? "Produk tidak ditemukan"
                    : "Belum ada produk"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {products.map((product) => {
                  const stokHabis = product.stok <= 0;
                  const stokMenipis = product.stok > 0 && product.stok <= 5;
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={stokHabis}
                      className={`group rounded-xl border-2 p-3 text-left transition-all duration-150 ${
                        stokHabis
                          ? "border-surface-100 opacity-40 bg-surface-50"
                          : "border-surface-100 bg-white hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                      }`}
                    >
                      {/* Colorful header */}
                      <div className={`-mx-3 -mt-3 mb-2 rounded-t-xl px-3 py-2 text-xs font-semibold text-white ${
                        stokHabis ? "bg-surface-400"
                          : product.kategori === "MAKANAN" ? "bg-orange-500"
                          : product.kategori === "MINUMAN" ? "bg-sky-500"
                          : product.kategori === "SEMBAKO" ? "bg-emerald-600"
                          : product.kategori === "SNACK" ? "bg-amber-500"
                          : product.kategori === "ROKOK" ? "bg-stone-600"
                          : product.kategori === "MINYAK" ? "bg-yellow-600"
                          : "bg-brand-500"
                      }`}>
                        {product.kategori || "PRODUK"}
                      </div>
                      <p className="text-sm font-semibold text-surface-800 line-clamp-2 min-h-[2.5rem]">
                        {product.nama}
                      </p>
                      <p className="mt-1.5 text-base font-bold text-emerald-600">
                        {formatRupiah(product.hargaJual)}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          stokHabis ? "text-red-500 font-medium"
                            : stokMenipis ? "text-amber-600 font-medium"
                            : "text-surface-400"
                        }`}
                      >
                        {stokHabis
                          ? "⛔ Stok Habis"
                          : stokMenipis
                          ? `⚠️ Sisa ${product.stok} ${product.satuan}`
                          : `Stok: ${product.stok} ${product.satuan}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        {/* ═══ RIGHT PANEL: Cart + Payment (40%) ════════ */}
        <div className="no-print flex w-[40%] flex-col bg-white">
          {/* Cart Header */}
          <div className="border-b border-surface-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-surface-800">
              Keranjang Belanja
              {totalItems > 0 && (
                <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">
                  {totalItems}
                </span>
              )}
            </h2>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-surface-400">
                  Belum ada item
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="rounded-md border border-surface-100 bg-surface-50 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <p className="flex-1 text-sm font-medium text-surface-800">
                        {item.nama}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="ml-2 text-surface-400 hover:text-red-500"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.productId, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-surface-300 text-surface-600 hover:bg-surface-200"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm font-medium">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.productId, 1)}
                          disabled={item.qty >= item.stok}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-surface-300 text-surface-600 hover:bg-surface-200 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-surface-800">
                        {formatRupiah(item.subtotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Panel (Sticky Bottom) */}
          <div className="border-t border-surface-200 p-4 space-y-3">
            {/* Pelanggan */}
            <div>
              <select
                value={selectedCustomer?.id ?? ""}
                onChange={(e) => {
                  const c = customers.find((c) => c.id === e.target.value);
                  setSelectedCustomer(c ?? null);
                }}
                className="w-full rounded-md border border-surface-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Tanpa Pelanggan</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.nama}</option>))}
              </select>
            </div>

            {/* Metode Pembayaran */}
            <div className="flex gap-1.5">
              {["TUNAI", "QRIS", "DEBIT", "TRANSFER"].map((m) => (
                <button
                  key={m}
                  onClick={() => setMetodePembayaran(m)}
                  className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
                    metodePembayaran === m
                      ? "bg-brand-600 text-white shadow-sm"
                      : "border border-surface-200 text-surface-600 hover:bg-surface-50"
                  }`}
                >
                  {m === "TUNAI" ? "💰 Tunai" : m === "QRIS" ? "📱 QRIS" : m === "DEBIT" ? "💳 Debit" : "🏦 Transfer"}
                </button>
              ))}
            </div>

            {/* Total + Diskon */}
            <div className="rounded-md bg-surface-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-600">Total</span>
                <span className="font-bold text-surface-900">{formatRupiah(totalBelanja)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-surface-500">Diskon</span>
                <input
                  type="number"
                  value={diskon || ""}
                  onChange={(e) => setDiskon(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-24 rounded border border-surface-300 px-2 py-1 text-xs font-medium text-right outline-none focus:border-brand-500 ml-auto"
                />
              </div>
              {diskon > 0 && (
                <div className="mt-1 flex items-center justify-between text-sm text-red-600">
                  <span>Total setelah diskon</span>
                  <span className="font-bold">{formatRupiah(totalSetelahDiskon)}</span>
                </div>
              )}
            </div>

            {/* Nominal Bayar */}
            <div>
              <input
                type="number"
                value={nominalBayar || ""}
                onChange={(e) => setNominalBayar(Number(e.target.value) || 0)}
                placeholder="Nominal bayar..."
                className="w-full rounded-md border border-surface-300 px-4 py-2.5 text-lg font-bold text-surface-900 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Shortcut Nominal */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => addNominal(0)}
                className="rounded-md border border-brand-200 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
              >
                Uang Pas
              </button>
              {SHORTCUT_NOMINAL.map((nom) => (
                <button
                  key={nom}
                  onClick={() => addNominal(nom)}
                  className="rounded-md border border-surface-200 px-2.5 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-50"
                >
                  +{formatRupiah(nom)}
                </button>
              ))}
            </div>

            {/* Kembalian */}
            {nominalBayar > 0 && (
              <div className="rounded-md bg-surface-50 p-3 text-center">
                {kembalian < 0 ? (
                  <p className="text-base font-bold text-red-600">Kurang {formatRupiah(Math.abs(kembalian))}</p>
                ) : (
                  <><p className="text-xs text-surface-500">Kembalian</p><p className="text-2xl font-bold text-brand-600">{formatRupiah(kembalian)}</p></>
                )}
              </div>
            )}

            {/* Bayar Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || nominalBayar < totalSetelahDiskon || isProcessing}
              className="w-full rounded-md bg-brand-600 py-3 text-sm font-bold text-white transition-all hover:bg-brand-700 disabled:bg-surface-300 disabled:text-surface-500"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses...
                </span>
              ) : (
                `Bayar ${formatRupiah(totalSetelahDiskon)}`
              )}
            </button>
          </div>

      {/* ── Success Modal ───────────────────────────────── */}
      {showReceipt && lastTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm animate-slide-up rounded-lg bg-white p-6 shadow-xl mx-4 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
<h2 className="mb-1 text-lg font-bold text-surface-900">
  Pembayaran Berhasil
</h2>
<p className="mb-1 text-sm text-surface-500">
  {lastTransaction.kodeTransaksi}
</p>
<p className="text-xs text-surface-400 mb-2">
  {lastTransaction.metodePembayaran} {lastTransaction.diskon > 0 ? `| Diskon ${formatRupiah(lastTransaction.diskon)}` : ""}
</p>
<p className="mb-4 text-2xl font-bold text-brand-600">
  {formatRupiah(lastTransaction.kembalian)}
</p>
            <div className="space-y-2">
              <button
                onClick={handlePrint}
                className="w-full rounded-md bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Cetak Struk
              </button>
              <button
                onClick={handleNewTransaction}
                className="w-full rounded-md border border-surface-300 py-2.5 text-sm font-medium text-surface-700 hover:bg-surface-50"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper: Render receipt HTML untuk print ────────────────
function renderReceiptHTML(data: {
  namaToko: string;
  alamat: string;
  telepon: string;
  kodeTransaksi: string;
  metodePembayaran?: string;
  diskon?: number;
  items: Array<{ nama: string; qty: number; hargaJual: number; subtotal: number }>;
  totalBelanja: number;
  nominalBayar: number;
  kembalian: number;
  footerStruk: string;
  tanggal: string;
}): string {
  const itemRows = data.items
    .map(
      (item) =>
        `<div style="display:flex;justify-content:space-between;font-size:10px;line-height:1.5">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.nama}</span>
          <span style="width:25px;text-align:center">${item.qty}</span>
          <span style="width:55px;text-align:right">${formatRupiah(item.hargaJual)}</span>
          <span style="width:55px;text-align:right">${formatRupiah(item.subtotal)}</span>
        </div>`
    )
    .join("");

  return `
    <div style="padding:4mm 2mm;font-family:'Courier New',monospace;font-size:10px;color:#000;background:#fff">
      <div style="text-align:center;font-size:14px;font-weight:bold;margin-bottom:4px;text-transform:uppercase">${data.namaToko}</div>
      ${data.alamat ? `<div style="text-align:center;font-size:9px;margin-bottom:2px">${data.alamat}</div>` : ""}
      ${data.telepon ? `<div style="text-align:center;font-size:9px;margin-bottom:2px">Telp: ${data.telepon}</div>` : ""}
      <div style="border-top:1px dashed #000;margin:6px 0"></div>
      <div style="display:flex;justify-content:space-between;font-size:9px">
        <span>No: ${data.kodeTransaksi}</span>
        <span>${new Date(data.tanggal).toLocaleDateString("id-ID")}</span>
      </div>
      <div style="border-top:1px dashed #000;margin:6px 0"></div>
      <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:bold">
        <span style="flex:1">Nama</span>
        <span style="width:25px;text-align:center">Qty</span>
        <span style="width:55px;text-align:right">Harga</span>
        <span style="width:55px;text-align:right">Total</span>
      </div>
      <div style="border-top:1px dashed #000;margin:2px 0"></div>
      ${itemRows}
      <div style="border-top:1px dashed #000;margin:6px 0"></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:bold;margin:2px 0">
        <span>Total Belanja</span>
        <span>${formatRupiah(data.totalBelanja)}</span>
      </div>
      ${data.diskon ? `<div style="display:flex;justify-content:space-between;font-size:10px;margin:2px 0;color:#888"><span>Diskon</span><span>-${formatRupiah(data.diskon)}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;font-size:10px;margin:2px 0">
        <span>${data.metodePembayaran || "Tunai"}</span>
        <span>${formatRupiah(data.nominalBayar)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:bold;margin:4px 0">
        <span>Kembali</span>
        <span>${formatRupiah(data.kembalian)}</span>
      </div>
      <div style="border-top:1px dashed #000;margin:6px 0"></div>
      <div style="text-align:center;font-size:9px;margin-top:8px">
        ${data.footerStruk.replace(/\n/g, "<br/>")}
        <div style="margin-top:6px;font-size:8px">${new Date(data.tanggal).toLocaleString("id-ID")}</div>
        <div style="margin-top:2px;font-size:8px">Terima Kasih</div>
      </div>
    </div>
  `;
}
