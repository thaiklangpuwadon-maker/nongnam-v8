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
  updatedAtText?: string;
};



function isThaiText(s: string) {
  return /[\u0E00-\u0E7F]/.test(s || "");
}

function hasForeignScript(s: string) {
  return /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF]/.test(s || "");
}

function isAllowedThaiNewsDomain(domain: string) {
  return /(bbc|morning-news|morningnewstv3|ch3plus|ch3thailand|thairath|dailynews|khaosod|matichon|pptvhd36|springnews|nationtv|workpointtoday|thaipbs|bangkokbiznews|mgronline|komchadluek|posttoday|amarintv|ch7|tna|mcot|sanook|kapook|thestandard|today\.line)/i.test(domain || "");
}

function normalizeDateLabel(raw: any) {
  if (!raw) return "ไม่ระบุเวลาอัปเดต";
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });
    }
  } catch {}
  return String(raw).slice(0, 80);
}

function sourceDomain(item: any) {
  const raw = String(item?.source || item?.domain || item?.link || "");
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).hostname.replace(/^www\./, "");
  } catch {}
  return raw.replace(/^www\./, "");
}

function thaiHeadlineOnly(items: NewsItem[], maxAgeDays = 3) {
  const out: any[] = [];
  for (const item of items || []) {
    const domain = sourceDomain(item);
    const title = String((item as any).title || "").trim();
    const summary = String((item as any).summary || "").trim();
    const age = typeof (item as any).ageDays === "number" ? (item as any).ageDays : ageDaysFromDate((item as any).publishedRaw || (item as any).published);

    if (!title) continue;
    if (!isAllowedThaiNewsDomain(domain)) continue;
    if (!isThaiText(title)) continue;
    if (hasForeignScript(title + " " + summary)) continue;

    // For daily headlines, never show items without a parseable date or older than maxAgeDays.
    if (age >= 999) continue;
    if (age > maxAgeDays) continue;

    const dateRaw = (item as any).publishedRaw || (item as any).publishedAt || (item as any).pubDate || (item as any).date || (item as any).updatedAt || (item as any).published;
    const dateText = normalizeDateLabel(dateRaw);

    out.push({
      ...(item as any),
      source: domain || (item as any).source,
      ageDays: age,
      updatedAtText: dateText,
      published: dateText
    });
  }
  return out as NewsItem[];
}




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
    return { title: title || t, source: fallbackSource || source || "Google News" };
  }
  return { title: t, source: fallbackSource || "Google News" };
}

function categoryOf(text: string) {
  if (/แรงงาน|วีซ่า|ต่างชาติ|คนไทย|สถานทูต|e-9|e9|e-7|e7|eps|immigration|migrant|foreign worker|thai worker|외국인|이주노동|비자/i.test(text)) return "แรงงาน/วีซ่า";
  if (/เกาหลี|korea|seoul|won|president|รัฐบาล|เศรษฐกิจ|한국|서울|속보|논란/i.test(text)) return "เกาหลีกระแส";
  if (/ไทย|thailand|bangkok|รัฐบาลไทย/i.test(text)) return "ไทย";
  return "ข่าวเด่น";
}

