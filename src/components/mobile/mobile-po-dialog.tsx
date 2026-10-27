"use client";

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, FileText, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Vendor, InventoryItem, PurchaseOrder, PurchaseOrderItem } from '@/lib/types';
import { syncPurchaseOrderToCloud } from '@/lib/firestore-sync';

interface MobilePoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendors: Vendor[];
    inventory: InventoryItem[];
    currency: string;
    venueName: string;
    venueId?: string;
    preselectedVendorId?: string;
    preselectedItemId?: string;
    onSavePO: (po: PurchaseOrder) => void;
}

export function MobilePoDialog({
    open,
    onOpenChange,
    vendors,
    inventory,
    currency,
    venueName,
    venueId,
    preselectedVendorId,
    preselectedItemId,
    onSavePO
}: MobilePoDialogProps) {
    const [selectedVendorId, setSelectedVendorId] = useState<string>(preselectedVendorId || (vendors[0]?.id || ''));
    const [items, setItems] = useState<{ itemId: string; name: string; quantity: number; unitCost: number }[]>(() => {
        if (preselectedItemId) {
            const found = inventory.find(i => i.id === preselectedItemId);
            if (found) {
                return [{
                    itemId: found.id,
                    name: found.name,
                    quantity: Math.max(1, (found.capacity || 20) - (found.stock || 0)),
                    unitCost: found.costPrice || found.price || 0
                }];
            }
        }
        return [];
    });

    const [notes, setNotes] = useState('');
    const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

    const selectedVendor = useMemo(() => {
        return vendors.find(v => v.id === selectedVendorId) || vendors[0];
    }, [vendors, selectedVendorId]);

    // Items related to this vendor (or all inventory if none specific)
    const vendorInventory = useMemo(() => {
        if (!selectedVendorId) return inventory;
        const filtered = inventory.filter(i => i.vendorId === selectedVendorId);
        return filtered.length > 0 ? filtered : inventory;
    }, [inventory, selectedVendorId]);

    // Low stock items from this vendor
    const lowStockFromVendor = useMemo(() => {
        return vendorInventory.filter(i => (i.stock || 0) <= Math.max(5, (i.capacity || 20) * 0.25));
    }, [vendorInventory]);

    const handleAddAllLowStock = () => {
        const newItems = lowStockFromVendor.map(i => ({
            itemId: i.id,
            name: i.name,
            quantity: Math.max(5, (i.capacity || 20) - (i.stock || 0)),
            unitCost: i.costPrice || i.price || 0
        }));
        setItems(newItems);
    };

    const handleAddItem = (itemId: string) => {
        const found = inventory.find(i => i.id === itemId);
        if (!found) return;
        if (items.some(i => i.itemId === itemId)) return;

        setItems(prev => [
            ...prev,
            {
                itemId: found.id,
                name: found.name,
                quantity: 10,
                unitCost: found.costPrice || found.price || 0
            }
        ]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleUpdateItem = (index: number, field: 'quantity' | 'unitCost', value: number) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx === index) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    }, [items]);

    const buildPurchaseOrderObj = (): PurchaseOrder => {
        const poId = `PO-${Date.now().toString().slice(-6)}`;
        const poItems: PurchaseOrderItem[] = items.map(i => ({
            inventoryItemId: i.itemId,
            name: i.name,
            quantity: Number(i.quantity) || 1,
            unitCost: Number(i.unitCost) || 0,
            totalCost: (Number(i.quantity) || 1) * (Number(i.unitCost) || 0)
        }));

        return {
            id: poId,
            vendorId: selectedVendor?.id || 'VND-GEN',
            vendorName: selectedVendor?.name || 'General Supplier',
            date: new Date(),
            referenceNo: poId,
            items: poItems,
            totalAmount,
            status: 'Ordered',
            createdByEmployeeName: 'Store Owner'
        };
    };

    const handleSendWhatsApp = () => {
        if (!items.length) {
            alert('Please add at least one item to order.');
            return;
        }

        const po = buildPurchaseOrderObj();
        onSavePO(po);
        if (venueId) syncPurchaseOrderToCloud(venueId, po);

        // Build clean WhatsApp message
        const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const itemsList = items.map((item, idx) => 
            `${idx + 1}. *${item.name}* — ${item.quantity} units (@ ${currency}${item.unitCost})`
        ).join('\n');

        const messageText = 
`📦 *PURCHASE ORDER — ${venueName || 'ChillBill Store'}*
Ref: ${po.referenceNo}
Date: ${dateStr}
Supplier: *${selectedVendor?.name || 'Vendor'}*

*Items Required:*
${itemsList}

💰 *Total Est. Order Value:* ${currency} ${totalAmount.toLocaleString('en-IN')}
${notes ? `\n📝 Note: ${notes}` : ''}

Please confirm dispatch & expected delivery date.
Thank you!`;

        const cleanPhone = (selectedVendor?.phone || '').replace(/\D/g, '');
        const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const encodedText = encodeURIComponent(messageText);

        const waUrl = targetPhone 
            ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`
            : `https://api.whatsapp.com/send?text=${encodedText}`;

        window.open(waUrl, '_blank');
        setStatusSuccess(`Purchase Order #${po.referenceNo} saved and opened in WhatsApp!`);
        setTimeout(() => {
            setStatusSuccess(null);
            onOpenChange(false);
        }, 1200);
    };

    const handleGeneratePDF = () => {
        if (!items.length) {
            alert('Please add at least one item to order.');
            return;
        }

        const po = buildPurchaseOrderObj();
        onSavePO(po);
        if (venueId) syncPurchaseOrderToCloud(venueId, po);

        // Generate printable receipt window
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const rows = items.map((it, idx) => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${it.name}</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${it.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${currency} ${it.unitCost}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${currency} ${(it.quantity * it.unitCost).toLocaleString('en-IN')}</td>
            </tr>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Purchase Order — ${po.referenceNo}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
                    .header { text-align: center; border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 20px; }
                    .header h1 { margin: 0; font-size: 22px; color: #ea580c; text-transform: uppercase; }
                    .header p { margin: 4px 0; font-size: 13px; color: #666; }
                    .details { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
                    table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    th { background: #f4f4f5; padding: 8px; border-bottom: 2px solid #ddd; text-align: left; }
                    .total { text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 36px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${venueName || 'ChillBill Supermarket'}</h1>
                    <p>Official Purchase Order</p>
                </div>
                <div class="details">
                    <div>
                        <strong>Supplier:</strong> ${selectedVendor?.name || 'General Supplier'}<br>
                        <strong>Phone:</strong> ${selectedVendor?.phone || 'N/A'}<br>
                        <strong>Category:</strong> ${selectedVendor?.category || 'General'}
                    </div>
                    <div style="text-align: right;">
                        <strong>PO Number:</strong> ${po.referenceNo}<br>
                        <strong>Date:</strong> ${dateStr}<br>
                        <strong>Status:</strong> Ordered
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="text-align: center; width: 40px;">#</th>
                            <th>Item Description</th>
                            <th style="text-align: center; width: 70px;">Qty</th>
                            <th style="text-align: right; width: 90px;">Rate</th>
                            <th style="text-align: right; width: 100px;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                <div class="total">
                    Total Estimated Amount: ${currency} ${totalAmount.toLocaleString('en-IN')}
                </div>
                ${notes ? `<p style="margin-top: 16px; font-size: 12px;"><strong>Special Instructions:</strong> ${notes}</p>` : ''}
                <div class="footer">
                    Generated via ChillBill Supermarket OS · Authorized Signature ___________________
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();

        setStatusSuccess(`Purchase Order #${po.referenceNo} generated!`);
        setTimeout(() => {
            setStatusSuccess(null);
            onOpenChange(false);
        }, 1200);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-lg font-black flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                            <MessageCircle size={18} />
                        </span>
                        Order Stock from Vendor
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Create and send an itemized purchase order via WhatsApp or PDF.
                    </DialogDescription>
                </DialogHeader>

                {statusSuccess ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
                        <CheckCircle2 size={44} className="text-emerald-500 animate-bounce" />
                        <p className="font-bold text-sm text-emerald-500">{statusSuccess}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Vendor Selector */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground">Select Supplier</Label>
                            <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                                <SelectTrigger className="h-10 text-xs font-semibold">
                                    <SelectValue placeholder="Choose supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.map(v => (
                                        <SelectItem key={v.id} value={v.id} className="text-xs">
                                            {v.name} {v.phone ? `(${v.phone})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Quick 1-Tap Low Stock Button */}
                        {lowStockFromVendor.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <AlertCircle size={16} className="text-orange-500 shrink-0" />
                                    <span className="text-xs font-bold text-orange-500 truncate">
                                        {lowStockFromVendor.length} low stock items found
                                    </span>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleAddAllLowStock}
                                    className="h-7 text-[11px] font-bold border-orange-500/40 text-orange-500 hover:bg-orange-500/20 shrink-0"
                                >
                                    + Add All
                                </Button>
                            </div>
                        )}

                        {/* Item Picker */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground">Add Products to Order</Label>
                            <Select onValueChange={handleAddItem} value="">
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="+ Select item to add" />
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                    {vendorInventory.map(item => (
                                        <SelectItem key={item.id} value={item.id} className="text-xs">
                                            {item.name} · Stock: {item.stock || 0}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Order Items Table / List */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground flex justify-between">
                                <span>Order Items ({items.length})</span>
                                <span className="text-orange-500">Total: {currency} {totalAmount.toLocaleString('en-IN')}</span>
                            </Label>

                            {items.length === 0 ? (
                                <div className="p-4 text-center border border-dashed rounded-xl text-xs text-muted-foreground">
                                    No items added yet. Pick from above or tap "Add All" for low stock.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                    {items.map((item, idx) => (
                                        <div key={item.itemId} className="p-2.5 rounded-xl border bg-card/60 flex items-center justify-between gap-2 text-xs">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-bold truncate text-foreground">{item.name}</p>
                                                <p className="text-[10px] text-muted-foreground">Rate: {currency}{item.unitCost}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Input 
                                                    type="number" 
                                                    min="1" 
                                                    value={item.quantity} 
                                                    onChange={e => handleUpdateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="h-8 w-16 text-center font-bold text-xs" 
                                                />
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-400"
                                                >
                                                    <Trash2 size={13} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Delivery Note / Instructions</Label>
                            <Input 
                                placeholder="e.g., Deliver before 4 PM, urgent" 
                                value={notes} 
                                onChange={e => setNotes(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>

                        {/* Dual Action Buttons */}
                        <div className="pt-2 grid grid-cols-2 gap-2.5">
                            <Button 
                                type="button" 
                                onClick={handleSendWhatsApp}
                                className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm rounded-xl"
                            >
                                <MessageCircle size={15} /> Send WhatsApp
                            </Button>
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={handleGeneratePDF}
                                className="h-11 border-orange-500/40 text-orange-500 hover:bg-orange-500/10 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm rounded-xl"
                            >
                                <FileText size={15} /> Save / PDF PO
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
