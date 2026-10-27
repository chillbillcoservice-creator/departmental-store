"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  TUTORIAL_FEATURES,
  TutorialLanguage,
  TutorialVoicePersona,
  VOICE_PERSONAS,
  resolveVoicePersona,
  getSavedVoicePersona,
  setSavedVoicePersona,
  playFeatureVoice,
  stopFeatureVoice,
  subscribeToVoiceState,
} from '@/lib/tutorial-voice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  RotateCcw,
  Sparkles,
  Headphones,
  X,
  ChevronDown,
  Mic,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartAudioTourProps {
  isEnabled: boolean;
  onDisable: () => void;
  activeTab: string;
  language: TutorialLanguage;
  onLanguageChange: (lang: TutorialLanguage) => void;
  voicePersona?: TutorialVoicePersona;
  onVoicePersonaChange?: (persona: TutorialVoicePersona) => void;
  onOpenFullTutorial?: () => void;
}

// Map main-layout activeTab to primary tutorial feature ID
const TAB_FEATURE_MAP: Record<string, string> = {
  payments: 'billing',
  inventory: 'delivery_grn',
  expenses: 'expenses',
  customers: 'customer_khata',
  vendors: 'vendor_po',
  staff: 'staff_mgmt',
  admin: 'gstr1_tax',
};

