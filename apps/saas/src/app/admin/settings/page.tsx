"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@carelim/ui";
import { Button } from "@carelim/ui";
import { Input } from "@carelim/ui";
import { Skeleton } from "@carelim/ui";
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
      .then((r) => r.ok ? r.json() : {})
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
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
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
        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {sections.map((section) => {
        const sectionFields = fields.filter((f) => f.section === section);
        return (
          <Card key={section}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-teal-600" /> {section}
              </CardTitle>
              <CardDescription className="text-xs">
                {section === "General" && "Basic platform configuration"}
                {section === "Email" && "SMTP email delivery settings"}
                {section === "Notifications" && "SMS and messaging provider settings"}
                {section === "Branding" && "Visual branding configuration"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionFields.map((field) => {
                  const Icon = field.icon;
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" /> {field.label}
                      </label>
                      <Input
                        type={field.key.includes("pass") || field.key.includes("key") ? "password" : "text"}
                        value={settings[field.key] || ""}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
