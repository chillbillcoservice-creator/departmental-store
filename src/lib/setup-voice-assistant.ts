/**
 * Facebook-Style Step-by-Step Voice Onboarding Assistant Engine
 * Provides natural spoken instructions in Hinglish, Hindi, and English
 * for desktop store account creation and setup wizard.
 */

export type VoiceLanguage = 'hinglish' | 'hi' | 'en';

export type VoiceInstructionKey =
  | 'step1_intro'
  | 'store_name'
  | 'store_contact'
  | 'store_tagline'
  | 'store_address'
  | 'step2_intro'
  | 'owner_name'
  | 'owner_mobile'
  | 'owner_pin'
  | 'owner_partner'
  | 'step3_intro'
  | 'staff_name'
  | 'staff_role'
  | 'staff_pin'
  | 'step4_intro'
  | 'vendor_name'
  | 'vendor_contact'
  | 'setup_ready';

export interface VoiceInstruction {
  title: string;
  hinglish: string;
  hi: string;
  en: string;
}

export const SETUP_VOICE_INSTRUCTIONS: Record<VoiceInstructionKey, VoiceInstruction> = {
  step1_intro: {
    title: 'Store Setup Intro',
    hinglish: 'Namaste! Chaliye aapki dukaan ka setup shuru karte hain. Sabse pehle apni dukaan ki details bharein.',
    hi: 'नमस्ते! चलिए आपकी दुकान का सेटअप शुरू करते हैं। सबसे पहले अपनी दुकान की जानकारी भरें।',
    en: "Welcome! Let's set up your store. First, enter your business and store details.",
  },
  store_name: {
    title: 'Store Name',
    hinglish: 'Yahan apni dukaan ya store ka naam likhein, jaise Sharma General Store.',
    hi: 'यहाँ अपनी दुकान या स्टोर का नाम लिखें, जैसे शर्मा जनरल स्टोर।',
    en: 'Write your store or business name here.',
  },
  store_contact: {
    title: 'Store Contact Number',
    hinglish: 'Yahan dukaan ka 10-digit mobile number dalein jisse customer aapko call kar sakein.',
    hi: 'यहाँ दुकान का 10 अंकों का मोबाइल नंबर डालें जिससे ग्राहक संपर्क कर सकें।',
    en: 'Enter your 10-digit store contact mobile number.',
  },
  store_tagline: {
    title: 'Store Tagline',
    hinglish: 'Dukaan ka koi slogan ya tagline ho toh yahan dalein, jaise Super Quality, Best Price.',
    hi: 'दुकान का कोई स्लोगन या टैगलाइन हो तो यहाँ दर्ज करें।',
    en: 'Enter a store tagline or slogan if you have one.',
  },
  store_address: {
    title: 'Store Address & Location',
    hinglish: 'Yahan apni dukaan ka poora pata, shahar aur pin code dalein.',
    hi: 'यहाँ अपनी दुकान का पूरा पता, शहर और पिन कोड लिखें।',
    en: 'Enter your store street address, city, and pincode.',
  },
  step2_intro: {
    title: 'Owner Security Intro',
    hinglish: 'Bahut achhe! Ab dukaan ke maalik ya owner ka naam aur ek 4-digit secret PIN set karein.',
    hi: 'बहुत अच्छे! अब दुकान के मालिक का नाम और एक 4 अंकों का गुप्त पिन सेट करें।',
    en: "Great! Now enter the store owner's details and set your 4-digit secret PIN.",
  },
  owner_name: {
    title: 'Owner Full Name',
    hinglish: 'Yahan dukaan ke maalik ya owner ka poora naam dalein.',
    hi: 'यहाँ दुकान के मालिक या ओनर का पूरा नाम लिखें।',
    en: "Enter the store owner's full name here.",
  },
  owner_mobile: {
    title: 'Owner Mobile Number',
    hinglish: 'Yahan owner ka personal WhatsApp ya mobile number dalein.',
    hi: 'यहाँ मालिक का पर्सनल व्हाट्सएप या मोबाइल नंबर दर्ज करें।',
    en: "Enter the store owner's personal mobile or WhatsApp number.",
  },
  owner_pin: {
    title: '4-Digit Secret Passcode PIN',
    hinglish: 'Dukaan kholne ke liye 4 anko ka secret PIN banayein. Yeh PIN kisi ko na batayein.',
    hi: 'दुकान खोलने के लिए 4 अंकों का गुप्त पिन सेट करें। यह पिन किसी को न बताएं।',
    en: 'Create a 4-digit secret PIN to open and secure your store. Keep this confidential.',
  },
  owner_partner: {
    title: 'Additional Partners',
    hinglish: 'Agar dukaan me koi business partner hai, toh Add Partner dabakar unka naam aur PIN bhi jod sakte hain.',
    hi: 'यदि दुकान में कोई पार्टनर है, तो ऐड पार्टनर दबाकर उनका विवरण और पिन भी जोड़ें।',
    en: 'If you have business partners, click Add Partner to set up their profile and PIN.',
  },
  step3_intro: {
    title: 'Staff & Team Intro',
    hinglish: 'Yahan apne staff ya helpers ko add karein aur unke liye alag 4-digit PIN set karein.',
    hi: 'यहाँ अपने स्टाफ सदस्यों को जोड़ें और उनके लिए अलग 4 अंकों का पिन सेट करें।',
    en: 'Add your staff members here and assign their roles and individual 4-digit PINs.',
  },
  staff_name: {
    title: 'Staff Member Name',
    hinglish: 'Staff member ka naam dalein, jaise Ramesh ya Suresh.',
    hi: 'स्टाफ सदस्य का नाम यहाँ दर्ज करें।',
    en: "Enter the staff member's full name.",
  },
  staff_role: {
    title: 'Staff Role & Permissions',
    hinglish: 'Inka role select karein jaise Cashier ya Manager, aur kaunse tabs dikhane hain wo chunen.',
    hi: 'इनका रोल चुनें जैसे कैशियर या मैनेजर, और तय करें कि वे कौनसे टैब देख सकते हैं।',
    en: 'Select their role like Cashier or Manager, and choose their allowed dashboard tabs.',
  },
  staff_pin: {
    title: 'Staff 4-Digit PIN',
    hinglish: 'Har staff member ke liye ek alag 4-digit PIN banayein taaki unka alag hisaab rahe.',
    hi: 'प्रत्येक स्टाफ सदस्य के लिए एक अलग 4 अंकों का पिन बनाएं।',
    en: 'Set a unique 4-digit PIN for this staff member to log in separately.',
  },
  step4_intro: {
    title: 'Vendors Intro',
    hinglish: 'Aakhiri step! Jahan se aap maal ya samaan khareedte hain, un suppliers aur vendors ko yahan jodein.',
    hi: 'अंतिम चरण! जहाँ से आप थोक सामान खरीदते हैं, उन सप्लायर्स को यहाँ जोड़ें।',
    en: 'Final step! Add the wholesale vendors and suppliers you purchase inventory from.',
  },
  vendor_name: {
    title: 'Vendor Company Name',
    hinglish: 'Vendor ya supplier company ka naam dalein jahan se maal aata hai.',
    hi: 'सप्लायर या वेंडर कंपनी का नाम यहाँ लिखें।',
    en: 'Enter the vendor or wholesale supplier company name.',
  },
  vendor_contact: {
    title: 'Vendor Mobile Number',
    hinglish: 'Supplier ka phone number dalein taaki purchase order seedha bheja ja sake.',
    hi: 'सप्लायर का फ़ोन नंबर दर्ज करें ताकि खरीद ऑर्डर भेजा जा सके।',
    en: "Enter the supplier's contact mobile number.",
  },
  setup_ready: {
    title: 'Setup Complete',
    hinglish: 'Badhaai ho! Aapka store setup poora ho gaya. Ab Launch Store dabayein aur dukaan shuru karein.',
    hi: 'बधाई हो! आपका स्टोर सेटअप पूरा हो गया। अब लॉन्च स्टोर दबाकर दुकान शुरू करें।',
    en: 'Congratulations! Your store setup is complete. Click Launch Store to enter your billing dashboard.',
  },
};

