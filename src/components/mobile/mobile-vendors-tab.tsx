"use client";

import { useState, useMemo } from 'react';
import { 
    Truck, 
    Phone, 
    MessageCircle, 
    Plus, 
    FileText, 
    Search, 
    Building2, 
    CheckCircle2, 
    Clock, 
    ChevronRight,
    ArrowUpRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Vendor, InventoryItem, PurchaseOrder } from '@/lib/types';
import { sendWhatsAppPurchaseOrder } from '@/lib/whatsapp-service';
import { MobilePoDialog } from './mobile-po-dialog';
import { syncVendorsToCloud } from '@/lib/firestore-sync';

interface MobileVendorsTabProps {
    vendors: Vendor[];
    inventory: InventoryItem[];
    purchaseOrders: PurchaseOrder[];
    currency: string;
    venueName: string;
    venueId?: string;
    onUpdateVendors: (updated: Vendor[]) => void;
    onSavePO: (po: PurchaseOrder) => void;
}

export function MobileVendorsTab({
    vendors,
    inventory,
    purchaseOrders,
    currency,
    venueName,
    venueId,
    onUpdateVendors,
    onSavePO
}: MobileVendorsTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSubTab, setActiveSubTab] = useState<'directory' | 'orders'>('directory');
    const [selectedVendorForPO, setSelectedVendorForPO] = useState<string | null>(null);
    const [isPoDialogOpen, setIsPoDialogOpen] = useState(false);

    // Add Vendor Dialog
    const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
    const [newVendorName, setNewVendorName] = useState('');
    const [newVendorPhone, setNewVendorPhone] = useState('');
    const [newVendorCategory, setNewVendorCategory] = useState('');

    const filteredVendors = useMemo(() => {
        if (!searchTerm.trim()) return vendors;
        const q = searchTerm.toLowerCase();
        return vendors.filter(v => 
            v.name.toLowerCase().includes(q) || 
            v.category?.toLowerCase().includes(q) ||
            v.phone?.includes(q)
        );
    }, [vendors, searchTerm]);

    const handleCreatePO = (vendorId?: string) => {
        setSelectedVendorForPO(vendorId || null);
        setIsPoDialogOpen(true);
    };

    const handleAddVendor = () => {
        if (!newVendorName.trim()) {
            alert('Please enter supplier name.');
            return;
        }

        const newVnd: Vendor = {
            id: `VND-${Date.now().toString().slice(-4)}`,
            name: newVendorName.trim(),
            phone: newVendorPhone.trim(),
            category: newVendorCategory.trim() || 'General',
            balance: 0
        };

        const updated = [...vendors, newVnd];
        onUpdateVendors(updated);
        if (venueId) syncVendorsToCloud(venueId, updated);

        setIsAddVendorOpen(false);
        setNewVendorName('');
        setNewVendorPhone('');
        setNewVendorCategory('');
    };

    const handleCallVendor = (phone?: string) => {
        if (!phone) return;
        window.location.href = `tel:${phone}`;
    };

    const handleWhatsAppVendor = (phone?: string, name?: string) => {
        if (!phone) return;
        const clean = phone.replace(/\D/g, '');
        const target = clean.length === 10 ? `91${clean}` : clean;
        const msg = encodeURIComponent(`Hello ${name || 'Sir'}, this is regarding our store *${venueName || 'ChillBill Store'}*.`);
        window.open(`https://api.whatsapp.com/send?phone=${target}&text=${msg}`, '_blank');
    };

    return (
        <div className="space-y-4 pb-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-black tracking-tight text-foreground uppercase">
                        Suppliers & Stock Orders
                    </h2>
                    <p className="text-xs text-muted-foreground">Order inventory & manage supplier khata</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <Button 
                        size="sm" 
                        onClick={() => handleCreatePO()}
                        className="h-8 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                    >
                        <Plus size={14} /> New PO
                    </Button>
                </div>
            </div>

            {/* Sub Tabs: Directory vs Past POs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-muted/60 border border-border/70">
                <button
                    onClick={() => setActiveSubTab('directory')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'directory' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                    Suppliers ({vendors.length})
                </button>
                <button
                    onClick={() => setActiveSubTab('orders')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${activeSubTab === 'orders' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                    Purchase Orders ({purchaseOrders.length})
                </button>
            </div>

            {/* ════════ SUBTAB: DIRECTORY ════════ */}
            {activeSubTab === 'directory' && (
                <div className="space-y-3">
                    {/* Search & Add */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                                placeholder="Search supplier or category..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-9 pl-9 text-xs rounded-xl"
                            />
                        </div>
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setIsAddVendorOpen(true)}
                            className="h-9 px-3 rounded-xl text-xs font-bold shrink-0"
                        >
                            + Add Supplier
                        </Button>
                    </div>

                    {/* Vendors List */}
                    <div className="space-y-3">
                        {filteredVendors.length === 0 ? (
                            <div className="p-8 text-center rounded-2xl border border-dashed text-xs text-muted-foreground">
                                No suppliers found. Click "+ Add Supplier" to create one.
                            </div>
                        ) : (
                            filteredVendors.map(vendor => (
                                <div key={vendor.id} className="p-4 rounded-2xl border bg-card/70 shadow-sm space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="font-extrabold text-sm text-foreground">{vendor.name}</h4>
                                            <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                                {vendor.category || 'General'}
                                            </span>
                                            {vendor.phone && (
                                                <p className="text-xs text-muted-foreground mt-1 font-mono">
                                                    📞 {vendor.phone}
                                                </p>
                                            )}
                                        </div>

                                        {/* Outstanding Balance */}
                                        <div className="text-right">
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase block">Outstanding</span>
                                            <span className={`text-sm font-black ${Number(vendor.balance || 0) > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                {currency}{Number(vendor.balance || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-2 border-t flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            {vendor.phone && (
                                                <>
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        onClick={() => handleCallVendor(vendor.phone)}
                                                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                                        title="Call Supplier"
                                                    >
                                                        <Phone size={14} />
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        onClick={() => handleWhatsAppVendor(vendor.phone, vendor.name)}
                                                        className="h-8 w-8 p-0 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                                        title="WhatsApp Chat"
                                                    >
                                                        <MessageCircle size={15} />
                                                    </Button>
                                                </>
                                            )}
                                        </div>

                                        <Button 
                                            size="sm" 
                                            onClick={() => handleCreatePO(vendor.id)}
                                            className="h-8 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1"
                                        >
                                            Order Stock <ArrowUpRight size={13} />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ════════ SUBTAB: PAST PURCHASE ORDERS ════════ */}
            {activeSubTab === 'orders' && (
                <div className="space-y-3">
                    {purchaseOrders.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl border border-dashed text-xs text-muted-foreground">
                            No purchase orders created yet. Tap "+ New PO" to draft your first supplier order!
                        </div>
                    ) : (
                        purchaseOrders.slice().reverse().map(po => {
                            const dateStr = po.date instanceof Date 
                                ? po.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                : 'Recent';

                            return (
                                <div key={po.id} className="p-3.5 rounded-2xl border bg-card/70 shadow-sm flex items-center justify-between gap-3 text-xs">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-extrabold text-foreground">{po.referenceNo || po.id}</span>
                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${po.status === 'Received' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                {po.status || 'Ordered'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                            To: {po.vendorName} · {dateStr}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {po.items?.length || 0} items ordered
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <div className="text-right">
                                            <p className="font-black text-sm text-foreground">
                                                {currency}{Number(po.totalAmount || 0).toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const vendor = vendors.find(v => v.id === po.vendorId) || { id: po.vendorId, name: po.vendorName, category: 'General' } as Vendor;
                                                sendWhatsAppPurchaseOrder(po, vendor, null, currency);
                                            }}
                                            className="w-8 h-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
                                            title="Send PO to Vendor via WhatsApp"
                                        >
                                            <MessageCircle size={15} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ════════ MODAL: ADD SUPPLIER ════════ */}
            <Dialog open={isAddVendorOpen} onOpenChange={setIsAddVendorOpen}>
                <DialogContent className="max-w-xs w-[90vw] p-5 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black flex items-center gap-2">
                            <Building2 size={16} className="text-orange-500" />
                            Add Supplier
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Add a vendor to quickly order stock & track ledger.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-muted-foreground">Supplier / Firm Name *</Label>
                            <Input placeholder="e.g. Amul Dairy Depot" value={newVendorName} onChange={e => setNewVendorName(e.target.value)} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-muted-foreground">WhatsApp / Mobile Number</Label>
                            <Input placeholder="e.g. 9876543210" value={newVendorPhone} onChange={e => setNewVendorPhone(e.target.value)} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-muted-foreground">Category</Label>
                            <Input placeholder="e.g. Dairy / FMCG / Grains" value={newVendorCategory} onChange={e => setNewVendorCategory(e.target.value)} className="h-9 text-xs" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setIsAddVendorOpen(false)} className="h-10 text-xs font-bold rounded-xl">
                                Cancel
                            </Button>
                            <Button onClick={handleAddVendor} className="h-10 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                                Save Supplier
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* PO Dialog */}
            <MobilePoDialog
                open={isPoDialogOpen}
                onOpenChange={setIsPoDialogOpen}
                vendors={vendors}
                inventory={inventory}
                currency={currency}
                venueName={venueName}
                venueId={venueId}
                preselectedVendorId={selectedVendorForPO || undefined}
                onSavePO={onSavePO}
            />
        </div>
    );
}
