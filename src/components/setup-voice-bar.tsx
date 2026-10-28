"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX, RotateCcw, X, Sparkles, Headphones } from "lucide-react";
import {
  VoiceLanguage,
  VoiceInstructionKey,
  SETUP_VOICE_INSTRUCTIONS,
  selectBestVoice,
  playVoiceCueChime,
} from "@/lib/setup-voice-assistant";
import { cn } from "@/lib/utils";

interface SetupVoiceAssistantState {
  language: VoiceLanguage;
  setLanguage: (l: VoiceLanguage) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
  isSpeaking: boolean;
  currentCaption: string | null;
  activeKey: VoiceInstructionKey | null;
  speak: (key: VoiceInstructionKey, forceUnmute?: boolean) => void;
  stop: () => void;
  replay: () => void;
}

export function useSetupVoiceAssistant(defaultLang: VoiceLanguage = "hinglish"): SetupVoiceAssistantState {
  const [language, setLanguageState] = useState<VoiceLanguage>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chillbill_voice_lang") as VoiceLanguage;
      if (saved && ["hinglish", "hi", "en"].includes(saved)) return saved;
    }
    return defaultLang;
  });

  const [isMuted, setIsMutedState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chillbill_voice_muted") === "true";
    }
    return false;
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentCaption, setCurrentCaption] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<VoiceInstructionKey | null>(null);
  const lastSpokenKeyRef = useRef<VoiceInstructionKey | null>(null);

  const setLanguage = useCallback((lang: VoiceLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("chillbill_voice_lang", lang);
    }
    // If something was playing, replay in the new language
    if (lastSpokenKeyRef.current) {
      setTimeout(() => {
        speakInternal(lastSpokenKeyRef.current!, lang, false);
      }, 100);
    }
  }, []);

  const setIsMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
    if (typeof window !== "undefined") {
      localStorage.setItem("chillbill_voice_muted", String(muted));
    }
    if (muted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakInternal = useCallback(
    (key: VoiceInstructionKey, lang: VoiceLanguage, force = false) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      const instruction = SETUP_VOICE_INSTRUCTIONS[key];
      if (!instruction) return;

      const text = instruction[lang] || instruction.hinglish;
      lastSpokenKeyRef.current = key;
      setActiveKey(key);
      setCurrentCaption(text);

      if (isMuted && !force) {
        // When muted, we show the caption subtitle for accessibility, but don't play audio
        return;
      }

      window.speechSynthesis.cancel();
      playVoiceCueChime();

      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95; // Slightly slower for clarity
          utterance.pitch = 1.05;

          const voices = window.speechSynthesis.getVoices();
          const bestVoice = selectBestVoice(lang, voices);
          if (bestVoice) {
            utterance.voice = bestVoice;
            utterance.lang = bestVoice.lang;
          } else {
            utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
          }

          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);

          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.error("Speech synthesis error:", e);
          setIsSpeaking(false);
        }
      }, 120);
    },
    [isMuted]
  );

  const speak = useCallback(
    (key: VoiceInstructionKey, forceUnmute = false) => {
      if (forceUnmute && isMuted) {
        setIsMuted(false);
      }
      speakInternal(key, language, forceUnmute);
    },
    [language, isMuted, speakInternal, setIsMuted]
  );

  const replay = useCallback(() => {
    if (lastSpokenKeyRef.current) {
      speakInternal(lastSpokenKeyRef.current, language, true);
    }
  }, [language, speakInternal]);

  // Preload voices on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  return {
    language,
    setLanguage,
    isMuted,
    setIsMuted,
    isSpeaking,
    currentCaption,
    activeKey,
    speak,
    stop,
    replay,
  };
}

/**
 * Facebook/Meta-Style Voice Assistant Bar Component
 */
export function SetupVoiceBar({
  assistant,
  className,
}: {
  assistant: SetupVoiceAssistantState;
  className?: string;
}) {
  const { language, setLanguage, isMuted, setIsMuted, isSpeaking, currentCaption, replay, stop } = assistant;

  return (
    <div className={cn("w-full transition-all duration-300", className)}>
      <div className="rounded-xl p-2.5 sm:p-3 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-blue-500/10 border border-orange-500/20 backdrop-blur-md shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Speaker Badge & Soundwave Animation */}
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm",
                isSpeaking
                  ? "bg-orange-500 text-white shadow-orange-500/30 scale-105"
                  : isMuted
                  ? "bg-muted text-muted-foreground"
                  : "bg-orange-500/20 text-orange-600 dark:text-orange-400"
              )}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1">
                  <Headphones size={13} className="text-orange-500" />
                  Voice Sahayak
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  FB Style Audio Guide
                </span>
              </div>

              {/* Animated Sound Wave Equalizer */}
              <div className="flex items-center gap-0.5 h-3 mt-0.5">
                {[40, 90, 60, 100, 50, 80].map((height, i) => (
                  <span
                    key={i}
                    className={cn(
                      "w-0.5 rounded-full bg-orange-500 transition-all duration-150",
                      isSpeaking ? "animate-pulse" : "opacity-30"
                    )}
                    style={{
                      height: isSpeaking ? `${height}%` : "30%",
                      animationDelay: `${i * 90}ms`,
                    }}
                  />
                ))}
                <span className="text-[10px] ml-1 text-muted-foreground font-medium">
                  {isSpeaking ? "Speaking..." : isMuted ? "Audio Muted" : "Active & Ready"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Language Switcher & Mute Controls */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Language Selection Segmented Control */}
            <div className="inline-flex items-center bg-background/80 dark:bg-card/80 p-0.5 rounded-lg border border-border shadow-2xs">
              <button
                type="button"
                onClick={() => setLanguage("hinglish")}
                className={cn(
                  "px-2 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                  language === "hinglish"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Conversational Hindi + English"
              >
                Hinglish
              </button>
              <button
                type="button"
                onClick={() => setLanguage("hi")}
                className={cn(
                  "px-2 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                  language === "hi"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Pure Hindi Voice"
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={cn(
                  "px-2 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                  language === "en"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="English Voice"
              >
                English
              </button>
            </div>

            {/* Mute / Unmute Button */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs",
                isMuted
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              )}
              title={isMuted ? "Click to unmute voice guidance" : "Click to mute voice guidance"}
            >
              {isMuted ? (
                <>
                  <VolumeX size={13} />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 size={13} />
                  <span>Mute</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Subtitle / Caption Pill */}
        {currentCaption && (
          <div className="mt-2.5 pt-2 border-t border-orange-500/15 flex items-start justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-start gap-1.5 min-w-0">
              <span className="text-orange-500 text-xs font-black shrink-0 mt-0.5">💬</span>
              <p className="text-xs text-foreground/90 font-medium leading-relaxed italic">
                &ldquo;{currentCaption}&rdquo;
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={replay}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded transition-colors cursor-pointer"
                title="Re-listen to instruction"
              >
                <RotateCcw size={11} />
                Replay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Interactive mini-speaker button placed alongside field labels
 */
export function VoiceFieldButton({
  onClick,
  label = "Listen",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 bg-orange-500/10 hover:bg-orange-500/20 rounded-md border border-orange-500/20 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95",
        className
      )}
      title="Click to hear spoken voice instruction"
    >
      <Volume2 size={11} className="shrink-0 animate-pulse" />
      <span>{label}</span>
    </button>
  );
}
