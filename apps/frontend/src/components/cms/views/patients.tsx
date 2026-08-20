"use client";
import { fetchAPI } from "@/lib/api";

import { useFetch } from "@/lib/use-fetch";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination } from "@/components/cms/pagination";
import { usePagination, useSort } from "@/lib/use-pagination";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import {
  Search, UserPlus, Phone, Mail, MapPin, Droplet, Heart, Activity,
  Calendar, FileText, Receipt, FlaskConical, Download, Printer, GitBranch,
  Eye, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Scan, StickyNote,
} from "lucide-react";
import { formatRs, formatDate, statusColors, statusLabel, timeAgo } from "@/lib/format";
import { toast } from "sonner";

interface Patient {
  id: string; patientCode: string; name: string; email: string | null; phone: string;
  gender: string; dob: string | null; age: number; bloodGroup: string | null;
  address: string | null; photo: string | null; bloodPressure: string | null;
  temperature: string | null; pulse: string | null; weight: number | null;
  height: number | null; bmi: number | null; allergies: string | null;
  chronicConditions: string | null; emergencyContact: string | null;
  emergencyName: string | null; insuranceProvider: string | null;
  insuranceNumber: string | null; status: string; registeredAt: string;
  source?: { sourceType: string; sourceName: string } | null;
  appointments?: { id: string; date: string; time: string; status: string; doctor: { name: string } }[];
  prescriptions?: { id: string; code: string; diagnosis: string | null; createdAt: string; doctor: { name: string }; items: { id: string; medicineName: string; dosage: string }[] }[];
  invoices?: { id: string; invoiceNo: string; total: number; paid: number; due: number; status: string; date: string }[];
  labTests?: { id: string; testCode: string; testName: string; status: string; fee: number; orderedAt: string }[];
}

interface ClinicalNote {
  id: string; patientId: string; doctorId: string | null; type: string;
  content: string; createdAt: string; patient?: { name: string };
}

interface RadiologyTest {
  id: string; testCode: string; patientId: string; modality: string; bodyPart: string;
  findings: string | null; impression: string | null; radiologist: string | null;
  status: string; fee: number; orderedAt: string; patient?: { name: string };
}

type SortableCol = "patientCode" | "name" | "age" | "registeredAt";

const SOURCE_LABELS: Record<string, string> = {
  mobile_app: "App",
  website_marketplace: "Marketplace",
  carelim_ms: "Carelim MS",
};

function sourceLabel(sourceName: string): string {
  return SOURCE_LABELS[sourceName] || "Carelim";
}

