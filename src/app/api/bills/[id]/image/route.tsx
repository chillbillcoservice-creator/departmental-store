import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: billId } = await context.params;
        const { searchParams } = new URL(request.url);

        const storeName = searchParams.get('store') || 'CHILLBILL SUPERMART';
        const total = searchParams.get('total') || '0.00';
        const itemsCount = searchParams.get('items') || '1';
        const paymentMethod = searchParams.get('method') || 'UPI / ONLINE';
        const dateStr = searchParams.get('date') || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const currency = searchParams.get('currency') || 'Rs.';
        const customerName = searchParams.get('customer') || 'Valued Customer';
        const isB2B = searchParams.get('b2b') === 'true';

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#ffffff',
                        padding: '40px 48px',
                        fontFamily: 'sans-serif',
                        color: '#111827',
                        borderTop: '12px solid #059669',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            marginBottom: '20px',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 32,
                                fontWeight: 900,
                                letterSpacing: '-0.5px',
                                textTransform: 'uppercase',
                                color: '#111827',
                            }}
                        >
                            {storeName}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginTop: '10px',
                                backgroundColor: isB2B ? '#4338CA' : '#059669',
                                color: '#ffffff',
                                fontSize: 13,
                                fontWeight: 800,
                                padding: '6px 18px',
                                borderRadius: '9999px',
                                letterSpacing: '0.5px',
                            }}
                        >
                            {isB2B ? 'TAX INVOICE (B2B)' : 'OFFICIAL RETAIL RECEIPT'}
                        </div>
                    </div>

                    {/* Metadata Card */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            backgroundColor: '#F9FAFB',
                            borderRadius: '16px',
                            padding: '18px 24px',
                            border: '1px solid #E5E7EB',
                            marginBottom: '24px',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
                                Bill Number
                            </span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                                #{billId}
                            </span>
                            <span style={{ fontSize: 13, color: '#4B5563', marginTop: '4px' }}>
                                Billed to: <strong>{customerName}</strong>
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
                                Date & Time
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginTop: '4px' }}>
                                {dateStr}
                            </span>
                            <span style={{ fontSize: 13, color: '#6B7280', marginTop: '4px' }}>
                                {itemsCount} items purchased
                            </span>
                        </div>
                    </div>

                    {/* Total Highlight Box */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#ECFDF5',
                            border: '2px solid #A7F3D0',
                            borderRadius: '20px',
                            padding: '24px 32px',
                            marginBottom: '28px',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Total Amount Paid
                            </span>
                            <span style={{ fontSize: 14, color: '#047857', marginTop: '4px' }}>
                                Mode: <strong>{paymentMethod}</strong> • Verified
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 24, fontWeight: 800, color: '#065F46', marginRight: '6px' }}>
                                {currency}
                            </span>
                            <span style={{ fontSize: 44, fontWeight: 900, color: '#065F46', letterSpacing: '-1px' }}>
                                {total}
                            </span>
                        </div>
                    </div>

                    {/* Footer Strip */}
                    <div
                        style={{
                            display: 'flex',
                            marginTop: 'auto',
                            paddingTop: '20px',
                            borderTop: '2px dashed #E5E7EB',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    backgroundColor: '#DEF7EC',
                                    color: '#03543F',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: '4px 12px',
                                    borderRadius: '8px',
                                }}
                            >
                                ✓ PAYMENT CONFIRMED
                            </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>
                            Powered by ChillBill Supermarket POS
                        </div>
                    </div>
                </div>
            ),
            {
                width: 800,
                height: 520,
            }
        );
    } catch (e: any) {
        return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
    }
}
