"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Employee } from "@/lib/types";
import { useLanguage } from "@/contexts/language-context";
import { User, Shield, ChefHat, Utensils, Zap, ArrowLeft, LogIn } from "lucide-react";

interface StaffLoginProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    employees: Employee[];
    onLogin: (employee: Employee) => void;
    isForced?: boolean;
}

export default function StaffLogin({ isOpen, onOpenChange, employees, onLogin, isForced = false }: StaffLoginProps) {
    const { t } = useLanguage();
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [pin, setPin] = useState(["", "", "", ""]);
    const [error, setError] = useState("");
    const [shake, setShake] = useState(false);
    const [success, setSuccess] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'Admin': return <Shield className="h-6 w-6" />;
            case 'Manager': return <Zap className="h-6 w-6" />;
            case 'Head Chef':
            case 'Chef': return <ChefHat className="h-6 w-6" />;
            case 'Waiter': return <Utensils className="h-6 w-6" />;
            default: return <User className="h-6 w-6" />;
        }
    };

    const handleSelectEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        setPin(["", "", "", ""]);
        setError("");
        setSuccess(false);
        setTimeout(() => inputRefs.current[0]?.focus(), 150);
    };

    const handlePinChange = (idx: number, val: string) => {
        const digit = val.replace(/\D/g, "").slice(-1);
        const newPin = [...pin];
        newPin[idx] = digit;
        setPin(newPin);
        setError("");
        if (digit && idx < 3) inputRefs.current[idx + 1]?.focus();

        // Auto-submit when all 4 filled
        if (digit && idx === 3) {
            const fullPin = [...newPin].join("");
            setTimeout(() => verifyPin(fullPin), 80);
        }
    };

    const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !pin[idx] && idx > 0) {
            inputRefs.current[idx - 1]?.focus();
        } else if (e.key === "ArrowLeft" && idx > 0) {
            inputRefs.current[idx - 1]?.focus();
        } else if (e.key === "ArrowRight" && idx < 3) {
            inputRefs.current[idx + 1]?.focus();
        } else if (e.key === "Enter") {
            verifyPin(pin.join(""));
        }
    };

    const verifyPin = (fullPin: string) => {
        if (!selectedEmployee || fullPin.length !== 4) return;
        const correctPin = selectedEmployee.loginCode || "0000";
        if (fullPin === correctPin) {
            setSuccess(true);
            setTimeout(() => {
                onLogin(selectedEmployee);
                onOpenChange(false);
                setTimeout(resetState, 400);
            }, 350);
        } else {
            setError("Incorrect PIN");
            setPin(["", "", "", ""]);
            setShake(true);
            setTimeout(() => { setShake(false); inputRefs.current[0]?.focus(); }, 520);
        }
    };

    const resetState = () => {
        setSelectedEmployee(null);
        setPin(["", "", "", ""]);
        setError("");
        setSuccess(false);
    };

    const handleBack = () => {
        setSelectedEmployee(null);
        setPin(["", "", "", ""]);
        setError("");
    };

    const handleClose = () => {
        if (isForced) return;
        resetState();
        onOpenChange(false);
    };

    const pinFilled = pin.every(d => d !== "");

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className={cn(
                "max-w-2xl border-none p-0 bg-transparent shadow-none overflow-visible",
                isForced && "close-button-hidden"
            )}>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl"
                    style={{ background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>

                    {/* Top ambient glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px]"
                        style={{ background: "linear-gradient(90deg, transparent, rgba(255,107,107,0.6), transparent)" }} />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-24 opacity-20"
                        style={{ background: "radial-gradient(ellipse at top, rgba(255,107,107,0.8), transparent)" }} />

                    <div className="relative z-10 p-8">

                        {/* ═══ STEP 1: Profile Grid ═══ */}
                        {!selectedEmployee && (
                            <div>
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-black tracking-tight text-white mb-1">
                                        {t('Who is working?')}
                                    </h2>
                                    <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        {t('Select your profile to continue')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {employees.map((employee) => (
                                        <button
                                            key={employee.id}
                                            onClick={() => handleSelectEmployee(employee)}
                                            className="group relative flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-300 active:scale-95"
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                border: "1px solid rgba(255,255,255,0.08)",
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,107,107,0.1)";
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,107,107,0.3)";
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
                                            }}
                                        >
                                            {/* Avatar */}
                                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110"
                                                style={{ background: employee.color || "linear-gradient(135deg,#FF6B6B,#FF8E53)" }}>
                                                {getRoleIcon(employee.role)}
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-white text-base">{employee.name}</p>
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mt-0.5"
                                                    style={{ color: "rgba(255,255,255,0.35)" }}>
                                                    {employee.role}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {!isForced && (
                                    <div className="mt-6 text-center">
                                        <button onClick={handleClose}
                                            className="text-sm font-medium transition-colors px-4 py-2 rounded-lg"
                                            style={{ color: "rgba(255,255,255,0.3)" }}
                                            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                                            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══ STEP 2: PIN Entry ═══ */}
                        {selectedEmployee && (
                            <div className="flex flex-col items-center text-center">

                                {/* Profile badge */}
                                <div className="relative mb-6">
                                    <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-white shadow-2xl mx-auto"
                                        style={{ background: selectedEmployee.color || "linear-gradient(135deg,#FF6B6B,#FF8E53)" }}>
                                        <div className="scale-[1.4]">{getRoleIcon(selectedEmployee.role)}</div>
                                    </div>
                                    {/* Glow under avatar */}
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-6 blur-xl opacity-60 rounded-full"
                                        style={{ background: selectedEmployee.color || "#FF6B6B" }} />
                                </div>

                                <h2 className="text-2xl font-black text-white mb-1">{selectedEmployee.name}</h2>
                                <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
                                    Enter your 4-digit PIN
                                </p>

                                {/* 4 Individual PIN Boxes */}
                                <div className={cn("flex items-center gap-3 mb-6", shake && "animate-shake")}>
                                    {pin.map((digit, idx) => (
                                        <div key={idx} className="relative">
                                            <input
                                                ref={el => { inputRefs.current[idx] = el; }}
                                                type="password"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={e => handlePinChange(idx, e.target.value)}
                                                onKeyDown={e => handlePinKeyDown(idx, e)}
                                                className="w-16 h-20 text-center text-3xl font-black rounded-2xl focus:outline-none transition-all duration-200"
                                                style={{
                                                    background: digit
                                                        ? "rgba(255,107,107,0.15)"
                                                        : success
                                                            ? "rgba(34,197,94,0.15)"
                                                            : "rgba(255,255,255,0.05)",
                                                    border: digit
                                                        ? "2px solid rgba(255,107,107,0.8)"
                                                        : success
                                                            ? "2px solid rgba(34,197,94,0.8)"
                                                            : error
                                                                ? "2px solid rgba(239,68,68,0.6)"
                                                                : "2px solid rgba(255,255,255,0.1)",
                                                    color: "#fff",
                                                    boxShadow: digit
                                                        ? "0 0 16px rgba(255,107,107,0.3), inset 0 1px 0 rgba(255,255,255,0.06)"
                                                        : "inset 0 1px 0 rgba(255,255,255,0.04)",
                                                    caretColor: "transparent",
                                                }}
                                            />
                                            {/* Bottom accent line */}
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-200"
                                                style={{
                                                    width: digit ? "32px" : "20px",
                                                    background: digit ? "rgba(255,107,107,0.8)" : "rgba(255,255,255,0.15)",
                                                }} />
                                        </div>
                                    ))}
                                </div>

                                {/* Error message */}
                                {error && (
                                    <div className="mb-4 px-4 py-2 rounded-xl text-sm font-medium text-red-400"
                                        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                        {error}
                                    </div>
                                )}

                                {/* Sign In Button */}
                                <button
                                    onClick={() => verifyPin(pin.join(""))}
                                    disabled={!pinFilled || success}
                                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 mb-4 disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{
                                        background: pinFilled && !success
                                            ? "linear-gradient(135deg, #FF6B6B, #FF8E53)"
                                            : "rgba(255,255,255,0.08)",
                                        color: "#fff",
                                        boxShadow: pinFilled && !success ? "0 8px 24px rgba(255,107,107,0.35)" : "none",
                                        transform: pinFilled && !success ? "translateY(0)" : "translateY(0)",
                                    }}
                                    onMouseEnter={e => {
                                        if (pinFilled) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                                    }}
                                >
                                    <LogIn size={16} />
                                    {success ? "Signing in…" : "Sign In"}
                                </button>

                                {/* Back */}
                                <button onClick={handleBack}
                                    className="flex items-center gap-1.5 text-xs font-medium transition-colors py-2"
                                    style={{ color: "rgba(255,255,255,0.3)" }}
                                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                                >
                                    <ArrowLeft size={13} /> Back to profiles
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
            <style>{`
                @keyframes shake {
                    0%,100%{transform:translateX(0)}
                    20%{transform:translateX(-10px)}
                    40%{transform:translateX(10px)}
                    60%{transform:translateX(-6px)}
                    80%{transform:translateX(6px)}
                }
                .animate-shake { animation: shake 0.5s ease-in-out; }
            `}</style>
        </Dialog>
    );
}
