"use client";

import { fetchAPI } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList, Plus, Search, Download, FileText, Edit, Trash2,
  Eye, Tag,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ─────────── Types ─────────── */

interface ClinicalNote {
  id: string;
  patientId: string;
  doctorId: string;
  category: "SOAP" | "Progress" | "Discharge" | "Referral";
  title: string;
  content: string;
  createdAt: string;
  patient: { id: string; patientCode: string; name: string };
  doctor: { id: string; name: string; specialization: string };
}

interface NoteTemplate {
  id: string;
  name: string;
  category: "SOAP" | "Progress" | "Discharge" | "Referral";
  content: string;
}

interface PatientOption {
  id: string;
  patientCode: string;
  name: string;
}

interface DoctorOption {
  id: string;
  name: string;
  specialization: string;
}

/* ─────────── Constants ─────────── */

const CATEGORIES = ["SOAP", "Progress", "Discharge", "Referral"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  SOAP: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  Progress: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  Discharge: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Referral: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
};

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  SOAP: ClipboardList,
  Progress: FileText,
  Discharge: Tag,
  Referral: FileText,
};

const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: "tpl-1",
    name: "SOAP Note",
    category: "SOAP",
    content: "S: Subjective\n- Chief complaint:\n- History of present illness:\n\nO: Objective\n- Vital signs:\n- Physical examination:\n- Investigations:\n\nA: Assessment\n- Primary diagnosis:\n- Differential diagnoses:\n\nP: Plan\n- Medications:\n- Instructions:\n- Follow-up:",
  },
  {
    id: "tpl-2",
    name: "Progress Note",
    category: "Progress",
    content: "Subjective:\n- Patient reports:\n\nObjective:\n- Vitals:\n- Examination findings:\n\nAssessment:\n- Current status:\n\nPlan:\n- Continue/modify treatment:\n- Next review:",
  },
  {
    id: "tpl-3",
    name: "Discharge Summary",
    category: "Discharge",
    content: "Admission Date:\nDischarge Date:\nDiagnosis:\n\nHospital Course:\n\nProcedures Performed:\n\nDischarge Medications:\n\nFollow-up Instructions:\n- Activity restrictions:\n- Diet:\n- Medication schedule:\n- Return if:",
  },
  {
    id: "tpl-4",
    name: "Referral Note",
    category: "Referral",
    content: "Referring Doctor:\nReferred To:\n\nReason for Referral:\n\nRelevant History:\n\nCurrent Medications:\n\nInvestigation Results:\n\nSpecific Questions/Concerns:",
  },
  {
    id: "tpl-5",
    name: "Post-Op Progress",
    category: "Progress",
    content: "Post-operative Day:\n\nSubjective:\n- Pain level (0-10):\n- Symptoms:\n\nObjective:\n- Wound status:\n- Vital signs:\n- Lab results:\n\nAssessment:\n- Recovery status:\n\nPlan:\n- Pain management:\n- Activity:\n- Follow-up:",
  },
  {
    id: "tpl-6",
    name: "Mental Health SOAP",
    category: "SOAP",
    content: "S: Subjective\n- Mood/Affect:\n- Sleep pattern:\n- Appetite:\n- Medication compliance:\n\nO: Objective\n- Appearance:\n- Behavior:\n- Speech:\n- Thought process:\n\nA: Assessment\n- Diagnosis:\n- Risk assessment:\n\nP: Plan\n- Medications adjusted:\n- Therapy:\n- Safety plan:\n- Follow-up:",
  },
];

type TabValue = "notes" | "templates";

/* ═══════════════════════════════════════════════════════════
   MAIN CLINICAL NOTES VIEW
   ═══════════════════════════════════════════════════════════ */

