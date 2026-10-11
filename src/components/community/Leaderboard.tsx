"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { BadgeChips, RankChip } from "./Rank";

type Row = { username: string; points: number; founding: boolean; is_admin: boolean; streak_best: number; threads: number; replies: number; badges: string[] };

export function LeaderboardTable() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => { sb().from("leaderboard").select("*").limit(100).then(({ data }) => setRows((data as Row[]) ?? [])); }, []);
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted"><th className="px-4 py-2.5">#</th><th className="px-4 py-2.5">Member</th><th className="px-4 py-2.5 text-right">Points</th><th className="px-4 py-2.5 text-right">Threads</th><th className="px-4 py-2.5 text-right">Replies</th><th className="px-4 py-2.5 text-right">Best streak</th></tr></thead>
        <tbody>
          {rows === null && <tr><td colSpan={6} className="px-4 py-6 text-muted">Loading…</td></tr>}
          {rows?.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-muted">No members yet. The first ones in take the top spots.</td></tr>}
          {rows?.map((r, i) => (
            <tr key={r.username} className="border-b border-line last:border-b-0" style={profile?.username === r.username ? { background: "color-mix(in srgb, var(--accent) 8%, transparent)" } : undefined}>
              <td className="tabular px-4 py-2.5 font-extrabold text-faint">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</td>
              <td className="px-4 py-2.5"><span className="inline-flex flex-wrap items-center gap-1.5"><span className="font-semibold">@{r.username}</span><RankChip points={r.points} /><BadgeChips badges={r.badges} /></span></td>
              <td className="tabular px-4 py-2.5 text-right font-bold">{r.points.toLocaleString()}</td>
              <td className="tabular px-4 py-2.5 text-right text-muted">{r.threads}</td>
              <td className="tabular px-4 py-2.5 text-right text-muted">{r.replies}</td>
              <td className="tabular px-4 py-2.5 text-right text-muted">{r.streak_best}d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
