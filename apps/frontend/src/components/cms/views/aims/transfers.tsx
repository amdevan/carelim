"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownUp, ArrowRight, Download, Check, Clock, X, Package,
} from "lucide-react";
import { formatRs, formatDate, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { toast } from "sonner";

interface StockTransfer {
  id: string; transferNo: string; status: string; notes: string | null;
  requestedBy: string | null; approvedBy: string | null; receivedBy: string | null;
  transferDate: string; approvedAt: string | null; receivedAt: string | null;
  fromLocation: { id: string; name: string; code: string };
  toLocation: { id: string; name: string; code: string };
  items: { id: string; quantity: number; receivedQty: number; item: { id: string; name: string; unit: string } }[];
}

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  approved: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  "in-transit": "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  received: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

export function AimsTransfers() {
  const { data: transfers, loading } = useFetch<StockTransfer[]>("/api/stock-transfers");
  const [refresh, setRefresh] = useState(0);
  const { data: transfersRefreshed } = useFetch<StockTransfer[]>(refresh ? `/api/stock-transfers?_r=${refresh}` : "/api/stock-transfers");
  const data = transfersRefreshed || transfers;
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    return filter === "all" ? data : data.filter(t => t.status === filter);
  }, [data, filter]);

  const pagination = usePagination<StockTransfer>(filtered, 10);

  const pending = (data || []).filter(t => t.status === "pending").length;
  const inTransit = (data || []).filter(t => t.status === "approved" || t.status === "in-transit").length;
  const received = (data || []).filter(t => t.status === "received").length;

  const handleAction = async (id: string, status: string) => {
    const res = await fetchAPI(`/api/stock-transfers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Transfer ${status}`);
      setRefresh(r => r + 1);
    }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold">Stock Transfers</h3>
          <p className="text-sm text-muted-foreground">{data?.length || 0} transfers · Multi-location stock movement</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setCreateOpen(true)}>
          <ArrowDownUp className="w-4 h-4" /> New Transfer
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Transfers" value={data?.length || 0} icon={ArrowDownUp} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Pending" value={pending} icon={Clock} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="In Transit" value={inTransit} icon={ArrowRight} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="Received" value={received} icon={Check} accent="from-emerald-500 to-emerald-600" index={3} />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {["all", "pending", "approved", "in-transit", "received", "cancelled"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === s ? "bg-teal-600 text-white" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {s === "all" ? "All" : statusLabel(s)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {(filtered || []).length === 0 ? (
            <EmptyState icon={ArrowDownUp} title="No transfers found" description="Create a stock transfer to move items between locations" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-[11px] uppercase">Transfer No</TableHead>
                    <TableHead className="text-[11px] uppercase">From → To</TableHead>
                    <TableHead className="text-[11px] uppercase text-center">Items</TableHead>
                    <TableHead className="text-[11px] uppercase hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-[11px] uppercase">Status</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paged.map((t) => (
                    <TableRow key={t.id} className="table-row-hover">
                      <TableCell className="font-mono text-xs font-medium">{t.transferNo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-medium">{t.fromLocation.name}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">{t.toLocation.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{t.items.length}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(t.transferDate)}</TableCell>
                      <TableCell><Badge className={`text-[10px] ${TRANSFER_STATUS_COLORS[t.status] || ""}`}>{statusLabel(t.status)}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {t.status === "pending" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleAction(t.id, "approved")}>
                              <Check className="w-3 h-3" /> Approve
                            </Button>
                          )}
                          {t.status === "approved" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" onClick={() => handleAction(t.id, "received")}>
                              <Package className="w-3 h-3" /> Receive
                            </Button>
                          )}
                          {(t.status === "pending" || t.status === "approved") && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-600" onClick={() => handleAction(t.id, "cancelled")}>
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </CardContent>
      </Card>

      <CreateTransferDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => { setCreateOpen(false); setRefresh(r => r + 1); }} />
    </div>
  );
}

function CreateTransferDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const { data: locations } = useFetch<{ id: string; name: string; code: string }[]>("/api/inventory-locations");
  const { data: items } = useFetch<{ id: string; name: string; unit: string }[]>("/api/inventory-items");
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("10");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!fromLoc || !toLoc || !itemId) { toast.error("Please fill all fields"); return; }
    if (fromLoc === toLoc) { toast.error("From and To locations must be different"); return; }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromLocationId: fromLoc,
          toLocationId: toLoc,
          requestedBy: "Store Manager",
          notes,
          items: [{ itemId, quantity: Number(qty) }],
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Transfer created");
      setFromLoc(""); setToLoc(""); setItemId(""); setQty("10"); setNotes("");
      onCreated();
    } catch {
      toast.error("Failed to create transfer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Stock Transfer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>From Location</Label>
            <Select value={fromLoc} onValueChange={setFromLoc}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {(locations || []).map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>To Location</Label>
            <Select value={toLoc} onValueChange={setToLoc}>
              <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
              <SelectContent>
                {(locations || []).filter(l => l.id !== fromLoc).map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent>
                {(items || []).map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input type="number" value={qty} onChange={e => setQty(e.target.value)} min="1" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for transfer…" className="h-16" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white" onClick={submit}>
            {saving ? "Creating…" : "Create Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
