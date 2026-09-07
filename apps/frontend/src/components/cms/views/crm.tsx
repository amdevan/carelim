"use client";

import { useState } from "react";
import { CRMContacts, CRMDeals, CRMCommunications, CRMTasks, CRTemplates, CRMReports } from "@/components/carelim-ms/crm";
import { Users, Briefcase, Activity, CheckCircle2, FileText, BarChart3 } from "lucide-react";

type CRMSection = "contacts" | "deals" | "communications" | "tasks" | "templates" | "reports";

const sections: { key: CRMSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "deals", label: "Deals", icon: Briefcase },
  { key: "communications", label: "Communications", icon: Activity },
  { key: "tasks", label: "Tasks", icon: CheckCircle2 },
  { key: "templates", label: "Templates", icon: FileText },
  { key: "reports", label: "Reports", icon: BarChart3 },
];

export function CrmView() {
  const [section, setSection] = useState<CRMSection>("contacts");

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto scrollbar-thin">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = section === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors shrink-0 ${
                active
                  ? "border-teal-600 text-teal-700 dark:text-teal-400"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Active section */}
      {section === "contacts" && <CRMContacts />}
      {section === "deals" && <CRMDeals />}
      {section === "communications" && <CRMCommunications />}
      {section === "tasks" && <CRMTasks />}
      {section === "templates" && <CRTemplates />}
      {section === "reports" && <CRMReports />}
    </div>
  );
}
