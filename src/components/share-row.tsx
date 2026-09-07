"use client";

import { useState } from "react";
import { Share2, Link2, Check, Send } from "lucide-react";

/** Free organic loop: one tap shares the dossier verdict anywhere. */
export function ShareRow({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch { /* user cancelled */ }
    }
    await copy();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n${text}\n${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const url = typeof window !== "undefined" ? window.location.href : "";
  const msg = encodeURIComponent(`${title}\n${text}\n${url}`);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono2 text-[11px] tracking-[0.2em] opacity-60 inline-flex items-center gap-1.5">
        <Share2 className="size-3.5" /> SHARE THIS DOSSIER
      </span>
      <button onClick={share} className="rounded-full bg-[#D4FF4F] px-4 py-2 text-sm font-bold text-black hover:brightness-110">
        Share
      </button>
      <a href={`https://twitter.com/intent/tweet?text=${msg}`} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/5">
        X
      </a>
      <a href={`https://wa.me/?text=${msg}`} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/5">
        WhatsApp
      </a>
      <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${title}\n${text}`)}`} target="_blank" rel="noreferrer" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/5">
        <Send className="size-3.5 inline mr-1" />Telegram
      </a>
      <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/5">
        {copied ? <Check className="size-4 text-[#D4FF4F]" /> : <Link2 className="size-4" />}
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
