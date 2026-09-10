"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   SHARED UTILITIES & COMPONENTS — LIMS Module
   ═══════════════════════════════════════════════════════════ */

/* ── Shared Constants ── */

export const SAMPLE_TYPES = ["Blood", "Urine", "Stool", "Sputum", "Tissue", "CSF", "Swab"] as const;

export const CONTAINER_TYPES = ["EDTA Tube", "Citrate Tube", "Heparin Tube", "Plain Tube", "Fluoride Tube", "Sterile Container", "Urine Container"] as const;

export const SAMPLE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  collected: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  received: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  recollected: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  processing: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
};

export const SAMPLE_TYPE_COLORS: Record<string, string> = {
  Blood: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  Urine: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Stool: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Sputum: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
  Tissue: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  CSF: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  Swab: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
};

export const TAX_RATE = 0.13;

/* ── Shared Helpers ── */

export function escapeHTML(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function buildBarcodeBars(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = ((hash << 5) - hash + code.charCodeAt(i)) | 0;
  }
  const bars: string[] = [];
  let seed = Math.abs(hash);
  for (let i = 0; i < 40; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const w = (seed % 2) + 1;
    bars.push(`<span style="display:inline-block;width:${w}px;height:28px;background:#1a2e35;margin:0 ${i % 5 === 0 ? 2 : 1}px;border-radius:1px"></span>`);
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  }
  return bars.join("");
}

export function toDateInputValue(d: string | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

/* ── Shared Components ── */

export function StatCard({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function SortHeader({
  label, colKey, sortKey, sortDir, onSort, className,
}: {
  label: string;
  colKey: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: () => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <TableHead className={className}>
      <button type="button" onClick={onSort} className="inline-flex items-center gap-1 text-left hover:text-foreground transition-colors">
        {label}
        {active ? (
          sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />
        )}
      </button>
    </TableHead>
  );
}

export function InfoTile({ label, value, icon, mono }: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </p>
      <p className={`text-sm font-medium mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
