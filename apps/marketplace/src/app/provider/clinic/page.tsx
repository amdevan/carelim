"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  Building2,
  Calendar,
  Users,
  CreditCard,
  FileText,
  BarChart3,
  ArrowUpRight,
  Clock,
  Shield,
  Zap,
  TrendingUp,
  Heart,
  ArrowRight,
  Star,
  ChevronRight,
  LogIn,
  Lock,
  Unlock,
} from "lucide-react"

interface HeroButton {
  text: string
  link: string
  style: "primary" | "secondary" | "outline"
}

interface HeroData {
  badge: string
  title: string
  gradientTitle: string
  description: string
  buttons: HeroButton[]
}

const DEFAULT_HERO: HeroData = {
  badge: "For Clinics",
  title: "Run your clinic",
  gradientTitle: "without the chaos",
  description: "Scheduling, patient management, billing, and analytics — all in one platform. No more juggling five different tools.",
  buttons: [
    { text: "Join as a Founding Clinic", link: "/founding-member", style: "primary" },
    { text: "Login to Access Modules", link: "/clinic/login", style: "secondary" },
    { text: "Learn more", link: "/about", style: "outline" },
  ],
}

const MODULES = [
  {
    icon: Calendar,
    title: "Appointment Scheduling",
    desc: "Smart scheduling with automated reminders, waitlist management, and multi-provider calendar views.",
    status: "available" as const,
    gradient: "from-[#00a090] to-[#0040b0]",
  },
  {
    icon: Users,
    title: "Patient Management",
    desc: "Complete patient profiles, visit history, insurance verification, and family grouping.",
    status: "available" as const,
    gradient: "from-[#0040b0] to-[#0060b0]",
  },
  {
    icon: CreditCard,
    title: "Billing & Invoicing",
    desc: "Automated insurance claims, self-pay invoicing, and payment tracking.",
    status: "coming-soon" as const,
    gradient: "from-[#0060b0] to-[#00a090]",
  },
  {
    icon: FileText,
    title: "Lab Integration",
    desc: "Order labs, receive results digitally, and flag abnormal values automatically.",
    status: "coming-soon" as const,
    gradient: "from-teal-500 to-[#00a090]",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Revenue insights, patient flow, no-show rates, and provider performance metrics.",
    status: "coming-soon" as const,
    gradient: "from-[#00a090] to-[#0040b0]",
  },
]

const BENEFITS = [
  { icon: TrendingUp, text: "Reduce no-shows by 40% with automated reminders" },
  { icon: Shield, text: "HIPAA-compliant by default — no extra configuration" },
  { icon: Zap, text: "Go live in days, not months — no consultants needed" },
  { icon: Heart, text: "Patient portal for self-service booking and records" },
  { icon: Clock, text: "Real-time dashboard for revenue and patient flow" },
]

