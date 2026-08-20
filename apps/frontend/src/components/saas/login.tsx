"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Activity,
  Building2,
  ArrowRight,
  Layers,
  Globe2,
  Cpu,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SaasLoginProps {
  onLogin: (user: AdminUser) => void;
}

const features = [
  { icon: Building2, title: "Multi-Tenant", desc: "Manage unlimited clinics, hospitals & branches from a single command center." },
  { icon: Layers, title: "Modular Platform", desc: "Healthcare & business modules billed per plan with add-ons marketplace." },
  { icon: Activity, title: "Live Telemetry", desc: "Real-time usage, MRR, churn and growth metrics across all tenants." },
  { icon: Cpu, title: "API & Webhooks", desc: "Provision tenants, sync modules and trigger webhooks programmatically." },
  { icon: Globe2, title: "White-Label Ready", desc: "Brand each tenant workspace with custom domain, logo & theme." },
  { icon: ShieldCheck, title: "Enterprise Security", desc: "Audit logs, role-based access, SSO and granular permissions." },
];

export function SaasLogin({ onLogin }: SaasLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetchAPI("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Invalid credentials", { description: data.error || "Please check your email and password" });
        setLoading(false);
        return;
      }

      onLogin(data);
      toast.success("Welcome to Carelim OS", { description: `Signed in as ${data.name}` });
    } catch {
      toast.error("Connection failed", { description: "Unable to reach the server. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <Image src="/images/carelim-os.png" alt="Carelim OS" width={140} height={43} className="rounded-lg" />
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold leading-tight text-balance">
                The control plane for healthcare SaaS.
              </h1>
              <p className="mt-4 text-teal-100/90 text-lg max-w-md">
                Provision tenants, manage subscriptions, monitor usage and grow recurring revenue — all from one elegant console.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-3 max-w-lg">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
                  className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-3.5"
                >
                  <f.icon className="w-5 h-5 mb-1.5 text-emerald-200" />
                  <p className="text-sm font-semibold leading-tight">{f.title}</p>
                  <p className="text-[11px] text-teal-100/70 mt-0.5 leading-snug">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-teal-100/80">
            <span>14+ Modules</span>
            <span className="w-1 h-1 rounded-full bg-teal-300/50" />
            <span>99.98% Uptime</span>
            <span className="w-1 h-1 rounded-full bg-teal-300/50" />
            <span>SOC 2 Ready</span>
            <span className="w-1 h-1 rounded-full bg-teal-300/50" />
            <span>HIPAA</span>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <Image src="/images/carelim-os.png" alt="Carelim OS" width={120} height={37} />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/50 px-3 py-1 text-[11px] font-medium text-teal-700 dark:text-teal-300 mb-4">
            <ShieldCheck className="w-3 h-3" /> Super Admin Access
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Sign in to your console</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Welcome back. Manage tenants, billing and platform health.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="saas-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="saas-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="admin@carelim.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="saas-password">Password</Label>
                <button type="button" className="text-xs text-teal-600 hover:underline" onClick={() => toast.info("Reset link sent to your email")}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="saas-password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-input accent-teal-600" />
                Remember this device
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white gap-2"
            >
              {loading ? "Signing in…" : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-teal-600 hover:text-teal-700 p-0"
                onClick={() => window.location.href = "/onboarding"}
              >
                Don't have an account? Create your organization
              </Button>
            </div>
          </form>

          <div className="mt-4 rounded-lg border border-dashed border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 px-3 py-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 text-teal-600 shrink-0" />
            <span>Create an <strong className="text-foreground">AdminUser</strong> record in the database to log in. Default password is <code className="text-[10px] bg-muted px-1 py-0.5 rounded">carelim123</code>.</span>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Protected by enterprise-grade encryption. By signing in you agree to our{" "}
            <span className="text-teal-600 hover:underline cursor-pointer">Terms</span> &{" "}
            <span className="text-teal-600 hover:underline cursor-pointer">Privacy Policy</span>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
