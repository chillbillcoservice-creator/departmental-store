import { collection, doc, setDoc, getDoc, getDocs, Timestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { SetupData, Employee } from './types';
import { buildUsername } from './generate-username';

const getDb = () => initializeFirebase().firestore;

export const generateVenueId = (venueName: string) => {
    return venueName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
}

export const saveVenueSetup = async (setupData: SetupData, uid?: string) => {
    const db = getDb();
    // If owner is authenticated via Google, use their Firebase UID as venueId for clean linking
    const venueId = uid || generateVenueId(setupData.venue.name);
    const venueRef = doc(db, 'venues', venueId);

    // Save main venue document
    await setDoc(venueRef, {
        ...setupData.venue,
        currency: setupData.currency,
        language: setupData.language,
        owner: setupData.owner,
        additionalOwners: setupData.additionalOwners || [],
        createdAt: Timestamp.now(),
    });

    // Save employees as subcollection
    const employeesRef = collection(venueRef, 'employees');
    const allEmployees: Employee[] = [];

    // Add owner as an employee (for login purposes)
    const ownerEmployee: Employee = {
        id: 'owner-1',
        name: setupData.owner.name,
        role: 'Owner',
        salary: 0,
        color: '#f97316', // orange
        mobile: setupData.owner.contactNumber,
        email: setupData.owner.email,
        allowedTabs: ['all'],
        password: setupData.owner.password || '',
        loginCode: setupData.owner.loginCode || '0000',
        username: buildUsername(setupData.venue.name, setupData.owner.name, setupData.owner.loginCode || '0000')
    };
    allEmployees.push(ownerEmployee);

    // Add additional owners
    if (setupData.additionalOwners) {
        setupData.additionalOwners.forEach((partner, index) => {
            if (!partner.name) return;
            allEmployees.push({
                id: `owner-${index + 2}`,
                name: partner.name,
                role: 'Partner',
                salary: 0,
                color: '#f59e0b', // amber
                mobile: partner.contactNumber,
                email: partner.email,
                allowedTabs: ['all'],
                password: partner.password || '',
                loginCode: partner.loginCode || '0000',
                username: buildUsername(setupData.venue.name, partner.name, partner.loginCode || '0000')
            });
        });
    }

    // Add general employees
    setupData.employees.forEach((emp, index) => {
        if (!emp.name) return;
        allEmployees.push({
            id: `emp-${index + 1}`,
            name: emp.name,
            role: emp.role || 'Staff',
            salary: emp.salary || 0,
            color: emp.color || '#3b82f6',
            mobile: emp.mobile || '',
            email: emp.email || '',
            allowedTabs: emp.allowedTabs || [],
            password: emp.password || '',
            loginCode: emp.loginCode || '0000',
            username: emp.username || buildUsername(setupData.venue.name, emp.name, emp.loginCode || '0000')
        });
    });

    // Write all employees to the subcollection
    for (const emp of allEmployees) {
        const empDoc = doc(employeesRef, emp.id);
        await setDoc(empDoc, { ...emp, createdAt: Timestamp.now() });
    }

    // Return venueId so client can store it locally
    return venueId;
};

export const fetchEmployees = async (venueId: string): Promise<Employee[]> => {
    const db = getDb();
    const employeesRef = collection(db, 'venues', venueId, 'employees');
    const snapshot = await getDocs(employeesRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Employee));
};

export const fetchVenue = async (venueId: string) => {
    const db = getDb();
    const venueRef = doc(db, 'venues', venueId);
    const snap = await getDoc(venueRef);
    if (!snap.exists()) return null;
    return snap.data();
};
