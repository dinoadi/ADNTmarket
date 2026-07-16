"use client";

import { formatRupiah, formatDate } from "@/lib/utils";

interface ReceiptItem {
  nama: string;
  qty: number;
  hargaJual: number;
  subtotal: number;
}

interface ReceiptData {
  namaToko: string;
  alamat: string;
  telepon: string;
  kodeTransaksi: string;
  items: ReceiptItem[];
  totalBelanja: number;
  nominalBayar: number;
  kembalian: number;
  footerStruk: string;
  tanggal: string;
}

interface ReceiptContentProps {
  data: ReceiptData;
}

export function ReceiptContent({ data }: ReceiptContentProps) {
  return (
    <div className="receipt-print-container">
      {/* Header */}
      <div className="receipt-header">{data.namaToko}</div>
      {data.alamat && (
        <div className="receipt-subheader">{data.alamat}</div>
      )}
      {data.telepon && (
        <div className="receipt-subheader">Telp: {data.telepon}</div>
      )}
      <div className="receipt-divider" />

      {/* Info Transaksi */}
      <div className="receipt-row" style={{ justifyContent: "space-between", display: "flex" }}>
        <span>No: {data.kodeTransaksi}</span>
        <span>{formatDate(data.tanggal, "short")}</span>
      </div>
      <div className="receipt-divider" />

      {/* Items Table */}
      <div style={{ width: "100%" }}>
        {/* Header Row */}
        <div className="receipt-row" style={{ fontWeight: "bold", display: "flex" }}>
          <span style={{ flex: 1 }}>Nama</span>
          <span style={{ width: "25px", textAlign: "center" }}>Qty</span>
          <span style={{ width: "55px", textAlign: "right" }}>Harga</span>
          <span style={{ width: "55px", textAlign: "right" }}>Total</span>
        </div>
        <div className="receipt-divider" style={{ margin: "2px 0" }} />

        {/* Items */}
        {data.items.map((item, i) => (
          <div key={i} className="receipt-row" style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.nama}
            </span>
            <span style={{ width: "25px", textAlign: "center" }}>{item.qty}</span>
            <span style={{ width: "55px", textAlign: "right" }}>{formatRupiah(item.hargaJual)}</span>
            <span style={{ width: "55px", textAlign: "right" }}>{formatRupiah(item.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="receipt-divider" />

      {/* Total */}
      <div className="receipt-total" style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
        <span>Total Belanja</span>
        <span>{formatRupiah(data.totalBelanja)}</span>
      </div>
      <div className="receipt-total" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Tunai</span>
        <span>{formatRupiah(data.nominalBayar)}</span>
      </div>
      <div className="receipt-total" style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "12px", marginTop: "4px" }}>
        <span>Kembali</span>
        <span>{formatRupiah(data.kembalian)}</span>
      </div>

      <div className="receipt-divider" />

      {/* Footer */}
      <div className="receipt-footer">
        {data.footerStruk &&
          data.footerStruk.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        <div style={{ marginTop: "6px", fontSize: "8px" }}>
          {formatDate(data.tanggal, "full")}
        </div>
        <div style={{ marginTop: "2px", fontSize: "8px" }}>Terima Kasih</div>
      </div>
    </div>
  );
}
