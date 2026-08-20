"use client";

import { useState, useEffect, useRef } from "react";
import { useFetch } from "@/lib/use-fetch";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Patient {
  id: string; patientCode: string; name: string; phone: string;
  age: number; gender: string; bloodGroup: string | null;
}

interface PatientQuickLookupProps {
  onSelect: (patient: Patient) => void;
  children: React.ReactNode;
}

export function PatientQuickLookup({ onSelect, children }: PatientQuickLookupProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: patients } = useFetch<Patient[]>("/api/patients");

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
    }
  }, [open]);

  const filtered = (patients || []).filter(p => {
    if (!query) return false;
    const q = query.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
           p.patientCode.toLowerCase().includes(q) ||
           p.phone.includes(query);
  }).slice(0, 8);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div onClick={() => setOpen(true)}>{children}</div>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 shadow-elevated" align="start" sideOffset={8}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type patient name, ID, or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {!query && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              Start typing to search patients
            </div>
          )}
          {query && filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No patients found for "{query}"
            </div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); setOpen(false); }}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 hover:bg-accent/50 transition-colors text-left border-b last:border-0"
              )}
            >
              <Avatar className="w-9 h-9 border border-border shrink-0">
                <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 text-xs font-semibold">
                  {p.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{p.patientCode}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" /> {p.phone}</span>
                  <span>·</span>
                  <span>{p.age}y · <span className="capitalize">{p.gender}</span></span>
                  {p.bloodGroup && (
                    <span className="text-rose-600 font-medium">{p.bloodGroup}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        {filtered.length > 0 && (
          <div className="px-3 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} · Press Enter to select first
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
