import Midtrans from "midtrans-client";

const isProduction = process.env.NODE_ENV === "production" && process.env.MIDTRANS_IS_PRODUCTION === "true";

export const snap = new Midtrans.Snap({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});

export const coreApi = new Midtrans.CoreApi({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});

interface CreateSnapTokenParams {
  orderId: string;
  amount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  planName: string;
}

export async function createSnapToken({
  orderId,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  planName,
}: CreateSnapTokenParams) {
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    item_details: [
      {
        id: orderId,
        price: amount,
        quantity: 1,
        name: `Paket Sewa ${planName}`,
      },
    ],
    customer_details: {
      first_name: customerName || "Pembeli",
      email: customerEmail || "",
      phone: customerPhone || "",
    },
    credit_card: {
      secure: true,
    },
    expiry: {
      start_time: new Date().toISOString().replace(/[TZ]/g, " ").trim(),
      unit: "hour",
      duration: 24,
    },
  };

  const token = await snap.createTransactionToken(parameter);
  return token;
}

export function generateOrderId(): string {
  const date = new Date();
  const ts = date.getTime().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `REG-${ts}-${rand}`;
}

interface NotificationResult {
  orderId: string;
  transactionStatus: string;
  fraudStatus: string;
  paymentType: string;
  grossAmount: string;
  transactionTime: string;
  settlementTime?: string;
}

export function parseNotification(payload: Record<string, unknown>): NotificationResult {
  return {
    orderId: payload.order_id as string,
    transactionStatus: payload.transaction_status as string,
    fraudStatus: payload.fraud_status as string,
    paymentType: payload.payment_type as string,
    grossAmount: payload.gross_amount as string,
    transactionTime: payload.transaction_time as string,
    settlementTime: payload.settlement_time as string | undefined,
  };
}

export function getPaymentStatus(notification: NotificationResult): string {
  const { transactionStatus, fraudStatus } = notification;

  if (transactionStatus === "capture") {
    if (fraudStatus === "accept") return "SETTLED";
    if (fraudStatus === "challenge") return "PENDING";
    return "FAILED";
  }

  if (transactionStatus === "settlement") return "SETTLED";
  if (transactionStatus === "pending") return "PENDING";
  if (transactionStatus === "deny") return "FAILED";
  if (transactionStatus === "cancel") return "FAILED";
  if (transactionStatus === "expire") return "EXPIRED";
  if (transactionStatus === "refund") return "SETTLED";

  return "PENDING";
}
