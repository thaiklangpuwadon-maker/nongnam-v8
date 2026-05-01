import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type NewsItem = {
  title: string;
  source: string;
  link: string;
  published: string;
  summary: string;
  category: string;
};

function decodeHtml(input = "") {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function stripGoogleRedirect(url = "") {
  try {
    const u = new URL(url);
    const q = u.searchParams.get("url") || u.searchParams.get("q");
    if (q && /^https?:\/\//.test(q)) return q;
  } catch {}
  return url;
}

function tagCategory(title: string) {
  const t = title.toLowerCase();
  if (/แรงงาน|วีซ่า|ต่างชาติ|คนไทย|สถานทูต|e-9|e9|e-7|e7|eps|immigration|migrant|foreign worker|thai/i.test(title)) return "แรงงาน/คนไทยในเกาหลี";
  if (/เกาหลี|korea|seoul|won|president|รัฐบาล|เศรษฐกิจ/i.test(title)) return "เกาหลีกระแส";
  if (/ไทย|thailand|bangkok/i.test(title)) return "ไทย";
  return "ข่าวเด่น";
}

async function fetchGoogleNews(query: string, hl = "th", gl = "TH", ceid = "TH:th"): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 NongNamNewsBot/1.0" } });
  if (!res.ok) return [];
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 12);
  return items.map((m) => {
    const item = m[1];
    const title = decodeHtml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
    const link = stripGoogleRedirect(decodeHtml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || ""));
    const pub = decodeHtml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");
    const source = decodeHtml(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "Google News");
    const desc = decodeHtml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "");
    return {
      title,
      source,
      link,
      published: pub ? new Date(pub).toLocaleString("th-TH", { timeZone: "Asia/Seoul" }) : "",
      summary: desc || "แตะเพื่อเปิดอ่านรายละเอียดจากแหล่งข่าวต้นฉบับ",
      category: tagCategory(title + " " + desc)
    };
  }).filter(x => x.title && x.link);
}

function uniqueItems(items: NewsItem[]) {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    const key = item.title.replace(/\s+/g, " ").trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function score(item: NewsItem) {
  let s = 0;
  if (item.category === "แรงงาน/คนไทยในเกาหลี") s += 100;
  if (/แรงงาน|วีซ่า|คนไทย|ต่างชาติ|สถานทูต|eps|e-9|e9|migrant|foreign worker/i.test(item.title + item.summary)) s += 50;
  if (/เกาหลี|korea|seoul|korean/i.test(item.title + item.summary)) s += 20;
  return s;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "ข่าวเด่น เกาหลีใต้ แรงงานไทย คนไทยในเกาหลี";
  const queries = [
    q,
    "แรงงานไทย เกาหลี ข่าว",
    "คนไทยในเกาหลี ข่าว",
    "แรงงานต่างชาติ เกาหลีใต้ วีซ่า",
    "South Korea migrant workers Thai workers news",
    "South Korea top news today"
  ];

  const settled = await Promise.allSettled(queries.map(query => fetchGoogleNews(query)));
  const all = settled.flatMap(r => r.status === "fulfilled" ? r.value : []);
  const items = uniqueItems(all)
    .sort((a,b) => score(b) - score(a))
    .slice(0, 12);

  return NextResponse.json({
    query: q,
    count: items.length,
    items,
    note: "Results are from Google News RSS. Open the original source for full details."
  });
}
