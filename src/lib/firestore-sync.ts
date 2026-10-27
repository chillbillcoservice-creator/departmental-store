import { 
    collection, 
    doc, 
    setDoc, 
    updateDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    limit, 
    Timestamp, 
    increment 
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { Bill, InventoryItem, Employee, Vendor, PurchaseOrder } from './types';

const getDb = () => initializeFirebase().firestore;

export interface LiveDailySales {
    date: string; // YYYY-MM-DD
    totalSales: number;
    billCount: number;
    cashSales: number;
    onlineSales: number;
    splitSales: number;
    lastUpdated?: any;
}

export const getTodayDateKey = (): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Sync a completed bill from counter to Firestore & update the daily summary
 */
export const syncCompletedBillToCloud = async (venueId: string, bill: Bill) => {
    if (!venueId) return;
    try {
        const db = getDb();
        const dateKey = getTodayDateKey();
        
        // 1. Save detailed bill to bills collection
        const billRef = doc(db, 'venues', venueId, 'bills', bill.id);
        const billData = {
            id: bill.id,
            total: bill.total || 0,
            subtotal: bill.subtotal || 0,
            discount: bill.discount || 0,
            vatAmount: bill.vatAmount || 0,
            paymentMethod: bill.paymentMethod || 'Online',
            splitPayments: bill.splitPayments || [],
            cashierName: bill.cashierName || 'Counter Staff',
            cashierId: bill.cashierId || '',
            itemCount: bill.orderItems?.length || 0,
            orderItems: (bill.orderItems || []).map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                category: item.category || 'General'
            })),
            customerName: bill.customerDetails?.name || null,
            customerPhone: bill.customerDetails?.phone || null,
            completedAt: Timestamp.now(),
            dateKey
        };
        await setDoc(billRef, billData, { merge: true });

        // 2. Atomically update daily summary
        const summaryRef = doc(db, 'venues', venueId, 'dailyReports', dateKey);
        const isCash = bill.paymentMethod === 'Cash';
        const isOnline = bill.paymentMethod === 'Online';
        const isSplit = bill.paymentMethod === 'Split';

        let cashPart = isCash ? bill.total : 0;
        let onlinePart = isOnline ? bill.total : 0;
        if (isSplit && bill.splitPayments) {
            bill.splitPayments.forEach(sp => {
                if (sp.method === 'Cash') cashPart += sp.amount;
                if (sp.method === 'Online') onlinePart += sp.amount;
            });
        }

        await setDoc(summaryRef, {
            date: dateKey,
            totalSales: increment(bill.total || 0),
            billCount: increment(1),
            cashSales: increment(cashPart),
            onlineSales: increment(onlinePart),
            splitSales: increment(isSplit ? bill.total : 0),
            lastUpdated: Timestamp.now()
        }, { merge: true });
    } catch (e) {
        console.error("Failed to sync bill to cloud:", e);
    }
};

/**
 * Listen to live today's sales summary for the mobile dashboard
 */
export const listenToLiveDailySales = (
    venueId: string, 
    onUpdate: (summary: LiveDailySales | null) => void
) => {
    if (!venueId) return () => {};
    try {
        const db = getDb();
        const dateKey = getTodayDateKey();
        const summaryRef = doc(db, 'venues', venueId, 'dailyReports', dateKey);

        return onSnapshot(summaryRef, (snap) => {
            if (snap.exists()) {
                onUpdate(snap.data() as LiveDailySales);
            } else {
                onUpdate(null);
            }
        }, (err) => {
            console.error("Sales summary listener error:", err);
        });
    } catch (e) {
        console.error("Failed to attach sales summary listener:", e);
        return () => {};
    }
};

/**
 * Listen to recent completed bills (last 10) in real time
 */
export const listenToRecentBills = (
    venueId: string, 
    limitCount: number = 10,
    onUpdate: (bills: any[]) => void
) => {
    if (!venueId) return () => {};
    try {
        const db = getDb();
        const billsRef = collection(db, 'venues', venueId, 'bills');
        const q = query(billsRef, orderBy('completedAt', 'desc'), limit(limitCount));

        return onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                completedAt: d.data().completedAt?.toDate?.() || new Date()
            }));
            onUpdate(list);
        }, (err) => {
            console.error("Recent bills listener error:", err);
        });
    } catch (e) {
        console.error("Failed to attach recent bills listener:", e);
        return () => {};
    }
};

/**
 * Update staff PIN in Firestore from Mobile Companion
 */
export const updateStaffPinInCloud = async (
    venueId: string, 
    employeeId: string, 
    newPin: string
) => {
    if (!venueId || !employeeId) return;
    const db = getDb();
    const empRef = doc(db, 'venues', venueId, 'employees', employeeId);
    await updateDoc(empRef, {
        loginCode: newPin,
        updatedAt: Timestamp.now()
    });
};

