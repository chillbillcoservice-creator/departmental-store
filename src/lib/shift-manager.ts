/**
 * ChillBill 360° Shift Handover & Staff Activity Engine
 * Automatically tracks cashier & manager shifts, sales, vendor supply chain operations,
 * customer khata movements, petty cash expenses, and physical drawer reconciliation.
 */

import {
  Employee,
  Bill,
  Expense,
  PurchaseOrder,
  SalesReturn,
  StaffShiftSession,
  ShiftActivityItem,
} from './types';

const ACTIVE_SHIFT_KEY = 'chillbill_active_shift';
const SHIFT_HISTORY_KEY = 'chillbill_shift_history';
const OPENING_FLOAT_KEY = 'pos_opening_float';

export function getOpeningFloatSetting(): number {
  if (typeof window === 'undefined') return 2000;
  try {
    const saved = localStorage.getItem(OPENING_FLOAT_KEY);
    return saved ? parseFloat(saved) : 2000;
  } catch {
    return 2000;
  }
}

export function setOpeningFloatSetting(val: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OPENING_FLOAT_KEY, val.toString());
  } catch {}
}

export function getActiveShift(): StaffShiftSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_SHIFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getOrStartActiveShift(
  employee: Employee,
  customFloat?: number
): StaffShiftSession {
  const current = getActiveShift();
  if (current && current.status === 'Active' && current.employeeId === employee.id) {
    return current;
  }

  const openingFloat = customFloat !== undefined ? customFloat : getOpeningFloatSetting();
  const newShift: StaffShiftSession = {
    id: `shift-${employee.id}-${Date.now()}`,
    employeeId: employee.id,
    employeeName: employee.name,
    employeeRole: employee.role,
    openedAt: new Date().toISOString(),
    openingFloat,
    cashSales: 0,
    onlineSales: 0,
    khataCreditGiven: 0,
    khataCashRecovered: 0,
    khataOnlineRecovered: 0,
    totalSales: 0,
    billsCount: 0,
    itemsSoldCount: 0,
    totalDiscountsGiven: 0,
    cashRefunds: 0,
    refundsCount: 0,
    storeExpenses: 0,
    vendorPaymentsCash: 0,
    vendorPaymentsOnline: 0,
    totalOutflow: 0,
    vendorPOsCreated: [],
    vendorDeliveriesReceived: [],
    expectedCashInDrawer: openingFloat,
    activities: [
      {
        id: `act-${Date.now()}-open`,
        timestamp: new Date().toISOString(),
        type: 'expense',
        title: 'Shift Opened',
        description: `Logged in as ${employee.name} (${employee.role}) with opening float Rs. ${openingFloat}`,
        amount: openingFloat,
        paymentMethod: 'Cash',
      },
    ],
    status: 'Active',
  };

  try {
    localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(newShift));
  } catch {}

  return newShift;
}

export function logShiftActivity(
  activity: Omit<ShiftActivityItem, 'id' | 'timestamp'>
): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getActiveShift();
    if (!current || current.status !== 'Active') return;

    const fullItem: ShiftActivityItem = {
      ...activity,
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    current.activities.unshift(fullItem); // Most recent first
    localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Could not log shift activity:', e);
  }
}

/**
 * Live calculation reconciling bills, POs, expenses, and returns against the active shift
 */
