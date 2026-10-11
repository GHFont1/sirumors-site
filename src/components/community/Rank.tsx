"use client";
import { BADGES, rankFor } from "@/lib/ranks";

export function RankChip({ points, size = "sm" }: { points: number | null | undefined; size?: "sm" | "md" }) {
  const { rank } = rankFor(points ?? 0);
  return (
    <span
      title={`${rank.name}: ${rank.flavor} (${(points ?? 0).toLocaleString()} SI Points)`}
      className={`inline-flex items-center rounded-full border font-bold ${size === "sm" ? "px-1.5 text-[10px] leading-4" : "px-2.5 py-0.5 text-xs"}`}
      style={{ color: rank.color, borderColor: `color-mix(in srgb, ${rank.color} 45%, transparent)`, background: `color-mix(in srgb, ${rank.color} 12%, transparent)`, boxShadow: rank.glow ? `0 0 10px color-mix(in srgb, ${rank.color} 50%, transparent)` : undefined }}
    >
      {rank.name}
    </span>
  );
}

export function BadgeChips({ badges, size = "sm" }: { badges: string[]; size?: "sm" | "md" }) {
  return (
    <>
      {badges.filter((b) => BADGES[b]).map((b) => (
        <span key={b} title={`${BADGES[b].label}: ${BADGES[b].desc}`} className={`inline-flex items-center gap-1 rounded-full bg-chip font-semibold text-muted ${size === "sm" ? "px-1.5 text-[10px] leading-4" : "px-2.5 py-0.5 text-xs"}`}>
          <span aria-hidden>{BADGES[b].icon}</span>{size === "md" && BADGES[b].label}
        </span>
      ))}
    </>
  );
}
