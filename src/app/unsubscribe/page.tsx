"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

export default function Unsubscribe() {
  const [state, setState] = useState<"working" | "done" | "bad">("working");
  const [what, setWhat] = useState("all");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("t"); const w = p.get("w") || "all"; setWhat(w);
    if (!t) { setState("bad"); return; }
    sb().rpc("unsubscribe", { token: t, what: w }).then(({ data, error }) => setState(!error && data ? "done" : "bad"));
  }, []);
  const label = what === "releases" ? "release alerts" : what === "rumors" ? "rumor alerts" : what === "replies" ? "reply emails" : "all SI Rumors emails";
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-extrabold">{state === "working" ? "Updating…" : state === "done" ? "You're unsubscribed" : "Link not recognized"}</h1>
      <p className="mt-2 text-muted">{state === "done" ? `You won't get ${label} anymore. Change this any time in Settings.` : state === "bad" ? "This unsubscribe link is invalid. Sign in and use Settings to manage emails." : ""}</p>
      <a href="/account/" className="mt-6 inline-block font-semibold text-accent hover:underline">Email settings →</a>
    </div>
  );
}
