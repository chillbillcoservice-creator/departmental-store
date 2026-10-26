'use client';

import * as React from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, Receipt, Package, Users2, Menu as MenuIcon, HelpCircle, Truck, CreditCard, PanelLeft, PanelTop, AlertTriangle, List, X, Palette, Settings, Headphones, LogOut, Clock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Order, Bill, Employee, Expense, InventoryItem, MenuCategory, Vendor, PendingBill, Customer, Attendance, Advance, CartItem, SavedCart } from '@/lib/types';
import { Logo } from "./icons";
import AdminDashboard from './admin-dashboard';
import StaffManagement from "./staff-management";
import ExpensesTracker from './expenses-tracker';
import InventoryManagement from './inventory-management';
import VendorManagement from './vendor-management';
import CustomerManagement from './customer-management';
import PaymentSection from './payment-section';
import { Separator } from '@/components/ui/separator';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import SetupWizard from './setup-wizard';
import NetworkStatusBadge from './network-status-badge';
import { ThemeToggle } from './theme-toggle';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { HelpDialog } from './help-dialog';
import { useFirestore } from '@/firebase';
import { writeBatch, doc, setDoc } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useThemeColor } from '@/contexts/theme-color-context';
import StaffLogin from './staff-login';
import { PosSettingsDialog } from './pos-settings-dialog';
import { SmartAudioTour } from './smart-audio-tour';
import { ShiftHandoverDialog } from './shift-handover-dialog';
import { SafeErrorBoundary } from './ui/error-boundary';
import { getOrStartActiveShift, formatDuration, getActiveShift } from '@/lib/shift-manager';
import type { TutorialLanguage, TutorialVoicePersona } from '@/lib/tutorial-voice';
import { getSavedVoicePersona, setSavedVoicePersona, getSavedTutorialLanguage, setSavedTutorialLanguage } from '@/lib/tutorial-voice';
import type { VenueDetails, OwnerDetails, PurchaseOrder, PurchaseOrderItem } from "@/lib/types";

interface MainLayoutProps {
  initialMenu: MenuCategory[];
  initialInventory: InventoryItem[];
  initialEmployees: Employee[];
  initialBills: Bill[];
  initialUser?: Employee | null;
  initialExpenses: Expense[];
  initialCustomers: Customer[];
  initialVendors: Vendor[];
  initialPendingBills: PendingBill[];
  initialVenueName: string;
  initialAttendance: Attendance[];
  initialAdvances: Advance[];
  setMenu: (menu: MenuCategory[]) => void;
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
  setPendingBills: React.Dispatch<React.SetStateAction<PendingBill[]>>;
  setAttendance: React.Dispatch<React.SetStateAction<Attendance[]>>;
  setAdvances: React.Dispatch<React.SetStateAction<Advance[]>>;
  setVenueName: (name: string) => void;
  initialCurrency: string;
  setCurrency: (currency: string) => void;
  venueDetails?: VenueDetails | null;
  ownerDetails?: OwnerDetails | null;
  initialLanguage: string;
  setLanguage: (lang: string) => void;
  setVenueDetails: (details: VenueDetails | null) => void;
}

