"use client";

import { useEffect, useState, useRef } from "react";
import { apiUrl } from "@/lib/api";
import { useAppStore } from "@/store/app-store";

export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const token = useAppStore((s) => s.token);
  const branchId = useAppStore((s) => s.branchId);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!url) return;
    // Auto-append branchId to URL for branch-scoped data
    const separator = url.includes("?") ? "&" : "?";
    const finalUrl = branchId ? `${url}${separator}branchId=${branchId}` : url;
    const controller = new AbortController();
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch(apiUrl(finalUrl), { credentials: "include", headers, signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then((d) => { if (active && mounted.current) { setData(d); setError(null); } })
      .catch((e) => {
        if (e.name === "AbortError") return;
        if (active && mounted.current) setError(e.message);
      })
      .finally(() => { if (active && mounted.current) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [url, token, branchId]);

  return { data, loading, error };
}
