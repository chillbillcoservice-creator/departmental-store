/**
 * ESC/POS Binary Command Encoder & Thermal Receipt Formatter
 * 
 * Supports:
 * - 58mm (2-inch / 32 characters per line) for portable mobile printers (Seznik SZ-58, Everycom EC-58, MPT-II, PT-210, POS-58, GOOJPRT)
 * - 80mm (3-inch / 48 characters per line) for countertop thermal printers (Seznik SZ-80, TVS RP 3150, Epson TM-T88, Everycom EC-80)
 * - Automated cash drawer kick pulse (ESC p 0 25 250)
 * - Automatic paper cut (GS V 66 0)
 * - Buzzer alert beep (ESC B 2 2)
 */

import type { Bill, StaffShiftSession } from './types';
import { format } from 'date-fns';

// Standard ESC/POS Control Byte Constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export class EscPosEncoder {
    private buffer: number[] = [];

    constructor() {
        this.initialize();
    }

    /** Reset printer to default settings */
    initialize(): this {
        this.buffer.push(ESC, 0x40); // ESC @
        return this;
    }

    /** Set text alignment: 0=Left, 1=Center, 2=Right */
    align(alignment: 'left' | 'center' | 'right'): this {
        const val = alignment === 'center' ? 0x01 : alignment === 'right' ? 0x02 : 0x00;
        this.buffer.push(ESC, 0x61, val); // ESC a n
        return this;
    }

    /** Bold text toggle */
    bold(enable: boolean = true): this {
        this.buffer.push(ESC, 0x45, enable ? 0x01 : 0x00); // ESC E n
        return this;
    }

    /** Underline text toggle */
    underline(enable: boolean = true): this {
        this.buffer.push(ESC, 0x2d, enable ? 0x01 : 0x00); // ESC - n
        return this;
    }

    /** Set character sizing: width (1 or 2) and height (1 or 2) */
    size(width: 1 | 2 = 1, height: 1 | 2 = 1): this {
        const wVal = width === 2 ? 0x10 : 0x00;
        const hVal = height === 2 ? 0x01 : 0x00;
        this.buffer.push(GS, 0x21, wVal | hVal); // GS ! n
        return this;
    }

    /** Append raw text converted to standard ASCII / Code Page 437 */
    text(str: string): this {
        // Transliterate currency symbols and special chars to plain ASCII for thermal head compatibility
        const cleanStr = str
            .replace(/₹/g, 'Rs.')
            .replace(/[^\x20-\x7E\n\r]/g, ' '); // Replace non-printable/unsupported unicode with spaces

        for (let i = 0; i < cleanStr.length; i++) {
            const code = cleanStr.charCodeAt(i);
            this.buffer.push(code);
        }
        return this;
    }

    /** Append text and newline (LF) */
    line(str: string = ''): this {
        if (str) this.text(str);
        this.buffer.push(LF);
        return this;
    }

    /** Feed n empty lines */
    feed(lines: number = 1): this {
        for (let i = 0; i < lines; i++) {
            this.buffer.push(LF);
        }
        return this;
    }

    /** Draw a full-width divider line with character (e.g. '-' or '=') */
    divider(charWidth: number = 32, char: string = '-'): this {
        this.align('left');
        this.size(1, 1);
        this.bold(false);
        this.line(char.repeat(charWidth));
        return this;
    }

    /** Format two strings aligned to left and right edges within column width */
    twoColumn(left: string, right: string, totalWidth: number = 32): this {
        this.align('left');
        this.size(1, 1);
        const availableSpace = totalWidth - left.length - right.length;
        if (availableSpace <= 0) {
            // If they exceed total width, print left on first line and right right-aligned on next
            this.line(left);
            const spaces = Math.max(0, totalWidth - right.length);
            this.line(' '.repeat(spaces) + right);
        } else {
            this.line(left + ' '.repeat(availableSpace) + right);
        }
        return this;
    }

    /** Format three columns (e.g. Item | Qty x Rate | Amount) */
    threeColumn(col1: string, col2: string, col3: string, totalWidth: number = 48): this {
        this.align('left');
        this.size(1, 1);
        const col3Width = 10;
        const col2Width = totalWidth === 48 ? 14 : 10;
        const col1Width = totalWidth - col2Width - col3Width;

        const c1 = col1.padEnd(col1Width).slice(0, col1Width);
        const c2 = col2.padStart(col2Width).slice(0, col2Width);
        const c3 = col3.padStart(col3Width).slice(0, col3Width);

        this.line(c1 + c2 + c3);
        return this;
    }

    /** Send cash drawer kick pulse to RJ11 port (ESC p 0 25 250) */
    pulseCashDrawer(): this {
        this.buffer.push(ESC, 0x70, 0x00, 0x19, 0xfa);
        return this;
    }

    /** Send partial or full paper guillotine cut (GS V 66 0) */
    cut(partial: boolean = false): this {
        this.feed(3);
        this.buffer.push(GS, 0x56, partial ? 0x01 : 0x00);
        return this;
    }

    /** Send audio buzzer alert beep (ESC B 2 2) */
    beep(): this {
        this.buffer.push(ESC, 0x42, 0x02, 0x02);
        return this;
    }

    /** Return raw Uint8Array binary byte stream */
    getBuffer(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}

