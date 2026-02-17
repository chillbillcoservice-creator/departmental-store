
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Utensils, LayoutGrid, Soup, Users, Shield, Receipt, Users2, HelpCircle, Zap, MousePointerClick, Keyboard, FileInput, Languages, Camera, Search, CreditCard, Package, Truck } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

interface HelpDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickTips = [
  {
    icon: Search, // Was Keyboard, changing to Search which is imported
    title: 'Smart Search',
    description: 'Type an item name, code, or scan a barcode to find it instantly in the POS.',
  },
  {
    icon: MousePointerClick,
    title: 'Quick Edit',
    description: 'In the cart, you can click directly on the quantity number to type 5, 10, or any amount.',
  },
  {
    icon: Languages,
    title: 'Language',
    description: 'You can switch the entire app language (like English or Hindi) from the settings anytime.',
  }
];

const features = [
  {
    icon: CreditCard, // Using CreditCard instead of Utensils for POS
    title: 'Main / Billing',
    description: 'Create bills quickly. Select items, add quantity, apply discounts, and accept payments (Cash/Online).',
  },
  {
    icon: Package, // Package for Inventory
    title: 'Inventory',
    description: 'Manage your stock. Add new items, set prices, and see what is running low or out of stock.',
  },
  {
    icon: Receipt,
    title: 'Expenses',
    description: 'Track daily shop expenses. Note down costs like tea, electricity, or maintenance to know your real profit.',
  },
  {
    icon: Users2,
    title: 'Customers',
    description: 'Save customer details. Track their purchase history and manage any pending payments (Udhaar).',
  },
  {
    icon: Truck,
    title: 'Vendors',
    description: 'Manage your suppliers. Keep track of what you bought and how much you owe them.',
  },
  {
    icon: Users,
    title: 'Staff',
    description: 'Manage your team. valid Mark daily attendance, track working days, and manage salary advances.',
  },
  {
    icon: Shield,
    title: 'Admin Reports',
    description: 'The Owner\'s simplified dashboard. View total sales, profit, and business performance at a glance.',
  },
];


export function HelpDialog({ isOpen, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle />
            App Guide
          </DialogTitle>
          <DialogDescription>
            A quick overview of the main features and tips for the application.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
          <div className="py-4 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary"><Zap />Quick Tips</h3>
              <div className="space-y-4">
                {quickTips.map((tip) => (
                  <div key={tip.title} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg">
                      <tip.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{tip.title}</h4>
                      <p className="text-muted-foreground mt-1">{tip.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-xl font-semibold mb-4">Main Features</h3>
              <div className="space-y-4">
                {features.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{feature.title}</h4>
                      <p className="text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it, thanks!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
