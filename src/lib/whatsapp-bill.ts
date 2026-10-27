import { Bill, VenueDetails } from './types';
import { format } from 'date-fns';

/**
 * Formats a clean, professional plain-text bill receipt for WhatsApp dispatch.
 * Conforms to Indian retail standard receipts with emojis and bold formatting.
 */
export function formatWhatsAppBillText(
  bill: Bill,
  venueDetails?: VenueDetails | null,
  currency = 'Rs.'
): string {
  const storeName = venueDetails?.name || 'SUPERMARKET & GROCERY';
  const address = venueDetails?.address ? `\n📍 ${venueDetails.address}` : '';
  const phone = venueDetails?.contactNumber ? `\n📞 Helpline: ${venueDetails.contactNumber}` : '';
  const gstin = venueDetails?.gstin ? `\n🏢 GSTIN: ${venueDetails.gstin}` : '';
  const fssai = venueDetails?.fssaiNumber ? `\n🥗 FSSAI: ${venueDetails.fssaiNumber}` : '';

  const dateStr = format(new Date(bill.timestamp), 'dd/MM/yyyy hh:mm a');
  const customerName =
    bill.customerDetails?.companyName || bill.customerDetails?.name || 'Valued Customer';
  const customerGstin = bill.customerDetails?.gstin
    ? `\nBuyer GSTIN: ${bill.customerDetails.gstin}`
    : '';

  const isB2B = Boolean(bill.customerDetails?.gstin);
  const invoiceType = isB2B ? 'TAX INVOICE (B2B)' : 'RETAIL INVOICE';

  const itemsList = bill.orderItems
    .map((item, idx) => {
      const hsn = item.hsnCode ? ` [HSN: ${item.hsnCode}]` : '';
      const lineTotal = (item.price * item.quantity).toFixed(2);
      return `${idx + 1}. *${item.name}*${hsn}\n   ${item.quantity} x ${currency}${item.price.toFixed(2)} = *${currency}${lineTotal}*`;
    })
    .join('\n');

  let paymentSummary = `Payment Mode: *${bill.paymentMethod}*`;
  if (bill.paymentMethod === 'Split' && bill.splitPayments) {
    paymentSummary = `Payment: *SPLIT TENDER*\n${bill.splitPayments
      .map((p) => `  • ${p.method}: ${currency}${p.amount.toFixed(2)}`)
      .join('\n')}`;
  }

  const message = `
🛍️ *${storeName.toUpperCase()}*${address}${phone}${gstin}${fssai}
━━━━━━━━━━━━━━━━━━━━
🧾 *${invoiceType}*
📌 *Bill No:* #${bill.id}
📅 *Date:* ${dateStr}
👤 *Billed To:* ${customerName}${customerGstin}
━━━━━━━━━━━━━━━━━━━━
*PURCHASED ITEMS:*
${itemsList}
━━━━━━━━━━━━━━━━━━━━
Subtotal: ${currency}${bill.subtotal.toFixed(2)}
${bill.discount > 0 ? `Discount: -${currency}${bill.discount.toFixed(2)}\n` : ''}${bill.vatAmount > 0 ? `GST Total: ${currency}${bill.vatAmount.toFixed(2)}\n` : ''}💰 *GRAND TOTAL: ${currency}${bill.total.toFixed(2)}*
${paymentSummary}
━━━━━━━━━━━━━━━━━━━━
${venueDetails?.receiptFooter || 'THANK YOU FOR SHOPPING WITH US! VISIT AGAIN.'}
`.trim();

  return message;
}

/**
 * Opens WhatsApp Web (PC) or WhatsApp App (Mobile/Tablet) with the formatted bill.
 * If customer's phone number is missing, opens WhatsApp with the bill text ready to select any contact.
 */
export function sendWhatsAppBill(
  bill: Bill,
  venueDetails?: VenueDetails | null,
  targetPhone?: string,
  currency = 'Rs.'
): void {
  const rawPhone = (targetPhone || bill.customerDetails?.phone || '').replace(/[^0-9]/g, '');
  
  // Standardize 10-digit Indian numbers with 91 country code prefix
  let cleanPhone = rawPhone;
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const message = formatWhatsAppBillText(bill, venueDetails, currency);
  const encoded = encodeURIComponent(message);

  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank');
}
