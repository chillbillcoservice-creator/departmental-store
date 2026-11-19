/**
 * High-DPI Receipt Image Engine for ChillBill POS
 * 
 * Generates pixel-perfect, high-resolution (Retina 2x scale) supermarket receipt images
 * on HTML5 Canvas. Includes:
 * - Store header (Name, Address, Contact, GSTIN, FSSAI)
 * - Invoice type badge (RETAIL INVOICE vs TAX INVOICE B2B)
 * - Bill metadata (Bill #, Date, Time, Cashier, Customer details)
 * - Itemized table with HSN codes and GST percentages
 * - Financial breakdown (Subtotal, Savings badge, CGST/SGST tax breakdown, Round off, Grand Total)
 * - Payment mode badge (PAID VIA CASH / UPI / SPLIT)
 * - Scannable Code-128 barcode of Bill ID (via JsBarcode)
 * - Store UPI / validation QR code (via QRCode)
 * - Store thank-you footer & ChillBill watermark
 */

import type { Bill, VenueDetails } from './types';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

export interface ReceiptImageOptions {
    scale?: number; // Default 2 for high-DPI Retina
    width?: number; // Base width, default 680px (becomes 1360px at scale 2)
    accentColor?: string; // Default emerald-600 #059669
    showQrCode?: boolean; // Include UPI / verification QR code
    showBarcode?: boolean; // Include Bill ID barcode
}

/**
 * Creates an off-screen HTML5 Canvas and draws a complete, high-resolution receipt image.
 */
