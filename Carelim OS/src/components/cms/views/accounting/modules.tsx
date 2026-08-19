"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Receipt, Wallet, Shield, TrendingUp, Plus } from "lucide-react";
import { formatRs, formatDate, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { useState } from "react";
import { toast } from "sonner";

// ============== Journal Entries ==============
interface JournalEntry {
  id: string; entryNo: string; date: string; description: string; reference: string | null;
  module: string | null; totalDebit: number; totalCredit: number; status: string;
  items: { id: string; accountId: string; debit: number; credit: number; description: string | null; account: { code: string; name: string; type: string } }[];
}

export function AcctJournal() {
  const { data: entries, loading } = useFetch<JournalEntry[]>("/api/journal-entries");
  const [selected, setSelected] = useState<JournalEntry | null>(null);
  const pagination = usePagination<JournalEntry>(entries || [], 10);

  const handleExport = () => {
    if (!entries?.length) { toast.info("Nothing to export"); return; }
    exportToCSV("journal-entries", ["Entry No", "Date", "Description", "Module", "Reference", "Debit", "Credit"],
      entries.map(e => [e.entryNo, formatDate(e.date), e.description, e.module || "", e.reference || "", e.totalDebit, e.totalCredit]));
    toast.success("Exported");
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-bold">Journal Entries</h3><p className="text-sm text-muted-foreground">{entries?.length || 0} entries · Auto-posted from all modules</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <Card><CardContent className="p-0">
        {(entries || []).length === 0 ? <EmptyState icon={FileText} title="No journal entries" description="Entries are auto-created from clinic operations" /> : (
          <><Table>
            <TableHeader><TableRow className="bg-muted/40">
              <TableHead className="text-[11px] uppercase">Entry No</TableHead>
              <TableHead className="text-[11px] uppercase">Date</TableHead>
              <TableHead className="text-[11px] uppercase">Description</TableHead>
              <TableHead className="text-[11px] uppercase">Module</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Debit</TableHead>
              <TableHead className="text-[11px] uppercase text-right">Credit</TableHead>
              <TableHead className="text-[11px] uppercase">Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pagination.paged.map(e => (
                <TableRow key={e.id} className="table-row-hover cursor-pointer" onClick={() => setSelected(e)}>
                  <TableCell className="font-mono text-xs font-medium">{e.entryNo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(e.date)}</TableCell>
                  <TableCell className="text-sm">{e.description}</TableCell>
                  <TableCell><Badge className="text-[9px] bg-muted text-muted-foreground">{e.module || "manual"}</Badge></TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">{formatRs(e.totalDebit)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">{formatRs(e.totalCredit)}</TableCell>
                  <TableCell><Badge className={`text-[9px] ${statusColors[e.status] || "bg-gray-100"}`}>{statusLabel(e.status)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table><Pagination {...pagination} /></>
        )}
      </CardContent></Card>

      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto scrollbar-thin p-0">
          {selected && (
            <div className="p-6 space-y-4">
              <SheetHeader><SheetTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-teal-600" /> {selected.entryNo}</SheetTitle></SheetHeader>
              <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 p-3 text-sm">
                <p><strong>{selected.description}</strong></p>
                <p className="text-xs text-muted-foreground mt-1">Date: {formatDate(selected.date)} · Module: {selected.module} · Reference: {selected.reference || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-2">Journal Items</p>
                <Table>
                  <TableHeader><TableRow className="bg-muted/40"><TableHead className="text-[10px] uppercase">Account</TableHead><TableHead className="text-[10px] uppercase text-right">Debit</TableHead><TableHead className="text-[10px] uppercase text-right">Credit</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {selected.items.map(it => (
                      <TableRow key={it.id}>
                        <TableCell><p className="text-xs font-medium">{it.account.name}</p><p className="text-[9px] text-muted-foreground font-mono">{it.account.code}</p></TableCell>
                        <TableCell className="text-right text-xs font-semibold tabular-nums text-emerald-600">{it.debit > 0 ? formatRs(it.debit) : "—"}</TableCell>
                        <TableCell className="text-right text-xs font-semibold tabular-nums text-rose-600">{it.credit > 0 ? formatRs(it.credit) : "—"}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2">
                      <TableCell className="text-xs font-bold">Total</TableCell>
                      <TableCell className="text-right text-xs font-bold tabular-nums">{formatRs(selected.totalDebit)}</TableCell>
                      <TableCell className="text-right text-xs font-bold tabular-nums">{formatRs(selected.totalCredit)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============== Patient Payments ==============
interface PatientPayment { id: string; receiptNo: string; patientName: string; amount: number; paymentMethod: string; paymentType: string; date: string; notes: string | null }

export function AcctPayments() {
  const { data: payments, loading } = useFetch<PatientPayment[]>("/api/patient-payments");
  const pagination = usePagination<PatientPayment>(payments || [], 10);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const total = (payments || []).reduce((s, p) => s + p.amount, 0);
  const cashTotal = (payments || []).filter(p => p.paymentMethod === "Cash").reduce((s, p) => s + p.amount, 0);
  const digitalTotal = (payments || []).filter(p => p.paymentMethod !== "Cash").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-bold">Patient Payments</h3><p className="text-sm text-muted-foreground">{payments?.length || 0} receipts</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { exportToCSV("patient-payments", ["Receipt", "Patient", "Amount", "Method", "Type", "Date"], (payments || []).map(p => [p.receiptNo, p.patientName, p.amount, p.paymentMethod, p.paymentType, formatDate(p.date)])); toast.success("Exported"); }}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total Collection" value={formatRs(total)} icon={Wallet} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Cash" value={formatRs(cashTotal)} icon={Receipt} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Digital" value={formatRs(digitalTotal)} icon={TrendingUp} accent="from-cyan-500 to-cyan-600" index={2} />
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Receipt</TableHead>
            <TableHead className="text-[11px] uppercase">Patient</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Amount</TableHead>
            <TableHead className="text-[11px] uppercase">Method</TableHead>
            <TableHead className="text-[11px] uppercase">Type</TableHead>
            <TableHead className="text-[11px] uppercase">Date</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {pagination.paged.map(p => (
              <TableRow key={p.id} className="table-row-hover">
                <TableCell className="font-mono text-xs">{p.receiptNo}</TableCell>
                <TableCell className="text-sm font-medium">{p.patientName}</TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">{formatRs(p.amount)}</TableCell>
                <TableCell><Badge className="text-[9px] bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300">{p.paymentMethod}</Badge></TableCell>
                <TableCell><Badge className={`text-[9px] ${statusColors[p.paymentType] || "bg-gray-100"}`}>{p.paymentType}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(p.date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination {...pagination} />
      </CardContent></Card>
    </div>
  );
}

// ============== Doctor Commissions ==============
interface Commission { id: string; doctorName: string; month: string; consultationAmt: number; procedureAmt: number; labAmt: number; radiologyAmt: number; commissionPct: number; totalCommission: number; status: string }

export function AcctCommissions() {
  const [refresh, setRefresh] = useState(0);
  const { data: commissions, loading } = useFetch<Commission[]>(refresh ? `/api/doctor-commissions?_r=${refresh}` : "/api/doctor-commissions");

  const handleSettle = async (id: string) => {
    await fetchAPI(`/api/doctor-commissions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "settled" }) });
    toast.success("Commission settled"); setRefresh(r => r + 1);
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const total = (commissions || []).reduce((s, c) => s + c.totalCommission, 0);
  const pending = (commissions || []).filter(c => c.status === "pending").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-bold">Doctor Commissions</h3><p className="text-sm text-muted-foreground">{commissions?.length || 0} records · {pending} pending</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { exportToCSV("commissions", ["Doctor", "Month", "Consultation", "Procedure", "Lab", "Radiology", "Rate", "Commission", "Status"], (commissions || []).map(c => [c.doctorName, c.month, c.consultationAmt, c.procedureAmt, c.labAmt, c.radiologyAmt, c.commissionPct, c.totalCommission, c.status])); toast.success("Exported"); }}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total Commission" value={formatRs(total)} icon={TrendingUp} accent="from-violet-500 to-purple-600" index={0} />
        <KpiCard label="Pending" value={pending} icon={Receipt} accent="from-amber-500 to-orange-500" index={1} />
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Doctor</TableHead>
            <TableHead className="text-[11px] uppercase">Month</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Consultation</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Procedure</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Lab + Radio</TableHead>
            <TableHead className="text-[11px] uppercase text-center">Rate</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Commission</TableHead>
            <TableHead className="text-[11px] uppercase">Status</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(commissions || []).map(c => (
              <TableRow key={c.id} className="table-row-hover">
                <TableCell className="text-sm font-medium">{c.doctorName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.month}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{formatRs(c.consultationAmt)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{formatRs(c.procedureAmt)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{formatRs(c.labAmt + c.radiologyAmt)}</TableCell>
                <TableCell className="text-center text-xs font-semibold">{c.commissionPct}%</TableCell>
                <TableCell className="text-right text-sm font-bold tabular-nums text-violet-600">{formatRs(c.totalCommission)}</TableCell>
                <TableCell><Badge className={`text-[9px] ${c.status === "settled" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"}`}>{c.status}</Badge></TableCell>
                <TableCell className="text-right">{c.status === "pending" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSettle(c.id)}>Settle</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

// ============== Insurance Claims ==============
interface Claim { id: string; claimNo: string; patientName: string; insuranceCompany: string; policyNumber: string | null; claimAmount: number; approvedAmount: number | null; status: string; submittedAt: string }

export function AcctInsurance() {
  const [refresh, setRefresh] = useState(0);
  const { data: claims, loading } = useFetch<Claim[]>(refresh ? `/api/insurance-claims?_r=${refresh}` : "/api/insurance-claims");

  const handleStatus = async (id: string, status: string) => {
    await fetchAPI(`/api/insurance-claims/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, approvedAmount: status === "approved" ? undefined : undefined }) });
    toast.success(`Claim ${status}`); setRefresh(r => r + 1);
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const totalClaimed = (claims || []).reduce((s, c) => s + c.claimAmount, 0);
  const pending = (claims || []).filter(c => c.status === "pending" || c.status === "submitted").length;
  const approved = (claims || []).filter(c => c.status === "approved" || c.status === "paid").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-bold">Insurance Claims</h3><p className="text-sm text-muted-foreground">{claims?.length || 0} claims</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { exportToCSV("insurance-claims", ["Claim No", "Patient", "Company", "Amount", "Approved", "Status", "Date"], (claims || []).map(c => [c.claimNo, c.patientName, c.insuranceCompany, c.claimAmount, c.approvedAmount || "", c.status, formatDate(c.submittedAt)])); toast.success("Exported"); }}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total Claimed" value={formatRs(totalClaimed)} icon={Shield} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Pending" value={pending} icon={Receipt} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Approved" value={approved} icon={TrendingUp} accent="from-emerald-500 to-emerald-600" index={2} />
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Claim No</TableHead>
            <TableHead className="text-[11px] uppercase">Patient</TableHead>
            <TableHead className="text-[11px] uppercase">Company</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Claimed</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Approved</TableHead>
            <TableHead className="text-[11px] uppercase">Status</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(claims || []).map(c => (
              <TableRow key={c.id} className="table-row-hover">
                <TableCell className="font-mono text-xs">{c.claimNo}</TableCell>
                <TableCell className="text-sm font-medium">{c.patientName}</TableCell>
                <TableCell className="text-xs">{c.insuranceCompany}</TableCell>
                <TableCell className="text-right text-xs font-semibold tabular-nums">{formatRs(c.claimAmount)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{c.approvedAmount ? formatRs(c.approvedAmount) : "—"}</TableCell>
                <TableCell><Badge className={`text-[9px] ${statusColors[c.status] || "bg-gray-100"}`}>{statusLabel(c.status)}</Badge></TableCell>
                <TableCell className="text-right">
                  {c.status === "pending" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatus(c.id, "submitted")}>Submit</Button>}
                  {c.status === "submitted" && <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 text-emerald-700" onClick={() => handleStatus(c.id, "approved")}>Approve</Button>}
                  {c.status === "approved" && <Button size="sm" variant="outline" className="h-7 text-xs bg-teal-50 text-teal-700" onClick={() => handleStatus(c.id, "paid")}>Mark Paid</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

// ============== Expenses ==============
interface ExpenseItem { id: string; code: string; category: string; description: string; amount: number; paymentMode: string; date: string; status: string }

export function AcctExpenses() {
  const { data: expData, loading } = useFetch<{ expenses: ExpenseItem[]; total: number; byCategory: Record<string, number> }>("/api/expenses");
  const pagination = usePagination<ExpenseItem>(expData?.expenses || [], 10);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const total = expData?.total || 0;
  const pending = (expData?.expenses || []).filter(e => e.status === "pending").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-bold">Expense Management</h3><p className="text-sm text-muted-foreground">{expData?.expenses.length || 0} expenses · {pending} pending</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { exportToCSV("expenses", ["Code", "Category", "Description", "Amount", "Mode", "Date", "Status"], (expData?.expenses || []).map(e => [e.code, e.category, e.description, e.amount, e.paymentMode, formatDate(e.date), e.status])); toast.success("Exported"); }}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total Expenses" value={formatRs(total)} icon={TrendingUp} accent="from-rose-500 to-rose-600" index={0} />
        <KpiCard label="Pending" value={pending} icon={Receipt} accent="from-amber-500 to-orange-500" index={1} />
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow className="bg-muted/40">
            <TableHead className="text-[11px] uppercase">Code</TableHead>
            <TableHead className="text-[11px] uppercase">Category</TableHead>
            <TableHead className="text-[11px] uppercase">Description</TableHead>
            <TableHead className="text-[11px] uppercase text-right">Amount</TableHead>
            <TableHead className="text-[11px] uppercase">Mode</TableHead>
            <TableHead className="text-[11px] uppercase">Date</TableHead>
            <TableHead className="text-[11px] uppercase">Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {pagination.paged.map(e => (
              <TableRow key={e.id} className="table-row-hover">
                <TableCell className="font-mono text-xs">{e.code}</TableCell>
                <TableCell><Badge className="text-[9px] bg-muted text-muted-foreground">{e.category}</Badge></TableCell>
                <TableCell className="text-sm">{e.description}</TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">{formatRs(e.amount)}</TableCell>
                <TableCell className="text-xs">{e.paymentMode}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(e.date)}</TableCell>
                <TableCell><Badge className={`text-[9px] ${statusColors[e.status] || "bg-gray-100"}`}>{statusLabel(e.status)}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination {...pagination} />
      </CardContent></Card>
    </div>
  );
}
