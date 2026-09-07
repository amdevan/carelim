import Link from "next/link"
import {
  Heart,
  Shield,
  Zap,
  Globe,
  Users,
  Target,
  ArrowRight,
  Lightbulb,
} from "lucide-react"

export default function About() {
  return (
    <main className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              About Carelim Marketplace
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              We&apos;re building the operating system for modern healthcare — an open,
              composable platform where clinics, doctors, and pharmacies can find
              the exact tools they need.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Our Mission</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Healthcare deserves better software. We started Carelim to give
                clinics, practitioners, and pharmacies access to modular,
                enterprise-grade tools — without the enterprise price tag.
              </p>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                The Marketplace is the next step: an open ecosystem where
                developers and healthcare experts build, share, and sell modules
                that plug directly into the Carelim platform.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Lightbulb, label: "Innovation", desc: "Pushing healthcare tech forward" },
                { icon: Shield, label: "Compliance", desc: "HIPAA-grade security by default" },
                { icon: Users, label: "Community", desc: "Built with healthcare providers" },
                { icon: Globe, label: "Global", desc: "Serving providers worldwide" },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-xl border bg-card p-5 shadow-soft">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="mt-3 font-semibold">{item.label}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Our Values</h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Heart,
                title: "Patient First",
                description:
                  "Every module on our marketplace must improve patient outcomes. We review every submission with this principle in mind.",
              },
              {
                icon: Shield,
                title: "Security & Privacy",
                description:
                  "Healthcare data is sacred. We enforce strict security standards and never compromise on compliance.",
              },
              {
                icon: Zap,
                title: "Developer Experience",
                description:
                  "Building for healthcare shouldn't be painful. Our APIs, documentation, and tooling make it easy.",
              },
              {
                icon: Globe,
                title: "Open Ecosystem",
                description:
                  "We believe in openness over lock-in. Build, extend, and integrate freely.",
              },
              {
                icon: Users,
                title: "Provider Empowerment",
                description:
                  "Healthcare providers should own their tools and data. We give them that power.",
              },
              {
                icon: Lightbulb,
                title: "Continuous Improvement",
                description:
                  "We ship fast, learn from our community, and constantly evolve the platform.",
              },
            ].map((value) => {
              const Icon = value.icon
              return (
                <div key={value.title} className="rounded-xl border bg-card p-6 shadow-soft">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 font-semibold">{value.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to shape the future of healthcare?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join our growing community of healthcare innovators.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/founding-member"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              Become a Founding Member
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md border px-6 py-3 text-sm font-semibold transition-all hover:bg-accent"
            >
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
