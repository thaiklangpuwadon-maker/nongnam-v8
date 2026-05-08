import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SummarizeRequest = {
  title: string
  source?: string
  link?: string
  summary?: string  // teaser/snippet จาก RSS
  category?: string
  publishedText?: string
}

/**
 * /api/news-summarize
 *
 * รับ news item → สรุปเป็นภาษาไทยล้วน 3-5 ประโยค
 * เน้นเข้าใจเนื้อหา ไม่ยืดยาว แต่ครบใจความ
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as SummarizeRequest
    const title = String(body.title || '').trim()
    const teaser = String(body.summary || '').trim()
    const source = String(body.source || '').trim()
    const publishedText = String(body.publishedText || '').trim()

    if (!title) {
      return NextResponse.json({
        summary: 'อืม... ข่าวนี้น้ำไม่เห็นข้อมูลเลยอะ',
        source: 'no-title',
      })
    }

    // ===== Try fetch full article content =====
    let articleText = teaser
    if (body.link) {
      try {
        const articleRes = await fetch(body.link, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NongNamBot/1.0)',
          },
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        })
        if (articleRes.ok) {
          const html = await articleRes.text()
          const extracted = extractArticleText(html)
          if (extracted && extracted.length > teaser.length) {
            articleText = extracted.slice(0, 4000) // จำกัด 4000 chars
          }
        }
      } catch {
        // fail silently — ใช้ teaser แทน
      }
    }

    // ===== Call OpenAI to summarize =====
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        summary: `${title}\n\n(โดย ${source})\n\n${teaser || 'ยังไม่ได้ตั้ง API key — น้ำเลยสรุปไม่ได้อะ'}`,
        source: 'no-api-key',
      })
    }

    const systemPrompt = `คุณคือ "น้องน้ำ" — สาวไทยที่กำลังเล่าข่าวให้แฟนฟัง
เล่าข่าวเป็นภาษาไทยล้วน 100% ห้ามใส่ภาษาอังกฤษ จีน เกาหลี หรือภาษาอื่นเด็ดขาด
(ยกเว้นชื่อเฉพาะที่จำเป็น เช่น TOPIK, EPS, E-9 ที่แปลไม่ได้ ใช้ได้สั้นๆ)

กฎสำคัญ:
1. สรุปเป็น 3-5 ประโยค **เข้าใจง่าย ครบใจความ**
2. เริ่มต้นด้วยใจความหลัก ไม่อ้อมค้อม
3. ใช้ภาษาแบบเล่าให้เพื่อนฟัง — ไม่ใช่ภาษาข่าว/ราชการ
4. ห้ามแต่งข้อมูลเพิ่ม — ใช้แค่เนื้อหาที่ได้รับ
5. ถ้าข้อมูลไม่พอ ให้บอกตรงๆ ว่า "รายละเอียดมีนิดเดียว แต่หลักๆ คือ..."
6. ห้ามขึ้นต้นด้วย "ขอสรุปข่าวให้ฟัง" หรือ "ข่าวนี้คือ" — เริ่มเลย
7. ความยาว 80-180 ตัวอักษร

ห้ามใช้คำเหล่านี้: AI, ระบบ, ในฐานะ, ขออภัย, ผู้ช่วย, สวัสดีค่ะ`

    const userPrompt = `หัวข้อ: ${title}
แหล่ง: ${source}
${publishedText ? `เผยแพร่: ${publishedText}` : ''}

เนื้อหา:
${articleText || teaser || '(ไม่มีเนื้อหาเพิ่มเติม)'}

สรุปสั้นๆ ให้ฟังหน่อย`

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 280,
        presence_penalty: 0.4,
        frequency_penalty: 0.6,
      }),
      cache: 'no-store',
    })

    if (!r.ok) {
      const data = await r.json().catch(() => ({}))
      return NextResponse.json({
        summary: `${teaser || title}\n\n(จาก ${source})\n\n— น้ำสรุปเพิ่มไม่ได้ตอนนี้ ลองอ่านลิ้งก์เต็มดู`,
        source: 'openai-error',
        error: (data as any)?.error?.message,
      })
    }

    const data = await r.json()
    let summary = String(data?.choices?.[0]?.message?.content || '').trim()

    // sanitize: ลบภาษาต่างประเทศ
    summary = sanitizeForeignLang(summary)

    if (!summary || summary.length < 30) {
      summary = `${teaser || title}\n\n(จาก ${source}) — ลองกดอ่านเต็มได้ที่ลิ้งก์`
    }

    return NextResponse.json({
      summary,
      title,
      source: source,
      link: body.link || '',
      publishedText,
      origin: 'openai-summarize-v1',
    })
  } catch (err: any) {
    return NextResponse.json({
      summary: 'เอ๊า… น้ำเช็คข่าวสะดุดอะ ลองอีกทีนะ',
      source: 'server-error',
      error: err?.message,
    })
  }
}

/**
 * extractArticleText — ดึงเนื้อหาจาก HTML แบบง่าย
 */
function extractArticleText(html: string): string {
  // ลบ scripts, styles, comments
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')

  // Try to find <article> tag first
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i)
  if (articleMatch) {
    cleaned = articleMatch[0]
  } else {
    // Try main / .content
    const mainMatch = cleaned.match(/<main[\s\S]*?<\/main>/i)
    if (mainMatch) cleaned = mainMatch[0]
  }

  // Strip all tags
  const text = cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

  return text
}

/**
 * sanitizeForeignLang — ลบ/แทน ข้อความภาษาต่างประเทศ
 */
function sanitizeForeignLang(text: string): string {
  return text
    // ลบประโยคยาวๆ ที่เป็นภาษาเกาหลี/จีน/ญี่ปุ่น
    .replace(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]+\s*[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\s]{3,}/g, ' ')
    // ลบช่วงตัวอักษรอังกฤษยาว 4+ คำติดกัน (น่าจะหลุดมาเป็นภาษาอังกฤษ)
    .replace(/(?:[a-zA-Z]+\s+){4,}[a-zA-Z]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["']|["']$/g, '')
    .trim()
}
