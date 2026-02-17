
'use client';
import { useEffect, useState } from 'react';
import AppEntry from '@/components/app-entry';
import { seedData } from '@/lib/seed-data';
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

    const data = {
      menu: loadFromLocalStorage('menu', seededMenu),
      inventory: loadFromLocalStorage('inventory', [
        { "id": "1", "name": "Pizza Base", "stock": 100, "capacity": 200, "unit": "unit", "category": "Bakery", "price": 50, "discount": 0 },
        { "id": "2", "name": "Pasta", "stock": 50, "capacity": 100, "unit": "kg", "category": "Grains", "price": 420, "discount": 0 },
        { "id": "3", "name": "Cheese", "stock": 20, "capacity": 50, "unit": "kg", "category": "Dairy", "price": 550, "discount": 0 },
        { "id": "4", "name": "Coffee Beans", "stock": 30, "capacity": 50, "unit": "kg", "category": "Beverages", "price": 450, "discount": 0 },
        { "id": "5", "name": "Premium Apple", "stock": 100, "capacity": 200, "unit": "kg", "category": "Fruits", "price": 250, "discount": 10 },
        { "id": "6", "name": "Fresh Milk", "stock": 50, "capacity": 100, "unit": "ltr", "category": "Dairy", "price": 60, "discount": 0 },
        { "id": "7", "name": "Whole Wheat Bread", "stock": 40, "capacity": 60, "unit": "pck", "category": "Bakery", "price": 45, "discount": 5 },
        { "id": "8", "name": "Chicken Breast", "stock": 30, "capacity": 80, "unit": "kg", "category": "Meat", "price": 320, "discount": 15 },
        { "id": "9", "name": "Cola Can", "stock": 200, "capacity": 500, "unit": "unit", "category": "Beverages", "price": 40, "discount": 0 },
        { "id": "10", "name": "Dark Chocolate", "stock": 150, "capacity": 300, "unit": "bar", "category": "Snacks", "price": 120, "discount": 20 }
      ]),
      employees: loadFromLocalStorage('employees', []),
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
