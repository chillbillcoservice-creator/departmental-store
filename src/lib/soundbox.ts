/**
 * In-Software Soundbox Engine
 * Provides cash register audio chime and natural voice announcements
 * in English and Hindi using native Web Audio & Web Speech APIs.
 */

// Mobile Web Audio unlock helper
let isAudioUnlocked = false;

export function unlockAudioContext(): void {
  if (typeof window === 'undefined' || isAudioUnlocked) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const dummy = new AudioCtx();
      if (dummy.state === 'suspended') {
        dummy.resume().then(() => {
          isAudioUnlocked = true;
          dummy.close().catch(() => {});
        }).catch(() => {});
      } else {
        isAudioUnlocked = true;
        dummy.close().catch(() => {});
      }
    }
  } catch {}
}

/**
 * Authentic Mechanical Cash Register "Ka-Ching!" Sound
 * Synthesized with Web Audio API (Zero latency, works 100% offline).
 * 1. Mechanical drawer release & latch snap (Ka-)
 * 2. High brass bell strike (-CHING!)
 * 3. Metal coins sliding into the register drawer tray
 */
export function playKaChingSound(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }

      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // ── Layer 1: Mechanical Register "Ka-" (Drawer spring & latch release) ──
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.05));
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(850, now);
      filter.Q.setValueAtTime(3.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.045);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      whiteNoise.start(now);

      // Low mechanical thud
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(160, now);
      thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.05);
      thudGain.gain.setValueAtTime(0.35, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(now);
      thudOsc.stop(now + 0.05);

      // ── Layer 2: Resonant Brass Bell "-CHING!" (Dual high-pitch shimmering bells) ──
      const chingDelay = 0.055;
      const bellFreqs = [1864.66, 2349.32, 3135.96]; // A#6, D7, G7 harmonics
      bellFreqs.forEach((freq, idx) => {
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();

        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(freq, now + chingDelay);

        const initialVol = idx === 0 ? 0.35 : idx === 1 ? 0.28 : 0.16;
        bellGain.gain.setValueAtTime(0, now + chingDelay);
        bellGain.gain.linearRampToValueAtTime(initialVol, now + chingDelay + 0.004);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, now + chingDelay + 0.75);

        bellOsc.connect(bellGain);
        bellGain.connect(ctx.destination);

        bellOsc.start(now + chingDelay);
        bellOsc.stop(now + chingDelay + 0.75);
      });

      // ── Layer 3: Coins Sliding in Metal Drawer (Metallic Inharmonic Pings) ──
      const coins = [
        { freq: 4186, time: 0.10, dur: 0.18, vol: 0.20 },
        { freq: 5274, time: 0.14, dur: 0.22, vol: 0.16 },
        { freq: 4698, time: 0.19, dur: 0.20, vol: 0.14 },
        { freq: 6271, time: 0.24, dur: 0.25, vol: 0.12 },
      ];

      coins.forEach((coin) => {
        const coinOsc = ctx.createOscillator();
        const coinGain = ctx.createGain();

        coinOsc.type = 'triangle';
        coinOsc.frequency.setValueAtTime(coin.freq, now + coin.time);

        coinGain.gain.setValueAtTime(0, now + coin.time);
        coinGain.gain.linearRampToValueAtTime(coin.vol, now + coin.time + 0.003);
        coinGain.gain.exponentialRampToValueAtTime(0.0001, now + coin.time + coin.dur);

        coinOsc.connect(coinGain);
        coinGain.connect(ctx.destination);

        coinOsc.start(now + coin.time);
        coinOsc.stop(now + coin.time + coin.dur);
      });

      setTimeout(() => {
        ctx.close().catch(() => {});
        resolve();
      }, 950);
    } catch {
      resolve();
    }
  });
}

// Play a pleasant 3-tone cash register chime
export function playSoundboxChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Chord tones: D5 (587.33 Hz), F#5 (739.99 Hz), A5 (880.00 Hz), D6 (1174.66 Hz)
      const notes = [
        { freq: 587.33, start: 0.0, dur: 0.15 },
        { freq: 739.99, start: 0.1, dur: 0.18 },
        { freq: 880.00, start: 0.2, dur: 0.22 },
        { freq: 1174.66, start: 0.3, dur: 0.5 },
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        gain.gain.setValueAtTime(0, now + note.start);
        gain.gain.linearRampToValueAtTime(0.25, now + note.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.start);
        osc.stop(now + note.start + note.dur);
      });

      setTimeout(() => {
        ctx.close().catch(() => {});
        resolve();
      }, 900);
    } catch {
      resolve();
    }
  });
}

/**
 * Speaks the payment announcement aloud.
 */
export function speakPaymentAnnouncement(
  amount: number,
  language: 'en' | 'hi' = 'en'
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Cancel any prior speech

      const formattedAmount = Number(amount || 0).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
      });

      let text = `Payment of Rupees ${formattedAmount} received successfully via UPI`;
      let langCode = 'en-IN';

      if (language === 'hi') {
        text = `UPI par ${formattedAmount} rupaye prapt hue`;
        langCode = 'hi-IN';
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;

      // Select appropriate voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(
        (v) => v.lang.startsWith(langCode) || (language === 'hi' && v.lang.includes('hi'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (matchVoice) {
        utterance.voice = matchVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      // Safeguard timeout in case browser stalls speech callback
      setTimeout(() => resolve(), 3500);

      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

/**
 * Triggers the complete Soundbox experience: Chime -> Voice Announcement.
 */
export async function triggerSoundboxAlert(
  amount: number,
  options?: { enabled?: boolean; voice?: 'en' | 'hi' }
): Promise<void> {
  if (options?.enabled === false) return;

  // 1. Play Cash Chime
  await playSoundboxChime();

  // 2. Play Voice Alert
  const voiceLang = options?.voice || 'en';
  await speakPaymentAnnouncement(amount, voiceLang);
}
