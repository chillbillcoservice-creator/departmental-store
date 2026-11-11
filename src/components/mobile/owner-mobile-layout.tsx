"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
    LayoutDashboard, 
    Users, 
    Building2, 
    Settings, 
    Sparkles, 
    RefreshCw,
    Store,
    Volume2,
    VolumeX,
    X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
    Bill, 
    InventoryItem, 
    Employee, 
    Vendor, 
    PurchaseOrder, 
    VenueDetails, 
    OwnerDetails 
} from '@/lib/types';
import { 
    listenToLiveDailySales, 
    listenToRecentBills, 
    listenToLiveEmployees, 
    listenToLivePurchaseOrders, 
    listenToLiveInventory, 
    listenToLiveVendors,
    fetchLiveDailySales,
    fetchRecentBills,
    fetchLiveInventory,
    DEFAULT_STORE_UID,
    LiveDailySales,
    syncVendorsToCloud,
    syncEmployeesToCloud,
    cleanVenueId
} from '@/lib/firestore-sync';
import { playKaChingSound, unlockAudioContext } from '@/lib/soundbox';
import { MobileDashboardTab } from './mobile-dashboard-tab';
import { MobileStaffTab } from './mobile-staff-tab';
import { MobileVendorsTab } from './mobile-vendors-tab';
import { MobileSettingsTab } from './mobile-settings-tab';

interface OwnerMobileLayoutProps {
    venueName: string;
    venueId?: string;
    currency: string;
    initialBills: Bill[];
    initialInventory: InventoryItem[];
    initialEmployees: Employee[];
    initialVendors: Vendor[];
    initialPurchaseOrders?: PurchaseOrder[];
    venueDetails?: VenueDetails | null;
    ownerDetails?: OwnerDetails | null;
    onUpdateEmployees: (employees: Employee[]) => void;
    onUpdateVendors: (vendors: Vendor[]) => void;
    onSwitchLicense: () => void;
    onSignOut: () => void;
}

