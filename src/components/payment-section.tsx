"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, Search, CreditCard, Banknote, ShoppingCart, Percent, Truck, Package, Tag, ScanBarcode, Users2, ChevronsUpDown, XCircle, Layers, RotateCcw, Wallet, Keyboard, QrCode, Store, Zap, ShieldCheck, CheckCircle2, Clock, PlusCircle, UserPlus } from 'lucide-react';
import { InventoryItem, Bill, OrderItem, Customer, PendingBill, CartItem, SavedCart, Expense, Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Printer, Check, MessageSquare, Sparkles, Receipt, History } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PaymentDialog } from './payment-dialog';
import { UpiPaymentModal } from './upi-payment-modal';
import { SalesReturnDialog } from './sales-return-dialog';
import { CashDrawerDialog } from './cash-drawer-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendWhatsAppBill } from '@/lib/whatsapp-bill';
import { DEPARTMENTAL_STORE_CATALOG } from '@/lib/departmental-catalog';
import { subscribeToAmountMatch, generateMockUtr } from '@/lib/payment-listener';
import { triggerSoundboxAlert, playScanBeep } from '@/lib/soundbox';
import { getActiveShift, logShiftActivity } from '@/lib/shift-manager';
import { syncCompletedBillToCloud, cleanVenueId } from '@/lib/firestore-sync';

