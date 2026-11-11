import { 
    collection, 
    doc, 
    setDoc, 
    getDoc,
    getDocs,
    updateDoc, 
    deleteDoc,
    writeBatch,
    query, 
    orderBy, 
    limit, 
    onSnapshot, 
    Timestamp, 
    increment 
} from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
import { Bill, InventoryItem, Employee, Vendor, PurchaseOrder } from './types';

const getDb = () => initializeFirebase().firestore;

/**
 * Builds deterministic terminal credentials for a store email
 */
export const buildTerminalCredentials = (email: string) => {
    const cleanEmail = (email || '').toLowerCase().trim();
    const terminalEmail = `${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}@chillbill-terminal.pos`;
    const terminalPassword = `cbill_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}_2026!`;
    return { terminalEmail, terminalPassword };
};

/**
 * Get the currently active store's registered email from localStorage or auth
 */
export const getActiveStoreEmail = (): string => {
    if (typeof window === 'undefined') return '';
    try {
        const stored = localStorage.getItem('storeEmail');
        if (stored && stored.trim()) return stored.trim().toLowerCase();
        const ownerRaw = localStorage.getItem('ownerDetails');
        if (ownerRaw) {
            const parsed = JSON.parse(ownerRaw);
            if (parsed?.email && typeof parsed.email === 'string') {
                return parsed.email.trim().toLowerCase();
            }
        }
        const licRaw = localStorage.getItem('chillbill_license_token');
        if (licRaw) {
            const parsed = JSON.parse(licRaw);
            if (parsed?.ownerEmail && typeof parsed.ownerEmail === 'string') {
                return parsed.ownerEmail.trim().toLowerCase();
            }
        }
        const venueRaw = localStorage.getItem('venueDetails');
        if (venueRaw) {
            const parsed = JSON.parse(venueRaw);
            if (parsed?.email && typeof parsed.email === 'string') {
                return parsed.email.trim().toLowerCase();
            }
        }
        const { auth } = initializeFirebase();
        if (auth.currentUser?.email && !auth.currentUser.email.endsWith('@chillbill-terminal.pos')) {
            return auth.currentUser.email.trim().toLowerCase();
        }
    } catch {}
    return '';
};

/**
 * Ensures Firebase Auth has an active signed-in session for the store terminal.
 * Strictly uses the store's OWN registered email (never a global default account).
 */
export const ensureStoreTerminalAuth = async (storeEmail?: string): Promise<string | null> => {
    try {
        const { auth } = initializeFirebase();
        const email = (storeEmail || getActiveStoreEmail()).trim().toLowerCase();
        if (!email) {
            return auth.currentUser?.uid || null;
        }

        const { terminalEmail, terminalPassword } = buildTerminalCredentials(email);

        // Only return early if currentUser is ALREADY the terminal account for this store
        if (auth.currentUser && auth.currentUser.email === terminalEmail) {
            return auth.currentUser.uid;
        }

        let cred: any = null;
        try {
            cred = await signInWithEmailAndPassword(auth, terminalEmail, terminalPassword);
        } catch (signInErr: any) {
            if (signInErr?.code === 'auth/user-not-found' || signInErr?.code === 'auth/invalid-credential') {
                try {
                    const { createUserWithEmailAndPassword } = await import('firebase/auth');
                    cred = await createUserWithEmailAndPassword(auth, terminalEmail, terminalPassword);
                } catch (createErr: any) {
                    if (createErr?.code === 'auth/email-already-in-use') {
                        cred = await signInWithEmailAndPassword(auth, terminalEmail, terminalPassword);
                    }
                }
            }
        }

        if (cred?.user?.uid) {
            console.log(`[FirestoreSync] 🔐 Store terminal authenticated: ${cred.user.uid} (${email})`);
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('venueId', cred.user.uid);
                    localStorage.setItem('storeEmail', email);
                } catch {}
            }
            return cred.user.uid;
        }
        return auth.currentUser?.uid || null;
    } catch (e: any) {
        console.warn("[FirestoreSync] Terminal auth notice:", e?.message || e);
        return null;
    }
};

export interface LiveDailySales {
    date: string; // YYYY-MM-DD
    totalSales: number;
    billCount: number;
    cashSales: number;
    onlineSales: number;
    splitSales: number;
    lastUpdated?: any;
}

/**
 * Sanitize venueId to prevent quoted or whitespace-padded path mismatches
 */
export const cleanVenueId = (rawId: string | null | undefined): string => {
    if (!rawId) return '';
    let clean = String(rawId).trim();
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
        clean = clean.slice(1, -1).trim();
    }
    return clean.replace(/\s+/g, '-');
};

/**
 * Resolve active venue ID from argument or localStorage
 */
