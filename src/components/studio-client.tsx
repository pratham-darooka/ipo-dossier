"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Download, FileText, LogOut, RefreshCw, Sparkles } from "lucide-react";
import type { QueueItem } from "@/lib/social/schedule";
import { captionsMarkdown } from "@/lib/social/schedule";
import { CopyBtn } from "@/components/copy-btn";
import { cn } from "@/lib/utils";

function slideUrl(item: QueueItem, n: number) {
  return `${item.carouselBase}/${n}`;
}

async function downloadZip(item: QueueItem) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (let n = 1; n <= item.slides; n++) {
    const r = await fetch(slideUrl(item, n));
    if (!r.ok) throw new Error(`slide ${n} failed`);
    zip.file(`slide-${n}.png`, await r.blob());
  }
  zip.file("caption.md", item.caption);
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${item.date}-${item.ref}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function StudioClient({ queue: initial, draftsCount }: { queue: QueueItem[]; draftsCount: number }) {
  const [queue, setQueue] = useState(initial);
  const [sel, setSel] = useState(0);
  const [slide, setSlide] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [gen, setGen] = useState(false);
  const [pillar, setPillar] = useState("");
  const [level, setLevel] = useState("");
  const router = useRouter();

  const item = queue[Math.min(sel, queue.length - 1)];
  const select = (i: number) => {
    setSel(i);
    setSlide(1);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setSlide((s) => (item ? Math.min(item.slides, s + 1) : s));
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(1, s - 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [item]);

  const markPosted = useCallback(
    async (q: QueueItem) => {
      setBusy(q.postId);
      await fetch("/api/social/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: q.postId, kind: q.kind, ref: q.ref, postedOn: q.date }),
      }).catch(() => {});
      setQueue((qs) => qs.map((x) => (x.postId === q.postId ? { ...x, posted: true } : x)));
      setBusy(null);
    },
    []
  );

  const todo = useMemo(() => queue.filter((q) => !q.posted).length, [queue]);

  async function generate() {
    setGen(true);
    try {
      const r = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillar: pillar || undefined, level: level || undefined }),
      });
      const j = await r.json();
      if (j.ok) router.refresh();
      else alert(j.error ?? "generation failed");
    } finally {
      setGen(false);
    }
  }

  async function logout() {
    await fetch("/api/studio/auth", { method: "DELETE" }).catch(() => {});
    router.push("/studio/login");
    router.refresh();
  }

  if (!item) return <p className="opacity-60">Nothing scheduled.</p>;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono2 text-xs opacity-60">{todo} of {queue.length} todo · {draftsCount} drafts in inbox</span>
        <span className="ml-auto flex flex-wrap gap-2">
          <select value={pillar} onChange={(e) => setPillar(e.target.value)} className="rounded-full border border-white/15 bg-transparent px-3 py-2 text-sm">
            <option value="" className="text-black">Any pillar</option>
            {["IPO sense", "Forensics", "Valuation", "Money basics", "Live tape", "Receipts", "Calendar"].map((p) => <option key={p} value={p} className="text-black">{p}</option>)}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-full border border-white/15 bg-transparent px-3 py-2 text-sm">
            <option value="" className="text-black">Any level</option>
            <option value="beginner" className="text-black">Beginner</option>
            <option value="expert" className="text-black">Expert</option>
          </select>
          <button onClick={generate} disabled={gen} className="inline-flex items-center gap-1.5 rounded-full bg-[#D4FF4F] px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
            <Sparkles className="size-4" /> {gen ? "Writing…" : "New post"}
          </button>
          <button onClick={() => downloadText("captions-14d.md", captionsMarkdown(queue))} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/5">
            <FileText className="size-4" /> All captions.md
          </button>
          <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm opacity-70 hover:bg-white/5">
            <LogOut className="size-4" />
          </button>
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Queue */}
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {queue.map((q, i) => (
            <button
              key={q.postId + q.date}
              onClick={() => select(i)}
              className={cn(
                "w-full text-left rounded-2xl border p-4 transition-colors",
                i === sel ? "border-[#D4FF4F]/60 bg-[#D4FF4F]/5" : "border-white/10 hover:bg-white/5",
                q.posted && "opacity-50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono2 text-xs opacity-60">{q.date.slice(5)} · {q.slot}</span>
                {q.posted && <Check className="size-3.5 text-[#D4FF4F]" />}
                {q.recycled && <span className="font-mono2 text-[10px] rounded-full bg-[#E8C15A]/20 px-2 py-0.5">RECYCLE</span>}
              </div>
              <div className="mt-1 font-bold leading-snug">{q.title}</div>
              <div className="mt-1 font-mono2 text-[11px] opacity-50">{q.kind} · {q.slides} slides · {q.reason.slice(0, 60)}</div>
            </button>
          ))}
        </div>

        {/* Viewer */}
        <div className="rounded-[2rem] border border-white/10 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <div className="font-mono2 text-xs opacity-60">{item.date} · {item.slot} · SLIDE {slide}/{item.slides}</div>
              <h2 className="font-display text-2xl font-black leading-tight">{item.title}</h2>
            </div>
            <span className="ml-auto flex gap-2">
              <CopyBtn text={item.caption} label="Caption" />
              <button
                onClick={() => downloadZip(item).catch(() => alert("ZIP failed — try per-slide PNG links below"))}
                className="inline-flex items-center gap-1.5 rounded-full bg-white text-black dark:bg-[#D4FF4F] px-4 py-2 text-sm font-bold"
              >
                <Download className="size-4" /> ZIP
              </button>
              {!item.posted && (
                <button
                  onClick={() => markPosted(item)}
                  disabled={busy === item.postId}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D4FF4F]/50 px-4 py-2 text-sm font-bold hover:bg-[#D4FF4F]/10"
                >
                  {busy === item.postId ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />} Posted
                </button>
              )}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => setSlide((s) => Math.max(1, s - 1))} className="grid size-11 shrink-0 place-items-center rounded-full border border-white/15 hover:bg-white/5" aria-label="previous slide">
              <ChevronLeft className="size-5" />
            </button>
            <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={`${item.postId}-${slide}`} src={slideUrl(item, slide)} alt={`${item.title} slide ${slide}`} className="w-full h-auto" />
            </div>
            <button onClick={() => setSlide((s) => Math.min(item.slides, s + 1))} className="grid size-11 shrink-0 place-items-center rounded-full border border-white/15 hover:bg-white/5" aria-label="next slide">
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="mt-3 flex justify-center gap-2">
            {Array.from({ length: item.slides }, (_, i) => (
              <button key={i} onClick={() => setSlide(i + 1)} aria-label={`slide ${i + 1}`} className={cn("h-2 rounded-full transition-all", slide === i + 1 ? "w-8 bg-[#D4FF4F]" : "w-2 bg-white/20")} />
            ))}
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-black/40 dark:bg-black/60 bg-black/5 p-4 font-mono2 text-xs opacity-80 max-h-48 overflow-y-auto">{item.caption}</pre>
          <div className="mt-2 font-mono2 text-[11px] opacity-50">Why this day: {item.reason}</div>
        </div>
      </div>
    </div>
  );
}
