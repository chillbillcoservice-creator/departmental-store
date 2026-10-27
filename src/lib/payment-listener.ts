/**
 * Real-Time UPI Payment Listener Service
 * Supports BroadcastChannel, Window CustomEvents, and API status fallback.
 */

export interface PaymentEventPayload {
  transactionId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  utr?: string;
  payerVpa?: string;
  timestamp: number;
}

const BROADCAST_CHANNEL_NAME = 'upi-pos-payments';
const LOCAL_EVENT_NAME = 'upi-payment-event';
const AMOUNT_MATCH_EVENT_NAME = 'upi-counter-amount-event';

// Cache for simulated / server-verified payments in current session
const paymentStatusCache: Map<string, PaymentEventPayload> = new Map();

/**
 * Broadcasts a verified payment event to all listening POS tabs/windows and components.
 */
export function broadcastPaymentSuccess(payload: PaymentEventPayload) {
  paymentStatusCache.set(payload.transactionId, payload);

  // 1. Broadcast via Window CustomEvent (Immediate intra-window communication)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(LOCAL_EVENT_NAME, { detail: payload })
    );

    // 2. Broadcast via BroadcastChannel (Cross-tab/multi-display POS registers)
    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.postMessage(payload);
        channel.close();
      }
    } catch {
      // Fallback silently if BroadcastChannel is restricted
    }
  }
}

/**
 * Subscribes to payment events for a specific transaction ID.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToPayment(
  transactionId: string,
  onPaymentReceived: (payload: PaymentEventPayload) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // Check if already completed in cache
  const cached = paymentStatusCache.get(transactionId);
  if (cached && cached.status === 'SUCCESS') {
    setTimeout(() => onPaymentReceived(cached), 50);
  }

  // 1. Local window event listener
  const handleLocalEvent = (e: Event) => {
    const customEvent = e as CustomEvent<PaymentEventPayload>;
    if (customEvent.detail && customEvent.detail.transactionId === transactionId) {
      onPaymentReceived(customEvent.detail);
    }
  };
  window.addEventListener(LOCAL_EVENT_NAME, handleLocalEvent);

  // 2. BroadcastChannel listener (for multi-tab / customer-facing display)
  let channel: BroadcastChannel | null = null;
  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<PaymentEventPayload>) => {
        if (event.data && event.data.transactionId === transactionId) {
          onPaymentReceived(event.data);
        }
      };
    }
  } catch {
    channel = null;
  }

  // Cleanup handler
  return () => {
    window.removeEventListener(LOCAL_EVENT_NAME, handleLocalEvent);
    if (channel) {
      channel.close();
    }
  };
}

/**
 * Generates a realistic 12-digit Indian Bank UTR (Unique Transaction Reference).
 */
export function generateMockUtr(): string {
  const prefix = String(Math.floor(1000 + Math.random() * 9000));
  const middle = String(Math.floor(1000 + Math.random() * 9000));
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}${middle}${suffix}`;
}

/**
 * Simulates an instant customer scan & payment via PhonePe / GPay.
 * Used for live sandbox verification without spending real money.
 */
export function simulateCustomerPayment(
  transactionId: string,
  amount: number
): PaymentEventPayload {
  const payload: PaymentEventPayload = {
    transactionId,
    amount,
    status: 'SUCCESS',
    utr: generateMockUtr(),
    payerVpa: 'customer@okhdfcbank',
    timestamp: Date.now(),
  };

  broadcastPaymentSuccess(payload);
  return payload;
}

/**
 * Broadcasts an incoming merchant credit event for a specific amount.
 */
export function broadcastMerchantCredit(payload: { amount: number; utr: string; payerName?: string }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AMOUNT_MATCH_EVENT_NAME, { detail: payload })
    );

    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('upi-counter-amount-channel');
        channel.postMessage(payload);
        channel.close();
      }
    } catch {}
  }
}

/**
 * Subscribes to incoming merchant credits that match a specific bill amount (within +/- 0.05).
 */
export function subscribeToAmountMatch(
  expectedAmount: number,
  onMatched: (payload: { amount: number; utr: string; payerName?: string }) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleAmountEvent = (e: Event) => {
    const customEvent = e as CustomEvent<{ amount: number; utr: string; payerName?: string }>;
    if (customEvent.detail && Math.abs(customEvent.detail.amount - expectedAmount) < 0.05) {
      onMatched(customEvent.detail);
    }
  };

  window.addEventListener(AMOUNT_MATCH_EVENT_NAME, handleAmountEvent);

  let channel: BroadcastChannel | null = null;
  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('upi-counter-amount-channel');
      channel.onmessage = (event: MessageEvent<{ amount: number; utr: string; payerName?: string }>) => {
        if (event.data && Math.abs(event.data.amount - expectedAmount) < 0.05) {
          onMatched(event.data);
        }
      };
    }
  } catch {}

  return () => {
    window.removeEventListener(AMOUNT_MATCH_EVENT_NAME, handleAmountEvent);
    if (channel) channel.close();
  };
}

/**
 * Simulates a customer paying on the counter standee for a given amount.
 */
export function simulateCounterStandeePayment(amount: number, payerName = 'Customer') {
  const payload = {
    amount,
    utr: generateMockUtr(),
    payerName,
    timestamp: Date.now(),
  };
  broadcastMerchantCredit(payload);
  return payload;
}
