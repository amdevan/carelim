"use client";

import { useState, useMemo, useCallback } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  loading?: boolean;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SearchableSelect({
  label,
  placeholder = "Select...",
  value,
  onValueChange,
  options,
  loading = false,
  searchPlaceholder = "Search...",
  className,
  required,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(q))
    );
  }, [options, search]);

  const selected = options.find((o) => o.value === value);

  const handleSelect = useCallback(
    (val: string) => {
      onValueChange(val === value ? "" : val);
      setOpen(false);
      setSearch("");
    },
    [onValueChange, value]
  );

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between text-left font-normal h-10",
              !value && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selected ? selected.label : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === option.value && "bg-accent"
                  )}
                >
                  <Check
                    className={cn(
                      "absolute left-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="truncate">{option.label}</span>
                    {option.sublabel && (
                      <span className="text-xs text-muted-foreground truncate">
                        {option.sublabel}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
