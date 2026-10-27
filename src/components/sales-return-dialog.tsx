"use client";

import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCcw, Search, Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { Bill, InventoryItem, Customer, SalesReturn, ReturnItem } from '@/lib/types';
import { format } from 'date-fns';
import { logShiftActivity } from '@/lib/shift-manager';

interface SalesReturnDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  currency: string;
  venueDetails: any | null;
  onReturnComplete?: (salesReturn: SalesReturn) => void;
}

export function SalesReturnDialog({
  isOpen,
  onOpenChange,
  bills,
  inventory,
  setInventory,
  customers,
  setCustomers,
  currency,
  venueDetails,
  onReturnComplete,
}: SalesReturnDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [billSearch, setBillSearch] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Store-Credit'>('Cash');
  const [returnReason, setReturnReason] = useState<string>('Customer Changed Mind');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSearchBill = () => {
    if (!billSearch.trim()) return;
    const cleanSearch = billSearch.trim().toLowerCase().replace(/^#/, '');
    const found = bills.find(
      (b) =>
        b.id.toLowerCase() === cleanSearch ||
        b.id.toLowerCase() === billSearch.trim().toLowerCase() ||
        (b.customerDetails?.phone && b.customerDetails.phone.includes(cleanSearch))
    );

    if (found) {
      setSelectedBill(found);
      // Reset return quantities
      const initialQty: Record<string, number> = {};
      found.orderItems.forEach((item, index) => {
        initialQty[`${item.code || item.name}_${index}`] = 0;
      });
      setReturnQuantities(initialQty);
    } else {
      toast({
        title: t("Bill Not Found"),
        description: t("No matching bill found for this ID or phone number."),
        variant: "destructive",
      });
    }
  };

  const handleQtyChange = (key: string, qty: number, maxQty: number) => {
    const validQty = Math.max(0, Math.min(qty, maxQty));
    setReturnQuantities((prev) => ({ ...prev, [key]: validQty }));
  };

  // Calculate total refund
  const totalRefund = selectedBill
    ? selectedBill.orderItems.reduce((sum, item, index) => {
        const key = `${item.code || item.name}_${index}`;
        const qty = returnQuantities[key] || 0;
        return sum + qty * item.price;
      }, 0)
    : 0;

  const totalItemsToReturn = Object.values(returnQuantities).reduce((a, b) => a + b, 0);

  const handleProcessReturn = (shouldPrint = true) => {
    if (!selectedBill || totalRefund <= 0 || totalItemsToReturn <= 0) {
      toast({
        title: t("No Items Selected"),
        description: t("Please specify at least 1 item to return."),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const returnedItemsList: ReturnItem[] = [];

    // 1. Restock inventory
    setInventory((prevInventory) => {
      let updatedInv = [...prevInventory];
      selectedBill.orderItems.forEach((item, index) => {
        const key = `${item.code || item.name}_${index}`;
        const returnQty = returnQuantities[key] || 0;
        if (returnQty > 0) {
          returnedItemsList.push({
            itemId: item.code || '',
            name: item.name,
            quantity: returnQty,
            unitPrice: item.price,
            totalRefund: returnQty * item.price,
            reason: returnReason,
          });

          updatedInv = updatedInv.map((inv) =>
            inv.id === item.code || inv.name.toLowerCase() === item.name.toLowerCase()
              ? { ...inv, stock: inv.stock + returnQty }
              : inv
          );
        }
      });
      return updatedInv;
    });

    // 2. Handle store credit if selected
    if (refundMethod === 'Store-Credit' && selectedBill.customerDetails?.phone) {
      setCustomers((prevCustomers) =>
        prevCustomers.map((c) =>
          c.phone === selectedBill.customerDetails?.phone
            ? { ...c, balance: (c.balance || 0) - totalRefund }
            : c
        )
      );
    }

    const returnRecord: SalesReturn = {
      id: `RET-${Date.now().toString().slice(-6)}`,
      originalBillId: selectedBill.id,
      customerDetails: selectedBill.customerDetails,
      items: returnedItemsList,
      totalRefundAmount: totalRefund,
      refundMethod: refundMethod,
      timestamp: new Date(),
    };

    // Save to local storage history
    try {
      const existingReturns: SalesReturn[] = JSON.parse(
        localStorage.getItem('pos_sales_returns') || '[]'
      );
      localStorage.setItem('pos_sales_returns', JSON.stringify([returnRecord, ...existingReturns]));
    } catch (e) {
      console.error("Failed to store sales return", e);
    }

    logShiftActivity({
      type: 'refund',
      title: `Sales Refund: Bill #${selectedBill.id.slice(-6)}`,
      description: `Refund of ${currency}${totalRefund.toFixed(2)} (${refundMethod})`,
      amount: totalRefund,
      paymentMethod: refundMethod === 'Cash' ? 'Cash' : undefined,
      referenceId: returnRecord.id,
    });

    if (onReturnComplete) {
      onReturnComplete(returnRecord);
    }

    toast({
      title: t("Return Processed"),
      description: `${currency}${totalRefund.toFixed(2)} ${t("refunded via")} ${refundMethod}. ${t("Inventory restocked.")}`,
    });

    if (shouldPrint) {
      printReturnReceipt(returnRecord);
    }

    setIsProcessing(false);
    handleClose();
  };

  const printReturnReceipt = (returnRecord: SalesReturn) => {
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Credit Note - ${returnRecord.id}</title>
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
          <div class="badge">CREDIT NOTE / RETURN RECEIPT</div>
        </div>
        <div class="divider"></div>
        <div class="flex"><span>Return No:</span><span>${returnRecord.id}</span></div>
        <div class="flex"><span>Original Bill:</span><span>#${returnRecord.originalBillId}</span></div>
        <div class="flex"><span>Date:</span><span>${format(new Date(returnRecord.timestamp), 'dd/MM/yyyy HH:mm')}</span></div>
        ${returnRecord.customerDetails ? `<div class="flex"><span>Customer:</span><span>${returnRecord.customerDetails.name}</span></div>` : ''}
        <div class="divider"></div>
        <div class="bold flex"><span>Item</span><span>Qty &times; Price</span><span>Total</span></div>
        <div class="divider"></div>
        ${returnRecord.items
          .map(
            (item) => `
          <div class="flex">
            <span>${item.name.slice(0, 14)}</span>
            <span>${item.quantity} &times; ${item.unitPrice.toFixed(2)}</span>
            <span class="bold">${currency}${item.totalRefund.toFixed(2)}</span>
          </div>`
          )
          .join('')}
        <div class="divider"></div>
        <div class="flex bold" style="font-size: 14px;">
          <span>TOTAL REFUND:</span>
          <span>${currency}${returnRecord.totalRefundAmount.toFixed(2)}</span>
        </div>
        <div class="flex"><span>Refund Method:</span><span>${returnRecord.refundMethod}</span></div>
        <div class="flex"><span>Reason:</span><span>${returnReason}</span></div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px; margin-top: 10px;">
          ITEMS RESTOCKED IN SYSTEM<br/>THANK YOU
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const handleClose = () => {
    setSelectedBill(null);
    setBillSearch('');
    setReturnQuantities({});
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <RotateCcw className="h-5 w-5 text-primary" />
            {t("Sales Return & Item Exchange")}
          </DialogTitle>
          <DialogDescription>
            {t("Search an original bill to process returns, restock inventory, and issue cash refund or store credit.")}
          </DialogDescription>
        </DialogHeader>

        {/* Bill Search Section */}
        <div className="flex gap-2 items-center bg-muted/40 p-3 rounded-2xl border border-border/50">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("Enter Bill ID (e.g. 01, 12) or Customer Mobile...")}
              value={billSearch}
              onChange={(e) => setBillSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchBill()}
              className="pl-9 h-11 bg-background font-bold text-sm rounded-xl"
              autoFocus
            />
          </div>
          <Button onClick={handleSearchBill} className="h-11 px-5 rounded-xl font-bold">
            {t("Lookup Bill")}
          </Button>
        </div>

        {/* Bill Details & Item Selection */}
        {selectedBill ? (
          <div className="space-y-4 animate-in fade-in-50">
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 flex flex-wrap justify-between items-center gap-2">
              <div>
                <div className="text-xs uppercase font-black text-muted-foreground tracking-wider">
                  {t("Original Bill")}
                </div>
                <div className="text-lg font-black text-primary">#{selectedBill.id}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(selectedBill.timestamp), 'PPpp')} &bull; {selectedBill.paymentMethod}
                </div>
              </div>
              {selectedBill.customerDetails && (
                <div className="text-right">
                  <div className="text-xs uppercase font-black text-muted-foreground tracking-wider">
                    {t("Customer")}
                  </div>
                  <div className="font-bold text-sm">{selectedBill.customerDetails.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedBill.customerDetails.phone}</div>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="border border-border/60 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-muted/50 p-2.5 font-bold text-xs uppercase tracking-wider text-muted-foreground grid grid-cols-12 gap-2">
                <span className="col-span-5">{t("Purchased Item")}</span>
                <span className="col-span-2 text-center">{t("Bought")}</span>
                <span className="col-span-2 text-right">{t("Price")}</span>
                <span className="col-span-3 text-center">{t("Return Qty")}</span>
              </div>
              <div className="divide-y divide-border/40">
                {selectedBill.orderItems.map((item, index) => {
                  const key = `${item.code || item.name}_${index}`;
                  const currentReturnQty = returnQuantities[key] || 0;
                  return (
                    <div key={key} className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/20 text-sm">
                      <div className="col-span-5">
                        <div className="font-bold text-foreground line-clamp-1">{item.name}</div>
                        {item.code && <span className="text-[10px] font-mono text-muted-foreground">Code: {item.code}</span>}
                      </div>
                      <div className="col-span-2 text-center font-bold">
                        {item.quantity}
                      </div>
                      <div className="col-span-2 text-right font-bold text-muted-foreground">
                        {currency}{(item.price || 0).toFixed(2)}
                      </div>
                      <div className="col-span-3 flex items-center justify-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleQtyChange(key, currentReturnQty - 1, item.quantity)}
                          disabled={currentReturnQty <= 0}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={currentReturnQty}
                          onChange={(e) => handleQtyChange(key, parseInt(e.target.value) || 0, item.quantity)}
                          className="h-8 w-14 text-center font-bold text-sm p-1 rounded-lg"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleQtyChange(key, currentReturnQty + 1, item.quantity)}
                          disabled={currentReturnQty >= item.quantity}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Return Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("Refund Method")}
                </Label>
                <Select
                  value={refundMethod}
                  onValueChange={(val: 'Cash' | 'Store-Credit') => setRefundMethod(val)}
                >
                  <SelectTrigger className="h-10 rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">{t("Cash Refund (Drawer)")}</SelectItem>
                    <SelectItem value="Store-Credit">
                      {t("Store Credit / Khata Balance")}
                      {!selectedBill.customerDetails && ` (${t("Requires Customer")})`}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("Reason for Return")}
                </Label>
                <Select value={returnReason} onValueChange={setReturnReason}>
                  <SelectTrigger className="h-10 rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer Changed Mind">{t("Customer Changed Mind")}</SelectItem>
                    <SelectItem value="Damaged / Defective">{t("Damaged / Defective Pack")}</SelectItem>
                    <SelectItem value="Expired Product">{t("Expired Product")}</SelectItem>
                    <SelectItem value="Wrong Item Picked">{t("Wrong Item Picked")}</SelectItem>
                    <SelectItem value="Other">{t("Other Reason")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Refund Total Summary Banner */}
            <div className="flex justify-between items-center p-4 bg-muted/60 rounded-2xl border border-border">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground block">
                  {t("Total Refund Payable")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {totalItemsToReturn} {t("items selected for restocking")}
                </span>
              </div>
              <div className="text-2xl font-black text-primary">
                {currency}{totalRefund.toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <RotateCcw className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-sm">{t("Enter a Bill ID or customer phone number above to initiate return.")}</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="outline" onClick={handleClose} className="rounded-xl">
            {t("Cancel")}
          </Button>
          {selectedBill && totalRefund > 0 && (
            <Button
              onClick={() => handleProcessReturn(true)}
              disabled={isProcessing}
              className="rounded-xl font-black gap-2"
            >
              <Printer className="h-4 w-4" />
              {t("Restock & Print Credit Note")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
