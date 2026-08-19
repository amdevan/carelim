"use client";

import { useState } from "react";
import Image from "next/image";
import { useAppStore } from "@/store/app-store";
import { motion } from "framer-motion";
import {
  HeartPulse,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Activity,
  Stethoscope,
  ArrowRight,
  Fingerprint,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginScreen() {
  const { login } = useAppStore();
  const [email, setEmail] = useState("admin@carelim.health");
  const [password, setPassword] = useState("carelim123");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Login failed", { description: data.error || "Invalid credentials" });
        return;
      }
      localStorage.setItem("cms-user", JSON.stringify(data.user));
      login(email);
      toast.success("Welcome back!", { description: `Signed in as ${data.user.name || email}` });
    } catch {
      toast.error("Login failed", { description: "Unable to reach the server. Please try again." });
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

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <Image src="/images/carelim-os.png" alt="Carelim OS" width={160} height={49} className="rounded-lg" />
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold leading-tight text-balance">
                The complete platform for modern healthcare operations.
              </h1>
              <p className="mt-4 text-teal-100/90 text-lg max-w-md">
                Patients, EMR, pharmacy, laboratory, billing, accounting & analytics — unified in one secure, multi-tenant SaaS.
              </p>
            </motion.div>

            <div className="grid grid-cols-3 gap-3 max-w-md">
              {[
                { icon: Activity, label: "Real-time Queue" },
                { icon: Stethoscope, label: "Doctor Portal" },
                { icon: ShieldCheck, label: "HIPAA Ready" },
              ].map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-3"
                >
                  <f.icon className="w-5 h-5 mb-1.5 text-emerald-200" />
                  <p className="text-xs font-medium leading-tight">{f.label}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-teal-100/80">
            <span>14+ Modules</span>
            <span className="w-1 h-1 rounded-full bg-teal-300/50" />
            <span>Multi-Branch</span>
            <span className="w-1 h-1 rounded-full bg-teal-300/50" />
            <span>99.98% Uptime</span>
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

          <h1 className="text-2xl font-bold tracking-tight">Sign in to your account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Welcome back. Please enter your credentials to continue.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="you@clinic.health"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-teal-600 hover:underline" onClick={() => toast.info("Reset link sent to your email")}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
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
                Remember me for 30 days
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
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

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="gap-2" onClick={() => toast.info("Google OAuth integration")}>
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={() => toast.info("OTP sent to your mobile")}>
                <Fingerprint className="w-4 h-4 text-teal-600" /> OTP Login
              </Button>
            </div>
          </form>

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
