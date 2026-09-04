import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function inr(croreOrRupees: number | null | undefined, opts: { crore?: boolean } = {}) {
  if (croreOrRupees == null || Number.isNaN(croreOrRupees)) return "—";
  if (opts.crore) return `₹${croreOrRupees.toLocaleString("en-IN")} Cr`;
  return `₹${croreOrRupees.toLocaleString("en-IN")}`;
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function daysLeft(close?: string | Date | null) {
  if (!close) return null;
  const ms = new Date(close).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}
