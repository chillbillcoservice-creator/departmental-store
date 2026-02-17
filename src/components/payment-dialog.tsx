
"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Wallet, Users2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';

import { useLanguage } from '@/contexts/language-context';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  receiptPreview: string;
  onPaymentSuccess: (amountPaid: number, customerDetails?: { name: string; phone: string }) => void;
  onNavigate: (tab: string) => void;
  currency?: string;
  isCashOnly?: boolean;
}

export function PaymentDialog({ isOpen, onOpenChange, total, receiptPreview, onPaymentSuccess, onNavigate, currency = 'Rs.', isCashOnly = false }: PaymentDialogProps) {
  const { t } = useLanguage();
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();
  const cashInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Use a short timeout to ensure the input is rendered and visible before focusing
      const timer = setTimeout(() => {
        cashInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);


  const change = cashReceived !== null ? cashReceived - total : null;

  const processPayment = (paid: number) => {
    const details = customerName && customerMobile ? { name: customerName, phone: customerMobile } : undefined;
    onPaymentSuccess(paid, details);
  }

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

  const handleClose = () => {
    setCashReceived(null);
    setCustomerName('');
    setCustomerMobile('');
    setError('');
    onOpenChange(false);
  }

  const handleGoToCustomerDatabase = () => {
    onNavigate('customers');
    handleClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("sm:max-w-4xl", isCashOnly && "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle>{t('Process Payment')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 border-b pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">{t('Customer Name (Optional)')}</Label>
              <Input id="customer-name" placeholder={t('Name')} value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-mobile">{t('Mobile No. (Optional)')}</Label>
              <Input id="customer-mobile" placeholder={t('Mobile No.')} value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} />
            </div>
          </div>
          <div className="text-center">
            <Button variant="link" size="sm" className="text-sm" onClick={handleGoToCustomerDatabase}>
              <Users2 className="mr-2 h-4 w-4" />
              {t('Go to customer database')}
            </Button>
          </div>
        </div>

        <div className="text-center py-6">
          <p className="text-muted-foreground">{t('Total Amount to be Paid')}</p>
          <p className="text-6xl font-bold">{currency} {total.toFixed(2)}</p>
        </div>


        <div className={cn("grid gap-6 pt-4", !isCashOnly ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
          {/* Cash Payment Section */}
          <Card className={cn(isCashOnly && "border-primary/20 shadow-lg shadow-primary/5 bg-primary/[0.02]")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet /> {t('Cash Payment')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cash-received" className="text-sm font-bold opacity-60 uppercase tracking-widest">{t('Cash Received')}</Label>
                <Input
                  id="cash-received"
                  ref={cashInputRef}
                  type="number"
                  value={cashReceived === null ? '' : cashReceived}
                  onChange={(e) => setCashReceived(e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder={t('e.g., 50.00')}
                  className="h-14 text-2xl font-black text-primary text-center bg-primary/5 border-primary/20 rounded-2xl"
                />
              </div>
              {error && <p className="text-sm text-destructive font-bold text-center">{error}</p>}
              {change !== null && change >= 0 && (
                <div className="text-center py-6 bg-primary/10 rounded-2xl border-2 border-primary/20 border-dashed animate-in zoom-in-95">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">{t('Change Due')}</p>
                  <p className="text-4xl font-black text-primary">{currency}{change.toFixed(2)}</p>
                </div>
              )}
              {change !== null && change < 0 && (
                <div className="text-center py-6 bg-destructive/10 rounded-2xl border-2 border-destructive/20 border-dashed animate-in zoom-in-95">
                  <p className="text-xs font-black text-destructive uppercase tracking-widest mb-1">{t('Balance to Collect Later')}</p>
                  <p className="text-4xl font-black text-destructive">-{currency}{Math.abs(change).toFixed(2)}</p>
                </div>
              )}
              <Button onClick={handleCashConfirm} className="w-full h-14 text-lg font-black rounded-2xl shadow-lg shadow-primary/20" size="lg">{t('Confirm Cash Payment')}</Button>
            </CardContent>
          </Card>

          {/* Online Payment Section */}
          {!isCashOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><QrCode /> {t('Online Payment')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center space-y-2 py-4 border-dashed border-2 rounded-lg h-52">
                  <QrCode className="h-20 w-20 text-muted-foreground" />
                  <p className="text-muted-foreground text-center text-sm">
                    {t('Show QR code to customer.')}
                  </p>
                </div>
                <Button onClick={handleOnlineConfirm} className="w-full" size="lg">{t('Confirm Online Payment')}</Button>
              </CardContent>
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t('Cancel Payment')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
