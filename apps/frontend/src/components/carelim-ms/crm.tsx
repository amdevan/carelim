"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { KpiCard } from "@/components/cms/kpi-card";
import { EmptyState } from "@/components/cms/empty-state";
import { usePagination } from "@/lib/use-pagination";
import { Pagination } from "@/components/cms/pagination";
import { exportToCSV } from "@/lib/export-utils";
import { formatRs, formatDate, statusColors } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Download, Plus, Search, MoreVertical, Eye, CheckCircle2, Users,
  CalendarClock, Phone, Mail, MessageCircle, MessageSquare, FileText, Target,
  TrendingUp, Activity, Clock, Sparkles,
  Save, X, Star, Briefcase, AlertCircle, Trash2, Edit3,
  PlayCircle, PauseCircle, CheckCircle, ArrowRight,
  Tag, Megaphone,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

// ============================================================
// Shared types & helpers
// ============================================================
interface CRMContact {
  id: string; contactNo: string; name: string; phone: string; email: string | null;
  type: string; category: string; source: string; company: string | null;
  address: string | null; city: string | null; assignedTo: string | null;
  tags: string[] | null; notes: string | null; score: number;
  status: string; createdAt: string;
}

interface CRMDeal {
  id: string; dealNo: string; title: string; contactId: string; contactName: string;
  stage: string; value: number; source: string; priority: string;
  expectedClose: string | null; probability: number; interest: string | null;
  assignedTo: string | null; notes: string | null; createdAt: string;
  lostReason: string | null;
}

interface CRMCommunication {
  id: string; contactId: string; contactName: string; type: string; direction: string;
  subject: string; body: string | null; outcome: string | null;
  duration: number | null; scheduledAt: string | null; assignedTo: string | null;
  createdAt: string;
}

interface CRMTask {
  id: string; title: string; description: string | null; contactId: string | null;
  contactName: string | null; type: string; priority: string;
  dueDate: string | null; assignedTo: string | null; status: string;
  createdAt: string;
}

interface CRMTemplate {
  id: string; name: string; category: string; subject: string;
  body: string; variables: string[] | null; active: boolean; createdAt: string;
}

const DEAL_STAGES = ["qualification", "needs_analysis", "proposal", "negotiation", "closed_won", "closed_lost"];
const STAGE_LABELS: Record<string, string> = {
  qualification: "Qualification", needs_analysis: "Needs Analysis",
  proposal: "Proposal", negotiation: "Negotiation",
  closed_won: "Closed Won", closed_lost: "Closed Lost",
};
const STAGE_COLORS: Record<string, string> = {
  qualification: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  needs_analysis: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  proposal: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  negotiation: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  closed_won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  closed_lost: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};
const PRIORITY_BORDER: Record<string, string> = {
  urgent: "border-l-rose-500", high: "border-l-orange-500",
  medium: "border-l-blue-500", low: "border-l-gray-400",
};
const CONTACT_TYPES = ["patient", "doctor", "clinic", "partner", "vendor", "corporate"];
const CONTACT_CATEGORIES = ["general", "premium", "enterprise", "referral", "walk_in", "online"];
const CONTACT_SOURCES = ["website", "referral", "social_media", "advertisement", "walk_in", "partner", "cold_call", "event"];
const COMMUNICATION_TYPES = ["call", "email", "whatsapp", "sms", "meeting", "note"];
const COMMUNICATION_DIRECTIONS = ["inbound", "outbound"];
const TASK_TYPES = ["follow_up", "demo", "meeting", "proposal", "callback", "research", "admin"];
const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"];
const TEMPLATE_CATEGORIES = ["general", "follow_up", "appointment", "promotion", "welcome", "feedback"];

const COMM_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone, email: Mail, whatsapp: MessageCircle,
  sms: MessageSquare, meeting: Users, note: FileText,
};

function useRefresh() { const [r, setR] = useState(0); return [r, () => setR(v => v + 1)] as const; }
function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`text-[9px] capitalize ${statusColors[status] || "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300"}`}>{status.replace(/_/g, " ")}</Badge>;
}
function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant="outline" className={`text-[9px] capitalize ${PRIORITY_COLORS[priority] || "bg-gray-100 text-gray-600"}`}>{priority}</Badge>;
}
function TypeBadge({ type }: { type: string }) {
  return <Badge variant="outline" className="text-[9px] capitalize">{type.replace(/_/g, " ")}</Badge>;
}

