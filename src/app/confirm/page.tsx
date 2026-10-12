"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

export default function Confirm() {
  const [state, setState] = useState<"working" | "done" | "bad">("working");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (!t) { setState("bad"); return; }
    sb().rpc("confirm_digest", { p_token: t }).then(({ data, error }) => setState(!error && data ? "done" : "bad"));
  }, []);
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-2xl font-extrabold">{state === "working" ? "Confirming…" : state === "done" ? "You're subscribed" : "Link not recognized"}</h1>
      <p className="mt-2 text-muted">{state === "done" ? "The daily digest arrives every morning, and we'll email you the moment a usage reset or a big release lands." : state === "bad" ? "This confirmation link is invalid or expired. Sign up again from any page." : ""}</p>
      <a href="/" className="mt-6 inline-block font-semibold text-accent hover:underline">Back to SI Rumors →</a>
    </div>
  );
}
