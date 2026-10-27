
"use client";

import React, { useState, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, CalendarIcon, Building, List, ChevronsUpDown, AlertTriangle, Landmark, Search, ChevronDown, ChevronUp, Eye, Phone, MapPin, Mail, Check, ShoppingCart, RefreshCcw, PackageCheck, Printer, CalendarDays } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isValid } from 'date-fns';

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
import type { Expense, Vendor, PendingBill, PendingBillTransaction, InventoryItem, PurchaseOrder, PurchaseOrderItem, Employee } from '@/lib/types';
import { getActiveShift, logShiftActivity } from '@/lib/shift-manager';

import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface VendorManagementProps {
    vendors: Vendor[];
    setVendors: (vendors: Vendor[]) => void;
    pendingBills: PendingBill[];
    setPendingBills: (bills: PendingBill[]) => void;
    vendorCreditLimit: number;
    expenses: Expense[];
    setExpenses: (expenses: Expense[]) => void;
    inventory: InventoryItem[];
    currency?: string;
    purchaseOrders: PurchaseOrder[];
    setPurchaseOrders: (orders: PurchaseOrder[]) => void;
    setInventory: (inventory: InventoryItem[]) => void;
    currentUser?: Employee | null;
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
    const [email, setEmail] = useState('');
    const [location, setLocation] = useState('');
    const [billingCycleDay, setBillingCycleDay] = useState<string>('');

    React.useEffect(() => {
        if (existingVendor) {
            setName(existingVendor.name);
            setCategory(existingVendor.category);
            setPhone(existingVendor.phone || '');
            setEmail(existingVendor.email || '');
            setLocation(existingVendor.location || '');
            setBillingCycleDay(existingVendor.billingCycleDay?.toString() || '');
        } else {
            setName('');
            setCategory('');
            setPhone('');
            setEmail('');
            setLocation('');
            setBillingCycleDay('');
        }
    }, [existingVendor, open]);

    const handleSave = () => {
        if (name && category) {
            onSave({
                id: existingVendor?.id,
                name,
                category,
                phone,
                email,
                location,
                billingCycleDay: billingCycleDay ? parseInt(billingCycleDay) : undefined,
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
                    <div className="space-y-2">
                        <Label htmlFor="vendor-email">{t('Email (Optional)')}</Label>
                        <Input id="vendor-email" placeholder={t('e.g., vendor@example.com')} value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="vendor-location">{t('Location (Optional)')}</Label>
                        <Input id="vendor-location" placeholder={t('e.g., Market Yard')} value={location} onChange={e => setLocation(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="vendor-billing-cycle">{t('Monthly Billing Day (1-31)')}</Label>
                        <Input
                            id="vendor-billing-cycle"
                            type="number"
                            min="1"
                            max="31"
                            placeholder={t('e.g., 15')}
                            value={billingCycleDay}
                            onChange={e => setBillingCycleDay(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">{t('Date of each month when payment is due to this vendor.')}</p>
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

function AddOrEditPendingBillDialog({
    open,
    onOpenChange,
    onSave,
    existingNames,
    type,
    currency,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (name: string, amount: number, mobile?: string, dueDate?: Date) => void;
    existingNames: string[];
    type: 'customer' | 'vendor';
    currency: string;
}) {
    const { t } = useLanguage();
    const [isNew, setIsNew] = useState(true);
    const [selectedName, setSelectedName] = useState('');
    const [newName, setNewName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState<Date | undefined>();
    const [mobile, setMobile] = useState('');

    React.useEffect(() => {
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
                        {t('Record a new transaction for a')} {t(type)}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>{t('Select or Add')} {type === 'customer' ? t('Customer') : t('Vendor')}</Label>
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
                                placeholder={`${t('New')} ${t(type)} ${t('name')}`}
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                        ) : (
                            <Select onValueChange={setSelectedName} value={selectedName}>
                                <SelectTrigger>
                                    <SelectValue placeholder={`${t('Select existing')} ${t(type)}`} />
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

export default function VendorManagement({
    vendors,
    setVendors,
    pendingBills,
    setPendingBills,
    vendorCreditLimit,
    expenses,
    setExpenses,
    inventory,
    currency = 'Rs.',
    purchaseOrders,
    setPurchaseOrders,
    setInventory,
    currentUser,
}: VendorManagementProps) {
    const { t } = useLanguage();
    const { toast } = useToast();

    const [isVendorAddDialogOpen, setIsVendorAddDialogOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [isAddBillOpen, setIsAddBillOpen] = useState(false);
    const [isLimitExceededDialogOpen, setIsLimitExceededDialogOpen] = useState(false);
    const [pendingBillsSearchTerm, setPendingBillsSearchTerm] = useState('');
    const [isPendingBillsOpen, setIsPendingBillsOpen] = useState(false);
    const [viewOrdersVendor, setViewOrdersVendor] = useState<Vendor | null>(null);
    const [viewTransactionPO, setViewTransactionPO] = useState<PurchaseOrder | null>(null);
    const [viewSimpleTransaction, setViewSimpleTransaction] = useState<{ name: string, date: Date, amount: number, description?: string } | null>(null);

    const [vendorSearchQuery, setVendorSearchQuery] = useState('');
    const [isVendorListOpen, setIsVendorListOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Receive Order States
    const [poToReceive, setPoToReceive] = useState<PurchaseOrder | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

    const filteredVendors = useMemo(() => {
        if (!vendorSearchQuery) return vendors;
        const lower = vendorSearchQuery.toLowerCase();
        return vendors.filter(v =>
            v.name.toLowerCase().includes(lower) ||
            v.phone?.includes(lower) ||
            v.email?.toLowerCase().includes(lower) ||
            v.location?.toLowerCase().includes(lower)
        );
    }, [vendors, vendorSearchQuery]);

    // Purchase Order State
    const [newPoVendorId, setNewPoVendorId] = useState('');
    const [newPoItems, setNewPoItems] = useState<PurchaseOrderItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemQty, setNewItemQty] = useState('');
    const [newItemCost, setNewItemCost] = useState('');

    const handleAddPoItem = () => {
        if (!newItemName || !newItemQty || !newItemCost) {
            toast({ title: t("Please fill all item fields"), variant: "destructive" });
            return;
        }
        // Try to match with existing inventory item
        const matchedItem = inventory.find(i => i.name.toLowerCase() === newItemName.trim().toLowerCase());

        let invItemId = generateUniqueId();
        let capacity = 0;
        let currentStock = 0;

        if (matchedItem) {
            invItemId = matchedItem.id;
            capacity = matchedItem.capacity || 0;
            currentStock = matchedItem.stock || 0;

            // Check Capacity
            if (capacity > 0) {
                const qty = parseFloat(newItemQty);
                const maxAllowed = Math.max(0, capacity - currentStock);
                if (qty > maxAllowed) {
                    toast({
                        title: t("Capacity Limit Reached"),
                        description: `${t("Cannot order more than capacity")} (${capacity}). ${t("Current Stock")}: ${currentStock}. ${t("Available Space")}: ${maxAllowed}`,
                        variant: "destructive"
                    });
                    return; // Block adding
                }
            }
        }

        const newItem: PurchaseOrderItem = {
            inventoryItemId: invItemId,
            name: matchedItem ? matchedItem.name : newItemName, // Use exact name if matched
            quantity: parseFloat(newItemQty),
            unitCost: parseFloat(newItemCost),
            totalCost: parseFloat(newItemQty) * parseFloat(newItemCost),
        };
        setNewPoItems([...newPoItems, newItem]);
        setNewItemName('');
        setNewItemQty('');
        setNewItemCost('');
    };

    const handleRemovePoItem = (index: number) => {
        const newItems = [...newPoItems];
        newItems.splice(index, 1);
        setNewPoItems(newItems);
    };

    const handleCreatePurchaseOrder = () => {
        if (!newPoVendorId) {
            toast({ title: t("Please select a vendor"), variant: "destructive" });
            return;
        }
        if (newPoItems.length === 0) {
            toast({ title: t("Please add items to the order"), variant: "destructive" });
            return;
        }

        const vendor = vendors.find(v => v.id === newPoVendorId);
        const totalAmount = newPoItems.reduce((sum, item) => sum + item.totalCost, 0);

        const activeShift = getActiveShift();
        const newPo: PurchaseOrder = {
            id: generateUniqueId(),
            vendorId: newPoVendorId,
            vendorName: vendor ? vendor.name : 'Unknown',
            date: new Date(),
            referenceNo: `PO-${Date.now().toString().slice(-6)}`,
            items: newPoItems,
            totalAmount,
            status: 'Ordered',
            createdByEmployeeId: currentUser?.id || activeShift?.employeeId,
            createdByEmployeeName: currentUser?.name || activeShift?.employeeName,
            shiftId: activeShift?.id,
        };

        setPurchaseOrders([...purchaseOrders, newPo]);
        setNewPoItems([]);
        setNewPoVendorId('');

        logShiftActivity({
            type: 'vendor_po',
            title: `Vendor PO Created: #${newPo.referenceNo}`,
            description: `Ordered ${newPo.items.length} items from ${newPo.vendorName}`,
            amount: totalAmount,
            referenceId: newPo.referenceNo,
        });
        toast({ title: t("Purchase Order Created"), description: `${t('PO')} #${newPo.referenceNo} ${t('created successfully')}.` });
    };

    const handleReceiveOrder = (po: PurchaseOrder) => {
        setPoToReceive(po);
        setPaymentAmount('0');
        const initialQtys: Record<string, number> = {};
        po.items.forEach(item => {
            initialQtys[item.inventoryItemId] = item.quantity;
        });
        setReceivedQuantities(initialQtys);
    };

    const handleConfirmReceive = () => {
        if (!poToReceive) return;

        const paid = parseFloat(paymentAmount) || 0;
        // Calculate total based on received quantities
        let totalReceivedValue = 0;
        poToReceive.items.forEach(item => {
            const qty = receivedQuantities[item.inventoryItemId] || 0;
            totalReceivedValue += qty * item.unitCost;
        });

        const balance = totalReceivedValue - paid;

        // Update Inventory
        const updatedInventory = [...inventory];
        poToReceive.items.forEach(poItem => {
            const qty = receivedQuantities[poItem.inventoryItemId] || 0;
            if (qty > 0) {
                const invItemIndex = updatedInventory.findIndex(i => i.id === poItem.inventoryItemId);
                if (invItemIndex > -1) {
                    updatedInventory[invItemIndex] = {
                        ...updatedInventory[invItemIndex],
                        stock: updatedInventory[invItemIndex].stock + qty
                    };
                }
            }
        });
        setInventory(updatedInventory);

        // Update PO Status
        const activeShift = getActiveShift();
        if (setPurchaseOrders) {
            setPurchaseOrders(purchaseOrders.map(p => p.id === poToReceive.id ? {
                ...p,
                status: 'Received',
                receivedByEmployeeId: currentUser?.id || activeShift?.employeeId,
                receivedByEmployeeName: currentUser?.name || activeShift?.employeeName,
                receivedDate: new Date(),
                paidAmount: paid,
                shiftId: activeShift?.id,
            } : p));
        }

        logShiftActivity({
            type: 'vendor_delivery',
            title: `Delivery Received: PO #${poToReceive.referenceNo}`,
            description: `Received goods from ${poToReceive.vendorName} into store inventory`,
            amount: totalReceivedValue,
            referenceId: poToReceive.referenceNo,
        });

        // Update Vendor Balance
        if (setVendors && poToReceive.vendorId) {
            const vendorIndex = vendors.findIndex(v => v.id === poToReceive.vendorId);
            if (vendorIndex > -1) {
                const updatedVendors = vendors.map((v, idx) =>
                    idx === vendorIndex ? { ...v, balance: (v.balance || 0) + balance } : v
                );
                setVendors(updatedVendors);
            }
        }

        // Add Expense
        if (setExpenses && paid > 0) {
            const newExpense: Expense = {
                id: generateUniqueId(),
                date: new Date(),
                category: 'Stock Purchase',
                description: `Payment for PO ${poToReceive.referenceNo}`,
                amount: paid,
                vendorId: poToReceive.vendorId,
                paymentMethod: 'Cash',
                recordedByEmployeeId: currentUser?.id || activeShift?.employeeId,
                recordedByEmployeeName: currentUser?.name || activeShift?.employeeName,
                shiftId: activeShift?.id,
            };
            setExpenses([...expenses, newExpense]);

            logShiftActivity({
                type: 'vendor_payment',
                title: `Vendor Payment: PO #${poToReceive.referenceNo}`,
                description: `Paid ${currency}${paid.toFixed(2)} to ${poToReceive.vendorName} (Cash from till)`,
                amount: paid,
                paymentMethod: 'Cash',
                referenceId: poToReceive.referenceNo,
            });
        }

        // Add Pending Bill for Balance
        if (balance > 0 && poToReceive.vendorName) {
            const newTransaction: PendingBillTransaction = {
                id: generateUniqueId(),
                amount: balance,
                date: new Date(),
                description: `Balance from PO #${poToReceive.referenceNo}`
            };

            const existingBillIndex = pendingBills.findIndex(b => b.name === poToReceive.vendorName && b.type === 'vendor');
            let newPendingBills;

            if (existingBillIndex > -1) {
                newPendingBills = [...pendingBills];
                const existingBill = { ...newPendingBills[existingBillIndex] };
                existingBill.transactions = [...existingBill.transactions, newTransaction];
                newPendingBills[existingBillIndex] = existingBill;
            } else {
                const newBill: PendingBill = {
                    id: generateUniqueId(),
                    name: poToReceive.vendorName,
                    type: 'vendor',
                    transactions: [newTransaction],
                    mobile: vendors.find(v => v.id === poToReceive.vendorId)?.phone
                };
                newPendingBills = [...pendingBills, newBill];
            }
            if (setPendingBills) setPendingBills(newPendingBills);
        }

        toast({ title: t("Order Received"), description: `${t('Stock updated')}. ${t('Paid')}: ${currency}${paid.toFixed(2)}, ${t('Balance')}: ${currency}${balance.toFixed(2)}` });
        setPoToReceive(null);
    };

    const vendorBills = useMemo(() => {
        let bills = pendingBills.filter(b => b.type === 'vendor');
        if (pendingBillsSearchTerm) {
            const lower = pendingBillsSearchTerm.toLowerCase();
            bills = bills.filter(b => b.name.toLowerCase().includes(lower) || b.mobile?.includes(lower));
        }
        return bills;
    }, [pendingBills, pendingBillsSearchTerm]);

    const totalPending = useMemo(() => vendorBills.reduce((total, bill) => {
        return total + bill.transactions.reduce((sum, t) => sum + t.amount, 0);
    }, 0), [vendorBills]);

    const totalProgress = vendorCreditLimit > 0 ? (totalPending / vendorCreditLimit) * 100 : 0;

    const existingVendorNames = useMemo(() => vendors.map(v => v.name), [vendors]);

    const handleSaveVendor = async (vendor: Omit<Vendor, 'id'> & { id?: string }) => {
        const { id, ...vendorData } = vendor;
        let newVendors;
        if (id) {
            newVendors = vendors.map(v => v.id === id ? { ...v, ...vendorData } : v);
            toast({ title: t("Vendor updated successfully") });
        } else {
            const newVendor = { ...vendorData, id: generateUniqueId() };
            newVendors = [...vendors, newVendor];
            toast({ title: t("Vendor added successfully") });
        }
        setVendors(newVendors);
        setIsVendorAddDialogOpen(false);
    };

    const handleDeleteVendor = async (vendorId: string) => {
        const newVendors = vendors.filter(v => v.id !== vendorId);
        setVendors(newVendors);
        toast({ title: t("Vendor deleted successfully") });
    };

    const handleAddPendingTransaction = async (name: string, amount: number, mobile?: string, dueDate?: Date) => {
        if (totalPending + amount > vendorCreditLimit) {
            setIsLimitExceededDialogOpen(true);
            return;
        }

        const newTransaction: PendingBillTransaction = {
            id: generateUniqueId(),
            amount,
            date: new Date(),
        };

        const existingBillIndex = pendingBills.findIndex(b => b.name.toLowerCase() === name.toLowerCase() && b.type === 'vendor');
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
                type: 'vendor',
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
        const totalPaid = billToClear.transactions.reduce((sum, tx) => sum + tx.amount, 0);
        const vendor = vendors.find(v => v.name.toLowerCase() === billToClear.name.toLowerCase());

        const activeShift = getActiveShift();
        const newExpense: Expense = {
            id: generateUniqueId(),
            date: new Date(),
            category: vendor?.category || 'Vendor Payment',
            description: `Cleared all pending bills for ${billToClear.name}.`,
            amount: totalPaid,
            vendorId: vendor?.id || null,
            paymentMethod: 'Cash',
            recordedByEmployeeId: currentUser?.id || activeShift?.employeeId,
            recordedByEmployeeName: currentUser?.name || activeShift?.employeeName,
            shiftId: activeShift?.id,
        };

        setExpenses([...expenses, newExpense]);
        setPendingBills(newPendingBills);

        logShiftActivity({
            type: 'vendor_payment',
            title: `Cleared Vendor Bills: ${billToClear.name}`,
            description: `Paid ${currency}${totalPaid.toFixed(2)} to clear pending balance`,
            amount: totalPaid,
            paymentMethod: 'Cash',
            referenceId: billId,
        });
        toast({ title: t("Bills Cleared"), description: t(`${billToClear.name}'s pending bills have been cleared and recorded as expenses.`) });
    };

    const handleSettleTransaction = async (billId: string, transactionId: string, amount: number) => {
        const billToUpdate = pendingBills.find(b => b.id === billId);
        if (!billToUpdate) return;

        const updatedTransactions = billToUpdate.transactions.filter(tx => tx.id !== transactionId);
        const vendor = vendors.find(v => v.name.toLowerCase() === billToUpdate.name.toLowerCase());

        const activeShift = getActiveShift();
        const newExpense: Expense = {
            id: generateUniqueId(),
            date: new Date(),
            category: vendor?.category || 'Vendor Payment',
            description: `Settled transaction for ${billToUpdate.name}.`,
            amount: amount,
            vendorId: vendor?.id || null,
            paymentMethod: 'Cash',
            recordedByEmployeeId: currentUser?.id || activeShift?.employeeId,
            recordedByEmployeeName: currentUser?.name || activeShift?.employeeName,
            shiftId: activeShift?.id,
        };

        let newPendingBills;
        if (updatedTransactions.length === 0) {
            newPendingBills = pendingBills.filter(b => b.id !== billId);
        } else {
            newPendingBills = pendingBills.map(b => b.id === billId ? { ...b, transactions: updatedTransactions } : b);
        }

        setExpenses([...expenses, newExpense]);
        setPendingBills(newPendingBills);

        logShiftActivity({
            type: 'vendor_payment',
            title: `Vendor Dues Settled: ${billToUpdate.name}`,
            description: `Paid ${currency}${amount.toFixed(2)} towards pending balance`,
            amount: amount,
            paymentMethod: 'Cash',
            referenceId: billId,
        });
        toast({ title: t("Transaction Settled"), description: t(`${billToUpdate.name}'s transaction has been settled and recorded.`) });
    };

    return (
        <div className="p-4 space-y-6">


            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted p-1 h-auto rounded-lg">
                    <TabsTrigger value="overview" className="py-2 text-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 text-base font-bold uppercase transition-all duration-300 border border-primary/40 hover:border-primary">{t('Overview')}</TabsTrigger>
                    <TabsTrigger value="orders" className="py-2 text-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 text-base font-bold uppercase transition-all duration-300 border border-primary/40 hover:border-primary">{t('Create New Order / Receive Goods')}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 gap-6">
                        <Card>
                            <CardHeader>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <CardTitle className="flex items-center gap-2">
                                                <Landmark className="h-6 w-6" />
                                                {t('To Pay to Vendors')}
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
                                            <Button onClick={() => setIsAddBillOpen(true)} className="bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary border shadow-sm transition-all">
                                                <PlusCircle className="mr-2 h-4 w-4" /> {t('Add Bill')}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setIsPendingBillsOpen(!isPendingBillsOpen)}>
                                                {isPendingBillsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-red-600">
                                                {currency}{totalPending.toFixed(2)}
                                            </span>
                                            <span className="text-muted-foreground">{t('Overall Limit')}: {currency}{vendorCreditLimit.toLocaleString()}</span>
                                        </div>
                                        <Progress value={totalProgress} indicatorClassName={totalProgress > 100 ? "bg-red-500" : "bg-red-500"} />
                                    </div>
                                </div>
                            </CardHeader>
                            {isPendingBillsOpen && (
                                <CardContent>
                                    <div className="max-h-96 overflow-y-auto space-y-2">
                                        {vendorBills.length > 0 ? vendorBills.map((bill, index) => {
                                            const totalForName = bill.transactions.reduce((sum, t) => sum + t.amount, 0);
                                            return (
                                                <Collapsible key={`${bill.id}-${index}`} className="p-2 border rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <CollapsibleTrigger className="flex flex-grow items-center gap-2 text-left">
                                                            <ChevronsUpDown className="h-4 w-4" />
                                                            <span className="font-medium">{bill.name}</span>
                                                            <span className="font-semibold text-sm text-red-600">
                                                                ({currency}{totalForName.toFixed(2)})
                                                            </span>
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
                                                                    <span className="font-semibold ml-4 text-red-700">{currency}{tx.amount.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button variant="outline" size="sm" className="h-7" onClick={() => {
                                                                        const poRefMatch = tx.description?.match(/PO #(\S+)/);
                                                                        const poRef = poRefMatch ? poRefMatch[1] : null;
                                                                        const foundPO = poRef ? purchaseOrders.find(p => p.referenceNo === poRef) : null;

                                                                        if (foundPO) {
                                                                            setViewTransactionPO(foundPO);
                                                                        } else {
                                                                            // Fallback - Show Dialog, don't print
                                                                            setViewSimpleTransaction({
                                                                                name: bill.name,
                                                                                date: new Date(tx.date),
                                                                                amount: tx.amount,
                                                                                description: tx.description
                                                                            });
                                                                        }
                                                                    }}>
                                                                        <Eye className="h-3.5 w-3.5 mr-1" /> {t('View')}
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" className="h-7" onClick={() => {
                                                                        const printWindow = window.open('', '_blank');
                                                                        if (printWindow) {
                                                                            printWindow.document.write(`
                                                                                   <html><head><title>Payment Advice</title></head><body>
                                                                                   <h2 style="margin:0">${bill.name}</h2>
                                                                                   <p>Pending Bill Transaction</p>
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
                                            <div className="text-center py-8 text-muted-foreground">{t('No pending vendor bills found.')}</div>
                                        )}
                                    </div>
                                </CardContent>
                            )}
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <CardTitle>{t('Vendor List')}</CardTitle>
                                        <CardDescription>{t('Manage your suppliers and service providers.')}</CardDescription>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            placeholder={t("Search vendors...")}
                                            className="pl-9 w-96"
                                            value={vendorSearchQuery}
                                            onChange={(e) => {
                                                setVendorSearchQuery(e.target.value);
                                                if (e.target.value) setIsVendorListOpen(true);
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 flex justify-end items-center gap-2">
                                        <Button onClick={() => { setEditingVendor(null); setIsVendorAddDialogOpen(true); }} className="bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary border shadow-sm transition-all whitespace-nowrap">
                                            <PlusCircle className="mr-2 h-4 w-4" /> {t('Add Vendor')}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setIsVendorListOpen(!isVendorListOpen)}>
                                            {isVendorListOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            {isVendorListOpen && (
                                <CardContent>
                                    <ScrollArea className="h-[calc(100vh-20rem)] pr-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {filteredVendors.length > 0 ? (
                                                filteredVendors.map((vendor, index) => {
                                                    const vendorBill = vendorBills.find(b => b.name.toLowerCase() === vendor.name.toLowerCase());
                                                    const pendingAmount = vendorBill ? vendorBill.transactions.reduce((sum, t) => sum + t.amount, 0) : 0;
                                                    const suppliedItems = inventory.filter(item => item.vendorId === vendor.id);
                                                    const vendorOrders = purchaseOrders.filter(po => po.vendorId === vendor.id);
                                                    const activeOrders = vendorOrders.filter(po => po.status === 'Ordered');
                                                    const draftPO = vendorOrders.find(po => po.status === 'Draft');
                                                    const placedOrders = vendorOrders.filter(po => po.status !== 'Draft').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                                    const lastPlacedOrder = placedOrders.length > 0 ? placedOrders[0] : null;

                                                    return (
                                                        <Card key={`${vendor.id}-${index}`} className="flex flex-col relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-primary/40">
                                                            <CardHeader className="pb-2">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <CardTitle className="text-lg font-bold">{vendor.name}</CardTitle>
                                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                                            <Building className="h-3 w-3" />
                                                                            <span>{vendor.category}</span>
                                                                        </div>
                                                                    </div>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingVendor(vendor); setIsVendorAddDialogOpen(true); }}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </CardHeader>
                                                            <CardContent className="flex-grow space-y-4 pb-2">
                                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                                    <div className="p-2 bg-muted/50 rounded-md border">
                                                                        <p className="text-xs text-muted-foreground mb-1">{t('Pending Bill')}</p>
                                                                        <p className={cn("text-lg font-bold font-mono", pendingAmount > 0 ? "text-red-600" : "text-muted-foreground")}>
                                                                            {currency}{pendingAmount.toFixed(2)}
                                                                        </p>
                                                                    </div>
                                                                    <div className="p-2 bg-muted/50 rounded-md border">
                                                                        <p className="text-xs text-muted-foreground mb-1">{t('Active Orders')}</p>
                                                                        <p className={cn("text-lg font-bold", activeOrders.length > 0 ? "text-orange-600" : "text-muted-foreground")}>
                                                                            {activeOrders.length}
                                                                        </p>
                                                                    </div>
                                                                    <div className="p-2 bg-muted/50 rounded-md border">
                                                                        <p className="text-xs text-muted-foreground mb-1 text-red-600 font-bold">Payables</p>
                                                                        <p className={cn("text-lg font-bold font-mono", (vendor.balance || 0) > 0 ? "text-red-600" : "text-green-600")}>
                                                                            {currency}{(vendor.balance || 0).toFixed(2)}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col gap-1.5 mt-2">
                                                                    {vendor.phone && (
                                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 p-1.5 rounded-md px-2">
                                                                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                                                                            <span className="font-medium truncate">{vendor.phone}</span>
                                                                        </div>
                                                                    )}
                                                                    {vendor.email && (
                                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 p-1.5 rounded-md px-2">
                                                                            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                                                                            <span className="font-medium truncate">{vendor.email}</span>
                                                                        </div>
                                                                    )}
                                                                    {vendor.location && (
                                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 p-1.5 rounded-md px-2">
                                                                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                                                            <span className="font-medium truncate">{vendor.location}</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {suppliedItems.length > 0 && (
                                                                    <div className="space-y-2">
                                                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('Supplied Items')}</p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {suppliedItems.slice(0, 3).map((item, i) => (
                                                                                <span key={i} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full border">
                                                                                    {item.name}
                                                                                </span>
                                                                            ))}
                                                                            {suppliedItems.length > 3 && (
                                                                                <span className="text-[10px] text-muted-foreground px-1 py-0.5 bg-muted rounded-full">
                                                                                    +{suppliedItems.length - 3}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {vendor.billingCycleDay && (
                                                                    <div className="mt-4 p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 flex items-center justify-between shadow-sm">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg shadow-inner">
                                                                                <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[10px] font-black text-indigo-800 dark:text-indigo-300 uppercase leading-none tracking-tight">{t('Billing Cycle')}</p>
                                                                                <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                                                                                    {vendor.billingCycleDay}{vendor.billingCycleDay === 1 || vendor.billingCycleDay === 21 || vendor.billingCycleDay === 31 ? 'st' : vendor.billingCycleDay === 2 || vendor.billingCycleDay === 22 ? 'nd' : vendor.billingCycleDay === 3 || vendor.billingCycleDay === 23 ? 'rd' : 'th'} {t('of month')}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            {(() => {
                                                                                const today = new Date();
                                                                                let nextDate = new Date(today.getFullYear(), today.getMonth(), vendor.billingCycleDay);
                                                                                // If today is past the billing day this month, set it to next month
                                                                                if (nextDate.getDate() < today.getDate()) {
                                                                                    nextDate = new Date(today.getFullYear(), today.getMonth() + 1, vendor.billingCycleDay);
                                                                                }
                                                                                const diffTime = nextDate.getTime() - today.getTime();
                                                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                                                return (
                                                                                    <Badge variant="outline" className={cn(
                                                                                        "text-[9px] font-black px-2 h-5 rounded-lg border-2",
                                                                                        diffDays <= 1 ? "bg-red-50 text-red-600 border-red-200 animate-pulse" :
                                                                                            diffDays <= 7 ? "bg-orange-50 text-orange-600 border-orange-200" :
                                                                                                "bg-indigo-50 text-indigo-600 border-indigo-200"
                                                                                    )}>
                                                                                        {diffDays === 0 ? t('Due Today') :
                                                                                            diffDays === 1 ? t('Due Tomorrow') :
                                                                                                `${diffDays} ${t('days left')}`}
                                                                                    </Badge>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {lastPlacedOrder && (
                                                                    <div className="mt-3 p-2.5 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-xl border border-emerald-100/50 flex flex-col gap-2">
                                                                        <div className="flex justify-between items-center">
                                                                            <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase leading-none tracking-tight flex items-center gap-1.5">
                                                                                <PackageCheck className="h-3 w-3" />
                                                                                {t('Last Order')}
                                                                            </p>
                                                                            <Badge className={cn(
                                                                                "text-[9px] h-4 font-bold px-1.5",
                                                                                lastPlacedOrder.status === 'Received' ? "bg-emerald-500 hover:bg-emerald-600" :
                                                                                    lastPlacedOrder.status === 'Ordered' ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-500"
                                                                            )}>
                                                                                {t(lastPlacedOrder.status)}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="flex justify-between items-end">
                                                                            <div className="space-y-0.5">
                                                                                <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-100">{safeFormat(lastPlacedOrder.date, 'PP')}</p>
                                                                                <p className="text-[9px] text-muted-foreground">{lastPlacedOrder.items.length} {t('items')} • {lastPlacedOrder.referenceNo}</p>
                                                                                <p className="text-[10px] text-muted-foreground/80 font-medium truncate max-w-[150px]">
                                                                                    {lastPlacedOrder.items.map(i => i.name).join(', ')}
                                                                                </p>
                                                                            </div>
                                                                            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">{currency}{lastPlacedOrder.totalAmount.toFixed(2)}</p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {draftPO && (
                                                                    <div className="mt-4 p-3 bg-orange-50/70 dark:bg-orange-950/20 rounded-xl border border-orange-200/60 shadow-sm space-y-3">
                                                                        <div className="flex justify-between items-center bg-orange-100/50 dark:bg-orange-900/40 p-1.5 px-2 rounded-lg">
                                                                            <p className="text-[10px] font-black uppercase text-orange-800 dark:text-orange-300 tracking-wider flex items-center gap-1.5">
                                                                                <List className="h-3 w-3" />
                                                                                {t('Current Order List')}
                                                                            </p>
                                                                            <Badge variant="outline" className="bg-white/80 dark:bg-black/40 text-orange-700 dark:text-orange-400 border-orange-200 text-[10px] px-2 h-4 font-black">
                                                                                {draftPO.items.length}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                                            {draftPO.items.map((item, idx) => (
                                                                                <div key={idx} className="flex justify-between items-center text-[11px] bg-white/90 dark:bg-black/30 p-2 rounded-lg border border-orange-100/80 shadow-sm">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="font-bold text-orange-900 dark:text-orange-100 truncate max-w-[110px]">{item.name}</span>
                                                                                        <span className="text-[9px] text-muted-foreground">{currency}{item.unitCost.toFixed(2)} / unit</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Input
                                                                                            type="number"
                                                                                            value={item.quantity}
                                                                                            onChange={(e) => {
                                                                                                let newQty = parseInt(e.target.value) || 0;

                                                                                                const invItem = inventory.find(inv => inv.id === item.inventoryItemId);
                                                                                                const capacity = invItem?.capacity || 0;
                                                                                                const currentStock = invItem?.stock || 0;

                                                                                                if (capacity > 0) {
                                                                                                    // Calculate max allowed order quantity
                                                                                                    const maxAllowed = Math.max(0, capacity - currentStock);
                                                                                                    if (newQty > maxAllowed) {
                                                                                                        toast({
                                                                                                            title: t("Capacity Limit Reached"),
                                                                                                            description: `${t("Cannot order more than capacity")} (${capacity}). ${t("Current Stock")}: ${currentStock}. ${t("Max Order")}: ${maxAllowed}`,
                                                                                                            variant: "destructive"
                                                                                                        });
                                                                                                        newQty = maxAllowed;
                                                                                                    }
                                                                                                }

                                                                                                const updatedItems = draftPO.items.map((it, iIdx) =>
                                                                                                    iIdx === idx ? { ...it, quantity: newQty, totalCost: newQty * it.unitCost } : it
                                                                                                );
                                                                                                setPurchaseOrders(purchaseOrders.map(p => p.id === draftPO.id ? {
                                                                                                    ...p,
                                                                                                    items: updatedItems,
                                                                                                    totalAmount: updatedItems.reduce((s, i) => s + i.totalCost, 0)
                                                                                                } : p));
                                                                                            }}
                                                                                            className="h-7 w-14 text-center font-black text-orange-700 dark:text-orange-400 bg-white/50 dark:bg-black/20 border-orange-200/50 focus-visible:ring-orange-500/30 rounded-lg px-1 text-[11px] transition-all"
                                                                                        />
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-5 w-5 text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                                                            onClick={() => {
                                                                                                const updatedItems = [...draftPO.items];
                                                                                                updatedItems.splice(idx, 1);
                                                                                                if (updatedItems.length === 0) {
                                                                                                    setPurchaseOrders(purchaseOrders.filter(p => p.id !== draftPO.id));
                                                                                                } else {
                                                                                                    setPurchaseOrders(purchaseOrders.map(p => p.id === draftPO.id ? {
                                                                                                        ...p,
                                                                                                        items: updatedItems,
                                                                                                        totalAmount: updatedItems.reduce((s, i) => s + i.totalCost, 0)
                                                                                                    } : p));
                                                                                                }
                                                                                            }}
                                                                                        >
                                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div className="flex flex-col gap-2 pt-2 border-t border-orange-200/50 mt-1">
                                                                            <div className="flex justify-between items-center px-1">
                                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('Total')}:</span>
                                                                                <span className="font-black text-orange-800 dark:text-orange-300 text-sm">{currency}{draftPO.totalAmount.toFixed(2)}</span>
                                                                            </div>
                                                                            <Button
                                                                                size="sm"
                                                                                className="w-full h-8 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-lg shadow-md transition-all active:scale-95"
                                                                                onClick={() => {
                                                                                    setPurchaseOrders(purchaseOrders.map(p => p.id === draftPO.id ? { ...p, status: 'Ordered', date: new Date() } : p));
                                                                                    toast({ title: t("Order Finalized"), description: `${t("Order for")} ${vendor.name} ${t("has been placed.")}` });
                                                                                }}
                                                                            >
                                                                                <PackageCheck className="mr-2 h-4 w-4" />
                                                                                {t('Finalize Order')}
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </CardContent>
                                                            <CardFooter className="pt-3 flex flex-col gap-2.5 bg-muted/30 border-t items-center mt-auto">
                                                                {activeOrders.length > 0 && (
                                                                    <Button
                                                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold shadow-sm h-9 animate-in zoom-in duration-300"
                                                                        size="sm"
                                                                        onClick={() => handleReceiveOrder(activeOrders[0])}
                                                                    >
                                                                        <PackageCheck className="mr-2 h-4 w-4" />
                                                                        {t('Receive Order')} {activeOrders.length > 1 && `(${activeOrders.length})`}
                                                                    </Button>
                                                                )}
                                                                <div className="grid grid-cols-2 gap-2.5 w-full">
                                                                    <Button variant="outline" size="sm" className="w-full text-xs font-black border-primary/20 hover:border-primary hover:bg-primary/5 shadow-sm h-9" onClick={() => {
                                                                        setActiveTab('orders');
                                                                        setNewPoVendorId(vendor.id);
                                                                    }}>
                                                                        <ShoppingCart className="mr-2 h-3.5 w-3.5 text-primary" /> {t('Create Order')}
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" className="w-full text-xs font-black border-muted-foreground/20 hover:border-muted-foreground hover:bg-muted shadow-sm h-9" onClick={() => setViewOrdersVendor(vendor)}>
                                                                        <Eye className="mr-2 h-3.5 w-3.5" /> {t('History')}
                                                                    </Button>
                                                                </div>
                                                                <div className="flex gap-2 w-full">
                                                                    <Button variant="secondary" size="sm" className="flex-1 text-[11px] font-black h-8 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all" onClick={() => {
                                                                        const lastOrder = vendorOrders.filter(po => po.status === 'Received' || po.status === 'Ordered').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                                                                        if (lastOrder) {
                                                                            setActiveTab('orders');
                                                                            setNewPoVendorId(vendor.id);
                                                                            setNewPoItems(lastOrder.items.map(i => ({ ...i, totalCost: i.quantity * i.unitCost })));
                                                                            toast({ title: t("Order Repeated"), description: t("Loaded items from last order.") });
                                                                        } else {
                                                                            toast({ title: t("No History"), description: t("No previous orders found to repeat."), variant: "destructive" });
                                                                        }
                                                                    }}>
                                                                        <RefreshCcw className="mr-2 h-3 w-3" /> {t('Repeat Last')}
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button variant="ghost" size="sm" className="px-3 h-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10 transition-all">
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
                                                                                <AlertDialogAction onClick={() => handleDeleteVendor(vendor.id)} className="bg-destructive hover:bg-destructive/90">{t('Delete')}</AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </div>
                                                            </CardFooter>
                                                        </Card>
                                                    );
                                                })
                                            ) : (
                                                <div className="col-span-full text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                                                    <Building className="h-16 w-16 opacity-10" />
                                                    <p className="text-lg font-medium">{t('No vendors found.')}</p>
                                                    <Button variant="outline" onClick={() => { setEditingVendor(null); setIsVendorAddDialogOpen(true); }}>
                                                        {t('Add Your First Vendor')}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            )}
                        </Card>
                    </div>
                </TabsContent>


                <TabsContent value="orders" className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <CardTitle>{t('Create New Purchase Order')}</CardTitle>
                                <CardDescription>{t('Draft and send a purchase order to a vendor.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 flex-grow">
                                <div className="space-y-2">
                                    <Label>{t('Select Vendor')}</Label>
                                    <Select value={newPoVendorId} onValueChange={setNewPoVendorId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select a vendor')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vendors.map(vendor => (
                                                <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="border rounded-md p-4 space-y-4">
                                    <div className="text-sm font-semibold">{t('Add Items')}</div>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="col-span-2 space-y-2">
                                            <Label>{t('Item Name')}</Label>
                                            <Input placeholder={t("e.g. Flour")} value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Quantity')}</Label>
                                            <Input type="number" placeholder="10" value={newItemQty} onChange={e => setNewItemQty(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Unit Cost')} ({currency})</Label>
                                            <Input type="number" placeholder="50" value={newItemCost} onChange={e => setNewItemCost(e.target.value)} />
                                        </div>
                                    </div>
                                    <Button onClick={handleAddPoItem} variant="secondary" className="w-full">
                                        <PlusCircle className="mr-2 h-4 w-4" /> {t('Add Item')}
                                    </Button>
                                </div>

                                {newPoItems.length > 0 && (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('Item')}</TableHead>
                                                    <TableHead>{t('Qty')}</TableHead>
                                                    <TableHead>{t('Cost')}</TableHead>
                                                    <TableHead>{t('Total')}</TableHead>
                                                    <TableHead className="text-right"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {newPoItems.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{item.name}</TableCell>
                                                        <TableCell>{item.quantity}</TableCell>
                                                        <TableCell>{currency}{item.unitCost.toFixed(2)}</TableCell>
                                                        <TableCell>{currency}{item.totalCost.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="sm" onClick={() => handleRemovePoItem(index)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow>
                                                    <TableCell colSpan={3} className="font-bold text-right">{t('Grand Total')}</TableCell>
                                                    <TableCell className="font-bold">{currency}{newPoItems.reduce((sum, i) => sum + i.totalCost, 0).toFixed(2)}</TableCell>
                                                    <TableCell></TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="mt-auto pt-6 border-t">
                                <Button onClick={handleCreatePurchaseOrder} disabled={!newPoVendorId || newPoItems.length === 0} className="w-full">
                                    {t('Create Purchase Order')}
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <CardTitle>{t('Receive Goods')}</CardTitle>
                                <CardDescription>{t('Verify received quantities and record payments.')}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <ScrollArea className="h-[600px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Date')}</TableHead>
                                                <TableHead>{t('Vendor')}</TableHead>
                                                <TableHead>{t('Amount')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {purchaseOrders.length > 0 ? purchaseOrders.map((po) => (
                                                <TableRow key={po.id}>
                                                    <TableCell className="whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span>{safeFormat(po.date, "MMM d")}</span>
                                                            <span className="text-xs text-muted-foreground">{po.referenceNo}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{po.vendorName}</TableCell>
                                                    <TableCell>{currency}{po.totalAmount.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <div className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide",
                                                            po.status === 'Ordered' ? "bg-yellow-100 text-yellow-800 border border-yellow-200" :
                                                                po.status === 'Received' ? "bg-green-100 text-green-800 border border-green-200" :
                                                                    "bg-gray-100 text-gray-800 border border-gray-200"
                                                        )}>
                                                            {t(po.status || 'Ordered')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {po.status === 'Ordered' && (
                                                            <Button size="sm" variant="outline" className="h-7 text-xs bg-primary/10 hover:bg-primary/20 text-primary border-primary/20" onClick={() => handleReceiveOrder(po)}>
                                                                {t('Receive')}
                                                            </Button>
                                                        )}
                                                        {po.status === 'Draft' && (
                                                            <Button size="sm" variant="outline" className="h-7 text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border-orange-200" onClick={() => {
                                                                setPurchaseOrders(purchaseOrders.map(p => p.id === po.id ? { ...p, status: 'Ordered', date: new Date() } : p));
                                                            }}>
                                                                {t('Finalize')}
                                                            </Button>
                                                        )}
                                                        {po.status === 'Received' && (
                                                            <Check className="h-4 w-4 text-green-600 ml-auto" />
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('No purchase orders found.')}</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            <AddOrEditVendorDialog
                open={isVendorAddDialogOpen}
                onOpenChange={setIsVendorAddDialogOpen}
                onSave={handleSaveVendor}
                existingVendor={editingVendor}
            />

            <AddOrEditPendingBillDialog
                open={isAddBillOpen}
                onOpenChange={setIsAddBillOpen}
                onSave={(name, amount, mobile, dueDate) => handleAddPendingTransaction(name, amount, mobile, dueDate)}
                existingNames={existingVendorNames}
                type="vendor"
                currency={currency}
            />

            <Dialog open={isLimitExceededDialogOpen} onOpenChange={setIsLimitExceededDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" />{t('Credit Limit Exceeded')}</DialogTitle>
                        <DialogDescription>
                            {t('Adding this amount would exceed the total vendor credit limit of')} <span className="font-bold">{currency}{vendorCreditLimit.toLocaleString()}</span>.
                            <br /><br />
                            {t('Please enter a lower amount or go to the')} <strong>{t('Admin')} &gt; {t('Financial Settings')}</strong> {t('to adjust the credit limit.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setIsLimitExceededDialogOpen(false)}>{t('OK')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewOrdersVendor} onOpenChange={(open) => !open && setViewOrdersVendor(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{t('Order History')} - {viewOrdersVendor?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Date')}</TableHead>
                                    <TableHead>{t('Ref No')}</TableHead>
                                    <TableHead>{t('Items')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead className="text-right">{t('Total Amount')}</TableHead>
                                    <TableHead className="text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {viewOrdersVendor && purchaseOrders.filter(po => po.vendorId === viewOrdersVendor.id).length > 0 ? (
                                    purchaseOrders.filter(po => po.vendorId === viewOrdersVendor.id).map(po => (
                                        <TableRow key={po.id}>
                                            <TableCell>{po.date ? new Date(po.date).toLocaleDateString() : 'N/A'}</TableCell>
                                            <TableCell className="font-mono text-xs">{po.referenceNo}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {po.items.map((item, idx) => (
                                                        <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-muted/50">
                                                            {item.quantity}x {item.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${po.status === 'Received' ? 'bg-green-100 text-green-700 border-green-200' :
                                                    po.status === 'Ordered' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                        'bg-gray-100 text-gray-700 border-gray-200'
                                                    }`}>
                                                    {po.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">{currency}{po.totalAmount.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                                                    const printWindow = window.open('', '_blank');
                                                    if (printWindow) {
                                                        printWindow.document.write(`
                                                               <html><head><title>Purchase Order #${po.referenceNo}</title></head><body>
                                                               <h2 style="margin:0">PO #${po.referenceNo}</h2>
                                                               <p>${po.vendorName} - ${new Date(po.date).toLocaleDateString()}</p>
                                                               <hr/>
                                                               <table style="width:100%; text-align:left;">
                                                               <thead><tr><th>Item</th><th>Qty</th><th>Cost</th><th>Total</th></tr></thead>
                                                               <tbody>
                                                               ${po.items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${i.unitCost}</td><td>${i.totalCost}</td></tr>`).join('')}
                                                               </tbody></table>
                                                               <hr/>
                                                               <h3>Total: ${currency}${po.totalAmount.toFixed(2)}</h3>
                                                               <script>window.onload = function() { window.print(); window.close(); }</script>
                                                               </body></html>
                                                           `);
                                                        printWindow.document.close();
                                                    }
                                                }}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">{t('No orders found.')}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!poToReceive} onOpenChange={(open) => !open && setPoToReceive(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t('Verify Received Goods & Process Payment')}</DialogTitle>
                        <DialogDescription>{t('Update quantities received and record any payment made.')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead className="text-xs h-8 uppercase">{t('Item')}</TableHead>
                                        <TableHead className="text-xs h-8 text-center uppercase">{t('Ordered')}</TableHead>
                                        <TableHead className="text-xs h-8 text-right uppercase w-[120px]">{t('Received')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {poToReceive?.items.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="py-2 text-sm font-medium">{item.name}</TableCell>
                                            <TableCell className="py-2 text-sm text-center font-mono">{item.quantity}</TableCell>
                                            <TableCell className="py-2 text-right">
                                                <Input
                                                    type="number"
                                                    className="h-8 text-right font-bold focus-visible:ring-primary"
                                                    value={receivedQuantities[item.inventoryItemId] ?? item.quantity}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setReceivedQuantities(prev => ({ ...prev, [item.inventoryItemId]: val }));
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="grid grid-cols-2 gap-6 bg-primary/5 p-4 rounded-xl border border-primary/20">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">{t('Expected Total')}</p>
                                <p className="text-2xl font-black text-primary">
                                    {currency}{poToReceive?.items.reduce((s, i) => s + (receivedQuantities[i.inventoryItemId] ?? i.quantity) * i.unitCost, 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-tight">{t('Amount Paid')}</Label>
                                <Input
                                    type="number"
                                    className="h-10 text-xl font-black text-green-600 bg-white dark:bg-black/40"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-destructive">
                            <span className="text-xs font-bold uppercase">{t('Remaining Balance (To Credit)')}</span>
                            <span className="text-lg font-black">
                                {currency}{Math.max(0, (poToReceive?.items.reduce((s, i) => s + (receivedQuantities[i.inventoryItemId] ?? i.quantity) * i.unitCost, 0) || 0) - (parseFloat(paymentAmount) || 0)).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPoToReceive(null)}>{t('Cancel')}</Button>
                        <Button onClick={handleConfirmReceive} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                            <PackageCheck className="mr-2 h-4 w-4" /> {t('Confirm & Update Stock')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewTransactionPO} onOpenChange={(open) => !open && setViewTransactionPO(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('PO Details')} #{viewTransactionPO?.referenceNo}</DialogTitle>
                        <DialogDescription>{safeFormat(viewTransactionPO?.date, 'PPP p')}</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Item')}</TableHead>
                                    <TableHead className="text-right">{t('Qty')}</TableHead>
                                    <TableHead className="text-right">{t('Cost')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {viewTransactionPO?.items.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                                        <TableCell className="text-right font-mono">{currency}{item.unitCost.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="font-bold">
                                    <TableCell colSpan={2} className="text-right">{t('Total')}</TableCell>
                                    <TableCell className="text-right">{currency}{viewTransactionPO?.totalAmount.toFixed(2)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter className="flex flex-col gap-2">
                        <Button className="w-full bg-primary hover:bg-primary/90 h-11 rounded-xl text-white font-black shadow-lg" onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow && viewTransactionPO) {
                                printWindow.document.write(`
                                    <html><head><title>Purchase Order #${viewTransactionPO.referenceNo}</title></head><body style="font-family: monospace;">
                                    <h2 style="margin:0">PO #${viewTransactionPO.referenceNo}</h2>
                                    <p>${viewTransactionPO.vendorName} - ${new Date(viewTransactionPO.date).toLocaleDateString()}</p>
                                    <hr/>
                                    <table style="width:100%; text-align:left; border-collapse: collapse;">
                                    <thead><tr style="border-bottom: 1px solid #ccc;"><th>Item</th><th>Qty</th><th>Cost</th><th>Total</th></tr></thead>
                                    <tbody>
                                    ${viewTransactionPO.items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${i.unitCost}</td><td>${i.totalCost}</td></tr>`).join('')}
                                    </tbody></table>
                                    <hr/>
                                    <h3>Total: ${currency}${viewTransactionPO.totalAmount.toFixed(2)}</h3>
                                    <script>window.onload = function() { window.print(); window.close(); }</script>
                                    </body></html>
                                `);
                                printWindow.document.close();
                            }
                        }}>
                            <Printer className="mr-2 h-4 w-4" /> {t('Print PO')}
                        </Button>
                        <Button variant="ghost" className="w-full h-11 rounded-xl font-bold" onClick={() => setViewTransactionPO(null)}>{t('Close')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewSimpleTransaction} onOpenChange={(open) => !open && setViewSimpleTransaction(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('Transaction Details')}</DialogTitle>
                        <DialogDescription>{viewSimpleTransaction && safeFormat(viewSimpleTransaction.date, 'PPP p')}</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl">
                            <span className="text-sm font-bold text-muted-foreground uppercase">{t('Vendor')}</span>
                            <span className="font-black text-lg">{viewSimpleTransaction?.name}</span>
                        </div>
                        <div className="flex justify-between items-center bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                            <span className="text-sm font-bold text-red-700 dark:text-red-400 uppercase">{t('Amount')}</span>
                            <span className="font-black text-2xl text-red-600 dark:text-red-400">{currency}{viewSimpleTransaction?.amount.toFixed(2)}</span>
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
Vendor:      ${viewSimpleTransaction.name}
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
        </div>
    );
}
