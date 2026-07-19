# ADNTmarket — Session Memories

## Project Overview
Platform POS Kasir Digital Multi-Tenant untuk UMKM Indonesia.
- Next.js 14 + React 18 + Tailwind CSS 3.4
- TypeScript strict mode
- Custom brand (blue) & surface (slate) color system
- Dark mode support via class

---

## Session: Redesign Landing Page & Login Page

### Date: 19 Juli 2026

### Objective
Redesign landing page dan buat halaman login terpisah yang lebih modern, menarik, dengan UX yang mudah digunakan.

### Changes Made

#### 1. Halaman Login Baru (`/masuk`)
- **File**: `src/app/masuk/page.tsx` (created)
- **Design**: Split layout — kiri brand panel dengan gradient gelap, kanan form login
- **Fitur**:
  - Toggle mode: "Akses Toko" (slug-based) vs "Admin" (email/password)
  - Show/hide password toggle
  - Auto-redirect jika sudah login (token check)
  - Benefits badges (Kasir Cepat, Laporan Real-time, etc.)
  - Testimonial section dengan avatar
  - Decorative background blobs & grid pattern
  - Mobile responsive (brand panel hidden on mobile)
  - Loading spinner animation
  - Icon support (lucide-react)

#### 2. Landing Page Redesign (`/`)
- **File**: `src/app/page.tsx` (major rewrite)
- **Design**: Lebih premium dengan:
  - Hero: Animated gradient background + floating decorative blobs
  - Grid pattern overlay subtle
  - Better typography hierarchy
  - Staggered entrance animations (CSS)
  - Fitur cards: gradient icon backgrounds, better hover effects
  - CTA section: replaced embedded login with dual-card CTA (Masuk / Daftar)
  - Footer: proper footer with links, social proof, copyright
  - Dark mode awareness on new elements
  - Navbar: scroll shadow, better mobile menu
  - Stats bar with icons

#### 3. Global CSS Updates
- **File**: `src/app/globals.css` (updated)
- Added floating animation keyframe
- Added gradient-text utility
- Added stagger animation delays (`animate-delay-*`)
- Enhanced scrollbar styling

### Design Decisions
- **Color**: Tetap pakai brand blue yang sudah ada, tapi dengan gradient lebih rich
- **Typography**: Inter via Google Fonts (existing), Plus Jakarta Sans via tailwind config
- **Animasi**: Pure CSS untuk performance (no Framer Motion)
- **Layout**: Asymmetric hero layout dengan floating elements
- **Separate login page**: Better UX — landing untuk marketing, `/masuk` untuk login

### Bug Fixes
- [placeholder for bugs found]

### Deployment
- Platform: Netlify
- Build command: `next build`
- Publish directory: `.next`

### Notes
- Landing page login form dihapus, diganti CTA ke `/masuk`
- Navbar "Masuk" button → link ke `/masuk`
- Daftar page link "Login di sini" → link ke `/masuk`
- Pastikan semua link konsisten setelah deploy

---

## Session 2: Role Hierarchy & Payment Gateway (Sayabayar)

### Date: 19 Juli 2026

### Objective
1. Implement role-based access: SUPER_ADMIN > TENANT_ADMIN > KASIR
2. Ganti Midtrans payment dengan Sayabayar.com untuk subscription
3. Subscription: monthly, 6-month, yearly plans

### Changes Made — Role Hierarchy

#### 1. Shared Auth Utility (src/lib/auth-utils.ts)
- **File**: `src/lib/auth-utils.ts` (created)
- Fungsi: `getAuthUser(request, allowedRoles?)` → verifikasi token + role validation
- Role type: SUPER_ADMIN | TENANT_ADMIN | KASIR
- Helper: `isSuperAdmin()`, `isTenantAdmin()`, `isKasir()`, `getRoleLabel()`

#### 2. Users API — TENANT_ADMIN Support
- **GET /api/users**: TENANT_ADMIN hanya lihat user di tenant-nya sendiri
- **POST /api/users**: TENANT_ADMIN hanya bisa create KASIR di tenant-nya
- **PATCH /api/users/:id**: TENANT_ADMIN hanya bisa edit KASIR dalam tenant-nya
- **DELETE /api/users/:id**: TENANT_ADMIN hanya bisa delete KASIR dalam tenant-nya

