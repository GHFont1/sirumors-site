"use client";
import { useState } from "react";

const PILLS = [
  { k: "all", label: "All" },
  { k: "release", label: "Releases" },
  { k: "rumor", label: "Rumors" },
  { k: "breaking", label: "Breaking" },
  { k: "reset", label: "Resets" },
  { k: "official", label: "From the labs" },
  { k: "update", label: "Tool updates" },
];

/** Type pills over a server-rendered stream; hides cards by CSS so nothing re-renders. */
export function UpdateFilter({ counts, children }: { counts: Record<string, number>; children: React.ReactNode }) {
  const [k, setK] = useState("all");
  return (
    <div className="ustream">
      {k !== "all" && (
        <style>{`.ustream [data-kind]:not([data-kind="${k}"]){display:none}.ustream .uday:not(:has([data-kind="${k}"])){display:none}`}</style>
      )}
      <div className="no-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1">
        {PILLS.filter((p) => p.k === "all" || counts[p.k]).map((p) => (
          <button key={p.k} type="button" onClick={() => setK(p.k)} aria-pressed={k === p.k}
            className="shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors"
            style={k === p.k
              ? { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, var(--surface))", color: "var(--text)" }
              : { borderColor: "var(--line)", background: "var(--surface)", color: "var(--muted)" }}>
            {p.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