export const getActiveVenueId = (passedVenueId?: string): string => {
    let clean = cleanVenueId(passedVenueId);
    if (!clean && typeof window !== 'undefined') {
        clean = cleanVenueId(localStorage.getItem('venueId'));
    }
    return clean;
};

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
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId) {
        console.warn("[FirestoreSync] Cannot sync bill: venueId is empty");
        return;
    }
    try {
        const db = getDb();
        const dateKey = getTodayDateKey();
        
        // 1. Save detailed bill to bills collection
        const billRef = doc(db, 'venues', cleanId, 'bills', bill.id);
        const billData = {
            id: bill.id,
            total: Number(bill.total || 0),
            subtotal: Number(bill.subtotal || 0),
            discount: Number(bill.discount || 0),
            vatAmount: Number(bill.vatAmount || 0),
            paymentMethod: bill.paymentMethod || 'Online',
            splitPayments: bill.splitPayments || [],
            cashierName: bill.cashierName || 'Counter Staff',
            timestamp: bill.timestamp ? new Date(bill.timestamp).toISOString() : new Date().toISOString(),
            itemCount: bill.orderItems?.length || 0,
            orderItems: (bill.orderItems || []).map(item => ({
                name: item.name,
                price: Number(item.price || 0),
                quantity: Number(item.quantity || 1),
                category: item.category || 'General'
            })),
            customerName: bill.customerDetails?.name || null,
            customerPhone: (bill.customerDetails as any)?.phone || (bill.customerDetails as any)?.mobile || null,
            completedAt: Timestamp.now(),
            dateKey
        };
        await setDoc(billRef, billData, { merge: true });

        // 2. Atomically update daily summary
        const summaryRef = doc(db, 'venues', cleanId, 'dailyReports', dateKey);
        const isCash = bill.paymentMethod === 'Cash';
        const isOnline = bill.paymentMethod === 'Online';
        const isSplit = bill.paymentMethod === 'Split';

        let cashPart = isCash ? Number(bill.total || 0) : 0;
        let onlinePart = isOnline ? Number(bill.total || 0) : 0;
        if (isSplit && bill.splitPayments) {
            bill.splitPayments.forEach(sp => {
                if (sp.method === 'Cash') cashPart += Number(sp.amount || 0);
                if (sp.method === 'Online') onlinePart += Number(sp.amount || 0);
            });
        }

        await setDoc(summaryRef, {
            date: dateKey,
            totalSales: increment(Number(bill.total || 0)),
            billCount: increment(1),
            cashSales: increment(cashPart),
            onlineSales: increment(onlinePart),
            splitSales: increment(isSplit ? Number(bill.total || 0) : 0),
            lastUpdated: Timestamp.now()
        }, { merge: true });

        console.log(`[FirestoreSync] ✅ Bill #${bill.id} (Rs. ${bill.total}) synced to cloud for venue: ${cleanId}`);
    } catch (e) {
        console.error("[FirestoreSync] ❌ Failed to sync bill to cloud:", e);
    }
};

/**
 * Fetch live today's sales summary once (direct read)
 */
export const fetchLiveDailySales = async (venueId: string): Promise<LiveDailySales | null> => {
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId) return null;
    try {
        const db = getDb();
        const dateKey = getTodayDateKey();
        const summaryRef = doc(db, 'venues', cleanId, 'dailyReports', dateKey);
        const snap = await getDoc(summaryRef);
        if (snap.exists()) {
            return snap.data() as LiveDailySales;
        }
        return null;
    } catch (e) {
        console.error("Failed to fetch live daily sales:", e);
        return null;
    }
};

/**
 * Fetch recent bills once (direct read)
 */
export const fetchRecentBills = async (venueId: string, limitCount: number = 10): Promise<any[]> => {
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId) return [];
    try {
        const db = getDb();
        const billsRef = collection(db, 'venues', cleanId, 'bills');
        const q = query(billsRef, orderBy('completedAt', 'desc'), limit(limitCount));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            completedAt: d.data().completedAt?.toDate?.() || new Date()
        }));
    } catch (e) {
        console.error("Failed to fetch recent bills:", e);
        return [];
    }
};

/**
 * Listen to live today's sales summary for the mobile dashboard
 */
export const listenToLiveDailySales = (
    venueId: string, 
    onUpdate: (summary: LiveDailySales | null) => void
) => {
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId) return () => {};
    try {
        const db = getDb();
        const dateKey = getTodayDateKey();
        const summaryRef = doc(db, 'venues', cleanId, 'dailyReports', dateKey);

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
    onUpdate: (bills: any[]) => void,
    onNewBill?: (newBill: any) => void
) => {
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId) return () => {};
    try {
        const db = getDb();
        const billsRef = collection(db, 'venues', cleanId, 'bills');
        const q = query(billsRef, orderBy('completedAt', 'desc'), limit(limitCount));
        let isInitial = true;
        const seenBillIds = new Set<string>();

        return onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                completedAt: d.data().completedAt?.toDate?.() || new Date()
            }));
            onUpdate(list);

            if (isInitial) {
                isInitial = false;
                snap.docs.forEach(d => seenBillIds.add(d.id));
                return;
            }

            snap.docChanges().forEach((change) => {
                if (change.type === 'added' && !seenBillIds.has(change.doc.id)) {
                    seenBillIds.add(change.doc.id);
                    const data = change.doc.data();
                    const billData = {
                        id: change.doc.id,
                        ...data,
                        completedAt: data.completedAt?.toDate?.() || new Date()
                    };
                    console.log(`[FirestoreSync] 🔔 New live checkout received! Bill #${billData.id} - Rs. ${(billData as any).total}`);
                    onNewBill?.(billData);
                }
            });
        }, (err) => {
            console.error("Recent bills listener error:", err);
        });
    } catch (e) {
        console.error("Failed to attach recent bills listener:", e);
        return () => {};
    }
};

