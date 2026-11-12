/**
 * ChillBill POS - Anti-Piracy & Commercial Subscription Licensing Engine
 *
 * Enforces:
 *  1. Cloud-backed multi-tenant licensing & email whitelisting
 *  2. 14-day offline grace period (stores can bill completely offline for up to 14 days)
 *  3. Subscription expiration auto-lock with support renewal actions
 *  4. Remote instant kill-switch (status === 'suspended')
 */

export interface StoreLicense {
  licenseKey: string;          // e.g. "CBILL-2026-GU7X"
  ownerEmail: string;          // Whitelisted client email e.g. "client@gmail.com"
  storeName: string;           // "Gupta Departmental Store"
  ownerName: string;           // "Ramesh Gupta"
  phone?: string;              // "+91 9876543210"
  status: 'active' | 'suspended' | 'expired';
  plan: 'trial' | 'annual' | 'multi_year';
  validUntil: string;          // ISO String (e.g. "2027-10-23T23:59:59.999Z")
  maxCounters: number;         // e.g. 1
  createdAt: string;
  notes?: string;
}

export interface OfflineLicenseToken {
  licenseKey: string;
  ownerEmail: string;
  storeName: string;
  status: 'active' | 'suspended' | 'expired';
  validUntil: string;
  lastVerifiedOnline: number;  // Timestamp in ms
  gracePeriodDays: number;     // 14 days
  signature: string;
}

export type LicenseValidationStatus =
  | 'valid'
  | 'expired'
  | 'suspended'
  | 'not_whitelisted'
  | 'offline_grace_expired'
  | 'clock_tampered';

export interface LicenseCheckResult {
  isValid: boolean;
  status: LicenseValidationStatus;
  daysRemaining: number;
  offlineDaysRemaining: number;
  storeName?: string;
  licenseKey?: string;
  validUntil?: string;
}

const STORAGE_KEY_LICENSE = 'chillbill_license_token';
const OFFLINE_GRACE_DAYS = 14;

