"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Employee } from "@/lib/types";
import { buildUsername } from "@/lib/generate-username";
import { cn } from "@/lib/utils";
import {
    Eye, EyeOff, LogIn, User, Shield, CreditCard, Package, ShoppingCart, Zap,
    Sparkles, ArrowRight, TrendingUp, Building2, ShieldCheck, X,
    Mail, Lock, KeyRound, ChevronLeft, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { initializeFirebase } from "@/firebase";
import { useTheme } from "next-themes";
import { ThemeToggle } from "./theme-toggle";
import { verifyStoreLicense, LicenseCheckResult } from "@/lib/licensing";

/* ═══════════════════════════════════════════════════
   CORAL BLAZE DESIGN TOKENS
   ═══════════════════════════════════════════════════ */
const T_DARK = {
    bg: "#0f0f0f",        // deep neutral charcoal
    bgDeep: "#0a0a0a",        // even deeper (footer)
    surface: "#1a1a1a",        // cards, elevated panels
    surfaceB: "#1f1f1f",        // slightly lighter surface
    coral: "#FF6B6B",        // primary accent — warm coral
    peach: "#FF8E53",        // secondary accent — warm peach
    text: "#F8F8F2",        // soft white
    textMute: "rgba(248,248,242,0.4)", // muted text
    textSub: "rgba(248,248,242,0.55)",
    border: "rgba(248,248,242,0.07)",
    borderLt: "rgba(248,248,242,0.12)",
    grad: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
    gradR: "linear-gradient(90deg, #FF6B6B, #FF8E53)",
    coralRgb: "255,107,107",
    peachRgb: "255,142,83",
    textRgb: "248,248,242",
};

const T_LIGHT = {
    bg: "#FAFAFA",        // Light warm grey
    bgDeep: "#F3F4F6",        // Slightly darker grey for footer/banner
    surface: "#FFFFFF",        // Pure white cards
    surfaceB: "#F9FAFB",        // Slightly off-white surface
    coral: "#EF4444",        // Deeper coral for contrast
    peach: "#F97316",        // Darker orange for better contrast
    text: "#111827",        // Near black text
    textMute: "rgba(17,24,39,0.45)",
    textSub: "rgba(17,24,39,0.65)",
    border: "rgba(17,24,39,0.08)",
    borderLt: "rgba(17,24,39,0.15)",
    grad: "linear-gradient(135deg, #EF4444, #F97316)",
    gradR: "linear-gradient(90deg, #EF4444, #F97316)",
    coralRgb: "239,68,68",
    peachRgb: "249,115,22",
    textRgb: "17,24,39",
};
/* ═══════════════════════════════════════════════════
   FEATURES DATA
   ═══════════════════════════════════════════════════ */
const FEATURES = {
    kot: {
        title: "Fast Barcode Billing",
        tag: "Billing",
        desc: "Rapid barcode scanning, instant cart totals, and thermal receipt printing for ultra-fast checkout.",
        bullets: [
            "Seamless USB & Bluetooth barcode scanner integration",
            "1-click hold and retrieve bill queue for busy counters",
            "Automatic item discount & tax calculation",
            "Thermal receipt printing & digital billing"
        ],
        stat: "<0.5s", statLabel: "Scan Speed"
    },
    uptime: {
        title: "100% Uptime SLA",
        tag: "Reliability",
        desc: "We stay up so you never go down. Enterprise-grade cloud infrastructure with redundancy baked in.",
        bullets: [
            "Multi-region cloud infrastructure",
            "Auto-failover and disaster recovery",
            "24/7 system health monitoring",
            "Offline mode — works without internet"
        ],
        stat: "100%", statLabel: "Uptime"
    },
    analytics: {
        title: "Live Revenue Analytics",
        tag: "Intelligence",
        desc: "Real-time dashboards that reveal how your business actually performs.",
        bullets: [
            "Hourly, daily, weekly revenue views",
            "Staff efficiency & performance tracking",
            "Top-selling items leaderboard",
            "Expense vs. revenue breakdown"
        ],
        stat: "Real-time", statLabel: "Updates"
    },
    multivenue: {
        title: "Multi-Venue Control",
        tag: "Scale",
        desc: "Manage all your locations from a single master dashboard.",
        bullets: [
            "Centralized menu management",
            "Cross-venue analytics comparison",
            "Role-based access per location",
            "Unified inventory tracking"
        ],
        stat: "∞", statLabel: "Venues"
    },
    security: {
        title: "Staff PIN Security",
        tag: "Access",
        desc: "Every staff action is authenticated. PIN-based login keeps your operations locked down.",
        bullets: [
            "4-digit PIN for each employee",
            "Role-based permissions (Owner, Manager, Cashier, Inventory Clerk)",
            "Activity logs per employee",
            "Admin-only actions with elevated access"
        ],
        stat: "PIN", statLabel: "Auth"
    },
};

/* ═══════════════════════════════════════════════════
   FAQ ITEM — accordion sub-component
   ═══════════════════════════════════════════════════ */
function FaqItem({ q, a, T, delay }: { q: string; a: string; T: typeof T_DARK; delay?: number }) {
    const [open, setOpen] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay }}
            className="rounded-xl overflow-hidden cursor-pointer"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
            onClick={() => setOpen(p => !p)}>
            <div className="flex items-center justify-between p-5">
                <span className="text-sm font-black" style={{ color: T.text }}>{q}</span>
                <motion.span animate={{ rotate: open ? 135 : 0 }} transition={{ duration: 0.2 }}
                    className="text-lg font-black leading-none shrink-0 ml-4" style={{ color: T.coral }}>+</motion.span>
            </div>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}>
                        <div className="px-5 pb-5 text-sm font-medium leading-relaxed" style={{ color: T.textMute }}>{a}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* ═══════════════════════════════════════════════════
   PROPS
   ═══════════════════════════════════════════════════ */
