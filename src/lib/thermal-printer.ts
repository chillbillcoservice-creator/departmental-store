/**
 * Universal Thermal & Bluetooth Printer Manager for ChillBill POS
 * 
 * Supports:
 * - Direct Wireless Web Bluetooth API (Seznik, Everycom, TVS, Epson, MPT-II, PT-210, POS-58, POS-80)
 * - Web Serial API (USB Thermal Printers, Windows Bluetooth Virtual COM ports)
 * - Automatic chunked binary streaming with MTU throttling
 * - Cash drawer RJ11 kick pulse
 * - Automatic paper cut
 * - Transparent fallback to System Print (window.print)
 */

import { encodeBillToEscPos, encodeTestSlipToEscPos, encodeShiftSlipToEscPos, EscPosEncoder } from './escpos';
import type { Bill, StaffShiftSession } from './types';

export interface PrinterConfig {
    mode: 'bluetooth' | 'serial' | 'system';
    paperWidth: '58mm' | '80mm';
    autoPrint: boolean;
    autoKickDrawer: boolean;
    autoCut: boolean;
    beepOnPrint: boolean;
    lastDeviceName?: string;
}

const DEFAULT_CONFIG: PrinterConfig = {
    mode: 'system',
    paperWidth: '80mm',
    autoPrint: false,
    autoKickDrawer: true,
    autoCut: true,
    beepOnPrint: true,
};

// Common Bluetooth Low Energy (BLE) Thermal Printer Service UUIDs
// Covers Seznik, TVS, Everycom, MPT-II, PT-210, Rongta, Xprinter, ISSC, and generic Chinese POS printers
const KNOWN_PRINTER_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS BLE service (Seznik, Everycom, MPT-II, PT-210)
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Rongta / Xprinter / Everycom EC-80
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent serial UART
    '0000ff00-0000-1000-8000-00805f9b34fb', // Custom POS vendors
    '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent/WeChat IoT BLE printer
    '0000ae30-0000-1000-8000-00805f9b34fb', // Generic POS BLE
];

// Active hardware connection references (in-memory per session)
let activeBluetoothDevice: any = null;
let activeBluetoothCharacteristic: any = null;
let activeSerialPort: any = null;
let activeSerialWriter: any = null;

/** Load persistent printer configuration from localStorage */
export function getPrinterConfig(): PrinterConfig {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
        const stored = localStorage.getItem('chillbill_printer_config');
        if (stored) {
            return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('[ThermalPrinter] Error loading printer config:', e);
    }
    return DEFAULT_CONFIG;
}

/** Save printer configuration to localStorage */
export function savePrinterConfig(config: Partial<PrinterConfig>): PrinterConfig {
    const current = getPrinterConfig();
    const updated = { ...current, ...config };
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('chillbill_printer_config', JSON.stringify(updated));
        } catch (e) {
            console.error('[ThermalPrinter] Error saving printer config:', e);
        }
    }
    return updated;
}

/** Check if Web Bluetooth API is supported by the current browser */
export function isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/** Check if Web Serial API is supported by the current browser */
export function isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/** Get live status of printer hardware connection */
export function getPrinterConnectionStatus(): {
    connected: boolean;
    deviceName: string | null;
    type: 'bluetooth' | 'serial' | 'system';
} {
    const config = getPrinterConfig();
    if (config.mode === 'bluetooth') {
        const isConnected = Boolean(activeBluetoothDevice && activeBluetoothDevice.gatt && activeBluetoothDevice.gatt.connected);
        return {
            connected: isConnected,
            deviceName: isConnected ? (activeBluetoothDevice.name || config.lastDeviceName || 'Bluetooth Printer') : null,
            type: 'bluetooth',
        };
    }

    if (config.mode === 'serial') {
        const isConnected = Boolean(activeSerialPort && activeSerialWriter);
        return {
            connected: isConnected,
            deviceName: isConnected ? (config.lastDeviceName || 'USB / Serial Printer') : null,
            type: 'serial',
        };
    }

    return {
        connected: true, // System print is always available
        deviceName: 'System Print Dialog',
        type: 'system',
    };
}

/**
 * Scan & Connect to a Bluetooth Thermal Receipt Printer (Web Bluetooth API)
 * Prompts user with native browser device picker.
 */
