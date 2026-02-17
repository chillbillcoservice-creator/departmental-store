
'use client';

import * as React from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Minus, X, LayoutGrid, List, Rows, ChevronsUpDown, Palette, Shuffle, ClipboardList, Send, CheckCircle2, Users, Bookmark, Sparkles, Repeat, Edit, UserCheck, BookmarkX, Printer, Loader2, BookOpen, Trash2 as TrashIcon, QrCode as QrCodeIcon, MousePointerClick, Eye, Hand, ShoppingBag, BarChart, Users2, Bike, ShoppingBasket, Armchair, Menu as MenuIcon, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDrag, useDrop } from 'react-dnd';
import { AddItemDialog } from './add-item-dialog';
import { ManageMenuDialog } from './manage-menu-dialog';

import type { MenuCategory, MenuItem, OrderItem, Table, Order, Bill, TableStatus, KOTPreference, OrderType, CustomerDetails, InventoryItem, Customer } from '@/lib/types';
import { generateReceipt, type GenerateReceiptInput } from '@/ai/flows/dynamic-receipt-discount-reasoning';
import { groupItemsForKOT as groupItemsForKOTUtil } from '@/lib/kot-utils';
import { PaymentDialog } from './payment-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { formatDistanceToNowStrict } from 'date-fns';


const vegColor = 'bg-green-100 dark:bg-green-900/30';
const nonVegColor = 'bg-rose-100 dark:bg-rose-900/30';

const colorPalette: Record<string, { light: string, medium: string }> = {
  amber: { light: 'bg-amber-200 dark:bg-amber-800/50', medium: 'bg-amber-300 dark:bg-amber-700/50' },
  lime: { light: 'bg-lime-200 dark:bg-lime-800/50', medium: 'bg-lime-300 dark:bg-lime-700/50' },
  rose: { light: 'bg-rose-200 dark:bg-rose-800/50', medium: 'bg-rose-300 dark:bg-rose-700/50' },
  violet: { light: 'bg-violet-200 dark:bg-violet-800/50', medium: 'bg-violet-300 dark:bg-violet-700/50' },
  olive: { light: 'bg-lime-200 dark:bg-lime-800/50', medium: 'bg-lime-300 dark:bg-lime-700/50' },
  cyan: { light: 'bg-cyan-200 dark:bg-cyan-800/50', medium: 'bg-cyan-300 dark:bg-cyan-700/50' },
  pink: { light: 'bg-pink-200 dark:bg-pink-800/50', medium: 'bg-pink-300 dark:bg-pink-700/50' },
  fuchsia: { light: 'bg-fuchsia-200 dark:bg-fuchsia-800/50', medium: 'bg-fuchsia-300 dark:bg-fuchsia-700/50' },
  purple: { light: 'bg-purple-200 dark:bg-purple-800/50', medium: 'bg-purple-300 dark:bg-purple-700/50' },
  indigo: { light: 'bg-indigo-200 dark:bg-indigo-800/50', medium: 'bg-indigo-300 dark:bg-indigo-700/50' },
  green: { light: 'bg-green-200 dark:bg-green-800/50', medium: 'bg-green-300 dark:bg-green-700/50' },
  yellow: { light: 'bg-yellow-200 dark:bg-yellow-800/50', medium: 'bg-yellow-300 dark:bg-yellow-700/50' },
  emerald: { light: 'bg-emerald-200 dark:bg-emerald-800/50', medium: 'bg-emerald-300 dark:bg-emerald-700/50' },
  teal: { light: 'bg-teal-200 dark:bg-teal-800/50', medium: 'bg-teal-300 dark:bg-teal-700/50' },
  sky: { light: 'bg-sky-200 dark:bg-sky-800/50', medium: 'bg-sky-300 dark:bg-sky-700/50' },
  blue: { light: 'bg-blue-200 dark:bg-blue-800/50', medium: 'bg-blue-300 dark:bg-blue-700/50' },
  orange: { light: 'bg-orange-200 dark:bg-orange-800/50', medium: 'bg-orange-300 dark:bg-orange-700/50' },
};
const colorNames = Object.keys(colorPalette);

const itemStatusColors: Record<string, { light: string, dark: string, name: string }> = {
  low: { light: 'bg-yellow-200 dark:bg-yellow-900/40', dark: 'bg-yellow-500 dark:bg-yellow-800/70', name: 'Running Low' },
  out: { light: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-200', dark: 'bg-red-800 text-white dark:bg-red-700/70', name: 'Out of Stock' },
};
const itemStatusNames = Object.keys(itemStatusColors);


type ViewMode = 'accordion' | 'grid' | 'list';
type VegFilter = 'All' | 'Veg' | 'Non-Veg';
type ColorShade = 'light' | 'medium';
type MobileTab = 'menu' | 'order';

const statusBaseColors: Record<TableStatus, string> = {
  Available: 'bg-green-400 hover:bg-green-500',
  Occupied: 'bg-red-400 hover:bg-red-500',
  Reserved: 'bg-blue-400 hover:bg-blue-500',
  Cleaning: 'bg-amber-300 hover:bg-amber-400',
};

const getDynamicColor = (status: TableStatus) => {
  return statusBaseColors[status];
};



const statusIcons: Record<TableStatus, React.ElementType> = {
  Available: CheckCircle2,
  Occupied: Users,
  Reserved: Bookmark,
  Cleaning: Sparkles,
};

interface PosSystemProps {
  venueName: string;
  tables: Table[];
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  updateTableStatus: (tableIds: number[], status: TableStatus, reservationDetails?: Table['reservationDetails']) => void;
  occupancyCount: Record<number, number>;
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;
  orderItems: OrderItem[];
  setOrderItems: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  discount: number;
  setDiscount: (discount: number) => void;
  selectedTableId: number | null;
  setSelectedTableId: (id: number | null) => void;
  clearCurrentOrder: (fullReset?: boolean) => void;
  onOrderCreated: (order: Order) => void;
  showOccupancy: boolean;
  pendingOrders: Record<number, OrderItem[]>;
  setPendingOrders: React.Dispatch<React.SetStateAction<Record<number, OrderItem[]>>>;
  categoryColors: Record<string, string>;
  setCategoryColors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onViewTableDetails: (tableId: number) => void;
  onEditOrder: (tableId: number) => void;
  keyboardMode: 'table' | 'order' | 'confirm';
  setKeyboardMode: (mode: 'table' | 'order' | 'confirm') => void;
  billHistory: Bill[];
  setBillHistory: (bills: Bill[]) => void;
  kotPreference: KOTPreference;
  selectedOrderType: OrderType;
  setSelectedOrderType: (type: OrderType) => void;
  showTableDetailsOnPOS: boolean;
  showReservationTimeOnPOS: boolean;
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  menu: MenuCategory[];
  setMenu: (menu: MenuCategory[]) => void;
  onNavigate: (tab: string) => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  currency: string;
}

const ItemTypes = {
  MENU_ITEM: 'menuItem',
};

function DraggableMenuItem({ item, children, canDrag }: { item: MenuItem; children: React.ReactNode; canDrag: boolean }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.MENU_ITEM,
    item: { ...item },
    canDrag: canDrag,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [item, canDrag]);

  return (
    <div
      ref={drag as any}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={cn(canDrag && "cursor-move")}
    >
      {children}
    </div>
  );
}

const TableDropTarget = ({ table, occupancyCount, handleSelectTable, children, onDropItem }: { table: Table; occupancyCount: Record<number, number>, handleSelectTable: (id: number) => void, children: React.ReactNode; onDropItem: (tableId: number, item: MenuItem) => void; }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.MENU_ITEM,
    drop: (item: MenuItem) => onDropItem(table.id, item),
    canDrop: () => table.status === 'Available' || table.status === 'Occupied',
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  const isActive = isOver && canDrop;

  return (
    <div
      ref={drop as any}
      className={cn(
        "aspect-square flex-col justify-center items-center relative p-1 border-2 transition-transform duration-150 active:scale-95 group flex rounded-md cursor-pointer hover:scale-110 hover:z-10",
        getDynamicColor(table.status),
        isActive && 'ring-4 ring-offset-2 ring-green-500',
        table.status === 'Available' || table.status === 'Occupied' ? 'text-white border-black/50' : 'text-black border-black/50',
      )}
      onClick={() => handleSelectTable(table.id)}
    >
      {children}
    </div>
  );
}