export function calculateShiftSummary(
  shift: StaffShiftSession,
  bills: Bill[],
  expenses: Expense[],
  purchaseOrders: PurchaseOrder[],
  salesReturns: SalesReturn[] = []
): StaffShiftSession {
  const shiftStart = new Date(shift.openedAt).getTime();
  const shiftEnd = shift.closedAt ? new Date(shift.closedAt).getTime() : Date.now();

  // 1. Reconcile Bills attributed to this shift
  const shiftBills = bills.filter((b) => {
    const billTime = new Date(b.timestamp || b.createdAt).getTime();
    if (b.shiftId) return b.shiftId === shift.id;
    if (b.cashierId) return b.cashierId === shift.employeeId && billTime >= shiftStart && billTime <= shiftEnd + 1000;
    return billTime >= shiftStart && billTime <= shiftEnd + 1000;
  });

  let cashSales = 0;
  let onlineSales = 0;
  let khataCreditGiven = 0;
  let totalDiscountsGiven = 0;
  let itemsSoldCount = 0;

  shiftBills.forEach((b) => {
    totalDiscountsGiven += b.discount || 0;
    (b.orderItems || []).forEach((item) => {
      itemsSoldCount += item.quantity || 1;
    });

    if (b.paymentMethod === 'Cash') {
      cashSales += b.total || 0;
    } else if (b.paymentMethod === 'Online') {
      onlineSales += b.total || 0;
    } else if (b.paymentMethod === 'Split' && b.splitPayments) {
      b.splitPayments.forEach((p) => {
        if (p.method === 'Cash') cashSales += p.amount || 0;
        else if (p.method === 'Online') onlineSales += p.amount || 0;
        else if (p.method === 'Credit') khataCreditGiven += p.amount || 0;
      });
    }
  });

  const totalSales = cashSales + onlineSales + khataCreditGiven;
  const billsCount = shiftBills.length;

  // 2. Reconcile Sales Returns
  const shiftReturns = salesReturns.filter((r) => {
    const retTime = new Date(r.timestamp).getTime();
    return retTime >= shiftStart && retTime <= shiftEnd + 1000;
  });
  const cashRefunds = shiftReturns.reduce(
    (acc, r) => acc + (r.refundMethod === 'Cash' ? r.totalRefundAmount || 0 : 0),
    0
  );
  const refundsCount = shiftReturns.length;

  // 3. Reconcile Khata dues collected from activity log
  let khataCashRecovered = 0;
  let khataOnlineRecovered = 0;
  (shift.activities || []).forEach((act) => {
    if (act.type === 'khata_collection') {
      if (act.paymentMethod === 'Cash') khataCashRecovered += act.amount || 0;
      else khataOnlineRecovered += act.amount || 0;
    }
  });

  // 4. Reconcile Store Expenses & Vendor Payments
  const shiftExpenses = expenses.filter((e) => {
    const expTime = new Date(e.date).getTime();
    if (e.shiftId) return e.shiftId === shift.id;
    return expTime >= shiftStart && expTime <= shiftEnd + 1000;
  });

  let storeExpenses = 0;
  let vendorPaymentsCash = 0;
  let vendorPaymentsOnline = 0;

  shiftExpenses.forEach((e) => {
    const isVendor = Boolean(e.vendorId) || e.category === 'Vendor Payment' || e.category === 'Stock Purchase';
    const isCash = e.paymentMethod === 'Cash' || !e.paymentMethod; // default out-of-pocket is cash

    if (isVendor) {
      if (isCash) vendorPaymentsCash += e.amount || 0;
      else vendorPaymentsOnline += e.amount || 0;
    } else {
      storeExpenses += e.amount || 0;
    }
  });

  // 5. Reconcile Vendor Purchase Orders (Created during shift)
  const vendorPOsCreated: StaffShiftSession['vendorPOsCreated'] = [];
  purchaseOrders.forEach((po) => {
    const poTime = new Date(po.date).getTime();
    const isThisShift = (po.shiftId && po.shiftId === shift.id) || (poTime >= shiftStart && poTime <= shiftEnd + 1000);
    if (isThisShift) {
      vendorPOsCreated.push({
        poId: po.id,
        referenceNo: po.referenceNo,
        vendorName: po.vendorName,
        totalAmount: po.totalAmount,
        itemsCount: (po.items || []).length,
        date: po.date,
      });
    }
  });

  // 6. Reconcile Vendor Deliveries Received during shift
  const vendorDeliveriesReceived: StaffShiftSession['vendorDeliveriesReceived'] = [];
  purchaseOrders.forEach((po) => {
    if (po.status === 'Received') {
      const recTime = po.receivedDate ? new Date(po.receivedDate).getTime() : new Date(po.date).getTime();
      const isThisShift = recTime >= shiftStart && recTime <= shiftEnd + 1000;
      if (isThisShift) {
        vendorDeliveriesReceived.push({
          poId: po.id,
          referenceNo: po.referenceNo,
          vendorName: po.vendorName,
          receivedValue: po.totalAmount,
          paidAmount: po.paidAmount || 0,
          date: po.receivedDate || po.date,
        });
      }
    }
  });

  // 7. Dynamic Expected Cash Formula
  const openingFloat = shift.openingFloat || 0;
  const cashInflow = cashSales + khataCashRecovered;
  const cashOutflow = cashRefunds + storeExpenses + vendorPaymentsCash;
  const expectedCashInDrawer = openingFloat + cashInflow - cashOutflow;

  const durationMinutes = Math.max(
    1,
    Math.round((shiftEnd - shiftStart) / (1000 * 60))
  );

  return {
    ...shift,
    durationMinutes,
    cashSales,
    onlineSales,
    khataCreditGiven,
    khataCashRecovered,
    khataOnlineRecovered,
    totalSales,
    billsCount,
    itemsSoldCount,
    totalDiscountsGiven,
    cashRefunds,
    refundsCount,
    storeExpenses,
    vendorPaymentsCash,
    vendorPaymentsOnline,
    totalOutflow: cashOutflow,
    vendorPOsCreated,
    vendorDeliveriesReceived,
    expectedCashInDrawer,
  };
}