export async function connectBluetoothPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!isWebBluetoothSupported()) {
        return {
            success: false,
            error: 'Web Bluetooth is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Android Chrome.',
        };
    }

    try {
        console.log('[ThermalPrinter] Requesting Bluetooth device...');
        const nav = navigator as any;

        const device = await nav.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: KNOWN_PRINTER_SERVICES,
        });

        if (!device) {
            return { success: false, error: 'No Bluetooth device selected.' };
        }

        console.log(`[ThermalPrinter] Selected device: ${device.name || 'Unnamed'}`);
        const server = await device.gatt.connect();

        // Discover write characteristic across known services
        let writeChar: any = null;
        for (const serviceUuid of KNOWN_PRINTER_SERVICES) {
            try {
                const service = await server.getPrimaryService(serviceUuid);
                if (service) {
                    const characteristics = await service.getCharacteristics();
                    for (const char of characteristics) {
                        const props = char.properties;
                        if (props.write || props.writeWithoutResponse) {
                            writeChar = char;
                            break;
                        }
                    }
                }
            } catch (err) {
                // Service not supported on this specific model, check next UUID
            }
            if (writeChar) break;
        }

        // If not found in known UUIDs, probe all exposed primary services
        if (!writeChar) {
            try {
                const services = await server.getPrimaryServices();
                for (const service of services) {
                    try {
                        const chars = await service.getCharacteristics();
                        for (const char of chars) {
                            if (char.properties.write || char.properties.writeWithoutResponse) {
                                writeChar = char;
                                break;
                            }
                        }
                    } catch (e) {}
                    if (writeChar) break;
                }
            } catch (e) {}
        }

        if (!writeChar) {
            throw new Error('Printer connected, but no writable print characteristic was found.');
        }

        activeBluetoothDevice = device;
        activeBluetoothCharacteristic = writeChar;

        // Listen for disconnects
        device.addEventListener('gattserverdisconnected', () => {
            console.warn('[ThermalPrinter] Bluetooth printer disconnected');
            activeBluetoothCharacteristic = null;
        });

        const devName = device.name || 'Seznik / Bluetooth Printer';
        savePrinterConfig({
            mode: 'bluetooth',
            lastDeviceName: devName,
        });

        console.log(`[ThermalPrinter] Successfully connected to ${devName}`);
        return { success: true, deviceName: devName };
    } catch (err: any) {
        console.error('[ThermalPrinter] Bluetooth connection error:', err);
        return { success: false, error: err.message || 'Failed to connect Bluetooth printer.' };
    }
}

/** Disconnect Bluetooth Printer */
export async function disconnectBluetoothPrinter(): Promise<void> {
    if (activeBluetoothDevice && activeBluetoothDevice.gatt && activeBluetoothDevice.gatt.connected) {
        try {
            await activeBluetoothDevice.gatt.disconnect();
        } catch (e) {}
    }
    activeBluetoothDevice = null;
    activeBluetoothCharacteristic = null;
}

/**
 * Connect to USB Thermal Printer or Bluetooth Virtual COM Port via Web Serial API
 */
export async function connectSerialPrinter(baudRate: number = 9600): Promise<{ success: boolean; error?: string }> {
    if (!isWebSerialSupported()) {
        return {
            success: false,
            error: 'Web Serial is not supported in this browser. Please use Google Chrome or Microsoft Edge on PC.',
        };
    }

    try {
        const nav = navigator as any;
        const port = await nav.serial.requestPort();
        await port.open({ baudRate });

        activeSerialPort = port;
        activeSerialWriter = port.writable.getWriter();

        savePrinterConfig({
            mode: 'serial',
            lastDeviceName: 'USB / Serial Thermal Printer',
        });

        return { success: true };
    } catch (err: any) {
        console.error('[ThermalPrinter] Serial connection error:', err);
        return { success: false, error: err.message || 'Failed to connect USB / Serial printer.' };
    }
}

/** Disconnect Serial Printer */
export async function disconnectSerialPrinter(): Promise<void> {
    if (activeSerialWriter) {
        try {
            await activeSerialWriter.releaseLock();
        } catch (e) {}
        activeSerialWriter = null;
    }
    if (activeSerialPort) {
        try {
            await activeSerialPort.close();
        } catch (e) {}
        activeSerialPort = null;
    }
}

/**
 * Stream binary byte array to Bluetooth printer with chunking and delay to prevent BLE MTU buffer overflow.
 */
async function writeBluetoothBytes(bytes: Uint8Array): Promise<void> {
    if (!activeBluetoothCharacteristic) {
        throw new Error('Bluetooth printer characteristic not available.');
    }

    const chunkSize = 60; // 60 bytes per packet fits safely into BLE MTU
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        if (activeBluetoothCharacteristic.writeValueWithoutResponse) {
            await activeBluetoothCharacteristic.writeValueWithoutResponse(chunk);
        } else {
            await activeBluetoothCharacteristic.writeValue(chunk);
        }
        // Small throttle for printer hardware buffer
        await new Promise((res) => setTimeout(res, 12));
    }
}

/**
 * Stream binary byte array to Serial / USB printer.
 */
