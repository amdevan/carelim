"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Heart,
  Star,
  Shield,
  Zap,
  Users,
  Gift,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react"

const benefits = [
  {
    icon: Star,
    title: "Priority Access",
    description: "Be first in line when new modules and features launch.",
  },
  {
    icon: Gift,
    title: "Exclusive Pricing",
    description: "Locked-in founding member rates — forever.",
  },
  {
    icon: Zap,
    title: "Early Beta Access",
    description: "Test new features before anyone else and shape the roadmap.",
  },
  {
    icon: Users,
    title: "Advisory Council",
    description: "Join a private council with the Carelim product team.",
  },
  {
    icon: Shield,
    title: "Dedicated Support",
    description: "Direct line to our engineering team for priority support.",
  },
  {
    icon: Heart,
    title: "Community Badge",
    description: "Exclusive founding member badge on your profile.",
  },
]

const tiers = [
  {
    name: "Clinic",
    price: "Free",
    period: "",
    description: "For clinics and healthcare facilities",
    features: [
      "Founding member badge",
      "Priority access to new modules",
      "Advisory council invitation",
      "Exclusive pricing lock-in",
    ],
  },
  {
    name: "Provider",
    price: "Free",
    period: "",
    description: "For individual doctors and practitioners",
    features: [
      "Founding member badge",
      "Priority access to new modules",
      "Early beta access",
      "Exclusive pricing lock-in",
    ],
    featured: true,
  },
  {
    name: "Pharmacy",
    price: "Free",
    period: "",
    description: "For pharmacies and pharmaceutical businesses",
    features: [
      "Founding member badge",
      "Priority access to new modules",
      "Dedicated support",
      "Exclusive pricing lock-in",
    ],
  },
]

export default function FoundingMember() {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    role: "",
    type: "clinic",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Limited Spots Available
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Become a Founding Member
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Join Carelim as a founding member and help shape the future of healthcare technology.
              Get exclusive benefits and lock in special pricing for life.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Founding Member Benefits</h2>
            <p className="mt-4 text-muted-foreground">
              Early supporters get advantages that last forever.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div
                  key={benefit.title}
                  className="rounded-xl border bg-card p-6 shadow-soft transition-all hover:shadow-elevated"
                >
                  <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="border-y bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Choose Your Path</h2>
            <p className="mt-4 text-muted-foreground">
              Founding membership is free — we just ask for your commitment to helping us build.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-xl border bg-card p-8 shadow-soft ${
                  tier.featured ? "ring-2 ring-primary shadow-elevated" : ""
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-muted-foreground">/{tier.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href="#apply"
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-all ${
                    tier.featured
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border bg-background hover:bg-accent"
                  }`}
                >
                  Apply Now
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Apply for Membership</h2>
            <p className="mt-4 text-muted-foreground">
              Fill out the form below and we&apos;ll be in touch within 48 hours.
            </p>
          </div>

          {submitted ? (
            <div className="mt-12 rounded-xl border bg-card p-8 text-center shadow-soft">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h3 className="mt-4 text-xl font-bold">Application Submitted!</h3>
              <p className="mt-2 text-muted-foreground">
                Thank you for your interest in becoming a founding member.
                We&apos;ll review your application and get back to you within 48 hours.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Return to Home
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-12 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="jane@clinic.com"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Organization</label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="City Health Clinic"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Chief Medical Officer"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">I am a *</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["clinic", "doctor", "pharmacy"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className={`rounded-md border px-4 py-2.5 text-sm font-medium capitalize transition-all ${
                        formData.type === type
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-accent"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
              >
                Submit Application
              </button>

              <p className="text-center text-xs text-muted-foreground">
                By applying, you agree to our terms. We respect your privacy and will never share your information.
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
