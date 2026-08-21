"use client";

import { useState } from "react";
import {
  Settings,
  Percent,
  Bell,
  Palette,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface SettingsState {
  commissionRate: string;
  defaultCurrency: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  brandName: string;
  brandColor: string;
  autoAssignLeads: boolean;
  leadScoreThreshold: string;
}

export default function MarketingSettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    commissionRate: "10",
    defaultCurrency: "NPR",
    emailNotifications: true,
    smsNotifications: true,
    whatsappNotifications: false,
    brandName: "Carelim MS",
    brandColor: "#7c3aed",
    autoAssignLeads: true,
    leadScoreThreshold: "50",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Marketing Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure commission rates, notifications, and branding.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      {/* Commission Settings */}
      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 bg-purple-50/50 flex items-center gap-2">
          <Percent className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            Commission Settings
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Default Commission Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.commissionRate}
              onChange={(e) => update("commissionRate", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Applied to new referrals unless overridden per referral.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Default Currency
            </label>
            <select
              value={settings.defaultCurrency}
              onChange={(e) => update("defaultCurrency", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="NPR">NPR (Nepalese Rupee)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="INR">INR (Indian Rupee)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 bg-purple-50/50 flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            Notification Settings
          </h2>
        </div>
        <div className="p-5 space-y-4">
          {[
            {
              key: "emailNotifications" as const,
              label: "Email Notifications",
              desc: "Receive email alerts for new leads, deals, and commission updates.",
            },
            {
              key: "smsNotifications" as const,
              label: "SMS Notifications",
              desc: "Get SMS alerts for critical lead updates and follow-up reminders.",
            },
            {
              key: "whatsappNotifications" as const,
              label: "WhatsApp Notifications",
              desc: "Receive WhatsApp messages for lead and deal status changes.",
            },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {item.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => update(item.key, !settings[item.key])}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings[item.key] ? "bg-purple-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings[item.key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Branding Settings */}
      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 bg-purple-50/50 flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            Branding Settings
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Brand Name
            </label>
            <input
              type="text"
              value={settings.brandName}
              onChange={(e) => update("brandName", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Brand Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.brandColor}
                onChange={(e) => update("brandColor", e.target.value)}
                className="w-10 h-10 rounded-lg border border-purple-200 cursor-pointer"
              />
              <input
                type="text"
                value={settings.brandColor}
                onChange={(e) => update("brandColor", e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-lg border border-purple-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lead Settings */}
      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 bg-purple-50/50 flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            Lead Settings
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Auto-assign Leads
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Automatically assign incoming leads to available coordinators.
              </p>
            </div>
            <button
              onClick={() =>
                update("autoAssignLeads", !settings.autoAssignLeads)
              }
              className={`relative w-11 h-6 rounded-full transition-colors ${
                settings.autoAssignLeads ? "bg-purple-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.autoAssignLeads
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Lead Score Threshold
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.leadScoreThreshold}
              onChange={(e) => update("leadScoreThreshold", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leads with a score above this threshold are marked as high
              priority.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
