// Carelim OS — Module Definitions for Onboarding
// All available modules organized by category with smart recommendations

import {
  Users, Calendar, Stethoscope, LayoutDashboard, FileText, Pill,
  FlaskConical, Scan, Receipt, Boxes, BarChart3, MessageSquare,
  Send, Bell, Video, Globe, Shield, Clock, UserCheck, Banknote,
  Scissors, HeartPulse, Baby, Eye, Bone, Activity,
  Thermometer, Syringe, Bed, Home, Store, Package,
  FileCheck, FileText as FileTextIcon, Bot, Mic, CalendarCheck,
  Clipboard, ClipboardCheck, Truck, Droplets, Wind,
} from "lucide-react";

export type ModuleCategory = "core" | "specialty" | "ai";

export interface ModuleDef {
  key: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: ModuleCategory;
  recommendedFor: string[]; // clinic types
}

export const MODULES: ModuleDef[] = [
  // ===== Core Modules =====
  { key: "patient-management", name: "Patient Management", description: "Comprehensive patient records, demographics, and medical history", icon: Users, category: "core", recommendedFor: ["all"] },
  { key: "appointment-management", name: "Appointment Management", description: "Smart scheduling, calendar integration, and automated reminders", icon: Calendar, category: "core", recommendedFor: ["all"] },
  { key: "doctor-management", name: "Doctor Management", description: "Doctor profiles, schedules, specializations, and availability", icon: Stethoscope, category: "core", recommendedFor: ["all"] },
  { key: "reception", name: "Reception", description: "Front desk operations, visitor management, and check-in", icon: LayoutDashboard, category: "core", recommendedFor: ["all"] },
  { key: "emr-ehr", name: "EMR/EHR", description: "Electronic Medical Records with SOAP notes and clinical documentation", icon: FileText, category: "core", recommendedFor: ["all"] },
  { key: "prescription", name: "Prescription", description: "Digital prescriptions with drug interaction alerts", icon: Pill, category: "core", recommendedFor: ["all"] },
  { key: "billing", name: "Billing", description: "Invoice generation, payment processing, and insurance claims", icon: Receipt, category: "core", recommendedFor: ["all"] },
  { key: "accounts", name: "Accounts", description: "Accounting, ledger, and financial reporting", icon: Banknote, category: "core", recommendedFor: ["all"] },
  { key: "inventory", name: "Inventory", description: "Stock management, reorder alerts, and supplier tracking", icon: Boxes, category: "core", recommendedFor: ["all"] },
  { key: "pharmacy", name: "Pharmacy", description: "Pharmacy POS, drug tracking, and batch management", icon: Pill, category: "core", recommendedFor: ["all"] },
  { key: "laboratory", name: "Laboratory", description: "Lab test ordering, results management, and reporting", icon: FlaskConical, category: "core", recommendedFor: ["all"] },
  { key: "radiology", name: "Radiology", description: "Imaging orders, DICOM viewer, and radiology reporting", icon: Scan, category: "core", recommendedFor: ["all"] },
  { key: "opd", name: "OPD", description: "Outpatient department management and token system", icon: Clock, category: "core", recommendedFor: ["all"] },
  { key: "ipd", name: "IPD", description: "Inpatient department management with bed allocation", icon: Bed, category: "core", recommendedFor: ["hospital", "eye-hospital"] },
  { key: "queue-management", name: "Queue Management", description: "Digital queue display, token generation, and wait time tracking", icon: Clock, category: "core", recommendedFor: ["all"] },
  { key: "reports", name: "Reports", description: "Analytics dashboard, custom reports, and data export", icon: BarChart3, category: "core", recommendedFor: ["all"] },
  { key: "sms", name: "SMS", description: "Automated SMS notifications and reminders", icon: MessageSquare, category: "core", recommendedFor: ["all"] },
  { key: "whatsapp", name: "WhatsApp", description: "WhatsApp messaging for appointments, prescriptions, and notifications", icon: Send, category: "core", recommendedFor: ["all"] },
  { key: "notification-center", name: "Notification Center", description: "Unified notification hub for all alerts and updates", icon: Bell, category: "core", recommendedFor: ["all"] },
  { key: "video-consultation", name: "Video Consultation", description: "Secure telemedicine video calls with recording", icon: Video, category: "core", recommendedFor: ["all"] },
  { key: "online-appointment", name: "Online Appointment", description: "Patient self-service online booking portal", icon: Globe, category: "core", recommendedFor: ["all"] },
  { key: "patient-portal", name: "Patient Portal", description: "Patient self-service dashboard for records and appointments", icon: Shield, category: "core", recommendedFor: ["all"] },
  { key: "telemedicine", name: "Telemedicine", description: "Remote patient monitoring and virtual care platform", icon: Video, category: "core", recommendedFor: ["all"] },
  { key: "attendance", name: "Attendance", description: "Staff attendance tracking with biometric integration", icon: Clock, category: "core", recommendedFor: ["all"] },
  { key: "hr", name: "HR", description: "Human resources management, staff profiles, and documents", icon: UserCheck, category: "core", recommendedFor: ["all"] },
  { key: "payroll", name: "Payroll", description: "Salary processing, payslips, and tax calculations", icon: Banknote, category: "core", recommendedFor: ["all"] },

  // ===== Specialty Modules =====
  { key: "ivf-fertility", name: "IVF & Fertility", description: "Complete IVF cycle tracking, embryo management, and fertility monitoring", icon: Baby, category: "specialty", recommendedFor: ["ivf-fertility-center"] },
  { key: "dental", name: "Dental", description: "Dental charting, odontogram, treatment planning, and lab orders", icon: Scissors, category: "specialty", recommendedFor: ["dental-clinic"] },
  { key: "eye-care", name: "Eye Care", description: "Ophthalmology module with refraction, OCT, and vision tracking", icon: Eye, category: "specialty", recommendedFor: ["eye-hospital"] },
  { key: "orthopedic", name: "Orthopedic", description: "Orthopedic surgery planning, implant tracking, and fracture management", icon: Bone, category: "specialty", recommendedFor: ["hospital", "clinic"] },
  { key: "cardiology", name: "Cardiology", description: "ECG, echocardiogram, stress test, and cardiac monitoring", icon: HeartPulse, category: "specialty", recommendedFor: ["hospital", "clinic"] },
  { key: "gynecology", name: "Gynecology", description: "Women's health, obstetrics, and gynecological procedures", icon: Activity, category: "specialty", recommendedFor: ["hospital", "clinic"] },
  { key: "pediatrics", name: "Pediatrics", description: "Pediatric-specific workflows, growth charts, and vaccination tracking", icon: Baby, category: "specialty", recommendedFor: ["hospital", "clinic"] },
  { key: "dermatology", name: "Dermatology", description: "Skin examination, lesion tracking, and dermatology procedures", icon: Thermometer, category: "specialty", recommendedFor: ["clinic", "hospital"] },
  { key: "dialysis", name: "Dialysis", description: "Hemodialysis scheduling, machine tracking, and patient monitoring", icon: Droplets, category: "specialty", recommendedFor: ["hospital"] },
  { key: "vaccination", name: "Vaccination", description: "Vaccine inventory, scheduling, and immunization tracking", icon: Syringe, category: "specialty", recommendedFor: ["clinic", "hospital", "pediatrics"] },
  { key: "insurance", name: "Insurance", description: "Insurance claim processing and coverage management", icon: FileCheck, category: "specialty", recommendedFor: ["hospital", "clinic"] },
  { key: "corporate-clients", name: "Corporate Clients", description: "Corporate health packages, group insurance, and billing", icon: Store, category: "specialty", recommendedFor: ["hospital", "diagnostic-center"] },
  { key: "home-care", name: "Home Care", description: "Home visit scheduling, nurse allocation, and visit tracking", icon: Home, category: "specialty", recommendedFor: ["clinic", "hospital"] },
  { key: "home-sample-collection", name: "Home Sample Collection", description: "Lab sample pickup scheduling and tracking", icon: Truck, category: "specialty", recommendedFor: ["laboratory", "diagnostic-center"] },
  { key: "package-management", name: "Package Management", description: "Health checkup packages and procedure bundles", icon: Package, category: "specialty", recommendedFor: ["hospital", "diagnostic-center"] },

  // ===== AI Modules =====
  { key: "ai-prescription", name: "AI Prescription", description: "AI-powered prescription suggestions with drug interaction checking", icon: Bot, category: "ai", recommendedFor: ["all"] },
  { key: "ai-medical-notes", name: "AI Medical Notes", description: "AI-generated clinical notes from doctor-patient conversations", icon: FileTextIcon, category: "ai", recommendedFor: ["all"] },
  { key: "ai-patient-follow-up", name: "AI Patient Follow-up", description: "Automated follow-up reminders and patient engagement", icon: ClipboardCheck, category: "ai", recommendedFor: ["all"] },
  { key: "ai-whatsapp-assistant", name: "AI WhatsApp Assistant", description: "AI chatbot for patient queries via WhatsApp", icon: Send, category: "ai", recommendedFor: ["all"] },
  { key: "ai-voice-dictation", name: "AI Voice Dictation", description: "Voice-to-text clinical note dictation with medical terminology", icon: Mic, category: "ai", recommendedFor: ["all"] },
  { key: "ai-appointment-assistant", name: "AI Appointment Assistant", description: "AI-powered appointment scheduling and optimization", icon: CalendarCheck, category: "ai", recommendedFor: ["all"] },
  { key: "ai-report-summary", name: "AI Report Summary", description: "AI-generated summaries of lab and radiology reports", icon: Clipboard, category: "ai", recommendedFor: ["all"] },
];

