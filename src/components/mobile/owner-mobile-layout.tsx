"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
    LayoutDashboard, 
    Users, 
    Building2, 
    Settings, 
    Sparkles, 
    RefreshCw,
    Store
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
    LiveDailySales,
    syncInventoryToCloud,
    syncVendorsToCloud
} from '@/lib/firestore-sync';
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

    // Sync cloud listeners on mount if venueId is available
    useEffect(() => {
        if (!venueId) return;

        // 1. Live sales summary
        const unsubSales = listenToLiveDailySales(venueId, (summary) => {
            if (summary) setLiveDailySales(summary);
        });

        // 2. Recent bills
        const unsubBills = listenToRecentBills(venueId, 8, (bills) => {
            if (bills.length > 0) setRecentCloudBills(bills);
        });

        // 3. Live employees
        const unsubEmployees = listenToLiveEmployees(venueId, (cloudEmployees) => {
            if (cloudEmployees.length > 0) {
                setEmployees(cloudEmployees);
                onUpdateEmployees(cloudEmployees);
            }
        });

        // 4. Live purchase orders
        const unsubPOs = listenToLivePurchaseOrders(venueId, (cloudPOs) => {
            if (cloudPOs.length > 0) setPurchaseOrders(cloudPOs);
        });

        // 5. Live inventory
        const unsubInv = listenToLiveInventory(venueId, (cloudInv) => {
            if (cloudInv.length > 0) setInventory(cloudInv);
        });

        // 6. Live vendors
        const unsubVendors = listenToLiveVendors(venueId, (cloudVendors) => {
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
    }, [venueId, onUpdateEmployees, onUpdateVendors]);

    // Initial cloud backup of inventory and vendors if not yet uploaded
    useEffect(() => {
        if (venueId) {
            if (initialInventory.length > 0) syncInventoryToCloud(venueId, initialInventory);
            if (initialVendors.length > 0) syncVendorsToCloud(venueId, initialVendors);
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

                {/* Right Header: Active Cloud Indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
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
                        onRefresh={() => {
                            // Quick refresh pulse
                        }}
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