/**
 * Update staff permissions (allowedTabs) in Firestore
 */
export const updateStaffPermissionsInCloud = async (
    venueId: string, 
    employeeId: string, 
    allowedTabs: string[]
) => {
    if (!venueId || !employeeId) return;
    const db = getDb();
    const empRef = doc(db, 'venues', venueId, 'employees', employeeId);
    await updateDoc(empRef, {
        allowedTabs,
        updatedAt: Timestamp.now()
    });
};

/**
 * Listen to live employee roster
 */
export const listenToLiveEmployees = (
    venueId: string, 
    onUpdate: (employees: Employee[]) => void
) => {
    if (!venueId) return () => {};
    try {
        const db = getDb();
        const employeesRef = collection(db, 'venues', venueId, 'employees');

        return onSnapshot(employeesRef, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
            onUpdate(list);
        }, (err) => {
            console.error("Live employees listener error:", err);
        });
    } catch (e) {
        console.error("Failed to attach employees listener:", e);
        return () => {};
    }
};

/**
 * Sync Purchase Order to Firestore
 */
export const syncPurchaseOrderToCloud = async (venueId: string, po: PurchaseOrder) => {
    if (!venueId || !po.id) return;
    try {
        const db = getDb();
        const poRef = doc(db, 'venues', venueId, 'purchaseOrders', po.id);
        await setDoc(poRef, {
            ...po,
            date: po.date instanceof Date ? Timestamp.fromDate(po.date) : Timestamp.now(),
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (e) {
        console.error("Failed to sync Purchase Order:", e);
    }
};

/**
 * Listen to live purchase orders
 */
export const listenToLivePurchaseOrders = (
    venueId: string, 
    onUpdate: (pos: PurchaseOrder[]) => void
) => {
    if (!venueId) return () => {};
    try {
        const db = getDb();
        const posRef = collection(db, 'venues', venueId, 'purchaseOrders');

        return onSnapshot(posRef, (snap) => {
            const list = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    date: data.date?.toDate?.() || new Date()
                } as PurchaseOrder;
            });
            onUpdate(list);
        }, (err) => {
            console.error("Purchase orders listener error:", err);
        });
    } catch (e) {
        console.error("Failed to attach PO listener:", e);
        return () => {};
    }
};

/**
 * Sync Inventory to Cloud
 */
export const syncInventoryToCloud = async (venueId: string, items: InventoryItem[]) => {
    if (!venueId || !items.length) return;
    try {
        const db = getDb();
        const invRef = doc(db, 'venues', venueId, 'catalogs', 'main');
        await setDoc(invRef, {
            items,
            itemCount: items.length,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (e) {
        console.error("Failed to sync inventory to cloud:", e);
    }
};

/**
 * Listen to live inventory
 */
export const listenToLiveInventory = (
    venueId: string, 
    onUpdate: (items: InventoryItem[]) => void
) => {
    if (!venueId) return () => {};
    try {
        const db = getDb();
        const invRef = doc(db, 'venues', venueId, 'catalogs', 'main');

        return onSnapshot(invRef, (snap) => {
            if (snap.exists() && snap.data()?.items) {
                onUpdate(snap.data().items as InventoryItem[]);
            }
        }, (err) => {
            console.error("Inventory listener error:", err);
        });
    } catch (e) {
        console.error("Failed to attach inventory listener:", e);
        return () => {};
    }
};

/**
 * Sync Vendors to Cloud
 */
export const syncVendorsToCloud = async (venueId: string, vendors: Vendor[]) => {
    if (!venueId || !vendors.length) return;
    try {
        const db = getDb();
        const vendorsRef = doc(db, 'venues', venueId, 'catalogs', 'vendors');
        await setDoc(vendorsRef, {
            vendors,
            count: vendors.length,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (e) {
        console.error("Failed to sync vendors:", e);
    }
};

/**
 * Listen to live vendors
 */
export const listenToLiveVendors = (
    venueId: string, 
    onUpdate: (vendors: Vendor[]) => void
) => {
    if (!venueId) return () => {};
    try {
        const db = getDb();
        const vendorsRef = doc(db, 'venues', venueId, 'catalogs', 'vendors');

        return onSnapshot(vendorsRef, (snap) => {
            if (snap.exists() && snap.data()?.vendors) {
                onUpdate(snap.data().vendors as Vendor[]);
            }
        }, (err) => {
            console.error("Vendors listener error:", err);
        });
    } catch (e) {
        console.error("Failed to attach vendors listener:", e);
        return () => {};
    }
};
