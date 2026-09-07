"use client";

import { useMemo, useCallback } from "react";
import { useFetch } from "@/lib/use-fetch";
import { SearchableSelect, SearchableOption } from "@/components/ui/searchable-select";

interface Patient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  umrNo?: string;
}

interface PatientSearchProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect?: (patient: Patient | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Optional: pass patients directly instead of fetching */
  patients?: Patient[];
}

export function PatientSearch({
  label = "Patient",
  value,
  onValueChange,
  onSelect,
  placeholder = "Search patient by name, UMR, or phone...",
  required,
  disabled,
  className,
  patients: patientsProp,
}: PatientSearchProps) {
  const { data, loading } = useFetch<Patient[]>(
    patientsProp ? null : "/api/patients"
  );

  const patients = patientsProp || (Array.isArray(data) ? data : []);

  const options: SearchableOption[] = useMemo(
    () =>
      patients.map((p) => ({
        value: p.id,
        label: p.name,
        sublabel: [p.umrNo, p.phone].filter(Boolean).join(" • "),
      })),
    [patients]
  );

  const handleChange = useCallback(
    (val: string) => {
      onValueChange(val);
      if (onSelect) {
        const found = val ? patients.find((p) => p.id === val) || null : null;
        onSelect(found);
      }
    },
    [onValueChange, onSelect, patients]
  );

  return (
    <SearchableSelect
      label={label}
      value={value}
      onValueChange={handleChange}
      options={options}
      loading={loading && !patientsProp}
      placeholder="Select patient"
      searchPlaceholder={placeholder}
      required={required}
      disabled={disabled}
      className={className}
    />
  );
}