export default function ClinicPage() {
  const [hero, setHero] = useState<HeroData>(DEFAULT_HERO)

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (data?.providerPages?.clinic?.hero) {
          setHero(data.providerPages.clinic.hero)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <main className="flex flex-col">
      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00a090]/6 via-[#0040b0]/3 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.2]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #00a09018 1px, transparent 0)", backgroundSize: "24px 24px" }}
        />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left — Text */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#00a090]/20 bg-[#00a090]/5 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#00a090]">
                <Building2 className="h-3 w-3" />
                {hero.badge}
              </div>
              <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
                {hero.title}{" "}
                <span className="bg-gradient-to-r from-[#0040b0] to-[#00a090] bg-clip-text text-transparent">
                  {hero.gradientTitle}
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-muted-foreground">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {(hero.buttons || []).map((btn, i) => {
                  if (btn.style === "primary") {
                    return (
                      <Link key={i} href={btn.link} className="group inline-flex items-center gap-2 rounded-full bg-[#00a090] px-6 py-3 text-[13px] font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#00a090]/25 hover:scale-[1.02]">
                        {btn.text}
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    )
                  }
                  if (btn.style === "secondary") {
                    return (
                      <Link key={i} href={btn.link} className="group inline-flex items-center gap-2 rounded-full border-2 border-[#00a090]/30 bg-[#00a090]/5 px-6 py-3 text-[13px] font-semibold text-[#00a090] transition-all hover:bg-[#00a090]/10 hover:border-[#00a090]/50 hover:shadow-md hover:shadow-[#00a090]/10 hover:scale-[1.02]">
                        <Lock className="h-3.5 w-3.5" />
                        {btn.text}
                      </Link>
                    )
                  }
                  return (
                    <Link key={i} href={btn.link} className="inline-flex items-center gap-1.5 rounded-full border-2 border-border px-6 py-3 text-[13px] font-semibold text-muted-foreground transition-all hover:border-[#00a090]/40 hover:text-[#00a090]">
                      {btn.text} <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Right — Visual */}
            <div className="relative hidden lg:block">
              {/* Floating cards */}
              <div className="relative h-[420px] w-full">
                {/* Main dashboard card */}
                <div className="absolute right-4 top-8 w-72 rounded-2xl border border-[#00a090]/15 bg-card/90 p-5 shadow-xl shadow-[#00a090]/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#00a090]" />
                    <span className="text-[11px] font-semibold text-muted-foreground">Patient Dashboard</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-[#00a090]/5 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-[#00a090]" />
                        <span className="text-xs font-medium">Appointments</span>
                      </div>
                      <span className="text-xs font-bold text-[#00a090]">24 today</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#0040b0]/5 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-[#0040b0]" />
                        <span className="text-xs font-medium">Patients</span>
                      </div>
                      <span className="text-xs font-bold text-[#0040b0]">1,247</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#00a090]/5 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-[#00a090]" />
                        <span className="text-xs font-medium">Revenue</span>
                      </div>
                      <span className="text-xs font-bold text-[#00a090]">$48.2K</span>
                    </div>
                  </div>
                </div>

                {/* Floating stat card */}
                <div className="absolute left-0 top-40 w-44 rounded-xl border border-[#0040b0]/15 bg-card/90 p-4 shadow-lg shadow-[#0040b0]/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-[#00a090]" />
                    <span className="text-[10px] font-semibold text-muted-foreground">This Month</span>
                  </div>
                  <p className="text-2xl font-extrabold text-[#00a090]">+40%</p>
                  <p className="text-[10px] text-muted-foreground">No-show reduction</p>
                </div>

                {/* Floating notification card */}
                <div className="absolute right-0 bottom-12 w-52 rounded-xl border border-border/50 bg-card/90 p-3.5 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00a090]/10">
                      <Clock className="h-4 w-4 text-[#00a090]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold">Next appointment</p>
                      <p className="text-[10px] text-muted-foreground">Dr. Patel — 2:30 PM</p>
                    </div>
                  </div>
                </div>

                {/* Decorative dots */}
                <div className="absolute -left-4 top-4 grid grid-cols-4 gap-1.5 opacity-30">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className="h-1 w-1 rounded-full bg-[#00a090]" />
                  ))}
                </div>

                {/* Background blob */}
                <div className="absolute -right-20 -top-10 h-72 w-72 rounded-full bg-[#00a090]/5 blur-3xl" />
                <div className="absolute -left-10 bottom-10 h-48 w-48 rounded-full bg-[#0040b0]/5 blur-3xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Module Access Login Banner ──────────────── */}
      <section className="py-6">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#00a090]/15 bg-gradient-to-r from-[#00a090]/5 via-background to-[#0040b0]/5 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00a090]/10">
                <Unlock className="h-5 w-5 text-[#00a090]" />
              </div>
              <div>
                <p className="text-sm font-semibold">Already a Carelim clinic partner?</p>
                <p className="text-[13px] text-muted-foreground">Login to access your modules, billing, and patient data.</p>
              </div>
            </div>
            <Link href="/clinic/login" className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#00a090] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#00a090]/20 transition-all hover:bg-[#008f80] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
              <LogIn className="h-3.5 w-3.5" />
              Clinic Login
            </Link>
          </div>
        </div>
      </section>

      {/* ── Modules ───────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#00a090]">Modules</p>
            <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-[-0.03em]">Everything your clinic needs</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon
              const isAvailable = mod.status === "available"
              return (
                <div key={mod.title} className={`group rounded-2xl border ${isAvailable ? "border-[#00a090]/15 bg-gradient-to-br from-[#00a090]/5 to-[#0040b0]/3" : "border-border/50 bg-card"} p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}>
                  <div className="flex items-start justify-between">
                    <div className={`inline-flex rounded-xl bg-gradient-to-br ${mod.gradient} p-2.5`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#00a090]/10 px-2 py-0.5 text-[10px] font-semibold text-[#00a090]">
                        <span className="h-1 w-1 rounded-full bg-[#00a090]" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold">{mod.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{mod.desc}</p>
                  {isAvailable && (
                    <Link href="/clinic/login" className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#00a090] hover:underline">
                      <LogIn className="h-3 w-3" /> Login to access
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Why choose Carelim ────────────────────── */}
      <section className="border-t border-border/50 bg-gradient-to-b from-[#00a090]/3 to-transparent py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#00a090]">Why clinics choose Carelim</p>
              <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.03em]">
                Built for how clinics{" "}
                <span className="bg-gradient-to-r from-[#0040b0] to-[#00a090] bg-clip-text text-transparent">actually work</span>
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                We talked to 200+ clinic managers before writing a single line of code.
                Every feature solves a real pain point.
              </p>
            </div>
            <div className="space-y-4">
              {BENEFITS.map((b, i) => {
                const Icon = b.icon
                return (
                  <div key={i} className="flex items-start gap-4 rounded-xl border border-border/50 bg-card p-5 transition-all hover:border-[#00a090]/20 hover:shadow-md">
                    <div className="mt-0.5 rounded-lg bg-[#00a090]/10 p-2"><Icon className="h-4 w-4 text-[#00a090]" /></div>
                    <p className="text-[14px] leading-relaxed text-foreground">{b.text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-2xl bg-gradient-to-br from-[#0040b0] via-[#0060b0] to-[#00a090] p-10 sm:p-14">
            <h3 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-bold text-white">Ready to modernize your clinic?</h3>
            <p className="mt-2 max-w-lg text-[14px] text-white/70">Join 240+ healthcare providers on the waitlist. Founding clinics get priority onboarding and locked-in pricing.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/founding-member" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13px] font-semibold text-[#0040b0] shadow-xl transition-all hover:shadow-2xl hover:scale-[1.03]">
                Apply now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/clinic/login" className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-6 py-3 text-[13px] font-semibold text-white transition-all hover:bg-white/20 hover:border-white/50">
                <LogIn className="h-4 w-4" /> Clinic Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial ───────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 flex justify-center gap-1">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-[#00a090] text-[#00a090]" />)}</div>
            <blockquote className="text-[clamp(1.125rem,2vw,1.5rem)] font-medium leading-relaxed">
              &ldquo;We replaced three separate tools with Carelim. Scheduling, billing, patient records — it all just works together now.&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a090] text-[13px] font-bold text-white">SR</div>
              <div className="text-left">
                <p className="text-sm font-semibold">Dr. Sarah Reid</p>
                <p className="text-xs text-muted-foreground">Sunrise Family Clinic</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
