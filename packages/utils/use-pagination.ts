"use client";

import { useState, useMemo } from "react";

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(pageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => items.slice((currentPage - 1) * size, currentPage * size),
    [items, currentPage, size]
  );
  const range = total === 0 ? "0-0 of 0" : `${(currentPage - 1) * size + 1}-${Math.min(currentPage * size, total)} of ${total}`;
  return { page: currentPage, setPage, size, setSize, totalPages, paged, total, range };
}

export function useSort<T>(items: T[], initialKey: keyof T | "" = "") {
  const [sortKey, setSortKey] = useState<keyof T | "">(initialKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const sorted = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [items, sortKey, sortDir]);
  const toggleSort = (key: keyof T) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };
  return { sorted, sortKey, sortDir, toggleSort };
}
