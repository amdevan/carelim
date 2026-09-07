"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Save,
  Plus,
  Trash2,
  Check,
  FileText,
  Layout,
  BarChart3,
  Megaphone,
  ArrowUpRight,
  Globe,
  Loader2,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Search,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  GripVertical,
  Clock,
  Shield,
  Zap,
  Star,
  Activity,
  Wifi,
  Users,
  Building2,
  Stethoscope,
  Pill,
  AlertCircle,
  Keyboard,
} from "lucide-react"

const ICON_MAP: Record<string, React.ElementType> = {
  Building2, Stethoscope, Pill, Shield, Zap, Globe, Users, Star, Activity, Wifi,
}

interface ContentData {
  header: { logoLink: string; navLinks: { label: string; href: string }[]; providerLinks: { label: string; href: string; desc: string }[]; patientLogin: { text: string; link: string; enabled: boolean }; ctaButton: { text: string; link: string } }
  hero: { badge: string; title: string; gradientTitle: string; description: string; ctaText: string; ctaLink: string; secondaryCtaText: string; secondaryCtaLink: string; waitlistCount: string; waitlistLabel: string }
  marquee: { icon: string; label: string }[]
  howItWorks: { sectionLabel: string; title: string; gradientTitle: string; description: string; steps: { num: string; title: string; body: string }[] }
  modules: { sectionLabel: string; title: string; ctaText: string; ctaLink: string; featured: { title: string; description: string; badge: string }; items: { title: string; description: string; category: string }[] }
  providers: { sectionLabel: string; title: string; gradientTitle: string; items: { title: string; description: string; link: string; color: string }[] }
  providerPages: { [key: string]: { hero: { badge: string; title: string; gradientTitle: string; description: string; buttons: { text: string; link: string; style: "primary" | "secondary" | "outline" }[] } } }
  stats: { value: string; label: string; color: string }[]
  cta: { title: string; description: string; buttonText: string; buttonLink: string }
  footer: { links: { label: string; href: string }[]; copyright: string }
  seo: { title: string; description: string }
}

const SECTIONS = [
  { id: "header", label: "Header", icon: Layout, desc: "Navbar links, buttons, logo" },
  { id: "hero", label: "Hero", icon: Layout, desc: "Main headline, badge, CTAs" },
  { id: "marquee", label: "Marquee", icon: ArrowUpRight, desc: "Scrolling items strip" },
  { id: "howItWorks", label: "How It Works", icon: FileText, desc: "Steps with descriptions" },
  { id: "modules", label: "Modules", icon: BarChart3, desc: "Module cards grid" },
  { id: "providers", label: "Providers", icon: Globe, desc: "Provider types" },
  { id: "providerPages", label: "Provider Pages", icon: Stethoscope, desc: "Hero buttons per provider" },
  { id: "stats", label: "Stats", icon: BarChart3, desc: "Numbers strip" },
  { id: "cta", label: "CTA Banner", icon: Megaphone, desc: "Bottom call-to-action" },
  { id: "footer", label: "Footer", icon: FileText, desc: "Links and copyright" },
  { id: "seo", label: "SEO", icon: Globe, desc: "Title and description" },
] as const

