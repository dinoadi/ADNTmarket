declare module "midtrans-client" {
  class Snap {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey: string })
    createTransactionToken(parameter: Record<string, unknown>): Promise<string>
  }
  class CoreApi {
    constructor(options: { isProduction: boolean; serverKey: string; clientKey: string })
    transaction: {
      notification(body: string): Promise<Record<string, unknown>>
      status(orderId: string): Promise<Record<string, unknown>>
    }
  }
  const Midtrans: { Snap: typeof Snap; CoreApi: typeof CoreApi }
  export default Midtrans
}

// Midtrans Snap
interface Snap {
  pay: (token: string, options: {
    onSuccess?: (result: Record<string, unknown>) => void;
    onPending?: (result: Record<string, unknown>) => void;
    onError?: (result: Record<string, unknown>) => void;
    onClose?: () => void;
  }) => void;
}

interface Window {
  snap?: Snap;
}
