"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, Search, CreditCard, Banknote, ShoppingCart, Percent, Truck, Package, Tag, ScanBarcode, Users2, ChevronsUpDown, XCircle } from 'lucide-react';
import { InventoryItem, Bill, OrderItem, Customer, PendingBill, CartItem, SavedCart } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Printer, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PaymentDialog } from './payment-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";



interface PaymentSectionProps {
    inventory: InventoryItem[];
    setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    bills: Bill[];
    setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    currency: string;
    venueDetails: any | null;
    pendingBills: PendingBill[];
    setPendingBills: React.Dispatch<React.SetStateAction<PendingBill[]>>;
    cartSession: {
        items: CartItem[];
        customer: Customer | null;
        discount: number;
        redeemPoints: number;
        paymentMethod: 'Cash' | 'Online';
    };
    setCartSession: React.Dispatch<React.SetStateAction<{
        items: CartItem[];
        customer: Customer | null;
        discount: number;
        redeemPoints: number;
        paymentMethod: 'Cash' | 'Online';
    }>>;
    savedCarts: SavedCart[];
    setSavedCarts: React.Dispatch<React.SetStateAction<SavedCart[]>>;
}

export default function PaymentSection({ inventory, setInventory, bills, setBills, customers, setCustomers, currency, venueDetails, pendingBills, setPendingBills, cartSession, setCartSession, savedCarts, setSavedCarts }: PaymentSectionProps) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    // Proxies for cart session state
    const cart = cartSession.items;
    const setCart = (items: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
        setCartSession(prev => ({
            ...prev,
            items: typeof items === 'function' ? items(prev.items) : items
        }));
    };

    const selectedCustomer = cartSession.customer;
    const setSelectedCustomer = (customer: Customer | null) => {
        setCartSession(prev => ({ ...prev, customer }));
    };

    const discount = cartSession.discount;
    const setDiscount = (discount: number) => {
        setCartSession(prev => ({ ...prev, discount }));
    };

    const redeemPoints = cartSession.redeemPoints;
    const setRedeemPoints = (points: number) => {
        setCartSession(prev => ({ ...prev, redeemPoints: points }));
    };

    const paymentMethod = cartSession.paymentMethod;
    const setPaymentMethod = (method: 'Cash' | 'Online') => {
        setCartSession(prev => ({ ...prev, paymentMethod: method }));
    };

    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // const [discount, setDiscount] = useState(0); // REMOVED
    // const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Online'>('Online'); // REMOVED
    const [cashReceived, setCashReceived] = useState<number | string>('');
    const [isPrinting, setIsPrinting] = useState(false);
    // const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null); // REMOVED
    // const [redeemPoints, setRedeemPoints] = useState(0); // REMOVED
    const [customerSearch, setCustomerSearch] = useState("");
    const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [historySearchTerm, setHistorySearchTerm] = useState('');
    const [historyFilter, setHistoryFilter] = useState<'today' | 'weekly' | 'monthly'>('today');

    const handleHoldBill = () => {
        if (cart.length === 0) return;
        const newSavedCart: SavedCart = {
            id: Date.now().toString(),
            name: selectedCustomer ? selectedCustomer.name : `Order #${savedCarts.length + 1}`,
            items: cart,
            customer: selectedCustomer,
            discount: discount,
            redeemPoints: redeemPoints,
            paymentMethod: paymentMethod,
            timestamp: new Date()
        };
        setSavedCarts([...savedCarts, newSavedCart]);
        setCartSession({ items: [], customer: null, discount: 0, redeemPoints: 0, paymentMethod: 'Online' });
        toast({ title: t("Bill Held"), description: t("The current bill has been saved.") });
    };

    const handleRetrieveBill = (savedCart: SavedCart) => {
        if (cart.length > 0) {
            const currentAsSaved: SavedCart = {
                id: Date.now().toString(),
                name: selectedCustomer ? selectedCustomer.name : `Order #${savedCarts.length + 1} (Swapped)`,
                items: cart,
                customer: selectedCustomer,
                discount: discount,
                redeemPoints: redeemPoints,
                paymentMethod: paymentMethod,
                timestamp: new Date()
            };
            setSavedCarts([...savedCarts.filter(c => c.id !== savedCart.id), currentAsSaved]);
        } else {
            setSavedCarts(savedCarts.filter(c => c.id !== savedCart.id));
        }
        setCartSession({
            items: savedCart.items,
            customer: savedCart.customer,
            discount: savedCart.discount,
            redeemPoints: savedCart.redeemPoints,
            paymentMethod: savedCart.paymentMethod
        });
        toast({ title: t("Bill Retrieved"), description: t("The bill has been loaded.") });
    };

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        const term = customerSearch.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(term) ||
            c.phone.toLowerCase().includes(term)
        );
    }, [customers, customerSearch]);

    // Auto-apply default discount from settings
    React.useEffect(() => {
        if (venueDetails?.defaultDiscount && cart.length > 0) {
            const sub = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
            const discValue = (sub * venueDetails.defaultDiscount) / 100;
            const pointsValue = redeemPoints * (venueDetails?.loyaltyPointValue || 1);
            setDiscount(discValue + pointsValue);
        } else if (cart.length === 0) {
            setDiscount(0);
            setRedeemPoints(0);
        } else if (redeemPoints > 0) {
            const pointsValue = redeemPoints * (venueDetails?.loyaltyPointValue || 1);
            setDiscount(pointsValue);
        } else {
            setDiscount(0);
        }
    }, [cart, venueDetails?.defaultDiscount, redeemPoints, venueDetails?.loyaltyPointValue]);

    const categories = useMemo(() => {
        const cats = new Set(inventory.map(item => item.category));
        return ['All', 'Discounts & Offers', ...Array.from(cats).sort()];
    }, [inventory]);

    const categoryStatus = useMemo(() => {
        const statuses: Record<string, boolean> = {};
        const cats = new Set(inventory.map(item => item.category));
        cats.forEach(cat => {
            const itemsInCat = inventory.filter(i => i.category === cat);
            statuses[cat] = itemsInCat.length > 0 && itemsInCat.every(i => i.stock <= 0);
        });
        return statuses;
    }, [inventory]);

    const filteredItems = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        return inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(lowercasedTerm) ||
                item.category.toLowerCase().includes(lowercasedTerm) ||
                item.id.toLowerCase().includes(lowercasedTerm);

            let matchesCategory = false;
            if (selectedCategory === 'All') {
                matchesCategory = true;
            } else if (selectedCategory === 'Discounts & Offers') {
                matchesCategory = (item.discount || 0) > 0;
            } else {
                matchesCategory = item.category === selectedCategory;
            }

            return matchesSearch && matchesCategory;
        });
    }, [inventory, searchTerm, selectedCategory]);

    const addToCart = (item: InventoryItem) => {
        if (item.stock <= 0) {
            toast({ title: t("Out of Stock"), description: t("This item is currently out of stock."), variant: "destructive" });
            return;
        }

        // Deduct from main inventory immediately
        setInventory(prev => prev.map(i =>
            i.id === item.id ? { ...i, stock: i.stock - 1 } : i
        ));

        setCart(prevCart => {
            const existing = prevCart.find(i => i.id === item.id);
            if (existing) {
                return prevCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            } else {
                return [...prevCart, { ...item, quantity: 1 }];
            }
        });
    };

    const removeFromCart = (itemId: string) => {
        // We use functional update on setCart to ensure we filter the latest cart
        setCart(prevCart => {
            const cartItem = prevCart.find(i => i.id === itemId);
            if (cartItem) {
                // We restore stock based on what is actually in the cart
                setInventory(prevInv => prevInv.map(i =>
                    i.id === itemId ? { ...i, stock: i.stock + cartItem.quantity } : i
                ));
            }
            return prevCart.filter(i => i.id !== itemId);
        });
    };

    const updateQuantity = (itemId: string, delta: number) => {
        // We need to access both Inventory and Cart. 
        // To be safe against race conditions, we should check inventory inside the setInventory updater if possible,
        // but we also need to update Cart.
        // As a compromise, we'll read current state but use functional Setters.

        if (delta > 0) {
            // Logic:
            const itemInInv = inventory.find(i => i.id === itemId);
            if (!itemInInv || itemInInv.stock <= 0) {
                toast({ title: t("Low Stock"), description: t("Cannot add more than available stock."), variant: "destructive" });
                return;
            }

            // Deduct
            setInventory(prev => prev.map(i => i.id === itemId ? { ...i, stock: i.stock - 1 } : i));
            setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i));

        } else {
            // Removing 1 (or deleting if 1)
            setCart(prevCart => {
                const cartItem = prevCart.find(i => i.id === itemId);
                if (!cartItem) return prevCart;

                if (cartItem.quantity > 1) {
                    // Restore 1 stock
                    setInventory(prevInv => prevInv.map(i => i.id === itemId ? { ...i, stock: i.stock + 1 } : i));
                    return prevCart.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
                } else {
                    // Remove Item
                    // Restore all stock
                    setInventory(prevInv => prevInv.map(i => i.id === itemId ? { ...i, stock: i.stock + cartItem.quantity } : i));
                    return prevCart.filter(i => i.id !== itemId);
                }
            });
        }
    };

    const setItemQuantity = (itemId: string, qty: number) => {
        const itemInInventory = inventory.find(i => i.id === itemId);
        const cartItem = cart.find(i => i.id === itemId);
        if (!itemInInventory || !cartItem) return;

        // Current total stock = Inventory Stock (available) + Cart Quantity (held)
        const totalStock = itemInInventory.stock + cartItem.quantity;

        // Allow valid positive numbers, cap at max total stock.
        let newQty = Math.max(0, qty);
        if (newQty > totalStock) {
            toast({ title: t("Stock Limit"), description: t("Cannot exceed available stock."), variant: "destructive" });
            newQty = totalStock;
        }

        // If 0, we'll handle it on blur (reset to 1), so for now just update cart visual, 
        // but physically syncing inventory might be tricky if we don't know the final state.
        // However, standard text input behavior:

        const diff = newQty - cartItem.quantity;

        // Update inventory
        setInventory(prev => prev.map(i =>
            i.id === itemId ? { ...i, stock: i.stock - diff } : i
        ));

        setCart(cart.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
    };

    const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

    // Calculate Item Level Discounts
    const itemLevelDiscount = cart.reduce((sum, item) => {
        if (item.discount && item.discount > 0) {
            return sum + (item.price * (item.discount / 100) * item.quantity);
        }
        return sum;
    }, 0);

    const effectiveDiscount = useMemo(() => {
        const globalDiscountRate = discount || 0;
        const netAfterItemDiscount = subtotal - itemLevelDiscount;
        const globalDiscountAmount = netAfterItemDiscount * (globalDiscountRate / 100);
        return itemLevelDiscount + globalDiscountAmount;
    }, [discount, subtotal, itemLevelDiscount]);

    // Calculate individual tax sum (based on discounted price ideally, but simplified to proportional on net)
    const rawVatAmount = cart.reduce((sum, item) => {
        const itemTotal = (item.price || 0) * item.quantity;
        return sum + (itemTotal * ((item.taxRate || 0) / 100));
    }, 0);

    // If there's a discount, reduce tax proportionally
    const vatAmount = subtotal > 0 ? rawVatAmount * (1 - (effectiveDiscount / subtotal)) : 0;
    const total = Math.max(0, subtotal - effectiveDiscount + vatAmount);

    const changeAmount = useMemo(() => {
        const received = typeof cashReceived === 'number' ? cashReceived : parseFloat(String(cashReceived));
        return isNaN(received) ? 0 : received - total;
    }, [cashReceived, total]);

    const processPayment = (shouldPrint = false, amountPaid?: number, overrideCustomer?: { name: string; phone: string }) => {
        if (cart.length === 0) return;

        const paid = amountPaid !== undefined ? amountPaid : total;
        const currentCustomer = overrideCustomer || selectedCustomer;
        const balance = total - paid;

        if (balance > 0 && !currentCustomer) {
            toast({ title: t("Customer Required"), description: t("Please select or add a customer to record credit."), variant: "destructive" });
            return;
        }

        // Deduct from inventory
        const newInventory = inventory.map(invItem => {
            const cartItem = cart.find(ci => ci.id === invItem.id);
            if (cartItem) {
                return { ...invItem, stock: invItem.stock - cartItem.quantity };
            }
            return invItem;
        });

        // Add to bills
        const lastNumericId = bills.reduce((max, bill) => {
            const idNum = parseInt(bill.id);
            // Ignore timestamps or non-sequential large numbers
            if (idNum > 100000) return max;
            return !isNaN(idNum) ? Math.max(max, idNum) : max;
        }, 0);
        const billId = (lastNumericId + 1).toString().padStart(2, '0');

        // Create bill and handle credit
        if (balance > 0 && currentCustomer) {
            const existingPending = pendingBills.find(pb => pb.mobile === currentCustomer.phone && pb.type === 'customer');
            if (existingPending) {
                const newTransaction = {
                    id: Math.random().toString(36).substr(2, 9),
                    amount: balance,
                    date: new Date(),
                    description: `Balance from Bill #${billId}`
                };
                setPendingBills(prev => prev.map(pb => pb.id === existingPending.id ? { ...pb, transactions: [...pb.transactions, newTransaction] } : pb));
            } else {
                const newPending: PendingBill = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: currentCustomer.name,
                    mobile: currentCustomer.phone,
                    type: 'customer',
                    transactions: [{
                        id: Math.random().toString(36).substr(2, 9),
                        amount: balance,
                        date: new Date(),
                        description: `Initial balance from Bill #${billId}`
                    }]
                };
                setPendingBills(prev => [...prev, newPending]);
            }
        }

        const receiptPreviewText = `
${venueDetails?.name?.toUpperCase() || 'UP & ABOVE'}
${venueDetails?.address || ''}
${venueDetails?.contactNumber || ''}

Bill No: ${billId}
Date: ${format(new Date(), 'PPpp')}
--------------------------------
Item            Qty       Total
--------------------------------
${cart.map(item => {
            const itemTotal = (item.price || 0) * item.quantity;
            const itemDisc = (item.discount || 0) > 0 ? (itemTotal * (item.discount || 0) / 100) : 0;
            const finalItemTotal = itemTotal - itemDisc;
            return `${(item.name || '').slice(0, 15).padEnd(15)} ${item.quantity.toString().padEnd(8)} ${currency}${finalItemTotal.toFixed(2)}`;
        }).join('\n')}
--------------------------------
Subtotal:         ${currency}${subtotal.toFixed(2)}
Discount:        -${currency}${effectiveDiscount.toFixed(2)}
Total Tax:        ${currency}${vatAmount.toFixed(2)}
TOTAL AMOUNT:     ${currency}${total.toFixed(2)}
--------------------------------
Payment Method: ${paymentMethod}
${venueDetails?.receiptFooter || 'Thank you for shopping!'}
`.trim();

        const newBill: Bill = {
            id: billId,
            orderItems: cart.map(ci => ({
                name: ci.name,
                price: ci.price || 0,
                code: ci.id,
                quantity: ci.quantity,
                category: ci.category,
                taxRate: ci.taxRate || 0,
                instruction: ci.discount ? `Discount: ${ci.discount}%` : '',
            } as OrderItem)),
            subtotal: subtotal,
            discount: effectiveDiscount,
            vatPercentage: venueDetails?.vatPercentage || 0,
            vatAmount: vatAmount,
            total: total,
            paymentMethod: paymentMethod,
            receiptPreview: receiptPreviewText,
            timestamp: new Date(),
            orderType: 'Store-Pickup',
            createdAt: new Date(),
            completedAt: new Date(),
            customerDetails: currentCustomer ? {
                name: currentCustomer.name,
                phone: currentCustomer.phone,
                address: customers.find(c => c.phone === currentCustomer.phone)?.address || ''
            } : null,
        };

        // Inventory is already updated in real-time interactions

        setBills([...bills, newBill]);

        if (shouldPrint) {
            handlePrint(newBill, paid);
        }

        // Update customer loyalty points and history
        if (currentCustomer) {
            const pointsEarned = Math.floor(paid * (venueDetails?.loyaltyRate || 0.01));
            const existing = customers.find(c => c.phone === currentCustomer.phone);

            if (existing) {
                const newCustomers = customers.map(c => {
                    if (c.id === existing.id) {
                        return {
                            ...c,
                            totalSpent: c.totalSpent + paid,
                            totalVisits: c.totalVisits + 1,
                            lastSeen: new Date(),
                            loyaltyPoints: (c.loyaltyPoints || 0) - redeemPoints + pointsEarned
                        };
                    }
                    return c;
                });
                setCustomers(newCustomers);
            } else {
                const newCustomer: Customer = {
                    id: currentCustomer.phone,
                    name: currentCustomer.name,
                    phone: currentCustomer.phone,
                    firstSeen: new Date(),
                    lastSeen: new Date(),
                    totalVisits: 1,
                    totalSpent: paid,
                    loyaltyPoints: pointsEarned
                };
                setCustomers([...customers, newCustomer]);
            }
        }

        setCart([]);
        setDiscount(0);
        setRedeemPoints(0);
        setCashReceived('');
        const successMsg = balance > 0
            ? `${t("Payment Successful")}. ${currency}${balance.toFixed(2)} ${t("added to customer credit")}.`
            : t("Payment Successful");
        toast({ title: t("Success"), description: successMsg });
    };

    const handlePrint = (bill: Bill, amountPaid?: number) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const paid = amountPaid !== undefined ? amountPaid : bill.total;
        const balance = bill.total - paid;

        const itemsHtml = bill.orderItems.map(item => `
            <tr>
                <td style="padding: 5px 0;">${item.name}<br/><small>${item.quantity} x MRP Rs. ${item.price.toFixed(2)}</small></td>
                <td style="text-align: right; vertical-align: bottom;">MRP Rs. ${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        const receiptHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${bill.id}</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 10px; color: #000; }
                    .header { text-align: center; margin-bottom: 15px; }
                    .header h1 { margin: 5px 0; font-size: 20px; text-transform: uppercase; }
                    .header p { margin: 2px 0; font-size: 12px; }
                    .divider { border-top: 1px dashed #000; margin: 10px 0; }
                    table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    .totals { margin-top: 10px; }
                    .totals div { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 3px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; font-weight: bold; }
                    @media print { body { width: 80mm; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${venueDetails?.name || 'STORE'}</h1>
                    <p>${venueDetails?.address || ''}</p>
                    <p>${venueDetails?.contactNumber || ''}</p>
                    ${venueDetails?.tagline ? `<p><i>${venueDetails.tagline}</i></p>` : ''}
                    ${venueDetails?.receiptHeader ? `<div style="margin-top: 5px; font-weight: bold;">${venueDetails.receiptHeader}</div>` : ''}
                </div>
                <div class="divider"></div>
                <p style="font-size: 12px;">Date: ${format(new Date(bill.timestamp), 'PPpp')}</p>
                <p style="font-size: 12px;">Bill No: ${bill.id}</p>
                <div class="divider"></div>
                <table>
                    <thead>
                        <tr>
                            <th style="text-align: left;">Item</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div class="divider"></div>
                <div class="totals">
                    <div><span>Subtotal:</span><span>${currency}${bill.subtotal.toFixed(2)}</span></div>
                    ${bill.discount > 0 ? `<div><span>Discount:</span><span>-${currency}${bill.discount.toFixed(2)}</span></div>` : ''}
                    ${bill.vatAmount > 0 ? `<div><span>Total Tax:</span><span>${currency}${bill.vatAmount.toFixed(2)}</span></div>` : ''}
                    <div style="font-size: 18px; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px;"><span>TOTAL AMOUNT:</span><span>${currency}${bill.total.toFixed(2)}</span></div>
                    
                    <div style="margin-top: 5px; font-weight: bold;"><span>Amount Paid:</span><span>${currency}${paid.toFixed(2)}</span></div>
                    
                    ${balance > 0 ? `
                    <div style="margin-top: 2px; color: #ff0000; font-weight: 900; border: 1px dashed #000; padding: 5px; text-align: center;">
                        <span>BALANCE DUE: -${currency}${balance.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    
                    ${paid > bill.total ? `
                    <div style="margin-top: 2px;"><span>Change Returned:</span><span>${currency}${(paid - bill.total).toFixed(2)}</span></div>
                    ` : ''}
                </div>
                <div class="divider"></div>
                ${venueDetails?.customMessage ? `<div style="text-align: center; margin-bottom: 10px; font-size: 11px;">${venueDetails.customMessage}</div><div class="divider"></div>` : ''}
                <p style="font-size: 12px;">Payment: ${bill.paymentMethod}</p>
                <div class="footer">
                    ${venueDetails?.receiptFooter || 'THANK YOU FOR SHOPPING WITH US, VISIT AGAIN.'}
                </div>
                <script>
                    window.onload = function() { window.print(); window.close(); };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(receiptHtml);
        printWindow.document.close();
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6 p-4 lg:p-6 overflow-hidden">
            {/* Items Section */}
            <div className="flex-grow flex flex-col gap-6 min-h-0">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <Button variant="outline" className="h-14 rounded-2xl gap-2 font-bold border-2 min-w-[140px]" onClick={() => setIsHistoryDialogOpen(true)}>
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] uppercase opacity-70">{t("Today's Orders")}</span>
                            <span className="text-lg font-black">{bills.filter(b => new Date(b.timestamp).toDateString() === new Date().toDateString()).length}</span>
                        </div>
                    </Button>
                    <div className="relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder={t("Scan Barcode or Search items...")}
                            className="pl-12 h-14 bg-card/50 border-none shadow-sm focus-visible:ring-primary/40 text-lg rounded-2xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchTerm) {
                                    // First try exact match
                                    const exactMatch = inventory.find(i => i.id.toLowerCase() === searchTerm.toLowerCase());
                                    if (exactMatch) {
                                        addToCart(exactMatch);
                                        setSearchTerm('');
                                        toast({ title: t("Item Scanned"), description: `${exactMatch.name} ${t("added to cart.")}` });
                                        return;
                                    }

                                    // Fallback to first filtered item
                                    if (filteredItems.length > 0) {
                                        addToCart(filteredItems[0]);
                                        setSearchTerm('');
                                        toast({ title: t("Item Added"), description: `${filteredItems[0].name} ${t("added to cart.")}` });
                                    }
                                }
                            }}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Categories */}
                <ScrollArea className="w-full whitespace-nowrap pb-2">
                    <div className="flex w-max space-x-2 p-1">
                        {categories.map((category) => {
                            const isOOS = categoryStatus[category];
                            return (
                                <Button
                                    key={category}
                                    variant={selectedCategory === category ? "default" : "secondary"}
                                    onClick={() => setSelectedCategory(category)}
                                    className={cn(
                                        "rounded-2xl px-5 h-10 font-bold transition-all text-sm shadow-sm",
                                        selectedCategory === category
                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105 ring-2 ring-primary/20"
                                            : isOOS
                                                ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30"
                                                : "bg-secondary/80 text-secondary-foreground hover:bg-primary/10 hover:text-primary"
                                    )}
                                >
                                    {category}
                                    {isOOS && <span className="ml-2 text-[10px] uppercase font-black bg-destructive text-destructive-foreground px-2 py-0.5 rounded-md whitespace-nowrap">Out of Stock</span>}
                                </Button>
                            );
                        })}
                    </div>
                </ScrollArea>

                <ScrollArea className="flex-grow rounded-3xl border border-border/50 bg-card/20 backdrop-blur-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4">
                        {filteredItems.length > 0 ? filteredItems.map(item => (
                            <Card
                                key={item.id}
                                className={cn(
                                    "relative group cursor-pointer border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden active:scale-[0.98]",
                                    item.stock <= 0 ? "opacity-90 pointer-events-none border-2 border-destructive bg-destructive/5" : "hover:bg-primary/5 bg-card/80",
                                    item.stock > 0 && item.stock < 10 && "border border-orange-500/50"
                                )}
                                onClick={() => addToCart(item)}
                            >
                                {item.stock <= 0 && (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
                                        <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-xl font-black text-xl shadow-2xl rotate-[-12deg] border-4 border-destructive-foreground/20">
                                            {t("OUT OF STOCK")}
                                        </div>
                                    </div>
                                )}
                                <CardContent className="p-4 flex flex-col h-full justify-between gap-3">
                                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                        <Badge variant={item.stock < 10 ? "destructive" : "secondary"} className="font-bold rounded-lg shadow-sm">
                                            {item.stock} {item.unit}
                                        </Badge>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Tag className={cn("h-3 w-3", item.stock <= 0 ? "text-destructive" : item.stock < 10 ? "text-orange-500" : "text-primary")} />
                                            <span className={cn(
                                                "text-[10px] uppercase tracking-wider font-bold",
                                                item.stock <= 0 ? "text-destructive" : item.stock < 10 ? "text-orange-500" : "text-muted-foreground"
                                            )}>{item.category}</span>
                                            {item.stock > 0 && item.stock < 10 && (
                                                <span className="text-[10px] font-black text-orange-500 animate-pulse ml-auto bg-orange-500/10 px-1.5 py-0.5 rounded-sm">
                                                    {t("LOW STOCK")}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">{item.name}</h3>
                                    </div>

                                    <div className="flex justify-between items-center mt-auto">
                                        <div className="flex flex-col">
                                            {(item.discount && item.discount > 0) ? (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-muted-foreground line-through decoration-destructive/50 decoration-2">
                                                            Rs. {(item.price || 0).toFixed(2)}
                                                        </span>
                                                        <span className="text-[10px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded-md">
                                                            -{item.discount}%
                                                        </span>
                                                    </div>
                                                    <span className="text-2xl font-black text-primary drop-shadow-sm">
                                                        Rs. {((item.price || 0) * (1 - item.discount / 100)).toFixed(2)}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-2xl font-black text-primary drop-shadow-sm">MRP Rs. {(item.price || 0).toFixed(2)}</span>
                                            )}
                                        </div>
                                        <div className="bg-primary shadow-lg shadow-primary/30 p-2.5 rounded-xl text-white transform group-hover:rotate-90 transition-all duration-300">
                                            <Plus className="h-5 w-5" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="col-span-full py-20 text-center text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p className="text-xl font-medium">{t("No items found")}</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Cart Section */}
            <Card className="w-full lg:w-[450px] flex flex-col bg-card/40 backdrop-blur-md border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-4 sm:p-6 pb-2">
                    <CardTitle className="flex items-center justify-between text-xl font-black">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-xl">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                            </div>
                            {t("Order Cart")}
                        </div>
                        <div className="flex items-center gap-2">
                            {savedCarts.length > 0 && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 border-yellow-500/20">
                                            <div className="flex items-center justify-center w-5 h-5 bg-yellow-500 rounded-full text-[10px] text-white font-bold">
                                                {savedCarts.length}
                                            </div>
                                            {t("Held")}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent align="end" className="w-64 p-2">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-sm px-2 py-1">{t("Held Bills")}</h4>
                                            {savedCarts.map(sc => (
                                                <div key={sc.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer group" onClick={() => handleRetrieveBill(sc)}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{sc.name}</span>
                                                        <span className="text-xs text-muted-foreground">{sc.items.length} items • {format(sc.timestamp, 'p')}</span>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSavedCarts(savedCarts.filter(c => c.id !== sc.id));
                                                    }}>
                                                        <XCircle className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-primary px-2" onClick={handleHoldBill} disabled={cart.length === 0} title={t("Hold Bill")}>
                                <div className="bg-muted p-1 rounded-lg">
                                    <Package className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-xs font-bold">{t("Hold Bill")}</span>
                            </Button>
                            <Badge variant="outline" className="text-sm px-2 py-0.5 rounded-lg">
                                {cart.reduce((s, i) => s + i.quantity, 0)} {t("Items")}
                            </Badge>
                        </div>
                    </CardTitle>
                    {/* Customer Selection */}
                    <div className="mt-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Users2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-bold text-muted-foreground">{t("Customer")}</span>
                        </div>
                        <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isCustomerPopoverOpen}
                                    className="w-full justify-between bg-background border border-border/50 rounded-xl h-10 px-3 font-bold text-sm"
                                >
                                    {selectedCustomer
                                        ? `${selectedCustomer.name} (${selectedCustomer.phone})`
                                        : t("Select / Search Customer")}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl shadow-2xl border-border/50">
                                <div className="p-2 border-b border-border/50 bg-muted/30">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t("Search by name or phone...")}
                                            className="pl-9 h-10 bg-background border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl font-bold"
                                            value={customerSearch}
                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (filteredCustomers.length > 0) {
                                                        setSelectedCustomer(filteredCustomers[0]);
                                                        setIsCustomerPopoverOpen(false);
                                                        setCustomerSearch("");
                                                        toast({ title: t("Customer Selected"), description: filteredCustomers[0].name });
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <ScrollArea className="h-[250px]">
                                    <div className="p-1">
                                        <button
                                            className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold hover:bg-primary/5 transition-colors flex items-center gap-2"
                                            onClick={() => {
                                                setSelectedCustomer(null);
                                                setIsCustomerPopoverOpen(false);
                                                setCustomerSearch("");
                                            }}
                                        >
                                            <div className={cn("flex-shrink-0 w-4 h-4 rounded-full border border-border flex items-center justify-center", !selectedCustomer && "bg-primary border-primary")}>
                                                {!selectedCustomer && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                            {t("Walk-in Customer")}
                                        </button>
                                        <Separator className="my-1 opacity-50" />
                                        {filteredCustomers.length > 0 ? (
                                            filteredCustomers.map((c) => (
                                                <button
                                                    key={c.id}
                                                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold hover:bg-primary/10 transition-colors flex items-center gap-2 group"
                                                    onClick={() => {
                                                        setSelectedCustomer(c);
                                                        setIsCustomerPopoverOpen(false);
                                                        setCustomerSearch("");
                                                    }}
                                                >
                                                    <div className={cn("flex-shrink-0 w-4 h-4 rounded-full border border-border flex items-center justify-center transition-all", selectedCustomer?.id === c.id && "bg-primary border-primary")}>
                                                        {selectedCustomer?.id === c.id && <Check className="h-3 w-3 text-white" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span>{c.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium group-hover:text-primary/70">{c.phone}</span>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-sm text-muted-foreground font-medium">
                                                {t("No customers found")}
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                        {selectedCustomer && (
                            <div className="flex justify-between items-center bg-primary/5 p-2 rounded-xl border border-primary/10 animate-in fade-in zoom-in-95 mt-1">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-primary uppercase">{t("Balance")}</span>
                                    <span className="text-sm font-black text-primary">{selectedCustomer.loyaltyPoints || 0} PTS</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{t("Redeem")}</span>
                                    <input
                                        type="number"
                                        max={selectedCustomer.loyaltyPoints || 0}
                                        className="w-14 h-6 text-right bg-background border-none rounded-lg text-xs font-black focus:ring-primary/20"
                                        value={redeemPoints}
                                        onChange={(e) => setRedeemPoints(Math.min(selectedCustomer.loyaltyPoints || 0, parseInt(e.target.value) || 0))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="flex-grow flex flex-col p-3 sm:p-5 pt-2 gap-2 overflow-hidden">
                    <ScrollArea className="flex-grow min-h-[200px] -mr-1 pr-3">
                        <div className="space-y-2">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
                                    <ShoppingCart className="h-20 w-20 mb-6 animate-bounce" />
                                    <p className="text-lg font-bold">{t("Your cart is empty")}</p>
                                    <p className="text-sm">{t("Click on items to add them here")}</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.id} className="group relative flex items-center gap-4 p-3 bg-background/40 hover:bg-background/80 rounded-2xl border border-border/40 hover:border-primary/30 transition-all duration-300">
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h4 className="font-extrabold text-[15px] leading-tight text-foreground truncate">{item.name}</h4>
                                                <div className="flex flex-col items-end">
                                                    {(item.discount && item.discount > 0) ? (
                                                        <>
                                                            <span className="text-[10px] text-muted-foreground line-through decoration-destructive/50">Rs. {((item.price || 0) * item.quantity).toFixed(2)}</span>
                                                            <span className="flex-shrink-0 font-black text-primary text-[15px]">Rs. {(((item.price || 0) * item.quantity) * (1 - item.discount / 100)).toFixed(2)}</span>
                                                        </>
                                                    ) : (
                                                        <span className="flex-shrink-0 font-black text-primary text-[15px]">Rs. {((item.price || 0) * item.quantity).toFixed(2)}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 bg-primary/5 rounded-lg p-0.5 border border-primary/10">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-md hover:bg-white/50 text-primary"
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <Input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => setItemQuantity(item.id, parseInt(e.target.value) || 0)}
                                                        onBlur={() => {
                                                            if (item.quantity === 0) removeFromCart(item.id);
                                                        }}
                                                        className="w-10 h-7 text-center text-sm font-black text-primary bg-transparent border-none p-0 focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-md hover:bg-white/50 text-primary"
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60 truncate ml-2">{item.category}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="flex-shrink-0 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                            onClick={() => removeFromCart(item.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    <div className={cn("space-y-3 pt-3 border-t border-border/50 mt-auto", paymentMethod === 'Cash' && "space-y-1.5 pt-1.5")}>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/30 rounded-2xl">
                            <Button
                                variant="ghost"
                                className={cn(
                                    "flex items-center gap-2 h-11 rounded-xl transition-all duration-500 font-bold text-sm",
                                    paymentMethod === 'Online'
                                        ? "bg-background text-primary shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                                        : "text-muted-foreground hover:bg-background/50"
                                )}
                                onClick={() => setPaymentMethod('Online')}
                            >
                                <div className={cn("p-1.5 rounded-lg", paymentMethod === 'Online' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                    <CreditCard className="h-4 w-4" />
                                </div>
                                {t("Online")}
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "flex items-center gap-2 h-11 rounded-xl transition-all duration-500 font-bold text-sm",
                                    paymentMethod === 'Cash'
                                        ? "bg-background text-primary shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                                        : "text-muted-foreground hover:bg-background/50"
                                )}
                                onClick={() => setPaymentMethod('Cash')}
                            >
                                <div className={cn("p-1.5 rounded-lg", paymentMethod === 'Cash' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                    <Banknote className="h-4 w-4" />
                                </div>
                                {t("Cash")}
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    type="number"
                                    placeholder={t("Apply Discount (%)")}
                                    className="pl-9 h-10 bg-background/50 border-none rounded-xl font-bold text-sm text-right pr-3"
                                    min="0"
                                    max="100"
                                    value={discount || ''}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Inline Cash Input Hidden - Moved to Dialog for better flow */}

                        <div className="space-y-2.5 px-1 mt-auto">
                            <div className="flex justify-between text-xl font-black px-1 border-b border-border/40 pb-1">
                                <span className="opacity-60 uppercase text-xs tracking-widest leading-none flex items-end">{t("Subtotal")}</span>
                                <span className="text-foreground">{currency}{subtotal.toFixed(2)}</span>
                            </div>
                            {effectiveDiscount > 0 && (
                                <div className="flex justify-between text-base font-black px-1 border-b border-border/40 pb-1 text-destructive">
                                    <span className="opacity-60 uppercase text-[11px] tracking-widest leading-none flex items-end">{t("Discount")}</span>
                                    <span>-{currency}{effectiveDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            {vatAmount > 0 && (
                                <div className="flex justify-between text-base font-black px-1 border-b border-border/40 pb-1 text-blue-600">
                                    <span className="opacity-60 uppercase text-[11px] tracking-widest leading-none flex items-end">{t("Tax")}</span>
                                    <span>{currency}{vatAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end p-4 bg-primary rounded-lg shadow-xl shadow-primary/20 mt-2">
                                <span className="text-sm font-black text-white uppercase tracking-widest mb-1">{t("Total Payable")}</span>
                                <span className="text-4xl font-black text-white leading-none tracking-tighter">{currency}{total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-auto">
                            <Button
                                variant="outline"
                                className="h-16 text-sm font-black rounded-lg bg-primary/5 border-2 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary transition-all flex flex-col gap-1 items-center justify-center group"
                                disabled={cart.length === 0}
                                onClick={() => {
                                    if (paymentMethod === 'Cash') {
                                        setIsPaymentDialogOpen(true);
                                    } else {
                                        processPayment(true, total);
                                    }
                                }}
                            >
                                <Printer className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                {t("Print & Save")}
                            </Button>
                            <Button
                                className="h-16 text-sm font-black rounded-lg shadow-lg shadow-primary/20 active:scale-95 transition-all bg-primary hover:bg-orange-600 flex flex-col gap-1 items-center justify-center group border-2 border-primary"
                                disabled={cart.length === 0}
                                onClick={() => {
                                    if (paymentMethod === 'Cash') {
                                        setIsPaymentDialogOpen(true);
                                    } else {
                                        processPayment(false, total);
                                    }
                                }}
                            >
                                <Check className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                {t("Process Payment")}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <PaymentDialog
                isOpen={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
                total={total}
                receiptPreview=""
                onPaymentSuccess={(paid, details) => {
                    processPayment(false, paid, details);
                    setIsPaymentDialogOpen(false);
                }}
                onNavigate={() => { }}
                currency={currency}
                isCashOnly={paymentMethod === 'Cash'}
            />

            <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t("Order History")}</DialogTitle>
                        <div className="flex flex-col gap-3 mt-2">
                            <Tabs defaultValue="today" value={historyFilter} onValueChange={(v) => setHistoryFilter(v as any)} className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="today">{t("Today")}</TabsTrigger>
                                    <TabsTrigger value="weekly">{t("This Week")}</TabsTrigger>
                                    <TabsTrigger value="monthly">{t("This Month")}</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("Search by Bill ID or Customer Name...")}
                                    className="pl-9 bg-muted/50 border-input"
                                    value={historySearchTerm}
                                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </DialogHeader>
                    <ScrollArea className="flex-1">
                        <div className="space-y-2 p-1">
                            {bills.filter(b => {
                                const billDate = new Date(b.timestamp);
                                const today = new Date();
                                let isMatch = false;

                                if (historyFilter === 'today') {
                                    isMatch = billDate.toDateString() === today.toDateString();
                                } else if (historyFilter === 'weekly') {
                                    const oneWeekAgo = new Date();
                                    oneWeekAgo.setDate(today.getDate() - 7);
                                    isMatch = billDate >= oneWeekAgo && billDate <= today;
                                } else if (historyFilter === 'monthly') {
                                    const oneMonthAgo = new Date();
                                    oneMonthAgo.setDate(today.getDate() - 30);
                                    isMatch = billDate >= oneMonthAgo && billDate <= today;
                                }

                                const searchLower = historySearchTerm.toLowerCase();
                                const matchesSearch = !historySearchTerm ||
                                    (b.id || '').toLowerCase().includes(searchLower) ||
                                    (b.customerDetails?.name || '').toLowerCase().includes(searchLower) ||
                                    (b.paymentMethod || '').toLowerCase().includes(searchLower);
                                return isMatch && matchesSearch;
                            }).length === 0 ? (
                                <div className="text-center text-muted-foreground py-10">{t("No orders found for this period.")}</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-muted text-muted-foreground font-bold">
                                        <tr>
                                            <th className="p-2 text-left">{t("Bill ID")}</th>
                                            <th className="p-2 text-left">{t("Customer")}</th>
                                            <th className="p-2 text-left">{t("Date/Time")}</th>
                                            <th className="p-2 text-right">{t("Total")}</th>
                                            <th className="p-2 text-center">{t("Method")}</th>
                                            <th className="p-2 text-center">{t("Action")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bills.filter(b => {
                                            const billDate = new Date(b.timestamp);
                                            const today = new Date();
                                            let isMatch = false;

                                            if (historyFilter === 'today') {
                                                isMatch = billDate.toDateString() === today.toDateString();
                                            } else if (historyFilter === 'weekly') {
                                                const oneWeekAgo = new Date();
                                                oneWeekAgo.setDate(today.getDate() - 7);
                                                isMatch = billDate >= oneWeekAgo && billDate <= today;
                                            } else if (historyFilter === 'monthly') {
                                                const oneMonthAgo = new Date();
                                                oneMonthAgo.setDate(today.getDate() - 3); // Typo protection? No, 30.
                                                oneMonthAgo.setDate(today.getDate() - 30);
                                                isMatch = billDate >= oneMonthAgo && billDate <= today;
                                            }

                                            const searchLower = historySearchTerm.toLowerCase();
                                            const matchesSearch = !historySearchTerm ||
                                                (b.id || '').toLowerCase().includes(searchLower) ||
                                                (b.customerDetails?.name || '').toLowerCase().includes(searchLower) ||
                                                (b.paymentMethod || '').toLowerCase().includes(searchLower);
                                            return isMatch && matchesSearch;
                                        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(bill => (
                                            <tr key={bill.id} className="border-b hover:bg-muted/20">
                                                <td className="p-2 font-mono font-bold">{bill.id}</td>
                                                <td className="p-2 font-medium">{bill.customerDetails?.name || t('Walk-in')}</td>
                                                <td className="p-2">
                                                    <div className="flex flex-col">
                                                        <span>{format(new Date(bill.timestamp), 'PP')}</span>
                                                        <span className="text-xs text-muted-foreground">{format(new Date(bill.timestamp), 'p')}</span>
                                                    </div>
                                                </td>
                                                <td className="p-2 text-right font-black">{currency}{bill.total.toFixed(2)}</td>
                                                <td className="p-2 text-center text-xs uppercase">{bill.paymentMethod}</td>
                                                <td className="p-2 text-center">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePrint(bill)}>
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
