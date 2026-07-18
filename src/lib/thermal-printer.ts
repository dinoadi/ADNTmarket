/**
 * Thermal Printer Service via WebUSB (ESC/POS)
 * Supported: USB thermal printers with ESC/POS protocol
 * Browser: Chrome, Edge (WebUSB API required)
 */

const ESC = 0x1b;
const GS = 0x1d;

export interface ReceiptData {
  namaToko: string;
  alamat?: string;
  telepon?: string;
  kodeTransaksi: string;
  metodePembayaran?: string;
  diskon?: number;
  items: Array<{ nama: string; qty: number; hargaJual: number; subtotal: number }>;
  totalBelanja: number;
  nominalBayar: number;
  kembalian: number;
  footerStruk: string;
  tanggal: string;
}

export class ThermalPrinter {
  private device: USBDevice | null = null;
  private encoder = new TextEncoder();

  /**
   * Cek apakah WebUSB didukung di browser ini
   */
  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "usb" in navigator;
  }

  /**
   * Cek apakah printer sudah terhubung
   */
  isConnected(): boolean {
    return this.device !== null && this.device.opened;
  }

  /**
   * Connect ke thermal printer via WebUSB
   */
  async connect(): Promise<void> {
    if (!ThermalPrinter.isSupported()) {
      throw new Error("WebUSB tidak didukung di browser ini. Gunakan Chrome atau Edge.");
    }

    try {
      // Minta user memilih device USB
      this.device = await navigator.usb.requestDevice({
        filters: [
          // Filter untuk vendor ID printer thermal umum
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0fe6 }, // Bixolon
          { vendorId: 0x052b }, // Star Micronics
          { vendorId: 0x0416 }, // BOCA
          { vendorId: 0x0930 }, // Citizen
          { vendorId: 0x0482 }, // Kyocera
        ],
      });

      await this.device.open();
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }

      // Claim interface pertama (biasanya interface 0 untuk printer)
      await this.device.claimInterface(0);
    } catch (error) {
      this.device = null;
      const message = error instanceof Error ? error.message : "Gagal konek ke printer";
      throw new Error(message);
    }
  }

  /**
   * Disconnect printer
   */
  async disconnect(): Promise<void> {
    try {
      if (this.device?.opened) {
        await this.device.close();
      }
    } catch { /* ignore */ }
    this.device = null;
  }

  /**
   * Kirim raw data ke printer via USB endpoint
   */
  private async write(data: Uint8Array): Promise<void> {
    if (!this.device || !this.device.opened) {
      throw new Error("Printer tidak terhubung");
    }

    // Cari OUT endpoint (arah host -> device)
    const iface = this.device.configuration?.interfaces[0];
    if (!iface) throw new Error("Interface printer tidak ditemukan");

    const endpoint = iface.alternate.endpoints.find(
      (ep) => ep.direction === "out" && ep.type === "bulk"
    );
    if (!endpoint) throw new Error("Endpoint OUT tidak ditemukan");

    const endpointNumber = endpoint.endpointNumber;

    // Kirim data dalam chunk 64 bytes (USB packet size)
    const chunkSize = 64;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.device.transferOut(endpointNumber, chunk);
    }
  }

  /**
   * Initialize printer
   */
  private async init(): Promise<void> {
    const data = new Uint8Array([
      ESC, 0x40, // Initialize printer
      ESC, 0x61, 0x01, // Align center
    ]);
    await this.write(data);
  }

  /**
   * Print teks
   */
  private async printText(text: string): Promise<void> {
    await this.write(this.encoder.encode(text));
  }

  /**
   * Print teks dengan line feed
   */
  private async println(text: string): Promise<void> {
    await this.printText(text + "\n");
  }

  /**
   * Set bold mode
   */
  private async setBold(on: boolean): Promise<void> {
    await this.write(new Uint8Array([ESC, 0x45, on ? 0x01 : 0x00]));
  }

  /**
   * Set alignment: 0=left, 1=center, 2=right
   */
  private async setAlign(align: 0 | 1 | 2): Promise<void> {
    await this.write(new Uint8Array([ESC, 0x61, align]));
  }

  /**
   * Set font size (1-8)
   */
  private async setFontSize(width: number, height: number): Promise<void> {
    await this.write(new Uint8Array([GS, 0x21, ((height - 1) << 4) | (width - 1)]));
  }

  /**
   * Line feed beberapa baris
   */
  private async feed(lines: number): Promise<void> {
    for (let i = 0; i < lines; i++) {
      await this.write(new Uint8Array([0x0a]));
    }
  }

  /**
   * Potong kertas
   */
  private async cutPaper(): Promise<void> {
    await this.write(new Uint8Array([GS, 0x56, 0x00]));
  }

  /**
   * Print receipt lengkap
   */
  async printReceipt(data: ReceiptData): Promise<void> {
    if (!this.isConnected()) {
      throw new Error("Printer tidak terhubung. Silakan connect printer terlebih dahulu.");
    }

    await this.init();

    // ── Header ──
    await this.setBold(true);
    await this.setFontSize(2, 2);
    await this.println(data.namaToko);
    await this.setFontSize(1, 1);
    await this.setBold(false);

    if (data.alamat) {
      await this.setAlign(1);
      await this.println(data.alamat);
    }
    if (data.telepon) {
      await this.setAlign(1);
      await this.println(`Telp: ${data.telepon}`);
    }

    // Separator
    await this.println("".padEnd(32, "-"));
    await this.setAlign(0);

    // Info transaksi
    await this.setAlign(0);
    await this.setBold(false);
    await this.println(`No: ${data.kodeTransaksi}`);
    await this.println(new Date(data.tanggal).toLocaleDateString("id-ID"));

    // Separator
    await this.println("".padEnd(32, "-"));

    // Header kolom
    await this.setBold(true);
    await this.println("Nama            Qty  Harga  Total");
    await this.setBold(false);
    await this.println("".padEnd(32, "-"));

    // Items
    for (const item of data.items) {
      const nama = item.nama.padEnd(16).slice(0, 16);
      const qty = item.qty.toString().padStart(3);
      const harga = this.formatRupiahMin(item.hargaJual).padStart(6);
      const total = this.formatRupiahMin(item.subtotal).padStart(6);
      await this.println(`${nama} ${qty} ${harga} ${total}`);
    }

    // Separator
    await this.println("".padEnd(32, "-"));

    // Total
    await this.setAlign(1);
    await this.setBold(true);
    await this.println(`Total: ${this.formatRupiah(data.totalBelanja)}`);
    await this.setBold(false);

    if (data.diskon && data.diskon > 0) {
      await this.println(`Diskon: -${this.formatRupiah(data.diskon)}`);
    }

    await this.println(`${data.metodePembayaran || "Tunai"}: ${this.formatRupiah(data.nominalBayar)}`);
    await this.setBold(true);
    await this.println(`Kembali: ${this.formatRupiah(data.kembalian)}`);
    await this.setBold(false);

    // Footer
    await this.println("".padEnd(32, "-"));
    await this.setAlign(1);
    await this.println(data.footerStruk);
    await this.println(new Date(data.tanggal).toLocaleString("id-ID"));
    await this.println("Terima Kasih");

    // Feed + Cut
    await this.feed(3);
    await this.cutPaper();
  }

  private formatRupiah(n: number): string {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(n);
  }

  private formatRupiahMin(n: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  }
}

// Singleton instance
let printerInstance: ThermalPrinter | null = null;

export function getPrinter(): ThermalPrinter {
  if (!printerInstance) {
    printerInstance = new ThermalPrinter();
  }
  return printerInstance;
}
