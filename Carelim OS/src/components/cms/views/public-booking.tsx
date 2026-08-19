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
  Trash2, Plus,
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
  doctorName: string | null;
  department: string | null;
  url: string;
  slug: string;
  active: boolean;
  createdAt: string;
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
  const [linkForm, setLinkForm] = useState({ doctorName: "", department: "" });
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
    if (!linkForm.doctorName && !linkForm.department) {
      toast.error("Provide a doctor name or department");
      return;
    }
    setSavingLink(true);
    try {
      const res = await fetchAPI("/api/public-bookings/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(linkForm),
      });
      if (!res.ok) throw new Error("Failed to create link");
      toast.success("Booking link created");
      setLinkDialogOpen(false);
      setLinkForm({ doctorName: "", department: "" });
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
          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Link className="w-4 h-4 text-violet-600" /> Generated Booking Links
              </CardTitle>
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                onClick={() => setLinkDialogOpen(true)}
              >
                <Plus className="w-4 h-4" /> New Link
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Doctor / Department</TableHead>
                      <TableHead className="hidden md:table-cell">URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!links || links.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState icon={Link} title="No booking links" description="Create a link to share with patients." />
                        </TableCell>
                      </TableRow>
                    )}
                    {(links || []).map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{link.doctorName || "—"}</div>
                          {link.department && (
                            <div className="text-[11px] text-muted-foreground">{link.department}</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono truncate max-w-[240px] text-muted-foreground">{link.url}</span>
                          </div>
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {formatDate(link.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyLink(link.url)} title="Copy link">
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => window.open(link.url, "_blank")}
                              title="Open link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-600 hover:text-rose-700"
                              onClick={() => setDeleteLink(link)}
                              title="Delete link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-4 h-4 text-violet-600" /> Create Booking Link
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLink} className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Doctor Name</Label>
              <Input
                value={linkForm.doctorName}
                onChange={(e) => setLinkForm((f) => ({ ...f, doctorName: e.target.value }))}
                placeholder="e.g. Dr. Smith"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Department</Label>
              <Input
                value={linkForm.department}
                onChange={(e) => setLinkForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="e.g. Cardiology"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingLink} className="bg-violet-600 hover:bg-violet-700 text-white">
                {savingLink ? "Creating…" : "Create Link"}
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
