
import { z } from 'zod';

export interface MenuItemHistory {
  name: string;
  price: number;
  changedAt: Date;
}

export interface IngredientItem {
  inventoryItemId: string; // Corresponds to the ID of an InventoryItem
  quantity: number; // Amount of the ingredient used
  unit: 'g' | 'ml' | 'pcs' | 'kg' | 'ltr';
}

export interface MenuItem {
  name: string;
  price: number;
  code: string;
  isVeg?: boolean;
  history?: MenuItemHistory[];
  category?: string;
  ingredients?: IngredientItem[];
  status?: 'available' | 'low' | 'out';
  taxRate?: number;
}

export interface MenuSubCategory {
  name: string;
  items: MenuItem[];
  status?: 'available' | 'low' | 'out';
}

export interface MenuCategory {
  id: string; // The slugified category name
  name: string; // The display name of the category
  items: MenuItem[];
  subcategories?: MenuSubCategory[];
  status?: 'available' | 'low' | 'out';
}

export interface OrderItem extends MenuItem {
  quantity: number;
  instruction?: string;
}

export type OrderType = 'Store-Pickup' | 'Home-Delivery';

export interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  houseNo?: string;
  street?: string;
  landmark?: string;
  email?: string;
}

export interface Customer {
  id: string; // phone number can serve as a unique ID
  name: string;
  phone: string;
  email?: string;
  address?: string;
  firstSeen: Date;
  lastSeen: Date;
  totalVisits: number;
  totalSpent: number;
  loyaltyPoints?: number;
  isDeleted?: boolean;
  balance?: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  status: 'Pending' | 'In Preparation' | 'Completed';
  orderType: OrderType;
  customerDetails?: CustomerDetails | null;
  createdAt: Date;
}

export interface Bill {
  id: string;
  orderItems: OrderItem[];
  subtotal: number;
  discount: number;
  vatPercentage: number;
  vatAmount: number;
  total: number;
  paymentMethod: 'Cash' | 'Online';
  receiptPreview: string;
  timestamp: Date; // This is the completion time
  orderType: OrderType;
  customerDetails?: CustomerDetails | null;
  createdAt: Date; // Start time of the order
  completedAt: Date; // End time of the order
  tableId?: string;
}


export interface Employee {
  id: string;
  name: string;
  role: string;
  salary: number;
  color: string;
  mobile?: string;
  govtId?: string;
  email?: string;
}

export interface Advance {
  id: string;
  employeeId: string;
  date: Date;
  amount: number;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-day';

export interface Attendance {
  id: string; // Composite key: `${employeeId}_${yyyy-MM-dd}`
  employeeId: string;
  date: Date;
  status: AttendanceStatus;
  notes?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  phone?: string;
  email?: string;
  location?: string;
  balance?: number;
  billingCycleDay?: number; // Day of the month (1-31)
}

export interface Expense {
  id: string;
  date: Date;
  category: string;
  description: string;
  amount: number;
  vendorId?: string | null;
}

export interface PurchaseOrderItem {
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  vendorName: string;
  date: Date;
  referenceNo: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'Draft' | 'Ordered' | 'Received' | 'Cancelled';
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  capacity: number;
  unit: string;
  purchaseUnit?: string; // e.g., 'Box'
  sellUnit?: string; // e.g., 'Piece'
  conversionFactor?: number; // e.g., 1 Box = 12 Pieces
  vendorId?: string | null;
  price: number;
  costPrice?: number;
  expiryDate?: string; // ISO date string
  taxRate?: number; // e.g. 5, 12, 18
  location?: string; // e.g. 'Aisle 4, Shelf B'
  discount?: number; // Check for percentage or fixed amount
}

export interface CartItem extends InventoryItem {
  quantity: number;
}

export interface SavedCart {
  id: string;
  name: string;
  items: CartItem[];
  customer: Customer | null;
  timestamp: Date;
  discount: number;
  redeemPoints: number;
  paymentMethod: 'Cash' | 'Online';
}

export interface ActivityLogEntry {
  id: number;
  user: string;
  action: string;
  timestamp: string;
  type: 'Auth' | 'Order' | 'Payment' | 'Report' | 'POS';
}

export interface PendingBillTransaction {
  id: string;
  amount: number;
  date: Date;
  description?: string;
}

export interface PendingBill {
  id: string;
  name: string;
  type: 'customer' | 'vendor';
  transactions: PendingBillTransaction[];
  mobile?: string;
}




// Schemas for AI structured output
export const MenuItemSchema = z.object({
  name: z.string().describe('The name of the menu item.'),
  price: z.number().describe('The price of the menu item.'),
  isVeg: z.boolean().optional().describe('Whether the item is vegetarian.'),
  code: z.string().optional().describe('A short code for the item, if any.'),
  ingredients: z.array(z.any()).optional().default([]).describe("An array of ingredient objects, which can be empty."),
  history: z.array(z.any()).optional().default([]).describe("An array of history objects, which can be empty."),
});

export const MenuSubCategorySchema = z.object({
  name: z.string().describe('The name of the sub-category.'),
  items: z.array(MenuItemSchema),
});

export const MenuCategorySchema = z.object({
  id: z.string().describe('The slugified category name (e.g., "pizzas", "all-day-breakfast").'),
  name: z.string().describe('The main category name (e.g., "Pizzas", "Beverages").'),
  items: z.array(MenuItemSchema),
  subcategories: z.array(MenuSubCategorySchema).optional(),
});


// Schemas for report generation
export const BillSchema = z.object({
  id: z.string(),
  total: z.number(),
  timestamp: z.string().describe('ISO date string'),
});

export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  salary: z.number(),
});

