"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

// Magic-link landing: supabase-js finishes the sign-in from the URL, then we go back.
export default function AuthCallback() {
  const [msg, setMsg] = useState("Signing you in…");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/";
    const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    const done = () => window.location.replace(safe);
    const c = sb();
    const code = params.get("code");
    (async () => {
      if (code) {
        const { error } = await c.auth.exchangeCodeForSession(code);
        if (error && !(await c.auth.getSession()).data.session) { setMsg("That link expired or was already used. Request a new one from Sign in."); return; }
      }
      const { data } = await c.auth.getSession();
      if (data.session) done();
      else setTimeout(async () => ((await c.auth.getSession()).data.session ? done() : setMsg("That link expired or was already used. Request a new one from Sign in.")), 1500);
    })();
  }, []);
  return <div className="py-24 text-center text-lg font-semibold">{msg}</div>;
}