interface PaymentSectionProps {
    inventory: InventoryItem[];
    setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    bills: Bill[];
    setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    currency: string;
    venueDetails: any | null;
    venueId?: string;
    venueName?: string;
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

export default function PaymentSection({ inventory, setInventory, bills, setBills, customers, setCustomers, currency, venueDetails, venueId, venueName, pendingBills, setPendingBills, cartSession, setCartSession, savedCarts, setSavedCarts, expenses = [], currentUser }: PaymentSectionProps) {
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

    // Global Hardware Barcode Scanner Gun Interceptor (Zero-click direct scanning)
    const barcodeBufferRef = useRef<string>('');
    const lastKeyStrokeTimeRef = useRef<number>(0);
    const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [lastScannedItem, setLastScannedItem] = useState<{ name: string; price: number } | null>(null);

    // Quick Add Customer modal state
    const [isQuickAddCustomerOpen, setIsQuickAddCustomerOpen] = useState(false);
    const [quickAddName, setQuickAddName] = useState('');
    const [quickAddPhone, setQuickAddPhone] = useState('');
    const [quickAddCompany, setQuickAddCompany] = useState('');
    const [quickAddGstin, setQuickAddGstin] = useState('');

    // Standee payment customer state
    const [standeeCustomerName, setStandeeCustomerName] = useState('');
    const [standeeCustomerPhone, setStandeeCustomerPhone] = useState('');
    const [standeeManualUtr, setStandeeManualUtr] = useState('');
    const standeeCustomerRef = useRef<{ name: string; phone: string } | null>(null);

    // Keep standee customer ref in sync
    useEffect(() => {
        if (standeeCustomerName.trim() || standeeCustomerPhone.trim()) {
            standeeCustomerRef.current = {
                name: standeeCustomerName.trim() || 'Valued Customer',
                phone: standeeCustomerPhone.trim() || ''
            };
        } else if (selectedCustomer) {
            standeeCustomerRef.current = {
                name: selectedCustomer.name,
                phone: selectedCustomer.phone
            };
        } else {
            standeeCustomerRef.current = null;
        }
    }, [standeeCustomerName, standeeCustomerPhone, selectedCustomer]);

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
        setTimeout(() => searchInputRef.current?.focus(), 50);
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
        setTimeout(() => searchInputRef.current?.focus(), 50);
    };

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        const term = customerSearch.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(term) ||
            c.phone.toLowerCase().includes(term)
        );
    }, [customers, customerSearch]);

    const handleOpenQuickAdd = (initialQuery?: string) => {
        const q = (initialQuery || '').trim();
        const digits = q.replace(/\D/g, '');
        if (digits.length >= 7) {
            setQuickAddPhone(digits);
            setQuickAddName('');
        } else {
            setQuickAddName(q);
            setQuickAddPhone('');
        }
        setQuickAddCompany('');
        setQuickAddGstin('');
        setIsQuickAddCustomerOpen(true);
    };

    const handleSaveQuickCustomer = () => {
        const trimmedName = quickAddName.trim();
        const trimmedPhone = quickAddPhone.trim();

        if (!trimmedName) {
            toast({ title: t("Name Required"), description: t("Please enter customer name."), variant: "destructive" });
            return;
        }
        if (!trimmedPhone) {
            toast({ title: t("Phone Required"), description: t("Please enter customer mobile number."), variant: "destructive" });
            return;
        }

        const existing = customers.find(c => c.phone === trimmedPhone);
        let customerToSelect: Customer;

        if (existing) {
            customerToSelect = {
                ...existing,
                name: trimmedName,
                companyName: quickAddCompany.trim() || existing.companyName,
                gstin: quickAddGstin.trim() || existing.gstin,
                lastSeen: new Date(),
            };
            setCustomers(customers.map(c => c.id === existing.id ? customerToSelect : c));
            toast({ title: t("Customer Updated"), description: `${trimmedName} (${trimmedPhone})` });
        } else {
            customerToSelect = {
                id: trimmedPhone,
                name: trimmedName,
                phone: trimmedPhone,
                companyName: quickAddCompany.trim() || undefined,
                gstin: quickAddGstin.trim() || undefined,
                firstSeen: new Date(),
                lastSeen: new Date(),
                totalVisits: 0,
                totalSpent: 0,
                balance: 0,
                loyaltyPoints: 0,
            };
            setCustomers([...customers, customerToSelect]);
            toast({ title: t("Customer Added to Database"), description: `${trimmedName} (${trimmedPhone})` });
        }

        setSelectedCustomer(customerToSelect);
        setIsQuickAddCustomerOpen(false);
        setCustomerSearch('');
    };

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
        setTimeout(() => searchInputRef.current?.focus(), 50);
    };

    // Helper: Lookup item by scanned barcode, EAN-13, internal ID, or short code
    const findItemByBarcode = useCallback((rawBarcode: string): InventoryItem | null => {
        const cleanTerm = rawBarcode.toLowerCase().trim();
        const cleanNum = cleanTerm.replace(/^#/, '');
        
        return inventory.find(i => {
            const shortCode = i.id.length > 8 ? String(parseInt(i.id.slice(-4), 10) || '') : i.id;
            const matchesId = i.id.toLowerCase() === cleanTerm;
            const matchesBarcode = i.barcode && i.barcode.toLowerCase() === cleanTerm;
            const matchesShortCode = shortCode === cleanNum || (shortCode && (cleanTerm === shortCode || cleanTerm === `#${shortCode}`));
            return matchesId || matchesBarcode || matchesShortCode;
        }) || null;
    }, [inventory]);

    // Handle scanned barcode execution from either hardware gun or search bar
    const processScannedBarcode = useCallback((barcode: string) => {
        const cleanCode = barcode.trim();
        if (!cleanCode) return;

        const matchedItem = findItemByBarcode(cleanCode);
        if (matchedItem) {
            addToCart(matchedItem);
            setSearchTerm('');
            // Play crisp supermarket scanner beep
            playScanBeep();
            setLastScannedItem({ name: matchedItem.name, price: matchedItem.price });
            setTimeout(() => setLastScannedItem(null), 2500);
            toast({
                title: t("Item Scanned"),
                description: `${matchedItem.name} ${t("added to cart.")} (${activeCurrency} ${matchedItem.price})`,
            });
        } else {
            // Not found in catalog: display in search bar so cashier can see and search manually
            setSearchTerm(cleanCode);
            toast({
                title: t("Barcode Not Found"),
                description: `${t("No item found matching barcode:")} ${cleanCode}`,
                variant: "destructive"
            });
        }

        // Always re-focus the search input for seamless next scan
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 60);
    }, [findItemByBarcode, addToCart, t, activeCurrency, toast]);

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
        setTimeout(() => searchInputRef.current?.focus(), 50);
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
        splitOverride?: { cash: number; online: number },
        customUtr?: string
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
            utr: customUtr || (counterVerifiedUtr ? counterVerifiedUtr : undefined),
        };

        // Inventory is already updated in real-time interactions
        setBills([...bills, newBill]);

        // Real-time Cloud Sync for Owner Mobile Companion
        try {
            const rawVId = venueId || 
                (typeof window !== 'undefined' ? localStorage.getItem('venueId') : null) || 
                venueDetails?.venueId || 
                venueDetails?.id || 
                venueDetails?.name || 
                venueName;
            
            const effectiveVenueId = cleanVenueId(rawVId);
            if (effectiveVenueId) {
                syncCompletedBillToCloud(effectiveVenueId, newBill).catch(err => {
                    console.error("[PaymentSection] Cloud bill sync failed:", err);
                });
            } else {
                console.warn("[PaymentSection] Could not determine venueId for cloud bill sync");
            }
        } catch (e) {
            console.error("[PaymentSection] Error preparing cloud bill sync:", e);
        }

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
        if (currentCustomer && (currentCustomer.name || currentCustomer.phone)) {
            const pointsEarned = Math.floor(paid * (venueDetails?.loyaltyRate || 0.01));
            const cleanPhone = (currentCustomer.phone || '').trim();
            const cleanName = (currentCustomer.name || '').trim();

            const existing = cleanPhone && cleanPhone !== 'N/A'
                ? customers.find(c => c.phone === cleanPhone)
                : (cleanName ? customers.find(c => c.name.toLowerCase() === cleanName.toLowerCase()) : null);

            if (existing) {
                const newCustomers = customers.map(c => {
                    if (c.id === existing.id) {
                        return {
                            ...c,
                            name: cleanName || c.name,
                            phone: cleanPhone || c.phone,
                            totalSpent: (c.totalSpent || 0) + paid,
                            totalVisits: (c.totalVisits || 0) + 1,
                            lastSeen: new Date(),
                            balance: Number(((c.balance || 0) + (balance > 0 ? balance : 0)).toFixed(2)),
                            loyaltyPoints: (c.loyaltyPoints || 0) - redeemPoints + pointsEarned
                        };
                    }
                    return c;
                });
                setCustomers(newCustomers);
            } else if (cleanName || (cleanPhone && cleanPhone !== 'N/A')) {
                const newCustomer: Customer = {
                    id: cleanPhone || `cust_${Date.now()}`,
                    name: cleanName || 'Valued Customer',
                    phone: cleanPhone || '',
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
                const cust = standeeCustomerRef.current || (selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone } : undefined);
                processPayment(pendingPrintAfterUpi, total, cust);
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
                } else {
                    searchInputRef.current?.focus();
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

    // Global Hardware Barcode Scanner Gun Interceptor (Zero-click direct scanning from anywhere)
    useEffect(() => {
        const handleGlobalBarcodeScan = (e: KeyboardEvent) => {
            // Ignore control keys, F-keys, and special navigation keys
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            if (e.key.startsWith('F') && e.key.length > 1) return;
            if (['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;

            const now = Date.now();
            const timeDiff = now - lastKeyStrokeTimeRef.current;
            lastKeyStrokeTimeRef.current = now;

            const activeEl = document.activeElement as HTMLElement | null;
            const isInputFocused = activeEl && (
                activeEl.tagName === 'INPUT' || 
                activeEl.tagName === 'TEXTAREA' || 
                activeEl.isContentEditable
            );
            const isSearchInputFocused = activeEl === searchInputRef.current;

            // Handle ENTER (End of barcode transmission from scanner gun)
            if (e.key === 'Enter') {
                const buffer = barcodeBufferRef.current.trim();
                if (buffer.length >= 3) {
                    barcodeBufferRef.current = '';
                    if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
                    
                    e.preventDefault();
                    e.stopPropagation();
                    processScannedBarcode(buffer);
                    return;
                } else if (isSearchInputFocused && searchTerm.trim()) {
                    const term = searchTerm.trim();
                    barcodeBufferRef.current = '';
                    e.preventDefault();
                    processScannedBarcode(term);
                    return;
                }
                barcodeBufferRef.current = '';
                return;
            }

            // Single printable character
            if (e.key.length === 1) {
                // If interval > 65ms, it's a new burst or slow manual typing -> reset buffer
                if (timeDiff > 65) {
                    barcodeBufferRef.current = e.key;
                } else {
                    barcodeBufferRef.current += e.key;
                }

                // If user is NOT in any text input:
                // Auto-route to search input and prevent losing keystrokes!
                if (!isInputFocused) {
                    // Auto-focus search input so subsequent characters are visibly echoed
                    searchInputRef.current?.focus();
                } else if (!isSearchInputFocused && timeDiff < 45 && barcodeBufferRef.current.length >= 3) {
                    // Fast barcode burst (< 45ms per char) while an unrelated input (e.g. qty, notes) was focused!
                    // Intercept and prevent corrupting the active input field:
                    e.preventDefault();
                    e.stopPropagation();
                }

                // Clear buffer if no Enter arrives within 250ms
                if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
                scannerTimeoutRef.current = setTimeout(() => {
                    barcodeBufferRef.current = '';
                }, 250);
            }
        };

        // Attach with useCapture = true to intercept before buttons or container elements
        window.addEventListener('keydown', handleGlobalBarcodeScan, true);
        return () => {
            window.removeEventListener('keydown', handleGlobalBarcodeScan, true);
            if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current);
        };
    }, [processScannedBarcode, searchTerm]);

    // Auto-focus search bar on mount so counter terminal is immediately ready
    useEffect(() => {
        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 120);
        return () => clearTimeout(timer);
    }, []);

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

    // Today's live sales calculation for the counter bar button
    const todayStats = useMemo(() => {
        const todayStr = new Date().toDateString();
        const todayBills = bills.filter(b => {
            const d = b.timestamp ? new Date(b.timestamp) : null;
            return d && d.toDateString() === todayStr;
        });
        const total = todayBills.reduce((s, b) => s + (Number(b.total) || 0), 0);
        return { total, count: todayBills.length };
    }, [bills]);

    // Period filter and summary calculation for Sales & Order History dialog
    const { filteredHistoryBills, periodSummary } = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

        const periodBills = bills.filter(b => {
            const bTime = new Date(b.timestamp).getTime();
            if (historyFilter === 'today') return bTime >= startOfToday;
            if (historyFilter === 'weekly') return bTime >= sevenDaysAgo;
            if (historyFilter === 'monthly') return bTime >= thirtyDaysAgo;
            return true;
        });

        let total = 0;
        let cash = 0;
        let online = 0;

        periodBills.forEach(b => {
            const bTotal = Number(b.total) || 0;
            total += bTotal;
            if (b.paymentMethod === 'Cash') {
                cash += bTotal;
            } else if (b.paymentMethod === 'Online') {
                online += bTotal;
            } else if (b.paymentMethod === 'Split' && b.splitPayments) {
                b.splitPayments.forEach((sp: any) => {
                    if (sp.method === 'Cash') cash += Number(sp.amount || 0);
                    if (sp.method === 'Online') online += Number(sp.amount || 0);
                });
            } else {
                online += bTotal;
            }
        });

        const searchLower = historySearchTerm.toLowerCase().trim();
        const searched = periodBills.filter(b => {
            if (!searchLower) return true;
            return (b.id || '').toLowerCase().includes(searchLower) ||
                (b.customerDetails?.name || '').toLowerCase().includes(searchLower) ||
                (b.paymentMethod || '').toLowerCase().includes(searchLower);
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const count = periodBills.length;
        const aov = count > 0 ? Math.round(total / count) : 0;
        const onlinePct = total > 0 ? Math.round((online / total) * 100) : 0;
        const cashPct = total > 0 ? Math.round((cash / total) * 100) : 0;

        return {
            filteredHistoryBills: searched,
            periodSummary: {
                total,
                count,
                cash,
                online,
                aov,
                onlinePct,
                cashPct
            }
        };
    }, [bills, historyFilter, historySearchTerm]);

    return (
        <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-5 p-3 lg:p-4 overflow-hidden">
            {/* Items Section */}
            <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <Button 
                        variant="outline" 
                        className="h-14 rounded-2xl px-3.5 gap-2.5 font-bold border-2 border-primary/30 hover:border-primary hover:bg-primary/5 min-w-[145px] transition-all cursor-pointer shadow-xs" 
                        onClick={() => setIsHistoryDialogOpen(true)}
                        title={t("View Today's Sales & Order History")}
                    >
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <History className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{t("Today's Sale")}</span>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-base font-black text-foreground">
                                    {activeCurrency} {todayStats.total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[11px] font-bold text-muted-foreground">({todayStats.count})</span>
                            </div>
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
                            className="pl-12 pr-36 h-14 bg-card/50 border-none shadow-sm focus-visible:ring-primary/40 text-lg rounded-2xl font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchTerm) {
                                    e.preventDefault();
                                    processScannedBarcode(searchTerm);
                                }
                            }}
                            autoFocus
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold pointer-events-none select-none shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <ScanBarcode className="h-4 w-4 text-emerald-500" />
                            <span>Gun Ready</span>
                        </div>
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

                                    <div className="flex items-end justify-between gap-3 mt-auto pt-2.5 border-t border-border/30">
                                        <div className="flex flex-col min-w-0 flex-1">
                                            {(item.discount && item.discount > 0) ? (
                                                <>
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="text-[11px] font-bold text-muted-foreground line-through decoration-destructive/50">
                                                            {activeCurrency} {(item.price || 0).toFixed(2)}
                                                        </span>
                                                        <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded">
                                                            -{item.discount}%
                                                        </span>
                                                    </div>
                                                    <span className="text-lg xl:text-xl font-black text-primary drop-shadow-sm tracking-tight truncate">
                                                        {activeCurrency} {((item.price || 0) * (1 - item.discount / 100)).toFixed(2)}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                                        {t("MRP")}
                                                    </span>
                                                    <span className="text-lg xl:text-xl font-black text-foreground drop-shadow-sm tracking-tight truncate">
                                                        {activeCurrency} {(item.price || 0).toFixed(2)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <div
                                            className="w-9 h-9 rounded-xl bg-primary hover:bg-orange-600 shadow-md hover:shadow-primary/30 flex items-center justify-center text-white shrink-0 hover:scale-110 active:scale-95 transition-all cursor-pointer"
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
                        <div className="flex items-center gap-1.5 w-full">
                            <Popover open={isCustomerPopoverOpen} onOpenChange={(open) => {
                                setIsCustomerPopoverOpen(open);
                                if (open) setTimeout(() => customerSearchInputRef.current?.focus(), 60);
                            }}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isCustomerPopoverOpen}
                                        className="w-full justify-between bg-background border border-border/50 rounded-xl h-10 px-3 font-bold text-sm truncate"
                                    >
                                        <span className="truncate">
                                            {selectedCustomer
                                                ? `${selectedCustomer.name} (${selectedCustomer.phone})`
                                                : t("Select / Search Customer")}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0 rounded-2xl shadow-2xl border-border/50">
                                    <div className="p-2 border-b border-border/50 bg-muted/30 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                ref={customerSearchInputRef}
                                                placeholder={t("Search by name or phone...")}
                                                className="pl-9 h-10 bg-background border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl font-bold text-xs"
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
                                                        } else if (customerSearch.trim()) {
                                                            setIsCustomerPopoverOpen(false);
                                                            handleOpenQuickAdd(customerSearch);
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                setIsCustomerPopoverOpen(false);
                                                handleOpenQuickAdd(customerSearch);
                                            }}
                                            className="h-10 px-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center gap-1"
                                            title="Add new customer"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>{t("New")}</span>
                                        </Button>
                                    </div>
                                    <ScrollArea className="h-[260px]">
                                        <div className="p-1.5 space-y-1">
                                            {/* Direct Add Button when searching */}
                                            {customerSearch.trim() && (
                                                <button
                                                    type="button"
                                                    className="w-full text-left p-2.5 rounded-xl text-xs font-bold bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center justify-between border border-primary/20 shadow-xs mb-1"
                                                    onClick={() => {
                                                        setIsCustomerPopoverOpen(false);
                                                        handleOpenQuickAdd(customerSearch);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Plus className="h-4 w-4 text-primary shrink-0" />
                                                        <span className="truncate">{t("Add")} "<strong>{customerSearch}</strong>"</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] bg-background border-primary/30 uppercase font-black shrink-0">
                                                        + Add
                                                    </Badge>
                                                </button>
                                            )}

                                            <button
                                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-primary/5 transition-colors flex items-center gap-2"
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
                                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-primary/10 transition-colors flex items-center gap-2 group"
                                                        onClick={() => {
                                                            setSelectedCustomer(c);
                                                            setIsCustomerPopoverOpen(false);
                                                            setCustomerSearch("");
                                                        }}
                                                    >
                                                        <div className={cn("flex-shrink-0 w-4 h-4 rounded-full border border-border flex items-center justify-center transition-all", selectedCustomer?.id === c.id && "bg-primary border-primary")}>
                                                            {selectedCustomer?.id === c.id && <Check className="h-3 w-3 text-white" />}
                                                        </div>
                                                        <div className="flex flex-col truncate">
                                                            <span className="truncate">{c.name}</span>
                                                            <span className="text-[10px] text-muted-foreground font-medium group-hover:text-primary/70">{c.phone}</span>
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center space-y-2">
                                                    <p className="text-xs text-muted-foreground font-medium">{t("No customer found for")} "{customerSearch}"</p>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => {
                                                            setIsCustomerPopoverOpen(false);
                                                            handleOpenQuickAdd(customerSearch);
                                                        }}
                                                        className="bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl h-8 px-3"
                                                    >
                                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                                        {t("Add as New Customer")}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                            {selectedCustomer ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setSelectedCustomer(null);
                                        toast({ title: t("Cleared"), description: t("Switched to Walk-in Customer") });
                                    }}
                                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive rounded-xl"
                                    title="Clear / switch to Walk-in"
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleOpenQuickAdd()}
                                    className="h-10 w-10 shrink-0 border-border/50 hover:border-primary hover:bg-primary/5 text-primary rounded-xl"
                                    title="Quick add new customer"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
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
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/40">
                            <Button
                                variant="ghost"
                                className={cn(
                                    "flex items-center justify-center gap-2 h-11 rounded-lg transition-all font-bold text-xs sm:text-sm",
                                    paymentMethod === 'Online'
                                        ? "bg-background text-primary shadow-sm border border-border/40"
                                        : "text-muted-foreground hover:bg-background/50"
                                )}
                                onClick={() => setPaymentMethod('Online')}
                            >
                                <CreditCard className="h-4 w-4" />
                                {t("Online")}
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "flex items-center justify-center gap-2 h-11 rounded-lg transition-all font-bold text-xs sm:text-sm",
                                    paymentMethod === 'Cash'
                                        ? "bg-background text-primary shadow-sm border border-border/40"
                                        : "text-muted-foreground hover:bg-background/50"
                                )}
                                onClick={() => setPaymentMethod('Cash')}
                            >
                                <Banknote className="h-4 w-4" />
                                {t("Cash")}
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "flex items-center justify-center gap-2 h-11 rounded-lg transition-all font-bold text-xs sm:text-sm",
                                    paymentMethod === 'Split'
                                        ? "bg-background text-primary shadow-sm border border-border/40"
                                        : "text-muted-foreground hover:bg-background/50"
                                )}
                                onClick={() => {
                                    setPaymentMethod('Split');
                                    const half = parseFloat((total / 2).toFixed(2));
                                    setSplitCash(half);
                                    setSplitOnline(parseFloat((total - half).toFixed(2)));
                                }}
                            >
                                <Layers className="h-4 w-4" />
                                {t("Split")}
                            </Button>
                        </div>

                        {paymentMethod === 'Split' && (
                            <div className="p-3 bg-card/90 rounded-2xl border-2 border-primary/30 space-y-2.5 shadow-sm animate-in fade-in-50">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Layers className="h-3.5 w-3.5 text-primary" />
                                        {t("Split Tender Amounts")}
                                    </span>
                                    <span className="text-xs font-black text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md">
                                        Total: {activeCurrency} {total.toFixed(2)}
                                    </span>
                                </div>

                                {/* 1-Tap Quick Split Shortcuts */}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const half = parseFloat((total / 2).toFixed(2));
                                            setSplitCash(half);
                                            setSplitOnline(parseFloat((total - half).toFixed(2)));
                                        }}
                                        className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-muted/60 hover:bg-muted text-foreground/80 border border-border/50 transition-all hover:text-primary active:scale-95"
                                    >
                                        ⚖️ 50 / 50
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSplitCash(total);
                                            setSplitOnline(0);
                                        }}
                                        className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 transition-all active:scale-95"
                                    >
                                        💵 Full Cash
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSplitCash(0);
                                            setSplitOnline(total);
                                        }}
                                        className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/30 transition-all active:scale-95"
                                    >
                                        📱 Full UPI
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    {/* Cash Input */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
                                            <Banknote className="h-3.5 w-3.5" />
                                            <span>{t("Cash")}</span>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                                                {activeCurrency}
                                            </span>
                                            <Input
                                                type="number"
                                                min="0"
                                                max={total}
                                                step="any"
                                                value={splitCash || ''}
                                                onChange={(e) => {
                                                    const c = parseFloat(e.target.value) || 0;
                                                    setSplitCash(c);
                                                    setSplitOnline(Math.max(0, parseFloat((total - c).toFixed(2))));
                                                }}
                                                className="h-11 pl-9 pr-3 text-base font-black font-mono bg-background text-right rounded-xl border-2 border-emerald-500/30 focus:border-emerald-500 shadow-inner"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    {/* Online / UPI Input */}
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-blue-500 uppercase tracking-wider">
                                            <QrCode className="h-3.5 w-3.5" />
                                            <span>{t("UPI / Online")}</span>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                                                {activeCurrency}
                                            </span>
                                            <Input
                                                type="number"
                                                min="0"
                                                max={total}
                                                step="any"
                                                value={splitOnline || ''}
                                                onChange={(e) => {
                                                    const o = parseFloat(e.target.value) || 0;
                                                    setSplitOnline(o);
                                                    setSplitCash(Math.max(0, parseFloat((total - o).toFixed(2))));
                                                }}
                                                className="h-11 pl-9 pr-3 text-base font-black font-mono bg-background text-right rounded-xl border-2 border-blue-500/30 focus:border-blue-500 shadow-inner"
                                                placeholder="0.00"
                                            />
                                        </div>
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
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    placeholder={t("Apply Discount (%)")}
                                    className="pl-9 h-10 bg-background/50 border border-border/40 rounded-xl font-bold text-sm text-right pr-3 focus:border-primary"
                                    min="0"
                                    max="100"
                                    value={discount || ''}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 px-0.5">
                            <div className="flex justify-between text-xs font-bold text-muted-foreground px-1">
                                <span className="uppercase text-[11px] tracking-wider">{t("Subtotal")}</span>
                                <span className="text-foreground font-mono text-sm">{activeCurrency} {subtotal.toFixed(2)}</span>
                            </div>
                            {effectiveDiscount > 0 && (
                                <div className="flex justify-between text-xs font-bold text-destructive px-1">
                                    <span className="uppercase text-[11px] tracking-wider">{t("Discount")}</span>
                                    <span className="font-mono text-sm">-{activeCurrency} {effectiveDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            {vatAmount > 0 && (
                                <div className="flex justify-between text-xs font-bold text-blue-500 px-1">
                                    <span className="uppercase text-[11px] tracking-wider">{t("GST Tax")}</span>
                                    <span className="font-mono text-sm">+{activeCurrency} {vatAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center px-4 py-2.5 bg-primary rounded-xl shadow-lg shadow-primary/25 mt-1">
                                <span className="text-xs font-black text-white uppercase tracking-wider">{t("Total Payable")}</span>
                                <span className="text-2xl xl:text-3xl font-black text-white leading-none tracking-tight font-mono">{activeCurrency} {total.toFixed(2)}</span>
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
                                    const cust = standeeCustomerRef.current || (selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone } : undefined);
                                    processPayment(pendingPrintAfterUpi, total, cust);
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

                            {/* Customer Information (Optional - saves to Customer Database) */}
                            <div className="p-3 bg-muted/40 rounded-2xl border border-border/60 space-y-2 text-left">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                        <Users2 className="h-3.5 w-3.5 text-primary" />
                                        <span>{t("Customer Info (Optional)")}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                        {t("Adds to Customer Database & WhatsApp bill")}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder={t("Customer Name (e.g. Bunty)")}
                                        value={standeeCustomerName}
                                        onChange={(e) => setStandeeCustomerName(e.target.value)}
                                        className="h-9 text-xs font-bold bg-background rounded-xl"
                                    />
                                    <Input
                                        placeholder={t("Mobile No. (e.g. 9876545432)")}
                                        value={standeeCustomerPhone}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setStandeeCustomerPhone(val);
                                            if (val.length >= 10) {
                                                const match = customers.find(c => c.phone.endsWith(val.slice(-10)));
                                                if (match && !standeeCustomerName) {
                                                    setStandeeCustomerName(match.name);
                                                }
                                            }
                                        }}
                                        className="h-9 text-xs font-bold bg-background rounded-xl font-mono"
                                        maxLength={13}
                                    />
                                </div>
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

                            {/* Optional UPI Ref / UTR for Accounting */}
                            <div className="space-y-1.5 text-left pt-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                        <Receipt className="h-3.5 w-3.5 text-primary" />
                                        <span>{t("UPI Ref / UTR")}</span>
                                        <span className="text-[10px] font-normal opacity-70">({t("Optional")})</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                        {t("For bank reconciliation")}
                                    </span>
                                </div>
                                <Input
                                    placeholder={t("e.g. 4821 or 12-digit UTR (leave blank to auto-generate)")}
                                    value={standeeManualUtr}
                                    onChange={(e) => setStandeeManualUtr(e.target.value)}
                                    className="h-10 text-xs font-mono font-bold bg-background rounded-xl border-border/60"
                                    maxLength={24}
                                />
                            </div>

                            {/* Production Payment Received Action */}
                            <div className="space-y-2 pt-1">
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setIsCounterStandeeListening(false);
                                        const cust = standeeCustomerRef.current || (selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone } : undefined);
                                        const finalUtr = standeeManualUtr.trim() || generateMockUtr();
                                        processPayment(pendingPrintAfterUpi, total, cust, undefined, finalUtr);
                                    }}
                                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm gap-2 rounded-xl shadow-lg shadow-emerald-600/25 active:scale-95 transition-all"
                                >
                                    <CheckCircle2 className="h-5 w-5 text-white" />
                                    {t("Payment Received — Complete Bill")} ({activeCurrency} {total.toFixed(2)})
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
                                            setPaymentMethod('Cash');
                                            setIsCashDrawerOpen(true);
                                        }}
                                        className="text-xs font-bold text-muted-foreground hover:text-foreground h-8"
                                    >
                                        <Banknote className="h-3.5 w-3.5 mr-1 text-amber-500" />
                                        {t("Switch to Cash")}
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
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-xl font-black flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                {historyFilter === 'today' ? t("Today's Sales & Orders") : historyFilter === 'weekly' ? t("This Week's Sales & Orders") : t("This Month's Sales & Orders")}
                            </DialogTitle>
                        </div>

                        <div className="flex flex-col gap-3 mt-3">
                            <Tabs defaultValue="today" value={historyFilter} onValueChange={(v) => setHistoryFilter(v as any)} className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="today" className="font-bold">{t("Today")}</TabsTrigger>
                                    <TabsTrigger value="weekly" className="font-bold">{t("This Week")}</TabsTrigger>
                                    <TabsTrigger value="monthly" className="font-bold">{t("This Month")}</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {/* Real-time Sales KPI Summary Banner */}
                            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-muted/50 border border-border/80">
                                <div className="flex flex-col p-2.5 rounded-xl bg-background border border-border/60 shadow-xs">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                        <Receipt className="h-3 w-3 text-primary" /> {t("Total Sales")}
                                    </span>
                                    <span className="text-lg font-black text-foreground mt-0.5">
                                        {activeCurrency} {periodSummary.total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                        {periodSummary.count} {t("bills")} &bull; AOV: {activeCurrency}{periodSummary.aov}
                                    </span>
                                </div>

                                <div className="flex flex-col p-2.5 rounded-xl bg-background border border-emerald-500/20 shadow-xs">
                                    <span className="text-[10px] uppercase font-bold text-emerald-600 flex items-center gap-1">
                                        <CreditCard className="h-3 w-3 text-emerald-600" /> {t("UPI / Online")}
                                    </span>
                                    <span className="text-lg font-black text-emerald-600 mt-0.5">
                                        {activeCurrency} {periodSummary.online.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                        {periodSummary.onlinePct}% {t("of total")}
                                    </span>
                                </div>

                                <div className="flex flex-col p-2.5 rounded-xl bg-background border border-amber-500/20 shadow-xs">
                                    <span className="text-[10px] uppercase font-bold text-amber-600 flex items-center gap-1">
                                        <Banknote className="h-3 w-3 text-amber-600" /> {t("Cash in Till")}
                                    </span>
                                    <span className="text-lg font-black text-amber-600 mt-0.5">
                                        {activeCurrency} {periodSummary.cash.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10px] font-semibold text-muted-foreground">
                                        {periodSummary.cashPct}% {t("of total")}
                                    </span>
                                </div>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("Search by Bill ID or Customer Name...")}
                                    className="pl-9 bg-muted/40 border-input h-10 rounded-xl"
                                    value={historySearchTerm}
                                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </DialogHeader>
                    <ScrollArea className="flex-1 mt-2">
                        <div className="space-y-2 p-1">
                            {filteredHistoryBills.length === 0 ? (
                                <div className="text-center text-muted-foreground py-10">{t("No orders found for this period.")}</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/70 text-muted-foreground font-bold sticky top-0 rounded-lg">
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
                                        {filteredHistoryBills.map(bill => (
                                            <tr key={bill.id} className="border-b hover:bg-muted/30 transition-colors">
                                                <td className="p-2 font-mono font-bold">{bill.id}</td>
                                                <td className="p-2 font-medium">{bill.customerDetails?.name || t('Walk-in')}</td>
                                                <td className="p-2">
                                                    <div className="flex flex-col">
                                                        <span>{format(new Date(bill.timestamp), 'PP')}</span>
                                                        <span className="text-xs text-muted-foreground">{format(new Date(bill.timestamp), 'p')}</span>
                                                    </div>
                                                </td>
                                                <td className="p-2 text-right font-black">{activeCurrency} {bill.total.toFixed(2)}</td>
                                                <td className="p-2 text-center text-xs uppercase font-semibold">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px]",
                                                        bill.paymentMethod === 'Cash' ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                                    )}>
                                                        {bill.paymentMethod}
                                                    </span>
                                                </td>
                                                <td className="p-2 text-center space-x-1">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-muted" onClick={() => handlePrint(bill)} title="Print Receipt">
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
                                            const cleanMobile = whatsAppMobile.trim();
                                            if (cleanMobile && cleanMobile.length >= 10 && !customers.some(c => c.phone.endsWith(cleanMobile.slice(-10)))) {
                                                const customerName = lastCompletedBill.customerDetails?.name || 'Customer';
                                                const newCust: Customer = {
                                                    id: cleanMobile,
                                                    name: customerName,
                                                    phone: cleanMobile,
                                                    firstSeen: new Date(),
                                                    lastSeen: new Date(),
                                                    totalVisits: 1,
                                                    totalSpent: lastCompletedBill.total || 0,
                                                    balance: 0,
                                                    loyaltyPoints: 0,
                                                };
                                                setCustomers(prev => [...prev, newCust]);
                                            }
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
                                setTimeout(() => searchInputRef.current?.focus(), 80);
                            }}
                            className="h-12 rounded-xl font-bold text-sm border-border/60 gap-1.5"
                        >
                            <Printer className="h-4 w-4" />
                            Print Receipt
                        </Button>
                        <Button
                            onClick={() => {
                                setIsBillSuccessOpen(false);
                                setTimeout(() => searchInputRef.current?.focus(), 80);
                            }}
                            className="h-12 rounded-xl font-black text-sm bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                        >
                            Next Customer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Quick Add Customer Modal */}
            <Dialog open={isQuickAddCustomerOpen} onOpenChange={setIsQuickAddCustomerOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <Users2 className="h-5 w-5 text-primary" />
                            {t("Quick Add Customer")}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground font-medium">
                            {t("Adds customer to Customer Database and selects them for this bill.")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground">{t("Customer Name")} *</label>
                            <Input
                                placeholder={t("e.g. Bunty / Rahul")}
                                value={quickAddName}
                                onChange={(e) => setQuickAddName(e.target.value)}
                                className="h-10 font-bold rounded-xl"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground">{t("Mobile Number")} *</label>
                            <Input
                                placeholder={t("e.g. 9876545432")}
                                value={quickAddPhone}
                                onChange={(e) => setQuickAddPhone(e.target.value)}
                                className="h-10 font-bold rounded-xl font-mono"
                                maxLength={13}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-muted-foreground">{t("Shop/Company (Optional)")}</label>
                                <Input
                                    placeholder={t("e.g. Bunty Traders")}
                                    value={quickAddCompany}
                                    onChange={(e) => setQuickAddCompany(e.target.value)}
                                    className="h-9 text-xs rounded-xl"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-muted-foreground">{t("GSTIN (Optional)")}</label>
                                <Input
                                    placeholder={t("15-digit GSTIN")}
                                    value={quickAddGstin}
                                    onChange={(e) => setQuickAddGstin(e.target.value.toUpperCase())}
                                    maxLength={15}
                                    className="h-9 text-xs font-mono rounded-xl uppercase"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsQuickAddCustomerOpen(false)}
                            className="flex-1 h-11 rounded-xl font-bold text-xs"
                        >
                            {t("Cancel")}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveQuickCustomer}
                            className="flex-1 h-11 rounded-xl font-black text-xs bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                        >
                            <Check className="mr-1.5 h-4 w-4" />
                            {t("Save & Select for Bill")}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