interface LoginScreenProps {
    employees: Employee[];
    venueName: string;
    venueId?: string;
    isPosMode?: boolean;
    isSetupComplete?: boolean;
    onLogin: (employee: Employee) => void;
    onAccessDenied?: (email: string) => void;
    onLicenseExpired?: (result: LicenseCheckResult) => void;
    onOwnerLogin?: (uid: string, details?: { storeName?: string; ownerName?: string; email?: string; licenseKey?: string }) => void;
    onOwnerSignup?: (uid: string, initialDetails?: { storeName?: string; ownerName?: string; email?: string; licenseKey?: string }) => void;
    onSwitchLicense?: () => void;
    initialAuthView?: null | "landing" | "signup" | "login" | "owner-login";
    onUpdateEmployees?: (employees: Employee[]) => void;
    isMobile?: boolean;
}

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
function getRoleIcon(role: string) {
    switch (role) {
        case "Owner":
        case "Admin": return <Shield className="h-5 w-5" />;
        case "Store Manager":
        case "Manager": return <Zap className="h-5 w-5" />;
        case "Cashier":
        case "Billing Clerk": return <CreditCard className="h-5 w-5" />;
        case "Inventory Clerk": return <Package className="h-5 w-5" />;
        default: return <User className="h-5 w-5" />;
    }
}

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */
export default function LoginScreen({
    employees, venueName, venueId, isPosMode, isSetupComplete, onLogin,
    onAccessDenied, onLicenseExpired, onOwnerLogin, onOwnerSignup,
    onSwitchLicense, initialAuthView, onUpdateEmployees, isMobile
}: LoginScreenProps) {

    const hasCompletedSetup = Boolean(
        isSetupComplete ||
        (typeof window !== "undefined" && (localStorage.getItem("isSetupComplete") === "true" || localStorage.getItem("setupComplete") === "true"))
    );

    /* ── Auth modal state ── */
    const [authView, setAuthView] = useState<null | "landing" | "signup" | "login" | "owner-login">(initialAuthView || null);

    useEffect(() => {
        if (initialAuthView) {
            setAuthView(initialAuthView);
        }
    }, [initialAuthView]);
    const [emailInput, setEmailInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [pin, setPin] = useState("");
    const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [shake, setShake] = useState(false);
    const pinRef = useRef<HTMLInputElement>(null);

    /* ── Feature modal state ── */
    const [featureModal, setFeatureModal] = useState<null | { title: string; tag: string; desc: string; bullets: string[]; stat: string; statLabel: string }>(null);

    /* ── Theme Hook ── */
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    // Default to dark before mounting to avoid flash of white on dark mode preference
    const isDark = !mounted || resolvedTheme === "dark";
    const T = isDark ? T_DARK : T_LIGHT;

    /* ── Live POS preview cycling ── */
    const LIVE_ORDERS = useMemo(() => [
        { table: "C-01", items: ["Aashirvaad Atta 5kg", "Fortune Oil 1L", "Tata Salt 1kg"], time: "Just now", badge: "coral" },
        { table: "C-02", items: ["Amul Butter 100g × 2", "Amul Gold Milk 500ml", "Good Day"], time: "2m", badge: "green" },
        { table: "C-01", items: ["Surf Excel 1kg", "Vim Gel 500ml", "Lizol 500ml"], time: "4m", badge: "peach" },
        { table: "C-03", items: ["Tata Tea Gold 500g", "Madhur Sugar 1kg", "Maggi 4-Pack"], time: "6m", badge: "coral" },
        { table: "C-02", items: ["Dettol Soap 125g × 3", "Colgate Total 150g"], time: "8m", badge: "green" },
        { table: "C-01", items: ["India Gate Basmati 1kg", "Tata Toor Dal 1kg"], time: "11m", badge: "peach" },
        { table: "C-03", items: ["Coca-Cola 750ml × 2", "Lay's Chips × 3"], time: "14m", badge: "coral" },
    ], []);
    const [liveIdx, setLiveIdx] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setLiveIdx(p => (p + 1) % LIVE_ORDERS.length), 2500);
        return () => clearInterval(id);
    }, [LIVE_ORDERS.length]);
    const visibleOrders = [0, 1, 2].map(offset => LIVE_ORDERS[(liveIdx + offset) % LIVE_ORDERS.length]);
    const liveOrderCount = 5 + (liveIdx % 5);

    /* ── Google Auth ── */
    const handleGoogleAuth = useCallback(async () => {
        setIsLoading(true);
        setError("");
        setSuccessMsg("");
        try {
            const { auth, firestore: db } = initializeFirebase();
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            if (result?.user) {
                const uid = result.user.uid;
                const email = (result.user.email ?? "").toLowerCase();

                // Anti-piracy & commercial subscription validation
                const licResult = await verifyStoreLicense(email, db);
                if (!licResult.isValid) {
                    if (licResult.status === 'not_whitelisted') {
                        onAccessDenied?.(email || "unknown");
                    } else {
                        onLicenseExpired?.(licResult);
                    }
                    return;
                }

                const storeDetails = {
                    storeName: (licResult as any)?.storeName,
                    ownerName: result.user.displayName || "Store Owner",
                    email,
                };
                onOwnerSignup?.(uid, storeDetails);
            }
        } catch (err: any) {
            console.error("Google Auth error:", err);
            let userMsg = "Failed to connect to Google. Try again.";
            if (err?.code === 'auth/operation-not-allowed') {
                userMsg = "Google Sign-In is not enabled in Firebase Console. Please enable Google under Authentication -> Sign-in method.";
            } else if (err?.code === 'auth/unauthorized-domain') {
                userMsg = "This domain is not in Firebase's authorized domains list. Please add it in Firebase Console -> Authentication -> Settings.";
            } else if (err?.code === 'auth/popup-closed-by-user') {
                userMsg = "Google sign-in popup was closed before completing.";
            } else if (err?.message?.includes('database (default) does not exist') || err?.code === 'unavailable') {
                userMsg = "Cloud Firestore Database has not been created yet in Firebase Console. Please create it under Firestore Database.";
            } else if (err?.message) {
                userMsg = err.message;
            }
            setError(userMsg);
        } finally {
            setIsLoading(false);
        }
    }, [onOwnerLogin, onOwnerSignup, onAccessDenied, onLicenseExpired]);

    /* ── License Key Authentication (Commercial POS Activation) ── */
    const handleEmailAuth = useCallback(async (isSignUp: boolean) => {
        if (!emailInput.trim()) {
            setError("Please enter your registered store email.");
            return;
        }
        const cleanKey = passwordInput.trim().toUpperCase();
        if (!cleanKey || cleanKey.length < 6) {
            setError("Please enter your valid License Key (e.g. CBILL-2026-XXXX).");
            return;
        }

        setIsLoading(true);
        setError("");
        setSuccessMsg("");
        const cleanEmail = emailInput.trim().toLowerCase();

        try {
            const { auth, firestore: db } = initializeFirebase();

            // 1. Whitelist verification
            const whiteSnap = await getDoc(doc(db, "whitelist", cleanEmail));
            if (!whiteSnap.exists()) {
                onAccessDenied?.(cleanEmail);
                return;
            }

            // 2. Validate entered License Key against the registered key for this email in whitelist
            const whiteData = whiteSnap.data();
            const registeredKey = (whiteData?.licenseKey || "").trim().toUpperCase();
            if (registeredKey && cleanKey !== registeredKey) {
                setError("Incorrect License Key for this email. Please check the key sent to you on WhatsApp.");
                return;
            }

            // 3. Subscription & commercial status validation
            const licResult = await verifyStoreLicense(cleanEmail, db);
            if (!licResult.isValid) {
                if (licResult.status === 'not_whitelisted') {
                    onAccessDenied?.(cleanEmail);
                } else {
                    onLicenseExpired?.(licResult);
                }
                return;
            }

            // 4. Authenticate user into Firebase Auth for secure cloud database access
            // License validity has ALREADY been 100% verified against Cloud Firestore above.
            let userCredential;
            
            // Dedicated terminal identity for this licensed store (immune to OAuth conflicts or key changes)
            const terminalEmail = `${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}@chillbill-terminal.pos`;
            const terminalPassword = `cbill_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}_2026!`;

            try {
                // Attempt primary sign in with email and license key
                userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanKey);
            } catch (primaryErr: any) {
                // If the primary email is an existing Google OAuth account or had an older password,
                // fall back to the dedicated deterministic terminal identity for this store
                try {
                    userCredential = await signInWithEmailAndPassword(auth, terminalEmail, terminalPassword);
                } catch (termErr: any) {
                    if (termErr?.code === 'auth/user-not-found' || termErr?.code === 'auth/invalid-credential') {
                        try {
                            userCredential = await createUserWithEmailAndPassword(auth, terminalEmail, terminalPassword);
                        } catch (createErr: any) {
                            if (createErr?.code === 'auth/email-already-in-use') {
                                userCredential = await signInWithEmailAndPassword(auth, terminalEmail, terminalPassword);
                            } else {
                                throw createErr;
                            }
                        }
                    } else {
                        throw termErr;
                    }
                }
            }

            if (userCredential?.user) {
                const uid = userCredential.user.uid;
                const storeDetails = {
                    storeName: whiteData?.storeName,
                    ownerName: whiteData?.ownerName,
                    email: cleanEmail,
                    licenseKey: registeredKey,
                };
                onOwnerSignup?.(uid, storeDetails);
            }
        } catch (err: any) {
            console.error("License auth error:", err);
            let userMsg = "Activation failed. Please check your details.";
            if (err?.code === 'auth/operation-not-allowed') {
                userMsg = "Email/Password sign-in is not enabled in Firebase Console. Please enable Email/Password under Authentication -> Sign-in method.";
            } else if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
                userMsg = "Authentication failed. If this is a Google Account, click 'Continue with Google' above.";
            } else if (err?.code === 'auth/invalid-email') {
                userMsg = "Please enter a valid email address.";
            } else if (err?.message?.includes('database (default) does not exist') || err?.code === 'unavailable') {
                userMsg = "Cloud Firestore Database has not been created yet in Firebase Console. Please create it under Firestore Database.";
            } else if (err?.message) {
                userMsg = err.message;
            }
            setError(userMsg);
        } finally {
            setIsLoading(false);
        }
    }, [emailInput, passwordInput, onOwnerLogin, onOwnerSignup, onAccessDenied, onLicenseExpired]);

    /* ── Password Reset for Email Users ── */
    const handleForgotPassword = useCallback(async () => {
        if (!emailInput.trim()) {
            setError("Please enter your email above, then click 'Forgot Password'.");
            return;
        }
        setIsLoading(true);
        setError("");
        setSuccessMsg("");
        try {
            const { auth } = initializeFirebase();
            await sendPasswordResetEmail(auth, emailInput.trim().toLowerCase());
            setSuccessMsg(`Password reset link sent to ${emailInput.trim()}! Check your inbox.`);
        } catch (err: any) {
            console.error("Password reset error:", err);
            let msg = "Failed to send reset email.";
            if (err?.code === 'auth/user-not-found') {
                msg = "No account found with this email.";
            } else if (err?.code === 'auth/invalid-email') {
                msg = "Please enter a valid email address.";
            } else if (err?.code === 'auth/operation-not-allowed') {
                msg = "Email/Password provider is not enabled in Firebase Console.";
            } else if (err?.message) {
                msg = err.message;
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [emailInput]);

    const handlePinLogin = useCallback(() => {
        if (!selectedEmp) return;
        if (pin === (selectedEmp.loginCode || "0000")) {
            setIsLoading(true);
            setTimeout(() => onLogin(selectedEmp), 200);
        } else {
            setError("Incorrect PIN. Try again.");
            setPin("");
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }
    }, [selectedEmp, pin, onLogin]);

    const openAuthModal = useCallback((view: "landing" | "signup" | "login" | "owner-login") => {
        setAuthView(view);
        setError("");
        setSuccessMsg("");
        setEmailInput("");
        setPasswordInput("");
        setShowPassword(false);
        setPin("");
        setSelectedEmp(null);
    }, []);

    /* ── If in POS mode (employee tablet), show PIN login directly ── */
    if (isPosMode) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ background: T.bg }}>
                <div className="w-full max-w-md px-6 py-10">
                    <div className="flex flex-col items-center mb-10 gap-3">
                        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-2xl"
                            style={{ background: T.grad }}>
                            {(venueName || "POS").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 3).toUpperCase()}
                        </div>
                        <h1 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>{venueName || "POS System"}</h1>
                        <p style={{ color: T.textMute }} className="text-sm">Select your profile to continue</p>
                    </div>
                    {employees.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-4">
                            {employees.map((emp) => (
                                <button key={emp.id}
                                    onClick={() => { setSelectedEmp(emp); setPin(""); setError(""); setTimeout(() => pinRef.current?.focus(), 100); }}
                                    className="group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 active:scale-95"
                                    style={{ background: selectedEmp?.id === emp.id ? "rgba(255,107,107,0.12)" : "transparent" }}
                                >
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform relative"
                                        style={{ background: emp.role === 'Owner' ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : T.grad }}>
                                        {getRoleIcon(emp.role)}
                                        {emp.role === 'Owner' && (
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-semibold max-w-[70px] truncate" style={{ color: T.textSub }}>
                                        {emp.name.split(" ")[0]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                    {selectedEmp && (
                        <div className="mt-8 p-6 rounded-2xl shadow-xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                            <p className="text-center text-sm font-bold mb-4" style={{ color: T.textSub }}>
                                Enter PIN for <span style={{ color: T.coral }}>{selectedEmp.name}</span>
                                {selectedEmp.username && (
                                    <span className="block mt-1 font-mono text-xs text-orange-400">
                                        @{selectedEmp.username}
                                    </span>
                                )}
                            </p>
                            <input
                                ref={pinRef}
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="one-time-code"
                                maxLength={4}
                                value={pin}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, "");
                                    setPin(val);
                                    setError("");
                                    if (val.length === 4) {
                                        if (val === (selectedEmp.loginCode || "0000")) {
                                            setIsLoading(true);
                                            setTimeout(() => onLogin(selectedEmp), 120);
                                        } else {
                                            setError("Incorrect PIN. Try again.");
                                            setPin("");
                                            setShake(true);
                                            setTimeout(() => setShake(false), 500);
                                        }
                                    }
                                }}
                                onKeyDown={e => e.key === "Enter" && handlePinLogin()}
                                className={cn("w-full h-14 text-center text-3xl font-black tracking-[0.5em] rounded-xl border bg-transparent focus:outline-none transition-all", shake && "animate-shake")}
                                style={{ color: T.text, borderColor: error ? "#ef4444" : T.borderLt }}
                                placeholder="• • • •"
                                autoFocus
                            />
                            {error && <p className="text-sm text-red-400 text-center mt-3 font-semibold">{error}</p>}
                            <button onClick={handlePinLogin}
                                className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-4 transition-all text-white shadow-sm"
                                style={{ background: T.grad }}>
                                <LogIn size={16} /> Sign In
                            </button>
                        </div>
                    )}

                    {/* Terminal Status & Switch License */}
                    <div className="mt-10 text-center space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Terminal Activated & Licensed</span>
                        </div>
                        {onSwitchLicense && (
                            <div>
                                <button
                                    onClick={onSwitchLicense}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                                >
                                    Switch Store / Enter Different License
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}.animate-shake{animation:shake .45s ease-in-out}`}</style>
            </div>
        );
    }

    /* ════════════════════════════════════════════════
       DEDICATED MOBILE STORE TERMINAL ACTIVATION SCREEN
       (Strictly shown on mobile phones for first-time setup / unactivated device)
    ════════════════════════════════════════════════ */
    if (isMobile) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center p-4" style={{ background: T.bg }}>
                <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl relative border"
                    style={{ background: T.surface, borderColor: T.borderLt }}>
                    
                    {/* Centered 4K Logo & Brand Header */}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl p-2.5 flex items-center justify-center bg-black border border-white/10 shadow-lg">
                            <img src="/chillbill-app-icon-1024.png" alt="ChillBill POS" className="w-full h-full object-contain" />
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-bold tracking-wide uppercase mb-2">
                            <Sparkles size={12} /> Store Terminal Activation
                        </div>
                        <h2 className="text-xl font-black text-foreground">Connect Your Store</h2>
                        <p className="text-xs text-muted-foreground mt-1">
                            Sign in to sync your inventory, live billing & staff to this phone.
                        </p>
                    </div>

                    {/* Google Sign-in */}
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={handleGoogleAuth}
                            disabled={isLoading}
                            className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all hover:opacity-90 shadow-md cursor-pointer border"
                            style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor: T.borderLt, color: T.text }}
                        >
                            <GoogleIcon className="w-5 h-5" />
                            <span>Continue with Google</span>
                        </button>

                        <div className="relative flex items-center justify-center my-2">
                            <div className="border-t w-full" style={{ borderColor: T.borderLt }} />
                            <span className="px-3 text-[10px] font-bold uppercase tracking-widest shrink-0 text-muted-foreground">
                                or use store license key
                            </span>
                            <div className="border-t w-full" style={{ borderColor: T.borderLt }} />
                        </div>

                        {/* License key input */}
                        <div className="space-y-3">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                                    <Mail size={16} />
                                </div>
                                <input
                                    type="email"
                                    value={emailInput}
                                    onChange={e => { setEmailInput(e.target.value); setError(""); setSuccessMsg(""); }}
                                    placeholder="Registered store email"
                                    className="w-full h-11 pl-10 pr-3 rounded-xl border text-sm transition-all focus:outline-none"
                                    style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", color: T.text, borderColor: error ? "#ef4444" : T.borderLt }}
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                                    <KeyRound size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={passwordInput}
                                    onChange={e => { setPasswordInput(e.target.value.toUpperCase()); setError(""); setSuccessMsg(""); }}
                                    placeholder="License Key (e.g. CBILL-2026-XXXX)"
                                    className="w-full h-11 pl-10 pr-3 rounded-xl border text-sm font-mono tracking-wider transition-all focus:outline-none uppercase"
                                    style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", color: T.text, borderColor: error ? "#ef4444" : T.borderLt }}
                                    onKeyDown={e => { if (e.key === "Enter") handleEmailAuth(false); }}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => handleEmailAuth(false)}
                                disabled={isLoading}
                                className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white transition-all hover:opacity-90 cursor-pointer shadow-lg"
                                style={{ background: T.grad }}
                            >
                                {isLoading ? (
                                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Activate & Sync Store <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                                {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center font-medium flex items-center justify-center gap-1">
                                <CheckCircle2 size={14} /> {successMsg}
                            </div>
                        )}

                        <div className="pt-2 text-center">
                            <p className="text-[11px] text-muted-foreground">
                                License keys are delivered to registered owners on WhatsApp.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

/* ════════════════════════════════════════════════
       LANDING PAGE — CORAL BLAZE THEME
    ════════════════════════════════════════════════ */
    return (
        <div className="relative min-h-screen" style={{ background: T.bg }}>

            {/* ── Auth Modal Overlay ── */}
            <AnimatePresence>
                {authView && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
                        onClick={() => setAuthView(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="w-full max-w-md rounded-2xl p-8 relative"
                            style={{ background: T.surface, border: `1px solid ${T.border}` }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={() => setAuthView(null)} className="absolute top-4 right-4 p-1 transition-colors" style={{ color: T.textMute }}>
                                <X size={18} />
                            </button>

                            {/* Landing: Choose Login or Signup */}
                            {authView === "landing" && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: T.grad }}>
                                            <Sparkles size={22} className="text-white" />
                                        </div>
                                        <h2 className="text-xl font-black" style={{ color: T.text }}>Welcome Back</h2>
                                        <p className="text-sm mt-1" style={{ color: T.textMute }}>Choose how to continue</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setAuthView("login")}
                                            className="p-6 rounded-xl text-center transition-all hover:scale-[1.02] cursor-pointer"
                                            style={{ background: "rgba(255,107,107,0.08)", border: `1px solid rgba(${T.coralRgb},0.2)` }}>
                                            <User size={24} className="mx-auto mb-3" style={{ color: T.coral }} />
                                            <div className="text-sm font-black" style={{ color: T.text }}>Staff Login</div>
                                            <div className="text-[10px] mt-1" style={{ color: T.textMute }}>PIN access</div>
                                        </button>
                                        <button onClick={() => setAuthView("owner-login")}
                                            className="p-6 rounded-xl text-center transition-all hover:scale-[1.02] cursor-pointer"
                                            style={{ background: "rgba(255,142,83,0.08)", border: `1px solid rgba(${T.peachRgb},0.2)` }}>
                                            <Shield size={24} className="mx-auto mb-3" style={{ color: T.peach }} />
                                            <div className="text-sm font-black" style={{ color: T.text }}>Owner Login</div>
                                            <div className="text-[10px] mt-1" style={{ color: T.textMute }}>Google SSO & Email</div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Owner Login — Google or License Key */}
                            {authView === "owner-login" && (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setAuthView("landing")} className="p-1 rounded-lg hover:opacity-80" style={{ color: T.textMute }}>
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div>
                                            <h2 className="text-lg font-black" style={{ color: T.text }}>Store Owner Login</h2>
                                            <p className="text-xs" style={{ color: T.textMute }}>Sign in with Google or your License Key</p>
                                        </div>
                                    </div>

                                    <button onClick={handleGoogleAuth} disabled={isLoading}
                                        className="w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-sm"
                                        style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: `1px solid ${T.borderLt}`, color: T.text }}>
                                        <GoogleIcon className="w-4 h-4" />
                                        <span>Continue with Google</span>
                                    </button>

                                    <div className="relative flex items-center justify-center my-1">
                                        <div className="border-t w-full" style={{ borderColor: T.borderLt }} />
                                        <span className="px-3 text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: T.textMute }}>
                                            or sign in with license key
                                        </span>
                                        <div className="border-t w-full" style={{ borderColor: T.borderLt }} />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: T.textMute }}>
                                                <Mail size={16} />
                                            </div>
                                            <input
                                                type="email"
                                                value={emailInput}
                                                onChange={e => { setEmailInput(e.target.value); setError(""); setSuccessMsg(""); }}
                                                placeholder="Registered email (e.g. name@yahoo.com)"
                                                className="w-full h-11 pl-10 pr-3 rounded-xl border text-sm transition-all focus:outline-none"
                                                style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", color: T.text, borderColor: error ? "#ef4444" : T.borderLt }}
                                            />
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: T.textMute }}>
                                                <KeyRound size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                value={passwordInput}
                                                onChange={e => { setPasswordInput(e.target.value.toUpperCase()); setError(""); setSuccessMsg(""); }}
                                                placeholder="License Key (e.g. CBILL-2026-XXXX)"
                                                className="w-full h-11 pl-10 pr-3 rounded-xl border text-sm font-mono tracking-wider transition-all focus:outline-none uppercase"
                                                style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", color: T.text, borderColor: error ? "#ef4444" : T.borderLt }}
                                                onKeyDown={e => { if (e.key === "Enter") handleEmailAuth(false); }}
                                            />
                                        </div>

                                        <button
                                            onClick={() => handleEmailAuth(false)}
                                            disabled={isLoading}
                                            className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white transition-all hover:opacity-90 cursor-pointer shadow-md"
                                            style={{ background: T.grad }}
                                        >
                                            {isLoading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Sign In with License Key <ArrowRight size={16} /></>}
                                        </button>
                                    </div>

                                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                                    {successMsg && <p className="text-xs text-emerald-400 text-center flex items-center justify-center gap-1"><CheckCircle2 size={14} />{successMsg}</p>}

                                    <p className="text-center text-xs" style={{ color: T.textMute }}>
                                        New store activation? <button onClick={() => setAuthView("signup")} className="font-bold underline" style={{ color: T.coral }}>Activate Store License</button>
                                    </p>
                                </div>
                            )}

                            {/* Signup — Activate with License Key */}
                            {authView === "signup" && (
                                <div className="space-y-5">
                                    <div className="text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: T.grad }}>
                                            <KeyRound size={22} className="text-white" />
                                        </div>
                                        <h2 className="text-xl font-black" style={{ color: T.text }}>Activate Your Store</h2>
                                        <p className="text-xs mt-1" style={{ color: T.textMute }}>Enter your registered email & License Key</p>
                                    </div>

                                    {/* Google Option */}
                                    <button onClick={handleGoogleAuth} disabled={isLoading}
                                        className="w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-sm"
                                        style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: `1px solid ${T.borderLt}`, color: T.text }}>
                                        <GoogleIcon className="w-4 h-4" />
                                        <span>Continue with Google</span>
                                    </button>

                                    {/* License Key Option */}
                                    <div className="relative flex items-center justify-center my-1">
                                        <div className="border-t w-full" style={{ borderColor: T.borderLt }} />
                                        <span className="px-3 text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: T.textMute }}>
                                            or activate with license key
                                        </span>
                                        <div className="border-t w-full" style={{ borderColor: T.borderLt }} />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: T.textMute }}>
                                                <Mail size={16} />
                                            </div>
                                            <input
                                                type="email"
                                                value={emailInput}
                                                onChange={e => { setEmailInput(e.target.value); setError(""); setSuccessMsg(""); }}
                                                placeholder="Registered email (e.g. name@yahoo.com)"
                                                className="w-full h-11 pl-10 pr-3 rounded-xl border text-sm transition-all focus:outline-none"
                                                style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", color: T.text, borderColor: error ? "#ef4444" : T.borderLt }}
                                            />
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: T.textMute }}>
                                                <KeyRound size={16} />
                                            </div>
                                            <input
                                                type="text"
                                                value={passwordInput}
                                                onChange={e => { setPasswordInput(e.target.value.toUpperCase()); setError(""); setSuccessMsg(""); }}
                                                placeholder="License Key (e.g. CBILL-2026-XXXX)"
                                                className="w-full h-11 pl-10 pr-3 rounded-xl border text-sm font-mono tracking-wider transition-all focus:outline-none uppercase"
                                                style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", color: T.text, borderColor: error ? "#ef4444" : T.borderLt }}
                                                onKeyDown={e => { if (e.key === "Enter") handleEmailAuth(true); }}
                                            />
                                        </div>

                                        <p className="text-[11px]" style={{ color: T.textMute }}>
                                            Enter the License Key sent to you via WhatsApp / ChillBill Admin.
                                        </p>

                                        <button
                                            onClick={() => handleEmailAuth(true)}
                                            disabled={isLoading}
                                            className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white transition-all hover:opacity-90 cursor-pointer shadow-md"
                                            style={{ background: T.grad }}
                                        >
                                            {isLoading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Activate Store License <ArrowRight size={16} /></>}
                                        </button>
                                    </div>

                                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                                    {successMsg && <p className="text-xs text-emerald-400 text-center flex items-center justify-center gap-1"><CheckCircle2 size={14} />{successMsg}</p>}

                                    {hasCompletedSetup && (
                                        <p className="text-center text-xs" style={{ color: T.textMute }}>
                                            Already activated? <button onClick={() => setAuthView("owner-login")} className="font-bold underline" style={{ color: T.coral }}>Log In</button>
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Staff Login — PIN */}
                            {authView === "login" && (
                                <div className="space-y-5">
                                    <div className="text-center">
                                        <h2 className="text-xl font-black" style={{ color: T.text }}>Staff Login</h2>
                                        <p className="text-sm mt-1" style={{ color: T.textMute }}>Select your profile & enter PIN</p>
                                    </div>
                                    {employees.length > 0 ? (
                                        <>
                                            <div className="flex flex-wrap justify-center gap-3">
                                                {employees.map(emp => (
                                                    <button key={emp.id}
                                                        onClick={() => { setSelectedEmp(emp); setPin(""); setError(""); setTimeout(() => pinRef.current?.focus(), 100); }}
                                                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                                                        style={{ background: selectedEmp?.id === emp.id ? `rgba(${T.coralRgb},0.12)` : "transparent", border: selectedEmp?.id === emp.id ? `1px solid rgba(${T.coralRgb},0.25)` : "1px solid transparent" }}>
                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: T.grad }}>{getRoleIcon(emp.role)}</div>
                                                        <span className="text-[11px] font-bold max-w-[56px] truncate" style={{ color: selectedEmp?.id === emp.id ? T.coral : T.textMute }}>{emp.name.split(" ")[0]}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {selectedEmp && (
                                                <div className="space-y-3">
                                                    {selectedEmp.username && (
                                                        <div className="text-center">
                                                            <span className="text-[11px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                                                                @{selectedEmp.username}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <input
                                                        ref={pinRef}
                                                        type="password"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        autoComplete="one-time-code"
                                                        maxLength={4}
                                                        value={pin}
                                                        onChange={e => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                                                        onKeyDown={e => e.key === "Enter" && handlePinLogin()}
                                                        className={cn("w-full h-14 text-center text-3xl font-black tracking-[0.5em] rounded-xl border bg-transparent focus:outline-none", shake && "animate-shake")}
                                                        style={{ color: T.text, borderColor: error ? "#ef4444" : T.borderLt }} placeholder="• • • •" />
                                                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                                                    <button onClick={handlePinLogin}
                                                        className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white"
                                                        style={{ background: T.grad }}>
                                                        <LogIn size={16} /> Sign In
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-8" style={{ color: T.textMute }}>
                                            <p className="text-sm">No staff accounts found.</p>
                                            <p className="text-xs mt-2">Ask your venue owner to set up staff accounts.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Feature Detail Modal ── */}
            <AnimatePresence>
                {featureModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
                        onClick={() => setFeatureModal(null)}
                    >
                        <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
                            className="w-full max-w-lg rounded-2xl p-8 relative"
                            style={{ background: T.surface, border: `1px solid ${T.border}` }}
                            onClick={e => e.stopPropagation()}>
                            <button onClick={() => setFeatureModal(null)} className="absolute top-4 right-4 p-1" style={{ color: T.textMute }}><X size={18} /></button>
                            <span className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: T.coral }}>{featureModal.tag}</span>
                            <h3 className="text-2xl font-black mt-2 mb-3" style={{ color: T.text }}>{featureModal.title}</h3>
                            <p className="text-sm mb-6" style={{ color: T.textSub }}>{featureModal.desc}</p>
                            <ul className="space-y-3 mb-6">
                                {featureModal.bullets.map((b, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm" style={{ color: T.textSub }}>
                                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: T.coral }} />
                                        {b}
                                    </li>
                                ))}
                            </ul>
                            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `rgba(${T.coralRgb},0.08)`, border: `1px solid rgba(${T.coralRgb},0.15)` }}>
                                <div className="text-3xl font-black" style={{ color: T.coral }}>{featureModal.stat}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: T.textMute }}>{featureModal.statLabel}</div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ════════ NAVBAR ════════ */}
            <nav className="fixed top-0 w-full z-50 transition-all duration-300" style={{ background: isDark ? "rgba(15,15,15,0.85)" : "rgba(250,250,250,0.85)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${T.border}` }}>
                <div className="max-w-[1320px] mx-auto px-6 h-[68px] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: T.grad }}>
                                <Sparkles size={15} className="text-white" />
                            </div>
                            <span className="text-[18px] font-black tracking-[-0.04em]" style={{ color: T.text }}>
                                Chill<span style={{ color: T.coral }}>Bill</span>
                            </span>
                        </div>
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: `rgba(${T.coralRgb},0.08)`, border: `1px solid rgba(${T.coralRgb},0.15)` }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.25em]">All systems go</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        {hasCompletedSetup ? (
                            <button onClick={() => openAuthModal("owner-login")}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 hover:opacity-90"
                                style={{ background: T.grad, color: T.bg }}>
                                <LogIn size={13} /> Log In
                            </button>
                        ) : (
                            <button onClick={() => openAuthModal("signup")}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 hover:opacity-90"
                                style={{ background: T.grad, color: T.bg }}>
                                Get Started <ArrowRight size={13} />
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* ════════ MAIN ════════ */}
            <main className="relative z-10">

                {/* ── HERO ── */}
                <section className="relative min-h-[100svh] flex items-center overflow-hidden px-6 pt-[68px]" style={{ background: T.bg }}>
                    {/* Gradient mesh */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-[-15%] left-[30%] w-[55vw] h-[55vw] rounded-full"
                            style={{ background: `radial-gradient(circle, rgba(${T.coralRgb},0.15) 0%, transparent 65%)`, filter: "blur(60px)" }} />
                        <div className="absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full"
                            style={{ background: `radial-gradient(circle, rgba(${T.peachRgb},0.10) 0%, transparent 65%)`, filter: "blur(80px)" }} />
                        <div className="absolute top-[10%] right-[-5%] w-[25vw] h-[25vw] rounded-full"
                            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)", filter: "blur(60px)" }} />
                    </div>
                    {/* Dot grid */}
                    <div className="absolute inset-0 opacity-[0.05]"
                        style={{ backgroundImage: `radial-gradient(circle, rgba(${T.textRgb},0.8) 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
                    {/* Noise */}
                    <div className="absolute inset-0 opacity-[0.03]"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

                    <div className="max-w-[1320px] mx-auto w-full relative z-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-24 py-24">
                        {/* LEFT text */}
                        <div className="flex-1 max-w-2xl">
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                                className="inline-flex items-center gap-2.5 mb-8 px-4 py-2 rounded-full"
                                style={{ border: `1px solid rgba(${T.coralRgb},0.25)`, background: `rgba(${T.coralRgb},0.07)` }}>
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: T.coral }} />
                                <span className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: `rgba(${T.coralRgb},0.8)` }}>Welcome to ChillBill</span>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
                                <h1 className="font-black leading-[0.92] tracking-[-0.04em] uppercase" style={{ fontSize: "clamp(52px, 6.5vw, 96px)", color: T.text }}>
                                    Stay Chill.<br />
                                    <span style={{ color: T.coral }}>Bill Smarter.</span>
                                </h1>
                            </motion.div>

                            {/* Trust badge */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.52 }}
                                className="flex items-center gap-2 mt-6">
                                <ShieldCheck size={13} style={{ color: T.coral }} />
                                <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: T.textMute }}>Zero Setup Fees · No Credit Card · Cancel Anytime</span>
                            </motion.div>

                            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }}
                                className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: T.textMute }}>
                                The modern Departmental Store & Supermarket POS — one platform for billing, inventory, vendor management, and customer khata.
                            </motion.p>

                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.38 }}
                                className="flex flex-col sm:flex-row items-start gap-3 mt-10">
                                {hasCompletedSetup ? (
                                    <button onClick={() => openAuthModal("owner-login")}
                                        className="group flex items-center gap-2.5 px-7 py-4 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
                                        style={{ background: T.grad, color: T.bg }}>
                                        <LogIn size={15} /> Log In <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                ) : (
                                    <button onClick={() => openAuthModal("signup")}
                                        className="group flex items-center gap-2.5 px-7 py-4 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
                                        style={{ background: T.grad, color: T.bg }}>
                                        <Sparkles size={15} /> Setup Your Business <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                )}
                            </motion.div>

                            {/* Proof stats */}
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}
                                className="flex items-center gap-8 mt-12 pt-8" style={{ borderTop: `1px solid ${T.border}` }}>
                                {[["< 1s", "Sync Speed"], ["100%", "Uptime"], ["∞", "Venues"]].map(([val, label]) => (
                                    <div key={label as string}>
                                        <div className="text-2xl font-black tracking-tight" style={{ color: T.text }}>{val}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: T.textMute }}>{label}</div>
                                    </div>
                                ))}
                            </motion.div>
                        </div>

                        {/* RIGHT: POS Preview */}
                        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="hidden lg:block flex-1 max-w-[480px] w-full">
                            <div className="relative" style={{ perspective: "1000px" }}>
                                <div className="rounded-2xl overflow-hidden shadow-2xl"
                                    style={{ background: T.surface, border: `1px solid ${T.border}`, transform: "rotateY(-6deg) rotateX(3deg)" }}>
                                    <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${T.border}`, background: T.surfaceB }}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: `rgba(${T.coralRgb},0.7)` }} />
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: T.textMute }}>ChillBill Dashboard</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-wider">Live</span>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: T.textMute }}>
                                            <span>Active Orders — {liveOrderCount}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                                        </div>

                                        {/* NEW ORDER — cycles with a swipe-in from right */}
                                        <div className="overflow-hidden rounded-lg mb-2" style={{ minHeight: 70 }}>
                                            <AnimatePresence mode="wait">
                                                {(() => {
                                                    const { table, items, time, badge } = visibleOrders[0];
                                                    const badgeColor = badge === "coral" ? T.coral : badge === "green" ? "#10b981" : T.peach;
                                                    return (
                                                        <motion.div key={table + time}
                                                            initial={{ x: 80, opacity: 0 }}
                                                            animate={{ x: 0, opacity: 1 }}
                                                            exit={{ x: -80, opacity: 0 }}
                                                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                                            className="p-3.5 flex gap-3 items-start rounded-lg relative"
                                                            style={{ background: `rgba(${T.coralRgb},0.06)`, border: `1px solid rgba(${T.coralRgb},0.2)` }}>
                                                            {/* "NEW" badge */}
                                                            <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: T.coral, color: "#fff" }}>new</span>
                                                            <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 text-[10px] font-black" style={{ background: badgeColor + "22", color: badgeColor }}>{table}</div>
                                                            <div className="flex-1 min-w-0">
                                                                {items.map(item => <div key={item} className="text-[11px] font-medium truncate" style={{ color: T.textSub }}>{item}</div>)}
                                                            </div>
                                                            <div className="text-[10px] font-black shrink-0 mt-4" style={{ color: T.textMute }}>{time} ago</div>
                                                        </motion.div>
                                                    );
                                                })()}
                                            </AnimatePresence>
                                        </div>

                                        {/* Older orders — stable */}
                                        {visibleOrders.slice(1).map(({ table, items, time, badge }) => {
                                            const badgeColor = badge === "coral" ? T.coral : badge === "green" ? "#10b981" : T.peach;
                                            return (
                                                <div key={table} className="p-3.5 flex gap-3 items-start rounded-lg mb-2 opacity-70"
                                                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}` }}>
                                                    <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 text-[10px] font-black" style={{ background: badgeColor + "22", color: badgeColor }}>{table}</div>
                                                    <div className="flex-1 min-w-0">
                                                        {items.map(item => <div key={item} className="text-[11px] font-medium truncate" style={{ color: T.textSub }}>{item}</div>)}
                                                    </div>
                                                    <div className="text-[10px] font-black shrink-0" style={{ color: T.textMute }}>{time} ago</div>
                                                </div>
                                            );
                                        })}
                                        <div className="mt-4 p-4 rounded-lg" style={{ background: `rgba(${T.coralRgb},0.06)`, border: `1px solid rgba(${T.coralRgb},0.12)` }}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `rgba(${T.coralRgb},0.7)` }}>Today&apos;s Revenue</span>
                                                <span className="text-[10px]" style={{ color: `rgba(${T.coralRgb},0.5)` }}>↑ 12% vs yesterday</span>
                                            </div>
                                            <div className="text-2xl font-black tracking-tight" style={{ color: T.text }}>₹ 24,840</div>
                                            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: `rgba(${T.coralRgb},0.12)` }}>
                                                <div className="h-full rounded-full" style={{ width: "72%", background: T.gradR }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[70%] h-16 blur-2xl rounded-full opacity-25"
                                    style={{ background: T.gradR }} />
                            </div>
                        </motion.div>
                    </div>

                    {/* Scroll indicator */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
                        <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: `rgba(${T.coralRgb},0.5)` }} />
                    </motion.div>
                </section>

                {/* ── Stats Banner ── */}
                <div className="overflow-hidden" style={{ background: T.bgDeep, borderTop: `1px solid ${T.borderLt}`, borderBottom: `1px solid ${T.borderLt}` }}>
                    <div className="flex whitespace-nowrap py-3.5">
                        <motion.div animate={{ x: [0, -1200] }} transition={{ repeat: Infinity, duration: 35, ease: "linear" }} className="flex gap-10 items-center">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-10">
                                    {[["100% Uptime", "✦"], ["< 1s Sync", "✦"], ["Zero Latency", "✦"], ["Multi-Venue", "✦"]].map(([txt, sep]) => (
                                        <span key={txt} className="flex items-center gap-10">
                                            <span className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: `rgba(${T.textRgb},${isDark ? 0.5 : 0.45})` }}>{txt}</span>
                                            <span style={{ color: T.coral, fontSize: "10px" }}>{sep}</span>
                                        </span>
                                    ))}
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>

                {/* ── Bento Feature Grid ── */}
                <section className="relative w-full py-20 px-6" style={{ background: T.bgDeep }}>
                    <div className="max-w-[1200px] mx-auto">
                        <div className="flex items-end justify-between mb-10">
                            <div>
                                <p className="font-mono text-xs uppercase tracking-[0.3em] font-bold mb-3" style={{ color: T.coral }}>Platform Capabilities</p>
                                <h2 className="text-5xl md:text-6xl font-black tracking-[-0.04em] leading-none uppercase" style={{ color: T.text }}>
                                    Built to<br /><span style={{ WebkitTextStroke: `2px rgba(${T.textRgb},${isDark ? 0.15 : 0.3})`, color: "transparent" }}>Scale.</span>
                                </h2>
                            </div>
                            <button onClick={() => openAuthModal(hasCompletedSetup ? "owner-login" : "signup")}
                                className="hidden md:flex items-center gap-3 px-6 py-3 rounded-lg text-xs uppercase tracking-widest font-bold transition-all hover:opacity-90"
                                style={{ background: T.grad, color: T.bg }}>
                                {hasCompletedSetup ? "Log In" : "Get Started"} <ArrowRight size={14} />
                            </button>
                        </div>
                        <p className="text-[10px] mb-4 font-bold uppercase tracking-[0.25em]" style={{ color: T.textMute }}>↓ Click any card to learn more</p>

                        <div className="grid grid-cols-12 grid-rows-[auto] gap-3">

                            {/* Cell A: Operations */}
                            <motion.div className="col-span-12 md:col-span-8 p-8 md:p-10 overflow-hidden relative group cursor-pointer rounded-xl"
                                style={{ background: T.surface, border: `1px solid ${T.border}` }}
                                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                transition={{ duration: 0.6 }} onClick={() => setFeatureModal(FEATURES.kot)} whileHover={{ scale: 1.01 }}>
                                <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:32px_32px]" />
                                <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none" style={{ background: `radial-gradient(circle, rgba(${T.coralRgb},0.10), transparent)` }} />
                                <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest" style={{ color: `rgba(${T.textRgb},0.15)` }}>Tap to explore ↗</span>
                                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-8 h-full min-h-[220px]">
                                    <div className="flex-1 space-y-4 max-w-md">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: T.coral }}><Zap size={11} className="text-white" /></div>
                                            <span className="font-mono text-xs uppercase tracking-[0.25em] font-bold" style={{ color: T.coral }}>Operations</span>
                                        </div>
                                        <h3 className="text-3xl md:text-4xl font-black tracking-[-0.03em] leading-none" style={{ color: T.text }}>Fast<br />Barcode Billing.</h3>
                                        <p className="text-sm font-medium leading-relaxed max-w-xs" style={{ color: T.textMute }}>Instant barcode scanner integration. Real-time stock sync and fast hold/retrieve queues for busy counters.</p>
                                    </div>
                                    <div className="flex gap-4 text-right shrink-0">
                                        <div className="space-y-1">
                                            <div className="text-3xl font-black tracking-tighter" style={{ color: T.text }}>&lt;1s</div>
                                            <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.textMute }}>Sync Speed</div>
                                        </div>
                                        <div className="w-px h-12 self-center" style={{ background: T.border }} />
                                        <div className="space-y-1">
                                            <div className="text-3xl font-black tracking-tighter" style={{ color: T.coral }}>∞</div>
                                            <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: T.textMute }}>Stations</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Cell B: Uptime — accent card */}
                            <motion.div className="col-span-12 md:col-span-4 p-8 relative overflow-hidden group cursor-pointer rounded-xl transition-all duration-300"
                                style={{ background: T.surface, border: `1px solid ${T.border}` }}
                                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.1 }} onClick={() => setFeatureModal(FEATURES.uptime)} whileHover={{ scale: 1.02 }}>

                                {/* Hover Gradient Overlay */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" style={{ background: T.grad }} />

                                <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full translate-x-1/3 translate-y-1/3 opacity-0 group-hover:opacity-40 transition-opacity duration-300 z-0" style={{ background: "rgba(0,0,0,0.2)" }} />
                                <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest z-10 transition-colors duration-300 group-hover:!text-white/40" style={{ color: `rgba(${T.textRgb},0.15)` }}>↗</span>
                                <div className="relative z-10 h-full min-h-[180px] flex flex-col justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse transition-colors duration-300 group-hover:!bg-white" style={{ background: T.coral }} />
                                        <span className="font-mono text-xs uppercase tracking-[0.25em] font-bold transition-colors duration-300 group-hover:!text-white/80" style={{ color: T.coral }}>Reliability</span>
                                    </div>
                                    <div>
                                        <div className="text-6xl font-black tracking-[-0.05em] leading-none transition-colors duration-300 group-hover:!text-white" style={{ color: T.text }}>100%</div>
                                        <div className="text-sm font-bold mt-2 uppercase tracking-widest transition-colors duration-300 group-hover:!text-white/70" style={{ color: T.textMute }}>Uptime SLA</div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Cell C: Analytics */}
                            <motion.div className="col-span-12 md:col-span-5 p-8 relative overflow-hidden group cursor-pointer rounded-xl"
                                style={{ background: T.surface, border: `1px solid ${T.border}` }}
                                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.15 }} onClick={() => setFeatureModal(FEATURES.analytics)} whileHover={{ scale: 1.02 }}>
                                <svg className="absolute bottom-0 left-0 w-full opacity-[0.08]" viewBox="0 0 300 80" preserveAspectRatio="none" fill="none">
                                    <polyline points="0,70 50,55 100,60 150,30 200,45 250,20 300,10" stroke={T.coral} strokeWidth="2" />
                                    <polyline points="0,70 50,55 100,60 150,30 200,45 250,20 300,10 300,80 0,80" fill={T.coral} />
                                </svg>
                                <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest" style={{ color: `rgba(${T.textRgb},0.15)` }}>↗</span>
                                <div className="relative z-10 flex flex-col justify-between h-full min-h-[200px]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `rgba(${T.coralRgb},0.12)` }}>
                                            <TrendingUp size={11} style={{ color: T.coral }} />
                                        </div>
                                        <span className="font-mono text-xs uppercase tracking-[0.25em] font-bold" style={{ color: T.coral }}>Intelligence</span>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-none" style={{ color: T.text }}>Live Revenue<br />Analytics.</h3>
                                        <p className="text-xs font-medium leading-relaxed" style={{ color: T.textMute }}>Real-time revenue, staff efficiency, top items — all in one dashboard.</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Cell D: Multi-venue */}
                            <motion.div className="col-span-6 md:col-span-3 p-6 relative overflow-hidden cursor-pointer rounded-xl"
                                style={{ background: T.surface, border: `1px solid ${T.border}` }}
                                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.2 }} onClick={() => setFeatureModal(FEATURES.multivenue)} whileHover={{ scale: 1.03 }}>
                                <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest" style={{ color: `rgba(${T.textRgb},0.15)` }}>↗</span>
                                <div className="relative z-10 flex flex-col justify-between h-full min-h-[200px]">
                                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: `rgba(${T.coralRgb},0.08)`, border: `1px solid rgba(${T.coralRgb},0.15)` }}>
                                        <Building2 size={16} style={{ color: T.coral }} />
                                    </div>
                                    <div>
                                        <div className="text-4xl font-black tracking-tighter mb-1" style={{ color: T.text }}>Multi</div>
                                        <div className="text-4xl font-black mb-3" style={{ WebkitTextStroke: `1px rgba(${T.textRgb},0.15)`, color: "transparent" }}>Venue</div>
                                        <p className="text-[11px] font-medium leading-snug" style={{ color: T.textMute }}>Manage all locations from a single master dashboard.</p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Cell E: Security */}
                            <motion.div className="col-span-6 md:col-span-4 p-6 relative overflow-hidden group cursor-pointer rounded-xl"
                                style={{ background: T.surface, border: `1px solid ${T.border}` }}
                                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.25 }} onClick={() => setFeatureModal(FEATURES.security)} whileHover={{ scale: 1.03 }}>
                                <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest" style={{ color: `rgba(${T.textRgb},0.15)` }}>↗</span>
                                <div className="relative z-10 flex flex-col justify-between h-full min-h-[200px]">
                                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: T.grad }}>
                                        <ShieldCheck size={16} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight leading-tight mb-2" style={{ color: T.text }}>Staff PIN<br />Security.</h3>
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest" style={{ color: T.coral }}>
                                            Learn more <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════
                    SECTION: TESTIMONIALS — LEFT-TO-RIGHT TICKER
                    ══════════════════════════════════════════════════ */}
                <section className="w-full py-20 overflow-hidden relative" style={{ background: T.bgDeep }}>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 px-6">
                        <p className="font-mono text-xs uppercase tracking-[0.3em] font-bold mb-3" style={{ color: T.coral }}>Real Stores. Real Results.</p>
                        <h2 className="text-4xl md:text-5xl font-black tracking-[-0.04em]" style={{ color: T.text }}>Owners Love It.</h2>
                    </motion.div>
                    <div className="relative">
                        {/* left fade */}
                        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
                            style={{ background: `linear-gradient(to right, ${T.bgDeep}, transparent)` }} />
                        {/* right fade */}
                        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
                            style={{ background: `linear-gradient(to left, ${T.bgDeep}, transparent)` }} />
                        <div className="overflow-hidden">
                            <motion.div
                                className="flex gap-4 w-max"
                                animate={{ x: ["-50%", "0%"] }}
                                transition={{ repeat: Infinity, duration: 32, ease: "linear" }}>
                                {[...Array(2)].flatMap(() => [
                                    { name: "Rajesh Gupta", venue: "Gupta Supermarket, Delhi", quote: "ChillBill cut our counter billing rush in half. Barcode scanning is instantaneous and inventory tracking is flawless.", rating: 5 },
                                    { name: "Priya Sharma", venue: "Daily Fresh Departmental Store, Jaipur", quote: "Our profit margin calculations and low-stock reorder alerts save us hours every week. We always know what to reorder.", rating: 5 },
                                    { name: "Vikram Patel", venue: "Patel Provision Store, Ahmedabad", quote: "Customer Khata management with credit tracking has made Udhaar settlement completely hassle-free.", rating: 5 },
                                    { name: "Meera Nair", venue: "Green Mart, Kochi", quote: "The 4-digit PIN login is fantastic for our cashiers. Clean, fast, and completely secure.", rating: 5 },
                                    { name: "Kiran Reddy", venue: "HyperCity Supermarket, Hyderabad", quote: "We manage multiple billing counters and inventory with ease. ChillBill made that possible.", rating: 5 },
                                ]).map(({ name, venue, quote, rating }, i) => (
                                    <div key={`${name}-${i}`}
                                        className="shrink-0 w-80 p-6 rounded-2xl flex flex-col gap-4"
                                        style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                                        <div className="flex gap-0.5">
                                            {Array.from({ length: rating }).map((_, j) => (
                                                <span key={j} className="text-amber-400 text-sm">★</span>
                                            ))}
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed flex-1" style={{ color: T.textSub }}>"{quote}"</p>
                                        <div>
                                            <div className="text-sm font-black" style={{ color: T.text }}>{name}</div>
                                            <div className="text-xs font-medium" style={{ color: T.textMute }}>{venue}</div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════
                    SECTION: FAQ (Option F)
                    ══════════════════════════════════════════════════ */}
                <section className="w-full py-20 px-6" style={{ background: T.bg }}>
                    <div className="max-w-2xl mx-auto">
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                            <p className="font-mono text-xs uppercase tracking-[0.3em] font-bold mb-3" style={{ color: T.coral }}>FAQ</p>
                            <h2 className="text-4xl md:text-5xl font-black tracking-[-0.04em]" style={{ color: T.text }}>Got Questions?</h2>
                        </motion.div>
                        <div className="space-y-3">
                            {[
                                { q: "Is ChillBill free to try?", a: "Yes! You can set up your store and start billing immediately — no credit card required." },
                                { q: "Do I need special hardware?", a: "Nope. ChillBill runs on any device with a browser — PC, laptop, or tablet. It works seamlessly with standard USB/Bluetooth barcode scanners and thermal receipt printers." },
                                { q: "Can multiple cashiers use it at once?", a: "Absolutely. ChillBill is built for retail teams. Each cashier gets a unique 4-digit PIN, and all inventory & sales sync in real-time." },
                                { q: "Is my data secure?", a: "Yes. We use Firebase with enterprise-grade Firestore security rules, PIN-based staff auth, and role-level access control for every store." },
                                { q: "How fast is the setup?", a: "Most departmental stores are fully live within 15 minutes. Our setup wizard walks you through store details, taxes, staff, and inventory." },
                            ].map(({ q, a }, i) => (
                                <FaqItem key={i} q={q} a={a} T={T} delay={i * 0.05} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════
                    SECTION: FINAL CTA (Option F)
                    ══════════════════════════════════════════════════ */}
                <section className="w-full py-24 px-6 relative overflow-hidden" style={{ background: T.bgDeep }}>
                    <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:32px_32px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] blur-3xl rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, rgba(${T.coralRgb},0.08), transparent 70%)` }} />
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mx-auto relative z-10 text-center">
                        <p className="font-mono text-xs uppercase tracking-[0.3em] font-bold mb-4" style={{ color: T.coral }}>Zero Setup Fees · No Credit Card</p>
                        <h2 className="text-5xl md:text-6xl font-black tracking-[-0.04em] mb-6" style={{ color: T.text }}>
                            {hasCompletedSetup ? "Welcome Back." : "Ready to Chill?"}<br />
                            <span style={{ color: T.coral }}>{hasCompletedSetup ? "Continue to your store." : "Start billing smarter."}</span>
                        </h2>
                        <p className="text-base font-medium mb-10" style={{ color: T.textMute }}>
                            {hasCompletedSetup ? "Access your POS counter, billing, and store operations." : "Join hundreds of departmental stores and supermarkets running on ChillBill."}
                        </p>
                        <button onClick={() => openAuthModal(hasCompletedSetup ? "owner-login" : "signup")}
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-sm font-black uppercase tracking-widest transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                            style={{ background: T.grad, color: "#fff", boxShadow: `0 8px 32px rgba(${T.coralRgb},0.35)` }}>
                            {hasCompletedSetup ? "Log In to Store" : "Set Up Your Store"} <ArrowRight size={16} />
                        </button>
                    </motion.div>
                </section>

                {/* ── Footer ── */}

                <footer className="text-white pt-24 pb-12 px-6" style={{ background: T.bgDeep }}>
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12 pb-16" style={{ borderBottom: `1px solid ${T.border}` }}>
                        <div className="max-w-sm">
                            <div className="flex items-center gap-2 text-xl font-extrabold tracking-tight mb-6">
                                <Sparkles size={18} style={{ color: T.coral }} />
                                <span style={{ color: T.text }}>Chill<span style={{ color: T.coral }}>Bill</span></span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed" style={{ color: T.textMute }}>
                                The unified operating system for ambitious departmental stores, supermarkets, and modern retail businesses.
                            </p>
                        </div>
                        <div className="flex gap-16">
                            <div className="flex flex-col gap-4">
                                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textMute }}>Platform</span>
                                <a href="#" className="text-sm font-semibold transition-colors" style={{ color: T.textSub }}>Order Management</a>
                                <a href="#" className="text-sm font-semibold transition-colors" style={{ color: T.textSub }}>Staff Tools</a>
                                <a href="#" className="text-sm font-semibold transition-colors" style={{ color: T.textSub }}>Analytics</a>
                            </div>
                            <div className="flex flex-col gap-4">
                                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textMute }}>Company</span>
                                {hasCompletedSetup ? (
                                    <button onClick={() => openAuthModal("owner-login")} className="text-sm font-semibold transition-colors text-left" style={{ color: T.textSub }}>Log In</button>
                                ) : (
                                    <button onClick={() => openAuthModal("signup")} className="text-sm font-semibold transition-colors text-left" style={{ color: T.textSub }}>Get Started</button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="max-w-6xl mx-auto pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold" style={{ color: T.textMute }}>
                        <p>© {new Date().getFullYear()} ChillBill Systems. All rights reserved.</p>
                        <p>Built for the service industry.</p>
                    </div>
                </footer>
            </main>

            {/* Shake animation */}
            <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}.animate-shake{animation:shake .45s ease-in-out}`}</style>
        </div>
    );
}
