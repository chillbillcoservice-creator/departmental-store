'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  Check,
  Loader2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import type { InventoryItem, MenuCategory } from '@/lib/types';

interface UniversalCatalogImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
  setInventory: (items: InventoryItem[]) => void;
  menu?: MenuCategory[];
  setMenu?: (menu: MenuCategory[]) => void;
  currency?: string;
}

export function UniversalCatalogImportDialog({
  isOpen,
  onOpenChange,
  inventory,
  setInventory,
  menu = [],
  setMenu,
  currency = 'Rs.',
}: UniversalCatalogImportDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'csv' | 'pdf' | ''>('');
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const downloadSampleCsv = () => {
    const headers = "Name,Category,Price,CostPrice,Stock,Barcode,HSN,Unit,MinStock\n";
    const sample1 = "Tata Salt 1kg,Groceries & Staples,28,24,50,8901030383789,250100,Pack,10\n";
    const sample2 = "Maggi 2-Minute Noodles 70g,Snacks & Packaged Foods,14,11.5,120,8901058852373,190230,Piece,20\n";
    const sample3 = "Amul Butter 100g,Dairy & Breakfast,58,51,30,8901262010054,040510,Pack,5\n";
    const sample4 = "Fortune Sunflower Oil 1L,Groceries & Staples,145,128,40,8906007280145,151219,Pouch,8\n";
    const blob = new Blob([headers + sample1 + sample2 + sample3 + sample4], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "chillbill_catalog_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);
    setIsLoading(true);
    setParsedItems([]);

    const ext = file.name.toLowerCase();
    const type = ext.endsWith('.pdf') ? 'pdf' : 'csv';
    setFileType(type);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/catalog/parse-file', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to parse file.');
      }

      if (!data.items || data.items.length === 0) {
        throw new Error('No line items or products could be identified in this file.');
      }

      setParsedItems(data.items);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(err.message || 'Error processing document.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedItems.length === 0) return;

    const formattedNewItems: InventoryItem[] = parsedItems.map((item, idx) => ({
      id: `ITEM-${Date.now()}-${idx + 1}`,
      name: item.name,
      category: item.category || 'General',
      price: Number(item.price) || 0,
      costPrice: Number(item.costPrice) || 0,
      stock: Number(item.stock) || 10,
      barcode: item.barcode || '',
      hsnCode: item.hsnCode || '',
      unit: item.unit || 'Pack',
      capacity: Number(item.capacity) || 5,
      status: Number(item.stock) > 0 ? 'In Stock' : 'Out of Stock',
    }));

    const finalInventory = importMode === 'replace'
      ? formattedNewItems
      : [...inventory, ...formattedNewItems];

    setInventory(finalInventory);

    // Auto-sync menu categories so products appear on POS billing counter grid
    if (setMenu) {
      const existingMenu = importMode === 'replace' ? [] : [...menu];
      const categoriesMap = new Map<string, any[]>();

      existingMenu.forEach(cat => {
        categoriesMap.set(cat.name.toLowerCase(), cat.items || []);
      });

      formattedNewItems.forEach(item => {
        const catKey = (item.category || 'General').toLowerCase();
        const currentList = categoriesMap.get(catKey) || [];
        currentList.push({
          name: item.name,
          price: item.price,
          barcode: item.barcode,
          hsnCode: item.hsnCode,
          code: String(currentList.length + 1).padStart(2, '0'),
        });
        categoriesMap.set(catKey, currentList);
      });

      const updatedMenu: MenuCategory[] = Array.from(categoriesMap.entries()).map(([key, items]) => {
        const found = existingMenu.find(c => c.name.toLowerCase() === key);
        return {
          id: found ? found.id : key.replace(/\s+/g, '-'),
          name: found ? found.name : items[0]?.category || key.toUpperCase(),
          items: items,
          subcategories: found?.subcategories || [],
        };
      });

      setMenu(updatedMenu);
      try {
        localStorage.setItem('menu', JSON.stringify(updatedMenu));
      } catch (e) {}
    }

    try {
      localStorage.setItem('inventory', JSON.stringify(finalInventory));
      localStorage.setItem('chillbill_catalog_initialized', 'true');
    } catch (e) {}

    toast({
      title: t("Products Imported!"),
      description: t(`Successfully loaded ${formattedNewItems.length} items into Inventory and POS Counter.`),
    });

    onOpenChange(false);
    setParsedItems([]);
    setFileName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-6 max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-black flex items-center gap-2 text-foreground">
            <Package className="h-6 w-6 text-primary" />
            {t("Bulk Import Products (CSV & PDF Invoices)")}
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            {t("Upload a CSV/Excel spreadsheet or drop your distributor purchase invoice PDF. Items will automatically be added to your inventory and POS billing counter.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 flex-1 overflow-y-auto pr-1">
          {/* Format Badges & Template Download */}
          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Supported Formats:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  CSV Spreadsheet
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  PDF Invoice
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tally, Marg, Vyapar, Excel exports, or distributor purchase bills.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleCsv}
              className="shrink-0 border-primary/30 text-primary hover:bg-primary hover:text-white font-bold text-xs rounded-xl h-8"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> {t("Sample CSV Template")}
            </Button>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-border/80 hover:border-primary rounded-2xl p-6 text-center transition-all bg-muted/20">
            <input
              type="file"
              accept=".csv,.tsv,.txt,.pdf,application/pdf,text/csv"
              id="universal-catalog-file-input"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label htmlFor="universal-catalog-file-input" className="cursor-pointer flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-foreground block">
                  {fileName ? fileName : t("Click to browse or drop file here")}
                </span>
                <span className="text-xs text-muted-foreground block">
                  {isLoading ? t("Analyzing line items and extracting products...") : t("Upload CSV product list or PDF distributor invoice")}
                </span>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Extracted Items Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  {t("Identified")} {parsedItems.length} {t("products from")} {fileType.toUpperCase()}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{t("Import Mode:")}</span>
                  <select
                    value={importMode}
                    onChange={(e: any) => setImportMode(e.target.value)}
                    className="text-xs font-bold bg-muted px-2.5 py-1 rounded-lg border border-border"
                  >
                    <option value="append">{t("Add to existing catalog")}</option>
                    <option value="replace">{t("Replace all current catalog")}</option>
                  </select>
                </div>
              </div>

              {/* Scrollable Table */}
              <div className="max-h-56 overflow-y-auto border border-border/60 rounded-xl divide-y divide-border/40 text-xs shadow-inner">
                {parsedItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between bg-background/50 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 pr-3">
                      <span className="font-bold text-foreground block truncate">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {item.category} • Unit: {item.unit} {item.hsnCode ? `• HSN: ${item.hsnCode}` : ''}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-primary font-mono block">
                        {currency} {Number(item.price || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono block">
                        Cost: {currency}{Number(item.costPrice || 0).toFixed(2)} | Qty: {item.stock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-0 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleConfirmImport}
            disabled={parsedItems.length === 0 || isLoading}
            className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("Processing...")}
              </>
            ) : (
              `${t("Confirm & Import")} ${parsedItems.length > 0 ? `(${parsedItems.length} Products)` : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
