import type { Bill, Expense, InventoryItem, VenueDetails } from './types';

export interface ReportDataInput {
  bills: Bill[];
  expenses: Expense[];
  inventory: InventoryItem[];
  venueDetails: VenueDetails | null;
  venueName?: string;
  currency?: string;
}

export interface GeneratedReport {
  subject: string;
  reportContent: string;
  periodLabel: string;
  metrics: {
    totalRevenue: number;
    totalBills: number;
    cashTotal: number;
    onlineTotal: number;
    avgOrderValue: number;
    totalExpenses: number;
    netBalance: number;
  };
}

function parseToDate(d: any): Date {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  if (typeof d?.toDate === 'function') return d.toDate();
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isSameMonth(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth()
  );
}

function isSameYear(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear();
}

export function compileStoreReport(
  reportType: 'daily' | 'monthly' | 'yearly',
  data: ReportDataInput
): GeneratedReport {
  const now = new Date();
  const currency = data.currency || 'Rs.';
  const storeName = data.venueDetails?.name || data.venueName || 'ChillBill Store';
  const storePhone = data.venueDetails?.contactNumber || '';
  const storeAddress = data.venueDetails?.address || '';

  // 1. Filter bills by selected period
  const filteredBills = (data.bills || []).filter((b) => {
    const bDate = parseToDate(b.timestamp || b.createdAt || b.completedAt);
    if (reportType === 'daily') return isSameDay(bDate, now);
    if (reportType === 'monthly') return isSameMonth(bDate, now);
    return isSameYear(bDate, now);
  });

  // 2. Filter expenses by selected period
  const filteredExpenses = (data.expenses || []).filter((e) => {
    const eDate = parseToDate(e.date);
    if (reportType === 'daily') return isSameDay(eDate, now);
    if (reportType === 'monthly') return isSameMonth(eDate, now);
    return isSameYear(eDate, now);
  });

  // 3. Compute revenue & payment breakdown
  let totalRevenue = 0;
  let cashTotal = 0;
  let onlineTotal = 0;
  const itemMap = new Map<string, { qty: number; revenue: number }>();

  filteredBills.forEach((bill) => {
    const total = bill.total || 0;
    totalRevenue += total;

    if (bill.paymentMethod === 'Cash') {
      cashTotal += total;
    } else if (bill.paymentMethod === 'Online') {
      onlineTotal += total;
    } else if (bill.paymentMethod === 'Split' && bill.splitPayments) {
      bill.splitPayments.forEach((p) => {
        if (p.method === 'Cash') cashTotal += p.amount;
        else onlineTotal += p.amount;
      });
    } else {
      cashTotal += total;
    }

    // Tally items
    (bill.orderItems || []).forEach((item) => {
      const name = item.name || 'Unknown Item';
      const qty = item.quantity || 1;
      const rev = (item.price || 0) * qty;
      const prev = itemMap.get(name) || { qty: 0, revenue: 0 };
      itemMap.set(name, {
        qty: prev.qty + qty,
        revenue: prev.revenue + rev,
      });
    });
  });

  const totalBills = filteredBills.length;
  const avgOrderValue = totalBills > 0 ? totalRevenue / totalBills : 0;

  // 4. Compute expenses by category
  let totalExpenses = 0;
  const expenseCategoryMap = new Map<string, number>();
  filteredExpenses.forEach((exp) => {
    const amount = exp.amount || 0;
    totalExpenses += amount;
    const cat = exp.category || 'General';
    expenseCategoryMap.set(cat, (expenseCategoryMap.get(cat) || 0) + amount);
  });

  const netBalance = totalRevenue - totalExpenses;

  // 5. Fast-moving / Top selling products
  const topItems = Array.from(itemMap.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // 6. Low stock inventory alerts
  const lowStockItems = (data.inventory || [])
    .filter((item) => {
      const stock = item.stock ?? 0;
      const threshold = item.capacity ? item.capacity * 0.2 : 5;
      return stock <= threshold;
    })
    .slice(0, 8);

  // Period label & subject
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const monthStr = now.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const periodLabel =
    reportType === 'daily'
      ? `Daily Report (${dateStr})`
      : reportType === 'monthly'
      ? `Monthly Report (${monthStr})`
      : `Yearly Report (${now.getFullYear()})`;

  const subject = `[${storeName}] ${periodLabel} - ${currency}${totalRevenue.toFixed(2)}`;

  // Build clean plain text report
  const lines: string[] = [];
  lines.push('==================================================');
  lines.push(`STORE PERFORMANCE REPORT: ${periodLabel.toUpperCase()}`);
  lines.push('==================================================');
  lines.push(`Store Name: ${storeName}`);
  if (storePhone) lines.push(`Contact: ${storePhone}`);
  if (storeAddress) lines.push(`Address: ${storeAddress}`);
  lines.push(`Generated: ${dateStr} at ${timeStr}`);
  lines.push('--------------------------------------------------');
  lines.push('');
  lines.push('SALES & REVENUE SUMMARY');
  lines.push(`- Total Bills Generated: ${totalBills}`);
  lines.push(`- Gross Revenue: ${currency}${totalRevenue.toFixed(2)}`);
  lines.push(`- Average Order Value: ${currency}${avgOrderValue.toFixed(2)}`);
  lines.push('');
  lines.push('PAYMENT BREAKDOWN');
  lines.push(`- Cash Collected: ${currency}${cashTotal.toFixed(2)}`);
  lines.push(`- Online / UPI: ${currency}${onlineTotal.toFixed(2)}`);
  lines.push('');
  lines.push('STORE EXPENSES');
  lines.push(`- Total Expenses: ${currency}${totalExpenses.toFixed(2)}`);
  if (expenseCategoryMap.size > 0) {
    expenseCategoryMap.forEach((amt, cat) => {
      lines.push(`  * ${cat}: ${currency}${amt.toFixed(2)}`);
    });
  } else {
    lines.push('  * No expenses recorded in this period.');
  }
  lines.push('');
  lines.push(`NET STORE BALANCE (Sales - Expenses): ${currency}${netBalance.toFixed(2)}`);
  lines.push('--------------------------------------------------');
  lines.push('');
  lines.push('TOP-SELLING PRODUCTS');
  if (topItems.length > 0) {
    topItems.forEach((item, idx) => {
      lines.push(
        `${idx + 1}. ${item.name} — ${item.qty} units (${currency}${item.revenue.toFixed(2)})`
      );
    });
  } else {
    lines.push('No sales recorded in this period.');
  }
  lines.push('');
  lines.push('INVENTORY ALERTS (LOW OR OUT OF STOCK)');
  if (lowStockItems.length > 0) {
    lowStockItems.forEach((item, idx) => {
      lines.push(
        `${idx + 1}. ${item.name} — Only ${item.stock} left in stock`
      );
    });
  } else {
    lines.push('All inventory items are currently well-stocked.');
  }
  lines.push('');
  lines.push('==================================================');
  lines.push('Generated automatically by ChillBill POS');
  lines.push('Stay Chill. Bill Smarter.');
  lines.push('==================================================');

  return {
    subject,
    reportContent: lines.join('\n'),
    periodLabel,
    metrics: {
      totalRevenue,
      totalBills,
      cashTotal,
      onlineTotal,
      avgOrderValue,
      totalExpenses,
      netBalance,
    },
  };
}

export function dispatchReportEmail(params: {
  recipientEmail: string;
  subject: string;
  reportContent: string;
}): { success: boolean; copied: boolean } {
  const { recipientEmail, subject, reportContent } = params;

  let copied = false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(reportContent).then(
      () => {
        copied = true;
      },
      () => {}
    );
  }

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(reportContent);
  const encodedTo = encodeURIComponent(recipientEmail);

  // Gmail Web direct compose URL
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`;
  // Standard mailto link
  const mailtoUrl = `mailto:${encodedTo}?subject=${encodedSubject}&body=${encodedBody}`;

  try {
    const isMobile =
      typeof navigator !== 'undefined' &&
      /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

    if (isMobile) {
      // On mobile devices, mailto immediately invokes the native Gmail / Mail app
      window.location.href = mailtoUrl;
    } else {
      // On desktop, opening Gmail compose is the most reliable
      const win = window.open(gmailComposeUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = mailtoUrl;
      }
    }
  } catch (e) {
    window.location.href = mailtoUrl;
  }

  return { success: true, copied };
}
