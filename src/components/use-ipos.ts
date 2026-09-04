"use client";

import { useEffect, useState } from "react";
import { IPOS, type IpoSeed } from "@/lib/data";

// Live list from Neon (via /api/ipos), seed fallback. Shared by nav search,
// compare, watchlist — so client UI tracks the same live data as server pages.
export function useIpos(): IpoSeed[] {
  const [ipos, setIpos] = useState<IpoSeed[]>(IPOS);
  useEffect(() => {
    let dead = false;
    fetch("/api/ipos", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!dead && j?.ok && Array.isArray(j.data) && j.data.length) setIpos(j.data);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, []);
  return ipos;
}
