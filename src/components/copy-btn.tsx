"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyBtn({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch { /* clipboard unavailable */ }
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/5"
    >
      {ok ? <Check className="size-4 text-[#D4FF4F]" /> : <Copy className="size-4" />}
      {ok ? "Copied!" : label}
    </button>
  );
}
