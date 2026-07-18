"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { ReceiptContent } from "@/components/kasir/ReceiptContent";
import type { CartItem, KategoriProduk, ProductData, TransactionData } from "@/types";
import { getPrinter, ThermalPrinter } from "@/lib/thermal-printer";

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
  // Thermal Printer
  const [printerConnected, setPrinterConnected] = useState(false);
  const [footerStruk, setFooterStruk] = useState("Terima kasih telah berbelanja");

  // --- Init ---
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

    // Fetch settings + tenant info
    fetch(`/api/${slug}/settings`, {
      headers: { Authorization: `Bearer ${storedToken}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setFooterStruk(data.data.footerStruk ?? "Terima kasih telah berbelanja");
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
    // Fetch customers
    fetch(`/api/${slug}/customers?limit=200`, {
      headers: { Authorization: `Bearer ${storedToken}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCustomers(data.data);
      })
      .catch(() => {});

  }, [slug, router]);


  // --- Fetch Products ---
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

  // --- Cart Logic ---
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
  // --- Checkout ---
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

      const data = await res.json();

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

  // --- Thermal Printer ---
  const handleConnectPrinter = async () => {
    if (!ThermalPrinter.isSupported()) {
      toast.error("WebUSB tidak didukung. Gunakan Chrome/Edge.");
      return;
    }
    try {
      const printer = getPrinter();
      await printer.connect();
      setPrinterConnected(true);
      toast.success("Printer thermal terhubung!");
    } catch {
      const msg = "Gagal konek printer";
      toast.error(msg);
    }
  };

  const handleDisconnectPrinter = async () => {
    try {
      const printer = getPrinter();
      await printer.disconnect();
      setPrinterConnected(false);
      toast.success("Printer terputus");
    } catch { /* ignore */ }
  };

  // --- Print Receipt ---
  const handlePrint = async () => {
    if (!lastTransaction) return;

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

    // Coba thermal printer dulu (jika terhubung)
    if (printerConnected) {
      try {
        const printer = getPrinter();
        await printer.printReceipt(receiptData);
        return;
      } catch {
        toast.error("Gagal cetak. Fallback ke browser print.");
      }
    }

    // Fallback: browser print dialog
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Izinkan pop-up untuk mencetak struk");
      return;
    }

    const receiptHtml = renderReceiptHTML(receiptData);
    printWindow.document.write(receiptHtml);
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

  // --- Shortcut Nominal ---
  const addNominal = (amount: number) => {
    if (amount === 0) {
      setNominalBayar(totalBelanja);
    } else {
      setNominalBayar((prev) => prev + amount);
    }
  };

  // --- Render ---
  return (
    <div className="flex h-screen flex-col">
      {/* --- Top Bar --- */}
      <div className="no-print flex items-center justify-between border-b border-surface-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-surface-900">
            {tenantInfo.namaToko || slug}
          </h1>
          <span className="text-xs text-surface-400">Kasir</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => router.push(`/${slug}/dashboard`)}
            className="hidden rounded-md px-2.5 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100 sm:block"
          >
            Dashboard
          </button>
          <button
            onClick={() => router.push(`/${slug}/produk`)}
            className="hidden rounded-md px-2.5 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100 sm:block"
          >
            Produk
          </button>
          <button
            onClick={() => router.push(`/${slug}/laporan`)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100"
          >
            Laporan
          </button>
          <button
            onClick={() => router.push(`/${slug}/pengaturan`)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100"
          >
            Pengaturan
          </button>
          <div className="h-5 w-px bg-surface-200" />
          {ThermalPrinter.isSupported() && (
            <button
              onClick={printerConnected ? handleDisconnectPrinter : handleConnectPrinter}
              className={"rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors " + (printerConnected ? "bg-green-100 text-green-700" : "text-surface-600 hover:bg-surface-100")}
            >
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                {printerConnected ? "Printer" : "Printer"}
              </span>
            </button>
          )}
          <button
            onClick={() => {
              localStorage.removeItem("adnt_token");
              localStorage.removeItem("adnt_user");
              router.push(`/${slug}`);
            }}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Keluar
          </button>
        </div>
      </div>

      {/* --- Split Screen --- */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* LEFT PANEL: Product Catalog */}
        <div className="no-print flex w-full flex-col border-r border-surface-200 lg:w-3/5">
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                          ? "Stok Habis"
                          : stokMenipis
                          ? "Sisa " + product.stok + " " + product.satuan
                          : `Stok: ${product.stok} ${product.satuan}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Cart + Payment */}
        <div className="no-print flex w-full flex-col border-t bg-white lg:w-2/5 lg:border-t-0">
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
                  {m}
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
        </div>
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
              {lastTransaction.metodePembayaran} {lastTransaction.diskon > 0 ? "| Diskon " + formatRupiah(lastTransaction.diskon) : ""}
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

      {/* --- Mobile Bottom Nav --- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-200 bg-white lg:hidden no-print">
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => router.push(`/${slug}/dashboard`)}
            className="flex flex-col items-center gap-0.5 px-2"
          >
            <svg className="h-5 w-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-[10px] font-medium text-surface-500">Dashboard</span>
          </button>
          <button
            onClick={() => router.push(`/${slug}/produk`)}
            className="flex flex-col items-center gap-0.5 px-2"
          >
            <svg className="h-5 w-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <span className="text-[10px] font-medium text-surface-500">Produk</span>
          </button>
          <button
            onClick={() => router.push(`/${slug}/laporan`)}
            className="flex flex-col items-center gap-0.5 px-2"
          >
            <svg className="h-5 w-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-medium text-surface-500">Laporan</span>
          </button>
          <button
            onClick={() => router.push(`/${slug}/pelanggan`)}
            className="flex flex-col items-center gap-0.5 px-2"
          >
            <svg className="h-5 w-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <span className="text-[10px] font-medium text-surface-500">Customer</span>
          </button>
          <button
            onClick={() => router.push(`/${slug}/pengaturan`)}
            className="flex flex-col items-center gap-0.5 px-2"
          >
            <svg className="h-5 w-5 text-surface-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-medium text-surface-500">Setting</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Helper: Render receipt HTML untuk print ---
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
