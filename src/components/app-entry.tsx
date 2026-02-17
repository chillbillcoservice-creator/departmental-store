
'use client';

import type { MenuCategory, InventoryItem, Employee, Bill, Expense, Customer, Vendor, PendingBill, Attendance, Advance, VenueDetails, OwnerDetails, SetupData } from "@/lib/types";
import MainLayout from "./main-layout";
import SetupWizard from "./setup-wizard";
import { useState, useEffect } from "react";
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { LanguageProvider } from "@/contexts/language-context";

interface AppEntryProps {
  initialMenu: MenuCategory[];
  initialInventory: InventoryItem[];
  initialEmployees: Employee[];
  initialBills: Bill[];
  initialExpenses: Expense[];
  initialCustomers: Customer[];
  initialVendors: Vendor[];
  initialPendingBills: PendingBill[];
  initialVenueName: string;
  initialAttendance: Attendance[];
  initialAdvances: Advance[];
}


const useLocalStorageState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(defaultValue);

  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue && storedValue !== 'undefined') {
        setState(JSON.parse(storedValue, (k, v) => {
          if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(v)) {
            return new Date(v);
          }
          return v;
        }));
      }
    } catch (error) {
      console.error(`Error loading "${key}" from localStorage`, error);
    }
  }, [key]);

  const setWithLocalStorage: React.Dispatch<React.SetStateAction<T>> = (value) => {
    setState((prevState) => {
      const newValue = value instanceof Function ? (value as (prev: T) => T)(prevState) : value;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch (error) {
          console.error(`Error saving "${key}" to localStorage`, error);
        }
      }
      return newValue;
    });
  };

  return [state, setWithLocalStorage];
};


