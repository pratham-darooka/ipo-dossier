// One-time deep clean: doc deep-dives for every partial row, priority-ordered.
// Self-contained (plain node). Downloads PDF -> /tmp -> text extract -> Groq structure -> merge -> DELETE.
// Usage: node scripts/doc-backfill.mjs [maxDocs]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^(DATABASE_URL|TAVILY_API_KEY|GROQ_API_KEY)="(.*)"$/);
  if (m) process.env[m[1]] = m[2];
}
const MAX = Number(process.argv[2] || 20);
const { neon } = await import("@neondatabase/serverless");
const { extractText } = await import("unpdf");

const MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"];

async function groqJson(system, user, maxTokens = 1800) {
  for (const model of MODELS) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({ model, temperature: 0.1, max_tokens: maxTokens, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const text = (j.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      if (text) return JSON.parse(text);
    } catch { continue; }
  }
  return null;
}

const BAD_URL = /chittorgarh\.com\/report\/|groww\.in\/blog|moneycontrol\.com\/news|indmoney\.com\/blog|emkayglobal\.com\/downloads\/.*%$/i;

async function resolveDocUrl(company) {
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: `${company} IPO RHP red herring prospectus PDF filetype:pdf`, search_depth: "advanced", max_results: 10, include_domains: ["sebi.gov.in", "bseindia.com", "nseindia.com", "nsearchives.nseindia.com", "chittorgarh.com"] }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const urls = (j.results ?? []).map((h) => h.url ?? "").filter(Boolean).filter((u) => !BAD_URL.test(u));
    return [...urls.filter((u) => /\.pdf(\?|$)/i.test(u) || /nsearchives|sebi\.gov\.in/i.test(u)), ...urls][0] ?? null;
  } catch { return null; }
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

