"use client";

import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, CheckCircle2, User, Users, Plus, Trash2, ArrowRight, ArrowLeft, Rocket, ChevronDown, ChevronUp, PlusCircle, Truck, ShoppingCart, Package, Landmark, Receipt, Users2, Shield } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SetupData, VenueDetails, OwnerDetails, Employee } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { buildUsername, generateUniqueUsername, isUsernameTaken } from "@/lib/generate-username";
import { Copy, Check } from "lucide-react";

interface SetupWizardProps {
  onComplete: (data: SetupData) => void;
  initialData?: Partial<SetupData>;
}

const steps = [
  { id: 1, title: "Store", icon: Building2 },
  { id: 2, title: "Owner", icon: User },
  { id: 3, title: "Staff", icon: Users },
  { id: 4, title: "Vendors", icon: Truck },
];

const DASHBOARD_TABS = [
  { id: 'payments', label: 'Billing / POS', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'customers', label: 'Customers / Khata', icon: Users2 },
  { id: 'vendors', label: 'Vendors', icon: Landmark },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'admin', label: 'Admin', icon: Shield },
];

const getRoleDefaults = (role: string) => {
  switch (role) {
    case 'Admin':
    case 'Store Owner':
    case 'Owner':
      return ['payments', 'inventory', 'expenses', 'customers', 'vendors', 'staff', 'admin'];
    case 'Manager':
    case 'Store Manager':
      return ['payments', 'inventory', 'expenses', 'customers', 'vendors', 'staff', 'admin'];
    case 'Cashier':
    case 'Billing Clerk':
      return ['payments', 'inventory', 'customers'];
    case 'Inventory Clerk':
    case 'Stock Keeper':
      return ['inventory', 'vendors'];
    case 'Floor Assistant':
    case 'Helper':
      return ['payments', 'inventory'];
    case 'Delivery Boy':
    case 'Delivery Person':
      return ['payments'];
    default:
      return ['payments'];
  }
};

