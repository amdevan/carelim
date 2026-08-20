"use client";

import { useState, useMemo } from "react";
import { fetchAPI } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/cms/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  Bell, Plus, Search, Download, Mail, MessageSquare, Send,
  Trash2, Eye, CheckCircle2, Pencil, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface Notification {
  id: string;
  type: "email" | "sms";
  recipient: string;
  subject: string | null;
  body: string;
  status: string;
  sentAt: string;
  createdAt: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: "email" | "sms";
  subject: string | null;
  body: string;
  lastUsedAt: string | null;
  createdAt: string;
}

/* ---------- Constants ---------- */

const NOTIF_STATUS: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  delivered: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

/* ---------- Skeleton ---------- */

function NotificationsSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Card className="border-border/60">
        <CardContent className="p-0">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 m-2" />)}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Main Component ---------- */

export function NotificationsView() {
  const [refresh, setRefresh] = useState(0);
  const url = refresh ? `/api/notifications?_r=${refresh}` : "/api/notifications";
  const { data: notifications, loading } = useFetch<Notification[]>(url);
  const { data: templates } = useFetch<NotificationTemplate[]>(
    refresh ? `/api/notification-templates?_r=${refresh}` : "/api/notification-templates"
  );

  const [tab, setTab] = useState("notifications");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ type: "email" as "email" | "sms", recipient: "", subject: "", body: "" });
  const [saving, setSaving] = useState(false);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", type: "email" as "email" | "sms", subject: "", body: "" });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<NotificationTemplate | null>(null);

  const doRefresh = () => setRefresh((r) => r + 1);

  /* Stats */
  const stats = useMemo(() => {
    const all = notifications || [];
    return {
      total: all.length,
      email: all.filter((n) => n.type === "email").length,
      sms: all.filter((n) => n.type === "sms").length,
      failed: all.filter((n) => n.status === "failed").length,
    };
  }, [notifications]);

  /* Filtered notifications */
  const filtered = useMemo(() => {
    const all = notifications || [];
    const q = search.trim().toLowerCase();
    return all.filter((n) => {
      if (q) {
        const hay = [n.recipient, n.subject, n.body].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      return true;
    });
  }, [notifications, search, typeFilter, statusFilter]);

  /* Create notification */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.recipient || !createForm.body) {
      toast.error("Recipient and message body are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetchAPI("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: createForm.type,
          recipient: createForm.recipient,
          subject: createForm.subject || null,
          body: createForm.body,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Notification sent successfully");
      setCreateOpen(false);
      setCreateForm({ type: "email", recipient: "", subject: "", body: "" });
      doRefresh();
    } catch {
      toast.error("Failed to send notification");
    } finally {
      setSaving(false);
    }
  };

  /* Create/Edit template */
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.body) {
      toast.error("Template name and body are required");
      return;
    }
    setSavingTemplate(true);
    try {
      const res = editingTemplate
        ? await fetchAPI(`/api/notification-templates/${editingTemplate.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(templateForm),
          })
        : await fetchAPI("/api/notification-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(templateForm),
          });
      if (!res.ok) throw new Error("Failed");
      toast.success(editingTemplate ? "Template updated" : "Template created");
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: "", type: "email", subject: "", body: "" });
      doRefresh();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  /* Delete template */
  const handleDeleteTemplate = async () => {
    if (!deleteTemplate) return;
    try {
      const res = await fetchAPI(`/api/notification-templates/${deleteTemplate.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Template deleted");
      setDeleteTemplate(null);
      doRefresh();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  /* Open edit template */
  const openEditTemplate = (t: NotificationTemplate) => {
    setEditingTemplate(t);
    setTemplateForm({ name: t.name, type: t.type, subject: t.subject || "", body: t.body });
    setTemplateDialogOpen(true);
  };

  if (loading && !notifications) return <NotificationsSkeleton />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">
              <Bell className="w-4.5 h-4.5" />
            </span>
            Notifications
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Email & SMS notifications · {(notifications || []).length} total sent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
            toast.info("Export coming soon");
          }}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Send Notification
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Sent", value: stats.total, icon: Send, accent: "from-amber-500 to-orange-600" },
          { label: "Email", value: stats.email, icon: Mail, accent: "from-teal-500 to-teal-600" },
          { label: "SMS", value: stats.sms, icon: MessageSquare, accent: "from-violet-500 to-violet-600" },
          { label: "Failed", value: stats.failed, icon: AlertCircle, accent: "from-rose-500 to-rose-600" },
        ].map((s) => (
          <Card key={s.label} className="border-border/60 overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center text-white shadow-md shrink-0`}>
                  <s.icon className="w-5 h-5" />
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
          <TabsTrigger value="notifications" className="gap-1.5 text-xs">
            <Bell className="w-3.5 h-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs">
            <Mail className="w-3.5 h-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-3">
          {/* Filter bar */}
          <Card className="border-border/60 mb-3">
            <CardContent className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search recipient, subject, body…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Type</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead className="hidden md:table-cell">Subject / Message</TableHead>
                      <TableHead className="hidden sm:table-cell">Sent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <EmptyState icon={Bell} title="No notifications found" description="Try adjusting your search or filters." />
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {n.type === "email" ? (
                              <Mail className="w-4 h-4 text-teal-600" />
                            ) : (
                              <MessageSquare className="w-4 h-4 text-violet-600" />
                            )}
                            <span className="text-xs font-medium uppercase">{n.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{n.recipient}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {n.subject && (
                            <div className="text-sm font-medium">{n.subject}</div>
                          )}
                          <div className="text-xs text-muted-foreground truncate max-w-[300px]">{n.body}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {formatDate(n.sentAt || n.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${NOTIF_STATUS[n.status] || ""}`}
                          >
                            {n.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="View details">
                              <Eye className="w-3.5 h-3.5" />
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

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-3">
          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-600" /> Notification Templates
              </CardTitle>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateForm({ name: "", type: "email", subject: "", body: "" });
                  setTemplateDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> New Template
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Subject</TableHead>
                      <TableHead className="hidden sm:table-cell">Last Used</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!templates || templates.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState icon={Mail} title="No templates" description="Create a template to quickly send notifications." />
                        </TableCell>
                      </TableRow>
                    )}
                    {(templates || []).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm font-medium">{t.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {t.type === "email" ? (
                              <Mail className="w-3.5 h-3.5 text-teal-600" />
                            ) : (
                              <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
                            )}
                            <span className="text-xs font-medium uppercase">{t.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {t.subject || "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {t.lastUsedAt ? formatDate(t.lastUsedAt) : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTemplate(t)} title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:text-rose-700" onClick={() => setDeleteTemplate(t)} title="Delete">
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

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600" /> Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border/60 px-4 py-3">
                <p className="text-sm font-medium">Email Provider</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Configure SMTP settings in the system settings panel for email delivery.</p>
              </div>
              <div className="rounded-lg border border-border/60 px-4 py-3">
                <p className="text-sm font-medium">SMS Gateway</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Configure your SMS provider API key in the system settings panel.</p>
              </div>
              <div className="rounded-lg border border-border/60 px-4 py-3">
                <p className="text-sm font-medium">Notification Log Retention</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Notification history is retained for 90 days by default.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Notification Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-600" /> Send Notification
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Type</Label>
              <Select
                value={createForm.type}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, type: v as "email" | "sms" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Recipient *</Label>
              <Input
                value={createForm.recipient}
                onChange={(e) => setCreateForm((f) => ({ ...f, recipient: e.target.value }))}
                placeholder={createForm.type === "email" ? "patient@email.com" : "+977 9800000000"}
                required
              />
            </div>
            {createForm.type === "email" && (
              <div>
                <Label className="text-xs mb-1 block">Subject</Label>
                <Input
                  value={createForm.subject}
                  onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Notification subject"
                />
              </div>
            )}
            <div>
              <Label className="text-xs mb-1 block">Message Body *</Label>
              <Textarea
                value={createForm.body}
                onChange={(e) => setCreateForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Type your notification message…"
                rows={5}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                <Send className="w-4 h-4" />
                {saving ? "Sending…" : "Send Notification"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-600" />
              {editingTemplate ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate} className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Template Name *</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Appointment Confirmation"
                required
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Type</Label>
              <Select
                value={templateForm.type}
                onValueChange={(v) => setTemplateForm((f) => ({ ...f, type: v as "email" | "sms" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {templateForm.type === "email" && (
              <div>
                <Label className="text-xs mb-1 block">Subject</Label>
                <Input
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject line"
                />
              </div>
            )}
            <div>
              <Label className="text-xs mb-1 block">Body *</Label>
              <Textarea
                value={templateForm.body}
                onChange={(e) => setTemplateForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Template body content…"
                rows={5}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setTemplateDialogOpen(false); setEditingTemplate(null); }}>Cancel</Button>
              <Button type="submit" disabled={savingTemplate} className="bg-amber-600 hover:bg-amber-700 text-white">
                {savingTemplate ? "Saving…" : editingTemplate ? "Update Template" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirm */}
      <Dialog open={!!deleteTemplate} onOpenChange={(o) => { if (!o) setDeleteTemplate(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the template <strong>{deleteTemplate?.name}</strong>. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTemplate(null)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={handleDeleteTemplate}>
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
