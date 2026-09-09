"use client";

import { useState, useMemo, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { formatDate, statusColors } from "@/lib/format";
import { EmptyState } from "@/components/cms/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Globe, Copy, ExternalLink, Settings, Eye, Link, Calendar, Check,
  Trash2, Plus, MapPin, User, Building2, Layers, Stethoscope, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface BookingConfig {
  id: string;
  tenantId: string;
  enabled: boolean;
  requireLogin: boolean;
  showDepartments: boolean;
  showDoctors: boolean;
  allowedTimeSlots: string;
  createdAt: string;
  updatedAt: string;
}

interface BookingLink {
  id: string;
  configId: string;
  branchId: string | null;
  doctorId: string | null;
  doctorName: string | null;
  department: string | null;
  label: string | null;
  url: string;
  slug: string;
  active: boolean;
  createdAt: string;
  branch?: { id: string; name: string } | null;
  doctor?: { id: string; name: string } | null;
}

interface PublicBooking {
  id: string;
  patientName: string;
  email: string;
  phone: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

/* ---------- Constants ---------- */

const TIME_SLOT_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
];

const BOOKING_STATUS: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  completed: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  "no-show": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

/* ---------- Skeleton ---------- */

function PublicBookingSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-6 w-48" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Main Component ---------- */

export function PublicBookingView() {
  const [refresh, setRefresh] = useState(0);
  const url = refresh ? `/api/public-booking?_r=${refresh}` : "/api/public-booking";
  const { data: config, loading } = useFetch<BookingConfig>(url);
  const { data: links } = useFetch<BookingLink[]>(
    refresh ? `/api/public-bookings/links?_r=${refresh}` : "/api/public-bookings/links"
  );
  const { data: bookings } = useFetch<PublicBooking[]>(
    refresh ? `/api/public-bookings?_r=${refresh}` : "/api/public-bookings"
  );
  const { data: branches } = useFetch<{ id: string; name: string }[]>(
    "/api/branches"
  );
  const { data: doctors } = useFetch<{ id: string; name: string; specialization: string }[]>(
    "/api/doctors"
  );

  const [tab, setTab] = useState("settings");
  const [configForm, setConfigForm] = useState({
    enabled: false,
    requireLogin: false,
    showDepartments: true,
    showDoctors: true,
    allowedTimeSlots: "30",
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({
    doctorName: "",
    department: "",
    branchId: "",
    doctorId: "",
    label: "",
    generateAllBranches: false,
  });
  const [savingLink, setSavingLink] = useState(false);
  const [deleteLink, setDeleteLink] = useState<BookingLink | null>(null);

  const doRefresh = () => setRefresh((r) => r + 1);

  /* Sync config from API */
  useEffect(() => {
    if (config) {
      setConfigForm({
        enabled: !!config.enabled,
        requireLogin: !!config.requireLogin,
        showDepartments: !!config.showDepartments,
        showDoctors: !!config.showDoctors,
        allowedTimeSlots: config.allowedTimeSlots || "30",
      });
    }
  }, [config]);

  const bookingUrl = config
    ? `${window.location.origin}/book/${config.tenantId}`
    : `${window.location.origin}/book/...`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(bookingUrl).then(
      () => toast.success("Booking URL copied to clipboard"),
      () => toast.error("Failed to copy URL"),
    );
  };

  /* Save settings */
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetchAPI("/api/public-booking", {
        method: config ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Booking page settings saved");
      doRefresh();
    } catch {
      toast.error("Failed to save booking settings");
    } finally {
      setSavingConfig(false);
    }
  };

  /* Create link */
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkForm.generateAllBranches && !linkForm.doctorName && !linkForm.doctorId && !linkForm.department) {
      toast.error("Provide a doctor name, select a doctor, or enter a department");
      return;
    }
    setSavingLink(true);
    try {
      // Build clean payload — only include non-empty values
      const payload: any = {};
      if (linkForm.generateAllBranches) payload.generateAllBranches = true;
      if (linkForm.branchId) payload.branchId = linkForm.branchId;
      if (linkForm.doctorId) payload.doctorId = linkForm.doctorId;
      if (linkForm.doctorName) payload.doctorName = linkForm.doctorName;
      if (linkForm.department) payload.department = linkForm.department;
      if (linkForm.label) payload.label = linkForm.label;

      const res = await fetchAPI("/api/public-bookings/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create link");
      toast.success("Booking link created");
      setLinkDialogOpen(false);
      setLinkForm({ doctorName: "", department: "", branchId: "", doctorId: "", label: "", generateAllBranches: false });
      doRefresh();
    } catch {
      toast.error("Failed to create booking link");
    } finally {
      setSavingLink(false);
    }
  };

  /* Delete link */
  const handleDeleteLink = async () => {
    if (!deleteLink) return;
    try {
      const res = await fetchAPI(`/api/public-bookings/links/${deleteLink.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Booking link deleted");
      setDeleteLink(null);
      doRefresh();
    } catch {
      toast.error("Failed to delete booking link");
    }
  };

  /* Copy link URL */
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Failed to copy link"),
    );
  };

  /* Toggle link active */
  const handleToggleLink = async (link: BookingLink) => {
    try {
      const res = await fetchAPI(`/api/public-bookings/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !link.active }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Link ${link.active ? "deactivated" : "activated"}`);
      doRefresh();
    } catch {
      toast.error("Failed to update link status");
    }
  };

  /* Stats */
  const stats = useMemo(() => {
    const all = bookings || [];
    return {
      total: all.length,
      confirmed: all.filter((b) => b.status === "confirmed").length,
      pending: all.filter((b) => b.status === "pending").length,
      cancelled: all.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings]);

  if (loading && !config) return <PublicBookingSkeleton />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
              <Globe className="w-4.5 h-4.5" />
            </span>
            Public Booking
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the public appointment booking page · {(links || []).length} links · {stats.total} bookings
          </p>
        </div>
      </div>

      {/* Booking URL bar */}
      <Card className="border-border/60">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">Public Booking URL</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <Link className="w-4 h-4 text-violet-600 shrink-0" />
                <span className="text-sm font-mono truncate flex-1">{bookingUrl}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-5">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyUrl}>
                <Copy className="w-3.5 h-3.5" /> Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Book an appointment: ${bookingUrl}`)}`, "_blank")}
              >
                <MessageCircle className="w-3.5 h-3.5" /> Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => window.open(bookingUrl, "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Preview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Bookings", value: stats.total, accent: "from-violet-500 to-purple-600" },
          { label: "Confirmed", value: stats.confirmed, accent: "from-emerald-500 to-emerald-600" },
          { label: "Pending", value: stats.pending, accent: "from-amber-500 to-amber-600" },
          { label: "Cancelled", value: stats.cancelled, accent: "from-rose-500 to-rose-600" },
        ].map((s) => (
          <Card key={s.label} className="border-border/60 overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center text-white shadow-md shrink-0`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className="text-xl font-bold tabular-nums">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="settings" className="gap-1.5 text-xs">
            <Settings className="w-3.5 h-3.5" /> Settings
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5 text-xs">
            <Link className="w-3.5 h-3.5" /> Booking Links
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-1.5 text-xs">
            <Eye className="w-3.5 h-3.5" /> Recent Bookings
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-violet-600" /> Booking Page Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Enable Public Booking</p>
                  <p className="text-[11px] text-muted-foreground">Allow patients to book appointments online</p>
                </div>
                <Switch
                  checked={configForm.enabled}
                  onCheckedChange={(v) => setConfigForm((f) => ({ ...f, enabled: v }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Require Login</p>
                  <p className="text-[11px] text-muted-foreground">Patients must be logged in to book an appointment</p>
                </div>
                <Switch
                  checked={configForm.requireLogin}
                  onCheckedChange={(v) => setConfigForm((f) => ({ ...f, requireLogin: v }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Show Departments</p>
                  <p className="text-[11px] text-muted-foreground">Display department selection on the booking page</p>
                </div>
                <Switch
                  checked={configForm.showDepartments}
                  onCheckedChange={(v) => setConfigForm((f) => ({ ...f, showDepartments: v }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Show Doctors</p>
                  <p className="text-[11px] text-muted-foreground">Display doctor selection on the booking page</p>
                </div>
                <Switch
                  checked={configForm.showDoctors}
                  onCheckedChange={(v) => setConfigForm((f) => ({ ...f, showDoctors: v }))}
                />
              </div>
              <div className="rounded-lg border border-border/60 px-4 py-3">
                <Label className="text-sm font-medium block mb-2">Allowed Time Slots</Label>
                <Select
                  value={configForm.allowedTimeSlots}
                  onValueChange={(v) => setConfigForm((f) => ({ ...f, allowedTimeSlots: v }))}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                >
                  <Check className="w-4 h-4" />
                  {savingConfig ? "Saving…" : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Links Tab */}
        <TabsContent value="links" className="mt-3">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Link className="w-4 h-4 text-violet-600" /> Booking Links
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Share these links with patients to book appointments
                </p>
              </div>
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                onClick={() => setLinkDialogOpen(true)}
              >
                <Plus className="w-4 h-4" /> Create Link
              </Button>
            </div>

            {/* Empty state */}
            {(!links || links.length === 0) && (
              <Card className="border-border/60 border-dashed">
                <CardContent className="py-10 text-center">
                  <Link className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">No booking links yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Create a link to share with patients for appointment booking</p>
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                    onClick={() => setLinkDialogOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Your First Link
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Link Cards */}
            <div className="grid gap-3">
              {(links || []).map((link) => {
                const linkBookings = (bookings || []).filter((b) =>
                  link.doctorName ? b.doctorName === link.doctorName : true
                );
                return (
                  <Card key={link.id} className={`border-border/60 transition-all ${!link.active ? "opacity-60" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          link.active
                            ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          <User className="w-5 h-5" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold">
                              {link.label || link.doctorName || "General Booking"}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`text-[10px] cursor-pointer ${
                                link.active
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                              onClick={() => handleToggleLink(link)}
                            >
                              {link.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>

                          {/* Meta tags */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {link.branch && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5">
                                <MapPin className="w-3 h-3" /> {link.branch.name}
                              </span>
                            )}
                            {link.department && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5">
                                <Building2 className="w-3 h-3" /> {link.department}
                              </span>
                            )}
                            {link.doctor && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-1.5 py-0.5">
                                <Stethoscope className="w-3 h-3" /> {link.doctor.name}
                              </span>
                            )}
                            {linkBookings.length > 0 && (
                              <span className="text-[11px] text-muted-foreground">
                                {linkBookings.length} booking{linkBookings.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* URL */}
                          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5">
                            <Globe className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                            <span className="text-[11px] font-mono truncate flex-1 text-muted-foreground">{link.url}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-[11px]"
                            onClick={() => handleCopyLink(link.url)}
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-[11px] text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Book an appointment: ${link.url}`)}`, "_blank")}
                          >
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-[11px]"
                            onClick={() => window.open(link.url, "_blank")}
                          >
                            <ExternalLink className="w-3 h-3" /> Preview
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700"
                            onClick={() => setDeleteLink(link)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Recent Bookings Tab */}
        <TabsContent value="recent" className="mt-3">
          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-600" /> Recent Bookings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden md:table-cell">Contact</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!bookings || bookings.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState icon={Calendar} title="No bookings yet" description="Bookings will appear here once patients start booking." />
                        </TableCell>
                      </TableRow>
                    )}
                    {(bookings || []).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{b.patientName}</div>
                          {b.department && (
                            <div className="text-[11px] text-muted-foreground">{b.department}</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-xs text-muted-foreground">{b.email || "—"}</div>
                          <div className="text-xs text-muted-foreground">{b.phone || "—"}</div>
                        </TableCell>
                        <TableCell className="text-sm">{b.doctorName}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{formatDate(b.date)}</div>
                          <div className="text-[11px] text-muted-foreground">{b.time}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${BOOKING_STATUS[b.status] || statusColors[b.status] || ""}`}
                          >
                            {b.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-4 h-4 text-violet-600" /> Create Booking Link
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLink} className="space-y-4">
            {/* Link Type */}
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Link Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLinkForm((f) => ({ ...f, generateAllBranches: false }))}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    !linkForm.generateAllBranches
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                      : "border-border/60 hover:border-border"
                  }`}
                >
                  <User className="w-5 h-5 text-violet-600 mb-1.5" />
                  <p className="text-sm font-medium">Single Link</p>
                  <p className="text-[10px] text-muted-foreground">For a specific branch or doctor</p>
                </button>
                {(branches || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLinkForm((f) => ({ ...f, generateAllBranches: true, branchId: "" }))}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      linkForm.generateAllBranches
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    <Layers className="w-5 h-5 text-violet-600 mb-1.5" />
                    <p className="text-sm font-medium">All Branches</p>
                    <p className="text-[10px] text-muted-foreground">One link per branch automatically</p>
                  </button>
                )}
              </div>
            </div>

            {/* Branch Selector (single mode) */}
            {!linkForm.generateAllBranches && (branches || []).length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Branch
                </Label>
                <Select
                  value={linkForm.branchId}
                  onValueChange={(v) => setLinkForm((f) => ({ ...f, branchId: v === "all" ? "" : v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {(branches || []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Branch filter for "All Branches" mode */}
            {linkForm.generateAllBranches && (
              <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/30 px-3 py-2">
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  One booking link will be created for each of your {(branches || []).length} branches.
                </p>
              </div>
            )}

            {/* Doctor Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Stethoscope className="w-3 h-3" /> Doctor
              </Label>
              <Select
                value={linkForm.doctorId}
                onValueChange={(v) => {
                  if (v === "all") {
                    setLinkForm((f) => ({ ...f, doctorId: "", doctorName: "" }));
                  } else {
                    const doc = (doctors || []).find((d) => d.id === v);
                    setLinkForm((f) => ({ ...f, doctorId: v, doctorName: doc?.name || "" }));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any doctor (browse all)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Doctor</SelectItem>
                  {(doctors || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name} — {d.specialization}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link Label */}
            <div className="space-y-1.5">
              <Label className="text-xs">Link Label <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                value={linkForm.label}
                onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Main Branch - Dr. Smith"
              />
              <p className="text-[10px] text-muted-foreground">A friendly name to identify this link in your dashboard</p>
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Preview</p>
              <p className="text-xs font-medium">
                {linkForm.generateAllBranches
                  ? `Will create ${(branches || []).length} links`
                  : linkForm.label || linkForm.doctorName || "General Booking Link"
                }
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingLink} className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
                {savingLink ? "Creating…" : (
                  linkForm.generateAllBranches ? <><Layers className="w-3.5 h-3.5" /> Generate All Branches</> : <><Plus className="w-3.5 h-3.5" /> Create Link</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Link Confirm */}
      <Dialog open={!!deleteLink} onOpenChange={(o) => { if (!o) setDeleteLink(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Booking Link?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the booking link for <strong>{deleteLink?.doctorName || deleteLink?.department || "this entry"}</strong>. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLink(null)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDeleteLink}>
              Delete Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
