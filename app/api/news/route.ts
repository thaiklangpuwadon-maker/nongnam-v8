import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// v8.9: 5 หมวด + alt URLs + debug + force-pad ให้มีข่าวทุกหมวด
type Category = 'thai_hot' | 'thai_latest' | 'world' | 'korea' | 'workers'

// v8.9: เพิ่ม URL สำรอง (alt) — ถ้าตัวหลัก fail ลอง alt
const FEEDS: { name: string; url: string; alt?: string; pool: 'thai' | 'korea' | 'world' }[] = [
  // 🇹🇭 ข่าวไทย
  { name: 'ข่าวสด', url: 'https://www.khaosod.co.th/feed', pool: 'thai' },
  { name: 'มติชน', url: 'https://www.matichon.co.th/feed', pool: 'thai' },
  { name: 'ไทยรัฐ', url: 'https://www.thairath.co.th/rss/news', pool: 'thai' },
  { name: 'ไทยโพสต์', url: 'https://www.thaipost.net/feed', pool: 'thai' },
  { name: 'PPTV', url: 'https://www.pptvhd36.com/news/feed', pool: 'thai' },
  { name: 'Thai PBS', url: 'https://news.thaipbs.or.th/rss/news', pool: 'thai' },
  { name: 'ผู้จัดการ', url: 'https://mgronline.com/rss/onlinesection', pool: 'thai' },
  { name: 'ประชาชาติ', url: 'https://www.prachachat.net/feed', pool: 'thai' },
  // 🇰🇷 ข่าวเกาหลีภาษาไทย
  { name: 'KBS World Thai', url: 'http://world.kbs.co.kr/rss/rss_news.htm?lang=t&id=Po', pool: 'korea' },
  { name: 'KBS World Cu', url: 'http://world.kbs.co.kr/rss/rss_news.htm?lang=t&id=Cu', pool: 'korea' },
  // 🌏 ข่าวโลก ภาษาไทย
  { name: 'BBC Thai', url: 'https://feeds.bbci.co.uk/thai/rss.xml', pool: 'world' },
  { name: 'BBC Thai (alt)', url: 'http://feeds.bbci.co.uk/thai/rss.xml', pool: 'world' },
]

const NEWS_CACHE = new Map<string, { items: NewsItemOut[]; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

type RssItem = { title: string; link: string; pubDate: string; description: string; imageUrl?: string }

type NewsItemOut = {
  title: string
  source: string
  link: string
  published: string
  summary: string
  category: Category
  ageDays: number
  ageMs: number
  updatedAtText: string
  imageUrl?: string
  hotScore?: number
  alsoIn?: string[]
}

const TH_STOPWORDS = new Set([
  'การ', 'ที่', 'เป็น', 'ของ', 'และ', 'ใน', 'จาก', 'กับ', 'ให้', 'ได้', 'มี', 'ไม่', 'ก็', 'จะ',
  'แต่', 'หรือ', 'ว่า', 'นี้', 'นั้น', 'มา', 'ไป', 'อยู่', 'แล้ว', 'ครับ', 'ค่ะ', 'นะ', 'ด้วย',
  'อย่าง', 'มาก', 'น้อย', 'พบ', 'เผย', 'ระบุ', 'หลัง', 'ถูก', 'ทำ', 'ใช้', 'อีก', 'ยัง', 'แค่',
  'พา', 'ขึ้น', 'ลง', 'เพื่อ', 'เพราะ', 'ทุก', 'ตาม', 'ผ่าน', 'ครั้ง', 'ก่อน', 'ใหญ่', 'เล็ก',
])

function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]
    const title = extractTag(itemXml, 'title')
    const link = extractTag(itemXml, 'link')
    const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'dc:date') || ''
    const description = extractTag(itemXml, 'description') || extractTag(itemXml, 'content:encoded') || ''
    const imageUrl = extractImageUrl(itemXml, description)
    if (title && link) {
      items.push({
        title: cleanText(title),
        link: link.trim(),
        pubDate,
        description: cleanText(description).slice(0, 280),
        imageUrl,
      })
    }
    if (items.length >= 25) break
  }
  return items
}

