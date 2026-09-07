"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  Stethoscope,
  Video,
  ClipboardList,
  FileText,
  Bell,
  BarChart3,
  ArrowUpRight,
  Clock,
  Shield,
  Zap,
  Brain,
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
  badge: "For Doctors",
  title: "Clinical tools that",
  gradientTitle: "stay out of your way",
  description: "Decision support, telemedicine, e-prescriptions, and practice analytics — designed so you can focus on patients, not software.",
  buttons: [
    { text: "Join as a Founding Doctor", link: "/founding-member", style: "primary" },
    { text: "Login to Access Modules", link: "/doctor/login", style: "secondary" },
    { text: "Learn more", link: "/about", style: "outline" },
  ],
}

const MODULES = [
  {
    icon: ClipboardList,
    title: "Clinical Decision Support",
    desc: "AI-powered protocols and drug interaction checks at the point of care.",
    status: "available" as const,
    gradient: "from-[#0040b0] to-[#0060b0]",
  },
  {
    icon: Video,
    title: "Telemedicine",
    desc: "HD video consultations with built-in screen sharing, recording, and e-prescriptions.",
    status: "coming-soon" as const,
    gradient: "from-[#00a090] to-teal-500",
  },
  {
    icon: FileText,
    title: "e-Prescriptions",
    desc: "Digital prescriptions sent directly to any pharmacy, with allergy and interaction checks.",
    status: "coming-soon" as const,
    gradient: "from-[#0060b0] to-[#00a090]",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Critical lab results, follow-up reminders, and chronic care alerts — never miss a thing.",
    status: "coming-soon" as const,
    gradient: "from-[#0040b0] to-[#00a090]",
  },
  {
    icon: BarChart3,
    title: "Practice Analytics",
    desc: "Patient outcomes, visit patterns, revenue per consultation, and referral tracking.",
    status: "coming-soon" as const,
    gradient: "from-[#00a090] to-[#0040b0]",
  },
]

const BENEFITS = [
  { icon: Brain, text: "AI-powered clinical decision support — not a gimmick, a real safety net" },
  { icon: Video, text: "Telemedicine built into your workflow, not a separate app" },
  { icon: Shield, text: "Zero data entry duplication — once recorded, always available" },
  { icon: Zap, text: "e-Prescriptions that reach any pharmacy in seconds" },
  { icon: Heart, text: "Patient engagement tools that improve outcomes" },
]