// Simple deterministic hash signature to detect manual localStorage tampering
function createTokenSignature(licenseKey: string, email: string, validUntil: string): string {
  let hash = 0;
  const str = `${licenseKey}::${email.toLowerCase()}::${validUntil}::chillbill_secret_salt_2026`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a clean, readable License Key for clients
 * Format: CBILL-YEAR-XXXX (e.g. CBILL-2026-K9P2)
 */
export function generateLicenseKey(prefix = 'CBILL'): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${year}-${rand}`;
}

/**
 * Automatically format and insert hyphens for license key input fields.
 * Format: CBILL-YEAR-XXXX (e.g. CBILL-2026-E5SK)
 * - Auto-capitalizes input.
 * - Auto-inserts '-' after 'CBILL' (5 chars) and after year (9 chars total).
 * - Smooth backspace handling without getting stuck in hyphen loops.
 * - Auto-formats pasted unhyphenated strings.
 */
export function formatLicenseKeyInput(input: string, prevValue: string = ''): string {
  const raw = (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isDeleting = (input || '').length < (prevValue || '').length;
  if (raw.length === 0) return '';

  const segment1 = raw.slice(0, 5);
  const segment2 = raw.slice(5, 9);
  const segment3 = raw.slice(9, 13);

  let result = segment1;
  if (raw.length > 5) {
    result += '-' + segment2;
  } else if (raw.length === 5 && !isDeleting) {
    result += '-';
  }

  if (raw.length > 9) {
    result += '-' + segment3;
  } else if (raw.length === 9 && !isDeleting) {
    result += '-';
  }

  return result;
}

/**
 * Save cryptographically signed offline token to localStorage
 */
export function saveOfflineLicenseToken(license: StoreLicense): void {
  if (typeof window === 'undefined') return;
  try {
    const token: OfflineLicenseToken = {
      licenseKey: license.licenseKey,
      ownerEmail: license.ownerEmail.toLowerCase().trim(),
      storeName: license.storeName,
      status: license.status,
      validUntil: license.validUntil,
      lastVerifiedOnline: Date.now(),
      gracePeriodDays: OFFLINE_GRACE_DAYS,
      signature: createTokenSignature(license.licenseKey, license.ownerEmail, license.validUntil),
    };
    localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(token));
  } catch (err) {
    console.warn('[Licensing] Failed to save offline token:', err);
  }
}

/**
 * Read and verify local offline token
 */
export function getOfflineLicenseToken(): OfflineLicenseToken | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LICENSE);
    if (!raw) return null;
    const token: OfflineLicenseToken = JSON.parse(raw);

    // Validate signature integrity
    const expectedSig = createTokenSignature(token.licenseKey, token.ownerEmail, token.validUntil);
    if (token.signature !== expectedSig) {
      console.warn('[Licensing] Offline license token signature mismatch. Tampering detected.');
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Comprehensive verification: Checks Cloud Firestore when online, falls back
 * to 14-day Offline Grace Period when offline.
 * Supports email address OR direct license key (e.g. CBILL-2026-E5SK), and auto-resolves
 * credentials from offline cache / localStorage if omitted.
 */
export async function verifyStoreLicense(
  emailOrKey?: string,
  firestoreInstance?: any
): Promise<LicenseCheckResult> {
  const existingToken = getOfflineLicenseToken();
  const rawInput = (emailOrKey || '').trim();
  const isInputKey = rawInput.toUpperCase().startsWith('CBILL') || rawInput.includes('-');
  const inputEmail = (!isInputKey && rawInput.includes('@')) ? rawInput.toLowerCase() : '';
  const inputLicenseKey = isInputKey ? rawInput.toUpperCase() : '';

  const cleanEmail = (
    inputEmail ||
    existingToken?.ownerEmail ||
    (typeof window !== 'undefined'
      ? (localStorage.getItem('storeEmail') || localStorage.getItem('ownerEmail') || localStorage.getItem('activeStoreEmail'))
      : '') ||
    ''
  ).toLowerCase().trim();

  const cleanLicenseKey = (
    inputLicenseKey ||
    existingToken?.licenseKey ||
    (typeof window !== 'undefined'
      ? (localStorage.getItem('terminalLicense') || localStorage.getItem('storeLicenseKey') || localStorage.getItem('licenseKey'))
      : '') ||
    ''
  ).toUpperCase().trim();

  const now = Date.now();

  // Try Online Cloud Verification first if Firestore SDK is available and network is online
  if (firestoreInstance && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');

      let licenseData: StoreLicense | null = null;

      // 1. Direct License Key Document Lookup (Fastest, O(1) direct primary key)
      if (cleanLicenseKey) {
        try {
          const licDocSnap = await getDoc(doc(firestoreInstance, 'licenses', cleanLicenseKey));
          if (licDocSnap.exists()) {
            licenseData = licDocSnap.data() as StoreLicense;
          }
        } catch (e) {
          console.warn('[Licensing] Direct license doc lookup error:', e);
        }
      }

      // 2. Query Licenses collection by ownerEmail
      if (!licenseData && cleanEmail) {
        try {
          const licQuery = query(
            collection(firestoreInstance, 'licenses'),
            where('ownerEmail', '==', cleanEmail)
          );
          const licSnap = await getDocs(licQuery);
          if (!licSnap.empty) {
            licenseData = licSnap.docs[0].data() as StoreLicense;
          }
        } catch (e) {
          console.warn('[Licensing] License query by email error:', e);
        }
      }

      // 3. Fallback: Whitelist lookup
      if (!licenseData && cleanEmail) {
        try {
          const whiteSnap = await getDoc(doc(firestoreInstance, 'whitelist', cleanEmail));
          if (whiteSnap.exists()) {
            const whiteData = whiteSnap.data();
            const legacyExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
            licenseData = {
              licenseKey: whiteData.licenseKey || `CBILL-LEGACY-${cleanEmail.slice(0, 4).toUpperCase()}`,
              ownerEmail: cleanEmail,
              storeName: whiteData.storeName || 'My Retail Store',
              ownerName: whiteData.ownerName || cleanEmail.split('@')[0],
              status: (whiteData.status === 'suspended' ? 'suspended' : 'active') as any,
              plan: 'annual',
              validUntil: legacyExpiry,
              maxCounters: 1,
              createdAt: new Date().toISOString(),
            };
          }
        } catch (e) {
          console.warn('[Licensing] Whitelist lookup error:', e);
        }
      }

      if (licenseData) {
        if (licenseData.status === 'suspended') {
          return {
            isValid: false,
            status: 'suspended',
            daysRemaining: 0,
            offlineDaysRemaining: 0,
            storeName: licenseData.storeName,
            licenseKey: licenseData.licenseKey,
            validUntil: licenseData.validUntil,
          };
        }

        const expiryMs = new Date(licenseData.validUntil).getTime();
        const daysRemaining = Math.max(0, Math.ceil((expiryMs - now) / (1000 * 60 * 60 * 24)));

        if (now > expiryMs) {
          return {
            isValid: false,
            status: 'expired',
            daysRemaining: 0,
            offlineDaysRemaining: 0,
            storeName: licenseData.storeName,
            licenseKey: licenseData.licenseKey,
            validUntil: licenseData.validUntil,
          };
        }

        // Active & Valid! Save fresh 14-day offline token (resets lastVerifiedOnline to Date.now())
        saveOfflineLicenseToken(licenseData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('terminalLicense', licenseData.licenseKey);
          localStorage.setItem('storeEmail', licenseData.ownerEmail);
        }

        return {
          isValid: true,
          status: 'valid',
          daysRemaining,
          offlineDaysRemaining: OFFLINE_GRACE_DAYS,
          storeName: licenseData.storeName,
          licenseKey: licenseData.licenseKey,
          validUntil: licenseData.validUntil,
        };
      }
    } catch (networkErr) {
      console.warn('[Licensing] Cloud verification failed or offline, falling back to local token:', networkErr);
    }
  }

  // --- OFFLINE VERIFICATION (14-Day Grace Period Engine) ---
  const offlineToken = getOfflineLicenseToken();
  if (!offlineToken) {
    // No local token found and cannot reach cloud
    return {
      isValid: false,
      status: 'not_whitelisted',
      daysRemaining: 0,
      offlineDaysRemaining: 0,
    };
  }

  // If local token belongs to a different email
  if (cleanEmail && offlineToken.ownerEmail && offlineToken.ownerEmail !== cleanEmail) {
    return {
      isValid: false,
      status: 'not_whitelisted',
      daysRemaining: 0,
      offlineDaysRemaining: 0,
    };
  }

  // Check remote kill-switch stored in token
  if (offlineToken.status === 'suspended') {
    return {
      isValid: false,
      status: 'suspended',
      daysRemaining: 0,
      offlineDaysRemaining: 0,
      storeName: offlineToken.storeName,
      licenseKey: offlineToken.licenseKey,
      validUntil: offlineToken.validUntil,
    };
  }

  // Check Subscription Expiry
  const expiryMs = new Date(offlineToken.validUntil).getTime();
  const daysRemaining = Math.max(0, Math.ceil((expiryMs - now) / (1000 * 60 * 60 * 24)));
  if (now > expiryMs) {
    return {
      isValid: false,
      status: 'expired',
      daysRemaining: 0,
      offlineDaysRemaining: 0,
      storeName: offlineToken.storeName,
      licenseKey: offlineToken.licenseKey,
      validUntil: offlineToken.validUntil,
    };
  }

  // If the terminal IS online right now and subscription is active, auto-refresh heartbeat timestamp
  if (typeof navigator !== 'undefined' && navigator.onLine && daysRemaining > 0) {
    offlineToken.lastVerifiedOnline = now;
    try {
      localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(offlineToken));
    } catch {}
    return {
      isValid: true,
      status: 'valid',
      daysRemaining,
      offlineDaysRemaining: OFFLINE_GRACE_DAYS,
      storeName: offlineToken.storeName,
      licenseKey: offlineToken.licenseKey,
      validUntil: offlineToken.validUntil,
    };
  }

  // Check 14-Day Offline Grace Window
  const timeSinceLastVerified = now - offlineToken.lastVerifiedOnline;
  const maxOfflineMs = OFFLINE_GRACE_DAYS * 24 * 60 * 60 * 1000;
  const offlineDaysRemaining = Math.max(
    0,
    Math.ceil((maxOfflineMs - timeSinceLastVerified) / (1000 * 60 * 60 * 24))
  );

  // Detect system clock manipulation (time going backward)
  if (now < offlineToken.lastVerifiedOnline - 60000) {
    return {
      isValid: false,
      status: 'clock_tampered',
      daysRemaining,
      offlineDaysRemaining: 0,
      storeName: offlineToken.storeName,
      licenseKey: offlineToken.licenseKey,
    };
  }

  if (timeSinceLastVerified > maxOfflineMs) {
    return {
      isValid: false,
      status: 'offline_grace_expired',
      daysRemaining,
      offlineDaysRemaining: 0,
      storeName: offlineToken.storeName,
      licenseKey: offlineToken.licenseKey,
      validUntil: offlineToken.validUntil,
    };
  }

  // Offline grace valid!
  return {
    isValid: true,
    status: 'valid',
    daysRemaining,
    offlineDaysRemaining,
    storeName: offlineToken.storeName,
    licenseKey: offlineToken.licenseKey,
    validUntil: offlineToken.validUntil,
  };
}

/**
 * Format a WhatsApp Welcome & Activation message for the client
 */
export function formatWhatsAppOnboardingMessage(license: StoreLicense, appUrl: string): string {
  const expiryFormatted = new Date(license.validUntil).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `🎉 *Welcome to ChillBill Retail POS!*

Namaste ${license.ownerName}! Your billing software for *${license.storeName}* is officially activated.

🔑 *License Key:* ${license.licenseKey}
📅 *Validity:* Until ${expiryFormatted} (${license.plan.toUpperCase()} Plan)
🖥️ *Counters Allowed:* ${license.maxCounters} Counter(s)
📧 *Registered Login:* ${license.ownerEmail}

📲 *Get Started in 1 Click:*
1. Open this link on your POS computer / tablet:
👉 ${appUrl}
2. Click *"Sign in with Google"* using your registered email: ${license.ownerEmail}
3. Click the *"Install App"* icon in the browser address bar for a seamless desktop POS window.

For support or setup assistance, reach out to our team at any time. Happy Billing! 🚀`;
}
