"use client";

import { useState, useMemo } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertOctagon,
  Printer,
  PlusCircle,
  TrendingDown,
  PackageX,
  Search,
  Filter,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { DamageRecord, InventoryItem } from '@/lib/types';
import { format, isThisMonth, isToday } from 'date-fns';

const REASONS = [
  { value: 'Damaged / Leakage', label: '💥 Damaged / Broken / Leaking', color: 'bg-red-500/10 text-red-600 border-red-200' },
  { value: 'Pest / Rodent Damage', label: '🐀 Pest / Rodent Damage', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  { value: 'Expired / Spoiled', label: '⏳ Expired / Disposed', color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  { value: 'Theft / Shrinkage', label: '🕵️ Theft / Unaccounted Shrinkage', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { value: 'Physical Count Mismatch', label: '📋 Physical Count Correction', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { value: 'Store Use / Sample', label: '🧪 Store Use / Tasting / Sample', color: 'bg-gray-500/10 text-gray-600 border-gray-200' },
];

interface ShrinkageAuditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
  records: DamageRecord[];
  onLogShrinkage: (record: Omit<DamageRecord, 'id' | 'date'>) => void;
  onClearRecords?: () => void;
  currency?: string;
  venueName?: string;
}

export function ShrinkageAuditDialog({
  isOpen,
  onOpenChange,
  inventory,
  records,
  onLogShrinkage,
  onClearRecords,
  currency = 'Rs.',
  venueName = 'SUPERMARKET',
}: ShrinkageAuditDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [filterPeriod, setFilterPeriod] = useState<'all' | 'month' | 'today'>('all');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // New adjustment entry state
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [adjustQty, setAdjustQty] = useState<string>('1');
  const [adjustReason, setAdjustReason] = useState<string>('Damaged / Leakage');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  const selectedItem = useMemo(
    () => inventory.find((i) => i.id === selectedItemId),
    [inventory, selectedItemId]
  );

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const d = new Date(r.date);
      if (filterPeriod === 'today' && !isToday(d)) return false;
      if (filterPeriod === 'month' && !isThisMonth(d)) return false;
      if (filterReason !== 'all' && r.reason !== filterReason) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          r.itemName.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          (r.id || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, filterPeriod, filterReason, searchTerm]);

  // Aggregate KPI metrics
  const totalLossAmount = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + (r.lossAmount || 0), 0),
    [filteredRecords]
  );

  const totalUnitsLost = useMemo(
    () => filteredRecords.reduce((sum, r) => sum + (r.quantity || 0), 0),
    [filteredRecords]
  );

  const topLossReason = useMemo(() => {
    if (filteredRecords.length === 0) return 'None';
    const counts: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      counts[r.reason] = (counts[r.reason] || 0) + r.lossAmount;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
  }, [filteredRecords]);

  // Handle submitting new shrinkage log
  const handleConfirmAdjustment = () => {
    if (!selectedItem) {
      toast({ title: 'Select an item', variant: 'destructive' });
      return;
    }
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Enter a valid quantity', variant: 'destructive' });
      return;
    }
    if (qty > selectedItem.stock) {
      toast({
        title: 'Quantity exceeds current stock',
        description: `Current stock on shelf is ${selectedItem.stock} ${selectedItem.unit}.`,
        variant: 'destructive',
      });
      return;
    }

    const unitPrice = selectedItem.costPrice || selectedItem.price || 0;
    onLogShrinkage({
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantity: qty,
      unit: selectedItem.unit,
      price: unitPrice,
      lossAmount: qty * unitPrice,
      reason: adjustReason,
      reportedBy: 'Store Admin',
    });

    toast({
      title: 'Stock Adjustment Logged',
      description: `Deducted ${qty} ${selectedItem.unit} of ${selectedItem.name} (${currency}${(qty * unitPrice).toFixed(2)} loss).`,
    });

    // Reset
    setIsNewEntryOpen(false);
    setSelectedItemId('');
    setAdjustQty('1');
    setAdjustNotes('');
  };

  // Print official audit sheet for chartered accountant / store audit
  const handlePrintAudit = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filteredRecords
      .map(
        (r, idx) => `
      <tr>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 11px;">${format(new Date(r.date), 'dd/MM/yyyy HH:mm')}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 11px; font-weight: bold;">${r.itemName}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 11px; text-align: center;">${r.quantity} ${r.unit}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 11px; text-align: right;">${currency}${r.price.toFixed(2)}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 11px; text-align: right; font-weight: bold; color: #b91c1c;">${currency}${r.lossAmount.toFixed(2)}</td>
        <td style="padding: 6px; border: 1px solid #ccc; font-size: 11px;">${r.reason}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Shrinkage & Loss Audit Sheet</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
          .header p { margin: 4px 0; font-size: 13px; color: #555; }
          .kpi-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .kpi { border: 1px solid #000; padding: 10px 16px; border-radius: 6px; flex: 1; margin: 0 6px; text-align: center; }
          .kpi span { font-size: 11px; text-transform: uppercase; display: block; color: #666; font-weight: bold; }
          .kpi strong { font-size: 20px; color: #000; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #f3f4f6; padding: 8px; border: 1px solid #ccc; text-align: left; font-size: 11px; text-transform: uppercase; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; padding-top: 20px; }
          .sign-box { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 6px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${venueName}</h1>
          <p>OFFICIAL STOCK SHRINKAGE, DAMAGE & WASTAGE AUDIT REPORT</p>
          <p>Generated: ${format(new Date(), 'PPpp')} | Filter: ${filterPeriod.toUpperCase()}</p>
        </div>

        <div class="kpi-row">
          <div class="kpi">
            <span>Total Value Lost</span>
            <strong style="color: #b91c1c;">${currency}${totalLossAmount.toFixed(2)}</strong>
          </div>
          <div class="kpi">
            <span>Total Units Lost</span>
            <strong>${totalUnitsLost} Units</strong>
          </div>
          <div class="kpi">
            <span>Primary Cause</span>
            <strong>${topLossReason}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Date & Time</th>
              <th>Product Name</th>
              <th style="text-align: center;">Qty Lost</th>
              <th style="text-align: right;">Unit Cost</th>
              <th style="text-align: right;">Total Loss</th>
              <th>Audit Reason</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px;">No shrinkage entries found.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div class="sign-box">Store Manager Signature</div>
          <div class="sign-box">Auditor / CA Signature</div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 rounded-3xl">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-red-500/10 text-red-600 rounded-2xl">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">
                  Stock Shrinkage & Loss Audit Log
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Track and audit merchandise losses due to damage, pest attacks, theft, or physical count mismatches.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintAudit}
                className="font-bold text-xs gap-1.5 rounded-xl border-border/60"
              >
                <Printer className="h-3.5 w-3.5" />
                {t('Print Audit Sheet')}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsNewEntryOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-black text-xs gap-1.5 rounded-xl shadow-md shadow-red-600/20"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                {t('Adjust Stock / Log Loss')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-3 my-3">
          <Card className="bg-red-500/5 border-red-500/20 shadow-none">
            <CardContent className="p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-700/70 block">
                Total Financial Loss
              </span>
              <div className="text-2xl font-black text-red-600 mt-0.5">
                {currency}{totalLossAmount.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-border/50 shadow-none">
            <CardContent className="p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                Total Units Discarded / Missing
              </span>
              <div className="text-2xl font-black text-foreground mt-0.5">
                {totalUnitsLost}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20 shadow-none">
            <CardContent className="p-3.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700/70 block">
                Leading Loss Factor
              </span>
              <div className="text-base font-black text-amber-700 mt-1 truncate">
                {topLossReason}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by item name or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl bg-muted/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterPeriod} onValueChange={(v: any) => setFilterPeriod(v)}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-32 bg-muted/20">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="today">Today Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterReason} onValueChange={setFilterReason}>
              <SelectTrigger className="h-9 text-xs rounded-xl w-44 bg-muted/20">
                <SelectValue placeholder="All Reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Audit Reasons</SelectItem>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto border rounded-2xl bg-background min-h-[260px]">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0">
              <TableRow>
                <TableHead className="text-xs font-black uppercase">{t('Date')}</TableHead>
                <TableHead className="text-xs font-black uppercase">{t('Item')}</TableHead>
                <TableHead className="text-xs font-black uppercase text-center">{t('Quantity')}</TableHead>
                <TableHead className="text-xs font-black uppercase text-right">{t('Unit Cost')}</TableHead>
                <TableHead className="text-xs font-black uppercase text-right text-red-600">{t('Loss Amount')}</TableHead>
                <TableHead className="text-xs font-black uppercase">{t('Audit Reason')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                    No shrinkage or stock adjustment records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((r) => {
                  const reasonMeta = REASONS.find((m) => m.value === r.reason);
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/10">
                      <TableCell className="text-xs font-mono py-2.5 text-muted-foreground">
                        {format(new Date(r.date), 'dd/MM/yy HH:mm')}
                      </TableCell>
                      <TableCell className="font-bold text-sm py-2.5">
                        {r.itemName}
                      </TableCell>
                      <TableCell className="text-center font-black py-2.5">
                        {r.quantity} {r.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs py-2.5">
                        {currency}{r.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-black text-sm text-red-600 py-2.5">
                        -{currency}{r.lossAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${reasonMeta?.color || 'bg-muted/50'}`}
                        >
                          {r.reason}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Modal for manual adjustment */}
        <Dialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Record Stock Loss / Adjustment</DialogTitle>
              <DialogDescription className="text-xs">
                Select an item and quantity to deduct from on-shelf inventory with an audit reason.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Select Item</Label>
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Choose inventory item..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {inventory.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} (Stock: {item.stock} {item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItem && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl text-xs">
                  <div>
                    <span className="text-muted-foreground block">Available Stock:</span>
                    <strong className="font-mono text-sm">{selectedItem.stock} {selectedItem.unit}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Unit Cost / Price:</span>
                    <strong className="font-mono text-sm">{currency}{(selectedItem.costPrice || selectedItem.price).toFixed(2)}</strong>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase">Deduction Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedItem?.stock || 9999}
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="h-10 font-black text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase">Calculated Loss</Label>
                  <div className="h-10 px-3 flex items-center bg-red-500/10 border border-red-500/20 text-red-600 font-black text-sm rounded-lg font-mono">
                    {currency}
                    {(
                      (parseFloat(adjustQty) || 0) *
                      (selectedItem?.costPrice || selectedItem?.price || 0)
                    ).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Audit Reason</Label>
                <Select value={adjustReason} onValueChange={setAdjustReason}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">Optional Notes</Label>
                <Input
                  placeholder="e.g. Found leaking pouch in Aisle 2"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsNewEntryOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAdjustment}
                disabled={!selectedItem}
                className="bg-red-600 hover:bg-red-700 text-white font-black"
              >
                Confirm Deduction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DialogFooter className="pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
