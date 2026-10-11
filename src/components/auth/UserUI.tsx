"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sb } from "@/lib/supabase";
import { useAuth, type FollowKind } from "./AuthProvider";
import { RankChip } from "@/components/community/Rank";

const field = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-accent";
const primary = "w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50";
const gradient = { background: "linear-gradient(90deg, var(--accent), var(--accent-2))" };

function Modal({ onClose, children, label }: { onClose?: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal aria-label={label} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

/** Email sign-in: one email field, then a magic link or a code. New emails create an account. */
export function SignInModal() {
  const { signInOpen, closeSignIn, signInReason } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (!signInOpen) { setStep("email"); setCode(""); setErr(""); } }, [signInOpen]);
  if (!signInOpen) return null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    const next = window.location.pathname + window.location.search;
    const { error } = await sb().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/?next=${encodeURIComponent(next)}`, shouldCreateUser: true } });
    setBusy(false);
    if (error) setErr(error.message.includes("rate") ? "Too many attempts. Try again in a few minutes." : error.message);
    else setStep("sent");
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await sb().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setErr("That code didn't work. Check the latest email, or use the link in it."); else closeSignIn();
  };

  return (
    <Modal onClose={closeSignIn} label="Sign in">
      <div className="flex items-center gap-2 text-lg font-extrabold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" width={26} height={26} /> Sign in to SI Rumors
      </div>
      <p className="mt-1 text-sm text-muted">{signInReason || "Follow labs and people, get release alerts, and join the forums."} New here? The same step creates your account.</p>
      {step === "email" ? (
        <form onSubmit={send} className="mt-5 space-y-3">
          <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email" className={field} />
          <button disabled={busy} className={primary} style={gradient}>{busy ? "Sending…" : "Email me a sign-in link"}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-5 space-y-3">
          <p className="rounded-xl bg-chip p-3 text-sm">We sent an email to <span className="font-semibold">{email}</span>. Tap the link in it, or enter the code from the email here.</p>
          <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Code" aria-label="Code" className={`${field} tabular tracking-[0.3em]`} />
          <button disabled={busy || code.length < 6} className={primary} style={gradient}>{busy ? "Checking…" : "Sign in"}</button>
          <button type="button" onClick={() => setStep("email")} className="w-full text-xs font-semibold text-muted hover:text-accent">Use a different email</button>
        </form>
      )}
      {err && <p className="mt-3 text-sm" style={{ color: "var(--bad)" }}>{err}</p>}
    </Modal>
  );
}

/** After first sign-in, pick a public username. */
export function UsernamePrompt() {
  const { session, profile, refresh } = useAuth();
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (!session || !profile || profile.username) return null;
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) { setErr("3 to 20 letters, numbers or underscores."); return; }
    setBusy(true);
    const { data: taken } = await sb().rpc("username_taken", { name });
    if (taken) { setBusy(false); setErr("That username is taken."); return; }
    const { error } = await sb().from("profiles").update({ username: name }).eq("id", session.user.id);
    setBusy(false);
    if (error) setErr(error.message.includes("duplicate") ? "That username is taken." : error.message); else refresh();
  };
  return (
    <Modal label="Choose a username">
      <div className="text-lg font-extrabold">Pick your username</div>
      <p className="mt-1 text-sm text-muted">It shows on your forum posts. You can&apos;t change it later, so make it count.</p>
      <form onSubmit={save} className="mt-5 space-y-3">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="username" aria-label="Username" className={field} />
        <button disabled={busy} className={primary} style={gradient}>{busy ? "Saving…" : "Continue"}</button>
      </form>
      {err && <p className="mt-3 text-sm" style={{ color: "var(--bad)" }}>{err}</p>}
    </Modal>
  );
}

/** Header controls: sign-in button, or the bell and account menu. */
export function UserMenu() {
  const { ready, session, profile, unread, openSignIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", c);
    return () => document.removeEventListener("mousedown", c);
  }, []);
  if (!ready) return <div className="h-8 w-20" />;
  if (!session) {
    return (
      <button type="button" onClick={() => openSignIn()} className="rounded-lg px-3 py-1.5 text-sm font-bold text-white" style={gradient}>
        Sign in
      </button>
    );
  }
  const initial = (profile?.username ?? session.user.email ?? "?")[0].toUpperCase();
  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      <Link href="/notifications/" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-chip">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {unread > 0 && <span className="tabular absolute -right-0.5 -top-0.5 rounded-full px-1 text-[10px] font-bold leading-4 text-white" style={{ background: "var(--bad)" }}>{unread > 99 ? "99+" : unread}</span>}
      </Link>
      <button type="button" onClick={() => setOpen(!open)} aria-label="Account menu" className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white" style={gradient}>{initial}</button>
      {open && (
        <div className="card absolute right-0 top-10 z-40 w-52 p-1.5 text-sm">
          <div className="px-3 py-2">
            <div className="truncate text-xs text-muted">{profile?.username ? `@${profile.username}` : session.user.email}</div>
            <div className="mt-1 flex items-center gap-2"><RankChip points={profile?.points} size="md" /><span className="tabular text-xs font-semibold">{(profile?.points ?? 0).toLocaleString()} pts</span></div>
          </div>
          {[["/me/", "My feed"], ["/notifications/", "Notifications"], ["/forums/", "Forums"], ["/leaderboard/", "Leaderboard"], ["/account/", "Profile & settings"]].map(([h, l]) => (
            <Link key={h} href={h} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 font-semibold hover:bg-chip">{l}</Link>
          ))}
          <button type="button" onClick={() => { setOpen(false); signOut(); }} className="block w-full rounded-lg px-3 py-2 text-left font-semibold text-muted hover:bg-chip">Sign out</button>
        </div>
      )}
    </div>
  );
}

/** Star toggle that follows a company, topic, person or release line. */
export function FollowButton({ kind, slug, label, size = "md" }: { kind: FollowKind; slug: string; label: string; size?: "sm" | "md" }) {
  const { isFollowing, toggleFollow } = useAuth();
  const on = isFollowing(kind, slug);
  return (
    <button
      type="button"
      onClick={() => toggleFollow(kind, slug)}
      aria-pressed={on}
      aria-label={on ? `Unfollow ${label}` : `Follow ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"}`}
      style={on ? { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 14%, var(--surface))", color: "var(--text)" } : { borderColor: "var(--line)", background: "var(--surface)", color: "var(--muted)" }}
    >
      <span aria-hidden>{on ? "★" : "☆"}</span> {on ? "Following" : "Follow"}
    </button>
  );
}

/** Small bottom toast for points earned. */
export function PointsToast() {
  const { toast } = useAuth();
  if (!toast) return null;
  return (
    <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-lg" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>
      ✦ {toast}
    </div>
  );
}