/**
 * Encodes an Indian Departmental Store Bill into raw ESC/POS binary data.
 * Optimized for both 58mm (32 chars) and 80mm (48 chars) thermal rolls.
 */
export function encodeBillToEscPos(
    bill: Bill,
    venueDetails: any,
    paperWidth: '58mm' | '80mm' = '80mm',
    activeCurrency: string = 'Rs.',
    amountPaid?: number,
    options: { autoCut?: boolean; autoKickDrawer?: boolean; beep?: boolean } = {}
): Uint8Array {
    const encoder = new EscPosEncoder();
    const cols = paperWidth === '58mm' ? 32 : 48;
    const paid = amountPaid !== undefined ? amountPaid : bill.total;
    const balance = bill.total - paid;
    const isB2B = Boolean(bill.customerDetails?.gstin);
    const storeName = venueDetails?.name || 'SUPERMARKET';

    // 1. Kick Cash Drawer if cash checkout
    if (options.autoKickDrawer && (bill.paymentMethod === 'Cash' || bill.paymentMethod === 'Split')) {
        encoder.pulseCashDrawer();
    }

    // 2. Audio Beep
    if (options.beep) {
        encoder.beep();
    }

    // 3. Header
    encoder.align('center');
    encoder.size(2, 2).bold(true).line(storeName.toUpperCase()).size(1, 1).bold(false);

    if (venueDetails?.address) encoder.line(venueDetails.address);
    if (venueDetails?.contactNumber) encoder.line(`Phone: ${venueDetails.contactNumber}`);
    if (venueDetails?.gstin) encoder.bold(true).line(`GSTIN: ${venueDetails.gstin}`).bold(false);
    if (venueDetails?.fssaiNumber) encoder.line(`FSSAI Lic: ${venueDetails.fssaiNumber}`);
    if (venueDetails?.tagline) encoder.line(venueDetails.tagline);
    if (venueDetails?.receiptHeader) encoder.bold(true).line(venueDetails.receiptHeader).bold(false);

    // 4. Invoice Type Badge
    encoder.feed(1);
    encoder.bold(true).line(isB2B ? '*** TAX INVOICE (B2B) ***' : '*** RETAIL INVOICE ***').bold(false);

    // 5. Meta info
    encoder.divider(cols, '-');
    encoder.twoColumn(`Bill #${bill.id}`, format(new Date(bill.timestamp), 'dd/MM/yyyy HH:mm'), cols);
    if (bill.cashierName) {
        encoder.twoColumn(`Cashier: ${bill.cashierName}`, `POS Terminal 1`, cols);
    }

    // 6. Customer Details if present
    if (bill.customerDetails && (bill.customerDetails.name || bill.customerDetails.phone)) {
        encoder.divider(cols, '.');
        const custName = bill.customerDetails.companyName
            ? `${bill.customerDetails.companyName} (${bill.customerDetails.name})`
            : bill.customerDetails.name;
        encoder.line(`Customer: ${custName}`);
        if (bill.customerDetails.phone) encoder.line(`Phone: ${bill.customerDetails.phone}`);
        if (bill.customerDetails.gstin) encoder.bold(true).line(`GSTIN: ${bill.customerDetails.gstin}`).bold(false);
        if (bill.customerDetails.address) encoder.line(`Address: ${bill.customerDetails.address}`);
    }

    // 7. Table Header
    encoder.divider(cols, '=');
    if (cols === 32) {
        encoder.twoColumn('Item Description', 'Total', cols);
    } else {
        encoder.threeColumn('Item / HSN', 'Qty x Rate', 'Total', cols);
    }
    encoder.divider(cols, '-');

    // 8. Items
    bill.orderItems.forEach((item) => {
        const lineTotal = `${activeCurrency}${(item.price * item.quantity).toFixed(2)}`;
        const rateStr = `${item.quantity} x ${activeCurrency}${item.price.toFixed(2)}`;

        if (cols === 32) {
            // 58mm layout: Item on top, Qty x Rate + Total on second row
            encoder.bold(true).line(item.name.slice(0, 32)).bold(false);
            if (item.hsnCode) {
                encoder.line(` HSN: ${item.hsnCode} | GST: ${item.taxRate || 0}%`);
            }
            encoder.twoColumn(` ${rateStr}`, lineTotal, cols);
        } else {
            // 80mm layout
            const nameWithHsn = item.hsnCode ? `${item.name} (${item.hsnCode})` : item.name;
            encoder.bold(true).threeColumn(nameWithHsn, rateStr, lineTotal, cols).bold(false);
        }
    });

    encoder.divider(cols, '=');

    // 9. Financial Totals
    encoder.twoColumn('Subtotal:', `${activeCurrency} ${bill.subtotal.toFixed(2)}`, cols);
    if (bill.discount > 0) {
        encoder.twoColumn('Discount Applied:', `-${activeCurrency} ${bill.discount.toFixed(2)}`, cols);
    }
    if (bill.vatAmount > 0) {
        encoder.twoColumn('Total GST Included:', `${activeCurrency} ${bill.vatAmount.toFixed(2)}`, cols);
    }

    encoder.divider(cols, '-');
    encoder.size(1, 2).bold(true);
    encoder.twoColumn('TOTAL AMOUNT:', `${activeCurrency} ${bill.total.toFixed(2)}`, cols);
    encoder.size(1, 1).bold(false);
    encoder.divider(cols, '-');

    // 10. Payment Info
    if (bill.paymentMethod === 'Split' && bill.splitPayments) {
        encoder.line('Payment Method: SPLIT TENDER');
        bill.splitPayments.forEach((p) => {
            encoder.twoColumn(` - ${p.method}:`, `${activeCurrency} ${p.amount.toFixed(2)}`, cols);
        });
    } else {
        const utrNote = bill.utr ? ` (UTR: ${bill.utr.slice(-6)})` : '';
        encoder.twoColumn('Payment Method:', `${bill.paymentMethod}${utrNote}`, cols);
    }

    encoder.twoColumn('Amount Tendered:', `${activeCurrency} ${paid.toFixed(2)}`, cols);

    if (balance > 0) {
        encoder.bold(true).twoColumn('BALANCE DUE (UDHAAR):', `-${activeCurrency} ${balance.toFixed(2)}`, cols).bold(false);
    } else if (paid > bill.total) {
        encoder.twoColumn('Change Returned:', `${activeCurrency} ${(paid - bill.total).toFixed(2)}`, cols);
    }

    // 11. GST Tax Breakdown (Intra-state CGST + SGST)
    const gstBreakdown: Record<number, { taxable: number; cgst: number; sgst: number; totalTax: number }> = {};
    bill.orderItems.forEach((item) => {
        const rate = item.taxRate || 0;
        const lineTotal = item.price * item.quantity;
        const taxable = rate > 0 ? lineTotal / (1 + rate / 100) : lineTotal;
        const taxAmount = lineTotal - taxable;
        const halfTax = taxAmount / 2;
        if (!gstBreakdown[rate]) {
            gstBreakdown[rate] = { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 };
        }
        gstBreakdown[rate].taxable += taxable;
        gstBreakdown[rate].cgst += halfTax;
        gstBreakdown[rate].sgst += halfTax;
        gstBreakdown[rate].totalTax += taxAmount;
    });

    const rates = Object.keys(gstBreakdown).map(Number).sort((a, b) => a - b);
    if (rates.some((r) => r > 0)) {
        encoder.divider(cols, '-');
        encoder.align('center').bold(true).line('GST TAX BREAKDOWN').bold(false);
        if (cols === 32) {
            encoder.twoColumn('Rate | Taxable', 'CGST+SGST', cols);
            rates.forEach((r) => {
                const row = gstBreakdown[r];
                encoder.twoColumn(`${r}% | ${row.taxable.toFixed(1)}`, `${row.totalTax.toFixed(1)}`, cols);
            });
        } else {
            encoder.line('Rate%   Taxable   CGST(50%)   SGST(50%)   Total Tax');
            rates.forEach((r) => {
                const row = gstBreakdown[r];
                const line = `${String(r).padStart(3)}%   ${row.taxable.toFixed(2).padStart(8)}  ${row.cgst.toFixed(2).padStart(9)}  ${row.sgst.toFixed(2).padStart(9)}  ${row.totalTax.toFixed(2).padStart(9)}`;
                encoder.line(line);
            });
        }
    }

    // 12. Footer
    encoder.divider(cols, '=');
    encoder.align('center');
    if (venueDetails?.customMessage) {
        encoder.line(venueDetails.customMessage);
        encoder.feed(1);
    }
    encoder.line(venueDetails?.receiptFooter || 'THANK YOU FOR SHOPPING WITH US! VISIT AGAIN.');
    encoder.line('** Powered by ChillBill Retail POS **');

    // 13. Paper Cut
    if (options.autoCut !== false) {
        encoder.cut();
    } else {
        encoder.feed(4);
    }

    return encoder.getBuffer();
}

