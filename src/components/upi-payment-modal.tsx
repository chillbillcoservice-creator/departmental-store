"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, QrCode, Sparkles, Volume2, ShieldCheck, Clock, Zap } from 'lucide-react';
import { generateUpiQrDataUrl } from '@/lib/upi-qr';
import { subscribeToPayment, simulateCustomerPayment, PaymentEventPayload } from '@/lib/payment-listener';
import { triggerSoundboxAlert } from '@/lib/soundbox';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language-context';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  currency?: string;
  storeVpa?: string;
  merchantName?: string;
  soundboxEnabled?: boolean;
  soundboxVoice?: 'en' | 'hi';
  onPaymentVerified: (payload: { amount: number; utr: string; transactionId: string }) => void;
}

export function UpiPaymentModal({
  isOpen,
  onOpenChange,
  total,
  currency = 'Rs.',
  storeVpa,
  merchantName = 'Departmental Store',
  soundboxEnabled = true,
  soundboxVoice = 'en',
  onPaymentVerified,
}: UpiPaymentModalProps) {
  const { t } = useLanguage();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(180); // 3 minutes countdown
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [verifiedUtr, setVerifiedUtr] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const autoFinishTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeVpa = storeVpa && storeVpa.trim() ? storeVpa.trim() : 'store@icici';
  const activeMerchantName = merchantName && merchantName.trim() ? merchantName.trim() : 'Supermarket';

  // Initialize or reset session when modal opens
  useEffect(() => {
    if (!isOpen) {
      if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);
      setIsSuccess(false);
      setVerifiedUtr('');
      setQrDataUrl('');
      setIsSimulating(false);
      return;
    }

    // Generate unique transaction reference for this specific bill
    const uniqueTxn = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setTransactionId(uniqueTxn);
    setTimeLeft(180);
    setIsSuccess(false);
    setVerifiedUtr('');

    // Generate Dynamic QR Code
    generateUpiQrDataUrl({
      vpa: activeVpa,
      payeeName: activeMerchantName,
      amount: total,
      transactionRef: uniqueTxn,
      transactionNote: `Bill ${uniqueTxn.slice(-6)}`,
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error('Error generating UPI QR code:', err));

    // Subscribe to Real-Time Payment Listener
    const unsubscribe = subscribeToPayment(uniqueTxn, (payload: PaymentEventPayload) => {
      if (payload.status === 'SUCCESS') {
        handlePaymentSuccess(payload);
      }
    });

    return () => {
      unsubscribe();
      if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);
    };
  }, [isOpen, total, activeVpa, activeMerchantName]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || isSuccess || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isSuccess, timeLeft]);

  const handlePaymentSuccess = async (payload: PaymentEventPayload) => {
    if (isSuccess) return; // Prevent double trigger
    setIsSuccess(true);
    setVerifiedUtr(payload.utr || 'UTR' + Date.now().toString().slice(-8));

    // 1. Play in-software soundbox chime & voice announcement
    try {
      await triggerSoundboxAlert(total, {
        enabled: soundboxEnabled,
        voice: soundboxVoice,
      });
    } catch (e) {
      console.warn('Soundbox audio notice:', e);
    }

    // 2. Auto-complete bill after customer/cashier gets confirmation
    autoFinishTimerRef.current = setTimeout(() => {
      onPaymentVerified({
        amount: total,
        utr: payload.utr || verifiedUtr || 'UTR' + Date.now().toString().slice(-8),
        transactionId: payload.transactionId,
      });
      onOpenChange(false);
    }, 1400);
  };

  const handleSimulatePayment = () => {
    if (isSuccess || isSimulating || !transactionId) return;
    setIsSimulating(true);
    setTimeout(() => {
      simulateCustomerPayment(transactionId, total);
      setIsSimulating(false);
    }, 400);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl border-2 shadow-2xl bg-card">
        <DialogHeader className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="p-2 bg-primary/10 rounded-xl text-primary">
              <QrCode className="h-6 w-6" />
            </span>
            <DialogTitle className="text-xl font-black">
              {t("Dynamic UPI QR Payment")}
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            {t("Accept payments from Google Pay, PhonePe, Paytm, BHIM & all UPI apps")}
          </p>
        </DialogHeader>

        {isSuccess ? (
          /* SUCCESS STATE - Auto Verified */
          <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 border-4 border-emerald-500/30 shadow-lg animate-bounce">
              <CheckCircle2 className="h-12 w-12" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" />
                {t("Payment Verified Instantly")}
              </div>
              <p className="text-3xl font-black text-emerald-600 pt-1">
                {currency}{total.toFixed(2)}
              </p>
              <p className="text-xs font-mono font-bold text-muted-foreground">
                UTR: {verifiedUtr}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/50 px-4 py-2 rounded-xl">
              <Volume2 className="h-4 w-4 text-primary animate-pulse" />
              <span>{soundboxVoice === 'hi' ? 'साउंडबॉक्स उद्घोषणा सक्रिय...' : 'Soundbox Voice Alert Played...'}</span>
            </div>

            <Button
              onClick={() => {
                if (autoFinishTimerRef.current) clearTimeout(autoFinishTimerRef.current);
                onPaymentVerified({
                  amount: total,
                  utr: verifiedUtr,
                  transactionId,
                });
                onOpenChange(false);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 rounded-xl text-sm shadow-md"
            >
              {t("Complete Bill Now")}
            </Button>
          </div>
        ) : (
          /* ACTIVE LISTENING STATE */
          <div className="space-y-4 pt-2">
            {/* Amount Banner */}
            <div className="text-center py-2.5 bg-primary/5 rounded-2xl border border-primary/15">
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                {t("Exact Amount to Pay")}
              </p>
              <p className="text-3xl font-black text-primary">
                {currency}{total.toFixed(2)}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="relative flex flex-col items-center justify-center p-4 bg-white dark:bg-white rounded-2xl shadow-inner border border-border">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Dynamic UPI QR Code"
                  className="w-56 h-56 object-contain rounded-lg"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Supported Apps strip */}
              <div className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                GPay • PhonePe • Paytm • BHIM • Cred
              </div>
            </div>

            {/* Live Listener Status & Countdown */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-xl text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-foreground">{t("Listening for real-time payment...")}</span>
              </div>

              <div className="flex items-center gap-1 font-mono text-muted-foreground text-xs">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            </div>

            {/* Payee Info */}
            <div className="text-center text-[11px] text-muted-foreground space-y-0.5">
              <div>
                Payee: <span className="font-bold text-foreground">{activeMerchantName}</span>
              </div>
              <div className="font-mono text-[10px]">
                UPI VPA: <span className="font-bold">{activeVpa}</span>
              </div>
            </div>

            {/* Interactive Sandbox Test Button */}
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleSimulatePayment}
                disabled={isSimulating}
                className={cn(
                  "w-full h-11 border-dashed border-2 font-black text-xs gap-2 rounded-xl transition-all",
                  "border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary"
                )}
              >
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                {isSimulating ? t("Simulating Customer Payment...") : t("⚡ Test: Simulate Customer Scan & Pay")}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                {t("Click the test button above to test the instant auto-detection & Soundbox announcement.")}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
