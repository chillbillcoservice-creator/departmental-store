"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  UserCheck,
  Receipt,
  Truck,
  TrendingDown,
  Wallet,
  Printer,
  Share2,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  FileText,
  Calendar,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import {
  Employee,
  Bill,
  Expense,
  PurchaseOrder,
  SalesReturn,
  StaffShiftSession,
} from '@/lib/types';
import {
  getActiveShift,
  calculateShiftSummary,
  completeShiftSession,
  formatDuration,
  formatShiftWhatsAppText,
  generateShiftReceiptText,
} from '@/lib/shift-manager';
import { cn } from '@/lib/utils';

interface ShiftHandoverDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: Employee | null;
  bills: Bill[];
  expenses: Expense[];
  purchaseOrders: PurchaseOrder[];
  currency?: string;
  venueDetails?: any;
  onLogoutConfirm: () => void;
}

export function ShiftHandoverDialog({
  isOpen,
  onOpenChange,
  currentUser,
  bills,
  expenses,
  purchaseOrders,
  currency = 'Rs.',
  venueDetails,
  onLogoutConfirm,
}: ShiftHandoverDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'summary' | 'vendors' | 'cash' | 'timeline'>('summary');
  const [countedCash, setCountedCash] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);

  // Load sales returns from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      try {
        const returns = JSON.parse(localStorage.getItem('pos_sales_returns') || '[]');
        setSalesReturns(returns);
      } catch {}
    }
  }, [isOpen]);

  // Compute live shift summary
  const shiftSummary: StaffShiftSession | null = useMemo(() => {
    const rawShift = getActiveShift();
    if (!rawShift) return null;
    return calculateShiftSummary(rawShift, bills, expenses, purchaseOrders, salesReturns);
  }, [isOpen, bills, expenses, purchaseOrders, salesReturns]);

  // Default counted cash to expected cash when dialog opens
  useEffect(() => {
    if (shiftSummary && countedCash === '') {
      setCountedCash(shiftSummary.expectedCashInDrawer.toFixed(2));
    }
  }, [shiftSummary, countedCash]);

  if (!shiftSummary) return null;

  const numCountedCash = parseFloat(countedCash) || 0;
  const discrepancy = numCountedCash - shiftSummary.expectedCashInDrawer;
  const isBalanced = Math.abs(discrepancy) < 0.01;
  const isSurplus = discrepancy > 0.01;
  const isShortage = discrepancy < -0.01;

  const shiftDuration = formatDuration(shiftSummary.durationMinutes);
  const openTimeStr = new Date(shiftSummary.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const openDateStr = new Date(shiftSummary.openedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

  // 1. Handle Print Handover Thermal Slip
  const handlePrintSlip = () => {
    const receiptText = generateShiftReceiptText(
      {
        ...shiftSummary,
        actualCashCounted: numCountedCash,
        cashDifference: discrepancy,
        handoverNotes,
        closedAt: new Date().toISOString(),
      },
      venueDetails,
      currency
    );

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Shift Handover Slip - ${shiftSummary.employeeName}</title>
            <style>
              @page { size: auto; margin: 4mm; }
              body { font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 10px; color: #000; }
              pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; line-height: 1.35; }
            </style>
          </head>
          <body>
            <pre>${receiptText}</pre>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // 2. Handle WhatsApp Share to Store Owner
  const handleWhatsAppShare = () => {
    const text = formatShiftWhatsAppText(
      {
        ...shiftSummary,
        actualCashCounted: numCountedCash,
        cashDifference: discrepancy,
        handoverNotes,
        closedAt: new Date().toISOString(),
      },
      venueDetails?.name,
      currency
    );

    const ownerPhone = venueDetails?.contactNumber?.replace(/\D/g, '') || '';
    const url = ownerPhone
      ? `https://wa.me/${ownerPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;

    window.open(url, '_blank');
  };

  // 3. Handle Complete Shift & Log Out
  const handleConfirmLogout = () => {
    completeShiftSession(numCountedCash, handoverNotes);
    toast({
      title: t("Shift Completed & Archived"),
      description: `${shiftSummary.employeeName}'s shift report was logged into permanent history.`,
    });
    onOpenChange(false);
    onLogoutConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-6 rounded-3xl border shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="space-y-1 pb-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-base font-black text-white shadow-md"
                style={{ backgroundColor: currentUser?.color || '#f97316' }}
              >
                {shiftSummary.employeeName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-black text-foreground">
                    {t('Shift Handover & Activity Report')}
                  </DialogTitle>
                  <Badge variant="outline" className="text-[10px] px-2 py-0 font-bold border-primary/40 text-primary uppercase">
                    X-Report
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  {shiftSummary.employeeName} · {shiftSummary.employeeRole} · {openDateStr} ({openTimeStr} – {t('Now')}) · <span className="font-bold text-foreground">{shiftDuration}</span>
                </DialogDescription>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">{t('Shift Net Sales')}</span>
              <p className="text-lg font-black text-primary leading-tight">
                {currency} {shiftSummary.totalSales.toFixed(2)}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full flex-1 flex flex-col overflow-hidden pt-2">
          <TabsList className="grid w-full grid-cols-4 h-11 bg-muted/60 p-1 rounded-xl flex-shrink-0">
            <TabsTrigger value="summary" className="rounded-lg font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <Receipt className="h-3.5 w-3.5" />
              {t('Sales & Bills')}
            </TabsTrigger>
            <TabsTrigger value="vendors" className="rounded-lg font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <Truck className="h-3.5 w-3.5" />
              {t('Vendors & Orders')}
            </TabsTrigger>
            <TabsTrigger value="cash" className="rounded-lg font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <Wallet className="h-3.5 w-3.5" />
              {t('Galla / Cash Till')}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-lg font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <Clock className="h-3.5 w-3.5" />
              {t('Activity Feed')} ({shiftSummary.activities.length})
            </TabsTrigger>
          </TabsList>

          {/* ========================================================= */}
          {/* TAB 1: SALES & BILLING */}
          {/* ========================================================= */}
          <TabsContent value="summary" className="space-y-4 pt-3 flex-1 overflow-y-auto pr-1">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Card className="rounded-2xl border-border/70 shadow-xs bg-muted/20">
                <CardContent className="p-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('Total Bills')}</span>
                  <p className="text-xl font-black text-foreground mt-0.5">{shiftSummary.billsCount}</p>
                  <span className="text-[10px] text-muted-foreground font-semibold">{shiftSummary.itemsSoldCount} items sold</span>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/70 shadow-xs bg-muted/20">
                <CardContent className="p-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('Cash Sales')}</span>
                  <p className="text-xl font-black text-emerald-600 mt-0.5">{currency} {shiftSummary.cashSales.toFixed(0)}</p>
                  <span className="text-[10px] text-muted-foreground font-semibold">in counter till</span>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/70 shadow-xs bg-muted/20">
                <CardContent className="p-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('UPI / QR Standee')}</span>
                  <p className="text-xl font-black text-blue-600 mt-0.5">{currency} {shiftSummary.onlineSales.toFixed(0)}</p>
                  <span className="text-[10px] text-muted-foreground font-semibold">direct bank credit</span>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/70 shadow-xs bg-muted/20">
                <CardContent className="p-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('Khata (Udhaar)')}</span>
                  <p className="text-xl font-black text-purple-600 mt-0.5">{currency} {shiftSummary.khataCreditGiven.toFixed(0)}</p>
                  <span className="text-[10px] text-muted-foreground font-semibold">customer credit</span>
                </CardContent>
              </Card>
            </div>

            {/* Inflow vs Outflow Summary Table */}
            <div className="rounded-2xl border border-border/70 overflow-hidden bg-card">
              <div className="bg-muted/40 px-3.5 py-2 border-b flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t('Financial Movement in this Shift')}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Shift duration: {shiftDuration}
                </span>
              </div>
              <div className="p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Gross Sales (All payment methods)')}:</span>
                  <span className="font-bold text-foreground">{currency} {shiftSummary.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{t('Total Discounts Given to Customers')}:</span>
                  <span className="font-semibold text-destructive">-{currency} {shiftSummary.totalDiscountsGiven.toFixed(2)}</span>
                </div>
                {shiftSummary.cashRefunds > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{t('Sales Returns / Refunds Issued')}:</span>
                    <span className="font-semibold text-destructive">-{currency} {shiftSummary.cashRefunds.toFixed(2)} ({shiftSummary.refundsCount} items)</span>
                  </div>
                )}
                {shiftSummary.khataCashRecovered > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{t('Customer Khata Dues Collected in Cash')}:</span>
                    <span className="font-semibold text-emerald-600">+{currency} {shiftSummary.khataCashRecovered.toFixed(2)}</span>
                  </div>
                )}
                {shiftSummary.storeExpenses > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{t('Daily Store Petty Expenses Logged')}:</span>
                    <span className="font-semibold text-destructive">-{currency} {shiftSummary.storeExpenses.toFixed(2)}</span>
                  </div>
                )}
                {shiftSummary.vendorPaymentsCash > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{t('Vendor Payments Paid from Till Cash')}:</span>
                    <span className="font-semibold text-destructive">-{currency} {shiftSummary.vendorPaymentsCash.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex items-center justify-between text-sm font-black">
                  <span className="text-foreground">{t('Net Cash Added to Till')}:</span>
                  <span className="text-emerald-600">
                    +{currency} {(shiftSummary.cashSales + shiftSummary.khataCashRecovered - shiftSummary.cashRefunds - shiftSummary.storeExpenses - shiftSummary.vendorPaymentsCash).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 2: VENDOR SUPPLY CHAIN OPERATIONS */}
          {/* ========================================================= */}
          <TabsContent value="vendors" className="space-y-3.5 pt-3 flex-1 overflow-y-auto pr-1">
            {/* Vendor Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-muted/20 border rounded-2xl">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-bold uppercase text-muted-foreground">{t('POs Created')}</span>
                </div>
                <p className="text-xl font-black text-foreground mt-1">{shiftSummary.vendorPOsCreated.length}</p>
                <span className="text-[10px] text-muted-foreground">Total: {currency} {shiftSummary.vendorPOsCreated.reduce((sum, po) => sum + po.totalAmount, 0).toFixed(0)}</span>
              </div>

              <div className="p-3 bg-muted/20 border rounded-2xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold uppercase text-muted-foreground">{t('Deliveries Received')}</span>
                </div>
                <p className="text-xl font-black text-foreground mt-1">{shiftSummary.vendorDeliveriesReceived.length}</p>
                <span className="text-[10px] text-muted-foreground">Stock added to inventory</span>
              </div>

              <div className="p-3 bg-muted/20 border rounded-2xl">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-bold uppercase text-muted-foreground">{t('Vendor Payments')}</span>
                </div>
                <p className="text-xl font-black text-foreground mt-1">{currency} {(shiftSummary.vendorPaymentsCash + shiftSummary.vendorPaymentsOnline).toFixed(0)}</p>
                <span className="text-[10px] text-muted-foreground">Cash: {currency}{shiftSummary.vendorPaymentsCash} · Bank: {currency}{shiftSummary.vendorPaymentsOnline}</span>
              </div>
            </div>

            {/* List of POs Created */}
            <div className="rounded-2xl border overflow-hidden">
              <div className="bg-muted/40 px-3.5 py-2 border-b flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t('Purchase Orders Placed during Shift')}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold">{shiftSummary.vendorPOsCreated.length} {t('Orders')}</span>
              </div>
              <div className="p-2 space-y-1.5 max-h-40 overflow-y-auto">
                {shiftSummary.vendorPOsCreated.length > 0 ? (
                  shiftSummary.vendorPOsCreated.map((po, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-card border text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{po.vendorName}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">{po.referenceNo}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{po.itemsCount} items ordered</span>
                      </div>
                      <span className="font-black text-foreground">{currency} {po.totalAmount.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-xs text-muted-foreground italic">
                    {t('No purchase orders were placed during this shift session.')}
                  </p>
                )}
              </div>
            </div>

            {/* List of Deliveries Received */}
            <div className="rounded-2xl border overflow-hidden">
              <div className="bg-muted/40 px-3.5 py-2 border-b flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t('Deliveries Checked into Inventory (GRN)')}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold">{shiftSummary.vendorDeliveriesReceived.length} {t('Deliveries')}</span>
              </div>
              <div className="p-2 space-y-1.5 max-h-40 overflow-y-auto">
                {shiftSummary.vendorDeliveriesReceived.length > 0 ? (
                  shiftSummary.vendorDeliveriesReceived.map((grn, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-card border text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{grn.vendorName}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">{grn.referenceNo}</Badge>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-semibold">{t('Stock received & added')}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-foreground">{currency} {grn.receivedValue.toFixed(2)}</span>
                        {grn.paidAmount > 0 && (
                          <p className="text-[10px] text-muted-foreground">Paid: {currency}{grn.paidAmount.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-xs text-muted-foreground italic">
                    {t('No distributor deliveries were checked-in during this shift session.')}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 3: GALLA / CASH TILL RECONCILIATION */}
          {/* ========================================================= */}
          <TabsContent value="cash" className="space-y-4 pt-3 flex-1 overflow-y-auto pr-1">
            {/* Till Equation Breakdown */}
            <div className="p-4 rounded-2xl border bg-muted/10 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t('Physical Drawer Math Formula')}
              </span>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Shift Opening Float')}:</span>
                  <span className="font-bold text-foreground">+{currency} {shiftSummary.openingFloat.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Cash Sales Inflow')}:</span>
                  <span className="font-bold text-emerald-600">+{currency} {shiftSummary.cashSales.toFixed(2)}</span>
                </div>
                {shiftSummary.khataCashRecovered > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('Customer Khata Repayments')}:</span>
                    <span className="font-bold text-emerald-600">+{currency} {shiftSummary.khataCashRecovered.toFixed(2)}</span>
                  </div>
                )}
                {shiftSummary.cashRefunds > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('Cash Refunds Outflow')}:</span>
                    <span className="font-bold text-destructive">-{currency} {shiftSummary.cashRefunds.toFixed(2)}</span>
                  </div>
                )}
                {shiftSummary.storeExpenses > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('Store Petty Expenses')}:</span>
                    <span className="font-bold text-destructive">-{currency} {shiftSummary.storeExpenses.toFixed(2)}</span>
                  </div>
                )}
                {shiftSummary.vendorPaymentsCash > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('Vendor Cash Payments')}:</span>
                    <span className="font-bold text-destructive">-{currency} {shiftSummary.vendorPaymentsCash.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t-2 pt-2 flex items-center justify-between text-base font-black">
                  <span className="text-foreground">{t('Expected Physical Cash in Drawer')}:</span>
                  <span className="text-primary">{currency} {shiftSummary.expectedCashInDrawer.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Counted Cash Entry Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  {t('Count & Enter Actual Cash in Drawer')} ({currency})
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="e.g. 19180"
                  className="h-11 text-lg font-black tracking-wider rounded-xl border-2 focus-visible:ring-primary"
                />
              </div>

              {/* Discrepancy Status Card */}
              <div
                className={cn(
                  "p-3 rounded-xl border-2 flex items-center justify-between transition-all",
                  isBalanced
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                    : isSurplus
                    ? "bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300"
                    : "bg-destructive/10 border-destructive/40 text-destructive"
                )}
              >
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider block">
                    {t('Till Discrepancy')}
                  </span>
                  <span className="text-base font-black">
                    {isBalanced ? t('BALANCED ✅') : isSurplus ? `+${currency} ${discrepancy.toFixed(2)} (Surplus)` : `-${currency} ${Math.abs(discrepancy).toFixed(2)} (Shortage)`}
                  </span>
                </div>
                {isBalanced ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                )}
              </div>
            </div>

            {/* Handover Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">
                {t('Handover Notes / Instructions for Next Staff (Optional)')}
              </Label>
              <Textarea
                rows={2}
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="e.g. Kept Rs. 2,000 opening float for night shift; deposited remaining cash in locker."
                className="text-xs rounded-xl"
              />
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 4: CHRONOLOGICAL ACTIVITY TIMELINE */}
          {/* ========================================================= */}
          <TabsContent value="timeline" className="space-y-2 pt-3 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              {shiftSummary.activities.map((act) => {
                const actTime = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={act.id}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-xl border bg-card/60 text-xs hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "p-2 rounded-xl mt-0.5",
                          act.type === 'sale'
                            ? "bg-emerald-500/10 text-emerald-600"
                            : act.type === 'vendor_po'
                            ? "bg-orange-500/10 text-orange-600"
                            : act.type === 'vendor_delivery'
                            ? "bg-blue-500/10 text-blue-600"
                            : act.type === 'vendor_payment'
                            ? "bg-purple-500/10 text-purple-600"
                            : act.type === 'khata_collection'
                            ? "bg-teal-500/10 text-teal-600"
                            : act.type === 'refund'
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {act.type === 'sale' ? (
                          <Receipt className="h-3.5 w-3.5" />
                        ) : act.type === 'vendor_po' ? (
                          <Package className="h-3.5 w-3.5" />
                        ) : act.type === 'vendor_delivery' ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : act.type === 'vendor_payment' ? (
                          <DollarSign className="h-3.5 w-3.5" />
                        ) : act.type === 'khata_collection' ? (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{act.title}</span>
                          <span className="text-[10px] text-muted-foreground">{actTime}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{act.description}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-foreground">
                        {currency} {act.amount.toFixed(2)}
                      </span>
                      {act.paymentMethod && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase block mt-0.5 font-semibold">
                          {act.paymentMethod}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <DialogFooter className="pt-3 border-t mt-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintSlip}
              className="h-9 px-3 rounded-xl font-bold text-xs gap-1.5 flex-1 sm:flex-none border-primary/30 text-primary hover:bg-primary/10"
              title="Print 80mm/58mm Thermal Handover Receipt"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{t('Print Slip')}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="h-9 px-3 rounded-xl font-bold text-xs gap-1.5 flex-1 sm:flex-none border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
              title="Send Shift Summary to Store Owner's WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{t('WhatsApp Owner')}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 px-3 rounded-xl font-semibold text-xs"
            >
              {t('Cancel')}
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleConfirmLogout}
              className="h-9 px-4 rounded-xl font-black text-xs gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t('End Shift & Log Out')}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