export const ExpenseSchema = z.object({
  id: z.string(),
  date: z.string().describe('ISO date string'),
  category: z.string(),
  description: z.string(),
  amount: z.number(),
  vendorId: z.string().nullish(),
});

export const PendingBillTransactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  date: z.string().describe('ISO date string'),
  description: z.string().optional(),
});

export const PendingBillSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['customer', 'vendor']),
  transactions: z.array(PendingBillTransactionSchema),
  mobile: z.string().optional(),
});

export const AttendanceSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string().describe('ISO date string'),
  status: z.enum(['Present', 'Absent', 'Half-day']),
  notes: z.string().optional(),
});

export const AdvanceSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string().describe('ISO date string'),
  amount: z.number(),
});


// Zod schema for GenerateReport input
export const GenerateReportInputSchema = z.object({
  reportType: z.enum(['daily', 'monthly', 'yearly']).describe('The type of report to generate.'),
  billHistory: z.array(z.any()).describe('A list of all bills.'),
  employees: z.array(z.any()).describe('A list of all employees.'),
  expenses: z.array(z.any()).describe('A list of all recorded expenses.'),
  pendingBills: z.array(z.any()).describe('A list of all pending bills (both customer and vendor).'),
  attendance: z.array(z.any()).describe('A list of all attendance records.'),
  advances: z.array(z.any()).describe('A list of all salary advances.'),
  inventory: z.array(z.any()).describe('A list of all inventory items.'),
  customerSummary: z.array(z.any()).describe('A summary of customer data including total visits and spending.'),
  recipientEmail: z.string().describe('A comma-separated string of email addresses to send the report to.'),
  currency: z.string().describe('The currency symbol to use for monetary values.'),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

// Zod schema for GenerateReport output
export const GenerateReportOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;

export interface VenueDetails {
  name: string;
  address: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  contactNumber: string;
  email: string;
  tagline: string;
  defaultDiscount?: number;
  vatPercentage?: number;
  receiptHeader?: string;
  receiptFooter?: string;
  customMessage?: string;
  loyaltyRate?: number; // points per currency unit
  loyaltyPointValue?: number; // currency value per point
}

export interface OwnerDetails {
  name: string;
  contactNumber: string;
  email: string;
  address?: string; // Added to support setup wizard inputs
  language?: string;
}

export interface SetupData {
  venue: VenueDetails;
  owner: OwnerDetails;
  additionalOwners?: OwnerDetails[];
  employees: Partial<Employee>[];
  vendors?: Partial<Vendor>[];
  currency: string;
  language: string;
}