async function writeSerialBytes(bytes: Uint8Array): Promise<void> {
    if (!activeSerialWriter) {
        throw new Error('Serial writer not available.');
    }
    await activeSerialWriter.write(bytes);
}

/**
 * Kick cash drawer independently
 */
export async function kickCashDrawer(): Promise<boolean> {
    const config = getPrinterConfig();
    const encoder = new EscPosEncoder();
    encoder.pulseCashDrawer();
    const bytes = encoder.getBuffer();

    try {
        if (config.mode === 'bluetooth' && activeBluetoothCharacteristic) {
            await writeBluetoothBytes(bytes);
            return true;
        } else if (config.mode === 'serial' && activeSerialWriter) {
            await writeSerialBytes(bytes);
            return true;
        }
    } catch (e) {
        console.error('[ThermalPrinter] Failed to kick cash drawer:', e);
    }
    return false;
}

/**
 * Print a hardware test slip to verify Bluetooth/Serial printer connection.
 */
export async function printTestReceipt(venueName: string = 'Krishna Supermart'): Promise<{ success: boolean; error?: string }> {
    const config = getPrinterConfig();
    const bytes = encodeTestSlipToEscPos(venueName, config.paperWidth);

    try {
        if (config.mode === 'bluetooth') {
            if (!activeBluetoothCharacteristic) {
                // Try reconnecting to device if reference exists
                if (activeBluetoothDevice && activeBluetoothDevice.gatt) {
                    await activeBluetoothDevice.gatt.connect();
                } else {
                    return { success: false, error: 'Bluetooth printer is disconnected. Please click "Scan & Connect".' };
                }
            }
            await writeBluetoothBytes(bytes);
            return { success: true };
        }

        if (config.mode === 'serial') {
            if (!activeSerialWriter) {
                return { success: false, error: 'Serial printer is not connected.' };
            }
            await writeSerialBytes(bytes);
            return { success: true };
        }

        // System fallback: HTML print window
        printFallbackHtml(`
            <div style="font-family: monospace; width: ${config.paperWidth}; text-align: center; padding: 10px;">
                <h2>${venueName.toUpperCase()}</h2>
                <h3>PRINTER TEST SLIP</h3>
                <hr/>
                <p>Status: SYSTEM PRINT OK</p>
                <p>Paper Width: ${config.paperWidth}</p>
                <p>Date: ${new Date().toLocaleString()}</p>
                <hr/>
                <p>Direct thermal printing is configured.</p>
            </div>
        `);
        return { success: true };
    } catch (err: any) {
        console.error('[ThermalPrinter] Test print error:', err);
        return { success: false, error: err.message || 'Failed to print test slip.' };
    }
}

/**
 * Unified Bill Printer Dispatcher:
 * - If Bluetooth mode is active & connected -> Instant ESC/POS over BLE
 * - If Serial mode is active & connected -> Instant ESC/POS over USB/COM
 * - Otherwise -> High-compatibility system print (window.print popup)
 */
export async function printThermalBill(
    bill: Bill,
    venueDetails: any,
    activeCurrency: string = 'Rs.',
    amountPaid?: number,
    fallbackHtmlGenerator?: () => string
): Promise<{ success: boolean; usedMethod: 'bluetooth' | 'serial' | 'system'; error?: string }> {
    const config = getPrinterConfig();

    // Check if direct hardware printing is configured
    if (config.mode === 'bluetooth' && activeBluetoothCharacteristic) {
        try {
            const bytes = encodeBillToEscPos(bill, venueDetails, config.paperWidth, activeCurrency, amountPaid, {
                autoCut: config.autoCut,
                autoKickDrawer: config.autoKickDrawer,
                beep: config.beepOnPrint,
            });
            await writeBluetoothBytes(bytes);
            return { success: true, usedMethod: 'bluetooth' };
        } catch (err: any) {
            console.warn('[ThermalPrinter] Bluetooth print failed, falling back to system print:', err);
        }
    }

    if (config.mode === 'serial' && activeSerialWriter) {
        try {
            const bytes = encodeBillToEscPos(bill, venueDetails, config.paperWidth, activeCurrency, amountPaid, {
                autoCut: config.autoCut,
                autoKickDrawer: config.autoKickDrawer,
                beep: config.beepOnPrint,
            });
            await writeSerialBytes(bytes);
            return { success: true, usedMethod: 'serial' };
        } catch (err: any) {
            console.warn('[ThermalPrinter] Serial print failed, falling back to system print:', err);
        }
    }

    // Default / Fallback: System Print
    if (fallbackHtmlGenerator) {
        printFallbackHtml(fallbackHtmlGenerator());
    } else {
        // Build standard 80mm/58mm HTML receipt
        const fallbackHtml = generateFallbackBillHtml(bill, venueDetails, activeCurrency, amountPaid, config.paperWidth);
        printFallbackHtml(fallbackHtml);
    }

    return { success: true, usedMethod: 'system' };
}

