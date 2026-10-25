// Diagnostic script to check Firebase Auth and Firestore status
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'chill-bill-ee46b';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDRwBSVCeS4sk_JSnL7TlOm-5XShKanbxU';

console.log('='.repeat(60));
console.log('🔥 ChillBill Firebase Diagnostics');
console.log(`Project ID: ${FIREBASE_PROJECT_ID}`);
console.log('='.repeat(60));

async function runDiagnostics() {
  let hasIssues = false;

  // 1. Check Identity Toolkit & Authorized Domains
  console.log('\n[1/3] Checking Firebase Authentication...');
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${API_KEY}`);
    const data = await res.json();
    if (data.error) {
      console.log('❌ Auth API Error:', data.error.message);
      hasIssues = true;
    } else {
      console.log('✅ Firebase Auth is active.');
      console.log('   Authorized Domains:', data.authorizedDomains?.join(', '));
    }
  } catch (err) {
    console.log('❌ Failed to reach Auth API:', err.message);
    hasIssues = true;
  }

  // 2. Check Google Sign-in Provider
  console.log('\n[2/3] Checking Google Sign-in Provider...');
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: 'google.com',
        continueUri: 'https://chill-bill-pos.vercel.app'
      })
    });
    const data = await res.json();
    if (data.error) {
      if (data.error.message.includes('OPERATION_NOT_ALLOWED')) {
        console.log('❌ GOOGLE SIGN-IN IS DISABLED in Firebase Console!');
        console.log('   👉 Fix: Open Firebase Console -> Authentication -> Sign-in method -> Click Google -> Enable -> Save');
        console.log(`   👉 Link: https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`);
      } else {
        console.log('❌ Google Provider Error:', data.error.message);
      }
      hasIssues = true;
    } else {
      console.log('✅ Google Sign-In Provider is ENABLED and working!');
    }
  } catch (err) {
    console.log('❌ Could not verify Google Provider:', err.message);
    hasIssues = true;
  }

  // 3. Check Cloud Firestore Database
  console.log('\n[3/3] Checking Cloud Firestore Database...');
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/whitelist`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      if (data.error.code === 404 && data.error.message.includes('database (default) does not exist')) {
        console.log('❌ CLOUD FIRESTORE DATABASE DOES NOT EXIST!');
        console.log('   👉 Fix: Open Firebase Console -> Firestore Database -> Click "Create database" -> Start in test mode -> Save');
        console.log(`   👉 Link: https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore`);
      } else if (data.error.code === 403) {
        console.log('⚠️ Firestore Database exists, but Security Rules blocked unauthenticated reading.');
        console.log('   👉 Set rules to test mode or allow read during setup.');
      } else {
        console.log('❌ Firestore Error:', data.error.message);
      }
      hasIssues = true;
    } else {
      console.log('✅ Cloud Firestore Database exists!');
      const count = data.documents?.length || 0;
      console.log(`   Whitelisted store documents in cloud: ${count}`);
    }
  } catch (err) {
    console.log('❌ Could not connect to Firestore:', err.message);
    hasIssues = true;
  }

  console.log('\n' + '='.repeat(60));
  if (hasIssues) {
    console.log('🚨 ACTION REQUIRED: Complete the 2 steps above in your Firebase Console.');
  } else {
    console.log('🎉 ALL FIREBASE SERVICES READY TO GO!');
  }
  console.log('='.repeat(60) + '\n');
}

runDiagnostics();
