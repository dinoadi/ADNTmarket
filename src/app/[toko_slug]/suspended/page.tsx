"use client";

import { useParams } from "next/navigation";

export default function SuspendedPage() {
  const params = useParams();
  const slug = params.toko_slug as string;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-8 w-8 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        <h1 className="mb-2 text-xl font-bold text-surface-800">
          Masa Sewa Berakhir
        </h1>
        <p className="mb-2 text-sm text-surface-500">
          Toko <strong className="text-surface-700">{slug}</strong> saat ini
          tidak dapat diakses karena masa sewa telah berakhir.
        </p>
        <p className="mb-6 text-sm text-surface-500">
          Silakan hubungi administrator untuk memperpanjang masa sewa.
        </p>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Informasi Perpanjangan</p>
          <p className="mt-1 text-amber-600">
            Hubungi: admin@adntmarket.app
          </p>
        </div>
      </div>
    </div>
  );
}
