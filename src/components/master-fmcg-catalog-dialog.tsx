'use client';

import React, { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Sparkles,
  CheckCircle2,
  Package,
  CheckCheck,
  RotateCcw,
  Tag,
  Building2,
  Filter,
  IndianRupee,
  Layers,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import type { InventoryItem, MenuCategory, MenuItem } from '@/lib/types';
import {
  MASTER_FMCG_CATALOG,
  MasterFmcgProduct,
  getFmcgCompanies,
  getFmcgCategories,
} from '@/lib/master-fmcg-catalog';
import { syncInventoryToCloud } from '@/lib/firestore-sync';

interface MasterFmcgCatalogDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
  setInventory: (items: InventoryItem[]) => void;
  menu?: MenuCategory[];
  setMenu?: (menu: MenuCategory[]) => void;
  venueId?: string;
  currency?: string;
}

export function MasterFmcgCatalogDialog({
  isOpen,
  onOpenChange,
  inventory,
  setInventory,
  menu = [],
  setMenu,
  venueId,
  currency = '₹',
}: MasterFmcgCatalogDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  // Set of existing item barcodes and lowercase names to prevent duplicate SKUs
  const existingProductKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of inventory) {
      if (item.barcode) keys.add(item.barcode.trim());
      if (item.id) keys.add(item.id.trim());
      if (item.name) keys.add(item.name.trim().toLowerCase());
    }
    return keys;
  }, [inventory]);

  const allCategories = useMemo(() => getFmcgCategories(), []);
  const allCompanies = useMemo(() => getFmcgCompanies(), []);

  // Filter products based on search term, category, and company
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return MASTER_FMCG_CATALOG.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }
      if (selectedCompany !== 'All' && p.company !== selectedCompany) {
        return false;
      }
      if (!term) return true;

      return (
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.company.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term) ||
        p.hsnCode.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, selectedCategory, selectedCompany]);

  // Check if a master product is already in the store's inventory
  const isAlreadyInStore = (product: MasterFmcgProduct) => {
    return (
      existingProductKeys.has(product.barcode.trim()) ||
      existingProductKeys.has(product.id.trim()) ||
      existingProductKeys.has(product.name.trim().toLowerCase())
    );
  };

  // Toggle selection for an individual product
  const toggleProduct = (productId: string, inStore: boolean) => {
    if (inStore) return; // Prevent selection of products already present in store
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Select all items currently filtered that are not already in store
  const handleSelectAllFiltered = () => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      for (const p of filteredProducts) {
        if (!isAlreadyInStore(p)) {
          next.add(p.id);
        }
      }
      return next;
    });
  };

  // Deselect items in the current filtered view
  const handleDeselectFiltered = () => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      for (const p of filteredProducts) {
        next.delete(p.id);
      }
      return next;
    });
  };

  // Deselect all items across the whole library
  const handleClearAllSelections = () => {
    setSelectedProductIds(new Set());
  };

  // Selected products list & summary
  const selectedProducts = useMemo(() => {
    return MASTER_FMCG_CATALOG.filter((p) => selectedProductIds.has(p.id));
  }, [selectedProductIds]);

  const totalRetailValue = useMemo(() => {
    return selectedProducts.reduce((sum, p) => sum + p.price * 20, 0);
  }, [selectedProducts]);

  // Bulk import action
  const handleBulkImport = async () => {
    if (selectedProducts.length === 0) return;

    setIsImporting(true);
    try {
      // Convert selected master FMCG products into standard InventoryItem models with 20 units stock
      const newInventoryItems: InventoryItem[] = selectedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        stock: 20, // Default opening stock: 20 units as requested
        capacity: p.capacity || 50,
        unit: p.unit || 'pck',
        price: p.price,
        costPrice: p.costPrice,
        taxRate: p.taxRate,
        hsnCode: p.hsnCode,
        barcode: p.barcode || p.id,
        location: p.category,
        discount: 0,
      }));

      // Merge cleanly into inventory without overwriting existing non-conflicting items
      const existingIds = new Set(inventory.map((i) => i.id));
      const existingBarcodes = new Set(
        inventory.map((i) => i.barcode).filter((b): b is string => Boolean(b))
      );

      const itemsToAdd = newInventoryItems.filter(
        (i) => !existingIds.has(i.id) && (!i.barcode || !existingBarcodes.has(i.barcode))
      );

      const mergedInventory = [...inventory, ...itemsToAdd];

      // Update local state
      setInventory(mergedInventory);

      // Persist to localStorage
      try {
        localStorage.setItem('inventory', JSON.stringify(mergedInventory));
        localStorage.setItem('chillbill_catalog_initialized', 'true');
      } catch (e) {
        console.error('LocalStorage inventory save error:', e);
      }

      // Sync menu categories so the new items appear in POS counter category tabs
      if (setMenu) {
        const categoryMap = new Map<string, MenuItem[]>();
        for (const item of mergedInventory) {
          const cat = item.category || 'General';
          if (!categoryMap.has(cat)) {
            categoryMap.set(cat, []);
          }
          categoryMap.get(cat)!.push({
            name: item.name,
            price: item.price,
            code: item.barcode || item.id,
            category: cat,
            taxRate: item.taxRate,
            hsnCode: item.hsnCode,
          });
        }

        const updatedMenu: MenuCategory[] = Array.from(categoryMap.entries()).map(
          ([catName, items]) => {
            const found = menu.find((m) => m.name.toLowerCase() === catName.toLowerCase());
            return {
              id: found ? found.id : catName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              name: catName,
              items: items,
              subcategories: found?.subcategories || [],
            };
          }
        );

        setMenu(updatedMenu);
        try {
          localStorage.setItem('menu', JSON.stringify(updatedMenu));
        } catch (e) {
          console.error('LocalStorage menu save error:', e);
        }
      }

      // Sync to Firestore Cloud if venueId is available
      if (venueId) {
        syncInventoryToCloud(venueId, mergedInventory).catch((err) => {
          console.error('Firestore cloud inventory sync error:', err);
        });
      }

      toast({
        title: t('FMCG Products Successfully Added!'),
        description: t(
          `Added ${itemsToAdd.length} products to your store inventory with 20 units opening stock each. Ready for instant barcode billing!`
        ),
      });

      setSelectedProductIds(new Set());
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to import master FMCG products:', error);
      toast({
        title: t('Import Error'),
        description: t('An error occurred while adding products. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl rounded-3xl p-6 max-h-[92vh] flex flex-col overflow-hidden bg-background border-border shadow-2xl">
        <DialogHeader className="shrink-0 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
                  <span>{t('⚡ FMCG Master Library')}</span>
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold px-2.5 py-0.5">
                    {MASTER_FMCG_CATALOG.length} {t('Ready-to-Sell SKUs')}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                  {t(
                    'Tick mark the items you carry in your store. They will automatically be added with verified barcodes, HSN codes, GST rates, and 20 units opening stock.'
                  )}
                </DialogDescription>
              </div>
            </div>

            {/* Quick stats / live count */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-bold bg-muted/80 text-foreground border border-border">
                {t('In Store')}: {inventory.length}
              </Badge>
              <Badge variant="secondary" className="px-3 py-1 text-xs font-black bg-primary/10 text-primary border border-primary/20">
                {t('Selected')}: {selectedProductIds.size}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Filter & Search Bar */}
        <div className="shrink-0 space-y-3 pt-3 pb-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Search products by name, brand (Cadbury, Gala, Durex, Tata, McCain...), barcode or HSN...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-muted/40 border-border/80 focus:bg-background text-sm font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Company / Brand Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="h-10 px-3 text-xs font-bold rounded-xl bg-muted/50 border border-border/80 text-foreground max-w-[210px] truncate"
              >
                <option value="All">{t('All Brands & Companies')} ({allCompanies.length})</option>
                {allCompanies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Horizontal Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            <Button
              size="sm"
              variant={selectedCategory === 'All' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('All')}
              className={`h-7 px-3 text-xs rounded-lg shrink-0 font-bold transition-all ${
                selectedCategory === 'All'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/30 border-border/60 hover:bg-muted text-muted-foreground'
              }`}
            >
              {t('All Categories')} ({MASTER_FMCG_CATALOG.length})
            </Button>
            {allCategories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat)}
                className={`h-7 px-3 text-xs rounded-lg shrink-0 font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/30 border-border/60 hover:bg-muted text-muted-foreground'
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Table Controls (Select All / Deselect) */}
          <div className="flex items-center justify-between gap-2 px-1 pt-1 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <span>
                {t('Showing')} <strong className="text-foreground">{filteredProducts.length}</strong> {t('products')}
              </span>
              {(selectedCategory !== 'All' || selectedCompany !== 'All' || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedCompany('All');
                    setSearchTerm('');
                  }}
                  className="text-xs text-primary underline hover:opacity-80 font-semibold"
                >
                  {t('Reset Filters')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllFiltered}
                className="h-7 text-xs font-bold rounded-lg border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                {t('Select All Filtered')}
              </Button>
              {selectedProductIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllSelections}
                  className="h-7 text-xs font-bold rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {t('Clear Selection')} ({selectedProductIds.size})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Products Table */}
        <div className="flex-1 overflow-y-auto border border-border/70 rounded-2xl divide-y divide-border/40 bg-card/60 shadow-inner my-1 pr-1">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Package className="h-8 w-8 mx-auto opacity-40 text-muted-foreground" />
              <p className="text-sm font-semibold">{t('No products found matching your filter.')}</p>
              <p className="text-xs">{t('Try clearing your search term or selecting a different category.')}</p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const inStore = isAlreadyInStore(p);
              const isSelected = selectedProductIds.has(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => toggleProduct(p.id, inStore)}
                  className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors select-none ${
                    inStore
                      ? 'bg-muted/20 opacity-70 cursor-not-allowed'
                      : isSelected
                      ? 'bg-primary/10 border-l-4 border-l-primary cursor-pointer'
                      : 'hover:bg-muted/40 cursor-pointer'
                  }`}
                >
                  {/* Left: Checkbox & Product Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {inStore ? (
                        <div className="w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleProduct(p.id, inStore)}
                          className="h-4.5 w-4.5 rounded-md"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm leading-tight truncate">
                          {p.name}
                        </span>
                        {inStore && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold shrink-0">
                            ✓ {t('In Store')}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground flex-wrap">
                        <span className="font-semibold text-primary/90">{p.brand}</span>
                        <span>•</span>
                        <span className="truncate">{p.category}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">Barcode: {p.barcode}</span>
                        <span>•</span>
                        <span className="text-[10px]">HSN: {p.hsnCode} ({p.taxRate}% GST)</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & Margins */}
                  <div className="text-right shrink-0 pl-2">
                    <div className="font-mono font-black text-sm text-foreground">
                      {currency}{p.price.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      <span>Cost: {currency}{p.costPrice.toFixed(2)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                        ({Math.round(((p.price - p.costPrice) / p.price) * 100)}% margin)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sticky Action Footer */}
        <DialogFooter className="shrink-0 gap-3 sm:gap-0 pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground">
            <div>
              <strong className="text-foreground text-sm font-black">{selectedProductIds.size}</strong> {t('items selected')}
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="text-[11px]">
              {t('Default opening stock:')} <strong className="text-foreground font-semibold">20 units each</strong>
            </div>
            {selectedProductIds.size > 0 && (
              <>
                <span className="hidden sm:inline">•</span>
                <div className="text-[11px] text-primary font-bold">
                  {t('Stock Retail Value:')} {currency}{totalRetailValue.toLocaleString()}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-10 px-4 font-bold">
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleBulkImport}
              disabled={selectedProductIds.size === 0 || isImporting}
              className="rounded-xl h-10 px-5 font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 transition-all"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isImporting
                ? t('Importing Products...')
                : `${t('Add')} ${selectedProductIds.size} ${t('Products to Store (Stock: 20)')}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
