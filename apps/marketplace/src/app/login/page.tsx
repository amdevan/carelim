"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Eye, EyeOff, Loader2, ArrowRight, Lock, Mail } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from") || "/cms"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Login failed")
        setLoading(false)
        return
      }

      router.push(from)
      router.refresh()
    } catch {
      setError("Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-blob animate-float absolute -left-32 top-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-[#00a090]/10 to-[#0040b0]/6 blur-3xl" />
        <div className="animate-blob animate-float delay-300 absolute -right-20 bottom-1/4 h-[350px] w-[350px] rounded-full bg-gradient-to-br from-[#0040b0]/8 to-[#00a090]/6 blur-3xl" />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #00a09018 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative w-full max-w-md px-5">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00a090] to-[#0040b0] shadow-lg shadow-[#00a090]/20">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <Image
            src="/images/carelim-os.png"
            alt="Carelim"
            width={140}
            height={42}
            className="h-10 w-auto"
          />
          <p className="mt-2 text-sm text-muted-foreground">Content Management System</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-xl shadow-[#00a090]/5 backdrop-blur-xl">
          <h1 className="text-xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Access the content manager</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@carelim.com"
                  required
                  className="w-full rounded-xl border border-border/60 bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[#00a090]/50 focus:ring-2 focus:ring-[#00a090]/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full rounded-xl border border-border/60 bg-background py-2.5 pl-10 pr-10 text-sm outline-none transition-colors focus:border-[#00a090]/50 focus:ring-2 focus:ring-[#00a090]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00a090] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#008f80] hover:shadow-lg hover:shadow-[#00a090]/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-6 rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Default credentials</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">admin@carelim.com</span> / <span className="font-medium text-foreground">carelim2026</span>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">&copy; {new Date().getFullYear()} Carelim</p>
      </div>
    </div>
  )
}
