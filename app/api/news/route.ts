import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewsItem = {
  title: string;
  source: string;
  link: string;
  published: string;
  summary: string;
  category: string;
  ageDays: number;
};

function decodeHtml(input = "") {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/Google News|Full coverage|Read more|อ่านต่อ|ดูเพิ่มเติม/gi, "")
    .replace(/\s+/g, " ")
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

function splitTitleSource(title: string, fallbackSource = "") {
  const t = decodeHtml(title);
  const parts = t.split(/\s+-\s+/);
  if (parts.length >= 2) {
    const source = parts[parts.length - 1].trim();
    const cleanTitle = parts.slice(0, -1).join(" - ").trim();
    return { title: cleanTitle || t, source: fallbackSource || source };
  }
  return { title: t, source: fallbackSource || "Google News" };
}

function tagCategory(text: string) {
  if (/แรงงาน|วีซ่า|ต่างชาติ|คนไทย|สถานทูต|e-9|e9|e-7|e7|eps|immigration|migrant|foreign worker|thai worker|외국인|이주노동|비자/i.test(text)) {
    return "แรงงาน/วีซ่า";
  }
  if (/เกาหลี|korea|seoul|won|president|รัฐบาล|เศรษฐกิจ|한국|서울|윤석열|이재명/i.test(text)) return "เกาหลีกระแส";
  if (/ไทย|thailand|bangkok|รัฐบาลไทย/i.test(text)) return "ไทย";
  return "ข่าวเด่น";
}

function ageDaysFromPub(pub = "") {
  const t = Date.parse(pub);
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function thaiDate(pub = "") {
  const t = Date.parse(pub);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleString("th-TH", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function makeThaiSummary(title: string, desc: string, source: string, category: string) {
  const cleanTitle = decodeHtml(title).replace(/\s+-\s+[^-]{2,50}$/g, "").trim();
  let cleanDesc = decodeHtml(desc);

  // Google RSS description often repeats the title/source as raw link text.
  if (cleanDesc.toLowerCase().includes(cleanTitle.toLowerCase())) {
    cleanDesc = cleanDesc.replace(cleanTitle, "").trim();
  }

  cleanDesc = cleanDesc
    .replace(source, "")
    .replace(/\s+-\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  const detail = cleanDesc && cleanDesc.length > 20 && cleanDesc.length < 220
    ? cleanDesc
    : cleanTitle;

  if (!detail) {
    return `ข่าวนี้อยู่ในหมวด ${category} จาก ${source} แนะนำเปิดต้นฉบับเพื่ออ่านรายละเอียดเต็ม`;
  }

  return `ข่าวนี้รายงานว่า ${detail} แหล่งข่าวคือ ${source}`;
}

function score(item: NewsItem) {
  let s = 0;
  if (item.ageDays <= 0) s += 120;
  else if (item.ageDays <= 1) s += 100;
  else if (item.ageDays <= 2) s += 70;
  else if (item.ageDays <= 7) s += 30;
  else s -= 100;

  if (item.category === "แรงงาน/วีซ่า") s += 35;
  if (/breaking|urgent|today|ล่าสุด|ด่วน|วันนี้|กระแส|논란|속보/i.test(item.title)) s += 20;
  if (/แรงงานไทย|คนไทยในเกาหลี|วีซ่า|EPS|E-9|E9/i.test(item.title + " " + item.summary)) s += 30;

  return s;
}

async function fetchGoogleNews(query: string, hl = "th", gl = "TH", ceid = "TH:th"): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  const res = await fetch(url, {
    cache: "no-store",
    next: { revalidate: 0 },
    headers: { "User-Agent": "Mozilla/5.0 NongNamNewsBot/1.0" }
  });

  if (!res.ok) return [];

  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 16);

  return items.map((m) => {
    const raw = m[1];
    const rawTitle = decodeHtml(raw.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
    const rawLink = decodeHtml(raw.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
    const rawPub = decodeHtml(raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");
    const rawSource = decodeHtml(raw.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "");
    const rawDesc = decodeHtml(raw.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "");

    const split = splitTitleSource(rawTitle, rawSource);
    const title = split.title;
    const source = split.source || rawSource || "Google News";
    const category = tagCategory(`${title} ${rawDesc} ${query}`);
    const ageDays = ageDaysFromPub(rawPub);
    const summary = makeThaiSummary(title, rawDesc, source, category);

    return {
      title,
      source,
      link: stripGoogleRedirect(rawLink),
      published: thaiDate(rawPub),
      summary,
      category,
      ageDays
    };
  }).filter(x => x.title && x.link);
}

function uniqueItems(items: NewsItem[]) {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    const key = item.title.replace(/\s+/g, " ").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "ข่าวเด่น เกาหลีใต้ วันนี้ แรงงานไทย";
  const queries = [
    `${q} when:2d`,
    "ข่าวเด่น เกาหลีใต้ วันนี้ when:1d",
    "ข่าวเด่น ไทย วันนี้ when:1d",
    "South Korea top news today when:1d",
    "แรงงานไทย เกาหลี when:14d",
    "คนไทยในเกาหลี ข่าว when:14d",
    "แรงงานต่างชาติ เกาหลีใต้ วีซ่า when:14d",
    "เศรษฐกิจเกาหลี ค่าเงินวอน when:7d"
  ];

  const settled = await Promise.allSettled(queries.map(query => fetchGoogleNews(query)));
  const all = settled.flatMap(r => r.status === "fulfilled" ? r.value : []);

  const filtered = all.filter(item => {
    if (item.category === "แรงงาน/วีซ่า") return item.ageDays <= 14;
    return item.ageDays <= 7;
  });

  const items = uniqueItems(filtered)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 14);

  return NextResponse.json(
    {
      query: q,
      count: items.length,
      items,
      note: "ข่าวดึงจาก Google News RSS แบบ no-store และกรองข่าวเก่าออกแล้ว"
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
      }
    }
  );
}