export default function AppEntry({
  initialMenu,
  initialInventory,
  initialEmployees,
  initialBills,
  initialExpenses,
  initialCustomers,
  initialVendors,
  initialPendingBills,
  initialVenueName,
  initialAttendance,
  initialAdvances
}: AppEntryProps) {
  const db = useFirestore();

  const [menu, setMenu] = useLocalStorageState<MenuCategory[]>('menu', initialMenu);
  const [inventory, setInventory] = useLocalStorageState<InventoryItem[]>('inventory', initialInventory);
  const [employees, setEmployees] = useLocalStorageState<Employee[]>('employees', initialEmployees);
  const [bills, setBills] = useLocalStorageState<Bill[]>('bills', initialBills);
  const [expenses, setExpenses] = useLocalStorageState<Expense[]>('expenses', initialExpenses);
  const [customers, setCustomers] = useLocalStorageState<Customer[]>('customers', initialCustomers);
  const [vendors, setVendors] = useLocalStorageState<Vendor[]>('vendors', initialVendors);
  const [pendingBills, setPendingBills] = useLocalStorageState<PendingBill[]>('pendingBills', initialPendingBills);
  const [venueName, setVenueName] = useLocalStorageState<string>('venueName', initialVenueName);
  const [attendance, setAttendance] = useLocalStorageState<Attendance[]>('attendance', initialAttendance);
  const [advances, setAdvances] = useLocalStorageState<Advance[]>('advances', initialAdvances);

  // New state for currency and setup status
  const [currency, setCurrency] = useLocalStorageState<string>('currency', 'Rs.');
  const [language, setLanguage] = useLocalStorageState<string>('language', 'en');
  const [isSetupComplete, setIsSetupComplete] = useLocalStorageState<boolean>('isSetupComplete', false);
  const [venueDetails, setVenueDetails] = useLocalStorageState<VenueDetails | null>('venueDetails', null);
  const [ownerDetails, setOwnerDetails] = useLocalStorageState<OwnerDetails | null>('ownerDetails', null);

  // Sync Currency from Firestore on mount to ensure consistency with Customer View
  useEffect(() => {
    if (!db) return;
    const fetchSettings = async () => {
      try {
        const docRef = await getDoc(doc(db, "settings", "venue"));
        if (docRef.exists()) {
          const data = docRef.data();
          if (data.currency) {
            // Migration: treat '₹' as 'Rs.'
            const syncedCurrency = data.currency === '₹' ? 'Rs.' : data.currency;
            setCurrency(syncedCurrency);
          }
          if (data.language) {
            setLanguage(data.language);
          }
        }
      } catch (e) {
        console.error("Error fetching settings from Firestore:", e);
      }
    };
    const fetchPendingBills = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "pendingBills"));
        const fetchedPendingBills: PendingBill[] = [];
        querySnapshot.forEach((doc) => {
          fetchedPendingBills.push(doc.data() as PendingBill);
        });
        if (fetchedPendingBills.length > 0) {
          setPendingBills(fetchedPendingBills);
        }
      } catch (e) {
        console.error("Error fetching pendingBills from Firestore:", e);
      }
    };
    fetchSettings();
    fetchPendingBills();
  }, [db]);

  // Check if it's the very first run (no venue name stored vs initial prop)
  // We can rely on isSetupComplete. If false, show wizard.

  const handleSetupComplete = (data: SetupData) => {
    setVenueName(data.venue.name);
    setVenueDetails(data.venue);
    setOwnerDetails(data.owner);
    setCurrency(data.currency);
    setLanguage(data.language);

    // Create initial employees
    if (data.employees && data.employees.length > 0) {
      const newEmployees: Employee[] = data.employees.map((emp, index) => ({
        id: `EMP${String(index + 1).padStart(3, '0')}`,
        name: emp.name || 'Unknown',
        role: emp.role || 'Staff',
        salary: emp.salary || 0,
        color: emp.color || '#3b82f6',
        mobile: emp.mobile || '',
        govtId: emp.govtId || '',
        email: emp.email || ''
      }));
      setEmployees([...employees, ...newEmployees]);
    }

    // Create initial vendors
    if (data.vendors && data.vendors.length > 0) {
      const newVendors: Vendor[] = data.vendors.map((v, index) => ({
        id: `VND${String(index + 1).padStart(3, '0')}`,
        name: v.name || 'Unknown',
        category: 'General', // Default category as it's not captured yet or use v.category
        phone: v.phone || '',
        email: v.email || ''
      }));
      setVendors([...vendors, ...newVendors]);
    }

    setIsSetupComplete(true);
    // Also set the key that MainLayout might be checking in a separate effects, 
    // though AppEntry controls the view, this prevents double-wizard issues if MainLayout logic runs.
    if (typeof window !== 'undefined') {
      localStorage.setItem('setupComplete', 'true');
    }

    // Immediately sync to Firestore to prevent race conditions where MainLayout hasn't synced yet
    // but a reload happens or AppEntry remounts.
    if (db) {
      import('firebase/firestore').then(({ doc, setDoc }) => {
        setDoc(doc(db, "settings", "venue"), {
          venueName: data.venue.name,
          currency: data.currency,
          language: data.language,
          address: data.venue.address || '',
          contactNumber: data.venue.contactNumber || '',
          email: data.venue.email || '',
          tagline: data.venue.tagline || '',
          ownerName: data.owner.name || '',
          ownerContact: data.owner.contactNumber || '',
          ownerEmail: data.owner.email || '',
        }, { merge: true }).catch(err => console.error("Immediate Firestore Sync Error:", err));
      });
    }
  };

  if (!isSetupComplete) {
    return (
      <LanguageProvider key={language} initialLanguage={language}>
        <SetupWizard onComplete={handleSetupComplete} initialData={{ currency, language, venue: venueDetails || { name: venueName || '', address: '', contactNumber: '', email: '', tagline: '' } }} />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider key={language} initialLanguage={language}>
      <MainLayout
        initialMenu={menu}
        initialInventory={inventory}
        initialEmployees={employees}
        initialBills={bills}
        initialExpenses={expenses}
        initialCustomers={customers}
        initialVendors={vendors}
        initialPendingBills={pendingBills}
        initialVenueName={venueName}
        initialAttendance={attendance}
        initialAdvances={advances}
        initialCurrency={currency || 'Rs.'}
        setMenu={setMenu}
        setInventory={setInventory}
        setEmployees={setEmployees}
        setBills={setBills}
        setExpenses={setExpenses}
        setCustomers={setCustomers}
        setVendors={setVendors}
        setPendingBills={setPendingBills}
        setAttendance={setAttendance}
        setAdvances={setAdvances}
        setVenueName={setVenueName}
        setCurrency={setCurrency} // Pass setter
        setLanguage={setLanguage}
        initialLanguage={language}
        venueDetails={venueDetails}
        setVenueDetails={setVenueDetails}
        ownerDetails={ownerDetails}
      />
    </LanguageProvider>
  );
}