// Quantity Input Component with local state for proper typing
function QuantityInput({
  itemName,
  quantity,
  updateQuantity
}: {
  itemName: string;
  quantity: number;
  updateQuantity: (name: string, qty: number) => void;
}) {
  const [localValue, setLocalValue] = useState(quantity.toString());

  useEffect(() => {
    setLocalValue(quantity.toString());
  }, [quantity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    const newQty = parseInt(localValue) || 1;
    if (newQty !== quantity) {
      updateQuantity(itemName, newQty);
    }
    setLocalValue(newQty.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newQty = parseInt(localValue) || 1;
      updateQuantity(itemName, newQty);
      setLocalValue(newQty.toString());
      e.currentTarget.blur();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Use setTimeout to ensure selection happens after focus
    setTimeout(() => {
      e.target.select();
    }, 0);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.currentTarget.select();
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="w-14 h-7 text-center font-bold p-0"
    />
  );
}

function OrderPanel({
  orderItems,
  handleDropOnOrder,
  updateQuantity,
  removeFromOrder,
  activeOrder,
  selectedTableId,
  clearCurrentOrder,
  handleQuickAssign,
  subtotal,
  total,
  discount,
  setDiscount,
  isProcessing,
  handlePrintProvisionalBill,
  handleProcessPayment,
  receiptPreview,
  kotButtons,
  children,
  orderType,
  customerDetails,
  updateInstruction,
  setCustomers,
  currency = 'Rs.',
  allMenuItems = [],
}: {
  orderItems: OrderItem[];
  handleDropOnOrder: (item: MenuItem) => void;
  updateQuantity: (name: string, quantity: number) => void;
  removeFromOrder: (name: string) => void;
  activeOrder: Order | null;
  selectedTableId: number | null;
  clearCurrentOrder: (fullReset?: boolean) => void;
  handleQuickAssign: () => void;
  subtotal: number;
  total: number;
  discount: number;
  setDiscount: (discount: number) => void;
  isProcessing: boolean;
  handlePrintProvisionalBill: () => void;
  handleProcessPayment: () => void;
  receiptPreview: string;
  kotButtons: React.ReactNode[];
  children: React.ReactNode;
  orderType: OrderType;
  customerDetails?: CustomerDetails;
  updateInstruction: (name: string, instruction: string) => void;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  currency?: string;
  allMenuItems?: MenuItem[];
}) {
  const { t } = useLanguage();
  const [isInstructionDialogOpen, setIsInstructionDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ name: string, instruction: string } | null>(null);
  const [instructionText, setInstructionText] = useState('');

  const openInstructionDialog = (item: OrderItem) => {
    setEditingItem({ name: item.name, instruction: item.instruction || '' });
    setInstructionText(item.instruction || '');
    setIsInstructionDialogOpen(true);
  };

  const saveInstruction = () => {
    if (editingItem) {
      updateInstruction(editingItem.name, instructionText);
    }
    setIsInstructionDialogOpen(false);
    setEditingItem(null);
  };

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.MENU_ITEM,
    drop: (item: MenuItem) => handleDropOnOrder(item),
    canDrop: () => true, // Always allow dropping on the order panel itself
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  const showQuickAssign = orderItems.length > 0 && selectedTableId === null;
  const orderTitle = useMemo(() => {
    if (orderType === 'Dine-In') {
      return selectedTableId ? `${t('Table')} ${selectedTableId}` : t('Select a Table');
    }
    if (orderType === 'Take-Away') return t('Take-Away');
    if (orderType === 'Home-Delivery') {
      return customerDetails?.name || t('Delivery');
    }
    return t('Current Order')
  }, [selectedTableId, orderType, customerDetails, t]);

  const panelTitle = useMemo(() => {
    const orderId = activeOrder?.id;
    if (orderId && !isNaN(parseInt(orderId, 10))) {
      return `${t('Editing Order')} #${parseInt(orderId, 10).toString().padStart(3, '0')}`;
    }
    return t("Current Order");
  }, [activeOrder, t]);


  const renderOrderItems = () => {
    if (orderItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
          <ClipboardList className="w-16 h-16 text-gray-300" />
          <p className="mt-4 text-sm font-medium">
            {t('Click on items to add them or drag & drop here.')}
          </p>
        </div>
      );
    }

    const renderItem = (item: OrderItem, isNew: boolean) => {
      const menuItem = allMenuItems.find(m => m.name === item.name);
      const isLow = menuItem?.status === 'low';
      const isOut = menuItem?.status === 'out';

      return (
        <div key={`${item.name}-${isNew ? 'new' : 'old'}`} className={cn("flex items-center p-2 rounded-md", isNew && "bg-blue-50 dark:bg-blue-900/20", isOut ? "border-2 border-red-500 bg-red-50 dark:bg-red-900/10" : isLow ? "border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/10" : "")}>
          <div className="flex-grow">
            <p className="font-medium flex items-center gap-2">
              {item.name}
              {isNew && (
                <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                  {t('new')}
                </span>
              )}
              {isOut && (
                <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {t('Out of Stock')}
                </span>
              )}
              {isLow && !isOut && (
                <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {t('Low Stock')}
                </span>
              )}
            </p>
            {item.instruction && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium italic mt-0.5">
                {t('Note:')} {item.instruction}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{currency}{item.price.toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openInstructionDialog(item)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.name, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
            <QuantityInput itemName={item.name} quantity={item.quantity} updateQuantity={updateQuantity} />
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.name, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromOrder(item.name)}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      );
    };

    if (!activeOrder) {
      return <div className="space-y-2">{orderItems.map(item => renderItem(item, true))}</div>;
    }

    const sentItemsMap = new Map(activeOrder.items.map(item => [item.name, item.quantity]));

    const existingItemsUI: JSX.Element[] = [];
    const newItemsUI: JSX.Element[] = [];

    orderItems.forEach(item => {
      const sentQty = sentItemsMap.get(item.name);
      if (sentQty !== undefined) {
        if (item.quantity > sentQty) {
          existingItemsUI.push(renderItem({ ...item, quantity: sentQty }, false));
          newItemsUI.push(renderItem({ ...item, quantity: item.quantity - sentQty }, true));
        } else if (item.quantity === sentQty) {
          existingItemsUI.push(renderItem(item, false));
        }
      } else {
        newItemsUI.push(renderItem(item, true));
      }
    });

    return (
      <div className="space-y-2">
        {existingItemsUI}
        {newItemsUI.length > 0 && existingItemsUI.length > 0 && <Separator className="my-4" />}
        {newItemsUI}
      </div>
    );
  };

  return (
    <Card ref={drop as any} className={cn("flex flex-col flex-grow transition-colors h-full", isOver && canDrop && 'bg-primary/20')}>
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <CardTitle>{panelTitle}</CardTitle>
          <CardDescription>
            {orderTitle}
          </CardDescription>
        </div>
        {orderItems.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <TrashIcon className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('This will remove all items from the current order. This action cannot be undone.')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => clearCurrentOrder(false)}>{t('Clear All')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <ScrollArea className="flex-grow p-4">
        {renderOrderItems()}
      </ScrollArea>

      <div id="table-grid-container" className="p-4 border-t space-y-4">
        {children}
      </div>

      <Dialog open={isInstructionDialogOpen} onOpenChange={setIsInstructionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Special Instructions')}</DialogTitle>
            <DialogDescription>
              {t('Add notes for the kitchen (e.g., "No spicy", "Extra cheese").')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instruction">{t('Note for ')}{editingItem?.name}</Label>
              <Textarea
                id="instruction"
                placeholder={t('Type instructions here...')}
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInstructionDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={saveInstruction}>{t('Save Note')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <div className="p-4 border-t space-y-4 bg-muted/30">
        <div>
          <Label className="font-semibold mb-2 block">{t('Discount')}</Label>
          <RadioGroup value={discount.toString()} onValueChange={(val) => setDiscount(Number(val))} className="flex items-center flex-wrap gap-2">
            {[0, 5, 10, 15, 20].map(d => (
              <div key={d} className="flex items-center space-x-2">
                <RadioGroupItem value={d.toString()} id={`d-${d}`} />
                <Label htmlFor={`d-${d}`} className="p-2 rounded-md transition-colors hover:bg-accent cursor-pointer" >{d}%</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2 text-lg">
          <div className="flex justify-between">
            <span>{t('Subtotal')}:</span>
            <span className="font-bold">{currency}{subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-accent-foreground">
              <span>{t('Discount')} ({discount}%):</span>
              <span className="font-bold">-{currency}{(subtotal - total).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-2xl border-t pt-2 mt-2 bg-primary/20 p-2 rounded-md">
            <span>{t('Total')}:</span>
            <span>{currency}{total.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          {showQuickAssign && (
            <Button
              size="lg"
              className="h-12 text-base bg-amber-500 hover:bg-amber-600"
              onClick={handleQuickAssign}
            >
              <Hand className="mr-2 h-4 w-4" />
              {t('Quick Assign to Table')}
            </Button>
          )}
          <div className="flex flex-col gap-2">
            {kotButtons}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button size="lg" variant="outline" className="h-12 text-base" onClick={handlePrintProvisionalBill} disabled={orderItems.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              {t('Print Bill')}
            </Button>
            <Button size="lg" className="h-12 text-base" onClick={handleProcessPayment} disabled={isProcessing || orderItems.length === 0}>
              {isProcessing && !receiptPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('Process Payment')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ItemStatusDialog({
  isOpen,
  onOpenChange,
  lowStockItems,
  outOfStockItems
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lowStockItems: MenuItem[];
  outOfStockItems: MenuItem[];
}) {
  const { t } = useLanguage();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Item Status Overview')}</DialogTitle>
          <DialogDescription>
            {t('A quick look at your menu\'s stock levels.')}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="low-stock" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="low-stock" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">{t('Running Low')}</TabsTrigger>
            <TabsTrigger value="out-of-stock" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">{t('Out of Stock')}</TabsTrigger>
          </TabsList>

          <TabsContent value="low-stock" className="mt-4 max-h-80 overflow-y-auto">
            {lowStockItems.length > 0 ? (
              <ul className="space-y-2">
                {lowStockItems.map(item => (
                  <li key={item.name} className="p-2 rounded-md font-medium">
                    {item.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground pt-8">{t('No items are marked as running low.')}</p>
            )}
          </TabsContent>
          <TabsContent value="out-of-stock" className="mt-4 max-h-80 overflow-y-auto">
            {outOfStockItems.length > 0 ? (
              <ul className="space-y-2">
                {outOfStockItems.map(item => (
                  <li key={item.name} className="p-2 rounded-md font-medium">
                    {item.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground pt-8">{t('No items are marked as out of stock.')}</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function HomeDeliveryDialog({
  isOpen,
  onOpenChange,
  onSave,
  existingDetails,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (details: CustomerDetails) => void;
  existingDetails?: CustomerDetails;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(existingDetails?.name || '');
      setPhone(existingDetails?.phone || '');
      setAddress(existingDetails?.address || '');
      setHouseNo(existingDetails?.houseNo || '');
      setStreet(existingDetails?.street || '');
      setLandmark(existingDetails?.landmark || '');
      setEmail(existingDetails?.email || '');
    }
  }, [isOpen, existingDetails]);

  const handleSave = () => {
    onSave({ name, phone, address, houseNo, street, landmark, email });
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Home Delivery Details')}</DialogTitle>
          <DialogDescription>{t('Enter the customer\'s information for the delivery.')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
          <div className="space-y-2">
            <Label htmlFor="customer-name">{t('Customer Name')}</Label>
            <Input id="customer-name" value={name} onChange={e => setName(e.target.value)} placeholder={t('Enter Name')} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-phone">{t('Phone Number')}</Label>
            <Input id="customer-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('e.g., 9876543210')} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-address">{t('Address')}</Label>
            <Textarea id="customer-address" value={address} onChange={e => setAddress(e.target.value)} placeholder={t('e.g., Main Street...')} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-houseno">{t('House No. (Optional)')}</Label>
              <Input id="customer-houseno" value={houseNo} onChange={e => setHouseNo(e.target.value)} placeholder={t('e.g., #123')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-street">{t('Street Name (Optional)')}</Label>
              <Input id="customer-street" value={street} onChange={e => setStreet(e.target.value)} placeholder={t('e.g., Temple Road')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-landmark">{t('Landmark (Optional)')}</Label>
            <Input id="customer-landmark" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder={t('e.g., Near Post Office')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-email">{t('Email (Optional)')}</Label>
            <Input id="customer-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('e.g., a@b.com')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
          <Button onClick={handleSave} disabled={!name || !phone || !address}>{t('Save Details')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PosSystem({
  venueName,
  tables,
  orders,
  setOrders,
  updateTableStatus,
  occupancyCount,
  activeOrder,
  setActiveOrder,
  orderItems,
  setOrderItems,
  discount,
  setDiscount,
  selectedTableId,
  setSelectedTableId,
  clearCurrentOrder,
  onOrderCreated,
  showOccupancy,
  pendingOrders,
  setPendingOrders,
  categoryColors,
  setCategoryColors,
  onViewTableDetails,
  onEditOrder,
  keyboardMode,
  setKeyboardMode,
  billHistory,
  setBillHistory,
  kotPreference,
  selectedOrderType,
  setSelectedOrderType,
  showTableDetailsOnPOS,
  showReservationTimeOnPOS,
  inventory,
  setInventory,
  menu,
  setMenu,
  onNavigate,
  customers,
  setCustomers,
  currency,
}: PosSystemProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [easyMode, setEasyMode] = useState(false);
  const [lastKotHistory, setLastKotHistory] = useState<Record<string, OrderItem[]>>({});
  const [isEasyModeInitialized, setIsEasyModeInitialized] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isReprintDialogOpen, setIsReprintDialogOpen] = useState(false);
  const [reprintCategory, setReprintCategory] = useState<string | undefined>(undefined);
  const [receiptPreview, setReceiptPreview] = useState('');
  const { toast } = useToast();

  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  // Status is now managed directly in the menu object
  // const [menuItemStatus, setMenuItemStatus] = useState<Record<string, string>>({});
  // const [menuCategoryStatus, setMenuCategoryStatus] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMenuManagerOpen, setIsMenuManagerOpen] = useState(false);
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [reservationDetails, setReservationDetails] = useState({ name: '', time: '' });
  const [tableToReserve, setTableToReserve] = useState<number | null>(null);
  const [vegFilter, setVegFilter] = useState<VegFilter>('All');
  const [isQuickAssignDialogOpen, setIsQuickAssignDialogOpen] = useState(false);
  const [isEasyModeAlertOpen, setIsEasyModeAlertOpen] = useState(false);
  const hasSeenEasyModeAlert = useRef(false);
  const [isItemStatusDialogOpen, setIsItemStatusDialogOpen] = useState(false);
  const [isHomeDeliveryDialogOpen, setIsHomeDeliveryDialogOpen] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | undefined>();
  const [colorShade, setColorShade] = useState<ColorShade>('light');
  const [mobileTab, setMobileTab] = useState<MobileTab>('menu');

  const searchInputRef = useRef<HTMLInputElement>(null);

  const menuCategories = useMemo(() => menu.map(c => c.name), [menu]);

  useEffect(() => {
    setActiveAccordionItems(menuCategories);
  }, [menuCategories]);

  const getNewItems = useCallback((currentItems: OrderItem[], sentItems: OrderItem[]): OrderItem[] => {
    const newItems: OrderItem[] = [];
    const sentMap = new Map(sentItems.map(item => [item.name, item.quantity]));

    currentItems.forEach(item => {
      const sentQty = sentMap.get(item.name) || 0;
      if (item.quantity > sentQty) {
        newItems.push({ ...item, quantity: item.quantity - sentQty });
      }
    });
    return newItems;
  }, []);

  const getLocalReceipt = useCallback(() => {
    if (orderItems.length === 0) return '';

    const pad = (str: string, len: number, char = ' ') => str.padEnd(len, char);
    const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const total = subtotal * (1 - discount / 100);
    const money = (val: number) => `${currency}${val.toFixed(2)}`;

    let receiptLines = [];
    receiptLines.push('*************************');
    receiptLines.push(`    ${venueName}    `);
    receiptLines.push('*************************');
    receiptLines.push('');
    receiptLines.push('Order Details:');
    orderItems.forEach((item, index) => {
      const lineTotal = item.price * item.quantity;
      const qtyName = `${item.quantity} x ${item.name}`;
      const priceStr = money(lineTotal);
      const line = `${pad(`${index + 1}. ${qtyName}`, 25)} ${priceStr.padStart(10)}`;
      receiptLines.push(line);
    });
    receiptLines.push('');
    receiptLines.push('-------------------------');
    receiptLines.push(`${pad('Subtotal:', 25)} ${money(subtotal).padStart(10)}`);

    if (discount > 0) {
      const discountAmount = subtotal * (discount / 100);
      receiptLines.push(`${pad(`Discount (${discount}%):`, 25)} ${money(-discountAmount).padStart(10)}`);
      receiptLines.push('-------------------------');
    }

    receiptLines.push(`${pad('Total:', 25)} ${`${currency}${total.toFixed(2)}`.padStart(10)}`);
    receiptLines.push('');
    receiptLines.push('   Thank you for dining!   ');
    receiptLines.push('*************************');

    return receiptLines.join('\n');
  }, [orderItems, discount, venueName, currency]);

  /* 
   * KOT Grouping Logic
   * Delegated to shared utility for consistency across POS and MainLayout.
   */
  const groupItemsForKOT = useCallback((items: OrderItem[]): { title: string; items: OrderItem[] }[] => {
    return groupItemsForKOTUtil(items, kotPreference);
  }, [kotPreference]);

  useEffect(() => {
    if (activeOrder) {
      setSelectedOrderType(activeOrder.orderType);
      setCustomerDetails(activeOrder.customerDetails || undefined);
    }
  }, [activeOrder, setSelectedOrderType]);

  const handleSetOrderType = (type: OrderType) => {
    if (type === 'Home-Delivery') {
      setIsHomeDeliveryDialogOpen(true);
    } else {
      setSelectedOrderType(type);
      setCustomerDetails(undefined);
    }

    if (type !== 'Dine-In') {
      setSelectedTableId(null);
    } else if (!selectedTableId) {
      const firstAvailable = tables.find(t => t.status === 'Available');
      setSelectedTableId(firstAvailable ? firstAvailable.id : (tables.length > 0 ? tables[0].id : null));
    }
  };

  const handleSaveDeliveryDetails = (details: CustomerDetails) => {
    setCustomerDetails(details);
    setSelectedOrderType('Home-Delivery');
  }

  /* 
   * Flatten menu for easy lookup.
   * Note: We map to MenuItem, not OrderItem, so we can access properties like 'status' and 'isVeg'.
   */
  const allMenuItems: MenuItem[] = useMemo(() =>
    menu.flatMap(cat => {
      const mainItems = cat.items.map(i => ({ ...i, category: cat.name }));
      const subItems = (cat.subcategories || []).flatMap(sc =>
        sc.items.map(i => ({ ...i, category: cat.name }))
      );
      return [...mainItems, ...subItems];
    }),
    [menu]
  );

  const filteredMenu = useMemo(() => {
    let menuToFilter = menu;

    const applyVegFilter = (items: MenuItem[]) => {
      if (vegFilter === 'All') return items;
      if (vegFilter === 'Veg') return items.filter(item => item.isVeg);
      if (vegFilter === 'Non-Veg') return items.filter(item => !item.isVeg);
      return items;
    };

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      menuToFilter = menuToFilter.map(category => ({
        ...category,
        items: category.items.filter(item => item.name.toLowerCase().includes(lowercasedTerm) || item.code.toLowerCase().includes(lowercasedTerm)),
        subcategories: category.subcategories?.map(sub => ({
          ...sub,
          items: sub.items.filter(item => item.name.toLowerCase().includes(lowercasedTerm) || item.code.toLowerCase().includes(lowercasedTerm))
        })).filter(sub => sub.items.length > 0)
      })).filter(category => category.items.length > 0 || (category.subcategories && category.subcategories.length > 0));
    }

    // Apply veg/non-veg filter after search
    return menuToFilter.map(category => ({
      ...category,
      items: applyVegFilter(category.items),
      subcategories: category.subcategories?.map(sub => ({
        ...sub,
        items: applyVegFilter(sub.items)
      })).filter(sub => sub.items.length > 0)
    })).filter(category => category.items.length > 0 || (category.subcategories && category.subcategories.length > 0));
  }, [searchTerm, menu, vegFilter]);

  useEffect(() => {
    if (searchTerm && viewMode === 'accordion') {
      setActiveAccordionItems(filteredMenu.map(c => c.name));
    }
  }, [searchTerm, viewMode, filteredMenu]);

  useEffect(() => {
    const defaultColors: Record<string, string> = {};
    const usedColors = new Set<string>();

    try {
      const savedColors = localStorage.getItem('categoryColors');
      if (savedColors) {
        const parsedColors = JSON.parse(savedColors);
        menu.forEach((category, index) => {
          if (parsedColors[category.name] && colorNames.includes(parsedColors[category.name])) {
            defaultColors[category.name] = parsedColors[category.name];
            usedColors.add(parsedColors[category.name]);
          }
        });
      }
    } catch (e) {
      console.error("Could not parse 'categoryColors' from localStorage", e);
    }

    menu.forEach(category => {
      if (!defaultColors[category.name]) {
        let color = colorNames.find(c => !usedColors.has(c));
        if (!color) {
          color = colorNames[Object.keys(defaultColors).length % colorNames.length];
        }
        defaultColors[category.name] = color;
        usedColors.add(color);
      }
    });

    setCategoryColors(defaultColors);
  }, [menu, setCategoryColors]);

  useEffect(() => {
    if (Object.keys(categoryColors).length > 0) {
      try {
        localStorage.setItem('categoryColors', JSON.stringify(categoryColors));
      } catch (e) {
        console.error("Could not save 'categoryColors' to localStorage", e);
      }
    }
  }, [categoryColors]);

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('easyMode');
      const hasSeen = localStorage.getItem('hasSeenEasyModeAlert');
      if (savedMode !== null) {
        const parsed = JSON.parse(savedMode);
        setEasyMode(parsed);
      }
      if (hasSeen === 'true') {
        hasSeenEasyModeAlert.current = true;
      }
    } catch (e) {
      console.error("Could not load easyMode settings", e);
    }
    setIsEasyModeInitialized(true);
  }, []);

  useEffect(() => {
    if (isEasyModeInitialized) {
      localStorage.setItem('easyMode', JSON.stringify(easyMode));
    }
  }, [easyMode, isEasyModeInitialized]);

  const handleEasyModeChange = (checked: boolean) => {
    if (checked && !hasSeenEasyModeAlert.current) {
      setIsEasyModeAlertOpen(true);
    } else {
      setEasyMode(checked);
    }
  };

  const confirmEasyMode = () => {
    setEasyMode(true);
    hasSeenEasyModeAlert.current = true;
    localStorage.setItem('hasSeenEasyModeAlert', 'true');
    setIsEasyModeAlertOpen(false);
  };

  useEffect(() => {
    if (orderItems.length > 0) {
      const localReceipt = getLocalReceipt();
      setReceiptPreview(localReceipt);
    } else {
      setReceiptPreview('');
    }
  }, [orderItems, discount, getLocalReceipt]);


  const setItemStatus = (itemName: string, status: string) => {
    const newStatus = status as 'available' | 'low' | 'out' | undefined;
    const newMenu = menu.map(cat => ({
      ...cat,
      items: cat.items.map(i => i.name === itemName ? { ...i, status: newStatus } : i),
      subcategories: cat.subcategories?.map(sub => ({
        ...sub,
        items: sub.items.map(i => i.name === itemName ? { ...i, status: newStatus } : i)
      }))
    }));
    setMenu(newMenu);
  };

  const setCategoryStatus = (categoryName: string, status: string) => {
    const newStatus = status as 'available' | 'low' | 'out' | undefined;
    const newMenu = menu.map(cat =>
      cat.name === categoryName ? { ...cat, status: newStatus } : cat
    );
    setMenu(newMenu);
  };

  const handleShuffleColors = () => {
    const shuffledPalette = [...colorNames].sort(() => 0.5 - Math.random());
    const newCategoryColors: Record<string, string> = {};
    menu.forEach((category, index) => {
      newCategoryColors[category.name] = shuffledPalette[index % shuffledPalette.length];
    });
    setCategoryColors(newCategoryColors);
    toast({ title: t("Colors Shuffled!"), description: t("New random colors have been applied to the categories.") });
  };

  const subtotal = useMemo(() => orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0), [orderItems]);
  const total = useMemo(() => subtotal * (1 - discount / 100), [subtotal, discount]);

  const addToOrder = useCallback((item: MenuItem, quantity: number) => {
    const itemWithCategory = allMenuItems.find(i => i.name === item.name);
    if (!itemWithCategory) return;

    // Check if item exists in inventory and has sufficient stock
    const inventoryItem = inventory.find(inv => inv.name === item.name);
    if (inventoryItem) {
      const currentStock = inventoryItem.stock || 0;

      // Calculate how much is already in the cart
      const existingCartItem = orderItems.find(orderItem => orderItem.name === item.name);
      const alreadyInCart = existingCartItem ? existingCartItem.quantity : 0;
      const totalNeeded = alreadyInCart + quantity;

      // Check if we have enough stock
      if (currentStock < totalNeeded) {
        toast({
          title: "⚠️ Insufficient Stock",
          description: `Only ${currentStock} units of ${item.name} available in stock. ${alreadyInCart > 0 ? `(${alreadyInCart} already in cart)` : ''}`,
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      // Deduct from inventory
      const updatedInventory = inventory.map((inv: InventoryItem) =>
        inv.name === item.name
          ? { ...inv, stock: inv.stock - quantity }
          : inv
      );
      setInventory(updatedInventory);
    }

    setOrderItems((prevItems: OrderItem[]) => {
      const existingItem = prevItems.find(orderItem => orderItem.name === item.name);
      if (existingItem) {
        return prevItems.map(orderItem =>
          orderItem.name === item.name
            ? { ...orderItem, quantity: orderItem.quantity + quantity }
            : orderItem
        );
      } else {
        return [...prevItems, { ...itemWithCategory, quantity } as OrderItem];
      }
    });
  }, [setOrderItems, allMenuItems, inventory, setInventory, orderItems, toast]);

  const handleItemClick = (item: MenuItem) => {
    if (easyMode) {
      addToOrder(item, 1);
    }
  };

  const handleDropOnOrder = (item: MenuItem) => {
    if (easyMode) {
      addToOrder(item, 1);
      toast({
        title: t("Item Added"),
        description: `${t('added to the current order.')}`
      });
    }
  }

  const handleAddButtonClick = (item: MenuItem) => {
    if (!easyMode) {
      setSelectedItem(item);
      setIsAddItemDialogOpen(true);
    }
  };

  const handleCodeEntry = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = searchTerm.trim().toUpperCase();
      if (!code) return;

      const item = allMenuItems.find(i => i.code === code);
      if (item) {
        addToOrder(item, 1);
        toast({
          title: t("Item Added"),
          description: `${t('added to the order.')}`,
        });
        setSearchTerm('');
      } else {
      }
    }
  };

  const updateQuantity = (name: string, newQuantity: number) => {
    const item = orderItems.find(item => item.name === name);
    if (!item) return;

    if (newQuantity <= 0) {
      removeFromOrder(name);
    } else {
      setOrderItems(orderItems.map(i => i.name === name ? { ...i, quantity: newQuantity } : i));
    }
  };

  const removeFromOrder = (name: string) => {
    setOrderItems(orderItems.filter(item => item.name !== name));
  };

  const updateInstruction = (name: string, instruction: string) => {
    setOrderItems(orderItems.map(item =>
      item.name === name ? { ...item, instruction } : item
    ));
  };

  const printKot = (order: Order, itemsToPrint: OrderItem[], kotTitle: string) => {
    if (itemsToPrint.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const isUpdate = !!(activeOrder && activeOrder.items.length > 0);

      let title: string;
      switch (order.orderType) {
        case 'Dine-In':
          title = `Table ${order.tableId}`;
          break;
        case 'Take-Away':
          title = 'Take Away';
          break;
        case 'Home-Delivery':
          title = order.customerDetails?.name || 'Home Delivery';
          break;
        default:
          title = 'Unassigned Order';
      }

      const receipt = `
        <html>
          <head>
            <title>${kotTitle}</title>
            <style>
              body { font-family: monospace; margin: 20px; font-size: 14px; }
              h2, h3 { text-align: center; margin: 5px 0; }
              ul { list-style: none; padding: 0; }
              li { display: flex; justify-content: space-between; margin: 5px 0; font-size: 16px; font-weight: bold; }
            </style>
          </head>
          <body>
            <h2>${isUpdate ? `${t('UPDATE')} - ${kotTitle}` : kotTitle}</h2>
            <h3>{t('Order ID:')} ${String(order.id).padStart(3, '0')} | ${title}</h3>
            <hr>
            <ul>
            ${itemsToPrint.map(item => `
              <li style="flex-direction: column; align-items: flex-start;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                  <span>${isUpdate && item.quantity > 0 ? '+' : ''}${item.quantity} x ${item.name}</span>
                </div>
                ${item.instruction ? `<div style="font-size: 12px; font-style: italic; font-weight: normal; margin-top: 2px;">${t('Note:')} ${item.instruction}</div>` : ''}
              </li>
            `).join('')}
          </ul>
            <hr>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `;
      printWindow.document.write(receipt);
      printWindow.document.close();
    }
  };

  const processKOTs = useCallback(async (specificCategory?: string, reprintMode: boolean | 'last' | 'full' = false) => {
    const isReadyForKOT = selectedOrderType === 'Dine-In' ? !!selectedTableId : true;
    if (isProcessing || !isReadyForKOT) {
      if (!isReadyForKOT) toast({ variant: "destructive", title: t("No Table Selected") });
      return;
    }

    const isReprint = reprintMode !== false;

    // Use specific category as key, or default to '__GLOBAL__' for main KOT
    const historyKey = specificCategory || '__GLOBAL__';

    // Determine source items: NEW items for normal send, ALL items for reprint
    let itemsToProcess: OrderItem[] = [];
    let newItems: OrderItem[] = [];

    if (isReprint) {
      const lastItems = lastKotHistory[historyKey] || [];
      if (reprintMode === 'last' && lastItems.length > 0) {
        itemsToProcess = [...lastItems];
      } else {
        itemsToProcess = [...orderItems];
      }
    } else {
      newItems = getNewItems(orderItems, activeOrder?.items || []);
      itemsToProcess = newItems;
    }

    // Filter items based on the selection (Kitchen vs Bar vs Specific Category)
    const isBeverage = (cat: string) => cat.trim().toLowerCase() === 'beverages';
    if (specificCategory === '__KITCHEN__') {
      itemsToProcess = itemsToProcess.filter(item => !isBeverage(item.category || ''));
    } else if (specificCategory === '__BAR__') {
      itemsToProcess = itemsToProcess.filter(item => isBeverage(item.category || ''));
    } else if (specificCategory === '__ALL_SPECIFIC__') {
      const kotCategories = kotPreference.type === 'category' ? (kotPreference.categories || []) : [];
      itemsToProcess = itemsToProcess.filter(item => kotCategories.includes(item.category || ''));
    } else if (specificCategory) {
      itemsToProcess = itemsToProcess.filter(item => item.category === specificCategory);
    } else {
      const kotCategories = kotPreference.type === 'category' ? (kotPreference.categories || []) : [];
      itemsToProcess = itemsToProcess.filter(item => !kotCategories.includes(item.category || ''));
    }

    if (itemsToProcess.length === 0) {
      toast({ title: isReprint ? t("No items to reprint.") : t("No new items to send.") });
      return;
    }

    setIsProcessing(true);

    try {
      let finalOrderState: Order;

      if (isReprint) {
        // For reprint, we don't update state or inventory. We just use the current activeOrder (or construct one if missing, though unlikely for reprint)
        if (!activeOrder) {
          // Fallback if activeOrder is missing during reprint (shouldn't happen in valid flow)
          finalOrderState = {
            id: 'preview',
            items: orderItems,
            tableId: selectedTableId,
            status: 'In Preparation',
            orderType: selectedOrderType,
            customerDetails: customerDetails || null,
            createdAt: new Date()
          };
        } else {
          finalOrderState = activeOrder;
        }
      } else {
        // Construct the New Saved State: Previously Sent + Just Processed now
        const previouslySentItems = activeOrder?.items || [];
        const finalSavedItemsList = [...previouslySentItems.map(item => ({ ...item }))];

        itemsToProcess.forEach(newItem => {
          const existingItemIndex = finalSavedItemsList.findIndex(i => i.name === newItem.name);
          if (existingItemIndex > -1) {
            finalSavedItemsList[existingItemIndex].quantity += newItem.quantity;
          } else {
            finalSavedItemsList.push({ ...newItem });
          }
        });

        if (activeOrder) {
          finalOrderState = { ...activeOrder, items: finalSavedItemsList };
          setOrders(prev => prev.map(o => o.id === activeOrder!.id ? finalOrderState : o));
        } else {
          const maxId = Math.max(0, ...orders.map(o => parseInt(o.id)).filter(id => !isNaN(id)), ...billHistory.map(b => parseInt(b.id)).filter(id => !isNaN(id)));
          const newId = (maxId + 1).toString();
          finalOrderState = {
            id: newId,
            items: finalSavedItemsList,
            tableId: selectedTableId,
            status: 'In Preparation',
            orderType: selectedOrderType,
            customerDetails: customerDetails || null,
            createdAt: new Date(),
          };
          onOrderCreated(finalOrderState);
          if (selectedTableId) updateTableStatus([selectedTableId], 'Occupied');
        }

        setActiveOrder(finalOrderState);

        // Crucial: Update pendingOrders with the FULL list (including deferred)
        if (selectedTableId) {
          setPendingOrders(prev => ({
            ...prev,
            [selectedTableId]: orderItems
          }));
        }

        const newInventory = [...inventory];
        let inventoryUpdated = false;
        itemsToProcess.forEach(kotItem => {
          const menuItemDetails = allMenuItems.find(mi => mi.name === kotItem.name);
          if (menuItemDetails && menuItemDetails.ingredients) {
            menuItemDetails.ingredients.forEach(ingredient => {
              const inventoryIndex = newInventory.findIndex(invItem => invItem.id === ingredient.inventoryItemId);
              if (inventoryIndex !== -1) {
                let stockDeduction = ingredient.quantity * kotItem.quantity;
                if (newInventory[inventoryIndex].unit === 'kg' && ingredient.unit === 'g') {
                  stockDeduction /= 1000;
                } else if (newInventory[inventoryIndex].unit === 'ltr' && ingredient.unit === 'ml') {
                  stockDeduction /= 1000;
                }
                newInventory[inventoryIndex].stock -= stockDeduction;
                inventoryUpdated = true;
              }
            });
          }
        });

        if (inventoryUpdated) {
          setInventory(newInventory);
        }
      }

      if (!isReprint) {
        setLastKotHistory(prev => {
          const newHistory = { ...prev, [historyKey]: itemsToProcess };

          // If sending ALL specific categories, also update the history for each individual category
          // This ensures that "Reprint Last KOT" works for individual category buttons too
          if (specificCategory === '__ALL_SPECIFIC__') {
            const itemsByCategory: Record<string, OrderItem[]> = {};
            itemsToProcess.forEach(item => {
              if (item.category) {
                if (!itemsByCategory[item.category]) itemsByCategory[item.category] = [];
                itemsByCategory[item.category].push(item);
              }
            });

            Object.entries(itemsByCategory).forEach(([cat, items]) => {
              newHistory[cat] = items;
            });
          }

          return newHistory;
        });
      }

      const kotGroupsToPrint = groupItemsForKOT(itemsToProcess);

      const printSequential = (index: number) => {
        if (index >= kotGroupsToPrint.length) return;

        const group = kotGroupsToPrint[index];
        // Add REPRINT prefix to title if needed
        const titleToPrint = isReprint ? `${t('REPRINT')} - ${group.title}` : group.title;
        printKot(finalOrderState, group.items, titleToPrint);

        setTimeout(() => {
          printSequential(index + 1);
        }, 1500); // 1.5 second delay between prints
      };

      printSequential(0);

      toast({ title: `${kotGroupsToPrint.map(g => g.title).join(' & ')} ${isReprint ? 'Reprinted' : 'Sent'}!` });

    } catch (error) {
      console.error("Error processing KOT:", error);
      toast({ variant: "destructive", title: t("KOT Failed"), description: t("Could not send/print order.") });

    } finally {
      setIsProcessing(false);
    }
  }, [
    activeOrder, billHistory, customerDetails, isProcessing, onOrderCreated,
    orders, selectedOrderType, selectedTableId, setActiveOrder, setOrders,
    toast, updateTableStatus, inventory, setInventory, allMenuItems,
    orderItems, getNewItems, groupItemsForKOT, kotPreference, setPendingOrders
  ]);

  const handleDropItemOnTable = (tableId: number, item: MenuItem) => {
    if (!easyMode) return;
    const table = tables.find(t => t.id === tableId);
    if (!table || (table.status !== 'Available' && table.status !== 'Occupied')) {
      toast({
        variant: 'destructive',
        title: 'Table Not Available',
        description: `Cannot add items to a ${table?.status} table.`
      });
      return;
    }

    if (selectedTableId !== tableId) {
      setSelectedTableId(tableId);
      setTimeout(() => {
        addToOrder(item, 1);
        toast({
          title: 'Item Added',
          description: `1 x ${item.name} added to order for Table ${tableId}.`
        });
      }, 50)
    } else {
      addToOrder(item, 1);
      toast({
        title: 'Item Added',
        description: `1 x ${item.name} added to order for Table ${tableId}.`
      });
    }
  };


  const handleProcessPayment = () => {
    if (orderItems.length === 0) {
      toast({ variant: "destructive", title: t("Empty Order"), description: t("Cannot process payment for an empty order.") });
      return;
    }

    setReceiptPreview(getLocalReceipt());
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = async (customerDetails?: { name: string; phone: string }) => {
    const finalOrderItems = orderItems;
    if (finalOrderItems.length === 0) {
      toast({ variant: "destructive", title: t("Billing Error"), description: t("No items to bill. Please check the order.") });
      return;
    }

    const sub = finalOrderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const tot = sub * (1 - discount / 100);

    const finalReceipt = getLocalReceipt();

    if (!finalReceipt) {
      toast({ variant: "destructive", title: t("Billing Error"), description: t("Could not generate the final bill. Please try again.") });
      return;
    }

    setIsPaymentDialogOpen(false);
    toast({ title: t("Payment Successful"), description: `${currency}${tot.toFixed(2)} confirmed.` });

    // Promote to a full customer if they don't exist
    if (customerDetails?.phone && !customers.some(c => c.phone === customerDetails.phone)) {
      const newCustomer: Customer = {
        id: customerDetails.phone,
        phone: customerDetails.phone,
        name: customerDetails.name,
        email: '',
        address: '',
        firstSeen: new Date(),
        lastSeen: new Date(),
        totalVisits: 0,
        totalSpent: 0
      };
      setCustomers([...customers, newCustomer]);
    }


    const maxId = Math.max(0, ...billHistory.map(b => parseInt(b.id)).filter(id => !isNaN(id)), ...orders.map(o => parseInt(o.id)).filter(id => !isNaN(id)));
    const newId = (maxId + 1).toString();

    const billPayload: Bill = {
      id: newId,
      orderItems: finalOrderItems,
      tableId: selectedTableId,
      total: tot,
      receiptPreview: finalReceipt,
      timestamp: new Date(),
      orderType: selectedOrderType,
      customerDetails: {
        name: customerDetails?.name || '',
        phone: customerDetails?.phone || '',
        address: '',
      },
      createdAt: activeOrder?.createdAt || new Date(),
      completedAt: new Date(),
    };

    setBillHistory([...billHistory, billPayload]);

    if (selectedTableId) {
      updateTableStatus([selectedTableId], 'Cleaning');
    }

    if (activeOrder) {
      setOrders(prev => prev.filter(o => o.id !== activeOrder.id));
    }

    clearCurrentOrder(true);
  };

  const handlePrintProvisionalBill = () => {
    if (orderItems.length === 0) {
      toast({
        variant: 'destructive',
        title: t('Cannot Print'),
        description: t('There are no items in the order to print a bill.'),
      });
      return;
    }

    const currentReceipt = getLocalReceipt();
    setReceiptPreview(currentReceipt);

    const billTitle = selectedTableId === null ? t('Unassigned Order') : `${t('Table')} #${selectedTableId}`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${t('Provisional Bill for')} ${billTitle}</title>
            <style>
              body { font-family: monospace; margin: 20px; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>
            <pre>${currentReceipt}</pre>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleReserveTable = async () => {
    if (!tableToReserve) return;

    updateTableStatus([tableToReserve], 'Reserved', reservationDetails);
    toast({ title: `${t('Table')} ${tableToReserve} ${t('reserved for')} ${reservationDetails.name || t('guest')}` });

    setIsReserveDialogOpen(false);
    setReservationDetails({ name: '', time: '' });
    setTableToReserve(null);
  };

  const openReservationDialog = (tableId: number) => {
    setTableToReserve(tableId);
    setIsReserveDialogOpen(true);
  };

  const handleQuickAssign = () => {
    if (orderItems.length > 0 && selectedTableId === null) {
      setIsQuickAssignDialogOpen(true);
    } else {
      toast({
        title: t("Nothing to Assign"),
        description: t("You can only use Quick Assign when there is a pending Dine-In order with no table selected."),
      });
    }
  };

  const handleAssignOrderToTable = (tableId: number) => {
    setIsQuickAssignDialogOpen(false);
    setSelectedTableId(tableId);
    setTimeout(() => {
      processKOTs();
    }, 100);
  };

  const lowStockItems = useMemo(() => {
    const items = new Set<MenuItem>();
    allMenuItems.forEach(item => {
      if (!item.category) return;
      const cat = menu.find(c => c.name === item.category);
      const itemIsLow = item.status === 'low';
      const categoryIsLow = cat?.status === 'low';
      if ((itemIsLow || categoryIsLow) && !(item.status === 'out' || cat?.status === 'out')) {
        items.add(item);
      }
    });
    return Array.from(items);
  }, [allMenuItems, menu]);

  const outOfStockItems = useMemo(() => {
    const items = new Set<MenuItem>();
    allMenuItems.forEach(item => {
      if (!item.category) return;
      const cat = menu.find(c => c.name === item.category);
      const itemIsOut = item.status === 'out';
      const categoryIsOut = cat?.status === 'out';
      if (itemIsOut || categoryIsOut) {
        items.add(item);
      }
    });
    return Array.from(items);
  }, [allMenuItems, menu]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;

    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    if (isInputFocused && activeEl !== searchInputRef.current) {
      return;
    }

    const isNumberKey = e.key >= '0' && e.key <= '9';

    if (keyboardMode === 'table') {
      e.preventDefault();

      if (isNumberKey) {
        const tableNum = e.key === '0' ? 10 : parseInt(e.key, 10);
        if (tableNum > 0 && tableNum <= tables.length) {
          setSelectedTableId(tableNum);
        }
      } else if (e.key.startsWith('Arrow')) {
        const tableGrid = document.getElementById('table-grid-container')?.querySelector('.grid');
        if (!tableGrid || selectedTableId === null) return;

        const gridStyle = window.getComputedStyle(tableGrid);
        const gridTemplateColumns = gridStyle.getPropertyValue('grid-template-columns');
        const numColumns = gridTemplateColumns.split(' ').length;

        const sortedTables = [...tables].sort((a, b) => a.id - b.id);
        const currentIndex = sortedTables.findIndex(t => t.id === selectedTableId);
        if (currentIndex === -1) return;

        let nextIndex = -1;

        switch (e.key) {
          case 'ArrowLeft':
            if (currentIndex > 0) nextIndex = currentIndex - 1;
            break;
          case 'ArrowRight':
            if (currentIndex < sortedTables.length - 1) nextIndex = currentIndex + 1;
            break;
          case 'ArrowUp':
            if (currentIndex >= numColumns) nextIndex = currentIndex - numColumns;
            break;
          case 'ArrowDown':
            if (currentIndex < sortedTables.length - numColumns) nextIndex = currentIndex + numColumns;
            break;
        }

        if (nextIndex !== -1 && nextIndex < sortedTables.length) {
          const nextTableId = sortedTables[nextIndex].id;
          setSelectedTableId(nextTableId);
        }
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (keyboardMode === 'table' && selectedTableId) {
        const table = tables.find(t => t.id === selectedTableId);
        if (table && table.status === 'Available') {
          updateTableStatus([selectedTableId], 'Occupied');
        }
        searchInputRef.current?.focus();
        setKeyboardMode('order');
      } else if (keyboardMode === 'confirm') {
        const newItems = getNewItems(orderItems, activeOrder?.items || []);
        if (newItems.length > 0) {
          processKOTs();
        }
        setKeyboardMode('table');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (keyboardMode === 'order') {
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
        setKeyboardMode('confirm');
      } else if (keyboardMode === 'confirm') {
        searchInputRef.current?.focus();
        setKeyboardMode('order');
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyboardMode, selectedTableId, tables, setSelectedTableId, updateTableStatus, setKeyboardMode, orderItems, activeOrder, getNewItems, processKOTs]);


  const renderKotButtons = () => {
    const isReady = selectedOrderType === 'Dine-In' ? !!selectedTableId : true;
    if (!isReady || orderItems.length === 0) return [];

    const newItems = getNewItems(orderItems, activeOrder?.items || []);

    // Determine mode: Send (new items) or Reprint (no new items, but existing items)
    const isReprintMode = newItems.length === 0 && orderItems.length > 0;

    // Source items for determining which buttons to show
    // If reprint, we check ALL order items to see if Kitchen/Bar buttons are needed
    const sourceItems = isReprintMode ? orderItems : newItems;

    if (sourceItems.length === 0) return [];

    const buttons: React.ReactNode[] = [];
    // Helper to get button props
    const getButtonProps = (title: string, colorClass: string, category?: string) => ({
      title: isReprintMode ? `${t('Reprint')} ${t(title)}` : `${t('Send')} ${t(title)}`,
      color: isReprintMode ? 'bg-gray-600 hover:bg-gray-700' : colorClass, // Grey for reprint to distinguish
      icon: isReprintMode ? <Printer className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />,
      onClick: () => {
        if (isReprintMode) {
          setReprintCategory(category);
          setIsReprintDialogOpen(true);
        } else {
          processKOTs(category, false);
        }
      }
    });

    const isBeverage = (cat: string) => cat.trim().toLowerCase() === 'beverages';

    // Handle Separate Check Actions
    if (kotPreference.type === 'separate') {
      const kitchenItems = sourceItems.filter(item => !isBeverage(item.category || ''));
      const barItems = sourceItems.filter(item => isBeverage(item.category || ''));

      if (kitchenItems.length > 0) {
        const props = getButtonProps('Kitchen KOT', 'bg-orange-600 hover:bg-orange-700', '__KITCHEN__');
        buttons.push(
          <Button
            key="send-kitchen-kot"
            size="lg"
            className={`h-12 text-base w-full ${props.color}`}
            onClick={props.onClick}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : props.icon}
            {props.title} ({kitchenItems.reduce((sum, item) => sum + item.quantity, 0)})
          </Button>
        );
      }

      if (barItems.length > 0) {
        const props = getButtonProps('Bar KOT', 'bg-blue-600 hover:bg-blue-700', '__BAR__');
        buttons.push(
          <Button
            key="send-bar-kot"
            size="lg"
            className={`h-12 text-base w-full ${props.color}`}
            onClick={props.onClick}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : props.icon}
            {props.title} ({barItems.reduce((sum, item) => sum + item.quantity, 0)})
          </Button>
        );
      }

      return buttons;
    }

    const kotCategories = kotPreference.type === 'category' ? (kotPreference.categories || []) : [];

    // Main KOT button (for non-category specific items)
    const mainKotItems = sourceItems.filter(item => !kotCategories.includes(item.category || ''));
    if (mainKotItems.length > 0) {
      const isOnlyBeverages = mainKotItems.every(item => isBeverage(item.category || ''));
      let baseTitle = isOnlyBeverages ? "Drink KOT" : "KOT";
      let colorClass = isOnlyBeverages ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';

      const props = getButtonProps(baseTitle, colorClass, undefined);

      buttons.push(
        <Button
          key="send-kot"
          size="lg"
          className={`h-12 text-base w-full ${props.color}`}
          onClick={props.onClick}
          disabled={isProcessing}
        >
          {isProcessing && !kotCategories.length ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : props.icon}
          {props.title} ({mainKotItems.reduce((sum, item) => sum + item.quantity, 0)})
        </Button>
      );
    }

    // Buttons for each specific KOT category
    kotCategories.forEach(category => {
      const categoryItems = sourceItems.filter(item => item.category === category);
      if (categoryItems.length > 0) {
        const isBar = isBeverage(category);
        const title = isBar ? t('Bar KOT') : `${t(category)} ${t('KOT')}`;
        const color = isBar ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700';

        const props = getButtonProps(title, color, category);
        buttons.push(
          <Button
            key={`kot-${category}`}
            size="lg"
            className={`h-12 text-base w-full ${props.color}`}
            onClick={props.onClick}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : props.icon}
            {props.title} ({categoryItems.reduce((sum, item) => sum + item.quantity, 0)})
          </Button>
        );
      }
    });

    // "Send All KOT" button (only if there are specific category items)
    const specificKotItems = sourceItems.filter(item => kotCategories.includes(item.category || ''));
    if (specificKotItems.length > 0 && kotCategories.length > 1) {
      const props = getButtonProps('All KOT', 'bg-orange-500 hover:bg-orange-600', '__ALL_SPECIFIC__');
      buttons.push(
        <Button
          key="send-all-specific-kot"
          size="lg"
          className={`h-12 text-base w-full ${props.color}`}
          onClick={props.onClick}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : props.icon}
          {props.title} ({specificKotItems.reduce((sum, item) => sum + item.quantity, 0)})
        </Button>
      );
    }

    return buttons;
  };




  const renderMenuItem = (item: MenuItem, categoryName: string, currency: string) => {
    const itemStatus = item.status;
    const currentCategory = menu.find(c => c.name === categoryName);
    const categoryStatus = currentCategory?.status;

    let finalItemBg = 'bg-background';
    let isDisabled = false;

    if (categoryStatus === 'out' || itemStatus === 'out') {
      finalItemBg = 'bg-red-300 dark:bg-red-900/70 text-red-900 dark:text-red-200';
      isDisabled = true;
    } else if (categoryStatus === 'low' || itemStatus === 'low') {
      finalItemBg = itemStatusColors.low.light;
    } else {
      const colorName = categoryColors[categoryName];
      finalItemBg = colorName ? colorPalette[colorName]?.[colorShade] : 'bg-background';
    }

    const menuItemCard = (
      <Card
        key={item.name}
        className={cn(
          "group rounded-lg transition-all shadow-md hover:shadow-lg relative overflow-hidden h-full flex flex-col min-h-[110px] hover:scale-105",
          easyMode && "cursor-pointer",
          isDisabled && "pointer-events-none opacity-60",
          finalItemBg
        )}
        onClick={() => handleItemClick(item)}
      >
        <CardContent className={cn("p-3 flex flex-col justify-between flex-grow")}>
          <div>
            <div className="flex justify-between items-start mb-1 min-h-[1.5rem]">
              <div className="flex items-start gap-1.5 flex-1 pr-1">
                <div className={cn("border p-[1px] shrink-0 w-3 h-3 flex items-center justify-center mt-1", item.isVeg ? "border-green-600" : "border-red-500")}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", item.isVeg ? "bg-green-600" : "bg-red-500")}></div>
                </div>
                <span className="font-semibold text-sm leading-tight line-clamp-2">{item.name}</span>
              </div>
              <span className="font-bold text-sm whitespace-nowrap">{currency}{item.price}</span>
            </div>
          </div>
          {!easyMode && (
            <div className="flex justify-center w-full mt-auto pt-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs px-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddButtonClick(item);
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                {t('Add')}
              </Button>
            </div>
          )}
        </CardContent>
        <p className="absolute bottom-1 left-2 text-xs text-muted-foreground font-mono font-bold">{item.code}</p>
        <div className="absolute bottom-1 right-1" onClick={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <div role="button" className="p-1 rounded-md hover:bg-black/10">
                <Palette className="h-4 w-4" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="flex flex-col gap-1">
                {itemStatusNames.map((name) => (
                  <Button key={name} variant="outline" className="w-full justify-start gap-2" onClick={(e) => { e.stopPropagation(); setItemStatus(item.name, name); }}>
                    <span className={cn("h-3 w-3 rounded-sm", itemStatusColors[name].light)} />
                    {itemStatusColors[name].name}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" className="col-span-2 h-8" onClick={(e) => { e.stopPropagation(); setItemStatus(item.name, ''); }}>{t('Reset')}</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </Card>
    );

    return (
      <DraggableMenuItem key={item.name} item={item} canDrag={easyMode && !isDisabled}>
        {menuItemCard}
      </DraggableMenuItem>
    );
  };

  const renderCategoryHeader = (category: MenuCategory) => {
    const status = category.status;
    const statusConfig = status ? itemStatusColors[status] : null;

    return (
      <div className="flex-grow text-left flex items-center gap-2 font-bold">
        <span className="truncate">{category.name}</span>
        {statusConfig && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-black/10">
            {statusConfig.name}
          </span>
        )}
      </div>
    );
  };


  const renderMenuContent = () => {
    const tabsKey = searchTerm ? `search-${searchTerm}` : 'all-items';
    const activeTab = viewMode === 'grid' && filteredMenu.length > 0
      ? (filteredMenu.find(c => c.name === activeAccordionItems[0]) ? activeAccordionItems[0] : filteredMenu[0].name)
      : (filteredMenu.length > 0 ? filteredMenu[0].name : undefined);


    if (viewMode === 'grid') {
      return (
        <Tabs defaultValue={activeTab} key={tabsKey} className="w-full">
          <div className="flex justify-center">
            <TabsList className="mb-4 flex-wrap h-auto bg-transparent border-b rounded-none p-0">
              {filteredMenu.map(category => {
                const status = category.status;
                const statusConfig = status ? itemStatusColors[status] : null;
                const colorName = categoryColors[category.name];
                const colorClass = colorName ? colorPalette[colorName]?.[colorShade] : '';
                return (
                  <div key={category.name} className="relative group p-1">
                    <TabsTrigger value={category.name} className={cn("rounded-md data-[state=active]:border-primary data-[state=active]:border-2 data-[state=active]:shadow-md px-4 py-3 cursor-pointer transition-colors text-lg font-bold", statusConfig ? statusConfig.dark : (colorClass || 'bg-muted'))}>
                      <div className="flex-grow text-left flex items-center gap-2 pr-12">
                        <span className="truncate">{category.name}</span>
                        {statusConfig && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-black/10 text-white">
                            {statusConfig.name}
                          </span>
                        )}
                      </div>
                    </TabsTrigger>
                    <div className="absolute top-1/2 -translate-y-1/2 right-4" onClick={(e) => e.stopPropagation()}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div role="button" className="p-1 rounded-md hover:bg-black/20 dark:hover:bg-white/20">
                            <Palette className="h-4 w-4" />
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2">
                          <div className="grid grid-cols-2 gap-1">
                            {itemStatusNames.map((name) => (
                              <Button key={name} variant="outline" className="w-full justify-start gap-2" onClick={(e) => { e.stopPropagation(); setCategoryStatus(category.name, name); }}>
                                <span className={cn("h-3 w-3 rounded-sm", itemStatusColors[name].light)} />
                                {itemStatusColors[name].name}
                              </Button>
                            ))}
                          </div>
                          <Separator className="my-2" />
                          <Button variant="ghost" size="sm" className="w-full h-8" onClick={(e) => { e.stopPropagation(); setCategoryStatus(category.name, ''); }}>{t('Reset')}</Button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )
              })}
            </TabsList>
          </div>
          {filteredMenu.map(category => (
            <TabsContent key={category.name} value={category.name} className={cn("m-0 rounded-lg p-2 min-h-[200px] bg-background")}>
              {category.items.length > 0 &&
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {category.items.map((item) => renderMenuItem(item, category.name, currency))}
                </div>
              }
              {category.subcategories?.map(sub => (
                <div key={sub.name} className="mt-6">
                  <h3 className="text-lg font-semibold mb-2 pl-1 text-muted-foreground">{sub.name}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {sub.items.map((item) => renderMenuItem(item, category.name, currency))}
                  </div>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      );
    }
    return (
      <Accordion
        type="multiple"
        value={activeAccordionItems}
        onValueChange={setActiveAccordionItems}
        className="w-full space-y-2"
      >
        {filteredMenu.map(category => {
          const status = category.status;
          const statusConfig = status ? itemStatusColors[status] : null;
          const colorName = categoryColors[category.name];
          const colorClass = colorName ? colorPalette[colorName]?.[colorShade] : 'bg-muted';
          return (
            <AccordionItem key={category.name} value={category.name} className="border-b-0">
              <AccordionTrigger className={cn("p-3 rounded-md text-lg font-bold hover:no-underline flex justify-between items-center relative group text-card-foreground", statusConfig ? statusConfig.dark : colorClass)}>
                {renderCategoryHeader(category)}
                <div className="absolute top-1/2 -translate-y-1/2 right-10" onClick={(e) => e.stopPropagation()}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <div role="button" className="p-1 rounded-md hover:bg-black/10">
                        <Palette className="h-4 w-4" />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <div className="grid grid-cols-2 gap-1">
                        {itemStatusNames.map((name) => (
                          <Button key={name} variant="outline" className="w-full justify-start gap-2" onClick={(e) => { e.stopPropagation(); setCategoryStatus(category.name, name); }}>
                            <span className={cn("h-3 w-3 rounded-sm", itemStatusColors[name].light)} />
                            {itemStatusColors[name].name}
                          </Button>
                        ))}
                      </div>
                      <Separator className="my-2" />
                      <Button variant="ghost" size="sm" className="w-full h-8" onClick={(e) => { e.stopPropagation(); setCategoryStatus(category.name, ''); }}>{t('Reset')}</Button>
                    </PopoverContent>
                  </Popover>
                </div>
              </AccordionTrigger>
              <AccordionContent className={cn("p-2 space-y-2", "bg-background")}>
                {category.items.length > 0 &&
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {category.items.map(item => renderMenuItem(item, category.name, currency))}
                  </div>
                }
                {category.subcategories?.map(sub => (
                  <div key={sub.name} className="mt-4">
                    <h3 className="text-md font-semibold mb-2 pl-2 text-muted-foreground">{sub.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {sub.items.map(item => renderMenuItem(item, category.name, currency))}
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    );
  };

  const allItemsOpen = activeAccordionItems.length === filteredMenu.length && filteredMenu.length > 0;

  const toggleAccordion = () => {
    if (allItemsOpen) {
      setActiveAccordionItems([]);
    } else {
      setActiveAccordionItems(filteredMenu.map(c => c.name));
    }
  };

  return (
    <div className="md:grid md:grid-cols-3 xl:grid-cols-4 md:gap-4 h-full p-4">
      {/* Mobile View: Tabs */}
      <div className="md:hidden h-full flex flex-col">
        <Tabs value={mobileTab} onValueChange={(value) => setMobileTab(value as MobileTab)} className="flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="menu"><MenuIcon className="mr-2 h-4 w-4" />{t('Menu')}</TabsTrigger>
            <TabsTrigger value="order"><ShoppingCart className="mr-2 h-4 w-4" />{t('Order')} ({orderItems.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="menu" className="flex-grow mt-0 overflow-y-auto">
            <div className="flex flex-col h-full">
              <Card className="flex flex-col flex-grow shadow-none border-0">
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        ref={searchInputRef}
                        placeholder={t('Search by name or enter code...')}
                        className="pl-10 h-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleCodeEntry}
                      />
                    </div>
                  </div>
                </CardHeader>
                <ScrollArea className="flex-grow p-4 pt-0">
                  {renderMenuContent()}
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="order" className="flex-grow mt-0">
            <OrderPanel
              orderItems={orderItems}
              handleDropOnOrder={handleDropOnOrder}
              updateQuantity={updateQuantity}
              removeFromOrder={removeFromOrder}
              activeOrder={activeOrder}
              selectedTableId={selectedTableId}
              clearCurrentOrder={clearCurrentOrder}
              handleQuickAssign={handleQuickAssign}
              subtotal={subtotal}
              total={total}
              setCustomers={setCustomers}
              currency="Rs."
              allMenuItems={allMenuItems}
              discount={discount}
              setDiscount={setDiscount}
              isProcessing={isProcessing}
              handlePrintProvisionalBill={handlePrintProvisionalBill}
              handleProcessPayment={handleProcessPayment}
              receiptPreview={receiptPreview}
              kotButtons={renderKotButtons()}
              orderType={selectedOrderType}
              customerDetails={customerDetails}
              updateInstruction={updateInstruction}
            >
              <div className="flex gap-4 flex-wrap items-center">
                <Label className="font-semibold text-sm shrink-0 whitespace-nowrap">{t('Order For:')}</Label>
                <div className="flex flex-wrap flex-1 gap-2 min-w-[200px]">
                  <Button variant={selectedOrderType === 'Dine-In' ? 'default' : 'outline'} className="h-12 text-base flex-1 min-w-[100px]" onClick={() => handleSetOrderType('Dine-In')}>
                    <Users2 className="mr-2 h-5 w-5" />{t('Dine-In')}
                  </Button>
                  <Button variant={selectedOrderType === 'Take-Away' ? 'default' : 'outline'} className="h-12 text-base flex-1 min-w-[100px]" onClick={() => handleSetOrderType('Take-Away')}>
                    <ShoppingBasket className="mr-2 h-5 w-5" />{t('Take Away')}
                  </Button>
                  <Button variant={selectedOrderType === 'Home-Delivery' ? 'default' : 'outline'} className="h-12 text-base flex-1 min-w-[100px]" onClick={() => handleSetOrderType('Home-Delivery')}>
                    <Bike className="mr-2 h-5 w-5" />{t('Delivery')}
                  </Button>
                </div>
              </div>

              {selectedOrderType === 'Dine-In' && (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-2">
                  {tables.map(table => {
                    const isSelected = table.id === selectedTableId;
                    return (
                      <div
                        key={table.id}
                        className={cn(
                          'aspect-square flex-col justify-center items-center relative p-1 border-2 transition-transform duration-150 active:scale-95 group flex rounded-md cursor-pointer',
                          getDynamicColor(table.status),
                          isSelected && 'ring-4 ring-offset-2 ring-black',
                          table.status === 'Available' || table.status === 'Occupied' ? 'text-white border-black/50' : 'text-black border-black/50',
                        )}
                        onClick={() => setSelectedTableId(table.id)}
                      >
                        <span className="text-3xl font-bold">{table.id}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </OrderPanel>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop View */}
      <div className="hidden md:col-span-2 xl:col-span-3 md:flex flex-col h-full">
        <Card className="flex flex-col flex-grow">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder={t('Search by name or enter code...')}
                      className="pl-10 h-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleCodeEntry}
                      onFocus={() => setKeyboardMode('order')}
                      onBlur={() => { if (keyboardMode === 'order') setKeyboardMode('confirm') }}
                    />
                  </div>
                  <RadioGroup value={vegFilter} onValueChange={(v) => setVegFilter(v as VegFilter)} className="flex items-center gap-2">
                    <RadioGroupItem value="All" id="filter-all-desktop" className="sr-only" />
                    <Label htmlFor="filter-all-desktop" className={cn("h-10 w-24 flex items-center justify-center rounded-md cursor-pointer border-2 font-semibold text-lg text-foreground hover:bg-accent", vegFilter === 'All' && 'ring-2 ring-primary text-primary bg-background')}>{t('All')}</Label>
                    <RadioGroupItem value="Veg" id="filter-veg-desktop" className="sr-only" />
                    <Label htmlFor="filter-veg-desktop" className={cn("h-10 w-24 flex items-center justify-center rounded-md cursor-pointer border-2 font-semibold text-lg text-white bg-green-600 transition-all", vegFilter === 'Veg' && 'border-4 border-black dark:border-white ring-2 ring-offset-2 ring-green-600')}>{t('Veg')}</Label>
                    <RadioGroupItem value="Non-Veg" id="filter-nonveg-desktop" className="sr-only" />
                    <Label htmlFor="filter-nonveg-desktop" className={cn("h-10 w-24 flex items-center justify-center rounded-md cursor-pointer border-2 font-semibold text-lg text-white bg-red-600 transition-all", vegFilter === 'Non-Veg' && 'border-4 border-black dark:border-white ring-2 ring-offset-2 ring-red-600')}>{t('Non-Veg')}</Label>
                  </RadioGroup>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="easy-mode-switch-desktop" checked={easyMode} onCheckedChange={handleEasyModeChange} />
                    <Label htmlFor="easy-mode-switch-desktop" className="flex items-center gap-2 cursor-pointer">
                      <MousePointerClick className="mr-2 h-4 w-4" />
                      {t('Easy Mode')}
                    </Label>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <RadioGroup value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="flex items-center">
                    <Label className={cn("p-1.5 rounded-md cursor-pointer transition-colors", viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                      <RadioGroupItem value="accordion" id="accordion-view-desktop" className="sr-only" />
                      <Rows className="h-5 w-5 box-content" />
                    </Label>
                    <Label className={cn("p-1.5 rounded-md cursor-pointer transition-colors", viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                      <RadioGroupItem value="grid" id="grid-view-desktop" className="sr-only" />
                      <LayoutGrid className="h-5 w-5 box-content" />
                    </Label>
                  </RadioGroup>
                </div>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleShuffleColors}>
                    <Shuffle className="mr-2 h-4 w-4" /> {t('Colors')}
                  </Button>
                  <Label className="font-semibold text-sm">{t('Shade:')}</Label>
                  <RadioGroup value={colorShade} onValueChange={(v) => setColorShade(v as ColorShade)} className="flex items-center">
                    <Label className={cn("p-1.5 rounded-md cursor-pointer transition-colors", colorShade === 'light' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                      <RadioGroupItem value="light" id="shade-light-desktop" className="sr-only" />
                      {t('Light')}
                    </Label>
                    <Label className={cn("p-1.5 rounded-md cursor-pointer transition-colors", colorShade === 'medium' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                      <RadioGroupItem value="medium" id="shade-medium-desktop" className="sr-only" />
                      {t('Medium')}
                    </Label>
                  </RadioGroup>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsItemStatusDialogOpen(true)}>
                    <BarChart className="mr-2 h-4 w-4" /> {t('Item Status')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsMenuManagerOpen(true)}>
                    <BookOpen className="mr-2 h-4 w-4" /> {t('Manage Menu')}
                  </Button>
                  {viewMode === 'accordion' && (
                    <Button variant="outline" size="sm" onClick={toggleAccordion}>
                      <ChevronsUpDown className="mr-2 h-4 w-4" />
                      {allItemsOpen ? t('Collapse') : t('Expand')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <ScrollArea className="flex-grow px-4">
            {renderMenuContent()}
          </ScrollArea>
        </Card>
      </div>

      <div className="hidden md:col-span-1 xl:col-span-1 md:flex flex-col h-full gap-4">
        <OrderPanel
          orderItems={orderItems}
          handleDropOnOrder={handleDropOnOrder}
          updateQuantity={updateQuantity}
          removeFromOrder={removeFromOrder}
          activeOrder={activeOrder}
          selectedTableId={selectedTableId}
          clearCurrentOrder={clearCurrentOrder}
          handleQuickAssign={handleQuickAssign}
          subtotal={subtotal}
          total={total}
          setCustomers={setCustomers}
          discount={discount}
          setDiscount={setDiscount}
          isProcessing={isProcessing}
          handlePrintProvisionalBill={handlePrintProvisionalBill}
          handleProcessPayment={handleProcessPayment}
          receiptPreview={receiptPreview}
          kotButtons={renderKotButtons()}
          orderType={selectedOrderType}
          customerDetails={customerDetails}
          updateInstruction={updateInstruction}
          currency={currency}
          allMenuItems={allMenuItems}
        >
          <div className="flex gap-4 flex-wrap items-center">
            <Label className="font-semibold text-sm shrink-0 whitespace-nowrap">{t('Order For:')}</Label>
            <div className="flex flex-wrap flex-1 gap-2 min-w-[200px]">
              <Button variant={selectedOrderType === 'Dine-In' ? 'default' : 'outline'} className="h-12 text-base flex-1 min-w-[120px]" onClick={() => handleSetOrderType('Dine-In')}>
                <Users2 className="mr-2 h-5 w-5" />{t('Dine-In')}
              </Button>
              <Button variant={selectedOrderType === 'Take-Away' ? 'default' : 'outline'} className="h-12 text-base flex-1 min-w-[120px]" onClick={() => handleSetOrderType('Take-Away')}>
                <ShoppingBasket className="mr-2 h-5 w-5" />{t('Take Away')}
              </Button>
              <Button variant={selectedOrderType === 'Home-Delivery' ? 'default' : 'outline'} className="h-12 text-base flex-1 min-w-[120px]" onClick={() => handleSetOrderType('Home-Delivery')}>
                <Bike className="mr-2 h-5 w-5" />{t('Delivery')}
              </Button>
            </div>
          </div>

          {selectedOrderType === 'Dine-In' && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
              {tables.map(table => {
                const Icon = statusIcons[table.status];
                const isSelected = table.id === selectedTableId;
                const hasPendingItems = (pendingOrders[table.id] || []).length > 0 && table.status !== 'Occupied';
                const order = orders.find(o => o.tableId === table.id && o.status === 'In Preparation');
                const elapsedTimeString = order?.createdAt ? formatDistanceToNowStrict(new Date(order.createdAt)) : null;

                let displayTime = elapsedTimeString;
                if (elapsedTimeString) {
                  const timeParts = elapsedTimeString.split(" ");
                  if (timeParts.includes("seconds") || timeParts.includes("second")) {
                    displayTime = `${String(timeParts[0]).padStart(2, '0')} ${t(timeParts[1])}`;
                  } else if (timeParts.includes("minutes") || timeParts.includes("minute")) {
                    displayTime = `${timeParts[0]} ${t(timeParts[1])}`;
                  }
                }


                return (
                  <TableDropTarget key={table.id} table={table} occupancyCount={occupancyCount} handleSelectTable={setSelectedTableId} onDropItem={handleDropItemOnTable}>
                    <div
                      className={cn(
                        'absolute inset-0 flex flex-col items-center justify-center text-center transition-colors rounded-md p-1 h-full',
                        isSelected && 'ring-4 ring-offset-2 ring-black'
                      )}
                    >
                      {hasPendingItems && (
                        <div className="absolute top-1 left-1 bg-amber-400 p-1 rounded-full text-black">
                          <ShoppingBag className="h-3 w-3" />
                        </div>
                      )}
                      <span className={cn("text-4xl font-bold", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')}>{table.id}</span>
                      <div className="flex items-center gap-1">
                        <Icon className={cn("h-4 w-4 shrink-0", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')} />
                        <span className={cn("text-xs font-semibold leading-tight break-words", table.status === 'Available' || table.status === 'Occupied' ? 'text-white' : 'text-black')}>{t(table.status)}</span>
                      </div>
                      {showTableDetailsOnPOS && table.name && <div className="text-xs font-bold text-white mt-1 max-w-full truncate">{table.name}</div>}
                      {showTableDetailsOnPOS && table.seats && <div className="text-xs text-white flex items-center justify-center gap-1"><Armchair className="h-3 w-3" /> {table.seats}</div>}
                      {table.status === 'Occupied' && displayTime && (
                        <div className="text-xs text-white font-bold bg-black/50 rounded-full px-2 py-0.5 mt-1">
                          {displayTime}
                        </div>
                      )}
                      {showReservationTimeOnPOS && table.status === 'Reserved' && table.reservationDetails && (
                        <div className="text-xs text-black font-bold mt-1 max-w-full truncate px-1">
                          <p>{table.reservationDetails.time}</p>
                          {t('for')} {table.reservationDetails.name}
                        </div>
                      )}
                    </div>
                  </TableDropTarget>
                )
              })}
            </div>
          )}
        </OrderPanel>
      </div >

      <PaymentDialog
        isOpen={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        total={total}
        receiptPreview={receiptPreview}
        onPaymentSuccess={handlePaymentSuccess}
        onNavigate={onNavigate}
        currency={currency}
      />
      <AddItemDialog
        isOpen={isAddItemDialogOpen}
        onOpenChange={setIsAddItemDialogOpen}
        item={selectedItem}
        onConfirm={addToOrder}
        currency={currency}
      />
      <ManageMenuDialog
        isOpen={isMenuManagerOpen}
        onOpenChange={setIsMenuManagerOpen}
        menu={menu}
        setMenu={setMenu}
        inventory={inventory}
        setInventory={setInventory}
        categoryColors={categoryColors}
        setCategoryColors={setCategoryColors}
        currency={currency}
      />
      <HomeDeliveryDialog
        isOpen={isHomeDeliveryDialogOpen}
        onOpenChange={setIsHomeDeliveryDialogOpen}
        onSave={handleSaveDeliveryDetails}
        existingDetails={customerDetails}
      />
      <Dialog open={isReserveDialogOpen} onOpenChange={setIsReserveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reserve Table')} {tableToReserve}</DialogTitle>
            <DialogDescription>{t('Enter guest details (optional).')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="guest-name" className="text-right">{t('Name')}</Label>
              <Input id="guest-name" value={reservationDetails.name} onChange={(e) => setReservationDetails({ ...reservationDetails, name: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reservation-time" className="text-right">{t('Time')}</Label>
              <Input id="reservation-time" type="time" value={reservationDetails.time} onChange={(e) => setReservationDetails({ ...reservationDetails, time: e.target.value })} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReserveDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleReserveTable}>{t('Reserve')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isQuickAssignDialogOpen} onOpenChange={setIsQuickAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Assign Order to Table')}</DialogTitle>
            <DialogDescription>{t('Select an available table to assign this order to.')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 py-4">
            {tables.filter(t => t.status === 'Available').map(table => (
              <Button
                key={table.id}
                variant="outline"
                className="aspect-square h-20 text-2xl"
                onClick={() => handleAssignOrderToTable(table.id)}
              >
                {table.id}
              </Button>
            ))}
            {tables.filter(t => t.status === 'Available').length === 0 && (
              <p className="col-span-4 text-center text-muted-foreground">{t('No tables are currently available.')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isEasyModeAlertOpen} onOpenChange={setIsEasyModeAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Enable Easy Mode?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('In "Easy Mode", every click on a menu item instantly adds 1 quantity to the order. This is faster but can lead to accidental clicks.')}
              <br /><br />
              {t('Are you sure you want to enable this mode?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEasyMode(false)}>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEasyMode}>{t('Enable')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ItemStatusDialog
        isOpen={isItemStatusDialogOpen}
        onOpenChange={setIsItemStatusDialogOpen}
        lowStockItems={lowStockItems}
        outOfStockItems={outOfStockItems}
      />
      <AlertDialog open={isReprintDialogOpen} onOpenChange={setIsReprintDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Reprint KOT Options')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Would you like to reprint only the last KOT sent, or the complete order items?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setIsReprintDialogOpen(false)}>{t('Cancel')}</Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                setIsReprintDialogOpen(false);
                processKOTs(reprintCategory, 'last');
              }}
              disabled={!lastKotHistory[reprintCategory || '__GLOBAL__']?.length}
            >
              {t('Reprint Last KOT')}
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setIsReprintDialogOpen(false);
                processKOTs(reprintCategory, 'full');
              }}
            >
              {t('Reprint Complete Order')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
