"use client";

import { useState } from 'react';
import { 
    Building2, 
    LogOut, 
    Shield, 
    Moon, 
    Sun, 
    RefreshCw, 
    Lock, 
    Check, 
    AlertTriangle,
    Store,
    MapPin,
    Phone,
    Mail
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";

interface MobileSettingsTabProps {
    venueName: string;
    currency: string;
    venueDetails?: any;
    ownerDetails?: any;
    onSwitchLicense: () => void;
    onSignOut: () => void;
}

export function MobileSettingsTab({
    venueName,
    currency,
    venueDetails,
    ownerDetails,
    onSwitchLicense,
    onSignOut
}: MobileSettingsTabProps) {
    const { theme, setTheme } = useTheme();
    const [isTerminalLocked, setIsTerminalLocked] = useState(false);

    return (
        <div className="space-y-4 pb-6">
            {/* Header */}
            <div>
                <h2 className="text-base font-black tracking-tight text-foreground uppercase">
                    Store Settings & Controls
                </h2>
                <p className="text-xs text-muted-foreground">Manage mobile preferences & store profile</p>
            </div>

            {/* Store Profile Card */}
            <div className="p-4 rounded-2xl border bg-card/70 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-black text-lg">
                        <Store size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-base text-foreground truncate">{venueName || 'ChillBill Store'}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span>Owner:</span>
                            <span className="font-bold text-foreground">{ownerDetails?.name || 'Store Owner'}</span>
                        </p>
                    </div>
                </div>

                <div className="pt-2 border-t space-y-2 text-xs">
                    {venueDetails?.address && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin size={14} className="text-orange-500 shrink-0 mt-0.5" />
                            <span>{venueDetails.address}</span>
                        </div>
                    )}
                    {venueDetails?.contactNumber && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone size={14} className="text-orange-500 shrink-0" />
                            <span>{venueDetails.contactNumber}</span>
                        </div>
                    )}
                    {ownerDetails?.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail size={14} className="text-orange-500 shrink-0" />
                            <span>{ownerDetails.email}</span>
                        </div>
                    )}
                </div>
            </div>



            {/* ════════ THEME TOGGLE ════════ */}
            <div className="p-4 rounded-2xl border bg-card/70 shadow-sm flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-xs text-foreground">Theme Mode</h4>
                    <p className="text-[11px] text-muted-foreground">Toggle Dark or Light theme</p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="h-8 px-3 rounded-xl text-xs font-bold"
                >
                    {theme === 'dark' ? <Sun size={14} className="mr-1.5 text-amber-400" /> : <Moon size={14} className="mr-1.5 text-zinc-600" />}
                    {theme === 'dark' ? 'Light' : 'Dark'}
                </Button>
            </div>

            {/* ════════ EMERGENCY COUNTER LOCK ════════ */}
            <div className="p-4 rounded-2xl border bg-card/70 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            <Lock size={14} className="text-orange-500" /> Remote Terminal Lock
                        </h4>
                        <p className="text-[11px] text-muted-foreground">Require Owner PIN to unlock store counter</p>
                    </div>
                    <Switch 
                        checked={isTerminalLocked}
                        onCheckedChange={setIsTerminalLocked}
                    />
                </div>
                {isTerminalLocked && (
                    <p className="text-[10px] text-amber-500 font-bold bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        ⚠️ Terminal lock active. Cashier counter will prompt for Owner PIN.
                    </p>
                )}
            </div>

            {/* ════════ DANGER ZONE ════════ */}
            <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 shadow-sm space-y-3">
                <h4 className="font-bold text-xs text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={14} /> Store License & Session
                </h4>

                <div className="space-y-2">
                    <Button 
                        variant="outline"
                        onClick={onSwitchLicense}
                        className="w-full h-10 rounded-xl text-xs font-bold border-red-500/30 text-red-500 hover:bg-red-500/10 justify-start"
                    >
                        <RefreshCw size={14} className="mr-2" /> Switch Store / Enter Different License
                    </Button>
                    <Button 
                        variant="destructive"
                        onClick={onSignOut}
                        className="w-full h-10 rounded-xl text-xs font-bold justify-start"
                    >
                        <LogOut size={14} className="mr-2" /> Sign Out
                    </Button>
                </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground pt-4">
                ChillBill Store Companion v2.0 · Built for retail leaders
            </p>
        </div>
    );
}