// ============================================================
// 1. CRM Contacts
// ============================================================
export function CRMContacts() {
  const [refresh, setRefresh] = useRefresh();
  const { data: contacts, loading } = useFetch<CRMContact[]>(`/api/crm-contacts?_r=${refresh}`);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<CRMContact | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", type: "patient", category: "general",
    source: "website", company: "", address: "", city: "",
    assignedTo: "", tags: "", notes: "", score: 0,
  });

  const filtered = useMemo(() => {
    let list = contacts || [];
    if (typeFilter !== "all") list = list.filter(c => c.type === typeFilter);
    if (categoryFilter !== "all") list = list.filter(c => c.category === categoryFilter);
    if (statusFilter !== "all") list = list.filter(c => c.status === statusFilter);
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(ql) || c.phone.includes(q) || c.contactNo.toLowerCase().includes(ql) || c.email?.toLowerCase().includes(ql));
    }
    return list;
  }, [contacts, q, typeFilter, categoryFilter, statusFilter]);
  const pagination = usePagination(filtered, 10);

  const thisMonthNew = useMemo(() => {
    const now = new Date();
    return (contacts || []).filter(c => {
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [contacts]);

  const resetForm = () => setForm({ name: "", phone: "", email: "", type: "patient", category: "general", source: "website", company: "", address: "", city: "", assignedTo: "", tags: "", notes: "", score: 0 });

  const create = async () => {
    if (!form.name || !form.phone) { toast.error("Name and phone required"); return; }
    setSaving(true);
    try {
      await fetchAPI("/api/crm-contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [] }) });
      toast.success("Contact created"); setAddOpen(false); resetForm(); setRefresh();
    } catch { toast.error("Failed to create contact"); } finally { setSaving(false); }
  };

  const update = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await fetchAPI(`/api/crm-contacts/${detail.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [] }) });
      toast.success("Contact updated"); setEditOpen(false); setDetail(null); resetForm(); setRefresh();
    } catch { toast.error("Failed to update"); } finally { setSaving(false); }
  };

  const deactivate = async (id: string) => {
    await fetchAPI(`/api/crm-contacts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "inactive" }) });
    toast.success("Contact deactivated"); setRefresh();
  };

  const deleteContact = async () => {
    if (!deleteId) return;
    await fetchAPI(`/api/crm-contacts/${deleteId}`, { method: "DELETE" });
    toast.success("Contact deleted"); setDeleteId(null); setRefresh();
  };

  const openEdit = (c: CRMContact) => {
    setForm({ name: c.name, phone: c.phone, email: c.email || "", type: c.type, category: c.category, source: c.source, company: c.company || "", address: c.address || "", city: c.city || "", assignedTo: c.assignedTo || "", tags: c.tags?.join(", ") || "", notes: c.notes || "", score: c.score || 0 });
    setEditOpen(true);
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Contacts</h2><p className="text-xs text-muted-foreground">{contacts?.length || 0} contacts · CRM directory</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (contacts?.length) { exportToCSV("crm-contacts", ["ContactNo", "Name", "Phone", "Email", "Type", "Category", "Source", "Score", "Status"], contacts.map(c => [c.contactNo, c.name, c.phone, c.email || "", c.type, c.category, c.source, c.score, c.status])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { resetForm(); setAddOpen(true); }}><Plus className="w-4 h-4" /> New Contact</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Contacts" value={contacts?.length || 0} icon={Users} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Active" value={contacts?.filter(c => c.status === "active").length || 0} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={1} />
        <KpiCard label="VIP" value={contacts?.filter(c => c.category === "premium").length || 0} icon={Star} accent="from-amber-500 to-orange-500" index={2} />
        <KpiCard label="This Month New" value={thisMonthNew} icon={Sparkles} accent="from-violet-500 to-violet-600" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, contact no…" className="pl-8 h-9 text-sm" /></div>
            <div className="flex gap-1 flex-wrap">{["all", ...CONTACT_TYPES].map(t => <button key={t} onClick={() => setTypeFilter(t)} className={`text-[10px] px-2.5 py-1 rounded-md capitalize transition-colors ${typeFilter === t ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>{t}</button>)}</div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="h-8 w-[120px] text-[10px]"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent>{["all", ...CONTACT_CATEGORIES].map(c => <SelectItem key={c} value={c} className="text-[10px] capitalize">{c}</SelectItem>)}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-8 w-[100px] text-[10px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>{["all", "active", "inactive"].map(s => <SelectItem key={s} value={s} className="text-[10px] capitalize">{s}</SelectItem>)}</SelectContent></Select>
          </div>
          {filtered.length === 0 ? <EmptyState icon={Users} title="No contacts found" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Contact No</TableHead>
                  <TableHead className="text-[11px] uppercase">Name</TableHead>
                  <TableHead className="text-[11px] uppercase">Phone</TableHead>
                  <TableHead className="text-[11px] uppercase">Type</TableHead>
                  <TableHead className="text-[11px] uppercase">Category</TableHead>
                  <TableHead className="text-[11px] uppercase">Source</TableHead>
                  <TableHead className="text-[11px] uppercase">Score</TableHead>
                  <TableHead className="text-[11px] uppercase">Assigned</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(c => (
                    <TableRow key={c.id} className="table-row-hover cursor-pointer" onClick={() => setDetail(c)}>
                      <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{c.contactNo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8"><AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-[10px]">{c.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                          <div><p className="text-xs font-semibold">{c.name}</p>{c.company && <p className="text-[10px] text-muted-foreground">{c.company}</p>}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{c.phone}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] capitalize">{c.type}</Badge></TableCell>
                      <TableCell className="text-xs capitalize">{c.category}</TableCell>
                      <TableCell className="text-xs capitalize">{c.source.replace(/_/g, " ")}</TableCell>
                      <TableCell><div className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /><span className="text-xs font-semibold">{c.score}</span></div></TableCell>
                      <TableCell className="text-xs">{c.assignedTo || "—"}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetail(c)}><Eye className="w-3.5 h-3.5 mr-2" /> View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(c)}><Edit3 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => deactivate(c.id)} className="text-amber-600">Deactivate</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(c.id)} className="text-rose-600"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* New Contact Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Contact</DialogTitle><DialogDescription>Add a new contact to the CRM directory.</DialogDescription></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="98XXXXXXXX" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTACT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTACT_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">Source</Label><Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTACT_SOURCES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Assigned To</Label><Input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} placeholder="Coordinator name" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Tags (comma separated)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="ivf, vip, follow-up" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Score</Label><Input type="number" min={0} max={100} value={form.score} onChange={e => setForm({ ...form, score: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="min-h-[50px]" /></div>
            </div>
          </ScrollArea>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Create Contact"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Contact</DialogTitle><DialogDescription>Update contact information.</DialogDescription></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTACT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTACT_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">Source</Label><Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTACT_SOURCES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Assigned To</Label><Input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Tags</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="min-h-[50px]" /></div>
            </div>
          </ScrollArea>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={update}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Update"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Contact?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. The contact will be permanently removed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteContact} className="bg-rose-600 hover:bg-rose-700 text-white">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contact Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-teal-500" /> {detail.name}</SheetTitle>
                <SheetDescription>{detail.contactNo} · {detail.type}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Phone</p><p className="text-xs font-semibold">{detail.phone}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Email</p><p className="text-xs font-semibold">{detail.email || "—"}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Type</p><div className="mt-1"><Badge variant="outline" className="text-[9px] capitalize">{detail.type}</Badge></div></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Category</p><p className="text-xs font-semibold capitalize">{detail.category}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Source</p><p className="text-xs font-semibold capitalize">{detail.source.replace(/_/g, " ")}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Score</p><div className="flex items-center gap-1 mt-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /><span className="text-xs font-bold">{detail.score}</span></div></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Company</p><p className="text-xs font-semibold">{detail.company || "—"}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">City</p><p className="text-xs font-semibold">{detail.city || "—"}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Address</p><p className="text-xs font-semibold">{detail.address || "—"}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Assigned To</p><p className="text-xs font-semibold">{detail.assignedTo || "—"}</p></CardContent></Card>
                </div>
                {detail.tags && detail.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">{detail.tags.map((t, i) => <Badge key={i} variant="outline" className="text-[9px]"><Tag className="w-2.5 h-2.5 mr-1" />{t}</Badge>)}</div>
                )}
                {detail.notes && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase mb-1">Notes</p><p className="text-xs">{detail.notes}</p></CardContent></Card>}
                <Separator />
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" /> Deals</CardTitle></CardHeader>
                  <CardContent className="pt-0"><p className="text-[10px] text-muted-foreground">Deals associated with this contact will appear here.</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Recent Communications</CardTitle></CardHeader>
                  <CardContent className="pt-0"><p className="text-[10px] text-muted-foreground">Communication history will appear here.</p></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Tasks</CardTitle></CardHeader>
                  <CardContent className="pt-0"><p className="text-[10px] text-muted-foreground">Tasks linked to this contact will appear here.</p></CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================
// 2. CRM Deals
// ============================================================
export function CRMDeals() {
  const [refresh, setRefresh] = useRefresh();
  const { data: deals, loading } = useFetch<CRMDeal[]>(`/api/crm-deals?_r=${refresh}`);
  const { data: contacts } = useFetch<CRMContact[]>("/api/crm-contacts");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [stageFilter, setStageFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<CRMDeal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [lostReasonOpen, setLostReasonOpen] = useState(false);
  const [lostDealId, setLostDealId] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", contactId: "", stage: "qualification", value: 0,
    source: "website", priority: "medium", expectedClose: "",
    interest: "", assignedTo: "", notes: "",
  });

  const resetForm = () => setForm({ title: "", contactId: "", stage: "qualification", value: 0, source: "website", priority: "medium", expectedClose: "", interest: "", assignedTo: "", notes: "" });

  const filtered = useMemo(() => {
    let list = deals || [];
    if (stageFilter !== "all") list = list.filter(d => d.stage === stageFilter);
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(d => d.title.toLowerCase().includes(ql) || d.contactName.toLowerCase().includes(ql) || d.dealNo.toLowerCase().includes(ql));
    }
    return list;
  }, [deals, q, stageFilter]);
  const pagination = usePagination(filtered, 10);

  const pipelineData = useMemo(() => {
    const cols: Record<string, CRMDeal[]> = {};
    DEAL_STAGES.forEach(s => cols[s] = []);
    (deals || []).forEach(d => { if (cols[d.stage]) cols[d.stage].push(d); });
    return cols;
  }, [deals]);

  const totalWonValue = useMemo(() => (deals || []).filter(d => d.stage === "closed_won").reduce((s, d) => s + d.value, 0), [deals]);
  const activeDeals = useMemo(() => (deals || []).filter(d => !["closed_won", "closed_lost"].includes(d.stage)).length, [deals]);
  const winRate = useMemo(() => {
    const won = (deals || []).filter(d => d.stage === "closed_won").length;
    const closed = (deals || []).filter(d => ["closed_won", "closed_lost"].includes(d.stage)).length;
    return closed > 0 ? Math.round((won / closed) * 100) : 0;
  }, [deals]);

  const create = async () => {
    if (!form.title || !form.contactId) { toast.error("Title and contact required"); return; }
    setSaving(true);
    try {
      await fetchAPI("/api/crm-deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      toast.success("Deal created"); setAddOpen(false); resetForm(); setRefresh();
    } catch { toast.error("Failed to create deal"); } finally { setSaving(false); }
  };

  const moveStage = async (id: string, stage: string) => {
    await fetchAPI(`/api/crm-deals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
    toast.success(`Deal moved to ${STAGE_LABELS[stage] || stage}`); setRefresh();
  };

  const markWon = async (id: string) => { await moveStage(id, "closed_won"); };

  const markLost = async () => {
    if (!lostDealId) return;
    await fetchAPI(`/api/crm-deals/${lostDealId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "closed_lost", lostReason }) });
    toast.success("Deal marked as lost"); setLostDealId(null); setLostReason(""); setLostReasonOpen(false); setRefresh();
  };

  const deleteDeal = async () => {
    if (!deleteId) return;
    await fetchAPI(`/api/crm-deals/${deleteId}`, { method: "DELETE" });
    toast.success("Deal deleted"); setDeleteId(null); setRefresh();
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Deals</h2><p className="text-xs text-muted-foreground">{deals?.length || 0} deals · pipeline management</p></div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setView("pipeline")} className={`text-[10px] px-3 py-1.5 transition-colors ${view === "pipeline" ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>Pipeline</button>
            <button onClick={() => setView("list")} className={`text-[10px] px-3 py-1.5 transition-colors ${view === "list" ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>List</button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { if (deals?.length) { exportToCSV("crm-deals", ["DealNo", "Title", "Contact", "Stage", "Value", "Priority", "Assigned"], deals.map(d => [d.dealNo, d.title, d.contactName, STAGE_LABELS[d.stage] || d.stage, d.value, d.priority, d.assignedTo || ""])); toast.success("Exported"); } }}><Download className="w-4 h-4" /> Export</Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { resetForm(); setAddOpen(true); }}><Plus className="w-4 h-4" /> New Deal</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Deals" value={deals?.length || 0} icon={Briefcase} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Active Pipeline" value={activeDeals} icon={TrendingUp} accent="from-cyan-500 to-cyan-600" index={1} />
        <KpiCard label="Won Value" value={formatRs(totalWonValue)} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="Win Rate" value={`${winRate}%`} icon={Target} accent="from-violet-500 to-violet-600" index={3} />
      </div>

      {view === "pipeline" ? (
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
          {DEAL_STAGES.map(stage => {
            const colDeals = pipelineData[stage] || [];
            const totalVal = colDeals.reduce((s, d) => s + d.value, 0);
            return (
              <div key={stage} className="min-w-[260px] w-[260px] flex flex-col">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[9px] capitalize ${STAGE_COLORS[stage]}`}>{STAGE_LABELS[stage]}</Badge>
                    <span className="text-[10px] text-muted-foreground">{colDeals.length}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold tabular-nums">{formatRs(totalVal)}</span>
                </div>
                <ScrollArea className="flex-1 rounded-xl bg-muted/30 border border-border/50 p-2 space-y-2" style={{ maxHeight: 500 }}>
                  {colDeals.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground text-center py-6">No deals</div>
                  ) : colDeals.map(d => (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`bg-card rounded-lg border border-border/60 p-3 cursor-pointer hover:shadow-sm transition-shadow border-l-[3px] ${PRIORITY_BORDER[d.priority] || "border-l-gray-400"}`} onClick={() => setDetail(d)}>
                      <p className="text-xs font-semibold truncate">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{d.contactName}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold text-teal-700 dark:text-teal-300 tabular-nums">{formatRs(d.value)}</span>
                        <PriorityBadge priority={d.priority} />
                      </div>
                      {d.expectedClose && <p className="text-[10px] text-muted-foreground mt-1">Close: {formatDate(d.expectedClose)}</p>}
                    </motion.div>
                  ))}
                </ScrollArea>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search deals…" className="pl-8 h-9 text-sm" /></div>
              <div className="flex gap-1 flex-wrap">{["all", ...DEAL_STAGES].map(s => <button key={s} onClick={() => setStageFilter(s)} className={`text-[10px] px-2.5 py-1 rounded-md capitalize transition-colors ${stageFilter === s ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>{s === "all" ? "All" : STAGE_LABELS[s]?.split(" ")[0]}</button>)}</div>
            </div>
            {filtered.length === 0 ? <EmptyState icon={Briefcase} title="No deals" className="py-10" /> : (
              <>
                <Table>
                  <TableHeader><TableRow className="bg-muted/40">
                    <TableHead className="text-[11px] uppercase">Deal No</TableHead>
                    <TableHead className="text-[11px] uppercase">Title</TableHead>
                    <TableHead className="text-[11px] uppercase">Contact</TableHead>
                    <TableHead className="text-[11px] uppercase">Stage</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Value</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Prob.</TableHead>
                    <TableHead className="text-[11px] uppercase">Priority</TableHead>
                    <TableHead className="text-[11px] uppercase">Assigned</TableHead>
                    <TableHead className="text-[11px] uppercase">Expected Close</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {pagination.paged.map(d => (
                      <TableRow key={d.id} className="table-row-hover cursor-pointer" onClick={() => setDetail(d)}>
                        <TableCell className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">{d.dealNo}</TableCell>
                        <TableCell className="text-xs font-semibold">{d.title}</TableCell>
                        <TableCell className="text-xs">{d.contactName}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[9px] capitalize ${STAGE_COLORS[d.stage]}`}>{STAGE_LABELS[d.stage] || d.stage}</Badge></TableCell>
                        <TableCell className="text-right text-xs font-semibold tabular-nums">{formatRs(d.value)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{d.probability}%</TableCell>
                        <TableCell><PriorityBadge priority={d.priority} /></TableCell>
                        <TableCell className="text-xs">{d.assignedTo || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{d.expectedClose ? formatDate(d.expectedClose) : "—"}</TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {d.stage !== "closed_won" && d.stage !== "closed_lost" && (() => {
                                const idx = DEAL_STAGES.indexOf(d.stage);
                                const next = DEAL_STAGES[idx + 1];
                                if (next && next !== "closed_lost") return <DropdownMenuItem onClick={() => moveStage(d.id, next)}><ArrowRight className="w-3.5 h-3.5 mr-2" /> Move to {STAGE_LABELS[next]}</DropdownMenuItem>;
                                return null;
                              })()}
                              {d.stage !== "closed_won" && d.stage !== "closed_lost" && <DropdownMenuItem onClick={() => markWon(d.id)} className="text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Mark Won</DropdownMenuItem>}
                              {d.stage !== "closed_won" && d.stage !== "closed_lost" && <DropdownMenuItem onClick={() => { setLostDealId(d.id); setLostReasonOpen(true); }} className="text-rose-600"><X className="w-3.5 h-3.5 mr-2" /> Mark Lost</DropdownMenuItem>}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteId(d.id)} className="text-rose-600"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
      )}

      {/* New Deal Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Deal</DialogTitle><DialogDescription>Create a new deal in the pipeline.</DialogDescription></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              <div className="space-y-1.5"><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Deal title" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Contact *</Label><Select value={form.contactId} onValueChange={v => setForm({ ...form, contactId: v })}><SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger><SelectContent className="max-h-60">{(contacts || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name} · {c.phone}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Stage</Label><Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEAL_STAGES.map(s => <SelectItem key={s} value={s} className="capitalize">{STAGE_LABELS[s]}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">Value (Rs.)</Label><Input type="number" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Source</Label><Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTACT_SOURCES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label className="text-xs">Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["urgent", "high", "medium", "low"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Expected Close Date</Label><Input type="date" value={form.expectedClose} onChange={e => setForm({ ...form, expectedClose: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Interest</Label><Input value={form.interest} onChange={e => setForm({ ...form, interest: e.target.value })} placeholder="IVF & Fertility, Dental, etc." /></div>
              <div className="space-y-1.5"><Label className="text-xs">Assigned To</Label><Input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="min-h-[50px]" /></div>
            </div>
          </ScrollArea>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Create Deal"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lost Reason Dialog */}
      <Dialog open={lostReasonOpen} onOpenChange={setLostReasonOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Mark Deal as Lost</DialogTitle><DialogDescription>Please provide a reason for losing this deal.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Reason *</Label><Textarea value={lostReason} onChange={e => setLostReason(e.target.value)} placeholder="Budget constraints, competitor, timeline, etc." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setLostReasonOpen(false); setLostReason(""); }}>Cancel</Button><Button className="bg-rose-600 hover:bg-rose-700 text-white" disabled={!lostReason.trim()} onClick={markLost}>Confirm Lost</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Deal?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteDeal} className="bg-rose-600 hover:bg-rose-700 text-white">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deal Detail Sheet */}
      <Sheet open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-teal-500" /> {detail.title}</SheetTitle>
                <SheetDescription>{detail.dealNo} · {detail.contactName}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Stage</p><div className="mt-1"><Badge variant="outline" className={`text-[9px] capitalize ${STAGE_COLORS[detail.stage]}`}>{STAGE_LABELS[detail.stage]}</Badge></div></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Value</p><p className="text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums">{formatRs(detail.value)}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Probability</p><div className="mt-1"><Progress value={detail.probability} className="h-2" /><p className="text-[10px] text-muted-foreground mt-1">{detail.probability}%</p></div></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Priority</p><div className="mt-1"><PriorityBadge priority={detail.priority} /></div></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Source</p><p className="text-xs font-semibold capitalize">{detail.source.replace(/_/g, " ")}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Assigned</p><p className="text-xs font-semibold">{detail.assignedTo || "—"}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Expected Close</p><p className="text-xs font-semibold">{detail.expectedClose ? formatDate(detail.expectedClose) : "—"}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase">Interest</p><p className="text-xs font-semibold">{detail.interest || "—"}</p></CardContent></Card>
                </div>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Stage Timeline</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {DEAL_STAGES.map((s, i) => {
                        const isCurrent = s === detail.stage;
                        const isPast = DEAL_STAGES.indexOf(detail.stage) > i;
                        return (
                          <div key={s} className="flex items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${isCurrent ? "bg-teal-600 text-white" : isPast ? "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                            {i < DEAL_STAGES.length - 1 && <div className={`w-6 h-0.5 ${isPast ? "bg-teal-500" : "bg-muted"}`} />}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">Current: <span className="font-semibold">{STAGE_LABELS[detail.stage]}</span></p>
                  </CardContent>
                </Card>
                {detail.notes && <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase mb-1">Notes</p><p className="text-xs">{detail.notes}</p></CardContent></Card>}
                {detail.lostReason && <Card><CardContent className="p-3"><p className="text-[10px] text-rose-500 uppercase mb-1">Lost Reason</p><p className="text-xs text-rose-700 dark:text-rose-300">{detail.lostReason}</p></CardContent></Card>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================
// 3. CRM Communications
// ============================================================
export function CRMCommunications() {
  const [refresh, setRefresh] = useRefresh();
  const { data: comms, loading } = useFetch<CRMCommunication[]>(`/api/crm-communications?_r=${refresh}`);
  const { data: contacts } = useFetch<CRMContact[]>("/api/crm-contacts");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contactId: "", type: "call", direction: "outbound",
    subject: "", body: "", outcome: "", duration: 0, scheduledAt: "",
  });

  const resetForm = () => setForm({ contactId: "", type: "call", direction: "outbound", subject: "", body: "", outcome: "", duration: 0, scheduledAt: "" });

  const filtered = useMemo(() => {
    let list = comms || [];
    if (typeFilter !== "all") list = list.filter(c => c.type === typeFilter);
    if (directionFilter !== "all") list = list.filter(c => c.direction === directionFilter);
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(c => c.contactName.toLowerCase().includes(ql) || c.subject.toLowerCase().includes(ql));
    }
    return list;
  }, [comms, q, typeFilter, directionFilter]);
  const pagination = usePagination(filtered, 10);

  const thisWeek = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return (comms || []).filter(c => new Date(c.createdAt) >= weekAgo).length;
  }, [comms]);

  const create = async () => {
    if (!form.contactId || !form.subject) { toast.error("Contact and subject required"); return; }
    setSaving(true);
    try {
      await fetchAPI("/api/crm-communications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      toast.success("Communication logged"); setAddOpen(false); resetForm(); setRefresh();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Communications</h2><p className="text-xs text-muted-foreground">{comms?.length || 0} communications · interaction log</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { resetForm(); setAddOpen(true); }}><Plus className="w-4 h-4" /> Log Communication</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Communications" value={comms?.length || 0} icon={Activity} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="This Week" value={thisWeek} icon={CalendarClock} accent="from-cyan-500 to-cyan-600" index={1} />
        <KpiCard label="Calls" value={comms?.filter(c => c.type === "call").length || 0} icon={Phone} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="Meetings" value={comms?.filter(c => c.type === "meeting").length || 0} icon={Users} accent="from-violet-500 to-violet-600" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search contact, subject…" className="pl-8 h-9 text-sm" /></div>
            <div className="flex gap-1 flex-wrap">{["all", ...COMMUNICATION_TYPES].map(t => <button key={t} onClick={() => setTypeFilter(t)} className={`text-[10px] px-2.5 py-1 rounded-md capitalize transition-colors ${typeFilter === t ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>{t}</button>)}</div>
            <div className="flex gap-1">{["all", ...COMMUNICATION_DIRECTIONS].map(d => <button key={d} onClick={() => setDirectionFilter(d)} className={`text-[10px] px-2.5 py-1 rounded-md capitalize transition-colors ${directionFilter === d ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>{d}</button>)}</div>
          </div>
          {filtered.length === 0 ? <EmptyState icon={Activity} title="No communications" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Contact</TableHead>
                  <TableHead className="text-[11px] uppercase">Type</TableHead>
                  <TableHead className="text-[11px] uppercase">Direction</TableHead>
                  <TableHead className="text-[11px] uppercase">Subject</TableHead>
                  <TableHead className="text-[11px] uppercase">Outcome</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Duration</TableHead>
                  <TableHead className="text-[11px] uppercase">Assigned</TableHead>
                  <TableHead className="text-[11px] uppercase">Date</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(c => {
                    const TypeIcon = COMM_TYPE_ICONS[c.type] || FileText;
                    return (
                      <TableRow key={c.id} className="table-row-hover">
                        <TableCell className="text-xs font-semibold">{c.contactName}</TableCell>
                        <TableCell><div className="flex items-center gap-1.5"><TypeIcon className="w-3.5 h-3.5 text-teal-500" /><Badge variant="outline" className="text-[9px] capitalize">{c.type}</Badge></div></TableCell>
                        <TableCell><Badge variant="outline" className={`text-[9px] capitalize ${c.direction === "outbound" ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>{c.direction}</Badge></TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{c.subject}</TableCell>
                        <TableCell className="text-xs capitalize">{c.outcome || "—"}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{c.duration ? `${c.duration}m` : "—"}</TableCell>
                        <TableCell className="text-xs">{c.assignedTo || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></TableCell>
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

      {/* New Communication Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Log Communication</DialogTitle><DialogDescription>Record a new communication interaction.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Contact *</Label><Select value={form.contactId} onValueChange={v => setForm({ ...form, contactId: v })}><SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger><SelectContent className="max-h-60">{(contacts || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name} · {c.phone}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COMMUNICATION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Direction</Label><Select value={form.direction} onValueChange={v => setForm({ ...form, direction: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COMMUNICATION_DIRECTIONS.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Subject *</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Brief subject line" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Body</Label><Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="min-h-[80px]" placeholder="Communication details…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Outcome</Label><Input value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })} placeholder="Successful, No answer, etc." /></div>
              <div className="space-y-1.5"><Label className="text-xs">Duration (minutes)</Label><Input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Scheduled At</Label><Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Log"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 4. CRM Tasks
// ============================================================
export function CRMTasks() {
  const [refresh, setRefresh] = useRefresh();
  const { data: tasks, loading } = useFetch<CRMTask[]>(`/api/crm-tasks?_r=${refresh}`);
  const { data: contacts } = useFetch<CRMContact[]>("/api/crm-contacts");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CRMTask | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", contactId: "", type: "follow_up",
    priority: "medium", dueDate: "", assignedTo: "",
  });

  const resetForm = () => setForm({ title: "", description: "", contactId: "", type: "follow_up", priority: "medium", dueDate: "", assignedTo: "" });

  const filtered = useMemo(() => {
    let list = tasks || [];
    if (statusFilter !== "all") list = list.filter(t => t.status === statusFilter);
    if (priorityFilter !== "all") list = list.filter(t => t.priority === priorityFilter);
    if (typeFilter !== "all") list = list.filter(t => t.type === typeFilter);
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(ql) || t.contactName?.toLowerCase().includes(ql));
    }
    return list;
  }, [tasks, q, statusFilter, priorityFilter, typeFilter]);
  const pagination = usePagination(filtered, 10);

  const isOverdue = (t: CRMTask) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed" && t.status !== "cancelled";
  const pending = useMemo(() => (tasks || []).filter(t => t.status === "pending").length, [tasks]);
  const overdue = useMemo(() => (tasks || []).filter(t => isOverdue(t)).length, [tasks]);
  const completedThisWeek = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return (tasks || []).filter(t => t.status === "completed" && new Date(t.createdAt) >= weekAgo).length;
  }, [tasks]);

  const create = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      await fetchAPI("/api/crm-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      toast.success("Task created"); setAddOpen(false); resetForm(); setRefresh();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const updateTask = async () => {
    if (!editingTask) return;
    setSaving(true);
    try {
      await fetchAPI(`/api/crm-tasks/${editingTask.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      toast.success("Task updated"); setEditOpen(false); setEditingTask(null); resetForm(); setRefresh();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetchAPI(`/api/crm-tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    toast.success(`Task → ${status.replace(/_/g, " ")}`); setRefresh();
  };

  const deleteTask = async () => {
    if (!deleteId) return;
    await fetchAPI(`/api/crm-tasks/${deleteId}`, { method: "DELETE" });
    toast.success("Task deleted"); setDeleteId(null); setRefresh();
  };

  const openEdit = (t: CRMTask) => {
    setForm({ title: t.title, description: t.description || "", contactId: t.contactId || "", type: t.type, priority: t.priority, dueDate: t.dueDate || "", assignedTo: t.assignedTo || "" });
    setEditingTask(t); setEditOpen(true);
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Tasks</h2><p className="text-xs text-muted-foreground">{tasks?.length || 0} tasks · action tracking</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { resetForm(); setAddOpen(true); }}><Plus className="w-4 h-4" /> New Task</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Tasks" value={tasks?.length || 0} icon={CheckCircle2} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Pending" value={pending} icon={Clock} accent="from-amber-500 to-orange-500" index={1} />
        <KpiCard label="Overdue" value={overdue} icon={AlertCircle} accent="from-rose-500 to-rose-600" index={2} />
        <KpiCard label="Completed This Week" value={completedThisWeek} icon={CheckCircle} accent="from-emerald-500 to-emerald-600" index={3} />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tasks…" className="pl-8 h-9 text-sm" /></div>
            <div className="flex gap-1 flex-wrap">{["all", ...TASK_STATUSES].map(s => <button key={s} onClick={() => setStatusFilter(s)} className={`text-[10px] px-2.5 py-1 rounded-md capitalize transition-colors ${statusFilter === s ? "bg-teal-600 text-white" : "bg-muted/60 hover:bg-muted"}`}>{s.replace(/_/g, " ")}</button>)}</div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="h-8 w-[110px] text-[10px]"><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent>{["all", "urgent", "high", "medium", "low"].map(p => <SelectItem key={p} value={p} className="text-[10px] capitalize">{p}</SelectItem>)}</SelectContent></Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="h-8 w-[110px] text-[10px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent>{["all", ...TASK_TYPES].map(t => <SelectItem key={t} value={t} className="text-[10px] capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
          </div>
          {filtered.length === 0 ? <EmptyState icon={CheckCircle2} title="No tasks" className="py-10" /> : (
            <>
              <Table>
                <TableHeader><TableRow className="bg-muted/40">
                  <TableHead className="text-[11px] uppercase">Title</TableHead>
                  <TableHead className="text-[11px] uppercase">Contact</TableHead>
                  <TableHead className="text-[11px] uppercase">Type</TableHead>
                  <TableHead className="text-[11px] uppercase">Priority</TableHead>
                  <TableHead className="text-[11px] uppercase">Due Date</TableHead>
                  <TableHead className="text-[11px] uppercase">Assigned</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {pagination.paged.map(t => (
                    <TableRow key={t.id} className={`table-row-hover ${isOverdue(t) ? "bg-rose-50/50 dark:bg-rose-950/10" : ""}`}>
                      <TableCell className="text-xs font-semibold">{t.title}</TableCell>
                      <TableCell className="text-xs">{t.contactName || "—"}</TableCell>
                      <TableCell><TypeBadge type={t.type} /></TableCell>
                      <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                      <TableCell className={`text-xs ${isOverdue(t) ? "text-rose-600 font-semibold" : "text-muted-foreground"}`}>{t.dueDate ? formatDate(t.dueDate) : "—"}</TableCell>
                      <TableCell className="text-xs">{t.assignedTo || "—"}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {t.status === "pending" && <DropdownMenuItem onClick={() => updateStatus(t.id, "in_progress")}><PlayCircle className="w-3.5 h-3.5 mr-2" /> Start</DropdownMenuItem>}
                            {t.status !== "completed" && t.status !== "cancelled" && <DropdownMenuItem onClick={() => updateStatus(t.id, "completed")} className="text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Complete</DropdownMenuItem>}
                            {t.status !== "completed" && t.status !== "cancelled" && <DropdownMenuItem onClick={() => updateStatus(t.id, "cancelled")} className="text-amber-600"><PauseCircle className="w-3.5 h-3.5 mr-2" /> Cancel</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(t)}><Edit3 className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(t.id)} className="text-rose-600"><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* New Task Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Task</DialogTitle><DialogDescription>Create a new task.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-[50px]" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Contact</Label><Select value={form.contactId} onValueChange={v => setForm({ ...form, contactId: v })}><SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger><SelectContent className="max-h-60">{(contacts || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["urgent", "high", "medium", "low"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Assigned To</Label><Input value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-[50px]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Type</Label><Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["urgent", "high", "medium", "low"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={updateTask}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Update"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Task?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteTask} className="bg-rose-600 hover:bg-rose-700 text-white">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// 5. CRM Templates
// ============================================================
export function CRTemplates() {
  const [refresh, setRefresh] = useRefresh();
  const { data: templates, loading } = useFetch<CRMTemplate[]>(`/api/crm-templates?_r=${refresh}`);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CRMTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CRMTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", category: "general", subject: "", body: "", variables: "" });

  const resetForm = () => setForm({ name: "", category: "general", subject: "", body: "", variables: "" });

  const create = async () => {
    if (!form.name || !form.subject) { toast.error("Name and subject required"); return; }
    setSaving(true);
    try {
      await fetchAPI("/api/crm-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, variables: form.variables ? form.variables.split(",").map(v => v.trim()) : [] }) });
      toast.success("Template created"); setAddOpen(false); resetForm(); setRefresh();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const update = async () => {
    if (!editingTemplate) return;
    setSaving(true);
    try {
      await fetchAPI(`/api/crm-templates/${editingTemplate.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, variables: form.variables ? form.variables.split(",").map(v => v.trim()) : [] }) });
      toast.success("Template updated"); setEditOpen(false); setEditingTemplate(null); resetForm(); setRefresh();
    } catch { toast.error("Failed"); } finally { setSaving(false); }
  };

  const toggleActive = async (t: CRMTemplate) => {
    await fetchAPI(`/api/crm-templates/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !t.active }) });
    toast.success(t.active ? "Template deactivated" : "Template activated"); setRefresh();
  };

  const openEdit = (t: CRMTemplate) => {
    setForm({ name: t.name, category: t.category, subject: t.subject, body: t.body, variables: t.variables?.join(", ") || "" });
    setEditingTemplate(t); setEditOpen(true);
  };

  const CATEGORY_COLORS: Record<string, string> = {
    general: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    follow_up: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
    appointment: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    promotion: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    welcome: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    feedback: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  };

  if (loading) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">Templates</h2><p className="text-xs text-muted-foreground">{templates?.length || 0} templates · email &amp; message</p></div>
        <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { resetForm(); setAddOpen(true); }}><Plus className="w-4 h-4" /> New Template</Button>
      </div>
      {(templates || []).length === 0 ? (
        <EmptyState icon={FileText} title="No templates" description="Create your first template to get started." action={<Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => { resetForm(); setAddOpen(true); }}><Plus className="w-4 h-4" /> Create Template</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(templates || []).map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.3) }}>
              <Card className={`card-hover ${!t.active ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[9px] capitalize ${CATEGORY_COLORS[t.category] || "bg-gray-100 text-gray-600"}`}>{t.category}</Badge>
                      {t.variables && t.variables.length > 0 && <Badge variant="outline" className="text-[9px]">{t.variables.length} vars</Badge>}
                    </div>
                    <button onClick={() => toggleActive(t)} className={`w-9 h-5 rounded-full transition-colors ${t.active ? "bg-teal-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${t.active ? "translate-x-4.5 ml-[18px]" : "translate-x-0.5 ml-[2px]"}`} />
                    </button>
                  </div>
                  <p className="text-sm font-bold mb-1">{t.name}</p>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{t.subject}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => { setPreviewTemplate(t); setPreviewOpen(true); }}><Eye className="w-3 h-3" /> Preview</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => openEdit(t)}><Edit3 className="w-3 h-3" /> Edit</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* New Template Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Template</DialogTitle><DialogDescription>Create an email or message template.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Follow-up Reminder" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TEMPLATE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Subject *</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Body</Label><Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="min-h-[120px]" placeholder="Use {{variable}} for dynamic content" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Variables (comma separated)</Label><Input value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })} placeholder="name, appointment_date, clinic_name" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={create}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TEMPLATE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-xs">Subject *</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Body</Label><Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="min-h-[120px]" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Variables</Label><Input value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5" disabled={saving} onClick={update}><Save className="w-4 h-4" /> {saving ? "Saving…" : "Update"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Template Preview</DialogTitle><DialogDescription>{previewTemplate?.name}</DialogDescription></DialogHeader>
          {previewTemplate && (
            <div className="space-y-3">
              <Card><CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Subject</p>
                <p className="text-xs font-semibold">{previewTemplate.subject}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Body</p>
                <p className="text-xs whitespace-pre-wrap">{previewTemplate.body}</p>
              </CardContent></Card>
              {previewTemplate.variables && previewTemplate.variables.length > 0 && (
                <div><p className="text-[10px] text-muted-foreground uppercase mb-1">Variables</p>
                  <div className="flex flex-wrap gap-1">{previewTemplate.variables.map((v, i) => <Badge key={i} variant="outline" className="text-[9px] font-mono">{`{{${v}}}`}</Badge>)}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// 6. CRM Reports
// ============================================================
interface CRMReportData {
  summary: { totalContacts: number; activeDeals: number; wonRevenue: number; winRate: number; avgDealValue: number; pendingTasks: number };
  dealsByStage: { stage: string; count: number }[];
  contactsByType: { type: string; count: number }[];
  dealsBySource: { source: string; count: number }[];
  pipelineByStage: { stage: string; value: number }[];
  monthlyDeals: { month: string; won: number; lost: number }[];
  contactDistribution: { type: string; count: number; percentage: number }[];
  dealPerformance: { metric: string; value: string }[];
}
export function CRMReports() {
  const { data, loading } = useFetch<CRMReportData>("/api/crm-reports");
  if (loading || !data) return <Skeleton className="h-96 rounded-xl" />;
  const { summary, dealsByStage, contactsByType, dealsBySource, pipelineByStage, monthlyDeals, contactDistribution, dealPerformance } = data;

  const STAGE_CHART = dealsByStage.map(d => ({ ...d, stage: STAGE_LABELS[d.stage] || d.stage }));
  const SOURCE_CHART = dealsBySource.map(d => ({ ...d, source: d.source.replace(/_/g, " ") }));
  const PIPELINE_CHART = pipelineByStage.map(d => ({ ...d, stage: STAGE_LABELS[d.stage] || d.stage }));
  const COLORS = ["#0d9488", "#10b981", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#84cc16"];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div><h2 className="text-xl font-bold">CRM Reports</h2><p className="text-xs text-muted-foreground">Contacts, deals, pipeline &amp; revenue analytics</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { exportToCSV("crm-report-summary", ["Metric", "Value"], Object.entries(summary).map(([k, v]) => [k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()), v])); toast.success("Report exported"); }}><Download className="w-4 h-4" /> Export</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Contacts" value={summary.totalContacts} icon={Users} accent="from-teal-500 to-teal-600" index={0} />
        <KpiCard label="Active Deals" value={summary.activeDeals} icon={Briefcase} accent="from-cyan-500 to-cyan-600" index={1} />
        <KpiCard label="Won Revenue" value={formatRs(summary.wonRevenue)} icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" index={2} />
        <KpiCard label="Win Rate" value={`${summary.winRate}%`} icon={Target} accent="from-violet-500 to-violet-600" index={3} />
        <KpiCard label="Avg Deal Value" value={formatRs(summary.avgDealValue)} icon={TrendingUp} accent="from-amber-500 to-orange-500" index={4} />
        <KpiCard label="Pending Tasks" value={summary.pendingTasks} icon={Clock} accent="from-rose-500 to-rose-600" index={5} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Deals by Stage</CardTitle></CardHeader>
          <CardContent className="pt-2">
            {STAGE_CHART.length === 0 ? <EmptyState icon={Briefcase} title="No data" className="py-6" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={STAGE_CHART} layout="vertical" margin={{ left: 80, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={80} />
                  <RechartsTooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey="count" name="Deals" fill="#0d9488" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Contacts by Type</CardTitle></CardHeader>
          <CardContent className="pt-2">
            {contactsByType.length === 0 ? <EmptyState icon={Users} title="No data" className="py-6" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart><Pie data={contactsByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={92} label={(e: { type?: string }) => e.type || ""} labelLine={false}>{contactsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip /><Legend wrapperStyle={{ fontSize: 10 }} /></PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Deals by Source</CardTitle></CardHeader>
          <CardContent className="pt-2">
            {SOURCE_CHART.length === 0 ? <EmptyState icon={Megaphone} title="No data" className="py-6" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart><Pie data={SOURCE_CHART} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={92} label={(e: { source?: string }) => e.source || ""} labelLine={false}>{SOURCE_CHART.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip /><Legend wrapperStyle={{ fontSize: 10 }} /></PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Pipeline Value by Stage</CardTitle></CardHeader>
          <CardContent className="pt-2">
            {PIPELINE_CHART.length === 0 ? <EmptyState icon={TrendingUp} title="No data" className="py-6" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={PIPELINE_CHART} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="stage" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip formatter={(v: number) => formatRs(v)} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey="value" name="Value" fill="#0d9488" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Deals Trend</CardTitle></CardHeader>
          <CardContent className="pt-2">
            {monthlyDeals.length === 0 ? <EmptyState icon={TrendingUp} title="No data" className="py-6" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyDeals} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Area type="monotone" dataKey="won" name="Won" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                  <Area type="monotone" dataKey="lost" name="Lost" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Deal Performance</CardTitle></CardHeader>
          <CardContent className="pt-2">
            <Table><TableHeader><TableRow className="bg-muted/40"><TableHead className="text-[11px] uppercase">Metric</TableHead><TableHead className="text-[11px] uppercase text-right">Value</TableHead></TableRow></TableHeader>
              <TableBody>{dealPerformance.map((d, i) => (<TableRow key={i}><TableCell className="text-xs font-medium">{d.metric}</TableCell><TableCell className="text-right text-xs font-semibold tabular-nums">{d.value}</TableCell></TableRow>))}</TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Contact Distribution</CardTitle></CardHeader>
        <CardContent className="pt-2">
          {contactDistribution.length === 0 ? <EmptyState icon={Users} title="No data" className="py-6" /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{contactDistribution.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">{d.count}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold capitalize">{d.type}</p>
                  <p className="text-[10px] text-muted-foreground">{d.percentage}% of total</p>
                </div>
              </div>
            ))}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
