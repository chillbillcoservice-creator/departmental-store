"use client";

import { useState } from "react";
import { Sparkles, ShieldAlert, MessageCircle, RefreshCw, LogOut, Clock, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LicenseValidationStatus } from "@/lib/licensing";

interface LicenseExpiredScreenProps {
  status: LicenseValidationStatus;
  storeName?: string;
  licenseKey?: string;
  validUntil?: string;
  email?: string;
  onRefresh: () => void;
  onSignOut: () => void;
}

export default function LicenseExpiredScreen({
  status,
  storeName = "Your Retail Store",
  licenseKey = "CBILL-LICENSE",
  validUntil,
  email,
  onRefresh,
  onSignOut,
}: LicenseExpiredScreenProps) {
  const [isChecking, setIsChecking] = useState(false);

  const formattedDate = validUntil
    ? new Date(validUntil).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Recently";

  const isOfflineExpired = status === "offline_grace_expired";
  const isSuspended = status === "suspended";

  const whatsappMessage = encodeURIComponent(
    `Hello ChillBill Support! I would like to renew / verify my POS license for *${storeName}* (License Key: ${licenseKey}, Email: ${email || "registered"}). Please assist with renewal.`
  );
  // Default support WhatsApp link (can be configured by developer)
  const whatsappUrl = `https://wa.me/919876543210?text=${whatsappMessage}`;

  const handleRefreshClick = async () => {
    setIsChecking(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsChecking(false), 800);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#050505] text-white font-sans items-center justify-center overflow-hidden relative p-4">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full bg-orange-950/15 blur-[160px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-red-950/15 blur-[160px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">CHILL</span>
            <span className="text-white">BILL</span>
          </span>
        </div>

        {/* Card */}
        <div className="w-full bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[1.5rem] p-7 space-y-6 shadow-2xl shadow-black/80 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

          {/* Icon Badge */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shadow-inner">
              {isOfflineExpired ? (
                <Wifi size={28} className="text-amber-400" />
              ) : isSuspended ? (
                <ShieldAlert size={28} className="text-rose-400" />
              ) : (
                <Clock size={28} className="text-orange-400" />
              )}
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {isOfflineExpired
                ? "Internet Heartbeat Required"
                : isSuspended
                ? "Store License Suspended"
                : "Subscription Validity Expired"}
            </h1>
            <p className="text-white/60 text-xs leading-relaxed">
              {isOfflineExpired ? (
                <>
                  Your terminal has been billing offline for over <span className="text-white font-semibold">14 days</span>.
                  Please connect to Wi-Fi / mobile hotspot for <span className="text-amber-400 font-semibold">5 seconds</span> to refresh your license heartbeat.
                </>
              ) : isSuspended ? (
                <>
                  Access for <span className="text-white font-semibold">{storeName}</span> has been temporarily suspended by the administrator. Please contact billing support.
                </>
              ) : (
                <>
                  The annual subscription for <span className="text-white font-semibold">{storeName}</span> expired on{" "}
                  <span className="text-orange-400 font-semibold">{formattedDate}</span>.
                </>
              )}
            </p>
          </div>

          {/* License Metadata Capsule */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 text-left text-xs font-mono">
            <div className="flex justify-between text-muted-foreground">
              <span>Store:</span>
              <span className="text-white font-sans font-bold truncate max-w-[180px]">{storeName}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>License ID:</span>
              <span className="text-orange-400 font-bold">{licenseKey}</span>
            </div>
            {email && (
              <div className="flex justify-between text-muted-foreground">
                <span>Account:</span>
                <span className="text-white/80 truncate max-w-[180px]">{email}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-2">
            <Button
              onClick={handleRefreshClick}
              disabled={isChecking}
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 gap-2"
            >
              <RefreshCw size={15} className={isChecking ? "animate-spin" : ""} />
              {isChecking ? "Checking Status..." : "Check Renewal Status"}
            </Button>

            {!isOfflineExpired && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all"
              >
                <MessageCircle size={15} />
                Renew via WhatsApp Support
              </a>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              className="w-full text-xs text-white/40 hover:text-white hover:bg-white/5 gap-1.5"
            >
              <LogOut size={13} />
              Switch Account / Sign Out
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-white/30">
          ChillBill Retail Cloud &bull; Secure Multi-Tenant Architecture
        </p>
      </div>
    </div>
  );
}
