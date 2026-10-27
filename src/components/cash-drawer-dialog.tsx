"use client";

import { useState, useMemo, useEffect } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Printer, CheckCircle2, AlertTriangle, ArrowDownRight, ArrowUpRight, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { Bill, Expense, SalesReturn } from '@/lib/types';
import { format, isToday } from 'date-fns';

interface CashDrawerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
  expenses: Expense[];
  currency: string;
  venueDetails: any | null;
  currentUser?: { name: string; role?: string } | null;
}

export function CashDrawerDialog({
  isOpen,
  onOpenChange,
  bills,
  expenses,
  currency,
  venueDetails,
  currentUser,
}: CashDrawerDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [openingFloat, setOpeningFloat] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_opening_float');
      return saved ? parseFloat(saved) : 2000;
    }
    return 2000;
  });

  const [countedCash, setCountedCash] = useState<number | string>('');
  const [closingNotes, setClosingNotes] = useState('');

  // Persist opening float whenever changed
  const handleUpdateFloat = (val: number) => {
    setOpeningFloat(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_opening_float', val.toString());
    }
  };

  // 1. Calculate Today's Cash Sales (Pure Cash + Cash portion of Split Bills)
  const todayCashSales = useMemo(() => {
    return bills
      .filter((b) => isToday(new Date(b.timestamp)))
      .reduce((sum, b) => {
        if (b.paymentMethod === 'Cash') {
          return sum + (b.total || 0);
        } else if (b.paymentMethod === 'Split' && b.splitPayments) {
          const cashSplit = b.splitPayments.find((p) => p.method === 'Cash');
          return sum + (cashSplit ? cashSplit.amount : 0);
        }
        return sum;
      }, 0);
  }, [bills]);

  // 2. Calculate Today's Online / UPI Sales
  const todayOnlineSales = useMemo(() => {
    return bills
      .filter((b) => isToday(new Date(b.timestamp)))
      .reduce((sum, b) => {
        if (b.paymentMethod === 'Online') {
          return sum + (b.total || 0);
        } else if (b.paymentMethod === 'Split' && b.splitPayments) {
          const onlineSplit = b.splitPayments.find((p) => p.method === 'Online');
          return sum + (onlineSplit ? onlineSplit.amount : 0);
        }
        return sum;
      }, 0);
  }, [bills]);

  // 3. Calculate Today's Cash Refunds
  const todayCashRefunds = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const returns: SalesReturn[] = JSON.parse(
        localStorage.getItem('pos_sales_returns') || '[]'
      );
      return returns
        .filter((r) => isToday(new Date(r.timestamp)) && r.refundMethod === 'Cash')
        .reduce((sum, r) => sum + (r.totalRefundAmount || 0), 0);
    } catch {
      return 0;
    }
  }, [isOpen]);

  // 4. Calculate Today's Petty Cash Outflow (Expenses)
  const todayCashExpenses = useMemo(() => {
    return expenses
      .filter((e) => isToday(new Date(e.date)))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  // 5. Total Expected Cash in Drawer
  const expectedCash = Math.max(0, openingFloat + todayCashSales - todayCashRefunds - todayCashExpenses);

  // 6. Counted difference
  const numCounted = typeof countedCash === 'number' ? countedCash : parseFloat(countedCash || '0');
  const difference = countedCash !== '' ? numCounted - expectedCash : null;

  const handlePrintZReport = () => {
    const printWindow = window.open('', '', 'width=400,height=700');
    if (!printWindow) return;

    const todayDate = format(new Date(), 'PPpp');
    const cashierName = currentUser?.name || 'Cashier Shift';

    const zReportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Z-Report (Shift Closing)</title>
        <style>
          body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; width: 280px; }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .bold { font-weight: bold; }
          .flex { display: flex; justify-content: space-between; margin: 3px 0; }
          .badge { border: 1px solid #000; padding: 2px 4px; display: inline-block; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="bold" style="font-size: 15px;">${venueDetails?.name || 'DEPARTMENTAL STORE'}</div>
          <div>${venueDetails?.address || ''}</div>
          <div class="divider"></div>
          <div class="badge">DAILY Z-REPORT / SHIFT CLOSING</div>
        </div>
        <div class="divider"></div>
        <div class="flex"><span>Date & Time:</span><span>${todayDate}</span></div>
        <div class="flex"><span>Closed By:</span><span>${cashierName}</span></div>
        <div class="divider"></div>
        
        <div class="bold" style="margin-bottom: 5px;">REVENUE SUMMARY (TODAY)</div>
        <div class="flex"><span>Total Bills:</span><span>${bills.filter(b => isToday(new Date(b.timestamp))).length}</span></div>
        <div class="flex"><span>Cash Sales:</span><span>${currency}${todayCashSales.toFixed(2)}</span></div>
        <div class="flex"><span>UPI / Online Sales:</span><span>${currency}${todayOnlineSales.toFixed(2)}</span></div>
        <div class="flex bold"><span>GROSS REVENUE:</span><span>${currency}${(todayCashSales + todayOnlineSales).toFixed(2)}</span></div>
        <div class="divider"></div>

        <div class="bold" style="margin-bottom: 5px;">CASH DRAWER RECONCILIATION</div>
        <div class="flex"><span>Opening Float:</span><span>+${currency}${openingFloat.toFixed(2)}</span></div>
        <div class="flex"><span>Cash Sales (In):</span><span>+${currency}${todayCashSales.toFixed(2)}</span></div>
        <div class="flex"><span>Cash Refunds (Out):</span><span>-${currency}${todayCashRefunds.toFixed(2)}</span></div>
        <div class="flex"><span>Cash Expenses (Out):</span><span>-${currency}${todayCashExpenses.toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="flex bold" style="font-size: 13px;">
          <span>EXPECTED DRAWER CASH:</span>
          <span>${currency}${expectedCash.toFixed(2)}</span>
        </div>
        ${countedCash !== '' ? `
        <div class="flex bold" style="font-size: 13px;">
          <span>ACTUAL COUNTED CASH:</span>
          <span>${currency}${numCounted.toFixed(2)}</span>
        </div>
        <div class="flex bold" style="font-size: 13px; color: ${difference === 0 ? 'green' : 'red'};">
          <span>DISCREPANCY / VARIANCE:</span>
          <span>${difference! >= 0 ? '+' : ''}${currency}${difference!.toFixed(2)} (${difference === 0 ? 'BALANCED' : difference! > 0 ? 'EXCESS' : 'SHORTAGE'})</span>
        </div>
        ` : ''}
        ${closingNotes ? `<div class="divider"></div><div>Notes: ${closingNotes}</div>` : ''}
        <div class="divider"></div>
        <div class="center" style="font-size: 10px; margin-top: 15px;">
          --- END OF Z-REPORT ---<br/>
          STORE MANAGER SIGNATURE
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(zReportHtml);
    printWindow.document.close();

    toast({
      title: t("Z-Report Printed"),
      description: t("Cash drawer reconciliation slip generated."),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Wallet className="h-5 w-5 text-primary" />
            {t("Day-End Cash Drawer & Z-Report")}
          </DialogTitle>
          <DialogDescription>
            {t("Reconcile daily cash in the register against today's cash sales, returns, and petty cash expenses.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Opening Float Card */}
          <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-2xl border border-border/50">
            <div>
              <Label className="text-xs uppercase font-black tracking-wider text-muted-foreground block">
                {t("Opening Cash Float")}
              </Label>
              <span className="text-xs text-muted-foreground">{t("Base cash kept in drawer at shift start")}</span>
            </div>
            <div className="flex items-center gap-1.5 w-36">
              <span className="text-sm font-bold text-muted-foreground">{currency}</span>
              <Input
                type="number"
                min="0"
                value={openingFloat}
                onChange={(e) => handleUpdateFloat(parseFloat(e.target.value) || 0)}
                className="h-9 font-bold text-right rounded-xl"
              />
            </div>
          </div>

          {/* Cash In / Out Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
                <ArrowDownRight className="h-4 w-4" />
                {t("Cash Sales (In)")}
              </div>
              <div className="text-xl font-black text-emerald-600">
                +{currency}{todayCashSales.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t("From today's cash & split bills")}
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
                <DollarSign className="h-4 w-4" />
                {t("UPI / Online Sales")}
              </div>
              <div className="text-xl font-black text-blue-600">
                {currency}{todayOnlineSales.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t("Direct bank / digital payment")}
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">
                <ArrowUpRight className="h-4 w-4" />
                {t("Cash Refunds (Out)")}
              </div>
              <div className="text-xl font-black text-amber-600">
                -{currency}{todayCashRefunds.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t("Returns paid from drawer")}
              </div>
            </div>

            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-2xl">
              <div className="flex items-center gap-1.5 text-destructive font-bold text-xs uppercase tracking-wider mb-1">
                <ArrowUpRight className="h-4 w-4" />
                {t("Cash Expenses (Out)")}
              </div>
              <div className="text-xl font-black text-destructive">
                -{currency}{todayCashExpenses.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t("Petty cash out today")}
              </div>
            </div>
          </div>

          {/* Expected Drawer Total */}
          <div className="p-4 bg-primary/10 border-2 border-primary/20 rounded-2xl flex justify-between items-center">
            <div>
              <span className="text-xs uppercase font-black tracking-wider text-primary block">
                {t("Expected Cash in Drawer")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("Float")} + {t("Cash Sales")} - {t("Refunds")} - {t("Expenses")}
              </span>
            </div>
            <div className="text-3xl font-black text-primary">
              {currency}{expectedCash.toFixed(2)}
            </div>
          </div>

          {/* Actual Counted Cash Input */}
          <div className="space-y-2 p-4 bg-muted/30 rounded-2xl border border-border/60">
            <Label className="text-xs uppercase font-black tracking-wider text-foreground">
              {t("Physical Counted Cash in Drawer")}
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-lg text-muted-foreground">
                {currency}
              </span>
              <Input
                type="number"
                min="0"
                placeholder={t("Enter counted physical cash...")}
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="pl-12 h-14 text-2xl font-black rounded-xl bg-background"
                autoFocus
              />
            </div>

            {/* Discrepancy indicator */}
            {difference !== null && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between font-bold text-sm ${
                  difference === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                    : difference > 0
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                }`}
              >
                <div className="flex items-center gap-2">
                  {difference === 0 ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                  <span>
                    {difference === 0
                      ? t("Drawer is Perfectly Balanced")
                      : difference > 0
                      ? t("Cash Excess in Drawer")
                      : t("Cash Shortage in Drawer")}
                  </span>
                </div>
                <span className="text-base font-black">
                  {difference >= 0 ? '+' : ''}
                  {currency}
                  {difference.toFixed(2)}
                </span>
              </div>
            )}

            <div className="pt-2">
              <Input
                placeholder={t("Optional shift closing notes (e.g. Counter 1 - Evening Shift)...")}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            {t("Close")}
          </Button>
          <Button onClick={handlePrintZReport} className="rounded-xl font-black gap-2">
            <Printer className="h-4 w-4" />
            {t("Print Z-Report")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
