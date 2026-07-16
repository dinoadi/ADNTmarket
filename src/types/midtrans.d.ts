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
