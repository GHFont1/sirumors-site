"use client";
import Link from "next/link";
import { useState } from "react";
import { sb } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect } from "react";
import { rankFor } from "@/lib/ranks";
import { BadgeChips, RankChip } from "@/components/community/Rank";

function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span><span className="block font-semibold">{label}</span><span className="text-sm text-muted">{sub}</span></span>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--accent)]" />
    </label>
  );
}

export default function Account() {
  const { ready, session, profile, follows, refresh, openSignIn, signOut } = useAuth();
  const [saved, setSaved] = useState("");
  const [ledger, setLedger] = useState<{ label: string; points: number; created_at: string }[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  useEffect(() => {
    if (!session) return;
    sb().from("points_ledger").select("label,points,created_at").order("created_at", { ascending: false }).limit(15).then(({ data }) => setLedger(data ?? []));
    sb().from("user_badges").select("badge").eq("user_id", session.user.id).then(({ data }) => setBadges((data ?? []).map((b) => b.badge)));
  }, [session]);
  if (!ready) return null;
  if (!session) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl font-extrabold">Settings</h1>
        <p className="mt-2 text-muted">Sign in to manage your follows and emails.</p>
        <button type="button" onClick={() => openSignIn()} className="mt-6 rounded-xl px-5 py-2.5 font-bold text-white" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>Sign in</button>
      </div>
    );
  }
  const set = async (k: "email_releases" | "email_rumors" | "email_replies" | "email_digest" | "email_resets", v: boolean) => {
    await sb().from("profiles").update({ [k]: v }).eq("id", session.user.id);
    await refresh(); setSaved("Saved"); setTimeout(() => setSaved(""), 1500);
  };
  return (
    <div className="mx-auto max-w-xl">
      <div className="kicker">Account</div>
      <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
      <div className="card mt-6 p-5">
        <div className="text-sm text-muted">Signed in as</div>
        <div className="font-semibold">{profile?.username ? `@${profile.username}` : "—"} · {session.user.email}</div>
        <div className="mt-3 flex gap-4 text-sm"><Link href="/me/" className="font-semibold text-accent hover:underline">My feed ({follows.size} follows)</Link><button type="button" onClick={signOut} className="font-semibold text-muted hover:text-accent">Sign out</button></div>
      </div>
      {(() => { const r = rankFor(profile?.points ?? 0); return (
        <div className="card mt-4 p-5">
          <div className="flex flex-wrap items-center gap-2"><RankChip points={profile?.points} size="md" /><BadgeChips badges={badges} size="md" /></div>
          <div className="tabular mt-3 text-3xl font-extrabold">{(profile?.points ?? 0).toLocaleString()} <span className="text-base font-semibold text-muted">SI Points</span></div>
          {r.next && (<>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-chip"><div className="h-full rounded-full" style={{ width: `${Math.round(r.progress * 100)}%`, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} /></div>
            <div className="mt-1 text-xs text-muted">{(r.next.min - (profile?.points ?? 0)).toLocaleString()} to {r.next.name}</div>
          </>)}
          <div className="mt-3 text-sm text-muted">🔥 {profile?.streak_current ?? 0}-day streak · best {profile?.streak_best ?? 0} · <Link href="/leaderboard/" className="font-semibold text-accent">Leaderboard</Link></div>
          {ledger.length > 0 && (
            <div className="mt-4 divide-y divide-line border-t border-line text-sm">
              {ledger.map((l, i) => <div key={i} className="flex justify-between py-1.5"><span className="text-muted">{l.label}</span><span className="tabular font-bold" style={{ color: "var(--accent)" }}>+{l.points}</span></div>)}
            </div>
          )}
        </div>
      ); })()}
      <h2 className="mt-8 text-lg font-extrabold">Email alerts {saved && <span className="ml-2 text-xs font-semibold" style={{ color: "var(--good)" }}>{saved}</span>}</h2>
      <div className="card mt-3 divide-y divide-line px-5">
        <Toggle on={!!profile?.email_digest} onChange={(v) => set("email_digest", v)} label="Daily digest" sub="The day's biggest AI news in one short email every morning." />
        <Toggle on={!!profile?.email_resets} onChange={(v) => set("email_resets", v)} label="Usage resets" sub="The moment ChatGPT/Codex, Claude, Gemini or Grok usage limits reset." />
        <Toggle on={!!profile?.email_releases} onChange={(v) => set("email_releases", v)} label="Releases" sub="When OpenAI, Anthropic, Google or xAI ships a model, or anything you follow ships." />
        <Toggle on={!!profile?.email_rumors} onChange={(v) => set("email_rumors", v)} label="Strong rumors" sub="When a rumor about something you follow is rated Strong or Confirmed." />
        <Toggle on={!!profile?.email_replies} onChange={(v) => set("email_replies", v)} label="Forum replies" sub="When someone replies to your thread." />
      </div>
      <p className="mt-3 text-xs text-faint">On-site notifications always appear under the bell. Every email has a one-click unsubscribe link.</p>
    </div>
  );
}
