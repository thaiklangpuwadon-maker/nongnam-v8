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
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/Google News|Full coverage|Read more|อ่านต่อ|ดูเพิ่มเติม/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripGoogleRedirect(url = "") {
  try {
    const u = new URL(url);
    const direct = u.searchParams.get("url") || u.searchParams.get("q");
    if (direct && /^https?:\/\//.test(direct)) return direct;
  } catch {}
  return url;
}

function splitTitleSource(rawTitle: string, fallbackSource = "") {
  const t = decodeHtml(rawTitle);
  const parts = t.split(/\s+-\s+/);
  if (parts.length >= 2) {
    const source = parts[parts.length - 1].trim();
    const title = parts.slice(0, -1).join(" - ").trim();
    return {
      title: title || t,
      source: fallbackSource || source || "Google News"
    };
  }
  return {
    title: t,
    source: fallbackSource || "Google News"
  };
}

function categoryOf(text: string) {
  if (/แรงงาน|วีซ่า|ต่างชาติ|คนไทย|สถานทูต|e-9|e9|e-7|e7|eps|immigration|migrant|foreign worker|thai worker|외국인|이주노동|비자/i.test(text)) {
    return "แรงงาน/วีซ่า";
  }
  if (/เกาหลี|korea|seoul|won|president|รัฐบาล|เศรษฐกิจ|한국|서울|속보|논란/i.test(text)) return "เกาหลีกระแส";
  if (/ไทย|thailand|bangkok|รัฐบาลไทย/i.test(text)) return "ไทย";
  return "ข่าวเด่น";
}

function ageDaysFromPub(pub = "") {
  const t = Date.parse(pub);
  if (!Number.isFinite(t)) return 0; // ห้ามตีเป็นเก่าเกินจนถูกกรองหาย
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
  const cleanTitle = decodeHtml(title)
    .replace(/\s+-\s+[^-]{2,80}$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  let cleanDesc = decodeHtml(desc)
    .replace(/\s+/g, " ")
    .trim();

  if (cleanDesc.length > 260) cleanDesc = cleanDesc.slice(0, 260).trim() + "...";

  // ถ้า description เป็นขยะหรือซ้ำชื่อข่าว ให้ใช้ title เป็นแกน
  const base =
    cleanDesc && cleanDesc.length > 25 && !cleanDesc.includes("rss")
      ? cleanDesc
      : cleanTitle;

  if (!base) {
    return `ข่าวนี้อยู่ในหมวด ${category} จาก ${source} แนะนำเปิดต้นฉบับเพื่ออ่านรายละเอียดเต็ม`;
  }

  return `ข่าวนี้รายงานว่า ${base} แหล่งข่าวคือ ${source}`;
}

function score(item: NewsItem) {
  let s = 0;

  // สดขึ้นก่อน
  if (item.ageDays <= 0) s += 120;
  else if (item.ageDays <= 1) s += 100;
  else if (item.ageDays <= 3) s += 70;
  else if (item.ageDays <= 7) s += 30;
  else s += 5;

  // แรงงาน/วีซ่ามี bonus แต่ไม่ให้ข่าวทั่วไปหาย
  if (item.category === "แรงงาน/วีซ่า") s += 35;
  if (/ล่าสุด|ด่วน|วันนี้|กระแส|breaking|urgent|today|속보|논란/i.test(item.title + " " + item.summary)) s += 20;
  if (/แรงงานไทย|คนไทยในเกาหลี|วีซ่า|EPS|E-9|E9/i.test(item.title + " " + item.summary)) s += 25;

  return s;
}

async function fetchRss(url: string): Promise<NewsItem[]> {
  const res = await fetch(url, {
    cache: "no-store",
    next: { revalidate: 0 },
    headers: {
      "User-Agent": "Mozilla/5.0 NongNamNewsBot/1.0",
      "Accept": "application/rss+xml, application/xml, text/xml, */*"
    }
  });

  if (!res.ok) return [];

  const xml = await res.text();
  const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 18);

  return matches.map((m) => {
    const raw = m[1];
    const rawTitle = decodeHtml(raw.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
    const rawLink = decodeHtml(raw.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
    const rawPub = decodeHtml(raw.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "");
    const rawSource = decodeHtml(raw.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "");
    const rawDesc = decodeHtml(raw.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "");

    const split = splitTitleSource(rawTitle, rawSource);
    const title = split.title;
    const source = split.source || rawSource || "Google News";
    const category = categoryOf(`${title} ${rawDesc} ${source}`);
    const ageDays = ageDaysFromPub(rawPub);

    return {
      title,
      source,
      link: stripGoogleRedirect(rawLink),
      published: thaiDate(rawPub),
      summary: makeThaiSummary(title, rawDesc, source, category),
      category,
      ageDays
    };
  }).filter(item => item.title && item.link);
}

async function fetchGoogleSearch(query: string, hl = "th", gl = "TH", ceid = "TH:th") {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  return fetchRss(url);
}

async function fetchTopStories(hl = "th", gl = "TH", ceid = "TH:th") {
  const url = `https://news.google.com/rss?hl=${hl}&gl=${gl}&ceid=${ceid}`;
  return fetchRss(url);
}

function uniqueItems(items: NewsItem[]) {
  const seen = new Set<string>();
  const out: NewsItem[] = [];

  for (const item of items) {
    const key = item.title
      .replace(/\s+/g, " ")
      .replace(/[“”"']/g, "")
      .trim()
      .toLowerCase();

    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "ข่าวเด่น เกาหลีใต้ วันนี้ แรงงานไทย";

  // รอบแรก: query สดและกว้างพอ
  const primaryQueries = [
    q,
    "ข่าวเด่น เกาหลีใต้ วันนี้",
    "ข่าวเด่น ไทย วันนี้",
    "ข่าวกระแส วันนี้",
    "South Korea top news today",
    "Korea breaking news today",
    "แรงงานไทย เกาหลี",
    "คนไทยในเกาหลี ข่าว",
    "แรงงานต่างชาติ เกาหลีใต้ วีซ่า",
    "เศรษฐกิจเกาหลี ค่าเงินวอน"
  ];

  const primaryResults = await Promise.allSettled([
    ...primaryQueries.map(query => fetchGoogleSearch(query, "th", "TH", "TH:th")),
    ...primaryQueries.slice(0, 6).map(query => fetchGoogleSearch(query, "ko", "KR", "KR:ko"))
  ]);

  let all = primaryResults.flatMap(r => r.status === "fulfilled" ? r.value : []);

  // รอบสอง: ถ้าน้อยเกินไป อย่ากรอง ให้ไปเอา top stories มาช่วย
  if (all.length < 4) {
    const fallbackResults = await Promise.allSettled([
      fetchTopStories("th", "TH", "TH:th"),
      fetchTopStories("ko", "KR", "KR:ko"),
      fetchGoogleSearch("ข่าววันนี้", "th", "TH", "TH:th"),
      fetchGoogleSearch("today news", "en", "US", "US:en")
    ]);
    all = all.concat(fallbackResults.flatMap(r => r.status === "fulfilled" ? r.value : []));
  }

  // กรองแบบอ่อน ไม่ตัดจนหมด
  const softFiltered = all.filter(item => {
    if (item.category === "แรงงาน/วีซ่า") return item.ageDays <= 30;
    return item.ageDays <= 14;
  });

  const usable = softFiltered.length ? softFiltered : all;

  const items = uniqueItems(usable)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 14);

  return NextResponse.json(
    {
      query: q,
      count: items.length,
      items,
      note: items.length
        ? "โหลดข่าวสำเร็จแบบ fallback ไม่กรองโหด"
        : "ยังไม่มีผลลัพธ์จาก Google News RSS ในรอบนี้"
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
      }
    }
  );
}
