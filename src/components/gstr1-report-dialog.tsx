"use client";

import { useState, useMemo } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Building2,
  Receipt,
  FileCheck2,
  TableProperties,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language-context';
import { Bill } from '@/lib/types';
import { format, isThisMonth, isWithinInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface Gstr1ReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
  currency?: string;
  venueDetails?: any;
}

export function Gstr1ReportDialog({
  isOpen,
  onOpenChange,
  bills,
  currency = 'Rs.',
  venueDetails,
}: Gstr1ReportDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [period, setPeriod] = useState<'this-month' | 'last-month' | 'all'>('this-month');

  // Filter bills by period
  const filteredBills = useMemo(() => {
    const now = new Date();
    if (period === 'this-month') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return bills.filter((b) => isWithinInterval(new Date(b.timestamp), { start, end }));
    } else if (period === 'last-month') {
      const lastMonthDate = subMonths(now, 1);
      const start = startOfMonth(lastMonthDate);
      const end = endOfMonth(lastMonthDate);
      return bills.filter((b) => isWithinInterval(new Date(b.timestamp), { start, end }));
    }
    return bills;
  }, [bills, period]);

  // 1. Calculate B2CS (B2C Small - Consumer Sales by GST Slab: 0%, 5%, 12%, 18%, 28%)
  const b2csSlabs = useMemo(() => {
    const slabs: Record<
      number,
      { slab: number; taxable: number; cgst: number; sgst: number; totalTax: number; invoiceTotal: number }
    > = {
      0: { slab: 0, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, invoiceTotal: 0 },
      5: { slab: 5, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, invoiceTotal: 0 },
      12: { slab: 12, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, invoiceTotal: 0 },
      18: { slab: 18, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, invoiceTotal: 0 },
      28: { slab: 28, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, invoiceTotal: 0 },
    };

    filteredBills.forEach((bill) => {
      // Check if bill has items
      bill.orderItems.forEach((item) => {
        const rate = item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : 5;
        const roundedRate = [0, 5, 12, 18, 28].includes(rate) ? rate : 5;
        const lineTotal = (item.price || 0) * (item.quantity || 1);

        // Calculate taxable and tax (MRP inclusive formula)
        const taxable = lineTotal / (1 + roundedRate / 100);
        const taxAmount = lineTotal - taxable;
        const cgst = taxAmount / 2;
        const sgst = taxAmount / 2;

        if (!slabs[roundedRate]) {
          slabs[roundedRate] = { slab: roundedRate, taxable: 0, cgst: 0, sgst: 0, totalTax: 0, invoiceTotal: 0 };
        }

        slabs[roundedRate].taxable += taxable;
        slabs[roundedRate].cgst += cgst;
        slabs[roundedRate].sgst += sgst;
        slabs[roundedRate].totalTax += taxAmount;
        slabs[roundedRate].invoiceTotal += lineTotal;
      });
    });

    return Object.values(slabs).filter((s) => s.invoiceTotal > 0);
  }, [filteredBills]);

  // 2. Calculate HSN Summary (Table 12 of GSTR-1)
  const hsnSummary = useMemo(() => {
    const hsnMap: Record<
      string,
      { hsn: string; desc: string; uqc: string; totalQty: number; totalValue: number; taxableValue: number; cgst: number; sgst: number; totalTax: number; rate: number }
    > = {};

    filteredBills.forEach((bill) => {
      bill.orderItems.forEach((item) => {
        const hsn = (item as any).hsnCode || (item.category === 'Groceries & Staples' ? '1101' : item.category === 'Beverages' ? '2202' : '1902');
        const rate = item.taxRate || 5;
        const qty = item.quantity || 1;
        const total = (item.price || 0) * qty;
        const taxable = total / (1 + rate / 100);
        const tax = total - taxable;

        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            hsn: hsn,
            desc: item.name,
            uqc: 'PCS',
            totalQty: 0,
            totalValue: 0,
            taxableValue: 0,
            cgst: 0,
            sgst: 0,
            totalTax: 0,
            rate: rate,
          };
        }

        hsnMap[hsn].totalQty += qty;
        hsnMap[hsn].totalValue += total;
        hsnMap[hsn].taxableValue += taxable;
        hsnMap[hsn].cgst += tax / 2;
        hsnMap[hsn].sgst += tax / 2;
        hsnMap[hsn].totalTax += tax;
      });
    });

    return Object.values(hsnMap);
  }, [filteredBills]);

  // Totals
  const totalTaxable = b2csSlabs.reduce((sum, s) => sum + s.taxable, 0);
  const totalCgst = b2csSlabs.reduce((sum, s) => sum + s.cgst, 0);
  const totalSgst = b2csSlabs.reduce((sum, s) => sum + s.sgst, 0);
  const totalGst = totalCgst + totalSgst;
  const totalRevenue = b2csSlabs.reduce((sum, s) => sum + s.invoiceTotal, 0);

  // Export CSV for CA
  const handleExportCsv = () => {
    const storeGstin = venueDetails?.gstin || 'UNREGISTERED';
    const storeName = venueDetails?.name || 'SUPERMARKET';

    let csvContent = `GSTR-1 SALES TAX SUMMARY - ${storeName.toUpperCase()}\n`;
    csvContent += `Store GSTIN: ${storeGstin}, Period: ${period.toUpperCase()}, Export Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n\n`;

    // Table 7 - B2CS Summary
    csvContent += `TABLE 7: B2C SMALL RETAIL INVOICES (RATE-WISE SUMMARY)\n`;
    csvContent += `Rate (%),Taxable Value (${currency}),CGST (${currency}),SGST (${currency}),Total Tax (${currency}),Total Value (${currency})\n`;
    b2csSlabs.forEach((s) => {
      csvContent += `${s.slab}%,${s.taxable.toFixed(2)},${s.cgst.toFixed(2)},${s.sgst.toFixed(2)},${s.totalTax.toFixed(2)},${s.invoiceTotal.toFixed(2)}\n`;
    });
    csvContent += `TOTAL,${totalTaxable.toFixed(2)},${totalCgst.toFixed(2)},${totalSgst.toFixed(2)},${totalGst.toFixed(2)},${totalRevenue.toFixed(2)}\n\n`;

    // Table 12 - HSN Summary
    csvContent += `TABLE 12: HSN-WISE SUMMARY OF OUTWARD SUPPLIES\n`;
    csvContent += `HSN Code,Description,UQC,Total Qty,Total Value (${currency}),Taxable Value (${currency}),CGST (${currency}),SGST (${currency}),Total Tax (${currency})\n`;
    hsnSummary.forEach((h) => {
      csvContent += `"${h.hsn}","${h.desc}","${h.uqc}",${h.totalQty},${h.totalValue.toFixed(2)},${h.taxableValue.toFixed(2)},${h.cgst.toFixed(2)},${h.sgst.toFixed(2)},${h.totalTax.toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GSTR1_Sales_Report_${period}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t("GSTR-1 CSV Exported"),
      description: t("CSV file ready for your Chartered Accountant / GST filing software."),
    });
  };

  const handlePrintGstr1 = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GSTR-1 Tax Summary</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
          .bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: right; }
          th { background: #f8f8f8; text-align: center; font-weight: bold; }
          td.left { text-align: left; }
          .kpi { display: flex; justify-content: space-between; background: #f3f4f6; padding: 8px; border: 1px solid #ccc; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">${venueDetails?.name || 'SUPERMARKET'}</h2>
          <div>GSTIN: ${venueDetails?.gstin || 'NOT CONFIGURED'} | State: ${venueDetails?.state || 'Local Intra-State'}</div>
          <h3 style="margin: 5px 0 0 0;">GSTR-1 SALES TAX SUMMARY (${period.toUpperCase()})</h3>
          <div>Generated on: ${format(new Date(), 'PPpp')}</div>
        </div>

        <div class="kpi">
          <div>Total Bills: <strong>${filteredBills.length}</strong></div>
          <div>Gross Sales: <strong>${currency}${totalRevenue.toFixed(2)}</strong></div>
          <div>Taxable Value: <strong>${currency}${totalTaxable.toFixed(2)}</strong></div>
          <div>CGST: <strong>${currency}${totalCgst.toFixed(2)}</strong></div>
          <div>SGST: <strong>${currency}${totalSgst.toFixed(2)}</strong></div>
          <div>Total Tax: <strong>${currency}${totalGst.toFixed(2)}</strong></div>
        </div>

        <h4 style="margin-bottom: 2px;">TABLE 7: RATE-WISE B2C RETAIL SALES SUMMARY</h4>
        <table>
          <thead>
            <tr>
              <th>GST Rate</th>
              <th>Taxable Value</th>
              <th>CGST Amount</th>
              <th>SGST Amount</th>
              <th>Total GST</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${b2csSlabs
              .map(
                (s) => `
              <tr>
                <td style="text-align: center;" class="bold">${s.slab}%</td>
                <td>${currency}${s.taxable.toFixed(2)}</td>
                <td>${currency}${s.cgst.toFixed(2)}</td>
                <td>${currency}${s.sgst.toFixed(2)}</td>
                <td class="bold">${currency}${s.totalTax.toFixed(2)}</td>
                <td class="bold">${currency}${s.invoiceTotal.toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
            <tr style="background: #eee; font-weight: bold;">
              <td style="text-align: center;">TOTAL</td>
              <td>${currency}${totalTaxable.toFixed(2)}</td>
              <td>${currency}${totalCgst.toFixed(2)}</td>
              <td>${currency}${totalSgst.toFixed(2)}</td>
              <td>${currency}${totalGst.toFixed(2)}</td>
              <td>${currency}${totalRevenue.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <h4 style="margin-bottom: 2px; margin-top: 15px;">TABLE 12: HSN-WISE SUMMARY OF SUPPLIES</h4>
        <table>
          <thead>
            <tr>
              <th>HSN Code</th>
              <th>Description</th>
              <th>Total Qty</th>
              <th>Taxable Value</th>
              <th>CGST</th>
              <th>SGST</th>
              <th>Total Tax</th>
            </tr>
          </thead>
          <tbody>
            ${hsnSummary
              .map(
                (h) => `
              <tr>
                <td style="text-align: center;" class="bold">${h.hsn}</td>
                <td class="left">${h.desc.slice(0, 24)}</td>
                <td style="text-align: center;">${h.totalQty} ${h.uqc}</td>
                <td>${currency}${h.taxableValue.toFixed(2)}</td>
                <td>${currency}${h.cgst.toFixed(2)}</td>
                <td>${currency}${h.sgst.toFixed(2)}</td>
                <td class="bold">${currency}${h.totalTax.toFixed(2)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {t("GSTR-1 GST Tax Report & CA Export")}
          </DialogTitle>
          <DialogDescription>
            {t("Comprehensive rate-wise tax slabs, HSN outward summaries, and 1-click CSV export for your accountant and GST filing.")}
          </DialogDescription>
        </DialogHeader>

        {/* Store GSTIN Status Bar */}
        <div className="p-3 bg-muted/40 rounded-2xl border border-border/50 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <div>
              <span className="text-xs font-black uppercase text-foreground">{venueDetails?.name || 'SUPERMARKET'}</span>
              <span className="text-xs text-muted-foreground ml-2">
                GSTIN: <strong className="font-mono text-foreground">{venueDetails?.gstin || t('Not Configured')}</strong>
              </span>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex gap-1.5 p-1 bg-background rounded-xl border border-border/60">
            <Button
              size="sm"
              variant={period === 'this-month' ? 'default' : 'ghost'}
              onClick={() => setPeriod('this-month')}
              className="h-8 text-xs font-bold rounded-lg"
            >
              {t("This Month")}
            </Button>
            <Button
              size="sm"
              variant={period === 'last-month' ? 'default' : 'ghost'}
              onClick={() => setPeriod('last-month')}
              className="h-8 text-xs font-bold rounded-lg"
            >
              {t("Last Month")}
            </Button>
            <Button
              size="sm"
              variant={period === 'all' ? 'default' : 'ghost'}
              onClick={() => setPeriod('all')}
              className="h-8 text-xs font-bold rounded-lg"
            >
              {t("All Time")}
            </Button>
          </div>
        </div>

        {/* KPI Tax Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl">
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("Gross Invoiced Sales")}</div>
            <div className="text-xl font-black text-primary mt-0.5">{currency}{totalRevenue.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">{filteredBills.length} {t("bills in period")}</div>
          </div>

          <div className="p-3 bg-muted/40 border border-border/50 rounded-2xl">
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t("Net Taxable Value")}</div>
            <div className="text-xl font-black text-foreground mt-0.5">{currency}{totalTaxable.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">{t("Excluding tax")}</div>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">{t("CGST (Central Tax)")}</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">{currency}{totalCgst.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">{t("50% of total tax")}</div>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-600">{t("SGST (State Tax)")}</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">{currency}{totalSgst.toFixed(2)}</div>
            <div className="text-[10px] text-muted-foreground">{t("50% of total tax")}</div>
          </div>
        </div>

        {/* Table 7: B2CS Rate-wise Breakdown */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TableProperties className="h-3.5 w-3.5 text-primary" />
              {t("Table 7: B2CS Retail Sales Rate-Wise Summary")}
            </h4>
          </div>

          <div className="border border-border/60 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-muted/60 p-2.5 font-bold text-xs uppercase tracking-wider text-muted-foreground grid grid-cols-12 gap-2 text-center">
              <span className="col-span-2 text-left pl-2">{t("GST Slab")}</span>
              <span className="col-span-2 text-right">{t("Taxable Value")}</span>
              <span className="col-span-2 text-right">{t("CGST")}</span>
              <span className="col-span-2 text-right">{t("SGST")}</span>
              <span className="col-span-2 text-right font-black">{t("Total Tax")}</span>
              <span className="col-span-2 text-right font-black pr-2">{t("Invoice Value")}</span>
            </div>

            <div className="divide-y divide-border/40 text-sm">
              {b2csSlabs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">{t("No bills found for this period.")}</div>
              ) : (
                b2csSlabs.map((s) => (
                  <div key={s.slab} className="p-2.5 grid grid-cols-12 gap-2 items-center hover:bg-muted/20">
                    <span className="col-span-2 font-black text-primary pl-2">{s.slab}% GST</span>
                    <span className="col-span-2 text-right font-mono font-bold">{currency}{s.taxable.toFixed(2)}</span>
                    <span className="col-span-2 text-right font-mono text-emerald-600 font-bold">{currency}{s.cgst.toFixed(2)}</span>
                    <span className="col-span-2 text-right font-mono text-blue-600 font-bold">{currency}{s.sgst.toFixed(2)}</span>
                    <span className="col-span-2 text-right font-mono font-black">{currency}{s.totalTax.toFixed(2)}</span>
                    <span className="col-span-2 text-right font-mono font-black pr-2">{currency}{s.invoiceTotal.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Table 12: HSN Summary */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileCheck2 className="h-3.5 w-3.5 text-primary" />
              {t("Table 12: HSN-Wise Summary of Supplies")}
            </h4>
          </div>

          <div className="border border-border/60 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-muted/60 p-2.5 font-bold text-xs uppercase tracking-wider text-muted-foreground grid grid-cols-12 gap-2 text-center">
              <span className="col-span-2 text-left pl-2">{t("HSN Code")}</span>
              <span className="col-span-4 text-left">{t("Description")}</span>
              <span className="col-span-2 text-center">{t("Total Qty")}</span>
              <span className="col-span-2 text-right">{t("Taxable Value")}</span>
              <span className="col-span-2 text-right pr-2">{t("Total Tax")}</span>
            </div>

            <div className="divide-y divide-border/40 text-sm max-h-48 overflow-y-auto">
              {hsnSummary.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">{t("No HSN data found.")}</div>
              ) : (
                hsnSummary.map((h) => (
                  <div key={h.hsn} className="p-2.5 grid grid-cols-12 gap-2 items-center hover:bg-muted/20">
                    <span className="col-span-2 font-mono font-black text-primary pl-2">{h.hsn}</span>
                    <span className="col-span-4 truncate font-medium">{h.desc}</span>
                    <span className="col-span-2 text-center font-bold text-xs">{h.totalQty} {h.uqc}</span>
                    <span className="col-span-2 text-right font-mono font-bold">{currency}{h.taxableValue.toFixed(2)}</span>
                    <span className="col-span-2 text-right font-mono font-black text-foreground pr-2">{currency}{h.totalTax.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            {t("Close")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrintGstr1} className="rounded-xl font-bold gap-2">
              <Printer className="h-4 w-4" />
              {t("Print Tax Summary")}
            </Button>
            <Button onClick={handleExportCsv} className="rounded-xl font-black gap-2">
              <Download className="h-4 w-4" />
              {t("Export GSTR-1 CSV for CA")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
