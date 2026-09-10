"use client";

import { useState } from "react";
import { useFetch } from "@/lib/use-fetch";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, PieChart, Pie, AreaChart, Area,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Wallet, TrendingUp, AlertCircle, Users, FileSpreadsheet, FileText,
  Printer, Stethoscope, CalendarDays, Receipt,
  BarChart3, ChevronRight, FlaskConical, Pill, Megaphone, Video, Building2,
  UserCog, Globe, ClipboardList, Activity, CreditCard, TrendingDown,
  ShoppingCart, Package, Clock, UserX, TestTube, DollarSign, MapPin,
  MegaphoneIcon, Target, Monitor, Baby, Heart, Smile, Scan, RotateCcw, Percent, Boxes, Download,
} from "lucide-react";
import { formatRs, formatDate } from "@/lib/format";
import { exportToCSV, printHTML, docHeader } from "@/lib/export-utils";
import { ChartTooltip } from "@/components/cms/chart-tooltip";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ============================================================
   Report Categories & Items
   ============================================================ */

interface ReportItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ReportCategory {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ReportItem[];
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    key: "overview",
    label: "Overview",
    icon: BarChart3,
    items: [
      { key: "business-summary", label: "Business Summary", icon: BarChart3 },
      { key: "revenue", label: "Revenue", icon: TrendingUp },
      { key: "expenses", label: "Expenses", icon: TrendingDown },
      { key: "profit-loss", label: "Profit & Loss", icon: Receipt },
    ],
  },
  {
    key: "patients",
    label: "Patients",
    icon: Users,
    items: [
      { key: "patient-registration", label: "Patient Registration", icon: Users },
      { key: "patient-visits", label: "Patient Visits", icon: ClipboardList },
      { key: "patient-growth", label: "Patient Growth", icon: TrendingUp },
      { key: "patient-sources", label: "Patient Sources", icon: MapPin },
    ],
  },
  {
    key: "opd",
    label: "OPD & Appointments",
    icon: CalendarDays,
    items: [
      { key: "opd-report", label: "OPD Report", icon: FileText },
      { key: "appointment-report", label: "Appointment Report", icon: CalendarDays },
      { key: "noshow-report", label: "No-show Report", icon: UserX },
      { key: "doctor-performance", label: "Doctor Performance", icon: Stethoscope },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    icon: Wallet,
    items: [
      { key: "collections", label: "Collections", icon: DollarSign },
      { key: "invoices", label: "Invoices", icon: FileText },
      { key: "payments", label: "Payments", icon: CreditCard },
      { key: "refunds", label: "Refunds", icon: RotateCcw },
      { key: "discounts", label: "Discounts", icon: Percent },
      { key: "outstanding", label: "Outstanding", icon: AlertCircle },
    ],
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    icon: Pill,
    items: [
      { key: "ph-sales", label: "Sales", icon: ShoppingCart },
      { key: "ph-purchases", label: "Purchases", icon: Package },
      { key: "ph-stock", label: "Stock", icon: Boxes },
      { key: "ph-expiry", label: "Expiry", icon: Clock },
      { key: "ph-profit", label: "Profit", icon: TrendingUp },
    ],
  },
  {
    key: "laboratory",
    label: "Laboratory",
    icon: FlaskConical,
    items: [
      { key: "lab-tests", label: "Tests", icon: TestTube },
      { key: "lab-pending", label: "Pending", icon: Clock },
      { key: "lab-results", label: "Results", icon: FileText },
      { key: "lab-revenue", label: "Revenue", icon: DollarSign },
    ],
  },
  {
    key: "diagnostics",
    label: "Diagnostics",
    icon: Scan,
    items: [
      { key: "diag-orders", label: "Orders", icon: ClipboardList },
      { key: "diag-reports", label: "Reports", icon: FileText },
      { key: "diag-revenue", label: "Revenue", icon: DollarSign },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    icon: Megaphone,
    items: [
      { key: "leads", label: "Leads", icon: Users },
      { key: "sources", label: "Sources", icon: MapPin },
      { key: "campaigns", label: "Campaigns", icon: MegaphoneIcon },
      { key: "conversion", label: "Conversion", icon: Target },
      { key: "roi", label: "ROI", icon: TrendingUp },
    ],
  },
  {
    key: "telemedicine",
    label: "Telemedicine",
    icon: Video,
    items: [
      { key: "tele-sessions", label: "Sessions", icon: Video },
      { key: "tele-revenue", label: "Revenue", icon: DollarSign },
    ],
  },
  {
    key: "departments",
    label: "Departments",
    icon: Building2,
    items: [
      { key: "dept-dental", label: "Dental", icon: Smile },
      { key: "dept-ivf", label: "IVF", icon: Baby },
      { key: "dept-dermatology", label: "Dermatology", icon: Heart },
      { key: "dept-other", label: "Other Modules", icon: Boxes },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    icon: UserCog,
    items: [
      { key: "staff-attendance", label: "Attendance", icon: Clock },
      { key: "staff-performance", label: "Performance", icon: Activity },
      { key: "staff-productivity", label: "Productivity", icon: TrendingUp },
    ],
  },
  {
    key: "platform",
    label: "Carelim Platform",
    icon: Globe,
    items: [
      { key: "plt-marketplace", label: "Marketplace", icon: ShoppingCart },
      { key: "plt-commission", label: "Commission", icon: DollarSign },
      { key: "plt-clinics", label: "Clinics", icon: Building2 },
      { key: "plt-doctors", label: "Doctors", icon: Stethoscope },
      { key: "plt-saas", label: "SaaS", icon: Monitor },
    ],
  },
];

/* ============================================================
   All Reports Data Interface
   ============================================================ */

interface AllReportsData {
  // Overview
  totalRevenue: number;
  totalCollection: number;
  totalDue: number;
  revenueByType: Record<string, number>;
  revenueByPayment: Record<string, number>;
  doctorPerf: { name: string; patients: number; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number; collection: number; profit: number }[];
  dailyRevenue: { date: string; revenue: number; collection: number; due: number }[];
  patientCount: number;
  appointmentCount: number;
  expensesTotal: number;
  netProfit: number;

  // Expenses
  expenses: { id: string; code: string; category: string; description: string; amount: number; paymentMode: string; date: string }[];
  expenseByCategory: Record<string, number>;

  // Patients
  newPatientsMonth: number;
  patientByMonth: { month: string; count: number }[];

  // Appointments
  confirmedAppts: number;
  cancelledAppts: number;
  pendingAppts: number;
  noShowAppts: number;
  apptByDoctor: { name: string; total: number; completed: number; cancelled: number }[];
  apptByDay: { day: string; count: number }[];
  apptByHour: { hour: string; count: number }[];

  // Finance
  invoicesByType: Record<string, number>;
  paymentsByMethod: Record<string, number>;
  outstanding: number;
  outstanding0_30: number;
  outstanding31_60: number;
  outstanding60plus: number;
  invoiceList: {
    id: string; invoiceNo: string; patientName: string; type: string;
    total: number; paid: number; due: number; date: string;
    status: string; paymentMethod: string;
  }[];

  // Pharmacy
  phSalesTotal: number;
  phSalesCollection: number;
  phPurchasesTotal: number;
  phStockValue: number;
  expiringMedicines: { name: string; batch: string; expiry: string; stock: number; status: string }[];
  lowStockMedicines: { name: string; stock: number; reorder: number }[];
  monthlyPhSales: { month: string; sales: number; purchases: number }[];

  // Laboratory
  labOrdersTotal: number;
  labOrdersPaid: number;
  labOrdersDue: number;
  labPendingOrders: number;
  labCompletedOrders: number;
  labInProgressOrders: number;
  labByStatus: Record<string, number>;
  labTestsPopularity: { name: string; count: number }[];
  monthlyLabRevenue: { month: string; orders: number; revenue: number }[];
  totalLabOrders: number;
  totalLabTests: number;

  // Staff
  totalStaff: number;
  activeStaff: number;
  staffAttendance: { name: string; present: number; absent: number; leave: number }[];
  staffByDept: Record<string, number>;
}

/* ============================================================
   Chart Colors & Labels
   ============================================================ */

const PIE_COLORS = ["#0d9488", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#f43f5e", "#3b82f6", "#ec4899"];

const REVENUE_TYPE_LABELS: Record<string, string> = {
  consultation: "Consultation",
  pharmacy: "Pharmacy",
  lab: "Laboratory",
  package: "Package",
  ipd: "IPD",
};

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  rent: "Rent",
  salary: "Salary",
  utilities: "Utilities",
  supplies: "Supplies",
  maintenance: "Maintenance",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  paid: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
  pending: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  unpaid: "text-rose-600 bg-rose-50 dark:bg-rose-950/30",
  partial: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  cancelled: "text-gray-600 bg-gray-50 dark:bg-gray-950/30",
};

/* ============================================================
   Placeholder Report Component
   ============================================================ */

function PlaceholderReport({
  title, description, icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-teal-600" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      <Badge variant="outline" className="mt-3 text-xs">Coming Soon</Badge>
    </div>
  );
}

/* ============================================================
   Small helper to turn a Record into recharts Pie data
   ============================================================ */

function recordToPieData(
  record: Record<string, number>,
  labels?: Record<string, string>,
) {
  return Object.entries(record)
    .filter(([, v]) => v > 0)
    .map(([key, value], i) => ({
      name: labels?.[key] || key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
}

/* ============================================================
   Main Reports View
   ============================================================ */

export function ReportsView() {
  const tenantBranding = useAppStore((s) => s.tenantBranding);
  const [dateRange, setDateRange] = useState<"week" | "month" | "quarter" | "year" | "all" | "custom">("month");
  const [masterReportOpen, setMasterReportOpen] = useState(false);
  const [masterSections, setMasterSections] = useState<Record<string, boolean>>({
    overview: true, patients: true, appointments: true, invoices: true,
    labOrders: true, labTests: true, pharmacy: true, doctors: true, expenses: true, staff: false,
  });
  const [masterFormat, setMasterFormat] = useState<"pdf" | "excel" | "csv">("pdf");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedReport, setSelectedReport] = useState("business-summary");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["overview"]);

  // Build API URL with date params
  const apiUrl = dateRange === "custom"
    ? `/api/reports/all?period=custom&startDate=${customStart}&endDate=${customEnd}`
    : `/api/reports/all?period=${dateRange}`;
  const { data, loading } = useFetch<AllReportsData>(apiUrl);

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleMasterSection = (key: string) => {
    setMasterSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const generateMasterReport = (format: "pdf" | "excel" | "csv" = masterFormat) => {
    const sel = masterSections;
    const periodLabel = dateRange === "custom" ? `${customStart} to ${customEnd}` : dateRange === "week" ? "This Week" : dateRange === "month" ? "This Month" : dateRange === "quarter" ? "This Quarter" : dateRange === "year" ? "This Year" : "All Time";

    // ---- CSV / Excel export ----
    if (format === "csv" || format === "excel") {
      const rows: (string | number)[][] = [];
      const addSection = (title: string, headers: string[], data: (string | number)[][]) => {
        rows.push([title]);
        rows.push(headers);
        data.forEach(r => rows.push(r));
        rows.push([]);
      };

      if (sel.overview) {
        addSection("Overview", ["Metric", "Value"], [
          ["Total Revenue", d.totalRevenue],
          ["Total Collection", d.totalCollection],
          ["Outstanding Due", d.totalDue],
          ["Net Profit", d.netProfit ?? (d.totalRevenue - d.expensesTotal)],
          ["Total Expenses", d.expensesTotal],
          ["Collection Rate", d.totalRevenue > 0 ? `${((d.totalCollection / d.totalRevenue) * 100).toFixed(1)}%` : "0%"],
        ]);
      }
      if (sel.patients) {
        addSection("Patients", ["Metric", "Value"], [
          ["Total Patients", d.patientCount],
          ["New This Month", d.newPatientsMonth ?? 0],
        ]);
        if (d.patientByMonth?.length) {
          rows.push(["Patient Growth"]);
          rows.push(["Month", "Count"]);
          d.patientByMonth.forEach((m: { month: string; count: number }) => rows.push([m.month, m.count]));
          rows.push([]);
        }
      }
      if (sel.appointments) {
        addSection("Appointments", ["Metric", "Value"], [
          ["Total", d.appointmentCount],
          ["Completed", d.confirmedAppts ?? 0],
          ["Cancelled", d.cancelledAppts ?? 0],
          ["No-show", d.noShowAppts ?? 0],
        ]);
      }
      if (sel.invoices && d.invoiceList?.length) {
        addSection("Invoices", ["Invoice No", "Patient", "Type", "Total", "Paid", "Due", "Status"],
          d.invoiceList.slice(0, 100).map((inv: { invoiceNo: string; patientName: string; type: string; total: number; paid: number; due: number; status: string }) =>
            [inv.invoiceNo, inv.patientName, inv.type, inv.total, inv.paid, inv.due, inv.status]));
      }
      if (sel.labOrders) {
        addSection("Laboratory Orders", ["Metric", "Value"], [
          ["Total Orders", d.totalLabOrders ?? 0],
          ["Total Revenue", d.labOrdersTotal ?? 0],
          ["Collected", d.labOrdersPaid ?? 0],
          ["Outstanding", d.labOrdersDue ?? 0],
          ["Pending", d.labPendingOrders ?? 0],
          ["Completed", d.labCompletedOrders ?? 0],
        ]);
      }
      if (sel.labTests && d.labTestsPopularity?.length) {
        addSection("Lab Tests", ["Test Name", "Orders"], d.labTestsPopularity.map((t: { name: string; count: number }) => [t.name, t.count]));
      }
      if (sel.pharmacy) {
        addSection("Pharmacy", ["Metric", "Value"], [
          ["Total Sales", d.phSalesTotal ?? 0],
          ["Total Purchases", d.phPurchasesTotal ?? 0],
          ["Stock Value", d.phStockValue ?? 0],
        ]);
        if (d.expiringMedicines?.length) {
          addSection("Expiring Medicines", ["Name", "Batch", "Expiry", "Stock", "Status"],
            d.expiringMedicines.map((m: { name: string; batch: string; expiry: string; stock: number; status: string }) =>
              [m.name, m.batch, new Date(m.expiry).toLocaleDateString(), m.stock, m.status]));
        }
      }
      if (sel.doctors && d.doctorPerf?.length) {
        addSection("Doctor Performance", ["Doctor", "Patients", "Revenue"], d.doctorPerf.map((doc: { name: string; patients: number; revenue: number }) => [doc.name, doc.patients, doc.revenue]));
      }
      if (sel.expenses) {
        addSection("Expenses", ["Code", "Category", "Description", "Amount", "Date"],
          (d.expenses || []).slice(0, 50).map((e: { code: string; category: string; description: string; amount: number; date: string }) =>
            [e.code, e.category, e.description, e.amount, new Date(e.date).toLocaleDateString()]));
      }
      if (sel.staff && d.staffAttendance?.length) {
        addSection("Staff Attendance", ["Name", "Present", "Absent", "Leave"],
          d.staffAttendance.map((s: { name: string; present: number; absent: number; leave: number }) => [s.name, s.present, s.absent, s.leave]));
      }

      exportToCSV(`master-report-${new Date().toISOString().split("T")[0]}`, [], rows);
      setMasterReportOpen(false);
      toast.success(`Master report exported as ${format.toUpperCase()}`);
      return;
    }

    // ---- PDF (print) ----
    let html = `<h2 style="text-align:center;margin:0 0 4px">Master Business Report</h2><p style="text-align:center;color:#666;margin:0 0 20px;font-size:12px">Period: ${periodLabel}</p>`;

    // Overview
    if (sel.overview) {
      html += `<h3>Overview</h3><div class="info-grid">`;
      html += `<div><div class="label">Total Revenue</div><div>${formatRs(d.totalRevenue)}</div></div>`;
      html += `<div><div class="label">Total Collection</div><div>${formatRs(d.totalCollection)}</div></div>`;
      html += `<div><div class="label">Outstanding Due</div><div>${formatRs(d.totalDue)}</div></div>`;
      html += `<div><div class="label">Net Profit</div><div>${formatRs(d.netProfit ?? (d.totalRevenue - d.expensesTotal))}</div></div>`;
      html += `<div><div class="label">Total Expenses</div><div>${formatRs(d.expensesTotal)}</div></div>`;
      html += `<div><div class="label">Collection Rate</div><div>${d.totalRevenue > 0 ? `${((d.totalCollection / d.totalRevenue) * 100).toFixed(1)}%` : "0%"}</div></div>`;
      html += `</div>`;
    }

    // Patients
    if (sel.patients) {
      html += `<h3>Patients</h3><div class="info-grid">`;
      html += `<div><div class="label">Total Patients</div><div>${d.patientCount}</div></div>`;
      html += `<div><div class="label">New This Month</div><div>${d.newPatientsMonth ?? "--"}</div></div>`;
      html += `</div>`;
      if (d.patientByMonth?.length) {
        html += `<table><thead><tr><th>Month</th><th style="text-align:right">Count</th></tr></thead><tbody>`;
        d.patientByMonth.forEach((m: { month: string; count: number }) => { html += `<tr><td>${m.month}</td><td style="text-align:right">${m.count}</td></tr>`; });
        html += `</tbody></table>`;
      }
    }

    // Appointments
    if (sel.appointments) {
      html += `<h3>Appointments</h3><div class="info-grid">`;
      html += `<div><div class="label">Total</div><div>${d.appointmentCount}</div></div>`;
      html += `<div><div class="label">Completed</div><div>${d.confirmedAppts ?? 0}</div></div>`;
      html += `<div><div class="label">Cancelled</div><div>${d.cancelledAppts ?? 0}</div></div>`;
      html += `<div><div class="label">No-show</div><div>${d.noShowAppts ?? 0}</div></div>`;
      html += `</div>`;
    }

    // Invoices
    if (sel.invoices) {
      html += `<h3>Invoices</h3>`;
      if (d.invoiceList?.length) {
        html += `<table><thead><tr><th>Invoice No</th><th>Patient</th><th>Type</th><th style="text-align:right">Total</th><th style="text-align:right">Paid</th><th style="text-align:right">Due</th><th>Status</th></tr></thead><tbody>`;
        d.invoiceList.slice(0, 50).forEach((inv: { invoiceNo: string; patientName: string; type: string; total: number; paid: number; due: number; status: string }) => {
          html += `<tr><td>${inv.invoiceNo}</td><td>${inv.patientName}</td><td>${inv.type}</td><td style="text-align:right">${formatRs(inv.total)}</td><td style="text-align:right">${formatRs(inv.paid)}</td><td style="text-align:right">${formatRs(inv.due)}</td><td>${inv.status}</td></tr>`;
        });
        html += `</tbody></table>`;
      } else {
        html += `<p style="color:#666;font-size:12px">No invoices in this period.</p>`;
      }
    }

    // Lab Orders
    if (sel.labOrders) {
      html += `<h3>Laboratory Orders</h3><div class="info-grid">`;
      html += `<div><div class="label">Total Orders</div><div>${d.totalLabOrders ?? 0}</div></div>`;
      html += `<div><div class="label">Total Revenue</div><div>${formatRs(d.labOrdersTotal ?? 0)}</div></div>`;
      html += `<div><div class="label">Collected</div><div>${formatRs(d.labOrdersPaid ?? 0)}</div></div>`;
      html += `<div><div class="label">Outstanding</div><div>${formatRs(d.labOrdersDue ?? 0)}</div></div>`;
      html += `<div><div class="label">Pending</div><div>${d.labPendingOrders ?? 0}</div></div>`;
      html += `<div><div class="label">Completed</div><div>${d.labCompletedOrders ?? 0}</div></div>`;
      html += `</div>`;
    }

    // Lab Tests
    if (sel.labTests) {
      html += `<h3>Lab Tests</h3>`;
      html += `<div class="info-grid"><div><div class="label">Total Test Types</div><div>${d.totalLabTests ?? 0}</div></div></div>`;
      if (d.labTestsPopularity?.length) {
        html += `<table><thead><tr><th>Test Name</th><th style="text-align:right">Orders</th></tr></thead><tbody>`;
        d.labTestsPopularity.forEach((t: { name: string; count: number }) => { html += `<tr><td>${t.name}</td><td style="text-align:right">${t.count}</td></tr>`; });
        html += `</tbody></table>`;
      }
    }

    // Pharmacy
    if (sel.pharmacy) {
      html += `<h3>Pharmacy</h3><div class="info-grid">`;
      html += `<div><div class="label">Total Sales</div><div>${formatRs(d.phSalesTotal ?? 0)}</div></div>`;
      html += `<div><div class="label">Total Purchases</div><div>${formatRs(d.phPurchasesTotal ?? 0)}</div></div>`;
      html += `<div><div class="label">Stock Value</div><div>${formatRs(d.phStockValue ?? 0)}</div></div>`;
      html += `</div>`;
      if (d.expiringMedicines?.length) {
        html += `<p style="font-size:12px;font-weight:bold;margin-top:8px">Expiring Medicines (${d.expiringMedicines.length})</p>`;
        html += `<table><thead><tr><th>Name</th><th>Batch</th><th>Expiry</th><th style="text-align:right">Stock</th><th>Status</th></tr></thead><tbody>`;
        d.expiringMedicines.forEach((m: { name: string; batch: string; expiry: string; stock: number; status: string }) => {
          html += `<tr><td>${m.name}</td><td>${m.batch}</td><td>${new Date(m.expiry).toLocaleDateString()}</td><td style="text-align:right">${m.stock}</td><td>${m.status}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    }

    // Doctors
    if (sel.doctors) {
      html += `<h3>Doctor Performance</h3>`;
      if (d.doctorPerf?.length) {
        html += `<table><thead><tr><th>Doctor</th><th style="text-align:right">Patients</th><th style="text-align:right">Revenue</th></tr></thead><tbody>`;
        d.doctorPerf.forEach((doc: { name: string; patients: number; revenue: number }) => {
          html += `<tr><td>${doc.name}</td><td style="text-align:right">${doc.patients}</td><td style="text-align:right">${formatRs(doc.revenue)}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    }

    // Expenses
    if (sel.expenses) {
      html += `<h3>Expenses</h3><div class="info-grid">`;
      html += `<div><div class="label">Total Expenses</div><div>${formatRs(d.expensesTotal)}</div></div>`;
      html += `</div>`;
      if (d.expenses?.length) {
        html += `<table><thead><tr><th>Code</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th><th>Date</th></tr></thead><tbody>`;
        d.expenses.slice(0, 30).forEach((e: { code: string; category: string; description: string; amount: number; date: string }) => {
          html += `<tr><td>${e.code}</td><td>${e.category}</td><td>${e.description}</td><td style="text-align:right">${formatRs(e.amount)}</td><td>${new Date(e.date).toLocaleDateString()}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    }

    // Staff
    if (sel.staff) {
      html += `<h3>Staff</h3><div class="info-grid">`;
      html += `<div><div class="label">Total Staff</div><div>${d.totalStaff ?? 0}</div></div>`;
      html += `<div><div class="label">Active</div><div>${d.activeStaff ?? 0}</div></div>`;
      html += `</div>`;
      if (d.staffAttendance?.length) {
        html += `<table><thead><tr><th>Name</th><th style="text-align:right">Present</th><th style="text-align:right">Absent</th><th style="text-align:right">Leave</th></tr></thead><tbody>`;
        d.staffAttendance.forEach((s: { name: string; present: number; absent: number; leave: number }) => {
          html += `<tr><td>${s.name}</td><td style="text-align:right">${s.present}</td><td style="text-align:right">${s.absent}</td><td style="text-align:right">${s.leave}</td></tr>`;
        });
        html += `</tbody></table>`;
      }
    }

    printHTML(`${tenantBranding?.clinicName || "Clinic"} - Master Report`, html);
    setMasterReportOpen(false);
    toast.success("Master report ready for print/download");
  };

  const currentCategory = REPORT_CATEGORIES.find((c) =>
    c.items.some((i) => i.key === selectedReport)
  );
  const currentItem = currentCategory?.items.find((i) => i.key === selectedReport);

  if (loading || !data) return <ReportsSkeleton />;

  const d = data;

  const netProfit = d.netProfit ?? (d.totalRevenue - d.expensesTotal);

  /* --- Shared computed data --- */
  const revenuePieData = recordToPieData(d.revenueByType, REVENUE_TYPE_LABELS);
  const totalRevenueByType = revenuePieData.reduce((s, v) => s + v.value, 0) || 1;

  const expensePieData = recordToPieData(d.expenseByCategory, EXPENSE_CATEGORY_LABELS);
  const sortedDoctors = [...(d.doctorPerf || [])].sort((a, b) => b.patients - a.patients);
  const paymentMethodPieData = recordToPieData(d.revenueByPayment);
  const invoicesByTypePieData = recordToPieData(d.invoicesByType);
  const paymentsByMethodPieData = recordToPieData(d.paymentsByMethod);
  const labByStatusPieData = recordToPieData(d.labByStatus);
  const staffByDeptPieData = recordToPieData(d.staffByDept);

  /* --- Export & Print --- */
  const exportExcel = () => {
    const rows: (string | number)[][] = [];
    rows.push(["Report Summary", ""]);
    rows.push(["Total Revenue", d.totalRevenue]);
    rows.push(["Total Collection", d.totalCollection]);
    rows.push(["Total Due", d.totalDue]);
    rows.push(["Expenses", d.expensesTotal]);
    rows.push(["Net Profit", netProfit]);
    rows.push([]);
    rows.push(["Revenue by Type", "Amount"]);
    revenuePieData.forEach((r) => rows.push([r.name, r.value]));
    rows.push([]);
    rows.push(["Expenses by Category", "Amount"]);
    expensePieData.forEach((r) => rows.push([r.name, r.value]));
    exportToCSV("reports-summary", ["Metric", "Value"], rows);
    toast.success("Reports exported to CSV");
  };

  const printReport = () => {
    const html = `${docHeader("RPT-REPORT", "Reports Summary", formatDate(new Date()))}
      <div class="info-grid">
        <div><div class="label">Total Revenue</div><div>${formatRs(d.totalRevenue)}</div></div>
        <div><div class="label">Total Collection</div><div>${formatRs(d.totalCollection)}</div></div>
        <div><div class="label">Total Due</div><div>${formatRs(d.totalDue)}</div></div>
        <div><div class="label">Net Profit</div><div>${formatRs(netProfit)}</div></div>
      </div>`;
    printHTML(`${tenantBranding?.clinicName || "Clinic"} Reports`, html);
    toast.success("Opening print dialog");
  };

  /* ============================================================
     Render Report Content
     ============================================================ */

  const renderReportContent = () => {
    switch (selectedReport) {

      // -------------------------------------------------------
      // 1. BUSINESS SUMMARY
      // -------------------------------------------------------
      case "business-summary": {
        const kpis = [
          { label: "Total Revenue", value: formatRs(d.totalRevenue), icon: TrendingUp, accent: "from-emerald-500 to-emerald-600" },
          { label: "Total Collection", value: formatRs(d.totalCollection), icon: Wallet, accent: "from-teal-500 to-teal-600" },
          { label: "Outstanding Due", value: formatRs(d.totalDue), icon: AlertCircle, accent: "from-rose-500 to-rose-600" },
          { label: "Net Profit", value: formatRs(netProfit), icon: Receipt, accent: netProfit >= 0 ? "from-violet-500 to-violet-600" : "from-rose-500 to-rose-600" },
        ];
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.map((k, i) => (
                <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.accent} flex items-center justify-center`}>
                          <k.icon className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <p className="mt-2 text-xl font-bold">{k.value}</p>
                      <p className="text-xs text-muted-foreground">{k.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Revenue</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={d.monthlyRevenue} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name="Revenue" />
                      <Bar dataKey="collection" fill="#10b981" radius={[4, 4, 0, 0]} name="Collection" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Type</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={revenuePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                        {revenuePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3"><p className="text-[10px] text-muted-foreground uppercase">Appointments</p><p className="text-lg font-bold">{d.appointmentCount}</p></div>
              <div className="rounded-lg border p-3"><p className="text-[10px] text-muted-foreground uppercase">Total Patients</p><p className="text-lg font-bold">{d.patientCount}</p></div>
              <div className="rounded-lg border p-3"><p className="text-[10px] text-muted-foreground uppercase">Expenses</p><p className="text-lg font-bold text-rose-600">{formatRs(d.expensesTotal)}</p></div>
              <div className="rounded-lg border p-3"><p className="text-[10px] text-muted-foreground uppercase">Collection Rate</p><p className="text-lg font-bold">{d.totalRevenue > 0 ? `${((d.totalCollection / d.totalRevenue) * 100).toFixed(1)}%` : "0%"}</p></div>
            </div>
          </div>
        );
      }

      // -------------------------------------------------------
      // 2. REVENUE
      // -------------------------------------------------------
      case "revenue":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Revenue</p><p className="text-xl font-bold text-emerald-600">{formatRs(d.totalRevenue)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Collection</p><p className="text-xl font-bold text-teal-600">{formatRs(d.totalCollection)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Outstanding</p><p className="text-xl font-bold text-rose-600">{formatRs(d.totalDue)}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Revenue Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={d.dailyRevenue}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid className="stroke-border" opacity={0.3} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip money />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
                    <Area type="monotone" dataKey="collection" stroke="#10b981" strokeWidth={2} fill="none" name="Collection" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Type</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-xs">Type</TableHead><TableHead className="text-xs text-right">Amount</TableHead><TableHead className="text-xs text-right">Share</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {revenuePieData.map((r) => (
                      <TableRow key={r.name}>
                        <TableCell><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: r.color }} /><span className="text-sm">{r.name}</span></div></TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatRs(r.value)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{((r.value / totalRevenueByType) * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 3. EXPENSES
      // -------------------------------------------------------
      case "expenses": {
        const totalExpenses = d.expensesTotal;
        const expenseChartData = expensePieData;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Expenses</p><p className="text-xl font-bold text-rose-600">{formatRs(totalExpenses)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Categories</p><p className="text-xl font-bold">{expenseChartData.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Expense Ratio</p><p className="text-xl font-bold">{d.totalRevenue > 0 ? `${((totalExpenses / d.totalRevenue) * 100).toFixed(1)}%` : "0%"}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Expense by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={expenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {expenseChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Expense Table</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-xs">Category</TableHead><TableHead className="text-xs text-right">Amount</TableHead><TableHead className="text-xs text-right">Share</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {expenseChartData.map((r) => (
                      <TableRow key={r.name}>
                        <TableCell><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: r.color }} /><span className="text-sm">{r.name}</span></div></TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatRs(r.value)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{totalExpenses > 0 ? `${((r.value / totalExpenses) * 100).toFixed(1)}%` : "0%"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      }

      // -------------------------------------------------------
      // 4. PROFIT & LOSS
      // -------------------------------------------------------
      case "profit-loss":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Revenue</p><p className="text-xl font-bold text-emerald-600">{formatRs(d.totalRevenue)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Expenses</p><p className="text-xl font-bold text-rose-600">{formatRs(d.expensesTotal)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Net Profit</p><p className={`text-xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatRs(netProfit)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Profit Margin</p><p className={`text-xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{d.totalRevenue > 0 ? `${((netProfit / d.totalRevenue) * 100).toFixed(1)}%` : "0%"}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly P&L</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="collection" fill="#10b981" radius={[4, 4, 0, 0]} name="Collection" />
                    <Bar dataKey="profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 5. PATIENT REGISTRATION
      // -------------------------------------------------------
      case "patient-registration":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Patients</p><p className="text-xl font-bold">{d.patientCount}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">New This Month</p><p className="text-xl font-bold text-teal-600">{d.newPatientsMonth}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Returning</p><p className="text-xl font-bold text-emerald-600">{Math.max(0, d.patientCount - d.newPatientsMonth)}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Patient Registration by Month</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.patientByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="Patients" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 6. PATIENT VISITS (Placeholder)
      // -------------------------------------------------------
      case "patient-visits":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Appointments</p><p className="text-xl font-bold">{d.appointmentCount}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Patients</p><p className="text-xl font-bold text-teal-600">{d.patientCount}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Avg Visits/Patient</p><p className="text-xl font-bold text-emerald-600">{d.patientCount > 0 ? (d.appointmentCount / d.patientCount).toFixed(1) : "0"}</p></CardContent></Card>
            </div>
            <PlaceholderReport title="Patient Visits Report" description="Analyze patient visit frequency, patterns, and department-wise breakdown." icon={ClipboardList} />
          </div>
        );

      // -------------------------------------------------------
      // 7. PATIENT GROWTH
      // -------------------------------------------------------
      case "patient-growth":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Patients</p><p className="text-xl font-bold">{d.patientCount}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">New This Month</p><p className="text-xl font-bold text-teal-600">{d.newPatientsMonth}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Months Tracked</p><p className="text-xl font-bold text-emerald-600">{d.patientByMonth.length}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Patient Growth by Month</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.patientByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Patients" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 8. PATIENT SOURCES (Placeholder)
      // -------------------------------------------------------
      case "patient-sources":
        return <PlaceholderReport title="Patient Sources Report" description="Understand where patients come from — referrals, online, walk-in, etc." icon={MapPin} />;

      // -------------------------------------------------------
      // 9. OPD REPORT
      // -------------------------------------------------------
      case "opd-report":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Appointments</p><p className="text-xl font-bold">{d.appointmentCount}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Confirmed</p><p className="text-xl font-bold text-emerald-600">{d.confirmedAppts}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Pending</p><p className="text-xl font-bold text-amber-600">{d.pendingAppts}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Cancelled</p><p className="text-xl font-bold text-rose-600">{d.cancelledAppts}</p></CardContent></Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Appointments by Day</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={d.apptByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Appointments by Hour</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={d.apptByHour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      // -------------------------------------------------------
      // 10. APPOINTMENT REPORT
      // -------------------------------------------------------
      case "appointment-report":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total</p><p className="text-xl font-bold">{d.appointmentCount}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Confirmed</p><p className="text-xl font-bold text-emerald-600">{d.confirmedAppts}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Cancelled</p><p className="text-xl font-bold text-rose-600">{d.cancelledAppts}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Pending</p><p className="text-xl font-bold text-amber-600">{d.pendingAppts}</p></CardContent></Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">By Doctor</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={d.apptByDoctor}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="completed" fill="#0d9488" radius={[4, 4, 0, 0]} name="Completed" />
                      <Bar dataKey="cancelled" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Cancelled" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">By Day</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={d.apptByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      // -------------------------------------------------------
      // 11. NO-SHOW REPORT
      // -------------------------------------------------------
      case "noshow-report":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">No-show Count</p><p className="text-xl font-bold text-rose-600">{d.noShowAppts}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">No-show Rate</p><p className="text-xl font-bold text-rose-600">{d.appointmentCount > 0 ? `${((d.noShowAppts / d.appointmentCount) * 100).toFixed(1)}%` : "0%"}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">No-show by Doctor</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-xs">Doctor</TableHead><TableHead className="text-xs text-right">Total Appts</TableHead><TableHead className="text-xs text-right">Cancelled</TableHead><TableHead className="text-xs text-right">Completed</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(d.apptByDoctor || []).map((doc) => (
                      <TableRow key={doc.name}>
                        <TableCell className="text-sm font-medium">{doc.name}</TableCell>
                        <TableCell className="text-right text-sm">{doc.total}</TableCell>
                        <TableCell className="text-right text-sm text-rose-600">{doc.cancelled}</TableCell>
                        <TableCell className="text-right text-sm text-emerald-600">{doc.completed}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 12. DOCTOR PERFORMANCE
      // -------------------------------------------------------
      case "doctor-performance":
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="w-4 h-4 text-teal-600" /> Doctor Performance</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sortedDoctors} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" width={110} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number, n: string) => n === "patients" ? [`${v} patients`, "Patients"] : [formatRs(v), "Revenue"]} />
                    <Bar dataKey="patients" fill="#0d9488" radius={[0, 4, 4, 0]} name="Patients" barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-xs">Doctor</TableHead><TableHead className="text-xs text-right">Patients</TableHead><TableHead className="text-xs text-right">Revenue</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {sortedDoctors.map((doc) => (
                      <TableRow key={doc.name}>
                        <TableCell className="text-sm font-medium">{doc.name}</TableCell>
                        <TableCell className="text-right text-sm">{doc.patients}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatRs(doc.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 13. COLLECTIONS
      // -------------------------------------------------------
      case "collections":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Collection</p><p className="text-xl font-bold text-teal-600">{formatRs(d.totalCollection)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Collection Rate</p><p className="text-xl font-bold">{d.totalRevenue > 0 ? `${((d.totalCollection / d.totalRevenue) * 100).toFixed(1)}%` : "0%"}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Pharmacy Sales Collected</p><p className="text-xl font-bold text-emerald-600">{formatRs(d.phSalesCollection)}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Collections by Payment Method</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={paymentMethodPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {paymentMethodPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 14. INVOICES
      // -------------------------------------------------------
      case "invoices":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Invoices</p><p className="text-xl font-bold">{(d.invoiceList || []).length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Outstanding</p><p className="text-xl font-bold text-rose-600">{formatRs(d.outstanding)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Revenue</p><p className="text-xl font-bold text-emerald-600">{formatRs(d.totalRevenue)}</p></CardContent></Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Invoices by Type</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={invoicesByTypePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                        {invoicesByTypePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Invoice Status</p>
                  <div className="space-y-2">
                    {Object.entries(d.invoicesByType).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{key}</span>
                        <span className="text-sm font-semibold">{val}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Invoice List</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Invoice #</TableHead>
                    <TableHead className="text-xs">Patient</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right">Paid</TableHead>
                    <TableHead className="text-xs text-right">Due</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(d.invoiceList || []).slice(0, 20).map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-xs font-mono">{inv.invoiceNo}</TableCell>
                        <TableCell className="text-sm">{inv.patientName}</TableCell>
                        <TableCell className="text-xs">{inv.type}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatRs(inv.total)}</TableCell>
                        <TableCell className="text-right text-sm text-emerald-600">{formatRs(inv.paid)}</TableCell>
                        <TableCell className="text-right text-sm text-rose-600">{formatRs(inv.due)}</TableCell>
                        <TableCell><Badge className={`text-[10px] ${STATUS_COLORS[inv.status] || "bg-gray-100"}`}>{inv.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(inv.date)}</TableCell>
                      </TableRow>
                    ))}
                    {(!d.invoiceList || d.invoiceList.length === 0) && (
                      <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">No invoices found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 15. PAYMENTS
      // -------------------------------------------------------
      case "payments":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Collection</p><p className="text-xl font-bold text-teal-600">{formatRs(d.totalCollection)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Pharmacy Sales</p><p className="text-xl font-bold text-emerald-600">{formatRs(d.phSalesTotal)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Lab Orders Paid</p><p className="text-xl font-bold text-emerald-600">{formatRs(d.labOrdersPaid)}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Payments by Method</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={paymentsByMethodPieData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Amount">
                      {paymentsByMethodPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 16. REFUNDS (Placeholder)
      // -------------------------------------------------------
      case "refunds":
        return <PlaceholderReport title="Refunds Report" description="Track refund requests, approvals, and refund amounts." icon={RotateCcw} />;

      // -------------------------------------------------------
      // 17. DISCOUNTS (Placeholder)
      // -------------------------------------------------------
      case "discounts":
        return <PlaceholderReport title="Discounts Report" description="Analyze discount usage, impact on revenue, and patterns." icon={Percent} />;

      // -------------------------------------------------------
      // 18. OUTSTANDING
      // -------------------------------------------------------
      case "outstanding": {
        const agingData = [
          { name: "0-30 Days", value: d.outstanding0_30 || 0, color: "#10b981" },
          { name: "31-60 Days", value: d.outstanding31_60 || 0, color: "#f59e0b" },
          { name: "60+ Days", value: d.outstanding60plus || 0, color: "#f43f5e" },
        ];
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Outstanding</p><p className="text-xl font-bold text-rose-600">{formatRs(d.outstanding || d.totalDue)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">0-30 Days</p><p className="text-xl font-bold text-emerald-600">{formatRs(d.outstanding0_30 || 0)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">31-60 Days</p><p className="text-xl font-bold text-amber-600">{formatRs(d.outstanding31_60 || 0)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">60+ Days</p><p className="text-xl font-bold text-rose-600">{formatRs(d.outstanding60plus || 0)}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Aging Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={agingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Amount">
                      {agingData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );
      }

      // -------------------------------------------------------
      // 19. PHARMACY SALES
      // -------------------------------------------------------
      case "ph-sales":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Sales</p><p className="text-xl font-bold text-emerald-600">{formatRs(d.phSalesTotal)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Collection</p><p className="text-xl font-bold text-teal-600">{formatRs(d.phSalesCollection)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Collection Rate</p><p className="text-xl font-bold">{d.phSalesTotal > 0 ? `${((d.phSalesCollection / d.phSalesTotal) * 100).toFixed(1)}%` : "0%"}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Pharmacy Sales</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.monthlyPhSales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="sales" fill="#0d9488" radius={[4, 4, 0, 0]} name="Sales" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 20. PHARMACY PURCHASES
      // -------------------------------------------------------
      case "ph-purchases":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Purchases</p><p className="text-xl font-bold text-amber-600">{formatRs(d.phPurchasesTotal)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Stock Value</p><p className="text-xl font-bold text-teal-600">{formatRs(d.phStockValue)}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Purchases</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.monthlyPhSales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Purchases" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 21. PHARMACY STOCK
      // -------------------------------------------------------
      case "ph-stock":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Stock Value</p><p className="text-xl font-bold text-teal-600">{formatRs(d.phStockValue)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Low Stock Items</p><p className="text-xl font-bold text-rose-600">{(d.lowStockMedicines || []).length}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Low Stock Medicines</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-xs">Medicine</TableHead><TableHead className="text-xs text-right">Current Stock</TableHead><TableHead className="text-xs text-right">Reorder Level</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(d.lowStockMedicines || []).map((med, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">{med.name}</TableCell>
                        <TableCell className="text-right text-sm text-rose-600">{med.stock}</TableCell>
                        <TableCell className="text-right text-sm">{med.reorder}</TableCell>
                      </TableRow>
                    ))}
                    {(!d.lowStockMedicines || d.lowStockMedicines.length === 0) && (
                      <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No low stock items</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 22. PHARMACY EXPIRY
      // -------------------------------------------------------
      case "ph-expiry": {
        const expiredCount = (d.expiringMedicines || []).filter((m) => m.status === "expired").length;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Expiring Medicines</p><p className="text-xl font-bold text-amber-600">{(d.expiringMedicines || []).length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Already Expired</p><p className="text-xl font-bold text-rose-600">{expiredCount}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Expiring Medicines</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-xs">Medicine</TableHead><TableHead className="text-xs">Batch</TableHead><TableHead className="text-xs">Expiry</TableHead><TableHead className="text-xs text-right">Stock</TableHead><TableHead className="text-xs">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(d.expiringMedicines || []).map((med, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">{med.name}</TableCell>
                        <TableCell className="text-xs">{med.batch}</TableCell>
                        <TableCell className="text-xs">{med.expiry}</TableCell>
                        <TableCell className="text-right text-sm">{med.stock}</TableCell>
                        <TableCell><Badge className={`text-[10px] ${med.status === "expired" ? STATUS_COLORS.cancelled : "bg-amber-100 text-amber-700"}`}>{med.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {(!d.expiringMedicines || d.expiringMedicines.length === 0) && (
                      <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No expiring medicines</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      }

      // -------------------------------------------------------
      // 23. PHARMACY PROFIT
      // -------------------------------------------------------
      case "ph-profit":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Sales</p><p className="text-xl font-bold text-emerald-600">{formatRs(d.phSalesTotal)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Purchases</p><p className="text-xl font-bold text-amber-600">{formatRs(d.phPurchasesTotal)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Gross Profit</p><p className={`text-xl font-bold ${(d.phSalesTotal - d.phPurchasesTotal) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatRs(d.phSalesTotal - d.phPurchasesTotal)}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Sales vs Purchases (Monthly)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.monthlyPhSales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="sales" fill="#0d9488" radius={[4, 4, 0, 0]} name="Sales" />
                    <Bar dataKey="purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Purchases" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 24. LAB TESTS
      // -------------------------------------------------------
      case "lab-tests":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Lab Orders</p><p className="text-xl font-bold">{d.totalLabOrders || d.labOrdersTotal}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Tests</p><p className="text-xl font-bold text-teal-600">{d.totalLabTests}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Lab Revenue</p><p className="text-xl font-bold text-emerald-600">{formatRs(d.labOrdersPaid)}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Popular Tests</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.labTestsPopularity} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Count" barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 25. LAB PENDING
      // -------------------------------------------------------
      case "lab-pending":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Orders</p><p className="text-xl font-bold">{d.labOrdersTotal}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Pending</p><p className="text-xl font-bold text-amber-600">{d.labPendingOrders}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">In Progress</p><p className="text-xl font-bold text-blue-600">{d.labInProgressOrders}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Completed</p><p className="text-xl font-bold text-emerald-600">{d.labCompletedOrders}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Orders by Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={labByStatusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {labByStatusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 26. LAB RESULTS
      // -------------------------------------------------------
      case "lab-results":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Completed Orders</p><p className="text-xl font-bold text-emerald-600">{d.labCompletedOrders}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Tests</p><p className="text-xl font-bold">{d.totalLabTests}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Lab Revenue</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.monthlyLabRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="orders" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 27. LAB REVENUE
      // -------------------------------------------------------
      case "lab-revenue":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Lab Orders Paid</p><p className="text-xl font-bold text-emerald-600">{formatRs(d.labOrdersPaid)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Lab Orders Due</p><p className="text-xl font-bold text-rose-600">{formatRs(d.labOrdersDue)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Orders</p><p className="text-xl font-bold">{d.labOrdersTotal}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Lab Revenue</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.monthlyLabRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => formatRs(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="orders" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 28. STAFF ATTENDANCE
      // -------------------------------------------------------
      case "staff-attendance":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Staff</p><p className="text-xl font-bold">{d.totalStaff}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Active Staff</p><p className="text-xl font-bold text-emerald-600">{d.activeStaff}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Attendance Records</p><p className="text-xl font-bold text-teal-600">{(d.staffAttendance || []).length}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Staff Attendance</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.staffAttendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} name="Present" />
                    <Bar dataKey="absent" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Absent" />
                    <Bar dataKey="leave" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Leave" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-xs">Staff</TableHead><TableHead className="text-xs text-right">Present</TableHead><TableHead className="text-xs text-right">Absent</TableHead><TableHead className="text-xs text-right">Leave</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(d.staffAttendance || []).map((s) => (
                      <TableRow key={s.name}>
                        <TableCell className="text-sm font-medium">{s.name}</TableCell>
                        <TableCell className="text-right text-sm text-emerald-600">{s.present}</TableCell>
                        <TableCell className="text-right text-sm text-rose-600">{s.absent}</TableCell>
                        <TableCell className="text-right text-sm text-amber-600">{s.leave}</TableCell>
                      </TableRow>
                    ))}
                    {(!d.staffAttendance || d.staffAttendance.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No attendance records</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 29. STAFF PERFORMANCE
      // -------------------------------------------------------
      case "staff-performance":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Staff</p><p className="text-xl font-bold">{d.totalStaff}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Active Staff</p><p className="text-xl font-bold text-emerald-600">{d.activeStaff}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Staff by Department</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={staffByDeptPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {staffByDeptPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );

      // -------------------------------------------------------
      // 30. STAFF PRODUCTIVITY (Placeholder)
      // -------------------------------------------------------
      case "staff-productivity":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Total Staff</p><p className="text-xl font-bold">{d.totalStaff}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase">Active Staff</p><p className="text-xl font-bold text-emerald-600">{d.activeStaff}</p></CardContent></Card>
            </div>
            <PlaceholderReport title="Staff Productivity Report" description="Track staff productivity metrics, task completion rates, and performance scores." icon={TrendingUp} />
          </div>
        );

      // -------------------------------------------------------
      // DIAGNOSTICS - All Placeholder
      // -------------------------------------------------------
      case "diag-orders":
      case "diag-reports":
      case "diag-revenue":
        return <PlaceholderReport title={`${currentItem?.label} Report`} description={`${currentItem?.label} analytics for diagnostics and imaging.`} icon={currentItem?.icon || Scan} />;

      // -------------------------------------------------------
      // MARKETING - All Placeholder
      // -------------------------------------------------------
      case "leads":
      case "sources":
      case "campaigns":
      case "conversion":
      case "roi":
        return <PlaceholderReport title={`${currentItem?.label} Report`} description={`${currentItem?.label} tracking and marketing analytics.`} icon={currentItem?.icon || Megaphone} />;

      // -------------------------------------------------------
      // TELEMEDICINE - All Placeholder
      // -------------------------------------------------------
      case "tele-sessions":
      case "tele-revenue":
        return <PlaceholderReport title={`${currentItem?.label} Report`} description={`${currentItem?.label} analytics for telemedicine consultations.`} icon={currentItem?.icon || Video} />;

      // -------------------------------------------------------
      // DEPARTMENTS - All Placeholder
      // -------------------------------------------------------
      case "dept-dental":
      case "dept-ivf":
      case "dept-dermatology":
      case "dept-other":
        return <PlaceholderReport title={`${currentItem?.label} Report`} description={`${currentItem?.label} department-specific analytics and metrics.`} icon={currentItem?.icon || Building2} />;

      // -------------------------------------------------------
      // PLATFORM - All Placeholder
      // -------------------------------------------------------
      case "plt-marketplace":
      case "plt-commission":
      case "plt-clinics":
      case "plt-doctors":
      case "plt-saas":
        return <PlaceholderReport title={`${currentItem?.label} Report`} description={`${currentItem?.label} analytics for the Carelim platform.`} icon={currentItem?.icon || Globe} />;

      default:
        return <PlaceholderReport title="Select a Report" description="Choose a report from the sidebar to view its details." icon={BarChart3} />;
    }
  };

  /* ============================================================
     Main Layout
     ============================================================ */

  return (
    <div className="flex gap-4 animate-fade-in h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 overflow-y-auto border rounded-xl bg-card scrollbar-thin">
        <div className="p-3 border-b">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-600" /> Reports
          </h2>
        </div>
        <div className="p-2 space-y-0.5">
          {REPORT_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const isExpanded = expandedCategories.includes(cat.key);
            const isActive = currentCategory?.key === cat.key;
            return (
              <div key={cat.key}>
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive ? "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  <CatIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 text-left">{cat.label}</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="ml-4 space-y-0.5 mt-0.5">
                    {cat.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.key}
                          onClick={() => setSelectedReport(item.key)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${selectedReport === item.key ? "bg-teal-600 text-white shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                        >
                          <ItemIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{currentItem?.label || "Business Summary"}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="w-3 h-3" />
              {dateRange === "week" && "This week"}{dateRange === "month" && "This month"}{dateRange === "quarter" && "This quarter"}{dateRange === "year" && "This year"}{dateRange === "all" && "All time"}{dateRange === "custom" && `${customStart} to ${customEnd}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["week", "month", "quarter", "year", "all"] as const).map((r) => (
              <button key={r} onClick={() => setDateRange(r)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${dateRange === r ? "bg-teal-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                {r === "week" ? "Week" : r === "month" ? "Month" : r === "quarter" ? "Quarter" : r === "year" ? "Year" : "All"}
              </button>
            ))}
            <button onClick={() => setDateRange("custom")} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${dateRange === "custom" ? "bg-teal-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
              Custom
            </button>
            {dateRange === "custom" && (
              <div className="flex items-center gap-1.5 ml-1">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-2 py-1 rounded-lg border text-xs bg-background" />
                <span className="text-xs text-muted-foreground">to</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-2 py-1 rounded-lg border text-xs bg-background" />
              </div>
            )}
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportExcel}>
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </Button>
          <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs" onClick={printReport}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          {selectedReport === "business-summary" && (
            <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs" onClick={() => setMasterReportOpen(true)}>
              <Download className="w-3.5 h-3.5" /> Master Report
            </Button>
          )}
        </div>

        {/* Report Content */}
        {renderReportContent()}

        {/* Master Report Dialog */}
        <Dialog open={masterReportOpen} onOpenChange={setMasterReportOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-violet-600" /> Download Master Report</DialogTitle>
              <DialogDescription>Select sections and download format</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {[
                { key: "overview", label: "Overview (Revenue, Collection, Profit)", icon: BarChart3 },
                { key: "patients", label: "Patients (Registration, Growth)", icon: Users },
                { key: "appointments", label: "Appointments (OPD, Visits)", icon: CalendarDays },
                { key: "invoices", label: "Invoices (All Invoice List)", icon: FileText },
                { key: "labOrders", label: "Laboratory Orders", icon: FlaskConical },
                { key: "labTests", label: "Lab Tests (Popularity, Types)", icon: TestTube },
                { key: "pharmacy", label: "Pharmacy (Sales, Stock, Expiry)", icon: Pill },
                { key: "doctors", label: "Doctor Performance", icon: Stethoscope },
                { key: "expenses", label: "Expenses (All Categories)", icon: TrendingDown },
                { key: "staff", label: "Staff (Attendance, Departments)", icon: UserCog },
              ].map((item) => (
                <label key={item.key} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${masterSections[item.key] ? "bg-violet-50 dark:bg-violet-950/20 border-violet-300" : "hover:bg-accent"}`}>
                  <Checkbox checked={!!masterSections[item.key]} onCheckedChange={() => toggleMasterSection(item.key)} />
                  <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </label>
              ))}
            </div>
            <div className="border-t pt-3 mt-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Download Format</p>
              <div className="flex gap-2">
                {([
                  { key: "pdf" as const, label: "PDF", icon: FileText, desc: "Print-ready document" },
                  { key: "excel" as const, label: "Excel", icon: FileSpreadsheet, desc: "Spreadsheet (.csv)" },
                  { key: "csv" as const, label: "CSV", icon: FileSpreadsheet, desc: "Plain CSV file" },
                ]).map((f) => (
                  <button key={f.key} type="button" onClick={() => setMasterFormat(f.key)} className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all ${masterFormat === f.key ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20" : "border-border hover:border-violet-300"}`}>
                    <f.icon className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setMasterReportOpen(false)}>Cancel</Button>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5" onClick={() => generateMasterReport(masterFormat)}>
                <Download className="w-3.5 h-3.5" /> Download {masterFormat.toUpperCase()}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

/* ============================================================
   Skeleton
   ============================================================ */

function ReportsSkeleton() {
  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      <div className="w-64 shrink-0 border rounded-xl bg-card p-3 space-y-2">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex-1 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
