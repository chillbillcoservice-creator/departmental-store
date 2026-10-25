import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 54321;
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'chill-bill-ee46b';
const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chill-bill-pos.vercel.app';

function generateLicenseKey(prefix = 'CBILL') {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${year}-${rand}`;
}

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
    throw new Error(`Firestore write error (${res.status}): ${txt}`);
  }
  return res.json();
}

const DB_FILE = path.join(__dirname, '..', 'data', 'licenses-db.json');

function readLocalDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify({ licenses: {}, whitelist: {} }, null, 2));
      return { licenses: {}, whitelist: {} };
    }
    const txt = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(txt);
  } catch (err) {
    console.error('Error reading local db:', err);
    return { licenses: {}, whitelist: {} };
  }
}

function writeLocalDb(db) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error writing local db:', err);
  }
}

async function getAllLicenses() {
  const localDb = readLocalDb();
  const localList = Object.values(localDb.licenses || {});

  const url = `${BASE_FIRESTORE_URL}/licenses?pageSize=100`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.documents) {
        const cloudList = data.documents.map(d => parseFirestoreDoc(d)).filter(Boolean);
        const map = new Map();
        localList.forEach(l => map.set(l.licenseKey, l));
        cloudList.forEach(l => map.set(l.licenseKey, l));
        return Array.from(map.values());
      }
    }
  } catch (err) {
    // Cloud fetch error or uninitialized
  }
  return localList;
}

async function getLicenseByKey(licenseKey) {
  const localDb = readLocalDb();
  if (localDb.licenses && localDb.licenses[licenseKey]) {
    return localDb.licenses[licenseKey];
  }
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

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChillBill POS — Developer License Manager</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#fff7ed',
              100: '#ffedd5',
              200: '#fed7aa',
              300: '#fdba74',
              400: '#fb923c',
              500: '#f97316',
              600: '#ea580c',
              700: '#c2410c',
              800: '#9a3412',
              900: '#7c2d12',
            }
          },
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            display: ['"Montserrat"', 'sans-serif'],
          }
        }
      }
    }
  </script>
  <style>
    body {
      background: radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 40%, #020617 100%);
      min-height: 100vh;
      color: #f8fafc;
      user-select: none;
    }
    input, select, textarea {
      user-select: text;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.6);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(249, 115, 22, 0.3);
      border-radius: 9999px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(249, 115, 22, 0.6);
    }
  </style>
</head>
<body class="flex flex-col h-screen overflow-hidden font-sans antialiased text-slate-100">

  <!-- Top App Header -->
  <header class="h-16 px-6 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-amber-600 flex items-center justify-center shadow-lg shadow-brand-500/20 ring-2 ring-brand-500/30">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      </div>
      <div>
        <h1 class="font-display font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-400 bg-clip-text text-transparent">
          ChillBill POS
        </h1>
        <p class="text-[11px] font-semibold text-slate-400 tracking-wide flex items-center gap-1.5">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Developer License Manager &bull; Cloud Provisioning
        </p>
      </div>
    </div>

    <!-- Quick Stats & Badges -->
    <div class="flex items-center gap-3">
      <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
        <span class="text-slate-400">Production URL:</span>
        <a href="${APP_URL}" target="_blank" class="font-mono text-brand-400 hover:text-brand-300 transition-colors font-bold flex items-center gap-1">
          ${APP_URL.replace('https://', '')}
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        </a>
      </div>

      <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
        <span>${FIREBASE_PROJECT_ID}</span>
      </div>
    </div>
  </header>

  <!-- App Layout -->
  <div class="flex flex-1 overflow-hidden">
    
    <!-- Left Navigation Bar -->
    <nav class="w-60 bg-slate-900/40 border-r border-slate-800/80 p-3 flex flex-col gap-1.5 shrink-0">
      <div class="text-[10px] font-black uppercase text-slate-500 tracking-wider px-3 pt-2 pb-1">
        Navigation
      </div>

      <button id="tab-btn-onboard" onclick="switchTab('onboard')" class="tab-btn w-full px-3.5 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all duration-200 bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-lg shadow-brand-500/10">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        <span>Onboard Store</span>
      </button>

      <button id="tab-btn-directory" onclick="switchTab('directory')" class="tab-btn w-full px-3.5 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all duration-200 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
        <span>Store Directory</span>
        <span id="stores-count-badge" class="ml-auto text-xs font-mono font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">0</span>
      </button>

      <div class="mt-auto p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 text-xs space-y-2">
        <div class="font-bold text-slate-300 flex items-center gap-1.5">
          <svg class="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Quick Tips
        </div>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          When onboarding, enter the client's Google Account email. Once approved, they can sign in immediately at the production POS URL.
        </p>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-y-auto custom-scrollbar p-6">
      
      <!-- TAB 1: ONBOARD NEW STORE -->
      <section id="view-onboard" class="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 class="font-display font-black text-2xl text-white tracking-tight">Onboard New Store Client</h2>
          <p class="text-sm text-slate-400 mt-1">Generate a CBILL license key, whitelist their Google account, and create their ready-to-send WhatsApp welcome kit.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Input Form Column -->
          <div class="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            
            <!-- Store Name -->
            <div class="space-y-1.5">
              <label class="text-xs font-black uppercase text-slate-400 tracking-wider block">Store / Business Name *</label>
              <input id="input-storeName" type="text" placeholder="e.g. Krishna Supermart" class="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all">
            </div>

            <!-- Owner Name -->
            <div class="space-y-1.5">
              <label class="text-xs font-black uppercase text-slate-400 tracking-wider block">Owner Full Name *</label>
              <input id="input-ownerName" type="text" placeholder="e.g. Rajesh Kumar" class="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all">
            </div>

            <!-- Owner Google Email -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="text-xs font-black uppercase text-slate-400 tracking-wider">Owner Email (For Google Login Whitelist) *</label>
                <span class="text-[10px] text-brand-400 font-bold">Crucial for Login</span>
              </div>
              <input id="input-ownerEmail" type="email" placeholder="e.g. rajeshkumar@gmail.com" class="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all">
            </div>

            <!-- WhatsApp Phone -->
            <div class="space-y-1.5">
              <label class="text-xs font-black uppercase text-slate-400 tracking-wider block">WhatsApp Phone Number</label>
              <input id="input-phone" type="tel" placeholder="e.g. 9876543210" class="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all">
            </div>

            <!-- Subscription Plan Duration -->
            <div class="space-y-1.5">
              <label class="text-xs font-black uppercase text-slate-400 tracking-wider block">Subscription Plan Duration</label>
              <select id="input-plan" class="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all">
                <option value="365" selected>1 Year Retail Pro (365 Days) — Recommended</option>
                <option value="180">6 Months Pro (180 Days)</option>
                <option value="30">1 Month Free Trial (30 Days)</option>
                <option value="730">2 Years Enterprise (730 Days)</option>
                <option value="1095">3 Years Lifetime (1095 Days)</option>
              </select>
            </div>

            <!-- Counters -->
            <div class="space-y-1.5">
              <label class="text-xs font-black uppercase text-slate-400 tracking-wider block">Allowed Billing Counters</label>
              <input id="input-counters" type="number" min="1" max="20" value="1" class="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all">
            </div>

            <!-- Submit Button -->
            <div class="pt-2">
              <button id="btn-submit-onboard" onclick="submitOnboard()" class="w-full h-13 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-500 via-orange-600 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white font-display font-black text-base shadow-lg shadow-brand-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                <span>Generate License & Whitelist Store</span>
              </button>
            </div>

          </div>

          <!-- Result & WhatsApp Column -->
          <div class="lg:col-span-5 flex flex-col gap-4">
            
            <div id="onboard-result-card" class="hidden bg-slate-900/60 border border-emerald-500/40 rounded-3xl p-6 shadow-xl space-y-4">
              <div class="flex items-center gap-2 text-emerald-400 font-display font-bold">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>License Provisioned!</span>
              </div>

              <div class="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div class="text-[11px] font-black uppercase text-slate-400">Assigned License Key</div>
                <div class="flex items-center justify-between gap-2">
                  <span id="res-licenseKey" class="font-mono text-xl font-black text-brand-400">CBILL-2026-XXXX</span>
                  <button onclick="copyToClipboard(document.getElementById('res-licenseKey').innerText, 'Key Copied!')" class="px-2.5 py-1 text-xs font-bold bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 rounded-lg transition-colors">
                    Copy
                  </button>
                </div>
                <div class="text-xs text-slate-400 pt-1 border-t border-slate-700/60 flex justify-between">
                  <span>Valid Until:</span>
                  <span id="res-validUntil" class="font-bold text-slate-200">-</span>
                </div>
              </div>

              <!-- Ready-to-Send WhatsApp Text Box -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-black uppercase text-slate-400 tracking-wider">Ready WhatsApp Message</label>
                  <button onclick="copyToClipboard(document.getElementById('res-whatsapp').value, 'WhatsApp Message Copied!')" class="text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                    Copy Message
                  </button>
                </div>
                <textarea id="res-whatsapp" rows="10" readonly class="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 font-mono text-xs focus:outline-none custom-scrollbar select-text leading-relaxed"></textarea>
              </div>

              <button onclick="copyToClipboard(document.getElementById('res-whatsapp').value, 'WhatsApp Message Copied!')" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>Copy WhatsApp Welcome Kit</span>
              </button>
            </div>

            <!-- Empty Placeholder -->
            <div id="onboard-placeholder-card" class="bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-slate-500 min-h-[300px]">
              <div class="w-16 h-16 rounded-2xl bg-slate-800/40 flex items-center justify-center mb-3">
                <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </div>
              <p class="font-bold text-sm text-slate-400">Fill in the store details on the left</p>
              <p class="text-xs text-slate-500 mt-1 max-w-xs">Your CBILL license, whitelist entry, and WhatsApp onboarding kit will be generated here.</p>
            </div>

          </div>
        </div>
      </section>

      <!-- TAB 2: STORE DIRECTORY -->
      <section id="view-directory" class="hidden max-w-6xl mx-auto space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="font-display font-black text-2xl text-white tracking-tight">Active Client Stores</h2>
            <p class="text-sm text-slate-400 mt-1">Real-time licenses, subscription countdowns, instant kill-switches, and 1-click renewals.</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="relative w-72">
              <input id="input-search" oninput="filterStores()" type="text" placeholder="Search by name, email, key..." class="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50">
              <svg class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <button onclick="syncAllToCloud()" id="btn-sync-cloud" class="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs transition-colors" title="Sync all local records to Cloud Firestore">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              <span>Sync to Firebase</span>
            </button>
            <button onclick="loadStores()" class="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors" title="Refresh">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
        </div>

        <!-- Stores Table -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-950/60 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th class="py-3.5 px-4">Store & Owner</th>
                  <th class="py-3.5 px-4">Whitelisted Email</th>
                  <th class="py-3.5 px-4">License Key</th>
                  <th class="py-3.5 px-4">Remaining</th>
                  <th class="py-3.5 px-4">Status</th>
                  <th class="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="stores-table-body" class="divide-y divide-slate-800/60">
                <tr>
                  <td colspan="6" class="py-12 text-center text-slate-500">
                    Loading stores from cloud database...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </main>
  </div>

  <!-- Toast Notification -->
  <div id="toast" class="fixed bottom-6 right-6 px-4 py-3 rounded-2xl bg-slate-900/90 border border-brand-500/40 text-white font-bold text-xs shadow-2xl transform translate-y-20 opacity-0 transition-all duration-300 flex items-center gap-2 z-50">
    <span class="inline-block w-2 h-2 rounded-full bg-brand-500"></span>
    <span id="toast-message">Copied to clipboard</span>
  </div>

  <script>
    let allLicenses = [];

    function showToast(msg) {
      const toast = document.getElementById('toast');
      const text = document.getElementById('toast-message');
      text.innerText = msg;
      toast.classList.remove('translate-y-20', 'opacity-0');
      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
      }, 2500);
    }

    function copyToClipboard(text, msg = 'Copied!') {
      navigator.clipboard.writeText(text).then(() => {
        showToast(msg);
      }).catch(err => {
        console.error('Copy failed:', err);
      });
    }

    function switchTab(tab) {
      document.getElementById('view-onboard').classList.toggle('hidden', tab !== 'onboard');
      document.getElementById('view-directory').classList.toggle('hidden', tab !== 'directory');

      const btnOnboard = document.getElementById('tab-btn-onboard');
      const btnDirectory = document.getElementById('tab-btn-directory');

      if (tab === 'onboard') {
        btnOnboard.className = 'tab-btn w-full px-3.5 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all duration-200 bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-lg shadow-brand-500/10';
        btnDirectory.className = 'tab-btn w-full px-3.5 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all duration-200 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent';
      } else {
        btnDirectory.className = 'tab-btn w-full px-3.5 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all duration-200 bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-lg shadow-brand-500/10';
        btnOnboard.className = 'tab-btn w-full px-3.5 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all duration-200 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent';
        loadStores();
      }
    }

    async function submitOnboard() {
      const storeName = document.getElementById('input-storeName').value.trim();
      const ownerName = document.getElementById('input-ownerName').value.trim();
      const ownerEmail = document.getElementById('input-ownerEmail').value.trim().toLowerCase();
      const phone = document.getElementById('input-phone').value.trim();
      const planDays = parseInt(document.getElementById('input-plan').value, 10) || 365;
      const maxCounters = parseInt(document.getElementById('input-counters').value, 10) || 1;

      if (!storeName) return alert('Please enter the store name.');
      if (!ownerName) return alert('Please enter owner name.');
      if (!ownerEmail || !ownerEmail.includes('@')) return alert('Please enter a valid Google Account email.');

      const btn = document.getElementById('btn-submit-onboard');
      btn.disabled = true;
      btn.innerHTML = '<span>Provisioning in Cloud Database...</span>';

      try {
        const res = await fetch('/api/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeName, ownerName, ownerEmail, phone, planDays, maxCounters }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to onboard store');

        document.getElementById('onboard-placeholder-card').classList.add('hidden');
        document.getElementById('onboard-result-card').classList.remove('hidden');

        document.getElementById('res-licenseKey').innerText = data.licenseKey;
        document.getElementById('res-validUntil').innerText = new Date(data.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        document.getElementById('res-whatsapp').value = data.whatsappMessage;

        if (data.cloudSynced) {
          showToast('Store whitelisted and synced to Firebase Cloud!');
        } else {
          showToast('Saved locally. Firebase Cloud sync failed: ' + (data.cloudError || 'Check Firebase Console'), 'error');
        }
        loadStores();
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg><span>Generate License & Whitelist Store</span>';
      }
    }

    async function syncAllToCloud() {
      const btn = document.getElementById('btn-sync-cloud');
      btn.disabled = true;
      btn.innerHTML = '<span>Syncing...</span>';
      try {
        const res = await fetch('/api/sync-cloud', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('All local stores & licenses synced to Firebase Cloud successfully!');
        } else {
          const firstErr = (data.errors && data.errors[0]) || 'Check Firebase Console';
          showToast('Firebase sync failed: ' + firstErr, 'error');
        }
      } catch (err) {
        showToast('Sync failed: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg><span>Sync to Firebase</span>';
        loadStores();
      }
    }

    async function loadStores() {
      try {
        const res = await fetch('/api/licenses');
        const data = await res.json();
        allLicenses = data.licenses || [];
        document.getElementById('stores-count-badge').innerText = allLicenses.length;
        renderStores(allLicenses);
      } catch (err) {
        console.error('Failed to load licenses:', err);
      }
    }

    function renderStores(list) {
      const tbody = document.getElementById('stores-table-body');
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-12 text-center text-slate-500 font-bold">No stores found. Onboard your first store!</td></tr>';
        return;
      }

      const now = Date.now();
      tbody.innerHTML = list.map(lic => {
        const expMs = new Date(lic.validUntil).getTime();
        const daysLeft = Math.ceil((expMs - now) / (1000 * 60 * 60 * 24));
        const isSuspended = lic.status === 'suspended';
        const isExpired = daysLeft <= 0;

        let statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>';
        if (isSuspended) {
          statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">SUSPENDED</span>';
        } else if (isExpired) {
          statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">EXPIRED</span>';
        }

        const daysBadge = daysLeft > 0 
          ? \`<span class="font-bold text-slate-200">\${daysLeft}d left</span>\` 
          : '<span class="font-bold text-rose-400">Lapsed</span>';

        return \`
          <tr class="hover:bg-slate-800/40 transition-colors">
            <td class="py-3 px-4">
              <div class="font-bold text-slate-200 text-sm">\${lic.storeName || 'Unnamed Store'}</div>
              <div class="text-[11px] text-slate-400">\${lic.ownerName || ''} \${lic.phone ? '&bull; ' + lic.phone : ''}</div>
            </td>
            <td class="py-3 px-4 font-mono text-slate-300">
              \${lic.ownerEmail || '-'}
            </td>
            <td class="py-3 px-4 font-mono font-bold text-brand-400">
              <button onclick="copyToClipboard('\${lic.licenseKey}', 'Key Copied!')" class="hover:underline" title="Click to copy">
                \${lic.licenseKey}
              </button>
            </td>
            <td class="py-3 px-4">
              \${daysBadge}
            </td>
            <td class="py-3 px-4">
              \${statusBadge}
            </td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="toggleStoreStatus('\${lic.licenseKey}', '\${isSuspended ? 'active' : 'suspended'}')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold \${isSuspended ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'} transition-colors">
                  \${isSuspended ? 'Activate' : 'Suspend'}
                </button>
                <button onclick="renewStorePrompt('\${lic.licenseKey}', '\${lic.storeName}')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors">
                  +1 Year
                </button>
              </div>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function filterStores() {
      const q = document.getElementById('input-search').value.toLowerCase();
      if (!q) {
        renderStores(allLicenses);
        return;
      }
      const filtered = allLicenses.filter(lic => 
        (lic.storeName || '').toLowerCase().includes(q) ||
        (lic.ownerName || '').toLowerCase().includes(q) ||
        (lic.ownerEmail || '').toLowerCase().includes(q) ||
        (lic.licenseKey || '').toLowerCase().includes(q)
      );
      renderStores(filtered);
    }

    async function toggleStoreStatus(licenseKey, newStatus) {
      if (!confirm(\`Are you sure you want to mark license \${licenseKey} as \${newStatus.toUpperCase()}?\`)) return;
      try {
        const res = await fetch('/api/toggle-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey, status: newStatus }),
        });
        if (!res.ok) throw new Error('Status update failed');
        showToast(\`License \${newStatus.toUpperCase()} successfully!\`);
        loadStores();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    async function renewStorePrompt(licenseKey, storeName) {
      if (!confirm(\`Renew \${storeName} (\${licenseKey}) for +1 Year (365 Days)?\`)) return;
      try {
        const res = await fetch('/api/renew', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey, addDays: 365 }),
        });
        if (!res.ok) throw new Error('Renewal failed');
        showToast(\`\${storeName} renewed for +1 Year!\`);
        loadStores();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    // Auto-load on launch
    loadStores();
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve Main GUI Page
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_CONTENT);
    return;
  }

  // API: Get All Licenses
  if (url.pathname === '/api/licenses' && req.method === 'GET') {
    try {
      const licenses = await getAllLicenses();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ licenses }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Helper for reading JSON body
  const readJsonBody = () => new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (e) { reject(e); }
    });
  });

  // API: Onboard Store
  if (url.pathname === '/api/onboard' && req.method === 'POST') {
    try {
      const body = await readJsonBody();
      const { storeName, ownerName, ownerEmail, phone, planDays = 365, maxCounters = 1 } = body;

      if (!storeName || !ownerEmail) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Store name and owner email are required.' }));
        return;
      }

      const validUntilDate = new Date(Date.now() + planDays * 24 * 60 * 60 * 1000);
      const validUntilISO = validUntilDate.toISOString();
      const licenseKey = generateLicenseKey();

      // 1. Prepare records
      const whitelistRecord = {
        email: ownerEmail,
        storeName,
        ownerName,
        status: 'approved',
        licenseKey,
        createdAt: new Date().toISOString(),
      };

      const licenseRecord = {
        licenseKey,
        ownerEmail,
        storeName,
        ownerName,
        phone: phone || '',
        plan: planDays >= 365 ? 'annual' : 'trial',
        status: 'active',
        validUntil: validUntilISO,
        maxCounters,
        createdAt: new Date().toISOString(),
      };

      // 2. Persist in local DB
      const db = readLocalDb();
      db.licenses = db.licenses || {};
      db.whitelist = db.whitelist || {};
      db.licenses[licenseKey] = licenseRecord;
      db.whitelist[ownerEmail] = whitelistRecord;
      writeLocalDb(db);

      // 3. Sync to Firestore (non-blocking for local stability)
      let cloudSynced = false;
      let cloudError = null;
      try {
        await writeFirestoreDoc('whitelist', ownerEmail, whitelistRecord);
        await writeFirestoreDoc('licenses', licenseKey, licenseRecord);
        cloudSynced = true;
      } catch (cloudErr) {
        cloudError = cloudErr.message;
        console.warn('[Firestore Cloud Sync Notice]:', cloudErr.message);
      }

      const expiryFormatted = validUntilDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const waMsg = `🎉 *Welcome to ChillBill Retail POS!*

Namaste ${ownerName}! Your billing software for *${storeName}* is officially activated.

🔑 *License Key:* ${licenseKey}
📅 *Validity:* Until ${expiryFormatted}
🖥️ *Counters Allowed:* ${maxCounters} Counter(s)
📧 *Registered Login:* ${ownerEmail}

📲 *Get Started in 1 Click:*
1. Open this link on your POS computer / tablet:
👉 ${APP_URL}
2. Click *"Sign in with Google"* using your registered email: ${ownerEmail}
3. Click the *"Install App"* icon in the browser address bar for a seamless desktop POS window.

For support or setup assistance, reach out to our team at any time. Happy Billing! 🚀`;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        licenseKey,
        validUntil: validUntilISO,
        whatsappMessage: waMsg,
        cloudSynced,
        cloudError,
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Sync All Local to Cloud Firestore
  if (url.pathname === '/api/sync-cloud' && req.method === 'POST') {
    try {
      const db = readLocalDb();
      let syncedCount = 0;
      const errors = [];

      for (const [email, record] of Object.entries(db.whitelist || {})) {
        try {
          await writeFirestoreDoc('whitelist', email, record);
          syncedCount++;
        } catch (e) {
          errors.push(`Whitelist (${email}): ${e.message}`);
        }
      }

      for (const [key, record] of Object.entries(db.licenses || {})) {
        try {
          await writeFirestoreDoc('licenses', key, record);
          syncedCount++;
        } catch (e) {
          errors.push(`License (${key}): ${e.message}`);
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: errors.length === 0,
        syncedCount,
        errors,
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Toggle Status
  if (url.pathname === '/api/toggle-status' && req.method === 'POST') {
    try {
      const { licenseKey, status } = await readJsonBody();
      const lic = await getLicenseByKey(licenseKey);
      if (!lic) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'License not found' }));
        return;
      }

      lic.status = status === 'suspended' ? 'suspended' : 'active';
      const db = readLocalDb();
      db.licenses = db.licenses || {};
      db.licenses[licenseKey] = lic;
      writeLocalDb(db);

      try {
        await writeFirestoreDoc('licenses', licenseKey, lic);
      } catch (cloudErr) {
        console.warn('[Firestore Sync Notice]:', cloudErr.message);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Renew
  if (url.pathname === '/api/renew' && req.method === 'POST') {
    try {
      const { licenseKey, addDays = 365 } = await readJsonBody();
      const lic = await getLicenseByKey(licenseKey);
      if (!lic) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'License not found' }));
        return;
      }

      const currentExpiry = new Date(lic.validUntil).getTime();
      const baseTime = Math.max(Date.now(), currentExpiry);
      const newExpiry = new Date(baseTime + addDays * 24 * 60 * 60 * 1000).toISOString();

      lic.status = 'active';
      lic.validUntil = newExpiry;
      const db = readLocalDb();
      db.licenses = db.licenses || {};
      db.licenses[licenseKey] = lic;
      writeLocalDb(db);

      try {
        await writeFirestoreDoc('licenses', licenseKey, lic);
      } catch (cloudErr) {
        console.warn('[Firestore Sync Notice]:', cloudErr.message);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, validUntil: newExpiry }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`ChillBill License Manager GUI server running at http://localhost:${PORT}`);
});