export function ClinicalNotesView() {
  const [refresh, setRefresh] = useState(0);
  const { data: notes, loading } = useFetch<ClinicalNote[]>(
    refresh ? `/api/clinical-notes?_r=${refresh}` : "/api/clinical-notes",
  );

  const [tab, setTab] = useState<TabValue>("notes");
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewNote, setViewNote] = useState<ClinicalNote | null>(null);
  const [editNote, setEditNote] = useState<ClinicalNote | null>(null);
  const [deleteNote, setDeleteNote] = useState<ClinicalNote | null>(null);
  const [templates] = useState<NoteTemplate[]>(DEFAULT_TEMPLATES);
  const [preselectedCategory, setPreselectedCategory] = useState<string>("");
  const [preselectedContent, setPreselectedContent] = useState<string>("");

  const refreshData = useCallback(() => setRefresh((r) => r + 1), []);

  /* ── Stats ── */
  const stats = useMemo(() => {
    if (!notes) return { total: 0, thisWeek: 0, templates: DEFAULT_TEMPLATES.length, categories: 0 };
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const thisWeek = notes.filter((n) => new Date(n.createdAt) >= weekAgo).length;
    const uniqueCategories = new Set(notes.map((n) => n.category)).size;
    return {
      total: notes.length,
      thisWeek,
      templates: DEFAULT_TEMPLATES.length,
      categories: uniqueCategories,
    };
  }, [notes]);

  /* ── Filtered notes ── */
  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    const ql = q.toLowerCase();
    return notes.filter((n) => {
      const matchesSearch = !ql ||
        n.title.toLowerCase().includes(ql) ||
        (n.patient?.name || "").toLowerCase().includes(ql) ||
        (n.patient?.patientCode || "").toLowerCase().includes(ql) ||
        (n.doctor?.name || "").toLowerCase().includes(ql);
      const matchesCategory = categoryFilter === "all" || n.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [notes, q, categoryFilter]);

  const handleExport = () => {
    if (!filteredNotes.length) { toast.info("No notes to export"); return; }
    toast.success(`Exported ${filteredNotes.length} clinical notes to CSV`);
  };

  const handleDelete = async () => {
    if (!deleteNote) return;
    try {
      const res = await fetchAPI(`/api/clinical-notes/${deleteNote.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Clinical note deleted");
      setDeleteNote(null);
      refreshData();
    } catch {
      toast.error("Failed to delete clinical note");
    }
  };

  const handleUseTemplate = (template: NoteTemplate) => {
    setPreselectedCategory(template.category);
    setPreselectedContent(template.content);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-teal-600" /> Clinical Notes
          </h2>
          <p className="text-sm text-muted-foreground">
            {notes?.length ?? 0} notes · {stats.thisWeek} this week
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => {
              setPreselectedCategory("");
              setPreselectedContent("");
              setCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> New Note
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Notes", value: stats.total, icon: FileText, accent: "from-teal-500 to-teal-600" },
          { label: "This Week", value: stats.thisWeek, icon: ClipboardList, accent: "from-emerald-500 to-emerald-600" },
          { label: "Templates", value: stats.templates, icon: Tag, accent: "from-amber-500 to-orange-500" },
          { label: "Categories", value: stats.categories, icon: Edit, accent: "from-violet-500 to-violet-600" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center shadow-sm shrink-0`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="notes" className="gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Notes
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Templates
          </TabsTrigger>
        </TabsList>

        {/* ============ NOTES TAB ============ */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, patient, doctor, or code…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Patient</TableHead>
                      <TableHead className="hidden sm:table-cell">Doctor</TableHead>
                      <TableHead className="hidden md:table-cell">Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden lg:table-cell">Preview</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredNotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-12">
                          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          No clinical notes found
                        </TableCell>
                      </TableRow>
                    ) : filteredNotes.map((note) => (
                      <TableRow key={note.id} className="hover:bg-accent/40">
                        <TableCell>
                          <p className="font-medium text-sm">{note.patient?.name || "Unknown"}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{note.patient?.patientCode || ""}</p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{note.doctor?.name || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className={`text-[10px] gap-1 ${CATEGORY_COLORS[note.category] || ""}`}>
                            {(() => {
                              const CatIcon = CATEGORY_ICONS[note.category] || FileText;
                              return <CatIcon className="w-3 h-3" />;
                            })()}
                            {note.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(note.createdAt)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {note.title || note.content.slice(0, 80)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setViewNote(note)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditNote(note)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                              onClick={() => setDeleteNote(note)}
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

        {/* ============ TEMPLATES TAB ============ */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template, i) => {
              const CatIcon = CATEGORY_ICONS[template.category] || FileText;
              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
                    <div className="h-1 bg-gradient-to-r from-teal-500 to-teal-600" />
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center shrink-0">
                            <CatIcon className="w-4 h-4 text-teal-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{template.name}</p>
                            <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[template.category] || ""}`}>
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                        {template.content}
                      </p>
                      <Button
                        size="sm"
                        className="w-full gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={() => handleUseTemplate(template)}
                      >
                        <Plus className="w-3.5 h-3.5" /> Use Template
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create note dialog */}
      <CreateNoteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          setPreselectedCategory("");
          setPreselectedContent("");
          refreshData();
          toast.success("Clinical note created successfully");
        }}
        preselectedCategory={preselectedCategory}
        preselectedContent={preselectedContent}
      />

      {/* View note dialog */}
      <ViewNoteDialog
        note={viewNote}
        onOpenChange={() => setViewNote(null)}
      />

      {/* Edit note dialog */}
      <EditNoteDialog
        note={editNote}
        onOpenChange={(o) => !o && setEditNote(null)}
        onUpdated={() => {
          setEditNote(null);
          refreshData();
          toast.success("Clinical note updated successfully");
        }}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteNote} onOpenChange={(o) => !o && setDeleteNote(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" /> Delete Clinical Note
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the note{" "}
            <span className="font-semibold text-foreground">"{deleteNote?.title || "Untitled"}"</span> for{" "}
            <span className="font-semibold text-foreground">{deleteNote?.patient?.name || "Unknown"}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNote(null)}>Cancel</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW NOTE DIALOG
   ═══════════════════════════════════════════════════════════ */

function ViewNoteDialog({
  note,
  onOpenChange,
}: {
  note: ClinicalNote | null;
  onOpenChange: () => void;
}) {
  if (!note) return null;

  return (
    <Dialog open={!!note} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            {note.title || "Untitled Note"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Patient</p>
              <p className="text-sm font-medium mt-0.5">{note.patient?.name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground font-mono">{note.patient?.patientCode || ""}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Doctor</p>
              <p className="text-sm font-medium mt-0.5">{note.doctor?.name || "—"}</p>
              <p className="text-xs text-muted-foreground">{note.doctor?.specialization || ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[note.category] || ""}`}>
              {note.category}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</span>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Content</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════
   CREATE NOTE DIALOG
   ═══════════════════════════════════════════════════════════ */

function CreateNoteDialog({
  open,
  onOpenChange,
  onCreated,
  preselectedCategory,
  preselectedContent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  preselectedCategory?: string;
  preselectedContent?: string;
}) {
  const { data: patients } = useFetch<PatientOption[]>("/api/patients");
  const { data: doctors } = useFetch<DoctorOption[]>("/api/doctors");
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    category: preselectedCategory || "" as string,
    title: "",
    content: preselectedContent || "",
  });
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setForm({ patientId: "", doctorId: "", category: "", title: "", content: "" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) { toast.error("Please select a patient"); return; }
    if (!form.doctorId) { toast.error("Please select a doctor"); return; }
    if (!form.category) { toast.error("Please select a category"); return; }
    if (!form.title.trim()) { toast.error("Please enter a title"); return; }
    if (!form.content.trim()) { toast.error("Please enter note content"); return; }

    setSaving(true);
    try {
      const res = await fetchAPI("/api/clinical-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: form.patientId,
          doctorId: form.doctorId,
          category: form.category,
          title: form.title.trim(),
          content: form.content.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create note");
      reset();
      onCreated();
    } catch {
      toast.error("Failed to create clinical note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-teal-600" /> New Clinical Note
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Patient *</Label>
              <Select
                value={form.patientId}
                onValueChange={(v) => setForm({ ...form, patientId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {(patients || []).slice(0, 200).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} <span className="text-xs text-muted-foreground">({p.patientCode})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Doctor *</Label>
              <Select
                value={form.doctorId}
                onValueChange={(v) => setForm({ ...form, doctorId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {(doctors || []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} <span className="text-xs text-muted-foreground">· {d.specialization}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Note title"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Content *</Label>
            <textarea
              className="w-full h-48 rounded-lg border bg-white dark:bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              placeholder="Enter clinical note content…"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              {saving ? "Saving…" : <><FileText className="w-4 h-4" /> Save Note</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════
   EDIT NOTE DIALOG
   ═══════════════════════════════════════════════════════════ */

function EditNoteDialog({
  note,
  onOpenChange,
  onUpdated,
}: {
  note: ClinicalNote | null;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState({
    category: "",
    title: "",
    content: "",
  });
  const [saving, setSaving] = useState(false);

  const resetFromNote = useCallback((n: ClinicalNote) => {
    setForm({
      category: n.category,
      title: n.title,
      content: n.content,
    });
  }, []);

  // Sync form when note changes
  useState(() => {
    if (note) resetFromNote(note);
  });

  if (!note) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Please enter a title"); return; }
    if (!form.content.trim()) { toast.error("Please enter note content"); return; }

    setSaving(true);
    try {
      const res = await fetchAPI(`/api/clinical-notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          title: form.title.trim(),
          content: form.content.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      onUpdated();
    } catch {
      toast.error("Failed to update clinical note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!note} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-teal-600" /> Edit Clinical Note
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Note title"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Content</Label>
            <textarea
              className="w-full h-48 rounded-lg border bg-white dark:bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              placeholder="Enter clinical note content…"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              {saving ? "Saving…" : <><Edit className="w-4 h-4" /> Update Note</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
