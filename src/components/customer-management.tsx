"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Search, Trash2, Eye, Printer, Mail, CalendarDays, ShoppingBag, ArrowUpDown, ChevronDown, ChevronUp, HandCoins, ChevronsUpDown, CalendarIcon, AlertTriangle } from 'lucide-react';
import type { Bill, Customer, PendingBill, PendingBillTransaction } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isValid } from 'date-fns';
import { Textarea } from './ui/textarea';

const safeFormat = (date: any, formatStr: string) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (!isValid(d)) return 'N/A';
  return format(d, formatStr);
};

// Generate unique ID to prevent duplicate keys
const generateUniqueId = () => {
  return `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
};
import { ScrollArea } from './ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';

interface CustomerManagementProps {
  billHistory: Bill[];
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  pendingBills: PendingBill[];
  setPendingBills: (bills: PendingBill[]) => void;
  customerCreditLimit: number;
  currency: string;
}

function AddOrEditCustomerDialog({
  open,
  onOpenChange,
  onSave,
  existingCustomer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customer: Omit<Customer, 'id' | 'firstSeen' | 'lastSeen' | 'totalVisits' | 'totalSpent'> & { id?: string }) => void;
  existingCustomer: Customer | null;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (existingCustomer) {
      setName(existingCustomer.name);
      setPhone(existingCustomer.phone);
      setEmail(existingCustomer.email || '');
      setAddress(existingCustomer.address || '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
    }
  }, [existingCustomer, open]);

  const handleSave = () => {
    if (name && phone) {
      onSave({
        id: existingCustomer?.id,
        name,
        phone,
        email,
        address,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingCustomer ? t('Edit Customer') : t('Add New Customer')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">{t('Customer Name')}</Label>
            <Input id="customer-name" value={name} onChange={e => setName(e.target.value)} placeholder={t('e.g., Jane Doe')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-phone">{t('Phone Number')}</Label>
            <Input id="customer-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('e.g., 9876543210')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-email">{t('Email (Optional)')}</Label>
            <Input id="customer-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g., jane.d@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-address">{t('Address (Optional)')}</Label>
            <Textarea id="customer-address" value={address} onChange={e => setAddress(e.target.value)} placeholder={t('Full Address')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
          <Button onClick={handleSave}>{t('Save Customer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerHistoryDialog({
  isOpen,
  onOpenChange,
  customer,
  bills,
  pendingHistory,
  onSettle,
  currency,
  viewSimpleTransaction,
  setViewSimpleTransaction,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  bills: Bill[];
  pendingHistory?: PendingBill;
  onSettle: (billId: string, transactionId: string, amount: number) => void;
  currency: string;
  viewSimpleTransaction: { name: string, date: Date, amount: number, description?: string } | null;
  setViewSimpleTransaction: (val: { name: string, date: Date, amount: number, description?: string } | null) => void;
}) {
  const { t } = useLanguage();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [activeTab, setActiveTab] = useState<'bills' | 'pending'>('bills');

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
            <pre>${bill.receiptPreview}</pre>
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('Transaction History')} - {customer.name}</DialogTitle>
            <DialogDescription>
              {t('Full record of bills and outstanding credit.')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTab === 'bills' ? 'default' : 'outline'}
              onClick={() => setActiveTab('bills')}
              className="flex-1"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              {t('Paid Bills')} ({bills.length})
            </Button>
            <Button
              variant={activeTab === 'pending' ? 'default' : 'outline'}
              onClick={() => setActiveTab('pending')}
              className="flex-1"
            >
              <HandCoins className="mr-2 h-4 w-4" />
              {t('Credit Account')} ({pendingHistory?.transactions.length || 0})
            </Button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {activeTab === 'bills' ? (
              bills.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Bill ID')}</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead className="text-right">{t('Amount')}</TableHead>
                      <TableHead className="text-center">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.slice().reverse().map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-bold">#{bill.id}</TableCell>
                        <TableCell>{safeFormat(bill.timestamp, "MMM d, h:mm a")}</TableCell>
                        <TableCell className="text-right font-black">
                          {currency}{bill.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedBill(bill)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handlePrintBill(bill)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-20 text-center opacity-50">
                  <ShoppingBag className="mx-auto h-12 w-12 mb-2" />
                  <p>{t('No bill history found.')}</p>
                </div>
              )
            ) : (
              pendingHistory && pendingHistory.transactions.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-destructive/5 border-2 border-destructive/20 border-dashed rounded-2xl text-center">
                    <p className="text-xs font-black text-destructive uppercase tracking-widest mb-1">{t('Total Outstanding Balance')}</p>
                    <p className="text-4xl font-black text-destructive">
                      {currency}{pendingHistory.transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('Transaction ID')}</TableHead>
                        <TableHead>{t('Date')}</TableHead>
                        <TableHead className="text-right">{t('Amount')}</TableHead>
                        <TableHead className="text-right">{t('Action')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingHistory.transactions.slice().reverse().map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs font-mono">{tx.id.substring(0, 8)}...</TableCell>
                          <TableCell>{safeFormat(tx.date, "MMM d, h:mm a")}</TableCell>
                          <TableCell className="text-right font-black text-destructive">
                            {currency}{tx.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-2 opacity-100 transition-opacity">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7"
                              onClick={() => {
                                const billIdMatch = tx.description?.match(/Bill #(\w+)/);
                                const billId = billIdMatch ? billIdMatch[1] : null;
                                const foundBill = billId ? bills.find(b => b.id === billId) : null;

                                if (foundBill) {
                                  setSelectedBill(foundBill);
                                } else {
                                  // Fallback for manual bills - SHOW DLALog, don't print
                                  setViewSimpleTransaction({
                                    name: customer.name,
                                    date: new Date(tx.date),
                                    amount: tx.amount,
                                    description: tx.description
                                  });
                                }
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> {t('View')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7"
                              onClick={() => {
                                const printWindow = window.open('', '_blank');
                                if (printWindow) {
                                  printWindow.document.write(`
                                               <html><head><title>Payment Advice</title></head><body>
                                               <h2 style="margin:0">${customer.name}</h2>
                                               <p>Pending Amount Advice</p>
                                               <hr/>
                                               <p><strong>Date:</strong> ${new Date(tx.date).toLocaleString()}</p>
                                               <p><strong>Amount:</strong> ${currency}${tx.amount.toFixed(2)}</p>
                                               <p><strong>ID:</strong> ${tx.id}</p>
                                               <hr/>
                                               <script>window.onload = function() { window.print(); window.close(); }</script>
                                               </body></html>
                                           `);
                                  printWindow.document.close();
                                }
                              }}
                            >
                              <Printer className="h-3 w-3 mr-1" /> {t('Print')}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 h-7"
                              onClick={() => onSettle(pendingHistory.id, tx.id, tx.amount)}
                            >
                              {t('Settle')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-20 text-center opacity-50">
                  <HandCoins className="mx-auto h-12 w-12 mb-2" />
                  <p>{t('No pending balances.')}</p>
                </div>
              )
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="w-full">{t('Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Receipt for Bill')} #{selectedBill?.id}</DialogTitle>
            <DialogDescription>{safeFormat(selectedBill?.timestamp, 'PPP p')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto bg-muted/20 rounded-xl p-4 border border-border/50">
            {selectedBill?.receiptPreview ? (
              <pre className="font-mono text-sm whitespace-pre-wrap">{selectedBill.receiptPreview}</pre>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Item')}</TableHead>
                    <TableHead className="text-right">{t('Qty')}</TableHead>
                    <TableHead className="text-right">{t('Price')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBill?.orderItems?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">{currency}{item.price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell colSpan={2} className="text-right">{t('Total')}</TableCell>
                    <TableCell className="text-right">{currency}{selectedBill?.total.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button className="w-full bg-primary hover:bg-primary/90 h-11 rounded-xl text-white font-black shadow-lg" onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow && selectedBill) {
                printWindow.document.write(`<html><head><title>Bill #${selectedBill.id}</title></head><body><pre style="font-family: monospace;">${selectedBill.receiptPreview}</pre><script>window.onload=function(){window.print();window.close();}</script></body></html>`);
                printWindow.document.close();
              }
            }}>
              <Printer className="mr-2 h-4 w-4" /> {t('Print Receipt')}
            </Button>
            <Button variant="ghost" className="w-full h-11 rounded-xl font-bold" onClick={() => setSelectedBill(null)}>{t('Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewSimpleTransaction} onOpenChange={() => setViewSimpleTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Transaction Details')}</DialogTitle>
            <DialogDescription>{viewSimpleTransaction && safeFormat(viewSimpleTransaction.date, 'PPP p')}</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl">
              <span className="text-sm font-bold text-muted-foreground uppercase">{t('Customer')}</span>
              <span className="font-black text-lg">{viewSimpleTransaction?.name}</span>
            </div>
            <div className="flex justify-between items-center bg-green-50 dark:bg-green-950/20 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
              <span className="text-sm font-bold text-green-700 dark:text-green-400 uppercase">{t('Amount')}</span>
              <span className="font-black text-2xl text-green-600 dark:text-green-400">{currency}{viewSimpleTransaction?.amount.toFixed(2)}</span>
            </div>
            {viewSimpleTransaction?.description && (
              <div className="space-y-1.5 px-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('Description')}</span>
                <p className="text-sm font-medium bg-muted/20 p-3 rounded-lg border border-border/50">{viewSimpleTransaction.description}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button className="w-full h-11 rounded-xl font-black text-base shadow-lg bg-primary hover:bg-primary/90 text-white" onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow && viewSimpleTransaction) {
                printWindow.document.write(`
                  <html><head><title>Transaction Details</title></head><body>
                  <pre style="font-family: monospace;">
---------------------------------------
      TRANSACTION DETAILS
---------------------------------------
Customer:    ${viewSimpleTransaction.name}
Date:        ${new Date(viewSimpleTransaction.date).toLocaleString()}
Amount:      ${currency}${viewSimpleTransaction.amount.toFixed(2)}
---------------------------------------
Description: ${viewSimpleTransaction.description || 'N/A'}
---------------------------------------
                  </pre>
                  <script>window.onload = function() { window.print(); window.close(); }</script>
                  </body></html>
                `);
                printWindow.document.close();
              }
            }}>
              <Printer className="mr-2 h-4 w-4" /> {t('Print Bill')}
            </Button>
            <Button variant="ghost" className="w-full h-11 rounded-xl font-bold" onClick={() => setViewSimpleTransaction(null)}>{t('Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddOrEditPendingBillDialog({
  open,
  onOpenChange,
  onSave,
  existingNames,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, amount: number, mobile?: string, dueDate?: Date) => void;
  existingNames: string[];
  currency: string;
}) {
  const { t } = useLanguage();
  const [isNew, setIsNew] = useState(true);
  const [selectedName, setSelectedName] = useState('');
  const [newName, setNewName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [mobile, setMobile] = useState('');

  useEffect(() => {
    if (open) {
      setIsNew(true);
      setSelectedName('');
      setNewName('');
      setAmount('');
      setDueDate(undefined);
      setMobile('');
    }
  }, [open]);

  const handleSave = () => {
    const finalName = isNew ? newName : selectedName;
    if (!finalName || !amount) {
      alert('Please provide a name and amount.');
      return;
    }
    onSave(finalName, parseFloat(amount), mobile, dueDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Add Pending Bill')}</DialogTitle>
          <DialogDescription>
            {t('Record a new transaction for a customer')}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('Select or Add')} {t('Customer')}</Label>
            <div className="flex items-center gap-4">
              <Button
                variant={!isNew ? "default" : "outline"}
                onClick={() => setIsNew(false)}
                className={cn(!isNew && "bg-primary text-primary-foreground")}
              >
                {t('Existing')}
              </Button>
              <Button
                variant={isNew ? "default" : "outline"}
                onClick={() => setIsNew(true)}
                className={cn(isNew && "bg-primary text-primary-foreground")}
              >
                {t('New')}
              </Button>
            </div>
            {isNew ? (
              <Input
                placeholder={`${t('New')} ${t('Customer')} ${t('name')}`}
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            ) : (
              <Select onValueChange={setSelectedName} value={selectedName}>
                <SelectTrigger>
                  <SelectValue placeholder={`${t('Select existing')} ${t('Customer')}`} />
                </SelectTrigger>
                <SelectContent>
                  {existingNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {isNew && (
            <div className="space-y-2">
              <Label htmlFor="mobile">{t('Mobile No. (Optional)')}</Label>
              <Input id="mobile" placeholder={t('e.g., 9876543210')} value={mobile} onChange={e => setMobile(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">{t('Amount')} ({currency})</Label>
            <Input id="amount" type="number" placeholder="e.g., 500" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('Due Date (Optional)')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? safeFormat(dueDate, "PPP") : <span>{t('Pick a date')}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
          <Button onClick={handleSave}>{t('Save Bill')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerManagement({
  billHistory,
  customers: initialCustomers,
  setCustomers,
  pendingBills,
  setPendingBills,
  customerCreditLimit,
  currency = 'Rs.'
}: CustomerManagementProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [isAddOrEditDialogOpen, setIsAddOrEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Customer>('lastSeen');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewingHistoryFor, setViewingHistoryFor] = useState<Customer | null>(null);
  const [isAddBillDialogOpen, setIsAddBillDialogOpen] = useState(false);
  const [isLimitExceededDialogOpen, setIsLimitExceededDialogOpen] = useState(false);
  const [viewTransactionBill, setViewTransactionBill] = useState<Bill | null>(null);
  const [pendingBillsSearchTerm, setPendingBillsSearchTerm] = useState('');
  const [isPendingBillsOpen, setIsPendingBillsOpen] = useState(false);
  const [isCustomerDatabaseOpen, setIsCustomerDatabaseOpen] = useState(true);
  const [viewSimpleTransaction, setViewSimpleTransaction] = useState<{ name: string, date: Date, amount: number, description?: string } | null>(null);

  const customerPendingBills = useMemo(() => {
    let bills = pendingBills.filter(b => b.type === 'customer');
    if (pendingBillsSearchTerm) {
      const lower = pendingBillsSearchTerm.toLowerCase();
      bills = bills.filter(b => b.name.toLowerCase().includes(lower) || b.mobile?.includes(lower));
    }
    return bills;
  }, [pendingBills, pendingBillsSearchTerm]);

  const totalPending = useMemo(() => customerPendingBills.reduce((total, bill) => {
    return total + bill.transactions.reduce((sum, t) => sum + t.amount, 0);
  }, 0), [customerPendingBills]);

  const totalProgress = customerCreditLimit > 0 ? (totalPending / customerCreditLimit) * 100 : 0;

  const aggregatedCustomers = useMemo(() => {
    const customerMap = new Map<string, Customer>();
    const deletedCustomerIds = new Set(initialCustomers.filter(c => c.isDeleted).map(c => c.id));

    initialCustomers.forEach(cust => {
      if (!cust.isDeleted) {
        customerMap.set(cust.id, {
          ...cust,
          totalVisits: cust.totalVisits || 0,
          totalSpent: cust.totalSpent || 0,
          lastSeen: cust.lastSeen || cust.firstSeen,
        });
      }
    });

    billHistory.forEach(bill => {
      if (!bill.customerDetails || !bill.customerDetails.phone || deletedCustomerIds.has(bill.customerDetails.phone)) {
        return;
      }

      const { phone, name, email, address } = bill.customerDetails;
      const existing = customerMap.get(phone);
      const billTimestamp = new Date(bill.timestamp);

      if (existing) {
        existing.totalSpent += bill.total;
        existing.totalVisits += 1;
        if (billTimestamp > new Date(existing.lastSeen)) {
          existing.lastSeen = billTimestamp;
        }
      } else {
        customerMap.set(phone, {
          id: phone,
          phone,
          name,
          email: email || '',
          address: address || '',
          firstSeen: billTimestamp,
          lastSeen: billTimestamp,
          totalVisits: 1,
          totalSpent: bill.total,
        });
      }
    });

    pendingBills.filter(pb => pb.type === 'customer').forEach(pBill => {
      const balance = pBill.transactions.reduce((sum, tx) => sum + tx.amount, 0);
      if (pBill.mobile) {
        const existing = customerMap.get(pBill.mobile);
        if (existing) {
          existing.balance = (existing.balance || 0) + balance;
        } else if (!deletedCustomerIds.has(pBill.mobile)) {
          const firstTxDate = pBill.transactions.length > 0 ? new Date(pBill.transactions[0].date) : new Date();
          customerMap.set(pBill.mobile, {
            id: pBill.mobile,
            phone: pBill.mobile,
            name: pBill.name,
            email: '',
            address: '',
            firstSeen: firstTxDate,
            lastSeen: firstTxDate,
            totalVisits: 1,
            totalSpent: 0,
            balance: balance
          });
        }
      }
    });

    return Array.from(customerMap.values());
  }, [billHistory, pendingBills, initialCustomers]);

  const sortedAndFilteredCustomers = useMemo(() => {
    let filtered = aggregatedCustomers;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(lowerTerm) ||
        c.phone.includes(lowerTerm)
      );
    }

    return filtered.sort((a, b) => {
      let comparison = 0;
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA !== undefined && valB !== undefined) {
        if (valA > valB) comparison = 1;
        else if (valA < valB) comparison = -1;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [aggregatedCustomers, searchTerm, sortField, sortDirection]);

  const handleSort = (field: keyof Customer) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSaveCustomer = (customerData: Omit<Customer, 'id' | 'firstSeen' | 'lastSeen' | 'totalVisits' | 'totalSpent'> & { id?: string }) => {
    const { id, ...data } = customerData;
    const docId = id || data.phone;

    if (!docId) {
      toast({ variant: 'destructive', title: t('Phone number is required.') });
      return;
    }

    const existingCustomerIndex = initialCustomers.findIndex(c => c.id === docId);
    let newCustomers;

    if (existingCustomerIndex > -1) {
      newCustomers = [...initialCustomers];
      newCustomers[existingCustomerIndex] = { ...newCustomers[existingCustomerIndex], ...data, isDeleted: false };
    } else {
      const newCustomer: Customer = {
        id: docId,
        ...data,
        firstSeen: new Date(),
        lastSeen: new Date(),
        totalVisits: 0,
        totalSpent: 0,
        isDeleted: false,
      };
      newCustomers = [...initialCustomers, newCustomer];
    }

    setCustomers(newCustomers);
    toast({ title: id ? t('Customer Updated') : t('Customer Saved') });
  };

  const handleDeleteCustomer = (customerId: string) => {
    const customerIndex = initialCustomers.findIndex(c => c.id === customerId);

    let newCustomers;
    if (customerIndex > -1) {
      newCustomers = [...initialCustomers];
      newCustomers[customerIndex].isDeleted = true;
    } else {
      const customerFromBills = aggregatedCustomers.find(c => c.id === customerId);
      if (customerFromBills) {
        const newEntry: Customer = {
          ...customerFromBills,
          totalVisits: 0,
          totalSpent: 0,
          isDeleted: true
        };
        newCustomers = [...initialCustomers, newEntry];
      } else {
        toast({ title: t('Error'), description: t('Could not find customer to delete.') });
        return;
      }
    }

    setCustomers(newCustomers);
    toast({ title: t('Customer Deleted'), description: t('They will no longer appear in the CRM.') });
  };

  const isValidDate = (date: any) => {
    return date && !isNaN(new Date(date).getTime());
  };

  const getBillsForCustomer = (customerPhone: string) => {
    return billHistory.filter(
      (bill) => bill.customerDetails?.phone === customerPhone
    );
  };

  const handleAddPendingTransaction = async (name: string, amount: number, mobile?: string, dueDate?: Date) => {
    if (totalPending + amount > customerCreditLimit) {
      setIsLimitExceededDialogOpen(true);
      return;
    }

    const newTransaction: PendingBillTransaction = {
      id: generateUniqueId(),
      amount,
      date: new Date(),
    };

    const existingBillIndex = pendingBills.findIndex(b => b.name.toLowerCase() === name.toLowerCase() && b.type === 'customer');
    let newPendingBills;

    if (existingBillIndex > -1) {
      newPendingBills = [...pendingBills];
      const existingBill = { ...newPendingBills[existingBillIndex] };
      existingBill.transactions = [...existingBill.transactions, newTransaction];
      newPendingBills[existingBillIndex] = existingBill;
    } else {
      const newBill: PendingBill = {
        id: generateUniqueId(),
        name,
        type: 'customer',
        transactions: [newTransaction],
        ...(mobile && { mobile }),
      };
      newPendingBills = [...pendingBills, newBill];
    }
    setPendingBills(newPendingBills);
    toast({ title: t('Pending bill added.') });
  };

  const handleClearAllPendingBillsForPerson = async (billId: string) => {
    const billToClear = pendingBills.find(b => b.id === billId);
    if (!billToClear) return;

    const newPendingBills = pendingBills.filter(b => b.id !== billId);
    setPendingBills(newPendingBills);
    toast({ title: t(`${billToClear.name}'s pending bills have been cleared.`) });
  };

  const handleSettleTransaction = async (billId: string, transactionId: string, amount: number) => {
    const billToUpdate = pendingBills.find(b => b.id === billId);
    if (!billToUpdate) return;

    const updatedTransactions = billToUpdate.transactions.filter(tx => tx.id !== transactionId);
    let newPendingBills;
    if (updatedTransactions.length === 0) {
      newPendingBills = pendingBills.filter(b => b.id !== billId);
    } else {
      newPendingBills = pendingBills.map(b => b.id === billId ? { ...b, transactions: updatedTransactions } : b);
    }

    setPendingBills(newPendingBills);
    toast({ title: t("Transaction Settled"), description: t(`${billToUpdate.name}'s transaction has been settled.`) });
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <HandCoins className="h-6 w-6" />
                  {t('To Collect from Customers')}
                </CardTitle>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("Search details...")}
                  className="pl-9 w-96"
                  value={pendingBillsSearchTerm}
                  onChange={(e) => {
                    setPendingBillsSearchTerm(e.target.value);
                    if (e.target.value) setIsPendingBillsOpen(true);
                  }}
                />
              </div>
              <div className="flex-1 flex justify-end items-center gap-2">
                <Button onClick={() => setIsAddBillDialogOpen(true)} className="bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary border shadow-sm transition-all">
                  <PlusCircle className="mr-2 h-4 w-4" /> {t('Add Bill')}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsPendingBillsOpen(!isPendingBillsOpen)}>
                  {isPendingBillsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-green-600">{currency}{totalPending.toFixed(2)}</span>
                <span className="text-muted-foreground">{t('Overall Limit')}: {currency}{customerCreditLimit.toLocaleString()}</span>
              </div>
              <Progress value={totalProgress} indicatorClassName={totalProgress > 100 ? "bg-red-500" : "bg-green-500"} />
            </div>
          </div>
        </CardHeader>

        {isPendingBillsOpen && (
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {customerPendingBills.length > 0 ? customerPendingBills.map((bill, index) => {
                const totalForName = bill.transactions.reduce((sum, t) => sum + t.amount, 0);
                return (
                  <Collapsible key={`${bill.id}-${index}`} className="p-2 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex flex-grow items-center gap-2 text-left">
                        <ChevronsUpDown className="h-4 w-4" />
                        <span className="font-medium">{bill.name}</span>
                        <span className="font-semibold text-sm text-green-600">({currency}{totalForName.toFixed(2)})</span>
                      </CollapsibleTrigger>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">{t('Clear All')}</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('This will mark all pending bills for')} {bill.name} {t('as paid and clear their balance. This action cannot be undone.')}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleClearAllPendingBillsForPerson(bill.id)}>{t('Confirmed')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <CollapsibleContent className="mt-2 space-y-1 pr-2 max-h-48 overflow-y-auto">
                      {bill.transactions.map((tx, txIndex) => (
                        <div key={`${tx.id}-${txIndex}`} className="flex justify-between items-center p-1.5 bg-muted/50 rounded-md text-sm group">
                          <div>
                            <span>{safeFormat(tx.date, 'PPP')}</span>
                            <span className="font-semibold ml-4 text-green-700">{currency}{tx.amount.toFixed(2)}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7"
                              onClick={() => {
                                const billIdMatch = tx.description?.match(/Bill #(\w+)/);
                                const billId = billIdMatch ? billIdMatch[1] : null;
                                const foundBill = billId ? billHistory.find(b => b.id === billId) : null;

                                if (foundBill) {
                                  setViewTransactionBill(foundBill);
                                } else {
                                  // Fallback - Show dialog, don't print
                                  setViewSimpleTransaction({
                                    name: bill.name,
                                    date: new Date(tx.date),
                                    amount: tx.amount,
                                    description: tx.description
                                  });
                                }
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> {t('View')}
                            </Button>
                            <Button variant="outline" size="sm" className="h-7" onClick={() => {
                              const printWindow = window.open('', '_blank');
                              if (printWindow) {
                                printWindow.document.write(`
                                             <html><head><title>Payment Advice</title></head><body>
                                             <h2 style="margin:0">${bill.name}</h2>
                                             <p>Pending Amount Advice</p>
                                             <hr/>
                                             <p><strong>Date:</strong> ${new Date(tx.date).toLocaleString()}</p>
                                             <p><strong>Amount:</strong> ${currency}${tx.amount.toFixed(2)}</p>
                                             <p><strong>ID:</strong> ${tx.id}</p>
                                             <hr/>
                                             <script>window.onload = function() { window.print(); window.close(); }</script>
                                             </body></html>
                                         `);
                                printWindow.document.close();
                              }
                            }}>
                              <Printer className="h-3.5 w-3.5 mr-1" /> {t('Print')}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 text-white font-bold">{t('Settle')}</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('Settle this transaction?')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('This will settle the transaction of')} {currency}{tx.amount.toFixed(2)} {t('for')} {bill.name}. {t('This cannot be undone.')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleSettleTransaction(bill.id, tx.id, tx.amount)}>{t('Settle')}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              }) : (
                <div className="text-center py-8 text-muted-foreground">{t('No pending customer bills found.')}</div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <CardTitle>{t('Customer Database')}</CardTitle>
              <CardDescription>{t('View and manage your customers.')}</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Search by name or phone...')}
                className="pl-9 w-96"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value) setIsCustomerDatabaseOpen(true);
                }}
              />
            </div>
            <div className="flex-1 flex justify-end items-center gap-2">
              <Button onClick={() => { setEditingCustomer(null); setIsAddOrEditDialogOpen(true); }} className="bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary border shadow-sm transition-all">
                <PlusCircle className="mr-2 h-4 w-4" /> {t('Add New Customer')}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsCustomerDatabaseOpen(!isCustomerDatabaseOpen)}>
                {isCustomerDatabaseOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {isCustomerDatabaseOpen && (
          <CardContent>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedAndFilteredCustomers.map(customer => (
                  <Card key={customer.id} className="flex flex-col border-primary/40">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{customer.name}</CardTitle>
                          <CardDescription>{customer.phone}</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCustomer(customer); setIsAddOrEditDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-muted rounded-md">
                          <p className="text-xs text-muted-foreground">{t('Visits')}</p>
                          <p className="text-lg font-bold">{customer.totalVisits}</p>
                        </div>
                        <div className="p-2 bg-muted rounded-md col-span-2">
                          <p className="text-xs text-muted-foreground">{t('Total Spent')}</p>
                          <p className="text-lg font-bold font-mono">{currency}{customer.totalSpent.toFixed(2)}</p>
                        </div>
                      </div>

                      {customer.balance && customer.balance > 0 && (
                        <div className="p-3 bg-destructive/10 border-2 border-destructive/20 border-dashed rounded-xl overflow-hidden relative group">
                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive animate-bounce" />
                              <span className="text-xs font-black text-destructive uppercase tracking-widest">{t('Balance Due')}</span>
                            </div>
                            <span className="text-xl font-black text-destructive tracking-tighter">
                              {currency}{customer.balance.toFixed(2)}
                            </span>
                          </div>
                          <div className="absolute inset-0 bg-destructive/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                        </div>
                      )}

                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarDays className="h-4 w-4" />
                          <span>{t('Last seen:')} {safeFormat(customer.lastSeen, 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{customer.email || t('No email')}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="w-full" onClick={() => setViewingHistoryFor(customer)}>
                        <ShoppingBag className="mr-2 h-4 w-4" /> {t('History')}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full">
                            <Trash2 className="mr-2 h-4 w-4" /> {t('Delete')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="z-[9999]">
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('This action will permanently delete')} {customer.name} {t('from your customer list. Their historical billing data will remain, but they will no longer appear in the CRM.')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)}>{t('Delete')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>

      <AddOrEditCustomerDialog
        open={isAddOrEditDialogOpen}
        onOpenChange={setIsAddOrEditDialogOpen}
        onSave={handleSaveCustomer}
        existingCustomer={editingCustomer}
      />

      {viewingHistoryFor && (
        <CustomerHistoryDialog
          isOpen={!!viewingHistoryFor}
          onOpenChange={(open) => !open && setViewingHistoryFor(null)}
          customer={viewingHistoryFor}
          bills={getBillsForCustomer(viewingHistoryFor.phone)}
          pendingHistory={pendingBills.find(pb => pb.mobile === viewingHistoryFor.phone && pb.type === 'customer')}
          onSettle={handleSettleTransaction}
          currency={currency}
          viewSimpleTransaction={viewSimpleTransaction}
          setViewSimpleTransaction={setViewSimpleTransaction}
        />
      )}

      <AddOrEditPendingBillDialog
        open={isAddBillDialogOpen}
        onOpenChange={setIsAddBillDialogOpen}
        onSave={handleAddPendingTransaction}
        existingNames={aggregatedCustomers.map(c => c.name)}
        currency={currency}
      />

      <Dialog open={isLimitExceededDialogOpen} onOpenChange={setIsLimitExceededDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" />{t('Credit Limit Exceeded')}</DialogTitle>
            <DialogDescription>
              {t('Adding this amount would exceed the total customer credit limit of')} <span className="font-bold">{currency}{customerCreditLimit.toLocaleString()}</span>.
              <br /><br />
              {t('Please enter a lower amount or go to the')} <strong>{t('Admin')} &gt; {t('Financial Settings')}</strong> {t('to adjust the credit limit.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsLimitExceededDialogOpen(false)}>{t('OK')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!viewTransactionBill} onOpenChange={(open) => !open && setViewTransactionBill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Bill Details')} #{viewTransactionBill?.id}</DialogTitle>
            <DialogDescription>{safeFormat(viewTransactionBill?.timestamp, 'PPP p')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Item')}</TableHead>
                  <TableHead className="text-right">{t('Qty')}</TableHead>
                  <TableHead className="text-right">{t('Price')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewTransactionBill?.orderItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                    <TableCell className="text-right font-mono">{currency}{item.price.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell colSpan={2} className="text-right">{t('Total')}</TableCell>
                  <TableCell className="text-right">{currency}{viewTransactionBill?.total.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewTransactionBill(null)}>{t('Close')}</Button>
            <Button onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow && viewTransactionBill) {
                printWindow.document.write(`
                        <html>
                          <head>
                            <title>Receipt for Bill #${viewTransactionBill.id}</title>
                            <style>
                              body { font-family: monospace; margin: 20px; }
                              pre { white-space: pre-wrap; word-wrap: break-word; }
                            </style>
                          </head>
                          <body>
                            <pre>${viewTransactionBill.receiptPreview}</pre>
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
            }} variant="outline">
              <Printer className="mr-2 h-4 w-4" /> {t('Print Original Bill')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
