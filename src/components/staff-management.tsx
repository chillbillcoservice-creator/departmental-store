
'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarProps } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Check, X, CircleSlash, Pencil, UserCheck, UserX, UserMinus, Banknote, Eye, Shield, Copy, Receipt, Clock, Truck, Printer, Share2, Wallet } from 'lucide-react';
import { generateUniqueUsername, isUsernameTaken } from '@/lib/generate-username';
import type { Employee, Advance, Attendance, AttendanceStatus, StaffShiftSession } from '@/lib/types';
import { getShiftHistory, formatDuration, generateShiftReceiptText } from '@/lib/shift-manager';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay, startOfDay, isToday, isPast, getMonth, getYear, getDaysInMonth, isValid } from 'date-fns';

const safeFormat = (date: any, formatStr: string) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (!isValid(d)) return 'N/A';
  return format(d, formatStr);
};

// Generate unique ID to prevent duplicate keys
const generateUniqueId = () => {
  return `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
};
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { DayContent, DayContentProps } from 'react-day-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const attendanceStatusConfig: Record<AttendanceStatus, { icon: React.ElementType, color: string, label: string, className: string }> = {
  'Present': { icon: UserCheck, color: 'green', label: 'Present', className: 'bg-green-500 hover:bg-green-600 text-white' },
  'Absent': { icon: UserX, color: 'red', label: 'Absent', className: 'bg-red-500 hover:bg-red-600 text-white' },
  'Half-day': { icon: UserMinus, color: 'yellow', label: 'Half-day', className: 'bg-yellow-500 hover:bg-yellow-600 text-black' }
};

const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
const defaultRoles = ["Store Manager", "Cashier", "Inventory Clerk", "Billing Clerk", "Floor Assistant", "Security", "Helper"];

interface StaffManagementProps {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  advances: Advance[];
  setAdvances: (advances: Advance[]) => void;
  attendance: Attendance[];
  setAttendance: (attendance: Attendance[]) => void;
  currency: string;
}

export default function StaffManagement({ employees, setEmployees, advances, setAdvances, attendance, setAttendance, currency = 'Rs.' }: StaffManagementProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [summaryEmployee, setSummaryEmployee] = useState<Employee | null>(null);
  const [isAttendanceListDialogOpen, setIsAttendanceListDialogOpen] = useState(false);
  const [attendanceList, setAttendanceList] = useState<{ title: string, employees: Employee[] }>({ title: '', employees: [] });

  const [shiftHistory, setShiftHistory] = useState<StaffShiftSession[]>([]);
  const [selectedShiftDetails, setSelectedShiftDetails] = useState<StaffShiftSession | null>(null);

  useEffect(() => {
    setShiftHistory(getShiftHistory());
  }, []);

  const [showAdvancesOnCalendar, setShowAdvancesOnCalendar] = useState(false);
  const [showAbsencesOnCalendar, setShowAbsencesOnCalendar] = useState(false);
  const [showPresentsOnCalendar, setShowPresentsOnCalendar] = useState(false);

  const isDateLocked = isPast(selectedDate) && !isToday(selectedDate);

  const advancesForSelectedDate = useMemo(() => advances.filter(
    (advance) => isSameDay(new Date(advance.date), selectedDate)
  ), [advances, selectedDate]);

  const attendanceForSelectedDate = useMemo(() => attendance.filter(
    (att) => isSameDay(new Date(att.date), selectedDate)
  ), [attendance, selectedDate]);

  const datesWithAdvance = useMemo(() => {
    if (!showAdvancesOnCalendar) return [];
    return advances.map(a => startOfDay(new Date(a.date)));
  }, [advances, showAdvancesOnCalendar]);

  const datesWithAbsence = useMemo(() => {
    if (!showAbsencesOnCalendar) return [];
    return attendance
      .filter(a => a.status === 'Absent')
      .map(a => startOfDay(new Date(a.date)));
  }, [attendance, showAbsencesOnCalendar]);


  const handleSaveEmployee = (employeeData: Partial<Employee>) => {
    const { id, ...data } = employeeData;
    let newEmployees;
    if (id) {
      newEmployees = employees.map(e => e.id === id ? { ...e, ...data } : e);
      toast({ title: t('Employee Updated') });
    } else {
      const existingIds = employees.map(e => parseInt(e.id.replace('UA', ''), 10)).filter(id => !isNaN(id));
      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      const newId = `UA${(maxId + 1).toString().padStart(3, '0')}`;
      const newEmployee = {
        ...(data as Omit<Employee, 'id' | 'color'>),
        id: newId,
        color: colors[employees.length % colors.length]
      };
      newEmployees = [...employees, newEmployee];
      toast({ title: t('Employee Added'), description: `${data.name} saved with ID ${newId}.` });
    }
    setEmployees(newEmployees);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    const newEmployees = employees.filter(e => e.id !== employeeId);
    setEmployees(newEmployees);
    toast({ title: t('Employee Deleted') });
  };

  const openEmployeeDialog = (employee: Employee | null) => {
    setEditingEmployee(employee);
    setIsEmployeeDialogOpen(true);
  };

  const handleSaveAdvance = (advance: Omit<Advance, 'id'> & { id?: string }) => {
    const { id, ...advanceData } = advance;
    let newAdvances;
    if (id) {
      newAdvances = advances.map(a => a.id === id ? { ...a, ...advanceData } : a);
      toast({ title: t('Advance Updated') });
    } else {
      const newAdvance = { ...advanceData, id: generateUniqueId() };
      newAdvances = [...advances, newAdvance];
      toast({ title: t('Advance Saved') });
    }
    setAdvances(newAdvances);
  }

  const openAdvanceDialog = (advance: Advance | null, employee?: Employee) => {
    setEditingAdvance(advance);
    if (!advance && employee) {
      setEditingAdvance({ employeeId: employee.id } as Advance);
    }
    setIsAdvanceDialogOpen(true);
  }

  const handleMarkAttendance = (employeeId: string, status: AttendanceStatus) => {
    if (isDateLocked) {
      return;
    }
    const dateKey = safeFormat(selectedDate, 'yyyy-MM-dd');
    const attendanceId = `${employeeId}_${dateKey}`;

    const existingRecord = attendance.find(a => a.id === attendanceId);

    let newAttendanceList;
    if (existingRecord) {
      newAttendanceList = attendance.map(a => a.id === attendanceId ? { ...a, status } : a);
    } else {
      const newRecord: Attendance = {
        id: attendanceId,
        employeeId,
        date: startOfDay(selectedDate),
        status,
      };
      newAttendanceList = [...attendance, newRecord];
    }

    setAttendance(newAttendanceList);
    toast({
      title: t('Attendance Marked'),
      description: `${employees.find(e => e.id === employeeId)?.name} marked as ${status}.`
    });
  }

  const handleSaveNote = (note: string) => {
    if (!editingAttendance) return;
    const newAttendanceList = attendance.map(a => a.id === editingAttendance.id ? { ...a, notes: note } : a);
    setAttendance(newAttendanceList);
    toast({ title: t('Note Saved') });
    setIsNotesDialogOpen(false);
    setEditingAttendance(null);
  }

  const openNotesDialog = (employeeId: string) => {
    const dateKey = safeFormat(selectedDate, 'yyyy-MM-dd');
    const attendanceId = `${employeeId}_${dateKey}`;
    const record = attendance.find(a => a.id === attendanceId);
    if (record) {
      setEditingAttendance(record);
      setIsNotesDialogOpen(true);
    } else {
      toast({ variant: 'destructive', title: t('Mark Attendance First'), description: t('You must mark attendance before adding a note.') })
    }
  }

  const openSummaryDialog = (employee: Employee) => {
    setSummaryEmployee(employee);
    setIsSummaryDialogOpen(true);
  }

  const openAttendanceListDialog = (status: AttendanceStatus) => {
    const employeeIds = attendanceForSelectedDate.filter(att => att.status === status).map(att => att.employeeId);
    const employeeList = employees.filter(emp => employeeIds.includes(emp.id));
    setAttendanceList({ title: `${status} Employees`, employees: employeeList });
    setIsAttendanceListDialogOpen(true);
  };

  const advancesByEmployee = useMemo(() => {
    return advances.reduce((acc, advance) => {
      if (!acc[advance.employeeId]) {
        acc[advance.employeeId] = [];
      }
      acc[advance.employeeId].push(advance);
      return acc;
    }, {} as Record<string, Advance[]>);
  }, [advances]);

  const CustomDay = (props: DayContentProps) => {
    const { date } = props;
    const dayAdvances = showAdvancesOnCalendar ? advances.filter(a => isSameDay(new Date(a.date), date)) : [];
    const dayAbsences = showAbsencesOnCalendar ? attendance.filter(a => isSameDay(new Date(a.date), date) && a.status === 'Absent') : [];
    const dayPresents = showPresentsOnCalendar ? attendance.filter(a => isSameDay(new Date(a.date), date) && a.status === 'Present') : [];

    // Merge events to show dots
    const events = [
      ...dayAdvances.map(a => ({ type: 'advance', employeeId: a.employeeId })),
      ...dayAbsences.map(a => ({ type: 'absence', employeeId: a.employeeId })),
      ...dayPresents.map(a => ({ type: 'present', employeeId: a.employeeId }))
    ];

    // De-duplicate per employee per day for dot rendering if multiple events exist (though usually one status per day)
    const uniqueEmployeeIds = new Set(events.map(e => e.employeeId));

    return (
      <div className="relative h-full w-full flex items-center justify-center">
        <DayContent {...props} />
        {uniqueEmployeeIds.size > 0 && (
          <div className="absolute bottom-0.5 flex items-center justify-center space-x-1">
            {Array.from(uniqueEmployeeIds).slice(0, 5).map(employeeId => {
              const employee = employees.find(e => e.id === employeeId);
              if (!employee) return null;

              const isAbsent = dayAbsences.some(a => a.employeeId === employeeId);
              const isPresent = dayPresents.some(a => a.employeeId === employeeId);

              let dotColor = "bg-gray-300"; // Default fallback
              if (isAbsent) {
                dotColor = "bg-red-500";
              } else if (isPresent) {
                dotColor = "bg-green-500";
              } else {
                // If it's just an advance or other status not explicitly colored yet
                dotColor = employee.color;
              }

              // Users requested Absent = Red, Present = Green.

              return (
                <TooltipProvider key={employeeId}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          dotColor
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{employee.name} - {isAbsent ? 'Absent' : isPresent ? 'Present' : 'Info'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        )}
      </div>
    );
  }

  const totalAdvanceForDay = useMemo(() => {
    return advancesForSelectedDate.reduce((sum, advance) => sum + advance.amount, 0);
  }, [advancesForSelectedDate]);

  const employeeSummaries = useMemo(() => {
    const now = new Date();
    const currentMonth = getMonth(now);
    const currentYear = getYear(now);

    return employees.map(employee => {
      const monthlyAdvances = advances.filter(a =>
        a.employeeId === employee.id &&
        getMonth(new Date(a.date)) === currentMonth &&
        getYear(new Date(a.date)) === currentYear
      );

      const totalAdvance = monthlyAdvances.reduce((sum, a) => sum + a.amount, 0);
      const remainingSalary = employee.salary - totalAdvance;

      return {
        employeeId: employee.id,
        totalAdvance,
        remainingSalary,
      };
    });
  }, [employees, advances]);

  const dailyAttendanceSummary = useMemo(() => {
    const summary = {
      'Present': 0,
      'Absent': 0,
      'Half-day': 0,
    };
    attendanceForSelectedDate.forEach(att => {
      summary[att.status]++;
    });
    return summary;
  }, [attendanceForSelectedDate]);


  return (
    <div className="p-4 space-y-4">
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted p-1 h-auto rounded-lg">
          <TabsTrigger value="attendance" className="py-2 text-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 text-xs sm:text-sm font-bold uppercase transition-all duration-300 border border-primary/40 hover:border-primary">{t('ATTENDANCE & ADVANCE')}</TabsTrigger>
          <TabsTrigger value="employees" className="py-2 text-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 text-xs sm:text-sm font-bold uppercase transition-all duration-300 border border-primary/40 hover:border-primary">{t('EMPLOYEE DETAILS')}</TabsTrigger>
          <TabsTrigger value="shifts" className="py-2 text-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 text-xs sm:text-sm font-bold uppercase transition-all duration-300 border border-primary/40 hover:border-primary">{t('SHIFT AUDIT LOGS')}</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <Card className="flex flex-col p-0 shadow-lg">
                <div className='flex justify-center bg-card rounded-t-lg'>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date || new Date())}
                    className="rounded-t-lg"
                    components={{ DayContent: CustomDay }}
                    modifiers={{
                      advance: datesWithAdvance,
                      absent: datesWithAbsence,
                    }}
                    modifiersStyles={{
                      advance: { border: '2px solid hsl(var(--primary))' },
                      absent: {
                        backgroundColor: 'hsl(var(--destructive) / 0.2)',
                        color: 'hsl(var(--destructive))',
                      },
                    }}
                  />
                </div>
                <div className="p-4 space-y-2 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="show-advances" checked={showAdvancesOnCalendar} onCheckedChange={(checked) => setShowAdvancesOnCalendar(Boolean(checked))} />
                    <Label htmlFor="show-advances">{t('Show Advance Dates')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="show-absences" checked={showAbsencesOnCalendar} onCheckedChange={(checked) => setShowAbsencesOnCalendar(Boolean(checked))} />
                    <Label htmlFor="show-absences">{t('Show Absent Dates')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="show-presents" checked={showPresentsOnCalendar} onCheckedChange={(checked) => setShowPresentsOnCalendar(Boolean(checked))} />
                    <Label htmlFor="show-presents">{t('Show Present Dates')}</Label>
                  </div>
                </div>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('Daily Attendance Summary')}</CardTitle>
                  <CardDescription>{t('For')} {safeFormat(selectedDate, 'PPP')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg cursor-pointer hover:bg-green-200 dark:hover:bg-green-900" onClick={() => openAttendanceListDialog('Present')}>
                      <p className="text-sm text-green-800 dark:text-green-200">Present</p>
                      <p className="text-3xl font-bold">{dailyAttendanceSummary['Present']}</p>
                    </div>
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-900" onClick={() => openAttendanceListDialog('Half-day')}>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">Half-day</p>
                      <p className="text-3xl font-bold">{dailyAttendanceSummary['Half-day']}</p>
                    </div>
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg cursor-pointer hover:bg-red-200 dark:hover:bg-red-900" onClick={() => openAttendanceListDialog('Absent')}>
                      <p className="text-sm text-red-800 dark:text-red-200">Absent</p>
                      <p className="text-3xl font-bold">{dailyAttendanceSummary['Absent']}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('Staff Attendance for')} {safeFormat(selectedDate, 'PPP')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {employees.map((employee, index) => {
                    const attendanceRecord = attendanceForSelectedDate.find(a => a.employeeId === employee.id);
                    return (
                      <div key={`${employee.id}-${index}`} className="flex items-center gap-4 p-2 border rounded-lg bg-card">
                        <div className="flex-grow flex items-center gap-3">
                          <span className={cn("h-3 w-3 rounded-full", employee.color)} />
                          <div>
                            <span className="font-semibold text-base">{employee.name}</span>
                            <p className="text-xs text-muted-foreground font-mono">{employee.id}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openAdvanceDialog(null, employee)} disabled={isDateLocked}>
                          <Banknote className="h-5 w-5 text-primary" />
                        </Button>
                        <div className="flex items-center gap-1">
                          {(Object.keys(attendanceStatusConfig) as AttendanceStatus[]).map(status => {
                            const isSelected = attendanceRecord?.status === status;
                            const config = attendanceStatusConfig[status];
                            return (
                              <Button
                                key={status}
                                variant={isSelected ? 'default' : 'outline'}
                                onClick={() => handleMarkAttendance(employee.id, status)}
                                className={cn("h-10 w-24", isSelected && config.className)}
                                disabled={isDateLocked}
                              >
                                <config.icon className="mr-2 h-4 w-4" />
                                {config.label}
                              </Button>
                            )
                          })}
                          <Button key="notes-btn" variant="ghost" size="icon" onClick={() => openNotesDialog(employee.id)} disabled={!attendanceRecord}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button key="summary-btn" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSummaryDialog(employee)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
              <Button size="lg" className="w-full h-14 text-base bg-primary/5 border-2 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary transition-all shadow-md group" onClick={() => openAdvanceDialog(null, undefined)} disabled={isDateLocked}>
                <Banknote className="mr-4 h-6 w-6 group-hover:scale-110 transition-transform" /> {t('Add Salary Advance')}
              </Button>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('Advances for')} {safeFormat(selectedDate, 'PPP')}</CardTitle>
                  {totalAdvanceForDay > 0 && (
                    <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-md text-red-700 dark:text-red-200">
                      <span className="font-bold">Total: {currency}{totalAdvanceForDay.toLocaleString()}</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-y-auto pt-2">
                    {advancesForSelectedDate.filter(a => a.amount > 0).length > 0 ? (
                      <div className="space-y-2">
                        {advancesForSelectedDate.filter(a => a.amount > 0).map((advance, index) => {
                          const employee = employees.find(e => e.id === advance.employeeId);
                          return (
                            <div key={`${advance.id}-${index}`} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg group">
                              <div className='flex items-center gap-2'>
                                <span className={cn("h-2.5 w-2.5 rounded-full", employee?.color)} />
                                <div>
                                  <p className="font-medium">{employee?.name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-md text-red-700 dark:text-red-200">
                                  <span className="font-bold">{currency}{advance.amount.toLocaleString()}</span>
                                </div>
                                {!isDateLocked &&
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAdvanceDialog(advance, undefined)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                }
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center py-4">
                        <p className="text-muted-foreground text-sm">No advances on this date.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="employees">
          <Card className="mt-4">
            <CardHeader>
              <div className='flex justify-between items-center'>
                <div>
                  <CardTitle>{t('Employees List')}</CardTitle>
                  <CardDescription>{t('Manage staff information and view monthly salary details.')}</CardDescription>
                </div>
                <Button variant="default" className="bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary text-primary border shadow-sm transition-all" onClick={() => openEmployeeDialog(null)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> {t('ADD NEW EMPLOYEE')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-foreground text-base">{t('ID')}</TableHead>
                      <TableHead className="font-bold text-foreground text-base">{t('Employee')}</TableHead>
                      <TableHead className="font-bold text-foreground text-base">{t('Role')}</TableHead>
                      <TableHead className="font-bold text-foreground text-base">{t('Mobile')}</TableHead>
                      <TableHead className="font-bold text-foreground text-base">{t('Govt. ID')}</TableHead>
                      <TableHead className="border-l font-bold text-foreground text-base">{t('Base Salary')}</TableHead>
                      <TableHead className="border-l font-bold text-foreground text-base">{t('Advance Taken')}</TableHead>
                      <TableHead className="border-l font-bold text-foreground text-base">{t('Remaining Salary')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee, index) => {
                      const summary = employeeSummaries.find(s => s.employeeId === employee.id);
                      return (
                        <TableRow key={`${employee.id}-${index}`} className={cn(index % 2 === 0 ? 'bg-muted/50' : 'bg-background')}>
                          <TableCell className="font-mono text-xs">{employee.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 font-medium">
                              <span className={cn('h-2 w-2 rounded-full', employee.color)} />
                              {employee.name}
                            </div>
                          </TableCell>
                          <TableCell>{employee.role}</TableCell>
                          <TableCell>{employee.mobile || 'N/A'}</TableCell>
                          <TableCell>{employee.govtId || 'N/A'}</TableCell>
                          <TableCell className="border-l bg-blue-50 dark:bg-blue-900/20 font-semibold text-blue-600">{currency}{employee.salary.toLocaleString()}</TableCell>
                          <TableCell className="border-l bg-red-50 dark:bg-red-900/20 font-semibold text-red-600">{currency}{summary?.totalAdvance.toLocaleString()}</TableCell>
                          <TableCell className="border-l bg-green-50 dark:bg-green-900/20 font-bold text-green-700">{currency}{summary?.remainingSalary.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts">
          <Card className="mt-4 shadow-lg">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl font-black text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    {t('Cashier & Manager Shift Handover Logs')}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {t('360° accountability audit trail for all shifts: Sales, Customer Khata collections, Vendor POs, Deliveries, and Cash Drawer Discrepancies.')}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs px-2.5 py-1 font-bold border-primary/40 text-primary">
                  {shiftHistory.length} {t('Shifts Logged')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {shiftHistory.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-bold text-foreground">{t('No Shift Handover Logs Yet')}</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {t('Shifts are automatically recorded whenever a cashier or manager logs into the software and clicks "End Shift & Log Out" in the top navigation bar.')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold text-xs">{t('Staff / Role')}</TableHead>
                        <TableHead className="font-bold text-xs">{t('Shift Timing & Duration')}</TableHead>
                        <TableHead className="font-bold text-xs text-right">{t('Bills & Sales')}</TableHead>
                        <TableHead className="font-bold text-xs">{t('Vendor Supply Chain')}</TableHead>
                        <TableHead className="font-bold text-xs">{t('Cash In Till Tally')}</TableHead>
                        <TableHead className="font-bold text-xs text-center">{t('Discrepancy')}</TableHead>
                        <TableHead className="font-bold text-xs text-right">{t('Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shiftHistory.map((shift) => {
                        const openTime = new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const closeTime = shift.closedAt
                          ? new Date(shift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'In Progress';
                        const dateStr = new Date(shift.openedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                        const duration = formatDuration(shift.durationMinutes);
                        const diff = shift.cashDifference || 0;
                        const isBalanced = Math.abs(diff) < 0.01;
                        const isSurplus = diff > 0.01;

                        return (
                          <TableRow key={shift.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="font-black text-sm text-foreground">{shift.employeeName}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 w-fit mt-0.5 uppercase font-bold text-muted-foreground">
                                  {shift.employeeRole}
                                </Badge>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-col text-xs">
                                <span className="font-bold text-foreground">{dateStr}</span>
                                <span className="text-[11px] text-muted-foreground">{openTime} – {closeTime}</span>
                                <span className="text-[10px] font-bold text-primary mt-0.5">{duration}</span>
                              </div>
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex flex-col items-end text-xs">
                                <span className="font-black text-foreground">{currency} {shift.totalSales.toFixed(2)}</span>
                                <span className="text-[10px] text-muted-foreground">{shift.billsCount} bills ({shift.itemsSoldCount} items)</span>
                                <span className="text-[10px] text-emerald-600 font-semibold">Cash: {currency}{shift.cashSales.toFixed(0)}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-col text-xs">
                                <span className="font-bold text-foreground">
                                  {shift.vendorPOsCreated?.length || 0} {t('POs Placed')}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {shift.vendorDeliveriesReceived?.length || 0} {t('Deliveries Received')}
                                </span>
                                {shift.vendorPaymentsCash > 0 && (
                                  <span className="text-[10px] text-destructive font-semibold">
                                    Paid: {currency}{shift.vendorPaymentsCash.toFixed(0)}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-col text-xs">
                                <span className="text-muted-foreground">Exp: <span className="font-bold text-foreground">{currency}{shift.expectedCashInDrawer.toFixed(0)}</span></span>
                                <span className="text-muted-foreground">Act: <span className="font-bold text-foreground">{currency}{(shift.actualCashCounted ?? shift.expectedCashInDrawer).toFixed(0)}</span></span>
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              <Badge
                                variant={isBalanced ? "outline" : isSurplus ? "secondary" : "destructive"}
                                className={cn(
                                  "text-[10px] font-black uppercase px-2 py-0.5",
                                  isBalanced && "border-emerald-500/50 text-emerald-600 bg-emerald-500/10"
                                )}
                              >
                                {isBalanced ? t('Balanced ✅') : isSurplus ? `+${currency}${diff.toFixed(0)}` : `-${currency}${Math.abs(diff).toFixed(0)}`}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs font-bold gap-1 rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                                onClick={() => {
                                  const text = generateShiftReceiptText(shift, {}, currency);
                                  const win = window.open('', '_blank');
                                  if (win) {
                                    win.document.write(`<pre style="font-family: monospace; padding: 10px;">${text}</pre><script>window.onload = () => window.print();</script>`);
                                    win.document.close();
                                  }
                                }}
                                title={t('Print 80mm/58mm Shift Thermal Receipt')}
                              >
                                <Printer className="h-3 w-3" />
                                <span>{t('Slip')}</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddOrEditAdvanceDialog
        open={isAdvanceDialogOpen}
        onOpenChange={setIsAdvanceDialogOpen}
        employees={employees}
        onSave={handleSaveAdvance}
        selectedDate={selectedDate || new Date()}
        existingAdvance={editingAdvance}
        currency={currency}
      />

      <NotesDialog
        open={isNotesDialogOpen}
        onOpenChange={setIsNotesDialogOpen}
        attendance={editingAttendance}
        onSave={handleSaveNote}
        readOnly={isDateLocked}
      />

      <EmployeeDialog
        key={editingEmployee?.id ?? 'add'}
        open={isEmployeeDialogOpen}
        onOpenChange={setIsEmployeeDialogOpen}
        employee={editingEmployee}
        existingEmployees={employees}
        onSave={(employeeData) => {
          handleSaveEmployee(employeeData as Partial<Employee>);
          setIsEmployeeDialogOpen(false);
          setEditingEmployee(null);
        }}
      />
      {summaryEmployee &&
        <EmployeeSummaryDialog
          open={isSummaryDialogOpen}
          onOpenChange={setIsSummaryDialogOpen}
          employee={summaryEmployee}
          attendance={attendance}
          advances={advancesByEmployee[summaryEmployee.id] || []}
          currency={currency}
        />
      }

      <Dialog open={isAttendanceListDialogOpen} onOpenChange={setIsAttendanceListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{attendanceList.title} on {safeFormat(selectedDate, 'PPP')}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto py-4">
            {attendanceList.employees.length > 0 ? (
              <ul className="space-y-2">
                {attendanceList.employees.map(emp => (
                  <li key={emp.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <span className={cn("h-2 w-2 rounded-full", emp.color)} />
                    <span className="font-medium">{emp.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">({emp.id})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center">No employees found for this status.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsAttendanceListDialogOpen(false)}>{t('Close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddOrEditAdvanceDialog({
  open,
  onOpenChange,
  employees,
  onSave,
  selectedDate,
  existingAdvance,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onSave: (advance: Omit<Advance, 'id' | 'date'> & { id?: string, date: Date }) => void;
  selectedDate: Date;
  existingAdvance: Advance | null;
  currency: string;
}) {
  const { t } = useLanguage();
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');

  const selectedEmployee = useMemo(() => employees.find(e => e.id === employeeId), [employees, employeeId]);
  const isQuickAdd = !!(existingAdvance && !existingAdvance.id);

  useEffect(() => {
    if (open) {
      if (existingAdvance) {
        setEmployeeId(existingAdvance.employeeId);
        setAmount(String(existingAdvance.amount || ''));
      } else {
        setEmployeeId('');
        setAmount('');
      }
    }
  }, [existingAdvance, open]);

  const handleSave = () => {
    if (employeeId && amount) {
      onSave({
        id: existingAdvance?.id,
        employeeId,
        amount: parseFloat(amount),
        date: startOfDay(selectedDate),
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingAdvance?.amount ? t('Edit') : t('Add')} {t('Advance')}</DialogTitle>
          <DialogDescription>
            {t('Record an advance for an employee on')} {safeFormat(selectedDate, 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isQuickAdd && selectedEmployee ? (
            <div className="space-y-2">
              <Label>Employee</Label>
              <div className="p-2 border rounded-md bg-muted flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", selectedEmployee.color)} />
                <span className="font-medium">{selectedEmployee.name}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{t('Employee')}</Label>
              <Select value={employeeId} onValueChange={setEmployeeId} disabled={!!existingAdvance?.id}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select Employee')} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", e.color)} />
                        {e.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="amount">{t('Amount')} ({currency})</Label>
            <Input id="amount" type="number" placeholder="e.g., 2000" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
          <Button onClick={handleSave}>{t('Save Advance')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotesDialog({
  open,
  onOpenChange,
  attendance,
  onSave,
  readOnly
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendance: Attendance | null;
  onSave: (note: string) => void;
  readOnly: boolean;
}) {
  const { t } = useLanguage();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (attendance) {
      setNote(attendance.notes || '');
    }
  }, [attendance]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{readOnly ? t('View Note') : t('Add/Edit Note')}</DialogTitle>
          {attendance && <DialogDescription>{t('For')} {t('attendance')} {t('on')} {safeFormat(attendance.date, 'PPP')}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="e.g., Arrived 30 minutes late."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            readOnly={readOnly}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Cancel')}</Button>
          {!readOnly && <Button onClick={() => onSave(note)}>{t('Save Note')}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EmployeeDialog({ open, onOpenChange, employee, existingEmployees = [], onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  existingEmployees?: Employee[];
  onSave: (data: Partial<Employee>) => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameCustom, setIsUsernameCustom] = useState(false);
  const [loginCode, setLoginCode] = useState('');
  const [role, setRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [salary, setSalary] = useState('');
  const [mobile, setMobile] = useState('');
  const [govtId, setGovtId] = useState('');
  const [copied, setCopied] = useState(false);

  const takenUsernames = useMemo(() => {
    return existingEmployees
      .filter(e => e.id !== employee?.id)
      .map(e => e.username)
      .filter(Boolean) as string[];
  }, [existingEmployees, employee]);

  useEffect(() => {
    if (open) {
      setName(employee?.name || '');
      setUsername(employee?.username || '');
      setIsUsernameCustom(Boolean(employee?.username));
      setLoginCode(employee?.loginCode || '');
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

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isUsernameCustom) {
      setUsername(val.trim() ? generateUniqueUsername(val, takenUsernames) : '');
    }
  };

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    setIsUsernameCustom(true);
    setUsername(clean);
  };

  const handleSave = () => {
    const finalRole = role === 'Other' ? customRole : role;
    if (!name || !finalRole || !salary) {
      return;
    }

    const finalUsername = username.trim() || generateUniqueUsername(name, takenUsernames);
    const finalCode = loginCode.trim() || employee?.loginCode || '0000';

    const data: Partial<Employee> = {
      name,
      username: finalUsername,
      loginCode: finalCode,
      role: finalRole,
      salary: parseFloat(salary),
      mobile,
      govtId,
    };
    if (employee) {
      data.id = employee.id;
    }
    onSave(data);
    onOpenChange(false);
  };

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
              <Input id="name" placeholder={t('e.g., John Doe')} value={name} onChange={(e) => handleNameChange(e.target.value)} required />
            </div>

            {/* Login Username & Passcode PIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emp-username" className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <Shield size={12} className="text-orange-400" />
                    {t('Login ID')}
                  </Label>
                  <span className="text-[10px] text-orange-400/90 font-medium">Auto • Editable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    id="emp-username"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder={name ? generateUniqueUsername(name, takenUsernames) : "e.g., amit"}
                    className="h-9 bg-background border-orange-500/30 font-mono text-xs text-orange-500 tracking-wider focus:border-orange-500"
                  />
                  {username && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(username);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-md bg-background border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 transition-colors"
                      title="Copy Login ID"
                    >
                      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                    </button>
                  )}
                </div>
                {username && isUsernameTaken(username, takenUsernames) ? (
                  <p className="text-[10px] text-amber-500 font-medium leading-tight">⚠️ Username already in use</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground leading-tight">Used for POS staff login</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emp-pin" className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                  <Shield size={12} className="text-orange-400" />
                  4-Digit PIN
                </Label>
                <Input
                  id="emp-pin"
                  type="password"
                  maxLength={4}
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  className="h-9 bg-background border-orange-500/30 font-mono text-center tracking-[0.3em] text-sm focus:border-orange-500"
                />
                <p className="text-[10px] text-muted-foreground leading-tight">Passcode to switch profile</p>
              </div>
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
                <Input id="custom-role" placeholder={t('e.g., Cashier')} value={customRole} onChange={(e) => setCustomRole(e.target.value)} required />
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

function EmployeeSummaryDialog({ open, onOpenChange, employee, attendance, advances, currency }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  attendance: Attendance[];
  advances: Advance[];
  currency: string;
}) {
  const { t } = useLanguage();
  const { summary, absentDates, halfDayDates, monthlyAdvances } = useMemo(() => {
    if (!employee) return { summary: null, absentDates: [], halfDayDates: [], monthlyAdvances: [] };

    const now = new Date();
    const currentMonth = getMonth(now);
    const currentYear = getYear(now);

    const monthlyAttendance = attendance.filter(a =>
      a.employeeId === employee.id &&
      getMonth(new Date(a.date)) === currentMonth &&
      getYear(new Date(a.date)) === currentYear
    );

    const employeeMonthlyAdvances = advances.filter(a =>
      getMonth(new Date(a.date)) === currentMonth &&
      getYear(new Date(a.date)) === currentYear
    );

    const absentRecords = monthlyAttendance.filter(a => a.status === 'Absent');
    const halfDayRecords = monthlyAttendance.filter(a => a.status === 'Half-day');

    const totalAdvance = employeeMonthlyAdvances.reduce((sum, a) => sum + a.amount, 0);
    const remainingSalary = employee.salary - totalAdvance;

    return {
      summary: {
        presentDays: monthlyAttendance.filter(a => a.status === 'Present').length,
        absentDays: absentRecords.length,
        halfDays: halfDayRecords.length,
        totalAdvance,
        remainingSalary,
      },
      absentDates: absentRecords.map(a => new Date(a.date)),
      halfDayDates: halfDayRecords.map(a => new Date(a.date)),
      monthlyAdvances: employeeMonthlyAdvances,
    }
  }, [employee, attendance, advances]);

  if (!employee || !summary) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('Monthly Summary for')} {employee.name}</DialogTitle>
          <DialogDescription>
            {safeFormat(new Date(), 'MMMM yyyy')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Left Column: Attendance */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">{t('Attendance Report')}</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Card className="p-2 bg-green-100 dark:bg-green-900/30">
                <CardDescription className="text-sm text-green-800 dark:text-green-200">Present</CardDescription>
                <CardTitle className="text-2xl">{summary.presentDays}</CardTitle>
              </Card>
              <Card className="p-2 bg-yellow-100 dark:bg-yellow-900/30">
                <CardDescription className="text-sm text-yellow-800 dark:text-yellow-200">Half-days</CardDescription>
                <CardTitle className="text-2xl">{summary.halfDays}</CardTitle>
              </Card>
              <Card className="p-2 bg-red-100 dark:bg-red-900/30">
                <CardDescription className="text-sm text-red-800 dark:text-red-200">Absent</CardDescription>
                <CardTitle className="text-2xl">{summary.absentDays}</CardTitle>
              </Card>
            </div>
            <ScrollArea className="h-40 space-y-4">
              {halfDayDates.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2 text-yellow-700">{t('Half-day Dates')}:</h4>
                  <div className="grid grid-cols-3 gap-1 text-sm">
                    {halfDayDates.map(date => (
                      <span key={date.toISOString()}>{safeFormat(date, 'MMM d')}</span>
                    ))}
                  </div>
                </div>
              )}
              {absentDates.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg mt-2">
                  <h4 className="font-semibold mb-2 text-red-700">{t('Absent Dates')}:</h4>
                  <div className="grid grid-cols-3 gap-1 text-sm">
                    {absentDates.map(date => (
                      <span key={date.toISOString()}>{safeFormat(date, 'MMM d')}</span>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Column: Financials */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">{t('Financial Report')}</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Card className="p-2 bg-blue-100 dark:bg-blue-900/30">
                <CardDescription className="text-sm text-blue-800 dark:text-blue-200">{t('Base Salary')}</CardDescription>
                <CardTitle className="text-xl">{currency}{employee.salary.toLocaleString()}</CardTitle>
              </Card>
              <Card className="p-2 bg-red-100 dark:bg-red-900/30">
                <CardDescription className="text-sm text-red-800 dark:text-red-200">{t('Advance')}</CardDescription>
                <CardTitle className="text-xl">{currency}{summary.totalAdvance.toLocaleString()}</CardTitle>
              </Card>
              <Card className="p-2 bg-green-100 dark:bg-green-900/30">
                <CardDescription className="text-sm text-green-800 dark:text-green-200">{t('Remaining')}</CardDescription>
                <CardTitle className="text-xl">{currency}{summary.remainingSalary.toLocaleString()}</CardTitle>
              </Card>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold">{t('Monthly Advances')}</h4>
              <ScrollArea className="h-24">
                {monthlyAdvances.length > 0 ? (
                  <div className="space-y-1 pr-2">
                    {monthlyAdvances.map((adv, index) => (
                      <div key={index} className="flex justify-between items-center text-sm p-1.5 bg-muted/50 rounded-md">
                        <span>{safeFormat(adv.date, 'MMM d')}:</span>
                        <span className="font-mono font-semibold">{currency}{adv.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center pt-4">{t('No advances this month.')}</p>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('Close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
