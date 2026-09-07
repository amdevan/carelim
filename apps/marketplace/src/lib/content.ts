import fs from "fs"
import path from "path"

export interface SiteContent {
  header: {
    logoLink: string
    navLinks: { label: string; href: string }[]
    providerLinks: { label: string; href: string; desc: string }[]
    patientLogin: { text: string; link: string; enabled: boolean }
    ctaButton: { text: string; link: string }
  }
  hero: {
    badge: string
    title: string
    gradientTitle: string
    description: string
    ctaText: string
    ctaLink: string
    secondaryCtaText: string
    secondaryCtaLink: string
    waitlistCount: string
    waitlistLabel: string
  }
  marquee: { icon: string; label: string }[]
  howItWorks: {
    sectionLabel: string
    title: string
    gradientTitle: string
    description: string
    steps: { num: string; title: string; body: string }[]
  }
  modules: {
    sectionLabel: string
    title: string
    ctaText: string
    ctaLink: string
    featured: {
      title: string
      description: string
      badge: string
    }
    items: { title: string; description: string; category: string }[]
  }
  providers: {
    sectionLabel: string
    title: string
    gradientTitle: string
    items: {
      title: string
      description: string
      link: string
      color: string
    }[]
  }
  stats: { value: string; label: string; color: string }[]
  cta: {
    title: string
    description: string
    buttonText: string
    buttonLink: string
  }
  footer: {
    links: { label: string; href: string }[]
    copyright: string
  }
  providerPages: {
    [key: string]: {
      hero: {
        badge: string
        title: string
        gradientTitle: string
        description: string
        buttons: { text: string; link: string; style: "primary" | "secondary" | "outline" }[]
      }
    }
  }
  seo: {
    title: string
    description: string
  }
}