export async function generateReceiptCanvas(
    bill: Bill,
    venueDetails?: VenueDetails | null,
    currency = 'Rs.',
    options: ReceiptImageOptions = {}
): Promise<HTMLCanvasElement> {
    const scale = options.scale || 2;
    const baseWidth = options.width || 680;
    const padX = 36;
    const contentWidth = baseWidth - padX * 2;
    const accentColor = options.accentColor || '#059669'; // Emerald

    // Step 1: Pre-generate QR Code and Barcode as image data URLs if requested
    let qrDataUrl: string | null = null;
    if (options.showQrCode !== false) {
        try {
            // Generate verification / UPI link QR
            const storeUpi = venueDetails?.upiId;
            const upiQrString = storeUpi
                ? `upi://pay?pa=${encodeURIComponent(storeUpi)}&pn=${encodeURIComponent(venueDetails?.name || 'Store')}&am=${bill.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill #${bill.id}`)}`
                : `https://chillbill-store.vercel.app/b/${encodeURIComponent(bill.id)}`;
            qrDataUrl = await QRCode.toDataURL(upiQrString, {
                width: 140 * scale,
                margin: 1,
                color: { dark: '#111827', light: '#ffffff' },
            });
        } catch (e) {
            console.warn('Receipt QR generation skipped:', e);
        }
    }

    let barcodeDataUrl: string | null = null;
    if (options.showBarcode !== false && typeof document !== 'undefined') {
        try {
            const tempCanvas = document.createElement('canvas');
            JsBarcode(tempCanvas, bill.id, {
                format: 'CODE128',
                width: 2 * scale,
                height: 48 * scale,
                displayValue: false,
                margin: 0,
                background: '#ffffff',
                lineColor: '#111827',
            });
            barcodeDataUrl = tempCanvas.toDataURL('image/png');
        } catch (e) {
            console.warn('Receipt Barcode generation skipped:', e);
        }
    }

    // Step 2: Calculate total height needed dynamically
    const storeName = venueDetails?.name || 'CHILLBILL SUPERMART';
    const address = venueDetails?.address || '';
    const contact = venueDetails?.contactNumber || venueDetails?.phone || '';
    const gstin = venueDetails?.gstin || '';
    const fssai = venueDetails?.fssaiNumber || '';
    const isB2B = Boolean(bill.customerDetails?.gstin);
    const hasDiscount = (bill.discount || 0) > 0;
    const hasVat = (bill.vatAmount || 0) > 0;
    const itemsCount = bill.orderItems.length;

    // Estimate height
    let estimatedHeight = 320; // Header, store info, badges, bill details
    estimatedHeight += itemsCount * 44; // ~44px per item with HSN
    estimatedHeight += 160; // Financial totals (subtotal, discount, vat, grand total)
    if (hasDiscount) estimatedHeight += 44; // Savings badge
    estimatedHeight += 90; // Payment mode strip
    if (qrDataUrl || barcodeDataUrl) estimatedHeight += 170; // Barcode & QR block
    estimatedHeight += 90; // Footer & attribution
    estimatedHeight = Math.max(800, estimatedHeight);

    // Step 3: Initialize Canvas
    const canvas = document.createElement('canvas');
    canvas.width = baseWidth * scale;
    canvas.height = estimatedHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context from canvas');

    ctx.scale(scale, scale);

    // Background fill (crisp clean white receipt paper look)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseWidth, estimatedHeight);

    // Draw top aesthetic colored accent bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, baseWidth, 8);

    let y = 34;

    // Helper: Draw rounded rect with fallback for older browsers/environments
    const drawRoundedRect = (rx: number, ry: number, rw: number, rh: number, radius = 6) => {
        if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(rx, ry, rw, rh, radius);
        } else {
            ctx.rect(rx, ry, rw, rh);
        }
    };

    // Helper: Draw horizontal dashed or solid divider
    const drawDivider = (currentY: number, dashed = true, color = '#E5E7EB') => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        if (dashed) ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padX, currentY);
        ctx.lineTo(baseWidth - padX, currentY);
        ctx.stroke();
        ctx.restore();
    };

    // Helper: Wrap text
    const drawWrappedText = (text: string, x: number, startY: number, maxWidth: number, lineHeight: number, align: 'left' | 'center' | 'right' = 'left') => {
        ctx.textAlign = align;
        const words = text.split(' ');
        let line = '';
        let currentY = startY;
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line.trim(), x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line.trim(), x, currentY);
        return currentY + lineHeight;
    };

    // 1. STORE HEADER
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 22px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(storeName.toUpperCase(), baseWidth / 2, y);
    y += 20;

    ctx.fillStyle = '#4B5563';
    ctx.font = 'normal 11px "Inter", "Segoe UI", Arial, sans-serif';
    if (address) {
        y = drawWrappedText(address, baseWidth / 2, y, contentWidth - 40, 15, 'center');
    }
    if (contact) {
        ctx.fillText(`Helpline: ${contact}`, baseWidth / 2, y);
        y += 15;
    }

    const regDetails: string[] = [];
    if (gstin) regDetails.push(`GSTIN: ${gstin}`);
    if (fssai) regDetails.push(`FSSAI: ${fssai}`);
    if (regDetails.length > 0) {
        ctx.fillStyle = '#374151';
        ctx.font = '600 11px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.fillText(regDetails.join('  |  '), baseWidth / 2, y);
        y += 18;
    }

    y += 6;

    // 2. INVOICE BADGE
    const badgeText = isB2B ? 'TAX INVOICE (B2B)' : 'RETAIL INVOICE';
    ctx.font = 'bold 10px "Inter", "Segoe UI", Arial, sans-serif';
    const badgeWidth = ctx.measureText(badgeText).width + 24;
    const badgeHeight = 22;
    const badgeX = (baseWidth - badgeWidth) / 2;

    ctx.fillStyle = isB2B ? '#4338CA' : accentColor;
    ctx.beginPath();
    drawRoundedRect(badgeX, y, badgeWidth, badgeHeight, 11);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, baseWidth / 2, y + 15);
    y += badgeHeight + 16;

    // 3. BILL METADATA GRID
    drawDivider(y, false, '#D1D5DB');
    y += 14;

    ctx.font = 'normal 11px "Inter", "Segoe UI", Arial, sans-serif';

    // Left Column: Bill ID & Date
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6B7280';
    ctx.fillText('Bill Number:', padX, y);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 12px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText(`#${bill.id}`, padX + 75, y);

    // Right Column: Date
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6B7280';
    ctx.font = 'normal 11px "Inter", "Segoe UI", Arial, sans-serif';
    let formattedDate = '';
    try {
        formattedDate = format(new Date(bill.timestamp), 'dd MMM yyyy, hh:mm a');
    } catch {
        formattedDate = new Date().toLocaleDateString('en-IN');
    }
    ctx.fillText(formattedDate, baseWidth - padX, y);
    y += 18;

    // Row 2: Customer Name / Cashier
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6B7280';
    ctx.font = 'normal 11px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText('Billed To:', padX, y);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 11px "Inter", "Segoe UI", Arial, sans-serif';
    const customerDisplayName = bill.customerDetails?.name || 'Walk-in Customer';
    ctx.fillText(customerDisplayName.slice(0, 24), padX + 75, y);

    if (bill.cashierName) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#6B7280';
        ctx.font = 'normal 11px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.fillText(`Cashier: ${bill.cashierName}`, baseWidth - padX, y);
    }
    y += 18;

    if (bill.customerDetails?.phone || bill.customerDetails?.gstin) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#6B7280';
        ctx.fillText('Phone / GSTIN:', padX, y);
        ctx.fillStyle = '#111827';
        ctx.font = '600 11px "Inter", "Segoe UI", Arial, sans-serif';
        const phoneGstin = [bill.customerDetails.phone, bill.customerDetails.gstin].filter(Boolean).join('  •  ');
        ctx.fillText(phoneGstin, padX + 90, y);
        y += 18;
    }

    y += 4;
    drawDivider(y, false, '#D1D5DB');
    y += 16;

    // 4. ITEMS TABLE HEADER
    ctx.fillStyle = '#F3F4F6';
    ctx.beginPath();
    drawRoundedRect(padX, y - 10, contentWidth, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 10px "Inter", "Segoe UI", Arial, sans-serif';

    const col1X = padX + 8; // Item Name
    const col2X = baseWidth - padX - 180; // Qty
    const col3X = baseWidth - padX - 95; // Price
    const col4X = baseWidth - padX - 8; // Total

    ctx.textAlign = 'left';
    ctx.fillText('ITEM DESCRIPTION', col1X, y + 6);
    ctx.textAlign = 'center';
    ctx.fillText('QTY', col2X + 15, y + 6);
    ctx.textAlign = 'right';
    ctx.fillText('RATE', col3X, y + 6);
    ctx.fillText('TOTAL', col4X, y + 6);

    y += 24;

    // 5. ITEM ROWS
    bill.orderItems.forEach((item, index) => {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        const rateStr = item.price.toFixed(2);

        // Zebra background row for easy reading
        if (index % 2 === 1) {
            ctx.fillStyle = '#F9FAFB';
            ctx.fillRect(padX, y - 6, contentWidth, item.hsnCode ? 36 : 24);
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 11px "Inter", "Segoe UI", Arial, sans-serif';
        // Truncate long names gracefully
        let itemName = item.name;
        if (ctx.measureText(itemName).width > 240) {
            while (ctx.measureText(itemName + '...').width > 240 && itemName.length > 0) {
                itemName = itemName.slice(0, -1);
            }
            itemName += '...';
        }
        ctx.fillText(itemName, col1X, y + 8);

        ctx.textAlign = 'center';
        ctx.font = 'bold 11px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#374151';
        ctx.fillText(`${item.quantity}`, col2X + 15, y + 8);

        ctx.textAlign = 'right';
        ctx.font = 'normal 11px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#4B5563';
        ctx.fillText(`${currency}${rateStr}`, col3X, y + 8);

        ctx.font = 'bold 11px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#111827';
        ctx.fillText(`${currency}${itemTotal}`, col4X, y + 8);

        // Subline with HSN and GST rate if present
        if (item.hsnCode || item.taxRate) {
            y += 15;
            ctx.textAlign = 'left';
            ctx.font = 'normal 9px "Inter", "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#9CA3AF';
            const hsnDetails = [
                item.hsnCode ? `HSN: ${item.hsnCode}` : '',
                item.taxRate ? `GST: ${item.taxRate}%` : ''
            ].filter(Boolean).join('  |  ');
            ctx.fillText(hsnDetails, col1X, y + 5);
        }

        y += 20;
    });

    y += 4;
    drawDivider(y, true, '#D1D5DB');
    y += 16;

    // 6. FINANCIAL TOTALS BOX
    const totalBoxX = baseWidth - padX - 260;

    const drawTotalLine = (label: string, amount: string, isBold = false, isEmerald = false) => {
        ctx.textAlign = 'left';
        ctx.font = isBold ? 'bold 12px "Inter", "Segoe UI", Arial, sans-serif' : 'normal 11px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = isEmerald ? accentColor : isBold ? '#111827' : '#6B7280';
        ctx.fillText(label, totalBoxX, y);

        ctx.textAlign = 'right';
        ctx.font = isBold ? 'bold 12px "Inter", "Segoe UI", Arial, sans-serif' : '600 11px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.fillText(amount, baseWidth - padX, y);
        y += 18;
    };

    drawTotalLine('Subtotal:', `${currency} ${bill.subtotal.toFixed(2)}`);

    if (hasDiscount) {
        drawTotalLine('Discount Saved:', `-${currency} ${bill.discount.toFixed(2)}`, false, true);
    }

    if (hasVat) {
        const halfVat = (bill.vatAmount / 2).toFixed(2);
        drawTotalLine('CGST (Central Tax):', `${currency} ${halfVat}`);
        drawTotalLine('SGST (State Tax):', `${currency} ${halfVat}`);
    }

    if (bill.roundOff && Math.abs(bill.roundOff) > 0.001) {
        drawTotalLine('Round Off:', `${bill.roundOff > 0 ? '+' : ''}${currency} ${bill.roundOff.toFixed(2)}`);
    }

    // Grand Total Bar
    y += 4;
    ctx.fillStyle = '#F3F4F6';
    ctx.beginPath();
    drawRoundedRect(totalBoxX - 10, y - 6, 270, 38, 8);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.fillText('GRAND TOTAL:', totalBoxX, y + 18);

    ctx.textAlign = 'right';
    ctx.font = 'bold 18px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = accentColor;
    ctx.fillText(`${currency} ${bill.total.toFixed(2)}`, baseWidth - padX, y + 18);

    y += 48;

    // Savings Highlight Banner if discount applied
    if (hasDiscount) {
        ctx.fillStyle = '#ECFDF5';
        ctx.strokeStyle = '#A7F3D0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        drawRoundedRect(padX, y - 10, contentWidth, 30, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#065F46';
        ctx.font = 'bold 11px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🎉 YOU SAVED ${currency}${bill.discount.toFixed(2)} ON THIS ORDER!`, baseWidth / 2, y + 10);
        y += 36;
    }

    // 7. PAYMENT MODE & STATUS
    ctx.fillStyle = '#F9FAFB';
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    drawRoundedRect(padX, y, contentWidth, 38, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = '600 11px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#4B5563';
    ctx.fillText('PAYMENT STATUS:', padX + 16, y + 24);

    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = accentColor;
    const paymentText = bill.paymentMethod === 'Split'
        ? 'SPLIT PAYMENT [PAID]'
        : `PAID VIA ${bill.paymentMethod.toUpperCase()} [SUCCESS]`;
    ctx.fillText(`✓ ${paymentText}`, baseWidth - padX - 16, y + 24);
    y += 54;

    // 8. BARCODE & QR CODE
    if (barcodeDataUrl || qrDataUrl) {
        drawDivider(y, true, '#E5E7EB');
        y += 16;

        const codeAreaY = y;
        if (barcodeDataUrl && qrDataUrl) {
            // Draw Barcode on left, QR on right
            const barcodeImg = new Image();
            barcodeImg.src = barcodeDataUrl;
            await new Promise((res) => { barcodeImg.onload = res; barcodeImg.onerror = res; });
            ctx.drawImage(barcodeImg, padX + 20, codeAreaY, 200, 50);

            ctx.font = '600 10px monospace';
            ctx.fillStyle = '#6B7280';
            ctx.textAlign = 'center';
            ctx.fillText(bill.id, padX + 120, codeAreaY + 64);

            const qrImg = new Image();
            qrImg.src = qrDataUrl;
            await new Promise((res) => { qrImg.onload = res; qrImg.onerror = res; });
            ctx.drawImage(qrImg, baseWidth - padX - 90, codeAreaY - 8, 80, 80);

            ctx.font = 'normal 9px "Inter", "Segoe UI", Arial, sans-serif';
            ctx.fillText('Scan to Verify', baseWidth - padX - 50, codeAreaY + 80);
            y += 95;
        } else if (barcodeDataUrl) {
            const barcodeImg = new Image();
            barcodeImg.src = barcodeDataUrl;
            await new Promise((res) => { barcodeImg.onload = res; barcodeImg.onerror = res; });
            ctx.drawImage(barcodeImg, (baseWidth - 240) / 2, codeAreaY, 240, 55);

            ctx.font = '600 10px monospace';
            ctx.fillStyle = '#6B7280';
            ctx.textAlign = 'center';
            ctx.fillText(bill.id, baseWidth / 2, codeAreaY + 70);
            y += 85;
        } else if (qrDataUrl) {
            const qrImg = new Image();
            qrImg.src = qrDataUrl;
            await new Promise((res) => { qrImg.onload = res; qrImg.onerror = res; });
            ctx.drawImage(qrImg, (baseWidth - 90) / 2, codeAreaY, 90, 90);
            ctx.font = 'normal 9px "Inter", "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#6B7280';
            ctx.textAlign = 'center';
            ctx.fillText('Scan to Verify / Pay', baseWidth / 2, codeAreaY + 102);
            y += 115;
        }
    }

    // 9. FOOTER & ATTRIBUTION
    drawDivider(y, false, '#D1D5DB');
    y += 18;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#4B5563';
    ctx.font = 'bold 11px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText(venueDetails?.receiptFooter || 'THANK YOU FOR SHOPPING WITH US! VISIT AGAIN.', baseWidth / 2, y);
    y += 16;

    ctx.fillStyle = '#9CA3AF';
    ctx.font = 'normal 9px "Inter", "Segoe UI", Arial, sans-serif';
    ctx.fillText('Powered by ChillBill Supermarket Retail POS', baseWidth / 2, y);
    y += 24;

    // Trim canvas to actual rendered height
    const finalHeight = Math.ceil(y * scale);
    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = canvas.width;
    trimmedCanvas.height = finalHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (trimmedCtx) {
        trimmedCtx.drawImage(canvas, 0, 0, canvas.width, finalHeight, 0, 0, canvas.width, finalHeight);
        return trimmedCanvas;
    }

    return canvas;
}

/**
 * Returns a high-resolution PNG Blob of the receipt.
 */
export async function generateReceiptImageBlob(
    bill: Bill,
    venueDetails?: VenueDetails | null,
    currency = 'Rs.',
    options: ReceiptImageOptions = {}
): Promise<Blob> {
    const canvas = await generateReceiptCanvas(bill, venueDetails, currency, options);
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob conversion failed'));
        }, 'image/png', 0.95);
    });
}

/**
 * Returns a base64 Data URL (data:image/png;base64,...) for instant preview in DOM dialogs.
 */
export async function generateReceiptDataUrl(
    bill: Bill,
    venueDetails?: VenueDetails | null,
    currency = 'Rs.',
    options: ReceiptImageOptions = {}
): Promise<string> {
    const canvas = await generateReceiptCanvas(bill, venueDetails, currency, options);
    return canvas.toDataURL('image/png');
}

/**
 * Downloads the high-resolution receipt PNG directly to the user's computer or device.
 */
export async function downloadReceiptImage(
    bill: Bill,
    venueDetails?: VenueDetails | null,
    currency = 'Rs.',
    filename?: string
): Promise<void> {
    const blob = await generateReceiptImageBlob(bill, venueDetails, currency);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Receipt-Bill-${bill.id}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 500);
}