export function PatientsView() {
  const [tick, setTick] = useState(0);
  const { data: patients, loading } = useFetch<Patient[]>(`/api/patients?_r=${tick}`);
  const [q, setQ] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [bloodFilter, setBloodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);

  const filtered = useMemo(() => {
    if (!patients) return [];
    const ql = q.toLowerCase();
    return patients.filter((p) => {
      if (ql && !p.name.toLowerCase().includes(ql) && !p.patientCode.toLowerCase().includes(ql) && !p.phone.includes(q)) return false;
      if (genderFilter !== "all" && p.gender !== genderFilter) return false;
      if (bloodFilter !== "all" && p.bloodGroup !== bloodFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [patients, q, genderFilter, bloodFilter, statusFilter]);

  const activeFilters = (genderFilter !== "all" ? 1 : 0) + (bloodFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const { sorted, sortKey, sortDir, toggleSort } = useSort<Patient>(filtered, "registeredAt");
  const { page, setPage, size, setSize, totalPages, paged, total, range } = usePagination<Patient>(sorted, 10);

  const selected = patients?.find((p) => p.id === selectedId);
  const refresh = () => setTick((t) => t + 1);

  const handleExport = () => {
    if (!patients || patients.length === 0) {
      toast.error("No patients to export");
      return;
    }
    const headers = ["Patient ID", "Name", "Phone", "Email", "Age", "Gender", "Blood Group", "Address", "Registered"];
    const rows = patients.map((p) => [
      p.patientCode, p.name, p.phone, p.email ?? "", p.age, p.gender,
      p.bloodGroup ?? "", p.address ?? "", formatDate(p.registeredAt),
    ]);
    exportToCSV("patients.csv", headers, rows);
    toast.success(`Exported ${patients.length} patients to CSV`);
  };

  const handleDelete = async () => {
    if (!deletePatient) return;
    try {
      const res = await fetchAPI(`/api/patients/${deletePatient.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Patient ${deletePatient.name} deleted`);
      setDeletePatient(null);
      refresh();
    } catch {
      toast.error("Failed to delete patient");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Patient Management</h2>
          <p className="text-sm text-muted-foreground">
            {patients?.length ?? 0} registered patients
            {total !== (patients?.length ?? 0) && ` · ${total} matching`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setRegisterOpen(true)}>
            <UserPlus className="w-4 h-4" /> Register Patient
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, patient ID, or phone…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue placeholder="Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={bloodFilter} onValueChange={setBloodFilter}>
                  <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue placeholder="Blood" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Blood</SelectItem>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {activeFilters > 0 && (
                  <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={() => { setGenderFilter("all"); setBloodFilter("all"); setStatusFilter("all"); }}>
                    Clear ({activeFilters})
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortHeader label="Patient ID" colKey="patientCode" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("patientCode")} className="w-[120px]" />
                  <SortHeader label="Name" colKey="name" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("name")} />
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <SortHeader label="Age/Gender" colKey="age" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("age")} className="hidden sm:table-cell" />
                  <TableHead className="hidden lg:table-cell">Blood</TableHead>
                  <SortHeader label="Registered" colKey="registeredAt" sortKey={sortKey} sortDir={sortDir} onSort={() => toggleSort("registeredAt")} className="hidden lg:table-cell" />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                      <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      No patients match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-accent/40"
                      onClick={() => setSelectedId(p.id)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.patientCode}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-xs font-semibold">
                              {p.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm">{p.name}</p>
                              {p.source?.sourceType === "carelim" && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-[9px] font-semibold text-white shadow-sm" title={`Via Carelim ${sourceLabel(p.source.sourceName)}`}>
                                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                                  {sourceLabel(p.source.sourceName)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground md:hidden">{p.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{p.phone}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {p.age}y · <span className="capitalize">{p.gender}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {p.bloodGroup && (
                          <Badge variant="outline" className="text-rose-600 border-rose-200 dark:border-rose-900">
                            {p.bloodGroup}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {formatDate(p.registeredAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-teal-600 gap-1"
                            onClick={(e) => { e.stopPropagation(); setSelectedId(p.id); }}
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={(e) => { e.stopPropagation(); setEditPatient(p); }}
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700"
                            onClick={(e) => { e.stopPropagation(); setDeletePatient(p); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && total > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              size={size}
              setSize={setSize}
              range={range}
            />
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto scrollbar-thin p-0">
          {selected && <PatientDetail patient={selected} />}
        </SheetContent>
      </Sheet>

      {/* Register dialog */}
      <RegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onCreated={() => { setRegisterOpen(false); refresh(); toast.success("Patient registered successfully"); }}
      />

      {/* Edit dialog */}
      <EditPatientDialog
        patient={editPatient}
        onOpenChange={(o) => !o && setEditPatient(null)}
        onSaved={() => { setEditPatient(null); refresh(); toast.success("Patient updated"); }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deletePatient} onOpenChange={(o) => !o && setDeletePatient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete patient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deletePatient?.name}</strong> ({deletePatient?.patientCode})
              and all related records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleDelete}
            >
              Delete Patient
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortHeader({
  label, colKey, sortKey, sortDir, onSort, className,
}: {
  label: string;
  colKey: SortableCol;
  sortKey: keyof Patient | "";
  sortDir: "asc" | "desc";
  onSort: () => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onSort}
        className="inline-flex items-center gap-1 text-left hover:text-foreground transition-colors"
      >
        {label}
        {active ? (
          sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />
        )}
      </button>
    </TableHead>
  );
}

function PatientDetail({ patient }: { patient: Patient }) {
  // Fetch full patient detail with relations (appointments, prescriptions, invoices, labTests)
  const { data: fullPatient } = useFetch<Patient>(`/api/patients/${patient.id}`);
  const patientWithRelations = fullPatient || patient;

  // Clinical notes — server filters by patientId
  const { data: notes, loading: notesLoading } = useFetch<ClinicalNote[]>(
    `/api/clinical-notes?patientId=${patient.id}`
  );
  // Radiology — server doesn't filter by patientId; fetch all + filter client-side
  const { data: allRad, loading: radLoading } = useFetch<RadiologyTest[]>(`/api/radiology`);
  const radTests = useMemo(
    () => (allRad ?? []).filter((r) => r.patientId === patient.id),
    [allRad, patient.id]
  );

  const handlePrintCard = () => {
    const statusBadge = `<span class="badge ${patient.status === "active" ? "emerald" : "rose"}">${statusLabel(patient.status)}</span>`;
    const body = `
      ${docHeader(patient.patientCode, "PATIENT CARD", formatDate(patient.registeredAt), statusBadge)}
      <h2>Patient Information</h2>
      <div class="info-grid">
        <div><div class="label">Name</div><div>${patient.name}</div></div>
        <div><div class="label">Phone</div><div>${patient.phone}</div></div>
        <div><div class="label">Email</div><div>${patient.email || "—"}</div></div>
        <div><div class="label">Gender</div><div><span style="text-transform:capitalize">${patient.gender}</span></div></div>
        <div><div class="label">Age</div><div>${patient.age} years</div></div>
        <div><div class="label">Date of Birth</div><div>${patient.dob ? formatDate(patient.dob) : "—"}</div></div>
        <div><div class="label">Blood Group</div><div>${patient.bloodGroup || "—"}</div></div>
        <div><div class="label">Address</div><div>${patient.address || "—"}</div></div>
        <div><div class="label">Emergency Contact</div><div>${patient.emergencyName ? `${patient.emergencyName} (${patient.emergencyContact || "—"})` : "—"}</div></div>
        <div><div class="label">Insurance</div><div>${patient.insuranceProvider ? `${patient.insuranceProvider} (${patient.insuranceNumber || "—"})` : "None"}</div></div>
      </div>
      <h2>Vital Signs</h2>
      <table>
        <thead><tr><th>Measurement</th><th>Value</th><th>Unit</th></tr></thead>
        <tbody>
          <tr><td>Blood Pressure</td><td>${patient.bloodPressure || "—"}</td><td>mmHg</td></tr>
          <tr><td>Temperature</td><td>${patient.temperature || "—"}</td><td>°F</td></tr>
          <tr><td>Pulse</td><td>${patient.pulse || "—"}</td><td>bpm</td></tr>
          <tr><td>Weight</td><td>${patient.weight ?? "—"}</td><td>kg</td></tr>
          <tr><td>Height</td><td>${patient.height ?? "—"}</td><td>cm</td></tr>
          <tr><td>BMI</td><td>${patient.bmi?.toFixed(1) ?? "—"}</td><td>kg/m²</td></tr>
        </tbody>
      </table>
      <h2>Allergies & Conditions</h2>
      <div class="info-grid">
        <div><div class="label">Allergies</div><div style="color:#e11d48">${patient.allergies || "None recorded"}</div></div>
        <div><div class="label">Chronic Conditions</div><div>${patient.chronicConditions || "None"}</div></div>
      </div>
      <div class="signature">
        <div class="sig-block">
          <div class="line"></div>
          <div class="name">Patient Signature</div>
          <div class="role">Date: ${formatDate(new Date())}</div>
        </div>
        <div class="sig-block">
          <div class="line"></div>
          <div class="name">Receptionist</div>
          <div class="role">Carelim OS Health Center</div>
        </div>
      </div>
    `;
    printHTML(`Patient Card — ${patient.name}`, body);
    toast.success("Patient card sent to printer");
  };

  return (
    <div>
      <SheetHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-xl font-bold">
              {patient.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-xl">{patient.name}</SheetTitle>
              {patient.source?.sourceType === "carelim" && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-[9px] font-semibold text-white shadow-sm">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  {sourceLabel(patient.source.sourceName)}
                </span>
              )}
            </div>
            <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="font-mono">{patient.patientCode}</span>
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {patient.phone}</span>
              <span>{patient.age}y · <span className="capitalize">{patient.gender}</span></span>
              {patient.bloodGroup && (
                <Badge variant="outline" className="text-rose-600 border-rose-200">{patient.bloodGroup}</Badge>
              )}
            </SheetDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handlePrintCard}>
            <Printer className="w-4 h-4" /> Print Card
          </Button>
        </div>
      </SheetHeader>

      <div className="p-6 space-y-5">
        {/* Vitals */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-teal-600" /> Vital Signs
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Blood Pressure", value: patient.bloodPressure, unit: "mmHg" },
              { label: "Temperature", value: patient.temperature, unit: "°F" },
              { label: "Pulse", value: patient.pulse, unit: "bpm" },
              { label: "BMI", value: patient.bmi?.toFixed(1), unit: "kg/m²" },
            ].map((v) => (
              <div key={v.label} className="rounded-lg border bg-card p-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{v.label}</p>
                <p className="text-sm font-semibold mt-0.5">
                  {v.value || "—"} <span className="text-[10px] text-muted-foreground font-normal">{v.unit}</span>
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="rounded-lg border bg-card p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase">Weight / Height</p>
              <p className="text-sm font-semibold">{patient.weight || "—"} kg / {patient.height || "—"} cm</p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase">Allergies</p>
              <p className="text-sm font-semibold text-rose-600">{patient.allergies || "None recorded"}</p>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <InfoRow icon={Mail} label="Email" value={patient.email || "—"} />
          <InfoRow icon={MapPin} label="Address" value={patient.address || "—"} />
          <InfoRow icon={Droplet} label="Chronic Conditions" value={patient.chronicConditions || "None"} />
          <InfoRow icon={Heart} label="Emergency Contact" value={patient.emergencyName ? `${patient.emergencyName} (${patient.emergencyContact})` : "—"} />
          <InfoRow icon={Calendar} label="Date of Birth" value={patient.dob ? formatDate(patient.dob) : "—"} />
          <InfoRow icon={Calendar} label="Registered" value={formatDate(patient.registeredAt)} />
          <InfoRow icon={Receipt} label="Insurance" value={patient.insuranceProvider ? `${patient.insuranceProvider} (${patient.insuranceNumber})` : "None"} />
        </div>

        {/* Tabs: history */}
        <Tabs defaultValue="timeline">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="timeline" className="gap-1.5"><GitBranch className="w-3.5 h-3.5" /> Timeline</TabsTrigger>
            <TabsTrigger value="visits" className="gap-1.5"><Calendar className="w-3.5 h-3.5" /> Visits</TabsTrigger>
            <TabsTrigger value="rx" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Prescriptions</TabsTrigger>
            <TabsTrigger value="labs" className="gap-1.5"><FlaskConical className="w-3.5 h-3.5" /> Labs</TabsTrigger>
            <TabsTrigger value="rad" className="gap-1.5"><Scan className="w-3.5 h-3.5" /> Radiology</TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Notes</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5"><Receipt className="w-3.5 h-3.5" /> Invoices</TabsTrigger>
          </TabsList>

          {/* Timeline — unified chronological event feed */}
          <TabsContent value="timeline" className="mt-3 max-h-80 overflow-y-auto scrollbar-thin">
            <PatientTimeline patient={patientWithRelations} notes={notes || undefined} radTests={radTests} />
          </TabsContent>

          <TabsContent value="visits" className="mt-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {patientWithRelations.appointments?.length ? patientWithRelations.appointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{a.doctor.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(a.date)} at {a.time}</p>
                </div>
                <Badge className={`text-[10px] ${statusColors[a.status] ?? ""}`}>{statusLabel(a.status)}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No visits recorded</p>}
          </TabsContent>

          <TabsContent value="rx" className="mt-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {patientWithRelations.prescriptions?.length ? patientWithRelations.prescriptions.map((p) => (
              <div key={p.id} className="rounded-lg border px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium font-mono">{p.code}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{p.doctor.name} · {p.diagnosis}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.items.slice(0, 4).map((it) => (
                    <Badge key={it.id} variant="secondary" className="text-[10px]">{it.medicineName} ({it.dosage})</Badge>
                  ))}
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No prescriptions</p>}
          </TabsContent>

          <TabsContent value="labs" className="mt-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {patientWithRelations.labTests?.length ? patientWithRelations.labTests.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{l.testName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{l.testCode} · {formatRs(l.fee)}</p>
                </div>
                <Badge className={`text-[10px] ${statusColors[l.status] ?? ""}`}>{statusLabel(l.status)}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No lab tests</p>}
          </TabsContent>

          <TabsContent value="rad" className="mt-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {radLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : radTests.length ? radTests.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{r.modality} — {r.bodyPart}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.testCode} · {formatRs(r.fee)} · {formatDate(r.orderedAt)}</p>
                  {r.findings && <p className="text-xs text-muted-foreground mt-0.5">Findings: {r.findings}</p>}
                </div>
                <Badge className={`text-[10px] ${statusColors[r.status] ?? ""}`}>{statusLabel(r.status)}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No radiology tests</p>}
          </TabsContent>

          <TabsContent value="notes" className="mt-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {notesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : notes && notes.length ? notes.map((n) => (
              <div key={n.id} className="rounded-lg border px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] capitalize">{n.type}</Badge>
                  <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-xs mt-1.5 whitespace-pre-wrap">{n.content}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No clinical notes</p>}
          </TabsContent>

          <TabsContent value="invoices" className="mt-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {patientWithRelations.invoices?.length ? patientWithRelations.invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium font-mono">{i.invoiceNo}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(i.date)} · {formatRs(i.total)}</p>
                </div>
                <Badge className={`text-[10px] ${statusColors[i.status] ?? ""}`}>{statusLabel(i.status)}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No invoices</p>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function RegisterDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", gender: "male", age: "", ageMonths: "",
    bloodGroup: "O+", address: "", emergencyContact: "", emergencyName: "",
    allergies: "", chronicConditions: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: allPatients } = useFetch<Patient[]>(open ? "/api/patients" : null);

  const matchedPatients = useMemo(() => {
    if (!nameSearch || nameSearch.length < 2 || !allPatients) return [];
    const q = nameSearch.toLowerCase();
    return allPatients.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.patientCode.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [nameSearch, allPatients]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchAPI("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          age: Number(form.age) || 0,
          dob: Number(form.age) || Number(form.ageMonths)
            ? new Date(new Date().getFullYear() - Number(form.age || 0), new Date().getMonth() - Number(form.ageMonths || 0), 1)
            : null,
          emergencyContact: form.emergencyContact || null,
          emergencyName: form.emergencyName || null,
          allergies: form.allergies || null,
          chronicConditions: form.chronicConditions || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Patient registered");
      onCreated();
      setForm({
        name: "", email: "", phone: "", gender: "male", age: "", ageMonths: "",
        bloodGroup: "O+", address: "", emergencyContact: "", emergencyName: "",
        allergies: "", chronicConditions: "", notes: "",
      });
    } catch {
      toast.error("Failed to register patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>New Patient</DialogTitle>
          <DialogDescription>Register a new patient. Patient ID is auto-generated.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {/* Personal info */}
          <div className="space-y-3">
            <div className="space-y-1.5 relative">
              <Label>Full Name *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setNameSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => { if (nameSearch.length >= 2) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="e.g. Sita Sharma"
              />
              {showSuggestions && matchedPatients.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border bg-card shadow-lg max-h-52 overflow-y-auto scrollbar-thin">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b">
                    Existing patients ({matchedPatients.length})
                  </div>
                  {matchedPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0 flex items-center justify-between gap-2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setForm({
                          ...form,
                          name: p.name,
                          email: p.email ?? "",
                          phone: p.phone,
                          gender: p.gender,
                          age: String(p.age ?? ""),
                          bloodGroup: p.bloodGroup ?? "O+",
                          address: p.address ?? "",
                          emergencyContact: p.emergencyContact ?? "",
                          emergencyName: p.emergencyName ?? "",
                          allergies: p.allergies ?? "",
                          chronicConditions: p.chronicConditions ?? "",
                        });
                        setShowSuggestions(false);
                        setNameSearch("");
                        toast.info(`Loaded ${p.name}'s existing data`);
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.patientCode} · {p.phone} · {p.gender}, {p.age}y
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">{p.bloodGroup || "—"}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Age (years)</Label>
                <Input type="number" min={0} max={150} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="32" />
              </div>
              <div className="space-y-1.5">
                <Label>Months</Label>
                <Input type="number" min={0} max={11} value={form.ageMonths} onChange={(e) => setForm({ ...form, ageMonths: e.target.value })} placeholder="6" />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98XXXXXXXX" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="sita@mail.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Kathmandu, Nepal" />
            </div>
          </div>

          {/* Medical */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Allergies</Label>
                <Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Penicillin, Peanuts" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Chronic Conditions</Label>
              <Input value={form.chronicConditions} onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })} placeholder="Diabetes, Hypertension" />
            </div>
          </div>

          {/* Emergency */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Emergency Contact Name</Label>
                <Input value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Emergency Contact Phone</Label>
                <Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="98XXXXXXXX" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional notes about the patient…"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Saving…" : "Register Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPatientDialog({
  patient, onOpenChange, onSaved,
}: {
  patient: Patient | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const empty = { name: "", email: "", phone: "", gender: "male", age: "", bloodGroup: "O+", address: "", emergencyContact: "", emergencyName: "", allergies: "", chronicConditions: "" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patient) {
      setForm({
        name: patient.name,
        email: patient.email ?? "",
        phone: patient.phone,
        gender: patient.gender,
        age: String(patient.age ?? ""),
        bloodGroup: patient.bloodGroup ?? "O+",
        address: patient.address ?? "",
        emergencyContact: patient.emergencyContact ?? "",
        emergencyName: patient.emergencyName ?? "",
        allergies: patient.allergies ?? "",
        chronicConditions: patient.chronicConditions ?? "",
      });
    }
  }, [patient]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email || null,
        phone: form.phone,
        gender: form.gender,
        age: Number(form.age) || 0,
        bloodGroup: form.bloodGroup || null,
        address: form.address || null,
        emergencyContact: form.emergencyContact || null,
        emergencyName: form.emergencyName || null,
        allergies: form.allergies || null,
        chronicConditions: form.chronicConditions || null,
        dob: Number(form.age) ? new Date(new Date().getFullYear() - Number(form.age), 0, 1) : null,
      };
      const res = await fetchAPI(`/api/patients/${patient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      onSaved();
    } catch {
      toast.error("Failed to update patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!patient} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>Edit Patient — {patient?.name}</DialogTitle>
          <DialogDescription>Update patient details. Changes are saved to the database.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Full Name *</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Age</Label>
              <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Blood Group</Label>
              <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Emergency Contact</Label>
              <Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="98XXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Emergency Contact Name</Label>
              <Input value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} placeholder="Jane Doe" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Allergies</Label>
              <Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Penicillin, Peanuts" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Chronic Conditions</Label>
              <Input value={form.chronicConditions} onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })} placeholder="Diabetes, Hypertension" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Patient Timeline Component ----------
interface TimelineEvent {
  id: string;
  date: string;
  type: "appointment" | "prescription" | "lab" | "radiology" | "invoice" | "note";
  title: string;
  description: string;
  status?: string;
  amount?: number;
}

const TIMELINE_CONFIG: Record<TimelineEvent["type"], { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  appointment: { icon: Calendar, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/50", label: "Visit" },
  prescription: { icon: FileText, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900/50", label: "Rx" },
  lab: { icon: FlaskConical, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900/50", label: "Lab" },
  radiology: { icon: Scan, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50", label: "Rad" },
  invoice: { icon: Receipt, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50", label: "Inv" },
  note: { icon: StickyNote, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50", label: "Note" },
};

function PatientTimeline({ patient, notes, radTests }: { patient: Patient; notes?: ClinicalNote[]; radTests?: RadiologyTest[] }) {
  const events: TimelineEvent[] = useMemo(() => {
    const all: TimelineEvent[] = [];
    (patient.appointments || []).forEach((a) => {
      all.push({
        id: `appt-${a.id}`,
        date: a.date,
        type: "appointment",
        title: `Appointment with ${a.doctor.name}`,
        description: `${a.time} · ${a.status}`,
        status: a.status,
      });
    });
    (patient.prescriptions || []).forEach((p) => {
      all.push({
        id: `rx-${p.id}`,
        date: p.createdAt,
        type: "prescription",
        title: `Prescription ${p.code}`,
        description: p.diagnosis || `${p.items?.length || 0} medicines prescribed`,
      });
    });
    (patient.labTests || []).forEach((l) => {
      all.push({
        id: `lab-${l.id}`,
        date: l.orderedAt,
        type: "lab",
        title: l.testName,
        description: `${l.testCode} · ${formatRs(l.fee)}`,
        status: l.status,
      });
    });
    (radTests || []).forEach((r) => {
      all.push({
        id: `rad-${r.id}`,
        date: r.orderedAt,
        type: "radiology",
        title: `${r.modality} — ${r.bodyPart}`,
        description: r.findings ? `Findings: ${r.findings.substring(0, 60)}${r.findings.length > 60 ? "…" : ""}` : `${r.testCode} · ${formatRs(r.fee)}`,
        status: r.status,
      });
    });
    (notes || []).forEach((n) => {
      all.push({
        id: `note-${n.id}`,
        date: n.createdAt,
        type: "note",
        title: `Clinical Note (${n.type})`,
        description: n.content.length > 80 ? n.content.substring(0, 80) + "…" : n.content,
      });
    });
    (patient.invoices || []).forEach((i) => {
      all.push({
        id: `inv-${i.id}`,
        date: i.date,
        type: "invoice",
        title: `Invoice ${i.invoiceNo}`,
        description: `${formatRs(i.total)} · ${i.status}`,
        status: i.status,
        amount: i.total,
      });
    });
    // Sort by date descending
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patient, notes, radTests]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <GitBranch className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No timeline events yet</p>
      </div>
    );
  }

  // Count events by type for summary
  const typeCounts: Record<string, number> = {};
  events.forEach((e) => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });

  return (
    <div className="relative">
      {/* Event type summary */}
      <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-border/40">
        {Object.entries(typeCounts).map(([type, count]) => {
          const cfg = TIMELINE_CONFIG[type as TimelineEvent["type"]];
          return (
            <span key={type} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} border`}>
              <cfg.icon className={`w-2.5 h-2.5 ${cfg.color}`} />
              {cfg.label} {count}
            </span>
          );
        })}
      </div>
      {/* Vertical line */}
      <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
      <div className="space-y-3">
        {events.map((event) => {
          const cfg = TIMELINE_CONFIG[event.type];
          const Icon = cfg.icon;
          return (
            <div key={event.id} className="relative flex gap-3 pl-0">
              {/* Icon node */}
              <div className={`relative z-10 w-8 h-8 rounded-full ${cfg.bg} border flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              {/* Content */}
              <div className={`flex-1 rounded-lg ${cfg.bg} border px-3 py-2`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground tabular-nums">{formatDate(event.date)}</span>
                    {event.status && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[event.status] || "bg-gray-100 text-gray-600"}`}>
                        {statusLabel(event.status)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