function extractImageUrl(itemXml: string, description: string): string | undefined {
  const thumbMatch = itemXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i)
  if (thumbMatch) return thumbMatch[1]
  const mediaMatch = itemXml.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i)
  if (mediaMatch) return mediaMatch[1]
  const enclosureMatch = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i)
  if (enclosureMatch) return enclosureMatch[1]
  const fullContent = itemXml + description
  const imgMatch = fullContent.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (imgMatch) return imgMatch[1]
  const urlMatch = description.match(/https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|webp)/i)
  if (urlMatch) return urlMatch[0]
  return undefined
}

function extractTag(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i')
  const cdata = xml.match(cdataRe)
  if (cdata) return cdata[1]
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = xml.match(re)
  if (m) return m[1]
  return ''
}

function cleanText(s: string): string {
  return String(s || '')
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// v8.9: ใช้ headers แบบ browser จริงๆ + fallback ลอง alt URL
async function fetchFeed(feed: typeof FEEDS[0]): Promise<{ source: string; pool: 'thai' | 'korea' | 'world'; items: RssItem[]; status: number; error?: string }> {
  const urls = feed.alt ? [feed.url, feed.alt] : [feed.url]
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*;q=0.8',
          'Accept-Language': 'th-TH,th;q=0.9,en;q=0.5',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      })
      if (!res.ok) continue
      const xml = await res.text()
      const items = parseRssXml(xml)
      if (items.length > 0) {
        return { source: feed.name, pool: feed.pool, items, status: res.status }
      }
    } catch (e: any) {
      // try next URL
    }
  }
  return { source: feed.name, pool: feed.pool, items: [], status: 0, error: 'all urls failed' }
}

function extractTitleKeywords(title: string): string[] {
  const words: string[] = []
  const thaiMatches = title.match(/[\u0E00-\u0E7F]{3,}/g) || []
  for (const w of thaiMatches) {
    if (!TH_STOPWORDS.has(w) && w.length >= 3) words.push(w.toLowerCase())
  }
  const enMatches = title.match(/[A-Za-z]{3,}/g) || []
  for (const w of enMatches) words.push(w.toLowerCase())
  const numMatches = title.match(/\d{2,}/g) || []
  for (const n of numMatches) words.push(n)
  return [...new Set(words)]
}

function computeOverlap(words1: string[], words2: string[]): number {
  const set1 = new Set(words1)
  let overlap = 0
  for (const w of words2) if (set1.has(w)) overlap++
  return overlap
}

type ItemWithKeywords = {
  title: string
  source: string
  link: string
  published: string
  summary: string
  pool: 'thai' | 'korea' | 'world'
  ageDays: number
  ageMs: number
  keywords: string[]
  imageUrl?: string
}

function clusterHotNews(items: ItemWithKeywords[]) {
  const clusters: { rep: ItemWithKeywords; matched: ItemWithKeywords[]; sources: Set<string> }[] = []
  const used = new Set<number>()
  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue
    const cluster = { rep: items[i], matched: [items[i]], sources: new Set([items[i].source]) }
    used.add(i)
    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue
      if (items[i].source === items[j].source) continue
      const overlap = computeOverlap(items[i].keywords, items[j].keywords)
      if (overlap >= 2) {
        cluster.matched.push(items[j])
        cluster.sources.add(items[j].source)
        used.add(j)
      }
    }
    clusters.push(cluster)
  }
  return clusters
    .map(c => ({ representative: c.rep, count: c.sources.size, sources: Array.from(c.sources) }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.representative.ageMs - b.representative.ageMs
    })
}

function isWorkersNews(title: string, summary: string): boolean {
  const text = `${title} ${summary}`.toLowerCase()
  return /(แรงงาน|วีซ่า|e-9|e9|eps|ผีน้อย|แบล็คลิสต์|แบล็กลิสต์|กวาดล้าง|โควตา|คนไทยในเกาหลี|คนไทยต่างประเทศ|คนไทยต่างแดน|ลูกจ้าง|จัดส่งแรงงาน|ตรวจคนเข้าเมือง|ผู้พำนัก|พำนักผิดกฎหมาย|จัดหาแรงงาน|แรงงานต่างด้าว|คนต่างชาติ|workers|migrant|สถานทูต|กงสุล)/i.test(text)
}

function humanizeAge(ms: number): string {
  if (!ms || ms < 0) return ''
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ชม.ที่แล้ว`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} วันที่แล้ว`
  return `${Math.floor(days / 7)} สัปดาห์ก่อน`
}

