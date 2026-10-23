
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/language-context';
import {
  BarChart3,
  Menu as MenuIcon,
  Settings,
  Users,
  History,
  TrendingUp,
  Download,
  Repeat,
  Trash2,
  MapPin,
  Mail,
  Package,
  Database,
  Briefcase,
  Plus,
  Clock,
  Eye,
  Printer,
  RotateCcw,
  X,
  FilePlus,
  PackageCheck,
  ShoppingCart,
  User,
  PlusCircle,
  Edit,
  CreditCard,
  List,
  AlertTriangle,
  Building,
  RefreshCw,
  Search,
  Landmark,
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { useThemeColor } from '@/contexts/theme-color-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import SalesReport from './sales-report';
import InventoryManagement from './inventory-management';
import BillHistory from './bill-history';
import { Gstr1ReportDialog } from './gstr1-report-dialog';
import type { Bill, Employee, OrderItem, Expense, Vendor, InventoryItem, MenuCategory, VenueDetails, PurchaseOrder } from '@/lib/types';
import { generateAndSendReport } from '@/ai/flows/generate-report';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format, isSameDay, isValid } from 'date-fns';

const safeFormat = (date: any, formatStr: string) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (!isValid(d)) return 'N/A';
  return format(d, formatStr);
};
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { useFirestore } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import StaffManagement from './staff-management';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';


const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
const defaultRoles = ["Store Manager", "Cashier", "Sales Associate", "Stock Clerk", "Security", "Cleaner", "Other"];

interface AdminDashboardProps {
  billHistory: Bill[];
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  expenses: Expense[];
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  customerCreditLimit: number;
  setCustomerCreditLimit: (limit: number) => void;
  vendorCreditLimit: number;
  setVendorCreditLimit: (limit: number) => void;
  onRerunSetup: () => void;
  setExpenses: (expenses: Expense[]) => void;
  menu: MenuCategory[];
  setMenu: (menu: MenuCategory[]) => void;
  venueName: string;
  setVenueName: (name: string) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  venueDetails: VenueDetails | null;
  setVenueDetails: (details: VenueDetails | null) => void;
  purchaseOrders?: PurchaseOrder[];
  setPurchaseOrders?: (pos: PurchaseOrder[]) => void;
  vendors?: Vendor[];
  setVendors?: (vendors: Vendor[]) => void;
}

