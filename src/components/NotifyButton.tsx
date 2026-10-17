"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

// Push alerts for resets. The public key pairs with VAPID_PRIVATE_KEY used by scripts/reset-push.mjs.
const VAPID_PUBLIC = "BBQzd9dEHGIE55eRYPtW2kZASxU7zcS7tU9swYqN_Fr_AfD0HJb098FL6CGgZ7wbv_xAiOAqpmbaDh886C04YYg";
const TOPICS_KEY = "sir-push-topics";

type State = "loading" | "unsupported" | "ios-home" | "off" | "on" | "blocked" | "working" | "error";

const key = (s: string) => {
  const b = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
const readTopics = (): string[] => { try { return JSON.parse(localStorage.getItem(TOPICS_KEY) || "[]"); } catch { return []; } };
const writeTopics = (t: string[]) => { try { localStorage.setItem(TOPICS_KEY, JSON.stringify(t)); } catch {} };

async function save(sub: PushSubscription, topics: string[]) {
  const j = sub.toJSON();
  const { data, error } = await sb().rpc("push_subscribe", { p_endpoint: j.endpoint, p_p256dh: j.keys?.p256dh, p_auth: j.keys?.auth, p_topics: topics, p_ua: navigator.userAgent.slice(0, 300) });
  if (error || data !== true) throw new Error(error?.message || "not saved");
}

/** "Alert me when Codex resets": one tap turns on push for this topic in this browser. */
export function NotifyButton({ topic = "codex", name = "Codex" }: { topic?: "codex" | "claude"; name?: string }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setState(ios && !standalone ? "ios-home" : "unsupported"); return; }
    if (Notification.permission === "denied") { setState("blocked"); return; }
    navigator.serviceWorker.getRegistration("/").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setState(sub && readTopics().includes(topic) ? "on" : "off");
    }).catch(() => setState("off"));
  }, [topic]);

  async function turnOn() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      if ((await Notification.requestPermission()) !== "granted") { setState("blocked"); return; }
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(VAPID_PUBLIC) }));
      const topics = [...new Set([...readTopics(), topic])];
      await save(sub, topics);
      writeTopics(topics);
      setState("on");
    } catch { setState("error"); }
  }

  async function turnOff() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      const topics = readTopics().filter((t) => t !== topic);
      if (sub && topics.length) await save(sub, topics);
      else if (sub) { await sb().rpc("push_unsubscribe", { p_endpoint: sub.endpoint }); await sub.unsubscribe(); }
      writeTopics(topics);
      setState("off");
    } catch { setState("error"); }
  }

  const btn = "rounded-lg px-3.5 py-2 text-sm font-bold";
  if (state === "loading") return <span className={`${btn} invisible`}>Alert me</span>;
  if (state === "on") return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-bold" style={{ color: "var(--good)" }}>✓ Alerts on for {name} resets</span>
      <button onClick={turnOff} className="text-xs text-muted underline hover:text-text">Turn off</button>
    </span>
  );
  if (state === "ios-home") return <span className="text-sm text-muted">On iPhone: tap Share, then <b className="text-text">Add to Home Screen</b>, open SI Rumors from there and tap Alert me.</span>;
  if (state === "unsupported") return <span className="text-sm text-muted">This browser can&apos;t show push alerts. Try Chrome, Edge, Firefox or Safari.</span>;
  if (state === "blocked") return <span className="text-sm text-muted">Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then reload.</span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button onClick={turnOn} disabled={state === "working"} className={`${btn} text-white disabled:opacity-60`} style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>
        {state === "working" ? "Turning on…" : `🔔 Alert me when ${name} resets`}
      </button>
      {state === "error" && <span className="text-xs text-muted">That didn&apos;t work. Try again.</span>}
    </span>
  );
}
