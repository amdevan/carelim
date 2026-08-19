"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  Server, Database, Wifi, ShieldCheck, Activity, Cpu, HardDrive,
} from "lucide-react";
import { motion } from "framer-motion";

interface StatusItem {
  label: string;
  value: string;
  status: "online" | "warning" | "offline";
  icon: React.ComponentType<{ className?: string }>;
  detail: string;
}

const statusConfig = {
  online: { color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-500", label: "Online" },
  warning: { color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", dot: "bg-amber-500", label: "Warning" },
  offline: { color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30", dot: "bg-rose-500", label: "Offline" },
};

export function SystemStatusWidget() {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setUptime(Date.now() - start);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ${s % 60}s`;
  };

  const items: StatusItem[] = [
    { label: "API Server", value: "200ms", status: "online", icon: Server, detail: "All endpoints responding" },
    { label: "Database", value: "Connected", status: "online", icon: Database, detail: "SQLite · 0 queries pending" },
    { label: "Network", value: "Stable", status: "online", icon: Wifi, detail: "Latency 12ms" },
    { label: "Security", value: "Protected", status: "online", icon: ShieldCheck, detail: "RBAC · Audit logging active" },
  ];

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              System Status
            </CardTitle>
            <CardDescription className="text-xs">Real-time service health</CardDescription>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">All Systems Operational</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, i) => {
          const cfg = statusConfig[item.status];
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2 hover:bg-accent/30 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} font-semibold`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{item.detail}</p>
              </div>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground shrink-0">{item.value}</span>
            </motion.div>
          );
        })}
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/40 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3" /> CPU 23%
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" /> Disk 41%
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Activity className="w-3 h-3" /> Uptime {formatUptime(uptime)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
