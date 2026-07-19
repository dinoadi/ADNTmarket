import type { Metadata } from "next";
import { Playfair_Display, Sora } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ADNTmarket — POS Kasir untuk Toko Anda",
  description:
    "Platform POS Kasir Multi-Tenant untuk UMKM Indonesia. Catat transaksi, kelola stok, cetak struk thermal — semuanya dari browser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${playfair.variable} ${sora.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){try{var t=localStorage.getItem("adnt_theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-warm-50 font-sans text-surface-900 antialiased dark:bg-surface-950 dark:text-warm-100">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ duration: 3000 }}
        />
      </body>
    </html>
  );
}
