
"use client"

import { useState, useMemo, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Trash2, Plus, Minus, Server, Search, FilePlus, Truck, AlertTriangle, ScanBarcode, Info, Tag, Package2, DollarSign, MapPin, Calendar, List, Check, Sparkles, FileSpreadsheet, Upload, Download } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { InventoryItem, MenuCategory, Vendor, PurchaseOrder, DamageRecord } from '@/lib/types';
import { DEPARTMENTAL_STORE_CATALOG } from '@/lib/departmental-catalog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/language-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, PackageCheck, Flame, AlertOctagon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ProfitAnalysis from './profit-analysis';
import { TrendingUp } from 'lucide-react';
import { BarcodeLabelDialog } from './barcode-label-dialog';
import { ExpiryTrackerDialog } from './expiry-tracker-dialog';
import { ShrinkageAuditDialog } from './shrinkage-audit-dialog';

interface InventoryManagementProps {
  inventory: InventoryItem[];
  menu: MenuCategory[];
  vendors: Vendor[];
  setMenu: (menu: MenuCategory[]) => void;
  setInventory: (inventory: InventoryItem[]) => void;
  purchaseOrders?: PurchaseOrder[];
  setPurchaseOrders?: (pos: PurchaseOrder[]) => void;
  currency?: string;
  expenses?: any[];
  setExpenses?: (expenses: any[]) => void;
  setVendors?: (vendors: Vendor[]) => void;
}

function AddOrEditItemDialog({
  open,
  onOpenChange,
  onSave,
  existingItem,
  vendors,
  onAddVendor,
  focusField,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: Omit<InventoryItem, 'id'> & { id?: string }) => void;
  existingItem: InventoryItem | null;
  vendors: Vendor[];
  onAddVendor?: (vendor: any) => void;
  focusField?: string | null;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [capacity, setCapacity] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [vendorId, setVendorId] = useState<string | undefined>();
  const [expiryDate, setExpiryDate] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [hsnCode, setHsnCode] = useState('');
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [sellUnit, setSellUnit] = useState('');
  const [conversionFactor, setConversionFactor] = useState('');
  const [location, setLocation] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');

  useEffect(() => {
    if (open && focusField) {
      setTimeout(() => {
        const element = document.getElementById(focusField);
        if (element) {
          element.focus();
          element.click();
        }
      }, 200);
    }
  }, [open, focusField]);

  useEffect(() => {
    if (open) {
      if (existingItem) {
        setName(existingItem.name);
        setCategory(existingItem.category || '');
        setStock(String(existingItem.stock));
        setCapacity(String(existingItem.capacity));
        setUnit(existingItem.unit);
        setPrice(String(existingItem.price ?? ''));
        setVendorId(existingItem.vendorId || 'none');
        setExpiryDate(existingItem.expiryDate || '');
        setTaxRate(String(existingItem.taxRate ?? '0'));
        setHsnCode(existingItem.hsnCode || '');
        setPurchaseUnit(existingItem.purchaseUnit || '');
        setSellUnit(existingItem.sellUnit || '');
        setConversionFactor(String(existingItem.conversionFactor || ''));
        setLocation(existingItem.location || '');
        setCostPrice(String(existingItem.costPrice ?? ''));
        setDiscount(String(existingItem.discount || '0'));
        setId(existingItem.id);
      } else {
        setName('');
        setCategory('');
        setStock('');
        setCapacity('');
        setUnit('');
        setPrice('');
        setVendorId('none');
        setExpiryDate('');
        setTaxRate('0');
        setHsnCode('');
        setPurchaseUnit('');
        setSellUnit('');
        setConversionFactor('');
        setLocation('');
        setCostPrice('');
        setDiscount('0');
        setId('');
      }
    }
  }, [existingItem, open]);

  const handleSave = () => {
    if (name && stock && capacity && unit && price) {
      const s = parseFloat(stock);
      const c = parseFloat(capacity);
      const finalStock = (c > 0) ? Math.min(s, c) : s;

      onSave({
        id: existingItem ? existingItem.id : (id || undefined),
        name,
        category,
        stock: finalStock,
        capacity: c,
        unit,
        price: parseFloat(price),
        vendorId: vendorId === 'none' ? null : vendorId,
        expiryDate: expiryDate || undefined,
        taxRate: parseFloat(taxRate),
        hsnCode: hsnCode.trim() || undefined,
        purchaseUnit: purchaseUnit || undefined,
        sellUnit: sellUnit || undefined,
        conversionFactor: conversionFactor ? parseFloat(conversionFactor) : undefined,
        location: location || undefined,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        discount: parseFloat(discount),
      });
      onOpenChange(false);
    } else {
      toast({
        title: t("Missing Information"),
        description: t("Please fill in Name, Stock, Capacity, Unit, and Price."),
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-3xl font-black tracking-tight">{existingItem ? 'Edit' : 'Add'} Inventory Item</DialogTitle>
          <DialogDescription className="text-base">Fine-tune your stock details with precision.</DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto border-t border-b bg-muted/5">
          <div className="flex flex-col gap-6 px-8 py-6 pb-12">
            {/* Row 1: Identity & Financials */}
            <div className="grid grid-cols-3 gap-6">
              {/* Basic Info Card */}
              <div className="col-span-2 p-6 bg-background rounded-3xl border border-border/40 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Info className="h-4 w-4" />
                  <span className="uppercase tracking-widest text-[10px]">{t('Basic Information')}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="item-id" className="text-[10px] font-black text-muted-foreground uppercase opacity-70">
                      {existingItem ? t('Item ID / Barcode (Protected)') : t('Item ID / Barcode')}
                    </Label>
                    <div className="relative">
                      <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input id="item-id" className="pl-9 h-11 bg-muted/20 border-border/40 font-mono text-sm" value={existingItem ? existingItem.id : id} onChange={e => setId(e.target.value)} disabled={!!existingItem} placeholder={t("Scan barcode here...")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="item-name" className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Item Name</Label>
                    <Input id="item-name" className="h-11 bg-muted/20 border-border/40" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Coffee Beans" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="item-category" className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Category</Label>
                    <Input id="item-category" className="h-11 bg-muted/20 border-border/40" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Beverages" />
                  </div>
                </div>
              </div>

              {/* Financials Card */}
              <div className="p-6 bg-background rounded-3xl border border-border/40 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <DollarSign className="h-4 w-4" />
                  <span className="uppercase tracking-widest text-[10px]">{t('Financials')}</span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="item-cost" className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Cost Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">Rs.</span>
                      <Input id="item-cost" className="pl-10 h-11 bg-muted/20 border-border/40 font-bold" type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="item-price" className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Selling Price (MRP)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">Rs.</span>
                      <Input id="item-price" className="pl-10 h-11 bg-primary/5 border-primary/20 font-black text-primary text-lg" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="item-discount" className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Discount (%)</Label>
                    <div className="relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">%</span>
                      <Input id="item-discount" className="h-11 bg-muted/20 border-border/40 font-bold" type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Supply, Packaging & Stock */}
            <div className="grid grid-cols-3 gap-6">
              {/* Logistics Section */}
              <div className="p-6 bg-background rounded-3xl border border-border/40 shadow-sm space-y-4 flex flex-col">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Truck className="h-4 w-4" />
                  <span className="uppercase tracking-widest text-[10px]">{t('Supply & Location')}</span>
                </div>
                <div className="space-y-4 flex-grow">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-end mb-1.5">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Vendor / Supplier</Label>
                      <div className="text-[10px] font-bold text-primary cursor-pointer hover:underline flex items-center gap-1" onClick={() => setIsAddVendorOpen(true)}>
                        <PlusCircle className="h-3 w-3" />
                        {t('New Vendor')}
                      </div>
                    </div>
                    <Select value={vendorId} onValueChange={setVendorId}>
                      <SelectTrigger className="h-11 bg-muted/20 border-border/40 rounded-xl">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None / Miscellaneous</SelectItem>
                        {vendors.map((v: Vendor) => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
                    <DialogContent className="max-w-[500px] rounded-2xl p-6">
                      <DialogHeader>
                        <DialogTitle>{t('Add New Vendor')}</DialogTitle>
                        <DialogDescription>{t('Enter the full details for the new supplier.')}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 col-span-2">
                            <Label>{t('Vendor Name')} <span className="text-destructive">*</span></Label>
                            <Input value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="e.g. Fresh Farms Ltd." />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('Category')}</Label>
                            <Input id="new-vendor-category" placeholder="e.g. Dairy" />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('Phone')}</Label>
                            <Input id="new-vendor-phone" placeholder="+91..." />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('Email')}</Label>
                            <Input id="new-vendor-email" placeholder="vendor@example.com" />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('Location')}</Label>
                            <Input id="new-vendor-location" placeholder="City, Address" />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddVendorOpen(false)}>{t('Cancel')}</Button>
                        <Button onClick={() => {
                          if (newVendorName && onAddVendor) {
                            const category = (document.getElementById('new-vendor-category') as HTMLInputElement).value;
                            const phone = (document.getElementById('new-vendor-phone') as HTMLInputElement).value;
                            const email = (document.getElementById('new-vendor-email') as HTMLInputElement).value;
                            const location = (document.getElementById('new-vendor-location') as HTMLInputElement).value;

                            onAddVendor({
                              name: newVendorName,
                              category: category || 'General',
                              phone,
                              email,
                              location
                            });
                            setVendorId(newVendorName); // Assuming name is used for now or parent handles ID mapping
                            setNewVendorName('');
                            setIsAddVendorOpen(false);
                          }
                        }}>{t('Add Vendor')}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Shelf Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="edit-shelf-location" value={location} onChange={e => setLocation(e.target.value)} className="pl-9 h-11 bg-muted/20 border-border/40" placeholder="e.g. Aisle 3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Packaging Section */}
              <div className="p-6 bg-background rounded-3xl border border-border/40 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Package2 className="h-4 w-4" />
                  <span className="uppercase tracking-widest text-[10px]">{t('Units & Packaging')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5 p-3 bg-primary/5 rounded-2xl border border-primary/10">
                    <Label className="text-[10px] font-black text-primary/70 uppercase">Base Unit</Label>
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger className="h-10 bg-background border-primary/20 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="ltr">ltr</SelectItem>
                        <SelectItem value="unit">unit</SelectItem>
                        <SelectItem value="pcs">pcs</SelectItem>
                        <SelectItem value="box">box</SelectItem>
                        <SelectItem value="pkt">pkt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Bulk Unit</Label>
                    <Input id="edit-bulk-unit" value={purchaseUnit} onChange={e => setPurchaseUnit(e.target.value)} className="h-10 bg-muted/20 border-border/40 text-xs" placeholder="e.g. Box" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Retail Unit</Label>
                    <Input value={sellUnit} onChange={e => setSellUnit(e.target.value)} className="h-10 bg-muted/20 border-border/40 text-xs" placeholder="e.g. Piece" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Conversion Rate</Label>
                    <Input type="number" value={conversionFactor} onChange={e => setConversionFactor(e.target.value)} className="h-10 bg-muted/20 border-border/40 font-bold" placeholder="Items per bulk unit" />
                  </div>
                </div>
              </div>

              {/* Stock Details Section */}
              <div className="p-6 bg-background rounded-3xl border border-border/40 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <Tag className="h-4 w-4" />
                  <span className="uppercase tracking-widest text-[10px]">{t('Stock & Compliance')}</span>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Current</Label>
                      <Input type="number" value={stock} onChange={e => setStock(e.target.value)} className="h-11 bg-muted/20 border-border/40 font-black" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Capacity</Label>
                      <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} className="h-11 bg-muted/20 border-border/40 font-black italic text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Expiry Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="pl-9 h-11 bg-muted/20 border-border/40" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-70">Tax % (GST)</Label>
                      <Select value={taxRate} onValueChange={setTaxRate}>
                        <SelectTrigger id="edit-tax-rate" className="h-11 bg-muted/20 border-border/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0% (Exempt)</SelectItem>
                          <SelectItem value="5">5% (Essential)</SelectItem>
                          <SelectItem value="12">12% (Standard)</SelectItem>
                          <SelectItem value="18">18% (Standard+)</SelectItem>
                          <SelectItem value="28">28% (Luxury/Sin)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase opacity-70">HSN / SAC Code</Label>
                      <Input
                        value={hsnCode}
                        onChange={e => setHsnCode(e.target.value)}
                        placeholder="e.g. 1902"
                        className="h-11 bg-muted/20 border-border/40 font-mono text-sm uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 pt-4 border-t bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-8 rounded-2xl font-bold text-lg">Cancel</Button>
          <Button onClick={handleSave} className="h-12 px-10 rounded-2xl font-black text-lg bg-primary hover:bg-primary-dark shadow-xl shadow-primary/20">Save Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  );
}

