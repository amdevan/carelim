"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/lib/use-fetch";
import { fetchAPI } from "@/lib/api";
import { toast } from "sonner";
import { formatDate, timeAgo } from "@/lib/format";
import {
  Plus, MoreVertical, Edit, Trash2, Search, Filter,
  FileText, Shield, Calendar, Clock, User, CheckCircle, XCircle,
  Banknote, Receipt,
} from "lucide-react";
import { EmptyState } from "@/components/cms/empty-state";

// ============================================================================
// Insurance Claims Module
// ============================================================================
interface InsuranceClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  insuranceProvider: string;
  policyNumber: string;
  procedure: string;
  amount: number;
  status: "submitted" | "processing" | "approved" | "rejected" | "paid";
  submittedAt: string;
  processedAt?: string;
  notes?: string;
}

export function InsuranceClaims(_props: { filter?: string }) {
  const [refresh, setRefresh] = useState(0);
  const refreshFn = useCallback(() => setRefresh((r) => r + 1), []);
  const { data: claims, loading } = useFetch<InsuranceClaim[]>(
    refresh ? `/api/insurance-claims?_r=${refresh}` : "/api/insurance-claims"
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingClaim, setEditingClaim] = useState<InsuranceClaim | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    claimNumber: "", patientName: "", insuranceProvider: "",
    policyNumber: "", procedure: "", amount: 0,
    status: "submitted", notes: "",
  });

  const resetForm = () => setForm({
    claimNumber: "", patientName: "", insuranceProvider: "",
    policyNumber: "", procedure: "", amount: 0,
    status: "submitted", notes: "",
  });

  const handleSubmit = async () => {
    if (!form.claimNumber || !form.patientName) {
      toast.error("Claim number and patient name are required");
      return;
    }
    const payload = { ...form, submittedAt: new Date().toISOString() };
    const url = editingClaim ? `/api/insurance-claims/${editingClaim.id}` : "/api/insurance-claims";
    const method = editingClaim ? "PATCH" : "POST";
    const res = await fetchAPI(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(editingClaim ? "Claim updated" : "Claim submitted");
      setShowDialog(false);
      setEditingClaim(null);
      resetForm();
      refreshFn();
    } else {
      toast.error("Failed to save claim");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetchAPI(`/api/insurance-claims/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Claim deleted");
      setDeleteId(null);
      refreshFn();
    } else {
      toast.error("Failed to delete claim");
    }
  };

  const filteredClaims = (claims || []).filter(
    (c) => c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.insuranceProvider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "paid": return "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300";
      case "rejected": return "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
      case "processing": return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
      default: return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetchAPI(`/api/insurance-claims/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Claim ${status}`);
      refreshFn();
    } else {
      toast.error("Failed to update status");
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold leading-tight">Insurance Claims</h2>
          <p className="text-xs text-muted-foreground">{filteredClaims.length} claims</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search claims..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => { resetForm(); setEditingClaim(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4" /> New Claim
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredClaims.length === 0 ? (
            <EmptyState icon={Shield} title="No insurance claims found" description="Submit your first insurance claim" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Claim #</TableHead>
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Provider</TableHead>
                  <TableHead className="text-[11px] uppercase">Amount</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Submitted</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((c) => (
                  <TableRow key={c.id} className="table-row-hover">
                    <TableCell className="text-sm font-medium">{c.claimNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-950/50 dark:to-violet-950/50">
                          <AvatarFallback className="bg-transparent text-xs font-semibold text-purple-700 dark:text-purple-300">
                            {c.patientName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{c.patientName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{c.insuranceProvider}</TableCell>
                    <TableCell className="text-sm font-medium">{c.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] capitalize ${statusColor(c.status)}`}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{timeAgo(c.submittedAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => { setEditingClaim(c); setShowDialog(true); }}>
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => updateStatus(c.id, "processing")}>
                            <Clock className="w-4 h-4 text-blue-600" /> Mark Processing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(c.id, "approved")}>
                            <CheckCircle className="w-4 h-4 text-emerald-600" /> Mark Approved
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(c.id, "paid")}>
                            <Banknote className="w-4 h-4 text-teal-600" /> Mark Paid
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(c.id, "rejected")}>
                            <XCircle className="w-4 h-4 text-rose-600" /> Reject Claim
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => setDeleteId(c.id)}>
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
            <DialogTitle>{editingClaim ? "Edit Claim" : "New Insurance Claim"}</DialogTitle>
            <DialogDescription>{editingClaim ? "Update claim details" : "Submit a new insurance claim"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Claim Number</Label>
                <Input value={form.claimNumber} onChange={(e) => setForm({ ...form, claimNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Patient Name</Label>
                <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Insurance Provider</Label>
              <Input value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Policy Number</Label>
              <Input value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Procedure</Label>
              <Input value={form.procedure} onChange={(e) => setForm({ ...form, procedure: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingClaim(null); resetForm(); }}>Cancel</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this claim?</AlertDialogTitle>
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