const DEFAULT_CONTENT: SiteContent = {
  header: {
    logoLink: "/",
    navLinks: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Founding Member", href: "/founding-member" },
    ],
    providerLinks: [
      { label: "For Clinic", href: "/provider/clinic", desc: "Scheduling, billing, EMR" },
      { label: "For Doctor", href: "/provider/doctor", desc: "Clinical tools, telehealth" },
      { label: "For Pharmacy", href: "/provider/pharmacy", desc: "Inventory, e-prescriptions" },
    ],
    patientLogin: { text: "Patient Login", link: "/patient/login", enabled: true },
    ctaButton: { text: "Join Waitlist", link: "/founding-member" },
  },
  hero: {
    badge: "Coming Early 2026",
    title: "The app store",
    gradientTitle: "for healthcare",
    description:
      "Carelim Marketplace is where clinics, doctors, and pharmacies discover and install the modules they need — scheduling, billing, e-prescriptions, analytics — without vendor lock-in.",
    ctaText: "Become a Founding Member",
    ctaLink: "/founding-member",
    secondaryCtaText: "Read our story",
    secondaryCtaLink: "/about",
    waitlistCount: "240+",
    waitlistLabel: "providers on the waitlist",
  },
  marquee: [
    { icon: "Building2", label: "Clinics" },
    { icon: "Stethoscope", label: "Doctors" },
    { icon: "Pill", label: "Pharmacies" },
    { icon: "Activity", label: "Lab Systems" },
    { icon: "Wifi", label: "IoT Devices" },
    { icon: "Shield", label: "Compliance" },
    { icon: "Users", label: "240+ Partners" },
    { icon: "Star", label: "Top Rated" },
  ],
  howItWorks: {
    sectionLabel: "How it works",
    title: "Browse. Install.",
    gradientTitle: "Run in minutes.",
    description:
      "No lengthy onboarding. No consultant fees. Pick the modules that fit your workflow and go live the same day.",
    steps: [
      {
        num: "01",
        title: "Explore the catalog",
        body: "Every module is built by healthcare engineers, reviewed by practitioners, and listed with transparent pricing.",
      },
      {
        num: "02",
        title: "One-click install",
        body: "Hit install and the module appears in your Carelim dashboard. No configuration wizard, no staging server.",
      },
      {
        num: "03",
        title: "Grow with your practice",
        body: "Start with scheduling, add billing later, plug in analytics when you're ready. Every module shares a common patient record.",
      },
    ],
  },
  modules: {
    sectionLabel: "Marketplace",
    title: "Modules shipping soon",
    ctaText: "See full roadmap",
    ctaLink: "/about",
    featured: {
      title: "Practice Management",
      description:
        "The full suite — appointments, EMR, billing, staff scheduling, and patient portal. Everything a clinic needs in a single install.",
      badge: "Available at launch",
    },
    items: [
      {
        title: "Clinical Decision Support",
        description: "Evidence-based protocols and AI-assisted diagnostics at the point of care.",
        category: "Clinical",
      },
      {
        title: "Pharmacy Operations",
        description: "Inventory tracking, e-prescriptions, expiry alerts, and supplier management.",
        category: "Pharmacy",
      },
      {
        title: "Revenue Cycle",
        description: "Insurance claims, self-pay invoicing, and automated follow-ups.",
        category: "Finance",
      },
      {
        title: "Compliance & Security",
        description: "HIPAA-grade audit logs, consent management, and data encryption.",
        category: "Operations",
      },
      {
        title: "Patient Portal",
        description: "Self-service booking, records access, and secure messaging.",
        category: "Patient",
      },
    ],
  },
  providers: {
    sectionLabel: "For every provider",
    title: "One platform.",
    gradientTitle: "Every specialty.",
    items: [
      {
        title: "Clinics",
        description: "Manage your entire practice — from the front desk to the billing department.",
        link: "/provider/clinic",
        color: "#00a090",
      },
      {
        title: "Doctors",
        description: "Clinical tools that stay out of your way. Decision support, scheduling, telehealth.",
        link: "/provider/doctor",
        color: "#0040b0",
      },
      {
        title: "Pharmacies",
        description: "From inventory to dispensing, modules that connect directly to clinic orders.",
        link: "/provider/pharmacy",
        color: "#0060b0",
      },
    ],
  },
  stats: [
    { value: "500+", label: "Healthcare Providers", color: "teal" },
    { value: "50K+", label: "Patients Served", color: "blue" },
    { value: "20+", label: "Modules", color: "teal" },
    { value: "10+", label: "Countries", color: "blue" },
  ],
  cta: {
    title: "Early access opens Q1 2026",
    description:
      "Founding members get priority onboarding, locked-in pricing, and a seat at the table as we build the roadmap.",
    buttonText: "Apply now",
    buttonLink: "/founding-member",
  },
  footer: {
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Founding Member", href: "/founding-member" },
      { label: "Patient Login", href: "/patient/login" },
    ],
    copyright: "Carelim",
  },
  providerPages: {
    clinic: {
      hero: {
        badge: "For Clinics",
        title: "Run your clinic",
        gradientTitle: "without the chaos",
        description: "Scheduling, patient management, billing, and analytics — all in one platform. No more juggling five different tools.",
        buttons: [
          { text: "Join as a Founding Clinic", link: "/founding-member", style: "primary" },
          { text: "Login to Access Modules", link: "/clinic/login", style: "secondary" },
          { text: "Learn more", link: "/about", style: "outline" },
        ],
      },
    },
    doctor: {
      hero: {
        badge: "For Doctors",
        title: "Clinical tools that",
        gradientTitle: "stay out of your way",
        description: "Decision support, telemedicine, e-prescriptions, and practice analytics — designed so you can focus on patients, not software.",
        buttons: [
          { text: "Join as a Founding Doctor", link: "/founding-member", style: "primary" },
          { text: "Login to Access Modules", link: "/doctor/login", style: "secondary" },
          { text: "Learn more", link: "/about", style: "outline" },
        ],
      },
    },
    pharmacy: {
      hero: {
        badge: "For Pharmacies",
        title: "Pharmacy operations",
        gradientTitle: "that scale with you",
        description: "Inventory, prescriptions, supply chain, and analytics — connected directly to the clinics you serve.",
        buttons: [
          { text: "Join as a Founding Pharmacy", link: "/founding-member", style: "primary" },
          { text: "Login to Access Modules", link: "/pharmacy/login", style: "secondary" },
          { text: "Learn more", link: "/about", style: "outline" },
        ],
      },
    },
  },
  seo: {
    title: "Carelim Marketplace — The App Store for Healthcare",
    description: "Healthcare marketplace for clinics, doctors, and pharmacies. Discover and install modules for scheduling, billing, e-prescriptions, and analytics.",
  },
}

const CONTENT_PATH = path.join(process.cwd(), ".content.json")

function readContent(): SiteContent {
  try {
    if (fs.existsSync(CONTENT_PATH)) {
      const raw = fs.readFileSync(CONTENT_PATH, "utf-8")
      return { ...DEFAULT_CONTENT, ...JSON.parse(raw) }
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_CONTENT
}

function writeContent(content: SiteContent): void {
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(content, null, 2), "utf-8")
}

export function getContent(): SiteContent {
  return readContent()
}

export function updateContent(partial: Partial<SiteContent>): SiteContent {
  const current = readContent()
  const merged = deepMerge(current, partial)
  writeContent(merged)
  return merged
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function deepMerge(target: any, source: any): any {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const srcVal = source[key]
    const tgtVal = target[key]
    if (
      srcVal && typeof srcVal === "object" && !Array.isArray(srcVal) &&
      tgtVal && typeof tgtVal === "object" && !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal)
    } else if (srcVal !== undefined) {
      result[key] = srcVal
    }
  }
  return result
}
