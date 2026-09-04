"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function Form() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const next = useSearchParams().get("next") || "/studio";
  const router = useRouter();

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/studio/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw, next }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (j.ok) router.push(j.next);
    else setErr("Wrong password. Ask the team for the studio key.");
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-24">
      <div className="rounded-[2rem] border border-white/10 p-8">
        <div className="font-mono2 text-xs tracking-[0.2em] opacity-60">INTERNAL · CONTENT STUDIO</div>
        <h1 className="font-display mt-3 text-4xl font-black">Studio key</h1>
        <p className="mt-2 text-sm opacity-60">The posting workflow lives behind the team password. PNG endpoints stay unlisted for Meta.</p>
        <form onSubmit={go} className="mt-6 space-y-3">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Studio password"
            autoFocus
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 outline-none focus:border-[#D4FF4F]/60"
          />
          {err && <p className="text-sm text-[#FF5C5C]">{err}</p>}
          <button disabled={busy} className="w-full rounded-full bg-[#D4FF4F] py-3 font-bold text-black hover:brightness-110 disabled:opacity-50">
            {busy ? "Unlocking…" : "Unlock studio"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}
