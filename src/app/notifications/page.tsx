"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";

type N = { id: string; kind: string; title: string; body: string | null; url: string | null; created_at: string; read_at: string | null };
const ICON: Record<string, string> = { release: "🚀", rumor: "🕵️", reply: "💬", system: "✦" };

export default function Notifications() {
  const { ready, session, openSignIn, refreshUnread } = useAuth();
  const [items, setItems] = useState<N[] | null>(null);
  useEffect(() => {
    if (!session) return;
    sb().from("notifications").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => setItems((data as N[]) ?? []));
  }, [session]);
  const markAll = async () => {
    await sb().from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    setItems((items ?? []).map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    refreshUnread();
  };
  const open = async (n: N) => { if (!n.read_at) { await sb().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id); refreshUnread(); } };
  if (!ready) return null;
  if (!session) return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-extrabold">Notifications</h1>
      <p className="mt-2 text-muted">Follow labs, people and release lines, and we&apos;ll tell you the moment something ships.</p>
      <button type="button" onClick={() => openSignIn()} className="mt-6 rounded-xl px-5 py-2.5 font-bold text-white" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>Sign in</button>
    </div>
  );
  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-end justify-between">
        <div><div className="kicker">Inbox</div><h1 className="text-3xl font-extrabold tracking-tight">Notifications</h1></div>
        {items?.some((n) => !n.read_at) && <button type="button" onClick={markAll} className="text-sm font-semibold text-accent hover:underline">Mark all read</button>}
      </div>
      <div className="card mt-6 divide-y divide-line">
        {items === null && <p className="p-5 text-sm text-muted">Loading…</p>}
        {items?.length === 0 && <p className="p-5 text-sm text-muted">Nothing yet. <Link href="/me/" className="font-semibold text-accent">Follow a few things</Link> and alerts land here.</p>}
        {items?.map((n) => {
          const inner = (
            <div className="flex gap-3 px-5 py-4" style={{ background: n.read_at ? undefined : "color-mix(in srgb, var(--accent) 6%, transparent)" }}>
              <span aria-hidden className="text-lg">{ICON[n.kind] ?? "•"}</span>
              <div className="min-w-0">
                <div className="font-semibold">{n.title}</div>
                {n.body && <div className="line-clamp-2 text-sm text-muted">{n.body}</div>}
                <div className="mt-1 text-xs text-faint" suppressHydrationWarning>{new Date(n.created_at).toLocaleString()}</div>
              </div>
              {!n.read_at && <span className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--accent)" }} aria-label="Unread" />}
            </div>
          );
          return n.url ? (
            n.url.startsWith("/") ? <Link key={n.id} href={n.url} onClick={() => open(n)} className="block hover:bg-chip">{inner}</Link>
              : <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" onClick={() => open(n)} className="block hover:bg-chip">{inner}</a>
          ) : <div key={n.id}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
