"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Shield, Plus, Search, Download, FileText, CheckCircle2, XCircle, Clock, AlertTriangle,
} from "lucide-react";
import { formatRs, formatDate, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { EmptyState } from "@/components/cms/empty-state";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface InsuranceClaim {
  id: string;
  claimId: string;
  patientId: string;
  patientName: string;
  provider: string;
  amount: number;
  submittedDate: string;
  description: string | null;
  status: string;
  createdAt: string;
}

const INSURANCE_PROVIDERS = ["Nepal Insurance", "Surya Life Insurance", "IME Life Insurance", "Reliance Life Insurance", "National Life Insurance", "LIC Nepal", "Asian Life Insurance", "Prudential Nepal", "Other"];

export function InsuranceView() {
  const [tick, setTick] = useState(0);
  const { data: claims, loading } = useFetch<InsuranceClaim[]>(tick ? `/api/insurance-claims?_r=${tick}` : "/api/insurance-claims");
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const allClaims = claims ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allClaims.filter((c) => {
      if (q && !c.claimId.toLowerCase().includes(q) && !c.patientName.toLowerCase().includes(q) && !c.provider.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (providerFilter !== "all" && c.provider !== providerFilter) return false;
      return true;
    });
  }, [allClaims, search, statusFilter, providerFilter]);

  const pendingClaims = allClaims.filter((c) => c.status === "pending").length;
  const approvedClaims = allClaims.filter((c) => c.status === "approved").length;
  const rejectedClaims = allClaims.filter((c) => c.status === "rejected").length;
  const totalValue = allClaims.reduce((sum, c) => sum + (c.amount || 0), 0);

  const kpis = [
    { label: "Total Claims", value: allClaims.length, icon: Shield, accent: "from-teal-500 to-teal-600" },
    { label: "Pending", value: pendingClaims, icon: Clock, accent: "from-amber-500 to-orange-500" },
    { label: "Approved", value: approvedClaims, icon: CheckCircle2, accent: "from-emerald-500 to-emerald-600" },
    { label: "Rejected", value: rejectedClaims, icon: XCircle, accent: "from-rose-500 to-rose-600" },
    { label: "Total Value", value: formatRs(totalValue), icon: AlertTriangle, accent: "from-violet-500 to-purple-600" },
  ];

  const providers = useMemo(() => {
    const set = new Set(allClaims.map((c) => c.provider).filter(Boolean));
    return Array.from(set);
  }, [allClaims]);

  const handleExport = () => {
    if (!filtered.length) { toast.info("Nothing to export"); return; }
    exportToCSV("insurance-claims", ["Claim ID", "Patient", "Provider", "Amount", "Submitted", "Status", "Description"],
      filtered.map((c) => [c.claimId, c.patientName, c.provider, c.amount, formatDate(c.submittedDate), c.status, c.description ?? ""]));
    toast.success("Insurance claims exported to CSV");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-xl font-bold">Insurance Claims</h2>
          <p className="text-sm text-muted-foreground">
            {allClaims.length} total claims · {pendingClaims} pending · {formatRs(totalValue)} total value
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> New Claim
          </Button>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.accent} flex items-center justify-center shadow-sm`}>
                    <k.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="mt-3 text-xl sm:text-2xl font-bold tracking-tight truncate">{k.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by claim ID, patient, or provider…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs"><SelectValue placeholder="Provider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Claims table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" /> Claims Register
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-lg border overflow-hidden mx-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Provider</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState icon={Shield} title="No insurance claims found" description="No claims match your search or no claims have been submitted yet." />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-accent/40">
                      <TableCell className="font-mono text-xs font-semibold">{c.claimId}</TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{c.patientName}</p>
                        {c.description && (
                          <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{c.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{c.provider}</TableCell>
                      <TableCell className="text-right text-sm font-bold tabular-nums">{formatRs(c.amount)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(c.submittedDate)}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${statusColors[c.status] || "bg-gray-100 text-gray-700"}`}>
                          {statusLabel(c.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Claim Dialog */}
      <CreateClaimDialog open={addOpen} onOpenChange={setAddOpen} onSaved={() => { setAddOpen(false); refresh(); }} />
    </div>
  );
}

// ============== Create Claim Dialog ==============
function CreateClaimDialog({
  open, onOpenChange, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    patientName: "",
    provider: "",
    amount: "",
    description: "",
    supportingDocs: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.patientName || !form.provider || !form.amount) {
      toast.error("Patient name, provider, and amount are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        patientName: form.patientName,
        provider: form.provider,
        amount: Number(form.amount) || 0,
        description: form.description || null,
        supportingDocs: form.supportingDocs || null,
      };
      const res = await fetchAPI("/api/insurance-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Insurance claim submitted");
      onSaved();
      setForm({ patientName: "", provider: "", amount: "", description: "", supportingDocs: "" });
    } catch {
      toast.error("Failed to submit insurance claim");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Insurance Claim</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Patient Name *</Label>
            <Input value={form.patientName} onChange={(e) => set("patientName", e.target.value)} placeholder="Patient full name" />
          </div>
          <div className="space-y-1.5">
            <Label>Insurance Provider *</Label>
            <Select value={form.provider || "__none__"} onValueChange={(v) => set("provider", v === "__none__" ? "" : v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select provider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" disabled>Select provider…</SelectItem>
                {INSURANCE_PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Claim Amount (Rs.) *</Label>
            <Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description of the claim…"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Supporting Documents</Label>
            <Input value={form.supportingDocs} onChange={(e) => set("supportingDocs", e.target.value)} placeholder="Document references or notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
            {saving ? "Submitting…" : "Submit Claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
