"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { sb } from "@/lib/supabase";

// Page-view counter: path, referring site and device type only. No cookies, no IPs, no ids.
// A session flag (sessionStorage) marks the first page of a visit.
export function Track() {
  const path = usePathname();
  useEffect(() => {
    if (typeof window === "undefined" || location.hostname !== "sirumors.com") return;
    if (navigator.webdriver || /bot|crawl|spider|slurp|headless|preview|lighthouse/i.test(navigator.userAgent)) return;
    let first = false;
    try { first = !sessionStorage.getItem("sir_v"); sessionStorage.setItem("sir_v", "1"); } catch {}
    let ref: string | null = null;
    try { const h = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; ref = first && h && h !== "sirumors.com" ? h : null; } catch {}
    const device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop";
    sb().rpc("track_view", { p_path: path, p_ref: ref, p_new: first, p_device: device }).then(() => {}, () => {});
  }, [path]);
  return null;
}
