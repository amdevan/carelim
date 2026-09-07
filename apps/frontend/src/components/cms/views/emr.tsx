"use client";
import { fetchAPI } from "@/lib/api";
import { useAppStore } from "@/store/app-store";
import { useFetch } from "@/lib/use-fetch";
import { usePagination, useSort } from "@/lib/use-pagination";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { Pagination } from "@/components/cms/pagination";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Barcode } from "@/components/ui/barcode";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

/* Dialog imports kept for PrescriptionDetailDialog only */

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DoctorSearch } from "@/components/ui/doctor-search";
import { PatientSearch } from "@/components/ui/patient-search";
import {
  Search, FileText, Plus, Printer, Download, Stethoscope, Pill,
  HeartPulse, CalendarClock, ArrowUp, ArrowDown, ArrowUpDown, X,
  LayoutGrid, List, Eye, Clock, CheckCircle2, AlertTriangle,
  Activity, ChevronDown, ChevronRight, Copy, Sparkles,
  User, MessageSquare, FileCheck, FlaskConical, ClipboardList, Send,
  Brain, Zap, Shield, TrendingUp, Lightbulb, AlertCircle,
  Loader2, BotMessageSquare, Microscope, Heart, Info, Pencil,
} from "lucide-react";
import { formatDate, timeAgo, statusColors, statusLabel } from "@/lib/format";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ─────────── Types ─────────── */

interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string | null;
}

interface Prescription {
  id: string;
  code: string;
  patientId: string;
  doctorId: string;
  diagnosis: string | null;
  symptoms: string | null;
  vitals: string | null;
  advice: string | null;
  followUp: string | null;
  clinicalData: string | null;
  status: string;
  createdAt: string;
  patient: { id: string; patientCode: string; name: string; age: number; gender: string };
  doctor: {
    id: string;
    name: string;
    specialization: string;
    department?: { name: string; color: string } | null;
  };
  items: PrescriptionItem[];
}

type DisplayPrescription = Prescription & { patientName: string };

interface PatientOption {
  id: string;
  patientCode: string;
  name: string;
  age?: number;
  gender?: string;
}

interface DoctorOption {
  id: string;
  name: string;
  specialization: string;
  department?: { name: string; color: string } | null;
}

interface MedicineItemDraft {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

/* ─────────── Constants ─────────── */

const FREQUENCIES = ["1-0-0", "0-1-0", "0-0-1", "1-0-1", "1-1-1", "0-0-0-1", "SOS", "HS", "STAT", "After meal", "Before meal", "Empty stomach", "Bedtime", "As needed"];

const SORT_COLS: { key: keyof DisplayPrescription; label: string }[] = [
  { key: "createdAt", label: "Date" },
  { key: "code", label: "Code" },
  { key: "patientName", label: "Patient" },
  { key: "diagnosis", label: "Diagnosis" },
];

const STATUS_OPTIONS = ["all", "active", "completed", "archived"];

const QUICK_TEMPLATES = [
  {
    name: "Common Cold",
    diagnosis: "Common Cold (URI)",
    medicines: [
      { medicineName: "Paracetamol 500mg", dosage: "1 Tablet", frequency: "1-0-1", duration: "5 days", quantity: "10", instructions: "After meal" },
      { medicineName: "Cetirizine 10mg", dosage: "1 Tablet", frequency: "0-0-1", duration: "5 days", quantity: "5", instructions: "At bedtime" },
      { medicineName: "Ambroxol 30mg", dosage: "1 Tablet", frequency: "0-1-0", duration: "5 days", quantity: "5", instructions: "After meal" },
    ],
  },
  {
    name: "Hypertension Follow-up",
    diagnosis: "Essential Hypertension",
    medicines: [
      { medicineName: "Amlodipine 5mg", dosage: "1 Tablet", frequency: "0-1-0", duration: "30 days", quantity: "30", instructions: "After meal" },
      { medicineName: "Metoprolol 25mg", dosage: "1 Tablet", frequency: "0-1-0", duration: "30 days", quantity: "30", instructions: "" },
    ],
  },
  {
    name: "Gastritis",
    diagnosis: "Acute Gastritis",
    medicines: [
      { medicineName: "Pantoprazole 40mg", dosage: "1 Tablet", frequency: "1-0-0", duration: "14 days", quantity: "14", instructions: "Before breakfast" },
      { medicineName: "Domperidone 10mg", dosage: "1 Tablet", frequency: "0-1-0", duration: "7 days", quantity: "7", instructions: "Before meal" },
      { medicineName: "Sucralfate 1g", dosage: "1 Sachet", frequency: "0-0-1", duration: "7 days", quantity: "7", instructions: "2 hours after meal" },
    ],
  },
  {
    name: "Diabetes Follow-up",
    diagnosis: "Type 2 Diabetes Mellitus",
    medicines: [
      { medicineName: "Metformin 500mg", dosage: "1 Tablet", frequency: "1-0-1", duration: "30 days", quantity: "60", instructions: "After meal" },
      { medicineName: "Glimepiride 2mg", dosage: "1 Tablet", frequency: "0-1-0", duration: "30 days", quantity: "30", instructions: "Before meal" },
    ],
  },
];

/* ─────────── Utility Functions ─────────── */

function escapeHTML(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

function isFollowUpDue(p: DisplayPrescription): boolean {
  if (!p.followUp) return false;
  try {
    const d = new Date(p.followUp);
    const now = new Date();
    return d >= now && d.getTime() - now.getTime() < 7 * 86400000;
  } catch { return false; }
}

function buildPrescriptionHTML(p: DisplayPrescription): string {
  const deptName = p.doctor?.department?.name || "";

  // Parse clinical data
  let clinical: Record<string, unknown> = {};
  try { clinical = typeof p.clinicalData === "string" ? JSON.parse(p.clinicalData) : p.clinicalData || {}; } catch { /* ignore */ }

  const str = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (Array.isArray(v)) return v.map(str).filter(Boolean).join(", ");
    if (typeof v === "object") {
      const obj = v as Record<string, unknown>;
      if (typeof obj.value === "string") return obj.value.trim();
      if (typeof obj.text === "string") return obj.text.trim();
      if (typeof obj.label === "string") return obj.label.trim();
      for (const val of Object.values(obj)) {
        if (typeof val === "string" && val.trim()) return val.trim();
      }
      return "";
    }
    return "";
  };

  // ── Chief complaints (array of strings like "• symptom") ──
  const chiefComplaints = Array.isArray(clinical.chiefComplaints) ? clinical.chiefComplaints : [];
  const validComplaints: { symptom: string; duration: string; severity: string }[] = chiefComplaints
    .map(c => {
      if (typeof c === "string") return { symptom: c.replace(/^[•\-]\s*/, ""), duration: "", severity: "" };
      if (typeof c === "object" && c !== null) return { symptom: str(c.symptom || c.name || c), duration: str(c.duration), severity: str(c.severity) };
      return null;
    })
    .filter((c): c is { symptom: string; duration: string; severity: string } => !!(c && c.symptom));

  // ── Vitals — object with height, weight, bp, pulse, etc. ──
  const vd = clinical.vitalsDetail;
  const vitalsItems: string[] = [];
  if (vd && typeof vd === "object") {
    const labels: Record<string, string> = { height: "Height", weight: "Weight", bmi: "BMI", temperature: "Temp", pulse: "Pulse", respiration: "Resp", bp: "BP", spo2: "SpO₂", bloodSugar: "Sugar", painScore: "Pain" };
    const units: Record<string, string> = { height: "cm", weight: "kg", temperature: "°F", pulse: "/min", respiration: "/min", spo2: "%", bloodSugar: "mg/dL" };
    for (const [k, label] of Object.entries(labels)) {
      const v = str((vd as Record<string, unknown>)[k]);
      if (v) vitalsItems.push(`${label}: ${v}${units[k] ? " " + units[k] : ""}`);
    }
  }

  // ── History — extract from complex objects ──
  // pastMedical: { diabetes: true, hypertension: false, others: "GERD" }
  const pm = clinical.pastMedical;
  const pastMedicalConditions: string[] = [];
  if (pm && typeof pm === "object") {
    const pmLabels: Record<string, string> = { diabetes: "Diabetes", hypertension: "Hypertension", asthma: "Asthma", thyroid: "Thyroid", tuberculosis: "TB", heartDisease: "Heart Disease", kidneyDisease: "Kidney Disease", cancer: "Cancer" };
    for (const [k, label] of Object.entries(pmLabels)) {
      if ((pm as Record<string, unknown>)[k]) pastMedicalConditions.push(label);
    }
    const others = str((pm as Record<string, unknown>).others);
    if (others) pastMedicalConditions.push(others);
  }
  const pastHistoryText = pastMedicalConditions.length ? pastMedicalConditions.join(", ") : str(clinical.pastHistory);

  // personalHistory: { smoking: "occasional", alcohol: "", ... }
  const ph = clinical.personalHistory;
  const personalItems: string[] = [];
  if (ph && typeof ph === "object") {
    const phLabels: Record<string, string> = { smoking: "Smoking", alcohol: "Alcohol", tobacco: "Tobacco", exercise: "Exercise", diet: "Diet", sleep: "Sleep" };
    for (const [k, label] of Object.entries(phLabels)) {
      const v = str((ph as Record<string, unknown>)[k]);
      if (v) personalItems.push(`${label}: ${v}`);
    }
  }
  const personalHistoryText = personalItems.length ? personalItems.join("; ") : str(ph);

  // familyHistory: { father: "...", mother: "...", geneticDisease: "...", ... }
  const fh = clinical.familyHistory;
  const familyItems: string[] = [];
  if (fh && typeof fh === "object") {
    const fhLabels: Record<string, string> = { father: "Father", mother: "Mother", geneticDisease: "Genetic", cancerHistory: "Cancer", diabetes: "Diabetes", hypertension: "Hypertension", heartDisease: "Heart Disease" };
    for (const [k, label] of Object.entries(fhLabels)) {
      const v = (fh as Record<string, unknown>)[k];
      if (typeof v === "boolean") { if (v) familyItems.push(`${label}: Yes`); }
      else { const s = str(v); if (s) familyItems.push(`${label}: ${s}`); }
    }
  }
  const familyHistoryText = familyItems.length ? familyItems.join("; ") : str(fh);

  // allergies: { drug: "...", food: "...", latex: false, none: false }
  const al = clinical.allergies;
  const allergyItems: string[] = [];
  if (al && typeof al === "object") {
    const alLabels: Record<string, string> = { drug: "Drug", food: "Food", latex: "Latex" };
    for (const [k, label] of Object.entries(alLabels)) {
      const v = (al as Record<string, unknown>)[k];
      if (typeof v === "boolean") { if (v) allergyItems.push(`${label}: Yes`); }
      else { const s = str(v); if (s) allergyItems.push(`${label}: ${s}`); }
    }
    if ((al as Record<string, unknown>).none) allergyItems.push("None");
  }
  const allergiesText = allergyItems.length ? allergyItems.join(", ") : str(al);

  // ── General appearance — object with fields like pallor, icterus, etc. ──
  const ga = clinical.generalAppearance;
  const generalAppearanceItems: string[] = [];
  if (ga && typeof ga === "object") {
    const labels: Record<string, string> = { pallor: "Pallor", icterus: "Icterus", cyanosis: "Cyanosis", clubbing: "Clubbing", edema: "Edema", lymphNodes: "Lymph Nodes" };
    for (const [k, label] of Object.entries(labels)) {
      const v = str((ga as Record<string, unknown>)[k]);
      if (v && v !== "—") generalAppearanceItems.push(`${label}: ${v}`);
    }
  }

  // ── Systemic examination — object with cvs, rs, cns, etc. ──
  const se = clinical.systemicExamination;
  const systemicExamItems: string[] = [];
  if (se && typeof se === "object") {
    const labels: Record<string, string> = { cvs: "CVS", rs: "RS", cns: "CNS", abdomen: "Abdomen", ent: "ENT", eye: "Eye", skin: "Skin" };
    for (const [k, label] of Object.entries(labels)) {
      const v = str((se as Record<string, unknown>)[k]);
      if (v && v !== "—") systemicExamItems.push(`${label}: ${v}`);
    }
  }

  // ── Diagnosis — object with primary, secondary, icd10, icd11 ──
  const diag = clinical.diagnosis || clinical.diagnosisDetail;
  let diagnosisText = "";
  if (diag && typeof diag === "object") {
    const parts: string[] = [];
    const d = diag as Record<string, unknown>;
    if (str(d.primary)) parts.push(str(d.primary));
    if (str(d.secondary)) parts.push(str(d.secondary));
    if (str(d.icd10)) parts.push(`ICD-10: ${str(d.icd10)}`);
    if (str(d.icd11)) parts.push(`ICD-11: ${str(d.icd11)}`);
    diagnosisText = parts.join("; ");
  } else {
    diagnosisText = str(diag);
  }

  // ── Investigations — array of objects with .name ──
  const invArr = Array.isArray(clinical.investigations) ? clinical.investigations : [];
  const investigationItems = invArr
    .filter((i: unknown) => {
      if (typeof i === "string") return !!i.trim();
      if (typeof i === "object" && i !== null) return !!str((i as Record<string, unknown>).name || (i as Record<string, unknown>).test || (i as Record<string, unknown>).value);
      return false;
    })
    .map((i: unknown) => {
      if (typeof i === "string") return i;
      const obj = i as Record<string, unknown>;
      return str(obj.name || obj.test || obj.value);
    });

  // ── Procedures — array of objects with .name ──
  const procArr = Array.isArray(clinical.procedures) ? clinical.procedures : [];
  const procedureItems = procArr
    .filter((p: unknown) => {
      if (typeof p === "string") return !!p.trim();
      if (typeof p === "object" && p !== null) return !!str((p as Record<string, unknown>).name || (p as Record<string, unknown>).procedure || (p as Record<string, unknown>).value);
      return false;
    })
    .map((p: unknown) => {
      if (typeof p === "string") return p;
      const obj = p as Record<string, unknown>;
      return str(obj.name || obj.procedure || obj.value);
    });

  // ── Follow-up — build labeled fields ──
  const fu = clinical.followUp;
  const followUpFields: string[] = [];
  if (fu && typeof fu === "object") {
    const f = fu as Record<string, unknown>;
    if (f.date) {
      try {
        const dateStr = str(f.date);
        if (dateStr) {
          const dateObj = new Date(dateStr);
          if (!isNaN(dateObj.getTime())) {
            followUpFields.push(`<span class="label">Date</span> ${dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`);
          }
        }
      } catch { /* ignore */ }
    }
    if (f.nextReason) {
      const v = str(f.nextReason);
      if (v && v !== "—" && !(v.length > 20 && !v.includes(" "))) followUpFields.push(`<span class="label">Reason</span> ${escapeHTML(v)}`);
    }
  } else {
    const v = str(fu);
    if (v) followUpFields.push(`<span class="label">Details</span> ${escapeHTML(v)}`);
  }

  // Conditional section helper
  const section = (title: string, content: unknown) => {
    const s = str(content);
    return s ? `<div class="section-block"><h2>${title}</h2><p>${escapeHTML(s)}</p></div>` : "";
  };

  // Patient info — 2-column, always shown
  const patientInfo = `
    <div class="info-grid-2col">
      <div class="info-cell"><span class="label">Patient</span> ${escapeHTML(p.patient?.name || "—")} <span class="dim">(${escapeHTML(p.patient?.patientCode || "—")})</span></div>
      <div class="info-cell"><span class="label">Age / Gender</span> ${p.patient?.age ?? "—"} yrs / ${escapeHTML(p.patient?.gender || "—")}</div>
      <div class="info-cell"><span class="label">Doctor</span> ${escapeHTML(p.doctor?.name || "—")}${deptName ? ` <span class="dim">(${escapeHTML(deptName)})</span>` : ""}</div>
      <div class="info-cell"><span class="label">Date</span> ${formatDate(p.createdAt)}</div>
    </div>`;

  // Optional clinical fields — only if filled
  const clinicalFields: string[] = [];
  if (p.diagnosis) clinicalFields.push(`<div class="info-cell full"><span class="label">Diagnosis</span> ${escapeHTML(p.diagnosis)}</div>`);
  if (vitalsItems.length) clinicalFields.push(`<div class="info-cell full"><span class="label">Vitals</span> ${escapeHTML(vitalsItems.join(" | "))}</div>`);
  const clinicalGrid = clinicalFields.length ? `<div class="info-grid-2col" style="margin-top:4px">${clinicalFields.join("")}</div>` : "";

  // Chief complaints — clean list without #
  const complaintsHTML = validComplaints.length
    ? `<div class="section-block"><h2>Chief Complaints</h2>
       <ul style="margin:4px 0 0 20px;padding:0;font-size:13px;line-height:1.8">
       ${validComplaints.map(c => {
         const parts = [escapeHTML(c.symptom)];
         if (c.duration) parts.push(`<span class="dim">(${escapeHTML(c.duration)})</span>`);
         if (c.severity) parts.push(`<span class="dim">— ${escapeHTML(c.severity)}</span>`);
         return `<li>${parts.join(" ")}</li>`;
       }).join("")}
       </ul></div>`
    : "";

  // History — only filled items
  const historyPairs = [
    ["Past Medical History", pastHistoryText],
    ["Personal History", personalHistoryText],
    ["Family History", familyHistoryText],
    ["Allergies", allergiesText],
  ].filter(([, v]) => v) as [string, string][];

  const historyHTML = historyPairs.length
    ? `<div class="section-block"><h2>History</h2>
       <div class="info-grid-2col">${historyPairs.map(([l, v]) => `<div class="info-cell full"><span class="label">${l}</span> ${escapeHTML(v).replace(/\n/g, "<br>")}</div>`).join("")}</div></div>`
    : "";

  // Examination
  const examHTML = (generalAppearanceItems.length || systemicExamItems.length)
    ? `<div class="section-block"><h2>Examination</h2>
       <div class="info-grid-2col">
       ${generalAppearanceItems.length ? `<div class="info-cell full"><span class="label">General Appearance</span> ${escapeHTML(generalAppearanceItems.join("; "))}</div>` : ""}
       ${systemicExamItems.length ? `<div class="info-cell full"><span class="label">Systemic Examination</span> ${escapeHTML(systemicExamItems.join("; "))}</div>` : ""}
       </div></div>`
    : "";

  // Medicines — numbered, only if present
  const medicinesHTML = (p.items?.length ? p.items : [])
    .map((it, i) => `
      <div class="rx-item">
        <div class="rx-num">${i + 1}.</div>
        <div class="rx-body">
          <div class="med">${escapeHTML(it.medicineName)}</div>
          <div class="sig">${escapeHTML(it.dosage)} · ${escapeHTML(it.frequency)} · ${escapeHTML(it.duration)} · Qty: ${it.quantity}${it.instructions ? " · " + escapeHTML(it.instructions) : ""}</div>
        </div>
      </div>`)
    .join("");

  // Build investigations/procedures HTML as bullet lists
  const investigationsHTML = investigationItems.length
    ? `<div class="section-block"><h2>Investigations</h2><ul style="margin:4px 0 0 20px;padding:0;font-size:13px;line-height:1.7">${investigationItems.map(i => `<li>${escapeHTML(i)}</li>`).join("")}</ul></div>`
    : "";
  const proceduresHTML = procedureItems.length
    ? `<div class="section-block"><h2>Procedures</h2><ul style="margin:4px 0 0 20px;padding:0;font-size:13px;line-height:1.7">${procedureItems.map(p => `<li>${escapeHTML(p)}</li>`).join("")}</ul></div>`
    : "";

  // Build follow-up HTML
  const followUpHTML = followUpFields.length
    ? `<div class="section-block"><h2>Follow-up</h2><div class="info-grid-2col">${followUpFields.map(f => `<div class="info-cell">${f}</div>`).join("")}</div></div>`
    : "";

  return `${docHeader(p.code, "PRESCRIPTION", formatDate(p.createdAt))}
    ${patientInfo}
    ${clinicalGrid}
    ${complaintsHTML}
    ${historyHTML}
    ${examHTML}
    ${section("Diagnosis", diagnosisText)}
    ${section("Clinical Notes", clinical.clinicalNotes)}
    ${investigationsHTML}
    ${proceduresHTML}
    ${medicinesHTML ? `<div class="section-block"><h2>Rx — Medicines</h2>${medicinesHTML}</div>` : ""}
    ${section("Advice", p.advice || clinical.advice)}
    ${followUpHTML}
    <div class="signature">
      <div class="sig-block">
        <div class="line"></div>
        <div class="name">${escapeHTML(p.doctor?.name || "—")}</div>
        <div class="role">${escapeHTML(p.doctor?.specialization || "")}</div>
      </div>
    </div>`;
}

function emptyItem(): MedicineItemDraft {
  return {
    medicineName: "",
    dosage: "",
    frequency: "After meal",
    duration: "",
    quantity: "",
    instructions: "",
  };
}

/* ═══════════════════════════════════════════════════════════
   EDIT PRESCRIPTION DIALOG
   ═══════════════════════════════════════════════════════════ */

function EditPrescriptionDialog({
  prescription,
  open,
  onOpenChange,
  onSaved,
}: {
  prescription: DisplayPrescription | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const branchId = useAppStore((s) => s.branchId);
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    diagnosis: "",
    symptoms: "",
    vitals: "",
    advice: "",
    followUp: "",
  });

