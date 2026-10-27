#!/usr/bin/env node

/**
 * ChillBill POS - Developer Super-Admin Licensing CLI
 * 
 * Run from developer computer:
 *   npm run license
 * 
 * Features:
 *   1. Onboard new store clients (Generate license, whitelist email, create tenant record)
 *   2. Generate instant WhatsApp Welcome & Activation messages
 *   3. View all client licenses & subscription countdowns
 *   4. Remotely Suspend / Activate store licenses
 *   5. Renew licenses (+1 Year / +6 Months)
 */

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'chill-bill-ee46b';
const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chillbill-store.vercel.app';

function generateLicenseKey(prefix = 'CBILL') {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${year}-${rand}`;
}

// Convert Firestore Document to normal JS object
function parseFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const obj = {};
  for (const [key, val] of Object.entries(doc.fields)) {
    if ('stringValue' in val) obj[key] = val.stringValue;
    else if ('integerValue' in val) obj[key] = Number(val.integerValue);
    else if ('doubleValue' in val) obj[key] = Number(val.doubleValue);
    else if ('booleanValue' in val) obj[key] = val.booleanValue;
    else if ('timestampValue' in val) obj[key] = val.timestampValue;
  }
  return obj;
}

// Convert normal JS object to Firestore Fields payload
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'number') fields[key] = { integerValue: String(Math.floor(val)) };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
  }
  return { fields };
}

async function writeFirestoreDoc(collection, docId, data) {
  const url = `${BASE_FIRESTORE_URL}/${collection}/${encodeURIComponent(docId)}`;
  const body = JSON.stringify(toFirestoreFields(data));
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Firestore write failed (${res.status}): ${txt}`);
  }
  return res.json();
}

async function getAllLicenses() {
  const url = `${BASE_FIRESTORE_URL}/licenses?pageSize=100`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents.map(d => parseFirestoreDoc(d)).filter(Boolean);
  } catch (err) {
    console.error('Error fetching licenses:', err.message);
    return [];
  }
}