/**
 * Encodes a quick hardware verification test slip to verify printer communication.
 */
export function encodeTestSlipToEscPos(
    venueName: string = 'Krishna Supermart',
    paperWidth: '58mm' | '80mm' = '58mm'
): Uint8Array {
    const encoder = new EscPosEncoder();
    const cols = paperWidth === '58mm' ? 32 : 48;

    encoder.beep();
    encoder.align('center');
    encoder.size(2, 2).bold(true).line(venueName.toUpperCase()).size(1, 1).bold(false);
    encoder.line('BLUETOOTH PRINTER TEST SLIP');
    encoder.divider(cols, '=');
    encoder.twoColumn('Status:', 'CONNECTED [OK]', cols);
    encoder.twoColumn('Paper Width:', paperWidth, cols);
    encoder.twoColumn('Date & Time:', format(new Date(), 'PP p'), cols);
    encoder.twoColumn('Protocol:', 'ESC/POS Thermal', cols);
    encoder.divider(cols, '-');
    encoder.align('center');
    encoder.bold(true).line('Direct Wireless Printing is Ready!').bold(false);
    encoder.line('Bills will print fast without popups.');
    encoder.divider(cols, '=');
    encoder.cut();

    return encoder.getBuffer();
}

/**
 * Encodes a Shift Handover Slip for direct thermal printing.
 */
