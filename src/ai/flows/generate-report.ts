'use server';
/**
 * @fileOverview A flow to generate and email sales and staff reports for a departmental store by fetching data from Firestore.
 *
 * - generateAndSendReport - A function that fetches data, compiles a report, and emails it.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmailReceipt } from './send-email-receipt';
import { GenerateReportInputSchema, GenerateReportOutputSchema, type GenerateReportInput, type GenerateReportOutput, type Bill, type Employee, type Expense, type PendingBill, type Attendance, type Advance, type InventoryItem, type Customer } from '@/lib/types';
import { getFirestore, getDoc, doc, collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const ReportOutputSchema = z.object({
  reportTitle: z.string().describe('The title of the report (e.g., "Daily Store Sales Report").'),
  reportContent: z.string().describe('The full report content, formatted nicely for an email body.'),
  totalRevenue: z.number().describe('The total revenue for the period.'),
});

const generateReportPrompt = ai.definePrompt({
  name: 'generateReportPrompt',
  input: { schema: GenerateReportInputSchema },
  output: { schema: ReportOutputSchema },
  prompt: `You are an expert financial analyst for a retail departmental store and supermarket. Your task is to generate a comprehensive business report based on the provided store data. The report should be clear, professional, concise, and ready to be emailed to the store owner.

Report Type: {{{reportType}}}
Recipient: {{{recipientEmail}}}
Currency: {{{currency}}}
Current Date: ${new Date().toDateString()}

Filter the provided data based on the report type.
- For a 'daily' report, only include data from today.
- For a 'monthly' report, only include data from the current month.
- For a 'yearly' report, only include data from the current year.

Your report MUST contain the following sections, in this order:

1.  **Store Sales & Revenue Summary**:
    *   Total number of bills generated.
    *   Total store revenue in the period.
    *   Average transaction / basket size.
    *   Payment mode breakdown (Cash vs Online).

2.  **Top Selling & Fast-Moving Items**:
    *   Identify the highest-selling items by quantity and revenue.

3.  **Customer Khata & Credit Summary**:
    *   Total outstanding khata to collect from customers.
    *   List of top customers with pending udhaar balances.

4.  **Store Expenses**:
    *   Total expenses for the period.
    *   Breakdown by category (Rent, Utilities, Maintenance, Packaging, Tea/Snacks, etc.).

5.  **Vendor Payables & Stock Purchases**:
    *   Total outstanding amount to pay to suppliers/vendors.
    *   List of vendors with pending balances.

6.  **Staff & Attendance Summary**:
    *   Staff attendance status for the period.
    *   Salary advances issued during the period.

7.  **Inventory Alerts**:
    *   List all items that are low in stock (below threshold) or completely out of stock.

Analyze all the provided data to generate the report.

DATA (JSON Format):
- Bill History: {{{json billHistory}}}
- Employee Data: {{{json employees}}}
- Expense History: {{{json expenses}}}
- Pending Bills (Khata & Payables): {{{json pendingBills}}}
- Attendance Records: {{{json attendance}}}
- Salary Advances: {{{json advances}}}
- Inventory Levels: {{{json inventory}}}
- Customer Summary: {{{json customerSummary}}}

Generate the report title and content. The content should be well-formatted for an email. Calculate the total revenue and include it in the designated field. Ensure every section is clearly titled and easy to read. ALL monetary values MUST be formatted with "{{{currency}}}" (e.g. {{{currency}}}1500.00). Do NOT use the '$' symbol (unless the currency is '$').
`,
});

const generateAndSendReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: GenerateReportInputSchema.extend({
      recipientEmails: z.array(z.string().email()),
    }),
    outputSchema: GenerateReportOutputSchema,
  },
  async (input) => {
    const { recipientEmails, ...promptInput } = input;

    if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      throw new Error("No recipient emails provided.");
    }

    const { output } = await generateReportPrompt(promptInput);

    if (!output) {
      throw new Error('Failed to generate report content.');
    }

    const emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2>${output.reportTitle}</h2>
        <div style="white-space: pre-wrap; font-family: monospace; background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #eee;">
          ${output.reportContent}
        </div>
      </div>
    `;

    for (const email of recipientEmails) {
      try {
        await sendEmailReceipt({
          customerEmail: email,
          subject: output.reportTitle,
          receiptContent: output.reportContent,
          totalAmount: output.totalRevenue,
          currency: promptInput.currency,
        });
      } catch (error) {
        console.error(`Failed to send report to ${email}:`, error);
        return {
          success: false,
          message: `Failed to send report to ${email}. Check server logs for details.`,
        };
      }
    }

    return {
      success: true,
      message: `Report successfully sent to ${recipientEmails.join(', ')}.`,
    };
  }
);

export async function generateAndSendReport(input: {
  reportType: 'daily' | 'monthly' | 'yearly';
  recipientEmail: string;
  currency: string;
}): Promise<GenerateReportOutput> {
  const { firestore: db } = initializeFirebase();

  // Fetch recipients from settings
  const venueSettingsDoc = await getDoc(doc(db, "settings", "venue"));
  let additionalEmails: string[] = [];
  if (venueSettingsDoc.exists()) {
    const data = venueSettingsDoc.data();
    if (data.reportRecipients && typeof data.reportRecipients === 'string') {
      additionalEmails = data.reportRecipients.split(',').map((e: string) => e.trim()).filter((e: string) => e);
    }
  }

  const allEmails = [input.recipientEmail, ...additionalEmails];
  const uniqueRecipientEmails = Array.from(new Set(allEmails));

  const billsSnapshot = await getDocs(collection(db, "bills"));
  const billHistory: Bill[] = billsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : new Date(data.completedAt),
    } as unknown as Bill;
  });

  const employeesSnapshot = await getDocs(collection(db, "employees"));
  const employees: Employee[] = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));

  const expensesSnapshot = await getDocs(collection(db, "expenses"));
  const expenses: Expense[] = expensesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
    } as unknown as Expense;
  });

  const pendingBillsSnapshot = await getDocs(collection(db, "pendingBills"));
  const pendingBills: PendingBill[] = pendingBillsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      transactions: (data.transactions || []).map((t: any) => ({
        ...t,
        date: t.date?.toDate ? t.date.toDate() : new Date(t.date),
      }))
    } as unknown as PendingBill;
  });

  const attendanceSnapshot = await getDocs(collection(db, "attendance"));
  const attendance: Attendance[] = attendanceSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
    } as unknown as Attendance;
  });

  const advancesSnapshot = await getDocs(collection(db, "advances"));
  const advances: Advance[] = advancesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
    } as unknown as Advance;
  });

  const inventorySnapshot = await getDocs(collection(db, "inventory"));
  const inventory: InventoryItem[] = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));

  // Compute customer summary from bill history
  const customerMap = new Map<string, Customer>();
  billHistory.forEach(bill => {
    if (bill.customerDetails && bill.customerDetails.phone) {
      const phone = bill.customerDetails.phone;
      const existing = customerMap.get(phone);
      if (existing) {
        existing.totalSpent += bill.total;
        existing.totalVisits += 1;
        if (bill.timestamp > existing.lastSeen) {
          existing.lastSeen = bill.timestamp;
        }
        if (bill.timestamp < existing.firstSeen) {
          existing.firstSeen = bill.timestamp;
        }
      } else {
        customerMap.set(phone, {
          id: phone,
          name: bill.customerDetails.name,
          phone: bill.customerDetails.phone,
          address: bill.customerDetails.address,
          totalSpent: bill.total,
          totalVisits: 1,
          firstSeen: bill.timestamp,
          lastSeen: bill.timestamp,
        });
      }
    }
  });
  const customerSummary: Customer[] = Array.from(customerMap.values());

  const serializableInput: GenerateReportInput & { recipientEmails: string[] } = {
    reportType: input.reportType,
    recipientEmail: uniqueRecipientEmails.join(', '),
    recipientEmails: uniqueRecipientEmails,
    currency: input.currency,
    billHistory: billHistory.map(bill => ({
      ...bill,
      id: bill.id,
      total: bill.total,
      timestamp: bill.timestamp.toISOString(),
      orderItems: bill.orderItems.map(item => ({
        ...item,
        history: (item.history || []).map(h => ({ ...h, changedAt: h.changedAt.toISOString() }))
      }))
    })),
    employees,
    expenses: expenses.map(e => ({ ...e, date: e.date.toISOString() })),
    pendingBills: pendingBills.map(pb => ({
      ...pb,
      transactions: pb.transactions.map(tx => ({ ...tx, date: tx.date.toISOString() }))
    })),
    attendance: attendance.map(a => ({ ...a, date: a.date.toISOString() })),
    advances: advances.map(adv => ({ ...adv, date: adv.date.toISOString() })),
    inventory,
    customerSummary: customerSummary.map(c => ({
      ...c,
      firstSeen: c.firstSeen.toISOString(),
      lastSeen: c.lastSeen.toISOString(),
    })),
  };
  return generateAndSendReportFlow(serializableInput);
}
