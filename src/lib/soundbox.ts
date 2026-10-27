/**
 * In-Software Soundbox Engine
 * Provides cash register audio chime and natural voice announcements
 * in English and Hindi using native Web Audio & Web Speech APIs.
 */

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