export function encodeShiftSlipToEscPos(
    shift: StaffShiftSession,
    venueDetails: any,
    paperWidth: '58mm' | '80mm' = '58mm',
    activeCurrency: string = 'Rs.'
): Uint8Array {
    const encoder = new EscPosEncoder();
    const cols = paperWidth === '58mm' ? 32 : 48;
    const storeName = venueDetails?.name || 'SUPERMARKET';

    const safeDate = (d: any) => {
        if (!d) return '-';
        try {
            const parsed = new Date(d);
            if (!isNaN(parsed.getTime())) {
                return format(parsed, 'dd/MM HH:mm');
            }
        } catch {}
        return '-';
    };

    encoder.beep();
    encoder.align('center');
    encoder.size(2, 2).bold(true).line(storeName.toUpperCase()).size(1, 1).bold(false);
    encoder.bold(true).line('*** SHIFT HANDOVER REPORT ***').bold(false);
    encoder.divider(cols, '=');
    encoder.twoColumn('Cashier:', shift.employeeName || 'Staff', cols);
    encoder.twoColumn('Opened:', safeDate(shift.openedAt), cols);
    encoder.twoColumn('Closed:', safeDate(shift.closedAt), cols);
    encoder.divider(cols, '-');

    encoder.twoColumn('Total Sales Revenue:', `${activeCurrency} ${(shift.totalSales || 0).toFixed(2)}`, cols);
    encoder.twoColumn(' - Cash Sales:', `${activeCurrency} ${(shift.cashSales || 0).toFixed(2)}`, cols);
    encoder.twoColumn(' - UPI / Online:', `${activeCurrency} ${(shift.onlineSales || 0).toFixed(2)}`, cols);
    encoder.twoColumn('Bills Processed:', `${shift.billsCount || 0}`, cols);

    encoder.divider(cols, '-');
    encoder.twoColumn('Opening Float:', `${activeCurrency} ${(shift.openingFloat || 0).toFixed(2)}`, cols);
    encoder.twoColumn('Store Expenses (Cash):', `-${activeCurrency} ${(shift.storeExpenses || 0).toFixed(2)}`, cols);
    encoder.bold(true);
    encoder.twoColumn('Expected Till Cash:', `${activeCurrency} ${(shift.expectedCashInDrawer || 0).toFixed(2)}`, cols);
    if (shift.actualCashCounted !== undefined) {
        encoder.twoColumn('Actual Counted Cash:', `${activeCurrency} ${(shift.actualCashCounted || 0).toFixed(2)}`, cols);
    }
    if (shift.cashDifference !== undefined) {
        encoder.twoColumn('Till Discrepancy:', `${activeCurrency} ${(shift.cashDifference || 0).toFixed(2)}`, cols);
    }
    encoder.bold(false);

    encoder.divider(cols, '=');
    encoder.align('center');
    encoder.feed(2);
    encoder.line('-----------------------------');
    encoder.line('Cashier Signature');
    encoder.cut();

    return encoder.getBuffer();
}
