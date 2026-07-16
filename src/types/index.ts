// ============================================================
// ADNTmarket.app — Tipe Data Global
// ============================================================

/** Response wrapper API */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Auth ───────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  nama: string;
  role: UserRole;
  tenantId: string | null;
  tenantSlug?: string;
}

export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "KASIR";

// ─── Tenant ─────────────────────────────────────────────────

export type TenantStatus = "AKTIF" | "SUSPENDED" | "NONAKTIF";

export interface TenantData {
  id: string;
  slug: string;
  namaToko: string;
  alamat: string | null;
  telepon: string | null;
  statusAktif: boolean;
  status: TenantStatus;
  tanggalMulai: string;
  tanggalKedaluwarsa: string | null;
  logoUrl: string | null;
  createdAt: string;
}

// ─── Product ────────────────────────────────────────────────

export type KategoriProduk =
  | "MAKANAN"
  | "MINUMAN"
  | "SEMBAKO"
  | "SNACK"
  | "MINYAK"
  | "BERAS"
  | "GULA"
  | "TELUR"
  | "SUSU"
  | "ROKOK"
  | "OBAT"
  | "ALAT_TULIS"
  | "KEBERSIHAN"
  | "LAINNYA";

export interface ProductData {
  id: string;
  tenantId: string;
  nama: string;
  barcode: string | null;
  kategori: KategoriProduk;
  hargaJual: number;
  hargaModal: number;
  stok: number;
  satuan: string;
  isActive: boolean;
  gambarUrl: string | null;
}

export interface CreateProductInput {
  nama: string;
  barcode?: string;
  kategori: KategoriProduk;
  hargaJual: number;
  hargaModal: number;
  stok: number;
  satuan?: string;
}

// ─── Customer ───────────────────────────────────────────────

export interface CustomerData {
  id: string;
  tenantId: string;
  nama: string;
  telepon: string | null;
  alamat: string | null;
  poin: number;
  createdAt: string;
}

// ─── Transaction ────────────────────────────────────────────

export type MetodePembayaran =
  | "TUNAI"
  | "QRIS"
  | "TRANSFER"
  | "DEBIT"
  | "LAINNYA";

export interface TransactionData {
  id: string;
  tenantId: string;
  customerId: string | null;
  kodeTransaksi: string;
  totalBelanja: number;
  totalModal: number;
  labaKotor: number;
  nominalBayar: number;
  kembalian: number;
  metodePembayaran: MetodePembayaran;
  status: boolean;
  createdAt: string;
  details?: TransactionDetailData[];
}

export interface TransactionDetailData {
  id: string;
  transactionId: string;
  productId: string;
  namaProduk: string;
  hargaJual: number;
  hargaModal: number;
  qty: number;
  subtotal: number;
  subtotalModal: number;
}

export interface CheckoutRequest {
  items: Array<{ productId: string; qty: number }>;
  nominalBayar: number;
  metodePembayaran: MetodePembayaran;
  customerId?: string;
}

// ─── Settings ───────────────────────────────────────────────

export interface SettingData {
  id: string;
  tenantId: string;
  footerStruk: string | null;
  headerStruk: string | null;
  pajakPersen: number | null;
  cetakStrukOtomatis: boolean;
}

// ─── Stats ──────────────────────────────────────────────────

export interface StatsData {
  totalOmzet: number;
  totalModal: number;
  totalLaba: number;
  totalTransaksi: number;
  periode: { start: string; end: string };
}

// ─── Checkout Item (Cart) ──────────────────────────────────

export interface CartItem {
  productId: string;
  nama: string;
  hargaJual: number;
  qty: number;
  stok: number;
  subtotal: number;
}