function DamageLogDialog({ item, onLog }: { item: InventoryItem, onLog: (id: string, amount: number, reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('1');
  const [reason, setReason] = useState('Broken/Damaged');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="text-orange-500" onClick={() => setOpen(true)}>
        <AlertTriangle className="h-4 w-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Damage/Wastage</DialogTitle>
          <DialogDescription>Deduct damaged or unsellable stock for {item.name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="damage-amount">Amount ({item.unit})</Label>
            <Input id="damage-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} max={item.stock} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="damage-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="damage-reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Damaged / Leakage">💥 Damaged / Broken / Leaking</SelectItem>
                <SelectItem value="Pest / Rodent Damage">🐀 Pest / Rodent Damage</SelectItem>
                <SelectItem value="Expired / Spoiled">⏳ Expired / Spoiled</SelectItem>
                <SelectItem value="Theft / Shrinkage">🕵️ Theft / Missing</SelectItem>
                <SelectItem value="Physical Count Mismatch">📋 Physical Count Correction</SelectItem>
                <SelectItem value="Store Use / Sample">🧪 Store Use / Sample</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onLog(item.id, parseFloat(amount), reason); setOpen(false); }}>Log Damage</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryManagement({
  inventory,
  menu,
  vendors,
  setMenu,
  setInventory,
  purchaseOrders = [],
  setPurchaseOrders,
  currency = 'Rs.',
  expenses = [],
  setExpenses,
  setVendors,
}: InventoryManagementProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProfitDialogOpen, setIsProfitDialogOpen] = useState(false);
  const [isBarcodeStudioOpen, setIsBarcodeStudioOpen] = useState(false);
  const [barcodeTargetItem, setBarcodeTargetItem] = useState<InventoryItem | null>(null);
  const [isExpiryTrackerOpen, setIsExpiryTrackerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isShrinkageAuditOpen, setIsShrinkageAuditOpen] = useState(false);
  const [damageRecords, setDamageRecords] = useState<DamageRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('departmental_damage_records');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const nearExpiryCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inventory.filter(i => {
      if (!i.expiryDate) return false;
      const exp = new Date(i.expiryDate);
      exp.setHours(0, 0, 0, 0);
      const days = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 7;
    }).length;
  }, [inventory]);

  const [selectedPOVendor, setSelectedPOVendor] = useState<string | null>(null);
  const [poItems, setPoItems] = useState<any[]>([]);
  const [grnItem, setGrnItem] = useState<InventoryItem | null>(null);
  const [grnQty, setGrnQty] = useState<number>(0);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [poToReceive, setPoToReceive] = useState<PurchaseOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [isViewListOpen, setIsViewListOpen] = useState(false);
  const [isOrderNowOpen, setIsOrderNowOpen] = useState(false);
  const [orderItem, setOrderItem] = useState<InventoryItem | null>(null);
  const [orderQty, setOrderQty] = useState('');
  const [focusField, setFocusField] = useState<string | null>(null);

  // CSV Import & Wipe States
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [csvParsedItems, setCsvParsedItems] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvImportMode, setCsvImportMode] = useState<'append' | 'replace'>('append');
  const [csvError, setCsvError] = useState<string | null>(null);

  const downloadSampleCsv = () => {
    const headers = "Name,Category,Price,CostPrice,Stock,Barcode,HSN,Unit,MinStock\n";
    const sample1 = "Tata Salt 1kg,Groceries & Staples,28,24,50,8901030383789,250100,Pack,10\n";
    const sample2 = "Maggi 2-Minute Noodles 70g,Snacks & Packaged Foods,14,11.5,120,8901058852373,190230,Piece,20\n";
    const sample3 = "Amul Butter 100g,Dairy & Breakfast,58,51,30,8901262010054,040510,Pack,5\n";
    const blob = new Blob([headers + sample1 + sample2 + sample3], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "chillbill_catalog_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length <= 1) {
          setCsvError("CSV file must contain a header and at least one item row.");
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('item'));
        const catIdx = headers.findIndex(h => h.includes('cat'));
        const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('mrp'));
        const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('purchase'));
        const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('qty'));
        const barIdx = headers.findIndex(h => h.includes('bar') || h.includes('code'));
        const hsnIdx = headers.findIndex(h => h.includes('hsn'));
        const unitIdx = headers.findIndex(h => h.includes('unit'));
        const minIdx = headers.findIndex(h => h.includes('min') || h.includes('capacity'));

        if (nameIdx === -1) {
          setCsvError("Missing 'Name' column in CSV.");
          return;
        }

        const items: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
          if (row.length === 0 || !row[nameIdx]) continue;

          items.push({
            name: row[nameIdx],
            category: (catIdx > -1 && row[catIdx]) ? row[catIdx] : 'General',
            price: (priceIdx > -1 && parseFloat(row[priceIdx])) ? parseFloat(row[priceIdx]) : 0,
            costPrice: (costIdx > -1 && parseFloat(row[costIdx])) ? parseFloat(row[costIdx]) : 0,
            stock: (stockIdx > -1 && parseInt(row[stockIdx], 10)) ? parseInt(row[stockIdx], 10) : 0,
            barcode: (barIdx > -1 && row[barIdx]) ? row[barIdx] : '',
            hsnCode: (hsnIdx > -1 && row[hsnIdx]) ? row[hsnIdx] : '',
            unit: (unitIdx > -1 && row[unitIdx]) ? row[unitIdx] : 'Pack',
            capacity: (minIdx > -1 && parseInt(row[minIdx], 10)) ? parseInt(row[minIdx], 10) : 5,
          });
        }

        if (items.length === 0) {
          setCsvError("No valid products found in CSV file.");
          return;
        }

        setCsvParsedItems(items);
      } catch (err: any) {
        setCsvError("Failed to parse CSV file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmCsvImport = () => {
    if (csvParsedItems.length === 0) return;

    const formattedNewItems: InventoryItem[] = csvParsedItems.map((item, idx) => ({
      id: `ITEM-${Date.now()}-${idx + 1}`,
      name: item.name,
      category: item.category,
      price: item.price,
      costPrice: item.costPrice,
      stock: item.stock,
      barcode: item.barcode,
      hsnCode: item.hsnCode,
      unit: item.unit,
      capacity: item.capacity,
      status: item.stock > 0 ? 'In Stock' : 'Out of Stock',
    }));

    const finalInventory = csvImportMode === 'replace'
      ? formattedNewItems
      : [...inventory, ...formattedNewItems];

    setInventory(finalInventory);

    if (setMenu) {
      const existingMenu = csvImportMode === 'replace' ? [] : [...menu];
      const categoriesMap = new Map<string, any[]>();

      existingMenu.forEach(cat => {
        categoriesMap.set(cat.name.toLowerCase(), cat.items || []);
      });

      formattedNewItems.forEach(item => {
        const catKey = (item.category || 'General').toLowerCase();
        const currentList = categoriesMap.get(catKey) || [];
        currentList.push({
          name: item.name,
          price: item.price,
          barcode: item.barcode,
          hsnCode: item.hsnCode,
          code: String(currentList.length + 1).padStart(2, '0')
        });
        categoriesMap.set(catKey, currentList);
      });

      const updatedMenu: MenuCategory[] = Array.from(categoriesMap.entries()).map(([key, items]) => {
        const found = existingMenu.find(c => c.name.toLowerCase() === key);
        return {
          id: found ? found.id : key.replace(/\s+/g, '-'),
          name: found ? found.name : items[0]?.category || key.toUpperCase(),
          items: items,
          subcategories: found?.subcategories || []
        };
      });

      setMenu(updatedMenu);
      try {
        localStorage.setItem('menu', JSON.stringify(updatedMenu));
      } catch (e) {}
    }

    try {
      localStorage.setItem('inventory', JSON.stringify(finalInventory));
      localStorage.setItem('chillbill_catalog_initialized', 'true');
    } catch (e) {}

    toast({
      title: t("Catalog Imported!"),
      description: t(`Successfully imported ${formattedNewItems.length} products into your store catalog.`),
    });

    setIsCsvImportOpen(false);
    setCsvParsedItems([]);
    setCsvFileName('');
  };

  const handleClearAllInventory = () => {
    setInventory([]);
    if (setMenu) setMenu([]);
    try {
      localStorage.setItem('inventory', '[]');
      localStorage.setItem('menu', '[]');
      localStorage.setItem('chillbill_catalog_initialized', 'true');
    } catch (e) {}
    toast({
      title: t("100% Blank Slate Activated"),
      description: t("All inventory items and categories have been cleared. Store catalog is completely empty."),
    });
    setIsClearAllDialogOpen(false);
  };

  const filteredInventory = useMemo(() => {
    if (!searchTerm) return inventory;
    const lowercasedTerm = searchTerm.toLowerCase();
    return inventory.filter(item =>
      item.name.toLowerCase().includes(lowercasedTerm) ||
      item.category.toLowerCase().includes(lowercasedTerm) ||
      item.id.toLowerCase().includes(lowercasedTerm)
    );
  }, [inventory, searchTerm]);

  const handleSaveItem = (itemData: Omit<InventoryItem, 'id'> & { id?: string }) => {
    const { id: incomingId, ...data } = itemData;
    let newInventory;
    if (editingItem) {
      newInventory = inventory.map(item => item.id === editingItem.id ? { ...item, ...data } : item);
      toast({ title: t("Item updated successfully") });
    } else {
      let finalId = incomingId;

      // Check for duplicate ID if ID is manually provided
      if (finalId && inventory.some(i => i.id === finalId)) {
        toast({
          title: t("Duplicate Item"),
          description: t("An item with this ID/Barcode already exists."),
          variant: "destructive"
        });
        return;
      }

      if (!finalId) {
        const existingIds = inventory.map(item => parseInt(item.id, 10)).filter(id => !isNaN(id));
        finalId = String(existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1);

        // Paranoid check ensuring generated ID doesn't conflict (e.g. if mixed string/int IDs exist)
        while (inventory.some(i => i.id === finalId)) {
          finalId = String(parseInt(finalId, 10) + 1);
        }
      }
      const newItem = { ...data, id: finalId };
      newInventory = [...inventory, newItem];
      toast({ title: t("Item added successfully"), description: `${t("ID")}: ${finalId}` });
    }
    setInventory(newInventory);
  };

  const handleDeleteItem = (itemId: string) => {
    const newInventory = inventory.filter(item => item.id !== itemId);
    setInventory(newInventory);
    toast({ title: "Item deleted successfully" });
  };

  const handleOpenDialog = (item: InventoryItem | null, focus?: string) => {
    setEditingItem(item);
    setFocusField(focus || null);
    setIsDialogOpen(true);
  };

  const handleStockChange = (id: string, newStock: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const stock = Math.max(0, Math.min(item.capacity, newStock));

    // Alerts are now handled centrally in MainLayout via Dialogs

    const newInventory = inventory.map(i => i.id === id ? { ...i, stock } : i);
    setInventory(newInventory);
  }

  const handleLogDamage = (id: string, amount: number, reason: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const damageAmount = Math.max(0, Math.min(item.stock, amount));
    const newStock = item.stock - damageAmount;

    setInventory(inventory.map(i => i.id === id ? { ...i, stock: newStock } : i));

    const unitPrice = item.costPrice || item.price || 0;
    const newRecord: DamageRecord = {
      id: `DMG-${Date.now()}`,
      itemId: item.id,
      itemName: item.name,
      quantity: damageAmount,
      unit: item.unit,
      price: unitPrice,
      lossAmount: damageAmount * unitPrice,
      reason,
      date: new Date(),
      reportedBy: 'Store Admin',
    };

    const updated = [newRecord, ...damageRecords];
    setDamageRecords(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('departmental_damage_records', JSON.stringify(updated));
    }

    toast({
      title: "Damage Logged",
      description: `Logged ${damageAmount} ${item.unit} of ${item.name} as wastage (${currency}${(damageAmount * unitPrice).toFixed(2)} loss). Reason: ${reason}`,
      variant: "destructive",
    });
  };

  const handleLogShrinkage = (record: Omit<DamageRecord, 'id' | 'date'>) => {
    const item = inventory.find(i => i.id === record.itemId);
    if (!item) return;

    const newStock = Math.max(0, item.stock - record.quantity);
    setInventory(inventory.map(i => i.id === item.id ? { ...i, stock: newStock } : i));

    const newRecord: DamageRecord = {
      ...record,
      id: `DMG-${Date.now()}`,
      date: new Date(),
    };

    const updated = [newRecord, ...damageRecords];
    setDamageRecords(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('departmental_damage_records', JSON.stringify(updated));
    }
  };

  const handlePrintLabel = (item: InventoryItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Label - ${item.name}</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .label { border: 1px solid #000; padding: 10px; width: 200px; text-align: center; }
            .name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
            .price { font-size: 18px; font-weight: 900; margin: 5px 0; }
            .barcode { font-family: 'Libre Barcode 39', cursive; font-size: 40px; margin: 10px 0; }
            .id { font-size: 10px; color: #666; }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="label">
            <div class="name">${item.name.toUpperCase()}</div>
            <div class="price">MRP Rs. ${(item.price || 0).toFixed(2)}</div>
            <div class="barcode">*${item.id}*</div>
            <div class="id">${item.id}</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleQuickOrder = (item: InventoryItem, isImmediate: boolean = false) => {
    if (!setPurchaseOrders) return;
    if (!item.vendorId) {
      toast({
        title: t("No Vendor Assigned"),
        description: t("Please assign a vendor to this item first."),
        variant: "destructive"
      });
      return;
    }

    const vendor = vendors.find(v => v.id === item.vendorId);
    if (!vendor) return;

    // Check if capacity is reached
    if (item.capacity > 0 && item.stock >= item.capacity) {
      toast({
        title: t("Capacity Full"),
        description: t("Maximum stock capacity already reached."),
        variant: "destructive"
      });
      return;
    }

    // We add enough to reach capacity
    const orderQty = Math.max(1, item.capacity - item.stock);

    if (isImmediate) {
      setOrderItem(item);
      const needed = Math.max(1, item.capacity - item.stock);
      setOrderQty(String(needed));
      setIsOrderNowOpen(true);
      return;
    }

    // Check if there's already a draft order for this vendor
    const existingDraft = (purchaseOrders || []).find(po => po.vendorId === item.vendorId && po.status === 'Draft');

    if (existingDraft) {
      const itemIdx = existingDraft.items.findIndex(i => i.inventoryItemId === item.id);

      if (itemIdx > -1) {
        // Remove item from draft list (toggle behavior)
        const updatedItems = existingDraft.items.filter((_, idx) => idx !== itemIdx);

        if (updatedItems.length === 0) {
          // If draft becomes empty, remove the draft order itself
          setPurchaseOrders((purchaseOrders || []).filter(po => po.id !== existingDraft.id));
        } else {
          const updatedPO = {
            ...existingDraft,
            items: updatedItems,
            totalAmount: updatedItems.reduce((sum, i) => sum + i.totalCost, 0)
          };
          setPurchaseOrders((purchaseOrders || []).map(po => po.id === existingDraft.id ? updatedPO : po));
        }

        toast({
          title: t("Removed from list"),
          description: `${item.name} ${t("removed from")} ${vendor.name}'s ${t("draft list.")}`,
        });
        return;
      }

      let updatedItems = [...existingDraft.items];
      updatedItems.push({
        inventoryItemId: item.id,
        name: item.name,
        quantity: orderQty,
        unitCost: item.costPrice || 0,
        totalCost: orderQty * (item.costPrice || 0)
      });

      const updatedPO = {
        ...existingDraft,
        items: updatedItems,
        totalAmount: updatedItems.reduce((sum, i) => sum + i.totalCost, 0)
      };

      setPurchaseOrders((purchaseOrders || []).map(po => po.id === existingDraft.id ? updatedPO : po));
    } else {
      const newPO: PurchaseOrder = {
        id: `PO-${Date.now()}`,
        vendorId: vendor.id,
        vendorName: vendor.name,
        date: new Date(),
        referenceNo: `QUICK-${item.id}`,
        items: [{
          inventoryItemId: item.id,
          name: item.name,
          quantity: orderQty,
          unitCost: item.costPrice || 0,
          totalCost: orderQty * (item.costPrice || 0)
        }],
        totalAmount: orderQty * (item.costPrice || 0),
        status: 'Draft'
      };
      setPurchaseOrders([...(purchaseOrders || []), newPO]);
    }

    toast({
      title: t("Added to vendor list"),
      description: `${item.name} ${t("added to")} ${vendor.name}'s ${t("draft list.")}`,
    });
  };

  const getStockColor = (stock: number, capacity: number) => {
    const percentage = capacity > 0 ? (stock / capacity) * 100 : 0;
    if (percentage <= 10) {
      return "bg-red-500";
    }
    if (percentage <= 25) {
      return "bg-yellow-500";
    }
    return "bg-primary";
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: "EXPIRED", color: "text-red-500 font-black", icon: true };
    if (diffDays <= 30) return { label: `Expires in ${diffDays}d`, color: "text-orange-500 font-bold", icon: false };
    return { label: `Exp: ${format(expiry, 'PP')}`, color: "text-muted-foreground", icon: false };
  };

  const handleConfirmOrder = () => {
    if (!orderItem || !orderQty || !setPurchaseOrders) return;
    const qty = parseFloat(orderQty);
    if (qty <= 0) {
      toast({ title: t("Invalid Quantity"), variant: "destructive" });
      return;
    }

    if (orderItem.capacity > 0 && (orderItem.stock + qty) > orderItem.capacity) {
      toast({
        title: t("Capacity Limit Reached"),
        description: `${t("Cannot order more than capacity")} (${orderItem.capacity}). ${t("Current Space")}: ${orderItem.capacity - orderItem.stock}`,
        variant: "destructive"
      });
      return;
    }

    const vendor = vendors.find(v => v.id === orderItem.vendorId);
    if (!vendor) return; // Should be handled by handleQuickOrder check, but safety first.

    const newPO: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      date: new Date(),
      referenceNo: `NOW-${orderItem.id}`,
      items: [{
        inventoryItemId: orderItem.id,
        name: orderItem.name,
        quantity: qty,
        unitCost: orderItem.costPrice || 0,
        totalCost: qty * (orderItem.costPrice || 0)
      }],
      totalAmount: qty * (orderItem.costPrice || 0),
      status: 'Ordered'
    };
    setPurchaseOrders([...(purchaseOrders || []), newPO]);

    toast({
      title: t("Order Sent Successfully"),
      description: `${t("Order for")} ${qty} ${orderItem.unit} ${t("of")} ${orderItem.name} ${t("sent to")} ${vendor.name}.`,
    });
    setIsOrderNowOpen(false);
  };

  return (
    <div className="p-4">
      <Card className="bg-muted/30">
        <CardHeader>
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <div>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>Track and manage your stock levels.</CardDescription>
            </div>
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-9 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setInventory(DEPARTMENTAL_STORE_CATALOG);
                  try {
                    localStorage.setItem('inventory', JSON.stringify(DEPARTMENTAL_STORE_CATALOG));
                    localStorage.setItem('chillbill_catalog_initialized', 'true');
                  } catch (e) {}
                  toast({
                    title: t("Catalog Loaded!"),
                    description: t("Loaded 28 official Indian Departmental Store products with barcodes, stock & HSN.")
                  });
                }}
                className="bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500 text-emerald-600 transition-all font-bold"
                title={t("Load full Indian Departmental Store inventory catalog")}
              >
                <Sparkles className="mr-2 h-4 w-4 text-emerald-500" /> {t('Load Sample Catalog')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCsvParsedItems([]);
                  setCsvFileName('');
                  setCsvError(null);
                  setIsCsvImportOpen(true);
                }}
                className="bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500 text-indigo-600 transition-all font-bold"
                title={t("Bulk import products from CSV spreadsheet")}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 text-indigo-500" /> {t('Import CSV')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsClearAllDialogOpen(true)}
                className="bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500 text-rose-600 transition-all font-bold"
                title={t("Clear all products for a blank slate")}
              >
                <Trash2 className="mr-2 h-4 w-4 text-rose-500" /> {t('Clear All')}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setBarcodeTargetItem(null); setIsBarcodeStudioOpen(true); }}
                className="bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500 text-blue-600 transition-all font-bold"
              >
                <ScanBarcode className="mr-2 h-4 w-4" /> {t('Barcode Studio')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsExpiryTrackerOpen(true)}
                className={cn(
                  "transition-all font-bold",
                  nearExpiryCount > 0
                    ? "bg-orange-500/15 border-orange-500/40 hover:bg-orange-500/25 text-orange-700 animate-pulse"
                    : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <Flame className="mr-2 h-4 w-4 text-orange-500" />
                {t('Expiry Alerts')} {nearExpiryCount > 0 && <Badge className="ml-1.5 bg-orange-600 text-white font-black text-[10px] px-1.5 py-0">{nearExpiryCount}</Badge>}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsShrinkageAuditOpen(true)}
                className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20 hover:border-red-500 text-red-600 transition-all font-bold"
              >
                <AlertOctagon className="mr-2 h-4 w-4 text-red-500" />
                {t('Shrinkage & Loss')}
                {damageRecords.length > 0 && (
                  <Badge className="ml-1.5 bg-red-600 text-white font-black text-[10px] px-1.5 py-0">
                    {damageRecords.length}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsViewListOpen(true)} className="bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500 text-orange-600 transition-all font-bold">
                <List className="mr-2 h-4 w-4" /> {t('View List')}
              </Button>
              <Button variant="outline" onClick={() => setIsPODialogOpen(true)} className="bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary transition-all font-bold">
                <FilePlus className="mr-2 h-4 w-4" /> {t('Purchase Orders')}
              </Button>
              <Button onClick={() => handleOpenDialog(null)} className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-bold">
                <PlusCircle className="mr-2 h-4 w-4" /> {t('Add Item')}
              </Button>
              <Button variant="outline" onClick={() => setIsProfitDialogOpen(true)} className="bg-green-500/10 border-green-500/20 hover:bg-green-500/20 hover:border-green-500 text-green-700 transition-all font-bold">
                <TrendingUp className="mr-2 h-4 w-4" /> {t('Profit Analysis')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[calc(100vh-15rem)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b-2 border-border/80">
                  <TableHead className="font-black text-foreground uppercase py-4 text-sm">Item / Supplier</TableHead>
                  <TableHead className="font-black text-foreground uppercase py-4 text-sm">Stock Level</TableHead>
                  <TableHead className="font-black text-foreground uppercase py-4 text-sm text-center">Price</TableHead>
                  <TableHead className="font-black text-foreground uppercase py-4 text-sm text-center">Edit Item</TableHead>
                  <TableHead className="font-black text-blue-600 uppercase py-4 text-sm text-center">Barcode</TableHead>
                  <TableHead className="font-black text-destructive uppercase text-center py-4 text-sm">Loss / Damage</TableHead>
                  <TableHead className="font-black text-destructive uppercase text-center py-4 text-sm">{t('Delete')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item, index) => {
                  const activePO = (purchaseOrders || []).find(po => po.status === 'Ordered' && po.items.some(i => i.inventoryItemId === item.id));
                  const isInDraft = (purchaseOrders || []).some(po =>
                    po.status === 'Draft' &&
                    item.vendorId && po.vendorId === item.vendorId &&
                    po.items.some(it => it.inventoryItemId === item.id)
                  );

                  return (
                    <TableRow key={`${item.id}-${index}`} className="hover:bg-primary/[0.02] border-b border-border/40 transition-colors">
                      <TableCell className="font-medium py-5">
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-black uppercase tracking-tight text-foreground">{item.name}</div>
                          {isInDraft && (
                            <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-in zoom-in">
                              {t('IN LIST')}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40 uppercase tracking-wider">{item.category}</span>
                            {item.vendorId && (() => {
                              const v = vendors.find(ven => ven.id === item.vendorId);
                              return v ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="text-xs text-primary font-black flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer outline-none">
                                      <Truck className="h-3 w-3" /> {v.name}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 p-4 rounded-xl shadow-xl z-50">
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2 border-b pb-2">
                                        <div className="bg-primary/10 p-2 rounded-lg">
                                          <Truck className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                          <h4 className="font-bold text-base leading-none">{v.name}</h4>
                                          <span className="text-xs text-muted-foreground">{v.category}</span>
                                        </div>
                                      </div>
                                      <div className="grid gap-2 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <div className="w-6"><Check className="h-4 w-4" /></div>
                                          <span>{v.phone || 'No phone'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <div className="w-6"><Server className="h-4 w-4" /></div>
                                          <span className="truncate">{v.email || 'No email'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                          <div className="w-6"><MapPin className="h-4 w-4" /></div>
                                          <span>{v.location || 'No location'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <span className="text-xs text-muted-foreground font-black flex items-center gap-1 bg-muted/20 px-2 py-0.5 rounded-full cursor-not-allowed">
                                  <Truck className="h-3 w-3" /> N/A
                                </span>
                              );
                            })()}
                            <span onClick={() => handleOpenDialog(item, 'edit-tax-rate')} className="text-[10px] font-black text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/10 uppercase cursor-pointer hover:bg-green-500/20 transition-colors">Tax: {item.taxRate || 0}%</span>
                            {item.hsnCode && (
                              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                HSN: {item.hsnCode}
                              </span>
                            )}
                            {item.purchaseUnit && item.sellUnit && (
                              <span onClick={() => handleOpenDialog(item, 'edit-bulk-unit')} className="text-[10px] text-orange-600 font-black bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/10 uppercase cursor-pointer hover:bg-orange-500/20 transition-colors">
                                1 {item.purchaseUnit} = {item.conversionFactor} {item.sellUnit}
                              </span>
                            )}
                            {item.location && (
                              <span onClick={() => handleOpenDialog(item, 'edit-shelf-location')} className="text-[10px] text-blue-600 font-black bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/10 uppercase flex items-center gap-1 cursor-pointer hover:bg-blue-500/20 transition-colors">
                                <Server className="h-2.5 w-2.5" /> {item.location}
                              </span>
                            )}
                          </div>
                          {item.expiryDate && (
                            <div className={cn("text-xs flex items-center gap-1 mt-1", getExpiryStatus(item.expiryDate)?.color)}>
                              <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                              {getExpiryStatus(item.expiryDate)?.label}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-col gap-3 min-w-[200px]">
                          <Progress
                            value={(item.stock / item.capacity) * 100}
                            className="w-full h-2.5 bg-muted/50"
                            indicatorClassName={getStockColor(item.stock, item.capacity)}
                          />
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-10 px-4 bg-primary/10 border border-primary/20 rounded-xl shadow-inner group">
                              <span className="text-xl font-black text-primary">{item.stock}</span>
                            </div>
                            <div className="text-lg font-black text-muted-foreground/40 italic">/ {item.capacity} <span className="text-[10px] uppercase opacity-60 not-italic font-bold tracking-widest">{item.unit}</span></div>

                            <div className="flex items-center gap-2 ml-auto min-h-[40px]">
                              {activePO ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 animate-in zoom-in duration-300"
                                    onClick={() => {
                                      setPoToReceive(activePO);
                                      setPaymentAmount('0');
                                      const qtys: Record<string, number> = {};
                                      activePO.items.forEach(i => qtys[i.inventoryItemId] = i.quantity);
                                      setReceivedQuantities(qtys);
                                    }}
                                  >
                                    <PackageCheck className="mr-2 h-4 w-4" /> {t('Receive')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-10 px-3 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive rounded-xl font-bold transition-all shadow-sm"
                                    onClick={() => {
                                      if (setPurchaseOrders) {
                                        setPurchaseOrders(purchaseOrders.map(p => p.id === activePO.id ? { ...p, status: 'Draft' } : p));
                                        toast({ title: t("Order Cancelled"), description: t("Reverted to draft.") });
                                      }
                                    }}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    {t('Cancel Order')}
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className={cn(
                                            "h-10 px-3 font-black text-[10px] uppercase rounded-xl transition-all shadow-sm active:scale-95",
                                            isInDraft
                                              ? "bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20"
                                              : "bg-orange-500/10 border-orange-500/20 text-orange-600 hover:bg-orange-500 hover:text-white"
                                          )}
                                          onClick={() => handleQuickOrder(item)}
                                        >
                                          {isInDraft ? (
                                            <>
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              {t('Remove from list')}
                                            </>
                                          ) : (
                                            <>
                                              <List className="h-4 w-4 mr-2" />
                                              {t('Add to list')}
                                            </>
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {isInDraft ? t('Remove from draft list') : t('Add to vendor draft list')}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          className="h-10 px-3 bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95"
                                          onClick={() => handleQuickOrder(item, true)}
                                        >
                                          <Truck className="h-4 w-4 mr-2" />
                                          {t('Order now')}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{item.vendorId ? t('Send order to vendor immediately') : t('Vendor required to order')}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-black text-2xl text-primary py-5 text-center">
                        {(item.discount && item.discount > 0) ? (
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1.5 opacity-60 scale-90">
                              <span className="text-xs font-bold text-muted-foreground line-through decoration-destructive decoration-2">
                                Rs. {(item.price || 0).toFixed(2)}
                              </span>
                              <span className="text-xs font-black text-green-600 bg-green-500/10 px-1.5 rounded-sm">
                                -{item.discount}%
                              </span>
                            </div>
                            <div className="flex items-baseline justify-center">
                              <span className="text-sm opacity-60 mr-1">Rs.</span>
                              {((item.price || 0) * (1 - item.discount / 100)).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <><span className="text-sm opacity-60 mr-1">Rs.</span>{(item.price || 0).toFixed(2)}</>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-5">
                        <div className="flex items-center justify-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-12 w-12 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-2xl border border-transparent hover:border-primary/10" onClick={() => handleOpenDialog(item)}>
                                  <Edit className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Edit Item</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 rounded-2xl text-blue-500 hover:bg-blue-50 border border-transparent hover:border-blue-100 mx-auto"
                                onClick={() => {
                                  setBarcodeTargetItem(item);
                                  setIsBarcodeStudioOpen(true);
                                }}
                              >
                                <ScanBarcode className="h-6 w-6" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Print Barcode Stickers')}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center py-5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-block transform hover:scale-110 transition-transform">
                                <DamageLogDialog item={item} onLog={handleLogDamage} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p>Log Damage/Wastage</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center py-5">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl border border-transparent hover:border-destructive/20 active:scale-95 transition-all">
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-3xl font-black tracking-tight">Remove from Inventory?</AlertDialogTitle>
                              <AlertDialogDescription className="text-lg leading-relaxed">
                                You are about to permanently delete <span className="font-black text-foreground underline decoration-destructive/30">"{item.name}"</span>. This will erase all associated stock records and history.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-3 mt-6">
                              <AlertDialogCancel className="h-12 px-8 rounded-2xl font-bold text-base border-border/60 hover:bg-muted transition-all">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteItem(item.id)} className="h-12 px-8 rounded-2xl font-black text-base bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20 transition-all">Delete Forever</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddOrEditItemDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveItem}
        existingItem={editingItem}
        vendors={vendors}
        onAddVendor={(vendorData) => {
          if (setVendors) {
            const newId = `v-${Date.now()}`;
            const newVendor: Vendor = {
              id: newId,
              name: vendorData.name,
              category: vendorData.category,
              phone: vendorData.phone,
              email: vendorData.email,
              location: vendorData.location,
              balance: 0
            };
            setVendors([...vendors, newVendor]);
            toast({ title: t("Vendor Added"), description: `${vendorData.name} ${t("added to list.")}` });
          }
        }}
        focusField={focusField}
      />
      <Dialog open={isOrderNowOpen} onOpenChange={setIsOrderNowOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{t('Order')} {orderItem?.name}</DialogTitle>
            <DialogDescription>{t('Confirm quantity to order.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Current Stock: <span className="font-bold text-foreground">{orderItem?.stock}</span> / {orderItem?.capacity} {orderItem?.unit}</span>
              <span className="text-muted-foreground">Required: <span className="font-bold text-orange-500">{orderItem ? Math.max(0, orderItem.capacity - orderItem.stock) : 0}</span></span>
            </div>
            <div className="space-y-2">
              <Label>{t('Order Quantity')}</Label>
              <Input
                type="number"
                value={orderQty}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  const maxAllowed = orderItem ? Math.max(0, orderItem.capacity - orderItem.stock) : 0;
                  if (orderItem && orderItem.capacity > 0 && val > maxAllowed) {
                    toast({
                      title: t("Capacity Limit"),
                      description: `${t("Max allowed is")} ${maxAllowed}`,
                      variant: "destructive"
                    });
                    setOrderQty(String(maxAllowed));
                  } else {
                    setOrderQty(e.target.value);
                  }
                }}
                className="font-bold text-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => {
                if (orderItem) {
                  const needed = Math.max(0, orderItem.capacity - orderItem.stock);
                  setOrderQty(String(Math.floor(needed / 2)));
                }
              }}>{t('Half Fill')}</Button>
              <Button variant="outline" className="border-primary/20 text-primary bg-primary/5 hover:bg-primary/10" onClick={() => {
                if (orderItem) {
                  const needed = Math.max(0, orderItem.capacity - orderItem.stock);
                  setOrderQty(String(needed));
                }
              }}>{t('Full Fill')}</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOrderNowOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleConfirmOrder}>{t('Confirm Order')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isPODialogOpen} onOpenChange={setIsPODialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Purchase Orders & GRN</DialogTitle>
            <DialogDescription>Create orders for suppliers and receive stock into inventory.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">{t('Create Order')}</TabsTrigger>
              <TabsTrigger value="receive">{t('Receive Goods')}</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Vendor</Label>
                  <Select onValueChange={(v) => setSelectedPOVendor(v)}>
                    <SelectTrigger><SelectValue placeholder="Chose Supplier" /></SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reference No.</Label>
                  <Input placeholder="PO-2024-001" id="inv-po-ref-no" />
                </div>
              </div>
              <div className="border rounded-xl p-4 bg-muted/30">
                <h4 className="font-bold text-sm mb-2">Add Items to PO</h4>
                <div className="flex gap-2">
                  <Select onValueChange={(id) => {
                    const item = inventory.find(i => i.id === id);
                    if (item) setPoItems([...poItems, {
                      inventoryItemId: item.id,
                      name: item.name,
                      quantity: 1,
                      unitCost: item.costPrice || 0,
                      unit: item.unit
                    }]);
                  }}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Search Inventory..." /></SelectTrigger>
                    <SelectContent>
                      {inventory.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Order Qty</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Input type="number" className="w-20" value={item.quantity} onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const invItem = inventory.find(i => i.id === item.inventoryItemId);
                            if (invItem && invItem.capacity > 0 && (invItem.stock + val) > invItem.capacity) {
                              const maxAllowed = Math.max(0, invItem.capacity - invItem.stock);
                              toast({
                                title: t("Capacity Limit"),
                                description: `${t("Max allowed is")} ${maxAllowed}`,
                                variant: "destructive"
                              });
                              const newItems = [...poItems];
                              newItems[idx].quantity = maxAllowed;
                              setPoItems(newItems);
                            } else {
                              const newItems = [...poItems];
                              newItems[idx].quantity = val;
                              setPoItems(newItems);
                            }
                          }} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" className="w-24" value={item.unitCost} onChange={(e) => {
                            const newItems = [...poItems];
                            newItems[idx].unitCost = parseFloat(e.target.value) || 0;
                            setPoItems(newItems);
                          }} />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {currency}{(item.quantity * item.unitCost).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}>
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end p-4 bg-muted/20 rounded-lg">
                <div className="text-right">
                  <span className="text-sm text-muted-foreground mr-2">Total Amount:</span>
                  <span className="text-xl font-bold">{currency}{poItems.reduce((s, i) => s + (i.quantity * i.unitCost), 0).toFixed(2)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full" onClick={() => {
                  if (!selectedPOVendor) {
                    toast({ title: "Error", description: "Please select a vendor.", variant: "destructive" });
                    return;
                  }
                  const refNo = (document.getElementById('inv-po-ref-no') as HTMLInputElement)?.value || `PO-${Date.now()}`;
                  const totalAmount = poItems.reduce((s, i) => s + (i.quantity * i.unitCost), 0);

                  const newPO: PurchaseOrder = {
                    id: Date.now().toString(),
                    vendorId: selectedPOVendor,
                    vendorName: vendors.find(v => v.id === selectedPOVendor)?.name || '',
                    date: new Date(),
                    referenceNo: refNo,
                    items: poItems.map(i => ({
                      inventoryItemId: i.inventoryItemId,
                      name: i.name,
                      quantity: i.quantity,
                      unitCost: i.unitCost,
                      totalCost: i.quantity * i.unitCost
                    })),
                    totalAmount,
                    status: 'Ordered'
                  };

                  if (setPurchaseOrders) {
                    setPurchaseOrders([...purchaseOrders, newPO]);
                    toast({ title: "PO Created", description: "Purchase Order has been generated and saved." });
                    setPoItems([]);
                    setIsPODialogOpen(false);
                  } else {
                    toast({ title: "Error", description: "Could not save PO. State function missing.", variant: "destructive" });
                  }
                }} disabled={poItems.length === 0}>Generate Purchase Order</Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="receive" className="space-y-4 pt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Pending Purchase Orders</h3>
                {purchaseOrders.filter(po => po.status === 'Ordered').length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                    <PackageCheck className="h-12 w-12 mb-4 opacity-50" />
                    <p>No pending orders found.</p>
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Ref</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseOrders.filter(po => po.status === 'Ordered').map((po) => (
                          <TableRow key={po.id}>
                            <TableCell className="font-medium">{po.referenceNo}</TableCell>
                            <TableCell>{po.vendorName}</TableCell>
                            <TableCell>{format(new Date(po.date), 'PP')}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {po.items.map((item, idx) => (
                                  <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 h-4 truncate">
                                    {item.quantity}x {item.name}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{currency}{po.totalAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" onClick={() => {
                                setPoToReceive(po);
                                setPaymentAmount('0');
                                const qtys: Record<string, number> = {};
                                po.items.forEach(i => qtys[i.inventoryItemId] = i.quantity);
                                setReceivedQuantities(qtys);
                              }}>
                                {t('Receive')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <Dialog open={isProfitDialogOpen} onOpenChange={setIsProfitDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profit Analysis</DialogTitle>
          </DialogHeader>
          <ProfitAnalysis inventory={inventory} expenses={expenses} currency={currency} />
          <DialogFooter>
            <Button onClick={() => setIsProfitDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!poToReceive} onOpenChange={(open) => !open && setPoToReceive(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('Verify Received Goods & Process Payment')}</DialogTitle>
            <DialogDescription>{t('Update quantities received and record any payment made.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="border rounded-lg overflow-hidden bg-muted/20">
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
            <Button onClick={() => {
              if (!poToReceive) return;
              const paid = parseFloat(paymentAmount) || 0;

              // Calculate total value based on received quantities
              let totalValue = 0;
              poToReceive.items.forEach(item => {
                totalValue += (receivedQuantities[item.inventoryItemId] ?? item.quantity) * item.unitCost;
              });

              const balance = totalValue - paid;

              // Update Inventory
              const updatedInventory = [...inventory];
              poToReceive.items.forEach(poItem => {
                const qty = receivedQuantities[poItem.inventoryItemId] ?? poItem.quantity;
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
              if (setPurchaseOrders) {
                setPurchaseOrders(purchaseOrders.map(p => p.id === poToReceive.id ? { ...p, status: 'Received' } : p));
              }

              // Update Vendor Balance
              if (setVendors && poToReceive.vendorId) {
                const vendorIndex = vendors.findIndex(v => v.id === poToReceive.vendorId);
                if (vendorIndex > -1) {
                  const updatedVendors = vendors.map((v, i) => i === vendorIndex ? { ...v, balance: (v.balance || 0) + balance } : v);
                  setVendors(updatedVendors);
                }
              }

              // Add Expense
              if (setExpenses && paid > 0) {
                const newExpense = {
                  id: Date.now().toString(),
                  date: new Date(),
                  category: 'Stock Purchase',
                  description: `Payment for PO ${poToReceive.referenceNo}`,
                  amount: paid,
                  vendorId: poToReceive.vendorId
                };
                setExpenses([...expenses, newExpense]);
              }

              toast({ title: t("Order Received"), description: `Stock updated. Balance: ${currency}${balance.toFixed(2)}` });
              setPoToReceive(null);
              setPaymentAmount('');
            }} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <PackageCheck className="mr-2 h-4 w-4" /> {t('Confirm & Update Stock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isViewListOpen} onOpenChange={setIsViewListOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{t('Draft Purchase Orders')}</DialogTitle>
            <DialogDescription>{t('Review and modify items in your draft list before ordering.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {purchaseOrders.filter(po => po.status === 'Draft').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                <List className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">{t('Your list is empty.')}</p>
                <p className="text-sm opacity-60">{t('Add items from the inventory table.')}</p>
              </div>
            ) : (
              purchaseOrders.filter(po => po.status === 'Draft').map(po => (
                <Card key={po.id} className="relative overflow-hidden border-2 border-muted/60 shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">{t('Vendor')}</Label>
                        <div className="h-10 flex items-center text-lg font-black text-foreground/80">
                          {po.vendorName}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 h-6">{t('Draft Order')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="uppercase text-[10px] font-black text-muted-foreground bg-muted/10 h-10">
                          <TableHead className="pl-6">{t('Item Details')}</TableHead>
                          <TableHead className="w-[140px] text-center">{t('Quantity')}</TableHead>
                          <TableHead className="text-right pr-6">{t('Cost')}</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.items.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/5">
                            <TableCell className="pl-6 py-4">
                              <div className="font-bold text-foreground">{item.name}</div>
                              {item.unitCost > 0 && <div className="text-xs text-muted-foreground mt-0.5">{currency}{item.unitCost.toFixed(2)} / unit</div>}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center justify-center gap-1 bg-muted/20 rounded-lg p-1 w-fit mx-auto border border-border/40">
                                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md hover:bg-background hover:shadow-sm transition-all" onClick={() => {
                                  if (item.quantity > 1) {
                                    const newItems = [...po.items];
                                    newItems[idx].quantity -= 1;
                                    newItems[idx].totalCost = newItems[idx].quantity * newItems[idx].unitCost;
                                    const newTotal = newItems.reduce((acc, i) => acc + i.totalCost, 0);
                                    if (setPurchaseOrders) setPurchaseOrders(purchaseOrders.map(p => p.id === po.id ? { ...p, items: newItems, totalAmount: newTotal } : p));
                                  }
                                }}>
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="w-10 text-center font-mono font-bold text-sm">{item.quantity}</span>
                                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md hover:bg-background hover:shadow-sm transition-all" onClick={() => {
                                  const invItem = inventory.find(i => i.id === item.inventoryItemId);
                                  if (invItem && invItem.capacity > 0 && (invItem.stock + item.quantity + 1) > invItem.capacity) {
                                    toast({
                                      title: t("Capacity Limit"),
                                      description: t("Cannot add more than capacity"),
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  const newItems = [...po.items];
                                  newItems[idx].quantity += 1;
                                  newItems[idx].totalCost = newItems[idx].quantity * newItems[idx].unitCost;
                                  const newTotal = newItems.reduce((acc, i) => acc + i.totalCost, 0);
                                  if (setPurchaseOrders) setPurchaseOrders(purchaseOrders.map(p => p.id === po.id ? { ...p, items: newItems, totalAmount: newTotal } : p));
                                }}>
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-sm pr-6 py-4">{currency}{(item.totalCost).toFixed(2)}</TableCell>
                            <TableCell className="py-4 pr-4">
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg transition-colors" onClick={() => {
                                const newItems = po.items.filter((_, i) => i !== idx);
                                if (newItems.length === 0) {
                                  if (setPurchaseOrders) setPurchaseOrders(purchaseOrders.filter(p => p.id !== po.id));
                                } else {
                                  const newTotal = newItems.reduce((acc, i) => acc + i.totalCost, 0);
                                  if (setPurchaseOrders) setPurchaseOrders(purchaseOrders.map(p => p.id === po.id ? { ...p, items: newItems, totalAmount: newTotal } : p));
                                }
                              }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end items-center p-4 bg-muted/10 border-t border-border/40 gap-6">
                      <div className="text-right">
                        <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-0.5">{t('Total Amount')}</p>
                        <p className="text-xl font-black">{currency}{po.totalAmount.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2.5">
                        <Button variant="outline" className="h-11 px-5 rounded-xl text-destructive hover:bg-destructive/10 border-destructive/20 font-bold" onClick={() => {
                          if (setPurchaseOrders) setPurchaseOrders(purchaseOrders.filter(p => p.id !== po.id));
                          toast({ title: t('Draft Deleted') });
                        }}>{t('Dismiss')}</Button>
                        <Button className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 font-black shadow-lg shadow-primary/20 transition-all active:scale-95" onClick={() => {
                          if (setPurchaseOrders) setPurchaseOrders(purchaseOrders.map(p => p.id === po.id ? { ...p, status: 'Ordered', date: new Date() } : p));
                          toast({ title: t('Order Placed'), description: `${t('Order sent to')} ${po.vendorName}` });
                        }}>
                          <Truck className="mr-2 h-4 w-4" /> {t('Order Now')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="ghost" onClick={() => setIsViewListOpen(false)} className="rounded-xl">{t('Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeLabelDialog
        isOpen={isBarcodeStudioOpen}
        onOpenChange={setIsBarcodeStudioOpen}
        inventory={inventory}
        selectedItem={barcodeTargetItem}
        currency={currency}
      />

      <ExpiryTrackerDialog
        isOpen={isExpiryTrackerOpen}
        onOpenChange={setIsExpiryTrackerOpen}
        inventory={inventory}
        setInventory={setInventory}
        currency={currency}
      />

      <ShrinkageAuditDialog
        isOpen={isShrinkageAuditOpen}
        onOpenChange={setIsShrinkageAuditOpen}
        inventory={inventory}
        records={damageRecords}
        onLogShrinkage={handleLogShrinkage}
        currency={currency}
      />

      {/* CSV Import Modal */}
      <Dialog open={isCsvImportOpen} onOpenChange={setIsCsvImportOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
              Bulk Import Products via CSV / Excel
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Upload a standard spreadsheet with product details. Download our template below to see the exact format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Template Download Banner */}
            <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground block">Need a starting template?</span>
                <span className="text-[11px] text-muted-foreground block">Includes columns for Name, Category, Price, Cost, Stock, Barcode, HSN & Unit.</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSampleCsv}
                className="shrink-0 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500 hover:text-white font-bold text-xs rounded-xl"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Template
              </Button>
            </div>

            {/* File Upload Box */}
            <div className="border-2 border-dashed border-border/80 rounded-2xl p-6 text-center hover:border-primary/50 transition-colors bg-muted/20">
              <input
                type="file"
                accept=".csv,text/csv"
                id="csv-file-input"
                className="hidden"
                onChange={handleCsvFile}
              />
              <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  <Upload className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-foreground">
                  {csvFileName ? `Selected: ${csvFileName}` : "Click to select CSV File"}
                </span>
                <span className="text-[10px] text-muted-foreground">Accepts .csv exported from Excel, Tally or Vyapar</span>
              </label>
            </div>

            {csvError && (
              <p className="text-xs text-destructive font-bold text-center bg-destructive/10 p-2 rounded-xl border border-destructive/20">{csvError}</p>
            )}

            {/* Preview of Parsed Items */}
            {csvParsedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold px-1">
                  <span className="text-emerald-600 flex items-center gap-1.5">
                    <Check className="h-4 w-4" /> Ready to import {csvParsedItems.length} products
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground font-normal">Mode:</span>
                    <select
                      value={csvImportMode}
                      onChange={(e: any) => setCsvImportMode(e.target.value)}
                      className="text-xs font-bold bg-muted px-2 py-1 rounded-lg border border-border"
                    >
                      <option value="append">Add to existing items</option>
                      <option value="replace">Replace all current items</option>
                    </select>
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto border border-border/60 rounded-xl divide-y divide-border/40 text-xs">
                  {csvParsedItems.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between bg-background/50">
                      <div>
                        <span className="font-bold text-foreground">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground block">{item.category} • Barcode: {item.barcode || 'N/A'}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-primary">{currency} {item.price}</span>
                        <span className="text-[10px] text-muted-foreground block">Stock: {item.stock}</span>
                      </div>
                    </div>
                  ))}
                  {csvParsedItems.length > 5 && (
                    <div className="p-2 text-center text-[10px] text-muted-foreground bg-muted/20">
                      ...and {csvParsedItems.length - 5} more items
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setIsCsvImportOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCsvImport}
              disabled={csvParsedItems.length === 0}
              className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Confirm & Import {csvParsedItems.length > 0 ? `(${csvParsedItems.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Inventory Confirmation Modal */}
      <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <AlertDialogContent className="rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Wipe All Inventory (100% Blank Slate)?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs pt-1 leading-relaxed">
              This will remove all {inventory.length} products and menu categories from your store catalog.
              <br /><br />
              Your catalog will remain completely empty until you add products or upload a CSV. You can also reload the 28 sample FMCG products anytime from Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 pt-3">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllInventory}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl"
            >
              Yes, Clear All Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
