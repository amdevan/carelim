"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import {
  Menu,
  X,
  ChevronDown,
  Stethoscope,
  Pill,
  Building2,
  LogIn,
  ArrowUp,
  ChevronRight,
} from "lucide-react"

interface HeaderData {
  logoLink: string
  navLinks: { label: string; href: string }[]
  providerLinks: { label: string; href: string; desc: string }[]
  patientLogin: { text: string; link: string; enabled: boolean }
  ctaButton: { text: string; link: string }
}

const ICON_MAP: Record<string, React.ElementType> = {
  Clinic: Building2, Doctor: Stethoscope, Pharmacy: Pill,
  For: Building2,
}

const DEFAULT_HEADER: HeaderData = {
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
}

export function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [header, setHeader] = useState<HeaderData>(DEFAULT_HEADER)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch CMS header content
  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (data?.header) setHeader(data.header)
      })
      .catch(() => {})
  }, [])

  // Scroll detection
  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 20)
      setShowTop(window.scrollY > 600)
    }
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
  }, [pathname])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const dropdownEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setDropdownOpen(true)
  }

  const dropdownLeave = () => {
    timeoutRef.current = setTimeout(() => setDropdownOpen(false), 150)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const navLinkClass = (href: string) => {
    const active = isActive(href)
    return `relative px-3 py-2 text-[13px] font-medium tracking-wide transition-colors ${
      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    }`
  }

  const PROVIDERS = header.providerLinks

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-border/50 bg-background/80 shadow-sm backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          {/* Logo */}
          <Link href={header.logoLink} className="group flex items-center gap-2.5 shrink-0">
            <Image
              src="/images/carelim-os.png"
              alt="Carelim"
              width={120}
              height={36}
              className="h-8 w-auto transition-transform group-hover:scale-[1.02]"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-0.5 lg:flex">
            {header.navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`${navLinkClass(link.href)} group`}>
                {link.label}
                {isActive(link.href) && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#00a090]" />}
              </Link>
            ))}

            {/* Provider dropdown */}
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={dropdownEnter}
              onMouseLeave={dropdownLeave}
            >
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`${navLinkClass("/provider")} group inline-flex items-center gap-1`}
              >
                For Provider
                <ChevronDown className={`h-3 w-3 opacity-40 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Animated underline for provider when any sub-page is active */}
              {isActive("/provider") && !dropdownOpen && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#00a090]" />
              )}

              {/* Dropdown */}
              <div
                className={`absolute top-full left-0 pt-2 transition-all duration-200 ${
                  dropdownOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"
                }`}
              >
                <div className="w-64 rounded-xl border border-border/50 bg-card/95 p-2 shadow-xl shadow-black/5 backdrop-blur-xl">
                  {PROVIDERS.map((p) => {
                    const active = isActive(p.href)
                    const iconKey = Object.keys(ICON_MAP).find((k) => p.label.includes(k)) || "For"
                    const Icon = ICON_MAP[iconKey] || Building2
                    return (
                      <Link
                        key={p.href}
                        href={p.href}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                          active ? "bg-[#00a090]/10 text-[#00a090]" : "hover:bg-muted"
                        }`}
                        onClick={() => setDropdownOpen(false)}
                      >
                        <div className={`rounded-lg p-1.5 ${active ? "bg-[#00a090]/15" : "bg-muted group-hover:bg-[#00a090]/10"}`}>
                          <Icon className={`h-4 w-4 ${active ? "text-[#00a090]" : "text-muted-foreground group-hover:text-[#00a090]"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{p.label}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{p.desc}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="hidden items-center gap-2.5 lg:flex">
            {header.patientLogin.enabled && (
              <Link
                href={header.patientLogin.link}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-3.5 py-2 text-[12px] font-semibold text-muted-foreground transition-all hover:border-[#00a090]/40 hover:text-[#00a090] hover:bg-[#00a090]/5"
              >
                <LogIn className="h-3 w-3" />
                {header.patientLogin.text}
              </Link>
            )}
            <Link
              href={header.ctaButton.link}
              className="inline-flex items-center rounded-full bg-[#00a090] px-4 py-2 text-[12px] font-semibold text-white shadow-md shadow-[#00a090]/20 transition-all hover:bg-[#008f80] hover:shadow-lg hover:shadow-[#00a090]/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              {header.ctaButton.text}
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="relative z-50 inline-flex items-center justify-center p-2 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <div className="relative h-5 w-5">
              <Menu className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${mobileOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`} />
              <X className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${mobileOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`} />
            </div>
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ─────────────────────── */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />

        {/* Menu panel */}
        <div
          className={`absolute right-0 top-0 h-full w-[min(320px,85vw)] bg-background shadow-2xl transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Mobile header */}
          <div className="flex h-16 items-center justify-between border-b border-border/50 px-5">
            <Image src="/images/carelim-os.png" alt="Carelim" width={100} height={30} className="h-7 w-auto" />
            <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Links */}
          <div className="flex flex-col overflow-y-auto px-4 py-4">
            {header.navLinks.map((link) => (
              <MobileLink key={link.href} href={link.href} pathname={pathname} onClick={() => setMobileOpen(false)}>{link.label}</MobileLink>
            ))}

            <div className="my-3 border-t border-border/50" />

            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">For Provider</p>
            {header.providerLinks.map((p) => {
              const iconKey = Object.keys(ICON_MAP).find((k) => p.label.includes(k)) || "For"
              const Icon = ICON_MAP[iconKey] || Building2
              return (
                <MobileLink key={p.href} href={p.href} pathname={pathname} onClick={() => setMobileOpen(false)} icon={<Icon className="h-4 w-4" />}>
                  {p.label}
                </MobileLink>
              )
            })}

            <div className="my-3 border-t border-border/50" />

            {header.patientLogin.enabled && (
              <MobileLink href={header.patientLogin.link} pathname={pathname} onClick={() => setMobileOpen(false)} icon={<LogIn className="h-4 w-4" />}>{header.patientLogin.text}</MobileLink>
            )}

            <div className="mt-6 space-y-2.5">
              <Link
                href={header.ctaButton.link}
                className="flex items-center justify-center rounded-xl bg-[#00a090] px-4 py-3 text-[13px] font-semibold text-white shadow-md shadow-[#00a090]/20 active:scale-[0.98]"
                onClick={() => setMobileOpen(false)}
              >
                {header.ctaButton.text}
              </Link>
              {header.patientLogin.enabled && (
                <Link
                  href={header.patientLogin.link}
                  className="flex items-center justify-center rounded-xl border border-border/60 px-4 py-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-[#00a090]/40 hover:text-[#00a090]"
                  onClick={() => setMobileOpen(false)}
                >
                  {header.patientLogin.text}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scroll to Top ──────────────────────────── */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#00a090] text-white shadow-lg shadow-[#00a090]/30 transition-all duration-300 hover:bg-[#008f80] hover:shadow-xl hover:scale-110 active:scale-95 ${
          showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </>
  )
}

function MobileLink({
  href,
  pathname,
  onClick,
  icon,
  children,
}: {
  href: string
  pathname: string
  onClick: () => void
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#00a090]/10 text-[#00a090]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
      onClick={onClick}
    >
      {icon && <span className={active ? "text-[#00a090]" : "text-muted-foreground"}>{icon}</span>}
      {children}
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#00a090]" />}
    </Link>
  )
}
