"use client";

import { useState } from 'react';
import { 
    Users, 
    Shield, 
    KeyRound, 
    Lock, 
    Check, 
    Plus, 
    Edit2, 
    Trash2, 
    Clock, 
    CheckCircle2, 
    UserCheck,
    AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Employee } from '@/lib/types';
import { updateStaffPinInCloud, updateStaffPermissionsInCloud } from '@/lib/firestore-sync';

interface MobileStaffTabProps {
    employees: Employee[];
    venueId?: string;
    currency: string;
    onUpdateEmployees: (updated: Employee[]) => void;
}

const ALL_AVAILABLE_TABS = [
    { id: 'payments', label: 'Counter Billing / POS' },
    { id: 'inventory', label: 'Stock & Inventory' },
    { id: 'customers', label: 'Customers & Khata' },
    { id: 'vendors', label: 'Vendors & POs' },
    { id: 'expenses', label: 'Expenses Tracker' },
    { id: 'staff', label: 'Staff Roster' },
    { id: 'admin', label: 'Admin Analytics' },
];

export function MobileStaffTab({
    employees,
    venueId,
    currency,
    onUpdateEmployees
}: MobileStaffTabProps) {
    // Edit PIN Dialog state
    const [pinModalEmp, setPinModalEmp] = useState<Employee | null>(null);
    const [newPin, setNewPin] = useState('');
    const [pinError, setPinError] = useState('');

    // Edit Permissions Dialog state
    const [permModalEmp, setPermModalEmp] = useState<Employee | null>(null);
    const [selectedTabs, setSelectedTabs] = useState<string[]>([]);

    // Add Staff Modal
    const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<'Manager' | 'Cashier' | 'Billing Clerk' | 'Inventory Clerk' | 'Floor Assistant'>('Cashier');
    const [newStaffPin, setNewStaffPin] = useState('');
    const [newSalary, setNewSalary] = useState('');
    const [newPhone, setNewPhone] = useState('');

    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    // ── Handle PIN Change ──
    const handleOpenPinModal = (emp: Employee) => {
        setPinModalEmp(emp);
        setNewPin(emp.loginCode || '');
        setPinError('');
    };

    const handleSavePin = async () => {
        if (!pinModalEmp) return;
        const clean = newPin.replace(/\D/g, '').slice(0, 4);
        if (clean.length !== 4) {
            setPinError('PIN must be exactly 4 digits.');
            return;
        }

        const updated = employees.map(e => e.id === pinModalEmp.id ? { ...e, loginCode: clean } : e);
        onUpdateEmployees(updated);

        if (venueId) {
            await updateStaffPinInCloud(venueId, pinModalEmp.id, clean);
        }

        setActionSuccess(`PIN for ${pinModalEmp.name} updated to ${clean}!`);
        setTimeout(() => {
            setActionSuccess(null);
            setPinModalEmp(null);
        }, 1200);
    };

    // ── Handle Permissions Change ──
    const handleOpenPermModal = (emp: Employee) => {
        setPermModalEmp(emp);
        setSelectedTabs(emp.allowedTabs || ['payments']);
    };

    const handleToggleTab = (tabId: string) => {
        setSelectedTabs(prev => 
            prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
        );
    };

    const handleSavePermissions = async () => {
        if (!permModalEmp) return;
        const updated = employees.map(e => e.id === permModalEmp.id ? { ...e, allowedTabs: selectedTabs } : e);
        onUpdateEmployees(updated);

        if (venueId) {
            await updateStaffPermissionsInCloud(venueId, permModalEmp.id, selectedTabs);
        }

        setActionSuccess(`Permissions updated for ${permModalEmp.name}!`);
        setTimeout(() => {
            setActionSuccess(null);
            setPermModalEmp(null);
        }, 1200);
    };

    // ── Handle Add Staff ──
    const handleAddStaff = () => {
        if (!newName.trim()) {
            alert('Please enter staff name.');
            return;
        }
        const cleanPin = newStaffPin.replace(/\D/g, '').slice(0, 4);
        if (cleanPin.length !== 4) {
            alert('Please enter a 4-digit PIN for this staff member.');
            return;
        }

        const newId = `emp-${Date.now().toString().slice(-4)}`;
        const cleanUsername = newName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) + Math.floor(10 + Math.random() * 90);

        const newEmp: Employee = {
            id: newId,
            name: newName.trim(),
            role: newRole,
            salary: Number(newSalary) || 0,
            mobile: newPhone.trim(),
            loginCode: cleanPin,
            username: cleanUsername,
            allowedTabs: newRole === 'Manager' ? ['all'] : ['payments', 'inventory', 'customers'],
            color: newRole === 'Manager' ? '#f59e0b' : '#10b981'
        };

        const updated = [...employees, newEmp];
        onUpdateEmployees(updated);

        if (venueId) {
            updateStaffPinInCloud(venueId, newId, cleanPin);
        }

        setIsAddStaffOpen(false);
        setNewName('');
        setNewStaffPin('');
        setNewSalary('');
        setNewPhone('');
        setActionSuccess(`Staff member ${newEmp.name} added!`);
        setTimeout(() => setActionSuccess(null), 1500);
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'Owner': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'Partner': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'Manager':
            case 'Store Manager': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Cashier':
            case 'Billing Clerk': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <div className="space-y-4 pb-6">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-black tracking-tight text-foreground uppercase">
                        Team & Staff Access
                    </h2>
                    <p className="text-xs text-muted-foreground">Manage staff PINs & POS permissions</p>
                </div>
                <Button 
                    size="sm" 
                    onClick={() => setIsAddStaffOpen(true)}
                    className="h-8 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                >
                    <Plus size={14} /> Add Staff
                </Button>
            </div>

            {/* Success toast notification */}
            {actionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                    <CheckCircle2 size={16} />
                    <span>{actionSuccess}</span>
                </div>
            )}

            {/* Employee Cards List */}
            <div className="space-y-3">
                {employees.map(emp => {
                    const isOwner = emp.role === 'Owner';

                    return (
                        <div key={emp.id} className="p-4 rounded-2xl border bg-card/70 shadow-sm space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm"
                                        style={{ backgroundColor: emp.color || (isOwner ? '#f97316' : '#10b981') }}
                                    >
                                        {emp.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h4 className="font-extrabold text-sm text-foreground">{emp.name}</h4>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${getRoleBadgeColor(emp.role)}`}>
                                                {emp.role}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                            @{emp.username || emp.id}
                                        </p>
                                    </div>
                                </div>

                                {/* PIN Display */}
                                <div className="text-right">
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">4-Digit PIN</span>
                                    <span className="text-xs font-mono font-black text-orange-500 tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20">
                                        {emp.loginCode || '••••'}
                                    </span>
                                </div>
                            </div>

                            {/* Allowed Tab Badges */}
                            <div className="flex flex-wrap gap-1 pt-1">
                                {(emp.allowedTabs?.includes('all') ? ['POS', 'Stock', 'Khata', 'Reports', 'Vendors'] : (emp.allowedTabs || ['payments'])).map(tab => (
                                    <span key={tab} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                        {tab === 'payments' ? 'Billing' : tab === 'inventory' ? 'Inventory' : tab === 'customers' ? 'Khata' : tab}
                                    </span>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 border-t flex items-center justify-end gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleOpenPinModal(emp)}
                                    className="h-8 px-3 rounded-xl text-xs font-bold border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                                >
                                    <KeyRound size={13} className="mr-1.5" /> Change PIN
                                </Button>
                                {!isOwner && (
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleOpenPermModal(emp)}
                                        className="h-8 px-3 rounded-xl text-xs font-bold"
                                    >
                                        <Shield size={13} className="mr-1.5" /> Permissions
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ════════ DIALOG: CHANGE PIN ════════ */}
            <Dialog open={!!pinModalEmp} onOpenChange={(open) => !open && setPinModalEmp(null)}>
                <DialogContent className="max-w-xs w-[90vw] p-5 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black flex items-center gap-2">
                            <KeyRound size={16} className="text-orange-500" />
                            Update PIN for {pinModalEmp?.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Set a new 4-digit code for terminal sign-in.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5 text-center">
                            <Input 
                                type="password" 
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                value={newPin}
                                onChange={e => { setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
                                placeholder="• • • •"
                                className="h-12 text-center text-2xl font-black tracking-[0.4em] font-mono rounded-xl"
                                autoFocus
                            />
                            {pinError && <p className="text-xs text-red-500 font-bold">{pinError}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="ghost" onClick={() => setPinModalEmp(null)} className="h-10 text-xs font-bold rounded-xl">
                                Cancel
                            </Button>
                            <Button onClick={handleSavePin} className="h-10 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                                Save PIN
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ════════ DIALOG: PERMISSIONS ════════ */}
            <Dialog open={!!permModalEmp} onOpenChange={(open) => !open && setPermModalEmp(null)}>
                <DialogContent className="max-w-sm w-[92vw] p-5 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black flex items-center gap-2">
                            <Shield size={16} className="text-orange-500" />
                            Permissions for {permModalEmp?.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Select which modules this staff member can access.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        {ALL_AVAILABLE_TABS.map(tab => {
                            const isChecked = selectedTabs.includes(tab.id) || selectedTabs.includes('all');

                            return (
                                <div key={tab.id} className="flex items-center justify-between p-2.5 rounded-xl border bg-card/60">
                                    <span className="text-xs font-bold text-foreground">{tab.label}</span>
                                    <Checkbox 
                                        checked={isChecked}
                                        onCheckedChange={() => handleToggleTab(tab.id)}
                                        className="h-5 w-5 rounded-md"
                                    />
                                </div>
                            );
                        })}

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setPermModalEmp(null)} className="h-10 text-xs font-bold rounded-xl">
                                Cancel
                            </Button>
                            <Button onClick={handleSavePermissions} className="h-10 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                                Save Access
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ════════ DIALOG: ADD STAFF ════════ */}
            <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                <DialogContent className="max-w-sm w-[92vw] p-5 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-black flex items-center gap-2">
                            <Users size={16} className="text-orange-500" />
                            Add Staff Member
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Create a new team member with their login PIN.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-muted-foreground">Full Name *</Label>
                            <Input placeholder="e.g. Ramesh Kumar" value={newName} onChange={e => setNewName(e.target.value)} className="h-9 text-xs" />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-muted-foreground">Role *</Label>
                            <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                                <SelectTrigger className="h-9 text-xs font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Manager">Store Manager</SelectItem>
                                    <SelectItem value="Cashier">Cashier</SelectItem>
                                    <SelectItem value="Billing Clerk">Billing Clerk</SelectItem>
                                    <SelectItem value="Inventory Clerk">Inventory Clerk</SelectItem>
                                    <SelectItem value="Floor Assistant">Floor Assistant</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[11px] font-bold text-muted-foreground">4-Digit Login PIN *</Label>
                            <Input 
                                placeholder="e.g. 1234" 
                                maxLength={4}
                                value={newStaffPin} 
                                onChange={e => setNewStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                                className="h-9 text-xs font-mono tracking-widest text-center font-bold" 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-muted-foreground">Mobile (Optional)</Label>
                                <Input placeholder="Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="h-9 text-xs" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] font-bold text-muted-foreground">Monthly Salary</Label>
                                <Input placeholder="₹" type="number" value={newSalary} onChange={e => setNewSalary(e.target.value)} className="h-9 text-xs" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3">
                            <Button variant="ghost" onClick={() => setIsAddStaffOpen(false)} className="h-10 text-xs font-bold rounded-xl">
                                Cancel
                            </Button>
                            <Button onClick={handleAddStaff} className="h-10 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                                Create Staff
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
