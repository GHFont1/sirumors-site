"use client";
import { useEffect, useState } from "react";
import { ago, fmtDate } from "@/lib/format";

/** Renders a build-time relative time, then refreshes it in the browser so it never goes stale. */
export function TimeAgo({ iso, built }: { iso: string; built: number }) {
  const [now, setNow] = useState(built);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  return (
    <time dateTime={iso} title={fmtDate(iso)} suppressHydrationWarning>
      {ago(iso, now)}
    </time>
  );
}