function ageDaysFromDate(input = "") {
  const t = Date.parse(input);
  // Unknown date must not be treated as fresh. This was the cause of stale news being ranked as "today".
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function thaiDate(input = "") {
  const t = Date.parse(input);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleString("th-TH", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function makeThaiSummary(title: string, desc: string, source: string, category: string) {
  const cleanTitle = decodeHtml(title).replace(/\s+-\s+[^-]{2,80}$/g, "").trim();
  let cleanDesc = decodeHtml(desc).trim();

  if (cleanDesc.length > 260) cleanDesc = cleanDesc.slice(0, 260).trim() + "...";

  // Avoid reading the same headline twice. If description is empty or identical to title, be honest.
  const titleCompact = cleanTitle.replace(/\s+/g, " ").trim();
  const descCompact = cleanDesc.replace(/\s+/g, " ").trim();
  if (!descCompact || descCompact === titleCompact || descCompact.includes(titleCompact)) {
    return `พาดหัวระบุว่า ${titleCompact} แหล่งข่าวคือ ${source} หากต้องการรายละเอียดมากกว่านี้ให้เปิดต้นฉบับหรือให้น้ำค้นลึกเฉพาะข่าวนี้`;
  }

  return `ใจความเบื้องต้นคือ ${descCompact} แหล่งข่าวคือ ${source}`;
}


function normalizeTopic(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(ล่าสุด|วันนี้|ด่วน|เปิด|เผย|ช็อก|คลิป|ภาพ|ข่าว)/g, "")
    .trim()
    .slice(0, 80);
}

function dedupeByTopic(items: NewsItem[]) {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    const key = normalizeTopic(item.title || "");
    const compact = key.split(" ").slice(0, 8).join(" ");
    if (!compact || seen.has(compact)) continue;
    seen.add(compact);
    out.push(item);
  }
  return out;
}

function score(item: NewsItem, explicitLabor = false) {
  let s = 0;
  const txt = `${item.title} ${item.summary} ${item.category}`;

  if (item.ageDays <= 0) s += 120;
  else if (item.ageDays <= 1) s += 100;
  else if (item.ageDays <= 3) s += 70;
  else if (item.ageDays <= 7) s += 35;
  else s += 5;

  if (/ข่าวเด่น|วันนี้|ด่วน|ล่าสุด|กระแส|breaking|urgent|today|속보|논란|รัฐบาล|เศรษฐกิจ|ค่าเงิน|ค่าครองชีพ|ภัยพิบัติ|อุบัติเหตุ|การเมือง|สังคม/i.test(txt)) s += 35;

  if (item.category === "ไทย") s += 20;
  if (item.category === "เกาหลีกระแส") s += 15;

  if (item.category === "แรงงาน/วีซ่า") {
    s += explicitLabor ? 45 : 5;
    if (/ค่าแรงขั้นต่ำ|กฎหมายแรงงาน|ทำร้ายลูกจ้าง|อุบัติเหตุแรงงาน|แรงงานเสียชีวิต|จับกุม|นโยบายใหม่|วีซ่าใหม่/i.test(txt)) s += 40;
  }

  return s;
}

async function fetchWithTimeout(url: string, ms = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      next: { revalidate: 0 },
      headers: {
        "User-Agent": "Mozilla/5.0 NongNamNewsBot/1.0",
        "Accept": "application/rss+xml, application/xml, text/xml, application/json, */*"
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRss(url: string): Promise<NewsItem[]> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const xml = await res.text();
    const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 20);

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
      const ageDays = ageDaysFromDate(rawPub);

      const dateText = thaiDate(rawPub);
      return {
        title,
        source,
        link: stripGoogleRedirect(rawLink),
        published: dateText || "",
        publishedRaw: rawPub,
        updatedAtText: dateText || "",
        summary: makeThaiSummary(title, rawDesc, source, category),
        category,
        ageDays
      } as any;
    }).filter(item => item.title && item.link);
  } catch {
    return [];
  }
}

async function fetchGoogleSearch(query: string, hl = "th", gl = "TH", ceid = "TH:th") {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  return fetchRss(url);
}

async function fetchTopStories(hl = "th", gl = "TH", ceid = "TH:th") {
  const url = `https://news.google.com/rss?hl=${hl}&gl=${gl}&ceid=${ceid}`;
  return fetchRss(url);
}

