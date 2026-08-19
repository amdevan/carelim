"use client";

import { useAppStore, navItems } from "@/store/app-store";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Search } from "lucide-react";
import { useEffect } from "react";

export function CommandPalette() {
  const { commandOpen, setCommandOpen, setView } = useAppStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandOpen, setCommandOpen]);

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Search modules, patients, doctors, invoices…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {navItems.map((item) => (
            <CommandItem
              key={item.key}
              onSelect={() => { setView(item.key); setCommandOpen(false); }}
              className="gap-2"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => { setView("patients"); setCommandOpen(false); }} className="gap-2">
            <Search className="w-4 h-4 text-muted-foreground" /> Register New Patient
          </CommandItem>
          <CommandItem onSelect={() => { setView("appointments"); setCommandOpen(false); }} className="gap-2">
            <Search className="w-4 h-4 text-muted-foreground" /> Book Appointment
          </CommandItem>
          <CommandItem onSelect={() => { setView("billing"); setCommandOpen(false); }} className="gap-2">
            <Search className="w-4 h-4 text-muted-foreground" /> Create Invoice
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