function WizardSection({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">{title}</h3>
        {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      <div className={cn("grid transition-all duration-300 ease-in-out", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="p-3 pt-0 space-y-3">
            <div className="pt-3">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PinInput({
  id,
  value = "",
  onChange,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const cleanVal = (value || "").replace(/\D/g, "").slice(0, 4);
  const digits = [cleanVal[0] || "", cleanVal[1] || "", cleanVal[2] || "", cleanVal[3] || ""];

  const handleChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const char = raw.slice(-1);

    const newDigits = [...digits];
    newDigits[idx] = char;

    let lastFilled = idx;
    for (let i = 3; i >= 0; i--) {
      if (newDigits[i]) {
        lastFilled = Math.max(lastFilled, i);
        break;
      }
    }
    const chars: string[] = [];
    for (let i = 0; i <= lastFilled; i++) {
      chars.push(newDigits[i] || "0");
    }
    const nextVal = chars.join("").slice(0, 4);
    onChange(nextVal);

    if (idx < 3) {
      inputsRef.current[idx + 1]?.focus();
      inputsRef.current[idx + 1]?.select();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[idx]) {
        const chars = cleanVal.split("");
        chars.splice(idx, 1);
        onChange(chars.join(""));
      } else if (idx > 0) {
        const chars = cleanVal.split("");
        chars.splice(idx - 1, 1);
        onChange(chars.join(""));
        inputsRef.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      inputsRef.current[idx - 1]?.focus();
      inputsRef.current[idx - 1]?.select();
    } else if (e.key === "ArrowRight" && idx < 3) {
      e.preventDefault();
      inputsRef.current[idx + 1]?.focus();
      inputsRef.current[idx + 1]?.select();
    } else if (e.key === "Delete") {
      e.preventDefault();
      const chars = cleanVal.split("");
      chars.splice(idx, 1);
      onChange(chars.join(""));
    }
  };

  const handleFocus = (idx: number, e: React.FocusEvent<HTMLInputElement>) => {
    const firstEmpty = digits.findIndex((d) => !d);
    if (firstEmpty !== -1 && firstEmpty < idx) {
      inputsRef.current[firstEmpty]?.focus();
      inputsRef.current[firstEmpty]?.select();
      return;
    }
    e.target.select();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted) {
      onChange(pasted);
      const targetIdx = Math.min(pasted.length - 1, 3);
      inputsRef.current[targetIdx]?.focus();
    }
  };

  return (
    <div className="space-y-1.5">
      <div id={id} className="flex items-center gap-2" onPaste={handlePaste}>
        {digits.map((d, idx) => (
          <input
            key={idx}
            ref={(el) => { inputsRef.current[idx] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={d}
            onChange={(e) => handleChange(idx, e)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onFocus={(e) => handleFocus(idx, e)}
            disabled={disabled}
            className={cn(
              "w-12 h-12 text-center text-xl font-black rounded-lg bg-background border transition-all select-all",
              d
                ? "border-orange-500/80 text-foreground ring-1 ring-orange-500/30 bg-orange-500/5 shadow-sm"
                : "border-input text-muted-foreground hover:border-zinc-500",
              "focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            )}
            placeholder="•"
          />
        ))}
        {cleanVal.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange("");
              inputsRef.current[0]?.focus();
            }}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Clear Passcode"
          >
            Clear
          </Button>
        )}
      </div>
      {cleanVal.length > 0 && cleanVal.length < 4 && (
        <p className="text-[11px] font-medium text-amber-500">
          Please enter all 4 digits ({cleanVal.length}/4)
        </p>
      )}
      {cleanVal.length === 4 && (
        <p className="text-[11px] font-medium text-emerald-500">
          ✓ 4-digit PIN ready
        </p>
      )}
    </div>
  );
}

const COUNTRIES = [
  { name: "Afghanistan", code: "AF", currency: "?", currencyName: "AFN", languages: ["en"] },
  { name: "Albania", code: "AL", currency: "L", currencyName: "ALL", languages: ["en"] },
  { name: "Algeria", code: "DZ", currency: "?.?", currencyName: "DZD", languages: ["en", "fr"] },
  { name: "Andorra", code: "AD", currency: "€", currencyName: "EUR", languages: ["en", "es", "fr"] },
  { name: "Angola", code: "AO", currency: "Kz", currencyName: "AOA", languages: ["en"] },
  { name: "Argentina", code: "AR", currency: "$", currencyName: "ARS", languages: ["es", "en"] },
  { name: "Armenia", code: "AM", currency: "?", currencyName: "AMD", languages: ["en"] },
  { name: "Australia", code: "AU", currency: "$", currencyName: "AUD", languages: ["en"] },
  { name: "Austria", code: "AT", currency: "€", currencyName: "EUR", languages: ["de", "en"] },
  { name: "Azerbaijan", code: "AZ", currency: "?", currencyName: "AZN", languages: ["en"] },
  { name: "Bahrain", code: "BH", currency: ".?.?", currencyName: "BHD", languages: ["en"] },
  { name: "Bangladesh", code: "BD", currency: "?", currencyName: "BDT", languages: ["en"] },
  { name: "Belarus", code: "BY", currency: "Br", currencyName: "BYN", languages: ["en"] },
  { name: "Belgium", code: "BE", currency: "€", currencyName: "EUR", languages: ["fr", "de", "en"] },
  { name: "Bhutan", code: "BT", currency: "Nu.", currencyName: "BTN", languages: ["en"] },
  { name: "Bolivia", code: "BO", currency: "Bs.", currencyName: "BOB", languages: ["es", "en"] },
  { name: "Bosnia and Herzegovina", code: "BA", currency: "KM", currencyName: "BAM", languages: ["en"] },
  { name: "Brazil", code: "BR", currency: "R$", currencyName: "BRL", languages: ["en"] },
  { name: "Bulgaria", code: "BG", currency: "??", currencyName: "BGN", languages: ["en"] },
  { name: "Cambodia", code: "KH", currency: "?", currencyName: "KHR", languages: ["en"] },
  { name: "Canada", code: "CA", currency: "$", currencyName: "CAD", languages: ["en", "fr"] },
  { name: "Chile", code: "CL", currency: "$", currencyName: "CLP", languages: ["es", "en"] },
  { name: "China", code: "CN", currency: "¥", currencyName: "CNY", languages: ["zh", "en"] },
  { name: "Colombia", code: "CO", currency: "$", currencyName: "COP", languages: ["es", "en"] },
  { name: "Costa Rica", code: "CR", currency: "¢", currencyName: "CRC", languages: ["es", "en"] },
  { name: "Croatia", code: "HR", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Cuba", code: "CU", currency: "$", currencyName: "CUP", languages: ["es", "en"] },
  { name: "Cyprus", code: "CY", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Czech Republic", code: "CZ", currency: "Kc", currencyName: "CZK", languages: ["en"] },
  { name: "Denmark", code: "DK", currency: "kr", currencyName: "DKK", languages: ["en"] },
  { name: "Dominican Republic", code: "DO", currency: "RD$", currencyName: "DOP", languages: ["es", "en"] },
  { name: "Ecuador", code: "EC", currency: "$", currencyName: "USD", languages: ["es", "en"] },
  { name: "Egypt", code: "EG", currency: "E£", currencyName: "EGP", languages: ["en"] },
  { name: "Estonia", code: "EE", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Ethiopia", code: "ET", currency: "Br", currencyName: "ETB", languages: ["en"] },
  { name: "Finland", code: "FI", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "France", code: "FR", currency: "€", currencyName: "EUR", languages: ["fr", "en"] },
  { name: "Georgia", code: "GE", currency: "?", currencyName: "GEL", languages: ["en"] },
  { name: "Germany", code: "DE", currency: "€", currencyName: "EUR", languages: ["de", "en"] },
  { name: "Ghana", code: "GH", currency: "?", currencyName: "GHS", languages: ["en"] },
  { name: "Greece", code: "GR", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Hong Kong", code: "HK", currency: "$", currencyName: "HKD", languages: ["zh", "en"] },
  { name: "Hungary", code: "HU", currency: "Ft", currencyName: "HUF", languages: ["en"] },
  { name: "Iceland", code: "IS", currency: "kr", currencyName: "ISK", languages: ["en"] },
  { name: "India", code: "IN", currency: "Rs.", currencyName: "INR", languages: ["hi", "ta", "gu", "ml", "pa", "bn", "mr", "ur", "en"] },
  { name: "Indonesia", code: "ID", currency: "Rp", currencyName: "IDR", languages: ["en"] },
  { name: "Iran", code: "IR", currency: "?", currencyName: "IRR", languages: ["en"] },
  { name: "Iraq", code: "IQ", currency: "?.?", currencyName: "IQD", languages: ["en"] },
  { name: "Ireland", code: "IE", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Israel", code: "IL", currency: "?", currencyName: "ILS", languages: ["en"] },
  { name: "Italy", code: "IT", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Japan", code: "JP", currency: "¥", currencyName: "JPY", languages: ["ja", "en"] },
  { name: "Jordan", code: "JO", currency: "?.?", currencyName: "JOD", languages: ["en"] },
  { name: "Kazakhstan", code: "KZ", currency: "?", currencyName: "KZT", languages: ["en"] },
  { name: "Kenya", code: "KE", currency: "KSh", currencyName: "KES", languages: ["en"] },
  { name: "Kuwait", code: "KW", currency: "?.?", currencyName: "KWD", languages: ["en"] },
  { name: "Latvia", code: "LV", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Lebanon", code: "LB", currency: "?.?", currencyName: "LBP", languages: ["en"] },
  { name: "Lithuania", code: "LT", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Luxembourg", code: "LU", currency: "€", currencyName: "EUR", languages: ["fr", "de", "en"] },
  { name: "Malaysia", code: "MY", currency: "RM", currencyName: "MYR", languages: ["en"] },
  { name: "Maldives", code: "MV", currency: "Rf", currencyName: "MVR", languages: ["en"] },
  { name: "Malta", code: "MT", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Mexico", code: "MX", currency: "$", currencyName: "MXN", languages: ["es", "en"] },
  { name: "Monaco", code: "MC", currency: "€", currencyName: "EUR", languages: ["fr", "en"] },
  { name: "Mongolia", code: "MN", currency: "?", currencyName: "MNT", languages: ["en"] },
  { name: "Morocco", code: "MA", currency: "?.?.", currencyName: "MAD", languages: ["en"] },
  { name: "Myanmar", code: "MM", currency: "K", currencyName: "MMK", languages: ["en"] },
  { name: "Nepal", code: "NP", currency: "?", currencyName: "NPR", languages: ["en"] },
  { name: "Netherlands", code: "NL", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "New Zealand", code: "NZ", currency: "$", currencyName: "NZD", languages: ["en"] },
  { name: "Nigeria", code: "NG", currency: "?", currencyName: "NGN", languages: ["en"] },
  { name: "North Korea", code: "KP", currency: "?", currencyName: "KPW", languages: ["en"] },
  { name: "Norway", code: "NO", currency: "kr", currencyName: "NOK", languages: ["en"] },
  { name: "Oman", code: "OM", currency: "?.?.", currencyName: "OMR", languages: ["en"] },
  { name: "Pakistan", code: "PK", currency: "Rs", currencyName: "PKR", languages: ["ur", "en"] },
  { name: "Peru", code: "PE", currency: "S/.", currencyName: "PEN", languages: ["es", "en"] },
  { name: "Philippines", code: "PH", currency: "?", currencyName: "PHP", languages: ["en"] },
  { name: "Poland", code: "PL", currency: "zl", currencyName: "PLN", languages: ["en"] },
  { name: "Portugal", code: "PT", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Qatar", code: "QA", currency: "?.?", currencyName: "QAR", languages: ["en"] },
  { name: "Romania", code: "RO", currency: "lei", currencyName: "RON", languages: ["en"] },
  { name: "Russia", code: "RU", currency: "?", currencyName: "RUB", languages: ["ru", "en"] },
  { name: "Saudi Arabia", code: "SA", currency: "?", currencyName: "SAR", languages: ["en"] },
  { name: "Singapore", code: "SG", currency: "$", currencyName: "SGD", languages: ["zh", "en"] },
  { name: "Slovakia", code: "SK", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Slovenia", code: "SI", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "South Africa", code: "ZA", currency: "R", currencyName: "ZAR", languages: ["en"] },
  { name: "South Korea", code: "KR", currency: "?", currencyName: "KRW", languages: ["en"] },
  { name: "Spain", code: "ES", currency: "€", currencyName: "EUR", languages: ["es", "en"] },
  { name: "Sri Lanka", code: "LK", currency: "Rs", currencyName: "LKR", languages: ["en"] },
  { name: "Sweden", code: "SE", currency: "kr", currencyName: "SEK", languages: ["en"] },
  { name: "Switzerland", code: "CH", currency: "Fr", currencyName: "CHF", languages: ["de", "fr", "en"] },
  { name: "Taiwan", code: "TW", currency: "NT$", currencyName: "TWD", languages: ["zh", "en"] },
  { name: "Thailand", code: "TH", currency: "?", currencyName: "THB", languages: ["en"] },
  { name: "Turkey", code: "TR", currency: "?", currencyName: "TRY", languages: ["en"] },
  { name: "Ukraine", code: "UA", currency: "?", currencyName: "UAH", languages: ["en"] },
  { name: "United Arab Emirates", code: "AE", currency: "?.?", currencyName: "AED", languages: ["en"] },
  { name: "United Kingdom", code: "GB", currency: "£", currencyName: "GBP", languages: ["en"] },
  { name: "United States", code: "US", currency: "$", currencyName: "USD", languages: ["en"] },
  { name: "Vatican City", code: "VA", currency: "€", currencyName: "EUR", languages: ["en"] },
  { name: "Venezuela", code: "VE", currency: "Bs.S", currencyName: "VES", languages: ["es", "en"] },
  { name: "Vietnam", code: "VN", currency: "?", currencyName: "VND", languages: ["en"] },
  { name: "Other", code: "OT", currency: "$", currencyName: "USD", languages: ["en"] },
];

export default function SetupWizard({ onComplete, initialData }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const { t, setLanguage: setGlobalLanguage } = useLanguage();


  // State for all form fields
  const [venue, setVenue] = useState<VenueDetails>({
    name: initialData?.venue?.name || "",
    address: initialData?.venue?.address || "",
    street: initialData?.venue?.street || "",
    city: initialData?.venue?.city || "",
    state: initialData?.venue?.state || "",
    zip: initialData?.venue?.zip || "",
    country: initialData?.venue?.country || "India",
    contactNumber: initialData?.venue?.contactNumber || "",
    email: initialData?.venue?.email || "",
    tagline: initialData?.venue?.tagline || "",
  });

  const [currency, setCurrency] = useState(initialData?.currency || "Rs.");
  const [language, setLanguage] = useState(initialData?.language || "en");
  const [customCurrency, setCustomCurrency] = useState("");
  const [customCountry, setCustomCountry] = useState("");
  const [customCurrencyName, setCustomCurrencyName] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [owner, setOwner] = useState<OwnerDetails>({
    name: initialData?.owner?.name || "",
    contactNumber: initialData?.owner?.contactNumber || "",
    email: initialData?.owner?.email || "",
    loginCode: initialData?.owner?.loginCode || "",
    password: initialData?.owner?.password || "",
    username: initialData?.owner?.username || (initialData?.owner?.name ? generateUniqueUsername(initialData.owner.name, []) : ""),
  });
  const [isOwnerUsernameCustom, setIsOwnerUsernameCustom] = useState(Boolean(initialData?.owner?.username));

  const [additionalOwners, setAdditionalOwners] = useState<OwnerDetails[]>(initialData?.additionalOwners || []);
  const [customPartnerUsernames, setCustomPartnerUsernames] = useState<Record<number, boolean>>({});
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerContact, setNewOwnerContact] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");

  // Employee State
  const [employees, setEmployees] = useState<Partial<Employee>[]>(
    (initialData?.employees && initialData.employees.length > 0)
      ? initialData.employees
      : [{ name: "", username: "", role: "Manager", salary: 0, mobile: "", email: "", govtId: "", color: '#f59e0b', allowedTabs: getRoleDefaults('Manager'), loginCode: '', password: '' }]
  );
  const [customEmpUsernames, setCustomEmpUsernames] = useState<Record<number, boolean>>({});

  // Vendor State
  const [vendors, setVendors] = useState<any[]>(
    (initialData?.vendors && initialData.vendors.length > 0)
      ? initialData.vendors
      : [{ name: "", phone: "", email: "", category: "General", location: "", nextPaymentDate: "" }]
  );

  const handleNext = () => {
    if (step === 2) {
      if (owner.loginCode && owner.loginCode.length > 0 && owner.loginCode.length < 4) {
        alert("Please enter a complete 4-digit passcode for the store owner, or clear it.");
        return;
      }
      const incompletePartner = additionalOwners.find(o => o.loginCode && o.loginCode.length > 0 && o.loginCode.length < 4);
      if (incompletePartner) {
        alert(`Please enter a complete 4-digit passcode for ${incompletePartner.name || "partner"}, or clear it.`);
        return;
      }
    }
    if (step === 3) {
      const incompleteEmp = employees.find(e => e.loginCode && e.loginCode.length > 0 && e.loginCode.length < 4);
      if (incompleteEmp) {
        alert(`Please enter a complete 4-digit passcode for ${incompleteEmp.name || "staff member"}, or clear it.`);
        return;
      }
    }
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleBasicChange = (setter: any, field: string, value: string) => {
    setter((prev: any) => ({ ...prev, [field]: value }));
  };

  // Helper: Collect all currently assigned usernames across owner, partners, and employees
  const getAllTakenUsernames = (excludeKey?: string) => {
    const list: string[] = [];
    if (owner.username && excludeKey !== 'owner') list.push(owner.username);
    additionalOwners.forEach((o, i) => {
      if (o.username && excludeKey !== `partner-${i}`) list.push(o.username);
    });
    employees.forEach((e, i) => {
      if (e.username && excludeKey !== `emp-${i}`) list.push(e.username);
    });
    return list;
  };

  const handleOwnerNameChange = (newName: string) => {
    setOwner(prev => {
      const taken = getAllTakenUsernames('owner');
      const nextUsername = !isOwnerUsernameCustom
        ? (newName.trim() ? generateUniqueUsername(newName, taken) : '')
        : prev.username;
      return { ...prev, name: newName, username: nextUsername };
    });
  };

  const handleOwnerUsernameChange = (newVal: string) => {
    const clean = newVal.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    setIsOwnerUsernameCustom(true);
    setOwner(prev => ({ ...prev, username: clean }));
  };

  const addEmployeeCard = () => {
    setEmployees([
      ...employees,
      {
        name: "",
        username: "",
        role: "Manager",
        salary: 0,
        mobile: "",
        email: "",
        govtId: "",
        color: '#f59e0b',
        allowedTabs: getRoleDefaults('Manager'),
        loginCode: '',
        password: ''
      }
    ]);
  };

  const updateEmployee = (index: number, field: keyof Employee, value: any) => {
    const newEmps = [...employees];
    const current = newEmps[index];

    if (field === 'name') {
      const newName = value as string;
      const taken = getAllTakenUsernames(`emp-${index}`);
      const isCustom = customEmpUsernames[index];
      const nextUsername = !isCustom
        ? (newName.trim() ? generateUniqueUsername(newName, taken) : '')
        : current.username;
      newEmps[index] = { ...current, name: newName, username: nextUsername };
    } else if (field === 'username') {
      const clean = (value as string).toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      setCustomEmpUsernames(prev => ({ ...prev, [index]: true }));
      newEmps[index] = { ...current, username: clean };
    } else {
      const updatedEmp = { ...current, [field]: value };
      if (field === 'role') {
        updatedEmp.allowedTabs = getRoleDefaults(value);
      }
      newEmps[index] = updatedEmp;
    }

    setEmployees(newEmps);
  };

  const toggleEmployeeTab = (index: number, tabId: string) => {
    const newEmps = [...employees];
    const emp = newEmps[index];
    const currentTabs = emp.allowedTabs || [];

    if (currentTabs.includes(tabId)) {
      emp.allowedTabs = currentTabs.filter(t => t !== tabId);
    } else {
      emp.allowedTabs = [...currentTabs, tabId];
    }

    newEmps[index] = emp;
    setEmployees(newEmps);
  };

  const removeEmployee = (index: number) => {
    const newEmps = [...employees];
    if (newEmps.length === 1) {
      // Don't remove the last card, just reset it
      newEmps[0] = { name: "", username: "", role: "Manager", salary: 0, mobile: "", email: "", govtId: "", color: '#f59e0b', allowedTabs: getRoleDefaults('Manager'), loginCode: '', password: '' };
    } else {
      newEmps.splice(index, 1);
    }
    setEmployees(newEmps);
  };

  const addVendorCard = () => {
    setVendors([...vendors, { name: "", phone: "", email: "", category: "General" }]);
  };

  const updateVendor = (index: number, field: string, value: any) => {
    const newVendors = [...vendors];
    newVendors[index] = { ...newVendors[index], [field]: value };
    setVendors(newVendors);
  };

  const removeVendor = (index: number) => {
    const newVendors = [...vendors];
    if (newVendors.length === 1) {
      // Don't remove the last card, just reset it
      newVendors[0] = { name: "", phone: "", email: "", category: "General" };
    } else {
      newVendors.splice(index, 1);
    }
    setVendors(newVendors);
  };

  const addOwner = () => {
    setAdditionalOwners([
      ...additionalOwners,
      {
        name: "",
        username: "",
        contactNumber: "",
        email: "",
        loginCode: "",
        password: ""
      }
    ]);
  };

  const updateAdditionalOwner = (index: number, field: keyof OwnerDetails, value: string) => {
    const newOwners = [...additionalOwners];
    const current = newOwners[index];

    if (field === 'name') {
      const taken = getAllTakenUsernames(`partner-${index}`);
      const isCustom = customPartnerUsernames[index];
      const nextUsername = !isCustom
        ? (value.trim() ? generateUniqueUsername(value, taken) : '')
        : current.username;
      newOwners[index] = { ...current, name: value, username: nextUsername };
    } else if (field === 'username') {
      const clean = value.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      setCustomPartnerUsernames(prev => ({ ...prev, [index]: true }));
      newOwners[index] = { ...current, username: clean };
    } else {
      newOwners[index] = { ...current, [field]: value };
    }

    setAdditionalOwners(newOwners);
  };

  const removeOwner = (index: number) => {
    const newOwners = [...additionalOwners];
    newOwners.splice(index, 1);
    setAdditionalOwners(newOwners);
  };

  const handleFinish = () => {
    if (owner.loginCode && owner.loginCode.length > 0 && owner.loginCode.length < 4) {
      alert("Please enter a complete 4-digit passcode for the store owner, or clear it.");
      return;
    }
    const incompletePartner = additionalOwners.find(o => o.loginCode && o.loginCode.length > 0 && o.loginCode.length < 4);
    if (incompletePartner) {
      alert(`Please enter a complete 4-digit passcode for ${incompletePartner.name || "partner"}, or clear it.`);
      return;
    }
    const incompleteEmp = employees.find(e => e.loginCode && e.loginCode.length > 0 && e.loginCode.length < 4);
    if (incompleteEmp) {
      alert(`Please enter a complete 4-digit passcode for ${incompleteEmp.name || "staff member"}, or clear it.`);
      return;
    }

    const finalCurrency = currency === "custom" || venue.country === "Other" ? customCurrency : currency;
    const finalCountry = venue.country === "Other" ? customCountry : venue.country;
    const fullAddress = venue.address || [venue.street, venue.city, venue.state, venue.zip, finalCountry].filter(Boolean).join(", ");
    const addressToSave = fullAddress || (finalCountry ? `${finalCountry}` : "");

    // Compute final collision-free usernames for everyone
    const assignedUsernames: string[] = [];

    const finalOwnerUsername = owner.username?.trim() || generateUniqueUsername(owner.name || 'owner', assignedUsernames);
    assignedUsernames.push(finalOwnerUsername);
    const finalOwner = { ...owner, username: finalOwnerUsername };

    const validAdditionalOwners = additionalOwners
      .filter(o => o.name)
      .map(o => {
        const u = o.username?.trim() || generateUniqueUsername(o.name, assignedUsernames);
        assignedUsernames.push(u);
        return { ...o, username: u };
      });

    const validEmployees = employees
      .filter(e => e.name)
      .map(e => {
        const u = e.username?.trim() || generateUniqueUsername(e.name!, assignedUsernames);
        assignedUsernames.push(u);
        return { ...e, username: u };
      });

    const validVendors = vendors.filter(v => v.name);

    onComplete({
      venue: { ...venue, country: finalCountry, address: addressToSave },
      owner: finalOwner,
      additionalOwners: validAdditionalOwners,
      employees: validEmployees,
      vendors: validVendors,
      currency: finalCurrency || "Rs.",
      language: language
    });
  };

  const isStep1Valid = true;
  const isStep2Valid = owner.name && owner.contactNumber;
  const isStep3Valid = true; // Optional to add employees

  return (
    <Dialog open={true} >
      <DialogContent className="sm:max-w-[800px] w-full border-0 shadow-2xl [&>button]:hidden overflow-hidden max-h-[85vh] flex flex-col p-4 md:p-6 bg-background/95 backdrop-blur-2xl rounded-2xl ring-1 ring-border/50">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-50" />
        </div>
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <DialogHeader className="mb-6 relative z-10 shrink-0 space-y-4">
          <div className="text-left space-y-1">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              {t('Welcome')}
              <p className="text-xs font-normal text-muted-foreground/60 mt-1">Step {step} of 4</p>
            </DialogTitle>
          </div>

          <div className="grid grid-cols-4 gap-2 w-full">
            {steps.map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all duration-200 group h-14",
                  step === s.id
                    ? "border-orange-500 bg-orange-500/10 text-orange-600 shadow-sm ring-1 ring-orange-500/20"
                    : step > s.id
                      ? "border-orange-500/30 bg-orange-500/5 text-orange-600/70"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                type="button"
              >
                <s.icon size={18} className={cn("mb-1 transition-all", step === s.id ? "scale-110" : "opacity-70 group-hover:opacity-100")} />
                <span className={cn(
                  "text-[13px] font-bold uppercase tracking-wide truncate max-w-full leading-none",
                  step === s.id ? "" : "opacity-80"
                )}>{t(s.title)}</span>
              </button>
            ))}
          </div>
          <div className="border-b border-border/80 mt-2" />
        </DialogHeader>

        <div className="py-4 px-2 flex-1 overflow-y-auto custom-scrollbar">
          {step === 1 && (
            <div className="h-full px-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-muted-foreground">{t('Business Name')}</Label>
                    <Input
                      value={venue.name}
                      onChange={(e) => handleBasicChange(setVenue, 'name', e.target.value)}
                      placeholder="e.g. The Grand Hotel"
                      className="h-10 bg-background border-input text-sm focus:ring-orange-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-muted-foreground">{t('Tagline (Optional)')}</Label>
                    <Input
                      value={venue.tagline}
                      onChange={(e) => handleBasicChange(setVenue, 'tagline', e.target.value)}
                      placeholder="e.g. Best Brews in Town"
                      className="h-10 bg-background border-input text-sm"
                    />
                  </div>

                  <div className="border-b border-border my-2" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('City')}</Label>
                      <Input
                        value={venue.city}
                        onChange={(e) => handleBasicChange(setVenue, 'city', e.target.value)}
                        placeholder="e.g. Manali"
                        className="h-10 bg-background border-input text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('State')}</Label>
                      <Input
                        value={venue.state}
                        onChange={(e) => handleBasicChange(setVenue, 'state', e.target.value)}
                        placeholder="e.g. HP"
                        className="h-10 bg-background border-input text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-muted-foreground">{t('Zip Code')}</Label>
                    <Input
                      value={venue.zip}
                      onChange={(e) => handleBasicChange(setVenue, 'zip', e.target.value)}
                      placeholder="e.g. 175131"
                      className="h-10 bg-background border-input text-sm"
                    />
                  </div>
                </div>

                {/* Vertical Divider Removed */}

                {/* Right Column */}
                <div className="space-y-4 md:pl-8">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-muted-foreground">{t('Business Email (Optional)')}</Label>
                    <Input
                      value={venue.email}
                      onChange={(e) => handleBasicChange(setVenue, 'email', e.target.value)}
                      placeholder="e.g. contact@hotel.com"
                      className="h-10 bg-background border-input text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-muted-foreground">{t('Business Mobile (Optional)')}</Label>
                    <Input
                      value={venue.contactNumber}
                      onChange={(e) => handleBasicChange(setVenue, 'contactNumber', e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="h-10 bg-background border-input text-sm"
                    />
                  </div>

                  <div className="border-b border-border my-2" />

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-muted-foreground">{t('Country')}</Label>
                    <Select
                      value={venue.country}
                      onValueChange={(val) => {
                        handleBasicChange(setVenue, 'country', val);
                        const selectedCountry = COUNTRIES.find(c => c.name === val);
                        if (selectedCountry) {
                          if (val !== 'Other') {
                            setCurrency(selectedCountry.currency);
                          } else {
                            setCurrency('custom');
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 bg-background border-input text-sm">
                        <SelectValue placeholder={t('Select Country')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.name}>
                            <span className="flex items-center gap-2">
                              <span>{c.name}</span>
                              <span className="text-xs text-muted-foreground ml-auto">{c.currency}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-muted-foreground">{t('Language')}</Label>
                    <Select
                      value={language}
                      onValueChange={(val) => {
                        setLanguage(val);
                        setGlobalLanguage(val as any);
                      }}
                    >
                      <SelectTrigger className="h-10 bg-background border-input text-sm">
                        <SelectValue placeholder={t('Select Language')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        {(() => {
                          const country = COUNTRIES.find(c => c.name === venue.country);
                          if (!country || !country.languages) return null;
                          // Filter out English as it is already added
                          const otherLangs = country.languages.filter(l => l !== 'en');
                          return otherLangs.map(lang => (
                            <SelectItem key={lang} value={lang}>
                              {lang === 'es' ? 'Spanish' :
                                lang === 'fr' ? 'French' :
                                  lang === 'de' ? 'German' :
                                    lang === 'hi' ? 'Hindi' :
                                      lang === 'zh' ? 'Chinese' :
                                        lang === 'ja' ? 'Japanese' :
                                          lang === 'ru' ? 'Russian' :
                                            lang === 'ta' ? 'Tamil' :
                                              lang === 'gu' ? 'Gujarati' :
                                                lang === 'ml' ? 'Malayalam' :
                                                  lang === 'pa' ? 'Punjabi' :
                                                    lang === 'bn' ? 'Bengali' :
                                                      lang === 'mr' ? 'Marathi' :
                                                        lang === 'ur' ? 'Urdu' : lang.toUpperCase()}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  {venue.country === 'Other' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-muted-foreground">{t('Country Name')}</Label>
                        <Input
                          value={customCountry}
                          onChange={(e) => setCustomCountry(e.target.value)}
                          placeholder={t('Enter Name')}
                          className="h-10 bg-background border-input text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-muted-foreground">{t('Currency Symbol')}</Label>
                        <Input
                          value={customCurrency}
                          onChange={(e) => setCustomCurrency(e.target.value)}
                          placeholder="e.g. $"
                          className="h-10 bg-background border-input text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Hidden fields for compatibility */}
                  <div className="hidden">
                    <Input value={venue.city} onChange={(e) => handleBasicChange(setVenue, 'city', e.target.value)} placeholder="City" />
                    <Input value={venue.state} onChange={(e) => handleBasicChange(setVenue, 'state', e.target.value)} placeholder="State" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Owner 1 Card */}
              <div className="bg-card/50 backdrop-blur-sm p-4 rounded-xl border border-border shadow-sm space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-muted-foreground">{t('Owner 1 Name')}</Label>
                  <Input
                    value={owner.name}
                    onChange={(e) => handleOwnerNameChange(e.target.value)}
                    placeholder={t('Full Name')}
                    className="h-10 bg-background border-input text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-muted-foreground">{t('Mobile (Optional)')}</Label>
                    <Input
                      value={owner.contactNumber}
                      onChange={(e) => handleBasicChange(setOwner, 'contactNumber', e.target.value)}
                      placeholder="e.g., 9876543210"
                      className="h-10 bg-background border-input text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-muted-foreground">{t('Email (Optional)')}</Label>
                    <Input
                      value={owner.email}
                      onChange={(e) => handleBasicChange(setOwner, 'email', e.target.value)}
                      placeholder="e.g., owner@example.com"
                      className="h-10 bg-background border-input text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-muted-foreground">{t('Address (Optional)')}</Label>
                  <textarea
                    value={owner.address || ''}
                    onChange={(e) => handleBasicChange(setOwner, 'address', e.target.value)}
                    placeholder={t('Full Address')}
                    className="w-full h-16 bg-background border rounded-md border-input text-sm p-3 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none"
                  />
                </div>

                {/* ID & Password for Owner 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                        <Shield size={13} className="text-orange-400" />
                        {t('Login ID')}
                      </Label>
                      <span className="text-[10px] text-orange-400 font-medium">Auto-generated • Editable</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={owner.username || ''}
                        onChange={(e) => handleOwnerUsernameChange(e.target.value)}
                        placeholder={owner.name ? generateUniqueUsername(owner.name, getAllTakenUsernames('owner')) : "e.g., amit"}
                        className="flex-1 h-10 bg-background border-orange-500/30 font-mono text-sm text-orange-500 tracking-wider focus:border-orange-500"
                      />
                      {owner.username && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(owner.username || '');
                            setCopiedId('owner');
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                          className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-md bg-background border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 transition-colors"
                          title="Copy login ID"
                        >
                          {copiedId === 'owner' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                    {owner.username && isUsernameTaken(owner.username, getAllTakenUsernames('owner')) ? (
                      <p className="text-[11px] text-amber-500 font-medium">⚠️ This login ID is already in use by another user.</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Auto-generated from name. You can freely edit or type any custom login ID.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner-pin" className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                      <Shield size={13} className="text-orange-400" />
                      4-Digit Passcode
                    </Label>
                    <PinInput
                      id="owner-pin"
                      value={owner.loginCode || ''}
                      onChange={(v) => handleBasicChange(setOwner, 'loginCode', v)}
                    />
                    <p className="text-[10px] text-muted-foreground">Enter any 4-digit PIN of your choice for quick login (e.g. 1234)</p>
                  </div>
                </div>
              </div>

              {/* Additional Owners Cards */}
              {additionalOwners.map((own, idx) => (
                <div key={idx} className="bg-card/50 backdrop-blur-sm p-4 rounded-xl border border-border shadow-sm space-y-4 relative">
                  <div className="absolute top-4 right-4">
                    <Button variant="ghost" size="icon" onClick={() => removeOwner(idx)} className="h-8 w-8 text-muted-foreground hover:text-red-400">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <h4 className="font-bold text-sm text-muted-foreground uppercase">{t('Partner')} {idx + 1}</h4>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-muted-foreground">{t('Partner Name')}</Label>
                    <Input value={own.name} onChange={(e) => updateAdditionalOwner(idx, 'name', e.target.value)} placeholder={t('Full Name')} className="h-10 bg-background border-input text-sm" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Mobile (Optional)')}</Label>
                      <Input value={own.contactNumber} onChange={(e) => updateAdditionalOwner(idx, 'contactNumber', e.target.value)} placeholder="e.g., 9876543210" className="h-10 bg-background border-input text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Email (Optional)')}</Label>
                      <Input value={own.email} onChange={(e) => updateAdditionalOwner(idx, 'email', e.target.value)} placeholder="e.g., partner@example.com" className="h-10 bg-background border-input text-sm" />
                    </div>
                  </div>

                  {/* ID & Password for Partner */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                          <Shield size={13} className="text-orange-400" />
                          {t('Login ID')}
                        </Label>
                        <span className="text-[10px] text-orange-400 font-medium">Auto-generated • Editable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={own.username || ''}
                          onChange={(e) => updateAdditionalOwner(idx, 'username', e.target.value)}
                          placeholder={own.name ? generateUniqueUsername(own.name, getAllTakenUsernames(`partner-${idx}`)) : "e.g., amit1"}
                          className="flex-1 h-10 bg-background border-orange-500/30 font-mono text-sm text-orange-500 tracking-wider focus:border-orange-500"
                        />
                        {own.username && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(own.username || '');
                              setCopiedId(`partner-${idx}`);
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-md bg-background border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 transition-colors"
                            title="Copy login ID"
                          >
                            {copiedId === `partner-${idx}` ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>
                      {own.username && isUsernameTaken(own.username, getAllTakenUsernames(`partner-${idx}`)) ? (
                        <p className="text-[11px] text-amber-500 font-medium">⚠️ This login ID is already in use by another user.</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Auto-generated from name. You can freely edit or type any custom login ID.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`partner-pin-${idx}`} className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                        <Shield size={13} className="text-orange-400" />
                        4-Digit Passcode
                      </Label>
                      <PinInput
                        id={`partner-pin-${idx}`}
                        value={own.loginCode || ''}
                        onChange={(v) => updateAdditionalOwner(idx, 'loginCode', v)}
                      />
                      <p className="text-[10px] text-muted-foreground">Enter any 4-digit PIN of your choice for this partner (e.g. 1234)</p>
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <Button variant="outline" onClick={addOwner} className="border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200">
                  <PlusCircle size={16} className="mr-2" /> {t('Add Another Owner')}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {employees.map((emp, idx) => (
                <div key={idx} className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border shadow-sm space-y-6 relative">
                  <div className="absolute top-4 right-4">
                    <Button variant="ghost" size="icon" onClick={() => removeEmployee(idx)} className="h-8 w-8 text-muted-foreground hover:text-red-400">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Employee')} {idx + 1} {t('Name')}</Label>
                      <Input value={emp.name} onChange={(e) => updateEmployee(idx, 'name', e.target.value)} placeholder={t('Full Name')} className="h-10 bg-background border-input text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Email (Optional)')}</Label>
                      <Input value={emp.email} onChange={(e) => updateEmployee(idx, 'email', e.target.value)} placeholder="e.g., employee@example.com" className="h-10 bg-background border-input text-sm" />
                    </div>
                  </div>

                  {/* ID & Password for Employee */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                          <Shield size={13} className="text-orange-400" />
                          {t('Login Username')}
                        </Label>
                        <span className="text-[10px] text-orange-400 font-medium">Auto-generated • Editable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={emp.username || ''}
                          onChange={(e) => updateEmployee(idx, 'username', e.target.value)}
                          placeholder={emp.name ? generateUniqueUsername(emp.name, getAllTakenUsernames(`emp-${idx}`)) : "e.g., amit1"}
                          className="flex-1 h-10 bg-background border-orange-500/30 font-mono text-sm text-orange-500 tracking-wider focus:border-orange-500"
                        />
                        {emp.username && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(emp.username || '');
                              setCopiedId(`emp-${idx}`);
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                            className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-md bg-background border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 transition-colors"
                            title="Copy username"
                          >
                            {copiedId === `emp-${idx}` ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>
                      {emp.username && isUsernameTaken(emp.username, getAllTakenUsernames(`emp-${idx}`)) ? (
                        <p className="text-[11px] text-amber-500 font-medium">⚠️ This username is already in use by another user.</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Share this with the employee for login</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`emp-pin-${idx}`} className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                        <Shield size={13} className="text-orange-400" />
                        4-Digit Passcode
                      </Label>
                      <PinInput
                        id={`emp-pin-${idx}`}
                        value={emp.loginCode || ''}
                        onChange={(v) => updateEmployee(idx, 'loginCode', v)}
                      />
                      <p className="text-[10px] text-muted-foreground">Enter any 4-digit PIN of your choice for staff login (e.g. 1234)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Role')}</Label>
                      <Select
                        value={(["Admin", "Store Manager", "Cashier", "Inventory Clerk", "Billing Clerk", "Floor Assistant", "Helper", "Security", "Delivery Person", "Other"].includes(emp.role || "") ? emp.role : "Other")}
                        onValueChange={(val) => updateEmployee(idx, 'role', val)}
                      >
                        <SelectTrigger className="h-10 bg-background border-input text-sm">
                          <SelectValue placeholder={t('Select a role')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">{t('Admin')}</SelectItem>
                          <SelectItem value="Store Manager">{t('Store Manager')}</SelectItem>
                          <SelectItem value="Cashier">{t('Cashier')}</SelectItem>
                          <SelectItem value="Billing Clerk">{t('Billing Clerk')}</SelectItem>
                          <SelectItem value="Inventory Clerk">{t('Inventory Clerk')}</SelectItem>
                          <SelectItem value="Floor Assistant">{t('Floor Assistant')}</SelectItem>
                          <SelectItem value="Helper">{t('Helper')}</SelectItem>
                          <SelectItem value="Security">{t('Security')}</SelectItem>
                          <SelectItem value="Delivery Person">{t('Delivery Person')}</SelectItem>
                          <SelectItem value="Other">{t('Other')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Salary')}</Label>
                      <Input value={emp.salary?.toString()} onChange={(e) => updateEmployee(idx, 'salary', e.target.value)} placeholder="e.g., 25000" className="h-10 bg-background border-input text-sm" />
                    </div>
                  </div>

                  {(!["Admin", "Store Manager", "Cashier", "Inventory Clerk", "Billing Clerk", "Floor Assistant", "Helper", "Security", "Delivery Person"].includes(emp.role || "") || emp.role === "Other") && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Custom Role')}</Label>
                      <Input
                        value={emp.role === "Other" ? "" : emp.role}
                        onChange={(e) => updateEmployee(idx, 'role', e.target.value)}
                        placeholder="e.g. Stock Auditor"
                        className="h-10 bg-background border-input text-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Mobile No. (Optional)')}</Label>
                      <Input value={emp.mobile} onChange={(e) => updateEmployee(idx, 'mobile', e.target.value)} placeholder="e.g., 9876543210" className="h-10 bg-background border-input text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Govt. ID No. (Optional)')}</Label>
                      <Input value={emp.govtId} onChange={(e) => updateEmployee(idx, 'govtId', e.target.value)} placeholder="e.g., Aadhar/PAN" className="h-10 bg-background border-input text-sm" />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <Label className="text-sm font-bold text-muted-foreground">{t('App Access Permissions')}</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {DASHBOARD_TABS.map((tab) => {
                        const isChecked = (emp.allowedTabs || []).includes(tab.id);
                        return (
                          <div key={tab.id} className="flex items-center space-x-2 bg-muted/30 p-2 rounded border border-transparent hover:border-border transition-colors">
                            <Checkbox
                              id={`emp-${idx}-${tab.id}`}
                              checked={isChecked}
                              onCheckedChange={() => toggleEmployeeTab(idx, tab.id)}
                            />
                            <Label
                              htmlFor={`emp-${idx}-${tab.id}`}
                              className="text-xs flex items-center gap-1.5 cursor-pointer font-medium"
                            >
                              <tab.icon className="h-3.5 w-3.5 opacity-70" />
                              {t(tab.label)}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <Button variant="outline" onClick={addEmployeeCard} className="border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200">
                  <PlusCircle size={16} className="mr-2" /> {t('Add Another Employee')}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {vendors.map((v, idx) => (
                <div key={idx} className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border shadow-sm space-y-6 relative">
                  <div className="absolute top-4 right-4">
                    <Button variant="ghost" size="icon" onClick={() => removeVendor(idx)} className="h-8 w-8 text-muted-foreground hover:text-red-400">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Vendor Name')}</Label>
                      <Input value={v.name} onChange={(e) => updateVendor(idx, 'name', e.target.value)} placeholder="e.g. Local Veggies Co." className="h-10 bg-background border-input text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Category')}</Label>
                      <Input value={v.category} onChange={(e) => updateVendor(idx, 'category', e.target.value)} placeholder={t('e.g., Food & Beverage')} className="h-10 bg-background border-input text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Mobile No.')}</Label>
                      <Input value={v.phone} onChange={(e) => updateVendor(idx, 'phone', e.target.value)} placeholder="e.g., 9876543210" className="h-10 bg-background border-input text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Email (Optional)')}</Label>
                      <Input value={v.email} onChange={(e) => updateVendor(idx, 'email', e.target.value)} placeholder="e.g., vendor@example.com" className="h-10 bg-background border-input text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Location (Optional)')}</Label>
                      <Input value={v.location} onChange={(e) => updateVendor(idx, 'location', e.target.value)} placeholder="e.g., City Center" className="h-10 bg-background border-input text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">{t('Billing Cycle (Optional)')}</Label>
                      <Input
                        type="date"
                        value={v.nextPaymentDate ? (v.nextPaymentDate instanceof Date ? v.nextPaymentDate.toISOString().split('T')[0] : v.nextPaymentDate) : ''}
                        onChange={(e) => updateVendor(idx, 'nextPaymentDate', e.target.value)}
                        className="h-10 bg-background border-input text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <Button variant="outline" onClick={addVendorCard} className="border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200">
                  <PlusCircle size={16} className="mr-2" /> {t('Add Another Vendor')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-8 border-t border-border/10 pt-6">
          <div className="flex w-full items-center justify-between">
            <div className="flex-1 flex justify-start">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
                className={cn(
                  "min-w-[100px] border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300",
                  step === 1 && "invisible"
                )}
              >
                <ArrowLeft size={14} className="mr-2" /> {t('Previous')}
              </Button>
            </div>

            <div className="flex-1 flex justify-center">
              <button
                type="button"
                onClick={handleFinish}
                className="text-xs text-orange-500 hover:text-orange-400 font-medium opacity-80 hover:opacity-100 transition-opacity"
              >
                {t('Skip for now')}
              </button>
            </div>

            <div className="flex-1 flex justify-end">
              {step < 4 ? (
                <Button
                  onClick={handleNext}
                  className="bg-orange-500 hover:bg-orange-600 text-white min-w-[100px]"
                >
                  {t('Next')} <ArrowRight size={14} className="ml-2" />
                </Button>
              ) : (
                <Button onClick={handleFinish} className="bg-orange-500 hover:bg-orange-600 text-white min-w-[100px]">
                  {t('Finish Setup')}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  );
}