export function OwnerMobileLayout({
    venueName,
    venueId,
    currency,
    initialBills,
    initialInventory,
    initialEmployees,
    initialVendors,
    initialPurchaseOrders = [],
    venueDetails,
    ownerDetails,
    onUpdateEmployees,
    onUpdateVendors,
    onSwitchLicense,
    onSignOut
}: OwnerMobileLayoutProps) {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'staff' | 'vendors' | 'settings'>('dashboard');

    // Live state synced with cloud
    const [liveDailySales, setLiveDailySales] = useState<LiveDailySales | null>(null);
    const [recentCloudBills, setRecentCloudBills] = useState<any[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
    const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [vendors, setVendors] = useState<Vendor[]>(initialVendors);

    // Ka-Ching sound alert & notification state
    const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            try {
                return localStorage.getItem('owner_sale_sound_enabled') !== 'false';
            } catch {
                return true;
            }
        }
        return true;
    });
    const isSoundEnabledRef = useRef(isSoundEnabled);
    useEffect(() => {
        isSoundEnabledRef.current = isSoundEnabled;
    }, [isSoundEnabled]);

    const [incomingSaleAlert, setIncomingSaleAlert] = useState<{
        id: string;
        total: number;
        paymentMethod: string;
        cashierName?: string;
    } | null>(null);

    // Auto-unlock Web Audio on first user interaction (touch/click/pointer) for mobile browsers
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const events = ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'];
        const handleUnlock = () => {
            unlockAudioContext();
            events.forEach(ev => window.removeEventListener(ev, handleUnlock));
        };
        events.forEach(ev => window.addEventListener(ev, handleUnlock, { passive: true }));
        return () => {
            events.forEach(ev => window.removeEventListener(ev, handleUnlock));
        };
    }, []);

    // Auto-dismiss floating sale alert toast after 4.5 seconds
    useEffect(() => {
        if (!incomingSaleAlert) return;
        const timer = setTimeout(() => {
            setIncomingSaleAlert(null);
        }, 4500);
        return () => clearTimeout(timer);
    }, [incomingSaleAlert]);

    const toggleSound = useCallback(() => {
        setIsSoundEnabled(prev => {
            const next = !prev;
            try {
                localStorage.setItem('owner_sale_sound_enabled', String(next));
            } catch {}
            if (next) {
                // Play a brief preview so the owner hears it & mobile audio gets unlocked
                playKaChingSound();
            }
            return next;
        });
    }, []);

    const activeVenueId = cleanVenueId(venueId) || DEFAULT_STORE_UID;

    // Instant direct cloud fetch for immediate refresh
    const handleManualRefresh = useCallback(async () => {
        try {
            console.log(`[OwnerMobile] Fetching fresh sales, bills & catalog for: "${activeVenueId}"`);
            const [sales, bills, cloudInv] = await Promise.all([
                fetchLiveDailySales(activeVenueId),
                fetchRecentBills(activeVenueId, 8),
                fetchLiveInventory(activeVenueId)
            ]);
            if (sales) {
                console.log("[OwnerMobile] Live sales fetched successfully:", sales);
                setLiveDailySales(sales);
            }
            if (bills && bills.length > 0) {
                console.log(`[OwnerMobile] Live bills fetched (${bills.length} bills)`);
                setRecentCloudBills(bills);
            }
            if (cloudInv && cloudInv.length > 0) {
                console.log(`[OwnerMobile] Live inventory fetched (${cloudInv.length} items)`);
                setInventory(cloudInv);
            }
        } catch (e) {
            console.error("[OwnerMobile] Direct fetch error:", e);
        }
    }, [activeVenueId]);

    // Sync cloud listeners on mount
    useEffect(() => {
        console.log(`[OwnerMobile] Attaching live cloud listeners for venueId: "${activeVenueId}"`);

        // Trigger immediate fetch so dashboard updates without waiting for listener push
        handleManualRefresh();

        // 1. Live sales summary
        const unsubSales = listenToLiveDailySales(activeVenueId, (summary) => {
            if (summary) {
                console.log("[OwnerMobile] Live sales summary updated:", summary);
                setLiveDailySales(summary);
            }
        });

        // 2. Recent bills with real-time Ka-Ching alert on new checkouts
        const unsubBills = listenToRecentBills(
            activeVenueId, 
            8, 
            (bills) => {
                if (bills.length > 0) setRecentCloudBills(bills);
            },
            (newBill) => {
                // Fresh checkout completed at store counter!
                console.log("[OwnerMobile] ⚡ Real-time sale checkout detected!", newBill);
                if (isSoundEnabledRef.current) {
                    playKaChingSound();
                }
                setIncomingSaleAlert({
                    id: newBill.id,
                    total: Number(newBill.total || 0),
                    paymentMethod: newBill.paymentMethod || 'Online',
                    cashierName: newBill.cashierName
                });
                // Also trigger immediate refresh to recalculate today's totals
                handleManualRefresh();
            }
        );

        // 3. Live employees
        const unsubEmployees = listenToLiveEmployees(activeVenueId, (cloudEmployees) => {
            if (cloudEmployees.length > 0) {
                setEmployees(cloudEmployees);
                onUpdateEmployees(cloudEmployees);
            }
        });

        // 4. Live purchase orders
        const unsubPOs = listenToLivePurchaseOrders(activeVenueId, (cloudPOs) => {
            if (cloudPOs.length > 0) setPurchaseOrders(cloudPOs);
        });

        // 5. Live inventory
        const unsubInv = listenToLiveInventory(activeVenueId, (cloudInv) => {
            if (cloudInv.length > 0) setInventory(cloudInv);
        });

        // 6. Live vendors
        const unsubVendors = listenToLiveVendors(activeVenueId, (cloudVendors) => {
            if (cloudVendors.length > 0) {
                setVendors(cloudVendors);
                onUpdateVendors(cloudVendors);
            }
        });

        return () => {
            unsubSales();
            unsubBills();
            unsubEmployees();
            unsubPOs();
            unsubInv();
            unsubVendors();
        };
    }, [activeVenueId, handleManualRefresh, onUpdateEmployees, onUpdateVendors]);

    // Initial cloud backup of vendors and staff if not yet uploaded (inventory is managed by POS counter)
    useEffect(() => {
        if (venueId) {
            if (initialVendors.length > 0) syncVendorsToCloud(venueId, initialVendors);
            if (initialEmployees.length > 0) syncEmployeesToCloud(venueId, initialEmployees);
        }
    }, [venueId]);

    const handleSavePO = useCallback((po: PurchaseOrder) => {
        setPurchaseOrders(prev => [po, ...prev.filter(p => p.id !== po.id)]);
        try {
            const currentPOs = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
            localStorage.setItem('purchaseOrders', JSON.stringify([po, ...currentPOs.filter((p: any) => p.id !== po.id)]));
        } catch (e) {}
    }, []);

    const handleLocalEmployeesUpdate = useCallback((updated: Employee[]) => {
        setEmployees(updated);
        onUpdateEmployees(updated);
    }, [onUpdateEmployees]);

    const handleLocalVendorsUpdate = useCallback((updated: Vendor[]) => {
        setVendors(updated);
        onUpdateVendors(updated);
    }, [onUpdateVendors]);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-orange-500/20">
            {/* ════════ FLOATING SALE ALERT BANNER (KA-CHING) ════════ */}
            {incomingSaleAlert && (
                <div className="fixed top-2.5 inset-x-3 z-50 p-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white shadow-2xl border border-white/20 animate-in slide-in-from-top-4 duration-300 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shrink-0 shadow-inner">
                            💰
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
                                    New Sale
                                </span>
                                <span className="text-[11px] font-bold text-white/90">
                                    {incomingSaleAlert.paymentMethod}
                                </span>
                            </div>
                            <div className="text-base font-black truncate tracking-tight text-white mt-0.5">
                                {currency} {Number(incomingSaleAlert.total || 0).toFixed(2)}
                                {incomingSaleAlert.cashierName && (
                                    <span className="text-xs font-normal text-white/80 ml-1.5">
                                        by {incomingSaleAlert.cashierName}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIncomingSaleAlert(null)}
                        className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-white/90 active:scale-90 transition-all shrink-0"
                        title="Dismiss"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ════════ STICKY TOP APP BAR ════════ */}
            <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/70 px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-sm shrink-0">
                        <Store size={16} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h1 className="font-black text-sm tracking-tight truncate text-foreground">
                                {venueName || 'ChillBill Store'}
                            </h1>
                            <span className="flex h-2 w-2 relative shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                            Owner Companion
                        </span>
                    </div>
                </div>

                {/* Right Header: Sound Alert Toggle & Active Cloud Indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={toggleSound}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all duration-200 active:scale-95 ${
                            isSoundEnabled 
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-sm' 
                                : 'bg-muted/70 text-muted-foreground border-border'
                        }`}
                        title={isSoundEnabled ? "Sale Ka-Ching sound is active (Tap to mute)" : "Sale sound is muted (Tap to enable)"}
                    >
                        {isSoundEnabled ? <Volume2 size={12} className="text-amber-500" /> : <VolumeX size={12} />}
                        <span>{isSoundEnabled ? 'Ka-Ching' : 'Muted'}</span>
                    </button>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                    </span>
                </div>
            </header>

            {/* ════════ MAIN CONTENT AREA ════════ */}
            <main className="flex-1 overflow-y-auto px-4 pt-3 pb-24">
                {activeTab === 'dashboard' && (
                    <MobileDashboardTab
                        bills={initialBills}
                        inventory={inventory}
                        vendors={vendors}
                        currency={currency}
                        venueName={venueName}
                        venueId={venueId}
                        liveSalesSummary={liveDailySales}
                        recentCloudBills={recentCloudBills}
                        onSavePO={handleSavePO}
                        onRefresh={handleManualRefresh}
                    />
                )}

                {activeTab === 'staff' && (
                    <MobileStaffTab
                        employees={employees}
                        venueId={venueId}
                        currency={currency}
                        onUpdateEmployees={handleLocalEmployeesUpdate}
                    />
                )}

                {activeTab === 'vendors' && (
                    <MobileVendorsTab
                        vendors={vendors}
                        inventory={inventory}
                        purchaseOrders={purchaseOrders}
                        currency={currency}
                        venueName={venueName}
                        venueId={venueId}
                        onUpdateVendors={handleLocalVendorsUpdate}
                        onSavePO={handleSavePO}
                    />
                )}

                {activeTab === 'settings' && (
                    <MobileSettingsTab
                        venueName={venueName}
                        currency={currency}
                        venueDetails={venueDetails}
                        ownerDetails={ownerDetails}
                        isSoundEnabled={isSoundEnabled}
                        onToggleSound={toggleSound}
                        onSwitchLicense={onSwitchLicense}
                        onSignOut={onSignOut}
                    />
                )}
            </main>

            {/* ════════ 4-TAB BOTTOM NAVIGATION BAR ════════ */}
            <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/80 px-3 py-1.5 flex items-center justify-around shadow-2xl">
                {/* 1. Dashboard */}
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 ${activeTab === 'dashboard' ? 'text-orange-500 font-black' : 'text-muted-foreground font-semibold hover:text-foreground'}`}
                >
                    <div className={`p-1 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-orange-500/15' : ''}`}>
                        <LayoutDashboard size={19} />
                    </div>
                    <span className="text-[10px] tracking-tight">Dashboard</span>
                </button>

                {/* 2. Staff */}
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 ${activeTab === 'staff' ? 'text-orange-500 font-black' : 'text-muted-foreground font-semibold hover:text-foreground'}`}
                >
                    <div className={`p-1 rounded-xl transition-all ${activeTab === 'staff' ? 'bg-orange-500/15' : ''}`}>
                        <Users size={19} />
                    </div>
                    <span className="text-[10px] tracking-tight">Staff</span>
                </button>

                {/* 3. Vendors */}
                <button
                    onClick={() => setActiveTab('vendors')}
                    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 ${activeTab === 'vendors' ? 'text-orange-500 font-black' : 'text-muted-foreground font-semibold hover:text-foreground'}`}
                >
                    <div className={`p-1 rounded-xl transition-all ${activeTab === 'vendors' ? 'bg-orange-500/15' : ''}`}>
                        <Building2 size={19} />
                    </div>
                    <span className="text-[10px] tracking-tight">Vendors</span>
                </button>

                {/* 4. Settings */}
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 ${activeTab === 'settings' ? 'text-orange-500 font-black' : 'text-muted-foreground font-semibold hover:text-foreground'}`}
                >
                    <div className={`p-1 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-orange-500/15' : ''}`}>
                        <Settings size={19} />
                    </div>
                    <span className="text-[10px] tracking-tight">Settings</span>
                </button>
            </nav>
        </div>
    );
}
