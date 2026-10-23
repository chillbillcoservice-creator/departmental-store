"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, Search, CreditCard, Banknote, ShoppingCart, Percent, Truck, Package, Tag, ScanBarcode, Users2, ChevronsUpDown, XCircle, Layers, RotateCcw, Wallet, Keyboard, QrCode, Store, Zap, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import { InventoryItem, Bill, OrderItem, Customer, PendingBill, CartItem, SavedCart, Expense, Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Printer, Check, MessageSquare, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PaymentDialog } from './payment-dialog';
import { UpiPaymentModal } from './upi-payment-modal';
import { SalesReturnDialog } from './sales-return-dialog';
import { CashDrawerDialog } from './cash-drawer-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendWhatsAppBill } from '@/lib/whatsapp-bill';
import { DEPARTMENTAL_STORE_CATALOG } from '@/lib/departmental-catalog';
import { subscribeToAmountMatch, simulateCounterStandeePayment } from '@/lib/payment-listener';
import { triggerSoundboxAlert } from '@/lib/soundbox';
import { getActiveShift, logShiftActivity } from '@/lib/shift-manager';

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
        paymentMethod: 'Cash' | 'Online' | 'Split';
    };
    setCartSession: React.Dispatch<React.SetStateAction<{
        items: CartItem[];
        customer: Customer | null;
        discount: number;
        redeemPoints: number;
        paymentMethod: 'Cash' | 'Online' | 'Split';
    }>>;
    savedCarts: SavedCart[];
    setSavedCarts: React.Dispatch<React.SetStateAction<SavedCart[]>>;
    expenses?: Expense[];
    currentUser?: Employee | null;
}

export default function PaymentSection({ inventory, setInventory, bills, setBills, customers, setCustomers, currency, venueDetails, pendingBills, setPendingBills, cartSession, setCartSession, savedCarts, setSavedCarts, expenses = [], currentUser }: PaymentSectionProps) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const activeCurrency = (!currency || currency === '$') ? 'Rs.' : currency;
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
    const setPaymentMethod = (method: 'Cash' | 'Online' | 'Split') => {
        setCartSession(prev => ({ ...prev, paymentMethod: method }));
    };

    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [cashReceived, setCashReceived] = useState<number | string>('');
    const [splitCash, setSplitCash] = useState<number>(0);
    const [splitOnline, setSplitOnline] = useState<number>(0);
    const [isPrinting, setIsPrinting] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
    const [pendingPrintAfterUpi, setPendingPrintAfterUpi] = useState(false);
    const [isCounterStandeeListening, setIsCounterStandeeListening] = useState(false);
    const [counterVerifiedUtr, setCounterVerifiedUtr] = useState('');
    const [isCounterVerified, setIsCounterVerified] = useState(false);
    const counterTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isSalesReturnOpen, setIsSalesReturnOpen] = useState(false);
    const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [historySearchTerm, setHistorySearchTerm] = useState('');
    const [historyFilter, setHistoryFilter] = useState<'today' | 'weekly' | 'monthly'>('today');
    const [lastCompletedBill, setLastCompletedBill] = useState<Bill | null>(null);
    const [isBillSuccessOpen, setIsBillSuccessOpen] = useState(false);
    const [whatsAppMobile, setWhatsAppMobile] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const customerSearchInputRef = useRef<HTMLInputElement>(null);
    const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const lastAddedItemIdRef = useRef<string | null>(null);
    const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
    const cartBottomRef = useRef<HTMLDivElement>(null);
    const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-scroll to recently added item (bottom of the cart)
    const scrollToRecentItem = (itemId: string) => {
        lastAddedItemIdRef.current = itemId;
        setRecentlyAddedId(itemId);
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => {
            setRecentlyAddedId(null);
        }, 1800);

        // Smoothly scroll down so the newly added item is in view
        setTimeout(() => {
            const itemEl = document.getElementById(`cart-item-${itemId}`);
            const viewport = itemEl?.closest('[data-radix-scroll-area-viewport]') || cartBottomRef.current?.closest('[data-radix-scroll-area-viewport]');
            if (viewport) {
                if (itemEl) {
                    itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
                }
            } else {
                cartBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }, 40);
    };

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
        const rawTerm = searchTerm.trim();
        if (!rawTerm) {
            return inventory.filter(item => {
                if (selectedCategory === 'All') return true;
                if (selectedCategory === 'Discounts & Offers') return (item.discount || 0) > 0;
                return item.category === selectedCategory;
            }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        }

        const lowercasedTerm = rawTerm.toLowerCase();
        const cleanNum = rawTerm.replace(/^#/, '');
        const isNumericSearch = /^\d+$/.test(cleanNum);

        // Priority 1: Exact Item Code (e.g. "18" -> "#18") or exact full barcode match
        if (isNumericSearch) {
            const exactCodeMatches = inventory.filter(item => {
                const shortCode = item.id.length > 8 ? String(parseInt(item.id.slice(-4), 10) || '') : item.id;
                return shortCode === cleanNum || item.id === cleanNum;
            });

            if (exactCodeMatches.length > 0) {
                return exactCodeMatches;
            }
        }

        // Priority 2: Text search by name, category, or barcode
        return inventory.filter(item => {
            let matchesCategory = false;
            if (selectedCategory === 'All') {
                matchesCategory = true;
            } else if (selectedCategory === 'Discounts & Offers') {
                matchesCategory = (item.discount || 0) > 0;
            } else {
                matchesCategory = item.category === selectedCategory;
            }

            if (!matchesCategory) return false;

            const shortCode = item.id.length > 8 ? String(parseInt(item.id.slice(-4), 10) || '') : '';
            const matchesSearch = item.name.toLowerCase().includes(lowercasedTerm) ||
                item.category.toLowerCase().includes(lowercasedTerm) ||
                item.id.toLowerCase().includes(lowercasedTerm) ||
                (shortCode && (lowercasedTerm === shortCode || lowercasedTerm === `#${shortCode}`));

            return matchesSearch;
        }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
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

        // Auto-scroll cart down to show the newly added item at the bottom of the list
        scrollToRecentItem(item.id);
    };

    const removeFromCart = (itemId: string) => {
        // We use functional update on setCart to ensure we filter the latest cart
        setCart(prevCart => {
            const cartItem = prevCart.find(i => i.id === itemId);
            if (cartItem) {
                // We restore stock based on what is actually in the cart
                setInventory(prevInv => prevInv.map(i =>
                    i.id === itemId ? { ...i, stock: Number((i.stock + cartItem.quantity).toFixed(3)) } : i
                ));
            }
            return prevCart.filter(i => i.id !== itemId);
        });
    };

    const handleClearCart = () => {
        if (cart.length === 0) return;
        // Restore all items' stock to inventory
        setInventory(prev => prev.map(invItem => {
            const cartItem = cart.find(c => c.id === invItem.id);
            if (cartItem) {
                return { ...invItem, stock: Number((invItem.stock + cartItem.quantity).toFixed(3)) };
            }
            return invItem;
        }));
        setCart([]);
        setDiscount(0);
        setRedeemPoints(0);
        setSelectedCustomer(null);
        setCashReceived('');
        setSplitCash(0);
        setSplitOnline(0);
        toast({ title: t("Cart Cleared"), description: t("All items have been restored to inventory.") });
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
            setInventory(prev => prev.map(i => i.id === itemId ? { ...i, stock: Number((i.stock - 1).toFixed(3)) } : i));
            setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: Number((i.quantity + 1).toFixed(3)) } : i));

        } else {
            // Removing 1 (or deleting if 1)
            setCart(prevCart => {
                const cartItem = prevCart.find(i => i.id === itemId);
                if (!cartItem) return prevCart;

                if (cartItem.quantity > 1) {
                    // Restore 1 stock
                    setInventory(prevInv => prevInv.map(i => i.id === itemId ? { ...i, stock: Number((i.stock + 1).toFixed(3)) } : i));
                    return prevCart.map(i => i.id === itemId ? { ...i, quantity: Number((i.quantity - 1).toFixed(3)) } : i);
                } else {
                    // Remove Item
                    // Restore all stock
                    setInventory(prevInv => prevInv.map(i => i.id === itemId ? { ...i, stock: Number((i.stock + cartItem.quantity).toFixed(3)) } : i));
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

        // Round diff cleanly to 3 decimals to avoid floating quirks
        const cleanNewQty = Number(newQty.toFixed(3));
        const diff = Number((cleanNewQty - cartItem.quantity).toFixed(3));

        // Update inventory
        setInventory(prev => prev.map(i =>
            i.id === itemId ? { ...i, stock: Number((i.stock - diff).toFixed(3)) } : i
        ));

        setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity: cleanNewQty } : i));
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

    const processPayment = (
        shouldPrint = false,
        amountPaid?: number,
        overrideCustomer?: { name: string; phone: string },
        splitOverride?: { cash: number; online: number }
    ) => {
        if (cart.length === 0) return;

        const paid = amountPaid !== undefined ? amountPaid : total;
        const currentCustomer = overrideCustomer || selectedCustomer;
        const balance = total - paid;

        if (balance > 0 && !currentCustomer) {
            toast({ title: t("Customer Required"), description: t("Please select or add a customer to record credit."), variant: "destructive" });
            return;
        }

        // Determine effective payment method and split tenders
        let effectiveMethod = paymentMethod;
        let splitList: { method: 'Cash' | 'Online'; amount: number }[] | undefined = undefined;

        if (splitOverride || paymentMethod === 'Split') {
            effectiveMethod = 'Split';
            const cAmt = splitOverride?.cash !== undefined ? splitOverride.cash : splitCash;
            const oAmt = splitOverride?.online !== undefined ? splitOverride.online : splitOnline;
            splitList = [
                { method: 'Cash', amount: cAmt },
                { method: 'Online', amount: oAmt }
            ];
        }

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
${venueDetails?.name?.toUpperCase() || 'DEPARTMENTAL STORE'}
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
            return `${(item.name || '').slice(0, 15).padEnd(15)} ${item.quantity.toString().padEnd(8)} ${activeCurrency} ${finalItemTotal.toFixed(2)}`;
        }).join('\n')}
