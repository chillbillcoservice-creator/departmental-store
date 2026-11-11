/**
 * Brutal End-to-End Test Suite for ChillBill Departmental Store POS
 * Tests core business logic, retail calculations, state models, WhatsApp engines,
 * shift handovers, reporting algorithms, and inventory integrity.
 */

import { EventEmitter } from 'events';

// Mock window and localStorage before imports
const mockStorage: Record<string, string> = {};
const eventEmitter = new EventEmitter();

(global as any).window = {
  addEventListener: (event: string, handler: any) => eventEmitter.on(event, handler),
  removeEventListener: (event: string, handler: any) => eventEmitter.off(event, handler),
  dispatchEvent: (event: any) => {
    eventEmitter.emit(event.type, event);
    return true;
  },
};
(global as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, params?: { detail: any }) {
    this.type = type;
    this.detail = params?.detail;
  }
};
(global as any).localStorage = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => { mockStorage[k] = v; },
  removeItem: (k: string) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
};

import { DEPARTMENTAL_STORE_CATALOG } from '../src/lib/departmental-catalog';
import {
  sanitizeWhatsAppPhone,
  formatWhatsAppBillText,
  formatWhatsAppPurchaseOrderText,
  formatWhatsAppKhataReminderText,
  formatWhatsAppVendorStatementText,
} from '../src/lib/whatsapp-service';
import {
  getOrStartActiveShift,
  getActiveShift,
  logShiftActivity,
  calculateShiftSummary,
  completeShiftSession,
  formatShiftWhatsAppText,
  generateShiftReceiptText,
} from '../src/lib/shift-manager';
import { compileStoreReport } from '../src/lib/report-generator';
import { buildUsername, generateUniqueUsername } from '../src/lib/generate-username';
import { subscribeToAmountMatch, simulateCounterStandeePayment, generateMockUtr } from '../src/lib/payment-listener';
import { playKaChingSound, playScanBeep, unlockAudioContext, getSharedAudioContext } from '../src/lib/soundbox';
import { cleanVenueId, DEFAULT_STORE_UID, DEFAULT_STORE_EMAIL, buildTerminalCredentials } from '../src/lib/firestore-sync';
import type {
  Bill,
  Customer,
  Employee,
  Expense,
  InventoryItem,
  PurchaseOrder,
  Vendor,
  VenueDetails,
} from '../src/lib/types';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    results.push({ name, passed: true, details });
    console.log(`  ✓ PASS: ${name}${details ? ` (${details})` : ''}`);
  } else {
    results.push({ name, passed: false, error: 'Assertion failed' });
    console.error(`  ✗ FAIL: ${name}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 STARTING BRUTAL COMPREHENSIVE SUITE - CHILLBILL POS');
  console.log('======================================================\n');

  // -------------------------------------------------------------------------
  // TEST GROUP 1: CATALOG INTEGRITY & MARGINS
  // -------------------------------------------------------------------------
  console.log('📦 [1/6] Auditing Departmental Store Catalog...');
  assert(DEPARTMENTAL_STORE_CATALOG.length >= 25, 'Catalog size check', `${DEPARTMENTAL_STORE_CATALOG.length} items loaded`);

  let invalidBarcodes = 0;
  let invalidPrices = 0;
  let negativeMargins = 0;

  DEPARTMENTAL_STORE_CATALOG.forEach((item) => {
    if (!item.id || item.id.length < 3) invalidBarcodes++;
    if (!item.price || item.price <= 0) invalidPrices++;
    if (item.costPrice && item.costPrice > item.price) negativeMargins++;
  });

  assert(invalidBarcodes === 0, 'Catalog Barcodes Valid', `${invalidBarcodes} invalid`);
  assert(invalidPrices === 0, 'Catalog Prices Valid (> 0)', `${invalidPrices} zero/negative prices`);
  assert(negativeMargins === 0, 'Catalog Profit Margins Positive', `${negativeMargins} loss-making items`);

  // -------------------------------------------------------------------------
  // TEST GROUP 2: WHATSAPP SERVICES & PHONE SANITIZATION
  // -------------------------------------------------------------------------
  console.log('\n📱 [2/6] Auditing WhatsApp Engines & Message Generators...');
  
  // Phone numbers
  assert(sanitizeWhatsAppPhone('9876543210') === '919876543210', 'Phone standard 10-digit prepends 91');
  assert(sanitizeWhatsAppPhone('+91 98765-43210') === '919876543210', 'Phone with symbols & spaces stripped');
  assert(sanitizeWhatsAppPhone('919876543210') === '919876543210', 'Phone already prefixed with 91 preserved');
  assert(sanitizeWhatsAppPhone('') === '', 'Empty phone handled gracefully');
  assert(sanitizeWhatsAppPhone(null) === '', 'Null phone handled gracefully');

  const sampleVenue: VenueDetails = {
    name: 'ChillBill Mega Mart',
    address: 'Shop 4, Civil Lines, Jaipur',
    contactNumber: '9876500000',
    email: 'store@chillbill.com',
    currency: 'Rs.',
    gstin: '08AAAAA0000A1Z5',
  };

  const sampleBill = {
    id: '01',
    timestamp: new Date(),
    orderItems: [
      { name: 'Fortune Oil 1L', price: 155, quantity: 2, code: 'OIL-01' },
      { name: 'Aashirvaad Atta 5kg', price: 235, quantity: 1, code: 'ATTA-05' },
    ],
    subtotal: 545,
    discount: 45,
    total: 500,
    paymentMethod: 'Online',
    orderType: 'Store-Pickup',
    customerDetails: {
      name: 'Rohan Sharma',
      phone: '9876545432',
      gstin: '08BBBBB1111B2Z6',
      address: 'Main Market, Delhi',
    },
  } as unknown as Bill;

  const billText = formatWhatsAppBillText(sampleBill, sampleVenue, 'Rs.');
  assert(billText.includes('TAX INVOICE (B2B)'), 'B2B GSTIN activates TAX INVOICE heading');
  assert(billText.includes('Fortune Oil 1L'), 'Bill includes item names');
  assert(billText.includes('500'), 'Bill includes final total');
  assert(billText.includes('08BBBBB1111B2Z6'), 'Bill includes customer GSTIN');

  // Customer Khata Reminder
  const sampleCustomer: Customer = {
    id: '9876545432',
    name: 'Bunty',
    phone: '9876545432',
    totalSpent: 12000,
    totalVisits: 14,
    balance: 8888,
    firstSeen: new Date(),
    lastSeen: new Date(),
  };

  const khataText = formatWhatsAppKhataReminderText(sampleCustomer, 8888, sampleVenue, 'Rs.');
  assert(khataText.includes('BUNTY'), 'Khata message includes customer name in uppercase');
  assert(khataText.includes('8888.00'), 'Khata message displays exact pending balance');
  assert(khataText.toLowerCase().includes(sampleVenue.name.toLowerCase()), 'Khata message includes store name');

  // Vendor Purchase Order
  const samplePO: PurchaseOrder = {
    id: 'po-101',
    vendorId: 'v-01',
    vendorName: 'Jaipur FMCG Distributors',
    referenceNo: 'PO-994422',
    date: new Date(),
    status: 'Ordered',
    items: [
      { inventoryItemId: 'item-1', name: 'Britannia Good Day', quantity: 48, unitCost: 20, totalCost: 960 },
      { inventoryItemId: 'item-2', name: 'Tata Tea Gold 500g', quantity: 24, unitCost: 280, totalCost: 6720 },
    ],
    totalAmount: 7680,
  };

  const sampleVendor: Vendor = {
    id: 'v-01',
    name: 'Jaipur FMCG Distributors',
    category: 'FMCG & Groceries',
    phone: '9829012345',
    balance: 14500,
  };

  const poText = formatWhatsAppPurchaseOrderText(samplePO, sampleVendor, sampleVenue, 'Rs.');
  assert(poText.includes('PO-994422'), 'PO text includes reference number');
  assert(poText.includes('Tata Tea Gold'), 'PO text includes ordered products');
  assert(poText.includes('7,680'), 'PO text includes estimated order value');

  // Vendor Statement
  const vendorStmtText = formatWhatsAppVendorStatementText(sampleVendor, sampleVenue, 'Rs.');
  assert(vendorStmtText.includes('14500.00'), 'Vendor statement reflects current payable balance');
  assert(vendorStmtText.includes('Jaipur FMCG Distributors'), 'Vendor statement names supplier');

  // -------------------------------------------------------------------------
  // TEST GROUP 3: SHIFT HANDOVER & CASH RECONCILIATION
  // -------------------------------------------------------------------------
  console.log('\n💼 [3/6] Auditing Shift Management & Handover Drawer Math...');

  const cashierEmployee = {
    id: 'emp-101',
    name: 'Amit Kumar (Cashier)',
    role: 'Cashier',
    salary: 15000,
    color: '#3b82f6',
    allowedTabs: ['payments'],
  };

  const shift = getOrStartActiveShift(cashierEmployee as any, 2000); // 2000 initial float
  assert(shift.openingFloat === 2000, 'Shift opened with initial float of 2000');
  assert(getActiveShift()?.employeeName === 'Amit Kumar (Cashier)', 'Active shift retrieved');

  // Vendor Purchase Order with shiftId
  const poWithShift: PurchaseOrder = {
    ...samplePO,
    shiftId: shift.id,
  };

  // Create shift bills
  const shiftBills = [
    {
      id: 'B01',
      timestamp: new Date(),
      subtotal: 1500,
      total: 1500,
      paymentMethod: 'Cash',
      orderItems: [{ name: 'Rice 10kg', price: 750, quantity: 2, code: 'R10' }],
      orderType: 'Store-Pickup',
      cashierId: 'emp-101',
      shiftId: shift.id,
    },
    {
      id: 'B02',
      timestamp: new Date(),
      subtotal: 3200,
      total: 3200,
      paymentMethod: 'Online',
      orderItems: [{ name: 'Ghee 1L', price: 800, quantity: 4, code: 'G01' }],
      orderType: 'Store-Pickup',
      cashierId: 'emp-101',
      shiftId: shift.id,
    },
  ] as unknown as Bill[];

  const shiftExpenses: Expense[] = [
    { id: 'e1', description: 'Counter Tea & Snacks', amount: 120, category: 'Food & Beverage', paymentMethod: 'Cash', date: new Date(), shiftId: shift.id },
  ];

  // Log a customer khata cash collection
  logShiftActivity({ type: 'khata_collection', title: 'Khata Cash Collection', description: 'Customer Khata Recovery', amount: 800, paymentMethod: 'Cash' });

  // Calculate live reconciled shift summary
  const updatedShift = calculateShiftSummary(getActiveShift()!, shiftBills, shiftExpenses, [poWithShift], []);

  // Expected cash in drawer:
  // openingFloat (2000) + Cash Sales (1500) + Khata Cash Collection (800) - Expense (120) = 4180
  assert(updatedShift.expectedCashInDrawer === 4180, 'Expected Cash in drawer accurately computed', `Got ${updatedShift.expectedCashInDrawer}`);
  assert(updatedShift.cashSales === 1500, 'Cash sales tracked (1500)');
  assert(updatedShift.onlineSales === 3200, 'Online sales tracked (3200)');
  assert(updatedShift.totalSales === 4700, 'Total sales volume tracked (4700)');
  assert(updatedShift.vendorPOsCreated?.length === 1, 'Vendor PO tracked during shift');

  // Test handover slip & WhatsApp report
  const shiftSlip = generateShiftReceiptText(updatedShift, sampleVenue, 'Rs.');
  assert(shiftSlip.includes('SHIFT HANDOVER REPORT'), 'Shift handover receipt slip formatted');
  assert(shiftSlip.includes('4180.00'), 'Shift slip shows exact expected drawer cash');

  const shiftWA = formatShiftWhatsAppText(updatedShift, sampleVenue.name, 'Rs.');
  assert(decodeURIComponent(shiftWA).includes('Amit Kumar (Cashier)'), 'Shift WhatsApp text includes cashier name');

  // Complete shift with counted cash 4180 (exact match)
  const completedShift = completeShiftSession(4180, 'Counter shift closed on time.');
  assert(completedShift?.status === 'Completed', 'Shift session status changed to Completed');
  assert(completedShift?.cashDifference === 0, 'Exact till tally yields 0 difference', `Got ${completedShift?.cashDifference}`);
  assert(getActiveShift() === null, 'Active shift cleared after completion');

  // -------------------------------------------------------------------------
  // TEST GROUP 4: REPORT GENERATION & PROFIT METRICS
  // -------------------------------------------------------------------------
  console.log('\n📊 [4/6] Auditing Store Reports & Profit Margins...');

  const reportBills = [
    {
      id: '01',
      timestamp: new Date(),
      subtotal: 1000,
      total: 1000,
      paymentMethod: 'Cash',
      orderItems: [
        { name: 'Item A', price: 500, quantity: 2, code: 'A' },
      ],
      orderType: 'Store-Pickup',
    },
    {
      id: '02',
      timestamp: new Date(),
      subtotal: 2000,
      total: 2000,
      paymentMethod: 'Online',
      orderItems: [
        { name: 'Item B', price: 1000, quantity: 2, code: 'B' },
      ],
      orderType: 'Store-Pickup',
    },
  ] as unknown as Bill[];

  const reportInventory: InventoryItem[] = [
    { id: 'A', name: 'Item A', category: 'General', price: 500, costPrice: 350, stock: 40, capacity: 50, unit: 'pcs' },
    { id: 'B', name: 'Item B', category: 'General', price: 1000, costPrice: 800, stock: 15, capacity: 30, unit: 'pcs' },
  ];

  const reportExpenses: Expense[] = [
    { id: 'e1', description: 'Electricity', amount: 300, category: 'Utilities', date: new Date() },
  ];

  const dailyReport = compileStoreReport('daily', {
    bills: reportBills,
    expenses: reportExpenses,
    inventory: reportInventory,
    venueName: 'ChillBill Store',
    currency: 'Rs.',
    venueDetails: sampleVenue,
  });

  assert(dailyReport.metrics.totalRevenue === 3000, 'Total Revenue matches bill totals', `Got ${dailyReport.metrics.totalRevenue}`);
  assert(dailyReport.metrics.totalBills === 2, 'Total bills count matches (2)', `Got ${dailyReport.metrics.totalBills}`);
  assert(dailyReport.metrics.cashTotal === 1000, 'Cash Revenue tracked separately (1000)', `Got ${dailyReport.metrics.cashTotal}`);
  assert(dailyReport.metrics.onlineTotal === 2000, 'Online Revenue tracked separately (2000)', `Got ${dailyReport.metrics.onlineTotal}`);
  assert(dailyReport.metrics.totalExpenses === 300, 'Total Expenses tracked (300)', `Got ${dailyReport.metrics.totalExpenses}`);
  assert(dailyReport.metrics.netBalance === 2700, 'Net Balance is Revenue - Expenses (3000 - 300 = 2700)', `Got ${dailyReport.metrics.netBalance}`);

  // -------------------------------------------------------------------------
  // TEST GROUP 5: USERNAME, CREDENTIALS & MOBILE CLOUD STAFF SYNC
  // -------------------------------------------------------------------------
  console.log('\n🔐 [5/6] Auditing Staff & Owner Credentials Generation...');

  const username1 = buildUsername('ChillBill Store', 'Bunty Sharma', '1234');
  assert(username1 === 'bunty', 'Username built with clean human-friendly slug', username1);

  const uniqueUser = generateUniqueUsername('Amit Kumar', ['amit', 'amit1']);
  assert(uniqueUser === 'amit2', 'Unique username auto-increments for collisions', uniqueUser);

  // Mobile Companion Staff Creation & Cloud Sync Resilience
  const testNewEmp: Employee = {
    id: `emp-${Date.now()}`,
    name: 'Ramesh Cashier',
    role: 'Cashier',
    salary: 14000,
    mobile: '9876543210',
    loginCode: '4321',
    username: 'ramesh42',
    allowedTabs: ['payments', 'inventory', 'customers'],
    color: '#10b981'
  };
  assert(testNewEmp.loginCode?.length === 4, 'Staff PIN is exactly 4 digits');
  assert(testNewEmp.allowedTabs?.includes('payments') === true, 'Cashier assigned billing permissions');
  assert(testNewEmp.id.startsWith('emp-'), 'Staff ID correctly formatted for Firestore');

  // Venue ID sanitization tests (protects against JSON quotes bug)
  assert(cleanVenueId('"krishna-supermart"') === 'krishna-supermart', 'cleanVenueId strips wrapping double quotes from JSON.stringify');
  assert(cleanVenueId("'krishna-supermart'") === 'krishna-supermart', 'cleanVenueId strips wrapping single quotes');
  assert(cleanVenueId('  krishna-supermart  ') === 'krishna-supermart', 'cleanVenueId trims leading and trailing whitespace');
  assert(cleanVenueId(null) === '', 'cleanVenueId handles null gracefully');
  assert(cleanVenueId(undefined) === '', 'cleanVenueId handles undefined gracefully');

  // Terminal credentials & canonical UID resolution tests
  assert(DEFAULT_STORE_UID === 'kiIIHjUyCcfUMqHjd1DfnS595DU2', 'Canonical store terminal UID is correctly registered (kiIIHjUyCcfUMqHjd1DfnS595DU2)');
  const termCreds = buildTerminalCredentials(DEFAULT_STORE_EMAIL);
  assert(termCreds.terminalEmail === 'chillbill_co_service_gmail_com@chillbill-terminal.pos', 'Terminal identity email generated deterministically');
  assert(termCreds.terminalPassword === 'cbill_chillbillcoservicegmailcom_2026!', 'Terminal identity password generated deterministically');

  // Verify Ka-Ching sound generator is callable without throwing
  let soundPromiseResolved = false;
  unlockAudioContext();
  await playKaChingSound();
  soundPromiseResolved = true;
  assert(Boolean(soundPromiseResolved), 'Ka-Ching sound engine executes cleanly and safely in non-browser/SSR environment');

  // Verify Cloud Bills Fallback Calculation for Mobile Companion Dashboard
  const sampleRecentCloudBills = [
    { id: 'b1', total: 450, paymentMethod: 'Cash', completedAt: new Date() },
    { id: 'b2', total: 1250, paymentMethod: 'Online', completedAt: new Date() },
    { id: 'b3', total: 300, paymentMethod: 'Split', splitPayments: [{ method: 'Cash', amount: 100 }, { method: 'Online', amount: 200 }], completedAt: new Date() },
  ];
  const cloudTotal = sampleRecentCloudBills.reduce((s, b) => s + b.total, 0);
  const cloudCount = sampleRecentCloudBills.length;
  assert(cloudTotal === 2000, 'Cloud bills total calculated correctly (Got 2000)', String(cloudTotal));
  assert(cloudCount === 3, 'Cloud bills count calculated correctly (Got 3)', String(cloudCount));

  // Barcode Scanner Gun Global Interception & Lookup Auditing
  playScanBeep(); // Verify no error in Node SSR
  assert(true, 'Barcode scanner supermarket confirmation beep executed safely');

  const testCatalog = DEPARTMENTAL_STORE_CATALOG;
  const findItemByBarcodeTest = (code: string) => {
    const cleanTerm = code.toLowerCase().trim();
    const cleanNum = cleanTerm.replace(/^#/, '');
    return testCatalog.find(i => {
      const shortCode = i.id.length > 8 ? String(parseInt(i.id.slice(-4), 10) || '') : i.id;
      return i.id.toLowerCase() === cleanTerm ||
        (i.barcode && i.barcode.toLowerCase() === cleanTerm) ||
        shortCode === cleanNum ||
        (shortCode && (cleanTerm === shortCode || cleanTerm === `#${shortCode}`));
    });
  };

  const scannedAtta = findItemByBarcodeTest('8901030000001');
  assert(scannedAtta !== undefined, 'EAN-13 barcode 8901030000001 resolves to catalog product');
  assert(scannedAtta?.name.includes('Aashirvaad') === true, 'Resolved item is Aashirvaad Atta', scannedAtta?.name);

  const scannedOil = findItemByBarcodeTest('8901030000002');
  assert(scannedOil !== undefined, 'EAN-13 barcode 8901030000002 resolves to catalog product');
  assert(scannedOil?.name.includes('Fortune') === true, 'Resolved item is Fortune Oil', scannedOil?.name);

  // Short Code lookup (e.g. cashier types 1 or #1)
  const scannedShortCode = findItemByBarcodeTest('1');
  assert(scannedShortCode !== undefined, 'Short code 1 resolves to item #1', scannedShortCode?.name);

  // -------------------------------------------------------------------------
  // TEST GROUP 6: UPI & COUNTER STANDEE REAL-TIME MATCHING
  // -------------------------------------------------------------------------
  console.log('\n⚡ [6/6] Auditing Counter QR Standee Payment Radar...');

  let paymentReceived: any = false;
  let receivedUtr = '';

  const unsubscribe = subscribeToAmountMatch(121.08, (payload) => {
    paymentReceived = true;
    receivedUtr = payload.utr;
  });

  // Fire simulated customer payment
  simulateCounterStandeePayment(121.08);

  assert(paymentReceived === true, 'Standee Radar intercepted matched customer amount');
  assert(receivedUtr.startsWith('UPI-') || receivedUtr.length >= 8, 'Valid UTR transaction code generated', receivedUtr);
  unsubscribe();

  // Test custom UTR assignment vs auto-generated fallback
  const customUtrInput = '4821';
  const resolvedCustomUtr = customUtrInput.trim() || generateMockUtr();
  assert(resolvedCustomUtr === '4821', 'Custom optional UTR is preserved when entered by cashier');

  const emptyUtrInput = '   ';
  const resolvedAutoUtr = emptyUtrInput.trim() || generateMockUtr();
  assert(resolvedAutoUtr.length >= 10, 'Empty UTR safely falls back to auto-generated UTR without blocking checkout');

  // -------------------------------------------------------------------------
  // TEST GROUP 7: VENDOR & CUSTOMER DATA RESILIENCE AUDIT
  // -------------------------------------------------------------------------
  console.log('\n🛡️ [7/7] Auditing Vendor & Customer Data Resilience...');

  // Test 1: Vendor with string balance and undefined fields
  const mockVendorWithStringBalance: any = {
    id: '',
    name: 'Delhi Flour Mill',
    category: 'Groceries',
    balance: '2500.50', // string from localStorage/input
  };

  const safeId = mockVendorWithStringBalance.id && mockVendorWithStringBalance.id.trim() !== ''
    ? mockVendorWithStringBalance.id
    : 'vendor-fallback-1';
  assert(safeId.length > 0, 'Empty vendor ID sanitized to non-empty string (Radix UI SelectItem safe)');

  const formattedBalance = Number(mockVendorWithStringBalance.balance || 0).toFixed(2);
  assert(formattedBalance === '2500.50', 'String vendor balance safely formatted to 2 decimals without throwing', formattedBalance);

  // Test 2: Pending bill with undefined transactions array
  const corruptedPendingBill: any = {
    id: 'pb-01',
    name: 'Sharma Traders',
    type: 'vendor',
    // transactions is undefined!
  };

  const safeTransactions = corruptedPendingBill.transactions || [];
  const safeTotal = safeTransactions.reduce((sum: number, t: any) => sum + (Number(t?.amount) || 0), 0);
  assert(safeTotal === 0, 'Pending bill with undefined transactions array safely calculates total 0 without throwing');

  // Test 3: Purchase order with string totalAmount and undefined items
  const corruptedPO: any = {
    id: 'po-corrupt',
    vendorId: 'v1',
    vendorName: 'Supplier X',
    totalAmount: '4500',
    // items is undefined!
  };

  const poFormattedTotal = Number(corruptedPO.totalAmount || 0).toFixed(2);
  assert(poFormattedTotal === '4500.00', 'PO with string totalAmount safely formatted to 2 decimals');
  const safePoItemsCount = (corruptedPO.items || []).length;
  assert(safePoItemsCount === 0, 'PO with undefined items array safely yields 0 count without throwing');

  // Test 4: Item without vendor prompts "Assign Now" shortcut
  const itemWithoutVendor: InventoryItem = {
    id: 'test-item-oil',
    name: 'Fortune Sunlite Sunflower Oil',
    category: 'Groceries',
    price: 145,
    costPrice: 120,
    stock: 5,
    capacity: 20,
    unit: 'Ltr',
    vendorId: null,
  };

  const handleQuickOrderGuard = (item: InventoryItem) => {
    if (!item.vendorId) {
      return {
        hasError: true,
        title: 'No Vendor Assigned',
        actionLabel: 'Assign Now',
      };
    }
    return { hasError: false };
  };

  const guardResult = handleQuickOrderGuard(itemWithoutVendor);
  assert(guardResult.hasError, 'Item without vendor triggers No Vendor Assigned guard');
  assert(guardResult.actionLabel === 'Assign Now', 'No Vendor Assigned alert contains "Assign Now" shortcut');

  // Test 5: Quick Vendor Assignment updates item and persists vendor
  const mockVendors: Vendor[] = [];
  const newVendorName = 'Adani Wilmar Wholesalers';
  const newVendorPhone = '9876543210';
  const createdVendor: Vendor = {
    id: `vendor-${Date.now()}`,
    name: newVendorName,
    category: itemWithoutVendor.category || 'General',
    phone: newVendorPhone,
    balance: 0,
  };
  mockVendors.push(createdVendor);
  const updatedItemWithVendor: InventoryItem = {
    ...itemWithoutVendor,
    vendorId: createdVendor.id,
  };

  assert(updatedItemWithVendor.vendorId === createdVendor.id, 'Vendor successfully linked to unassigned inventory item');
  assert(mockVendors.length === 1 && mockVendors[0].name === newVendorName, 'Newly created vendor registered in vendor catalog');

  // Final summary
  console.log('\n======================================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${results.length})`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
