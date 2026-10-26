
'use client';
import { useEffect, useState } from 'react';
import AppEntry from '@/components/app-entry';
import { seedData } from '@/lib/seed-data';
import { DEPARTMENTAL_STORE_CATALOG, isLegacyInventory } from '@/lib/departmental-catalog';
import type { MenuCategory, InventoryItem, Employee, Bill, Expense, Customer, Vendor, PendingBill, Attendance, Advance } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue && storedValue !== 'undefined') {
      return JSON.parse(storedValue, (k, v) => {
        // Handle date revival
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(v)) {
          return new Date(v);
        }
        return v;
      });
    }
  } catch (error) {
    console.error(`Error loading "${key}" from localStorage`, error);
  }
  return defaultValue;
};


export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState<{
    menu: MenuCategory[],
    inventory: InventoryItem[],
    employees: Employee[],
    bills: Bill[],
    expenses: Expense[],
    customers: Customer[],
    vendors: Vendor[],
    pendingBills: PendingBill[],
    venueName: string,
    attendance: Attendance[],
    advances: Advance[],
  } | null>(null);

  useEffect(() => {
    // This effect runs only on the client
    const seededMenu = seedData();

    // Check if stored inventory or menu is legacy dummy data
    const rawInv = loadFromLocalStorage<InventoryItem[]>('inventory', []);
    const invIsLegacy = isLegacyInventory(rawInv);
    const resolvedInventory = invIsLegacy ? DEPARTMENTAL_STORE_CATALOG : rawInv;
    if (invIsLegacy) {
      try {
        localStorage.setItem('inventory', JSON.stringify(DEPARTMENTAL_STORE_CATALOG));
      } catch (e) {}
    }

    const rawMenu = loadFromLocalStorage<any[]>('menu', []);
    const isExplicitlyInitialized = typeof window !== 'undefined' && localStorage.getItem('chillbill_catalog_initialized') === 'true';
    const menuIsLegacy = !rawMenu || (!isExplicitlyInitialized && rawMenu.length === 0) || (Array.isArray(rawMenu) && rawMenu.some((c: any) => c.name === 'aper' || c.name === 'Bakery'));
    const resolvedMenu = menuIsLegacy ? seededMenu : rawMenu;
    if (menuIsLegacy) {
      try {
        localStorage.setItem('menu', JSON.stringify(seededMenu));
      } catch (e) {}
    }

    const data = {
      menu: resolvedMenu,
      inventory: resolvedInventory,
      employees: loadFromLocalStorage('employees', [
        {
          id: 'owner-1',
          name: 'Store Owner',
          role: 'Owner',
          salary: 0,
          color: '#f97316',
          loginCode: '0000',
          username: 'owner@store',
          password: 'password',
          allowedTabs: ['all'],
        },
        {
          id: 'emp-1',
          name: 'Manager',
          role: 'Manager',
          salary: 25000,
          color: '#3b82f6',
          loginCode: '1234',
          username: 'manager@store',
          allowedTabs: ['all'],
        },
        {
          id: 'emp-2',
          name: 'Cashier Staff',
          role: 'Staff',
          salary: 15000,
          color: '#10b981',
          loginCode: '1111',
          username: 'cashier@store',
          allowedTabs: ['payments', 'inventory', 'customers'],
        },
      ]),
      bills: loadFromLocalStorage('bills', []),
      expenses: loadFromLocalStorage('expenses', []),
      customers: loadFromLocalStorage('customers', []),
      vendors: loadFromLocalStorage('vendors', []),
      pendingBills: loadFromLocalStorage('pendingBills', []),
      venueName: loadFromLocalStorage('venueName', "My Shop"),
      attendance: loadFromLocalStorage('attendance', []),
      advances: loadFromLocalStorage('advances', []),
    }

    setInitialData(data);
    setIsLoading(false);
  }, []);

  if (isLoading || !initialData) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-full max-w-md p-8 space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-64 w-1/3" />
            <div className="flex-grow space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <AppEntry
      initialMenu={initialData.menu}
      initialInventory={initialData.inventory}
      initialEmployees={initialData.employees}
      initialBills={initialData.bills}
      initialExpenses={initialData.expenses}
      initialCustomers={initialData.customers}
      initialVendors={initialData.vendors}
      initialPendingBills={initialData.pendingBills}
      initialVenueName={initialData.venueName}
      initialAttendance={initialData.attendance || []}
      initialAdvances={initialData.advances || []}
    />
  );
}
