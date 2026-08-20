"use client";

import { formatRs } from "@/lib/format";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  money?: boolean;
}

export function ChartTooltip({ active, payload, label, money }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-elevated px-3 py-2.5 min-w-[140px]">
      {label && (
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-foreground/80 capitalize">
                {entry.name}
              </span>
            </div>
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {money ? formatRs(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
