import { Bill, VenueDetails, PurchaseOrder, Vendor, Customer } from './types';
import { format } from 'date-fns';

/**
 * Standardizes an Indian or international phone number for WhatsApp deep-linking.
 * Ensures 10-digit Indian numbers are prefixed with '91'.
 */
export function sanitizeWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/* ═══════════════════════════════════════════════════════
   1. CUSTOMER WHATSAPP BILL DISPATCH
   ═══════════════════════════════════════════════════════ */

/**
 * Formats a clean, professional plain-text bill receipt for WhatsApp dispatch.
 * Conforms to Indian retail standard receipts with emojis and bold formatting.
 */
export function formatWhatsAppBillText(
  bill: Bill,
  venueDetails?: VenueDetails | null,
  currency = 'Rs.'
): string {
  const storeName = venueDetails?.name || 'CHILLBILL STORE';
  const address = venueDetails?.address ? `\n📍 ${venueDetails.address}` : '';
  const phone = venueDetails?.contactNumber ? `\n📞 Helpline: ${venueDetails.contactNumber}` : '';
  const gstin = venueDetails?.gstin ? `\n🏢 GSTIN: ${venueDetails.gstin}` : '';
  const fssai = venueDetails?.fssaiNumber ? `\n🥗 FSSAI: ${venueDetails.fssaiNumber}` : '';

  let dateStr = '';
  try {
    dateStr = format(new Date(bill.timestamp), 'dd/MM/yyyy hh:mm a');
  } catch (e) {
    dateStr = new Date().toLocaleString('en-IN');
  }

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
  const cleanPhone = sanitizeWhatsAppPhone(targetPhone || bill.customerDetails?.phone);
  const message = formatWhatsAppBillText(bill, venueDetails, currency);
  const encoded = encodeURIComponent(message);

  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank');
}

/* ═══════════════════════════════════════════════════════
   2. VENDOR WHATSAPP PURCHASE ORDER DISPATCH
   ═══════════════════════════════════════════════════════ */

/**
 * Formats a clean, structured B2B purchase order for WhatsApp dispatch to distributors/suppliers.
 */
export function formatWhatsAppPurchaseOrderText(
  po: PurchaseOrder,
  vendor?: Vendor | null,
  venueDetails?: VenueDetails | null,
  currency = 'Rs.'
): string {
  const storeName = venueDetails?.name || 'CHILLBILL STORE';
  const helpline = venueDetails?.contactNumber ? `\n📞 Store Helpline: ${venueDetails.contactNumber}` : '';
  const address = venueDetails?.address ? `\n📍 Delivery Address: ${venueDetails.address}` : '';

  let dateStr = '';
  try {
    dateStr = format(new Date(po.date), 'dd/MM/yyyy');
  } catch (e) {
    dateStr = new Date().toLocaleDateString('en-IN');
  }

  const vendorName = vendor?.name || po.vendorName || 'Valued Supplier';

  const itemsList = (po.items || [])
    .map((item, idx) => {
      const lineCost = (item.totalCost || item.quantity * item.unitCost).toFixed(2);
      return `${idx + 1}. *${item.name}*\n   Qty: *${item.quantity}* units @ ${currency}${item.unitCost} = *${currency}${lineCost}*`;
    })
    .join('\n');

  const notesText = po.notes ? `\n📝 *Notes:* ${po.notes}` : '';

  const message = `
📦 *PURCHASE ORDER — ${storeName.toUpperCase()}*
Ref: *#${po.referenceNo || po.id}*
Date: ${dateStr}
Supplier: *${vendorName}*
━━━━━━━━━━━━━━━━━━━━
*REQUIRED ITEMS & QUANTITIES:*
${itemsList}
━━━━━━━━━━━━━━━━━━━━
💰 *Estimated Order Value: ${currency}${(po.totalAmount || 0).toLocaleString('en-IN')}*${notesText}${address}${helpline}
━━━━━━━━━━━━━━━━━━━━
Please confirm order receipt & dispatch schedule.
Thank you!
`.trim();

  return message;
}

/**
 * Opens WhatsApp Web (PC) or WhatsApp App (Mobile/Tablet) with the formatted Purchase Order.
 */
export function sendWhatsAppPurchaseOrder(
  po: PurchaseOrder,
  vendor?: Vendor | null,
  venueDetails?: VenueDetails | null,
  currency = 'Rs.'
): void {
  const cleanPhone = sanitizeWhatsAppPhone(vendor?.phone);
  const message = formatWhatsAppPurchaseOrderText(po, vendor, venueDetails, currency);
  const encoded = encodeURIComponent(message);

  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank');
}

/* ═══════════════════════════════════════════════════════
   3. CUSTOMER KHATA (CREDIT LEDGER) WHATSAPP REMINDER
   ═══════════════════════════════════════════════════════ */

/**
 * Formats a polite, professional WhatsApp Khata payment reminder for customers with pending credit balance.
 */
export function formatWhatsAppKhataReminderText(
  customer: Customer | { name: string; phone?: string; balance?: number },
  balance: number,
  venueDetails?: VenueDetails | null,
  currency = 'Rs.'
): string {
  const storeName = venueDetails?.name || 'CHILLBILL STORE';
  const helpline = venueDetails?.contactNumber ? `\n📞 Helpline: ${venueDetails.contactNumber}` : '';
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const message = `
🙏 *NAMASTE ${customer.name.toUpperCase()}!*
Greetings from *${storeName.toUpperCase()}*.
━━━━━━━━━━━━━━━━━━━━
🧾 *KHATA STATEMENT / PENDING BALANCE*
📅 As of: ${dateStr}
💰 *Total Pending Amount: ${currency}${balance.toFixed(2)}*
━━━━━━━━━━━━━━━━━━━━
Kindly clear your pending store balance at your earliest convenience.
You may pay in cash at the counter or scan our store UPI QR code.
${helpline}
━━━━━━━━━━━━━━━━━━━━
Thank you for being our valued customer!
`.trim();

  return message;
}

/**
 * Opens WhatsApp Web (PC) or WhatsApp App (Mobile) with the customer Khata payment reminder.
 */
export function sendWhatsAppKhataReminder(
  customer: Customer | { name: string; phone?: string; balance?: number },
  balance: number,
  venueDetails?: VenueDetails | null,
  currency = 'Rs.'
): void {
  const cleanPhone = sanitizeWhatsAppPhone(customer.phone);
  const message = formatWhatsAppKhataReminderText(customer, balance, venueDetails, currency);
  const encoded = encodeURIComponent(message);

  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank');
}
