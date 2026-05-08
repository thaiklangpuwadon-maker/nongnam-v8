import { NextRequest, NextResponse } from 'next/server'
import Parser from 'rss-parser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// v8.6: ใช้ RSS feed สำนักข่าวไทย — รวดเร็ว ฟรี ไม่จำกัด rate
const FEEDS = [
  // สำนักข่าวไทยหลัก
  { name: 'ข่าวสด', url: 'https://www.khaosod.co.th/feed', tags: ['ทั่วไป'] },
  { name: 'มติชน', url: 'https://www.matichon.co.th/feed', tags: ['ทั่วไป', 'การเมือง'] },
  { name: 'ไทยโพสต์', url: 'https://www.thaipost.net/feed', tags: ['ทั่วไป', 'การเมือง'] },
  { name: 'ไทยรัฐ', url: 'https://www.thairath.co.th/rss/news', tags: ['ทั่วไป'] },
  { name: 'PPTV HD36', url: 'https://www.pptvhd36.com/news/feed', tags: ['ทั่วไป'] },
  { name: 'Thai PBS', url: 'https://news.thaipbs.or.th/rss/news', tags: ['ทั่วไป'] },
  // เกาหลีในไทย (สำหรับแรงงาน/ผู้สนใจเกาหลี)
  { name: 'KBS World Thai', url: 'http://world.kbs.co.kr/rss/rss_news.htm?lang=t&id=Po', tags: ['เกาหลี'] },
]

const parser = new Parser({
  timeout: 8000,
  customFields: {
    item: ['description', 'category'],
  },
})

type NewsItemOut = {
  title: string
  source: string
  link: string
  published: string
  summary: string
  category: string
  ageDays: number
  updatedAtText: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = (searchParams.get('q') || '').trim().toLowerCase()
    const isHotNews = !query || query === 'ข่าวเด่นวันนี้' || query.includes('ข่าวเด่น')

    // ดึงทุก feeds พร้อมๆ กัน
    const allResults = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        try {
          const result = await parser.parseURL(feed.url)
          return result.items.slice(0, 15).map((item: any) => ({
            title: cleanText(item.title || ''),
            source: feed.name,
            link: item.link || '',
            published: item.pubDate || item.isoDate || '',
            summary: cleanText(item.contentSnippet || item.description || '').slice(0, 280),
            category: feed.tags[0] || 'ทั่วไป',
            tags: feed.tags,
          }))
        } catch (e) {
          return []
        }
      })
    )

    let allNews = allResults
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)

    if (allNews.length === 0) {
      return NextResponse.json({
        ok: false,
        items: [],
        error: 'ดึงข่าวไม่ได้ ลองใหม่',
      })
    }

    // คำนวณอายุข่าว + ตัวอักษรเวลา
    const now = Date.now()
    const enriched: NewsItemOut[] = allNews.map(item => {
      const pubMs = parseDate(item.published)
      const ageDays = pubMs ? Math.max(0, Math.floor((now - pubMs) / 86400000)) : 999
      return {
        title: item.title,
        source: item.source,
        link: item.link,
        published: item.published,
        summary: item.summary,
        category: item.category,
        ageDays,
        updatedAtText: humanizeAge(now - (pubMs || 0)),
      }
    })

    // Filter & rank
    let filtered: NewsItemOut[] = enriched
      .filter(item => item.title.length > 8)
      .filter(item => item.ageDays < 7) // ไม่เกิน 7 วัน

    // ถ้าเป็นข่าวเด่น → กรองคำที่ไม่ใช่ข่าวจริง
    if (isHotNews) {
      filtered = filtered.filter(item =>
        !/(บทความ|รีวิว|โปรโมชั่น|advertorial|ดวง|เลขเด็ด|หวย)/i.test(item.title)
      )
    }

    // ถ้ามี query เฉพาะ → filter ตามคำ
    if (!isHotNews && query) {
      const keywords = extractKeywords(query)
      const scored = filtered.map(item => ({
        item,
        score: scoreMatch(item, keywords),
      }))
      filtered = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(s => s.item)
    } else {
      // ข่าวเด่น → เรียงตามใหม่สุด
      filtered.sort((a, b) => a.ageDays - b.ageDays)
    }

    // Dedupe by title
    const seen = new Set<string>()
    const deduped = filtered.filter(item => {
      const key = item.title.toLowerCase().slice(0, 50)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({
      ok: true,
      query,
      count: deduped.length,
      items: deduped.slice(0, 12),
      source: 'rss-multi-thai-v8.6',
    })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      items: [],
      error: e?.message || 'unknown',
    })
  }
}

function cleanText(s: string): string {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseDate(s: string): number {
  if (!s) return 0
  const d = new Date(s)
  if (isNaN(d.getTime())) return 0
  return d.getTime()
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

function extractKeywords(query: string): string[] {
  const stopwords = ['ข่าว', 'หา', 'ขอ', 'ดู', 'ฟัง', 'อ่าน', 'น้องน้ำ', 'น้ำ', 'หนู', 'พี่', 'ที', 'ให้', 'หน่อย', 'นะ', 'ค่ะ', 'ครับ']
  return query
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1 && !stopwords.includes(w))
}

function scoreMatch(item: NewsItemOut, keywords: string[]): number {
  if (keywords.length === 0) return 0
  let score = 0
  const text = `${item.title} ${item.summary}`.toLowerCase()
  for (const kw of keywords) {
    if (item.title.toLowerCase().includes(kw)) score += 10
    if (text.includes(kw)) score += 3
    // alias mapping
    if (kw === 'แรงงาน' && /(eps|e-9|e9|วีซ่า|ผีน้อย|ลูกจ้าง)/i.test(text)) score += 5
    if (kw === 'เกาหลี' && /(โซล|ปูซาน|kbs|samsung|hyundai|kpop)/i.test(text)) score += 5
  }
  // recency boost
  if (item.ageDays === 0) score += 8
  else if (item.ageDays === 1) score += 4
  else if (item.ageDays === 2) score += 2
  return score
}
