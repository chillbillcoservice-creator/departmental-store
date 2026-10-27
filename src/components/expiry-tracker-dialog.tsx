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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle2,
  Trash2,
  Percent,
  Search,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { InventoryItem } from '@/lib/types';
import { format, differenceInDays } from 'date-fns';

interface ExpiryTrackerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
  setInventory: (items: InventoryItem[]) => void;
  currency?: string;
  venueDetails?: any;
}

export function ExpiryTrackerDialog({
  isOpen,
  onOpenChange,
  inventory,
  setInventory,
  currency = 'Rs.',
  venueDetails,
}: ExpiryTrackerDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [filterTab, setFilterTab] = useState<'all' | 'expired' | 'critical' | 'upcoming'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Analyze expiry items
  const analyzedItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return inventory
      .filter((item) => item.expiryDate)
      .map((item) => {
        const expDate = new Date(item.expiryDate!);
        expDate.setHours(0, 0, 0, 0);
        const daysLeft = differenceInDays(expDate, today);

        let status: 'expired' | 'critical' | 'upcoming' | 'healthy' = 'healthy';
        if (daysLeft < 0) status = 'expired';
        else if (daysLeft <= 7) status = 'critical';
        else if (daysLeft <= 30) status = 'upcoming';

        const itemValue = (item.price || 0) * (item.stock || 0);

        return {
          ...item,
          daysLeft,
          status,
          itemValue,
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [inventory]);

  // Totals
  const expiredCount = analyzedItems.filter((i) => i.status === 'expired').length;
  const expiredValue = analyzedItems
    .filter((i) => i.status === 'expired')
    .reduce((sum, i) => sum + i.itemValue, 0);

  const criticalCount = analyzedItems.filter((i) => i.status === 'critical').length;
  const criticalValue = analyzedItems
    .filter((i) => i.status === 'critical')
    .reduce((sum, i) => sum + i.itemValue, 0);

  const upcomingCount = analyzedItems.filter((i) => i.status === 'upcoming').length;
  const upcomingValue = analyzedItems
    .filter((i) => i.status === 'upcoming')
    .reduce((sum, i) => sum + i.itemValue, 0);

  // Filtered view
  const displayedItems = useMemo(() => {
    return analyzedItems.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterTab === 'expired') return matchesSearch && item.status === 'expired';
      if (filterTab === 'critical') return matchesSearch && item.status === 'critical';
      if (filterTab === 'upcoming') return matchesSearch && item.status === 'upcoming';
      return matchesSearch && item.status !== 'healthy';
    });
  }, [analyzedItems, filterTab, searchTerm]);

  // 1-Click Clearance Markdown Discount
  const handleApplyMarkdown = (itemId: string, discountPct: number) => {
    const updated = inventory.map((i) =>
      i.id === itemId ? { ...i, discount: discountPct } : i
    );
    setInventory(updated);
    toast({
      title: t("Clearance Markdown Applied"),
      description: `${discountPct}% ${t("discount applied. It will now reflect immediately at POS.")}`,
    });
  };

  // 1-Click Batch Markdown (Apply to all critical items)
  const handleBatchMarkdown = (discountPct: number) => {
    const criticalIds = new Set(
      analyzedItems.filter((i) => i.status === 'critical').map((i) => i.id)
    );
    const updated = inventory.map((i) =>
      criticalIds.has(i.id) ? { ...i, discount: discountPct } : i
    );
    setInventory(updated);
    toast({
      title: t("Batch Markdown Applied"),
      description: `${discountPct}% ${t("discount applied to all items expiring within 7 days.")}`,
    });
  };

  // 1-Click Write Off / Dispose
  const handleWriteOff = (item: InventoryItem) => {
    const updated = inventory.map((i) =>
      i.id === item.id ? { ...i, stock: 0 } : i
    );
    setInventory(updated);

    // Save to damage/shrinkage log
    try {
      const logs = JSON.parse(localStorage.getItem('pos_damage_logs') || '[]');
      const newLog = {
        id: Date.now().toString(),
        itemId: item.id,
        itemName: item.name,
        quantity: item.stock,
        unit: item.unit,
        price: item.price,
        lossAmount: (item.price || 0) * (item.stock || 0),
        reason: 'Expired Product (Written Off)',
        date: new Date(),
      };
      localStorage.setItem('pos_damage_logs', JSON.stringify([newLog, ...logs]));
    } catch (e) {
      console.error(e);
    }

    toast({
      title: t("Item Written Off"),
      description: `${item.name} (${item.stock} ${item.unit}) ${t("disposed and removed from sellable stock.")}`,
    });
  };

  const handlePrintExpiryReport = () => {
    const printWindow = window.open('', '_blank', 'width=700,height=800');
    if (!printWindow) return;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Expiry & At-Risk Stock Report</title>
        <style>
          body { font-family: sans-serif; font-size: 12px; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .title { font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f4f4f4; }
          .expired { color: red; font-weight: bold; }
          .critical { color: orange; font-weight: bold; }
          .summary { display: flex; justify-content: space-between; margin-top: 15px; padding: 10px; background: #fafafa; border: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${venueDetails?.name || 'SUPERMARKET'}</div>
          <div>NEAR-EXPIRY & AT-RISK STOCK AUDIT</div>
          <div>Date: ${format(new Date(), 'PPpp')}</div>
        </div>
        <div class="summary">
          <div>Expired: <strong>${expiredCount} items (${currency}${expiredValue.toFixed(2)})</strong></div>
          <div>Critical (&le;7d): <strong>${criticalCount} items (${currency}${criticalValue.toFixed(2)})</strong></div>
          <div>Upcoming (&le;30d): <strong>${upcomingCount} items (${currency}${upcomingValue.toFixed(2)})</strong></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>At-Risk Value</th>
            </tr>
          </thead>
          <tbody>
            ${displayedItems
              .map(
                (item) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.stock} ${item.unit}</td>
                <td>${format(new Date(item.expiryDate!), 'dd/MM/yyyy')}</td>
                <td class="${item.status}">${item.daysLeft < 0 ? `EXPIRED (${Math.abs(item.daysLeft)}d ago)` : `Expires in ${item.daysLeft}d`}</td>
                <td>${currency}${item.itemValue.toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Flame className="h-5 w-5 text-orange-500" />
            {t("Near-Expiry & Clearance Markdown Center")}
          </DialogTitle>
          <DialogDescription>
            {t("Monitor perishables, apply clearance discounts before goods expire, and write off spoiled stock to avoid revenue leakage.")}
          </DialogDescription>
        </DialogHeader>

        {/* KPI Alert Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Expired */}
          <Card
            onClick={() => setFilterTab('expired')}
            className={`cursor-pointer transition-all border-2 ${
              filterTab === 'expired' ? 'border-destructive bg-destructive/10' : 'border-destructive/20 bg-destructive/5 hover:border-destructive/40'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-black tracking-wider text-destructive">
                  {t("Expired Stock")}
                </span>
                <Badge variant="destructive" className="font-bold">{expiredCount}</Badge>
              </div>
              <div className="text-2xl font-black text-destructive mt-1">
                {currency}{expiredValue.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t("Immediate disposal required")}
              </div>
            </CardContent>
          </Card>

          {/* Critical (<= 7 days) */}
          <Card
            onClick={() => setFilterTab('critical')}
            className={`cursor-pointer transition-all border-2 ${
              filterTab === 'critical' ? 'border-orange-500 bg-orange-500/10' : 'border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-black tracking-wider text-orange-600">
                  {t("Expiring in 7 Days")}
                </span>
                <Badge className="bg-orange-500 text-white font-bold">{criticalCount}</Badge>
              </div>
              <div className="text-2xl font-black text-orange-600 mt-1">
                {currency}{criticalValue.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t("Apply markdown discounts")}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming (<= 30 days) */}
          <Card
            onClick={() => setFilterTab('upcoming')}
            className={`cursor-pointer transition-all border-2 ${
              filterTab === 'upcoming' ? 'border-amber-500 bg-amber-500/10' : 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-black tracking-wider text-amber-600">
                  {t("Expiring in 30 Days")}
                </span>
                <Badge className="bg-amber-500 text-white font-bold">{upcomingCount}</Badge>
              </div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {currency}{upcomingValue.toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {t("Upcoming inventory risk")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batch Action Toolbar */}
        {criticalCount > 0 && (
          <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/30 flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-bold text-orange-700">
                {t("Quick Markdown:")} {criticalCount} {t("items expiring soon can be discounted in 1 click")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchMarkdown(20)}
                className="h-8 text-xs font-bold rounded-lg border-orange-500/40 hover:bg-orange-500/20 text-orange-700"
              >
                {t("Apply 20% Off")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchMarkdown(35)}
                className="h-8 text-xs font-bold rounded-lg border-orange-500/40 hover:bg-orange-500/20 text-orange-700"
              >
                {t("Apply 35% Off")}
              </Button>
              <Button
                size="sm"
                onClick={() => handleBatchMarkdown(50)}
                className="h-8 text-xs font-black rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
              >
                {t("Apply 50% Off")}
              </Button>
            </div>
          </div>
        )}

        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          <div className="flex gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/50">
            <Button
              size="sm"
              variant={filterTab === 'all' ? 'default' : 'ghost'}
              onClick={() => setFilterTab('all')}
              className="h-8 text-xs font-bold rounded-lg"
            >
              {t("All At-Risk")} ({analyzedItems.filter(i => i.status !== 'healthy').length})
            </Button>
            <Button
              size="sm"
              variant={filterTab === 'expired' ? 'default' : 'ghost'}
              onClick={() => setFilterTab('expired')}
              className="h-8 text-xs font-bold rounded-lg"
            >
              {t("Expired")} ({expiredCount})
            </Button>
            <Button
              size="sm"
              variant={filterTab === 'critical' ? 'default' : 'ghost'}
              onClick={() => setFilterTab('critical')}
              className="h-8 text-xs font-bold rounded-lg"
            >
              &le; 7 {t("Days")} ({criticalCount})
            </Button>
            <Button
              size="sm"
              variant={filterTab === 'upcoming' ? 'default' : 'ghost'}
              onClick={() => setFilterTab('upcoming')}
              className="h-8 text-xs font-bold rounded-lg"
            >
              &le; 30 {t("Days")} ({upcomingCount})
            </Button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("Filter by name or category...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Item List Table */}
        <div className="border border-border/60 rounded-2xl overflow-hidden shadow-xs">
          <div className="bg-muted/60 p-2.5 font-bold text-xs uppercase tracking-wider text-muted-foreground grid grid-cols-12 gap-2">
            <span className="col-span-4">{t("Item / Category")}</span>
            <span className="col-span-2 text-center">{t("Stock")}</span>
            <span className="col-span-2 text-center">{t("Expiry Status")}</span>
            <span className="col-span-2 text-right">{t("At-Risk Value")}</span>
            <span className="col-span-2 text-center">{t("Action")}</span>
          </div>

          <div className="divide-y divide-border/40 max-h-[360px] overflow-y-auto">
            {displayedItems.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                <p className="font-bold text-sm">{t("No items found matching this expiry criteria.")}</p>
                <p className="text-xs opacity-70 mt-1">{t("Inventory is fresh and within safe shelf life.")}</p>
              </div>
            ) : (
              displayedItems.map((item) => {
                const isExpired = item.status === 'expired';
                const isCritical = item.status === 'critical';

                return (
                  <div key={item.id} className="p-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/20 text-sm">
                    {/* Item */}
                    <div className="col-span-4">
                      <div className="font-bold text-foreground line-clamp-1">{item.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">{item.category}</span>
                        {item.id && <span className="text-[10px] font-mono text-muted-foreground">&bull; {item.id}</span>}
                        {(item.discount || 0) > 0 && (
                          <span className="text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded">
                            -{item.discount}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="col-span-2 text-center font-bold">
                      {item.stock} <span className="text-xs text-muted-foreground">{item.unit}</span>
                    </div>

                    {/* Expiry Status */}
                    <div className="col-span-2 text-center">
                      {isExpired ? (
                        <Badge variant="destructive" className="font-black text-[10px]">
                          {t("EXPIRED")} ({Math.abs(item.daysLeft)}d)
                        </Badge>
                      ) : isCritical ? (
                        <Badge className="bg-orange-500 text-white font-bold text-[10px]">
                          {item.daysLeft} {t("Days Left")}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                          {item.daysLeft} {t("Days Left")}
                        </Badge>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(item.expiryDate!), 'dd/MM/yyyy')}
                      </div>
                    </div>

                    {/* Value */}
                    <div className="col-span-2 text-right font-black text-foreground">
                      {currency}{item.itemValue.toFixed(2)}
                    </div>

                    {/* Action */}
                    <div className="col-span-2 flex items-center justify-center gap-1.5">
                      {isExpired ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleWriteOff(item)}
                          className="h-8 text-xs font-bold rounded-lg gap-1"
                          title={t("Dispose & Write Off")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("Write Off")}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplyMarkdown(item.id, 25)}
                            className="h-7 px-2 text-[10px] font-bold rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                            title={t("Apply 25% Clearance Discount")}
                          >
                            -25%
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApplyMarkdown(item.id, 40)}
                            className="h-7 px-2 text-[10px] font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white"
                            title={t("Apply 40% Clearance Discount")}
                          >
                            -40%
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            {t("Close")}
          </Button>
          <Button onClick={handlePrintExpiryReport} className="rounded-xl font-bold gap-2">
            <Printer className="h-4 w-4" />
            {t("Print Expiry Audit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
