"use client";
import Link from "next/link";
import { useState } from "react";
import { sb } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";

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
  const set = async (k: "email_releases" | "email_rumors" | "email_replies", v: boolean) => {
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
      <h2 className="mt-8 text-lg font-extrabold">Email alerts {saved && <span className="ml-2 text-xs font-semibold" style={{ color: "var(--good)" }}>{saved}</span>}</h2>
      <div className="card mt-3 divide-y divide-line px-5">
        <Toggle on={!!profile?.email_releases} onChange={(v) => set("email_releases", v)} label="Releases" sub="When a company or release line you follow ships something new." />
        <Toggle on={!!profile?.email_rumors} onChange={(v) => set("email_rumors", v)} label="Strong rumors" sub="When a rumor about something you follow is rated Strong or Confirmed." />
        <Toggle on={!!profile?.email_replies} onChange={(v) => set("email_replies", v)} label="Forum replies" sub="When someone replies to your thread." />
      </div>
      <p className="mt-3 text-xs text-faint">On-site notifications always appear under the bell. Every email has a one-click unsubscribe link.</p>
    </div>
  );
}
