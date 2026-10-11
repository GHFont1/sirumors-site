import { existsSync } from "node:fs";
import { join } from "node:path";

const has = (slug: string) => existsSync(join(process.cwd(), "public/logos", `${slug}.png`));

const HUES = ["#5b3df5", "#0d9488", "#b4459a", "#2563eb", "#c2410c", "#0f766e", "#7c3aed", "#be123c"];
const hueFor = (s: string) => HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];

/** A small square logo: the company/source icon when we have it, otherwise a monogram. */
export function Logo({ slug, name, size = 20, round = false }: { slug?: string; name: string; size?: number; round?: boolean }) {
  const radius = round ? "50%" : Math.max(4, Math.round(size / 4.5));
  if (slug && has(slug)) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden bg-white"
        style={{ width: size, height: size, borderRadius: radius, border: "1px solid var(--line)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/logos/${slug}.png`} alt="" width={size} height={size} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </span>
    );
  }
  const letters = name.replace(/^(the|r\/)\s*/i, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center font-bold text-white"
      style={{ width: size, height: size, borderRadius: radius, background: hueFor(name), fontSize: Math.max(8, Math.round(size * 0.42)) }}
    >
      {letters}
    </span>
  );
}

/** Logo slug for a story's source. Feed ids map straight to downloaded icons. */
export function sourceLogo(sourceId: string, source: string) {
  if (sourceId.startsWith("r-")) return sourceId;
  if (sourceId === "hn") return undefined;
  if (sourceId.startsWith("gn-")) return undefined;
  return sourceId || source;
}

export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icon.svg" alt="" width={size} height={size} style={{ width: size, height: size }} />
  );
}
