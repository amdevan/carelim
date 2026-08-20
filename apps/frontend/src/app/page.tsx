"use client";

import { useAppStore } from "@/store/app-store";
import { Sidebar } from "@/components/cms/sidebar";
import { Header } from "@/components/cms/header";
import { Footer } from "@/components/cms/footer";
import { CommandPalette } from "@/components/cms/command-palette";
import { KeyboardShortcuts } from "@/components/cms/keyboard-shortcuts";
import { KeyboardNav } from "@/components/cms/keyboard-nav";
import { LoginScreen } from "@/components/cms/login-screen";
import { DashboardView } from "@/components/cms/views/dashboard";
import { PatientsView } from "@/components/cms/views/patients";
import { DoctorsView } from "@/components/cms/views/doctors";
import { AppointmentsView } from "@/components/cms/views/appointments";
import { EmrView } from "@/components/cms/views/emr";
import { PharmacyView } from "@/components/cms/views/pharmacy";
import { LaboratoryView } from "@/components/cms/views/laboratory";
import { RadiologyView } from "@/components/cms/views/radiology";
import { BillingView } from "@/components/cms/views/billing";
import { AccountingView } from "@/components/cms/views/accounting";
import { InventoryView } from "@/components/cms/views/inventory";
import { ReportsView } from "@/components/cms/views/reports";
import { HrView } from "@/components/cms/views/hr";
import { SettingsView } from "@/components/cms/views/settings";
import { AuditView } from "@/components/cms/views/audit";
import { DentalView } from "@/components/cms/views/dental";
import { IvfView } from "@/components/cms/views/ivf";
import { TelemedicineView } from "@/components/cms/views/telemedicine";
import { ClinicalNotesView } from "@/components/cms/views/clinical-notes";
import { StaffView } from "@/components/cms/views/staff";
import { LeaveView } from "@/components/cms/views/leave";
import { PublicBookingView } from "@/components/cms/views/public-booking";
import { NotificationsView } from "@/components/cms/views/notifications";
import { InsuranceView } from "@/components/cms/views/insurance";
import { BranchesView } from "@/components/cms/views/branches";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { authed, view } = useAppStore();

  if (!authed) return <LoginScreen />;

  const views: Record<string, React.ReactNode> = {
    dashboard: <DashboardView />,
    patients: <PatientsView />,
    doctors: <DoctorsView />,
    appointments: <AppointmentsView />,
    emr: <EmrView />,
    pharmacy: <PharmacyView />,
    laboratory: <LaboratoryView />,
    radiology: <RadiologyView />,
    billing: <BillingView />,
    accounting: <AccountingView />,
    inventory: <InventoryView />,
    reports: <ReportsView />,
    hr: <HrView />,
    settings: <SettingsView />,
    audit: <AuditView />,
    dental: <DentalView />,
    ivf: <IvfView />,
    telemedicine: <TelemedicineView />,
    "clinical-notes": <ClinicalNotesView />,
    staff: <StaffView />,
    leave: <LeaveView />,
    "public-booking": <PublicBookingView />,
    notifications: <NotificationsView />,
    insurance: <InsuranceView />,
    branches: <BranchesView />,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 sm:p-5 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {views[view] ?? <DashboardView />}
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
      <CommandPalette />
      <KeyboardShortcuts />
      <KeyboardNav />
    </div>
  );
}