#### 3. Admin Page — Multi-Role
- **SUPER_ADMIN**: full access (Dashboard, Toko, Pengguna tabs)
- **TENANT_ADMIN**: restricted — hanya tab Pengguna, terfilter tenant-nya, hanya create KASIR
- **KASIR**: ditolak akses, redirect ke homepage
- Badge role di navbar menampilkan "Super Admin" atau "Admin Toko"
- Role selector di create user modal disembunyikan untuk TENANT_ADMIN

### Perubahan — Sayabayar Payment Gateway

#### 4. Sayabayar Library (src/lib/sayabayar.ts)
- **File**: `src/lib/sayabayar.ts` (created)
- Base URL: `https://api.sayabayar.com/v1`
- Auth header: `X-API-Key`
- Functions: `createInvoice()`, `getInvoice()`, `listInvoices()`, `getBalance()`
- `generateOrderId()`: format ADNT-XXXX untuk order ID
- `parseWebhookPayload()`: parse notifikasi dari Sayabayar
- `mapPaymentStatus()`: mapping Status Sayabayar → status Payment model

#### 5. Prisma Schema — Payment Model
- **File**: `prisma/schema.prisma` (updated)
- Added: `sayabayarInvoiceId` (String?, @unique)
- Added: `sayabayarPaymentUrl` (String?)
- Existing: `snapToken` retained for legacy Midtrans payments

#### 6. Register API — Sayabayar Integration
- **File**: `src/app/api/register/route.ts` (updated)
- Replace Midtrans Snap dengan Sayabayar invoice
- Flow: input → create tenant+user+payment DB → createInvoice Sayabayar → save invoice URL
- Error handling: jika gagal generate invoice, tetap return order_id untuk retry later

#### 7. Payment Notification Webhook
- **File**: `src/app/api/payment/notification/route.ts` (updated)
- Menerima POST dari Sayabayar saat status invoice berubah
- Cari payment via sayabayarInvoiceId → update status → activate tenant if SETTLED
- Juga support GET untuk verifikasi endpoint
- Logging untuk debugging

#### 8. Halaman Daftar — Midtrans → Sayabayar
- **File**: `src/app/daftar/page.tsx` (updated)
- Hapus Midtrans Snap.js loading script
- Hapus state snapToken & snap.pay effect
- Setelah registrasi, redirect ke `paymentUrl` dari Sayabayar
- Fallback: jika paymentUrl null, redirect ke success page manual

#### 9. Halaman Sukses — Improved UX
- **File**: `src/app/daftar/sukses/page.tsx` (updated)
- Polling status setiap 3 detik
- Auto-redirect ke kasir jika status SETTLED
- Better visual: ikon lucide-react, gradient backgrounds
- 3 states: success, pending, manual

#### 10. Environment Variables
- **File**: `.env` (updated — API key di Netlify env vars)
- Added: `SAYABAYAR_API_KEY` — set di Netlify environment variables

### Webhook Setup
Sayabayar dashboard:
- Endpoint: `https://adntmarket.netlify.app/api/payment/notification`
- Method: POST
- Payload: invoice data (id, status, amount, paid_at)

### Database Issue
Build dan runtime error: `FATAL: (ENOTFOUND) tenant/user postgres.joczqoseoabmeqoeeqji not found`
- Masalah: Supabase PostgreSQL credentials tidak valid atau project sudah tidak ada
- Database URL: `postgresql://postgres.joczqoseoabmeqoeeqji:AdntMarket2026!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`
- Solusi: cek dashboard Supabase, pastikan project `joczqoseoabmeqoeeqji` masih aktif & password benar

### Subscription Plans (Database seed needed)
Plans yang perlu di-seed di subscription_plans:
1. 1 Bulan — Rp 50.000 (30 hari)
2. 6 Bulan — Rp 250.000 (180 hari)
3. 1 Tahun — Rp 400.000 (365 hari)

### Next Actions
1. Fix Supabase database connection
2. Seed subscription plan data
3. Test end-to-end registration + payment flow