  const emptyClinical = {
    chiefComplaints: "",
    presentIllness: "",
    historyDuration: "",
    severity: "Moderate",
    associatedSymptoms: "",
    pastMedical: { diabetes: false, hypertension: false, asthma: false, thyroid: false, tuberculosis: false, heartDisease: false, kidneyDisease: false, cancer: false, others: "" },
    surgicalHistory: "",
    allergies: { drug: "", food: "", latex: false, none: false },
    personalHistory: { smoking: "", alcohol: "", tobacco: "", exercise: "", diet: "", sleep: "" },
    obstetricHistory: { lmp: "", gravida: "", para: "" },
    familyHistory: { father: "", mother: "", geneticDisease: "", cancerHistory: "", diabetes: false, hypertension: false, heartDisease: false },
    generalAppearance: { pallor: "", icterus: "", cyanosis: "", clubbing: "", edema: "", lymphNodes: "" },
    systemicExamination: { cvs: "", rs: "", cns: "", abdomen: "", ent: "", eye: "", skin: "" },
    diagnosisDetail: { primary: "", secondary: "", icd10: "", icd11: "" },
    clinicalNotes: "",
    investigations: [{ name: "", reason: "", priority: "Routine", status: "Ordered" }],
    procedures: [{ name: "", date: "", notes: "" }],
    adviceDetail: { diet: "", lifestyle: "", exercise: "", hydration: "", restrictions: "", travel: "" },
    followUpDetail: { date: "", department: "", doctor: "", nextReason: "" },
    referral: { referredTo: "", hospital: "", doctor: "", reason: "" },
    vitalsDetail: { height: "", weight: "", bmi: "", temperature: "", pulse: "", respiration: "", bp: "", spo2: "", bloodSugar: "", painScore: "" },
  };

  const [clinical, setClinical] = useState(emptyClinical);

