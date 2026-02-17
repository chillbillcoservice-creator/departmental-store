
"use client";

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Printer, Trash2, Calendar as CalendarIcon, X, RotateCcw } from 'lucide-react';
import type { Bill, InventoryItem } from '@/lib/types';
import { format, isSameDay, isSameMonth, isSameYear, isValid } from 'date-fns';

const safeFormat = (date: any, formatStr: string) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (!isValid(d)) return 'N/A';
  return format(d, formatStr);
};
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface BillHistoryProps {
  bills: Bill[];
  onClearAll?: () => void;
  currency?: string;
  inventory?: InventoryItem[];
  setInventory?: (inventory: InventoryItem[]) => void;
  venueDetails?: any;
}

type FilterType = 'all' | 'month' | 'year';

export default function BillHistory({ bills, onClearAll, currency = 'Rs.', inventory = [], setInventory, venueDetails }: BillHistoryProps) {
  const { toast } = useToast();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [date, setDate] = useState<Date | undefined>();
  const [dateInput, setDateInput] = useState('');

  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [returningItem, setReturningItem] = useState<{ bill: Bill, item: any } | null>(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('Change of Mind');

  const getReceiptPreview = (bill: Bill) => {
    if (bill.receiptPreview) return bill.receiptPreview;

    // Fallback for bills that don't have a preview saved
    return `
${(venueDetails?.name || 'UP & ABOVE').toUpperCase()}
${venueDetails?.address || ''}
${venueDetails?.contactNumber || ''}

Bill No: ${bill.id}
Date: ${safeFormat(bill.timestamp, 'PPpp')}
--------------------------------
Item            Qty       Total
--------------------------------
${bill.orderItems.map(item => `${(item.name || '').slice(0, 15).padEnd(15)} ${(item.quantity || 0).toString().padEnd(8)} ${currency}${((item.price || 0) * (item.quantity || 0)).toFixed(2)}`).join('\n')}
--------------------------------
Subtotal:         ${currency}${(bill.subtotal || 0).toFixed(2)}
Discount:        -${currency}${(bill.discount || 0).toFixed(2)}
Total Tax:        ${currency}${(bill.vatAmount || 0).toFixed(2)}
TOTAL AMOUNT:     ${currency}${(bill.total || 0).toFixed(2)}
--------------------------------
Payment Method: ${bill.paymentMethod}
${venueDetails?.receiptFooter || 'Thank you for shopping!'}
`.trim();
  };

  const filteredBills = useMemo(() => {
    const now = new Date();

    if (date) {
      return bills.filter(bill => isSameDay(new Date(bill.timestamp), date));
    }

    switch (filter) {
      case 'month':
        return bills.filter(bill => isSameMonth(new Date(bill.timestamp), now) && isSameYear(new Date(bill.timestamp), now));
      case 'year':
        return bills.filter(bill => isSameYear(new Date(bill.timestamp), now));
      case 'all':
      default:
        return bills;
    }
  }, [bills, filter, date]);

  const handlePrintBill = (bill: Bill) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt for Bill #${bill.id}</title>
            <style>
              body { font-family: monospace; margin: 20px; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>
            <pre>${getReceiptPreview(bill)}</pre>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDeleteBill = async (billId: string) => {
    try {
      await fetch(`/api/bills?id=${billId}`, { method: 'DELETE' });
      toast({
        title: "Bill Deleted",
        description: `Bill #${billId} has been successfully deleted.`,
      });
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "There was an error deleting the bill. Please try again.",
      });
    }
  };

  const handleReturnItem = () => {
    if (!returningItem || !setInventory) return;

    const { item } = returningItem;

    const updatedInventory = inventory.map(invItem => {
      if (invItem.id === item.code) {
        return { ...invItem, stock: invItem.stock + returnQuantity };
      }
      return invItem;
    });

    setInventory(updatedInventory);

    toast({
      title: "Item Returned",
      description: `Returned ${returnQuantity} unit(s) of ${item.name}. Stock updated.`,
    });

    setIsReturnDialogOpen(false);
    setReturningItem(null);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setDateInput(selectedDate ? safeFormat(selectedDate, 'dd-MM-yyyy') : '');
  }

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 4) value = `${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4)}`;
    else if (value.length > 2) value = `${value.slice(0, 2)}-${value.slice(2)}`;
    setDateInput(value);
    if (value.length === 10) {
      const [day, month, year] = value.split('-');
      const newDate = new Date(Number(year), Number(month) - 1, Number(day));
      if (!isNaN(newDate.getTime())) setDate(newDate);
    }
  };

  const getBillTitle = (bill: Bill) => {
    switch (bill.orderType) {
      case 'Dine-In' as any: return `Table ${bill.tableId as any}`;
      case 'Take-Away' as any: return 'Take Away';
      case 'Home-Delivery' as any: return bill.customerDetails?.name || 'Home Delivery';
      default: return 'Store Order';
    }
  }

  return (
    <>
      <div className="flex justify-between items-center w-full mb-4 flex-wrap gap-4">
        <div className='flex items-center gap-2 flex-wrap'>
          <Tabs value={filter} onValueChange={(value) => { setDate(undefined); setDateInput(''); setFilter(value as FilterType); }} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
              <TabsTrigger value="year">This Year</TabsTrigger>
            </TabsList>
          </Tabs>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? safeFormat(date, "PPP") : <span>Filter by date...</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
              <div className="p-4 border-t">
                <Label htmlFor="date-input">Or type a date (DD-MM-YYYY)</Label>
                <Input id="date-input" placeholder="DD-MM-YYYY" value={dateInput} onChange={handleDateInputChange} />
              </div>
            </PopoverContent>
          </Popover>
          {(date || dateInput) && (
            <Button variant="ghost" onClick={() => { setDate(undefined); setDateInput(''); }} className="h-10 px-3">
              <X className="h-4 w-4 mr-2" /> Clear
            </Button>
          )}
        </div>
        {onClearAll && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={bills.length === 0}><Trash2 className="mr-2 h-4 w-4" /> Clear All Bills</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the entire bill history.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAll}>Delete All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <ScrollArea className="h-[60vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill ID</TableHead>
              <TableHead>Order Details</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.length > 0 ? (
              filteredBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.id}</TableCell>
                  <TableCell>{getBillTitle(bill)}</TableCell>
                  <TableCell>{safeFormat(bill.timestamp, 'PPP p')}</TableCell>
                  <TableCell className="text-right font-mono">{currency}{(bill.total || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedBill(bill)} title="View Bill"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePrintBill(bill)} title="Print Bill"><Printer className="h-4 w-4" /></Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-orange-500" title="Process Return"><RotateCcw className="h-4 w-4" /></Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Process Sales Return</h4>
                            <p className="text-sm text-muted-foreground">Select item and quantity to return to stock.</p>
                          </div>
                          <div className="grid gap-2">
                            {bill.orderItems.map((oi, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-lg text-xs">
                                <span>{oi.name} (x{oi.quantity})</span>
                                <Button size="sm" variant="outline" onClick={() => {
                                  setReturningItem({ bill, item: oi });
                                  setReturnQuantity(1);
                                  setIsReturnDialogOpen(true);
                                }}>Select</Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive" title="Delete Bill"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete bill #{bill.id}.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteBill(bill.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No bills found for this period.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receipt for Bill #{selectedBill?.id}</DialogTitle></DialogHeader>
          <pre className="mt-4 text-sm font-mono whitespace-pre-wrap break-words bg-muted p-4 rounded-md max-h-[50vh] overflow-auto">
            {selectedBill ? getReceiptPreview(selectedBill) : ''}
          </pre>
        </DialogContent>
      </Dialog>

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Confirmation</DialogTitle>
            <DialogDescription>Returning <strong>{returningItem?.item.name}</strong> from Bill #{returningItem?.bill.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity to Return (Max {returningItem?.item.quantity})</Label>
              <Input type="number" value={returnQuantity} max={returningItem?.item.quantity} min={1} onChange={(e) => setReturnQuantity(Math.min(returningItem?.item.quantity || 1, parseInt(e.target.value) || 1))} />
            </div>
            <div className="space-y-2">
              <Label>Reason for Return</Label>
              <Input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReturnItem} className="bg-orange-500 hover:bg-orange-600">Complete Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
