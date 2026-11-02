import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { compileStoreReport } from '@/lib/report-generator';
import type { Bill, Expense, InventoryItem, VenueDetails } from '@/lib/types';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

async function getServerFirestore() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);

  if (process.env.FIREBASE_SYSTEM_EMAIL && process.env.FIREBASE_SYSTEM_PASSWORD && !auth.currentUser) {
    try {
      await signInWithEmailAndPassword(
        auth,
        process.env.FIREBASE_SYSTEM_EMAIL,
        process.env.FIREBASE_SYSTEM_PASSWORD
      );
    } catch (authErr) {
      console.warn('Firebase system auth failed in cron route:', authErr);
    }
  }

  return getFirestore(app);
}

export async function GET(request: Request) {
  try {
    const db = await getServerFirestore();

    // 1. Fetch venue settings
    const venueDocRef = doc(db, 'settings', 'venue');
    const venueSnap = await getDoc(venueDocRef);

    let venueData: any = {};
    if (venueSnap.exists()) {
      venueData = venueSnap.data();
    } else {
      // Fallback check in venue collection
      const altSnap = await getDoc(doc(db, 'venue', 'details'));
      if (altSnap.exists()) {
        venueData = altSnap.data();
      }
    }

    const recipientEmail = venueData?.email?.trim();
    const isAutoSendEnabled = venueData?.autoSendDaily === true;
    const resendApiKey = venueData?.resendApiKey || process.env.RESEND_API_KEY;

    // Check if auto-send is enabled and email is configured
    if (!isAutoSendEnabled) {
      return NextResponse.json({
        status: 'skipped',
        message: 'Daily auto-send is turned off in store settings (autoSendDaily is false).',
        timestamp: new Date().toISOString(),
      });
    }

    if (!recipientEmail) {
      return NextResponse.json({
        status: 'skipped',
        message: 'No recipient email configured for store reports.',
        timestamp: new Date().toISOString(),
      });
    }

    if (!resendApiKey) {
      return NextResponse.json({
        status: 'error',
        message:
          'Resend API key is missing. Please add your free Resend API key in Admin Settings or RESEND_API_KEY env variable.',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Fetch bills from Firestore
    const billsSnap = await getDocs(collection(db, 'bills'));
    const bills: Bill[] = billsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : new Date(data.completedAt),
      } as unknown as Bill;
    });

    // 3. Fetch expenses
    const expensesSnap = await getDocs(collection(db, 'expenses'));
    const expenses: Expense[] = expensesSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
      } as unknown as Expense;
    });

    // 4. Fetch inventory
    const inventorySnap = await getDocs(collection(db, 'inventory'));
    const inventory: InventoryItem[] = inventorySnap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as InventoryItem)
    );

    // 5. Compile daily report
    const venueDetails: VenueDetails = {
      name: venueData?.name || 'ChillBill Store',
      address: venueData?.address || '',
      contactNumber: venueData?.contactNumber || '',
      email: recipientEmail,
      currency: venueData?.currency || 'Rs.',
    };

    const report = compileStoreReport('daily', {
      bills,
      expenses,
      inventory,
      venueDetails,
      venueName: venueDetails.name,
      currency: venueDetails.currency || 'Rs.',
    });

    // 6. Send email via Resend
    const resend = new Resend(resendApiKey);
    const sendResult = await resend.emails.send({
      from: 'ChillBill Reports <onboarding@resend.dev>',
      to: recipientEmail,
      subject: report.subject,
      text: report.reportContent,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 20px;">${venueDetails.name}</h2>
            <span style="background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">Daily Closing Report</span>
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Automated daily store closing report generated on <strong>${new Date().toDateString()}</strong>.</p>
          <pre style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: #1e293b; overflow-x: auto;">${report.reportContent}</pre>
          <div style="margin-top: 24px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <p style="margin: 0;">Stay Chill. Bill Smarter. &bull; ChillBill Automated Cloud Dispatch</p>
          </div>
        </div>
      `,
    });

    // 7. Update last sent timestamp in Firestore
    try {
      if (venueSnap.exists()) {
        await updateDoc(venueDocRef, {
          lastDailyReportSentAt: new Date().toISOString(),
          lastDailyReportStatus: 'success',
        });
      }
    } catch (e) {
      console.warn('Could not update lastDailyReportSentAt in Firestore:', e);
    }

    return NextResponse.json({
      status: 'success',
      message: `Daily report successfully dispatched to ${recipientEmail}.`,
      recipientEmail,
      reportSubject: report.subject,
      emailId: sendResult.data?.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in daily report cron:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Internal server error while executing daily report cron.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
