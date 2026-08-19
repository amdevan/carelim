"use client";

import { useEffect, useState, useRef } from "react";
import { apiUrl } from "@/lib/api";

export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!url) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(apiUrl(url))
      .then(async (r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then((d) => { if (active && mounted.current) { setData(d); setError(null); } })
      .catch((e) => { if (active && mounted.current) setError(e.message); })
      .finally(() => { if (active && mounted.current) setLoading(false); });
    return () => { active = false; };
  }, [url]);

  return { data, loading, error };
}
