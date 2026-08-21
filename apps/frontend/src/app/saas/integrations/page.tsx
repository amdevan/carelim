"use client";

import { useState } from "react";
import {
  Plug,
  CreditCard,
  Mail,
  MessageSquare,
  Phone,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";

interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  fields: { key: string; label: string; type: string; placeholder: string; value: string }[];
}

const defaultIntegrations: IntegrationConfig[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Payment processing and subscription billing",
    icon: CreditCard,
    enabled: false,
    fields: [
      { key: "secretKey", label: "Secret Key", type: "password", placeholder: "sk_live_...", value: "" },
      { key: "publishableKey", label: "Publishable Key", type: "text", placeholder: "pk_live_...", value: "" },
      { key: "webhookSecret", label: "Webhook Secret", type: "password", placeholder: "whsec_...", value: "" },
    ],
  },
  {
    id: "smtp",
    name: "SMTP (Email)",
    description: "Outgoing email delivery via SMTP server",
    icon: Mail,
    enabled: false,
    fields: [
      { key: "host", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com", value: "" },
      { key: "port", label: "Port", type: "text", placeholder: "587", value: "" },
      { key: "username", label: "Username", type: "text", placeholder: "your@email.com", value: "" },
      { key: "password", label: "Password", type: "password", placeholder: "••••••••", value: "" },
    ],
  },
  {
    id: "sms",
    name: "SMS Gateway",
    description: "Send SMS notifications via Twilio or compatible provider",
    icon: Phone,
    enabled: false,
    fields: [
      { key: "provider", label: "Provider", type: "text", placeholder: "Twilio", value: "" },
      { key: "accountSid", label: "Account SID", type: "password", placeholder: "AC...", value: "" },
      { key: "authToken", label: "Auth Token", type: "password", placeholder: "••••••••", value: "" },
      { key: "fromNumber", label: "From Number", type: "text", placeholder: "+1234567890", value: "" },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Send WhatsApp messages via Business API",
    icon: MessageSquare,
    enabled: false,
    fields: [
      { key: "phoneNumberId", label: "Phone Number ID", type: "text", placeholder: "123456789", value: "" },
      { key: "accessToken", label: "Access Token", type: "password", placeholder: "••••••••", value: "" },
      { key: "apiVersion", label: "API Version", type: "text", placeholder: "v18.0", value: "" },
    ],
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(defaultIntegrations);
  const [saved, setSaved] = useState(false);

  const handleFieldChange = (integrationId: string, fieldKey: string, value: string) => {
    setIntegrations((prev) =>
      prev.map((intg) =>
        intg.id === integrationId
          ? {
              ...intg,
              fields: intg.fields.map((f) => (f.key === fieldKey ? { ...f, value } : f)),
            }
          : intg
      )
    );
  };

  const handleToggle = (integrationId: string) => {
    setIntegrations((prev) =>
      prev.map((intg) => (intg.id === integrationId ? { ...intg, enabled: !intg.enabled } : intg))
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
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure third-party services and API integrations
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
              <Save className="w-4 h-4" /> Save All
            </>
          )}
        </button>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {integrations.map((intg) => {
          const Icon = intg.icon;
          return (
            <div
              key={intg.id}
              className={`bg-white rounded-xl border p-6 transition-all ${
                intg.enabled ? "border-teal-300 shadow-sm" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      intg.enabled
                        ? "bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm"
                        : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        intg.enabled ? "text-white" : "text-gray-400"
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{intg.name}</h3>
                    <p className="text-xs text-gray-500">{intg.description}</p>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(intg.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    intg.enabled ? "bg-teal-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                      intg.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {intg.enabled && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  {intg.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={field.value}
                        onChange={(e) =>
                          handleFieldChange(intg.id, field.key, e.target.value)
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Test connection before saving in production</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
