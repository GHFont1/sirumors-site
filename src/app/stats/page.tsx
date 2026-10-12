"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";

type Summary = {
  daily: { day: string; views: number; visits: number }[];
  pages: { path: string; views: number }[];
  refs: { ref: string; visits: number }[];
  devices: { device: string; visits: number }[];
  today: { views: number; visits: number };
  subscribers: number;
  accounts: number;
};

// Private traffic page for the site admin (Benny). Data: page_views via traffic_summary().
export default function Stats() {
  const { session, openSignIn } = useAuth();
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Summary | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!session) return;
    sb().rpc("traffic_summary", { days }).then(({ data, error }) => { if (error) setErr(error.message); else { setErr(""); setS(data as Summary); } });
  }, [session, days]);
  if (!session) return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-extrabold">Traffic</h1>
      <p className="mt-2 text-muted">Sign in with the admin account to see traffic.</p>
      <button type="button" onClick={() => openSignIn()} className="mt-6 rounded-xl px-5 py-2.5 font-bold text-white" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>Sign in</button>
    </div>
  );
  if (err) return <p className="py-20 text-center text-muted">{err === "not allowed" ? "This page is for the site admin." : err}</p>;
  if (!s) return <p className="py-20 text-center text-muted">Loading…</p>;
  const total = s.daily.reduce((a, d) => ({ views: a.views + d.views, visits: a.visits + d.visits }), { views: 0, visits: 0 });
  const max = Math.max(1, ...s.daily.map((d) => d.views));
  const Tile = ({ k, v }: { k: string; v: number }) => (
    <div className="card p-4"><div className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</div><div className="tabular mt-1 text-2xl font-extrabold">{v.toLocaleString("en-US")}</div></div>
  );
  const List = ({ title, rows }: { title: string; rows: [string, number][] }) => (
    <section className="card p-4">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">{title}</div>
      {rows.length ? <ol className="divide-y divide-line text-sm">{rows.map(([a, b]) => <li key={a} className="flex justify-between gap-3 py-1.5"><span className="min-w-0 truncate">{a}</span><span className="tabular shrink-0 font-semibold">{b.toLocaleString("en-US")}</span></li>)}</ol> : <p className="text-sm text-muted">Nothing yet.</p>}
    </section>
  );
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div><div className="kicker">Private</div><h1 className="text-3xl font-extrabold tracking-tight">Traffic</h1></div>
        <div className="flex gap-1">{[7, 30, 90].map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={`chip ${d === days ? "border-accent text-accent" : ""}`}>{d}d</button>)}</div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile k="Visits today" v={s.today.visits} /><Tile k="Views today" v={s.today.views} />
        <Tile k={`Visits ${days}d`} v={total.visits} /><Tile k={`Views ${days}d`} v={total.views} />
        <Tile k="Digest subscribers" v={s.subscribers} /><Tile k="Accounts" v={s.accounts} />
      </div>
      <section className="card mt-4 p-4">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Page views per day</div>
        <div className="flex h-40 items-end gap-1">
          {s.daily.map((d) => (
            <div key={d.day} className="group relative flex-1" title={`${d.day}: ${d.views} views, ${d.visits} visits`}>
              <div className="w-full rounded-t-[4px]" style={{ height: `${(d.views / max) * 150}px`, background: "var(--accent)" }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-faint"><span>{s.daily[0]?.day}</span><span>{s.daily.at(-1)?.day}</span></div>
      </section>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <List title="Top pages" rows={s.pages.map((p) => [p.path, p.views])} />
        <List title="Where visits come from" rows={s.refs.map((r) => [r.ref, r.visits])} />
        <List title="Devices" rows={s.devices.map((d) => [d.device, d.visits])} />
      </div>
    </div>
  );
}
