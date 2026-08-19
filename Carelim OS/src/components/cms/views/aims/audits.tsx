"use client";

import { useFetch } from "@/lib/use-fetch";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ClipboardCheck, MapPin, TrendingDown, TrendingUp, Download } from "lucide-react";
import { formatDate, statusColors, statusLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export-utils";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { toast } from "sonner";

interface StockAudit {
  id: string; auditNo: string; auditDate: string; status: string;
  performedBy: string | null; notes: string | null;
  location: { id: string; name: string; code: string };
  items: { id: string; itemName: string; systemQty: number; physicalQty: number; variance: number; reason: string | null }[];
}

export function AimsAudits() {
  const { data: audits, loading } = useFetch<StockAudit[]>("/api/stock-audits");
  const pagination = usePagination<StockAudit>(audits || [], 10);

  const totalAudits = (audits || []).length;
  const completed = (audits || []).filter(a => a.status === "completed").length;
  const totalVariance = (audits || []).reduce((s, a) => s + a.items.reduce((ss, i) => ss + i.variance, 0), 0);
  const totalItemsAudited = (audits || []).reduce((s, a) => s + a.items.length, 0);

  const handleExport = () => {
    if (!audits || audits.length === 0) { toast.info("Nothing to export"); return; }
    const rows: (string | number)[][] = [];
    audits.forEach(a => {
      a.items.forEach(item => {
        rows.push([a.auditNo, a.location.name, formatDate(a.auditDate), item.itemName, item.systemQty, item.physicalQty, item.variance, item.reason || ""]);
      });
    });
    exportToCSV("stock-audits", ["Audit No", "Location", "Date", "Item", "System Qty", "Physical Qty", "Variance", "Reason"], rows);
    toast.success("Exported");
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold">Stock Audits</h3>
          <p className="text-sm text-muted-foreground">Physical count vs system stock</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Audits" value={totalAudits} icon={ClipboardCheck} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Completed" value={completed} icon={ClipboardCheck} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="Items Audited" value={totalItemsAudited} icon={MapPin} accent="from-cyan-500 to-cyan-600" index={2} />
        <KpiCard label="Total Variance" value={totalVariance > 0 ? `+${totalVariance}` : totalVariance} icon={totalVariance >= 0 ? TrendingUp : TrendingDown} accent={totalVariance >= 0 ? "from-emerald-500 to-emerald-600" : "from-rose-500 to-rose-600"} index={3} />
      </div>

      <Card>
        <CardContent className="p-0">
          {(audits || []).length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="No audits found" description="Stock audits will appear here" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-[11px] uppercase">Audit No</TableHead>
                    <TableHead className="text-[11px] uppercase">Location</TableHead>
                    <TableHead className="text-[11px] uppercase text-center">Items</TableHead>
                    <TableHead className="text-[11px] uppercase text-center">Variance</TableHead>
                    <TableHead className="text-[11px] uppercase hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-[11px] uppercase">Status</TableHead>
                    <TableHead className="text-[11px] uppercase hidden lg:table-cell">Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paged.map((a) => {
                    const variance = a.items.reduce((s, i) => s + i.variance, 0);
                    return (
                      <TableRow key={a.id} className="table-row-hover">
                        <TableCell className="font-mono text-xs font-medium">{a.auditNo}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            {a.location.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{a.items.length}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-semibold tabular-nums ${variance > 0 ? "text-emerald-600" : variance < 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                            {variance > 0 ? `+${variance}` : variance}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{formatDate(a.auditDate)}</TableCell>
                        <TableCell><Badge className={`text-[10px] ${statusColors[a.status] || "bg-gray-100"}`}>{statusLabel(a.status)}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{a.performedBy || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination {...pagination} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