export function completeShiftSession(
  actualCashCounted: number,
  handoverNotes?: string
): StaffShiftSession | null {
  if (typeof window !== 'undefined') {
    try {
      const current = getActiveShift();
      if (!current) return null;

      const closedAt = new Date().toISOString();
      const shiftStart = new Date(current.openedAt).getTime();
      const shiftEnd = new Date(closedAt).getTime();
      const durationMinutes = Math.max(1, Math.round((shiftEnd - shiftStart) / (1000 * 60)));

      const expected = current.expectedCashInDrawer || current.openingFloat || 0;
      const difference = actualCashCounted - expected;

      const completedShift: StaffShiftSession = {
        ...current,
        status: 'Completed',
        closedAt,
        durationMinutes,
        actualCashCounted,
        cashDifference: difference,
        handoverNotes: handoverNotes || '',
      };

      // Push into permanent history
      const history = getShiftHistory();
      history.unshift(completedShift);
      localStorage.setItem(SHIFT_HISTORY_KEY, JSON.stringify(history.slice(0, 100))); // keep last 100 shifts
      localStorage.removeItem(ACTIVE_SHIFT_KEY);

      return completedShift;
    } catch (e) {
      console.error('Error completing shift:', e);
    }
  }
  return null;
}

export function getShiftHistory(): StaffShiftSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SHIFT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function formatDuration(minutes?: number): string {
  if (!minutes || minutes < 1) return '0h 0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export function formatShiftWhatsAppText(
  session: StaffShiftSession,
  venueName = 'ChillBill Supermarket',
  currency = 'Rs.'
): string {
  const openTime = new Date(session.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const closeTime = session.closedAt
    ? new Date(session.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Now';
  const duration = formatDuration(session.durationMinutes);
  const diff = session.cashDifference || 0;
  const diffText = diff === 0 ? 'Balanced ✅' : diff > 0 ? `+${currency} ${diff.toFixed(2)} Surplus 🟢` : `-${currency} ${Math.abs(diff).toFixed(2)} Shortage 🔴`;

  let text = `📊 *${venueName.toUpperCase()} SHIFT HANDOVER REPORT*
👤 *Staff:* ${session.employeeName} (${session.employeeRole})
⏱️ *Shift Time:* ${openTime} - ${closeTime} (${duration})

💰 *SALES SUMMARY:*
• Total Bills: ${session.billsCount}
• Items Sold: ${session.itemsSoldCount}
• Net Sales: ${currency} ${(session.totalSales || 0).toFixed(2)}
• Cash Sales: ${currency} ${(session.cashSales || 0).toFixed(2)}
• UPI / QR Standee: ${currency} ${(session.onlineSales || 0).toFixed(2)}
• Khata (Udhaar Given): ${currency} ${(session.khataCreditGiven || 0).toFixed(2)}
• Discounts Given: ${currency} ${(session.totalDiscountsGiven || 0).toFixed(2)}`;

  if (session.khataCashRecovered > 0 || session.khataOnlineRecovered > 0) {
    text += `\n\n📥 *CUSTOMER KHATA RECOVERED:*
• Cash: ${currency} ${(session.khataCashRecovered || 0).toFixed(2)}
• Online: ${currency} ${(session.khataOnlineRecovered || 0).toFixed(2)}`;
  }

  if (session.vendorPOsCreated?.length > 0 || session.vendorDeliveriesReceived?.length > 0 || session.vendorPaymentsCash > 0) {
    text += `\n\n🚚 *VENDOR & SUPPLY CHAIN:*`;
    if (session.vendorPOsCreated?.length > 0) {
      text += `\n• POs Placed: ${session.vendorPOsCreated.length} orders`;
      session.vendorPOsCreated.forEach((po) => {
        text += `\n  - ${po.vendorName} (${po.referenceNo}): ${currency} ${po.totalAmount.toFixed(2)}`;
      });
    }
    if (session.vendorDeliveriesReceived?.length > 0) {
      text += `\n• Deliveries Received: ${session.vendorDeliveriesReceived.length}`;
      session.vendorDeliveriesReceived.forEach((grn) => {
        text += `\n  - ${grn.vendorName} (${grn.referenceNo}): ${currency} ${grn.receivedValue.toFixed(2)}`;
      });
    }
    if (session.vendorPaymentsCash > 0 || session.vendorPaymentsOnline > 0) {
      text += `\n• Vendor Paid: Cash ${currency} ${session.vendorPaymentsCash.toFixed(2)}, Online ${currency} ${session.vendorPaymentsOnline.toFixed(2)}`;
    }
  }

  if (session.storeExpenses > 0) {
    text += `\n\n📉 *STORE EXPENSES:* ${currency} ${session.storeExpenses.toFixed(2)}`;
  }

  if (session.cashRefunds > 0) {
    text += `\n\n🔄 *REFUNDS ISSUED:* ${currency} ${session.cashRefunds.toFixed(2)} (${session.refundsCount} items)`;
  }

  text += `\n\n🏦 *GALLA / CASH DRAWER TALLY:*
• Opening Float: ${currency} ${(session.openingFloat || 0).toFixed(2)}
• Expected Cash: ${currency} ${(session.expectedCashInDrawer || 0).toFixed(2)}
• Counted Cash: ${currency} ${(session.actualCashCounted ?? session.expectedCashInDrawer ?? 0).toFixed(2)}
• Discrepancy: ${diffText}`;

  if (session.handoverNotes) {
    text += `\n\n📝 *Notes:* ${session.handoverNotes}`;
  }

  return encodeURIComponent(text);
}

export function generateShiftReceiptText(
  session: StaffShiftSession,
  venueDetails: any,
  currency = 'Rs.'
): string {
  const storeName = (venueDetails?.name || 'CHILLBILL SUPERMARKET').toUpperCase();
  const openTime = new Date(session.openedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  const closeTime = session.closedAt
    ? new Date(session.closedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
    : 'In Progress';
  const duration = formatDuration(session.durationMinutes);
  const diff = session.cashDifference || 0;
  const diffStr = diff === 0 ? '0.00 (BALANCED)' : diff > 0 ? `+${diff.toFixed(2)} (SURPLUS)` : `${diff.toFixed(2)} (SHORTAGE)`;

  let lines = [
    '================================',
    storeName.padStart((32 + storeName.length) / 2).padEnd(32),
    '   SHIFT HANDOVER REPORT (X-REPORT)   ',
    '================================',
    `Staff:   ${session.employeeName} (${session.employeeRole})`,
    `Opened:  ${openTime}`,
    `Closed:  ${closeTime}`,
    `Duration: ${duration}`,
    '--------------------------------',
    'SALES SUMMARY:',
    `Bills Created:           ${session.billsCount.toString().padStart(7)}`,
    `Items Sold:              ${session.itemsSoldCount.toString().padStart(7)}`,
    `Gross Revenue:   ${currency} ${(session.totalSales || 0).toFixed(2).padStart(11)}`,
    `Discounts Given: -${currency} ${(session.totalDiscountsGiven || 0).toFixed(2).padStart(10)}`,
    '--------------------------------',
    'PAYMENT BREAKDOWN:',
    `Cash Sales:      ${currency} ${(session.cashSales || 0).toFixed(2).padStart(11)}`,
    `UPI / QR Standee: ${currency} ${(session.onlineSales || 0).toFixed(2).padStart(10)}`,
    `Customer Khata:  ${currency} ${(session.khataCreditGiven || 0).toFixed(2).padStart(11)}`,
  ];

  if (session.khataCashRecovered > 0) {
    lines.push(`Khata Cash Rec.: ${currency} ${session.khataCashRecovered.toFixed(2).padStart(11)}`);
  }

  if (session.vendorPOsCreated?.length > 0 || session.vendorDeliveriesReceived?.length > 0 || session.vendorPaymentsCash > 0) {
    lines.push('--------------------------------');
    lines.push('VENDOR SUPPLY CHAIN:');
    if (session.vendorPOsCreated?.length > 0) {
      lines.push(`POs Placed:              ${session.vendorPOsCreated.length.toString().padStart(7)}`);
    }
    if (session.vendorDeliveriesReceived?.length > 0) {
      lines.push(`Deliveries Received:     ${session.vendorDeliveriesReceived.length.toString().padStart(7)}`);
    }
    if (session.vendorPaymentsCash > 0) {
      lines.push(`Vendor Cash Paid: ${currency} ${session.vendorPaymentsCash.toFixed(2).padStart(10)}`);
    }
  }

  if (session.storeExpenses > 0) {
    lines.push(`Store Expenses: -${currency} ${session.storeExpenses.toFixed(2).padStart(11)}`);
  }

  if (session.cashRefunds > 0) {
    lines.push(`Cash Refunds:   -${currency} ${session.cashRefunds.toFixed(2).padStart(11)}`);
  }

  lines.push('--------------------------------');
  lines.push('GALLA CASH RECONCILIATION:');
  lines.push(`Opening Float:   ${currency} ${(session.openingFloat || 0).toFixed(2).padStart(11)}`);
  lines.push(`Expected Cash:   ${currency} ${(session.expectedCashInDrawer || 0).toFixed(2).padStart(11)}`);
  lines.push(`Counted Cash:    ${currency} ${(session.actualCashCounted ?? session.expectedCashInDrawer ?? 0).toFixed(2).padStart(11)}`);
  lines.push(`Discrepancy:     ${currency} ${diffStr.padStart(11)}`);
  lines.push('================================');
  lines.push('');
  lines.push('Staff Signature:');
  lines.push('________________________________');
  lines.push('');
  lines.push('Relieving Manager Signature:');
  lines.push('________________________________');
  lines.push('================================');

  return lines.join('\n');
}
