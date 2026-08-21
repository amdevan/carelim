"use client";

import { useState } from "react";
import {
  Settings,
  Save,
  CheckCircle2,
  Globe,
  Mail,
  Bell,
  Shield,
  Database,
} from "lucide-react";

interface SettingField {
  key: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
}

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: SettingField[];
}

const defaultSections: SettingSection[] = [
  {
    id: "general",
    title: "General",
    description: "Platform name, branding, and general settings",
    icon: Globe,
    fields: [
      { key: "platformName", label: "Platform Name", type: "text", placeholder: "Carelim OS", value: "Carelim OS" },
      { key: "supportEmail", label: "Support Email", type: "email", placeholder: "support@carelim.com", value: "" },
      { key: "defaultTimezone", label: "Default Timezone", type: "text", placeholder: "UTC", value: "UTC" },
      { key: "maxTenants", label: "Max Tenants", type: "number", placeholder: "1000", value: "" },
    ],
  },
  {
    id: "billing",
    title: "Billing",
    description: "Invoice settings, tax configuration, and payment defaults",
    icon: Mail,
    fields: [
      { key: "currency", label: "Currency", type: "text", placeholder: "USD", value: "USD" },
      { key: "taxRate", label: "Tax Rate (%)", type: "number", placeholder: "0", value: "0" },
      { key: "invoicePrefix", label: "Invoice Prefix", type: "text", placeholder: "INV-", value: "INV-" },
      { key: "paymentTerms", label: "Payment Terms (days)", type: "number", placeholder: "30", value: "30" },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Email and in-app notification preferences",
    icon: Bell,
    fields: [
      { key: "newTenantAlert", label: "New Tenant Alert Email", type: "email", placeholder: "admin@carelim.com", value: "" },
      { key: "ticketAlert", label: "High Priority Ticket Alert", type: "email", placeholder: "support@carelim.com", value: "" },
      { key: "weeklyReport", label: "Weekly Report Recipients", type: "text", placeholder: "admin@carelim.com, cto@carelim.com", value: "" },
    ],
  },
  {
    id: "security",
    title: "Security",
    description: "Authentication policies and access control",
    icon: Shield,
    fields: [
      { key: "sessionTimeout", label: "Session Timeout (min)", type: "number", placeholder: "60", value: "60" },
      { key: "maxLoginAttempts", label: "Max Login Attempts", type: "number", placeholder: "5", value: "5" },
      { key: "requireMFA", label: "Require MFA for Admins", type: "text", placeholder: "true / false", value: "false" },
    ],
  },
  {
    id: "data",
    title: "Data & Retention",
    description: "Data retention policies and backup settings",
    icon: Database,
    fields: [
      { key: "auditLogRetention", label: "Audit Log Retention (days)", type: "number", placeholder: "365", value: "365" },
      { key: "backupFrequency", label: "Backup Frequency", type: "text", placeholder: "daily", value: "daily" },
      { key: "softDelete", label: "Soft Delete Enabled", type: "text", placeholder: "true / false", value: "true" },
    ],
  },
];

export default function SettingsPage() {
  const [sections, setSections] = useState(defaultSections);
  const [saved, setSaved] = useState(false);

  const handleFieldChange = (sectionId: string, fieldKey: string, value: string) => {
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              fields: sec.fields.map((f) => (f.key === fieldKey ? { ...f, value } : f)),
            }
          : sec
      )
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure platform-wide settings and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-medium hover:from-teal-700 hover:to-emerald-700 transition-all shadow-md shadow-teal-500/20"
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Settings
            </>
          )}
        </button>
      </div>

      {/* Settings Sections */}
      <div className="space-y-5">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.id}
              className="bg-white rounded-xl border border-teal-200 p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{section.title}</h2>
                  <p className="text-xs text-gray-500">{section.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={field.value}
                      onChange={(e) =>
                        handleFieldChange(section.id, field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
