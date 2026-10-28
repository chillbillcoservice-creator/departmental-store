"use client";

import { useState, useEffect } from 'react';
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
    Mail,
    Smartphone,
    Download,
    HelpCircle,
    CheckCircle2,
    Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTheme } from "next-themes";
import Image from "next/image";

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
    const [canInstallNative, setCanInstallNative] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const checkStandalone = () => {
                const standalone =
                    window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://');
                setIsStandalone(standalone);
            };
            checkStandalone();

            if ((window as any).deferredPrompt) {
                setCanInstallNative(true);
            }

            const onCanInstall = () => setCanInstallNative(true);
            const onInstalled = () => {
                setIsInstalled(true);
                setCanInstallNative(false);
            };

            window.addEventListener('chillbill:caninstall', onCanInstall);
            window.addEventListener('chillbill:installed', onInstalled);

            return () => {
                window.removeEventListener('chillbill:caninstall', onCanInstall);
                window.removeEventListener('chillbill:installed', onInstalled);
            };
        }
    }, []);

    const handleInstallClick = async () => {
        const promptEvent = (window as any).deferredPrompt;
        if (promptEvent) {
            try {
                promptEvent.prompt();
                const choiceResult = await promptEvent.userChoice;
                if (choiceResult && choiceResult.outcome === 'accepted') {
                    setIsInstalled(true);
                    setCanInstallNative(false);
                }
                (window as any).deferredPrompt = null;
            } catch (err) {
                console.warn("PWA install error:", err);
                setIsInstallGuideOpen(true);
            }
        } else {
            setIsInstallGuideOpen(true);
        }
    };

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

            {/* ════════ INSTALL APP AS NATIVE APP ════════ */}
            <div className="p-4 rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-card/90 to-amber-500/10 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black shadow-md shadow-orange-500/25 overflow-hidden border border-orange-500/40 shrink-0">
                        <Image 
                            src="/icon-192.png" 
                            alt="ChillBill App Icon" 
                            width={48} 
                            height={48}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-foreground">ChillBill Store App</h4>
                            {(isStandalone || isInstalled) ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Installed
                                </span>
                            ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/30 flex items-center gap-1">
                                    <Sparkles size={10} /> Real App
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {(isStandalone || isInstalled)
                                ? "Running in full-screen standalone app mode"
                                : "Install to phone home screen · 100% full-screen without URL bar"}
                        </p>
                    </div>
                </div>

                {/* Feature Badges */}
                <div className="grid grid-cols-3 gap-1.5 py-1">
                    <div className="p-1.5 rounded-xl bg-background/60 border text-center">
                        <span className="text-[10px] font-bold text-foreground block">⚡ 1-Tap Launch</span>
                        <span className="text-[9px] text-muted-foreground">From home screen</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-background/60 border text-center">
                        <span className="text-[10px] font-bold text-foreground block">🖥️ Standalone</span>
                        <span className="text-[9px] text-muted-foreground">No browser URL bar</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-background/60 border text-center">
                        <span className="text-[10px] font-bold text-foreground block">📶 Offline Ready</span>
                        <span className="text-[9px] text-muted-foreground">Instant continuity</span>
                    </div>
                </div>

                {/* Action Button */}
                {(isStandalone || isInstalled) ? (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                        <span>App is installed and running in native standalone mode!</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Button
                            type="button"
                            onClick={handleInstallClick}
                            className="w-full h-11 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                        >
                            <Download size={16} />
                            {canInstallNative ? "Install ChillBill App on Phone Now" : "Install App / Add to Home Screen"}
                        </Button>

                        {!canInstallNative && (
                            <p className="text-[10px] text-center text-muted-foreground">
                                Tap above for 2-step Chrome & Safari installation guide
                            </p>
                        )}
                    </div>
                )}
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
                    className="h-8 px-3 rounded-xl text-xs font-bold cursor-pointer"
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
                        className="w-full h-10 rounded-xl text-xs font-bold border-red-500/30 text-red-500 hover:bg-red-500/10 justify-start cursor-pointer"
                    >
                        <RefreshCw size={14} className="mr-2" /> Switch Store / Enter Different License
                    </Button>
                    <Button 
                        variant="destructive"
                        onClick={onSignOut}
                        className="w-full h-10 rounded-xl text-xs font-bold justify-start cursor-pointer"
                    >
                        <LogOut size={14} className="mr-2" /> Sign Out
                    </Button>
                </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground pt-4">
                ChillBill Store Companion v2.0 · Built for retail leaders
            </p>

            {/* ════════ INSTALL GUIDE DIALOG ════════ */}
            <Dialog open={isInstallGuideOpen} onOpenChange={setIsInstallGuideOpen}>
                <DialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl p-5 bg-background border shadow-2xl">
                    <DialogHeader className="text-left space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-500 flex items-center justify-center font-bold">
                                <Smartphone size={18} />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-extrabold text-foreground">
                                    Install ChillBill App
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Add official native app icon to your phone screen
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        {/* Android Chrome */}
                        <div className="p-3.5 rounded-xl border bg-card/60 space-y-2">
                            <div className="flex items-center gap-2 font-bold text-foreground">
                                <div className="w-5 h-5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
                                    🤖
                                </div>
                                <span>Android (Google Chrome)</span>
                            </div>
                            <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
                                <li>Tap the <strong>3 dots (⋮)</strong> in the top-right corner of Chrome.</li>
                                <li>Tap <strong>&ldquo;Install app&rdquo;</strong> (or <strong>&ldquo;Add to Home screen&rdquo;</strong>).</li>
                                <li>Tap <strong>&ldquo;Install&rdquo;</strong> on the popup. The app will install directly to your app drawer and home screen!</li>
                            </ol>
                            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                ✓ Chrome creates a native WebAPK app without downloading raw files.
                            </p>
                        </div>

                        {/* iPhone Safari */}
                        <div className="p-3.5 rounded-xl border bg-card/60 space-y-2">
                            <div className="flex items-center gap-2 font-bold text-foreground">
                                <div className="w-5 h-5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">
                                    🍎
                                </div>
                                <span>iPhone / iPad (Apple Safari)</span>
                            </div>
                            <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground text-[11px] leading-relaxed">
                                <li>Tap the <strong>Share button (⎋)</strong> at the bottom center of Safari.</li>
                                <li>Scroll down the share sheet and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</li>
                                <li>Tap <strong>&ldquo;Add&rdquo;</strong> in the top-right corner.</li>
                            </ol>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            onClick={() => setIsInstallGuideOpen(false)}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl h-10 text-xs"
                        >
                            Got It, Thanks!
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
