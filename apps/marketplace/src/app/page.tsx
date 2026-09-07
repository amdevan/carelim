"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import {
  Building2,
  Stethoscope,
  Pill,
  ArrowUpRight,
  ChevronRight,
  Shield,
  Zap,
  Globe,
  Users,
  Sparkles,
  Star,
  Activity,
  Wifi,
  Loader2,
} from "lucide-react"

const ICONS: Record<string, React.ElementType> = {
  Building2, Stethoscope, Pill, Shield, Zap, Globe, Users, Star, Activity, Wifi,
  ArrowUpRight, ChevronRight, Sparkles,
}

const TEAL = "#00a090"
const GRADIENT_TEXT =
  "bg-[length:300%_300%] bg-clip-text text-transparent animate-gradient-text"

interface SiteContent {
  hero: { badge: string; title: string; gradientTitle: string; description: string; ctaText: string; ctaLink: string; secondaryCtaText: string; secondaryCtaLink: string; waitlistCount: string; waitlistLabel: string }
  marquee: { icon: string; label: string }[]
  howItWorks: { sectionLabel: string; title: string; gradientTitle: string; description: string; steps: { num: string; title: string; body: string }[] }
  modules: { sectionLabel: string; title: string; ctaText: string; ctaLink: string; featured: { title: string; description: string; badge: string }; items: { title: string; description: string; category: string }[] }
  providers: { sectionLabel: string; title: string; gradientTitle: string; items: { title: string; description: string; link: string; color: string }[] }
  stats: { value: string; label: string; color: string }[]
  cta: { title: string; description: string; buttonText: string; buttonLink: string }
  footer: { links: { label: string; href: string }[]; copyright: string }
}

const MODULE_ICONS: React.ElementType[] = [Stethoscope, Pill, Zap, Shield, Users]

function getIcon(name: string): React.ElementType {
  return ICONS[name] || Star
}