// Smart recommendations based on clinic type
export const CLINIC_TYPE_RECOMMENDATIONS: Record<string, string[]> = {
  "ivf-fertility-center": [
    "ivf-fertility", "laboratory", "pharmacy", "hormone-tracking",
    "embryology", "billing", "appointment-management",
    "patient-management", "prescription", "reports",
  ],
  "dental-clinic": [
    "dental", "x-ray", "appointment-management", "billing",
    "patient-management", "prescription", "inventory", "reports",
  ],
  "laboratory": [
    "laboratory", "reports", "home-sample-collection",
    "patient-management", "billing", "inventory", "appointment-management",
  ],
  "diagnostic-center": [
    "radiology", "laboratory", "reports", "home-sample-collection",
    "patient-management", "billing", "package-management",
  ],
  "hospital": [
    "patient-management", "appointment-management", "doctor-management",
    "emr-ehr", "prescription", "billing", "accounts", "inventory",
    "pharmacy", "laboratory", "radiology", "opd", "ipd",
    "queue-management", "reports", "sms", "whatsapp",
    "notification-center", "video-consultation", "online-appointment",
    "patient-portal", "telemedicine", "attendance", "hr", "payroll",
  ],
  "eye-hospital": [
    "eye-care", "patient-management", "appointment-management",
    "emr-ehr", "prescription", "billing", "inventory",
    "laboratory", "radiology", "reports", "sms", "whatsapp",
  ],
  "pharmacy": [
    "pharmacy", "inventory", "billing", "accounts",
    "patient-management", "prescription", "reports", "sms",
  ],
  "clinic": [
    "patient-management", "appointment-management", "doctor-management",
    "emr-ehr", "prescription", "billing", "reports", "sms",
    "whatsapp", "notification-center", "online-appointment",
    "patient-portal", "queue-management",
  ],
  "mental-health-clinic": [
    "patient-management", "appointment-management", "emr-ehr",
    "prescription", "billing", "reports", "telemedicine",
    "video-consultation", "patient-portal",
  ],
  "physiotherapy": [
    "patient-management", "appointment-management", "emr-ehr",
    "prescription", "billing", "reports", "sms", "whatsapp",
  ],
  "home-healthcare": [
    "patient-management", "appointment-management", "emr-ehr",
    "prescription", "billing", "reports", "home-care",
    "patient-portal", "video-consultation",
  ],
  "veterinary": [
    "patient-management", "appointment-management", "emr-ehr",
    "prescription", "billing", "reports", "inventory",
  ],
  "other": [
    "patient-management", "appointment-management", "doctor-management",
    "emr-ehr", "prescription", "billing", "reports", "sms",
  ],
};

