"use client";

import Image from "next/image";
import { ShieldCheck, Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Image src="/images/carelim-os.png" alt="Carelim OS" width={60} height={18} className="opacity-70" />
          <span>© {new Date().getFullYear()} Carelim OS. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            HIPAA & GDPR Ready
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            v2.4.0 · Multi-Tenant SaaS
          </span>
          <span className="hidden md:inline">Uptime 99.98%</span>
        </div>
      </div>
    </footer>
  );
}
