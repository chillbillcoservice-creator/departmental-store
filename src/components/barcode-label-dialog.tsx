"use client";

import { useState, useEffect, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScanBarcode, Printer, Eye, Settings2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { InventoryItem } from '@/lib/types';
import JsBarcode from 'jsbarcode';
import { format } from 'date-fns';

interface BarcodeLabelDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
  selectedItem?: InventoryItem | null;
  currency?: string;
  venueDetails?: any;
}

export function BarcodeLabelDialog({
  isOpen,
  onOpenChange,
  inventory,
  selectedItem,
  currency = 'Rs.',
  venueDetails,
}: BarcodeLabelDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [activeItemId, setActiveItemId] = useState<string>('');
  const [labelCopies, setLabelCopies] = useState<number>(12);
  const [labelFormat, setLabelFormat] = useState<'thermal-50x25' | 'a4-24' | 'a4-40'>('thermal-50x25');

  // Customization toggles
  const [showStoreName, setShowStoreName] = useState(true);
  const [showMrp, setShowMrp] = useState(true);
  const [showPackedDate, setShowPackedDate] = useState(true);
  const [showWeight, setShowWeight] = useState(true);

  const previewSvgRef = useRef<SVGSVGElement | null>(null);

  // Set active item when opened
  useEffect(() => {
    if (isOpen) {
      if (selectedItem) {
        setActiveItemId(selectedItem.id);
      } else if (inventory.length > 0 && !activeItemId) {
        setActiveItemId(inventory[0].id);
      }
    }
  }, [isOpen, selectedItem, inventory]);

  const currentItem = inventory.find((i) => i.id === activeItemId) || selectedItem || inventory[0];

  // Render barcode in SVG preview whenever item or dialog changes
  useEffect(() => {
    if (isOpen && currentItem && previewSvgRef.current) {
      try {
        const cleanCode = (currentItem.id || '10001').trim();
        JsBarcode(previewSvgRef.current, cleanCode, {
          format: 'CODE128',
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 11,
          margin: 4,
          background: 'transparent',
        });
      } catch (err) {
        console.error("Barcode generation failed", err);
      }
    }
  }, [isOpen, currentItem]);

  const handlePrint = () => {
    if (!currentItem) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const storeTitle = venueDetails?.name || 'SUPERMARKET';
    const packedDateStr = format(new Date(), 'dd/MM/yyyy');
    const cleanCode = (currentItem.id || '10001').trim();
    const sellingPrice = (currentItem.price || 0) * (1 - (currentItem.discount || 0) / 100);
    const hasDiscount = (currentItem.discount || 0) > 0;

    let layoutCss = '';
    let labelItemHtml = '';

    if (labelFormat === 'thermal-50x25') {
      // 50mm x 25mm Thermal Roll (2" x 1")
      layoutCss = `
        @page { size: 50mm 25mm; margin: 0; }
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .page { width: 50mm; height: 25mm; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 1.5mm; text-align: center; }
        .store { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .name { font-size: 8px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 46mm; }
        .price-row { display: flex; justify-content: space-around; width: 100%; font-size: 8px; font-weight: 800; margin-top: 1px; }
        .barcode-svg { width: 44mm; height: 12mm; }
        .footer-row { font-size: 6px; color: #333; display: flex; justify-content: space-between; width: 100%; padding: 0 1mm; }
      `;
    } else if (labelFormat === 'a4-24') {
      // A4 Sheet - 24 labels (3 cols x 8 rows, 70mm x 37mm)
      layoutCss = `
        @page { size: A4 portrait; margin: 8mm; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .grid { display: grid; grid-template-columns: repeat(3, 68mm); gap: 2.5mm; }
        .page { width: 68mm; height: 35mm; border: 1px dashed #ccc; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2mm; text-align: center; border-radius: 4px; }
        .store { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .name { font-size: 10px; font-weight: 700; max-width: 64mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .price-row { font-size: 11px; font-weight: 900; margin: 1px 0; display: flex; gap: 8px; }
        .barcode-svg { width: 60mm; height: 15mm; }
        .footer-row { font-size: 7.5px; color: #555; display: flex; justify-content: space-between; width: 100%; padding: 0 2mm; }
      `;
    } else {
      // A4 Sheet - 40 labels (4 cols x 10 rows, 52.5mm x 29.7mm)
      layoutCss = `
        @page { size: A4 portrait; margin: 5mm; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .grid { display: grid; grid-template-columns: repeat(4, 50mm); gap: 2mm; }
        .page { width: 50mm; height: 28mm; border: 1px dashed #ccc; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5mm; text-align: center; border-radius: 3px; }
        .store { font-size: 7.5px; font-weight: 800; text-transform: uppercase; }
        .name { font-size: 8.5px; font-weight: 700; max-width: 48mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .price-row { font-size: 9px; font-weight: 900; margin: 1px 0; }
        .barcode-svg { width: 46mm; height: 12mm; }
        .footer-row { font-size: 6.5px; color: #555; display: flex; justify-content: space-between; width: 100%; padding: 0 1mm; }
      `;
    }

    const singleLabelHtml = `
      <div class="page">
        ${showStoreName ? `<div class="store">${storeTitle}</div>` : ''}
        <div class="name">${currentItem.name}</div>
        ${showMrp ? `
          <div class="price-row">
            ${hasDiscount ? `<span>MRP: <strike>${currency}${currentItem.price.toFixed(2)}</strike></span>` : ''}
            <span>${hasDiscount ? 'Our Price: ' : 'MRP: '}<strong>${currency}${sellingPrice.toFixed(2)}</strong></span>
          </div>
        ` : ''}
        <svg class="barcode-svg" id="bc-INDEX"></svg>
        <div class="footer-row">
          ${showPackedDate ? `<span>PKD: ${packedDateStr}</span>` : '<span></span>'}
          ${showWeight ? `<span>${currentItem.stock > 0 ? `Net: ${currentItem.unit}` : ''}</span>` : '<span></span>'}
        </div>
      </div>
    `;

    const labelsListHtml = Array.from({ length: labelCopies })
      .map((_, idx) => singleLabelHtml.replace('bc-INDEX', `bc-${idx}`))
      .join('');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode Stickers - ${currentItem.name}</title>
        <style>
          ${layoutCss}
          @media screen {
            body { background: #f3f4f6; padding: 20px; }
            .grid { background: white; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); width: fit-content; margin: auto; }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        ${labelFormat.startsWith('a4') ? `<div class="grid">${labelsListHtml}</div>` : `<div>${labelsListHtml}</div>`}
        <script>
          window.onload = function() {
            for (let i = 0; i < ${labelCopies}; i++) {
              try {
                JsBarcode("#bc-" + i, "${cleanCode}", {
                  format: "CODE128",
                  width: ${labelFormat === 'thermal-50x25' ? 1.3 : 1.6},
                  height: ${labelFormat === 'thermal-50x25' ? 24 : 32},
                  displayValue: true,
                  fontSize: ${labelFormat === 'thermal-50x25' ? 9 : 10},
                  margin: 2
                });
              } catch(e) {}
            }
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(fullHtml);
    printWindow.document.close();

    toast({
      title: t("Labels Generated"),
      description: `${labelCopies} ${t("barcode stickers prepared for printing.")}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <ScanBarcode className="h-5 w-5 text-primary" />
            {t("Barcode Label & Sticker Studio")}
          </DialogTitle>
          <DialogDescription>
            {t("Design and print retail price stickers and barcode labels for packaging loose products and shelf tags.")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
          {/* Controls Column */}
          <div className="md:col-span-7 space-y-4">
            {/* Select Product */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t("Select Product")}
              </Label>
              <Select value={activeItemId} onValueChange={setActiveItemId}>
                <SelectTrigger className="h-11 rounded-xl font-bold">
                  <SelectValue placeholder={t("Choose item...")} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      <span className="font-bold">{item.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({currency}{item.price.toFixed(2)}) &bull; {item.id}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Print Format & Copies */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t("Label Layout / Paper")}
                </Label>
                <Select value={labelFormat} onValueChange={(val: any) => setLabelFormat(val)}>
                  <SelectTrigger className="h-10 rounded-xl font-bold text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thermal-50x25">{t("Thermal Roll (50×25mm / 2\"×1\")")}</SelectItem>
                    <SelectItem value="a4-24">{t("A4 Sheet - 24 Labels (3×8)")}</SelectItem>
                    <SelectItem value="a4-40">{t("A4 Sheet - 40 Labels (4×10)")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t("Number of Stickers")}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={labelCopies}
                  onChange={(e) => setLabelCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-10 font-bold rounded-xl"
                />
              </div>
            </div>

            {/* Customization Options */}
            <div className="p-4 bg-muted/40 rounded-2xl border border-border/50 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">
                <Settings2 className="h-3.5 w-3.5" />
                {t("Sticker Information Toggles")}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <Label htmlFor="toggle-store" className="cursor-pointer text-xs font-bold">{t("Store Name")}</Label>
                  <Switch id="toggle-store" checked={showStoreName} onCheckedChange={setShowStoreName} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="toggle-mrp" className="cursor-pointer text-xs font-bold">{t("Price & MRP")}</Label>
                  <Switch id="toggle-mrp" checked={showMrp} onCheckedChange={setShowMrp} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="toggle-pkd" className="cursor-pointer text-xs font-bold">{t("Packing Date")}</Label>
                  <Switch id="toggle-pkd" checked={showPackedDate} onCheckedChange={setShowPackedDate} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="toggle-wt" className="cursor-pointer text-xs font-bold">{t("Unit / Weight")}</Label>
                  <Switch id="toggle-wt" checked={showWeight} onCheckedChange={setShowWeight} />
                </div>
              </div>
            </div>
          </div>

          {/* Visual Live Preview Column */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5 self-start">
              <Eye className="h-3.5 w-3.5" />
              {t("Live Sticker Preview")}
            </Label>

            <Card className="w-full max-w-[280px] p-4 bg-background border-2 border-primary/30 shadow-lg rounded-2xl flex flex-col items-center text-center">
              {showStoreName && (
                <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">
                  {venueDetails?.name || 'SUPERMARKET'}
                </div>
              )}
              <div className="font-bold text-sm text-foreground line-clamp-1 w-full">
                {currentItem?.name}
              </div>

              {showMrp && (
                <div className="flex items-center justify-center gap-2 text-xs font-black my-1">
                  {(currentItem?.discount || 0) > 0 ? (
                    <>
                      <span className="text-muted-foreground line-through text-[10px]">
                        MRP {currency}{currentItem?.price.toFixed(2)}
                      </span>
                      <span className="text-primary font-black">
                        Our Price: {currency}{((currentItem?.price || 0) * (1 - (currentItem?.discount || 0) / 100)).toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-primary font-black">
                      MRP {currency}{(currentItem?.price || 0).toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              {/* Barcode SVG */}
              <div className="w-full flex justify-center my-1 bg-white p-1 rounded-lg">
                <svg ref={previewSvgRef} className="max-w-full"></svg>
              </div>

              <div className="flex justify-between w-full text-[9px] text-muted-foreground font-mono mt-1 px-1">
                {showPackedDate ? <span>PKD: {format(new Date(), 'dd/MM/yyyy')}</span> : <span></span>}
                {showWeight ? <span>{currentItem?.stock > 0 ? `Net: ${currentItem?.unit}` : ''}</span> : <span></span>}
              </div>
            </Card>

            <div className="text-[11px] text-muted-foreground mt-3 text-center">
              {labelFormat === 'thermal-50x25' && t("Optimized for TSC, TVS, Zebra, Godrej 50×25mm thermal sticker rolls.")}
              {labelFormat === 'a4-24' && t("Prints 24 stickers per standard A4 label sheet (3 columns × 8 rows).")}
              {labelFormat === 'a4-40' && t("Prints 40 stickers per compact A4 label sheet (4 columns × 10 rows).")}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            {t("Cancel")}
          </Button>
          <Button onClick={handlePrint} className="rounded-xl font-black gap-2">
            <Printer className="h-4 w-4" />
            {t("Print")} {labelCopies} {t("Stickers")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
