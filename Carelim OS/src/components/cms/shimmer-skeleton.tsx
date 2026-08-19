"use client";

import { cn } from "@/lib/utils";

interface ShimmerSkeletonProps {
  className?: string;
  rows?: number;
}

export function ShimmerSkeleton({ className, rows = 1 }: ShimmerSkeletonProps) {
  if (rows > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "shimmer rounded-lg bg-muted/60",
              className || "h-10 w-full"
            )}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "shimmer rounded-lg bg-muted/60",
        className || "h-10 w-full"
      )}
    />
  );
}

export function ShimmerCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card overflow-hidden", className)}>
      <div className="shimmer h-3 bg-muted/40 m-4 rounded" />
      <div className="px-4 pb-4 space-y-2">
        <div className="shimmer h-8 w-24 bg-muted/60 rounded" />
        <div className="shimmer h-3 w-32 bg-muted/40 rounded" />
      </div>
    </div>
  );
}

export function ShimmerRow({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="shimmer rounded bg-muted/50"
          style={{ width: `${100 / columns}%`, height: 16 }}
        />
      ))}
    </div>
  );
}
