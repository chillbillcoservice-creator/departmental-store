"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Wallet, Users2, Layers, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language-context';
import { UpiPaymentModal } from '@/components/upi-payment-modal';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  receiptPreview: string;
  onPaymentSuccess: (
    amountPaid: number,
    customerDetails?: { name: string; phone: string },
    splitDetails?: { cash: number; online: number }
  ) => void;
  onNavigate: (tab: string) => void;
  currency?: string;
  isCashOnly?: boolean;
  initialMode?: 'Cash' | 'Online' | 'Split';
  initialCustomer?: { name: string; phone: string } | null;
  venueDetails?: any | null;
}

export function PaymentDialog({
  isOpen,
  onOpenChange,
  total,
  receiptPreview,
  onPaymentSuccess,
  onNavigate,
  currency = 'Rs.',
  isCashOnly = false,
  initialMode = 'Cash',
  initialCustomer = null,
  venueDetails = null,
}: PaymentDialogProps) {
  const { t } = useLanguage();
  const [selectedMethod, setSelectedMethod] = useState<'Cash' | 'Online' | 'Split'>(initialMode);
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [error, setError] = useState('');
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const cashInputRef = useRef<HTMLInputElement>(null);

  // Split state
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitOnline, setSplitOnline] = useState<number>(total);

  useEffect(() => {
    if (isOpen) {
      setSelectedMethod(initialMode);
      setSplitCash(0);
      setSplitOnline(total);
      if (initialCustomer) {
        setCustomerName(initialCustomer.name || '');
        setCustomerMobile(initialCustomer.phone || '');
      } else {
        setCustomerName('');
        setCustomerMobile('');
      }
      const timer = setTimeout(() => {
        cashInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialMode, total, initialCustomer]);

  const change = cashReceived !== null ? cashReceived - total : null;

  const processPayment = (paid: number, split?: { cash: number; online: number }) => {
    const details = customerName && customerMobile ? { name: customerName, phone: customerMobile } : undefined;
    onPaymentSuccess(paid, details, split);
  };

  const handleCashConfirm = () => {
    if (cashReceived === null) {
      setError(t('Please enter amount received.'));
      return;
    }

    if (cashReceived < total && (!customerMobile || !customerName)) {
      setError(t('Customer details are required for partial payments/credit.'));
      return;
    }

    setError('');
    processPayment(cashReceived);
  };

  const handleOnlineConfirm = () => {
    processPayment(total);
  };

  const handleSplitConfirm = () => {
    const sum = splitCash + splitOnline;
    if (Math.abs(sum - total) > 0.01) {
      setError(t(`Split amounts must equal total (${currency}${total.toFixed(2)})`));
      return;
    }
    setError('');
    processPayment(total, { cash: splitCash, online: splitOnline });
  };

  const handleSplitCashChange = (val: number) => {
    const safeCash = Math.max(0, val);
    setSplitCash(safeCash);
    setSplitOnline(Math.max(0, parseFloat((total - safeCash).toFixed(2))));
    setError('');
  };

  const handleSplitOnlineChange = (val: number) => {
    const safeOnline = Math.max(0, val);
    setSplitOnline(safeOnline);
    setSplitCash(Math.max(0, parseFloat((total - safeOnline).toFixed(2))));
    setError('');
  };

  const handleClose = () => {
    setCashReceived(null);
    setCustomerName('');
    setCustomerMobile('');
    setError('');
    onOpenChange(false);
  };

  const handleGoToCustomerDatabase = () => {
    onNavigate('customers');
    handleClose();
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{t('Process Payment')}</DialogTitle>
        </DialogHeader>

        {/* Customer Information (Optional) */}
        <div className="space-y-3 py-2 border-b">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="customer-name" className="text-xs font-bold text-muted-foreground">{t('Customer Name (Optional)')}</Label>
              <Input id="customer-name" placeholder={t('Name')} value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-9 font-bold text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="customer-mobile" className="text-xs font-bold text-muted-foreground">{t('Mobile No. (Optional)')}</Label>
              <Input id="customer-mobile" placeholder={t('Mobile No.')} value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} className="h-9 font-bold text-sm" />
            </div>
          </div>
          <div className="text-center">
            <Button variant="link" size="sm" className="text-xs h-6 p-0" onClick={handleGoToCustomerDatabase}>
              <Users2 className="mr-1.5 h-3.5 w-3.5" />
              {t('Search or select from customer database')}
            </Button>
          </div>
        </div>

        {/* Total Banner */}
        <div className="text-center py-3 bg-primary/5 rounded-2xl border border-primary/20">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('Total Amount to be Paid')}</p>
          <p className="text-4xl font-black text-primary">{currency}{total.toFixed(2)}</p>
        </div>

        {/* Payment Mode Selector Tabs */}
        {!isCashOnly && (
          <div className="grid grid-cols-3 gap-2 p-1 bg-muted/40 rounded-2xl border border-border/50">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedMethod('Cash')}
              className={cn("h-10 rounded-xl font-bold text-xs gap-1.5", selectedMethod === 'Cash' ? "bg-background text-primary shadow-xs" : "text-muted-foreground")}
            >
              <Wallet className="h-3.5 w-3.5" />
              {t('Cash')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedMethod('Online')}
              className={cn("h-10 rounded-xl font-bold text-xs gap-1.5", selectedMethod === 'Online' ? "bg-background text-primary shadow-xs" : "text-muted-foreground")}
            >
              <QrCode className="h-3.5 w-3.5" />
              {t('UPI / Online')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedMethod('Split')}
              className={cn("h-10 rounded-xl font-bold text-xs gap-1.5", selectedMethod === 'Split' ? "bg-background text-primary shadow-xs" : "text-muted-foreground")}
            >
              <Layers className="h-3.5 w-3.5" />
              {t('Split (Cash+UPI)')}
            </Button>
          </div>
        )}

        {/* Active Payment Method Content */}
        {selectedMethod === 'Cash' && (
          <Card className="border-primary/20 shadow-sm bg-primary/[0.02]">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2 font-bold"><Wallet className="h-4 w-4" /> {t('Cash Payment')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cash-received" className="text-xs font-bold uppercase tracking-widest opacity-60">{t('Cash Received from Customer')}</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-lg text-primary">{currency}</span>
                  <Input
                    id="cash-received"
                    ref={cashInputRef}
                    type="number"
                    value={cashReceived === null ? '' : cashReceived}
                    onChange={(e) => setCashReceived(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                    className="pl-11 h-13 text-2xl font-black text-primary text-center bg-primary/5 border-primary/20 rounded-xl"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-destructive font-bold text-center">{error}</p>}
              {change !== null && change >= 0 && (
                <div className="text-center py-3 bg-primary/10 rounded-xl border border-primary/20">
                  <p className="text-xs font-black text-primary uppercase tracking-widest">{t('Change Due to Return')}</p>
                  <p className="text-3xl font-black text-primary">{currency}{change.toFixed(2)}</p>
                </div>
              )}
              {change !== null && change < 0 && (
                <div className="text-center py-3 bg-destructive/10 rounded-xl border border-destructive/20">
                  <p className="text-xs font-black text-destructive uppercase tracking-widest">{t('Balance Due (Customer Credit / Udhaar)')}</p>
                  <p className="text-3xl font-black text-destructive">-{currency}{Math.abs(change).toFixed(2)}</p>
                </div>
              )}
              <Button onClick={handleCashConfirm} className="w-full h-12 text-base font-black rounded-xl shadow-md" size="lg">
                {t('Confirm Cash Payment')}
              </Button>
            </CardContent>
          </Card>
        )}

        {selectedMethod === 'Online' && (
          <Card className="border-primary/20 shadow-sm bg-primary/[0.02]">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2 font-bold"><QrCode className="h-4 w-4 text-primary" /> {t('Dynamic UPI QR & Real-Time Auto Detection')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col items-center justify-center space-y-2 py-5 border-dashed border-2 border-primary/30 rounded-2xl bg-card">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <QrCode className="h-10 w-10 text-primary" />
                </div>
                <p className="text-muted-foreground text-xs font-medium text-center max-w-xs">
                  {venueDetails?.upiMode === 'screen'
                    ? t('Scan dynamic QR with GooglePay, PhonePe, Paytm, BHIM, or any UPI app. Instant auto-detection & voice soundbox active.')
                    : t('Customer can scan your counter paper QR standee, or click below to display on-screen QR.')}
                </p>
                <div className="text-2xl font-black text-primary">{currency}{total.toFixed(2)}</div>
                <Button
                  onClick={() => setIsUpiModalOpen(true)}
                  className="mt-2 h-11 px-6 rounded-xl font-black text-xs gap-2 shadow-md bg-primary hover:bg-orange-600 text-white"
                >
                  <QrCode className="h-4 w-4" />
                  {t('Display Dynamic UPI QR Code')}
                </Button>
              </div>

              <div className="pt-1">
                <Button
                  variant="outline"
                  onClick={handleOnlineConfirm}
                  className="w-full h-10 text-xs font-bold rounded-xl text-muted-foreground hover:text-foreground"
                >
                  {t('Manual Mark as Paid (Without QR)')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedMethod === 'Split' && (
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2 font-bold"><Layers className="h-4 w-4" /> {t('Split Payment (Partial Cash + Partial UPI)')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <Label className="text-xs font-black uppercase tracking-wider text-emerald-600 block">
                    {t('Cash Portion')}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-sm text-emerald-600">{currency}</span>
                    <Input
                      type="number"
                      min="0"
                      max={total}
                      value={splitCash || ''}
                      onChange={(e) => handleSplitCashChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="pl-8 h-11 font-black text-base text-right rounded-lg bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <Label className="text-xs font-black uppercase tracking-wider text-blue-600 block">
                    {t('UPI / Online Portion')}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-sm text-blue-600">{currency}</span>
                    <Input
                      type="number"
                      min="0"
                      max={total}
                      value={splitOnline || ''}
                      onChange={(e) => handleSplitOnlineChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="pl-8 h-11 font-black text-base text-right rounded-lg bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Balance bar */}
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl text-xs font-bold">
                <span>{t('Total Tendered')}:</span>
                <span className={cn("font-black", Math.abs(splitCash + splitOnline - total) < 0.01 ? "text-emerald-600" : "text-destructive")}>
                  {currency}{(splitCash + splitOnline).toFixed(2)} / {currency}{total.toFixed(2)}
                  {Math.abs(splitCash + splitOnline - total) < 0.01 && <CheckCircle2 className="inline ml-1 h-3.5 w-3.5" />}
                </span>
              </div>

              {error && <p className="text-xs text-destructive font-bold text-center">{error}</p>}

              <Button
                onClick={handleSplitConfirm}
                disabled={Math.abs(splitCash + splitOnline - total) > 0.01}
                className="w-full h-12 text-base font-black rounded-xl shadow-md"
                size="lg"
              >
                {t('Confirm Split Payment')}
              </Button>
            </CardContent>
          </Card>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={handleClose} className="rounded-xl">{t('Cancel')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <UpiPaymentModal
      isOpen={isUpiModalOpen}
      onOpenChange={setIsUpiModalOpen}
      total={selectedMethod === 'Split' ? splitOnline : total}
      currency={currency}
      storeVpa={venueDetails?.upiId}
      merchantName={venueDetails?.upiMerchantName || venueDetails?.name}
      soundboxEnabled={venueDetails?.upiSoundboxEnabled ?? true}
      soundboxVoice={venueDetails?.upiSoundboxVoice || 'en'}
      onPaymentVerified={() => {
        setIsUpiModalOpen(false);
        if (selectedMethod === 'Split') {
          processPayment(total, { cash: splitCash, online: splitOnline });
        } else {
          processPayment(total);
        }
        onOpenChange(false);
      }}
    />
    </>
  );
}
