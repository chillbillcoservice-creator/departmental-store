import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipientEmail, subject, reportContent, resendApiKey } = body;

    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, message: 'Recipient email is required.' },
        { status: 400 }
      );
    }

    if (!reportContent) {
      return NextResponse.json(
        { success: false, message: 'Report content is required.' },
        { status: 400 }
      );
    }

    const apiKey = resendApiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          requiresApiKey: true,
          message:
            'Resend API key is not configured. You can add your free key in Admin Settings or send via the 1-click mail compose button.',
        },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: 'ChillBill Reports <onboarding@resend.dev>',
      to: recipientEmail,
      subject: subject || 'Store Performance Report',
      text: reportContent,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">${subject || 'Store Performance Report'}</h2>
          <pre style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: #1e293b;">${reportContent}</pre>
          <div style="margin-top: 24px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <p style="margin: 0;">Stay Chill. Bill Smarter. &bull; ChillBill Reports</p>
          </div>
        </div>
      `,
    });

    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Report successfully emailed to ${recipientEmail} in background.`,
      emailId: result.data?.id,
    });
  } catch (error: any) {
    console.error('Error in send-email API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to send email.' },
      { status: 500 }
    );
  }
}