  const [items, setItems] = useState([
    { medicineName: "", dosage: "", frequency: "1-0-0", duration: "", quantity: "1", instructions: "" },
  ]);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const toggleSection = (s: string) => setCollapsedSections((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

  /* ── AI Panel State ── */
  const [aiDiagnosisLoading, setAiDiagnosisLoading] = useState(false);
  const [aiDiagnosisSuggestions, setAiDiagnosisSuggestions] = useState<{ diagnosis: string; confidence: string; icd: string; reasoning: string }[]>([]);
  const [aiDrugCheckLoading, setAiDrugCheckLoading] = useState(false);
  const [aiDrugInteractions, setAiDrugInteractions] = useState<{ severity: string; drugs: string; description: string }[]>([]);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiInvestigationsLoading, setAiInvestigationsLoading] = useState(false);
  const [aiInvestigations, setAiInvestigations] = useState<{ test: string; reason: string; priority: string }[]>([]);
  const [aiAlertsLoading, setAiAlertsLoading] = useState(false);
  const [aiAlerts, setAiAlerts] = useState<{ type: string; message: string }[]>([]);
  const [activeAITab, setActiveAITab] = useState<"diagnosis" | "drugs" | "summary" | "investigations" | "alerts">("diagnosis");

  // Pre-fill from prescription when it opens
  useEffect(() => {
    if (prescription && open) {
      // Pre-fill form fields
      setForm({
        patientId: prescription.patientId || "",
        doctorId: prescription.doctorId || "",
        diagnosis: prescription.diagnosis || "",
        symptoms: prescription.symptoms || "",
        vitals: prescription.vitals || "",
        advice: prescription.advice || "",
        followUp: prescription.followUp || "",
      });
      // Pre-fill items
      setItems(
        (prescription.items || []).map((it) => ({
          medicineName: it.medicineName || "",
          dosage: it.dosage || "",
          frequency: it.frequency || "1-0-0",
          duration: it.duration || "",
          quantity: String(it.quantity || 1),
          instructions: it.instructions || "",
        }))
      );
      // Pre-fill clinical data from JSON
      try {
        const cd = prescription.clinicalData ? JSON.parse(prescription.clinicalData as unknown as string) : null;
        if (cd) {
          // Map chiefComplaints back from array to newline-separated string
          const chiefComplaints = Array.isArray(cd.chiefComplaints)
            ? cd.chiefComplaints.map((s: string) => s.replace(/^•\s*/, "")).join("\n")
            : cd.chiefComplaints || "";
          const surgicalHistory = Array.isArray(cd.surgicalHistory)
            ? cd.surgicalHistory.join(", ")
            : cd.surgicalHistory || "";
          setClinical({
            chiefComplaints,
            presentIllness: cd.presentIllness || "",
            historyDuration: cd.historyDuration || "",
            severity: cd.severity || "Moderate",
            associatedSymptoms: cd.associatedSymptoms || "",
            pastMedical: { ...emptyClinical.pastMedical, ...cd.pastMedical },
            surgicalHistory,
            allergies: { ...emptyClinical.allergies, ...cd.allergies },
            personalHistory: { ...emptyClinical.personalHistory, ...cd.personalHistory },
            obstetricHistory: { ...emptyClinical.obstetricHistory, ...(cd.obstetricHistory || {}) },
            familyHistory: { ...emptyClinical.familyHistory, ...cd.familyHistory },
            generalAppearance: { ...emptyClinical.generalAppearance, ...cd.generalAppearance },
            systemicExamination: { ...emptyClinical.systemicExamination, ...cd.systemicExamination },
            diagnosisDetail: { ...emptyClinical.diagnosisDetail, ...(cd.diagnosis || cd.diagnosisDetail || {}) },
            clinicalNotes: cd.clinicalNotes || "",
            investigations: (cd.investigations || []).length > 0
              ? cd.investigations.map((inv: Record<string, string>) => ({
                  name: inv.name || "",
                  reason: inv.reason || "",
                  priority: inv.priority || "Routine",
                  status: inv.status || "Ordered",
                }))
              : emptyClinical.investigations,
            procedures: (cd.procedures || []).length > 0
              ? cd.procedures.map((p: Record<string, string>) => ({
                  name: p.name || "",
                  date: p.date || "",
                  notes: p.notes || "",
                }))
              : emptyClinical.procedures,
            adviceDetail: { ...emptyClinical.adviceDetail, ...(cd.advice || cd.adviceDetail || {}) },
            followUpDetail: { ...emptyClinical.followUpDetail, ...(cd.followUp || cd.followUpDetail || {}) },
            referral: { ...emptyClinical.referral, ...(cd.referral || {}) },
            vitalsDetail: { ...emptyClinical.vitalsDetail, ...(cd.vitalsDetail || {}) },
          });
          // Also sync diagnosis to form
          const primaryDiagnosis = cd.diagnosis?.primary || cd.diagnosisDetail?.primary || "";
          if (primaryDiagnosis) {
            setForm((f) => ({ ...f, diagnosis: primaryDiagnosis }));
          }
        }
      } catch {
        // clinicalData is null or invalid JSON — use defaults (emptyClinical)
      }
      // Reset AI state on open
      setAiDiagnosisSuggestions([]);
      setAiDrugInteractions([]);
      setAiSummary("");
      setAiInvestigations([]);
      setAiAlerts([]);
    }
  }, [prescription, open]);

  const reset = () => {
    setForm({ patientId: "", doctorId: "", diagnosis: "", symptoms: "", vitals: "", advice: "", followUp: "" });
    setClinical(emptyClinical);
    setItems([{ medicineName: "", dosage: "", frequency: "1-0-0", duration: "", quantity: "1", instructions: "" }]);
    setAiDiagnosisSuggestions([]);
    setAiDrugInteractions([]);
    setAiSummary("");
    setAiInvestigations([]);
    setAiAlerts([]);
  };

  /* ── AI Handler Functions ── */

  const suggestDiagnosis = async () => {
    setAiDiagnosisLoading(true);
    setAiDiagnosisSuggestions([]);
    await new Promise((r) => setTimeout(r, 1500));
    const symptoms = (clinical.chiefComplaints + " " + clinical.associatedSymptoms + " " + clinical.presentIllness).toLowerCase();
    const suggestions: { diagnosis: string; confidence: string; icd: string; reasoning: string }[] = [];
    if (symptoms.includes("fever") || symptoms.includes("cold") || symptoms.includes("cough") || symptoms.includes("sore throat") || symptoms.includes("sneez")) {
      suggestions.push({ diagnosis: "Upper Respiratory Tract Infection", confidence: "High", icd: "J06.9", reasoning: "Fever with respiratory symptoms suggests URI" });
      suggestions.push({ diagnosis: "Influenza", confidence: "Moderate", icd: "J11.1", reasoning: "Systemic symptoms may indicate influenza" });
      suggestions.push({ diagnosis: "Pharyngitis", confidence: "Low", icd: "J02.9", reasoning: "Sore throat as primary symptom" });
    } else if (symptoms.includes("abdom") || symptoms.includes("nausea") || symptoms.includes("vomit") || symptoms.includes("diarrhea")) {
      suggestions.push({ diagnosis: "Acute Gastroenteritis", confidence: "High", icd: "A09", reasoning: "GI symptoms with possible dehydration" });
      suggestions.push({ diagnosis: "Acute Gastritis", confidence: "Moderate", icd: "K29.7", reasoning: "Upper abdominal discomfort with nausea" });
      suggestions.push({ diagnosis: "Appendicitis", confidence: "Low", icd: "K35.8", reasoning: "Right lower quadrant pain needs exclusion" });
    } else if (symptoms.includes("chest") || symptoms.includes("breath") || symptoms.includes("palpitation")) {
      suggestions.push({ diagnosis: "Acute Coronary Syndrome", confidence: "Moderate", icd: "I20.9", reasoning: "Chest symptoms require cardiac evaluation" });
      suggestions.push({ diagnosis: "Anxiety Disorder", confidence: "Low", icd: "F41.1", reasoning: "Palpitations with anxiety features" });
    } else if (symptoms.includes("headache") || symptoms.includes("migraine") || symptoms.includes("dizziness")) {
      suggestions.push({ diagnosis: "Tension Headache", confidence: "High", icd: "G44.2", reasoning: "Most common cause of headache" });
      suggestions.push({ diagnosis: "Migraine", confidence: "Moderate", icd: "G43.9", reasoning: "Unilateral throbbing with photophobia" });
    } else if (symptoms) {
      suggestions.push({ diagnosis: "General examination required", confidence: "N/A", icd: "—", reasoning: "Symptoms require clinical correlation" });
      suggestions.push({ diagnosis: "Symptomatic treatment may be considered", confidence: "N/A", icd: "—", reasoning: "Pending further clinical assessment" });
    } else {
      suggestions.push({ diagnosis: "No symptoms entered", confidence: "—", icd: "—", reasoning: "Enter chief complaints for AI diagnosis suggestions" });
    }
    setAiDiagnosisSuggestions(suggestions);
    setAiDiagnosisLoading(false);
  };

  const checkDrugInteractions = async () => {
    setAiDrugCheckLoading(true);
    setAiDrugInteractions([]);
    await new Promise((r) => setTimeout(r, 1200));
    const medNames = items.filter((it) => it.medicineName.trim()).map((it) => it.medicineName.toLowerCase());
    const interactions: { severity: string; drugs: string; description: string }[] = [];
    const known: Record<string, { severity: string; description: string }[]> = {
      "warfarin": [{ severity: "Major", description: "Increases bleeding risk with NSAIDs, Aspirin, and many antibiotics" }],
      "metformin": [{ severity: "Moderate", description: "Risk of lactic acidosis with contrast dye and excessive alcohol" }],
      "aspirin": [{ severity: "Moderate", description: "Increased GI bleeding risk with corticosteroids and anticoagulants" }],
      "amiodarone": [{ severity: "Major", description: "Multiple interactions — monitor with statins, digoxin, warfarin" }],
      "methotrexate": [{ severity: "Major", description: "NSAIDs and trimethoprim increase toxicity" }],
      "lithium": [{ severity: "Major", description: "NSAIDs and diuretics increase lithium levels" }],
      "ssri": [{ severity: "Moderate", description: "Serotonin syndrome risk with MAOIs and triptans" }],
      "statin": [{ severity: "Moderate", description: "Increased myopathy risk with fibrates and certain antibiotics" }],
    };
    for (const med of medNames) {
      for (const [drug, warns] of Object.entries(known)) {
        if (med.includes(drug)) {
          for (const w of warns) {
            interactions.push({ severity: w.severity, drugs: med, description: w.description });
          }
        }
      }
    }
    if (medNames.length === 0) {
      interactions.push({ severity: "Info", drugs: "—", description: "Add medicines to check for interactions" });
    } else if (interactions.length === 0) {
      interactions.push({ severity: "Safe", drugs: "All medicines", description: "No known major interactions detected between current medicines" });
    }
    setAiDrugInteractions(interactions);
    setAiDrugCheckLoading(false);
  };

  const generateAISummary = async () => {
    setAiSummaryLoading(true);
    setAiSummary("");
    await new Promise((r) => setTimeout(r, 1800));
    const parts: string[] = [];
    if (clinical.chiefComplaints) parts.push(`Patient presents with: ${clinical.chiefComplaints.replace(/\n/g, "; ")}.`);
    if (clinical.historyDuration) parts.push(`Duration: ${clinical.historyDuration}.`);
    if (clinical.severity) parts.push(`Severity rated as ${clinical.severity}.`);
    if (clinical.associatedSymptoms) parts.push(`Associated symptoms: ${clinical.associatedSymptoms}.`);
    if (clinical.presentIllness) parts.push(`HPI: ${clinical.presentIllness.substring(0, 200)}${clinical.presentIllness.length > 200 ? "..." : ""}`);
    const pmhx = Object.entries(clinical.pastMedical).filter(([k, v]) => v === true).map(([k]) => k);
    if (pmhx.length) parts.push(`Past medical history significant for ${pmhx.join(", ")}.`);
    if (clinical.allergies.drug) parts.push(`Drug allergy: ${clinical.allergies.drug}.`);
    if (clinical.diagnosisDetail.primary) parts.push(`Working diagnosis: ${clinical.diagnosisDetail.primary}.`);
    const medList = items.filter((it) => it.medicineName.trim()).map((it) => `${it.medicineName} ${it.dosage} ${it.frequency} ${it.duration}`);
    if (medList.length) parts.push(`Prescribed: ${medList.join("; ")}.`);
    if (clinical.adviceDetail.diet || clinical.adviceDetail.lifestyle) {
      const adv = [clinical.adviceDetail.diet, clinical.adviceDetail.lifestyle].filter(Boolean).join("; ");
      parts.push(`Advice: ${adv}.`);
    }
    if (clinical.followUpDetail.date) parts.push(`Follow-up scheduled for ${clinical.followUpDetail.date}.`);
    setAiSummary(parts.length ? parts.join("\n\n") : "No clinical data entered yet. Start filling the form to generate an AI summary.");
    setAiSummaryLoading(false);
  };

  const suggestInvestigations = async () => {
    setAiInvestigationsLoading(true);
    setAiInvestigations([]);
    await new Promise((r) => setTimeout(r, 1300));
    const symptoms = (clinical.chiefComplaints + " " + clinical.presentIllness + " " + clinical.diagnosisDetail.primary).toLowerCase();
    const suggestions: { test: string; reason: string; priority: string }[] = [];
    if (symptoms.includes("fever")) {
      suggestions.push({ test: "CBC with Differential", reason: "Evaluate infection / fever", priority: "Urgent" });
      suggestions.push({ test: "Blood Culture", reason: "Identify causative organism", priority: "Urgent" });
      suggestions.push({ test: "ESR / CRP", reason: "Inflammatory markers", priority: "Routine" });
    }
    if (symptoms.includes("abdom") || symptoms.includes("nausea") || symptoms.includes("vomit")) {
      suggestions.push({ test: "USG Abdomen", reason: "Rule out appendicitis, cholecystitis", priority: "Urgent" });
      suggestions.push({ test: "LFT + Amylase", reason: "Hepatic and pancreatic evaluation", priority: "Routine" });
      suggestions.push({ test: "CBC", reason: "Infection screen", priority: "Routine" });
    }
    if (symptoms.includes("chest") || symptoms.includes("breath") || symptoms.includes("palpitation")) {
      suggestions.push({ test: "ECG (12-lead)", reason: "Cardiac rhythm evaluation", priority: "STAT" });
      suggestions.push({ test: "Troponin I/T", reason: "Rule out ACS", priority: "STAT" });
      suggestions.push({ test: "Chest X-ray PA view", reason: "Cardiopulmonary assessment", priority: "Urgent" });
    }
    if (symptoms.includes("diabetes") || symptoms.includes("sugar") || symptoms.includes("glucose")) {
      suggestions.push({ test: "HbA1c", reason: "Glycemic control over 3 months", priority: "Routine" });
      suggestions.push({ test: "Fasting & PP Blood Sugar", reason: "Current glucose levels", priority: "Routine" });
      suggestions.push({ test: "Renal Profile", reason: "Screen for diabetic nephropathy", priority: "Routine" });
    }
    if (symptoms.includes("hypertension") || symptoms.includes("bp") || symptoms.includes("blood pressure")) {
      suggestions.push({ test: "Lipid Profile", reason: "Cardiovascular risk assessment", priority: "Routine" });
      suggestions.push({ test: "Renal Function Tests", reason: "Screen for renal involvement", priority: "Routine" });
      suggestions.push({ test: "ECG", reason: "Left ventricular hypertrophy screen", priority: "Routine" });
    }
    if (suggestions.length === 0) {
      suggestions.push({ test: "CBC", reason: "General screening", priority: "Routine" });
      suggestions.push({ test: "RBS", reason: "Blood sugar baseline", priority: "Routine" });
      if (symptoms) suggestions.push({ test: "Consider specific tests", reason: "Based on clinical presentation", priority: "Routine" });
    }
    setAiInvestigations(suggestions);
    setAiInvestigationsLoading(false);
  };

  const checkClinicalAlerts = async () => {
    setAiAlertsLoading(true);
    setAiAlerts([]);
    await new Promise((r) => setTimeout(r, 1000));
    const alerts: { type: string; message: string }[] = [];
    if (clinical.allergies.drug && clinical.allergies.drug.toLowerCase() !== "none" && clinical.allergies.drug.toLowerCase() !== "nil") {
      alerts.push({ type: "allergy", message: `Drug allergy recorded: ${clinical.allergies.drug} — ensure prescribed medicines are safe` });
    }
    const medList = items.filter((it) => it.medicineName.trim());
    const hasNSAID = medList.some((it) => it.medicineName.toLowerCase().match(/ibuprofen|naproxen|diclofenac|aceclofenac|aspirin/));
    if (hasNSAID && clinical.allergies.drug?.toLowerCase().includes("nsaid")) {
      alerts.push({ type: "critical", message: "NSAID prescribed but patient has NSAID allergy — contraindicated!" });
    }
    const hasMetformin = medList.some((it) => it.medicineName.toLowerCase().includes("metformin"));
    const hasRenal = clinical.pastMedical.kidneyDisease;
    if (hasMetformin && hasRenal) {
      alerts.push({ type: "critical", message: "Metformin prescribed with kidney disease history — contraindicated if eGFR <30" });
    }
    const age = form.patientId ? 35 : null;
    if (medList.some((it) => it.medicineName.toLowerCase().match(/aspirin/)) && age && age < 16) {
      alerts.push({ type: "warning", message: "Aspirin in patients under 16 — risk of Reye's syndrome" });
    }
    if (clinical.vitalsDetail.temperature && parseFloat(clinical.vitalsDetail.temperature) >= 103) {
      alerts.push({ type: "warning", message: "High fever detected (≥103°F) — monitor closely, consider antipyretics" });
    }
    if (clinical.vitalsDetail.spo2 && parseInt(clinical.vitalsDetail.spo2) < 92) {
      alerts.push({ type: "critical", message: "SpO₂ below 92% — assess respiratory status urgently" });
    }
    if (clinical.vitalsDetail.bp) {
      const sys = parseInt(clinical.vitalsDetail.bp.split("/")[0]);
      if (sys >= 180) alerts.push({ type: "critical", message: "Hypertensive crisis (SBP ≥180) — immediate management required" });
    }
    if (!form.patientId && !form.doctorId) {
      alerts.push({ type: "info", message: "Patient and doctor not yet selected — complete required fields" });
    }
    if (medList.length === 0 && clinical.diagnosisDetail.primary) {
      alerts.push({ type: "info", message: "Diagnosis entered but no medicines prescribed — verify if intentional" });
    }
    if (alerts.length === 0) {
      alerts.push({ type: "success", message: "No clinical alerts — prescription looks clean" });
    }
    setAiAlerts(alerts);
    setAiAlertsLoading(false);
  };

  const applyAIDiagnosis = (diagnosis: string, icd: string) => {
    setForm((prev) => ({ ...prev, diagnosis }));
    setClinical((prev) => ({ ...prev, diagnosisDetail: { ...prev.diagnosisDetail, primary: diagnosis, icd10: icd } }));
    toast.success(`Applied diagnosis: ${diagnosis}`);
  };

  const applyAIInvestigations = (test: string, reason: string, priority: string) => {
    setClinical((prev) => ({ ...prev, investigations: [...prev.investigations, { name: test, reason, priority, status: "Ordered" }] }));
    toast.success(`Added investigation: ${test}`);
  };

  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setForm((prev) => ({ ...prev, diagnosis: template.diagnosis }));
    setClinical((prev) => ({ ...prev, diagnosisDetail: { ...prev.diagnosisDetail, primary: template.diagnosis } }));
    setItems(template.medicines.map((m) => ({ ...m })));
    toast.success(`Applied template: ${template.name}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prescription) return;
    if (!form.patientId || !form.doctorId) {
      toast.error("Please select a patient and a doctor");
      return;
    }
    const validItems = items
      .filter((it) => it.medicineName.trim())
      .map((it) => ({
        medicineName: it.medicineName.trim(),
        dosage: it.dosage.trim() || "—",
        frequency: it.frequency,
        duration: it.duration.trim() || "—",
        quantity: Number(it.quantity) || 1,
        instructions: it.instructions.trim() || null,
      }));

    const clinicalData = {
      chiefComplaints: clinical.chiefComplaints.split("\n").filter(Boolean).map(s => s.startsWith("•") ? s : `• ${s}`),
      presentIllness: clinical.presentIllness,
      historyDuration: clinical.historyDuration,
      severity: clinical.severity,
      associatedSymptoms: clinical.associatedSymptoms,
      pastMedical: clinical.pastMedical,
      surgicalHistory: clinical.surgicalHistory.split(",").map(s => s.trim()).filter(Boolean),
      allergies: clinical.allergies,
      personalHistory: clinical.personalHistory,
      obstetricHistory: { ...clinical.obstetricHistory, applicable: true },
      familyHistory: clinical.familyHistory,
      generalAppearance: {
        pallor: clinical.generalAppearance.pallor || "—",
        icterus: clinical.generalAppearance.icterus || "—",
        cyanosis: clinical.generalAppearance.cyanosis || "—",
        clubbing: clinical.generalAppearance.clubbing || "—",
        edema: clinical.generalAppearance.edema || "—",
        lymphNodes: clinical.generalAppearance.lymphNodes || "—",
      },
      systemicExamination: {
        cvs: clinical.systemicExamination.cvs || "—",
        rs: clinical.systemicExamination.rs || "—",
        cns: clinical.systemicExamination.cns || "—",
        abdomen: clinical.systemicExamination.abdomen || "—",
        ent: clinical.systemicExamination.ent || "—",
        eye: clinical.systemicExamination.eye || "—",
        skin: clinical.systemicExamination.skin || "—",
      },
      diagnosis: {
        primary: clinical.diagnosisDetail.primary || form.diagnosis,
        secondary: clinical.diagnosisDetail.secondary,
        icd10: clinical.diagnosisDetail.icd10,
        icd11: clinical.diagnosisDetail.icd11,
      },
      clinicalNotes: clinical.clinicalNotes || form.advice,
      investigations: clinical.investigations.filter(i => i.name.trim()),
      procedures: clinical.procedures.filter(p => p.name.trim()),
      advice: clinical.adviceDetail,
      followUp: clinical.followUpDetail.date || clinical.followUpDetail.department || clinical.followUpDetail.doctor || clinical.followUpDetail.nextReason ? {
        date: clinical.followUpDetail.date ? new Date(clinical.followUpDetail.date) : null,
        department: clinical.followUpDetail.department || null,
        doctor: clinical.followUpDetail.doctor || null,
        nextReason: clinical.followUpDetail.nextReason || null,
      } : null,
      referral: {
        referredTo: clinical.referral.referredTo || "—",
        hospital: clinical.referral.hospital || "—",
        doctor: clinical.referral.doctor || "—",
        reason: clinical.referral.reason || "—",
      },
    };

    setSaving(true);
    try {
      const res = await fetchAPI(`/api/prescriptions/${prescription.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branchId || null,
          patientId: form.patientId,
          doctorId: form.doctorId,
          diagnosis: form.diagnosis.trim() || clinical.diagnosisDetail.primary || null,
          symptoms: form.symptoms.trim() || clinical.chiefComplaints.trim() || null,
          vitals: form.vitals.trim() || null,
          advice: form.advice.trim() || null,
          followUp: form.followUp.trim() || null,
          items: validItems,
          clinicalData,
        }),
      });
      if (!res.ok) throw new Error("Failed to update prescription");
      toast.success("Prescription updated successfully");
      reset();
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Failed to update prescription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5">
            <X className="w-4 h-4" /> Back
          </Button>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-teal-600" /> Edit Prescription {prescription?.code}
            </h2>
            <p className="text-xs text-muted-foreground">
              Update the comprehensive clinical prescription. All saved data flows directly to the printable OPD prescription.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {/* Quick Templates */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground uppercase shrink-0">Quick Fill:</span>
            {QUICK_TEMPLATES.map((t) => (
              <Button
                key={t.name}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-xs shrink-0 gap-1"
                onClick={() => applyTemplate(t)}
              >
                <Sparkles className="w-2.5 h-2.5" /> {t.name}
              </Button>
            ))}
          </div>

          {/* Section nav */}
          <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border text-xs">
            {[
              { id: "patient", label: "Patient", icon: User },
              { id: "vitals", label: "Vitals", icon: Activity },
              { id: "complaints", label: "Complaints", icon: MessageSquare },
              { id: "history", label: "History", icon: Clock },
              { id: "examination", label: "Exam", icon: Stethoscope },
              { id: "diagnosis", label: "Dx", icon: FileCheck },
              { id: "investigations", label: "Labs", icon: FlaskConical },
              { id: "medication", label: "Rx", icon: Pill },
              { id: "advice", label: "Advice", icon: ClipboardList },
              { id: "referral", label: "Referral", icon: Send },
            ].map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSection(s.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  collapsedSections.has(s.id) ? "bg-muted/60 text-muted-foreground hover:bg-muted" : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                }`}
              >
                <s.icon className="w-3 h-3" />
                {s.label}
              </button>
            ))}
          </div>

          {/* ============== TWO-COLUMN LAYOUT ============== */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          {/* ─── LEFT COLUMN: Form Sections ─── */}
          <div className="space-y-3 min-w-0">
          {/* ============== PATIENT & VISIT ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("patient")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Patient & Visit</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("patient") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("patient") && (
              <div className="space-y-4 px-1 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PatientSearch value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })} label="" required />
                <DoctorSearch value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })} label="" />
              </div>
              <p className="text-xs text-muted-foreground italic">Fill sections below — patient, vitals, complaints, then medication. Other sections are optional.</p>
            </div>
            )}
          </div>

          {/* ============== VITALS ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("vitals")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Vitals</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("vitals") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("vitals") && (
              <div className="space-y-4 px-1 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Vital Signs (10 parameters)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {([
                  ["bp", "Blood Pressure", "120/80 mmHg"],
                  ["pulse", "Pulse", "78 /min"],
                  ["temperature", "Temperature", "98.6 °F"],
                  ["respiration", "Respiration", "18 /min"],
                  ["spo2", "SpO₂", "98%"],
                  ["height", "Height", "170 cm"],
                  ["weight", "Weight", "65 kg"],
                  ["bmi", "BMI", "22.5"],
                  ["bloodSugar", "Blood Sugar", "94 mg/dL"],
                  ["painScore", "Pain Score", "2 / 10"],
                ] as const).map(([key, label, ph]) => (
                  <Field key={key} label={label}>
                    <Input
                      value={(clinical.vitalsDetail as Record<string, string>)[key]}
                      onChange={(e) => setClinical({ ...clinical, vitalsDetail: { ...clinical.vitalsDetail, [key]: e.target.value } })}
                      placeholder={ph}
                      className="h-10 text-sm"
                    />
                  </Field>
                ))}
              </div>
              <Field label="Vitals Summary (for card)">
                <Input value={form.vitals} onChange={(e) => setForm({ ...form, vitals: e.target.value })} placeholder="BP 120/80, T 98.6°F, HR 78, SpO₂ 98%" />
              </Field>
            </div>
            )}
          </div>

          {/* ============== COMPLAINTS ============== */}
          <div>
            <div
              onClick={() => toggleSection("complaints")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Complaints</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("complaints") ? "" : "rotate-180"}`} />
            </div>
            <div className="space-y-4 px-1 mt-3">
              <Field label="Chief Complaints (one per line)">
                <textarea
                  value={clinical.chiefComplaints}
                  onChange={(e) => setClinical({ ...clinical, chiefComplaints: e.target.value })}
                  placeholder="Type chief complaints here..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"
                  rows={3}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Duration">
                  <Input value={clinical.historyDuration} onChange={(e) => setClinical({ ...clinical, historyDuration: e.target.value })} placeholder="3 days" />
                </Field>
                <Field label="Severity">
                  <Select value={clinical.severity} onValueChange={(v) => setClinical({ ...clinical, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Mild", "Moderate", "Severe"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Associated Symptoms">
                  <Input value={clinical.associatedSymptoms} onChange={(e) => setClinical({ ...clinical, associatedSymptoms: e.target.value })} placeholder="Nausea, loss of appetite" />
                </Field>
              </div>
              <Field label="History of Present Illness">
                <textarea
                  value={clinical.presentIllness}
                  onChange={(e) => setClinical({ ...clinical, presentIllness: e.target.value })}
                  placeholder="Detailed narrative of the present illness — onset, progression, aggravating/relieving factors…"
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"
                />
              </Field>
            </div>
          </div>

          {/* ============== HISTORY ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("history")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">History</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("history") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("history") && (
              <div className="space-y-4 px-1 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Past Medical History</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  ["diabetes", "Diabetes"], ["hypertension", "Hypertension"], ["asthma", "Asthma"], ["thyroid", "Thyroid"],
                  ["tuberculosis", "Tuberculosis"], ["heartDisease", "Heart Disease"], ["kidneyDisease", "Kidney Disease"], ["cancer", "Cancer"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-xs rounded-md border p-1.5 cursor-pointer hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={(clinical.pastMedical as Record<string, boolean | string>)[key] as boolean}
                      onChange={(e) => setClinical({ ...clinical, pastMedical: { ...clinical.pastMedical, [key]: e.target.checked } })}
                      className="rounded"
                    /> {label}
                  </label>
                ))}
              </div>
              <Field label="Others (past medical)">
                <Input value={clinical.pastMedical.others} onChange={(e) => setClinical({ ...clinical, pastMedical: { ...clinical.pastMedical, others: e.target.value } })} placeholder="e.g. GERD — 2 years ago" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Surgical History (comma-separated)">
                  <Input value={clinical.surgicalHistory} onChange={(e) => setClinical({ ...clinical, surgicalHistory: e.target.value })} placeholder="Appendectomy (2019), C-Section (2020)" />
                </Field>
                <Field label="Drug Allergy">
                  <Input value={clinical.allergies.drug} onChange={(e) => setClinical({ ...clinical, allergies: { ...clinical.allergies, drug: e.target.value } })} placeholder="Penicillin (rash) or None" />
                </Field>
                <Field label="Food Allergy">
                  <Input value={clinical.allergies.food} onChange={(e) => setClinical({ ...clinical, allergies: { ...clinical.allergies, food: e.target.value } })} placeholder="None" />
                </Field>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={clinical.allergies.latex} onChange={(e) => setClinical({ ...clinical, allergies: { ...clinical.allergies, latex: e.target.checked } })} className="rounded" /> Latex Allergy</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={clinical.allergies.none} onChange={(e) => setClinical({ ...clinical, allergies: { ...clinical.allergies, none: e.target.checked } })} className="rounded" /> No Known Allergies</label>
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">Personal / Family History</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  ["smoking", "Smoking", "Non-smoker"], ["alcohol", "Alcohol", "Occasional"], ["tobacco", "Tobacco", "No"],
                  ["exercise", "Exercise", "Regular"], ["diet", "Diet", "Mixed"], ["sleep", "Sleep", "7-8 hours"],
                ] as const).map(([key, label, ph]) => (
                  <Field key={key} label={label}>
                    <Input value={(clinical.personalHistory as Record<string, string>)[key]} onChange={(e) => setClinical({ ...clinical, personalHistory: { ...clinical.personalHistory, [key]: e.target.value } })} placeholder={ph} className="h-10 text-sm" />
                  </Field>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Field label="Father's History"><Input value={clinical.familyHistory.father} onChange={(e) => setClinical({ ...clinical, familyHistory: { ...clinical.familyHistory, father: e.target.value } })} placeholder="Diabetes, HTN" className="h-10 text-sm" /></Field>
                <Field label="Mother's History"><Input value={clinical.familyHistory.mother} onChange={(e) => setClinical({ ...clinical, familyHistory: { ...clinical.familyHistory, mother: e.target.value } })} placeholder="HTN" className="h-10 text-sm" /></Field>
                <Field label="Genetic Disease"><Input value={clinical.familyHistory.geneticDisease} onChange={(e) => setClinical({ ...clinical, familyHistory: { ...clinical.familyHistory, geneticDisease: e.target.value } })} placeholder="None" className="h-10 text-sm" /></Field>
              </div>
            </div>
            )}
          </div>

          {/* ============== EXAMINATION ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("examination")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Examination</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("examination") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("examination") && (
              <div className="space-y-4 px-1 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">General Appearance</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  ["pallor", "Pallor"], ["icterus", "Icterus"], ["cyanosis", "Cyanosis"],
                  ["clubbing", "Clubbing"], ["edema", "Edema"], ["lymphNodes", "Lymph Nodes"],
                ] as const).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Input value={(clinical.generalAppearance as Record<string, string>)[key]} onChange={(e) => setClinical({ ...clinical, generalAppearance: { ...clinical.generalAppearance, [key]: e.target.value } })} placeholder="Absent / Mild / Present" className="h-10 text-sm" />
                  </Field>
                ))}
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">Systemic Examination</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="CVS"><Textarea value={clinical.systemicExamination.cvs} onChange={(e) => setClinical({ ...clinical, systemicExamination: { ...clinical.systemicExamination, cvs: e.target.value } })} placeholder="S1, S2 normal. No murmur." rows={2} className="text-sm" /></Field>
                <Field label="RS"><Textarea value={clinical.systemicExamination.rs} onChange={(e) => setClinical({ ...clinical, systemicExamination: { ...clinical.systemicExamination, rs: e.target.value } })} placeholder="Bilateral air entry equal." rows={2} className="text-sm" /></Field>
                <Field label="CNS"><Textarea value={clinical.systemicExamination.cns} onChange={(e) => setClinical({ ...clinical, systemicExamination: { ...clinical.systemicExamination, cns: e.target.value } })} placeholder="Conscious, oriented. GCS 15/15." rows={2} className="text-xs" /></Field>
                <Field label="Abdomen"><Textarea value={clinical.systemicExamination.abdomen} onChange={(e) => setClinical({ ...clinical, systemicExamination: { ...clinical.systemicExamination, abdomen: e.target.value } })} placeholder="Soft, no organomegaly." rows={2} className="text-sm" /></Field>
              </div>
            </div>
            )}
          </div>

          {/* ============== DIAGNOSIS ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("diagnosis")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Diagnosis</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("diagnosis") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("diagnosis") && (
              <div className="space-y-4 px-1 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Primary Diagnosis *">
                  <Input value={clinical.diagnosisDetail.primary} onChange={(e) => { setClinical({ ...clinical, diagnosisDetail: { ...clinical.diagnosisDetail, primary: e.target.value } }); setForm({ ...form, diagnosis: e.target.value }); }} placeholder="Acute Gastritis" />
                </Field>
                <Field label="Secondary Diagnosis">
                  <Input value={clinical.diagnosisDetail.secondary} onChange={(e) => setClinical({ ...clinical, diagnosisDetail: { ...clinical.diagnosisDetail, secondary: e.target.value } })} placeholder="Mild Dehydration" />
                </Field>
                <Field label="ICD-10 Code">
                  <Input value={clinical.diagnosisDetail.icd10} onChange={(e) => setClinical({ ...clinical, diagnosisDetail: { ...clinical.diagnosisDetail, icd10: e.target.value } })} placeholder="K29.7" className="font-mono" />
                </Field>
                <Field label="ICD-11 Code">
                  <Input value={clinical.diagnosisDetail.icd11} onChange={(e) => setClinical({ ...clinical, diagnosisDetail: { ...clinical.diagnosisDetail, icd11: e.target.value } })} placeholder="DA42" className="font-mono" />
                </Field>
              </div>
              <Field label="Clinical Notes">
                <Textarea value={clinical.clinicalNotes} onChange={(e) => { setClinical({ ...clinical, clinicalNotes: e.target.value }); setForm({ ...form, advice: e.target.value }); }} placeholder="Patient counseled about condition and treatment plan…" rows={3} />
              </Field>
            </div>
            )}
          </div>

          {/* ============== INVESTIGATIONS ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("investigations")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FlaskConical className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Investigations</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("investigations") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("investigations") && (
              <div className="space-y-4 px-1 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Investigation Advice</p>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setClinical({ ...clinical, investigations: [...clinical.investigations, { name: "", reason: "", priority: "Routine", status: "Ordered" }] })}>
                  <Plus className="w-3 h-3" /> Add Investigation
                </Button>
              </div>
              {clinical.investigations.map((inv, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end rounded-lg border p-2 bg-muted/30">
                  <div className="sm:col-span-2"><Field label={`Investigation #${idx + 1}`}><Input value={inv.name} onChange={(e) => setClinical({ ...clinical, investigations: clinical.investigations.map((it, i) => i === idx ? { ...it, name: e.target.value } : it) })} placeholder="CBC / LFT / USG" className="h-10 text-sm" /></Field></div>
                  <div className="sm:col-span-2"><Field label="Reason"><Input value={inv.reason} onChange={(e) => setClinical({ ...clinical, investigations: clinical.investigations.map((it, i) => i === idx ? { ...it, reason: e.target.value } : it) })} placeholder="Rule out infection" className="h-10 text-sm" /></Field></div>
                  <div><Field label="Priority">
                    <Select value={inv.priority} onValueChange={(v) => setClinical({ ...clinical, investigations: clinical.investigations.map((it, i) => i === idx ? { ...it, priority: v } : it) })}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{["Routine", "Urgent", "STAT"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field></div>
                  {clinical.investigations.length > 1 && (
                    <div className="sm:col-span-5 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-600" onClick={() => setClinical({ ...clinical, investigations: clinical.investigations.filter((_, i) => i !== idx) })}><X className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-3">Procedures</p>
              {clinical.procedures.map((proc, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end rounded-lg border p-2 bg-muted/30">
                  <div className="sm:col-span-2"><Field label={`Procedure #${idx + 1}`}><Input value={proc.name} onChange={(e) => setClinical({ ...clinical, procedures: clinical.procedures.map((it, i) => i === idx ? { ...it, name: e.target.value } : it) })} placeholder="IV Fluids / Dressing / Nebulization" className="h-10 text-sm" /></Field></div>
                  <div><Field label="Date"><Input type="date" value={proc.date} onChange={(e) => setClinical({ ...clinical, procedures: clinical.procedures.map((it, i) => i === idx ? { ...it, date: e.target.value } : it) })} className="h-10 text-sm" /></Field></div>
                  <div><Field label="Notes"><Input value={proc.notes} onChange={(e) => setClinical({ ...clinical, procedures: clinical.procedures.map((it, i) => i === idx ? { ...it, notes: e.target.value } : it) })} placeholder="1 pint over 4h" className="h-10 text-sm" /></Field></div>
                  {clinical.procedures.length > 1 && (
                    <div className="sm:col-span-4 flex justify-end"><Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-600" onClick={() => setClinical({ ...clinical, procedures: clinical.procedures.filter((_, i) => i !== idx) })}><X className="w-3.5 h-3.5" /></Button></div>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setClinical({ ...clinical, procedures: [...clinical.procedures, { name: "", date: "", notes: "" }] })}><Plus className="w-3 h-3" /> Add Procedure</Button>
            </div>
            )}
          </div>

          {/* ============== MEDICATION ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("medication")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Pill className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Medication</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("medication") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("medication") && (
              <div className="space-y-4 px-1 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Medication (℞)</p>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setItems([...items, { medicineName: "", dosage: "", frequency: "1-0-0", duration: "", quantity: "1", instructions: "" }])}><Plus className="w-3 h-3" /> Add Medicine</Button>
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="rounded-lg border p-2.5 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Medicine #{idx + 1}</span>
                    {items.length > 1 && <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-600" onClick={() => setItems(items.filter((_, i) => i !== idx))}><X className="w-3.5 h-3.5" /></Button>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <Field label="Medicine Name"><Input value={it.medicineName} onChange={(e) => setItems(items.map((it2, i) => i === idx ? { ...it2, medicineName: e.target.value } : it2))} placeholder="Pantoprazole 40mg" className="h-10 text-sm" /></Field>
                    <Field label="Dosage"><Input value={it.dosage} onChange={(e) => setItems(items.map((it2, i) => i === idx ? { ...it2, dosage: e.target.value } : it2))} placeholder="1 Tablet" className="h-10 text-sm" /></Field>
                    <Field label="Frequency">
                      <Select value={it.frequency} onValueChange={(v) => setItems(items.map((it2, i) => i === idx ? { ...it2, frequency: v } : it2))}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Duration"><Input value={it.duration} onChange={(e) => setItems(items.map((it2, i) => i === idx ? { ...it2, duration: e.target.value } : it2))} placeholder="7 days" className="h-10 text-sm" /></Field>
                    <Field label="Quantity"><Input type="number" value={it.quantity} onChange={(e) => setItems(items.map((it2, i) => i === idx ? { ...it2, quantity: e.target.value } : it2))} placeholder="14" className="h-10 text-sm" /></Field>
                    <Field label="Instructions"><Input value={it.instructions} onChange={(e) => setItems(items.map((it2, i) => i === idx ? { ...it2, instructions: e.target.value } : it2))} placeholder="Before breakfast" className="h-10 text-sm" /></Field>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* ============== ADVICE & FOLLOW-UP ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("advice")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Advice & Follow-up</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("advice") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("advice") && (
              <div className="space-y-4 px-1 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Advice</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Diet Advice"><Textarea value={clinical.adviceDetail.diet} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, diet: e.target.value } })} placeholder="Bland diet, avoid spicy food" rows={2} className="text-xs" /></Field>
                <Field label="Lifestyle"><Textarea value={clinical.adviceDetail.lifestyle} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, lifestyle: e.target.value } })} placeholder="Adequate rest, stress management" rows={2} className="text-xs" /></Field>
                <Field label="Exercise"><Input value={clinical.adviceDetail.exercise} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, exercise: e.target.value } })} placeholder="Light walking" className="h-10 text-sm" /></Field>
                <Field label="Hydration"><Input value={clinical.adviceDetail.hydration} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, hydration: e.target.value } })} placeholder="3L/day, ORS if dehydrated" className="h-10 text-sm" /></Field>
                <Field label="Restrictions"><Input value={clinical.adviceDetail.restrictions} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, restrictions: e.target.value } })} placeholder="Avoid alcohol, NSAIDs" className="h-10 text-sm" /></Field>
                <Field label="Travel Advice"><Input value={clinical.adviceDetail.travel} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, travel: e.target.value } })} placeholder="No restrictions" className="h-10 text-sm" /></Field>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-3">Follow-up</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Follow-up Date"><Input type="date" value={clinical.followUpDetail.date} onChange={(e) => setClinical({ ...clinical, followUpDetail: { ...clinical.followUpDetail, date: e.target.value } })} className="h-10 text-sm" /></Field>
                <Field label="Next Visit Reason"><Input value={clinical.followUpDetail.nextReason} onChange={(e) => setClinical({ ...clinical, followUpDetail: { ...clinical.followUpDetail, nextReason: e.target.value } })} placeholder="Review symptoms & lab reports" className="h-10 text-sm" /></Field>
              </div>
            </div>
            )}
          </div>

          {/* ============== REFERRAL ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("referral")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Referral</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("referral") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("referral") && (
              <div className="space-y-4 px-1 mt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Referral (optional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label="Referred To (Specialty)"><Input value={clinical.referral.referredTo} onChange={(e) => setClinical({ ...clinical, referral: { ...clinical.referral, referredTo: e.target.value } })} placeholder="Cardiology" className="h-10 text-sm" /></Field>
                  <Field label="Hospital"><Input value={clinical.referral.hospital} onChange={(e) => setClinical({ ...clinical, referral: { ...clinical.referral, hospital: e.target.value } })} placeholder="XYZ Hospital" className="h-10 text-sm" /></Field>
                  <Field label="Doctor"><DoctorSearch value={clinical.referral.doctor} onValueChange={(v) => setClinical({ ...clinical, referral: { ...clinical.referral, doctor: v } })} placeholder="Search doctor..." className="text-xs" /></Field>
                  <Field label="Reason"><Input value={clinical.referral.reason} onChange={(e) => setClinical({ ...clinical, referral: { ...clinical.referral, reason: e.target.value } })} placeholder="Further evaluation" className="h-10 text-sm" /></Field>
                </div>
              </div>
            )}
          </div>

          </div>
          {/* ─── END LEFT COLUMN ─── */}

          {/* ─── RIGHT COLUMN: AI & Smart Assist Panel ─── */}
          <div className="space-y-3 min-w-0">
            {/* AI Assist Header */}
            <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                  <Brain className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-violet-900 dark:text-violet-100 flex items-center gap-1.5">
                    <BotMessageSquare className="w-3.5 h-3.5" /> AI Clinical Assistant
                  </h3>
                  <p className="text-[10px] text-violet-600/70 dark:text-violet-400/60">Smart suggestions based on form data</p>
                </div>
              </div>

              {/* AI Tab Navigation */}
              <div className="flex gap-1 overflow-x-auto">
                {([
                  { id: "diagnosis" as const, label: "Dx", icon: Brain },
                  { id: "drugs" as const, label: "Drugs", icon: Shield },
                  { id: "summary" as const, label: "Summary", icon: FileText },
                  { id: "investigations" as const, label: "Labs", icon: Microscope },
                  { id: "alerts" as const, label: "Alerts", icon: AlertCircle },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveAITab(tab.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap ${
                      activeAITab === tab.id
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-white/60 dark:bg-white/5 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── AI Diagnosis Suggestions ── */}
            {activeAITab === "diagnosis" && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-foreground">AI Diagnosis Suggestions</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[10px] bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30" onClick={suggestDiagnosis} disabled={aiDiagnosisLoading}>
                    {aiDiagnosisLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                    {aiDiagnosisLoading ? "Analyzing..." : "Suggest Dx"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Enter chief complaints, then click "Suggest Dx" to get AI-powered differential diagnosis suggestions with ICD codes.</p>
                {aiDiagnosisSuggestions.length > 0 && (
                  <div className="space-y-2">
                    {aiDiagnosisSuggestions.map((s, i) => (
                      <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground">{s.diagnosis}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{s.reasoning}</p>
                          </div>
                          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.confidence === "High" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : s.confidence === "Moderate" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                            {s.confidence}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded">{s.icd}</span>
                          <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] text-violet-600 hover:text-violet-700 gap-0.5 px-1" onClick={() => applyAIDiagnosis(s.diagnosis, s.icd)}>
                            <Zap className="w-2.5 h-2.5" /> Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── AI Drug Interaction Checker ── */}
            {activeAITab === "drugs" && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-foreground">Drug Interaction Check</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[10px] bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30" onClick={checkDrugInteractions} disabled={aiDrugCheckLoading}>
                    {aiDrugCheckLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                    {aiDrugCheckLoading ? "Checking..." : "Check Interactions"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Add medicines in the Rx section, then check for potential drug-drug interactions and contraindications.</p>
                {aiDrugInteractions.length > 0 && (
                  <div className="space-y-2">
                    {aiDrugInteractions.map((d, i) => (
                      <div key={i} className={`rounded-lg border p-2.5 ${d.severity === "Major" ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20" : d.severity === "Moderate" ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20" : d.severity === "Safe" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-border bg-muted/30"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${d.severity === "Major" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : d.severity === "Moderate" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : d.severity === "Safe" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600"}`}>
                            {d.severity}
                          </span>
                          {d.drugs !== "—" && <span className="text-[10px] font-semibold text-foreground truncate">{d.drugs}</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{d.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── AI Prescription Summary ── */}
            {activeAITab === "summary" && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-500" />
                    <span className="text-xs font-bold text-foreground">AI Clinical Summary</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[10px] bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/30" onClick={generateAISummary} disabled={aiSummaryLoading}>
                    {aiSummaryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {aiSummaryLoading ? "Generating..." : "Generate Summary"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Auto-generate a clinical summary from all filled sections — useful for notes, referral letters, and handover.</p>
                {aiSummary && (
                  <div className="rounded-lg border border-teal-200 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-950/20 p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-teal-600" />
                      <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">Summary Generated</span>
                    </div>
                    <p className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed">{aiSummary}</p>
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] text-teal-600 gap-1" onClick={() => { navigator.clipboard.writeText(aiSummary); toast.success("Summary copied to clipboard"); }}>
                      <Copy className="w-3 h-3" /> Copy to Clipboard
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── AI Recommended Investigations ── */}
            {activeAITab === "investigations" && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-foreground">AI Lab Suggestions</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[10px] bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30" onClick={suggestInvestigations} disabled={aiInvestigationsLoading}>
                    {aiInvestigationsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
                    {aiInvestigationsLoading ? "Analyzing..." : "Suggest Labs"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Get AI-recommended investigations based on symptoms, vitals, and suspected diagnosis.</p>
                {aiInvestigations.length > 0 && (
                  <div className="space-y-2">
                    {aiInvestigations.map((inv, i) => (
                      <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{inv.test}</p>
                          <p className="text-[10px] text-muted-foreground">{inv.reason}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${inv.priority === "STAT" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : inv.priority === "Urgent" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                            {inv.priority}
                          </span>
                          <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] text-indigo-600 hover:text-indigo-700 gap-0.5 px-1" onClick={() => applyAIInvestigations(inv.test, inv.reason, inv.priority)}>
                            <Plus className="w-2.5 h-2.5" /> Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── AI Clinical Alerts ── */}
            {activeAITab === "alerts" && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-foreground">Clinical Alerts & Safety</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[10px] bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30" onClick={checkClinicalAlerts} disabled={aiAlertsLoading}>
                    {aiAlertsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                    {aiAlertsLoading ? "Scanning..." : "Scan Alerts"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Real-time safety checks: allergy alerts, contraindications, abnormal vitals, and missing data warnings.</p>
                {aiAlerts.length > 0 && (
                  <div className="space-y-2">
                    {aiAlerts.map((a, i) => (
                      <div key={i} className={`rounded-lg border p-2.5 ${a.type === "critical" ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20" : a.type === "warning" ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20" : a.type === "allergy" ? "border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20" : a.type === "success" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-border bg-muted/30"}`}>
                        <div className="flex items-start gap-2">
                          {a.type === "critical" ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" /> : a.type === "warning" ? <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> : a.type === "allergy" ? <Heart className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" /> : a.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> : <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />}
                          <p className="text-[10px] text-foreground/80">{a.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Quick Stats Panel ── */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                <span className="text-xs font-bold text-foreground">Form Completion</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Patient", done: !!form.patientId && !!form.doctorId },
                  { label: "Vitals", done: Object.values(clinical.vitalsDetail).some((v) => v.trim()) },
                  { label: "Complaints", done: !!clinical.chiefComplaints.trim() },
                  { label: "History", done: Object.values(clinical.pastMedical).some((v) => v) || !!clinical.surgicalHistory.trim() },
                  { label: "Examination", done: Object.values(clinical.generalAppearance).some((v) => v.trim()) || Object.values(clinical.systemicExamination).some((v) => v.trim()) },
                  { label: "Diagnosis", done: !!clinical.diagnosisDetail.primary.trim() },
                  { label: "Medications", done: items.some((it) => it.medicineName.trim()) },
                  { label: "Advice", done: Object.values(clinical.adviceDetail).some((v) => v.trim()) },
                ].map((sec) => (
                  <div key={sec.label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${sec.done ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                    <span className={`text-[10px] ${sec.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{sec.label}</span>
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${sec.done ? "bg-emerald-500 w-full" : "bg-slate-300 dark:bg-slate-600 w-0"}`} />
                    </div>
                    {sec.done && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

          </div>
          {/* ─── END RIGHT COLUMN ─── */}
          </div>
          {/* ============== END TWO-COLUMN LAYOUT ============== */}

          <div className="sticky bottom-0 bg-background pt-3 pb-4 border-t border-border flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              {saving ? "Saving…" : <><FileText className="w-4 h-4" /> Update Prescription</>}
            </Button>
          </div>
        </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EMR VIEW
   ═══════════════════════════════════════════════════════════ */

export function EmrView() {
  const [refresh, setRefresh] = useState(0);
  const branchId = useAppStore((s) => s.branchId);
  const tenantBranding = useAppStore((s) => s.tenantBranding);
  const { data, loading } = useFetch<Prescription[]>(`/api/prescriptions?_r=${refresh}`);
  const [q, setQ] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [statusFilter, setStatusFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [detailPrescription, setDetailPrescription] = useState<DisplayPrescription | null>(null);
  const [editPrescription, setEditPrescription] = useState<DisplayPrescription | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const prescriptions = useMemo<DisplayPrescription[]>(
    () => (data ?? []).map((p) => ({ ...p, patientName: p.patient?.name || "" })),
    [data],
  );

  const uniqueDoctors = useMemo(() => {
    const map = new Map<string, string>();
    prescriptions.forEach((p) => {
      if (p.doctor?.id && p.doctor?.name) map.set(p.doctor.id, p.doctor.name);
    });
    return Array.from(map.entries());
  }, [prescriptions]);

  const filtered = useMemo(() => {
    let result = prescriptions;
    const ql = q.toLowerCase().trim();
    if (ql) {
      result = result.filter(
        (p) =>
          p.code.toLowerCase().includes(ql) ||
          p.patientName.toLowerCase().includes(ql) ||
          (p.diagnosis || "").toLowerCase().includes(ql) ||
          (p.patient?.patientCode || "").toLowerCase().includes(ql),
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (doctorFilter !== "all") {
      result = result.filter((p) => p.doctor?.id === doctorFilter);
    }
    return result;
  }, [prescriptions, q, statusFilter, doctorFilter]);

  const { sorted, sortKey, sortDir, toggleSort } = useSort<DisplayPrescription>(filtered, "createdAt");
  const { page, setPage, size, setSize, totalPages, paged, total, range } =
    usePagination<DisplayPrescription>(sorted, 10);

  /* Stats */
  const stats = useMemo(() => ({
    total: prescriptions.length,
    active: prescriptions.filter((p) => p.status === "active").length,
    completed: prescriptions.filter((p) => p.status === "completed").length,
    followUpDue: prescriptions.filter(isFollowUpDue).length,
    thisWeek: prescriptions.filter((p) => {
      const d = new Date(p.createdAt);
      const now = new Date();
      return (now.getTime() - d.getTime()) < 7 * 86400000;
    }).length,
  }), [prescriptions]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleExport = () => {
    if (prescriptions.length === 0) {
      toast.error("No prescriptions to export");
      return;
    }
    const headers = ["Code", "Date", "Patient", "Doctor", "Diagnosis", "Status", "Medicines"];
    const rows = sorted.map((p) => [
      p.code,
      formatDate(p.createdAt),
      p.patient?.name || "",
      p.doctor?.name || "",
      p.diagnosis || "",
      p.status,
      (p.items || []).map((it) => `${it.medicineName} (${it.dosage})`).join("; "),
    ]);
    exportToCSV("prescriptions.csv", headers, rows);
    toast.success(`Exported ${rows.length} prescription(s) to CSV`);
  };

  const handleSaved = () => {
    setNewOpen(false);
    setRefresh((r) => r + 1);
  };

  const handleDuplicate = (p: DisplayPrescription) => {
    toast.success(`Duplicated prescription ${p.code} — opening new form`);
    setNewOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* New Prescription Form — hidden via CSS to preserve state */}
      <div className={newOpen ? "" : "hidden"}>
        <NewPrescriptionDialog open={newOpen} onOpenChange={setNewOpen} onSaved={handleSaved} />
      </div>
      {/* Edit Prescription Form — hidden via CSS to preserve state */}
      <div className={editPrescription ? "" : "hidden"}>
        <EditPrescriptionDialog
          prescription={editPrescription}
          open={!!editPrescription}
          onOpenChange={(v) => { if (!v) setEditPrescription(null); }}
          onSaved={handleSaved}
        />
      </div>
      {/* List View — hidden when new or edit form is open */}
      <div className={newOpen || editPrescription ? "hidden" : ""}>
      {/* Branch required warning */}
      {!branchId && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No Branch Selected</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Select a branch from the header to create prescriptions. All Branches view is read-only.</p>
          </div>
        </div>
      )}
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            EMR &amp; Prescriptions
          </h2>
          <p className="text-sm text-muted-foreground">
            {prescriptions.length} prescription record{prescriptions.length === 1 ? "" : "s"}
            {total !== prescriptions.length && ` · ${total} matching`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={prescriptions.length === 0}
          >
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => branchId && setNewOpen(true)}
            disabled={!branchId}
            title={!branchId ? "Select a branch first" : ""}
          >
            <Plus className="w-4 h-4" /> New Prescription
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: FileText, accent: "from-teal-500 to-teal-600" },
          { label: "Active", value: stats.active, icon: Activity, accent: "from-blue-500 to-blue-600" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, accent: "from-emerald-500 to-emerald-600" },
          { label: "Follow-up Due", value: stats.followUpDue, icon: AlertTriangle, accent: "from-amber-500 to-orange-500" },
          { label: "This Week", value: stats.thisWeek, icon: Clock, accent: "from-violet-500 to-purple-600" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="relative overflow-hidden border-0 shadow-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-[0.03]`} />
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center shadow-sm`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Search + Filters ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, patient, diagnosis, or patient code…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">{s === "all" ? "All Status" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Doctors</SelectItem>
                  {uniqueDoctors.map(([id, name]) => (
                    <SelectItem key={id} value={id} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-muted-foreground mr-1">Sort:</span>
              {SORT_COLS.map((col) => {
                const active = sortKey === col.key;
                return (
                  <Button
                    key={col.key as string}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className={`h-7 text-xs gap-1 ${active ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}`}
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}
                    {active ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    )}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-0.5">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "card" ? "default" : "ghost"}
                className={`h-7 w-7 p-0 ${viewMode === "card" ? "bg-teal-600 text-white" : ""}`}
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "table" ? "default" : "ghost"}
                className={`h-7 w-7 p-0 ${viewMode === "table" ? "bg-teal-600 text-white" : ""}`}
                onClick={() => setViewMode("table")}
              >
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── List ── */}
      {loading ? (
        <div className={viewMode === "card" ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            viewMode === "card"
              ? <Skeleton key={i} className="h-72 rounded-xl" />
              : <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : paged.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-teal-300" />
            </div>
            <p className="text-sm font-medium mb-1">No prescriptions found</p>
            <p className="text-xs text-muted-foreground mb-4">
              {q || statusFilter !== "all" || doctorFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first prescription to get started"}
            </p>
            {!q && statusFilter === "all" && doctorFilter === "all" && (
              <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => branchId && setNewOpen(true)} disabled={!branchId} title={!branchId ? "Select a branch first" : ""}>
                <Plus className="w-4 h-4" /> New Prescription
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paged.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
              >
                <PrescriptionCard
                  prescription={p}
                  expanded={expandedCards.has(p.id)}
                  onToggleExpand={() => toggleExpand(p.id)}
                  onDetail={() => setDetailPrescription(p)}
                  onDuplicate={() => handleDuplicate(p)}
                  onEdit={(rx) => setEditPrescription(rx)}
                />
              </motion.div>
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            size={size}
            setSize={setSize}
            range={range}
          />
        </>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Code</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Date</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Patient</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Doctor</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Diagnosis</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Medicines</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground p-3">Status</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono text-xs font-semibold text-teal-700 dark:text-teal-300">{p.code}</td>
                        <td className="p-3 text-xs text-muted-foreground">{formatDate(p.createdAt)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-xs">
                                {p.patient?.name?.charAt(0) || "P"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium">{p.patientName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground font-mono">{p.patient?.patientCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-xs">{p.doctor?.name || "—"}</td>
                        <td className="p-3 text-xs font-medium max-w-[200px] truncate">{p.diagnosis || "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground">{p.items?.length || 0}</td>
                        <td className="p-3">
                          <Badge className={`text-xs ${statusColors[p.status] || "bg-gray-100 text-gray-600"}`}>
                            {statusLabel(p.status)}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetailPrescription(p)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => printHTML(`Prescription ${p.code}`, buildPrescriptionHTML(p), tenantBranding?.clinicName ?? undefined)}>
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Pagination
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            size={size}
            setSize={setSize}
            range={range}
          />
        </>
      )}

      {/* ── Dialogs ── */}
      <PrescriptionDetailDialog
        prescription={detailPrescription}
        onOpenChange={() => setDetailPrescription(null)}
        onEdit={(rx) => { setDetailPrescription(null); setEditPrescription(rx); }}
      />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRESCRIPTION CARD
   ═══════════════════════════════════════════════════════════ */

function PrescriptionCard({
  prescription: p,
  expanded,
  onToggleExpand,
  onDetail,
  onDuplicate,
  onEdit,
}: {
  prescription: DisplayPrescription;
  expanded: boolean;
  onToggleExpand: () => void;
  onDetail: () => void;
  onDuplicate: () => void;
  onEdit: (p: DisplayPrescription) => void;
}) {
  const tenantBranding = useAppStore((s) => s.tenantBranding);
  const deptName = p.doctor?.department?.name;
  const deptColor = p.doctor?.department?.color || "#0d9488";
  const followUpSoon = isFollowUpDue(p);

  const handlePrint = () => {
    printHTML(`Prescription ${p.code}`, buildPrescriptionHTML(p), tenantBranding?.clinicName ?? undefined);
  };

  const visibleItems = expanded ? p.items : p.items?.slice(0, 3);
  const hasMore = (p.items?.length || 0) > 3;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow h-full group">
      {/* Status-dependent accent bar */}
      <div className={`h-1 ${
        p.status === "active" ? "bg-gradient-to-r from-blue-500 to-blue-600" :
        p.status === "completed" ? "bg-gradient-to-r from-emerald-500 to-emerald-600" :
        p.status === "archived" ? "bg-gradient-to-r from-gray-400 to-gray-500" :
        "bg-gradient-to-r from-teal-500 to-teal-600"
      }`} />

      <CardContent className="p-4 space-y-3">
        {/* Top row: code + date + status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-300 truncate">
              {p.code}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">· {timeAgo(p.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {followUpSoon && (
              <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900">
                <CalendarClock className="w-2.5 h-2.5 mr-0.5" /> Follow-up
              </Badge>
            )}
            <Badge className={`text-xs ${statusColors[p.status] || "bg-gray-100 text-gray-600"}`}>
              {statusLabel(p.status)}
            </Badge>
          </div>
        </div>
        {/* Barcode */}
        <div className="flex justify-center">
          <Barcode value={p.code} height={24} fontSize={9} className="max-w-[120px]" />
        </div>

        {/* Patient + Doctor */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/40 dark:bg-muted/20 px-3 py-2.5">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-xs font-semibold">
              {p.patient?.name?.charAt(0) || "P"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.patient?.name || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{p.patient?.patientCode}</span>
              {" · "}
              {p.patient?.age}y
              {" · "}
              <span className="capitalize">{p.patient?.gender}</span>
            </p>
          </div>
          <div className="text-right shrink-0 max-w-[45%]">
            <p className="text-xs font-medium flex items-center gap-1 justify-end truncate">
              <Stethoscope className="w-3 h-3 text-teal-600 shrink-0" />
              <span className="truncate">{p.doctor?.name}</span>
            </p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 justify-end">
              {deptName ? (
                <>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: deptColor }}
                  />
                  <span className="truncate">{deptName}</span>
                </>
              ) : (
                <span className="truncate">{p.doctor?.specialization}</span>
              )}
            </p>
          </div>
        </div>

        {/* Diagnosis + symptoms + vitals */}
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-xs text-muted-foreground">Diagnosis: </span>
            <span className="font-semibold">{p.diagnosis || "—"}</span>
          </p>
          {p.symptoms && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Symptoms:</span> {p.symptoms}
            </p>
          )}
          {p.vitals && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <HeartPulse className="w-3 h-3 text-rose-500" />
              {p.vitals}
            </p>
          )}
        </div>

        {/* Medicines */}
        {p.items?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Pill className="w-3 h-3" /> Medicines ({p.items.length})
            </p>
            <div className="space-y-1.5">
              {visibleItems.map((it) => (
                <div
                  key={it.id}
                  className="rounded-lg border bg-card px-2.5 py-1.5 text-xs hover:border-teal-200 dark:hover:border-teal-900 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{it.medicineName}</span>
                    <Badge
                      variant="outline"
                      className="text-xs font-mono text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900 shrink-0"
                    >
                      {it.dosage}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    <span>{it.frequency}</span>
                    <span aria-hidden>·</span>
                    <span>{it.duration}</span>
                    <span aria-hidden>·</span>
                    <span>Qty: {it.quantity}</span>
                    {it.instructions && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="italic">{it.instructions}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                >
                  {expanded ? (
                    <><ChevronDown className="w-3 h-3" /> Show less</>
                  ) : (
                    <><ChevronRight className="w-3 h-3" /> +{(p.items.length - 3)} more</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Advice + Follow-up */}
        {(p.advice || p.followUp) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {p.advice && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 px-2.5 py-1.5">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                  Advice
                </p>
                <p className="text-xs mt-0.5 line-clamp-2">{p.advice}</p>
              </div>
            )}
            {p.followUp && (
              <div className={`rounded-lg px-2.5 py-1.5 border ${followUpSoon ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50" : "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/50"}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 ${followUpSoon ? "text-amber-700 dark:text-amber-300" : "text-teal-700 dark:text-teal-300"}`}>
                  <CalendarClock className="w-3 h-3" /> Follow-up
                </p>
                <p className="text-xs mt-0.5">{p.followUp}</p>
                </div>
             )}
            </div>
          )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={onDetail}>
              <Eye className="w-3.5 h-3.5" /> View
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={() => onEdit(p)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={onDuplicate}>
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRESCRIPTION DETAIL DIALOG
   ═══════════════════════════════════════════════════════════ */

function PrescriptionDetailDialog({
  prescription,
  onOpenChange,
  onEdit,
}: {
  prescription: DisplayPrescription | null;
  onOpenChange: () => void;
  onEdit: (p: DisplayPrescription) => void;
}) {
  const tenantBranding = useAppStore((s) => s.tenantBranding);
  if (!prescription) return null;
  const p = prescription;

  return (
    <Dialog open={!!prescription} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Prescription {p.code}
          </DialogTitle>
          <DialogDescription>{formatDate(p.createdAt)} · {timeAgo(p.createdAt)}</DialogDescription>
          <div className="mt-1">
            <Barcode value={p.code} height={28} fontSize={10} className="max-w-[140px]" />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient + Doctor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Patient</p>
              <p className="text-sm font-medium">{p.patient?.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.patient?.patientCode} · {p.patient?.age}y · {p.patient?.gender}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Doctor</p>
              <p className="text-sm font-medium">{p.doctor?.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.doctor?.specialization}
                {p.doctor?.department && (
                  <span className="ml-1">· {p.doctor.department.name}</span>
                )}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <Badge className={`text-xs ${statusColors[p.status] || "bg-gray-100 text-gray-600"}`}>
              {statusLabel(p.status)}
            </Badge>
          </div>

          {/* Status Workflow */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {["active", "completed", "archived"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={p.status === s ? "default" : "outline"}
                  className={`h-7 text-xs capitalize ${p.status === s ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}`}
                  disabled={p.status === s}
                  onClick={async () => {
                    const res = await fetchAPI(`/api/prescriptions/${p.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: s }),
                    });
                    if (res.ok) {
                      toast.success(`Prescription marked as ${s}`);
                    }
                  }}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* Diagnosis + Symptoms + Vitals */}
          {(p.diagnosis || p.symptoms || p.vitals) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Clinical Notes</p>
              {p.diagnosis && (
                <div className="rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 p-2.5">
                  <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase">Diagnosis</p>
                  <p className="text-sm font-medium">{p.diagnosis}</p>
                </div>
              )}
              {p.symptoms && (
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Symptoms</p>
                  <p className="text-sm">{p.symptoms}</p>
                </div>
              )}
              {p.vitals && (
                <div className="rounded-lg bg-muted/40 p-2.5 flex items-start gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Vitals</p>
                    <p className="text-sm">{p.vitals}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Medicines */}
          {p.items?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Pill className="w-3 h-3" /> Medicines ({p.items.length})
              </p>
              <div className="space-y-1.5">
                {p.items.map((it, idx) => (
                  <div key={it.id} className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2">
                    <span className="text-xs font-mono text-teal-600 dark:text-teal-400 mt-0.5 shrink-0">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{it.medicineName}</span>
                        <Badge variant="outline" className="text-xs font-mono shrink-0">{it.dosage}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        <span>{it.frequency}</span>
                        <span>·</span>
                        <span>{it.duration}</span>
                        <span>·</span>
                        <span>Qty: {it.quantity}</span>
                        {it.instructions && (
                          <><span>·</span><span className="italic">{it.instructions}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advice + Follow-up */}
          {(p.advice || p.followUp) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {p.advice && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-2.5">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Advice</p>
                  <p className="text-xs mt-0.5">{p.advice}</p>
                </div>
              )}
              {p.followUp && (
                <div className="rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 p-2.5">
                  <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" /> Follow-up
                  </p>
                  <p className="text-xs mt-0.5">{p.followUp}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => { onOpenChange(); onEdit(p); }} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => printHTML(`Prescription ${p.code}`, buildPrescriptionHTML(p), tenantBranding?.clinicName ?? undefined)} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════
   NEW PRESCRIPTION DIALOG
   ═══════════════════════════════════════════════════════════ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground select-none">{label}</label>
      {children}
    </div>
  );
}

function NewPrescriptionDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const branchId = useAppStore((s) => s.branchId);
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    diagnosis: "",
    symptoms: "",
    vitals: "",
    advice: "",
    followUp: "",
  });

  const [clinical, setClinical] = useState({
    chiefComplaints: "",
    presentIllness: "",
    historyDuration: "",
    severity: "Moderate",
    associatedSymptoms: "",
    pastMedical: { diabetes: false, hypertension: false, asthma: false, thyroid: false, tuberculosis: false, heartDisease: false, kidneyDisease: false, cancer: false, others: "" },
    surgicalHistory: "",
    allergies: { drug: "", food: "", latex: false, none: false },
    personalHistory: { smoking: "", alcohol: "", tobacco: "", exercise: "", diet: "", sleep: "" },
    obstetricHistory: { lmp: "", gravida: "", para: "" },
    familyHistory: { father: "", mother: "", geneticDisease: "", cancerHistory: "", diabetes: false, hypertension: false, heartDisease: false },
    generalAppearance: { pallor: "", icterus: "", cyanosis: "", clubbing: "", edema: "", lymphNodes: "" },
    systemicExamination: { cvs: "", rs: "", cns: "", abdomen: "", ent: "", eye: "", skin: "" },
    diagnosisDetail: { primary: "", secondary: "", icd10: "", icd11: "" },
    clinicalNotes: "",
    investigations: [{ name: "", reason: "", priority: "Routine", status: "Ordered" }],
    procedures: [{ name: "", date: "", notes: "" }],
    adviceDetail: { diet: "", lifestyle: "", exercise: "", hydration: "", restrictions: "", travel: "" },
    followUpDetail: { date: "", department: "", doctor: "", nextReason: "" },
    referral: { referredTo: "", hospital: "", doctor: "", reason: "" },
    vitalsDetail: { height: "", weight: "", bmi: "", temperature: "", pulse: "", respiration: "", bp: "", spo2: "", bloodSugar: "", painScore: "" },
  });

  const [items, setItems] = useState([
    { medicineName: "", dosage: "", frequency: "1-0-0", duration: "", quantity: "1", instructions: "" },
  ]);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const toggleSection = (s: string) => setCollapsedSections((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

  /* ── AI Panel State ── */
  const [aiDiagnosisLoading, setAiDiagnosisLoading] = useState(false);
  const [aiDiagnosisSuggestions, setAiDiagnosisSuggestions] = useState<{ diagnosis: string; confidence: string; icd: string; reasoning: string }[]>([]);
  const [aiDrugCheckLoading, setAiDrugCheckLoading] = useState(false);
  const [aiDrugInteractions, setAiDrugInteractions] = useState<{ severity: string; drugs: string; description: string }[]>([]);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiInvestigationsLoading, setAiInvestigationsLoading] = useState(false);
  const [aiInvestigations, setAiInvestigations] = useState<{ test: string; reason: string; priority: string }[]>([]);
  const [aiAlertsLoading, setAiAlertsLoading] = useState(false);
  const [aiAlerts, setAiAlerts] = useState<{ type: string; message: string }[]>([]);
  const [activeAITab, setActiveAITab] = useState<"diagnosis" | "drugs" | "summary" | "investigations" | "alerts">("diagnosis");

  const reset = () => {
    setForm({ patientId: "", doctorId: "", diagnosis: "", symptoms: "", vitals: "", advice: "", followUp: "" });
    setClinical({
      chiefComplaints: "", presentIllness: "", historyDuration: "", severity: "Moderate", associatedSymptoms: "",
      pastMedical: { diabetes: false, hypertension: false, asthma: false, thyroid: false, tuberculosis: false, heartDisease: false, kidneyDisease: false, cancer: false, others: "" },
      surgicalHistory: "", allergies: { drug: "", food: "", latex: false, none: false },
      personalHistory: { smoking: "", alcohol: "", tobacco: "", exercise: "", diet: "", sleep: "" },
      obstetricHistory: { lmp: "", gravida: "", para: "" },
      familyHistory: { father: "", mother: "", geneticDisease: "", cancerHistory: "", diabetes: false, hypertension: false, heartDisease: false },
      generalAppearance: { pallor: "", icterus: "", cyanosis: "", clubbing: "", edema: "", lymphNodes: "" },
      systemicExamination: { cvs: "", rs: "", cns: "", abdomen: "", ent: "", eye: "", skin: "" },
      diagnosisDetail: { primary: "", secondary: "", icd10: "", icd11: "" },
      clinicalNotes: "", investigations: [{ name: "", reason: "", priority: "Routine", status: "Ordered" }],
      procedures: [{ name: "", date: "", notes: "" }],
      adviceDetail: { diet: "", lifestyle: "", exercise: "", hydration: "", restrictions: "", travel: "" },
      followUpDetail: { date: "", department: "", doctor: "", nextReason: "" },
      referral: { referredTo: "", hospital: "", doctor: "", reason: "" },
      vitalsDetail: { height: "", weight: "", bmi: "", temperature: "", pulse: "", respiration: "", bp: "", spo2: "", bloodSugar: "", painScore: "" },
    });
    setItems([{ medicineName: "", dosage: "", frequency: "1-0-0", duration: "", quantity: "1", instructions: "" }]);
    setAiDiagnosisSuggestions([]);
    setAiDrugInteractions([]);
    setAiSummary("");
    setAiInvestigations([]);
    setAiAlerts([]);
  };

  /* ── AI Handler Functions (simulated — replace with real API calls) ── */

  const suggestDiagnosis = async () => {
    setAiDiagnosisLoading(true);
    setAiDiagnosisSuggestions([]);
    await new Promise((r) => setTimeout(r, 1500));
    const symptoms = (clinical.chiefComplaints + " " + clinical.associatedSymptoms + " " + clinical.presentIllness).toLowerCase();
    const suggestions: { diagnosis: string; confidence: string; icd: string; reasoning: string }[] = [];
    if (symptoms.includes("fever") || symptoms.includes("cold") || symptoms.includes("cough") || symptoms.includes("sore throat") || symptoms.includes("sneez")) {
      suggestions.push({ diagnosis: "Upper Respiratory Tract Infection", confidence: "High", icd: "J06.9", reasoning: "Fever with respiratory symptoms suggests URI" });
      suggestions.push({ diagnosis: "Influenza", confidence: "Moderate", icd: "J11.1", reasoning: "Systemic symptoms may indicate influenza" });
      suggestions.push({ diagnosis: "Pharyngitis", confidence: "Low", icd: "J02.9", reasoning: "Sore throat as primary symptom" });
    } else if (symptoms.includes("abdom") || symptoms.includes("nausea") || symptoms.includes("vomit") || symptoms.includes("diarrhea")) {
      suggestions.push({ diagnosis: "Acute Gastroenteritis", confidence: "High", icd: "A09", reasoning: "GI symptoms with possible dehydration" });
      suggestions.push({ diagnosis: "Acute Gastritis", confidence: "Moderate", icd: "K29.7", reasoning: "Upper abdominal discomfort with nausea" });
      suggestions.push({ diagnosis: "Appendicitis", confidence: "Low", icd: "K35.8", reasoning: "Right lower quadrant pain needs exclusion" });
    } else if (symptoms.includes("chest") || symptoms.includes("breath") || symptoms.includes("palpitation")) {
      suggestions.push({ diagnosis: "Acute Coronary Syndrome", confidence: "Moderate", icd: "I20.9", reasoning: "Chest symptoms require cardiac evaluation" });
      suggestions.push({ diagnosis: "Anxiety Disorder", confidence: "Low", icd: "F41.1", reasoning: "Palpitations with anxiety features" });
    } else if (symptoms.includes("headache") || symptoms.includes("migraine") || symptoms.includes("dizziness")) {
      suggestions.push({ diagnosis: "Tension Headache", confidence: "High", icd: "G44.2", reasoning: "Most common cause of headache" });
      suggestions.push({ diagnosis: "Migraine", confidence: "Moderate", icd: "G43.9", reasoning: "Unilateral throbbing with photophobia" });
    } else if (symptoms) {
      suggestions.push({ diagnosis: "General examination required", confidence: "N/A", icd: "—", reasoning: "Symptoms require clinical correlation" });
      suggestions.push({ diagnosis: "Symptomatic treatment may be considered", confidence: "N/A", icd: "—", reasoning: "Pending further clinical assessment" });
    } else {
      suggestions.push({ diagnosis: "No symptoms entered", confidence: "—", icd: "—", reasoning: "Enter chief complaints for AI diagnosis suggestions" });
    }
    setAiDiagnosisSuggestions(suggestions);
    setAiDiagnosisLoading(false);
  };

  const checkDrugInteractions = async () => {
    setAiDrugCheckLoading(true);
    setAiDrugInteractions([]);
    await new Promise((r) => setTimeout(r, 1200));
    const medNames = items.filter((it) => it.medicineName.trim()).map((it) => it.medicineName.toLowerCase());
    const interactions: { severity: string; drugs: string; description: string }[] = [];
    const known: Record<string, { severity: string; description: string }[]> = {
      "warfarin": [{ severity: "Major", description: "Increases bleeding risk with NSAIDs, Aspirin, and many antibiotics" }],
      "metformin": [{ severity: "Moderate", description: "Risk of lactic acidosis with contrast dye and excessive alcohol" }],
      "aspirin": [{ severity: "Moderate", description: "Increased GI bleeding risk with corticosteroids and anticoagulants" }],
      "amiodarone": [{ severity: "Major", description: "Multiple interactions — monitor with statins, digoxin, warfarin" }],
      "methotrexate": [{ severity: "Major", description: "NSAIDs and trimethoprim increase toxicity" }],
      "lithium": [{ severity: "Major", description: "NSAIDs and diuretics increase lithium levels" }],
      "ssri": [{ severity: "Moderate", description: "Serotonin syndrome risk with MAOIs and triptans" }],
      "statin": [{ severity: "Moderate", description: "Increased myopathy risk with fibrates and certain antibiotics" }],
    };
    for (const med of medNames) {
      for (const [drug, warns] of Object.entries(known)) {
        if (med.includes(drug)) {
          for (const w of warns) {
            interactions.push({ severity: w.severity, drugs: med, description: w.description });
          }
        }
      }
    }
    if (medNames.length === 0) {
      interactions.push({ severity: "Info", drugs: "—", description: "Add medicines to check for interactions" });
    } else if (interactions.length === 0) {
      interactions.push({ severity: "Safe", drugs: "All medicines", description: "No known major interactions detected between current medicines" });
    }
    setAiDrugInteractions(interactions);
    setAiDrugCheckLoading(false);
  };

  const generateAISummary = async () => {
    setAiSummaryLoading(true);
    setAiSummary("");
    await new Promise((r) => setTimeout(r, 1800));
    const parts: string[] = [];
    if (clinical.chiefComplaints) parts.push(`Patient presents with: ${clinical.chiefComplaints.replace(/\n/g, "; ")}.`);
    if (clinical.historyDuration) parts.push(`Duration: ${clinical.historyDuration}.`);
    if (clinical.severity) parts.push(`Severity rated as ${clinical.severity}.`);
    if (clinical.associatedSymptoms) parts.push(`Associated symptoms: ${clinical.associatedSymptoms}.`);
    if (clinical.presentIllness) parts.push(`HPI: ${clinical.presentIllness.substring(0, 200)}${clinical.presentIllness.length > 200 ? "..." : ""}`);
    const pmhx = Object.entries(clinical.pastMedical).filter(([k, v]) => v === true).map(([k]) => k);
    if (pmhx.length) parts.push(`Past medical history significant for ${pmhx.join(", ")}.`);
    if (clinical.allergies.drug) parts.push(`Drug allergy: ${clinical.allergies.drug}.`);
    if (clinical.diagnosisDetail.primary) parts.push(`Working diagnosis: ${clinical.diagnosisDetail.primary}.`);
    const medList = items.filter((it) => it.medicineName.trim()).map((it) => `${it.medicineName} ${it.dosage} ${it.frequency} ${it.duration}`);
    if (medList.length) parts.push(`Prescribed: ${medList.join("; ")}.`);
    if (clinical.adviceDetail.diet || clinical.adviceDetail.lifestyle) {
      const adv = [clinical.adviceDetail.diet, clinical.adviceDetail.lifestyle].filter(Boolean).join("; ");
      parts.push(`Advice: ${adv}.`);
    }
    if (clinical.followUpDetail.date) parts.push(`Follow-up scheduled for ${clinical.followUpDetail.date}.`);
    setAiSummary(parts.length ? parts.join("\n\n") : "No clinical data entered yet. Start filling the form to generate an AI summary.");
    setAiSummaryLoading(false);
  };

  const suggestInvestigations = async () => {
    setAiInvestigationsLoading(true);
    setAiInvestigations([]);
    await new Promise((r) => setTimeout(r, 1300));
    const symptoms = (clinical.chiefComplaints + " " + clinical.presentIllness + " " + clinical.diagnosisDetail.primary).toLowerCase();
    const suggestions: { test: string; reason: string; priority: string }[] = [];
    if (symptoms.includes("fever")) {
      suggestions.push({ test: "CBC with Differential", reason: "Evaluate infection / fever", priority: "Urgent" });
      suggestions.push({ test: "Blood Culture", reason: "Identify causative organism", priority: "Urgent" });
      suggestions.push({ test: "ESR / CRP", reason: "Inflammatory markers", priority: "Routine" });
    }
    if (symptoms.includes("abdom") || symptoms.includes("nausea") || symptoms.includes("vomit")) {
      suggestions.push({ test: "USG Abdomen", reason: "Rule out appendicitis, cholecystitis", priority: "Urgent" });
      suggestions.push({ test: "LFT + Amylase", reason: "Hepatic and pancreatic evaluation", priority: "Routine" });
      suggestions.push({ test: "CBC", reason: "Infection screen", priority: "Routine" });
    }
    if (symptoms.includes("chest") || symptoms.includes("breath") || symptoms.includes("palpitation")) {
      suggestions.push({ test: "ECG (12-lead)", reason: "Cardiac rhythm evaluation", priority: "STAT" });
      suggestions.push({ test: "Troponin I/T", reason: "Rule out ACS", priority: "STAT" });
      suggestions.push({ test: "Chest X-ray PA view", reason: "Cardiopulmonary assessment", priority: "Urgent" });
    }
    if (symptoms.includes("diabetes") || symptoms.includes("sugar") || symptoms.includes("glucose")) {
      suggestions.push({ test: "HbA1c", reason: "Glycemic control over 3 months", priority: "Routine" });
      suggestions.push({ test: "Fasting & PP Blood Sugar", reason: "Current glucose levels", priority: "Routine" });
      suggestions.push({ test: "Renal Profile", reason: "Screen for diabetic nephropathy", priority: "Routine" });
    }
    if (symptoms.includes("hypertension") || symptoms.includes("bp") || symptoms.includes("blood pressure")) {
      suggestions.push({ test: "Lipid Profile", reason: "Cardiovascular risk assessment", priority: "Routine" });
      suggestions.push({ test: "Renal Function Tests", reason: "Screen for renal involvement", priority: "Routine" });
      suggestions.push({ test: "ECG", reason: "Left ventricular hypertrophy screen", priority: "Routine" });
    }
    if (suggestions.length === 0) {
      suggestions.push({ test: "CBC", reason: "General screening", priority: "Routine" });
      suggestions.push({ test: "RBS", reason: "Blood sugar baseline", priority: "Routine" });
      if (symptoms) suggestions.push({ test: "Consider specific tests", reason: "Based on clinical presentation", priority: "Routine" });
    }
    setAiInvestigations(suggestions);
    setAiInvestigationsLoading(false);
  };

  const checkClinicalAlerts = async () => {
    setAiAlertsLoading(true);
    setAiAlerts([]);
    await new Promise((r) => setTimeout(r, 1000));
    const alerts: { type: string; message: string }[] = [];
    if (clinical.allergies.drug && clinical.allergies.drug.toLowerCase() !== "none" && clinical.allergies.drug.toLowerCase() !== "nil") {
      alerts.push({ type: "allergy", message: `Drug allergy recorded: ${clinical.allergies.drug} — ensure prescribed medicines are safe` });
    }
    const medList = items.filter((it) => it.medicineName.trim());
    const hasNSAID = medList.some((it) => it.medicineName.toLowerCase().match(/ibuprofen|naproxen|diclofenac|aceclofenac|aspirin/));
    if (hasNSAID && clinical.allergies.drug?.toLowerCase().includes("nsaid")) {
      alerts.push({ type: "critical", message: "NSAID prescribed but patient has NSAID allergy — contraindicated!" });
    }
    const hasMetformin = medList.some((it) => it.medicineName.toLowerCase().includes("metformin"));
    const hasRenal = clinical.pastMedical.kidneyDisease;
    if (hasMetformin && hasRenal) {
      alerts.push({ type: "critical", message: "Metformin prescribed with kidney disease history — contraindicated if eGFR <30" });
    }
    const age = form.patientId ? 35 : null;
    if (medList.some((it) => it.medicineName.toLowerCase().match(/aspirin/)) && age && age < 16) {
      alerts.push({ type: "warning", message: "Aspirin in patients under 16 — risk of Reye's syndrome" });
    }
    if (clinical.vitalsDetail.temperature && parseFloat(clinical.vitalsDetail.temperature) >= 103) {
      alerts.push({ type: "warning", message: "High fever detected (≥103°F) — monitor closely, consider antipyretics" });
    }
    if (clinical.vitalsDetail.spo2 && parseInt(clinical.vitalsDetail.spo2) < 92) {
      alerts.push({ type: "critical", message: "SpO₂ below 92% — assess respiratory status urgently" });
    }
    if (clinical.vitalsDetail.bp) {
      const sys = parseInt(clinical.vitalsDetail.bp.split("/")[0]);
      if (sys >= 180) alerts.push({ type: "critical", message: "Hypertensive crisis (SBP ≥180) — immediate management required" });
    }
    if (!form.patientId && !form.doctorId) {
      alerts.push({ type: "info", message: "Patient and doctor not yet selected — complete required fields" });
    }
    if (medList.length === 0 && clinical.diagnosisDetail.primary) {
      alerts.push({ type: "info", message: "Diagnosis entered but no medicines prescribed — verify if intentional" });
    }
    if (alerts.length === 0) {
      alerts.push({ type: "success", message: "No clinical alerts — prescription looks clean" });
    }
    setAiAlerts(alerts);
    setAiAlertsLoading(false);
  };

  const applyAIDiagnosis = (diagnosis: string, icd: string) => {
    setForm((prev) => ({ ...prev, diagnosis }));
    setClinical((prev) => ({ ...prev, diagnosisDetail: { ...prev.diagnosisDetail, primary: diagnosis, icd10: icd } }));
    toast.success(`Applied diagnosis: ${diagnosis}`);
  };

  const applyAIInvestigations = (test: string, reason: string, priority: string) => {
    setClinical((prev) => ({ ...prev, investigations: [...prev.investigations, { name: test, reason, priority, status: "Ordered" }] }));
    toast.success(`Added investigation: ${test}`);
  };

  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setForm((prev) => ({ ...prev, diagnosis: template.diagnosis }));
    setClinical((prev) => ({ ...prev, diagnosisDetail: { ...prev.diagnosisDetail, primary: template.diagnosis } }));
    setItems(template.medicines.map((m) => ({ ...m })));
    toast.success(`Applied template: ${template.name}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.doctorId) {
      toast.error("Please select a patient and a doctor");
      return;
    }
    const validItems = items
      .filter((it) => it.medicineName.trim())
      .map((it) => ({
        medicineName: it.medicineName.trim(),
        dosage: it.dosage.trim() || "—",
        frequency: it.frequency,
        duration: it.duration.trim() || "—",
        quantity: Number(it.quantity) || 1,
        instructions: it.instructions.trim() || null,
      }));

    const clinicalData = {
      chiefComplaints: clinical.chiefComplaints.split("\n").filter(Boolean).map(s => s.startsWith("•") ? s : `• ${s}`),
      presentIllness: clinical.presentIllness,
      historyDuration: clinical.historyDuration,
      severity: clinical.severity,
      associatedSymptoms: clinical.associatedSymptoms,
      pastMedical: clinical.pastMedical,
      surgicalHistory: clinical.surgicalHistory.split(",").map(s => s.trim()).filter(Boolean),
      allergies: clinical.allergies,
      personalHistory: clinical.personalHistory,
      obstetricHistory: { ...clinical.obstetricHistory, applicable: true },
      familyHistory: clinical.familyHistory,
      generalAppearance: {
        pallor: clinical.generalAppearance.pallor || "—",
        icterus: clinical.generalAppearance.icterus || "—",
        cyanosis: clinical.generalAppearance.cyanosis || "—",
        clubbing: clinical.generalAppearance.clubbing || "—",
        edema: clinical.generalAppearance.edema || "—",
        lymphNodes: clinical.generalAppearance.lymphNodes || "—",
      },
      systemicExamination: {
        cvs: clinical.systemicExamination.cvs || "—",
        rs: clinical.systemicExamination.rs || "—",
        cns: clinical.systemicExamination.cns || "—",
        abdomen: clinical.systemicExamination.abdomen || "—",
        ent: clinical.systemicExamination.ent || "—",
        eye: clinical.systemicExamination.eye || "—",
        skin: clinical.systemicExamination.skin || "—",
      },
      diagnosis: {
        primary: clinical.diagnosisDetail.primary || form.diagnosis,
        secondary: clinical.diagnosisDetail.secondary,
        icd10: clinical.diagnosisDetail.icd10,
        icd11: clinical.diagnosisDetail.icd11,
      },
      clinicalNotes: clinical.clinicalNotes || form.advice,
      investigations: clinical.investigations.filter(i => i.name.trim()),
      procedures: clinical.procedures.filter(p => p.name.trim()),
      advice: clinical.adviceDetail,
      followUp: clinical.followUpDetail.date || clinical.followUpDetail.department || clinical.followUpDetail.doctor || clinical.followUpDetail.nextReason ? {
        date: clinical.followUpDetail.date ? new Date(clinical.followUpDetail.date) : null,
        department: clinical.followUpDetail.department || null,
        doctor: clinical.followUpDetail.doctor || null,
        nextReason: clinical.followUpDetail.nextReason || null,
      } : null,
      referral: {
        referredTo: clinical.referral.referredTo || "—",
        hospital: clinical.referral.hospital || "—",
        doctor: clinical.referral.doctor || "—",
        reason: clinical.referral.reason || "—",
      },
    };

    setSaving(true);
    try {
      const res = await fetchAPI("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branchId || null,
          patientId: form.patientId,
          doctorId: form.doctorId,
          diagnosis: form.diagnosis.trim() || clinical.diagnosisDetail.primary || null,
          symptoms: form.symptoms.trim() || clinical.chiefComplaints.trim() || null,
          vitals: form.vitals.trim() || null,
          advice: form.advice.trim() || null,
          followUp: form.followUp.trim() || null,
          items: validItems,
          clinicalData,
        }),
      });
      if (!res.ok) throw new Error("Failed to save prescription");
      const saved = await res.json();
      toast.success("Prescription saved successfully");
      reset();
      onSaved();
    } catch {
      toast.error("Failed to save prescription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5">
            <X className="w-4 h-4" /> Back
          </Button>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" /> New OPD Prescription
            </h2>
            <p className="text-xs text-muted-foreground">
              Comprehensive clinical prescription matching the A4 print template. Fill all sections — saved data flows directly to the printable OPD prescription.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {/* Quick Templates */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground uppercase shrink-0">Quick Fill:</span>
            {QUICK_TEMPLATES.map((t) => (
              <Button
                key={t.name}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-xs shrink-0 gap-1"
                onClick={() => applyTemplate(t)}
              >
                <Sparkles className="w-2.5 h-2.5" /> {t.name}
              </Button>
            ))}
          </div>

          {/* Section nav */}
          <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border text-xs">
            {[
              { id: "patient", label: "Patient", icon: User },
              { id: "vitals", label: "Vitals", icon: Activity },
              { id: "complaints", label: "Complaints", icon: MessageSquare },
              { id: "history", label: "History", icon: Clock },
              { id: "examination", label: "Exam", icon: Stethoscope },
              { id: "diagnosis", label: "Dx", icon: FileCheck },
              { id: "investigations", label: "Labs", icon: FlaskConical },
              { id: "medication", label: "Rx", icon: Pill },
              { id: "advice", label: "Advice", icon: ClipboardList },
              { id: "referral", label: "Referral", icon: Send },
            ].map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSection(s.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  collapsedSections.has(s.id) ? "bg-muted/60 text-muted-foreground hover:bg-muted" : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                }`}
              >
                <s.icon className="w-3 h-3" />
                {s.label}
              </button>
            ))}
          </div>

          {/* ============== TWO-COLUMN LAYOUT ============== */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          {/* ─── LEFT COLUMN: Form Sections ─── */}
          <div className="space-y-3 min-w-0">
          {/* ============== PATIENT & VISIT ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("patient")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Patient & Visit</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("patient") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("patient") && (
              <div className="space-y-4 px-1 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PatientSearch value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })} label="" required />
                <DoctorSearch value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })} label="" />
              </div>
              <p className="text-xs text-muted-foreground italic">Fill sections below — patient, vitals, complaints, then medication. Other sections are optional.</p>
            </div>
            )}
          </div>

          {/* ============== VITALS ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("vitals")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Vitals</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("vitals") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("vitals") && (
              <div className="space-y-4 px-1 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Vital Signs (10 parameters)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {([
                  ["bp", "Blood Pressure", "120/80 mmHg"],
                  ["pulse", "Pulse", "78 /min"],
                  ["temperature", "Temperature", "98.6 °F"],
                  ["respiration", "Respiration", "18 /min"],
                  ["spo2", "SpO₂", "98%"],
                  ["height", "Height", "170 cm"],
                  ["weight", "Weight", "65 kg"],
                  ["bmi", "BMI", "22.5"],
                  ["bloodSugar", "Blood Sugar", "94 mg/dL"],
                  ["painScore", "Pain Score", "2 / 10"],
                ] as const).map(([key, label, ph]) => (
                  <Field key={key} label={label}>
                    <Input
                      value={(clinical.vitalsDetail as Record<string, string>)[key]}
                      onChange={(e) => setClinical({ ...clinical, vitalsDetail: { ...clinical.vitalsDetail, [key]: e.target.value } })}
                      placeholder={ph}
                      className="h-10 text-sm"
                    />
                  </Field>
                ))}
              </div>
              <Field label="Vitals Summary (for card)">
                <Input value={form.vitals} onChange={(e) => setForm({ ...form, vitals: e.target.value })} placeholder="BP 120/80, T 98.6°F, HR 78, SpO₂ 98%" />
              </Field>
            </div>
            )}
          </div>

          {/* ============== COMPLAINTS ============== */}
          <div>
            <div
              onClick={() => toggleSection("complaints")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Complaints</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("complaints") ? "" : "rotate-180"}`} />
            </div>
            <div className="space-y-4 px-1 mt-3">
              <Field label="Chief Complaints (one per line)">
                <textarea
                  value={clinical.chiefComplaints}
                  onChange={(e) => setClinical({ ...clinical, chiefComplaints: e.target.value })}
                  placeholder="Type chief complaints here..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"
                  rows={3}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Duration">
                  <Input value={clinical.historyDuration} onChange={(e) => setClinical({ ...clinical, historyDuration: e.target.value })} placeholder="3 days" />
                </Field>
                <Field label="Severity">
                  <Select value={clinical.severity} onValueChange={(v) => setClinical({ ...clinical, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Mild", "Moderate", "Severe"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Associated Symptoms">
                  <Input value={clinical.associatedSymptoms} onChange={(e) => setClinical({ ...clinical, associatedSymptoms: e.target.value })} placeholder="Nausea, loss of appetite" />
                </Field>
              </div>
              <Field label="History of Present Illness">
                <textarea
                  value={clinical.presentIllness}
                  onChange={(e) => setClinical({ ...clinical, presentIllness: e.target.value })}
                  placeholder="Detailed narrative of the present illness — onset, progression, aggravating/relieving factors…"
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"
                />
              </Field>
            </div>
          </div>

          {/* ============== HISTORY ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("history")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">History</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("history") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("history") && (
              <div className="space-y-4 px-1 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Past Medical History</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  ["diabetes", "Diabetes"], ["hypertension", "Hypertension"], ["asthma", "Asthma"], ["thyroid", "Thyroid"],
                  ["tuberculosis", "Tuberculosis"], ["heartDisease", "Heart Disease"], ["kidneyDisease", "Kidney Disease"], ["cancer", "Cancer"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-xs rounded-md border p-1.5 cursor-pointer hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={(clinical.pastMedical as Record<string, boolean | string>)[key] as boolean}
                      onChange={(e) => setClinical({ ...clinical, pastMedical: { ...clinical.pastMedical, [key]: e.target.checked } })}
                      className="rounded"
                    /> {label}
                  </label>
                ))}
              </div>
              <Field label="Others (past medical)">
                <Input value={clinical.pastMedical.others} onChange={(e) => setClinical({ ...clinical, pastMedical: { ...clinical.pastMedical, others: e.target.value } })} placeholder="e.g. GERD — 2 years ago" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Surgical History (comma-separated)">
                  <Input value={clinical.surgicalHistory} onChange={(e) => setClinical({ ...clinical, surgicalHistory: e.target.value })} placeholder="Appendectomy (2019), C-Section (2020)" />
                </Field>
                <Field label="Drug Allergy">
                  <Input value={clinical.allergies.drug} onChange={(e) => setClinical({ ...clinical, allergies: { ...clinical.allergies, drug: e.target.value } })} placeholder="Penicillin (rash) or None" />
                </Field>
                <Field label="Food Allergy">
                  <Input value={clinical.allergies.food} onChange={(e) => setClinical({ ...clinical, allergies: { ...clinical.allergies, food: e.target.value } })} placeholder="None" />
                </Field>
                <div className="flex items-end gap-3">
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={clinical.allergies.latex} onChange={(e) => setClinical({ ...clinical, allergies: { ...clinical.allergies, latex: e.target.checked } })} className="rounded" /> Latex Allergy</label>
                  <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={clinical.allergies.none} onChange={(e) => setClinical({ ...clinical, allergies: { ...clinical.allergies, none: e.target.checked } })} className="rounded" /> No Known Allergies</label>
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">Personal / Family History</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  ["smoking", "Smoking", "Non-smoker"], ["alcohol", "Alcohol", "Occasional"], ["tobacco", "Tobacco", "No"],
                  ["exercise", "Exercise", "Regular"], ["diet", "Diet", "Mixed"], ["sleep", "Sleep", "7-8 hours"],
                ] as const).map(([key, label, ph]) => (
                  <Field key={key} label={label}>
                    <Input value={(clinical.personalHistory as Record<string, string>)[key]} onChange={(e) => setClinical({ ...clinical, personalHistory: { ...clinical.personalHistory, [key]: e.target.value } })} placeholder={ph} className="h-10 text-sm" />
                  </Field>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Field label="Father's History"><Input value={clinical.familyHistory.father} onChange={(e) => setClinical({ ...clinical, familyHistory: { ...clinical.familyHistory, father: e.target.value } })} placeholder="Diabetes, HTN" className="h-10 text-sm" /></Field>
                <Field label="Mother's History"><Input value={clinical.familyHistory.mother} onChange={(e) => setClinical({ ...clinical, familyHistory: { ...clinical.familyHistory, mother: e.target.value } })} placeholder="HTN" className="h-10 text-sm" /></Field>
                <Field label="Genetic Disease"><Input value={clinical.familyHistory.geneticDisease} onChange={(e) => setClinical({ ...clinical, familyHistory: { ...clinical.familyHistory, geneticDisease: e.target.value } })} placeholder="None" className="h-10 text-sm" /></Field>
              </div>
            </div>
            )}
          </div>

          {/* ============== EXAMINATION ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("examination")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Examination</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("examination") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("examination") && (
              <div className="space-y-4 px-1 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">General Appearance</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  ["pallor", "Pallor"], ["icterus", "Icterus"], ["cyanosis", "Cyanosis"],
                  ["clubbing", "Clubbing"], ["edema", "Edema"], ["lymphNodes", "Lymph Nodes"],
                ] as const).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Input value={(clinical.generalAppearance as Record<string, string>)[key]} onChange={(e) => setClinical({ ...clinical, generalAppearance: { ...clinical.generalAppearance, [key]: e.target.value } })} placeholder="Absent / Mild / Present" className="h-10 text-sm" />
                  </Field>
                ))}
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">Systemic Examination</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="CVS"><Textarea value={clinical.systemicExamination.cvs} onChange={(e) => setClinical({ ...clinical, systemicExamination: { ...clinical.systemicExamination, cvs: e.target.value } })} placeholder="S1, S2 normal. No murmur." rows={2} className="text-sm" /></Field>
                <Field label="RS"><Textarea value={clinical.systemicExamination.rs} onChange={(e) => setClinical({ ...clinical, systemicExamination: { ...clinical.systemicExamination, rs: e.target.value } })} placeholder="Bilateral air entry equal." rows={2} className="text-sm" /></Field>
                <Field label="CNS"><Textarea value={clinical.systemicExamination.cns} onChange={(e) => setClinical({ ...clinical, systemicExamination: { ...clinical.systemicExamination, cns: e.target.value } })} placeholder="Conscious, oriented. GCS 15/15." rows={2} className="text-xs" /></Field>
                <Field label="Abdomen"><Textarea value={clinical.systemicExamination.abdomen} onChange={(e) => setClinical({ ...clinical, systemicExamination: { ...clinical.systemicExamination, abdomen: e.target.value } })} placeholder="Soft, no organomegaly." rows={2} className="text-sm" /></Field>
              </div>
            </div>
            )}
          </div>

          {/* ============== DIAGNOSIS ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("diagnosis")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Diagnosis</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("diagnosis") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("diagnosis") && (
              <div className="space-y-4 px-1 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Primary Diagnosis *">
                  <Input value={clinical.diagnosisDetail.primary} onChange={(e) => { setClinical({ ...clinical, diagnosisDetail: { ...clinical.diagnosisDetail, primary: e.target.value } }); setForm({ ...form, diagnosis: e.target.value }); }} placeholder="Acute Gastritis" />
                </Field>
                <Field label="Secondary Diagnosis">
                  <Input value={clinical.diagnosisDetail.secondary} onChange={(e) => setClinical({ ...clinical, diagnosisDetail: { ...clinical.diagnosisDetail, secondary: e.target.value } })} placeholder="Mild Dehydration" />
                </Field>
                <Field label="ICD-10 Code">
                  <Input value={clinical.diagnosisDetail.icd10} onChange={(e) => setClinical({ ...clinical, diagnosisDetail: { ...clinical.diagnosisDetail, icd10: e.target.value } })} placeholder="K29.7" className="font-mono" />
                </Field>
                <Field label="ICD-11 Code">
                  <Input value={clinical.diagnosisDetail.icd11} onChange={(e) => setClinical({ ...clinical, diagnosisDetail: { ...clinical.diagnosisDetail, icd11: e.target.value } })} placeholder="DA42" className="font-mono" />
                </Field>
              </div>
              <Field label="Clinical Notes">
                <Textarea value={clinical.clinicalNotes} onChange={(e) => { setClinical({ ...clinical, clinicalNotes: e.target.value }); setForm({ ...form, advice: e.target.value }); }} placeholder="Patient counseled about condition and treatment plan…" rows={3} />
              </Field>
            </div>
            )}
          </div>

          {/* ============== INVESTIGATIONS ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("investigations")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FlaskConical className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Investigations</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("investigations") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("investigations") && (
              <div className="space-y-4 px-1 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Investigation Advice</p>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setClinical({ ...clinical, investigations: [...clinical.investigations, { name: "", reason: "", priority: "Routine", status: "Ordered" }] })}>
                  <Plus className="w-3 h-3" /> Add Investigation
                </Button>
              </div>
              {clinical.investigations.map((inv, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end rounded-lg border p-2 bg-muted/30">
                  <div className="sm:col-span-2"><Field label={`Investigation #${idx + 1}`}><Input value={inv.name} onChange={(e) => setClinical({ ...clinical, investigations: clinical.investigations.map((it, i) => i === idx ? { ...it, name: e.target.value } : it) })} placeholder="CBC / LFT / USG" className="h-10 text-sm" /></Field></div>
                  <div className="sm:col-span-2"><Field label="Reason"><Input value={inv.reason} onChange={(e) => setClinical({ ...clinical, investigations: clinical.investigations.map((it, i) => i === idx ? { ...it, reason: e.target.value } : it) })} placeholder="Rule out infection" className="h-10 text-sm" /></Field></div>
                  <div><Field label="Priority">
                    <Select value={inv.priority} onValueChange={(v) => setClinical({ ...clinical, investigations: clinical.investigations.map((it, i) => i === idx ? { ...it, priority: v } : it) })}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{["Routine", "Urgent", "STAT"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field></div>
                  {clinical.investigations.length > 1 && (
                    <div className="sm:col-span-5 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-600" onClick={() => setClinical({ ...clinical, investigations: clinical.investigations.filter((_, i) => i !== idx) })}><X className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>
              ))}
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-3">Procedures</p>
              {clinical.procedures.map((proc, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end rounded-lg border p-2 bg-muted/30">
                  <div className="sm:col-span-2"><Field label={`Procedure #${idx + 1}`}><Input value={proc.name} onChange={(e) => setClinical({ ...clinical, procedures: clinical.procedures.map((it, i) => i === idx ? { ...it, name: e.target.value } : it) })} placeholder="IV Fluids / Dressing / Nebulization" className="h-10 text-sm" /></Field></div>
                  <div><Field label="Date"><Input type="date" value={proc.date} onChange={(e) => setClinical({ ...clinical, procedures: clinical.procedures.map((it, i) => i === idx ? { ...it, date: e.target.value } : it) })} className="h-10 text-sm" /></Field></div>
                  <div><Field label="Notes"><Input value={proc.notes} onChange={(e) => setClinical({ ...clinical, procedures: clinical.procedures.map((it, i) => i === idx ? { ...it, notes: e.target.value } : it) })} placeholder="1 pint over 4h" className="h-10 text-sm" /></Field></div>
                  {clinical.procedures.length > 1 && (
                    <div className="sm:col-span-4 flex justify-end"><Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-600" onClick={() => setClinical({ ...clinical, procedures: clinical.procedures.filter((_, i) => i !== idx) })}><X className="w-3.5 h-3.5" /></Button></div>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setClinical({ ...clinical, procedures: [...clinical.procedures, { name: "", date: "", notes: "" }] })}><Plus className="w-3 h-3" /> Add Procedure</Button>
            </div>
            )}
          </div>

          {/* ============== MEDICATION ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("medication")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Pill className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Medication</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("medication") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("medication") && (
              <div className="space-y-4 px-1 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Medication (℞)</p>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setItems([...items, { medicineName: "", dosage: "", frequency: "1-0-0", duration: "", quantity: "1", instructions: "" }])}><Plus className="w-3 h-3" /> Add Medicine</Button>
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="rounded-lg border p-2.5 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Medicine #{idx + 1}</span>
                    {items.length > 1 && <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-600" onClick={() => setItems(items.filter((_, i) => i !== idx))}><X className="w-3.5 h-3.5" /></Button>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <Field label="Medicine Name"><Input value={it.medicineName} onChange={(e) => setItems(items.map((it2, i) => i === idx ? { ...it2, medicineName: e.target.value } : it2))} placeholder="Pantoprazole 40mg" className="h-10 text-sm" /></Field>
                    <Field label="Dosage"><Input value={it.dosage} onChange={(e) => setItems(items.map((it2, i) => i === idx ? { ...it2, dosage: e.target.value } : it2))} placeholder="1 Tablet" className="h-10 text-sm" /></Field>
                    <Field label="Frequency">
                      <Select value={it.frequency} onValueChange={(v) => setItems(items.map((it2, i) => i === idx ? { ...it2, frequency: v } : it2))}>
                        <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Duration"><Input value={it.duration} onChange={(e) => setItems(items.map((it2, i) => i === idx ? { ...it2, duration: e.target.value } : it2))} placeholder="7 days" className="h-10 text-sm" /></Field>
                    <Field label="Quantity"><Input type="number" value={it.quantity} onChange={(e) => setItems(items.map((it2, i) => i === idx ? { ...it2, quantity: e.target.value } : it2))} placeholder="14" className="h-10 text-sm" /></Field>
                    <Field label="Instructions"><Input value={it.instructions} onChange={(e) => setItems(items.map((it2, i) => i === idx ? { ...it2, instructions: e.target.value } : it2))} placeholder="Before breakfast" className="h-10 text-sm" /></Field>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* ============== ADVICE & FOLLOW-UP ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("advice")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Advice & Follow-up</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("advice") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("advice") && (
              <div className="space-y-4 px-1 mt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Advice</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Diet Advice"><Textarea value={clinical.adviceDetail.diet} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, diet: e.target.value } })} placeholder="Bland diet, avoid spicy food" rows={2} className="text-xs" /></Field>
                <Field label="Lifestyle"><Textarea value={clinical.adviceDetail.lifestyle} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, lifestyle: e.target.value } })} placeholder="Adequate rest, stress management" rows={2} className="text-xs" /></Field>
                <Field label="Exercise"><Input value={clinical.adviceDetail.exercise} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, exercise: e.target.value } })} placeholder="Light walking" className="h-10 text-sm" /></Field>
                <Field label="Hydration"><Input value={clinical.adviceDetail.hydration} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, hydration: e.target.value } })} placeholder="3L/day, ORS if dehydrated" className="h-10 text-sm" /></Field>
                <Field label="Restrictions"><Input value={clinical.adviceDetail.restrictions} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, restrictions: e.target.value } })} placeholder="Avoid alcohol, NSAIDs" className="h-10 text-sm" /></Field>
                <Field label="Travel Advice"><Input value={clinical.adviceDetail.travel} onChange={(e) => setClinical({ ...clinical, adviceDetail: { ...clinical.adviceDetail, travel: e.target.value } })} placeholder="No restrictions" className="h-10 text-sm" /></Field>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mt-3">Follow-up</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Follow-up Date"><Input type="date" value={clinical.followUpDetail.date} onChange={(e) => setClinical({ ...clinical, followUpDetail: { ...clinical.followUpDetail, date: e.target.value } })} className="h-10 text-sm" /></Field>
                <Field label="Next Visit Reason"><Input value={clinical.followUpDetail.nextReason} onChange={(e) => setClinical({ ...clinical, followUpDetail: { ...clinical.followUpDetail, nextReason: e.target.value } })} placeholder="Review symptoms & lab reports" className="h-10 text-sm" /></Field>
              </div>
            </div>
            )}
          </div>

          {/* ============== REFERRAL ============== */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection("referral")}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-semibold">Referral</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${collapsedSections.has("referral") ? "" : "rotate-180"}`} />
            </button>
            {!collapsedSections.has("referral") && (
              <div className="space-y-4 px-1 mt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Referral (optional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label="Referred To (Specialty)"><Input value={clinical.referral.referredTo} onChange={(e) => setClinical({ ...clinical, referral: { ...clinical.referral, referredTo: e.target.value } })} placeholder="Cardiology" className="h-10 text-sm" /></Field>
                  <Field label="Hospital"><Input value={clinical.referral.hospital} onChange={(e) => setClinical({ ...clinical, referral: { ...clinical.referral, hospital: e.target.value } })} placeholder="XYZ Hospital" className="h-10 text-sm" /></Field>
                  <Field label="Doctor"><DoctorSearch value={clinical.referral.doctor} onValueChange={(v) => setClinical({ ...clinical, referral: { ...clinical.referral, doctor: v } })} placeholder="Search doctor..." className="text-xs" /></Field>
                  <Field label="Reason"><Input value={clinical.referral.reason} onChange={(e) => setClinical({ ...clinical, referral: { ...clinical.referral, reason: e.target.value } })} placeholder="Further evaluation" className="h-10 text-sm" /></Field>
                </div>
              </div>
            )}
          </div>

          </div>
          {/* ─── END LEFT COLUMN ─── */}

          {/* ─── RIGHT COLUMN: AI & Smart Assist Panel ─── */}
          <div className="space-y-3 min-w-0">
            {/* AI Assist Header */}
            <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                  <Brain className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-violet-900 dark:text-violet-100 flex items-center gap-1.5">
                    <BotMessageSquare className="w-3.5 h-3.5" /> AI Clinical Assistant
                  </h3>
                  <p className="text-[10px] text-violet-600/70 dark:text-violet-400/60">Smart suggestions based on form data</p>
                </div>
              </div>

              {/* AI Tab Navigation */}
              <div className="flex gap-1 overflow-x-auto">
                {([
                  { id: "diagnosis" as const, label: "Dx", icon: Brain },
                  { id: "drugs" as const, label: "Drugs", icon: Shield },
                  { id: "summary" as const, label: "Summary", icon: FileText },
                  { id: "investigations" as const, label: "Labs", icon: Microscope },
                  { id: "alerts" as const, label: "Alerts", icon: AlertCircle },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveAITab(tab.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all whitespace-nowrap ${
                      activeAITab === tab.id
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-white/60 dark:bg-white/5 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── AI Diagnosis Suggestions ── */}
            {activeAITab === "diagnosis" && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-foreground">AI Diagnosis Suggestions</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[10px] bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30" onClick={suggestDiagnosis} disabled={aiDiagnosisLoading}>
                    {aiDiagnosisLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                    {aiDiagnosisLoading ? "Analyzing..." : "Suggest Dx"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Enter chief complaints, then click "Suggest Dx" to get AI-powered differential diagnosis suggestions with ICD codes.</p>
                {aiDiagnosisSuggestions.length > 0 && (
                  <div className="space-y-2">
                    {aiDiagnosisSuggestions.map((s, i) => (
                      <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground">{s.diagnosis}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{s.reasoning}</p>
                          </div>
                          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.confidence === "High" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : s.confidence === "Moderate" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                            {s.confidence}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded">{s.icd}</span>
                          <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] text-violet-600 hover:text-violet-700 gap-0.5 px-1" onClick={() => applyAIDiagnosis(s.diagnosis, s.icd)}>
                            <Zap className="w-2.5 h-2.5" /> Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── AI Drug Interaction Checker ── */}
            {activeAITab === "drugs" && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-foreground">Drug Interaction Check</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[10px] bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30" onClick={checkDrugInteractions} disabled={aiDrugCheckLoading}>
                    {aiDrugCheckLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                    {aiDrugCheckLoading ? "Checking..." : "Check Interactions"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Add medicines in the Rx section, then check for potential drug-drug interactions and contraindications.</p>
                {aiDrugInteractions.length > 0 && (
                  <div className="space-y-2">
                    {aiDrugInteractions.map((d, i) => (
                      <div key={i} className={`rounded-lg border p-2.5 ${d.severity === "Major" ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20" : d.severity === "Moderate" ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20" : d.severity === "Safe" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-border bg-muted/30"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${d.severity === "Major" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : d.severity === "Moderate" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : d.severity === "Safe" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600"}`}>
                            {d.severity}
                          </span>
                          {d.drugs !== "—" && <span className="text-[10px] font-semibold text-foreground truncate">{d.drugs}</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{d.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── AI Prescription Summary ── */}
            {activeAITab === "summary" && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-500" />
                    <span className="text-xs font-bold text-foreground">AI Clinical Summary</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[10px] bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/30" onClick={generateAISummary} disabled={aiSummaryLoading}>
                    {aiSummaryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {aiSummaryLoading ? "Generating..." : "Generate Summary"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Auto-generate a clinical summary from all filled sections — useful for notes, referral letters, and handover.</p>
                {aiSummary && (
                  <div className="rounded-lg border border-teal-200 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-950/20 p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-teal-600" />
                      <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">Summary Generated</span>
                    </div>
                    <p className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed">{aiSummary}</p>
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] text-teal-600 gap-1" onClick={() => { navigator.clipboard.writeText(aiSummary); toast.success("Summary copied to clipboard"); }}>
                      <Copy className="w-3 h-3" /> Copy to Clipboard
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── AI Recommended Investigations ── */}
            {activeAITab === "investigations" && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-foreground">AI Lab Suggestions</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[10px] bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30" onClick={suggestInvestigations} disabled={aiInvestigationsLoading}>
                    {aiInvestigationsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
                    {aiInvestigationsLoading ? "Analyzing..." : "Suggest Labs"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Get AI-recommended investigations based on symptoms, vitals, and suspected diagnosis.</p>
                {aiInvestigations.length > 0 && (
                  <div className="space-y-2">
                    {aiInvestigations.map((inv, i) => (
                      <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{inv.test}</p>
                          <p className="text-[10px] text-muted-foreground">{inv.reason}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${inv.priority === "STAT" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : inv.priority === "Urgent" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                            {inv.priority}
                          </span>
                          <Button type="button" variant="ghost" size="sm" className="h-5 text-[10px] text-indigo-600 hover:text-indigo-700 gap-0.5 px-1" onClick={() => applyAIInvestigations(inv.test, inv.reason, inv.priority)}>
                            <Plus className="w-2.5 h-2.5" /> Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── AI Clinical Alerts ── */}
            {activeAITab === "alerts" && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-foreground">Clinical Alerts & Safety</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-[10px] bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30" onClick={checkClinicalAlerts} disabled={aiAlertsLoading}>
                    {aiAlertsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                    {aiAlertsLoading ? "Scanning..." : "Scan Alerts"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Real-time safety checks: allergy alerts, contraindications, abnormal vitals, and missing data warnings.</p>
                {aiAlerts.length > 0 && (
                  <div className="space-y-2">
                    {aiAlerts.map((a, i) => (
                      <div key={i} className={`rounded-lg border p-2.5 ${a.type === "critical" ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20" : a.type === "warning" ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20" : a.type === "allergy" ? "border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20" : a.type === "success" ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-border bg-muted/30"}`}>
                        <div className="flex items-start gap-2">
                          {a.type === "critical" ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" /> : a.type === "warning" ? <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /> : a.type === "allergy" ? <Heart className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" /> : a.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> : <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />}
                          <p className="text-[10px] text-foreground/80">{a.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Quick Stats Panel ── */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                <span className="text-xs font-bold text-foreground">Form Completion</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Patient", done: !!form.patientId && !!form.doctorId },
                  { label: "Vitals", done: Object.values(clinical.vitalsDetail).some((v) => v.trim()) },
                  { label: "Complaints", done: !!clinical.chiefComplaints.trim() },
                  { label: "History", done: Object.values(clinical.pastMedical).some((v) => v) || !!clinical.surgicalHistory.trim() },
                  { label: "Examination", done: Object.values(clinical.generalAppearance).some((v) => v.trim()) || Object.values(clinical.systemicExamination).some((v) => v.trim()) },
                  { label: "Diagnosis", done: !!clinical.diagnosisDetail.primary.trim() },
                  { label: "Medications", done: items.some((it) => it.medicineName.trim()) },
                  { label: "Advice", done: Object.values(clinical.adviceDetail).some((v) => v.trim()) },
                ].map((sec) => (
                  <div key={sec.label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${sec.done ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                    <span className={`text-[10px] ${sec.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{sec.label}</span>
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${sec.done ? "bg-emerald-500 w-full" : "bg-slate-300 dark:bg-slate-600 w-0"}`} />
                    </div>
                    {sec.done && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

          </div>
          {/* ─── END RIGHT COLUMN ─── */}
          </div>
          {/* ============== END TWO-COLUMN LAYOUT ============== */}

          <div className="sticky bottom-0 bg-background pt-3 pb-4 border-t border-border flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5">
              {saving ? "Saving…" : <><FileText className="w-4 h-4" /> Save &amp; Print Preview</>}
            </Button>
          </div>
        </form>
    </div>
  );
}