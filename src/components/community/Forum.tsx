"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sb } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { RankChip } from "./Rank";

export type Category = { slug: string; name: string; blurb: string; icon?: string; company?: string };
type Thread = { id: string; category: string; title: string; excerpt: string; kind: string; link_url: string | null; reply_count: number; score: number; pinned: boolean; locked: boolean; created_at: string; last_activity_at: string; author: string | null; author_admin: boolean; author_points?: number | null; author_founding?: boolean };
type FullThread = Thread & { body: string; author_id: string | null };
type Reply = { id: string; thread_id: string; body: string; created_at: string; author_id: string | null; author: string | null; author_admin: boolean; author_points?: number | null; author_founding?: boolean };

const btn = "rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
const grad = { background: "linear-gradient(90deg, var(--accent), var(--accent-2))" };
const field = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-accent";

function ago(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Plain text with line breaks. Links to our own pages work; outside addresses show as text so readers stay on the site. */
function Body({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/sirumors\.com\/[^\s<]*)/g);
  return (
    <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
      {parts.map((p, i) => (p.startsWith("https://sirumors.com/")
        ? <Link key={i} href={p.slice("https://sirumors.com".length)} className="text-accent hover:underline">{p}</Link>
        : <span key={i}>{p}</span>))}
    </div>
  );
}

function Author({ name, admin, system, points, founding }: { name: string | null; admin?: boolean; system?: boolean; points?: number | null; founding?: boolean }) {
  if (system || !name) return <span className="inline-flex items-center gap-1 font-semibold">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/icon.svg" alt="" width={14} height={14} /> SI Rumors</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      <span className="font-semibold">@{name}</span>
      <RankChip points={points} />
      {founding && <span title="Founding Member: one of the first 1,000 accounts" className="text-[11px]" style={{ color: "var(--accent)" }}>✦</span>}
      {admin && <span className="rounded px-1 text-[10px] font-bold text-white" style={grad}>MOD</span>}
    </span>
  );
}

