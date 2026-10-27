import { NextRequest, NextResponse } from 'next/server';

/**
 * Universal UPI Webhook Endpoint
 * Receives payment status updates from Payment Gateways (Razorpay, Paytm, Cashfree, Pine Labs)
 * or POS local relay servers.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Standardized fields
    const transactionId = body.transactionId || body.tr || body.orderId || body.order_id;
    const amount = Number(body.amount || body.order_amount || 0);
    const status = (body.status || body.event || '').toUpperCase().includes('SUCCESS') || body.status === 'PAID'
      ? 'SUCCESS'
      : 'FAILED';
    const utr = body.utr || body.bank_ref_no || body.payment_id || `UTR${Date.now()}`;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Missing transactionId / tr parameter' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment status recorded',
      data: {
        transactionId,
        amount,
        status,
        utr,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid webhook payload', details: String(error) },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ACTIVE',
    service: 'Departmental Store UPI Payment Webhook Listener',
    timestamp: new Date().toISOString(),
  });
}
