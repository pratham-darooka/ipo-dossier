import { SITE_URL } from "./seo";

/**
 * IndexNow (free, key-based, no signup): tell Bing/Yandex/Mojeek about changed
 * URLs within minutes instead of waiting for crawls. Best-effort, never blocking.
 */
export async function indexNowPing(paths: string[]): Promise<number> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || !paths.length) return 0;
  const host = SITE_URL.replace(/^https?:\/\//, "");
  const urlList = [...new Set(paths)].slice(0, 100).map((p) => `${SITE_URL}${p}`);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, key, urlList }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return r.ok || r.status === 202 ? urlList.length : 0;
  } catch {
    return 0;
  }
}
