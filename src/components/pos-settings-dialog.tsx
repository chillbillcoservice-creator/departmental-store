"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  QrCode,
  Store,
  Palette,
  Volume2,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Headphones,
  Sparkles,
  Play,
  Square,
  ExternalLink,
  RotateCcw,
  Receipt,
  Scale,
  Trash2,
  Users,
  Calendar,
  Banknote,
  BookOpen,
  TrendingDown,
  Truck,
  PackageCheck,
  FileSpreadsheet,
  Building2,
  Check,
  Globe,
  Clock,
  Mic,
  Printer,
  Bluetooth,
  Usb,
  Scissors,
  FileText,
  RefreshCw,
} from 'lucide-react';
import {
  getPrinterConfig,
  savePrinterConfig,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  connectSerialPrinter,
  disconnectSerialPrinter,
  printTestReceipt,
  kickCashDrawer,
  getPrinterConnectionStatus,
  isWebBluetoothSupported,
  type PrinterConfig,
} from '@/lib/thermal-printer';
import { useTheme } from 'next-themes';
import { useThemeColor } from '@/contexts/theme-color-context';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { VenueDetails } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  TUTORIAL_FEATURES,
  TutorialLanguage,
  TutorialVoicePersona,
  VOICE_PERSONAS,
  playFeatureVoice,
  playGreetingVoice,
  stopFeatureVoice,
  subscribeToVoiceState,
  isFeatureVoicePlaying,
  resolveVoicePersona,
} from '@/lib/tutorial-voice';

function renderFeatureIcon(name: string) {
  switch (name) {
    case 'Receipt': return <Receipt className="h-4 w-4" />;
    case 'Scale': return <Scale className="h-4 w-4" />;
    case 'Trash2': return <Trash2 className="h-4 w-4" />;
    case 'QrCode': return <QrCode className="h-4 w-4" />;
    case 'Volume2': return <Volume2 className="h-4 w-4" />;
    case 'Users': return <Users className="h-4 w-4" />;
    case 'Calendar': return <Calendar className="h-4 w-4" />;
    case 'Banknote':
    case 'DollarSign': return <Banknote className="h-4 w-4" />;
    case 'BookOpen': return <BookOpen className="h-4 w-4" />;
    case 'TrendingDown': return <TrendingDown className="h-4 w-4" />;
    case 'Truck': return <Truck className="h-4 w-4" />;
    case 'PackageCheck': return <PackageCheck className="h-4 w-4" />;
    case 'FileSpreadsheet': return <FileSpreadsheet className="h-4 w-4" />;
    case 'Building2': return <Building2 className="h-4 w-4" />;
    case 'Clock': return <Clock className="h-4 w-4" />;
    default: return <Sparkles className="h-4 w-4" />;
  }
}

interface PosSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  venueDetails: VenueDetails | null;
  setVenueDetails: (details: VenueDetails | null) => void;
  tutorialModeEnabled?: boolean;
  setTutorialModeEnabled?: (enabled: boolean) => void;
  tutorialLanguage?: TutorialLanguage;
  setTutorialLanguage?: (lang: TutorialLanguage) => void;
  tutorialVoicePersona?: TutorialVoicePersona;
  setTutorialVoicePersona?: (persona: TutorialVoicePersona) => void;
  onNavigateToTab?: (tab: string) => void;
  initialTab?: 'upi' | 'appearance' | 'tutorial' | 'printer';
}

