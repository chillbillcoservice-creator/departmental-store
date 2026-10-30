"use client";

import { useState, useMemo } from 'react';
import { 
    TrendingUp, 
    Receipt, 
    CreditCard, 
    Banknote, 
    AlertTriangle, 
    Package, 
    ArrowRight, 
    RefreshCw, 
    Clock, 
    Search,
    PlusCircle,
    CheckCircle2,
    Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bill, InventoryItem, Vendor, PurchaseOrder } from '@/lib/types';
import { sendWhatsAppBill } from '@/lib/whatsapp-service';
import { LiveDailySales } from '@/lib/firestore-sync';
import { MobilePoDialog } from './mobile-po-dialog';

interface MobileDashboardTabProps {
    bills: Bill[];
    inventory: InventoryItem[];
    vendors: Vendor[];
    currency: string;
    venueName: string;
    venueId?: string;
    liveSalesSummary: LiveDailySales | null;
    recentCloudBills: any[];
    onSavePO: (po: PurchaseOrder) => void;
    onRefresh: () => void;
}

export function MobileDashboardTab({
    bills,
    inventory,
    vendors,
    currency,
    venueName,
    venueId,
    liveSalesSummary,
    recentCloudBills,
    onSavePO,
    onRefresh
}: MobileDashboardTabProps) {
    const [invFilter, setInvFilter] = useState<'all' | 'low' | 'out'>('low');
    const [invSearch, setInvSearch] = useState('');
    const [selectedReorderItem, setSelectedReorderItem] = useState<string | null>(null);
    const [isPoDialogOpen, setIsPoDialogOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filter today's local bills as fallback if cloud summary isn't active
    const todayBills = useMemo(() => {
        const todayStr = new Date().toDateString();
        return bills.filter(b => {
            const bDate = b.completedAt ? new Date(b.completedAt) : (b.timestamp ? new Date(b.timestamp) : null);
            return bDate && bDate.toDateString() === todayStr;
        });
    }, [bills]);

    // Compute live metrics (prefer live cloud summary if available, fallback to today's bills)
    const metrics = useMemo(() => {
        if (liveSalesSummary && liveSalesSummary.billCount > 0) {
            const total = liveSalesSummary.totalSales || 0;
            const count = liveSalesSummary.billCount || 0;
            const aov = count > 0 ? Math.round(total / count) : 0;
            return {
                total,
                count,
                aov,
                cash: liveSalesSummary.cashSales || 0,
                online: liveSalesSummary.onlineSales || 0,
            };
        }

        const total = todayBills.reduce((s, b) => s + (b.total || 0), 0);
        const count = todayBills.length;
        const aov = count > 0 ? Math.round(total / count) : 0;
        let cash = 0;
        let online = 0;

        todayBills.forEach(b => {
            if (b.paymentMethod === 'Cash') cash += b.total;
            else if (b.paymentMethod === 'Online') online += b.total;
            else if (b.paymentMethod === 'Split' && b.splitPayments) {
                b.splitPayments.forEach(sp => {
                    if (sp.method === 'Cash') cash += sp.amount;
                    if (sp.method === 'Online') online += sp.amount;
                });
            }
        });

        return { total, count, aov, cash, online };
    }, [liveSalesSummary, todayBills]);

    // Inventory Health
    const lowStockItems = useMemo(() => {
        return inventory.filter(i => {
            const stock = i.stock || 0;
            const cap = i.capacity || 20;
            return stock > 0 && stock <= Math.max(5, cap * 0.25);
        });
    }, [inventory]);

    const outOfStockItems = useMemo(() => {
        return inventory.filter(i => (i.stock || 0) <= 0);
    }, [inventory]);

    const filteredInventory = useMemo(() => {
        let list = inventory;
        if (invFilter === 'low') {
            list = [...outOfStockItems, ...lowStockItems];
        } else if (invFilter === 'out') {
            list = outOfStockItems;
        }

        if (invSearch.trim()) {
            const q = invSearch.toLowerCase();
            list = list.filter(i => i.name.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q));
        }

        return list.slice(0, 30); // smooth mobile scroll limit
    }, [inventory, invFilter, invSearch, lowStockItems, outOfStockItems]);

    // Recent Counter Bills list
    const displayBills = useMemo(() => {
        if (recentCloudBills && recentCloudBills.length > 0) {
            return recentCloudBills.slice(0, 6);
        }
        return todayBills.slice(-6).reverse();
    }, [recentCloudBills, todayBills]);

    const handleTriggerRefresh = () => {
        setIsRefreshing(true);
        onRefresh();
        setTimeout(() => setIsRefreshing(false), 700);
    };

    const handleReorderClick = (itemId: string) => {
        setSelectedReorderItem(itemId);
        setIsPoDialogOpen(true);
    };

    const cashPercentage = metrics.total > 0 ? Math.round((metrics.cash / metrics.total) * 100) : 0;
    const onlinePercentage = metrics.total > 0 ? Math.round((metrics.online / metrics.total) * 100) : 0;

    return (
        <div className="space-y-5 pb-6">
            {/* Header Sales Card */}
            <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white shadow-xl shadow-orange-500/20">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between relative z-10">
                    <span className="text-[11px] font-bold uppercase tracking-widest bg-black/20 px-2.5 py-1 rounded-full backdrop-blur-md">
                        Today's Live Revenue
                    </span>
                    <button 
                        onClick={handleTriggerRefresh}
                        className={`p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                        title="Refresh numbers"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>

                <div className="mt-3 relative z-10">
                    <div className="text-3xl sm:text-4xl font-black tracking-tight flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-bold opacity-80">{currency}</span>
                        <span>{metrics.total.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                {/* Sub metrics: Bill count & AOV */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/15 relative z-10 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <Receipt size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/70 uppercase font-bold">Total Bills</p>
                            <p className="font-extrabold text-sm">{metrics.count}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <TrendingUp size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] text-white/70 uppercase font-bold">Avg. Bill (AOV)</p>
                            <p className="font-extrabold text-sm">{currency}{metrics.aov}</p>
                        </div>
                    </div>
                </div>

                {/* Payment split bar */}
                <div className="mt-4 pt-3 border-t border-white/10 relative z-10 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold text-white/80">
                        <span className="flex items-center gap-1"><CreditCard size={11} /> UPI {onlinePercentage}%</span>
                        <span className="flex items-center gap-1"><Banknote size={11} /> Cash {cashPercentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/25 overflow-hidden flex">
                        <div style={{ width: `${onlinePercentage}%` }} className="bg-emerald-300 transition-all" />
                        <div style={{ width: `${cashPercentage}%` }} className="bg-amber-200 transition-all" />
                    </div>
                </div>
            </div>

            {/* Quick Action: New PO Shortcut */}
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border/70 shadow-sm">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-foreground">Need to reorder stock?</h4>
                        <p className="text-[10px] text-muted-foreground">Draft PO & send via WhatsApp</p>
                    </div>
                </div>
                <Button 
                    size="sm" 
                    onClick={() => { setSelectedReorderItem(null); setIsPoDialogOpen(true); }}
                    className="h-8 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                >
                    + Order PO
                </Button>
            </div>

            {/* ════════ SECTION: INVENTORY HEALTH & ALERTS ════════ */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <h3 className="font-black text-sm tracking-tight text-foreground uppercase">
                            Stock Health & Depletion
                        </h3>
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground">
                        {outOfStockItems.length + lowStockItems.length} alerts
                    </span>
                </div>

                {/* Responsive 3-Column Filter Pills (Zero Horizontal Scrollbar) */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border/60">
                    <button 
                        onClick={() => setInvFilter('low')}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            invFilter === 'low' 
                                ? 'bg-orange-500 text-white shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                        }`}
                    >
                        <span>⚠️ Low</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                            invFilter === 'low' ? 'bg-white/25 text-white' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                        }`}>
                            {outOfStockItems.length + lowStockItems.length}
                        </span>
                    </button>
                    <button 
                        onClick={() => setInvFilter('out')}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            invFilter === 'out' 
                                ? 'bg-red-500 text-white shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                        }`}
                    >
                        <span>🚨 Out</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                            invFilter === 'out' ? 'bg-white/25 text-white' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}>
                            {outOfStockItems.length}
                        </span>
                    </button>
                    <button 
                        onClick={() => setInvFilter('all')}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            invFilter === 'all' 
                                ? 'bg-foreground text-background shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                        }`}
                    >
                        <span>📦 All</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                            invFilter === 'all' ? 'bg-background/25 text-background' : 'bg-muted-foreground/15 text-muted-foreground'
                        }`}>
                            {inventory.length}
                        </span>
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                        placeholder="Search product..." 
                        value={invSearch}
                        onChange={e => setInvSearch(e.target.value)}
                        className="h-9 pl-9 text-xs rounded-xl"
                    />
                </div>

                {/* Items List */}
                <div className="space-y-2">
                    {filteredInventory.length === 0 ? (
                        <div className="p-6 text-center rounded-2xl border border-dashed text-xs text-muted-foreground">
                            {invFilter === 'low' ? '🎉 All products have healthy stock levels!' : 'No items found matching your search.'}
                        </div>
                    ) : (
                        filteredInventory.map(item => {
                            const stock = item.stock || 0;
                            const capacity = item.capacity || 20;
                            const isOut = stock <= 0;
                            const isLow = !isOut && stock <= Math.max(5, capacity * 0.25);
                            const percent = Math.min(100, Math.round((stock / capacity) * 100));

                            return (
                                <div key={item.id} className="p-3 rounded-2xl border bg-card/70 shadow-sm flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-xs truncate text-foreground">{item.name}</span>
                                            {isOut && <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-red-500/10 text-red-500 shrink-0">OUT</span>}
                                            {isLow && <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-orange-500/10 text-orange-500 shrink-0">LOW</span>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div 
                                                    style={{ width: `${percent}%` }}
                                                    className={`h-full rounded-full ${isOut ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                                                />
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-semibold">
                                                {stock} / {capacity} {item.unit || 'units'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <Button
                                        size="sm"
                                        variant={(isOut || isLow) ? "default" : "outline"}
                                        onClick={() => handleReorderClick(item.id)}
                                        className={`h-7 px-2.5 rounded-lg text-[10px] font-bold shrink-0 ${(isOut || isLow) ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
                                    >
                                        Order
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ════════ SECTION: LIVE RECENT COUNTER BILLS ════════ */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm tracking-tight text-foreground uppercase flex items-center gap-2">
                        <Clock size={15} className="text-orange-500" /> Recent In-Store Bills
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Live Feed
                    </span>
                </div>

                <div className="space-y-2">
                    {displayBills.length === 0 ? (
                        <div className="p-6 text-center rounded-2xl border border-dashed text-xs text-muted-foreground">
                            No bills completed yet today.
                        </div>
                    ) : (
                        displayBills.map((bill: any, idx: number) => {
                            const timeStr = bill.completedAt 
                                ? new Date(bill.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                : 'Just now';

                            return (
                                <div key={bill.id || idx} className="p-3 rounded-2xl border bg-card/60 flex items-center justify-between text-xs gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-foreground truncate">
                                            Bill #{bill.id?.slice(-5) || idx + 1} · {timeStr}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            By {bill.cashierName || 'Staff'} · {bill.itemCount || bill.orderItems?.length || 1} items
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <div className="text-right">
                                            <p className="font-black text-sm text-foreground">
                                                {currency}{Number(bill.total || 0).toLocaleString('en-IN')}
                                            </p>
                                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${bill.paymentMethod === 'Cash' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                {bill.paymentMethod || 'Online'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const phone = bill.customerDetails?.phone || prompt('Enter Customer WhatsApp Number:');
                                                if (phone) {
                                                    sendWhatsAppBill(bill, null, phone, currency);
                                                }
                                            }}
                                            className="w-8 h-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                                            title="Send Bill to Customer via WhatsApp"
                                        >
                                            <MessageCircle size={15} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Quick Reorder Modal */}
            <MobilePoDialog
                open={isPoDialogOpen}
                onOpenChange={setIsPoDialogOpen}
                vendors={vendors}
                inventory={inventory}
                currency={currency}
                venueName={venueName}
                venueId={venueId}
                preselectedItemId={selectedReorderItem || undefined}
                onSavePO={onSavePO}
            />
        </div>
    );
}