async function dive(company, url) {
  const tmp = path.join(os.tmpdir(), `dossier-${Date.now()}.pdf`);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Chrome/126" }, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!/pdf/i.test(ct) && !/octet-stream/i.test(ct)) return null; // index pages/blogs aren't filings
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 25 * 1024 * 1024 || buf.length < 1024) return null;
    await fs.promises.writeFile(tmp, buf);

    const { text } = await extractText(new Uint8Array(buf));
    const full = (Array.isArray(text) ? text.join("\n") : String(text)).slice(0, 60000);
    if (full.trim().length < 2000) return null;
    const chunks = [full.slice(0, 20000), full.slice(20000, 40000), full.slice(40000, 60000)].filter((c) => c.trim().length > 1000);
    const patch = {};
    const fins = new Map();
    const risks = new Set();
    const objects = new Set();
    for (const c of chunks.slice(0, 3)) {
      const ex = await groqJson(
        `Extract structured facts from Indian IPO offer documents. STRICT JSON only: {"financials":[{"fy":"FY24","revenueCr":n,"patCr":n,"roe":n,"roce":n,"de":n,"cfoCr":n}],"peers":[{"name":s,"pe":n,"pb":n,"roe":n}],"risks":[s],"objectsOfIssue":[s],"promoterPre":n,"promoterPost":n,"freshIssuePct":n,"registrar":s,"leadManagers":[s],"about":s}. null for missing. Numbers only.`,
        `Extract from this offer-document text:\n${c}`
      );
      if (!ex) continue;
      for (const fr of (Array.isArray(ex.financials) ? ex.financials : [])) {
        if (typeof fr?.fy !== "string") continue;
        const p = fins.get(fr.fy) ?? { fy: fr.fy, revenueCr: 0, patCr: 0, roe: 0, roce: 0, de: 0, cfoCr: 0 };
        for (const k of ["revenueCr", "patCr", "roe", "roce", "de", "cfoCr"]) if (num(fr[k])) p[k] = num(fr[k]);
        fins.set(fr.fy, p);
      }
      for (const x of (ex.risks ?? []).slice(0, 8)) if (typeof x === "string" && x.length > 10) risks.add(x.slice(0, 220));
      for (const x of (ex.objectsOfIssue ?? []).slice(0, 6)) if (typeof x === "string" && x.length > 5) objects.add(x.slice(0, 160));
      if (typeof ex.about === "string" && ex.about.length > 40 && !patch.about) patch.about = ex.about.slice(0, 500);
      if (typeof ex.registrar === "string" && ex.registrar && !patch.registrar) patch.registrar = ex.registrar.slice(0, 60);
      if (Array.isArray(ex.leadManagers) && !patch.leadManagers?.length) patch.leadManagers = ex.leadManagers.filter((x) => typeof x === "string").slice(0, 4);
      if (typeof ex.promoterPre === "number" && !patch.promoterPre) patch.promoterPre = ex.promoterPre;
      if (typeof ex.promoterPost === "number" && !patch.promoterPost) patch.promoterPost = ex.promoterPost;
      if (typeof ex.freshIssuePct === "number" && !patch.freshIssuePct) patch.freshIssuePct = ex.freshIssuePct;
      if (Array.isArray(ex.peers) && !patch.peers?.length) patch.peers = ex.peers.filter((p) => typeof p?.name === "string").slice(0, 4);
    }
    if (fins.size) patch.financials = [...fins.values()].slice(-3);
    if (risks.size) patch.risks = [...risks].slice(0, 8);
    if (objects.size) patch.objectsOfIssue = [...objects].slice(0, 6);
    return patch;
  } catch (e) {
    console.log("  dive err", String(e?.message ?? e).slice(0, 100));
    return null;
  } finally {
    await fs.promises.unlink(tmp).catch(() => {});
  }
}

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT slug,company,status,data FROM ipo WHERE slug!='_pipeline_heartbeat'`;
const rank = (s) => (s === "upcoming" ? 0 : 1);
const targets = rows
  .filter((r) => (r.data.financials?.length ?? 0) === 0)
  .sort((a, b) => rank(a.status) - rank(b.status) || String(a.data.openDate || "9").localeCompare(String(b.data.openDate || "9")))
  .slice(0, MAX);

console.log("PARTIALS QUEUED:", targets.map((r) => r.slug).join(", "));
let done = 0;
for (const r of targets) {
  const d = r.data;
  if ((d.docTries ?? 0) >= 3) { console.log("SKIP (tries exhausted)", d.company); continue; }
  if (d.docUrl && BAD_URL.test(d.docUrl)) { console.log("clearing poisoned docUrl for", d.company); delete d.docUrl; }
  console.log(`[${done + 1}/${targets.length}]`, d.company);
  const url = d.docUrl ?? (await resolveDocUrl(d.company));
  if (!url) { console.log("  no doc URL"); continue; }
  if (!d.docUrl) { d.docUrl = url; await sql`UPDATE ipo SET data=${JSON.stringify(d)}::jsonb WHERE slug=${r.slug}`; }
  console.log("  doc:", url.slice(0, 90));
  const patch = await dive(d.company, url);
  if (patch && Object.keys(patch).length) {
    Object.assign(d, patch);
    d.partial = (d.financials?.length ?? 0) === 0;
    d.syncedAt = new Date().toISOString();
    await sql`UPDATE ipo SET data=${JSON.stringify(d)}::jsonb,updated_at=NOW() WHERE slug=${r.slug}`;
    console.log("  enriched: fins=" + (d.financials?.length ?? 0), "risks=" + (d.risks?.length ?? 0), "peers=" + (d.peers?.length ?? 0));
    done++;
  } else {
    console.log("  no facts extracted");
    d.docTries = (d.docTries ?? 0) + 1;
    d.syncedAt = new Date().toISOString();
    await sql`UPDATE ipo SET data=${JSON.stringify(d)}::jsonb WHERE slug=${r.slug}`;
  }
}
console.log("ENRICHED:", done, "/", targets.length);