function ThreadRow({ t, cats }: { t: Thread; cats?: Category[] }) {
  const cat = cats?.find((c) => c.slug === t.category);
  return (
    <Link href={`/forums/thread/?id=${t.id}`} className="flex gap-4 px-4 py-3.5 hover:bg-chip">
      <div className="tabular flex w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-chip py-1 text-xs text-muted">
        <span aria-hidden>▲</span><span className="font-bold text-text">{t.score}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold leading-snug">
          {t.pinned && <span className="mr-1.5 text-xs" style={{ color: "var(--accent)" }}>📌</span>}
          {t.kind === "release" && <span className="mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={grad}>RELEASE</span>}
          {t.title}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
          {cat && <span>{cat.name}</span>}
          <span>by <Author name={t.author} admin={t.author_admin} system={t.kind !== "user"} points={t.author_points} founding={t.author_founding} /></span>
          <span suppressHydrationWarning>· active {ago(t.last_activity_at)}</span>
        </div>
      </div>
      <div className="tabular shrink-0 self-center text-right text-xs text-muted"><span className="block text-base font-bold text-text">{t.reply_count}</span>replies</div>
    </Link>
  );
}

export function ForumHome({ cats }: { cats: Category[] }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const c = sb();
    c.from("thread_list").select("*").order("last_activity_at", { ascending: false }).limit(25).then(({ data }) => setThreads((data as Thread[]) ?? []));
    c.from("thread_list").select("category").limit(5000).then(({ data }) => {
      const m: Record<string, number> = {};
      for (const r of data ?? []) m[r.category] = (m[r.category] ?? 0) + 1;
      setCounts(m);
    });
  }, []);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Community</div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Forums</h1>
          <p className="mt-1 max-w-2xl text-muted">Talk releases, rumors and the road to superintelligence. Every new launch gets its own thread automatically.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/leaderboard/" className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-bold hover:border-accent">🏆 Leaderboard</Link>
          <NewThreadButton />
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-3 text-lg font-extrabold">Latest activity</h2>
          <div className="card divide-y divide-line">
            {threads === null && <p className="p-5 text-sm text-muted">Loading…</p>}
            {threads?.length === 0 && <p className="p-5 text-sm text-muted">No threads yet. Start the first one.</p>}
            {threads?.map((t) => <ThreadRow key={t.id} t={t} cats={cats} />)}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-extrabold">Categories</h2>
          <div className="card divide-y divide-line">
            {cats.map((c) => (
              <Link key={c.slug} href={`/forums/c/${c.slug}/`} className="flex items-center gap-3 px-4 py-3 hover:bg-chip">
                {c.company ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={`/logos/${c.company}.png`} alt="" width={26} height={26} className="rounded-md bg-white" />) : <span aria-hidden className="flex h-[26px] w-[26px] items-center justify-center text-lg">{c.icon}</span>}
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{c.name}</span><span className="block truncate text-xs text-muted">{c.blurb}</span></span>
                <span className="tabular text-xs text-muted">{counts[c.slug] ?? 0}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewThreadButton({ category }: { category?: string }) {
  const { session, openSignIn } = useAuth();
  const router = useRouter();
  return (
    <button type="button" className={btn} style={grad} onClick={() => (session ? router.push(`/forums/new/${category ? `?c=${category}` : ""}`) : openSignIn("Sign in to start a thread."))}>
      + New thread
    </button>
  );
}

export function CategoryView({ cat, cats }: { cat: Category; cats: Category[] }) {
  const [sort, setSort] = useState<"active" | "top" | "new">("active");
  const [threads, setThreads] = useState<Thread[] | null>(null);
  useEffect(() => {
    setThreads(null);
    const col = sort === "top" ? "score" : sort === "new" ? "created_at" : "last_activity_at";
    sb().from("thread_list").select("*").eq("category", cat.slug).order("pinned", { ascending: false }).order(col, { ascending: false }).limit(100)
      .then(({ data }) => setThreads((data as Thread[]) ?? []));
  }, [cat.slug, sort]);
  return (
    <div>
      <Link href="/forums/" className="text-sm font-semibold text-muted hover:text-accent">← Forums</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{cat.icon ? `${cat.icon} ` : ""}{cat.name}</h1>
          <p className="mt-1 text-muted">{cat.blurb}</p>
        </div>
        <NewThreadButton category={cat.slug} />
      </div>
      <div className="mt-6 flex gap-1">
        {(["active", "top", "new"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setSort(s)} className="rounded-lg px-3 py-1.5 text-sm font-semibold capitalize" style={{ background: sort === s ? "var(--chip)" : "transparent", color: sort === s ? "var(--text)" : "var(--muted)" }}>{s}</button>
        ))}
      </div>
      <div className="card mt-3 divide-y divide-line">
        {threads === null && <p className="p-5 text-sm text-muted">Loading…</p>}
        {threads?.length === 0 && <p className="p-5 text-sm text-muted">No threads here yet. Be the first.</p>}
        {threads?.map((t) => <ThreadRow key={t.id} t={t} cats={cats} />)}
      </div>
    </div>
  );
}

export function ThreadView({ cats }: { cats: Category[] }) {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { session, profile, openSignIn } = useAuth();
  const [t, setT] = useState<FullThread | null | undefined>(undefined);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [voted, setVoted] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!/^[0-9a-f-]{36}$/.test(id)) { setT(null); return; }
    const c = sb();
    const [th, list, rs] = await Promise.all([
      c.from("forum_threads").select("id,category,title,body,kind,link_url,reply_count,score,pinned,locked,created_at,last_activity_at,author_id").eq("id", id).maybeSingle(),
      c.from("thread_list").select("author,author_admin,author_points,author_founding").eq("id", id).maybeSingle(),
      c.from("reply_list").select("*").eq("thread_id", id).order("created_at").limit(500),
    ]);
    setT(th.data ? ({ ...th.data, excerpt: "", author: list.data?.author ?? null, author_admin: !!list.data?.author_admin, author_points: list.data?.author_points ?? 0, author_founding: !!list.data?.author_founding } as FullThread) : null);
    setReplies((rs.data as Reply[]) ?? []);
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!session || !id) return;
    sb().from("thread_votes").select("thread_id").eq("thread_id", id).maybeSingle().then(({ data }) => setVoted(!!data));
  }, [session, id]);

  const vote = async () => {
    if (!session) { openSignIn("Sign in to upvote."); return; }
    if (!t) return;
    const c = sb();
    if (voted) { await c.from("thread_votes").delete().eq("thread_id", t.id); setVoted(false); setT({ ...t, score: Math.max(0, t.score - 1) }); }
    else { const { error } = await c.from("thread_votes").insert({ user_id: session.user.id, thread_id: t.id }); if (!error) { setVoted(true); setT({ ...t, score: t.score + 1 }); } }
  };
  const reply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) { openSignIn("Sign in to reply."); return; }
    if (!text.trim()) return;
    setBusy(true); setErr("");
    const { error } = await sb().from("forum_replies").insert({ thread_id: id, body: text.trim(), author_id: session.user.id });
    setBusy(false);
    if (error) setErr(error.message); else { setText(""); load(); }
  };
  const remove = async (table: "forum_threads" | "forum_replies", rid: string) => {
    if (!window.confirm("Delete this post?")) return;
    await sb().from(table).update({ deleted: true }).eq("id", rid);
    if (table === "forum_threads") window.location.href = "/forums/"; else load();
  };
  const lock = async () => { if (!t) return; await sb().from("forum_threads").update({ locked: !t.locked }).eq("id", t.id); load(); };

  if (t === undefined) return <p className="py-10 text-muted">Loading…</p>;
  if (t === null) return <div className="py-20 text-center"><h1 className="text-2xl font-extrabold">Thread not found</h1><Link href="/forums/" className="mt-4 inline-block font-semibold text-accent">Back to forums →</Link></div>;
  const cat = cats.find((c) => c.slug === t.category);
  const mine = session?.user.id === t.author_id;
  const admin = !!profile?.is_admin;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-sm"><Link href="/forums/" className="font-semibold text-muted hover:text-accent">Forums</Link>{cat && <> <span className="text-faint">/</span> <Link href={`/forums/c/${cat.slug}/`} className="font-semibold text-muted hover:text-accent">{cat.name}</Link></>}</div>
      <article className="card mt-3 p-5">
        <div className="flex gap-4">
          <button type="button" onClick={vote} aria-pressed={voted} aria-label="Upvote" className="tabular flex h-fit w-11 shrink-0 flex-col items-center rounded-lg py-1.5 text-sm font-bold" style={{ background: voted ? "color-mix(in srgb, var(--accent) 16%, var(--surface))" : "var(--chip)", color: voted ? "var(--accent)" : "var(--muted)" }}>
            <span aria-hidden>▲</span><span className="text-text">{t.score}</span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight">{t.locked && "🔒 "}{t.title}</h1>
            <div className="mt-1 text-xs text-muted">by <Author name={t.author} admin={t.author_admin} system={t.kind !== "user"} points={t.author_points} founding={t.author_founding} /> · <span suppressHydrationWarning>{ago(t.created_at)}</span></div>
            {t.link_url?.startsWith("/") && <Link href={t.link_url} className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">Read the story on SI Rumors →</Link>}
            <div className="mt-4"><Body text={t.body} /></div>
            {(mine || admin) && (
              <div className="mt-4 flex gap-4 text-xs font-semibold text-muted">
                <button type="button" onClick={() => remove("forum_threads", t.id)} className="hover:text-accent">Delete</button>
                {admin && <button type="button" onClick={lock} className="hover:text-accent">{t.locked ? "Unlock" : "Lock"}</button>}
              </div>
            )}
          </div>
        </div>
      </article>
      <h2 className="mt-8 text-lg font-extrabold">{replies.length} {replies.length === 1 ? "reply" : "replies"}</h2>
      <div className="mt-3 space-y-3">
        {replies.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="text-xs text-muted"><Author name={r.author} admin={r.author_admin} points={r.author_points} founding={r.author_founding} /> · <span suppressHydrationWarning>{ago(r.created_at)}</span>
              {(session?.user.id === r.author_id || admin) && <button type="button" onClick={() => remove("forum_replies", r.id)} className="ml-3 font-semibold hover:text-accent">Delete</button>}
            </div>
            <div className="mt-2"><Body text={r.body} /></div>
          </div>
        ))}
      </div>
      {t.locked ? (
        <p className="mt-6 text-sm text-muted">This thread is locked.</p>
      ) : (
        <form onSubmit={reply} className="card mt-6 p-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} onFocus={() => !session && openSignIn("Sign in to reply.")} rows={4} maxLength={5000} placeholder={session ? "Add your take…" : "Sign in to reply"} aria-label="Reply" className={field} />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-faint">Be civil. Source your rumors.</span>
            <button disabled={busy || !text.trim()} className={btn} style={grad}>{busy ? "Posting…" : "Reply"}</button>
          </div>
          {err && <p className="mt-2 text-sm" style={{ color: "var(--bad)" }}>{err}</p>}
        </form>
      )}
    </div>
  );
}