async function getLicenseByKey(licenseKey) {
  const url = `${BASE_FIRESTORE_URL}/licenses/${encodeURIComponent(licenseKey)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const doc = await res.json();
    return parseFirestoreDoc(doc);
  } catch {
    return null;
  }
}

function printHeader() {
  console.clear();
  console.log('\x1b[38;5;208m');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║       CHILLBILL RETAIL POS — DEVELOPER LICENSE MANAGER CLI        ║');
  console.log('║               Private Developer Provisioning Console             ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');
  console.log(`Cloud Project: \x1b[36m${FIREBASE_PROJECT_ID}\x1b[0m | Production App URL: \x1b[34m${APP_URL}\x1b[0m\n`);
}

async function handleOnboardStore(rl) {
  printHeader();
  console.log('\x1b[1m➕ [STEP 1/2] ONBOARD NEW STORE CLIENT\x1b[0m\n');

  const storeName = (await rl.question('Enter Store / Business Name: ')).trim();
  if (!storeName) {
    console.log('\x1b[31m❌ Store name cannot be empty.\x1b[0m');
    return;
  }

  const ownerName = (await rl.question('Enter Owner Full Name: ')).trim();
  const ownerEmail = (await rl.question('Enter Owner Email (for Google Login & Whitelist): ')).trim().toLowerCase();
  if (!ownerEmail || !ownerEmail.includes('@')) {
    console.log('\x1b[31m❌ Valid email is required for whitelisting.\x1b[0m');
    return;
  }

  const phone = (await rl.question('Enter Owner WhatsApp Phone (e.g. 9876543210): ')).trim();

  console.log('\nSelect Subscription Plan Duration:');
  console.log('  [1] 1 Month Trial (30 Days)');
  console.log('  [2] 6 Months Pro (180 Days)');
  console.log('  [3] 1 Year Retail Pro (365 Days) — [RECOMMENDED]');
  console.log('  [4] 2 Years Enterprise (730 Days)');
  console.log('  [5] 3 Years Lifetime (1095 Days)');
  const planChoice = (await rl.question('Choose plan [1-5, default: 3]: ')).trim() || '3';

  let daysToAdd = 365;
  let planName = 'annual';
  if (planChoice === '1') { daysToAdd = 30; planName = 'trial'; }
  else if (planChoice === '2') { daysToAdd = 180; planName = '6_months'; }
  else if (planChoice === '4') { daysToAdd = 730; planName = '2_years'; }
  else if (planChoice === '5') { daysToAdd = 1095; planName = '3_years'; }

  const countersStr = (await rl.question('Billing Counters Allowed [default: 1]: ')).trim() || '1';
  const maxCounters = parseInt(countersStr, 10) || 1;

  const validUntilDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
  const validUntilISO = validUntilDate.toISOString();
  const licenseKey = generateLicenseKey();

  console.log('\n⏳ Provisioning license and whitelisting client in cloud database...');

  try {
    // 1. Whitelist email
    await writeFirestoreDoc('whitelist', ownerEmail, {
      email: ownerEmail,
      storeName,
      ownerName,
      status: 'approved',
      licenseKey,
      createdAt: new Date().toISOString(),
    });

    // 2. Create license record
    await writeFirestoreDoc('licenses', licenseKey, {
      licenseKey,
      ownerEmail,
      storeName,
      ownerName,
      phone,
      plan: planName,
      status: 'active',
      validUntil: validUntilISO,
      maxCounters,
      createdAt: new Date().toISOString(),
    });

    console.log('\x1b[32m✔ Client whitelisted & license activated successfully!\x1b[0m\n');
    console.log('───────────────────────────────────────────────────────────────────');
    console.log(`\x1b[1mStore Name:\x1b[0m      ${storeName}`);
    console.log(`\x1b[1mOwner:\x1b[0m           ${ownerName} (${ownerEmail})`);
    console.log(`\x1b[1mLicense ID:\x1b[0m      \x1b[38;5;208m${licenseKey}\x1b[0m`);
    console.log(`\x1b[1mValid Until:\x1b[0m     ${validUntilDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${daysToAdd} days)`);
    console.log(`\x1b[1mCounters:\x1b[0m        ${maxCounters}`);
    console.log('───────────────────────────────────────────────────────────────────\n');

    // WhatsApp Message
    const expiryFormatted = validUntilDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const waMsg = `🎉 *Welcome to ChillBill Retail POS!*

Namaste ${ownerName}! Your billing software for *${storeName}* is officially activated.

🔑 *License Key:* ${licenseKey}
📅 *Validity:* Until ${expiryFormatted} (${planName.toUpperCase()} Plan)
🖥️ *Counters Allowed:* ${maxCounters} Counter(s)
📧 *Registered Login:* ${ownerEmail}

📲 *Get Started in 1 Click:*
1. Open this link on your POS computer / tablet:
👉 ${APP_URL}
2. Click *"Sign in with Google"* using your registered email: ${ownerEmail}
3. Click the *"Install App"* icon in the browser address bar for a seamless desktop POS window.

For support or setup assistance, reach out to our team at any time. Happy Billing! 🚀`;

    console.log('\x1b[36m📋 READY-TO-SEND WHATSAPP ONBOARDING MESSAGE:\x1b[0m');
    console.log('-------------------------------------------------------------------');
    console.log(waMsg);
    console.log('-------------------------------------------------------------------');

  } catch (err) {
    console.error('\x1b[31m❌ Provisioning error:\x1b[0m', err.message);
  }

  await rl.question('\nPress Enter to return to main menu...');
}

async function handleListLicenses(rl) {
  printHeader();
  console.log('\x1b[1m📋 ALL CLIENT STORES & SUBSCRIPTION STATUS\x1b[0m\n');
  console.log('Fetching active licenses from cloud database...\n');

  const licenses = await getAllLicenses();
  if (licenses.length === 0) {
    console.log('No client licenses found in Firestore.');
  } else {
    console.log('┌───────────────────────┬──────────────────────────────┬──────────────┬──────────────┬───────────┐');
    console.log('│ License ID            │ Store Name                   │ Owner Email  │ Days Left    │ Status    │');
    console.log('├───────────────────────┼──────────────────────────────┼──────────────┼──────────────┼───────────┤');
    
    const now = Date.now();
    for (const lic of licenses) {
      const expMs = new Date(lic.validUntil).getTime();
      const daysLeft = Math.ceil((expMs - now) / (1000 * 60 * 60 * 24));
      const statusColor = lic.status === 'suspended' ? '\x1b[31mSUSPENDED\x1b[0m' : daysLeft <= 0 ? '\x1b[31mEXPIRED  \x1b[0m' : '\x1b[32mACTIVE   \x1b[0m';
      const daysStr = daysLeft > 0 ? `${daysLeft}d left` : 'Lapsed ';
      
      const keyCol = (lic.licenseKey || '').padEnd(21).slice(0, 21);
      const storeCol = (lic.storeName || '').padEnd(28).slice(0, 28);
      const emailCol = (lic.ownerEmail || '').padEnd(12).slice(0, 12);
      const daysCol = daysStr.padEnd(12).slice(0, 12);

      console.log(`│ ${keyCol} │ ${storeCol} │ ${emailCol} │ ${daysCol} │ ${statusColor} │`);
    }
    console.log('└───────────────────────┴──────────────────────────────┴──────────────┴──────────────┴───────────┘');
  }

  await rl.question('\nPress Enter to return to main menu...');
}

async function handleToggleStatus(rl) {
  printHeader();
  console.log('\x1b[1m⏸️ SUSPEND OR ACTIVATE CLIENT LICENSE\x1b[0m\n');

  const licenseKey = (await rl.question('Enter License ID to modify (e.g. CBILL-2026-XXXX): ')).trim();
  const lic = await getLicenseByKey(licenseKey);

  if (!lic) {
    console.log('\x1b[31m❌ License not found.\x1b[0m');
    await rl.question('\nPress Enter to return to main menu...');
    return;
  }

  console.log(`\nFound Store: \x1b[1m${lic.storeName}\x1b[0m (${lic.ownerEmail})`);
  console.log(`Current Status: \x1b[36m${lic.status.toUpperCase()}\x1b[0m\n`);

  console.log('Select Action:');
  console.log('  [1] Set ACTIVE (Unlock store)');
  console.log('  [2] Set SUSPENDED (Instantly lock store)');
  const choice = (await rl.question('Choose action [1/2]: ')).trim();

  const newStatus = choice === '2' ? 'suspended' : 'active';
  await writeFirestoreDoc('licenses', licenseKey, {
    ...lic,
    status: newStatus,
  });

  console.log(`\x1b[32m✔ License status updated to ${newStatus.toUpperCase()}.\x1b[0m`);
  await rl.question('\nPress Enter to return to main menu...');
}

async function handleRenewLicense(rl) {
  printHeader();
  console.log('\x1b[1m🔄 RENEW CLIENT SUBSCRIPTION\x1b[0m\n');

  const licenseKey = (await rl.question('Enter License ID to renew: ')).trim();
  const lic = await getLicenseByKey(licenseKey);

  if (!lic) {
    console.log('\x1b[31m❌ License not found.\x1b[0m');
    await rl.question('\nPress Enter to return to main menu...');
    return;
  }

  console.log(`\nFound Store: \x1b[1m${lic.storeName}\x1b[0m (${lic.ownerEmail})`);
  console.log(`Current Expiry: ${new Date(lic.validUntil).toLocaleDateString('en-IN')}`);

  console.log('\nSelect Renewal Extension:');
  console.log('  [1] +1 Year (365 Days) — [RECOMMENDED]');
  console.log('  [2] +6 Months (180 Days)');
  console.log('  [3] +1 Month (30 Days)');
  const choice = (await rl.question('Choose extension [1-3, default 1]: ')).trim() || '1';

  let addDays = 365;
  if (choice === '2') addDays = 180;
  if (choice === '3') addDays = 30;

  const currentExpiry = new Date(lic.validUntil).getTime();
  const baseTime = Math.max(Date.now(), currentExpiry);
  const newExpiry = new Date(baseTime + addDays * 24 * 60 * 60 * 1000).toISOString();

  await writeFirestoreDoc('licenses', licenseKey, {
    ...lic,
    status: 'active',
    validUntil: newExpiry,
  });

  console.log(`\x1b[32m✔ License renewed until ${new Date(newExpiry).toLocaleDateString('en-IN')}!\x1b[0m`);
  await rl.question('\nPress Enter to return to main menu...');
}

async function main() {
  const rl = readline.createInterface({ input, output });

  while (true) {
    printHeader();
    console.log('Select an action:');
    console.log('  [1] ➕ Onboard New Store Client (Generate License & Whitelist)');
    console.log('  [2] 📋 View All Stores & License Expirations');
    console.log('  [3] ⏸️  Suspend / Activate Client (Instant Remote Kill-Switch)');
    console.log('  [4] 🔄 Renew Store Subscription (+1 Year / +6 Months)');
    console.log('  [5] 🚪 Exit');
    console.log('');

    const choice = (await rl.question('\x1b[1mEnter choice [1-5]: \x1b[0m')).trim();

    if (choice === '1') await handleOnboardStore(rl);
    else if (choice === '2') await handleListLicenses(rl);
    else if (choice === '3') await handleToggleStatus(rl);
    else if (choice === '4') await handleRenewLicense(rl);
    else if (choice === '5') {
      console.log('\nExiting Developer Licensing CLI. Happy coding!\n');
      rl.close();
      process.exit(0);
    }
  }
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
