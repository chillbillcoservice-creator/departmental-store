"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Employee } from "@/lib/types";
import { buildUsername } from "@/lib/generate-username";
import { cn } from "@/lib/utils";
import {
    Eye, EyeOff, LogIn, User, Shield, ChefHat, Utensils, Zap,
    Sparkles, ArrowRight, TrendingUp, Building2, ShieldCheck, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    GoogleAuthProvider,
    signInWithPopup,
    User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { initializeFirebase } from "@/firebase";
import { useTheme } from "next-themes";
import { ThemeToggle } from "./theme-toggle";

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
        title: "Lightning Smart KOTs",
        tag: "Operations",
        desc: "Route orders to any station in real time. Every table, every ticket — perfectly synced.",
        bullets: [
            "Instant ticket routing to kitchen, bar, or any print station",
            "Real-time table sync across all devices",
            "Automatic order grouping for efficiency",
            "Custom station assignment per menu item"
        ],
        stat: "<1s", statLabel: "Sync Speed"
    },
    uptime: {
        title: "99.9% Uptime SLA",
        tag: "Reliability",
        desc: "We stay up so you never go down. Enterprise-grade cloud infrastructure with redundancy baked in.",
        bullets: [
            "Multi-region cloud infrastructure",
            "Auto-failover and disaster recovery",
            "24/7 system health monitoring",
            "Offline mode — works without internet"
        ],
        stat: "99.9%", statLabel: "Uptime"
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
            "Role-based permissions (Admin, Manager, Chef, Waiter)",
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
    onLogin: (employee: Employee) => void;
    onAccessDenied?: (email: string) => void;
    onOwnerLogin?: (uid: string) => void;
    onOwnerSignup?: (uid: string) => void;
}

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
function getRoleIcon(role: string) {
    switch (role) {
        case "Admin": return <Shield className="h-5 w-5" />;
        case "Manager": return <Zap className="h-5 w-5" />;
        case "Head Chef":
        case "Chef": return <ChefHat className="h-5 w-5" />;
        case "Waiter": return <Utensils className="h-5 w-5" />;
        default: return <User className="h-5 w-5" />;
    }
}

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */
export default function LoginScreen({
    employees, venueName, venueId, isPosMode, onLogin,
    onAccessDenied, onOwnerLogin, onOwnerSignup
}: LoginScreenProps) {

    /* ── Auth modal state ── */
    const [authView, setAuthView] = useState<null | "landing" | "signup" | "login">(null);
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
        { table: "T-04", items: ["Flat White × 2", "Grilled Panini"], time: "2m", badge: "coral" },
        { table: "T-11", items: ["Chicken Burger", "Fries × 2", "Coke"], time: "5m", badge: "green" },
        { table: "T-07", items: ["Pasta Arrabbiata", "Bruschetta"], time: "8m", badge: "peach" },
        { table: "T-02", items: ["Masala Chai × 3", "Veg Puff"], time: "11m", badge: "coral" },
        { table: "T-09", items: ["Shawarma Wrap", "Fries", "Sprite"], time: "14m", badge: "green" },
        { table: "T-15", items: ["Cold Coffee × 2", "Brownie"], time: "18m", badge: "peach" },
        { table: "T-03", items: ["Pizza Margherita", "Garlic Bread × 2"], time: "22m", badge: "coral" },
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
        try {
            const { auth, firestore: db } = initializeFirebase();
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            if (result?.user) {
                const uid = result.user.uid;
                const email = (result.user.email ?? "").toLowerCase();
                const venueSnap = await getDoc(doc(db, "venues", uid));
                if (venueSnap.exists()) {
                    onOwnerLogin?.(uid);
                } else {
                    const whiteSnap = await getDoc(doc(db, "whitelist", email));
                    if (whiteSnap.exists()) {
                        onOwnerSignup?.(uid);
                    } else {
                        onAccessDenied?.(email || "unknown");
                    }
                }
            }
        } catch (err) {
            setError("Failed to connect to Google. Try again.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [onOwnerLogin, onOwnerSignup, onAccessDenied]);

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

    const openAuthModal = useCallback((view: "landing" | "signup" | "login") => {
        setAuthView(view);
        setError("");
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
                                    style={{ background: selectedEmp?.id === emp.id ? "rgba(255,107,107,0.1)" : "transparent" }}
                                >
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform"
                                        style={{ background: T.grad }}>
                                        {getRoleIcon(emp.role)}
                                    </div>
                                    <span className="text-xs font-semibold max-w-[64px] truncate" style={{ color: T.textSub }}>{emp.name.split(" ")[0]}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {selectedEmp && (
                        <div className="mt-8 p-6 rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                            <p className="text-center text-sm font-bold mb-4" style={{ color: T.textSub }}>
                                Enter PIN for <span style={{ color: T.coral }}>{selectedEmp.name}</span>
                            </p>
                            <input ref={pinRef} type="password" maxLength={4} value={pin}
                                onChange={e => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                                onKeyDown={e => e.key === "Enter" && handlePinLogin()}
                                className={cn("w-full h-14 text-center text-3xl font-black tracking-[0.5em] rounded-xl border bg-transparent focus:outline-none transition-all", shake && "animate-shake")}
                                style={{ color: T.text, borderColor: error ? "#ef4444" : T.borderLt }}
                                placeholder="• • • •"
                            />
                            {error && <p className="text-sm text-red-400 text-center mt-3">{error}</p>}
                            <button onClick={handlePinLogin}
                                className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-4 transition-all text-white"
                                style={{ background: T.grad }}>
                                <LogIn size={16} /> Sign In
                            </button>
                        </div>
                    )}
                </div>
                <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}.animate-shake{animation:shake .45s ease-in-out}`}</style>
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
                                            <div className="text-[10px] mt-1" style={{ color: T.textMute }}>PIN access (0000)</div>
                                        </button>
                                        <button onClick={handleGoogleAuth}
                                            className="p-6 rounded-xl text-center transition-all hover:scale-[1.02] cursor-pointer"
                                            style={{ background: "rgba(255,142,83,0.08)", border: `1px solid rgba(${T.peachRgb},0.2)` }}>
                                            <Shield size={24} className="mx-auto mb-3" style={{ color: T.peach }} />
                                            <div className="text-sm font-black" style={{ color: T.text }}>Owner Login</div>
                                            <div className="text-[10px] mt-1" style={{ color: T.textMute }}>Google SSO</div>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const ownerEmp = employees.find(e => e.role === 'Owner') || employees[0];
                                            if (ownerEmp) onLogin(ownerEmp);
                                        }}
                                        className="w-full py-3.5 px-4 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-md text-white"
                                        style={{ background: T.grad }}
                                    >
                                        <Zap size={15} className="text-yellow-300" />
                                        ⚡ 1-Click Instant Login (Store Owner)
                                    </button>
                                </div>
                            )}

                            {/* Signup — Google Auth */}
                            {authView === "signup" && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: T.grad }}>
                                            <Sparkles size={22} className="text-white" />
                                        </div>
                                        <h2 className="text-xl font-black" style={{ color: T.text }}>Setup Your Business</h2>
                                        <p className="text-sm mt-1" style={{ color: T.textMute }}>Create your ChillBill account</p>
                                    </div>
                                    <button onClick={handleGoogleAuth} disabled={isLoading}
                                        className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all hover:opacity-90"
                                        style={{ background: T.grad, color: "#0f0f0f" }}>
                                        {isLoading ? <span className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <>Continue with Google <ArrowRight size={16} /></>}
                                    </button>
                                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                                    <p className="text-center text-xs" style={{ color: T.textMute }}>
                                        Already have an account? <button onClick={() => setAuthView("landing")} className="font-bold underline" style={{ color: T.coral }}>Log In</button>
                                    </p>
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
                                                    <input ref={pinRef} type="password" maxLength={4} value={pin}
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
                        <button
                            onClick={() => {
                                const ownerEmp = employees.find(e => e.role === 'Owner') || employees[0];
                                if (ownerEmp) onLogin(ownerEmp);
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow hover:opacity-90 cursor-pointer"
                            style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                        >
                            <Zap size={13} className="text-yellow-300" />
                            <span>⚡ Quick Login</span>
                        </button>
                        <ThemeToggle />
                        <button onClick={() => openAuthModal("landing")}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors duration-200"
                            style={{ color: T.textMute }}
                            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                            onMouseLeave={e => (e.currentTarget.style.color = T.textMute)}>Log In</button>
                        <button onClick={() => openAuthModal("signup")}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300 hover:opacity-90"
                            style={{ background: T.grad, color: T.bg }}>
                            Get Started <ArrowRight size={13} />
                        </button>
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
                                The restaurant POS built for the rush — one platform for every order, every staff member, every venue.
                            </motion.p>

                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.38 }}
                                className="flex flex-col sm:flex-row items-start gap-3 mt-10">
                                <button onClick={() => openAuthModal("signup")}
                                    className="group flex items-center gap-2.5 px-7 py-4 rounded-xl text-[13px] font-black uppercase tracking-widest transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
                                    style={{ background: T.grad, color: T.bg }}>
                                    <Sparkles size={15} /> Setup Your Business <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                                </button>
                                <button onClick={() => openAuthModal("landing")}
                                    className="flex items-center gap-2.5 px-7 py-4 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all duration-300"
                                    style={{ border: `1px solid ${T.borderLt}`, color: T.textMute }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${T.textRgb},0.3)`; e.currentTarget.style.color = T.text; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderLt; e.currentTarget.style.color = T.textMute; }}>
                                    <User size={15} /> Log In
                                </button>
                            </motion.div>

                            {/* Proof stats */}
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}
                                className="flex items-center gap-8 mt-12 pt-8" style={{ borderTop: `1px solid ${T.border}` }}>
                                {[["< 1s", "Sync Speed"], ["99.9%", "Uptime"], ["∞", "Venues"]].map(([val, label]) => (
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
                                    {[["99.9% Uptime", "✦"], ["< 1s Sync", "✦"], ["Zero Latency", "✦"], ["Multi-Venue", "✦"]].map(([txt, sep]) => (
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
                            <button onClick={() => openAuthModal("signup")}
                                className="hidden md:flex items-center gap-3 px-6 py-3 rounded-lg text-xs uppercase tracking-widest font-bold transition-all hover:opacity-90"
                                style={{ background: T.grad, color: T.bg }}>
                                Get Started <ArrowRight size={14} />
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
                                        <h3 className="text-3xl md:text-4xl font-black tracking-[-0.03em] leading-none" style={{ color: T.text }}>Lightning<br />Smart KOTs.</h3>
                                        <p className="text-sm font-medium leading-relaxed max-w-xs" style={{ color: T.textMute }}>Instant ticket routing to multiple stations. Zero-latency table sync so your FOH is always aligned.</p>
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
                                        <div className="text-6xl font-black tracking-[-0.05em] leading-none transition-colors duration-300 group-hover:!text-white" style={{ color: T.text }}>99.9%</div>
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
                    SECTION: ANIMATED STATS COUNTERS — STATIC GRID
                    ══════════════════════════════════════════════════ */}
                <section className="w-full py-24 px-6 relative overflow-hidden" style={{ background: T.bg }}>
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] blur-3xl rounded-full opacity-10"
                            style={{ background: T.grad }} />
                    </div>
                    <div className="max-w-5xl mx-auto relative z-10">
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="flex items-center gap-4 mb-14">
                            <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${T.coral}, transparent)` }} />
                            <p className="font-mono text-xs uppercase tracking-[0.35em] font-black whitespace-nowrap" style={{ color: T.coral }}>By The Numbers</p>
                            <div className="h-px flex-1" style={{ background: `linear-gradient(to left, ${T.coral}, transparent)` }} />
                        </motion.div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { stat: "2,400+", label: "Orders per day", Icon: Utensils, delay: 0 },
                                { stat: "99.9%", label: "System uptime", Icon: ShieldCheck, delay: 0.1 },
                                { stat: "< 1s", label: "KOT sync speed", Icon: Zap, delay: 0.2 },
                                { stat: "₹48L+", label: "Monthly GMV tracked", Icon: TrendingUp, delay: 0.3 },
                            ].map(({ stat, label, Icon, delay }) => (
                                <motion.div key={label}
                                    initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }} transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
                                    whileHover={{ y: -6, scale: 1.03 }}
                                    className="group relative flex flex-col gap-5 p-7 rounded-2xl overflow-hidden cursor-default"
                                    style={{
                                        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
                                        border: `1px solid ${T.border}`,
                                        backdropFilter: "blur(8px)",
                                        boxShadow: isDark ? "0 0 0 1px rgba(255,255,255,0.03)" : "0 2px 16px rgba(0,0,0,0.06)"
                                    }}>
                                    <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" style={{ background: T.coral }} />
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                                        style={{ background: `linear-gradient(135deg, rgba(${T.coralRgb},0.05) 0%, transparent 60%)` }} />
                                    <div className="relative w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: `rgba(${T.coralRgb},0.08)`, border: `1px solid rgba(${T.coralRgb},0.15)` }}>
                                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: T.grad }} />
                                        <Icon size={18} className="relative z-10 transition-colors duration-300 group-hover:!text-white" style={{ color: T.coral }} />
                                    </div>
                                    <div className="text-4xl md:text-5xl font-black tracking-[-0.04em] leading-none bg-clip-text text-transparent"
                                        style={{ backgroundImage: T.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{stat}</div>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: T.textMute }}>{label}</div>
                                    <div className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 rounded-b-2xl" style={{ background: T.grad }} />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════
                    SECTION: TESTIMONIALS — LEFT-TO-RIGHT TICKER
                    ══════════════════════════════════════════════════ */}
                <section className="w-full py-20 overflow-hidden relative" style={{ background: T.bgDeep }}>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 px-6">
                        <p className="font-mono text-xs uppercase tracking-[0.3em] font-bold mb-3" style={{ color: T.coral }}>Real Restaurants. Real Results.</p>
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
                                    { name: "Rohan Mehta", venue: "The Chai Stop, Pune", quote: "ChillBill cut our order confusion by 80%. KOTs print instantly, tables are synced. It just works.", rating: 5 },
                                    { name: "Priya Kapoor", venue: "Bella Cucina, Mumbai", quote: "Our revenue dashboard is insane. I know exactly which dishes are killing it every single day.", rating: 5 },
                                    { name: "Arjun Shetty", venue: "Sips & Bites, Bangalore", quote: "Setup was 20 minutes. Staff got it on day one. We went from chaos to calm in a week.", rating: 5 },
                                    { name: "Meera Shah", venue: "The Garden Café, Ahmedabad", quote: "The PIN login is a game changer for our staff. No more shared passwords or confusion.", rating: 5 },
                                    { name: "Kiran Reddy", venue: "Urban Bites, Hyderabad", quote: "We manage 3 branches with one dashboard. ChillBill made that possible.", rating: 5 },
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
                                { q: "Is ChillBill free to try?", a: "Yes! You can set up your venue and start taking orders immediately — no credit card required." },
                                { q: "Do I need special hardware?", a: "Nope. ChillBill runs entirely on any device with a browser — tablets, phones, or laptops. Your kitchen display is just a browser tab." },
                                { q: "Can multiple staff use it at once?", a: "Absolutely. ChillBill is built for teams. Each staff member gets a unique PIN, and all orders sync in real-time across all stations." },
                                { q: "Is my data secure?", a: "Yes. We use Firebase with enterprise-grade Firestore security rules, PIN-based staff auth, and role-level access control for every venue." },
                                { q: "How fast is the setup?", a: "Most restaurants are fully live within 20 minutes. Our setup wizard walks you through everything step by step." },
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
                            Ready to Chill?<br />
                            <span style={{ color: T.coral }}>Start billing smarter.</span>
                        </h2>
                        <p className="text-base font-medium mb-10" style={{ color: T.textMute }}>Join hundreds of restaurants already running on ChillBill.</p>
                        <button onClick={() => openAuthModal("signup")}
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-sm font-black uppercase tracking-widest transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                            style={{ background: T.grad, color: "#fff", boxShadow: `0 8px 32px rgba(${T.coralRgb},0.35)` }}>
                            Set Up Your Venue <ArrowRight size={16} />
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
                                The unified operating system for ambitious cafes and hospitality businesses around the world.
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
                                <button onClick={() => openAuthModal("landing")} className="text-sm font-semibold transition-colors text-left" style={{ color: T.textSub }}>Log In</button>
                                <button onClick={() => openAuthModal("signup")} className="text-sm font-semibold transition-colors text-left" style={{ color: T.textSub }}>Sign Up</button>
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