--------------------------------
Subtotal:         ${activeCurrency} ${subtotal.toFixed(2)}
Discount:        -${activeCurrency} ${effectiveDiscount.toFixed(2)}
Total Tax:        ${activeCurrency} ${vatAmount.toFixed(2)}
TOTAL AMOUNT:     ${activeCurrency} ${total.toFixed(2)}
--------------------------------
Payment Method: ${effectiveMethod === 'Split' && splitList ? `Split (Cash: ${activeCurrency} ${splitList[0].amount.toFixed(2)} + Online: ${activeCurrency} ${splitList[1].amount.toFixed(2)})` : effectiveMethod}
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
                hsnCode: ci.hsnCode,
                instruction: ci.discount ? `Discount: ${ci.discount}%` : '',
            } as OrderItem)),
            subtotal: subtotal,
            discount: effectiveDiscount,
            vatPercentage: venueDetails?.vatPercentage || 0,
            vatAmount: vatAmount,
            total: total,
            paymentMethod: effectiveMethod,
            splitPayments: splitList,
            receiptPreview: receiptPreviewText,
            timestamp: new Date(),
            orderType: 'Store-Pickup',
            createdAt: new Date(),
            completedAt: new Date(),
            customerDetails: currentCustomer ? {
                name: currentCustomer.name,
                phone: currentCustomer.phone,
                address: customers.find(c => c.phone === currentCustomer.phone)?.address || '',
                companyName: customers.find(c => c.phone === currentCustomer.phone)?.companyName || (currentCustomer as any).companyName || undefined,
                gstin: customers.find(c => c.phone === currentCustomer.phone)?.gstin || (currentCustomer as any).gstin || undefined,
            } : null,
            cashierId: currentUser?.id,
            cashierName: currentUser?.name,
            shiftId: getActiveShift()?.id,
        };

        // Inventory is already updated in real-time interactions
        setBills([...bills, newBill]);

        // Log to active shift session
        logShiftActivity({
            type: 'sale',
            title: `Sale Bill #${billId.slice(-6)}`,
            description: `${newBill.orderItems.length} items sold (${effectiveMethod})`,
            amount: total,
            paymentMethod: effectiveMethod,
            referenceId: billId,
        });

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
                            balance: Number(((c.balance || 0) + (balance > 0 ? balance : 0)).toFixed(2)),
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
                    balance: balance > 0 ? Number(balance.toFixed(2)) : 0,
                    loyaltyPoints: pointsEarned
                };
                setCustomers([...customers, newCustomer]);
            }
        }

        setCart([]);
        setDiscount(0);
        setRedeemPoints(0);
        setCashReceived('');
        setLastCompletedBill(newBill);
        setWhatsAppMobile(currentCustomer?.phone || '');
        setIsBillSuccessOpen(true);
        const successMsg = balance > 0
            ? `${t("Payment Successful")}. ${activeCurrency} ${balance.toFixed(2)} ${t("added to customer credit")}.`
            : t("Payment Successful");
        toast({ title: t("Success"), description: successMsg });
    };

    // Real-Time Amount Matcher for Counter QR Standee
    useEffect(() => {
        if (!isCounterStandeeListening) {
            if (counterTimerRef.current) clearTimeout(counterTimerRef.current);
            setIsCounterVerified(false);
            setCounterVerifiedUtr('');
            return;
        }

        const unsubscribe = subscribeToAmountMatch(total, async (payload) => {
            if (isCounterVerified) return;
            setIsCounterVerified(true);
            setCounterVerifiedUtr(payload.utr);

            try {
                await triggerSoundboxAlert(total, {
                    enabled: venueDetails?.upiSoundboxEnabled ?? true,
                    voice: venueDetails?.upiSoundboxVoice || 'en',
                });
            } catch {}

            counterTimerRef.current = setTimeout(() => {
                processPayment(pendingPrintAfterUpi, total, selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone } : undefined);
                setIsCounterStandeeListening(false);
            }, 1400);
        });

        return () => {
            unsubscribe();
            if (counterTimerRef.current) clearTimeout(counterTimerRef.current);
        };
    }, [isCounterStandeeListening, total, pendingPrintAfterUpi, selectedCustomer, venueDetails]);

    // Keyboard POS Hotkeys (F1-F11, Esc)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === 'F2' || e.key === 'F4') {
                e.preventDefault();
                setIsCustomerPopoverOpen(prev => {
                    const next = !prev;
                    if (next) {
                        setTimeout(() => customerSearchInputRef.current?.focus(), 60);
                    }
                    return next;
                });
            } else if (e.key === 'F3') {
                e.preventDefault();
                if (cart.length > 0) {
                    const activeEl = document.activeElement;
                    const currentIndex = cart.findIndex(i => qtyInputRefs.current[i.id] === activeEl);
                    let targetIndex = cart.length - 1; // Default to most recently added/bottom item

                    // If an item's quantity is already focused, cycle backwards to the previous item
                    if (currentIndex !== -1) {
                        targetIndex = currentIndex > 0 ? currentIndex - 1 : cart.length - 1;
                    } else if (lastAddedItemIdRef.current) {
                        const lastIdx = cart.findIndex(i => i.id === lastAddedItemIdRef.current);
                        if (lastIdx !== -1) targetIndex = lastIdx;
                    }

                    const targetItem = cart[targetIndex];
                    if (targetItem) {
                        const inputEl = qtyInputRefs.current[targetItem.id];
                        if (inputEl) {
                            inputEl.focus();
                            inputEl.select();
                            inputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }
                }
            } else if (e.key === 'F7') {
                e.preventDefault();
                if (cart.length > 0) handleClearCart();
            } else if (e.key === 'F8') {
                e.preventDefault();
                if (cart.length > 0) handleHoldBill();
            } else if (e.key === 'F9') {
                e.preventDefault();
                if (savedCarts.length > 0) handleRetrieveBill(savedCarts[0]);
            } else if (e.key === 'F10') {
                e.preventDefault();
                if (cart.length > 0) {
                    if (paymentMethod === 'Cash') {
                        setIsPaymentDialogOpen(true);
                    } else if (paymentMethod === 'Split') {
                        processPayment(true, total, undefined, { cash: splitCash, online: splitOnline });
                    } else {
                        const upiMode = venueDetails?.upiMode || 'standee';
                        setPendingPrintAfterUpi(true);
                        if (upiMode === 'screen') {
                            setIsUpiModalOpen(true);
                        } else {
                            setIsCounterStandeeListening(true);
                        }
                    }
                }
            } else if (e.key === 'F11') {
                e.preventDefault();
                if (cart.length > 0) {
                    if (paymentMethod === 'Online') {
                        const upiMode = venueDetails?.upiMode || 'standee';
                        setPendingPrintAfterUpi(false);
                        if (upiMode === 'screen') {
                            setIsUpiModalOpen(true);
                        } else {
                            setIsCounterStandeeListening(true);
                        }
                    } else {
                        setIsPaymentDialogOpen(true);
                    }
                }
            } else if (e.key === 'Escape') {
                setIsPaymentDialogOpen(false);
                setIsUpiModalOpen(false);
                setIsCounterStandeeListening(false);
                setIsSalesReturnOpen(false);
                setIsCashDrawerOpen(false);
                setIsHistoryDialogOpen(false);
                setIsCustomerPopoverOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, savedCarts, paymentMethod, total, splitCash, splitOnline]);

    const handlePrint = (bill: Bill, amountPaid?: number) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const paid = amountPaid !== undefined ? amountPaid : bill.total;
        const balance = bill.total - paid;

        // Group GST rates for Indian supermarket tax breakdown
        const gstBreakdown: Record<number, { taxable: number; cgst: number; sgst: number; totalTax: number }> = {};
        bill.orderItems.forEach(item => {
            const rate = item.taxRate || 0;
            const lineTotal = item.price * item.quantity;
            const taxable = rate > 0 ? lineTotal / (1 + rate / 100) : lineTotal;
            const taxAmount = lineTotal - taxable;
            const halfTax = taxAmount / 2;
            if (!gstBreakdown[rate]) {
                gstBreakdown[rate] = { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 };
            }
            gstBreakdown[rate].taxable += taxable;
            gstBreakdown[rate].cgst += halfTax;
            gstBreakdown[rate].sgst += halfTax;
            gstBreakdown[rate].totalTax += taxAmount;
        });

        const gstRates = Object.keys(gstBreakdown).map(Number).sort((a, b) => a - b);
        const hasGst = gstRates.some(r => r > 0);
        const isB2B = Boolean(bill.customerDetails?.gstin);

        const itemsHtml = bill.orderItems.map(item => `
            <tr>
                <td style="padding: 4px 0;">
                    <div style="font-weight: 600;">${item.name}</div>
                    ${item.hsnCode ? `<div style="font-size: 10px; color: #444;">HSN: ${item.hsnCode} | GST: ${item.taxRate || 0}%</div>` : ''}
                    <small style="color: #666;">${item.quantity} x MRP Rs. ${item.price.toFixed(2)}</small>
                </td>
                <td style="text-align: right; vertical-align: bottom; font-weight: bold;">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        const receiptHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${bill.id}</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 10px; color: #000; }
                    .header { text-align: center; margin-bottom: 10px; }
                    .header h1 { margin: 4px 0; font-size: 18px; text-transform: uppercase; font-weight: 900; }
                    .header p { margin: 2px 0; font-size: 11px; }
                    .invoice-badge { text-align: center; font-weight: bold; font-size: 12px; margin: 6px 0; padding: 2px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; letter-spacing: 1px; }
                    .divider { border-top: 1px dashed #000; margin: 8px 0; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    .totals { margin-top: 8px; }
                    .totals div { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 3px; font-size: 12px; }
                    .gst-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
                    .gst-table th, .gst-table td { padding: 2px 1px; }
                    .footer { text-align: center; margin-top: 15px; font-size: 11px; font-weight: bold; }
                    @media print { body { width: 80mm; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${venueDetails?.name || 'SUPERMARKET'}</h1>
                    <p>${venueDetails?.address || ''}</p>
                    ${venueDetails?.contactNumber ? `<p>Phone: ${venueDetails.contactNumber}</p>` : ''}
                    ${venueDetails?.gstin ? `<p><strong>GSTIN:</strong> ${venueDetails.gstin}</p>` : ''}
                    ${venueDetails?.fssaiNumber ? `<p><strong>FSSAI Lic:</strong> ${venueDetails.fssaiNumber}</p>` : ''}
                    ${venueDetails?.state ? `<p><strong>State:</strong> ${venueDetails.state}</p>` : ''}
                    ${venueDetails?.tagline ? `<p><i>${venueDetails.tagline}</i></p>` : ''}
                    ${venueDetails?.receiptHeader ? `<div style="margin-top: 4px; font-weight: bold; font-size: 11px;">${venueDetails.receiptHeader}</div>` : ''}
                </div>
                
                <div class="invoice-badge">
                    ${isB2B ? 'TAX INVOICE (B2B)' : 'RETAIL INVOICE'}
                </div>

                <div style="font-size: 11px; display: flex; justify-content: space-between; margin-bottom: 3px;">
                    <span><strong>Bill:</strong> ${bill.id}</span>
                    <span>${format(new Date(bill.timestamp), 'dd/MM/yyyy HH:mm')}</span>
                </div>

                ${bill.customerDetails ? `
                <div style="font-size: 11px; margin-bottom: 6px; padding: 4px; background: #f8f8f8; border: 1px dotted #ccc;">
                    <div><strong>Customer:</strong> ${bill.customerDetails.companyName ? `${bill.customerDetails.companyName} (${bill.customerDetails.name})` : bill.customerDetails.name}</div>
                    ${bill.customerDetails.phone ? `<div><strong>Phone:</strong> ${bill.customerDetails.phone}</div>` : ''}
                    ${bill.customerDetails.gstin ? `<div><strong>GSTIN:</strong> ${bill.customerDetails.gstin}</div>` : ''}
                    ${bill.customerDetails.address ? `<div><strong>Address:</strong> ${bill.customerDetails.address}</div>` : ''}
                </div>
                ` : ''}

                <div class="divider"></div>
                <table>
                    <thead>
                        <tr style="border-bottom: 1px solid #000;">
                            <th style="text-align: left; padding-bottom: 3px;">Item / Description</th>
                            <th style="text-align: right; padding-bottom: 3px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div class="divider"></div>
                
                <div class="totals">
                    <div><span>Subtotal:</span><span>${activeCurrency} ${bill.subtotal.toFixed(2)}</span></div>
                    ${bill.discount > 0 ? `<div><span>Discount:</span><span>-${activeCurrency} ${bill.discount.toFixed(2)}</span></div>` : ''}
                    ${bill.vatAmount > 0 ? `<div><span>GST Total:</span><span>${activeCurrency} ${bill.vatAmount.toFixed(2)}</span></div>` : ''}
                    <div style="font-size: 16px; margin-top: 4px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0;">
                        <span>TOTAL AMOUNT:</span><span>${activeCurrency} ${bill.total.toFixed(2)}</span>
                    </div>
                    
                    <div style="margin-top: 4px;"><span>Amount Paid:</span><span>${activeCurrency} ${paid.toFixed(2)}</span></div>
                    
                    ${balance > 0 ? `
                    <div style="margin-top: 2px; color: #ff0000; font-weight: 900; border: 1px dashed #000; padding: 4px; text-align: center;">
                        <span>BALANCE DUE (CREDIT): -${activeCurrency} ${balance.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    
                    ${paid > bill.total ? `
                    <div style="margin-top: 2px;"><span>Change Returned:</span><span>${activeCurrency} ${(paid - bill.total).toFixed(2)}</span></div>
                    ` : ''}
                </div>

                ${hasGst ? `
                <div class="divider"></div>
                <div style="font-size: 10px; font-weight: bold; text-align: center; margin-bottom: 3px; letter-spacing: 0.5px;">
                    GST TAX BREAKDOWN (INTRA-STATE)
                </div>
                <table class="gst-table">
                    <thead>
                        <tr style="border-bottom: 1px dotted #000; font-size: 9px;">
                            <th style="text-align: left;">Rate</th>
                            <th style="text-align: right;">Taxable</th>
                            <th style="text-align: right;">CGST</th>
                            <th style="text-align: right;">SGST</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${gstRates.map(rate => {
                            const row = gstBreakdown[rate];
                            return `
                            <tr>
                                <td>${rate}%</td>
                                <td style="text-align: right;">${row.taxable.toFixed(2)}</td>
                                <td style="text-align: right;">${row.cgst.toFixed(2)}</td>
                                <td style="text-align: right;">${row.sgst.toFixed(2)}</td>
                                <td style="text-align: right; font-weight: bold;">${row.totalTax.toFixed(2)}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                ` : ''}

                <div class="divider"></div>
                ${venueDetails?.customMessage ? `<div style="text-align: center; margin-bottom: 8px; font-size: 10px;">${venueDetails.customMessage}</div><div class="divider"></div>` : ''}
                ${bill.paymentMethod === 'Split' && bill.splitPayments ? `
                <div style="font-size: 11px; margin-bottom: 5px;">
                  <span style="font-weight: bold;">Payment: SPLIT TENDER</span><br/>
                  ${bill.splitPayments.map(p => `&bull; ${p.method}: ${activeCurrency} ${p.amount.toFixed(2)}<br/>`).join('')}
                </div>
                ` : `<p style="font-size: 11px; margin: 3px 0;">Payment: <strong>${bill.paymentMethod}</strong></p>`}
                
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
        <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-5 p-3 lg:p-4 overflow-hidden">
            {/* Items Section */}
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <Button variant="outline" className="h-14 rounded-2xl gap-2 font-bold border-2 min-w-[120px]" onClick={() => setIsHistoryDialogOpen(true)}>
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] uppercase opacity-70">{t("Today's Bills")}</span>
                            <span className="text-lg font-black">{bills.filter(b => new Date(b.timestamp).toDateString() === new Date().toDateString()).length}</span>
                        </div>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-14 rounded-2xl gap-2 font-bold border-2 border-primary/20 hover:border-primary text-primary min-w-[110px]"
                        onClick={() => setIsSalesReturnOpen(true)}
                        title={t("Sales Return & Restock")}
                    >
                        <RotateCcw className="h-4 w-4" />
                        <span className="text-xs uppercase font-black">{t("Returns")}</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-14 rounded-2xl gap-2 font-bold border-2 border-emerald-500/20 hover:border-emerald-500 text-emerald-600 min-w-[125px]"
                        onClick={() => setIsCashDrawerOpen(true)}
                        title={t("Cash Drawer Reconciliation & Z-Report")}
                    >
                        <Wallet className="h-4 w-4" />
                        <span className="text-xs uppercase font-black">{t("Cash Drawer")}</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-14 rounded-2xl gap-2 font-bold border-2 border-blue-500/20 hover:border-blue-500 text-blue-600 min-w-[130px]"
                        onClick={() => {
                            setInventory(DEPARTMENTAL_STORE_CATALOG);
                            try {
                                localStorage.setItem('inventory', JSON.stringify(DEPARTMENTAL_STORE_CATALOG));
                            } catch (e) {}
                            toast({
                                title: t("Catalog Loaded!"),
                                description: t("Loaded 28 official Indian Departmental Store items with live stock, barcodes & GST.")
                            });
                        }}
                        title={t("Load full Indian Departmental Store inventory catalog")}
                    >
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        <span className="text-xs uppercase font-black">{t("Load Catalog")}</span>
                    </Button>
                    <div className="relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder={t("Scan Barcode or Search items (F1)...")}
                            className="pl-12 h-14 bg-card/50 border-none shadow-sm focus-visible:ring-primary/40 text-lg rounded-2xl font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchTerm) {
                                    const cleanTerm = searchTerm.toLowerCase().trim();
                                    const cleanNum = cleanTerm.replace(/^#/, '');
                                    // First try exact match by full barcode or short code (e.g. "18" or "#18" or "8901030000018")
                                    const exactMatch = inventory.find(i => {
                                        const shortCode = i.id.length > 8 ? String(parseInt(i.id.slice(-4), 10) || '') : i.id;
                                        return i.id.toLowerCase() === cleanTerm ||
                                            shortCode === cleanNum ||
                                            (shortCode && (cleanTerm === shortCode || cleanTerm === `#${shortCode}`));
                                    });
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

                {/* Categories - Fully visible without clipping or scrollbar */}
                <div className="w-full flex flex-wrap items-center gap-2 py-0.5">
                    {categories.map((category) => {
                        const isOOS = categoryStatus[category];
                        return (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? "default" : "secondary"}
                                onClick={() => setSelectedCategory(category)}
                                size="sm"
                                className={cn(
                                    "rounded-xl px-3.5 h-9 font-bold transition-all text-xs shadow-sm",
                                    selectedCategory === category
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/20 scale-[1.02]"
                                        : isOOS
                                            ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30"
                                            : "bg-secondary/80 text-secondary-foreground hover:bg-primary/10 hover:text-primary"
                                )}
                            >
                                {category}
                                {isOOS && <span className="ml-1.5 text-[9px] uppercase font-black bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded whitespace-nowrap">Out of Stock</span>}
                            </Button>
                        );
                    })}
                </div>

                <ScrollArea className="flex-grow rounded-3xl border border-border/50 bg-card/20 backdrop-blur-sm">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4">
                        {filteredItems.length > 0 ? filteredItems.map(item => (
                            <Card
                                key={item.id}
                                className={cn(
                                    "relative group cursor-pointer border border-border/40 shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 rounded-2xl overflow-hidden active:scale-[0.99] flex flex-col justify-between min-h-[195px]",
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
                                <CardContent className="p-4 flex flex-col h-full justify-between gap-2.5">
                                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                        <Badge variant={item.stock < 10 ? "destructive" : "secondary"} className="font-bold rounded-lg shadow-sm">
                                            {item.stock} {item.unit}
                                        </Badge>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                            <Tag className={cn("h-3 w-3 shrink-0", item.stock <= 0 ? "text-destructive" : item.stock < 10 ? "text-orange-500" : "text-primary")} />
                                            <span
                                                className={cn(
                                                    "text-[10px] uppercase tracking-wider font-bold max-w-[115px] truncate",
                                                    item.stock <= 0 ? "text-destructive" : item.stock < 10 ? "text-orange-500" : "text-muted-foreground"
                                                )}
                                                title={item.category}
                                            >
                                                {item.category}
                                            </span>
                                            {item.id && (
                                                <span
                                                    className="text-[10px] font-mono font-bold text-muted-foreground/80 bg-muted/70 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-border/40 shadow-2xs shrink-0"
                                                    title={`${t("Item Code")}: #${item.id.length > 8 ? (parseInt(item.id.slice(-4), 10) || item.id) : item.id} | ${t("Barcode")}: ${item.id}`}
                                                >
                                                    <ScanBarcode className="h-2.5 w-2.5 opacity-60 text-primary shrink-0" />
                                                    {item.id.length > 8 ? `#${parseInt(item.id.slice(-4), 10) || item.id.slice(-4)}` : item.id}
                                                </span>
                                            )}
                                            {item.stock > 0 && item.stock < 10 && (
                                                <span className="text-[10px] font-black text-orange-500 animate-pulse ml-auto bg-orange-500/10 px-1.5 py-0.5 rounded-sm shrink-0">
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
                                                            {activeCurrency} {(item.price || 0).toFixed(2)}
                                                        </span>
                                                        <span className="text-[10px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded-md">
                                                            -{item.discount}%
                                                        </span>
                                                    </div>
                                                    <span className="text-2xl font-black text-primary drop-shadow-sm">
                                                        {activeCurrency} {((item.price || 0) * (1 - item.discount / 100)).toFixed(2)}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-2xl font-black text-primary drop-shadow-sm">MRP {activeCurrency} {(item.price || 0).toFixed(2)}</span>
                                            )}
                                        </div>
                                        <div
                                            className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-primary/30 hover:shadow-lg p-2.5 rounded-xl text-white transform transition-transform duration-200 hover:rotate-90 hover:scale-110 active:scale-95 cursor-pointer shrink-0"
                                            title={t("Add to Bill")}
                                        >
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
            <Card className="w-full lg:w-[420px] xl:w-[430px] 2xl:w-[450px] shrink-0 flex flex-col h-full bg-card/40 backdrop-blur-md border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden max-h-full">
                <CardHeader className="p-3 sm:p-4 pb-1 shrink-0">
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
                                                        <span className="text-xs text-muted-foreground">{sc.items.length} items â€¢ {format(sc.timestamp, 'p')}</span>
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
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-primary px-2" onClick={handleHoldBill} disabled={cart.length === 0} title={t("Hold Bill (F8)")}>
                                <div className="bg-muted p-1 rounded-lg">
                                    <Package className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-xs font-bold">{t("Hold")}</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 transition-colors"
                                onClick={handleClearCart}
                                disabled={cart.length === 0}
                                title={t("Void / Clear Cart (F7)")}
                            >
                                <div className="bg-destructive/10 text-destructive p-1 rounded-lg">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-xs font-bold text-destructive">{t("Void")} <kbd className="text-[10px] opacity-60 ml-0.5">F7</kbd></span>
                            </Button>
                            <Badge variant="outline" className="text-sm px-2 py-0.5 rounded-lg">
                                {Number(cart.reduce((s, i) => s + i.quantity, 0).toFixed(2))} {t("Items")}
                            </Badge>
                        </div>
                    </CardTitle>
                    {/* Customer Selection */}
                    <div className="mt-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-bold text-muted-foreground">{t("Customer")}</span>
                            </div>
                            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border text-muted-foreground">F2</kbd>
                        </div>
                        <Popover open={isCustomerPopoverOpen} onOpenChange={(open) => {
                            setIsCustomerPopoverOpen(open);
                            if (open) setTimeout(() => customerSearchInputRef.current?.focus(), 60);
                        }}>
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
                                            ref={customerSearchInputRef}
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
                                    <span className="text-[10px] font-bold text-primary uppercase">{t("Loyalty")}</span>
                                    <span className="text-sm font-black text-primary">{selectedCustomer.loyaltyPoints || 0} PTS</span>
                                </div>
                                {Boolean(selectedCustomer.balance && selectedCustomer.balance > 0) && (
                                    <div className="flex flex-col items-center px-2 py-0.5 bg-destructive/10 rounded-lg border border-destructive/20">
                                        <span className="text-[9px] font-bold text-destructive uppercase tracking-wider">{t("Due Khata")}</span>
                                        <span className="text-xs font-black text-destructive">{activeCurrency} {(selectedCustomer.balance || 0).toFixed(2)}</span>
                                    </div>
                                )}
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

                <CardContent className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 pt-1 gap-1.5 overflow-hidden">
                    <ScrollArea className="flex-1 min-h-[60px] -mr-1 pr-2">
                        <div className="space-y-2">
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
                                    <ShoppingCart className="h-20 w-20 mb-6 animate-bounce" />
                                    <p className="text-lg font-bold">{t("Your cart is empty")}</p>
                                    <p className="text-sm">{t("Click on items to add them here")}</p>
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div
                                        id={`cart-item-${item.id}`}
                                        key={item.id}
                                        className={cn(
                                            "group relative flex items-center gap-4 p-3 bg-background/40 hover:bg-background/80 rounded-2xl border border-border/40 hover:border-primary/30 transition-all duration-300",
                                            recentlyAddedId === item.id && "ring-2 ring-primary border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.01]"
                                        )}
                                    >
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h4 className="font-extrabold text-[15px] leading-tight text-foreground truncate">{item.name}</h4>
                                                <div className="flex flex-col items-end">
                                                    {(item.discount && item.discount > 0) ? (
                                                        <>
                                                            <span className="text-[10px] text-muted-foreground line-through decoration-destructive/50">{activeCurrency} {((item.price || 0) * item.quantity).toFixed(2)}</span>
                                                            <span className="flex-shrink-0 font-black text-primary text-[15px]">{activeCurrency} {(((item.price || 0) * item.quantity) * (1 - item.discount / 100)).toFixed(2)}</span>
                                                        </>
                                                    ) : (
                                                        <span className="flex-shrink-0 font-black text-primary text-[15px]">{activeCurrency} {((item.price || 0) * item.quantity).toFixed(2)}</span>
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
                                                        ref={el => { qtyInputRefs.current[item.id] = el; }}
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            const num = parseFloat(val);
                                                            if (!isNaN(num)) {
                                                                setItemQuantity(item.id, num);
                                                            } else if (val === '') {
                                                                setItemQuantity(item.id, 0);
                                                            }
                                                        }}
                                                        onFocus={(e) => e.target.select()}
                                                        onClick={(e) => (e.target as HTMLInputElement)?.select()}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                searchInputRef.current?.focus();
                                                            } else if (e.key === 'ArrowUp') {
                                                                e.preventDefault();
                                                                updateQuantity(item.id, 1);
                                                                setTimeout(() => (e.target as HTMLInputElement)?.select(), 10);
                                                            } else if (e.key === 'ArrowDown') {
                                                                e.preventDefault();
                                                                updateQuantity(item.id, -1);
                                                                setTimeout(() => (e.target as HTMLInputElement)?.select(), 10);
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            if (!item.quantity || item.quantity <= 0) removeFromCart(item.id);
                                                        }}
                                                        className="w-14 h-7 text-center text-sm font-black text-primary bg-transparent border-none p-0 focus-visible:ring-1 focus-visible:ring-primary/40 rounded selection:bg-primary selection:text-white"
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
                            <div ref={cartBottomRef} className="h-1" />
                        </div>
                    </ScrollArea>

                    <div className={cn("space-y-2 pt-2 border-t border-border/50 shrink-0 mt-auto", paymentMethod === 'Cash' && "space-y-1 pt-1")}>
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/30 rounded-xl">
                            <Button
                                variant="ghost"
                                className={cn(
                                    "flex items-center justify-center gap-1.5 h-9 rounded-lg transition-all font-bold text-xs",
                                    paymentMethod === 'Online'
                                        ? "bg-background text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-background/50"
                                )}
                                onClick={() => setPaymentMethod('Online')}
                            >
                                <CreditCard className="h-3.5 w-3.5" />
                                {t("Online")}
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "flex items-center justify-center gap-1.5 h-9 rounded-lg transition-all font-bold text-xs",
                                    paymentMethod === 'Cash'
                                        ? "bg-background text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-background/50"
                                )}
                                onClick={() => setPaymentMethod('Cash')}
                            >
                                <Banknote className="h-3.5 w-3.5" />
                                {t("Cash")}
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "flex items-center justify-center gap-1.5 h-9 rounded-lg transition-all font-bold text-xs",
                                    paymentMethod === 'Split'
                                        ? "bg-background text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-background/50"
                                )}
                                onClick={() => {
                                    setPaymentMethod('Split');
                                    const half = parseFloat((total / 2).toFixed(2));
                                    setSplitCash(half);
                                    setSplitOnline(parseFloat((total - half).toFixed(2)));
                                }}
                            >
                                <Layers className="h-3.5 w-3.5" />
                                {t("Split")}
                            </Button>
                        </div>

                        {paymentMethod === 'Split' && (
                            <div className="p-2 bg-primary/5 rounded-xl border border-primary/20 space-y-1.5 animate-in fade-in-50">
                                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex justify-between">
                                    <span>{t("Split Tender Amounts")}</span>
                                    <span className="text-primary font-bold">{activeCurrency} {total.toFixed(2)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-0.5">
                                        <div className="text-[9px] font-bold text-emerald-600 uppercase">{t("Cash")}</div>
                                        <Input
                                            type="number"
                                            min="0"
                                            max={total}
                                            value={splitCash || ''}
                                            onChange={(e) => {
                                                const c = parseFloat(e.target.value) || 0;
                                                setSplitCash(c);
                                                setSplitOnline(Math.max(0, parseFloat((total - c).toFixed(2))));
                                            }}
                                            className="h-7 text-xs font-black bg-background text-right"
                                            placeholder="Cash"
                                        />
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-[9px] font-bold text-blue-600 uppercase">{t("UPI / Online")}</div>
                                        <Input
                                            type="number"
                                            min="0"
                                            max={total}
                                            value={splitOnline || ''}
                                            onChange={(e) => {
                                                const o = parseFloat(e.target.value) || 0;
                                                setSplitOnline(o);
                                                setSplitCash(Math.max(0, parseFloat((total - o).toFixed(2))));
                                            }}
                                            className="h-7 text-xs font-black bg-background text-right"
                                            placeholder="UPI"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'Online' && (
                            <div className="flex items-center justify-between p-2.5 bg-primary/5 rounded-xl border border-primary/20 text-xs animate-in fade-in-50">
                                <div className="flex items-center gap-2 font-bold text-primary text-[11px]">
                                    {venueDetails?.upiMode === 'screen' ? <QrCode className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                                    <span>
                                        {venueDetails?.upiMode === 'screen'
                                            ? t("Dynamic On-Screen QR Mode")
                                            : t("Counter QR Standee (Auto-Detect)")}
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        if (cart.length === 0) {
                                            toast({ title: t("Cart is empty"), description: t("Please add items to cart before generating QR code."), variant: "destructive" });
                                            return;
                                        }
                                        setPendingPrintAfterUpi(false);
                                        setIsUpiModalOpen(true);
                                    }}
                                    className="h-6 px-2 text-[10px] font-black rounded-lg bg-primary/10 border-primary/30 text-primary hover:bg-primary hover:text-white"
                                    title={t("Display Dynamic On-Screen QR Code")}
                                >
                                    <QrCode className="h-3 w-3 mr-1" />
                                    {t("Show QR")}
                                </Button>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    type="number"
                                    placeholder={t("Apply Discount (%)")}
                                    className="pl-8 h-8 bg-background/50 border-none rounded-xl font-bold text-xs text-right pr-3"
                                    min="0"
                                    max="100"
                                    value={discount || ''}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="space-y-1 px-1">
                            <div className="flex justify-between text-xs font-bold text-muted-foreground px-0.5">
                                <span className="uppercase text-[10px] tracking-wider">{t("Subtotal")}</span>
                                <span className="text-foreground font-mono">{activeCurrency} {subtotal.toFixed(2)}</span>
                            </div>
                            {effectiveDiscount > 0 && (
                                <div className="flex justify-between text-xs font-bold text-destructive px-0.5">
                                    <span className="uppercase text-[10px] tracking-wider">{t("Discount")}</span>
                                    <span className="font-mono">-{activeCurrency} {effectiveDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            {vatAmount > 0 && (
                                <div className="flex justify-between text-xs font-bold text-blue-600 px-0.5">
                                    <span className="uppercase text-[10px] tracking-wider">{t("GST Tax")}</span>
                                    <span className="font-mono">{activeCurrency} {vatAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center px-3.5 py-2 bg-primary rounded-xl shadow-lg shadow-primary/20 mt-1">
                                <span className="text-xs font-black text-white uppercase tracking-wider">{t("Total Payable")}</span>
                                <span className="text-2xl font-black text-white leading-none tracking-tight">{activeCurrency} {total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <Button
                                variant="outline"
                                className="h-12 text-xs font-black rounded-xl bg-primary/5 border-2 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary transition-all flex items-center justify-center gap-1.5 shadow-sm group"
                                disabled={cart.length === 0}
                                onClick={() => {
                                    if (paymentMethod === 'Cash') {
                                        setIsPaymentDialogOpen(true);
                                    } else if (paymentMethod === 'Split') {
                                        processPayment(true, total, undefined, { cash: splitCash, online: splitOnline });
                                    } else {
                                        const upiMode = venueDetails?.upiMode || 'standee';
                                        setPendingPrintAfterUpi(true);
                                        if (upiMode === 'screen') {
                                            setIsUpiModalOpen(true);
                                        } else {
                                            setIsCounterStandeeListening(true);
                                        }
                                    }
                                }}
                            >
                                <Printer className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                <span>{t("Print & Save")} <kbd className="text-[10px] opacity-60 ml-0.5">F10</kbd></span>
                            </Button>
                            <Button
                                className="h-12 text-xs font-black rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all bg-primary hover:bg-orange-600 text-white flex items-center justify-center gap-1.5 border-2 border-primary"
                                disabled={cart.length === 0}
                                onClick={() => {
                                    if (paymentMethod === 'Cash') {
                                        setIsPaymentDialogOpen(true);
                                    } else if (paymentMethod === 'Split') {
                                        processPayment(false, total, undefined, { cash: splitCash, online: splitOnline });
                                    } else {
                                        const upiMode = venueDetails?.upiMode || 'standee';
                                        setPendingPrintAfterUpi(false);
                                        if (upiMode === 'screen') {
                                            setIsUpiModalOpen(true);
                                        } else {
                                            setIsCounterStandeeListening(true);
                                        }
                                    }
                                }}
                            >
                                <Check className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                <span>{t("Pay")} <kbd className="text-[10px] opacity-70 ml-0.5">F11</kbd></span>
                            </Button>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 opacity-70">
                            <span className="flex items-center gap-1"><Keyboard className="h-2.5 w-2.5" /> {t("Hotkeys")}:</span>
                            <span className="space-x-1 font-mono text-[9px]">
                                <kbd className="px-1 py-0.5 bg-muted rounded border border-border">F1</kbd><span>{t("Search")}</span>
                                <kbd className="px-1 py-0.5 bg-muted rounded border border-border">F2</kbd><span>{t("Customer")}</span>
                                <kbd className="px-1 py-0.5 bg-muted rounded border border-border">F3</kbd><span>{t("Qty")}</span>
                                <kbd className="px-1 py-0.5 bg-muted rounded border border-border">F7</kbd><span>{t("Void")}</span>
                                <kbd className="px-1 py-0.5 bg-muted rounded border border-border">F8</kbd><span>{t("Hold")}</span>
                                <kbd className="px-1 py-0.5 bg-muted rounded border border-border">F10</kbd><span>{t("Print")}</span>
                                <kbd className="px-1 py-0.5 bg-muted rounded border border-border">F11</kbd><span>{t("Pay")}</span>
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <PaymentDialog
                isOpen={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
                total={total}
                receiptPreview=""
                onPaymentSuccess={(paid, details, splitDetails) => {
                    processPayment(false, paid, details, splitDetails);
                    setIsPaymentDialogOpen(false);
                }}
                onNavigate={() => { }}
                currency={activeCurrency}
                isCashOnly={false}
                initialMode={paymentMethod}
                initialCustomer={selectedCustomer}
                venueDetails={venueDetails}
            />

            <UpiPaymentModal
                isOpen={isUpiModalOpen}
                onOpenChange={setIsUpiModalOpen}
                total={total}
                currency={activeCurrency}
                storeVpa={venueDetails?.upiId}
                merchantName={venueDetails?.upiMerchantName || venueDetails?.name}
                soundboxEnabled={venueDetails?.upiSoundboxEnabled ?? true}
                soundboxVoice={venueDetails?.upiSoundboxVoice || 'en'}
                onPaymentVerified={() => {
                    setIsUpiModalOpen(false);
                    processPayment(pendingPrintAfterUpi, total, selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone } : undefined);
                }}
            />

            {/* COUNTER STANDEE LISTENING DIALOG (DEFAULT UPI MODE) */}
            <Dialog open={isCounterStandeeListening} onOpenChange={setIsCounterStandeeListening}>
                <DialogContent className="max-w-md p-6 rounded-3xl border-2 shadow-2xl bg-card">
                    <DialogHeader className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-2">
                            <span className="p-2 bg-primary/10 rounded-xl text-primary">
                                <Store className="h-6 w-6" />
                            </span>
                            <DialogTitle className="text-xl font-black">
                                {t("Counter QR Standee Payment")}
                            </DialogTitle>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                            {t("Customer scans your counter paper standee (Paytm/PhonePe/GPay) & enters the amount")}
                        </p>
                    </DialogHeader>

                    {isCounterVerified ? (
                        /* SUCCESS STATE */
                        <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 border-4 border-emerald-500/30 shadow-lg animate-bounce">
                                <CheckCircle2 className="h-12 w-12" />
                            </div>

                            <div className="space-y-1">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-black uppercase tracking-wider">
                                    <ShieldCheck className="h-4 w-4" />
                                    {t("Payment Received via Standee")}
                                </div>
                                <p className="text-3xl font-black text-emerald-600 pt-1">
                                    {activeCurrency} {total.toFixed(2)}
                                </p>
                                <p className="text-xs font-mono font-bold text-muted-foreground">
                                    UTR: {counterVerifiedUtr}
                                </p>
                            </div>

                            <Button
                                onClick={() => {
                                    if (counterTimerRef.current) clearTimeout(counterTimerRef.current);
                                    processPayment(pendingPrintAfterUpi, total, selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone } : undefined);
                                    setIsCounterStandeeListening(false);
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 rounded-xl text-sm shadow-md"
                            >
                                {t("Complete Bill Now")}
                            </Button>
                        </div>
                    ) : (
                        /* ACTIVE LISTENING STATE */
                        <div className="space-y-4 pt-2">
                            {/* Amount to Pay Banner */}
                            <div className="text-center py-4 bg-primary/5 rounded-2xl border border-primary/20">
                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                    {t("Ask Customer to Pay This Exact Amount")}
                                </p>
                                <p className="text-4xl font-black text-primary pt-1">
                                    {activeCurrency} {total.toFixed(2)}
                                </p>
                            </div>

                            {/* Live Radar Listening Indicator */}
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-2xl border border-border/60 text-xs font-bold">
                                <div className="flex items-center gap-2.5">
                                    <span className="relative flex h-3.5 w-3.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                                    </span>
                                    <div>
                                        <div className="text-foreground">{t("Listening for incoming payment...")}</div>
                                        <div className="text-[10px] text-muted-foreground font-normal">{t("Auto-completes the second customer pays")}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Simulator Test Trigger */}
                            <div className="space-y-2 pt-1">
                                <Button
                                    type="button"
                                    onClick={() => simulateCounterStandeePayment(total)}
                                    className="w-full h-11 border-dashed border-2 font-black text-xs gap-2 rounded-xl bg-primary/5 hover:bg-primary/10 border-primary/40 text-primary transition-all"
                                >
                                    <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                                    {t("⚡ Test: Simulate Customer Pay")} {activeCurrency} {total.toFixed(2)}
                                </Button>

                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setIsCounterStandeeListening(false);
                                            setIsUpiModalOpen(true);
                                        }}
                                        className="text-xs font-bold text-muted-foreground hover:text-foreground h-8"
                                    >
                                        <QrCode className="h-3.5 w-3.5 mr-1 text-primary" />
                                        {t("Show Screen QR Instead")}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setIsCounterStandeeListening(false);
                                            processPayment(pendingPrintAfterUpi, total, selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone } : undefined);
                                        }}
                                        className="text-xs font-bold text-muted-foreground hover:text-foreground h-8"
                                    >
                                        {t("Manual Mark Paid")}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <SalesReturnDialog
                isOpen={isSalesReturnOpen}
                onOpenChange={setIsSalesReturnOpen}
                bills={bills}
                inventory={inventory}
                setInventory={setInventory}
                customers={customers}
                setCustomers={setCustomers}
                currency={activeCurrency}
                venueDetails={venueDetails}
            />

            <CashDrawerDialog
                isOpen={isCashDrawerOpen}
                onOpenChange={setIsCashDrawerOpen}
                bills={bills}
                expenses={expenses}
                currency={activeCurrency}
                venueDetails={venueDetails}
                currentUser={currentUser}
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
                                                <td className="p-2 text-right font-black">{activeCurrency} {bill.total.toFixed(2)}</td>
                                                <td className="p-2 text-center text-xs uppercase">{bill.paymentMethod}</td>
                                                <td className="p-2 text-center space-x-1">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePrint(bill)} title="Print Receipt">
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => sendWhatsAppBill(bill, venueDetails, undefined, activeCurrency)}
                                                        title="Send via WhatsApp"
                                                    >
                                                        <MessageSquare className="h-4 w-4" />
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

            {/* 1-Click Bill Completion & Digital WhatsApp Dispatch Modal */}
            <Dialog open={isBillSuccessOpen} onOpenChange={setIsBillSuccessOpen}>
                <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl">
                    <DialogHeader className="text-center pb-2">
                        <div className="mx-auto w-14 h-14 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                            <Check className="h-8 w-8 stroke-[3]" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight text-center">
                            Payment Completed!
                        </DialogTitle>
                        <div className="text-sm font-semibold text-muted-foreground text-center">
                            Bill #{lastCompletedBill?.id} &bull; Total: <span className="text-primary font-black text-base">{activeCurrency} {(lastCompletedBill?.total || 0).toFixed(2)}</span>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="p-3 bg-muted/30 rounded-2xl border border-border/50 text-xs space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Customer:</span>
                                <span className="font-bold">{lastCompletedBill?.customerDetails?.name || 'Walk-in Customer'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Payment Mode:</span>
                                <span className="font-bold uppercase">{lastCompletedBill?.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Items Count:</span>
                                <span className="font-bold">{lastCompletedBill?.orderItems.length} items</span>
                            </div>
                        </div>

                        {/* WhatsApp Target Phone Input */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider block">
                                Send to WhatsApp (Mobile No.)
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter 10-digit mobile..."
                                    value={whatsAppMobile}
                                    onChange={(e) => setWhatsAppMobile(e.target.value)}
                                    className="h-11 rounded-xl text-sm font-mono"
                                    maxLength={13}
                                />
                                <Button
                                    onClick={() => {
                                        if (lastCompletedBill) {
                                            sendWhatsAppBill(lastCompletedBill, venueDetails, whatsAppMobile, activeCurrency);
                                            setIsBillSuccessOpen(false);
                                        }
                                    }}
                                    className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md gap-1.5 shrink-0"
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    Send WhatsApp
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (lastCompletedBill) {
                                    handlePrint(lastCompletedBill);
                                }
                                setIsBillSuccessOpen(false);
                            }}
                            className="h-12 rounded-xl font-bold text-sm border-border/60 gap-1.5"
                        >
                            <Printer className="h-4 w-4" />
                            Print Receipt
                        </Button>
                        <Button
                            onClick={() => setIsBillSuccessOpen(false)}
                            className="h-12 rounded-xl font-black text-sm bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                        >
                            Next Customer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
