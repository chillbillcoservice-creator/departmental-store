
"use client";

import React from 'react';
import { useLanguage } from "@/contexts/language-context";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import type { InventoryItem, Expense } from '@/lib/types';

interface ProfitAnalysisProps {
    inventory: InventoryItem[];
    expenses: Expense[];
    currency: string;
}

export default function ProfitAnalysis({ inventory, expenses, currency }: ProfitAnalysisProps) {
    const { t } = useLanguage();

    return (
        <div className="p-4 space-y-6">
            <Card className="bg-gradient-to-br from-background to-muted/20 border-primary/10 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="bg-green-500/10 p-2 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <CardTitle>Profit Analysis</CardTitle>
                            <CardDescription>Real-time financial insights based on inventory.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {inventory ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="bg-primary/5 border-primary/20 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs uppercase text-muted-foreground font-bold font-mono">Total Inventory Value (MRP)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-black text-primary">
                                            {currency}{((inventory?.reduce((s: number, i: any) => s + (Number(i.price || 0) * Number(i.stock || 0)), 0) || 0).toLocaleString())}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-primary/5 border-primary/20 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs uppercase text-muted-foreground font-bold font-mono">Total Asset Cost</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-black text-primary">
                                            {currency}{((inventory?.reduce((s: number, i: any) => s + (Number(i.costPrice || 0) * Number(i.stock || 0)), 0) || 0).toLocaleString())}
                                        </div>
                                    </CardContent>
                                </Card>
                                {(() => {
                                    const inv = inventory || [];
                                    const totalValue = inv.reduce((s: number, i: any) => s + (Number(i.price || 0) * Number(i.stock || 0)), 0);
                                    const totalCost = inv.reduce((s: number, i: any) => s + (Number(i.costPrice || 0) * Number(i.stock || 0)), 0);
                                    const potProfit = totalValue - totalCost;
                                    const isLoss = potProfit < 0;
                                    return (
                                        <Card className={cn("shadow-sm", isLoss ? "bg-destructive/10 border-destructive/20" : "bg-green-500/10 border-green-500/20")}>
                                            <CardHeader className="pb-2">
                                                <CardTitle className={cn("text-xs uppercase font-bold font-mono", isLoss ? "text-destructive" : "text-green-700")}>
                                                    {isLoss ? "Potential Gross Loss" : "Potential Gross Profit"}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className={cn("text-2xl font-black", isLoss ? "text-destructive" : "text-green-700")}>
                                                    {currency}{potProfit.toLocaleString()}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })()}
                            </div>

                            <div className="pt-2">
                                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                                    <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
                                        <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground font-mono">Item-wise Profit Margins</h4>
                                        <Badge variant="outline" className="font-mono">{(inventory || []).length} Items</Badge>
                                    </div>
                                    <div className="max-h-[500px] overflow-y-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/10 sticky top-0 backdrop-blur-sm z-10">
                                                <TableRow>
                                                    <TableHead className="font-bold">Item Name</TableHead>
                                                    <TableHead className="font-bold text-right">MRP</TableHead>
                                                    <TableHead className="font-bold text-right">Cost</TableHead>
                                                    <TableHead className="font-bold text-right">Profit / Unit</TableHead>
                                                    <TableHead className="font-bold text-right">Margin %</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(inventory || []).map((item: InventoryItem) => {
                                                    const profit = item.price - (item.costPrice || 0);
                                                    const margin = item.price > 0 ? (profit / item.price) * 100 : 0;
                                                    const isLoss = profit < 0;
                                                    return (
                                                        <TableRow key={item.id} className="hover:bg-muted/5">
                                                            <TableCell className="font-medium">{item.name}</TableCell>
                                                            <TableCell className="text-right font-mono text-muted-foreground">{currency}{(item.price || 0).toFixed(2)}</TableCell>
                                                            <TableCell className="text-right font-mono text-muted-foreground">{currency}{(item.costPrice || 0).toFixed(2)}</TableCell>
                                                            <TableCell className={cn("text-right font-black font-mono", isLoss ? "text-destructive" : "text-green-600")}>
                                                                {currency}{(profit || 0).toFixed(2)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge
                                                                    variant={isLoss ? "destructive" : (margin > 20 ? "default" : "outline")}
                                                                    className={cn("font-mono font-bold", !isLoss && margin > 20 ? "bg-green-500 hover:bg-green-600 border-transparent text-white" : "")}
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
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                            <p>Inventory data not available for analysis.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
