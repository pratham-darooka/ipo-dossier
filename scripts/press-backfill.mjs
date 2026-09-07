// One-time full press backfill: every row gets the best info available online.
// Self-contained (plain node). Merge-only-empty — never clobbers filing-grade data.
// Usage: node scripts/press-backfill.mjs [slug-filter]
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^(DATABASE_URL|TAVILY_API_KEY|GROQ_API_KEY)="(.*)"$/);
  if (m) process.env[m[1]] = m[2];
}
const ONLY = (process.argv[2] || "").toLowerCase();
const MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"];
const { neon } = await import("@neondatabase/serverless");

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v, n = 0) => (typeof v === "string" && v.trim().length > 5 ? v.trim().slice(0, n || v.trim().length) : "");

async function groqJson(system, user) {
  for (const model of MODELS) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({ model, temperature: 0.1, max_tokens: 1800, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const text = (j.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      if (text) return JSON.parse(text);
    } catch { continue; }
  }
  return null;
}

const SYSTEM = `Extract structured facts from Indian IPO coverage. STRICT JSON only: {"financials":[{"fy":"FY24","revenueCr":n,"patCr":n,"roe":n,"roce":n,"de":n,"cfoCr":n}],"peers":[{"name":s,"pe":n,"pb":n,"roe":n}],"risks":[s],"objectsOfIssue":[s],"promoterPre":n,"promoterPost":n,"freshIssuePct":n,"anchorCr":n,"registrar":s,"leadManagers":[s],"about":s,"lotSize":n,"issueSizeCr":n,"subscriptionTotal":n,"qib":n,"nii":n,"retail":n}. null for missing. Numbers only. anchorCr = anchor book size in Rs crore.`;

function mergeFin(base, add) {
  if (!Array.isArray(add)) return base;
  const byFy = new Map(base.map((r) => [r.fy, r]));
  for (const r of add) {
    if (typeof r?.fy !== "string") continue;
    const p = byFy.get(r.fy) ?? { fy: r.fy, revenueCr: 0, patCr: 0, roe: 0, roce: 0, de: 0, cfoCr: 0 };
    for (const k of ["revenueCr", "patCr", "roe", "roce", "de", "cfoCr"]) if (num(r[k])) p[k] = num(r[k]);
    byFy.set(r.fy, p);
  }
  return [...byFy.values()].slice(-3);
}

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT slug,company,status,data FROM ipo WHERE slug NOT LIKE '_pipeline%'`;
let spent = 0, filled = 0;
for (const r of rows) {
  const d = r.data;
  if (ONLY && !r.slug.toLowerCase().includes(ONLY)) continue;
  const filingGrade = d.finSource === "rhp";
  const needs = (!filingGrade && (d.financials?.length ?? 0) < 3) || !d.about || !d.registrar || !(d.leadManagers||[]).length || !(d.objectsOfIssue||[]).length || !d.lotSize || !(d.risks||[]).length || !(d.peers||[]).length || !d.anchorPct || !d.promoterPost || !(d.news||[]).length || (d.subscription.total === 0 && d.status !== "upcoming");
  if (!needs) { console.log("complete", r.slug); continue; }
  await new Promise((res) => setTimeout(res, 4000)); // stay under Tavily/Groq per-minute limits
  console.log("enriching", d.company);
  const tq = await fetch("https://api.tavily.com/search", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: `${d.company} IPO anchor investors promoter holding peers valuation financials objects of issue`, search_depth: "advanced", max_results: 8, include_answer: true }),
  });
  spent++;
  if (!tq.ok) { console.log("  tavily fail"); continue; }
  const tj = await tq.json();
  const parts = [];
  const hits = (tj.results ?? []).map((h) => ({ title: (h.title ?? "").slice(0, 140), url: h.url ?? "" })).filter((h) => h.url && !/chittorgarh\.com\/report\//i.test(h.url));
  if (tj.answer) parts.push("SUMMARY: " + tj.answer);
  for (const h of tj.results ?? []) parts.push(`--- ${h.title}\n${(h.content ?? "").slice(0, 1500)}`);
  const ex = await groqJson(SYSTEM, `Extract every IPO fact below. Company: ${d.company}.\n\n${parts.join("\n").slice(0, 12000)}`);
  if (!ex) { console.log("  extract fail"); continue; }
  const patch = {};
  if (!filingGrade && Array.isArray(ex.financials) && ex.financials.length) {
    const m = mergeFin(d.financials, ex.financials);
    if (m.length > d.financials.length || JSON.stringify(m) !== JSON.stringify(d.financials)) { patch.financials = m; if (!d.finSource) patch.finSource = "press"; }
  }
  if (!d.about && str(ex.about, 500)) patch.about = str(ex.about, 500);
  if (!d.registrar && str(ex.registrar, 60)) patch.registrar = str(ex.registrar, 60);
  if (!(d.leadManagers||[]).length && Array.isArray(ex.leadManagers)) { const v = ex.leadManagers.filter((x) => typeof x === "string").slice(0, 4); if (v.length) patch.leadManagers = v; }
  if (!(d.objectsOfIssue||[]).length && Array.isArray(ex.objectsOfIssue)) { const v = ex.objectsOfIssue.filter((x) => typeof x === "string" && x.length > 5).slice(0, 6); if (v.length) patch.objectsOfIssue = v; }
  if (!(d.risks||[]).length && Array.isArray(ex.risks)) { const v = ex.risks.filter((x) => typeof x === "string" && x.length > 10).slice(0, 8); if (v.length) patch.risks = v; }
  if (!(d.peers||[]).length && Array.isArray(ex.peers)) { const v = ex.peers.filter((p) => typeof p?.name === "string").slice(0, 4); if (v.length) patch.peers = v; }
  if (!d.lotSize && num(ex.lotSize)) patch.lotSize = num(ex.lotSize);
  if (!d.issueSizeCr && num(ex.issueSizeCr)) patch.issueSizeCr = num(ex.issueSizeCr);
  if (d.subscription.total === 0 && d.status !== "upcoming") {
    const s = { ...d.subscription };
    if (num(ex.subscriptionTotal)) s.total = num(ex.subscriptionTotal);
    if (num(ex.qib)) s.qib = num(ex.qib);
    if (num(ex.nii)) s.nii = num(ex.nii);
    if (num(ex.retail)) s.retail = num(ex.retail);
    if (s.total > 0) patch.subscription = s;
  }
  if (typeof ex.promoterPre === "number" && !d.promoterPre) patch.promoterPre = ex.promoterPre;
  if (typeof ex.promoterPost === "number" && !d.promoterPost) patch.promoterPost = ex.promoterPost;
  if (typeof ex.freshIssuePct === "number" && !d.freshIssuePct) patch.freshIssuePct = ex.freshIssuePct;
  if (!(d.news || []).length && hits.length) patch.news = hits.slice(0, 5).map((h) => ({ title: h.title || h.url, url: h.url }));
  if (typeof ex.anchorCr === "number" && !d.anchorPct && d.issueSizeCr) {
    const pct = Math.round((ex.anchorCr / d.issueSizeCr) * 1000) / 10;
    if (pct > 0 && pct <= 60) patch.anchorPct = pct;
  }
  const keys = Object.keys(patch);
  if (keys.length) {
    Object.assign(d, patch);
    d.partial = (d.financials?.length ?? 0) === 0;
    d.syncedAt = new Date().toISOString();
    await sql`UPDATE ipo SET data=${JSON.stringify(d)}::jsonb,updated_at=NOW() WHERE slug=${r.slug}`;
    filled++;
    console.log("  filled:", keys.join(","));
  } else console.log("  nothing new");
}
console.log(`DONE filled=${filled} tavily_spent=${spent}`);
