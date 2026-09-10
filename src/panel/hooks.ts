import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "./api";
import type { Meta } from "./types";

export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Kanal ve rol listesi (filtreler, ID → ad/renk). Arka planda çekilir, oturum süresini uzatmaz. */
export function useMeta() {
  return useQuery({
    queryKey: ["panel", "meta"],
    queryFn: () => api<Meta>("GET", "/guild/meta", undefined, { background: true }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
