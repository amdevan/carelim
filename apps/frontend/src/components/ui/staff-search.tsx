"use client";

import { useMemo } from "react";
import { useFetch } from "@/lib/use-fetch";
import { SearchableSelect, SearchableOption } from "@/components/ui/searchable-select";

interface Staff {
  id: string;
  name: string;
  role?: string;
  department?: string;
}

interface StaffSearchProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  staff?: Staff[];
}

export function StaffSearch({
  label = "Staff",
  value,
  onValueChange,
  placeholder = "Search staff by name or role...",
  required,
  disabled,
  className,
  staff: staffProp,
}: StaffSearchProps) {
  const { data, loading } = useFetch<Staff[]>(
    staffProp ? null : "/api/staff"
  );

  const staffList = staffProp || (Array.isArray(data) ? data : []);

  const options: SearchableOption[] = useMemo(
    () =>
      staffList.map((s) => ({
        value: s.id,
        label: s.name,
        sublabel: [s.role, s.department].filter(Boolean).join(" • "),
      })),
    [staffList]
  );

  return (
    <SearchableSelect
      label={label}
      value={value}
      onValueChange={onValueChange}
      options={options}
      loading={loading && !staffProp}
      placeholder="Select staff"
      searchPlaceholder={placeholder}
      required={required}
      disabled={disabled}
      className={className}
    />
  );
}