function parseDate(s: string): number {
  if (!s) return 0
  const d = new Date(s)
  if (isNaN(d.getTime())) return 0
  return d.getTime()
}

export async function GET(req: NextRequest) {
  const debugMode = req.nextUrl.searchParams.get('debug') === '1'
  try {
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get('q') || '').trim().toLowerCase()
    const requestedCategory = searchParams.get('category') as Category | null
    const isHotNews = !query || query === 'ข่าวเด่นวันนี้' || query.includes('ข่าวเด่น') || query.includes('ข่าวฮอต')
    const noCache = searchParams.get('nocache') === '1'

    const cacheKey = `v89|${requestedCategory || 'all'}|${query}`
    const cached = NEWS_CACHE.get(cacheKey)
    if (!noCache && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json({
        ok: true,
        query,
        items: cached.items,
        groupedByCategory: groupByCategory(cached.items),
        cached: true,
        source: 'cache-v8.9',
      })
    }

    const allResults = await Promise.all(FEEDS.map(fetchFeed))
    const debugInfo = allResults.map(r => ({
      source: r.source,
      pool: r.pool,
      itemsCount: r.items.length,
      status: r.status,
      error: r.error || null,
    }))

    const now = Date.now()
    let allItems: ItemWithKeywords[] = []
    for (const r of allResults) {
      for (const item of r.items) {
        const pubMs = parseDate(item.pubDate)
        const ageMs = pubMs ? Math.max(0, now - pubMs) : Number.MAX_SAFE_INTEGER
        const ageDays = pubMs ? Math.floor(ageMs / 86400000) : 999
        if (item.title.length < 8) continue
        if (ageDays >= 7) continue
        if (/(บทความ|รีวิว|โปรโมชั่น|advertorial|ดวง|เลขเด็ด|หวย|เลขดัง)/i.test(item.title)) continue
        allItems.push({
          title: item.title,
          source: r.source,
          link: item.link,
          published: item.pubDate,
          summary: item.description,
          pool: r.pool,
          ageDays,
          ageMs,
          keywords: extractTitleKeywords(item.title),
          imageUrl: item.imageUrl,
        })
      }
    }

    if (allItems.length === 0) {
      return NextResponse.json({
        ok: false,
        items: [],
        error: 'ดึงข่าวไม่ได้',
        debug: debugInfo,
      })
    }

    const thaiItems = allItems.filter(i => i.pool === 'thai')
    const koreaItems = allItems.filter(i => i.pool === 'korea')
    const worldItems = allItems.filter(i => i.pool === 'world')

    // ===== HOT THAI =====
    const thaiClusters = clusterHotNews(thaiItems)
    const hotClusters = thaiClusters.filter(c => c.count >= 2)
    const fallbackClusters = thaiClusters.filter(c => c.count < 2 && c.representative.ageMs < 12 * 3600 * 1000)
    const topThaiHot = hotClusters.length >= 3
      ? hotClusters.slice(0, 3)
      : [...hotClusters, ...fallbackClusters].slice(0, 3)

    const thaiHotItems: NewsItemOut[] = topThaiHot.map(c => ({
      title: c.representative.title,
      source: c.representative.source,
      link: c.representative.link,
      published: c.representative.published,
      summary: c.representative.summary,
      category: 'thai_hot',
      ageDays: c.representative.ageDays,
      ageMs: c.representative.ageMs,
      updatedAtText: humanizeAge(c.representative.ageMs),
      imageUrl: c.representative.imageUrl,
      hotScore: c.count,
      alsoIn: c.sources.filter(s => s !== c.representative.source),
    }))

    const usedLinks = new Set(thaiHotItems.map(i => i.link))
    const usedTitles = new Set(thaiHotItems.map(i => i.title.toLowerCase().slice(0, 40)))

    // ===== THAI LATEST =====
    const thaiLatestItems: NewsItemOut[] = thaiItems
      .filter(i => !usedLinks.has(i.link) && !usedTitles.has(i.title.toLowerCase().slice(0, 40)))
      .filter(i => !isWorkersNews(i.title, i.summary))
      .sort((a, b) => a.ageMs - b.ageMs)
      .slice(0, 2)
      .map(i => ({
        title: i.title,
        source: i.source,
        link: i.link,
        published: i.published,
        summary: i.summary,
        category: 'thai_latest' as Category,
        ageDays: i.ageDays,
        ageMs: i.ageMs,
        updatedAtText: humanizeAge(i.ageMs),
        imageUrl: i.imageUrl,
      }))
    thaiLatestItems.forEach(i => { usedLinks.add(i.link); usedTitles.add(i.title.toLowerCase().slice(0, 40)) })

    // ===== WORLD =====
    const worldItemsOut: NewsItemOut[] = worldItems
      .sort((a, b) => a.ageMs - b.ageMs)
      .slice(0, 3)
      .map(i => ({
        title: i.title,
        source: i.source,
        link: i.link,
        published: i.published,
        summary: i.summary,
        category: 'world' as Category,
        ageDays: i.ageDays,
        ageMs: i.ageMs,
        updatedAtText: humanizeAge(i.ageMs),
        imageUrl: i.imageUrl,
      }))

    // ===== KOREA =====
    const koreaItemsOut: NewsItemOut[] = koreaItems
      .filter(i => !isWorkersNews(i.title, i.summary))
      .sort((a, b) => a.ageMs - b.ageMs)
      .slice(0, 3)
      .map(i => ({
        title: i.title,
        source: i.source,
        link: i.link,
        published: i.published,
        summary: i.summary,
        category: 'korea' as Category,
        ageDays: i.ageDays,
        ageMs: i.ageMs,
        updatedAtText: humanizeAge(i.ageMs),
        imageUrl: i.imageUrl,
      }))

    // ===== WORKERS =====
    const workersItemsOut: NewsItemOut[] = allItems
      .filter(i => isWorkersNews(i.title, i.summary))
      .filter(i => !usedLinks.has(i.link))
      .sort((a, b) => a.ageMs - b.ageMs)
      .slice(0, 3)
      .map(i => ({
        title: i.title,
        source: i.source,
        link: i.link,
        published: i.published,
        summary: i.summary,
        category: 'workers' as Category,
        ageDays: i.ageDays,
        ageMs: i.ageMs,
        updatedAtText: humanizeAge(i.ageMs),
        imageUrl: i.imageUrl,
      }))

    const finalItems: NewsItemOut[] = [
      ...thaiHotItems,
      ...thaiLatestItems,
      ...worldItemsOut,
      ...koreaItemsOut,
      ...workersItemsOut,
    ]

    let queryItems: NewsItemOut[] = []
    if (!isHotNews && query) {
      const keywords = query.split(/\s+/).filter(w => w.length > 1 && !['ข่าว','หา','ขอ'].includes(w))
      queryItems = allItems
        .filter(i => keywords.some(kw =>
          i.title.toLowerCase().includes(kw) || i.summary.toLowerCase().includes(kw)
        ))
        .slice(0, 8)
        .map(i => ({
          title: i.title,
          source: i.source,
          link: i.link,
          published: i.published,
          summary: i.summary,
          category: 'thai_hot' as Category,
          ageDays: i.ageDays,
          ageMs: i.ageMs,
          updatedAtText: humanizeAge(i.ageMs),
          imageUrl: i.imageUrl,
        }))
    }

    const output = isHotNews ? finalItems : queryItems

    NEWS_CACHE.set(cacheKey, { items: output, ts: Date.now() })

    const response: any = {
      ok: true,
      query,
      count: output.length,
      items: output,
      groupedByCategory: groupByCategory(output),
      cached: false,
      source: 'rss-hotscore-v8.9',
      categoryCounts: {
        thai_hot: thaiHotItems.length,
        thai_latest: thaiLatestItems.length,
        world: worldItemsOut.length,
        korea: koreaItemsOut.length,
        workers: workersItemsOut.length,
      },
    }
    if (debugMode) {
      response.debug = debugInfo
      response.poolCounts = {
        thai: thaiItems.length,
        korea: koreaItems.length,
        world: worldItems.length,
      }
    }

    return NextResponse.json(response)
  } catch (e: any) {
    return NextResponse.json({ ok: false, items: [], error: e?.message || 'unknown' })
  }
}

function groupByCategory(items: NewsItemOut[]): Record<Category, NewsItemOut[]> {
  const groups: Record<Category, NewsItemOut[]> = {
    thai_hot: [], thai_latest: [], world: [], korea: [], workers: [],
  }
  for (const item of items) groups[item.category].push(item)
  return groups
}