export default function MainLayout({
  initialMenu,
  initialInventory,
  initialEmployees,
  initialBills,
  initialExpenses,
  initialCustomers,
  initialVendors,
  initialPendingBills,
  initialVenueName,
  initialAttendance,
  initialAdvances,
  setMenu,
  setInventory,
  setEmployees,
  setBills,
  setExpenses,
  setCustomers,
  setVendors,
  setPendingBills,
  setAttendance,
  setAdvances,
  setVenueName,
  initialCurrency,
  setCurrency,
  venueDetails,
  setVenueDetails,
  ownerDetails,
  initialUser,
}: MainLayoutProps) {
  const { t } = useLanguage();
  const db = useFirestore();
  const effectiveCurrency = (!initialCurrency || initialCurrency === '$') ? 'Rs.' : initialCurrency;
  const [currentUser, setCurrentUser] = useState<Employee | null>(initialUser ?? (initialEmployees[0] || null));
  const [isStaffLoginOpen, setIsStaffLoginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('payments');
  const [customerCreditLimit, setCustomerCreditLimit] = useState(10000);
  const [vendorCreditLimit, setVendorCreditLimit] = useState(50000);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const mainRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const notifiedItemsRef = useRef<Set<string>>(new Set());
  const notifiedVendorsRef = useRef<Set<string>>(new Set());
  const [layoutMode, setLayoutMode] = useState<'side' | 'top'>('side');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [alertingItem, setAlertingItem] = useState<{ item: InventoryItem; threshold: string } | null>(null);
  const { themeColor, setThemeColor, availableColors } = useThemeColor();

  // Shift Handover state
  const [isShiftHandoverOpen, setIsShiftHandoverOpen] = useState(false);
  const [liveShiftMinutes, setLiveShiftMinutes] = useState<number>(0);

  // Initialize or resume active shift session on login
  useEffect(() => {
    if (currentUser) {
      const shift = getOrStartActiveShift(currentUser);
      const updateTimer = () => {
        const diff = Math.max(1, Math.round((Date.now() - new Date(shift.openedAt).getTime()) / (1000 * 60)));
        setLiveShiftMinutes(diff);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Audio Guide & Tutorial Mode state
  const [tutorialModeEnabled, setTutorialModeEnabled] = useState(false);
  const [tutorialLanguage, setTutorialLanguage] = useState<TutorialLanguage>('hi');
  const [tutorialVoicePersona, setTutorialVoicePersona] = useState<TutorialVoicePersona>('puck');
  const [settingsInitialTab, setSettingsInitialTab] = useState<'upi' | 'appearance' | 'tutorial'>('upi');

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('chillbill_tutorial_mode');
      if (savedMode === 'true') {
        setTutorialModeEnabled(true);
      }
      setTutorialLanguage(getSavedTutorialLanguage());
      setTutorialVoicePersona(getSavedVoicePersona());
    } catch {}
  }, []);

  // Vendor Billing Cycle Notifications
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    initialVendors.forEach(vendor => {
      if (vendor.billingCycleDay) {
        // Find the next billing date
        let nextDate = new Date(today.getFullYear(), today.getMonth(), vendor.billingCycleDay);

        // Handle months with fewer days than the billing cycle day
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        if (vendor.billingCycleDay > lastDayOfMonth) {
          nextDate = new Date(today.getFullYear(), today.getMonth(), lastDayOfMonth);
        }

        // If the date has already passed this month, move to next month
        if (nextDate.getTime() < today.getTime() && today.getDate() !== nextDate.getDate()) {
          nextDate = new Date(today.getFullYear(), today.getMonth() + 1, vendor.billingCycleDay);
          const lastDayOfNextMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          if (vendor.billingCycleDay > lastDayOfNextMonth) {
            nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), lastDayOfNextMonth);
          }
        }

        const diffTime = nextDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const notificationKey = `${vendor.id}-${diffDays}-${todayStr}`;

        if (!notifiedVendorsRef.current.has(notificationKey)) {
          if (diffDays === 7) {
            toast({
              title: t("Vendor Payment Reminder"),
              description: `${t("Payment for")} ${vendor.name} ${t("is due in 7 days.")}`,
            });
            notifiedVendorsRef.current.add(notificationKey);
          } else if (diffDays === 1) {
            toast({
              title: t("Urgent: Vendor Payment"),
              description: `${t("Payment for")} ${vendor.name} ${t("is due tomorrow!")}`,
              variant: "destructive",
            });
            notifiedVendorsRef.current.add(notificationKey);
          } else if (diffDays === 0 && today.getDate() === nextDate.getDate()) {
            toast({
              title: t("Payment Due Today"),
              description: `${t("Payment for")} ${vendor.name} ${t("is due today!")}`,
              variant: "destructive",
            });
            notifiedVendorsRef.current.add(notificationKey);
          }
        }
      }
    });
  }, [initialVendors, t, toast]);

  // Cart State (Lifted)
  const [cartSession, setCartSession] = useState<{
    items: CartItem[];
    customer: Customer | null;
    discount: number;
    redeemPoints: number;
    paymentMethod: 'Cash' | 'Online' | 'Split';
    splitPayments?: { method: 'Cash' | 'Online'; amount: number }[];
  }>({
    items: [],
    customer: null,
    discount: 0,
    redeemPoints: 0,
    paymentMethod: 'Online'
  });
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>([]);

  useEffect(() => {
    try {
      const savedPOs = localStorage.getItem('purchaseOrders');
      if (savedPOs) {
        setPurchaseOrders(JSON.parse(savedPOs));
      }
    } catch (e) {
      console.error("Failed to load purchase orders", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('purchaseOrders', JSON.stringify(purchaseOrders));
    } catch (e) {
      console.error("Failed to save purchase orders", e);
    }
  }, [purchaseOrders]);

  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem('chillbill_layout_mode');
      if (savedLayout === 'top') {
        setLayoutMode('top');
      } else {
        // By default, always use 'side' (vertical sidebar on left: Main, Inventory, Expenses, etc.)
        setLayoutMode('side');
      }
    } catch {}
  }, []);

  const toggleLayout = () => {
    const newMode = layoutMode === 'side' ? 'top' : 'side';
    setLayoutMode(newMode);
    try {
      localStorage.setItem('chillbill_layout_mode', newMode);
      localStorage.setItem('layoutMode', newMode);
    } catch {}
  };

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor inventory levels and show notifications
  useEffect(() => {
    if (!initialInventory || initialInventory.length === 0) return;

    initialInventory.forEach(item => {
      if (!item.capacity || item.capacity <= 0) return;
      const stock = item.stock || 0;
      const capacity = item.capacity;

      const halfThreshold = capacity / 2;
      const quarterThreshold = capacity / 4;

      // Logic: notify if stock drops TO OR BELOW threshold
      // But we only want to notify once when it crosses.
      // We'll use the itemKey to track if we notified for a specific item at a specific threshold value.

      const checkThreshold = (val: number, label: string) => {
        const itemKey = `${item.id}_${label}`;
        if (stock <= val && !notifiedItemsRef.current.has(itemKey)) {
          // If it was already below, we might have missed it or just loaded.
          // But to be safe and avoid annoyance on load, we could check if previous stock was above.
          // However, simple notifiedRef is usually enough.
          setAlertingItem({ item, threshold: label });
          notifiedItemsRef.current.add(itemKey);
        } else if (stock > val && notifiedItemsRef.current.has(itemKey)) {
          // Reset if stock goes back above
          notifiedItemsRef.current.delete(itemKey);
        }
      };

      // Check 50%
      checkThreshold(halfThreshold, '50%');
      // Check 25%
      checkThreshold(quarterThreshold, '25%');

      // Keep existing 10 and 5 logic but maybe migrate them to dialog too if requested?
      // User said "When the stock depletion message currently appears at 10 and 5... ALSO trigger notifications... these notifications should include a popup dialog box"
      // This suggests 50% and 25% should be dialogs. 10 and 5 might stay toasts or become dialogs.
      // Given the requirement "include an option to 'Create order...'", maybe they all should be dialogs?
      // Let's make 10 and 5 also dialogs for consistency if that's what's implied.

      checkThreshold(10, '10u');
      checkThreshold(5, '5u');
      checkThreshold(0, '0u');
    });
  }, [initialInventory, toast]);

  const handleAddToList = (item: InventoryItem) => {
    if (!item.vendorId) {
      toast({ title: t("Vendor not assigned"), description: t("Please assign a vendor to this item first."), variant: "destructive" });
      return;
    }

    const vendor = initialVendors.find(v => v.id === item.vendorId);
    const vendorName = vendor ? vendor.name : t("Unknown Vendor");

    setPurchaseOrders(prev => {
      // Find a draft PO for this vendor
      const existingDraftIndex = prev.findIndex(po => po.vendorId === item.vendorId && po.status === 'Draft');

      const newItem: PurchaseOrderItem = {
        inventoryItemId: item.id,
        name: item.name,
        quantity: item.capacity - item.stock, // Default to restocking to full capacity
        unitCost: item.costPrice || 0,
        totalCost: (item.capacity - item.stock) * (item.costPrice || 0)
      };

      if (existingDraftIndex > -1) {
        const updatedPOs = [...prev];
        const draft = { ...updatedPOs[existingDraftIndex] };
        const items = [...draft.items];
        const existingItemIndex = items.findIndex(i => i.inventoryItemId === item.id);

        if (existingItemIndex > -1) {
          // Item already in list, maybe update quantity?
          // items[existingItemIndex].quantity += newItem.quantity;
          // items[existingItemIndex].totalCost = items[existingItemIndex].quantity * items[existingItemIndex].unitCost;
          // Actually, just notify it's already there
          toast({ title: t("Item already in list"), description: `${item.name} ${t("is already in your draft order for")} ${vendorName}.` });
          return prev;
        } else {
          items.push(newItem);
        }

        draft.items = items;
        draft.totalAmount = items.reduce((sum, i) => sum + i.totalCost, 0);
        updatedPOs[existingDraftIndex] = draft;
        toast({ title: t("Added to list"), description: `${item.name} ${t("added to draft order for")} ${vendorName}.` });
        return updatedPOs;
      } else {
        // Create new draft
        const newDraft: PurchaseOrder = {
          id: `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`,
          vendorId: item.vendorId!,
          vendorName: vendorName,
          date: new Date(),
          referenceNo: `DRAFT-${Date.now().toString().slice(-6)}`,
          items: [newItem],
          totalAmount: newItem.totalCost,
          status: 'Draft'
        };
        toast({ title: t("Draft order created"), description: `${t("Created new draft order for")} ${vendorName} ${t("with")} ${item.name}.` });
        return [...prev, newDraft];
      }
    });
    setAlertingItem(null);
  };

  const handleCreateImmediateOrder = (item: InventoryItem) => {
    if (!item.vendorId) {
      toast({ title: t("Vendor not assigned"), description: t("Please assign a vendor to this item first."), variant: "destructive" });
      return;
    }

    const vendor = initialVendors.find(v => v.id === item.vendorId);
    const vendorName = vendor ? vendor.name : t("Unknown Vendor");

    const newItem: PurchaseOrderItem = {
      inventoryItemId: item.id,
      name: item.name,
      quantity: item.capacity - item.stock,
      unitCost: item.costPrice || 0,
      totalCost: (item.capacity - item.stock) * (item.costPrice || 0)
    };

    const newPO: PurchaseOrder = {
      id: `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`,
      vendorId: item.vendorId!,
      vendorName: vendorName,
      date: new Date(),
      referenceNo: `PO-${Date.now().toString().slice(-6)}`,
      items: [newItem],
      totalAmount: newItem.totalCost,
      status: 'Ordered'
    };

    setPurchaseOrders(prev => [...prev, newPO]);
    toast({ title: t("Order Placed"), description: `${t("Purchase order")} ${newPO.referenceNo} ${t("placed for")} ${vendorName}.` });
    setAlertingItem(null);
  };

  const getTimezone = (currencyCode: string) => {
    switch (currencyCode) {
      case 'Rs.': return 'Asia/Kolkata';
      case 'Rs': return 'Asia/Kolkata'; // In case of variations
      case '$': return 'America/New_York'; // Default for USD
      case '€': return 'Europe/Paris'; // Default for Euro
      case '£': return 'Europe/London';
      case '¥': return 'Asia/Tokyo'; // Or China, but usually JPY is associated with strict time
      case 'AUD': return 'Australia/Sydney';
      case 'CAD': return 'America/Toronto';
      // Add more mappings as needed
      default: return undefined; // Use system timezone
    }
  };

  const { formattedTime, formattedDate } = useMemo(() => {
    const timeZone = getTimezone(initialCurrency);
    try {
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
        ...(timeZone && { timeZone })
      });

      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        ...(timeZone && { timeZone })
      });

      return {
        formattedTime: timeFormatter.format(currentTime),
        formattedDate: dateFormatter.format(currentTime)
      };
    } catch (e) {
      return {
        formattedTime: currentTime.toLocaleTimeString(),
        formattedDate: currentTime.toLocaleDateString()
      };
    }
  }, [currentTime, initialCurrency]);

  // Sync settings to Firestore whenever they change locally
  useEffect(() => {
    if (!db || !initialVenueName || !initialCurrency) return;

    const syncSettings = async () => {
      try {
        await setDoc(doc(db, "settings", "venue"), {
          venueName: initialVenueName,
          currency: effectiveCurrency,
          address: venueDetails?.address || '',
          contactNumber: venueDetails?.contactNumber || '',
          email: venueDetails?.email || '',
          tagline: venueDetails?.tagline || '',
          ownerName: ownerDetails?.name || '',
          ownerContact: ownerDetails?.contactNumber || '',
          ownerEmail: ownerDetails?.email || '',
        }, { merge: true });
      } catch (e) {
        console.error("Error syncing settings:", e);
      }
    };

    const timer = setTimeout(syncSettings, 1000);
    return () => clearTimeout(timer);
  }, [db, initialVenueName, initialCurrency, venueDetails, ownerDetails]);

  // Sync menu to Firestore whenever it changes locally
  useEffect(() => {
    if (!db || !initialMenu) return;

    const syncMenu = async () => {
      try {
        const batch = writeBatch(db);
        initialMenu.forEach(cat => {
          if (cat.id) {
            const docRef = doc(db, 'menu', cat.id);
            const safeCat = {
              ...cat,
              subcategories: cat.subcategories || []
            };
            batch.set(docRef, safeCat, { merge: true });
          }
        });
        await batch.commit();
      } catch (e) {
        console.error("Error syncing menu:", e);
      }
    };

    const timer = setTimeout(syncMenu, 1500);
    return () => clearTimeout(timer);
  }, [db, initialMenu]);

  // Sync pendingBills to Firestore whenever they change locally
  useEffect(() => {
    if (!db || !initialPendingBills) return;

    const syncPendingBills = async () => {
      try {
        const batch = writeBatch(db);
        initialPendingBills.forEach(pb => {
          if (pb.id && typeof pb.id === 'string') {
            const docRef = doc(db, 'pendingBills', pb.id);
            batch.set(docRef, pb, { merge: true });
          } else if (pb.id) {
            // Fallback for non-string IDs if any exist
            const stringId = String(pb.id);
            const docRef = doc(db, 'pendingBills', stringId);
            batch.set(docRef, pb, { merge: true });
          }
        });
        await batch.commit();
      } catch (e) {
        console.error("Error syncing pendingBills:", e);
      }
    };

    const timer = setTimeout(syncPendingBills, 2000);
    return () => clearTimeout(timer);
  }, [db, initialPendingBills]);

  useEffect(() => {
    try {
      const setupComplete = localStorage.getItem('setupComplete');
      if (!setupComplete) {
        setShowSetupWizard(true);
      }
    } catch (e) {
      console.error("Could not access localStorage", e);
      setShowSetupWizard(true);
    } finally {
      setIsCheckingSetup(false);
    }
  }, []);

  useEffect(() => {
    try {
      const savedCustomerLimit = localStorage.getItem('customerCreditLimit');
      const savedVendorLimit = localStorage.getItem('vendorCreditLimit');
      if (savedCustomerLimit) setCustomerCreditLimit(JSON.parse(savedCustomerLimit));
      if (savedVendorLimit) setVendorCreditLimit(JSON.parse(savedVendorLimit));
    } catch (e) {
      console.error("Could not parse credit limits from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('customerCreditLimit', JSON.stringify(customerCreditLimit));
    } catch (e) {
      console.error("Could not save customer credit limit to localStorage", e);
    }
  }, [customerCreditLimit]);

  useEffect(() => {
    try {
      localStorage.setItem('vendorCreditLimit', JSON.stringify(vendorCreditLimit));
    } catch (e) {
      console.error("Could not save vendor credit limit to localStorage", e);
    }
  }, [vendorCreditLimit]);

  useEffect(() => {
    mainRef.current?.focus();
  }, []);

  useEffect(() => {
    try {
      const savedColors = localStorage.getItem('categoryColors');
      if (savedColors) {
        setCategoryColors(JSON.parse(savedColors));
      }
    } catch (e) {
      console.error("Could not parse 'categoryColors' from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      if (Object.keys(categoryColors).length > 0) {
        localStorage.setItem('categoryColors', JSON.stringify(categoryColors));
      }
    } catch (e) {
      console.error("Could not save 'categoryColors' to localStorage", e);
    }
  }, [categoryColors]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMobileSheetOpen(false);
  }

  const handleSetupComplete = (data: any) => {
    try {
      localStorage.setItem('setupComplete', 'true');
      setVenueName(data.venue.name);
      setEmployees(prev => [...(data.employees || [])]);
      if (data.currency) {
        setCurrency(data.currency);
      }
      setVendors(data.vendors);
      localStorage.setItem('venueName', data.venue.name);
    } catch (e) {
      console.error("Could not access localStorage", e);
    }
    setShowSetupWizard(false);
  }

  if (isCheckingSetup) {
    return null;
  }

  if (showSetupWizard) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  const navItems = [
    { value: 'payments', label: t('Main'), icon: CreditCard },
    { value: 'inventory', label: t('Inventory'), icon: Package },
    { value: 'expenses', label: t('Expenses'), icon: Receipt },
    { value: 'customers', label: t('Customers'), icon: Users2 },
    { value: 'vendors', label: t('Vendors'), icon: Truck },
    { value: 'staff', label: t('Staff'), icon: Users },
    { value: 'admin', label: t('Admin'), icon: Shield },
  ];

  const renderNav = (isSheet = false) => (
    <TabsList className={cn(
      "p-0 h-auto bg-transparent flex",
      !isSheet ? "flex-row m-2" : "flex-col items-stretch w-full gap-1.5"
    )}>
      {navItems.map((item, index) => (
        <React.Fragment key={item.value}>
          <TabsTrigger
            value={item.value}
            className={cn(
              "px-3.5 py-2.5 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-2 data-[state=active]:border-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 rounded-xl flex items-center justify-start gap-3 transition-all duration-300 font-bold border-2 border-transparent",
              isSheet && "w-full"
            )}
            onClick={() => handleTabChange(item.value)}
          >
            <item.icon className="h-5 w-5 shrink-0" /> <span className="truncate">{item.label}</span>
          </TabsTrigger>
          {index < navItems.length - 1 && (
            <Separator
              orientation={!isSheet ? 'vertical' : 'horizontal'}
              className={cn(!isSheet ? "h-6 mx-1" : "w-full my-0.5 opacity-20")}
            />
          )}
        </React.Fragment>
      ))}
    </TabsList>
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b shrink-0">
        <div className="flex items-center gap-2 font-semibold">
          <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden mr-2">
                <MenuIcon className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-2">
              {renderNav(true)}
            </SheetContent>
          </Sheet>
          <Logo className="h-6 w-6" />
          <span className="text-lg font-bold truncate max-w-[150px] sm:max-w-xs">{initialVenueName}</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLayout}
            className="hidden md:flex"
            title={layoutMode === 'side' ? "Switch to Top Bar Layout" : "Switch to Left Sidebar"}
          >
            {layoutMode === 'side' ? <PanelTop className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </Button>

          <NetworkStatusBadge />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSettingsInitialTab('upi');
                    setIsSettingsOpen(true);
                  }}
                  title={t('Settings')}
                  className="rounded-xl hover:bg-muted"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('Store & POS Settings')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={tutorialModeEnabled ? "default" : "ghost"}
                  size="icon"
                  onClick={() => {
                    setSettingsInitialTab('tutorial');
                    setIsSettingsOpen(true);
                  }}
                  title={t('Audio Guide & Tutorial')}
                  className={cn(
                    "rounded-xl transition-all",
                    tutorialModeEnabled
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                      : "hover:bg-muted text-primary"
                  )}
                >
                  <Headphones className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('Audio Guide & Tutorial Mode')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setIsHelpOpen(true)}>
                  <HelpCircle />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('Help')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="text-sm text-foreground text-center font-semibold bg-muted px-3 py-1.5 rounded-lg shadow-inner min-w-[140px] flex flex-col leading-tight">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{formattedDate}</span>
            <span className="text-lg font-bold">{formattedTime}</span>
          </div>

          {currentUser && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStaffLoginOpen(true)}
                className="flex items-center gap-2 border-primary/30 hover:border-primary shadow-sm rounded-xl px-2.5 py-1.5 h-auto"
                title={t('Switch Profile / Quick Lock')}
              >
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow"
                  style={{ backgroundColor: currentUser.color || '#3b82f6' }}
                >
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col text-left leading-tight hidden sm:flex">
                  <span className="font-bold text-xs">{currentUser.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{currentUser.role}</span>
                    {liveShiftMinutes > 0 && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 py-0 rounded">
                        {formatDuration(liveShiftMinutes)}
                      </span>
                    )}
                  </div>
                </div>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsShiftHandoverOpen(true)}
                className="h-9 px-2.5 text-xs font-bold rounded-xl gap-1.5 shadow-sm"
                title={t('End Shift, View Summary Report & Log Out')}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{t('End Shift')}</span>
              </Button>
            </div>
          )}
        </div>
      </header>
      <DndProvider backend={HTML5Backend}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className={cn("flex-1 min-h-0 flex", layoutMode === 'top' ? "flex-col" : "flex-row overflow-hidden")}>
          {layoutMode === 'top' && (
            <div className="hidden md:flex justify-center border-b shrink-0">
              {renderNav(false)}
            </div>
          )}

          {layoutMode === 'side' && (
            <div className="hidden md:flex flex-col border-r w-52 shrink-0 bg-muted/10 overflow-y-auto">
              <div className="p-2">
                {renderNav(true)}
              </div>
            </div>
          )}

          <main ref={mainRef} className="flex-grow overflow-auto focus:outline-none" tabIndex={-1}>
            <TabsContent value="payments" className="m-0 p-0 h-full">
              <PaymentSection
                inventory={initialInventory}
                setInventory={setInventory}
                bills={initialBills}
                setBills={setBills}
                customers={initialCustomers}
                setCustomers={setCustomers}
                currency={effectiveCurrency}
                venueDetails={venueDetails || null}
                pendingBills={initialPendingBills}
                setPendingBills={setPendingBills}
                cartSession={cartSession}
                setCartSession={setCartSession}
                savedCarts={savedCarts}
                setSavedCarts={setSavedCarts}
                expenses={initialExpenses}
                currentUser={currentUser}
              />
            </TabsContent>
            <TabsContent value="inventory" className="m-0 p-0 h-full">
              <InventoryManagement
                inventory={initialInventory}
                setInventory={setInventory}
                menu={initialMenu}
                setMenu={setMenu}
                vendors={initialVendors}
                purchaseOrders={purchaseOrders}
                setPurchaseOrders={setPurchaseOrders}
                currency={effectiveCurrency}
                expenses={initialExpenses}
                setExpenses={setExpenses}
                setVendors={setVendors}
              />
            </TabsContent>
            <TabsContent value="customers" className="m-0 p-0 h-full">
              <CustomerManagement
                billHistory={initialBills}
                customers={initialCustomers}
                setCustomers={setCustomers}
                pendingBills={initialPendingBills}
                setPendingBills={setPendingBills}
                customerCreditLimit={customerCreditLimit}
                currency={effectiveCurrency}
              />
            </TabsContent>
            <TabsContent value="vendors" className="m-0 p-0 h-full">
              <VendorManagement
                vendors={initialVendors}
                setVendors={setVendors}
                pendingBills={initialPendingBills}
                setPendingBills={setPendingBills}
                vendorCreditLimit={vendorCreditLimit}
                expenses={initialExpenses}
                setExpenses={setExpenses}
                inventory={initialInventory}
                setInventory={setInventory}
                currency={effectiveCurrency}
                purchaseOrders={purchaseOrders}
                setPurchaseOrders={setPurchaseOrders}
                currentUser={currentUser}
              />
            </TabsContent>
            <TabsContent value="expenses" className="m-0 p-0 h-full">
              <ExpensesTracker
                expenses={initialExpenses}
                setExpenses={setExpenses}
                vendors={initialVendors}
                setVendors={setVendors}
                currency={effectiveCurrency}
                inventory={initialInventory}
                purchaseOrders={purchaseOrders}
                setPurchaseOrders={setPurchaseOrders}
              />
            </TabsContent>

            <TabsContent value="staff" className="m-0 p-0 h-full">
              <StaffManagement
                employees={initialEmployees}
                setEmployees={setEmployees}
                advances={initialAdvances}
                setAdvances={setAdvances}
                attendance={initialAttendance}
                setAttendance={setAttendance}
                currency={effectiveCurrency}
              />
            </TabsContent>
            <TabsContent value="admin" className="m-0 p-0 h-full">
              <AdminDashboard
                billHistory={initialBills}
                setBills={setBills}
                currentUser={currentUser}
                employees={initialEmployees}
                setEmployees={setEmployees}
                expenses={initialExpenses}
                setExpenses={setExpenses}
                inventory={initialInventory}
                setInventory={setInventory}
                purchaseOrders={purchaseOrders}
                setPurchaseOrders={setPurchaseOrders}
                vendors={initialVendors}
                setVendors={setVendors}
                customerCreditLimit={customerCreditLimit}
                setCustomerCreditLimit={setCustomerCreditLimit}
                vendorCreditLimit={vendorCreditLimit}
                setVendorCreditLimit={setVendorCreditLimit}
                onRerunSetup={() => setShowSetupWizard(true)}
                menu={initialMenu}
                setMenu={setMenu}
                venueName={initialVenueName}
                setVenueName={setVenueName}
                currency={effectiveCurrency}
                setCurrency={setCurrency}
                venueDetails={venueDetails || null}
                setVenueDetails={setVenueDetails}
              />            </TabsContent>
          </main>
        </Tabs>
      </DndProvider>
      <HelpDialog isOpen={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <SafeErrorBoundary name="PosSettingsDialog">
        <PosSettingsDialog
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          venueDetails={venueDetails || null}
          setVenueDetails={setVenueDetails}
          tutorialModeEnabled={tutorialModeEnabled}
          setTutorialModeEnabled={setTutorialModeEnabled}
          tutorialLanguage={tutorialLanguage}
          setTutorialLanguage={(lang) => {
            setTutorialLanguage(lang);
            setSavedTutorialLanguage(lang);
          }}
          tutorialVoicePersona={tutorialVoicePersona}
          setTutorialVoicePersona={(persona) => {
            setTutorialVoicePersona(persona);
            setSavedVoicePersona(persona);
          }}
          onNavigateToTab={(tab) => {
            handleTabChange(tab);
          }}
          initialTab={settingsInitialTab}
        />
      </SafeErrorBoundary>

      {/* Smart Ambient Audio Tour Assistant */}
      <SafeErrorBoundary name="SmartAudioTour">
        <SmartAudioTour
          isEnabled={tutorialModeEnabled}
          onDisable={() => {
            setTutorialModeEnabled(false);
            try { localStorage.setItem('chillbill_tutorial_mode', 'false'); } catch {}
            toast({
              title: t("Tutorial Mode Disabled"),
              description: t("You can re-enable the ambient audio guide from Settings anytime."),
            });
          }}
          activeTab={activeTab}
          language={tutorialLanguage}
          onLanguageChange={(lang) => {
            setTutorialLanguage(lang);
            setSavedTutorialLanguage(lang);
          }}
          voicePersona={tutorialVoicePersona}
          onVoicePersonaChange={(persona) => {
            setTutorialVoicePersona(persona);
            setSavedVoicePersona(persona);
          }}
          onOpenFullTutorial={() => {
            setSettingsInitialTab('tutorial');
            setIsSettingsOpen(true);
          }}
        />
      </SafeErrorBoundary>

      <AlertDialog open={!!alertingItem} onOpenChange={(open) => !open && setAlertingItem(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-6 top-6 rounded-full opacity-50 hover:bg-muted/50 hover:opacity-100 transition-all"
            onClick={() => setAlertingItem(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black tracking-tight flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              {t("Stock Depletion Warning")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg leading-relaxed pt-2">
              {alertingItem?.threshold === '50%' ? t("Your stock is now half depleted") :
                alertingItem?.threshold === '25%' ? t("Your stock is now 25% remaining") :
                  alertingItem?.threshold === '10u' ? `${t("Only")} 10 ${alertingItem?.item.unit} ${t("remaining")}` :
                    alertingItem?.threshold === '5u' ? `${t("Only")} 5 ${alertingItem?.item.unit} ${t("remaining")}` :
                      alertingItem?.threshold === '0u' ? t("Out of Stock") :
                        t("Low Stock Alert")}
              : <span className="font-black text-foreground underline decoration-primary/30">"{alertingItem?.item.name}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
            <AlertDialogCancel className="h-12 px-6 rounded-2xl font-bold text-base border-border/60 hover:bg-muted transition-all order-3 sm:order-1 flex-1">
              {t("Ignore")}
            </AlertDialogCancel>
            <Button
              onClick={() => alertingItem && handleAddToList(alertingItem.item)}
              className="h-12 px-6 rounded-2xl font-black text-base bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-lg transition-all order-2 sm:order-2 flex-1"
            >
              <List className="mr-2 h-4 w-4" />
              {t("Add to list")}
            </Button>
            <AlertDialogAction
              onClick={() => alertingItem && handleCreateImmediateOrder(alertingItem.item)}
              className="h-12 px-4 rounded-2xl font-black text-sm bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all order-1 sm:order-3 flex-[1.2] whitespace-nowrap"
            >
              <Truck className="mr-2 h-4 w-4" />
              {t("Send order to vendor")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SafeErrorBoundary name="ShiftHandoverDialog">
        <ShiftHandoverDialog
          isOpen={isShiftHandoverOpen}
          onOpenChange={setIsShiftHandoverOpen}
          currentUser={currentUser}
          bills={initialBills}
          expenses={initialExpenses}
          purchaseOrders={purchaseOrders}
          currency={effectiveCurrency}
          venueDetails={venueDetails}
          onLogoutConfirm={() => {
            setCurrentUser(null);
            setIsStaffLoginOpen(true);
          }}
        />
      </SafeErrorBoundary>
      <StaffLogin
        isOpen={isStaffLoginOpen}
        onOpenChange={setIsStaffLoginOpen}
        employees={initialEmployees}
        onLogin={(emp) => setCurrentUser(emp)}
      />
    </div>
  );
}