export default function DoctorPage() {
  const [hero, setHero] = useState<HeroData>(DEFAULT_HERO)

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (data?.providerPages?.doctor?.hero) {
          setHero(data.providerPages.doctor.hero)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <main className="flex flex-col">
      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0040b0]/6 via-[#00a090]/3 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.2]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #0040b018 1px, transparent 0)", backgroundSize: "24px 24px" }}
        />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left — Text */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#0040b0]/20 bg-[#0040b0]/5 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#0040b0]">
                <Stethoscope className="h-3 w-3" />
                {hero.badge}
              </div>
              <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
                {hero.title}{" "}
                <span className="bg-gradient-to-r from-[#00a090] to-[#0040b0] bg-clip-text text-transparent">
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
                      <Link key={i} href={btn.link} className="group inline-flex items-center gap-2 rounded-full bg-[#0040b0] px-6 py-3 text-[13px] font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#0040b0]/25 hover:scale-[1.02]">
                        {btn.text}
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    )
                  }
                  if (btn.style === "secondary") {
                    return (
                      <Link key={i} href={btn.link} className="group inline-flex items-center gap-2 rounded-full border-2 border-[#0040b0]/30 bg-[#0040b0]/5 px-6 py-3 text-[13px] font-semibold text-[#0040b0] transition-all hover:bg-[#0040b0]/10 hover:border-[#0040b0]/50 hover:shadow-md hover:shadow-[#0040b0]/10 hover:scale-[1.02]">
                        <Lock className="h-3.5 w-3.5" />
                        {btn.text}
                      </Link>
                    )
                  }
                  return (
                    <Link key={i} href={btn.link} className="inline-flex items-center gap-1.5 rounded-full border-2 border-border px-6 py-3 text-[13px] font-semibold text-muted-foreground transition-all hover:border-[#0040b0]/40 hover:text-[#0040b0]">
                      {btn.text} <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Right — Visual */}
            <div className="relative hidden lg:block">
              <div className="relative h-[420px] w-full">
                {/* Main clinical card */}
                <div className="absolute right-4 top-8 w-72 rounded-2xl border border-[#0040b0]/15 bg-card/90 p-5 shadow-xl shadow-[#0040b0]/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#0040b0]" />
                    <span className="text-[11px] font-semibold text-muted-foreground">Clinical Dashboard</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-[#0040b0]/5 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-3.5 w-3.5 text-[#0040b0]" />
                        <span className="text-xs font-medium">Today&apos;s Patients</span>
                      </div>
                      <span className="text-xs font-bold text-[#0040b0]">18 visits</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#00a090]/5 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Video className="h-3.5 w-3.5 text-[#00a090]" />
                        <span className="text-xs font-medium">Telemedicine</span>
                      </div>
                      <span className="text-xs font-bold text-[#00a090]">6 scheduled</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#0040b0]/5 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5 text-[#0040b0]" />
                        <span className="text-xs font-medium">Alerts</span>
                      </div>
                      <span className="text-xs font-bold text-[#0040b0]">3 pending</span>
                    </div>
                  </div>
                </div>

                {/* Floating AI insight card */}
                <div className="absolute left-0 top-40 w-48 rounded-xl border border-[#00a090]/15 bg-card/90 p-4 shadow-lg shadow-[#00a090]/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-[#00a090]" />
                    <span className="text-[10px] font-semibold text-muted-foreground">AI Insight</span>
                  </div>
                  <p className="text-[11px] font-medium leading-snug">Drug interaction detected: Review Metformin dosage</p>
                </div>

                {/* Floating prescription card */}
                <div className="absolute right-0 bottom-12 w-56 rounded-xl border border-border/50 bg-card/90 p-3.5 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0040b0]/10">
                      <FileText className="h-4 w-4 text-[#0040b0]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold">e-Prescription Ready</p>
                      <p className="text-[10px] text-muted-foreground">Sent to PharmaCare</p>
                    </div>
                  </div>
                </div>

                {/* Decorative dots */}
                <div className="absolute -left-4 top-4 grid grid-cols-4 gap-1.5 opacity-30">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className="h-1 w-1 rounded-full bg-[#0040b0]" />
                  ))}
                </div>

                {/* Background blobs */}
                <div className="absolute -right-20 -top-10 h-72 w-72 rounded-full bg-[#0040b0]/5 blur-3xl" />
                <div className="absolute -left-10 bottom-10 h-48 w-48 rounded-full bg-[#00a090]/5 blur-3xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Module Access Login Banner ──────────────── */}
      <section className="py-6">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-[#0040b0]/15 bg-gradient-to-r from-[#0040b0]/5 via-background to-[#00a090]/5 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0040b0]/10">
                <Unlock className="h-5 w-5 text-[#0040b0]" />
              </div>
              <div>
                <p className="text-sm font-semibold">Already a Carelim provider?</p>
                <p className="text-[13px] text-muted-foreground">Login to access clinical tools, prescriptions, and patient records.</p>
              </div>
            </div>
            <Link href="/doctor/login" className="shrink-0 inline-flex items-center gap-2 rounded-full bg-[#0040b0] px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-[#0040b0]/20 transition-all hover:bg-[#003590] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
              <LogIn className="h-3.5 w-3.5" />
              Doctor Login
            </Link>
          </div>
        </div>
      </section>

      {/* ── Modules ───────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#0040b0]">Modules</p>
            <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-[-0.03em]">Built for clinical workflows</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((mod) => {
              const Icon = mod.icon
              const isAvailable = mod.status === "available"
              return (
                <div key={mod.title} className={`group rounded-2xl border ${isAvailable ? "border-[#0040b0]/15 bg-gradient-to-br from-[#0040b0]/5 to-[#00a090]/3" : "border-border/50 bg-card"} p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}>
                  <div className="flex items-start justify-between">
                    <div className={`inline-flex rounded-xl bg-gradient-to-br ${mod.gradient} p-2.5`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0040b0]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0040b0]">
                        <span className="h-1 w-1 rounded-full bg-[#0040b0]" />
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
                    <Link href="/doctor/login" className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0040b0] hover:underline">
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
      <section className="border-t border-border/50 bg-gradient-to-b from-[#0040b0]/3 to-transparent py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#0040b0]">Why doctors choose Carelim</p>
              <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.03em]">
                Technology that{" "}
                <span className="bg-gradient-to-r from-[#00a090] to-[#0040b0] bg-clip-text text-transparent">augments your expertise</span>
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                Built with practicing physicians. Every feature earns its place by saving you time or improving patient outcomes.
              </p>
            </div>
            <div className="space-y-4">
              {BENEFITS.map((b, i) => {
                const Icon = b.icon
                return (
                  <div key={i} className="flex items-start gap-4 rounded-xl border border-border/50 bg-card p-5 transition-all hover:border-[#0040b0]/20 hover:shadow-md">
                    <div className="mt-0.5 rounded-lg bg-[#0040b0]/10 p-2"><Icon className="h-4 w-4 text-[#0040b0]" /></div>
                    <p className="text-[14px] leading-relaxed text-foreground">{b.text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-16 rounded-2xl bg-gradient-to-br from-[#0040b0] via-[#0060b0] to-[#00a090] p-10 sm:p-14">
            <h3 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-bold text-white">Practice medicine, not software management</h3>
            <p className="mt-2 max-w-lg text-[14px] text-white/70">Join founding doctors who are shaping the future of clinical tools. Early access, locked-in pricing, zero compromise on data privacy.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/founding-member" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13px] font-semibold text-[#0040b0] shadow-xl transition-all hover:shadow-2xl hover:scale-[1.03]">
                Apply now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/doctor/login" className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-6 py-3 text-[13px] font-semibold text-white transition-all hover:bg-white/20 hover:border-white/50">
                <LogIn className="h-4 w-4" /> Doctor Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial ───────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 flex justify-center gap-1">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-[#0040b0] text-[#0040b0]" />)}</div>
            <blockquote className="text-[clamp(1.125rem,2vw,1.5rem)] font-medium leading-relaxed">
              &ldquo;The clinical decision support caught a drug interaction I almost missed. That alone justified the switch.&rdquo;
            </blockquote>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0040b0] text-[13px] font-bold text-white">AK</div>
              <div className="text-left">
                <p className="text-sm font-semibold">Dr. Amit Kapoor</p>
                <p className="text-xs text-muted-foreground">Internal Medicine, City Hospital</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