/**
 * Save new or updated employee to Firestore
 */
export const saveEmployeeToCloud = async (venueId: string, emp: Employee) => {
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId || !emp.id) return;
    try {
        const db = getDb();
        const empRef = doc(db, 'venues', cleanId, 'employees', emp.id);
        await setDoc(empRef, {
            ...emp,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (e) {
        console.error("Failed to save employee to cloud:", e);
    }
};

/**
 * Delete employee from Firestore
 */
export const deleteEmployeeFromCloud = async (venueId: string, employeeId: string) => {
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId || !employeeId) return;
    try {
        const db = getDb();
        const empRef = doc(db, 'venues', cleanId, 'employees', employeeId);
        await deleteDoc(empRef);
    } catch (e) {
        console.error("Failed to delete employee from cloud:", e);
    }
};

/**
 * Batch sync employees to Firestore
 */
export const syncEmployeesToCloud = async (venueId: string, employees: Employee[]) => {
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId || !employees.length) return;
    try {
        const db = getDb();
        const batch = writeBatch(db);
        employees.forEach(emp => {
            const empRef = doc(db, 'venues', cleanId, 'employees', emp.id);
            batch.set(empRef, { ...emp, updatedAt: Timestamp.now() }, { merge: true });
        });
        await batch.commit();
    } catch (e) {
        console.error("Failed to sync employees to cloud:", e);
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
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId || !employeeId) return;
    try {
        const db = getDb();
        const empRef = doc(db, 'venues', cleanId, 'employees', employeeId);
        await setDoc(empRef, {
            loginCode: newPin,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (e) {
        console.error("Failed to update staff PIN in cloud:", e);
    }
};

/**
 * Update staff permissions (allowedTabs) in Firestore
 */
export const updateStaffPermissionsInCloud = async (
    venueId: string, 
    employeeId: string, 
    allowedTabs: string[]
) => {
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId || !employeeId) return;
    try {
        const db = getDb();
        const empRef = doc(db, 'venues', cleanId, 'employees', employeeId);
        await setDoc(empRef, {
            allowedTabs,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (e) {
        console.error("Failed to update staff permissions in cloud:", e);
    }
};

/**
 * Listen to live employee roster
 */
export const listenToLiveEmployees = (
    venueId: string, 
    onUpdate: (employees: Employee[]) => void
) => {
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId) return () => {};
    try {
        const db = getDb();
        const employeesRef = collection(db, 'venues', cleanId, 'employees');

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
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId || !po.id) return;
    try {
        const db = getDb();
        const poRef = doc(db, 'venues', cleanId, 'purchaseOrders', po.id);
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
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId) return () => {};
    try {
        const db = getDb();
        const posRef = collection(db, 'venues', cleanId, 'purchaseOrders');

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
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId || !items.length) return;
    try {
        const db = getDb();
        const invRef = doc(db, 'venues', cleanId, 'catalogs', 'main');
        await setDoc(invRef, {
            items,
            itemCount: items.length,
            updatedAt: Timestamp.now()
        }, { merge: true });
        console.log(`[FirestoreSync] 📦 Synced ${items.length} items to cloud for venue: ${cleanId}`);
    } catch (e) {
        console.error("Failed to sync inventory to cloud:", e);
    }
};

/**
 * Fetch Live Inventory directly once
 */
export const fetchLiveInventory = async (venueId: string): Promise<InventoryItem[] | null> => {
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId) return null;
    try {
        const db = getDb();
        const invRef = doc(db, 'venues', cleanId, 'catalogs', 'main');
        const snap = await getDoc(invRef);
        if (snap.exists() && Array.isArray(snap.data()?.items)) {
            return snap.data().items as InventoryItem[];
        }
        return null;
    } catch (e) {
        console.error("Failed to fetch live inventory from cloud:", e);
        return null;
    }
};

/**
 * Listen to live inventory
 */
export const listenToLiveInventory = (
    venueId: string, 
    onUpdate: (items: InventoryItem[]) => void
) => {
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId) return () => {};
    try {
        const db = getDb();
        const invRef = doc(db, 'venues', cleanId, 'catalogs', 'main');

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
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId || !vendors.length) return;
    try {
        const db = getDb();
        const vendorsRef = doc(db, 'venues', cleanId, 'catalogs', 'vendors');
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
    const cleanId = getActiveVenueId(venueId);
    if (!cleanId) return () => {};
    try {
        const db = getDb();
        const vendorsRef = doc(db, 'venues', cleanId, 'catalogs', 'vendors');

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
