"use client"

import Link from "next/link"
import { useState } from "react"
import { Heart, Eye, EyeOff, ArrowRight } from "lucide-react"

export default function PatientLogin() {
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<"login" | "register">("login")

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        {/* header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Heart className="h-5 w-5" fill="currentColor" />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {mode === "login"
              ? "Sign in to access your health records, prescriptions, and appointments."
              : "Join Carelim to manage your health journey in one place."}
          </p>
        </div>

        {/* mode toggle */}
        <div className="mb-6 flex rounded-full border border-border/60 bg-muted/40 p-0.5">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full py-2 text-[12px] font-semibold uppercase tracking-wider transition-all ${
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
          }}
          className="space-y-4"
        >
          {mode === "register" && (
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Jane Smith"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 pr-10 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
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

          {mode === "login" && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <input type="checkbox" className="rounded border-border" />
                Remember me
              </label>
              <button type="button" className="text-[12px] font-medium text-primary hover:underline">
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/20"
          >
            {mode === "login" ? "Sign In" : "Create Account"}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        {/* footer note */}
        <p className="mt-6 text-center text-[12px] text-muted-foreground">
          Need help?{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            Contact support
          </Link>
        </p>

        <div className="mt-8 border-t border-border/50 pt-6 text-center">
          <Link href="/" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            &larr; Back to Carelim
          </Link>
        </div>
      </div>
    </main>
  )
}
