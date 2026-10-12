"use client";
import { useState } from "react";
import { sb } from "@/lib/supabase";

/** "Get the daily digest" box: email only, confirmed by a link we send. */
export function DigestSignup({ source, compact }: { source: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "bad">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setState("bad"); return; }
    setState("busy");
    const { data, error } = await sb().rpc("subscribe_digest", { p_email: email, p_source: source });
    setState(!error && data ? "done" : "bad");
  };
  return (
    <section className={compact ? "" : "card p-4"}>
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Daily digest</div>
      <p className="mt-1 text-sm text-muted">The day&apos;s biggest AI news in one short email, every morning. Plus an instant heads-up when a reset or a big release lands.</p>
      {state === "done" ? (
        <p className="mt-3 text-sm font-semibold" style={{ color: "var(--good)" }}>Check your inbox and tap the link to confirm.</p>
      ) : (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setState("idle"); }} placeholder="you@example.com" aria-label="Email address"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
          <button type="submit" disabled={state === "busy"} className="shrink-0 rounded-lg px-3.5 py-2 text-sm font-bold text-white disabled:opacity-60" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>
            {state === "busy" ? "…" : "Subscribe"}
          </button>
        </form>
      )}
      {state === "bad" && <p className="mt-2 text-xs" style={{ color: "var(--bad, #ef4444)" }}>That email didn&apos;t work. Check it and try again.</p>}
    </section>
  );
}