async function fetchGdelt(query: string): Promise<NewsItem[]> {
  try {
    const gdeltQuery = query
      .replace(/ข่าว|วันนี้|เด่น|กระแส/g, "")
      .trim() || "South Korea OR Thailand";
    const url =
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(gdeltQuery)}` +
      `&mode=ArtList&format=json&maxrecords=20&sort=HybridRel`;

    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await res.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];

    return articles.slice(0, 14).map((a: any) => {
      const title = decodeHtml(a.title || "");
      const source = decodeHtml(a.domain || a.sourceCountry || "GDELT");
      const link = a.url || "";
      const publishedRaw = a.seendate || a.date || "";
      const category = categoryOf(`${title} ${source} ${query}`);
      const dateText = thaiDate(publishedRaw);
      return {
        title,
        source,
        link,
        published: dateText || "",
        publishedRaw,
        updatedAtText: dateText || "",
        summary: makeThaiSummary(title, "", source, category),
        category,
        ageDays: ageDaysFromDate(publishedRaw)
      } as any;
    }).filter((x: NewsItem) => x.title && x.link);
  } catch {
    return [];
  }
}

function uniqueItems(items: NewsItem[]) {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    const key = item.title.replace(/\s+/g, " ").replace(/[“”"']/g, "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}


function buildNewsQueries(q: string) {
  const raw = (q || "").trim();
  const isSpecific = raw && !/ข่าวเด่นวันนี้|ข่าววันนี้|เรื่องเล่าเช้านี้|ข่าวกระแส|ข่าวหน้าหนึ่ง/i.test(raw);

  if (isSpecific) {
    return [
      `${raw} when:30d site:bbc.com/thai`,
      `${raw} when:30d site:thairath.co.th`,
      `${raw} when:30d site:khaosod.co.th`,
      `${raw} when:30d site:dailynews.co.th`,
      `${raw} when:30d site:matichon.co.th`,
      `${raw} when:30d site:pptvhd36.com`,
      `${raw} when:30d site:thaipbs.or.th`,
      `${raw} when:30d`
    ];
  }

  return [
    "ข่าวเด่นวันนี้ when:2d site:bbc.com/thai",
    "ข่าวเด่นวันนี้ when:2d site:thairath.co.th",
    "ข่าวเด่นวันนี้ when:2d site:khaosod.co.th",
    "ข่าวเด่นวันนี้ when:2d site:dailynews.co.th",
    "ข่าวเด่นวันนี้ when:2d site:matichon.co.th",
    "ข่าวเด่นวันนี้ when:2d site:pptvhd36.com",
    "ข่าวเด่นวันนี้ when:2d site:thaipbs.or.th",
    "เรื่องเล่าเช้านี้ ข่าวเด่นวันนี้ when:2d",
    "ข่าวล่าสุดวันนี้ ข่าวด่วนวันนี้ when:1d"
  ];
}


export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "ข่าวเด่นวันนี้";
  const newsQueries = buildNewsQueries(q);


  const searchQueries = newsQueries;

  const batches = await Promise.allSettled([
    ...newsQueries.map(x => fetchGoogleSearch(x, "th", "TH", "TH:th")),
    fetchTopStories("th", "TH", "TH:th")
  ]);

  let all = batches.flatMap(r => r.status === "fulfilled" ? r.value : []);

  if (all.length < 4) {
    const gdelt = await Promise.allSettled([
      fetchGdelt(q),
      fetchGdelt("South Korea"),
      fetchGdelt("Thailand"),
      fetchGdelt("migrant worker Korea")
    ]);
    all = all.concat(gdelt.flatMap(r => r.status === "fulfilled" ? r.value : []));
  }

  const explicitLabor = /แรงงาน|วีซ่า|worker|visa|eps|e-9|e9|e-7|e7|ผีน้อย|แบล็ค|แบล็ก|blacklist/i.test(q);
  const isSpecificSearch = !/ข่าวเด่นวันนี้|ข่าววันนี้|ข่าวกระแส|ข่าวหน้าหนึ่ง|เรื่องเล่าเช้านี้/i.test(q);
  const maxAgeDays = explicitLabor || isSpecificSearch ? 30 : 3;

  const softFiltered = all.filter(item => {
    // Unknown date is not acceptable for daily news. It caused month-old articles to appear as "today".
    if (item.ageDays >= 999) return false;
    return item.ageDays <= maxAgeDays;
  });

  const rankedItems = uniqueItems(softFiltered)
    .sort((a, b) => score(b, explicitLabor) - score(a, explicitLabor));

  const items = thaiHeadlineOnly(rankedItems, maxAgeDays).slice(0, 5);

  return NextResponse.json(
    {
      query: q,
      count: items.length, triedSources: newsQueries,
      items,
      note: items.length
        ? "โหลดข่าวสำเร็จ พร้อม fallback หลายชั้น"
        : "โหลดข่าวไม่สำเร็จจากทุกแหล่งข่าว"
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
      }
    }
  );
}