export function SmartAudioTour({
  isEnabled,
  onDisable,
  activeTab,
  language,
  onLanguageChange,
  voicePersona: externalPersona,
  onVoicePersonaChange,
  onOpenFullTutorial,
}: SmartAudioTourProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [internalPersona, setInternalPersona] = useState<TutorialVoicePersona>(
    externalPersona || getSavedVoicePersona()
  );

  const activePersona = externalPersona || internalPersona;
  const previousTabRef = useRef<string>(activeTab);

  // Sync internal persona if external changes
  useEffect(() => {
    if (externalPersona) {
      setInternalPersona(externalPersona);
    }
  }, [externalPersona]);

  const handleSelectPersona = (p: TutorialVoicePersona) => {
    setInternalPersona(p);
    setSavedVoicePersona(p);
    onVoicePersonaChange?.(p);
    // If playing, restart with new voice in active language
    if (isPlaying && currentPlayingId) {
      playFeatureVoice(currentPlayingId, language, p).catch(() => {});
    }
  };

  const handleSelectLanguage = (newLang: TutorialLanguage) => {
    onLanguageChange(newLang);
    // If playing, restart with active voice in new language
    if (isPlaying && currentPlayingId) {
      playFeatureVoice(currentPlayingId, newLang, activePersona).catch(() => {});
    }
  };

  // Subscribe to speech controller state
  useEffect(() => {
    const unsubscribe = subscribeToVoiceState(({ featureId, isPlaying }) => {
      setIsPlaying(isPlaying);
      setCurrentPlayingId(featureId);
    });
    return () => unsubscribe();
  }, []);

  // When activeTab changes in main-layout, auto-announce if tour is active & not muted
  useEffect(() => {
    if (!isEnabled || isMuted) return;

    const featureId = TAB_FEATURE_MAP[activeTab] || 'billing';
    const hasChanged = previousTabRef.current !== activeTab;
    previousTabRef.current = activeTab;

    if (hasChanged) {
      const timer = setTimeout(() => {
        playFeatureVoice(featureId, language, activePersona).catch(() => {});
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activeTab, isEnabled, isMuted, language, activePersona]);

  // Clean up when unmounting or disabling
  useEffect(() => {
    if (!isEnabled) {
      stopFeatureVoice();
    }
  }, [isEnabled]);

  if (!isEnabled) return null;

  const currentFeatureId = TAB_FEATURE_MAP[activeTab] || 'billing';
  const currentFeature = TUTORIAL_FEATURES.find((f) => f.id === currentFeatureId);
  const captionText = currentFeature?.scripts[language] || currentFeature?.scripts.en || '';

  const resolvedSpeakerKey = resolveVoicePersona(language, activePersona);
  const resolvedSpeaker = VOICE_PERSONAS[resolvedSpeakerKey];

  const handlePlayCurrent = () => {
    if (isPlaying) {
      stopFeatureVoice();
    } else {
      setIsMuted(false);
      playFeatureVoice(currentFeatureId, language, activePersona).catch(() => {});
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      playFeatureVoice(currentFeatureId, language, activePersona).catch(() => {});
    } else {
      setIsMuted(true);
      stopFeatureVoice();
    }
  };

  return (
    <div
      className={cn(
        "fixed z-50 transition-all duration-300 ease-in-out font-sans select-none",
        isMinimized
          ? "bottom-4 right-4"
          : "bottom-4 right-4 sm:bottom-6 sm:right-6 max-w-sm sm:max-w-md w-[calc(100vw-2rem)]"
      )}
    >
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground rounded-full shadow-2xl hover:scale-105 transition-all border border-primary/20"
          title="Open Audio Tour Assistant"
        >
          <Sparkles className="h-4 w-4 animate-spin text-amber-300" style={{ animationDuration: '4s' }} />
          <span className="text-xs font-bold">Audio Guide ({resolvedSpeaker.name})</span>
          {isPlaying && (
            <span className="flex items-center gap-0.5 ml-1">
              <span className="w-1 h-3 bg-white rounded-full animate-pulse" />
              <span className="w-1 h-4 bg-white rounded-full animate-pulse delay-75" />
              <span className="w-1 h-2 bg-white rounded-full animate-pulse delay-150" />
            </span>
          )}
        </button>
      ) : (
        <div className="bg-card/95 backdrop-blur-md border-2 border-primary/30 rounded-2xl shadow-2xl overflow-hidden p-3.5 space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b pb-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Interactive Tour</h4>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase font-bold text-primary border-primary/40">
                    Live
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                    <span>{resolvedSpeaker.flag}</span>
                    <span>{resolvedSpeaker.name}</span>
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  {currentFeature?.title || 'Screen Assistant'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setIsMinimized(true)}
                title="Minimize Guide"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                onClick={onDisable}
                title="Turn Off Tutorial Mode"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Subtitle Caption Area */}
          <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50 text-xs text-foreground/90 leading-relaxed max-h-24 overflow-y-auto">
            {isPlaying ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-primary font-bold text-[10px] uppercase tracking-wide">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-0.5">
                      <span className="w-1 h-2.5 bg-primary rounded-full animate-pulse" />
                      <span className="w-1 h-3.5 bg-primary rounded-full animate-pulse delay-75" />
                      <span className="w-1 h-2 bg-primary rounded-full animate-pulse delay-150" />
                    </span>
                    <span>Speaking Now</span>
                  </div>
                  <span className="text-muted-foreground text-[10px] normal-case font-medium">
                    {resolvedSpeaker.name} ({resolvedSpeaker.tag})
                  </span>
                </div>
                <p className="italic text-foreground">{captionText}</p>
              </div>
            ) : isMuted ? (
              <p className="text-muted-foreground italic flex items-center gap-1.5">
                <VolumeX className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                Guide is muted. Click listen or unmute to hear screen instructions.
              </p>
            ) : (
              <p className="text-muted-foreground italic">
                Navigate between tabs to hear screen guides, or click Listen below.
              </p>
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5 flex-wrap">
            {/* Play / Stop & Replay */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={isPlaying ? "destructive" : "default"}
                onClick={handlePlayCurrent}
                className="h-8 px-2.5 rounded-xl font-bold text-xs gap-1.5 shadow-sm"
              >
                {isPlaying ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Listen</span>
                  </>
                )}
              </Button>

              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-xl"
                onClick={() => {
                  setIsMuted(false);
                  playFeatureVoice(currentFeatureId, language, activePersona).catch(() => {});
                }}
                title="Replay from start"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>

              <Button
                size="icon"
                variant={isMuted ? "secondary" : "ghost"}
                className={cn("h-8 w-8 rounded-xl", isMuted && "text-destructive")}
                onClick={handleToggleMute}
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>

            {/* Voice Persona Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 rounded-xl text-[11px] font-bold gap-1 border-primary/30"
                  title="Choose Narrator Voice"
                >
                  <Mic className="h-3 w-3 text-primary" />
                  <span>{resolvedSpeaker.name}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs font-bold">Tutorial Narrator</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleSelectPersona('puck')}
                  className="flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold">🇮🇳 Puck (Warm Male)</div>
                    <div className="text-[10px] text-muted-foreground">DeepMind Chirp3 &bull; Hindi, Hinglish & English</div>
                  </div>
                  {activePersona === 'puck' && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSelectPersona('algieba')}
                  className="flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold">🇮🇳 Algieba (Crisp Male)</div>
                    <div className="text-[10px] text-muted-foreground">DeepMind Chirp3 &bull; Indian English</div>
                  </div>
                  {activePersona === 'algieba' && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSelectPersona('studio_o')}
                  className="flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold">🌐 Studio-O (Female)</div>
                    <div className="text-[10px] text-muted-foreground">Google Studio &bull; Global Broadcast</div>
                  </div>
                  {activePersona === 'studio_o' && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Language Switcher Chips */}
            <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border">
              <button
                onClick={() => handleSelectLanguage('hi')}
                className={cn(
                  "px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-all",
                  language === 'hi' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                हिन्दी
              </button>
              <button
                onClick={() => handleSelectLanguage('hinglish')}
                className={cn(
                  "px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-all",
                  language === 'hinglish' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Hinglish
              </button>
              <button
                onClick={() => handleSelectLanguage('en')}
                className={cn(
                  "px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-all",
                  language === 'en' ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                EN
              </button>
            </div>

            {/* Full Tutorial Link */}
            {onOpenFullTutorial && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-primary"
                onClick={onOpenFullTutorial}
                title="Open All Features Playlist in Settings"
              >
                <Headphones className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
