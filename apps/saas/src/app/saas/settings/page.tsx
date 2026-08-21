"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Globe, Mail, Bell, Palette } from "lucide-react";

interface PlatformSettings {
  [key: string]: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fields = [
    { key: "carelim_platform_name", label: "Platform Name", icon: Globe, section: "General" },
    { key: "carelim_support_email", label: "Support Email", icon: Mail, section: "General" },
    { key: "carelim_default_currency", label: "Default Currency", icon: Globe, section: "General" },
    { key: "carelim_smtp_host", label: "SMTP Host", icon: Mail, section: "Email" },
    { key: "carelim_smtp_port", label: "SMTP Port", icon: Mail, section: "Email" },
    { key: "carelim_smtp_user", label: "SMTP Username", icon: Mail, section: "Email" },
    { key: "carelim_smtp_pass", label: "SMTP Password", icon: Mail, section: "Email" },
    { key: "carelim_sms_provider", label: "SMS Provider", icon: Bell, section: "Notifications" },
    { key: "carelim_sms_api_key", label: "SMS API Key", icon: Bell, section: "Notifications" },
    { key: "carelim_whatsapp_api_key", label: "WhatsApp API Key", icon: Bell, section: "Notifications" },
    { key: "carelim_primary_color", label: "Primary Color", icon: Palette, section: "Branding" },
    { key: "carelim_logo_url", label: "Logo URL", icon: Palette, section: "Branding" },
  ];

  const sections = [...new Set(fields.map((f) => f.section))];

  useEffect(() => {
    fetch("/api/saas-settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setSettings(d))
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/saas-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch {}
    setSaving(false);
  };

  const updateField = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Platform Settings</h1>
          <p className="text-sm text-muted-foreground">Configure platform-wide settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-3 py-1.5 text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {sections.map((section) => {
        const sectionFields = fields.filter((f) => f.section === section);
        return (
          <div key={section} className="rounded-xl border border-border bg-card">
            <div className="p-4 pb-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-teal-600" /> {section}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {section === "General" && "Basic platform configuration"}
                {section === "Email" && "SMTP email delivery settings"}
                {section === "Notifications" && "SMS and messaging provider settings"}
                {section === "Branding" && "Visual branding configuration"}
              </p>
            </div>
            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionFields.map((field) => {
                  const Icon = field.icon;
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" /> {field.label}
                      </label>
                      <input
                        type={field.key.includes("pass") || field.key.includes("key") ? "password" : "text"}
                        value={settings[field.key] || ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