export function NewThread({ cats }: { cats: Category[] }) {
  const params = useSearchParams();
  const { ready, session, openSignIn } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState(params.get("c") && cats.some((c) => c.slug === params.get("c") && c.slug !== "release-watch") ? params.get("c")! : "general");
  const [title, setTitle] = useState(params.get("title") ?? "");
  const [link, setLink] = useState(params.get("link") ?? "");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!ready) return null;
  if (!session) return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-extrabold">Start a thread</h1>
      <p className="mt-2 text-muted">Sign in to post.</p>
      <button type="button" onClick={() => openSignIn("Sign in to start a thread.")} className={`${btn} mt-6`} style={grad}>Sign in</button>
    </div>
  );
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (title.trim().length < 5) { setErr("Give it a title of at least 5 characters."); return; }
    if (link && !/^https?:\/\//.test(link)) { setErr("Links must start with http:// or https://"); return; }
    setBusy(true);
    const { data, error } = await sb().from("forum_threads").insert({ category, title: title.trim(), body: body.trim() || title.trim(), link_url: link.trim() || null, author_id: session.user.id }).select("id").single();
    setBusy(false);
    if (error) setErr(error.message); else router.push(`/forums/thread/?id=${data.id}`);
  };
  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl">
      <Link href="/forums/" className="text-sm font-semibold text-muted hover:text-accent">← Forums</Link>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Start a thread</h1>
      <div className="card mt-6 space-y-4 p-5">
        <label className="block text-sm font-semibold">Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${field} mt-1.5`}>
            {cats.filter((c) => c.slug !== "release-watch").map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="What's the news, rumor or question?" className={`${field} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold">Link <span className="font-normal text-muted">(optional)</span>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={`${field} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold">Post
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} maxLength={10000} placeholder="Add context, sources, your take…" className={`${field} mt-1.5`} />
        </label>
        <div className="flex items-center justify-between">
          <span className="text-xs text-faint">Rumors: include where you heard it.</span>
          <button disabled={busy} className={btn} style={grad}>{busy ? "Posting…" : "Post thread"}</button>
        </div>
        {err && <p className="text-sm" style={{ color: "var(--bad)" }}>{err}</p>}
      </div>
    </form>
  );
}
