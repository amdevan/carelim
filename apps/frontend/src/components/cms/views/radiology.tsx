"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Scan, AlertTriangle, Cpu, CheckCircle, XCircle } from "lucide-react";
import { RisDashboard } from "@/components/cms/views/ris/dashboard";
import { RisStudies } from "@/components/cms/views/ris/studies";
import { useFetch } from "@/lib/use-fetch";
import { fetchAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/cms/empty-state";
import { formatDate, timeAgo } from "@/lib/format";
import { toast } from "sonner";

type RisTab = "dashboard" | "studies" | "alerts" | "equipment";

const tabs: { key: RisTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "studies", label: "Studies & PACS", icon: Scan },
  { key: "alerts", label: "Critical Alerts", icon: AlertTriangle },
  { key: "equipment", label: "Equipment", icon: Cpu },
];

interface RadiologyAlert {
  id: string;
  patientName: string;
  studyName: string;
  alertType: string;
  severity: "critical" | "warning";
  status: "active" | "acknowledged" | "dismissed";
  createdAt: string;
}

interface RadiologyEquipment {
  id: string;
  name: string;
  modality: string;
  status: "operational" | "maintenance" | "decommissioned";
  lastCalibration: string | null;
}

function RadiologyAlerts() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: alerts, loading } = useFetch<RadiologyAlert[]>(`/api/radiology-alerts?t=${refreshKey}`);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatus = useCallback(async (id: string, newStatus: "acknowledged" | "dismissed") => {
    setUpdating(id);
    try {
      await fetchAPI(`/api/radiology-alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Alert ${newStatus}`);
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to update alert");
    } finally {
      setUpdating(null);
    }
  }, []);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const severityBadge = (s: string) =>
    s === "critical"
      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
      : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";

  const statusBadge = (s: string) => {
    if (s === "active") return "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300";
    if (s === "acknowledged") return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
  };

  const list = alerts || [];

  return (
    <div className="space-y-4">
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Critical Alerts
          </CardTitle>
          <CardDescription className="text-xs">Active radiology alerts requiring attention</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No radiology alerts" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Patient</TableHead>
                  <TableHead className="text-[11px] uppercase">Study</TableHead>
                  <TableHead className="text-[11px] uppercase">Alert Type</TableHead>
                  <TableHead className="text-[11px] uppercase">Severity</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Created</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((a) => (
                  <TableRow key={a.id} className="table-row-hover">
                    <TableCell className="text-sm font-medium">{a.patientName}</TableCell>
                    <TableCell className="text-sm">{a.studyName}</TableCell>
                    <TableCell className="text-sm">{a.alertType}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-[9px] capitalize", severityBadge(a.severity))}>{a.severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[9px] capitalize", statusBadge(a.status))}>{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                      <span title={formatDate(a.createdAt)}>{timeAgo(a.createdAt)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {a.status === "active" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs gap-1"
                            disabled={updating === a.id}
                            onClick={() => handleStatus(a.id, "acknowledged")}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Acknowledge
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs gap-1 text-rose-600 hover:text-rose-700"
                            disabled={updating === a.id}
                            onClick={() => handleStatus(a.id, "dismissed")}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Dismiss
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RadiologyEquipment() {
  const { data: equipment, loading } = useFetch<RadiologyEquipment[]>("/api/radiology-equipment");

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  const statusBadge = (s: string) => {
    if (s === "operational") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
    if (s === "maintenance") return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
    return "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  };

  const list = equipment || [];

  return (
    <div className="space-y-4">
      <Card className="card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-600" /> Radiology Equipment
          </CardTitle>
          <CardDescription className="text-xs">Read-only view of imaging equipment inventory</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <EmptyState icon={Cpu} title="No equipment registered" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Name</TableHead>
                  <TableHead className="text-[11px] uppercase">Modality</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase hidden md:table-cell">Last Calibration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((eq) => (
                  <TableRow key={eq.id} className="table-row-hover">
                    <TableCell className="text-sm font-medium">{eq.name}</TableCell>
                    <TableCell>
                      <Badge className="text-[9px] bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">{eq.modality}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[9px] capitalize", statusBadge(eq.status))}>{eq.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                      {eq.lastCalibration ? formatDate(eq.lastCalibration) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function RadiologyView() {
  const [tab, setTab] = useState<RisTab>("dashboard");

  const views: Record<RisTab, React.ReactNode> = {
    dashboard: <RisDashboard />,
    studies: <RisStudies />,
    alerts: <RadiologyAlerts />,
    equipment: <RadiologyEquipment />,
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-md shadow-cyan-500/30 shrink-0">
          <Scan className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold leading-tight">Radiology (RIS + PACS)</h2>
          <p className="text-xs text-muted-foreground">Enterprise Radiology Information System · DICOM · AI-Assisted · Critical Alerts</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 p-1 rounded-xl border border-border bg-card overflow-x-auto scrollbar-thin">
        {tabs.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap",
                active ? "bg-teal-600 text-white shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
              <Icon className="w-4 h-4" /><span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {views[tab]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