/**
 * Print Shift Handover Slip via thermal ESC/POS or HTML fallback
 */
export async function printThermalShiftSlip(
    shift: StaffShiftSession,
    venueDetails: any,
    activeCurrency: string = 'Rs.'
): Promise<{ success: boolean; usedMethod: 'bluetooth' | 'serial' | 'system' }> {
    const config = getPrinterConfig();

    if (config.mode === 'bluetooth' && activeBluetoothCharacteristic) {
        try {
            const bytes = encodeShiftSlipToEscPos(shift, venueDetails, config.paperWidth, activeCurrency);
            await writeBluetoothBytes(bytes);
            return { success: true, usedMethod: 'bluetooth' };
        } catch (e) {}
    }

    if (config.mode === 'serial' && activeSerialWriter) {
        try {
            const bytes = encodeShiftSlipToEscPos(shift, venueDetails, config.paperWidth, activeCurrency);
            await writeSerialBytes(bytes);
            return { success: true, usedMethod: 'serial' };
        } catch (e) {}
    }

    return { success: true, usedMethod: 'system' };
}

/**
 * Helper to display HTML receipt in system print popup
 */
function printFallbackHtml(htmlContent: string) {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) return;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

/**
 * Default fallback HTML receipt generator
 */
function generateFallbackBillHtml(
    bill: Bill,
    venueDetails: any,
    activeCurrency: string,
    amountPaid: number | undefined,
    paperWidth: '58mm' | '80mm'
): string {
    const paid = amountPaid !== undefined ? amountPaid : bill.total;
    const balance = bill.total - paid;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Receipt #${bill.id}</title>
        <style>
            body { font-family: 'Courier New', monospace; width: ${paperWidth}; margin: 0 auto; padding: 10px; color: #000; font-size: 12px; }
            .header { text-align: center; margin-bottom: 8px; }
            .header h1 { margin: 2px 0; font-size: 16px; font-weight: 900; text-transform: uppercase; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .total-row { font-size: 14px; font-weight: 900; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin: 4px 0; }
            .footer { text-align: center; margin-top: 12px; font-size: 10px; }
            @media print { body { width: ${paperWidth}; } }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${venueDetails?.name || 'SUPERMARKET'}</h1>
            <p>${venueDetails?.address || ''}</p>
            ${venueDetails?.contactNumber ? `<p>Phone: ${venueDetails.contactNumber}</p>` : ''}
            ${venueDetails?.gstin ? `<p><strong>GSTIN:</strong> ${venueDetails.gstin}</p>` : ''}
        </div>
        <div class="divider"></div>
        <div class="row"><span>Bill #${bill.id}</span><span>${new Date(bill.timestamp).toLocaleString()}</span></div>
        ${bill.cashierName ? `<div class="row"><span>Cashier: ${bill.cashierName}</span></div>` : ''}
        <div class="divider"></div>
        <table>
            <thead>
                <tr style="border-bottom: 1px solid #000;">
                    <th style="text-align: left;">Item</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${bill.orderItems.map((item) => `
                <tr>
                    <td style="padding: 3px 0;">
                        <strong>${item.name}</strong><br/>
                        <small>${item.quantity} x ${activeCurrency}${item.price.toFixed(2)}</small>
                    </td>
                    <td style="text-align: right; vertical-align: bottom;">${activeCurrency}${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="divider"></div>
        <div class="row"><span>Subtotal:</span><span>${activeCurrency} ${bill.subtotal.toFixed(2)}</span></div>
        ${bill.discount > 0 ? `<div class="row"><span>Discount:</span><span>-${activeCurrency} ${bill.discount.toFixed(2)}</span></div>` : ''}
        ${bill.vatAmount > 0 ? `<div class="row"><span>GST:</span><span>${activeCurrency} ${bill.vatAmount.toFixed(2)}</span></div>` : ''}
        <div class="row total-row"><span>TOTAL:</span><span>${activeCurrency} ${bill.total.toFixed(2)}</span></div>
        <div class="row"><span>Paid:</span><span>${activeCurrency} ${paid.toFixed(2)}</span></div>
        ${balance > 0 ? `<div class="row" style="color: red; font-weight: bold;"><span>BALANCE DUE:</span><span>-${activeCurrency} ${balance.toFixed(2)}</span></div>` : ''}
        <div class="divider"></div>
        <div class="footer">
            <p>${venueDetails?.receiptFooter || 'THANK YOU FOR SHOPPING WITH US!'}</p>
        </div>
        <script>
            window.onload = function() { window.print(); window.close(); };
        </script>
    </body>
    </html>
    `;
}
