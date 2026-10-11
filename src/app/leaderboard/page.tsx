import type { Metadata } from "next";
import { BADGES, EARN, RANKS } from "@/lib/ranks";
import { Section } from "@/components/Blocks";
import { LeaderboardTable } from "@/components/community/Leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard: SI Points and Ranks",
  description: "The most active members of the SI Rumors community, ranked by SI Points. Earn points by posting, replying, getting upvoted and checking in daily.",
  alternates: { canonical: "/leaderboard/" },
};

export default function LeaderboardPage() {
  return (
    <>
      <div className="kicker">Community</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Leaderboard</h1>
      <p className="mt-1 max-w-2xl text-muted">SI Points measure what you add: threads people reply to, takes people upvote, and showing up every day. Climb from Lurker to Singularity.</p>
      <div className="mt-6"><LeaderboardTable /></div>
      <div className="grid gap-x-8 lg:grid-cols-2">
        <Section title="Ranks" kicker="Lurker to Singularity">
          <div className="card divide-y divide-line">
            {RANKS.map((r) => (
              <div key={r.name} className="flex items-center gap-3 px-4 py-3">
                <span className="inline-flex w-24 justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold" style={{ color: r.color, borderColor: `color-mix(in srgb, ${r.color} 45%, transparent)`, background: `color-mix(in srgb, ${r.color} 12%, transparent)` }}>{r.name}</span>
                <span className="flex-1 text-sm text-muted">{r.flavor}</span>
                <span className="tabular text-sm font-bold">{r.min.toLocaleString()}+</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="How to earn" kicker="SI Points">
          <div className="card divide-y divide-line">
            {EARN.map((e) => (
              <div key={e.label} className="flex items-center gap-3 px-4 py-3">
                <span className="flex-1 text-sm font-semibold">{e.label}<span className="block text-xs font-normal text-muted">{e.repeat}</span></span>
                <span className="tabular font-extrabold" style={{ color: "var(--accent)" }}>+{e.pts}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-faint">Points are awarded by the server, never your browser. Deleted posts and removed upvotes take their points back.</p>
        </Section>
      </div>
      <Section title="Badges" kicker="Earned, not bought (mostly)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(BADGES).map(([k, b]) => (
            <div key={k} className="card p-4"><div className="text-lg">{b.icon}</div><div className="mt-1 font-bold">{b.label}{b.soon && <span className="chip ml-2" style={{ padding: "0 8px" }}>Coming soon</span>}</div><div className="text-sm text-muted">{b.desc}</div></div>
          ))}
        </div>
      </Section>
    </>
  );
}
