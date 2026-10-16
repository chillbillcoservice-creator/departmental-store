"use client";

import { signOut } from "firebase/auth";
import { initializeFirebase } from "@/firebase";
import { ShieldOff, Mail, MessageCircle, LogOut, Sparkles } from "lucide-react";

interface AccessDeniedScreenProps {
    email: string;
    onSignOut: () => void;
}

export default function AccessDeniedScreen({ email, onSignOut }: AccessDeniedScreenProps) {
    const handleSignOut = async () => {
        try {
            const { auth } = initializeFirebase();
            await signOut(auth);
        } finally {
            onSignOut();
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[#050505] text-white font-sans items-center justify-center overflow-hidden relative">
            {/* Ambient orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full bg-red-900/8 blur-[150px]" />
                <div className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-rose-900/8 blur-[150px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center text-center gap-8">

                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <Sparkles size={14} className="text-white" />
                    </div>
                    <span className="text-2xl font-black tracking-tighter">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">CHILL</span>
                        <span className="text-white">BILL</span>
                    </span>
                </div>

                {/* Card */}
                <div className="w-full bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-8 space-y-6 shadow-2xl shadow-black/50 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <ShieldOff size={28} className="text-red-400" />
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-white">Access Restricted</h1>
                        <p className="text-white/45 text-sm leading-relaxed">
                            <span className="text-white/70 font-mono text-xs bg-white/5 px-2 py-0.5 rounded-lg">{email}</span>
                            <br />
                            <span className="mt-2 block">is not yet approved to use ChillBill POS.</span>
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-[10px] text-white/20 uppercase tracking-widest">Get access</span>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-3">
                        <a
                            href="mailto:support@chillbill.co?subject=ChillBill%20Access%20Request&body=Hi%2C%20I%20would%20like%20to%20get%20access%20to%20ChillBill%20POS%20for%20my%20restaurant.%0A%0AEmail%3A%20"
                            className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 bg-white text-[#111] text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all shadow-md"
                        >
                            <Mail size={15} />
                            <span>Email Us to Get Access</span>
                        </a>
                        <a
                            href="https://wa.me/+919999999999?text=Hi%2C%20I%20want%20to%20get%20access%20to%20ChillBill%20POS%20for%20my%20restaurant."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-sm font-semibold hover:bg-[#25D366]/15 active:scale-[0.98] transition-all"
                        >
                            <MessageCircle size={15} />
                            <span>WhatsApp Us</span>
                        </a>
                    </div>
                </div>

                {/* Sign out */}
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-white/25 hover:text-white/50 text-sm transition-colors"
                >
                    <LogOut size={14} />
                    Sign out from {email}
                </button>

                <p className="text-white/12 text-[11px]">
                    © {new Date().getFullYear()} ChillBill · Restaurant Management Platform
                </p>
            </div>
        </div>
    );
}
