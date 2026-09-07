"use client";

import { useMemo } from "react";
import { useFetch } from "@/lib/use-fetch";
import { SearchableSelect, SearchableOption } from "@/components/ui/searchable-select";

interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  department?: string;
}

interface DoctorSearchProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Optional: pass doctors directly instead of fetching */
  doctors?: Doctor[];
}

export function DoctorSearch({
  label = "Doctor",
  value,
  onValueChange,
  placeholder = "Search doctor by name or specialty...",
  required,
  disabled,
  className,
  doctors: doctorsProp,
}: DoctorSearchProps) {
  const { data, loading } = useFetch<Doctor[]>(
    doctorsProp ? null : "/api/doctors"
  );

  const doctors = doctorsProp || (Array.isArray(data) ? data : []);

  const options: SearchableOption[] = useMemo(
    () =>
      doctors.map((d) => ({
        value: d.id,
        label: d.name,
        sublabel: d.specialization || d.department,
      })),
    [doctors]
  );

  return (
    <SearchableSelect
      label={label}
      value={value}
      onValueChange={onValueChange}
      options={options}
      loading={loading && !doctorsProp}
      placeholder="Select doctor"
      searchPlaceholder={placeholder}
      required={required}
      disabled={disabled}
      className={className}
    />
  );
}
