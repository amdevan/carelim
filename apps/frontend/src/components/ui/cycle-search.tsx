"use client";

import { useMemo } from "react";
import { useFetch } from "@/lib/use-fetch";
import { SearchableSelect, SearchableOption } from "@/components/ui/searchable-select";

interface IVFCycle {
  id: string;
  cycleId?: string;
  patientName?: string;
  status?: string;
}

interface CycleSearchProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  cycles?: IVFCycle[];
}

export function CycleSearch({
  label = "IVF Cycle",
  value,
  onValueChange,
  placeholder = "Search by cycle ID or patient name...",
  required,
  disabled,
  className,
  cycles: cyclesProp,
}: CycleSearchProps) {
  const { data, loading } = useFetch<IVFCycle[]>(
    cyclesProp ? null : "/api/ivf/cycles"
  );

  const cycles = cyclesProp || (Array.isArray(data) ? data : []);

  const options: SearchableOption[] = useMemo(
    () =>
      cycles.map((c) => ({
        value: c.id,
        label: c.cycleId || c.id,
        sublabel: [c.patientName, c.status].filter(Boolean).join(" • "),
      })),
    [cycles]
  );

  return (
    <SearchableSelect
      label={label}
      value={value}
      onValueChange={onValueChange}
      options={options}
      loading={loading && !cyclesProp}
      placeholder="Select cycle"
      searchPlaceholder={placeholder}
      required={required}
      disabled={disabled}
      className={className}
    />
  );
}