export function PosSettingsDialog({
  isOpen,
  onOpenChange,
  venueDetails,
  setVenueDetails,
  tutorialModeEnabled = false,
  setTutorialModeEnabled,
  tutorialLanguage = 'hi',
  setTutorialLanguage,
  tutorialVoicePersona = 'puck',
  setTutorialVoicePersona,
  onNavigateToTab,
  initialTab = 'upi',
}: PosSettingsDialogProps) {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { themeColor, setThemeColor, availableColors = [] } = useThemeColor();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'upi' | 'appearance' | 'tutorial' | 'printer'>(initialTab);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [playingFeatureId, setPlayingFeatureId] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);

  // Printer Hardware Management State
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => getPrinterConfig());
  const [isScanningBluetooth, setIsScanningBluetooth] = useState<boolean>(false);
  const [printerStatus, setPrinterStatus] = useState(() => getPrinterConnectionStatus());

  useEffect(() => {
    setMounted(true);
    setPrinterConfig(getPrinterConfig());
    setPrinterStatus(getPrinterConnectionStatus());
  }, [isOpen]);

  const handleUpdatePrinterConfig = (updates: Partial<PrinterConfig>) => {
    const updated = savePrinterConfig(updates);
    setPrinterConfig(updated);
    setPrinterStatus(getPrinterConnectionStatus());
  };

  const handleConnectBluetooth = async () => {
    setIsScanningBluetooth(true);
    try {
      const res = await connectBluetoothPrinter();
      if (res.success) {
        toast({
          title: t("Bluetooth Printer Connected!"),
          description: `${res.deviceName || 'Thermal Printer'} is ready for 1-tap wireless printing (Like Lazy Calc POS).`,
        });
        setPrinterConfig(getPrinterConfig());
        setPrinterStatus(getPrinterConnectionStatus());
      } else {
        toast({
          variant: "destructive",
          title: t("Bluetooth Connection Failed"),
          description: res.error || t("Could not pair Bluetooth printer."),
        });
      }
    } finally {
      setIsScanningBluetooth(false);
    }
  };

  const handleDisconnectBluetooth = async () => {
    await disconnectBluetoothPrinter();
    handleUpdatePrinterConfig({ mode: 'system' });
    toast({
      title: t("Printer Disconnected"),
      description: t("Reverted to System Print mode."),
    });
  };

  const handleConnectSerial = async () => {
    const res = await connectSerialPrinter();
    if (res.success) {
      toast({
        title: t("USB / Serial Printer Connected!"),
        description: t("Direct thermal printing active via USB / COM port."),
      });
      setPrinterConfig(getPrinterConfig());
      setPrinterStatus(getPrinterConnectionStatus());
    } else {
      toast({
        variant: "destructive",
        title: t("Serial Connection Failed"),
        description: res.error || t("Could not connect serial printer."),
      });
    }
  };

  const handleTestPrint = async () => {
    toast({
      title: t("Sending Test Receipt..."),
      description: t("Streaming ESC/POS thermal command stream to printer."),
    });
    const res = await printTestReceipt(venueDetails?.name || 'Krishna Supermart');
    if (res.success) {
      toast({
        title: t("Test Slip Printed!"),
        description: t("Receipt printed successfully. Your printer is perfectly configured!"),
      });
    } else {
      toast({
        variant: "destructive",
        title: t("Print Failed"),
        description: res.error || t("Could not print test slip. Verify printer power and connection."),
      });
    }
  };

  const handleKickCashDrawer = async () => {
    const kicked = await kickCashDrawer();
    if (kicked) {
      toast({
        title: t("Cash Drawer Popped!"),
        description: t("Pulse signal sent to RJ11 kick port."),
      });
    } else {
      toast({
        variant: "destructive",
        title: t("Drawer Kick Signal Failed"),
        description: t("Connect a Bluetooth or Serial printer with an RJ11 cash drawer cable."),
      });
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Subscribe to voice state
  useEffect(() => {
    const unsubscribe = subscribeToVoiceState(({ featureId, isPlaying }) => {
      setPlayingFeatureId(featureId);
      setIsVoiceActive(isPlaying);
    });
    return () => unsubscribe();
  }, []);

  // Form State
  const upiMode = venueDetails?.upiMode || 'standee'; // 'standee' is default!
  const upiId = venueDetails?.upiId || '';
  const upiMerchantName = venueDetails?.upiMerchantName || venueDetails?.name || '';
  const soundboxEnabled = venueDetails?.upiSoundboxEnabled ?? true;
  const soundboxVoice = venueDetails?.upiSoundboxVoice || 'en';

  const updateSetting = (key: keyof VenueDetails, value: any) => {
    const base = venueDetails || {
      name: '',
      address: '',
      contactNumber: '',
      email: '',
      tagline: '',
    };
    const updated = { ...base, [key]: value };
    setVenueDetails(updated);

    try {
      localStorage.setItem('venueDetails', JSON.stringify(updated));
    } catch {}
  };

  const filteredFeatures = TUTORIAL_FEATURES.filter((f) => {
    if (categoryFilter === 'all') return true;
    return f.category.toLowerCase() === categoryFilter.toLowerCase();
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-6 rounded-3xl border shadow-2xl bg-card">
        <DialogHeader className="space-y-1 pb-2 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-primary/10 rounded-xl text-primary">
              <Settings className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black">{t('Store & POS Settings')}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">{t('Configure payment modes, audio tutorial guide, and theme appearance.')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full flex-1 flex flex-col overflow-hidden pt-2">
          <TabsList className="grid w-full grid-cols-4 h-11 bg-muted/60 p-1 rounded-xl flex-shrink-0">
            <TabsTrigger value="upi" className="rounded-lg font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <QrCode className="h-3.5 w-3.5" />
              {t('UPI & Payments')}
            </TabsTrigger>
            <TabsTrigger value="printer" className="rounded-lg font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <Printer className="h-3.5 w-3.5" />
              {t('Printer & Hardware')}
            </TabsTrigger>
            <TabsTrigger value="appearance" className="rounded-lg font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <Palette className="h-3.5 w-3.5" />
              {t('Theme & Colors')}
            </TabsTrigger>
            <TabsTrigger value="tutorial" className="rounded-lg font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs">
              <Headphones className="h-3.5 w-3.5" />
              {t('Audio Guide & Tutorial')}
            </TabsTrigger>
          </TabsList>

          {/* ========================================================= */}
          {/* TAB 1: UPI & PAYMENT MODE */}
          {/* ========================================================= */}
          <TabsContent value="upi" className="space-y-4 pt-3 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t('UPI Payment Verification Mode')}
              </Label>
              <RadioGroup
                value={upiMode}
                onValueChange={(val: 'standee' | 'screen') => {
                  updateSetting('upiMode', val);
                  toast({
                    title: val === 'standee' ? t('Counter Standee Mode Active') : t('Dynamic Screen QR Active'),
                    description: val === 'standee'
                      ? t('Customer will scan your printed counter QR; software will auto-detect.')
                      : t('Software will display full QR code on screen.'),
                  });
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
              >
                {/* Option 1: Counter Standee (Default) */}
                <label
                  htmlFor="mode-standee"
                  className={cn(
                    "flex flex-col p-3 rounded-2xl border-2 cursor-pointer transition-all space-y-1.5",
                    upiMode === 'standee'
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/60 hover:border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className={cn("h-4 w-4", upiMode === 'standee' ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-bold text-xs">{t('Counter QR Standee')}</span>
                    </div>
                    <RadioGroupItem value="standee" id="mode-standee" />
                  </div>
                  <div className="inline-block self-start px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase">
                    {t('Default / Recommended')}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {t('Customer scans your counter paper standee & types amount. Software detects incoming payment automatically.')}
                  </p>
                </label>

                {/* Option 2: Dynamic On-Screen QR */}
                <label
                  htmlFor="mode-screen"
                  className={cn(
                    "flex flex-col p-3 rounded-2xl border-2 cursor-pointer transition-all space-y-1.5",
                    upiMode === 'screen'
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/60 hover:border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode className={cn("h-4 w-4", upiMode === 'screen' ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-bold text-xs">{t('On-Screen Dynamic QR')}</span>
                    </div>
                    <RadioGroupItem value="screen" id="mode-screen" />
                  </div>
                  <div className="inline-block self-start px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full text-[10px] font-black uppercase">
                    {t('Amount Locked')}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {t('Pops up a scannable dynamic QR on screen with exact bill amount pre-locked for customer.')}
                  </p>
                </label>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="setting-upi-id" className="text-xs font-bold">
                  {t('Store UPI VPA / QR ID')}
                </Label>
                <Input
                  id="setting-upi-id"
                  placeholder="e.g. storename@okhdfcbank"
                  value={upiId}
                  onChange={(e) => updateSetting('upiId', e.target.value.trim())}
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="setting-merchant-name" className="text-xs font-bold">
                  {t('Merchant / Store Name')}
                </Label>
                <Input
                  id="setting-merchant-name"
                  placeholder="e.g. Apna Supermarket"
                  value={upiMerchantName}
                  onChange={(e) => updateSetting('upiMerchantName', e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
              </div>
            </div>

            {/* Soundbox Setting */}
            <div className="p-3 bg-muted/40 rounded-2xl border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black">{t('In-Software Soundbox')}</span>
                    <p className="text-[11px] text-muted-foreground">{t('Cash register chime & voice confirmation on payment')}</p>
                  </div>
                </div>
                <Switch
                  checked={soundboxEnabled}
                  onCheckedChange={(val) => updateSetting('upiSoundboxEnabled', val)}
                />
              </div>

              {soundboxEnabled && (
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-xs font-bold text-muted-foreground">{t('Announcement Voice Language')}</span>
                  <Select
                    value={soundboxVoice}
                    onValueChange={(val: 'en' | 'hi') => updateSetting('upiSoundboxVoice', val)}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English Voice</SelectItem>
                      <SelectItem value="hi">हिंदी (Hindi Voice)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB: PRINTER & HARDWARE (BLUETOOTH / SEZNIK / ESC/POS) */}
          {/* ========================================================= */}
          <TabsContent value="printer" className="space-y-4 pt-3 flex-1 overflow-y-auto pr-1">
            {/* 1. Connection Output Mode */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t('Thermal Printing Engine')}
                </Label>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                  {printerConfig.mode === 'bluetooth' ? t('Wireless Bluetooth') : printerConfig.mode === 'serial' ? t('USB / Serial') : t('System Print')}
                </span>
              </div>

              <RadioGroup
                value={printerConfig.mode}
                onValueChange={(val: 'bluetooth' | 'serial' | 'system') => {
                  handleUpdatePrinterConfig({ mode: val });
                  toast({
                    title: val === 'bluetooth'
                      ? t('Bluetooth Thermal Engine Selected')
                      : val === 'serial'
                      ? t('USB / Serial Thermal Engine Selected')
                      : t('System Print Mode Selected'),
                    description: val === 'bluetooth'
                      ? t('Direct 1-tap wireless ESC/POS printing without popups (Seznik, Everycom, TVS).')
                      : val === 'serial'
                      ? t('Direct printing via USB cable or COM port.')
                      : t('Prints using browser print preview dialog.'),
                  });
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                {/* Option 1: Bluetooth */}
                <label
                  htmlFor="mode-bt"
                  className={cn(
                    "flex flex-col p-3 rounded-2xl border-2 cursor-pointer transition-all space-y-1.5",
                    printerConfig.mode === 'bluetooth'
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/60 hover:border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Bluetooth className={cn("h-4 w-4", printerConfig.mode === 'bluetooth' ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-bold text-xs">{t('Bluetooth Direct')}</span>
                    </div>
                    <RadioGroupItem value="bluetooth" id="mode-bt" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t('Seznik, Everycom, TVS, MPT-II, POS-58/80. Instant 1-tap wireless prints.')}
                  </p>
                </label>

                {/* Option 2: USB / Serial */}
                <label
                  htmlFor="mode-serial"
                  className={cn(
                    "flex flex-col p-3 rounded-2xl border-2 cursor-pointer transition-all space-y-1.5",
                    printerConfig.mode === 'serial'
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/60 hover:border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Usb className={cn("h-4 w-4", printerConfig.mode === 'serial' ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-bold text-xs">{t('USB / Serial')}</span>
                    </div>
                    <RadioGroupItem value="serial" id="mode-serial" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t('Direct cable or Bluetooth virtual COM port.')}
                  </p>
                </label>

                {/* Option 3: System Print */}
                <label
                  htmlFor="mode-sys"
                  className={cn(
                    "flex flex-col p-3 rounded-2xl border-2 cursor-pointer transition-all space-y-1.5",
                    printerConfig.mode === 'system'
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border/60 hover:border-border bg-card"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Printer className={cn("h-4 w-4", printerConfig.mode === 'system' ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-bold text-xs">{t('System Print')}</span>
                    </div>
                    <RadioGroupItem value="system" id="mode-sys" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t('Standard OS dialog for A4, network printers, or PDF export.')}
                  </p>
                </label>
              </RadioGroup>
            </div>

            {/* 2. Bluetooth Device Pairing Card */}
            {printerConfig.mode === 'bluetooth' && (
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-3 w-3 rounded-full",
                      printerStatus.connected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
                    )} />
                    <div>
                      <span className="text-xs font-black">
                        {printerStatus.connected
                          ? `${t('Connected')}: ${printerStatus.deviceName || 'Bluetooth Printer'}`
                          : t('No Bluetooth Printer Connected')}
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        {printerStatus.connected
                          ? t('Ready to stream ESC/POS thermal bills instantly')
                          : t('Click below to search for your Seznik, Everycom, or TVS printer')}
                      </p>
                    </div>
                  </div>
                  {printerStatus.connected && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDisconnectBluetooth}
                      className="h-7 text-xs rounded-lg px-2 text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      {t('Disconnect')}
                    </Button>
                  )}
                </div>

                {!isWebBluetoothSupported() ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                    {t('Note: Web Bluetooth is supported in Google Chrome, Microsoft Edge, and Android Chrome. If using Firefox or Safari, switch to System Print.')}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleConnectBluetooth}
                      disabled={isScanningBluetooth}
                      className="h-9 px-3.5 text-xs font-bold rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                    >
                      {isScanningBluetooth ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          {t('Scanning Bluetooth Devices...')}
                        </>
                      ) : (
                        <>
                          <Bluetooth className="h-3.5 w-3.5" />
                          {printerStatus.connected ? t('Switch / Pair Different Printer') : t('Scan & Connect Bluetooth Printer')}
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleTestPrint}
                      className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 border-border/80"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      {t('Print Test Slip')}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleKickCashDrawer}
                      className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 border-border/80"
                      title={t('Test RJ11 cash drawer kick')}
                    >
                      <Banknote className="h-3.5 w-3.5 text-amber-600" />
                      {t('Test Cash Drawer')}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* USB / Serial Connection Card */}
            {printerConfig.mode === 'serial' && (
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black">
                      {printerStatus.connected
                        ? `${t('Connected')}: ${printerStatus.deviceName || 'USB / Serial Printer'}`
                        : t('No USB / Serial Printer Connected')}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {t('Connect your thermal printer via USB cable or Windows Bluetooth COM port')}
                    </p>
                  </div>
                  {printerStatus.connected && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDisconnectBluetooth}
                      className="h-7 text-xs rounded-lg px-2 text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      {t('Disconnect')}
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleConnectSerial}
                    className="h-9 px-3.5 text-xs font-bold rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                  >
                    <Usb className="h-3.5 w-3.5" />
                    {t('Select USB / COM Port')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestPrint}
                    className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 border-border/80"
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    {t('Print Test Slip')}
                  </Button>
                </div>
              </div>
            )}

            {/* 3. Paper Width Selector */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black">{t('Thermal Paper Roll Width')}</span>
                  <p className="text-[11px] text-muted-foreground">{t('Select the roll size used by your printer')}</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs font-bold">
                  {printerConfig.paperWidth}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={printerConfig.paperWidth === '58mm' ? 'default' : 'outline'}
                  onClick={() => handleUpdatePrinterConfig({ paperWidth: '58mm' })}
                  className={cn(
                    "h-12 flex flex-col items-start justify-center p-2 rounded-xl text-left font-bold text-xs",
                    printerConfig.paperWidth === '58mm' ? "bg-primary text-primary-foreground" : "border-border/60"
                  )}
                >
                  <span>58mm (2 Inch / 32 Chars)</span>
                  <span className="text-[10px] font-normal opacity-80">Seznik SZ-58, Everycom EC-58, MPT-II, PT-210</span>
                </Button>

                <Button
                  type="button"
                  variant={printerConfig.paperWidth === '80mm' ? 'default' : 'outline'}
                  onClick={() => handleUpdatePrinterConfig({ paperWidth: '80mm' })}
                  className={cn(
                    "h-12 flex flex-col items-start justify-center p-2 rounded-xl text-left font-bold text-xs",
                    printerConfig.paperWidth === '80mm' ? "bg-primary text-primary-foreground" : "border-border/60"
                  )}
                >
                  <span>80mm (3 Inch / 48 Chars)</span>
                  <span className="text-[10px] font-normal opacity-80">Seznik SZ-80, TVS RP 3150, Epson TM-T88</span>
                </Button>
              </div>
            </div>

            {/* 4. Hardware Automation Options */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t('Hardware Automation')}
              </span>

              {/* Auto-Print on Checkout */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold">{t('Auto-Print on Checkout')}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {t('Automatically print thermal receipt when cash or UPI payment is completed')}
                  </p>
                </div>
                <Switch
                  checked={printerConfig.autoPrint}
                  onCheckedChange={(val) => handleUpdatePrinterConfig({ autoPrint: val })}
                />
              </div>

              {/* Auto Cash Drawer Kick */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div>
                  <span className="text-xs font-bold">{t('Automatic Cash Drawer Kick')}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {t('Send RJ11 pulse to pop open cash drawer on cash transactions')}
                  </p>
                </div>
                <Switch
                  checked={printerConfig.autoKickDrawer}
                  onCheckedChange={(val) => handleUpdatePrinterConfig({ autoKickDrawer: val })}
                />
              </div>

              {/* Auto Paper Cut */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div>
                  <span className="text-xs font-bold">{t('Automatic Paper Cut')}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {t('Send guillotine cut command after receipt printing (80mm printers)')}
                  </p>
                </div>
                <Switch
                  checked={printerConfig.autoCut}
                  onCheckedChange={(val) => handleUpdatePrinterConfig({ autoCut: val })}
                />
              </div>

              {/* Beep Alert */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div>
                  <span className="text-xs font-bold">{t('Buzzer Beep Alert')}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {t('Emit sound tone on printer head to notify cashier')}
                  </p>
                </div>
                <Switch
                  checked={printerConfig.beepOnPrint}
                  onCheckedChange={(val) => handleUpdatePrinterConfig({ beepOnPrint: val })}
                />
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 2: THEME & APPEARANCE */}
          {/* ========================================================= */}
          <TabsContent value="appearance" className="space-y-4 pt-3 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t('Display Mode')}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className="rounded-xl text-xs font-bold gap-1.5 h-10"
                >
                  <Sun className="h-4 w-4" />
                  {t('Light')}
                </Button>
                <Button
                  type="button"
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className="rounded-xl text-xs font-bold gap-1.5 h-10"
                >
                  <Moon className="h-4 w-4" />
                  {t('Dark')}
                </Button>
                <Button
                  type="button"
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                  className="rounded-xl text-xs font-bold gap-1.5 h-10"
                >
                  <Laptop className="h-4 w-4" />
                  {t('System')}
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t('Store Accent Theme Color')}
                </Label>
                <span className="text-[10px] font-bold text-primary capitalize">
                  {availableColors.find(c => c.value === themeColor)?.name || ''}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2.5 p-3 bg-muted/30 rounded-2xl border border-border/60">
                {availableColors.map((color) => {
                  const isSelected = color.value === themeColor;
                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => {
                        setThemeColor(color.value);
                        toast({ title: t("Theme Color Changed"), description: color.name });
                      }}
                      className={cn(
                        "h-10 w-full rounded-xl flex items-center justify-center transition-all hover:scale-105 relative",
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 scale-105 shadow-md"
                          : "opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: `hsl(${color.value})` }}
                      title={color.name}
                    >
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-white drop-shadow-md" />}
                      <span className="sr-only">{color.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 3: AUDIO GUIDE & TUTORIAL */}
          {/* ========================================================= */}
          <TabsContent value="tutorial" className="space-y-3.5 pt-2 flex-1 flex flex-col overflow-hidden">
            {/* SECTION 1: SMART AMBIENT SCREEN TOUR ASSISTANT */}
            <div className="p-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/30 flex-shrink-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary text-primary-foreground rounded-xl shadow-xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black uppercase tracking-wider text-foreground">
                        {t('Interactive Screen Tour Assistant')}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold border-primary/40 text-primary uppercase">
                        Smart Mode
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {t('Assistant speaks aloud automatically as you navigate between app screens.')}
                    </p>
                  </div>
                </div>

                <Switch
                  checked={tutorialModeEnabled}
                  onCheckedChange={(checked) => {
                    setTutorialModeEnabled?.(checked);
                    try {
                      localStorage.setItem('chillbill_tutorial_mode', checked ? 'true' : 'false');
                    } catch {}
                    toast({
                      title: checked ? t('Tutorial Tour Activated') : t('Tutorial Tour Deactivated'),
                      description: checked
                        ? t('The audio assistant will now guide you as you switch tabs.')
                        : t('Ambient audio tour is turned off.'),
                    });
                  }}
                />
              </div>

              {/* Language Selector Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <span>{t('Voiceover Language:')}</span>
                </div>
                <div className="flex items-center gap-1 bg-muted/80 p-0.5 rounded-xl border">
                  <button
                    type="button"
                    onClick={() => {
                      setTutorialLanguage?.('en');
                      try { localStorage.setItem('chillbill_tutorial_lang', 'en'); } catch {}
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                      tutorialLanguage === 'en'
                        ? "bg-card text-primary shadow-xs font-black"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTutorialLanguage?.('hi');
                      try { localStorage.setItem('chillbill_tutorial_lang', 'hi'); } catch {}
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                      tutorialLanguage === 'hi'
                        ? "bg-card text-primary shadow-xs font-black"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    🇮🇳 हिन्दी
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTutorialLanguage?.('hinglish');
                      try { localStorage.setItem('chillbill_tutorial_lang', 'hinglish'); } catch {}
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                      tutorialLanguage === 'hinglish'
                        ? "bg-card text-primary shadow-xs font-black"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    💬 Hinglish
                  </button>
                </div>
              </div>

              {/* Narrator Voice Persona Bar */}
              <div className="pt-2 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Mic className="h-3.5 w-3.5 text-primary" />
                    <span>{t('Narrator Voice Persona (3 Studio Personas):')}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs font-bold rounded-lg gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-xs"
                    onClick={() => {
                      playGreetingVoice(tutorialVoicePersona, tutorialLanguage).catch(() => {});
                    }}
                    title="Play greeting preview in active language"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>{t('Test Voice')}</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTutorialVoicePersona?.('puck');
                      try { localStorage.setItem('chillbill_tutorial_voice_persona', 'puck'); } catch {}
                    }}
                    className={cn(
                      "p-2 text-left rounded-xl border transition-all flex flex-col gap-0.5",
                      tutorialVoicePersona === 'puck'
                        ? "bg-card border-primary text-primary shadow-xs ring-1 ring-primary/40"
                        : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black">🇮🇳 Puck (Male)</span>
                      {tutorialVoicePersona === 'puck' && (
                        <span className="text-[9px] font-bold px-1 py-0 rounded bg-primary/20 text-primary">Active</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Warm DeepMind HD (Default)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTutorialVoicePersona?.('algieba');
                      try { localStorage.setItem('chillbill_tutorial_voice_persona', 'algieba'); } catch {}
                    }}
                    className={cn(
                      "p-2 text-left rounded-xl border transition-all flex flex-col gap-0.5",
                      tutorialVoicePersona === 'algieba'
                        ? "bg-card border-primary text-primary shadow-xs ring-1 ring-primary/40"
                        : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black">🇮🇳 Algieba (Male)</span>
                      {tutorialVoicePersona === 'algieba' && (
                        <span className="text-[9px] font-bold px-1 py-0 rounded bg-primary/20 text-primary">Active</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Crisp Professional Pitch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTutorialVoicePersona?.('studio_o');
                      try { localStorage.setItem('chillbill_tutorial_voice_persona', 'studio_o'); } catch {}
                    }}
                    className={cn(
                      "p-2 text-left rounded-xl border transition-all flex flex-col gap-0.5",
                      tutorialVoicePersona === 'studio_o'
                        ? "bg-card border-primary text-primary shadow-xs ring-1 ring-primary/40"
                        : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black">🌐 Studio Female</span>
                      {tutorialVoicePersona === 'studio_o' && (
                        <span className="text-[9px] font-bold px-1 py-0 rounded bg-primary/20 text-primary">Active</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Broadcast Clear Tone</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 2: FEATURE AUDIO PLAYLIST */}
            <div className="flex-1 flex flex-col overflow-hidden space-y-2">
              <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <Headphones className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    {t('Feature Audio Playlist (Play Any Feature On Demand)')}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {filteredFeatures.length} {t('Features Ready')}
                </span>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 flex-shrink-0 scrollbar-none">
                {['all', 'Billing', 'Payments', 'Staff', 'Customers', 'Expenses', 'Inventory', 'Tax'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border",
                      categoryFilter.toLowerCase() === cat.toLowerCase()
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Scrollable Playlist Items */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredFeatures.map((feat) => {
                  const isCurrentPlaying = isVoiceActive && playingFeatureId === feat.id;

                  return (
                    <div
                      key={feat.id}
                      className={cn(
                        "p-3 rounded-2xl border transition-all space-y-2",
                        isCurrentPlaying
                          ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/40"
                          : "border-border/60 hover:border-border bg-card/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              "p-2 rounded-xl mt-0.5",
                              isCurrentPlaying ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                            )}
                          >
                            {renderFeatureIcon(feat.icon)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-foreground leading-tight">{feat.title}</h4>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase font-semibold">
                                {feat.category}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                              {feat.summary}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Controls Row */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={isCurrentPlaying ? "destructive" : "default"}
                            className="h-7 px-2.5 text-xs font-bold rounded-lg gap-1.5 shadow-xs"
                            onClick={() => {
                              if (isCurrentPlaying) {
                                stopFeatureVoice();
                              } else {
                                playFeatureVoice(feat.id, tutorialLanguage, tutorialVoicePersona).catch(() => {});
                              }
                            }}
                          >
                            {isCurrentPlaying ? (
                              <>
                                <Square className="h-3 w-3 fill-current" />
                                <span>{t('Stop')}</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 fill-current" />
                                <span>{t('Play Guide')}</span>
                              </>
                            )}
                          </Button>

                          {/* Sound wave equalizer indicator */}
                          {isCurrentPlaying && (
                            <div className="flex items-center gap-1 text-primary">
                              <span className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                              <span className="w-1 h-4 bg-primary rounded-full animate-pulse delay-75" />
                              <span className="w-1 h-2 bg-primary rounded-full animate-pulse delay-150" />
                              <span className="w-1 h-5 bg-primary rounded-full animate-pulse delay-100" />
                              <span className="text-[10px] font-bold uppercase tracking-wider ml-1">
                                {t('Playing Voiceover...')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Show on Screen button */}
                        {feat.tabTarget && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => {
                              onNavigateToTab?.(feat.tabTarget!);
                              onOpenChange(false);
                              toast({
                                title: t('Navigated to Screen'),
                                description: feat.title,
                              });
                            }}
                            title={t('Jump to this screen in the app')}
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>{t('Show on Screen')}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2 border-t flex-shrink-0">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full font-black rounded-xl h-10 text-xs shadow-md"
          >
            {t('Done & Close Settings')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