export default function AdminDashboard({
  billHistory = [],
  employees = [],
  setEmployees,
  expenses = [],
  inventory = [],
  setInventory,
  customerCreditLimit,
  setCustomerCreditLimit,
  vendorCreditLimit,
  setVendorCreditLimit,
  setExpenses,
  onRerunSetup,
  menu = [],
  setMenu,
  venueName,
  setVenueName,
  currency = 'Rs.',
  setCurrency,
  venueDetails,
  setVenueDetails,
  purchaseOrders = [],
  setPurchaseOrders,
  vendors = [],
  setVendors,
}: AdminDashboardProps) {
  const generateUniqueId = () => {
    return `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
  };
  const props = { billHistory, employees, setEmployees, expenses, inventory, setInventory, customerCreditLimit, setCustomerCreditLimit, vendorCreditLimit, setVendorCreditLimit, onRerunSetup, menu, setMenu, venueName, setVenueName, currency, setCurrency, venueDetails, setVenueDetails, purchaseOrders, setPurchaseOrders, vendors, setVendors };
  const { t } = useLanguage();
  const { themeColor, setThemeColor, availableColors } = useThemeColor();
  const { toast } = useToast();
  const db = useFirestore();
  const [isExporting, setIsExporting] = useState(false);
  const [isGstr1Open, setIsGstr1Open] = useState(false);
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [canInstallNative, setCanInstallNative] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // App is exclusively tailored for Indian stores - enforce currency lock to 'Rs.'
  useEffect(() => {
    if (currency !== 'Rs.' && currency !== '₹') {
      setCurrency('Rs.');
      try {
        localStorage.setItem('currency', 'Rs.');
      } catch (e) {}
    }
  }, [currency, setCurrency]);

  // Track PWA install status & native prompt
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkStandalone = () => {
        const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        setIsStandalone(standalone);
      };
      checkStandalone();

      if ((window as any).deferredPrompt) {
        setCanInstallNative(true);
      }

      const onCanInstall = () => setCanInstallNative(true);
      const onInstalled = () => {
        setCanInstallNative(false);
        setIsStandalone(true);
      };

      window.addEventListener('chillbill:caninstall', onCanInstall);
      window.addEventListener('chillbill:installed', onInstalled);

      return () => {
        window.removeEventListener('chillbill:caninstall', onCanInstall);
        window.removeEventListener('chillbill:installed', onInstalled);
      };
    }
  }, []);

  const handleInstallApp = async () => {
    if (typeof window === 'undefined') return;

    if (isStandalone) {
      toast({
        title: t("Already Installed"),
        description: t("ChillBill POS is already running as an installed standalone app."),
      });
      return;
    }

    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === 'accepted') {
          toast({
            title: t("Installing App"),
            description: t("ChillBill POS is being installed to your device / desktop."),
          });
        }
        (window as any).deferredPrompt = null;
        setCanInstallNative(false);
        return;
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    }

    setIsInstallDialogOpen(true);
  };

  const [selectedPOVendor, setSelectedPOVendor] = useState<string | null>(null);
  const [poItems, setPoItems] = useState<any[]>([]);
  const [grnItem, setGrnItem] = useState<InventoryItem | null>(null);
  const [grnQty, setGrnQty] = useState<number>(0);
  const [grnVendorId, setGrnVendorId] = useState<string>("");
  const [grnPayment, setGrnPayment] = useState<string>("0");

  // Receive Order States
  const [poToReceive, setPoToReceive] = useState<PurchaseOrder | null>(null);
  const [poPaymentAmount, setPoPaymentAmount] = useState('');
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

  const handleConfirmPoReceive = () => {
    if (!poToReceive) return;

    const paid = parseFloat(poPaymentAmount) || 0;
    // Calculate total based on received quantities
    let totalValue = 0;
    poToReceive.items.forEach(item => {
      totalValue += (receivedQuantities[item.inventoryItemId] ?? item.quantity) * item.unitCost;
    });

    const balance = totalValue - paid;

    // Update Inventory
    const updatedInventory = [...inventory];
    poToReceive.items.forEach(poItem => {
      const qty = receivedQuantities[poItem.inventoryItemId] ?? poItem.quantity;
      if (qty > 0) {
        const idx = updatedInventory.findIndex(i => i.id === poItem.inventoryItemId);
        if (idx > -1) {
          updatedInventory[idx] = { ...updatedInventory[idx], stock: updatedInventory[idx].stock + qty };
        }
      }
    });
    setInventory(updatedInventory);

    // Update PO Status
    if (setPurchaseOrders) {
      setPurchaseOrders(purchaseOrders.map(p => p.id === poToReceive.id ? { ...p, status: 'Received' } : p));
    }

    // Update Vendor Balance
    if (setVendors && poToReceive.vendorId) {
      const vIdx = vendors.findIndex(v => v.id === poToReceive.vendorId);
      if (vIdx > -1) {
        setVendors(vendors.map((v, i) => i === vIdx ? { ...v, balance: (v.balance || 0) + balance } : v));
      }
    }

    // Add Expense
    if (setExpenses && paid > 0) {
      setExpenses([...expenses, {
        id: generateUniqueId(),
        date: new Date(),
        category: 'Stock Purchase',
        description: `Payment for PO ${poToReceive.referenceNo}`,
        amount: paid,
        vendorId: poToReceive.vendorId
      }]);
    }

    toast({ title: t("Order Received"), description: `Stock updated. Balance: ${currency}${balance.toFixed(2)}` });
    setPoToReceive(null);
  };

  const [isReportLoading, setIsReportLoading] = useState(false);
  const [autoSendDaily, setAutoSendDaily] = useState(false);
  const [autoSendMonthly, setAutoSendMonthly] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [isSummaryDetailOpen, setIsSummaryDetailOpen] = useState(false);
  const [summaryDetailTitle, setSummaryDetailTitle] = useState('');
  const [summaryDetailContent, setSummaryDetailContent] = useState<React.ReactNode>(null);

  const menuCategories = useMemo(() => menu.map(cat => cat.name), [menu]);

  useEffect(() => {
    // This could be updated to fetch from a local file if vendors are also moved
  }, []);

  const todaysBills = useMemo(() => billHistory.filter(bill => bill.timestamp && isSameDay(new Date(bill.timestamp), new Date())), [billHistory]);

  const totalRevenue = useMemo(() => todaysBills.reduce((sum, bill) => sum + bill.total, 0), [todaysBills]);
  const totalOrders = useMemo(() => todaysBills.length, [todaysBills]);
  const averageOrderValue = useMemo(() => (totalOrders > 0 ? totalRevenue / totalOrders : 0), [totalRevenue, totalOrders]);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";

    // Summary Section
    csvContent += "Summary\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Revenue (Today),${currency}${(totalRevenue || 0).toFixed(2)}\n`;
    csvContent += `Total Orders (Today),${totalOrders}\n`;
    csvContent += `Average Order Value (Today),${currency}${(averageOrderValue || 0).toFixed(2)}\n`;
    csvContent += "\n";

    // Expenses
    csvContent += "Expenses\n";
    csvContent += "Date,Category,Description,Amount\n";
    expenses.forEach(expense => {
      csvContent += `${safeFormat(expense.date, 'yyyy-MM-dd')},${expense.category},"${expense.description || ''}",${expense.amount}\n`;
    });
    csvContent += "\n";

    // Bills
    csvContent += "Bill History\n";
    csvContent += 'id,total,timestamp,items\n';
    billHistory.forEach(bill => {
      const items = bill.orderItems.map(item => `${item.quantity}x ${item.name}`).join('; ');
      const timestamp = bill.timestamp ? new Date(bill.timestamp).toISOString() : 'N/A';
      csvContent += `${bill.id},${(bill.total || 0)},"${timestamp}","${items}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'all_data_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendReport = async (reportType: 'daily' | 'monthly' | 'yearly') => {
    setIsReportLoading(true);
    toast({
      title: 'Generating Report...',
      description: `Please wait while we generate the ${reportType} report. This may take a moment.`,
    });

    const input = {
      reportType,
      recipientEmail: venueDetails?.email || 'store@example.com',
      currency: currency,
    };

    try {
      const result = await generateAndSendReport(input);
      if (result.success) {
        toast({
          title: 'Report Sent!',
          description: `The ${reportType} report has been sent successfully.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (e: any) {
      console.error(`Failed to send ${reportType} report:`, e);
      toast({
        variant: 'destructive',
        title: 'Report Failed',
        description: e.message || `Could not send the ${reportType} report. Please try again.`,
      });
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleClearAllBills = async () => {
    try {
      await fetch('/api/bills', { method: 'DELETE' });
      toast({
        title: "All Bills Cleared",
        description: "The entire bill history has been successfully deleted.",
      });
      // You might need a way to refetch/update the billHistory state in MainLayout
    } catch (error) {
      console.error("Error clearing all bills:", error);
      toast({
        variant: "destructive",
        title: "Clearing Failed",
        description: "There was an error clearing the bill history. Please try again.",
      });
    }
  };

  const saveEmployeesToServer = async (updatedEmployees: Employee[]) => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: updatedEmployees }),
      });
      if (!response.ok) {
        throw new Error('Failed to save employees');
      }
      setEmployees(updatedEmployees);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save employee data to the server.',
      });
    }
  };

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    const existingIds = employees.map(e => parseInt(e.id.replace('UA', ''), 10)).filter(id => !isNaN(id));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const newId = `UA${(maxId + 1).toString().padStart(3, '0')}`;
    const newEmployee = { ...employee, id: newId };
    const updatedEmployees = [...employees, newEmployee];
    await saveEmployeesToServer(updatedEmployees);
    toast({ title: 'Employee Added', description: `${employee.name} saved with ID ${newId}.` });
  };

  const handleAddEmployee = (employee: Omit<Employee, 'id' | 'color'>) => {
    const newEmployee: Omit<Employee, 'id'> = {
      ...employee,
      color: colors[employees.length % colors.length]
    };
    addEmployee(newEmployee);
  }

  const updateEmployee = async (employee: Employee) => {
    const updatedEmployees = employees.map(e => e.id === employee.id ? employee : e);
    await saveEmployeesToServer(updatedEmployees);
    toast({ title: 'Employee Updated', description: 'Employee information has been updated.' });
  };

  const handleEditEmployee = (employee: Employee) => {
    updateEmployee(employee);
    setEditingEmployee(null);
  }

  const deleteEmployee = async (employeeId: string) => {
    const updatedEmployees = employees.filter(e => e.id !== employeeId);
    await saveEmployeesToServer(updatedEmployees);
    toast({ title: 'Employee Deleted', description: 'Employee has been removed from the database.' });
  };

  const handleDeleteEmployee = (employeeId: string) => {
    deleteEmployee(employeeId);
  }

  const openEditEmployeeDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsEditEmployeeDialogOpen(true);
  }



  const showRevenueDetails = () => {
    setSummaryDetailTitle("Today's Revenue Details");
    setSummaryDetailContent(
      todaysBills.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill ID</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {todaysBills.map(bill => (
              <TableRow key={bill.id}>
                <TableCell>{bill.id}</TableCell>
                <TableCell>{safeFormat(bill.timestamp, 'p')}</TableCell>
                <TableCell className="text-right font-mono">{currency}{(bill.total || 0).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-center p-8">No bills found for today.</p>
      )
    );
    setIsSummaryDetailOpen(true);
  };

  const showStaffDetails = () => {
    setSummaryDetailTitle("Active Staff");
    setSummaryDetailContent(
      employees.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Mobile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map(employee => (
              <TableRow key={employee.id}>
                <TableCell>{employee.name}</TableCell>
                <TableCell>{employee.role}</TableCell>
                <TableCell>{employee.mobile || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-center p-8">No employees found.</p>
      )
    );
    setIsSummaryDetailOpen(true);
  };

  return (
    <div className="p-6 space-y-6 bg-muted/30">
      {/* Daily Summary */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer" onClick={showRevenueDetails}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">{t('Total Revenue (Today)')}</CardTitle>
            <span className="text-green-600 font-bold">{currency}</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">{(totalRevenue || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer" onClick={showRevenueDetails}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">{t('Total Orders (Today)')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer" onClick={showRevenueDetails}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200">{t('Avg. Order Value')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">{currency}{(averageOrderValue || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer" onClick={showStaffDetails}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-200">{t('Active Staff')}</CardTitle>
            <User className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{employees.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-2">
              <SalesReport bills={billHistory} reportType={reportType} setReportType={setReportType} currency={currency} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('Action Center')}</CardTitle>
              <CardDescription>{t('Quick access to management tasks.')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="h-20 text-base flex-col gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary transition-all">
                    <History className="h-6 w-6" />
                    <span>{t('View Bills')}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>{t('Bill History')}</DialogTitle>
                    <DialogDescription>{t('A log of all completed transactions.')}</DialogDescription>
                  </DialogHeader>
                  <div className="pt-4">
                    <BillHistory bills={billHistory} onClearAll={handleClearAllBills} currency={currency} inventory={inventory} setInventory={setInventory} venueDetails={venueDetails} />
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isStaffManagerOpen} onOpenChange={setIsStaffManagerOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="h-20 text-base flex-col gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary transition-all">
                    <Users className="h-6 w-6" />
                    <span>{t('Manage Staff')}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>{t('Staff Management')}</DialogTitle>
                    <DialogDescription>{t('Add, edit, or remove staff members.')}</DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <Button onClick={() => { setEditingEmployee(null); setIsAddEmployeeDialogOpen(true); }}>
                      <PlusCircle className="mr-2 h-4 w-4" /> {t('ADD NEW EMPLOYEE')}
                    </Button>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('ID')}</TableHead>
                          <TableHead>{t('Name')}</TableHead>
                          <TableHead>{t('Role')}</TableHead>
                          <TableHead>{t('Mobile')}</TableHead>
                          <TableHead>{t('Govt ID')}</TableHead>
                          <TableHead>{t('Salary')} ({currency})</TableHead>
                          <TableHead className="text-right">{t('Actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{employee.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={cn('h-2 w-2 rounded-full', employee.color)} />
                                {employee.name}
                              </div>
                            </TableCell>
                            <TableCell>{employee.role}</TableCell>
                            <TableCell>{employee.mobile || 'N/A'}</TableCell>
                            <TableCell>{employee.govtId || 'N/A'}</TableCell>
                            <TableCell>{employee.salary.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditEmployeeDialog(employee)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('This action cannot be undone. This will permanently delete')} {employee.name}{t("'s record.")}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteEmployee(employee.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="h-20 text-base flex-col gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary transition-all">
                    <Package className="h-6 w-6" />
                    <span>{t('Inventory')}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>{t('Inventory Management')}</DialogTitle>
                  </DialogHeader>
                  <InventoryManagement inventory={inventory} menu={menu} vendors={vendors} setMenu={setMenu} setInventory={setInventory} />
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="lg" className="h-20 text-base flex-col gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary transition-all" onClick={handleExportCSV}>
                <Download className="h-6 w-6" />
                <span>{t('Export Data')}</span>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="h-20 text-base flex-col gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary transition-all">
                    <TrendingUp className="h-6 w-6" />
                    <span>Profit Analysis</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Profit Margin Analysis</DialogTitle>
                    <DialogDescription>Overview of your store's financial efficiency based on inventory costs.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Card className="bg-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-muted-foreground font-bold font-mono">Total Inventory Value (MRP)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-black text-primary">{currency}{(inventory.reduce((s, i) => s + (Number(i.price || 0) * Number(i.stock || 0)), 0)).toLocaleString()}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-primary/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-muted-foreground font-bold font-mono">Total Asset Cost</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-black text-primary">{currency}{(inventory.reduce((s, i) => s + (Number(i.costPrice || 0) * Number(i.stock || 0)), 0)).toLocaleString()}</div>
                      </CardContent>
                    </Card>
                    {(() => {
                      const totalValue = inventory.reduce((s, i) => s + (Number(i.price || 0) * Number(i.stock || 0)), 0);
                      const totalCost = inventory.reduce((s, i) => s + (Number(i.costPrice || 0) * Number(i.stock || 0)), 0);
                      const potProfit = totalValue - totalCost;
                      const isLoss = potProfit < 0;
                      return (
                        <Card className={cn(isLoss ? "bg-destructive/10" : "bg-orange-500/10")}>
                          <CardHeader className="pb-2">
                            <CardTitle className={cn("text-xs uppercase font-bold font-mono", isLoss ? "text-destructive" : "text-orange-600")}>
                              {isLoss ? "Potential Gross Loss" : "Potential Gross Profit"}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={cn("text-2xl font-black", isLoss ? "text-destructive" : "text-orange-600")}>
                              {currency}{potProfit.toLocaleString()}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>
                  <div className="mt-6">
                    <h4 className="font-bold text-sm mb-3 uppercase tracking-wider text-muted-foreground font-mono">Item-wise Margins</h4>
                    <div className="max-h-[40vh] overflow-y-auto border rounded-xl">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead>MRP</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Profit / Unit</TableHead>
                            <TableHead className="text-right">Margin %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventory.map(item => {
                            const profit = item.price - (item.costPrice || 0);
                            const margin = item.price > 0 ? (profit / item.price) * 100 : 0;
                            const isLoss = profit < 0;
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="font-bold">{item.name}</TableCell>
                                <TableCell>{currency}{(item.price || 0).toFixed(2)}</TableCell>
                                <TableCell>{currency}{(item.costPrice || 0).toFixed(2)}</TableCell>
                                <TableCell className={cn("font-bold", isLoss ? "text-destructive" : "text-green-600")}>
                                  {currency}{(profit || 0).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-black">
                                  <Badge
                                    variant={isLoss ? "destructive" : (margin > 20 ? "default" : "outline")}
                                    className={cn(!isLoss && margin > 20 ? "bg-green-500" : "")}
                                  >
                                    {(margin || 0).toFixed(1)}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="h-20 text-base flex-col gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary transition-all">
                    <FilePlus className="h-6 w-6" />
                    <span>Purchase Orders</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Purchase Orders & GRN</DialogTitle>
                    <DialogDescription>Create orders for suppliers and receive stock into inventory.</DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="create">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="create">{t('Create Order')}</TabsTrigger>
                      <TabsTrigger value="receive">{t('Receive Goods')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="create" className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Select Vendor</Label>
                          <Select onValueChange={(v) => setSelectedPOVendor(v)}>
                            <SelectTrigger><SelectValue placeholder="Chose Supplier" /></SelectTrigger>
                            <SelectContent>
                              {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Reference No.</Label>
                          <Input placeholder="PO-2024-001" id="po-ref-no" />
                        </div>
                      </div>
                      <div className="border rounded-xl p-4 bg-muted/30">
                        <h4 className="font-bold text-sm mb-2">Add Items to PO</h4>
                        <div className="flex gap-2">
                          <Select onValueChange={(id) => {
                            const item = inventory.find(i => i.id === id);
                            if (item) setPoItems([...poItems, {
                              inventoryItemId: item.id,
                              name: item.name,
                              quantity: 1,
                              unitCost: item.costPrice || 0,
                              unit: item.unit
                            }]);
                          }}>
                            <SelectTrigger className="flex-1"><SelectValue placeholder="Search Inventory..." /></SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {[...inventory].sort((a, b) => (a.stock || 0) - (b.stock || 0)).map(i => {
                                const stock = i.stock || 0;
                                const isLow = stock < 10;
                                const isOut = stock <= 0;
                                return (
                                  <SelectItem key={i.id} value={i.id} className="cursor-pointer border-b last:border-0 border-dashed border-gray-100">
                                    <div className="flex w-full min-w-[300px] justify-between items-center gap-4">
                                      <span className="font-medium">{i.name}</span>
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "text-xs font-bold px-2 py-0.5 rounded-full",
                                          isOut ? "bg-red-100 text-red-600" : (isLow ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600")
                                        )}>
                                          {stock} {i.unit}
                                        </span>
                                        {isOut && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">OUT</span>}
                                        {!isOut && isLow && <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">LOW</span>}
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Order Qty</TableHead>
                            <TableHead>Unit Cost</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {poItems.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell>
                                <Input type="number" className="w-20" value={item.quantity} onChange={(e) => {
                                  const newItems = [...poItems];
                                  newItems[idx].quantity = parseInt(e.target.value) || 0;
                                  setPoItems(newItems);
                                }} />
                              </TableCell>
                              <TableCell>
                                <Input type="number" className="w-24" value={item.unitCost} onChange={(e) => {
                                  const newItems = [...poItems];
                                  newItems[idx].unitCost = parseFloat(e.target.value) || 0;
                                  setPoItems(newItems);
                                }} />
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {currency}{(item.quantity * item.unitCost).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="flex justify-end p-4 bg-muted/20 rounded-lg">
                        <div className="text-right">
                          <span className="text-sm text-muted-foreground mr-2">Total Amount:</span>
                          <span className="text-xl font-bold">{currency}{poItems.reduce((s, i) => s + (i.quantity * i.unitCost), 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button className="w-full" onClick={() => {
                          if (!selectedPOVendor) {
                            toast({ title: "Error", description: "Please select a vendor.", variant: "destructive" });
                            return;
                          }
                          const refNo = (document.getElementById('po-ref-no') as HTMLInputElement)?.value || `PO-${Date.now()}`;
                          const totalAmount = poItems.reduce((s, i) => s + (i.quantity * i.unitCost), 0);

                          const newPO: PurchaseOrder = {
                            id: Date.now().toString(),
                            vendorId: selectedPOVendor,
                            vendorName: vendors.find(v => v.id === selectedPOVendor)?.name || '',
                            date: new Date(),
                            referenceNo: refNo,
                            items: poItems.map(i => ({
                              inventoryItemId: i.inventoryItemId,
                              name: i.name,
                              quantity: i.quantity,
                              unitCost: i.unitCost,
                              totalCost: i.quantity * i.unitCost
                            })),
                            totalAmount,
                            status: 'Ordered'
                          };

                          if (props.setPurchaseOrders) {
                            props.setPurchaseOrders([...(props.purchaseOrders || []), newPO]);
                            toast({ title: "PO Created", description: "Purchase Order has been generated and saved." });
                            setPoItems([]);
                          } else {
                            toast({ title: "Error", description: "Could not save PO. State function missing.", variant: "destructive" });
                          }
                        }} disabled={poItems.length === 0}>Generate Purchase Order</Button>
                      </DialogFooter>
                    </TabsContent>
                    <TabsContent value="receive" className="space-y-4 pt-4">
                      {/* Robust PO Receiving Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <List className="h-4 w-4" /> {t('Pending Purchase Orders')}
                          </h4>
                          <Badge variant="outline">{purchaseOrders.filter(p => p.status === 'Ordered').length} {t('Pending')}</Badge>
                        </div>
                        <div className="border rounded-xl overflow-hidden bg-white dark:bg-black/20">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead>{t('Date')}</TableHead>
                                <TableHead>{t('Vendor')}</TableHead>
                                <TableHead>{t('Reference')}</TableHead>
                                <TableHead>{t('Items')}</TableHead>
                                <TableHead className="text-right">{t('Amount')}</TableHead>
                                <TableHead className="text-right">{t('Action')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {purchaseOrders.filter(p => p.status === 'Ordered').length > 0 ? (
                                purchaseOrders.filter(p => p.status === 'Ordered').map(po => (
                                  <TableRow key={po.id} className="hover:bg-muted/20 transition-colors">
                                    <TableCell className="py-2 text-xs">{po.date ? new Date(po.date).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell className="py-2 font-medium">{po.vendorName}</TableCell>
                                    <TableCell className="py-2 text-xs font-mono">{po.referenceNo}</TableCell>
                                    <TableCell className="py-2">
                                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                                        {po.items.map((item, idx) => (
                                          <Badge key={idx} variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-primary/5">
                                            {item.quantity}x {item.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-2 text-right font-bold">{currency}{po.totalAmount.toFixed(2)}</TableCell>
                                    <TableCell className="py-2 text-right">
                                      <Button size="sm" className="h-7 text-xs bg-primary/10 hover:bg-primary/20 text-primary border-primary/20" variant="outline" onClick={() => {
                                        setPoToReceive(po);
                                        setPoPaymentAmount('0');
                                        const qtys: Record<string, number> = {};
                                        po.items.forEach(i => qtys[i.inventoryItemId] = i.quantity);
                                        setReceivedQuantities(qtys);
                                      }}>
                                        {t('Receive')}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">
                                    {t('No pending orders found.')}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <Separator className="my-6" />

                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <PackageCheck className="h-10 w-10 text-blue-500 mb-4" />
                        <h3 className="text-lg font-bold">{t('Quick GRN & Spot Purchase')}</h3>
                        <p className="text-sm text-muted-foreground mb-6">{t('Directly receive items without a pre-existing PO.')}</p>
                        <div className="w-full max-w-sm space-y-4 text-left">
                          <Select onValueChange={(id) => setGrnItem(inventory.find(i => i.id === id) || null)}>
                            <SelectTrigger className="h-11 shadow-sm"><SelectValue placeholder={t('Select Item to Receive')} /></SelectTrigger>
                            <SelectContent>
                              {inventory.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                            </SelectContent>
                          </Select>

                          {grnItem && (
                            <Card className="p-5 shadow-xl border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                              <div className="flex justify-between items-center mb-6">
                                <span className="font-black text-lg">{grnItem.name}</span>
                                <Badge variant="secondary" className="font-mono">{t('In Stock')}: {grnItem.stock}</Badge>
                              </div>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">{t('Qty Received')}</Label>
                                    <Input type="number" className="h-11 text-lg font-bold" placeholder="0" value={grnQty} onChange={(e) => setGrnQty(parseInt(e.target.value) || 0)} />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">{t('Paid Now')}</Label>
                                    <Input type="number" className="h-11 text-lg font-bold text-green-600" placeholder="0" value={grnPayment} onChange={(e) => setGrnPayment(e.target.value)} />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <Label className="text-xs uppercase font-bold text-muted-foreground">{t('Select Vendor')}</Label>
                                  <Select value={grnVendorId} onValueChange={setGrnVendorId}>
                                    <SelectTrigger className="h-10"><SelectValue placeholder={t('Optionally assign to vendor')} /></SelectTrigger>
                                    <SelectContent>
                                      {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-primary/10 flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold text-muted-foreground uppercase">{t('Total Cost')}</span>
                                  <span className="text-lg font-black">{currency}{(grnQty * (grnItem.costPrice || 0)).toFixed(2)}</span>
                                </div>

                                <Button className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all hover:scale-[1.02] active:scale-95" onClick={() => {
                                  if (grnQty <= 0) {
                                    toast({ title: t("Error"), description: t("Quantity must be greater than zero."), variant: "destructive" });
                                    return;
                                  }

                                  const totalCost = grnQty * (grnItem.costPrice || 0);
                                  const paid = parseFloat(grnPayment) || 0;
                                  const balance = totalCost - paid;

                                  // Update Stock
                                  const updatedInv = inventory.map(i => i.id === grnItem.id ? { ...i, stock: i.stock + grnQty } : i);
                                  setInventory(updatedInv);

                                  // Update Vendor Balance if selected
                                  if (grnVendorId && setVendors) {
                                    setVendors(vendors.map(v => v.id === grnVendorId ? { ...v, balance: (v.balance || 0) + balance } : v));
                                  }

                                  // Record Expense
                                  if (paid > 0 && setExpenses) {
                                    setExpenses([...expenses, {
                                      id: generateUniqueId(),
                                      date: new Date(),
                                      category: 'Stock Purchase',
                                      description: `Quick GRN: ${grnQty}x ${grnItem.name}`,
                                      amount: paid,
                                      vendorId: grnVendorId || null
                                    }]);
                                  }

                                  toast({ title: t("Stock Updated"), description: `${t('Added')} ${grnQty} ${t('units to')} ${grnItem.name}.` });
                                  setGrnItem(null);
                                  setGrnQty(0);
                                  setGrnPayment("0");
                                  setGrnVendorId("");
                                }}>
                                  <PackageCheck className="mr-2 h-5 w-5" /> {t('Confirm Receipt')}
                                </Button>
                                <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setGrnItem(null)}>{t('Cancel')}</Button>
                              </div>
                            </Card>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="lg"
                className="h-20 text-base flex-col gap-2 bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500 text-emerald-700 dark:text-emerald-300 transition-all shadow-sm"
                onClick={() => setIsGstr1Open(true)}
              >
                <Landmark className="h-6 w-6 text-emerald-600" />
                <span className="font-bold">GSTR-1 Tax Report</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-20 text-base flex-col gap-2 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 transition-all shadow-sm font-semibold"
                onClick={handleInstallApp}
              >
                <Download className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold">{t('Install App')}</span>
              </Button>
              <Button variant="outline" size="lg" className="h-20 text-base flex-col gap-2 col-span-full mt-2 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary transition-all" onClick={onRerunSetup}>
                <Repeat className="h-6 w-6" />
                <span>{t('Rerun Setup Wizard')}</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('Settings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Install App Banner in Settings */}
              <div className="p-4 rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-primary/5 to-transparent space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-sm font-bold">{t('Install ChillBill POS App')}</h4>
                      {isStandalone && (
                        <span className="text-[10px] bg-green-500/20 text-green-700 dark:text-green-300 font-bold px-2 py-0.5 rounded-full">
                          Installed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Install as standalone desktop or mobile application for 1-click launch and instant access.
                    </p>
                  </div>
                  <Button
                    onClick={handleInstallApp}
                    size="sm"
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    {isStandalone ? t('App Info') : t('Install App')}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <CardTitle className="text-base flex items-center gap-2"><Settings /> {t('Bill Print Settings')}</CardTitle>
                <div className="space-y-2">
                  <Label htmlFor="receipt-header">{t('Receipt Header Message')}</Label>
                  <Input
                    id="receipt-header"
                    value={venueDetails?.receiptHeader || ''}
                    onChange={(e) => {
                      if (venueDetails) {
                        setVenueDetails({ ...venueDetails, receiptHeader: e.target.value });
                      }
                    }}
                    placeholder={t("e.g., GST: 123456789")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt-footer">{t('Receipt Footer Message')}</Label>
                  <Input
                    id="receipt-footer"
                    value={venueDetails?.receiptFooter || ''}
                    onChange={(e) => {
                      if (venueDetails) {
                        setVenueDetails({ ...venueDetails, receiptFooter: e.target.value });
                      }
                    }}
                    placeholder={t("e.g., Follow us on Instagram!")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-message">{t('Custom Receipt Message')}</Label>
                  <Input
                    id="custom-message"
                    value={venueDetails?.customMessage || ''}
                    onChange={(e) => {
                      if (venueDetails) {
                        setVenueDetails({ ...venueDetails, customMessage: e.target.value });
                      }
                    }}
                    placeholder={t("e.g., SAVE THIS BILL FOR REPLACEMENTS")}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-4 pt-4">
                <CardTitle className="text-base flex items-center gap-2"><Mail /> {t('Email Reports')}</CardTitle>
                <div className='flex flex-wrap gap-2'>
                  <Button variant="secondary" onClick={() => handleSendReport('daily')} disabled={isReportLoading}>
                    {t('Send Daily')}
                  </Button>
                  <Button variant="secondary" onClick={() => handleSendReport('monthly')} disabled={isReportLoading}>
                    {t('Send Monthly')}
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-daily" checked={autoSendDaily} onCheckedChange={setAutoSendDaily} />
                    <Label htmlFor="auto-daily">{t('Auto-send Daily Report')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-monthly" checked={autoSendMonthly} onCheckedChange={setAutoSendMonthly} />
                    <Label htmlFor="auto-monthly">{t('Auto-send Monthly Report')}</Label>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4 pt-4">
                <CardTitle className="text-base flex items-center gap-2"><CreditCard /> {t('Financial Settings')}</CardTitle>
                <div className="space-y-2">
                  <Label htmlFor="store-gstin">Store GSTIN (15-Digit GST Number)</Label>
                  <Input
                    id="store-gstin"
                    value={venueDetails?.gstin || ''}
                    onChange={(e) => {
                      if (venueDetails) {
                        setVenueDetails({ ...venueDetails, gstin: e.target.value.toUpperCase() });
                      }
                    }}
                    placeholder="e.g., 07AAAAA0000A1Z5"
                    className="font-mono uppercase text-sm"
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-state">Store State & State Code</Label>
                  <Input
                    id="store-state"
                    value={venueDetails?.state || ''}
                    onChange={(e) => {
                      if (venueDetails) {
                        setVenueDetails({ ...venueDetails, state: e.target.value });
                      }
                    }}
                    placeholder="e.g., 07 - Delhi"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-fssai">FSSAI License No. (Supermarket/Grocery)</Label>
                  <Input
                    id="store-fssai"
                    value={venueDetails?.fssaiNumber || ''}
                    onChange={(e) => {
                      if (venueDetails) {
                        setVenueDetails({ ...venueDetails, fssaiNumber: e.target.value });
                      }
                    }}
                    placeholder="e.g., 10020011000123"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">UPI Payment Verification Mode</Label>
                  <RadioGroup
                    value={venueDetails?.upiMode || 'standee'}
                    onValueChange={(val: 'standee' | 'screen') => {
                      if (venueDetails) {
                        setVenueDetails({ ...venueDetails, upiMode: val });
                      }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                  >
                    <label
                      htmlFor="admin-mode-standee"
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
                        (venueDetails?.upiMode || 'standee') === 'standee' ? "border-primary bg-primary/5" : "border-border/60"
                      )}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs block">Counter QR Standee (Default)</span>
                        <span className="text-[10px] text-muted-foreground block">Customer scans your paper standee & types amount</span>
                      </div>
                      <RadioGroupItem value="standee" id="admin-mode-standee" />
                    </label>

                    <label
                      htmlFor="admin-mode-screen"
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all",
                        venueDetails?.upiMode === 'screen' ? "border-primary bg-primary/5" : "border-border/60"
                      )}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs block">Dynamic On-Screen QR</span>
                        <span className="text-[10px] text-muted-foreground block">Pops up dynamic QR on screen with amount locked</span>
                      </div>
                      <RadioGroupItem value="screen" id="admin-mode-screen" />
                    </label>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-upi-id">Store UPI ID / VPA (For Dynamic QR & Auto-Detection)</Label>
                  <Input
                    id="store-upi-id"
                    value={venueDetails?.upiId || ''}
                    onChange={(e) => {
                      if (venueDetails) {
                        setVenueDetails({ ...venueDetails, upiId: e.target.value.trim() });
                      }
                    }}
                    placeholder="e.g., storename@icici or 9876543210@paytm"
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Accept payments via GPay, PhonePe, Paytm, BHIM. All customer payments route directly to this UPI address.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-upi-merchant">Merchant Business Name (Displayed in UPI Apps)</Label>
                  <Input
                    id="store-upi-merchant"
                    value={venueDetails?.upiMerchantName || ''}
                    onChange={(e) => {
                      if (venueDetails) {
                        setVenueDetails({ ...venueDetails, upiMerchantName: e.target.value });
                      }
                    }}
                    placeholder={venueName || "e.g., Apna Departmental Store"}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-3 p-3 bg-muted/40 rounded-xl border border-border/60">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="soundbox-toggle" className="text-xs font-bold uppercase tracking-wider">In-Software Soundbox (Audio & Voice)</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Plays a cash chime and speaks the received amount aloud through store speakers without extra hardware.
                      </p>
                    </div>
                    <Switch
                      id="soundbox-toggle"
                      checked={venueDetails?.upiSoundboxEnabled ?? true}
                      onCheckedChange={(checked) => {
                        if (venueDetails) {
                          setVenueDetails({ ...venueDetails, upiSoundboxEnabled: checked });
                        }
                      }}
                    />
                  </div>
                  {(venueDetails?.upiSoundboxEnabled ?? true) && (
                    <div className="space-y-1.5 pt-1 border-t border-border/40">
                      <Label htmlFor="soundbox-voice" className="text-xs font-semibold">Soundbox Voice Language</Label>
                      <Select
                        value={venueDetails?.upiSoundboxVoice || 'en'}
                        onValueChange={(val: 'en' | 'hi') => {
                          if (venueDetails) {
                            setVenueDetails({ ...venueDetails, upiSoundboxVoice: val });
                          }
                        }}
                      >
                        <SelectTrigger id="soundbox-voice" className="h-9 text-xs">
                          <SelectValue placeholder="Select Voice Language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English ("Payment of Rs. amount received successfully via UPI")</SelectItem>
                          <SelectItem value="hi">Hindi ("UPI par amount rupaye prapt hue")</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-limit">{t('Customer Credit Limit')} ({currency})</Label>
                  <Input
                    id="customer-limit"
                    type="number"
                    value={customerCreditLimit}
                    onChange={(e) => setCustomerCreditLimit(Number(e.target.value))}
                    placeholder="e.g., 10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-limit">{t('Vendor Credit Limit')} ({currency})</Label>
                  <Input
                    id="vendor-limit"
                    type="number"
                    value={vendorCreditLimit}
                    onChange={(e) => setVendorCreditLimit(Number(e.target.value))}
                    placeholder="e.g., 50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-discount">{t('Default Overall Discount')} (%)</Label>
                  <Input
                    id="default-discount"
                    type="number"
                    value={venueDetails?.defaultDiscount || 0}
                    onChange={(e) => {
                      if (venueDetails) {
                        setVenueDetails({ ...venueDetails, defaultDiscount: Number(e.target.value) });
                      }
                    }}
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vat-percentage">{t('VAT Percentage')} (%)</Label>
                  <Input
                    id="vat-percentage"
                    type="number"
                    value={venueDetails?.vatPercentage || 0}
                    onChange={(e) => {
                      if (venueDetails) {
                        setVenueDetails({ ...venueDetails, vatPercentage: Number(e.target.value) });
                      }
                    }}
                    placeholder="e.g., 15"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <EmployeeDialog
        key={editingEmployee?.id ?? 'add'}
        open={isAddEmployeeDialogOpen || isEditEmployeeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEmployee(null);
            setIsAddEmployeeDialogOpen(false);
            setIsEditEmployeeDialogOpen(false);
          } else if (editingEmployee) {
            setIsEditEmployeeDialogOpen(true);
          } else {
            setIsAddEmployeeDialogOpen(true);
          }
        }}
        employee={editingEmployee}
        onSave={(employeeData) => {
          if (editingEmployee) {
            handleEditEmployee({ ...editingEmployee, ...employeeData });
          } else {
            handleAddEmployee(employeeData as Omit<Employee, 'id' | 'color'>);
          }
        }}
      />
      <Dialog open={isSummaryDetailOpen} onOpenChange={setIsSummaryDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{summaryDetailTitle}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {summaryDetailContent}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSummaryDetailOpen(false)}>{t('Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!poToReceive} onOpenChange={(open) => !open && setPoToReceive(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('Verify Received Goods & Process Payment')}</DialogTitle>
            <DialogDescription>{t('Update quantities received and record any payment made.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="border rounded-lg overflow-hidden bg-muted/20">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="text-xs h-8 uppercase">{t('Item')}</TableHead>
                    <TableHead className="text-xs h-8 text-center uppercase">{t('Ordered')}</TableHead>
                    <TableHead className="text-xs h-8 text-right uppercase w-[120px]">{t('Received')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poToReceive?.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="py-2 text-sm font-medium">{item.name}</TableCell>
                      <TableCell className="py-2 text-sm text-center font-mono">{item.quantity}</TableCell>
                      <TableCell className="py-2 text-right">
                        <Input
                          type="number"
                          className="h-8 text-right font-bold focus-visible:ring-primary"
                          value={receivedQuantities[item.inventoryItemId] ?? item.quantity}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setReceivedQuantities(prev => ({ ...prev, [item.inventoryItemId]: val }));
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 gap-6 bg-primary/5 p-4 rounded-xl border border-primary/20">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">{t('Expected Total')}</p>
                <p className="text-2xl font-black text-primary">
                  {currency}{(poToReceive?.items.reduce((s, i) => s + (receivedQuantities[i.inventoryItemId] ?? i.quantity) * i.unitCost, 0) || 0).toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-tight">{t('Amount Paid')}</Label>
                <Input
                  type="number"
                  className="h-10 text-xl font-black text-green-600 bg-white dark:bg-black/40"
                  value={poPaymentAmount}
                  onChange={e => setPoPaymentAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-between items-center bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-destructive">
              <span className="text-xs font-bold uppercase">{t('Remaining Balance (To Credit)')}</span>
              <span className="text-lg font-black">
                {currency}{Math.max(0, (poToReceive?.items.reduce((s, i) => s + (receivedQuantities[i.inventoryItemId] ?? i.quantity) * i.unitCost, 0) || 0) - (parseFloat(poPaymentAmount) || 0)).toFixed(2)}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoToReceive(null)}>{t('Cancel')}</Button>
            <Button onClick={handleConfirmPoReceive} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <PackageCheck className="mr-2 h-4 w-4" /> {t('Confirm & Update Stock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Download className="h-5 w-5 text-indigo-600" />
              {t('Install ChillBill POS App')}
            </DialogTitle>
            <DialogDescription>
              {t('Run ChillBill POS directly on your Windows PC, Mac, Android, or iPhone/iPad just like a native app.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {canInstallNative && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">{t('1-Click Direct Install Ready')}</p>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">{t('Click below to trigger instant browser installation.')}</p>
                </div>
                <Button onClick={handleInstallApp} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm">
                  <Download className="h-4 w-4 mr-1.5" />
                  {t('Install Now')}
                </Button>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="p-3.5 rounded-xl border bg-muted/40 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Monitor className="h-4 w-4 text-blue-600" />
                  <span>Windows PC & Mac (Chrome / Edge / Brave)</span>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Look at the right side of your browser URL bar. Click the <strong>Install (⊕ or Computer)</strong> icon, or click the <strong>3 dots (⋮) → "Install ChillBill POS"</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/40 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Smartphone className="h-4 w-4 text-green-600" />
                  <span>Android (Chrome)</span>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Tap the <strong>3 dots (⋮)</strong> in the top-right corner, then tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border bg-muted/40 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Tap the <strong>Share button (square with arrow ⎋)</strong> at the bottom of Safari, scroll down and tap <strong>"Add to Home Screen"</strong>.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInstallDialogOpen(false)}>
              {t('Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Gstr1ReportDialog
        isOpen={isGstr1Open}
        onOpenChange={setIsGstr1Open}
        bills={billHistory}
        currency={currency}
        venueDetails={venueDetails}
      />
    </div >
  );
}


function EmployeeDialog({ open, onOpenChange, employee, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; employee: Employee | null; onSave: (data: Partial<Employee>) => void; }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [salary, setSalary] = useState('');
  const [mobile, setMobile] = useState('');
  const [govtId, setGovtId] = useState('');

  useEffect(() => {
    if (open) {
      setName(employee?.name || '');
      const empRole = employee?.role || '';
      if (defaultRoles.includes(empRole)) {
        setRole(empRole);
        setCustomRole('');
      } else if (empRole) {
        setRole('Other');
        setCustomRole(empRole);
      } else {
        setRole('');
        setCustomRole('');
      }
      setSalary(employee?.salary?.toString() || '');
      setMobile(employee?.mobile || '');
      setGovtId(employee?.govtId || '');
    }
  }, [open, employee]);

  const handleSave = () => {
    const finalRole = role === 'Other' ? customRole : role;
    if (!name || !finalRole || !salary) {
      // Or show a toast message
      return;
    }

    const data: Partial<Employee> = {
      name,
      role: finalRole,
      salary: parseFloat(salary),
      mobile,
      govtId
    };

    if (employee) {
      data.id = employee.id;
    }
    onSave(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <DialogHeader>
            <DialogTitle>{employee ? t("Edit Employee") : t("Add New Employee")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('Employee Name')}</Label>
              <Input id="name" placeholder={t('e.g., John Doe')} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{t('Role')}</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger id="role">
                  <SelectValue placeholder={t('Select a role')} />
                </SelectTrigger>
                <SelectContent>
                  {defaultRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  <SelectItem value="Other">{t('Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === 'Other' && (
              <div className="space-y-2">
                <Label htmlFor="custom-role">{t('Custom Role')}</Label>
                <Input id="custom-role" placeholder={t('e.g., Dishwasher')} value={customRole} onChange={(e) => setCustomRole(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="salary">{t('Salary')}</Label>
              <Input id="salary" type="number" placeholder="e.g., 30000" value={salary} onChange={(e) => setSalary(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">{t('Mobile No.')}</Label>
              <Input id="mobile" placeholder={t('e.g., 9876543210')} value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="govtId">{t('Govt. ID')}</Label>
              <Input id="govtId" placeholder="e.g., Aadhar/PAN" value={govtId} onChange={(e) => setGovtId(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
            <Button type="submit">{employee ? t("Save Changes") : t("Add New Employee")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}



