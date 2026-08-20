"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string; // tailwind gradient classes e.g. "from-teal-500 to-teal-600"
  trend?: string;
  trendDown?: boolean;
  subtitle?: string;
  index?: number;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "from-teal-500 to-teal-600",
  trend,
  trendDown,
  subtitle,
  index = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Card className="card-hover relative overflow-hidden border-border/60">
        {/* Subtle gradient accent bar at top */}
        <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r", accent)} />
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className={cn(
              "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm shrink-0",
              accent
            )}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            {trend && (
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md",
                trendDown
                  ? "text-rose-600 bg-rose-50 dark:bg-rose-950/30"
                  : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
              )}>
                {trendDown ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                {trend}
              </span>
            )}
          </div>
          <p className="mt-3 text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums leading-none">
            {value}
          </p>
          <p className="text-xs sm:text-[13px] text-muted-foreground mt-1.5 font-medium">{label}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface KpiGridProps {
  items: KpiCardProps[];
}

export function KpiGrid({ items }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item, i) => (
        <KpiCard key={i} {...item} index={i} />
      ))}
    </div>
  );
}
