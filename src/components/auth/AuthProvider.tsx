"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { sb } from "@/lib/supabase";

export type Profile = { id: string; username: string | null; is_admin: boolean; email_releases: boolean; email_rumors: boolean; email_replies: boolean; points: number; streak_current: number; streak_best: number; founding: boolean };
export type FollowKind = "company" | "topic" | "person" | "line";
const key = (k: FollowKind, s: string) => `${k}:${s}`;

type Ctx = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  follows: Set<string>;
  unread: number;
  isFollowing: (k: FollowKind, s: string) => boolean;
  toggleFollow: (k: FollowKind, s: string) => Promise<void>;
  refresh: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  openSignIn: (reason?: string) => void;
  signInOpen: boolean;
  signInReason: string;
  closeSignIn: () => void;
  signOut: () => Promise<void>;
  toast: string;
};

const AuthCtx = createContext<Ctx | null>(null);
export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [unread, setUnread] = useState(0);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInReason, setSignInReason] = useState("");
  const [toast, setToast] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);

  const load = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); setFollows(new Set()); setUnread(0); return; }
    const c = sb();
    const [p, f, n] = await Promise.all([
      c.from("profiles").select("id,username,is_admin,email_releases,email_rumors,email_replies,points,streak_current,streak_best,founding").eq("id", s.user.id).maybeSingle(),
      c.from("follows").select("kind,slug"),
      c.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    setProfile((p.data as Profile) ?? null);
    setFollows(new Set((f.data ?? []).map((r) => key(r.kind as FollowKind, r.slug))));
    setUnread(n.count ?? 0);
  }, []);

  useEffect(() => {
    const c = sb();
    c.auth.getSession().then(async ({ data }) => { setSession(data.session); await load(data.session); setReady(true); });
    const { data: sub } = c.auth.onAuthStateChange((_e, s) => { setSession(s); load(s); });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  // Daily check-in: once per visit, the server decides whether today already counted.
  useEffect(() => {
    if (!session || !profile?.username || checkedIn) return;
    setCheckedIn(true);
    sb().rpc("checkin").then(({ data }) => {
      const d = data as { awarded: number; streak: number; points: number } | null;
      if (d && d.awarded > 0) {
        setProfile((p) => (p ? { ...p, points: d.points, streak_current: d.streak } : p));
        setToast(`+${d.awarded} SI Points · ${d.streak}-day streak${d.awarded > 10 ? " bonus!" : ""}`);
        setTimeout(() => setToast(""), 4500);
      }
    });
  }, [session, profile?.username, checkedIn]);

  // keep the bell fresh while the tab is open
  useEffect(() => {
    if (!session) return;
    const t = setInterval(async () => {
      const n = await sb().from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      setUnread(n.count ?? 0);
    }, 60000);
    return () => clearInterval(t);
  }, [session]);

  const value = useMemo<Ctx>(() => ({
    ready, session, profile, follows, unread,
    isFollowing: (k, s) => follows.has(key(k, s)),
    toggleFollow: async (k, s) => {
      if (!session) { setSignInReason("Sign in to follow and get notified."); setSignInOpen(true); return; }
      const c = sb();
      const on = follows.has(key(k, s));
      const next = new Set(follows);
      if (on) next.delete(key(k, s)); else next.add(key(k, s));
      setFollows(next);
      const res = on
        ? await c.from("follows").delete().eq("kind", k).eq("slug", s)
        : await c.from("follows").insert({ user_id: session.user.id, kind: k, slug: s });
      if (res.error) setFollows(follows); // roll back
    },
    refresh: () => load(session),
    refreshUnread: async () => {
      const n = await sb().from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      setUnread(n.count ?? 0);
    },
    openSignIn: (reason = "") => { setSignInReason(reason); setSignInOpen(true); },
    signInOpen, signInReason,
    closeSignIn: () => setSignInOpen(false),
    signOut: async () => { await sb().auth.signOut(); },
    toast,
  }), [ready, session, profile, follows, unread, signInOpen, signInReason, load, toast]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
