"use client";

import { useEffect, useRef } from "react";
import { useAppStore, type ViewKey } from "@/store/app-store";
import { toast } from "sonner";

const GOTO_MAP: Record<string, ViewKey> = {
  d: "dashboard",
  a: "appointments",
  p: "patients",
  o: "doctors",
  e: "emr",
  l: "laboratory",
  x: "radiology",
  h: "pharmacy",
  i: "inventory",
  b: "billing",
  c: "accounting",
  r: "reports",
  s: "settings",
  u: "audit",
};

const NEW_MAP: Record<string, { view: ViewKey; label: string }> = {
  p: { view: "patients", label: "New Patient" },
  a: { view: "appointments", label: "Book Appointment" },
  i: { view: "billing", label: "Create Invoice" },
  e: { view: "emr", label: "New Prescription" },
  t: { view: "laboratory", label: "Order Lab Test" },
};

export function KeyboardNav() {
  const { setView, setCommandOpen, toggleSidebar, authed } = useAppStore();
  const pendingKey = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authed) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't trigger when typing in inputs
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      // Don't trigger if modifier keys are pressed (except for our specific combos)
      if (e.ctrlKey || e.altKey) return;

      // ⌘B / Ctrl+B — toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      const key = e.key.toLowerCase();

      // Two-key sequences: G (goto) or N (new)
      if (pendingKey.current === null) {
        if (key === "g" || key === "n") {
          pendingKey.current = key;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            pendingKey.current = null;
          }, 800);
          return;
        }
      } else {
        // We have a pending G or N
        if (pendingKey.current === "g" && GOTO_MAP[key]) {
          e.preventDefault();
          setView(GOTO_MAP[key]);
          toast.info(`→ ${GOTO_MAP[key].charAt(0).toUpperCase() + GOTO_MAP[key].slice(1)}`, { duration: 1500 });
        } else if (pendingKey.current === "n" && NEW_MAP[key]) {
          e.preventDefault();
          setView(NEW_MAP[key].view);
          toast.info(NEW_MAP[key].label, { duration: 1500 });
        }
        pendingKey.current = null;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [authed, setView, setCommandOpen, toggleSidebar]);

  return null;
}
