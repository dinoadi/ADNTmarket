"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { ReceiptContent } from "@/components/kasir/ReceiptContent";
import type { CartItem, KategoriProduk, ProductData, TransactionData } from "@/types";
import { getPrinter, ThermalPrinter } from "@/lib/thermal-printer";
import {
  Search, Package, Minus, Plus, X, Printer, LogOut, LayoutDashboard, ChevronDown, ShoppingCart, Check
} from "lucide-react";

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
const KATEGORI_COLORS: Record<string, string> = {
  MAKANAN: "bg-orange-500",
  MINUMAN: "bg-sky-500",
  SEMBAKO: "bg-emerald-600",
  SNACK: "bg-amber-500",
  ROKOK: "bg-stone-600",
  MINYAK: "bg-yellow-600",
  BERAS: "bg-brand-600",
  GULA: "bg-violet-500",
  TELUR: "bg-rose-500",
  SUSU: "bg-cyan-500",
  KEBERSIHAN: "bg-teal-500",
  ALAT_TULIS: "bg-blue-500",
};

export default function CashierPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.toko_slug as string;
  const searchRef = useRef<HTMLInputElement>(null);

  const [token, setToken] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState({ namaToko: "", telepon: "", alamat: "" });
  const [products, setProducts] = useState<ProductData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("");
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<TransactionData | null>(null);
  const [nominalBayar, setNominalBayar] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [metodePembayaran, setMetodePembayaran] = useState("TUNAI");
  const [diskon, setDiskon] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; nama: string } | null>(null);
  const [customers, setCustomers] = useState<Array<{ id: string; nama: string }>>([]);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [footerStruk, setFooterStruk] = useState("Terima kasih telah berbelanja");
  const [cartSheetOpen, setCartSheetOpen] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("adnt_token");
    const storedUser = localStorage.getItem("adnt_user");
    if (!storedToken) { router.push(`/${slug}`); return; }
    setToken(storedToken);
    try {
      const user = JSON.parse(storedUser ?? "{}");
      if (user.tenantSlug !== slug) { router.push(`/${slug}`); return; }
      if (user.tenantNama) setTenantInfo((prev) => ({ ...prev, namaToko: user.tenantNama }));
    } catch { /* ignore */ }

    fetch(`/api/${slug}/settings`, {
      headers: { Authorization: `Bearer ${storedToken}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setFooterStruk(data.data.footerStruk ?? "Terima kasih telah berbelanja");
          setTenantInfo((prev) => ({ ...prev, telepon: data.data.telepon ?? "", alamat: data.data.alamat ?? "" }));
        }
      })
      .catch(() => {});

    setTimeout(() => searchRef.current?.focus(), 100);

    fetch(`/api/${slug}/customers?limit=200`, {
      headers: { Authorization: `Bearer ${storedToken}` }
    })
      .then((r) => r.json())
      .then((data) => { if (data.success) setCustomers(data.data); })
      .catch(() => {});
  }, [slug, router]);

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
      if (data.success) setProducts(data.data);
    } catch {
      toast.error("Gagal memuat produk");
    } finally {
      setProductsLoading(false);
    }
  }, [token, slug, searchQuery, selectedKategori]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const getCartQty = (productId: string) => {
    return cart.find((i) => i.productId === productId)?.qty || 0;
  };

  const addToCart = (product: ProductData) => {
    if (product.stok <= 0) { toast.error(`Stok ${product.nama} habis`); return; }
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.qty >= product.stok) { toast.error(`Stok ${product.nama} tidak mencukupi`); return prev; }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.hargaJual } : item
        );
      }
      return [...prev, { productId: product.id, nama: product.nama, hargaJual: product.hargaJual, qty: 1, stok: product.stok, subtotal: product.hargaJual }];
    });
    // Vibrate on mobile to confirm add
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;
        if (newQty > item.stok) { toast.error(`Stok ${item.nama} tidak mencukupi`); return item; }
        return { ...item, qty: newQty, subtotal: newQty * item.hargaJual };
      }).filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const totalBelanja = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalSetelahDiskon = totalBelanja - diskon;
  const kembalian = nominalBayar - totalSetelahDiskon;

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error("Keranjang belanja kosong"); return; }
    if (nominalBayar < totalSetelahDiskon) { toast.error("Nominal bayar kurang dari total setelah diskon"); return; }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/${slug}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.map((item) => ({ productId: item.productId, qty: item.qty })),
          nominalBayar, metodePembayaran, diskon, customerId: selectedCustomer?.id ?? null,
        }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error ?? "Transaksi gagal"); setIsProcessing(false); return; }
      toast.success("Pembayaran berhasil!");
      setLastTransaction(data.data);
      setShowReceipt(true);
      setCartSheetOpen(false);
      setCart([]);
      setNominalBayar(0);
      fetchProducts();
    } catch { toast.error("Terjadi kesalahan jaringan"); }
    finally { setIsProcessing(false); }
  };

  const handleConnectPrinter = async () => {
    if (!ThermalPrinter.isSupported()) { toast.error("WebUSB tidak didukung. Gunakan Chrome/Edge."); return; }
    try { const printer = getPrinter(); await printer.connect(); setPrinterConnected(true); toast.success("Printer thermal terhubung!"); }
    catch { toast.error("Gagal konek printer"); }
  };

  const handleDisconnectPrinter = async () => {
    try { const printer = getPrinter(); await printer.disconnect(); setPrinterConnected(false); toast.success("Printer terputus"); }
    catch { /* ignore */ }
  };

  const handlePrint = async () => {
    if (!lastTransaction) return;
    const receiptData = {
      namaToko: tenantInfo.namaToko || slug, alamat: tenantInfo.alamat, telepon: tenantInfo.telepon,
      kodeTransaksi: lastTransaction.kodeTransaksi, metodePembayaran: lastTransaction.metodePembayaran,
      diskon: lastTransaction.diskon,
      items: (lastTransaction.details ?? []).map((d) => ({ nama: d.namaProduk, qty: d.qty, hargaJual: d.hargaJual, subtotal: d.subtotal })),
      totalBelanja: lastTransaction.totalBelanja, nominalBayar: lastTransaction.nominalBayar,
      kembalian: lastTransaction.kembalian, footerStruk, tanggal: lastTransaction.createdAt,
    };
    if (printerConnected) {
      try { const printer = getPrinter(); await printer.printReceipt(receiptData); return; }
      catch { toast.error("Gagal cetak. Fallback ke browser print."); }
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Izinkan pop-up untuk mencetak struk"); return; }
    const receiptHtml = renderReceiptHTML(receiptData);
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handleNewTransaction = () => {
    setShowReceipt(false); setLastTransaction(null); setSearchQuery("");
    setNominalBayar(0); setDiskon(0); setSelectedCustomer(null); setMetodePembayaran("TUNAI");
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const addNominal = (amount: number) => {
    amount === 0 ? setNominalBayar(totalBelanja) : setNominalBayar((prev) => prev + amount);
  };

  return (
    <div className="flex h-screen flex-col bg-warm-50 dark:bg-surface-950">
      {/* ─── Top Bar ──────────────── */}
      <div className="no-print flex items-center justify-between border-b border-warm-200 bg-white/80 px-3 py-2 backdrop-blur-xl dark:border-surface-800 dark:bg-surface-950/80 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-serif font-bold text-white">
            A
          </div>
          <h1 className="font-serif text-sm font-bold text-surface-900 dark:text-warm-100 sm:text-base">
            {tenantInfo.namaToko || slug}
          </h1>
          <span className="hidden rounded bg-warm-100 px-2 py-0.5 text-[10px] font-medium text-surface-500 dark:bg-surface-800 dark:text-warm-400 sm:inline">Kasir</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => router.push(`/${slug}/dashboard`)}
            className="btn-secondary gap-1.5 px-2.5 py-1.5 text-xs font-medium sm:px-3">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button onClick={() => router.push(`/${slug}/produk`)}
            className="btn-secondary gap-1.5 px-2.5 py-1.5 text-xs font-medium sm:px-3">
            <Package className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Produk</span>
          </button>
          <div className="mx-1 h-5 w-px bg-warm-200 dark:bg-surface-700" />
          {ThermalPrinter.isSupported() && (
            <button onClick={printerConnected ? handleDisconnectPrinter : handleConnectPrinter}
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 ${
                printerConnected ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-surface-600 hover:bg-warm-100 dark:text-warm-400 dark:hover:bg-surface-800"
              }`}>
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{printerConnected ? "Printer" : "Printer"}</span>
            </button>
          )}
          <button onClick={() => { localStorage.removeItem("adnt_token"); localStorage.removeItem("adnt_user"); router.push(`/${slug}`); }}
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 sm:px-3">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>

      {/* ─── Main Content ─────────── */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* ═══ LEFT: Product Catalog ═══ */}
        <div className="flex w-full flex-col border-warm-200 dark:border-surface-800 lg:w-3/5 lg:border-r">
          {/* Search + Filter */}
          <div className="border-b border-warm-100 px-3 pb-3 pt-3 dark:border-surface-800 sm:px-4 sm:pb-4 sm:pt-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
              <input ref={searchRef} type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk (scan barcode)..."
                className="input pl-10 py-3 text-sm" />
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {KATEGORI_LIST.map((k) => (
                <button key={k.value} onClick={() => setSelectedKategori(k.value)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
                    selectedKategori === k.value
                      ? "bg-surface-900 text-white shadow-sm dark:bg-warm-100 dark:text-surface-900"
                      : "bg-white text-surface-600 hover:bg-warm-100 dark:bg-surface-800 dark:text-warm-400 dark:hover:bg-surface-700"
                  }`}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto px-3 pb-24 pt-3 sm:px-4 sm:pb-4 lg:pb-4">
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-32 animate-pulse rounded-xl bg-white dark:bg-surface-800" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-surface-400">{searchQuery ? "Produk tidak ditemukan" : "Belum ada produk"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => {
                  const stokHabis = product.stok <= 0;
                  const stokMenipis = product.stok > 0 && product.stok <= 5;
                  const katColor = KATEGORI_COLORS[product.kategori] || "bg-brand-500";
                  const inCartQty = getCartQty(product.id);
                  return (
                    <button key={product.id} onClick={() => addToCart(product)} disabled={stokHabis}
                      className={`group relative rounded-xl border-2 p-3 text-left transition-all duration-150 active:scale-[0.97] ${
                        stokHabis
                          ? "border-warm-100 bg-warm-50 opacity-40 dark:border-surface-800 dark:bg-surface-900"
                          : inCartQty > 0
                            ? "border-emerald-300 bg-white ring-1 ring-emerald-200 hover:shadow-md dark:border-emerald-600 dark:bg-surface-800"
                            : "card border-warm-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md active:scale-[0.98] dark:border-surface-700 dark:bg-surface-800 dark:hover:border-emerald-600"
                      }`}>
                      {/* In-cart quantity badge */}
                      {inCartQty > 0 && (
                        <div className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm">
                          {inCartQty}
                        </div>
                      )}
                      <div className={`-mx-3 -mt-3 mb-2.5 rounded-t-xl px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white ${katColor}`}>
                        {product.kategori || "PRODUK"}
                      </div>
                      <p className="min-h-[2.4rem] text-sm font-semibold leading-snug text-surface-800 line-clamp-2 dark:text-warm-200">
                        {product.nama}
                      </p>
                      <p className="mt-2 font-serif text-base font-bold text-emerald-600">
                        {formatRupiah(product.hargaJual)}
                      </p>
                      <p className={`mt-1 text-[11px] ${
                        stokHabis ? "font-medium text-red-500" : stokMenipis ? "font-medium text-amber-600" : "text-surface-400 dark:text-surface-500"
                      }`}>
                        {stokHabis ? "Stok Habis" : stokMenipis ? `Sisa ${product.stok} ${product.satuan}` : `${product.stok} ${product.satuan}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT: Cart Panel (Desktop only) ═══ */}
        <div className="hidden w-full flex-col border-t bg-white dark:bg-surface-900 lg:flex lg:w-2/5 lg:border-t-0">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-warm-100 px-4 py-3 dark:border-surface-800">
            <h2 className="font-serif text-base font-bold text-surface-900 dark:text-warm-100">
              Keranjang
              {totalItems > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </h2>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-surface-400 dark:text-surface-500">Belum ada item</p>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                {cart.map((item) => (
                  <div key={item.productId} className="rounded-xl border border-warm-100 bg-warm-50/50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex-1 text-sm font-medium leading-snug text-surface-800 dark:text-warm-200">{item.nama}</p>
                      <button onClick={() => removeFromCart(item.productId)}
                        className="shrink-0 rounded-lg p-1 text-surface-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(item.productId, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-warm-200 text-surface-600 transition-colors hover:bg-warm-100 dark:border-surface-600 dark:text-warm-300 dark:hover:bg-surface-700">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="flex h-7 w-8 items-center justify-center text-sm font-semibold text-surface-900 dark:text-warm-100">{item.qty}</span>
                        <button onClick={() => updateQty(item.productId, 1)} disabled={item.qty >= item.stok}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-warm-200 text-surface-600 transition-colors hover:bg-warm-100 disabled:opacity-50 dark:border-surface-600 dark:text-warm-300 dark:hover:bg-surface-700">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-surface-900 dark:text-warm-100">
                        {formatRupiah(item.subtotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Payment Panel */}
          <div className="space-y-3 border-t border-warm-100 p-4 dark:border-surface-800">
            <select value={selectedCustomer?.id ?? ""}
              onChange={(e) => { const c = customers.find((c) => c.id === e.target.value); setSelectedCustomer(c ?? null); }}
              className="input py-2.5 text-sm">
              <option value="">Tanpa Pelanggan</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.nama}</option>))}
            </select>

            <div className="flex gap-1.5 flex-wrap">
              {["TUNAI", "QRIS", "DEBIT", "TRANSFER"].map((m) => (
                <button key={m} onClick={() => setMetodePembayaran(m)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    metodePembayaran === m
                      ? "bg-surface-900 text-white shadow-sm dark:bg-warm-100 dark:text-surface-900"
                      : "border border-warm-200 bg-white text-surface-600 hover:bg-warm-50 dark:border-surface-600 dark:bg-surface-800 dark:text-warm-300 dark:hover:bg-surface-700"
                  }`}>{m}</button>
              ))}
            </div>

            <div className="rounded-xl bg-warm-50/80 p-3 dark:bg-surface-800/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-500 dark:text-warm-400">Total</span>
                <span className="font-serif text-lg font-bold text-surface-900 dark:text-warm-100">{formatRupiah(totalBelanja)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-surface-500 dark:text-warm-400">Diskon</span>
                <input type="number" value={diskon || ""}
                  onChange={(e) => setDiskon(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0" className="w-24 rounded-lg border border-warm-200 px-2.5 py-1.5 text-right text-xs font-medium outline-none focus:border-brand-400 dark:border-surface-600 dark:bg-surface-800 dark:text-warm-200" />
              </div>
              {diskon > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-sm">
                  <span className="text-red-500">Total setelah diskon</span>
                  <span className="font-bold text-red-500">{formatRupiah(totalSetelahDiskon)}</span>
                </div>
              )}
            </div>

            <div className="relative">
              <input type="number" value={nominalBayar || ""}
                onChange={(e) => setNominalBayar(Number(e.target.value) || 0)}
                placeholder="Nominal bayar..." className="input py-3 pr-24 text-lg font-bold" />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
                <button onClick={() => setNominalBayar(totalBelanja)}
                  className="rounded-lg bg-warm-100 px-2.5 py-1 text-[10px] font-semibold text-surface-600 hover:bg-warm-200 dark:bg-surface-700 dark:text-warm-300 dark:hover:bg-surface-600">Pas</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SHORTCUT_NOMINAL.map((nom) => (
                <button key={nom} onClick={() => addNominal(nom)}
                  className="rounded-lg border border-warm-200 px-2.5 py-1 text-[11px] font-medium text-surface-600 transition-colors hover:bg-warm-50 dark:border-surface-600 dark:text-warm-300 dark:hover:bg-surface-700">
                  +{formatRupiah(nom)}
                </button>
              ))}
            </div>

            {nominalBayar > 0 && (
              <div className="rounded-xl bg-warm-50/80 p-3 text-center dark:bg-surface-800/50">
                {kembalian < 0 ? (
                  <p className="text-base font-bold text-red-500">Kurang {formatRupiah(Math.abs(kembalian))}</p>
                ) : (
                  <>
                    <p className="text-[11px] text-surface-500 dark:text-warm-400">Kembalian</p>
                    <p className="font-serif text-2xl font-bold text-emerald-600">{formatRupiah(kembalian)}</p>
                  </>
                )}
              </div>
            )}

            <button onClick={handleCheckout}
              disabled={cart.length === 0 || nominalBayar < totalSetelahDiskon || isProcessing}
              className="btn-primary w-full justify-center gap-2 py-3">
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses...
                </span>
              ) : (
                <>Bayar {formatRupiah(totalSetelahDiskon)}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Mobile: Sticky Bottom Bar ═══ */}
      <div className="no-print fixed bottom-0 left-0 right-0 z-20 border-t border-warm-200 bg-white/95 backdrop-blur-xl lg:hidden dark:border-surface-800 dark:bg-surface-900/95">
        <button onClick={() => { if (cart.length > 0) setCartSheetOpen(true); }}
          className={`flex w-full items-center gap-3 px-4 py-3 transition-all active:scale-[0.99] ${
            cart.length === 0 ? "opacity-60" : ""
          }`}>
          <div className="relative">
            <ShoppingCart className="h-6 w-6 text-surface-600 dark:text-warm-300" />
            {totalItems > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white shadow-sm">
                {totalItems}
              </span>
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs text-surface-500 dark:text-warm-400">Keranjang</p>
            <p className="font-serif text-base font-bold text-surface-900 dark:text-warm-100">
              {totalItems > 0 ? formatRupiah(totalBelanja) : "Belanja"}
            </p>
          </div>
          {totalItems > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm active:bg-brand-700">
              Bayar
              <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            </div>
          )}
        </button>
      </div>

      {/* ═══ Mobile: Cart Bottom Sheet ═══ */}
      {cartSheetOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setCartSheetOpen(false)} />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 flex max-h-[90vh] animate-slide-up flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-surface-900">
            {/* Handle */}
            <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-warm-200 dark:bg-surface-700" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-warm-100 px-5 py-3 dark:border-surface-800">
              <h3 className="font-serif text-base font-bold text-surface-900 dark:text-warm-100">
                Keranjang
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              </h3>
              <button onClick={() => setCartSheetOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-warm-100 dark:hover:bg-surface-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {cart.length === 0 ? (
                <div className="flex h-24 items-center justify-center">
                  <p className="text-sm text-surface-400">Belum ada item</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cart.map((item) => (
                    <div key={item.productId}
                      className="flex items-center gap-3 rounded-xl border border-warm-100 bg-warm-50/50 p-3 dark:border-surface-700 dark:bg-surface-800/50">
                      {/* Item info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug text-surface-800 truncate dark:text-warm-200">
                          {item.nama}
                        </p>
                        <p className="mt-0.5 text-xs text-surface-400 dark:text-surface-500">
                          {formatRupiah(item.hargaJual)}/pc
                        </p>
                      </div>

                      {/* Qty controls - LARGE touch targets */}
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(item.productId, -1)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-warm-200 bg-white text-surface-600 transition-all active:scale-90 hover:bg-warm-100 dark:border-surface-600 dark:bg-surface-800 dark:text-warm-300 dark:hover:bg-surface-700">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="flex h-11 w-9 items-center justify-center text-base font-bold text-surface-900 dark:text-warm-100">
                          {item.qty}
                        </span>
                        <button onClick={() => updateQty(item.productId, 1)} disabled={item.qty >= item.stok}
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-warm-200 bg-white text-surface-600 transition-all active:scale-90 hover:bg-warm-100 disabled:opacity-40 dark:border-surface-600 dark:bg-surface-800 dark:text-warm-300 dark:hover:bg-surface-700">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Subtotal + Remove */}
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-sm font-bold text-surface-900 dark:text-warm-100">
                          {formatRupiah(item.subtotal)}
                        </p>
                        <button onClick={() => removeFromCart(item.productId)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="border-t border-warm-100 px-4 pb-6 pt-4 dark:border-surface-800">
              <div className="space-y-3">
                {/* Customer + Payment Method row */}
                <div className="flex items-center gap-2">
                  <select value={selectedCustomer?.id ?? ""}
                    onChange={(e) => { const c = customers.find((c) => c.id === e.target.value); setSelectedCustomer(c ?? null); }}
                    className="input flex-1 py-3 text-sm">
                    <option value="">Tanpa Pelanggan</option>
                    {customers.map((c) => (<option key={c.id} value={c.id}>{c.nama}</option>))}
                  </select>
                </div>

                {/* Payment Method - large pills */}
                <div className="flex gap-2">
                  {["TUNAI", "QRIS", "DEBIT", "TRANSFER"].map((m) => (
                    <button key={m} onClick={() => setMetodePembayaran(m)}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-95 ${
                        metodePembayaran === m
                          ? "bg-surface-900 text-white shadow-sm dark:bg-warm-100 dark:text-surface-900"
                          : "border-2 border-warm-200 bg-white text-surface-600 hover:bg-warm-50 dark:border-surface-600 dark:bg-surface-800 dark:text-warm-300 dark:hover:bg-surface-700"
                      }`}>{m}</button>
                  ))}
                </div>

                {/* Total + Diskon */}
                <div className="rounded-xl bg-warm-50/80 p-3.5 dark:bg-surface-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-surface-500 dark:text-warm-400">Total</span>
                    <span className="font-serif text-lg font-bold text-surface-900 dark:text-warm-100">{formatRupiah(totalBelanja)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-surface-500 dark:text-warm-400">Diskon</span>
                    <input type="number" value={diskon || ""}
                      onChange={(e) => setDiskon(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0" className="w-28 rounded-lg border border-warm-200 px-3 py-1.5 text-right text-sm font-medium outline-none focus:border-brand-400 dark:border-surface-600 dark:bg-surface-800 dark:text-warm-200" />
                  </div>
                  {diskon > 0 && (
                    <div className="mt-1.5 flex items-center justify-between text-sm">
                      <span className="text-red-500">Total setelah diskon</span>
                      <span className="font-bold text-red-500">{formatRupiah(totalSetelahDiskon)}</span>
                    </div>
                  )}
                </div>

                {/* Nominal Bayar */}
                <div className="relative">
                  <input type="number" value={nominalBayar || ""}
                    onChange={(e) => setNominalBayar(Number(e.target.value) || 0)}
                    placeholder="Nominal bayar..."
                    className="input py-3.5 pr-24 text-lg font-bold text-center"
                    inputMode="numeric" />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button onClick={() => setNominalBayar(totalBelanja)}
                      className="rounded-lg bg-warm-100 px-3 py-1.5 text-xs font-bold text-surface-600 active:scale-90 hover:bg-warm-200 dark:bg-surface-700 dark:text-warm-300 dark:hover:bg-surface-600">
                      Pas
                    </button>
                  </div>
                </div>

                {/* Quick Nominal Buttons */}
                <div className="flex gap-2">
                  {SHORTCUT_NOMINAL.map((nom) => (
                    <button key={nom} onClick={() => addNominal(nom)}
                      className="flex-1 rounded-xl border-2 border-warm-200 bg-white py-2.5 text-xs font-bold text-surface-600 transition-all active:scale-90 hover:bg-warm-50 dark:border-surface-600 dark:bg-surface-800 dark:text-warm-300 dark:hover:bg-surface-700">
                      +{formatRupiah(nom)}
                    </button>
                  ))}
                </div>

                {/* Kembalian */}
                {nominalBayar > 0 && (
                  <div className="rounded-xl bg-warm-50/80 p-3 text-center dark:bg-surface-800/50">
                    {kembalian < 0 ? (
                      <p className="text-base font-bold text-red-500">Kurang {formatRupiah(Math.abs(kembalian))}</p>
                    ) : (
                      <>
                        <p className="text-[11px] text-surface-500 dark:text-warm-400">Kembalian</p>
                        <p className="font-serif text-2xl font-bold text-emerald-600">{formatRupiah(kembalian)}</p>
                      </>
                    )}
                  </div>
                )}

                {/* Bayar Button - LARGE */}
                <button onClick={handleCheckout}
                  disabled={cart.length === 0 || nominalBayar < totalSetelahDiskon || isProcessing}
                  className="btn-primary w-full justify-center gap-2 py-4 text-base font-bold shadow-lg active:scale-[0.98]">
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memproses...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Check className="h-5 w-5" />
                      Bayar {formatRupiah(totalSetelahDiskon)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Success Receipt Modal ─── */}
      {showReceipt && lastTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowReceipt(false)} />
          <div className="relative w-full max-w-sm animate-slide-up rounded-2xl bg-white p-6 shadow-xl text-center dark:bg-surface-900">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="font-serif text-xl font-bold text-surface-900 dark:text-warm-100">Pembayaran Berhasil</h2>
            <p className="mt-1 text-sm text-surface-500">{lastTransaction.kodeTransaksi}</p>
            <p className="text-xs text-surface-400">
              {lastTransaction.metodePembayaran}{lastTransaction.diskon > 0 ? ` | Diskon ${formatRupiah(lastTransaction.diskon)}` : ""}
            </p>
            <p className="mt-3 font-serif text-2xl font-bold text-emerald-600">
              {formatRupiah(lastTransaction.kembalian)}
            </p>
            <div className="mt-5 space-y-2">
              <button onClick={handlePrint}
                className="btn-primary w-full justify-center gap-2 py-3">
                <Printer className="h-4 w-4" /> Cetak Struk
              </button>
              <button onClick={handleNewTransaction}
                className="btn-secondary w-full justify-center py-3">
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helper: Render receipt HTML ─── */
function renderReceiptHTML(data: {
  namaToko: string; alamat: string; telepon: string; kodeTransaksi: string;
  metodePembayaran?: string; diskon?: number;
  items: Array<{ nama: string; qty: number; hargaJual: number; subtotal: number }>;
  totalBelanja: number; nominalBayar: number; kembalian: number;
  footerStruk: string; tanggal: string;
}): string {
  const itemRows = data.items.map((item) =>
    `<div style="display:flex;justify-content:space-between;font-size:10px;line-height:1.5">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.nama}</span>
      <span style="width:25px;text-align:center">${item.qty}</span>
      <span style="width:55px;text-align:right">${formatRupiah(item.hargaJual)}</span>
      <span style="width:55px;text-align:right">${formatRupiah(item.subtotal)}</span>
    </div>`
  ).join("");

  return `<div style="padding:4mm 2mm;font-family:'Courier New',monospace;font-size:10px;color:#000;background:#fff">
    <div style="text-align:center;font-size:14px;font-weight:bold;margin-bottom:4px;text-transform:uppercase">${data.namaToko}</div>
    ${data.alamat ? `<div style="text-align:center;font-size:9px;margin-bottom:2px">${data.alamat}</div>` : ""}
    ${data.telepon ? `<div style="text-align:center;font-size:9px;margin-bottom:2px">Telp: ${data.telepon}</div>` : ""}
    <div style="border-top:1px dashed #000;margin:6px 0"></div>
    <div style="display:flex;justify-content:space-between;font-size:9px">
      <span>No: ${data.kodeTransaksi}</span><span>${new Date(data.tanggal).toLocaleDateString("id-ID")}</span>
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0"></div>
    <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:bold">
      <span style="flex:1">Nama</span><span style="width:25px;text-align:center">Qty</span>
      <span style="width:55px;text-align:right">Harga</span><span style="width:55px;text-align:right">Total</span>
    </div>
    <div style="border-top:1px dashed #000;margin:2px 0"></div>
    ${itemRows}
    <div style="border-top:1px dashed #000;margin:6px 0"></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:bold;margin:2px 0">
      <span>Total Belanja</span><span>${formatRupiah(data.totalBelanja)}</span>
    </div>
    ${data.diskon ? `<div style="display:flex;justify-content:space-between;font-size:10px;margin:2px 0;color:#888"><span>Diskon</span><span>-${formatRupiah(data.diskon)}</span></div>` : ""}
    <div style="display:flex;justify-content:space-between;font-size:10px;margin:2px 0">
      <span>${data.metodePembayaran || "Tunai"}</span><span>${formatRupiah(data.nominalBayar)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:bold;margin:4px 0">
      <span>Kembali</span><span>${formatRupiah(data.kembalian)}</span>
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0"></div>
    <div style="text-align:center;font-size:9px;margin-top:8px">
      ${data.footerStruk.replace(/\n/g, "<br/>")}
      <div style="margin-top:6px;font-size:8px">${new Date(data.tanggal).toLocaleString("id-ID")}</div>
      <div style="margin-top:2px;font-size:8px">Terima Kasih</div>
    </div>
  </div>`;
}