export default function Marketplace() {
  const heroRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState<SiteContent | null>(null)

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then(setContent)
  }, [])

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
      el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
    }
    el.addEventListener("mousemove", handler)
    return () => el.removeEventListener("mousemove", handler)
  }, [])

  if (!content) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <main className="flex flex-col overflow-hidden">
      {/* ── Hero ─────────────────────────────────────── */}
      <section ref={heroRef} className="spotlight relative min-h-[92vh] flex items-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-blob animate-float absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[#00a090]/12 to-[#0040b0]/8 blur-3xl" />
          <div className="animate-blob animate-float delay-300 absolute -right-20 top-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-[#0040b0]/10 to-[#00a090]/8 blur-3xl" />
          <div className="animate-blob animate-float delay-600 absolute bottom-0 left-1/3 h-[350px] w-[350px] rounded-full bg-gradient-to-br from-[#00a090]/8 to-teal-300/8 blur-3xl" />
        </div>

        <div
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${TEAL}18 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8 py-20 lg:py-0">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
            <div>
              <div className="animate-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-[#00a090]/20 bg-[#00a090]/5 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#00a090]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00a090] animate-pulse" />
                {content.hero.badge}
              </div>

              <h1 className="animate-fade-up delay-100 text-[clamp(2.75rem,6vw,5.5rem)] font-extrabold leading-[0.92] tracking-[-0.04em]">
                {content.hero.title}
                <br />
                <span className={`${GRADIENT_TEXT} bg-gradient-to-r from-[#0040b0] via-[#0060b0] to-[#00a090]`}>
                  {content.hero.gradientTitle}
                </span>
              </h1>

              <p className="animate-fade-up delay-200 mt-7 max-w-lg text-[17px] leading-relaxed text-muted-foreground">
                {content.hero.description}
              </p>

              <div className="animate-fade-up delay-300 mt-10 flex flex-wrap items-center gap-4">
                <Link href={content.hero.ctaLink} className="group inline-flex items-center gap-2 rounded-full bg-[#00a090] px-6 py-3 text-[13px] font-semibold text-white transition-all hover:shadow-lg hover:shadow-[#00a090]/25 hover:scale-[1.02]">
                  {content.hero.ctaText}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link href={content.hero.secondaryCtaLink} className="inline-flex items-center gap-1.5 rounded-full border-2 border-border px-6 py-3 text-[13px] font-semibold text-muted-foreground transition-all hover:border-[#00a090]/40 hover:text-[#00a090] hover:bg-[#00a090]/5">
                  {content.hero.secondaryCtaText}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="animate-fade-up delay-400 mt-14 flex items-center gap-6 border-t border-border/60 pt-6">
                <div className="flex -space-x-2">
                  {[{ bg: "bg-[#00a090]", init: "JD" }, { bg: "bg-[#0040b0]", init: "AS" }, { bg: "bg-[#0060b0]", init: "MK" }, { bg: "bg-teal-600", init: "RL" }].map((u, i) => (
                    <div key={i} className={`h-8 w-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white ${u.bg} animate-bounce-subtle`} style={{ animationDelay: `${i * 150}ms` }}>{u.init}</div>
                  ))}
                </div>
                <p className="text-[13px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{content.hero.waitlistCount}</span> {content.hero.waitlistLabel}
                </p>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-3">
              {[
                { title: "Clinic Ops", desc: "Scheduling, EMR, billing", gradient: "from-[#00a090]/10 to-[#0040b0]/8", iconColor: "text-[#00a090]" },
                { title: "Clinical AI", desc: "Decision support, notes", gradient: "from-[#0040b0]/10 to-[#0060b0]/8", iconColor: "text-[#0040b0]" },
                { title: "Pharmacy", desc: "Inventory, e-Rx, supply", gradient: "from-[#00a090]/8 to-teal-300/8", iconColor: "text-teal-600" },
                { title: "Telehealth", desc: "Video, chat, remote care", gradient: "from-[#0060b0]/8 to-[#00a090]/6", iconColor: "text-[#0060b0]" },
              ].map((card, i) => (
                <div key={card.title} className={`animate-scale-in delay-${(i + 2) * 100} group rounded-2xl border border-border/50 bg-gradient-to-br ${card.gradient} p-6 transition-all hover:shadow-lg hover:shadow-[#00a090]/5 hover:-translate-y-1 hover:border-[#00a090]/20`}>
                  <div className={`animate-float delay-${(i + 2) * 100}`}><Stethoscope className={`h-5 w-5 ${card.iconColor}`} /></div>
                  <p className="mt-4 text-[13px] font-semibold text-foreground">{card.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ─────────────────────────────────── */}
      <section className="relative border-y border-border/50 bg-gradient-to-r from-[#00a090]/4 via-[#0040b0]/3 to-[#00a090]/4 overflow-hidden">
        <div className="flex items-center gap-8 py-4 animate-marquee" style={{ width: "max-content" }}>
          {[...Array(2)].map((_, setIdx) => (
            <div key={setIdx} className="flex items-center gap-8 shrink-0">
              {content.marquee.map((item) => {
                const Icon = getIcon(item.icon)
                return (
                  <div key={`${setIdx}-${item.label}`} className="flex items-center gap-2 text-sm font-medium text-foreground/60 shrink-0">
                    <Icon className="h-4 w-4 text-[#00a090]" />
                    {item.label}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-16 lg:grid-cols-[0.45fr_1fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#00a090]">{content.howItWorks.sectionLabel}</p>
              <h2 className="text-[clamp(2rem,3.5vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.03em]">
                {content.howItWorks.title}<br />
                <span className="bg-gradient-to-r from-[#0040b0] to-[#00a090] bg-clip-text text-transparent">{content.howItWorks.gradientTitle}</span>
              </h2>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{content.howItWorks.description}</p>
            </div>
            <div className="space-y-0 divide-y divide-border/50">
              {content.howItWorks.steps.map((step, i) => (
                <div key={step.num} className="animate-fade-up flex gap-6 py-8 first:pt-0 last:pb-0" style={{ animationDelay: `${i * 200}ms` }}>
                  <span className="mt-0.5 bg-gradient-to-r from-[#0040b0] to-[#00a090] bg-clip-text text-transparent text-[11px] font-bold tracking-widest">{step.num}</span>
                  <div>
                    <h3 className="text-[15px] font-semibold">{step.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Modules ─────────────────────────────────── */}
      <section className="relative py-24 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00a090]/3 via-transparent to-[#0040b0]/3" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#00a090]">{content.modules.sectionLabel}</p>
              <h2 className="text-[clamp(2rem,3.5vw,3rem)] font-bold tracking-[-0.03em]">{content.modules.title}</h2>
            </div>
            <Link href={content.modules.ctaLink} className="group inline-flex items-center gap-1 text-[13px] font-semibold text-[#00a090] transition-colors hover:underline">
              {content.modules.ctaText}<ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
            </Link>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="animate-scale-in group relative overflow-hidden rounded-2xl border border-[#00a090]/15 bg-gradient-to-br from-[#00a090]/5 to-[#0040b0]/3 p-8 transition-all hover:shadow-xl hover:shadow-[#00a090]/8 hover:-translate-y-1 sm:row-span-2 lg:col-span-1">
              <div className="animate-blob animate-float absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-[#00a090]/15 to-[#0040b0]/10" />
              <div className="inline-flex rounded-xl bg-[#00a090] p-2.5"><Building2 className="h-5 w-5 text-white" /></div>
              <h3 className="mt-5 text-[17px] font-bold">{content.modules.featured.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{content.modules.featured.description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-[12px] font-semibold text-[#00a090]">{content.modules.featured.badge}<ChevronRight className="h-3 w-3" /></span>
            </div>
            {content.modules.items.map((mod, i) => {
              const Icon = MODULE_ICONS[i % MODULE_ICONS.length]
              return (
                <div key={mod.title} className={`animate-fade-up delay-${(i + 1) * 100} group rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-transparent hover:shadow-lg hover:-translate-y-1`}>
                  <div className="inline-flex rounded-xl bg-gradient-to-br from-[#00a090] to-[#0040b0] p-2.5"><Icon className="h-4 w-4 text-white" /></div>
                  <h3 className="mt-3 text-[14px] font-semibold">{mod.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{mod.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Providers ───────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="relative">
              <div className="animate-float aspect-square rounded-3xl bg-gradient-to-br from-[#00a090]/8 via-[#0040b0]/4 to-[#00a090]/6 p-8 animate-rainbow-border border-2">
                <div className="grid grid-cols-3 gap-3 h-full">
                  {["from-[#00a090] to-[#0040b0]","from-[#0040b0] to-[#0060b0]","from-[#00a090] to-teal-400","from-[#0060b0] to-[#0040b0]","from-teal-500 to-[#00a090]","from-[#0040b0] to-[#00a090]","from-[#00a090] to-[#0060b0]","from-[#0060b0] to-teal-400","from-[#0040b0] to-[#00a090]"].map((g, i) => (
                    <div key={i} className={`animate-scale-in rounded-xl bg-gradient-to-br ${g} opacity-60 animate-pulse-scale`} style={{ animationDelay: `${i * 200}ms` }} />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#00a090]">{content.providers.sectionLabel}</p>
              <h2 className="text-[clamp(2rem,3vw,3rem)] font-bold leading-[1.1] tracking-[-0.03em]">
                {content.providers.title}{" "}
                <span className="bg-gradient-to-r from-[#0040b0] to-[#00a090] bg-clip-text text-transparent">{content.providers.gradientTitle}</span>
              </h2>
              <div className="mt-8 space-y-4">
                {content.providers.items.map((item) => (
                  <Link key={item.title} href={item.link} className="group flex items-start gap-4 rounded-xl border border-transparent p-4 transition-all duration-300 hover:bg-[#00a090]/4 hover:border-[#00a090]/20">
                    <div className="mt-0.5 rounded-lg p-2 shadow-md" style={{ backgroundColor: item.color }}><Building2 className="h-4 w-4 text-white" /></div>
                    <div>
                      <h3 className="text-[14px] font-semibold group-hover:text-[#00a090] transition-colors">{item.title}</h3>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────── */}
      <section className="relative border-y border-border/50 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00a090]/4 via-[#0040b0]/3 to-[#00a090]/4 animate-gradient" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {content.stats.map((stat, i) => (
              <div key={stat.label} className="animate-fade-up text-center" style={{ animationDelay: `${i * 100}ms` }}>
                <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color === "teal" ? "from-[#00a090] to-[#0040b0]" : "from-[#0040b0] to-[#0060b0]"} bg-clip-text text-transparent`}>{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="animate-glow relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0040b0] via-[#0060b0] to-[#00a090] px-8 py-16 sm:px-14 sm:py-20">
            <div className="animate-blob animate-float absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
            <div className="animate-blob animate-float delay-400 absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/8" />
            <div className="animate-spin-slow absolute right-12 top-12 h-4 w-4 rounded-full border-2 border-white/20 border-t-white/60" />
            <div className="animate-spin-slow delay-300 absolute bottom-8 right-1/3 h-3 w-3 rounded-full border-2 border-white/20 border-t-white/60" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-tight tracking-[-0.02em] text-white">{content.cta.title}</h2>
                <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/70">{content.cta.description}</p>
              </div>
              <Link href={content.cta.buttonLink} className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[13px] font-semibold text-[#0040b0] shadow-xl transition-all hover:shadow-2xl hover:scale-[1.03]">
                <Sparkles className="h-4 w-4 text-[#00a090]" />{content.cta.buttonText}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 py-10 sm:px-8 md:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/images/carelim-os.png" alt="Carelim" width={90} height={28} className="h-6 w-auto" />
          </div>
          <div className="flex gap-6 text-[12px] text-muted-foreground">
            {content.footer.links.map((link) => (
              <Link key={link.label} href={link.href} className="hover:text-[#00a090] transition-colors">{link.label}</Link>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">&copy; {new Date().getFullYear()} {content.footer.copyright}</p>
        </div>
      </footer>
    </main>
  )
}
