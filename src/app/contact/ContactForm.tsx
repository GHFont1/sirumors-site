"use client";
import { useState } from "react";
import { sb } from "@/lib/supabase";

const TOPICS = ["Correction", "News tip", "Partnership", "Privacy request", "Other"];

export function ContactForm() {
  const [f, setF] = useState({ name: "", email: "", topic: TOPICS[0], message: "" });
  const [state, setState] = useState<"idle" | "busy" | "done" | "bad">("idle");
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email) || f.message.trim().length < 5) { setState("bad"); return; }
    setState("busy");
    const { data, error } = await sb().rpc("submit_contact", { p_name: f.name, p_email: f.email, p_topic: f.topic, p_message: f.message });
    setState(!error && data ? "done" : "bad");
  };
  if (state === "done") return <div className="card p-5"><p className="font-semibold" style={{ color: "var(--good)" }}>Thanks, your message was sent. We&apos;ll reply by email.</p></div>;
  const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent";
  return (
    <form onSubmit={send} className="card space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-text">Name<input className={`${input} mt-1`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={100} /></label>
        <label className="block text-sm font-semibold text-text">Email<input type="email" required className={`${input} mt-1`} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      </div>
      <label className="block text-sm font-semibold text-text">Topic
        <select className={`${input} mt-1`} value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
      </label>
      <label className="block text-sm font-semibold text-text">Message<textarea required rows={6} maxLength={5000} className={`${input} mt-1`} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></label>
      <button type="submit" disabled={state === "busy"} className="rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>{state === "busy" ? "Sending…" : "Send message"}</button>
      {state === "bad" && <p className="text-sm" style={{ color: "#ef4444" }}>Please check your email and message, then try again. If it keeps failing, wait a few minutes.</p>}
    </form>
  );
}
