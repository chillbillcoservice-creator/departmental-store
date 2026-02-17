
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from "@/contexts/language-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Trash2, CalendarIcon, Building, Repeat, List } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, isSameMonth, isSameYear, isValid } from 'date-fns';

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
import type { Expense, Vendor, InventoryItem, PurchaseOrder } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ExpensesTrackerProps {
  expenses: Expense[];
  setExpenses: (expenses: Expense[]) => void;
  vendors: Vendor[];
  setVendors: (vendors: Vendor[]) => void;
  currency?: string;
  inventory?: InventoryItem[];
  purchaseOrders?: PurchaseOrder[];
  setPurchaseOrders?: (pos: PurchaseOrder[]) => void;
}

function AddOrEditVendorDialog({
  open,
  onOpenChange,
  onSave,
  existingVendor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vendor: Omit<Vendor, 'id'> & { id?: string }) => void;
  existingVendor: Vendor | null;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (existingVendor) {
      setName(existingVendor.name);
      setCategory(existingVendor.category);
      setPhone(existingVendor.phone || '');
    } else {
      setName('');
      setCategory('');
      setPhone('');
    }
  }, [existingVendor, open]);

  const handleSave = () => {
    if (name && category) {
      onSave({
        id: existingVendor?.id,
        name,
        category,
        phone,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingVendor ? t('Edit Vendor') : t('Add Vendor')}</DialogTitle>
          <DialogDescription>
            {t('Manage your suppliers and service providers.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vendor-name">{t('Vendor Name')}</Label>
            <Input id="vendor-name" placeholder={t('e.g., Local Farm Produce')} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-category">{t('Category')}</Label>
            <Input id="vendor-category" placeholder={t('e.g., Food & Beverage')} value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-phone">{t('Mobile No. (Optional)')}</Label>
            <Input id="vendor-phone" placeholder={t('e.g., 9876543210')} value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
          <Button onClick={handleSave}>{t('Save Vendor')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



function VendorHistoryDialog({
  open,
  onOpenChange,
  vendor,
  purchaseOrders,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
  purchaseOrders: PurchaseOrder[];
  currency: string;
}) {
  const [activeTab, setActiveTab] = useState('history');

  if (!vendor) return null;

  const vendorOrders = purchaseOrders.filter(po => po.vendorId === vendor.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate supplied items from PO history
  const suppliedItemsMap = new Map<string, { name: string, count: number, lastCost: number }>();
  vendorOrders.forEach(po => {
    po.items.forEach(item => {
      if (!suppliedItemsMap.has(item.inventoryItemId)) {
        suppliedItemsMap.set(item.inventoryItemId, { name: item.name, count: 0, lastCost: 0 });
      }
      const current = suppliedItemsMap.get(item.inventoryItemId)!;
      current.count += item.quantity;
      current.lastCost = item.unitCost; // approximates last cost
    });
  });
  const suppliedItems = Array.from(suppliedItemsMap.values());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{vendor.name} - History</DialogTitle>
          <DialogDescription>Transaction history and supplied items.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex gap-4 mb-4 border-b">
            <Button variant={activeTab === 'history' ? "default" : "ghost"} onClick={() => setActiveTab('history')}>Order History</Button>
            <Button variant={activeTab === 'items' ? "default" : "ghost"} onClick={() => setActiveTab('items')}>Supplied Items</Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'history' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ref No.</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorOrders.length > 0 ? vendorOrders.map(po => (
                    <TableRow key={po.id}>
                      <TableCell>{safeFormat(po.date, 'PPP')}</TableCell>
                      <TableCell>{po.referenceNo}</TableCell>
                      <TableCell>{po.items.length} items</TableCell>
                      <TableCell className="text-right font-mono">{currency}{po.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right"><Badge variant="outline">{po.status}</Badge></TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={5} className="text-center p-4">No order history found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Total Supplied</TableHead>
                    <TableHead className="text-right">Last Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliedItems.length > 0 ? suppliedItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.count}</TableCell>
                      <TableCell className="text-right font-mono">{currency}{item.lastCost.toFixed(2)}</TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={3} className="text-center p-4">No items found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManageVendorsDialog({
  open,
  onOpenChange,
  vendors,
  onEditVendor,
  onDeleteVendor,
  purchaseOrders = [],
  currency = 'Rs.',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Vendor[];
  onEditVendor: (vendor: Vendor) => void;
  onDeleteVendor: (vendorId: string) => void;
  purchaseOrders?: PurchaseOrder[];
  currency?: string;
}) {
  const { t } = useLanguage();
  const [selectedVendorForHistory, setSelectedVendorForHistory] = useState<Vendor | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('Manage Vendors')}</DialogTitle>
            <DialogDescription>{t('View, edit, or delete your vendors.')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Name')}</TableHead>
                  <TableHead>{t('Category')}</TableHead>
                  <TableHead>{t('Mobile No.')}</TableHead>
                  <TableHead className="text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length > 0 ? (
                  vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.category}</TableCell>
                      <TableCell>{vendor.phone || 'N/A'}</TableCell>
                      <TableCell className="text-right flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => setSelectedVendorForHistory(vendor)}>
                          <CalendarIcon className="h-4 w-4 mr-1" /> History
                        </Button>
                        <Button key="edit-btn" variant="ghost" size="icon" onClick={() => onEditVendor(vendor)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog key="delete-dialog">
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('This will permanently delete the vendor')} "{vendor.name}". {t('This action cannot be undone.')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteVendor(vendor.id)}>{t('Delete')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">{t('No vendors found.')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VendorHistoryDialog
        open={!!selectedVendorForHistory}
        onOpenChange={(open) => !open && setSelectedVendorForHistory(null)}
        vendor={selectedVendorForHistory}
        purchaseOrders={purchaseOrders}
        currency={currency}
      />
    </>
  );
}

import { Edit } from 'lucide-react';

export default function ExpensesTracker({
  expenses: initialExpenses,
  setExpenses,
  vendors: initialVendors,
  setVendors,
  currency = 'Rs.',
  inventory,
  purchaseOrders = [],
  setPurchaseOrders,
}: ExpensesTrackerProps) {
  const props = { expenses: initialExpenses, setExpenses, vendors: initialVendors, setVendors, currency, inventory, purchaseOrders, setPurchaseOrders };

  const { t } = useLanguage();
  const { toast } = useToast();


  const vendors = initialVendors || [];

  const [isVendorAddDialogOpen, setIsVendorAddDialogOpen] = useState(false);
  const [isVendorManageDialogOpen, setIsVendorManageDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'today' | 'month'>('all');

  // Dialog state for expense details
  const [isExpenseDetailOpen, setIsExpenseDetailOpen] = useState(false);
  const [expenseDetailTitle, setExpenseDetailTitle] = useState('');
  const [expenseDetailContent, setExpenseDetailContent] = useState<React.ReactNode>(null);

  // Form state for Expenses
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendorId, setVendorId] = useState<string | undefined>(undefined);

  const selectedVendor = vendors.find(v => v.id === vendorId);
  const expenseCategory = selectedVendor?.category || 'Miscellaneous';

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    switch (expenseFilter) {
      case 'today':
        return initialExpenses.filter(e => isSameDay(new Date(e.date), now));
      case 'month':
        return initialExpenses.filter(e => isSameMonth(new Date(e.date), now) && isSameYear(new Date(e.date), now));
      case 'all':
      default:
        return initialExpenses;
    }
  }, [initialExpenses, expenseFilter]);

  const resetForm = () => {
    setEditingExpense(null);
    setDate(new Date());
    setDescription('');
    setAmount('');
    setVendorId(undefined);
  }

  const handleSaveExpense = async () => {
    if (!date || !amount) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Please fill out date and amount." });
      return;
    }

    const categoryToSave = selectedVendor ? selectedVendor.category : 'Miscellaneous';

    let newExpenses: Expense[];

    if (editingExpense?.id) {
      newExpenses = initialExpenses.map(exp => exp.id === editingExpense.id ? { ...editingExpense, date, category: categoryToSave, description, amount: parseFloat(amount), vendorId: vendorId || null } : exp);
      toast({ title: "Expense updated successfully" });
    } else {
      const newExpense: Expense = {
        id: generateUniqueId(),
        date,
        category: categoryToSave,
        description,
        amount: parseFloat(amount),
        vendorId: vendorId || null,
      };
      newExpenses = [...initialExpenses, newExpense];
      toast({ title: "Expense added successfully" });
    }
    setExpenses(newExpenses);
    resetForm();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const newExpenses = initialExpenses.filter(exp => exp.id !== expenseId);
    setExpenses(newExpenses);
    toast({ title: "Expense deleted successfully" });
  };

  const handleSaveVendor = async (vendor: Omit<Vendor, 'id'> & { id?: string }) => {
    const { id, ...vendorData } = vendor;
    let newVendors;
    if (id) {
      newVendors = vendors.map(v => v.id === id ? { ...v, ...vendorData } : v);
      toast({ title: "Vendor updated successfully" });
    } else {
      const newVendor = { ...vendorData, id: generateUniqueId() };
      newVendors = [...vendors, newVendor];
      toast({ title: "Vendor added successfully" });
    }
    setVendors(newVendors);
    setIsVendorAddDialogOpen(false);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    const newVendors = vendors.filter(v => v.id !== vendorId);
    setVendors(newVendors);
    toast({ title: "Vendor deleted successfully" });
  }

  const openAddVendorDialog = (vendor: Vendor | null) => {
    setEditingVendor(vendor);
    setIsVendorAddDialogOpen(true);
  }

  const now = new Date();
  const todaysExpenses = useMemo(() => initialExpenses.filter(e => isSameDay(new Date(e.date), now)), [initialExpenses, now]);
  const monthlyExpenses = useMemo(() => initialExpenses.filter(e => isSameMonth(new Date(e.date), now) && isSameYear(new Date(e.date), now)), [initialExpenses, now]);
  const totalExpenses = useMemo(() => initialExpenses.reduce((sum, expense) => sum + expense.amount, 0), [initialExpenses]);
  const getVendorDetails = (vendorId: string | undefined | null) => vendorId ? vendors.find(v => v.id === vendorId) || null : null;

  const showExpenseDetails = (title: string, data: Expense[]) => {
    setExpenseDetailTitle(title);
    setExpenseDetailContent(
      data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Date')}</TableHead>
              <TableHead>{t('Category')}</TableHead>
              <TableHead>{t('Description')}</TableHead>
              <TableHead className="text-right">{t('Amount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(expense => (
              <TableRow key={expense.id}>
                <TableCell>{safeFormat(expense.date, 'PPP')}</TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell>{expense.description}</TableCell>
                <TableCell className="text-right font-mono">{currency}{expense.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-center p-8">{t('No expenses found for this period.')}</p>
      )
    );
    setIsExpenseDetailOpen(true);
  };


  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Add New Expense</CardTitle>
              <CardDescription>Record a new business expense.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openAddVendorDialog(null)} variant="default" className="bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary border shadow-sm transition-all"><Building className="mr-2 h-4 w-4" /> Add Vendor</Button>
              <Button variant="default" onClick={() => setIsVendorManageDialogOpen(true)} className="bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary border shadow-sm transition-all"><List className="mr-2 h-4 w-4" /> Vendors List</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? safeFormat(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select onValueChange={(value) => setVendorId(value === 'none' ? undefined : value)} value={vendorId || 'none'}>
                <SelectTrigger id="vendor"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vendor Category</Label>
              <Input value={expenseCategory} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input id="description" placeholder="e.g., Weekly vegetable purchase" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (Rs.)</Label>
              <Input id="amount" type="number" placeholder="e.g., 5000" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            {editingExpense && <Button variant="outline" onClick={resetForm}><Repeat className="mr-2 h-4 w-4" />Cancel Edit</Button>}
            <Button onClick={handleSaveExpense} className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"><PlusCircle className="mr-2 h-4 w-4" /> {editingExpense ? 'Update Expense' : 'Save Expense'}</Button>
          </div>
        </CardContent>
      </Card>





      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Expense History</CardTitle>
              <CardDescription>
                {expenseFilter === 'all' && "A log of all recorded business expenses."}
                {expenseFilter === 'today' && "A log of expenses recorded today."}
                {expenseFilter === 'month' && "A log of expenses recorded this month."}
              </CardDescription>
            </div>
            <Select value={expenseFilter} onValueChange={(v: any) => setExpenseFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Expenses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[60vh] overflow-y-auto mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Vendor Mobile</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense, index) => {
                    const vendor = getVendorDetails(expense.vendorId);
                    return (
                      <TableRow key={expense.id} className={cn(index % 2 === 0 ? 'bg-muted/50' : 'bg-background')}>
                        <TableCell>{safeFormat(expense.date, 'PPP')}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{vendor?.name || 'N/A'}</TableCell>
                        <TableCell>{vendor?.phone || 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono text-red-600 dark:text-red-400">Rs.{expense.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this expense. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground h-24">No expenses recorded for this period.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105" onClick={() => showExpenseDetails("Today's Expenses", todaysExpenses)}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-800 dark:text-red-200">Today's Expenses</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-red-900 dark:text-red-100">Rs.{todaysExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}</p></CardContent>
            </Card>
            <Card className="bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105" onClick={() => showExpenseDetails("This Month's Expenses", monthlyExpenses)}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200">This Month's Expenses</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-orange-900 dark:text-orange-100">Rs.{monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}</p></CardContent>
            </Card>
            <Card className="bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105" onClick={() => showExpenseDetails("Overall Expenses", initialExpenses)}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Overall Expenses</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">Rs.{totalExpenses.toFixed(2)}</p></CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <AddOrEditVendorDialog open={isVendorAddDialogOpen} onOpenChange={setIsVendorAddDialogOpen} onSave={handleSaveVendor} existingVendor={editingVendor} />
      <ManageVendorsDialog
        open={isVendorManageDialogOpen}
        onOpenChange={setIsVendorManageDialogOpen}
        vendors={vendors}
        onEditVendor={(v) => { setIsVendorManageDialogOpen(false); setTimeout(() => openAddVendorDialog(v), 150) }}
        onDeleteVendor={handleDeleteVendor}
        purchaseOrders={props.purchaseOrders}
        currency={currency}
      />

      <Dialog open={isExpenseDetailOpen} onOpenChange={setIsExpenseDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{expenseDetailTitle}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {expenseDetailContent}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsExpenseDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
