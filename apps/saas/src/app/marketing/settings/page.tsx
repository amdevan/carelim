"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Globe,
  Mail,
  Bell,
  Palette,
  Share2,
  Gift,
  Loader2,
} from "lucide-react";

interface MarketingSettings {
  [key: string]: string;
}

const FIELDS = [
  { key: "cms_default_sender_name", label: "Default Sender Name", icon: Globe, section: "General", type: "text" },
  { key: "cms_default_sender_email", label: "Default Sender Email", icon: Mail, section: "General", type: "email" },
  { key: "cms_default_sender_phone", label: "Default Sender Phone", icon: Bell, section: "General", type: "tel" },
  { key: "cms_smtp_host", label: "SMTP Host", icon: Mail, section: "Email", type: "text" },
  { key: "cms_smtp_port", label: "SMTP Port", icon: Mail, section: "Email", type: "text" },
  { key: "cms_smtp_user", label: "SMTP Username", icon: Mail, section: "Email", type: "text" },
  { key: "cms_smtp_pass", label: "SMTP Password", icon: Mail, section: "Email", type: "password" },
  { key: "cms_sms_provider", label: "SMS Provider", icon: Bell, section: "Notifications", type: "text" },
  { key: "cms_sms_api_key", label: "SMS API Key", icon: Bell, section: "Notifications", type: "password" },
  { key: "cms_whatsapp_api_key", label: "WhatsApp API Key", icon: Bell, section: "Notifications", type: "password" },
  { key: "cms_referral_reward", label: "Referral Reward (NPR)", icon: Gift, section: "Referrals", type: "number" },
  { key: "cms_referral_program_name", label: "Referral Program Name", icon: Share2, section: "Referrals", type: "text" },
  { key: "cms_primary_color", label: "Primary Color", icon: Palette, section: "Branding", type: "text" },
  { key: "cms_logo_url", label: "Logo URL", icon: Palette, section: "Branding", type: "text" },
];

const SECTION_DESCRIPTIONS: Record<string, string> = {
  General: "Basic sender and organization settings",
  Email: "SMTP email delivery configuration",
  Notifications: "SMS and messaging provider settings",
  Referrals: "Referral program configuration",
  Branding: "Visual branding for marketing materials",
};

export default function MarketingSettingsPage() {
  const [settings, setSettings] = useState<MarketingSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const sections = [...new Set(FIELDS.map((f) => f.section))];

  useEffect(() => {
    fetch("/api/saas-settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setSettings(d))
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/saas-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Silently fail
    }
    setSaving(false);
  };

  const updateField = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-20 rounded-xl bg-purple-100 dark:bg-purple-950/30 animate-pulse" />
        <div className="h-64 rounded-xl bg-purple-100 dark:bg-purple-950/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
            Marketing Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure marketing & CRM preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-3.5 py-2 text-sm font-medium text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      {sections.map((section) => {
        const sectionFields = FIELDS.filter((f) => f.section === section);
        return (
          <div
            key={section}
            className="rounded-xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-gray-900 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/10">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{section}</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {SECTION_DESCRIPTIONS[section] || ""}
              </p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionFields.map((field) => {
                  const Icon = field.icon;
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" /> {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={settings[field.key] || ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
