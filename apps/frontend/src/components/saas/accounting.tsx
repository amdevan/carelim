"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/lib/use-fetch";
import { fetchAPI } from "@/lib/api";
import { toast } from "sonner";
import { formatDate, timeAgo } from "@/lib/format";
import {
  Plus, MoreVertical, Edit, Trash2, Search, Filter,
  Receipt, CreditCard, Wallet, Banknote, TrendingUp, TrendingDown,
  Package, BarChart3, FileText, Calendar,
} from "lucide-react";
import { EmptyState } from "@/components/cms/empty-state";

// ============================================================================
// Accounting Dashboard
// ============================================================================
interface AccountingDashboardData {
  totalRevenue: number;
  totalExpenses: number;
  totalTax: number;
  netProfit: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashBalance: number;
  recentTransactions: {
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
    status: string;
  }[];
}

export function AccountingDashboard() {
  const { data: dashboard, loading } = useFetch<AccountingDashboardData>("/api/accounting-dashboard");

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const data = dashboard || {
    totalRevenue: 0, totalExpenses: 0, totalTax: 0, netProfit: 0,
    accountsReceivable: 0, accountsPayable: 0, cashBalance: 0,
    recentTransactions: [],
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Accounting Dashboard</h2>
          <p className="text-xs text-muted-foreground">Financial overview and recent transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">{data.totalRevenue.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-rose-600">{data.totalExpenses.toLocaleString()}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-rose-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold text-teal-600">{data.netProfit.toLocaleString()}</p>
              </div>
              <Wallet className="w-8 h-8 text-teal-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Cash Balance</p>
                <p className="text-2xl font-bold text-blue-600">{data.cashBalance.toLocaleString()}</p>
              </div>
              <Banknote className="w-8 h-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Accounts Receivable</span>
              <span className="font-medium">{data.accountsReceivable.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Accounts Payable</span>
              <span className="font-medium">{data.accountsPayable.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Tax Collected</span>
              <span className="font-medium">{data.totalTax.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentTransactions.length === 0 ? (
                <EmptyState icon={FileText} title="No transactions yet" description="Transactions will appear here" />
              ) : (
                data.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.type === "income" ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600" :
                        tx.type === "expense" ? "bg-rose-100 dark:bg-rose-950/50 text-rose-600" :
                        "bg-gray-100 dark:bg-gray-950/50 text-gray-600"
                      }`}>
                        {tx.type === "income" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {tx.type === "income" ? "+" : "-"}{tx.amount.toLocaleString()}
                      </p>
                      <Badge className="text-[9px]">{tx.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Invoices Module
// ============================================================================
interface Invoice {
  id: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  tax: number;
  total: number;
  status: "paid" | "unpaid" | "partial" | "cancelled";
  date: string;
  dueDate: string;
}

export function AccountingInvoices(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: invoices, loading } = useFetch<Invoice[]>(
    refresh ? `/api/invoices?_r=${refresh}` : "/api/invoices"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    invoiceNumber: "", patientName: "", amount: 0, tax: 0,
    status: "unpaid", dueDate: "",
  });

  const resetForm = () => setForm({
    invoiceNumber: "", patientName: "", amount: 0, tax: 0,
    status: "unpaid", dueDate: "",
  });

  const handleSubmit = async () => {
    if (!form.invoiceNumber || !form.patientName) {
      toast.error("Invoice number and patient name are required");
      return;
    }
    const total = form.amount + form.tax;
    const payload = { ...form, total, date: new Date().toISOString() };
    const url = editingInvoice ? `/api/invoices/${editingInvoice.id}` : "/api/invoices";
    const method = editingInvoice ? "PATCH" : "POST";
    const res = await fetchAPI(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingInvoice ? "Invoice updated" : "Invoice created");
      setShowDialog(false);
      setEditingInvoice(null);
      resetForm();
      refreshFn();
    } else {
      toast.error("Failed to save invoice");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/invoices/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Invoice deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete invoice");
    }
  };

  const filteredInvoices = (invoices || []).filter(
    (inv) => inv.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "partial": return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
      case "cancelled": return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
      default: return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Invoices</h2>
          <p className="text-xs text-muted-foreground">{filteredInvoices.length} invoices</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => { resetForm(); setEditingInvoice(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices found" description="Create your first invoice" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Invoice #</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Amount</TableHead>
                  <TableHead className="text-[11px] uppercase">Tax</TableHead>
                  <TableHead className="text-[11px] uppercase">Total</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Due Date</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="table-row-hover">
                    <TableCell className="text-sm font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">{inv.patientName}</TableCell>
                    <TableCell className="text-sm">{inv.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{inv.tax.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-medium">{inv.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] capitalize ${statusColor(inv.status)}`}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => { setEditingInvoice(inv); setShowDialog(true); }}>
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(inv.id)}>
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? "Edit Invoice" : "New Invoice"}</DialogTitle>
            <DialogDescription>{editingInvoice ? "Update invoice details" : "Create a new invoice"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Invoice Number</Label>
                <Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Patient Name</Label>
                <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tax</Label>
                <Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingInvoice(null); resetForm(); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Expenses Module
// ============================================================================
interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: string;
  receipt?: string;
}

export function AccountingExpenses(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: expenses, loading } = useFetch<Expense[]>(
    refresh ? `/api/expenses?_r=${refresh}` : "/api/expenses"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    description: "", amount: 0, category: "", paymentMethod: "cash",
  });

  const resetForm = () => setForm({
    description: "", amount: 0, category: "", paymentMethod: "cash",
  });

  const handleSubmit = async () => {
    if (!form.description || form.amount <= 0) {
      toast.error("Description and amount are required");
      return;
    }
    const payload = { ...form, date: new Date().toISOString() };
    const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
    const method = editingExpense ? "PATCH" : "POST";
    const res = await fetchAPI(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingExpense ? "Expense updated" : "Expense added");
      setShowDialog(false);
      setEditingExpense(null);
      resetForm();
      refreshFn();
    } else {
      toast.error("Failed to save expense");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/expenses/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Expense deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete expense");
    }
  };

  const filteredExpenses = (expenses || []).filter(
    (e) => e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Expenses</h2>
          <p className="text-xs text-muted-foreground">{filteredExpenses.length} expenses</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => { resetForm(); setEditingExpense(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredExpenses.length === 0 ? (
            <EmptyState icon={Receipt} title="No expenses found" description="Add your first expense" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Description</TableHead>
                  <TableHead className="text-[11px] uppercase">Category</TableHead>
                  <TableHead className="text-[11px] uppercase">Amount</TableHead>
                  <TableHead className="text-[11px] uppercase">Payment Method</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((e) => (
                  <TableRow key={e.id} className="table-row-hover">
                    <TableCell className="text-sm font-medium">{e.description}</TableCell>
                    <TableCell className="text-sm">{e.category}</TableCell>
                    <TableCell className="text-sm font-medium text-rose-600">{e.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm capitalize">{e.paymentMethod}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(e.date)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => { setEditingExpense(e); setShowDialog(true); }}>
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(e.id)}>
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
            <DialogDescription>{editingExpense ? "Update expense details" : "Add a new expense"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g., Utilities, Rent" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingExpense(null); resetForm(); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
