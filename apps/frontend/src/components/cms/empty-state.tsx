"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-teal-500/10 rounded-2xl blur-xl" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-100 dark:border-teal-900/50 flex items-center justify-center">
          <Icon className="w-8 h-8 text-teal-500 dark:text-teal-400" />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action}
    </motion.div>
  );
}

interface StatPillProps {
  label: string;
  value: string | number;
  color?: string;
}

export function StatPill({ label, value, color = "text-foreground" }: StatPillProps) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn("text-sm font-bold tabular-nums", color)}>{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}
