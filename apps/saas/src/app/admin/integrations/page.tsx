"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@carelim/ui";
import { Badge } from "@carelim/ui";
import { Button } from "@carelim/ui";
import {
  CreditCard,
  Mail,
  MessageSquare,
  Phone,
  BarChart3,
  Wallet,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  connected: boolean;
  color: string;
  bgColor: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept credit/debit card payments for subscriptions and invoices.",
    icon: CreditCard,
    category: "Payments",
    connected: true,
    color: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/40",
  },
  {
    id: "email-smtp",
    name: "Email (SMTP)",
    description: "Send transactional emails, invoices, and notifications via SMTP.",
    icon: Mail,
    category: "Communication",
    connected: false,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    id: "sms",
    name: "SMS Gateway",
    description: "Send appointment reminders, OTPs, and alerts via SMS.",
    icon: Phone,
    category: "Communication",
    connected: false,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Send WhatsApp messages for appointment confirmations and reminders.",
    icon: MessageSquare,
    category: "Communication",
    connected: false,
    color: "text-teal-600",
    bgColor: "bg-teal-50 dark:bg-teal-950/40",
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Track website traffic, user behavior, and conversion metrics.",
    icon: BarChart3,
    category: "Analytics",
    connected: false,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
  },
  {
    id: "payment-gateway",
    name: "Payment Gateway",
    description: "Alternative payment processing via eSewa, Khalti, or FonePay.",
    icon: Wallet,
    category: "Payments",
    connected: false,
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/40",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Payments: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  Communication: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  Analytics: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  const toggleConnection = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: !i.connected } : i))
    );
  };

  const categories = [...new Set(integrations.map((i) => i.category))];
  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            {connectedCount} of {integrations.length} integrations connected
          </p>
        </div>
      </div>

      {categories.map((category) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{category}</h2>
            <Badge className={`text-[10px] ${CATEGORY_COLORS[category] || "bg-gray-100 text-gray-600"}`}>
              {integrations.filter((i) => i.category === category).length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations
              .filter((i) => i.category === category)
              .map((integration) => {
                const Icon = integration.icon;
                return (
                  <Card key={integration.id} className="card-hover">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${integration.bgColor}`}>
                            <Icon className={`w-6 h-6 ${integration.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{integration.name}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {integration.description}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {integration.connected ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-xs font-medium text-emerald-600">Connected</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">Not connected</span>
                            </>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {integration.connected ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
                              onClick={() => toggleConnection(integration.id)}
                            >
                              Disconnect
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-teal-600 hover:bg-teal-700 text-white gap-1"
                              onClick={() => toggleConnection(integration.id)}
                            >
                              Connect
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