/**
 * Plays a subtle, pleasant 2-tone chime before speech to notify user
 */
export function playVoiceCueChime(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Two pleasant upward chime tones: E5 (659.25 Hz) -> B5 (987.77 Hz)
    const tones = [
      { freq: 659.25, start: 0.0, dur: 0.09 },
      { freq: 987.77, start: 0.08, dur: 0.16 },
    ];

    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, now + tone.start);

      gain.gain.setValueAtTime(0, now + tone.start);
      gain.gain.linearRampToValueAtTime(0.12, now + tone.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + tone.start + tone.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + tone.start);
      osc.stop(now + tone.start + tone.dur);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 400);
  } catch {
    // Silent fail if AudioContext is blocked
  }
}

/**
 * Finds the most suitable voice available in the browser.
 * For Hindi and Hinglish, it prioritizes Indian English / Hindi voices (e.g. hi-IN, en-IN).
 */
export function selectBestVoice(lang: VoiceLanguage, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  if (lang === 'hi') {
    const hiVoice = voices.find((v) => v.lang.toLowerCase().startsWith('hi') || v.lang.includes('hi_IN') || v.lang.includes('hi-IN'));
    if (hiVoice) return hiVoice;
    // Fallback to Indian English voice which pronounces Indian terms well
    const enInVoice = voices.find((v) => v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in'));
    if (enInVoice) return enInVoice;
  }

  if (lang === 'hinglish') {
    // Hinglish sounds most natural on Indian English voice or Hindi voice
    const indianVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes('en-in') ||
        v.lang.toLowerCase().includes('en_in') ||
        v.lang.toLowerCase().startsWith('hi')
    );
    if (indianVoice) return indianVoice;
  }

  // English or general fallback
  const enVoice =
    voices.find((v) => v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en-gb')) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en'));

  return enVoice || voices[0] || null;
}