// Module categories for filtering
export const MODULE_CATEGORIES = [
  { id: "all", label: "All Modules" },
  { id: "core", label: "Core Modules" },
  { id: "specialty", label: "Specialty Modules" },
  { id: "ai", label: "AI Modules" },
] as const;

// Helper: get recommended modules for a clinic type
export function getRecommendedModules(clinicType: string): string[] {
  return CLINIC_TYPE_RECOMMENDATIONS[clinicType] || CLINIC_TYPE_RECOMMENDATIONS["other"];
}

// Helper: get modules by category
export function getModulesByCategory(category: string): ModuleDef[] {
  if (category === "all") return MODULES;
  return MODULES.filter((m) => m.category === category);
}

// Helper: search modules
export function searchModules(query: string): ModuleDef[] {
  const lower = query.toLowerCase();
  return MODULES.filter(
    (m) =>
      m.name.toLowerCase().includes(lower) ||
      m.description.toLowerCase().includes(lower) ||
      m.key.toLowerCase().includes(lower)
  );
}

// Helper: estimate setup time based on selected modules
export function estimateSetupTime(selectedCount: number): string {
  if (selectedCount <= 5) return "5-10 minutes";
  if (selectedCount <= 10) return "10-15 minutes";
  if (selectedCount <= 15) return "15-20 minutes";
  return "20-30 minutes";
}