export default function CMSPage() {
  const router = useRouter()
  const [content, setContent] = useState<ContentData | null>(null)
  const [original, setOriginal] = useState<ContentData | null>(null)
  const [activeSection, setActiveSection] = useState("hero")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [search, setSearch] = useState("")
  const [history, setHistory] = useState<ContentData[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [error, setError] = useState("")
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const undoIdxRef = useRef(0)

  // Auth check
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized")
        return r.json()
      })
      .then((data) => setUser(data.user))
      .catch(() => router.push("/login"))
  }, [router])

  // Load content
  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        setContent(data)
        setOriginal(JSON.parse(JSON.stringify(data)))
        setHistory([data])
        setHistoryIdx(0)
        setLoading(false)
      })
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        save()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if (e.key === "Escape") {
        setShowShortcuts(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  })

  const hasChanges = useMemo(() => {
    if (!content || !original) return false
    return JSON.stringify(content) !== JSON.stringify(original)
  }, [content, original])

  const trackHistory = useCallback((next: ContentData) => {
    setHistory((prev) => {
      const newHist = prev.slice(0, undoIdxRef.current + 1)
      newHist.push(JSON.parse(JSON.stringify(next)))
      if (newHist.length > 50) newHist.shift()
      return newHist
    })
    setHistoryIdx((prev) => Math.min(prev + 1, 49))
    undoIdxRef.current = Math.min(undoIdxRef.current + 1, 49)
  }, [])

  const update = useCallback((path: string, value: unknown) => {
    setContent((prev) => {
      if (!prev) return prev
      const keys = path.split(".")
      const next = JSON.parse(JSON.stringify(prev))
      let obj: Record<string, unknown> = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]] as Record<string, unknown>
      obj[keys[keys.length - 1]] = value
      trackHistory(next)
      return next
    })
  }, [trackHistory])

  const undo = useCallback(() => {
    setHistoryIdx((prev) => {
      const newIdx = Math.max(0, prev - 1)
      undoIdxRef.current = newIdx
      setContent(JSON.parse(JSON.stringify(history[newIdx])))
      return newIdx
    })
  }, [history])

  const redo = useCallback(() => {
    setHistoryIdx((prev) => {
      const newIdx = Math.min(history.length - 1, prev + 1)
      undoIdxRef.current = newIdx
      setContent(JSON.parse(JSON.stringify(history[newIdx])))
      return newIdx
    })
  }, [history])

  const save = useCallback(async () => {
    if (!content) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      })
      if (!res.ok) throw new Error("Save failed")
      const updated = await res.json()
      setContent(updated)
      setOriginal(JSON.parse(JSON.stringify(updated)))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError("Failed to save. Please try again.")
    }
    setSaving(false)
  }, [content])

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  const toggleCollapse = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredSections = useMemo(() => {
    if (!search) return SECTIONS
    const q = search.toLowerCase()
    return SECTIONS.filter((s) => s.label.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
  }, [search])

  if (loading || !content || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#00a090]" />
          <p className="text-sm text-muted-foreground">Loading content manager...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ── Top Bar ─────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-card/80 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-sm font-bold tracking-tight">
              <span className="text-[#00a090]">C</span>arelim
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-semibold">Content Manager</span>
          </div>
          {hasChanges && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved
            </span>
          )}
          {!hasChanges && saved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              <Check className="h-2.5 w-2.5" /> Saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="hidden items-center gap-0.5 rounded-lg border border-border/50 p-0.5 sm:flex">
            <button onClick={undo} disabled={historyIdx <= 0} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="Undo (Ctrl+Z)">
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={redo} disabled={historyIdx >= history.length - 1} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30" title="Redo (Ctrl+Shift+Z)">
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Preview toggle */}
          <button onClick={() => setShowPreview(!showPreview)} className={`hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:inline-flex ${showPreview ? "bg-[#00a090]/10 text-[#00a090]" : "text-muted-foreground hover:bg-muted"}`}>
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>

          {/* Shortcuts */}
          <button onClick={() => setShowShortcuts(true)} className="hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted sm:block" title="Keyboard shortcuts">
            <Keyboard className="h-4 w-4" />
          </button>

          {/* Save */}
          <button onClick={save} disabled={saving || !hasChanges} className="inline-flex items-center gap-1.5 rounded-lg bg-[#00a090] px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#008f80] disabled:opacity-50 disabled:hover:bg-[#00a090]">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving..." : saved ? "Saved" : "Save"}
          </button>

          {/* User */}
          <div className="flex items-center gap-2 border-l border-border/50 pl-2 ml-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00a090] text-[10px] font-bold text-white">
              {user.name[0]}
            </div>
            <button onClick={logout} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ──────────────────────────────── */}
        <aside className={`flex shrink-0 flex-col border-r border-border/50 bg-card/50 transition-all ${sidebarCollapsed ? "w-0 overflow-hidden" : "w-60"}`}>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sections..."
                className="w-full rounded-lg border border-border/50 bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#00a090]/40"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {filteredSections.map((s) => {
              const Icon = s.icon
              const isActive = activeSection === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-[#00a090]/10 text-[#00a090]" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="border-t border-border/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{SECTIONS.length} sections</span>
              <span className="mx-1">·</span>
              <span>{history.length} revisions</span>
            </div>
          </div>
        </aside>

        {/* ── Editor + Preview ─────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-6">
            <SectionEditor section={activeSection} content={content} update={update} collapsedSections={collapsedSections} toggleCollapse={toggleCollapse} />
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="hidden w-[420px] shrink-0 overflow-y-auto border-l border-border/50 bg-muted/30 lg:block">
              <div className="sticky top-0 z-10 border-b border-border/50 bg-card/80 px-4 py-2.5 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-[#00a090]" />
                  <span className="text-xs font-semibold">Live Preview</span>
                  <span className="text-[10px] text-muted-foreground">— {SECTIONS.find((s) => s.id === activeSection)?.label}</span>
                </div>
              </div>
              <div className="p-4">
                <PreviewPanel section={activeSection} content={content} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold">Keyboard Shortcuts</h3>
            <div className="mt-4 space-y-2">
              {[
                { keys: "Ctrl + S", action: "Save changes" },
                { keys: "Ctrl + Z", action: "Undo" },
                { keys: "Ctrl + Shift + Z", action: "Redo" },
                { keys: "Esc", action: "Close this dialog" },
              ].map((s) => (
                <div key={s.action} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{s.action}</span>
                  <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-mono">{s.keys}</kbd>
                </div>
              ))}
            </div>
            <button onClick={() => setShowShortcuts(false)} className="mt-4 w-full rounded-lg bg-muted py-2 text-xs font-medium hover:bg-muted/80">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   SECTION EDITOR
   ════════════════════════════════════════════════════════════ */

function SectionEditor({
  section,
  content,
  update,
  collapsedSections,
  toggleCollapse,
}: {
  section: string
  content: ContentData
  update: (path: string, value: unknown) => void
  collapsedSections: Set<string>
  toggleCollapse: (id: string) => void
}) {
  if (section === "header") return <HeaderEditor content={content} update={update} />
  if (section === "hero") return <HeroEditor content={content} update={update} />
  if (section === "marquee") return <MarqueeEditor content={content} update={update} />
  if (section === "howItWorks") return <HowItWorksEditor content={content} update={update} />
  if (section === "modules") return <ModulesEditor content={content} update={update} />
  if (section === "providers") return <ProvidersEditor content={content} update={update} />
  if (section === "providerPages") return <ProviderPagesEditor content={content} update={update} />
  if (section === "stats") return <StatsEditor content={content} update={update} />
  if (section === "cta") return <CTAEditor content={content} update={update} />
  if (section === "footer") return <FooterEditor content={content} update={update} />
  if (section === "seo") return <SEOEditor content={content} update={update} />
  return null
}

function CollapsibleCard({ title, subtitle, id, collapsedSections, toggleCollapse, children, onRemove }: {
  title: string; subtitle?: string; id: string; collapsedSections: Set<string>; toggleCollapse: (id: string) => void; children: React.ReactNode; onRemove?: () => void
}) {
  const isCollapsed = collapsedSections.has(id)
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <button onClick={() => toggleCollapse(id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors">
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
        {onRemove && (
          <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="rounded-md p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 className="h-3.5 w-3.5" /></button>
        )}
        <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
      </button>
      {!isCollapsed && <div className="border-t border-border/30 px-4 py-4 space-y-3">{children}</div>}
    </div>
  )
}

/* ── Header ─────────────────────────────────────────────────── */
function HeaderEditor({ content, update }: { content: ContentData; update: (p: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SectionHead icon={Layout} label="Header / Navbar" sub="Navigation links, buttons, and logo settings" />

      <Field label="Logo Link" value={content.header.logoLink} onChange={(v) => update("header.logoLink", v)} />

      {/* Nav Links */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Navigation Links</p>
        {content.header.navLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={link.label}
              onChange={(e) => {
                const n = [...content.header.navLinks]; n[i] = { ...n[i], label: e.target.value }
                update("header.navLinks", n)
              }}
              className="w-1/3 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-[#00a090]/40"
              placeholder="Label"
            />
            <input
              value={link.href}
              onChange={(e) => {
                const n = [...content.header.navLinks]; n[i] = { ...n[i], href: e.target.value }
                update("header.navLinks", n)
              }}
              className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-[#00a090]/40"
              placeholder="/path"
            />
            <button onClick={() => update("header.navLinks", content.header.navLinks.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button onClick={() => update("header.navLinks", [...content.header.navLinks, { label: "New Link", href: "/" }])} className="inline-flex items-center gap-1 text-xs font-medium text-[#00a090] hover:underline"><Plus className="h-3 w-3" /> Add Link</button>
      </div>

      {/* Provider Dropdown */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">For Provider Dropdown</p>
        {content.header.providerLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={link.label}
              onChange={(e) => {
                const n = [...content.header.providerLinks]; n[i] = { ...n[i], label: e.target.value }
                update("header.providerLinks", n)
              }}
              className="w-1/4 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-[#00a090]/40"
              placeholder="Label"
            />
            <input
              value={link.href}
              onChange={(e) => {
                const n = [...content.header.providerLinks]; n[i] = { ...n[i], href: e.target.value }
                update("header.providerLinks", n)
              }}
              className="w-1/3 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-[#00a090]/40"
              placeholder="/path"
            />
            <input
              value={link.desc}
              onChange={(e) => {
                const n = [...content.header.providerLinks]; n[i] = { ...n[i], desc: e.target.value }
                update("header.providerLinks", n)
              }}
              className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-[#00a090]/40"
              placeholder="Description"
            />
            <button onClick={() => update("header.providerLinks", content.header.providerLinks.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button onClick={() => update("header.providerLinks", [...content.header.providerLinks, { label: "New Provider", href: "/provider/new", desc: "Description" }])} className="inline-flex items-center gap-1 text-xs font-medium text-[#00a090] hover:underline"><Plus className="h-3 w-3" /> Add Provider</button>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action Buttons</p>

        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Patient Login</p>
            <button
              onClick={() => update("header.patientLogin.enabled", !content.header.patientLogin.enabled)}
              className={`relative h-5 w-9 rounded-full transition-colors ${content.header.patientLogin.enabled ? "bg-[#00a090]" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${content.header.patientLogin.enabled ? "left-4.5" : "left-0.5"}`} />
            </button>
          </div>
          {content.header.patientLogin.enabled && (
            <>
              <Field label="Button Text" value={content.header.patientLogin.text} onChange={(v) => update("header.patientLogin.text", v)} />
              <Field label="Link" value={content.header.patientLogin.link} onChange={(v) => update("header.patientLogin.link", v)} />
            </>
          )}
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <p className="text-xs font-semibold">CTA Button (Right Side)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Button Text" value={content.header.ctaButton.text} onChange={(v) => update("header.ctaButton.text", v)} />
            <Field label="Link" value={content.header.ctaButton.link} onChange={(v) => update("header.ctaButton.link", v)} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Hero ─────────────────────────────────────────────────── */
function HeroEditor({ content, update }: { content: ContentData; update: (p: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SectionHead icon={Layout} label="Hero Section" sub="Main headline, badge, CTAs, social proof" />
      <Field label="Badge Text" value={content.hero.badge} onChange={(v) => update("hero.badge", v)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title Line 1" value={content.hero.title} onChange={(v) => update("hero.title", v)} />
        <Field label="Gradient Title" value={content.hero.gradientTitle} onChange={(v) => update("hero.gradientTitle", v)} accent />
      </div>
      <Field label="Description" value={content.hero.description} onChange={(v) => update("hero.description", v)} multiline />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary CTA" value={content.hero.ctaText} onChange={(v) => update("hero.ctaText", v)} />
        <Field label="CTA Link" value={content.hero.ctaLink} onChange={(v) => update("hero.ctaLink", v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Secondary CTA" value={content.hero.secondaryCtaText} onChange={(v) => update("hero.secondaryCtaText", v)} />
        <Field label="Secondary Link" value={content.hero.secondaryCtaLink} onChange={(v) => update("hero.secondaryCtaLink", v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Waitlist Count" value={content.hero.waitlistCount} onChange={(v) => update("hero.waitlistCount", v)} />
        <Field label="Waitlist Label" value={content.hero.waitlistLabel} onChange={(v) => update("hero.waitlistLabel", v)} />
      </div>
    </div>
  )
}

/* ── Marquee ──────────────────────────────────────────────── */
function MarqueeEditor({ content, update }: { content: ContentData; update: (p: string, v: unknown) => void }) {
  const icons = ["Building2", "Stethoscope", "Pill", "Shield", "Zap", "Globe", "Users", "Star", "Activity", "Wifi"]
  return (
    <div className="space-y-4">
      <SectionHead icon={ArrowUpRight} label="Marquee Strip" sub="Scrolling items across the band" />
      <div className="space-y-2">
        {content.marquee.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={item.icon}
              onChange={(e) => { const n = [...content.marquee]; n[i] = { ...n[i], icon: e.target.value }; update("marquee", n) }}
              className="rounded-lg border border-border/60 bg-background px-2 py-2 text-xs"
            >
              {icons.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </select>
            <input value={item.label} onChange={(e) => { const n = [...content.marquee]; n[i] = { ...n[i], label: e.target.value }; update("marquee", n) }} className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-[#00a090]/40" />
            <button onClick={() => update("marquee", content.marquee.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <button onClick={() => update("marquee", [...content.marquee, { icon: "Star", label: "New" }])} className="inline-flex items-center gap-1 text-xs font-medium text-[#00a090] hover:underline"><Plus className="h-3 w-3" /> Add Item</button>
    </div>
  )
}

/* ── How It Works ─────────────────────────────────────────── */
function HowItWorksEditor({ content, update }: { content: ContentData; update: (p: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SectionHead icon={FileText} label="How It Works" sub="Steps section with descriptions" />
      <Field label="Section Label" value={content.howItWorks.sectionLabel} onChange={(v) => update("howItWorks.sectionLabel", v)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title" value={content.howItWorks.title} onChange={(v) => update("howItWorks.title", v)} />
        <Field label="Gradient Title" value={content.howItWorks.gradientTitle} onChange={(v) => update("howItWorks.gradientTitle", v)} accent />
      </div>
      <Field label="Description" value={content.howItWorks.description} onChange={(v) => update("howItWorks.description", v)} multiline />
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Steps</p>
        {content.howItWorks.steps.map((step, i) => (
          <CollapsibleCard key={i} title={`${step.num} — ${step.title}`} id={`step-${i}`} collapsedSections={new Set()} toggleCollapse={() => {}} onRemove={() => update("howItWorks.steps", content.howItWorks.steps.filter((_, j) => j !== i))}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Number" value={step.num} onChange={(v) => { const n = [...content.howItWorks.steps]; n[i] = { ...n[i], num: v }; update("howItWorks.steps", n) }} />
              <Field label="Title" value={step.title} onChange={(v) => { const n = [...content.howItWorks.steps]; n[i] = { ...n[i], title: v }; update("howItWorks.steps", n) }} />
            </div>
            <Field label="Body" value={step.body} onChange={(v) => { const n = [...content.howItWorks.steps]; n[i] = { ...n[i], body: v }; update("howItWorks.steps", n) }} multiline />
          </CollapsibleCard>
        ))}
        <button onClick={() => { const n = content.howItWorks.steps.length + 1; update("howItWorks.steps", [...content.howItWorks.steps, { num: String(n).padStart(2, "0"), title: "New Step", body: "Description" }]) }} className="inline-flex items-center gap-1 text-xs font-medium text-[#00a090] hover:underline"><Plus className="h-3 w-3" /> Add Step</button>
      </div>
    </div>
  )
}

/* ── Modules ──────────────────────────────────────────────── */
function ModulesEditor({ content, update }: { content: ContentData; update: (p: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SectionHead icon={BarChart3} label="Modules" sub="Module cards and featured item" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Section Label" value={content.modules.sectionLabel} onChange={(v) => update("modules.sectionLabel", v)} />
        <Field label="Title" value={content.modules.title} onChange={(v) => update("modules.title", v)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CTA Text" value={content.modules.ctaText} onChange={(v) => update("modules.ctaText", v)} />
        <Field label="CTA Link" value={content.modules.ctaLink} onChange={(v) => update("modules.ctaLink", v)} />
      </div>
      <div className="rounded-xl border border-[#00a090]/20 bg-[#00a090]/5 p-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#00a090]">Featured Module</p>
        <Field label="Title" value={content.modules.featured.title} onChange={(v) => update("modules.featured.title", v)} />
        <Field label="Description" value={content.modules.featured.description} onChange={(v) => update("modules.featured.description", v)} multiline />
        <Field label="Badge" value={content.modules.featured.badge} onChange={(v) => update("modules.featured.badge", v)} />
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Module Items</p>
        {content.modules.items.map((mod, i) => (
          <CollapsibleCard key={i} title={mod.title} subtitle={mod.category} id={`mod-${i}`} collapsedSections={new Set()} toggleCollapse={() => {}} onRemove={() => update("modules.items", content.modules.items.filter((_, j) => j !== i))}>
            <Field label="Title" value={mod.title} onChange={(v) => { const n = [...content.modules.items]; n[i] = { ...n[i], title: v }; update("modules.items", n) }} />
            <Field label="Description" value={mod.description} onChange={(v) => { const n = [...content.modules.items]; n[i] = { ...n[i], description: v }; update("modules.items", n) }} multiline />
            <Field label="Category" value={mod.category} onChange={(v) => { const n = [...content.modules.items]; n[i] = { ...n[i], category: v }; update("modules.items", n) }} />
          </CollapsibleCard>
        ))}
        <button onClick={() => update("modules.items", [...content.modules.items, { title: "New Module", description: "Description", category: "General" }])} className="inline-flex items-center gap-1 text-xs font-medium text-[#00a090] hover:underline"><Plus className="h-3 w-3" /> Add Module</button>
      </div>
    </div>
  )
}

/* ── Providers ────────────────────────────────────────────── */
function ProvidersEditor({ content, update }: { content: ContentData; update: (p: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SectionHead icon={Globe} label="Providers" sub="Provider types section" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Section Label" value={content.providers.sectionLabel} onChange={(v) => update("providers.sectionLabel", v)} />
        <Field label="Gradient Title" value={content.providers.gradientTitle} onChange={(v) => update("providers.gradientTitle", v)} accent />
      </div>
      <Field label="Title" value={content.providers.title} onChange={(v) => update("providers.title", v)} />
      <div className="space-y-2">
        {content.providers.items.map((item, i) => (
          <CollapsibleCard key={i} title={item.title} subtitle={item.link} id={`prov-${i}`} collapsedSections={new Set()} toggleCollapse={() => {}} onRemove={() => update("providers.items", content.providers.items.filter((_, j) => j !== i))}>
            <Field label="Title" value={item.title} onChange={(v) => { const n = [...content.providers.items]; n[i] = { ...n[i], title: v }; update("providers.items", n) }} />
            <Field label="Description" value={item.description} onChange={(v) => { const n = [...content.providers.items]; n[i] = { ...n[i], description: v }; update("providers.items", n) }} multiline />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Link" value={item.link} onChange={(v) => { const n = [...content.providers.items]; n[i] = { ...n[i], link: v }; update("providers.items", n) }} />
              <Field label="Color" value={item.color} onChange={(v) => { const n = [...content.providers.items]; n[i] = { ...n[i], color: v }; update("providers.items", n) }} />
            </div>
          </CollapsibleCard>
        ))}
        <button onClick={() => update("providers.items", [...content.providers.items, { title: "New Provider", description: "Description", link: "/provider/new", color: "#00a090" }])} className="inline-flex items-center gap-1 text-xs font-medium text-[#00a090] hover:underline"><Plus className="h-3 w-3" /> Add Provider</button>
      </div>
    </div>
  )
}

/* ── Provider Pages ─────────────────────────────────────────── */
function ProviderPagesEditor({ content, update }: { content: ContentData; update: (p: string, v: unknown) => void }) {
  const providers = ["clinic", "doctor", "pharmacy"]
  const labels: Record<string, string> = { clinic: "For Clinics", doctor: "For Doctors", pharmacy: "For Pharmacies" }

  return (
    <div className="space-y-4">
      <SectionHead icon={Stethoscope} label="Provider Pages" sub="Hero section buttons for each provider type — add/remove login links from here" />
      {providers.map((key) => {
        const page = content.providerPages?.[key]
        if (!page) return null
        return (
          <div key={key} className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border/30 bg-muted/30 px-4 py-2.5">
              <Stethoscope className="h-3.5 w-3.5 text-[#00a090]" />
              <p className="text-xs font-bold">{labels[key] || key}</p>
            </div>
            <div className="p-4 space-y-3">
              <Field label="Badge" value={page.hero.badge} onChange={(v) => update(`providerPages.${key}.hero.badge`, v)} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Title" value={page.hero.title} onChange={(v) => update(`providerPages.${key}.hero.title`, v)} />
                <Field label="Gradient Title" value={page.hero.gradientTitle} onChange={(v) => update(`providerPages.${key}.hero.gradientTitle`, v)} accent />
              </div>
              <Field label="Description" value={page.hero.description} onChange={(v) => update(`providerPages.${key}.hero.description`, v)} multiline />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hero Buttons</p>
                  <button
                    onClick={() => {
                      const btns = [...(page.hero.buttons || []), { text: "New Button", link: "/", style: "outline" as const }]
                      update(`providerPages.${key}.hero.buttons`, btns)
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#00a090] hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add Button
                  </button>
                </div>
                {(page.hero.buttons || []).map((btn, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
                    <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                    <input
                      value={btn.text}
                      onChange={(e) => {
                        const btns = [...page.hero.buttons]; btns[i] = { ...btns[i], text: e.target.value }
                        update(`providerPages.${key}.hero.buttons`, btns)
                      }}
                      className="w-1/3 rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px] outline-none focus:border-[#00a090]/40"
                      placeholder="Button text"
                    />
                    <input
                      value={btn.link}
                      onChange={(e) => {
                        const btns = [...page.hero.buttons]; btns[i] = { ...btns[i], link: e.target.value }
                        update(`providerPages.${key}.hero.buttons`, btns)
                      }}
                      className="flex-1 rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px] outline-none focus:border-[#00a090]/40"
                      placeholder="/path"
                    />
                    <select
                      value={btn.style}
                      onChange={(e) => {
                        const btns = [...page.hero.buttons]; btns[i] = { ...btns[i], style: e.target.value as "primary" | "secondary" | "outline" }
                        update(`providerPages.${key}.hero.buttons`, btns)
                      }}
                      className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-[11px]"
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="outline">Outline</option>
                    </select>
                    <button
                      onClick={() => {
                        const btns = page.hero.buttons.filter((_: unknown, j: number) => j !== i)
                        update(`providerPages.${key}.hero.buttons`, btns)
                      }}
                      className="rounded-md p-1 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Stats ────────────────────────────────────────────────── */
function StatsEditor({ content, update }: { content: ContentData; update: (p: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SectionHead icon={BarChart3} label="Stats" sub="Numbers strip with gradient colors" />
      {content.stats.map((stat, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={stat.value} onChange={(e) => { const n = [...content.stats]; n[i] = { ...n[i], value: e.target.value }; update("stats", n) }} className="w-24 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs font-bold outline-none focus:border-[#00a090]/40" placeholder="0" />
          <input value={stat.label} onChange={(e) => { const n = [...content.stats]; n[i] = { ...n[i], label: e.target.value }; update("stats", n) }} className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-[#00a090]/40" placeholder="Label" />
          <select value={stat.color} onChange={(e) => { const n = [...content.stats]; n[i] = { ...n[i], color: e.target.value }; update("stats", n) }} className="rounded-lg border border-border/60 bg-background px-2 py-2 text-xs">
            <option value="teal">Teal</option><option value="blue">Blue</option>
          </select>
          <button onClick={() => update("stats", content.stats.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <button onClick={() => update("stats", [...content.stats, { value: "0", label: "New Stat", color: "teal" }])} className="inline-flex items-center gap-1 text-xs font-medium text-[#00a090] hover:underline"><Plus className="h-3 w-3" /> Add Stat</button>
    </div>
  )
}

/* ── CTA ──────────────────────────────────────────────────── */
function CTAEditor({ content, update }: { content: ContentData; update: (p: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SectionHead icon={Megaphone} label="CTA Banner" sub="Bottom gradient call-to-action" />
      <Field label="Title" value={content.cta.title} onChange={(v) => update("cta.title", v)} />
      <Field label="Description" value={content.cta.description} onChange={(v) => update("cta.description", v)} multiline />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Button Text" value={content.cta.buttonText} onChange={(v) => update("cta.buttonText", v)} />
        <Field label="Button Link" value={content.cta.buttonLink} onChange={(v) => update("cta.buttonLink", v)} />
      </div>
    </div>
  )
}

/* ── Footer ───────────────────────────────────────────────── */
function FooterEditor({ content, update }: { content: ContentData; update: (p: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SectionHead icon={FileText} label="Footer" sub="Links and copyright" />
      <Field label="Copyright" value={content.footer.copyright} onChange={(v) => update("footer.copyright", v)} />
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Links</p>
        {content.footer.links.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={link.label} onChange={(e) => { const n = [...content.footer.links]; n[i] = { ...n[i], label: e.target.value }; update("footer.links", n) }} className="w-1/3 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-[#00a090]/40" placeholder="Label" />
            <input value={link.href} onChange={(e) => { const n = [...content.footer.links]; n[i] = { ...n[i], href: e.target.value }; update("footer.links", n) }} className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs outline-none focus:border-[#00a090]/40" placeholder="/path" />
            <button onClick={() => update("footer.links", content.footer.links.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button onClick={() => update("footer.links", [...content.footer.links, { label: "New", href: "/" }])} className="inline-flex items-center gap-1 text-xs font-medium text-[#00a090] hover:underline"><Plus className="h-3 w-3" /> Add Link</button>
      </div>
    </div>
  )
}

/* ── SEO ──────────────────────────────────────────────────── */
function SEOEditor({ content, update }: { content: ContentData; update: (p: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SectionHead icon={Globe} label="SEO Settings" sub="Page title and meta description" />
      <Field label="Page Title" value={content.seo.title} onChange={(v) => update("seo.title", v)} />
      <Field label="Meta Description" value={content.seo.description} onChange={(v) => update("seo.description", v)} multiline />
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Preview</p>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">{content.seo.title || "Page Title"}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{content.seo.description || "Meta description..."}</p>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   LIVE PREVIEW
   ════════════════════════════════════════════════════════════ */

function PreviewPanel({ section, content }: { section: string; content: ContentData }) {
  if (section === "header") return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Navbar Preview</p>
      <div className="flex items-center justify-between rounded-lg border border-border/30 bg-background px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-[#00a090] text-[8px] font-bold text-white">C</div>
          <span className="text-[10px] font-bold">Carelim</span>
        </div>
        <div className="flex items-center gap-1.5">
          {content.header.navLinks.map((l, i) => (
            <span key={i} className="rounded px-1.5 py-0.5 text-[8px] text-muted-foreground hover:text-foreground">{l.label}</span>
          ))}
          <span className="rounded px-1.5 py-0.5 text-[8px] text-muted-foreground">For Provider ▾</span>
        </div>
        <div className="flex items-center gap-1">
          {content.header.patientLogin.enabled && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[7px]">{content.header.patientLogin.text}</span>
          )}
          <span className="rounded-full bg-[#00a090] px-1.5 py-0.5 text-[7px] text-white">{content.header.ctaButton.text}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Provider Dropdown</p>
        {content.header.providerLinks.map((p, i) => (
          <div key={i} className="flex items-center gap-2 rounded border border-border/20 px-2 py-1.5">
            <Stethoscope className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[9px] font-medium">{p.label}</span>
            <span className="text-[8px] text-muted-foreground">{p.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (section === "hero") return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00a090]/20 bg-[#00a090]/5 px-2.5 py-0.5">
        <span className="h-1 w-1 rounded-full bg-[#00a090] animate-pulse" />
        <span className="text-[9px] font-semibold uppercase text-[#00a090]">{content.hero.badge}</span>
      </div>
      <h3 className="text-xl font-extrabold leading-tight">{content.hero.title} <span className="bg-gradient-to-r from-[#0040b0] to-[#00a090] bg-clip-text text-transparent">{content.hero.gradientTitle}</span></h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{content.hero.description}</p>
      <div className="flex gap-2">
        <span className="rounded-full bg-[#00a090] px-3 py-1.5 text-[10px] font-semibold text-white">{content.hero.ctaText}</span>
        <span className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">{content.hero.secondaryCtaText}</span>
      </div>
      <p className="text-[10px] text-muted-foreground"><strong className="text-foreground">{content.hero.waitlistCount}</strong> {content.hero.waitlistLabel}</p>
    </div>
  )

  if (section === "marquee") return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex gap-3 overflow-hidden">
        {content.marquee.map((item, i) => {
          const Icon = ICON_MAP[item.icon] || Star
          return <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0"><Icon className="h-3 w-3 text-[#00a090]" />{item.label}</div>
        })}
      </div>
    </div>
  )

  if (section === "howItWorks") return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#00a090]">{content.howItWorks.sectionLabel}</p>
      <h3 className="text-lg font-bold">{content.howItWorks.title} <span className="bg-gradient-to-r from-[#0040b0] to-[#00a090] bg-clip-text text-transparent">{content.howItWorks.gradientTitle}</span></h3>
      <p className="text-xs text-muted-foreground">{content.howItWorks.description}</p>
      <div className="space-y-2 border-t border-border/30 pt-3">
        {content.howItWorks.steps.map((s, i) => (
          <div key={i} className="flex gap-2"><span className="text-[9px] font-bold text-[#00a090]">{s.num}</span><div><p className="text-xs font-semibold">{s.title}</p><p className="text-[10px] text-muted-foreground">{s.body}</p></div></div>
        ))}
      </div>
    </div>
  )

  if (section === "modules") return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#00a090]">{content.modules.sectionLabel}</p>
      <h3 className="text-lg font-bold">{content.modules.title}</h3>
      <div className="rounded-lg border border-[#00a090]/15 bg-[#00a090]/5 p-3">
        <p className="text-xs font-bold">{content.modules.featured.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{content.modules.featured.description}</p>
        <span className="mt-1 inline-block text-[9px] font-semibold text-[#00a090]">{content.modules.featured.badge}</span>
      </div>
      {content.modules.items.map((m, i) => <div key={i} className="rounded-lg border border-border/30 p-2.5"><p className="text-[11px] font-semibold">{m.title}</p><p className="text-[9px] text-muted-foreground">{m.description}</p></div>)}
    </div>
  )

  if (section === "providers") return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#00a090]">{content.providers.sectionLabel}</p>
      <h3 className="text-lg font-bold">{content.providers.title} <span className="bg-gradient-to-r from-[#0040b0] to-[#00a090] bg-clip-text text-transparent">{content.providers.gradientTitle}</span></h3>
      {content.providers.items.map((p, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-border/30 p-2.5">
          <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color }}><Building2 className="h-3.5 w-3.5 text-white" /></div>
          <div><p className="text-[11px] font-semibold">{p.title}</p><p className="text-[9px] text-muted-foreground">{p.description}</p></div>
        </div>
      ))}
    </div>
  )

  if (section === "providerPages") return (
    <div className="space-y-3">
      {["clinic", "doctor", "pharmacy"].map((key) => {
        const page = content.providerPages?.[key]
        if (!page) return null
        const colorMap: Record<string, string> = { clinic: "#00a090", doctor: "#0040b0", pharmacy: "#00a090" }
        return (
          <div key={key} className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: colorMap[key] }}>{page.hero.badge}</p>
            <h3 className="text-sm font-bold">{page.hero.title} <span className="bg-gradient-to-r from-[#0040b0] to-[#00a090] bg-clip-text text-transparent">{page.hero.gradientTitle}</span></h3>
            <p className="text-[10px] text-muted-foreground">{page.hero.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {(page.hero.buttons || []).map((btn: { text: string; link: string; style: string }, i: number) => (
                <span key={i} className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${
                  btn.style === "primary" ? "bg-[#00a090] text-white" :
                  btn.style === "secondary" ? "bg-[#00a090]/10 text-[#00a090] border border-[#00a090]/30" :
                  "border border-border text-muted-foreground"
                }`}>{btn.text}</span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )

  if (section === "stats") return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="grid grid-cols-2 gap-3">
        {content.stats.map((s, i) => (
          <div key={i} className="text-center rounded-lg bg-muted/30 p-3">
            <p className={`text-lg font-bold bg-gradient-to-r ${s.color === "teal" ? "from-[#00a090] to-[#0040b0]" : "from-[#0040b0] to-[#0060b0]"} bg-clip-text text-transparent`}>{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )

  if (section === "cta") return (
    <div className="rounded-xl bg-gradient-to-br from-[#0040b0] via-[#0060b0] to-[#00a090] p-5 space-y-2">
      <h3 className="text-base font-bold text-white">{content.cta.title}</h3>
      <p className="text-[11px] text-white/70">{content.cta.description}</p>
      <span className="inline-block rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#0040b0]">{content.cta.buttonText}</span>
    </div>
  )

  if (section === "footer") return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-2">
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        {content.footer.links.map((l, i) => <span key={i}>{l.label}</span>)}
      </div>
      <p className="text-[9px] text-muted-foreground">&copy; {new Date().getFullYear()} {content.footer.copyright}</p>
    </div>
  )

  if (section === "seo") return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-1">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Google Preview</p>
      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{content.seo.title}</p>
      <p className="text-xs text-green-700 dark:text-green-400">https://carelim.com</p>
      <p className="text-[11px] text-muted-foreground">{content.seo.description}</p>
    </div>
  )

  return null
}

/* ════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ════════════════════════════════════════════════════════════ */

function SectionHead({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-border/30">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00a090]/10"><Icon className="h-4 w-4 text-[#00a090]" /></div>
      <div><p className="text-sm font-bold">{label}</p><p className="text-[11px] text-muted-foreground">{sub}</p></div>
    </div>
  )
}

function Field({ label, value, onChange, multiline, accent, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; accent?: boolean; placeholder?: string
}) {
  return (
    <div>
      {label && <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>}
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors resize-y ${accent ? "border-[#00a090]/30 focus:border-[#00a090]/60 focus:ring-2 focus:ring-[#00a090]/10" : "border-border/60 focus:border-[#00a090]/40 focus:ring-2 focus:ring-[#00a090]/10"}`} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition-colors ${accent ? "border-[#00a090]/30 focus:border-[#00a090]/60 focus:ring-2 focus:ring-[#00a090]/10" : "border-border/60 focus:border-[#00a090]/40 focus:ring-2 focus:ring-[#00a090]/10"}`} />
      )}
    </div>
  )
}
