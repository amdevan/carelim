"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard, Command, Search, Plus, ArrowRight } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  label: string;
  group: string;
}

const shortcuts: ShortcutItem[] = [
  { keys: ["⌘", "K"], label: "Open command palette", group: "Global" },
  { keys: ["⇧", "?"], label: "Show keyboard shortcuts", group: "Global" },
  { keys: ["⌘", "B"], label: "Toggle sidebar", group: "Global" },
  { keys: ["G", "D"], label: "Go to Dashboard", group: "Navigation" },
  { keys: ["G", "A"], label: "Go to Appointments", group: "Navigation" },
  { keys: ["G", "P"], label: "Go to Patients", group: "Navigation" },
  { keys: ["G", "L"], label: "Go to Laboratory (LIMS)", group: "Navigation" },
  { keys: ["G", "B"], label: "Go to Billing", group: "Navigation" },
  { keys: ["G", "R"], label: "Go to Reports", group: "Navigation" },
  { keys: ["N", "P"], label: "New Patient", group: "Quick Actions" },
  { keys: ["N", "A"], label: "Book Appointment", group: "Quick Actions" },
  { keys: ["N", "I"], label: "Create Invoice", group: "Quick Actions" },
  { keys: ["Esc"], label: "Close dialog/panel", group: "Global" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Shift + ?
      if (e.shiftKey && e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      // Escape closes
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const groups = [...new Set(shortcuts.map((s) => s.group))];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-teal-600" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and perform actions faster.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {groups.map((group) => (
            <div key={group}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                {group}
              </h4>
              <div className="space-y-1">
                {shortcuts.filter((s) => s.group === group).map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm text-foreground">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <span key={j} className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md border border-border bg-muted text-[11px] font-mono font-semibold text-foreground">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
          <Search className="w-3.5 h-3.5" />
          <span>Press</span>
          <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
          <span>to open the command palette at any time</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
