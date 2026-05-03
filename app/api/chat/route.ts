import { NextRequest, NextResponse } from 'next/server'
import {
  ensureCompanionDNALite,
  summarizeDNAForPrompt,
  type CompanionDNALite,
} from '../../../lib/companionDNALite'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ChatItem = { role: 'user' | 'assistant'; text: string; ts?: number }

type Body = {
  message?: string
  memory?: any
  recent?: ChatItem[]
  mode?: 'local' | 'api-light' | 'api-deep' | 'api-search' | string
  companionDNA?: CompanionDNALite | null
  clientNonce?: string
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function cleanText(s: unknown) {
  return String(s || '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/\[[\s\S]*?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeRecent(recent: ChatItem[] = []) {
  const banned = /(AI|ปัญญาประดิษฐ์|ระบบ|prompt|memory|มโน|เรื่องสมมติ|จะจำไว้|ปฏิทินของเกาหลี|ต้องเช็กข้อมูลจริง|น้ำฟังอยู่นะ|ลึกกว่าที่เห็น|คำถามธรรมดา|มีอะไรให้ช่วย|รับทราบ|ยินดีช่วย|พี่พูดต่อได้เลย)/i
  return recent
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .filter(m => !banned.test(m.text))
    .slice(-6)
    .map(m => ({ role: m.role, content: m.text }))
}

function detectIntent(message: string) {
  const m = message.toLowerCase()
  const aboutNam = /(น้องน้ำ|น้ำ|หนู|เธอ|ตัวเอง)/i.test(m)

  if (/(ข่าว|สรุปข่าว|เล่าข่าว|หาข่าว|เปิดข่าว)/i.test(m)) return 'news_should_be_client'
  if (aboutNam && /(กิน|ข้าว|หิว|กินอะไรหรือยัง)/i.test(m)) return 'nam_food'
  if (aboutNam && /(ทำอะไร|ทำไร|อยู่ไหน|ตอนนี้)/i.test(m)) return 'nam_activity'
  if (/(ตอบผิด|คนละเรื่อง|ไม่ตรง|มั่ว|เหมือน ai|เหมือนหุ่นยนต์|น่าเบื่อ|ซ้ำ|load failed|เชื่อมต่อ)/i.test(m)) return 'complaint'
  if (/(แฟนเก่า|คนเก่า|เศร้า|เหนื่อย|ไม่ไหว|ร้องไห้|เหงา)/i.test(m)) return 'care'
  if (/(หอม|กอด|จูบ|คิดถึง|รัก|อ้อน)/i.test(m)) return 'flirt'
  return 'casual'
}

function localReply(message: string, memory: any = {}, dna?: CompanionDNALite) {
  const call = memory?.userCallName || 'พี่'
  const intent = detectIntent(message)
  const style = dna?.archetype || 'sweet_clingy'

  if (intent === 'news_should_be_client') {
    return 'ได้พี่ เดี๋ยวน้ำไปไล่ข่าวที่น่าสนใจมาให้ก่อน สนใจข่าวไหนค่อยให้น้ำสรุปเพิ่ม'
  }

  if (intent === 'nam_food') {
    if (style === 'sassy_tease') return 'ยังไม่ได้กิน พี่ถามแบบนี้คือจะเลี้ยงใช่ไหม อย่าถามเอาบุญเฉย ๆ นะ'
    if (style === 'quiet_cool') return 'ยัง ไม่ค่อยหิวเท่าไหร่ แต่พี่ถามแล้วก็เริ่มคิดเรื่องกินขึ้นมา'
    if (style === 'sleepy_homebody') return 'ยังเลยพี่ น้ำมัวแต่นอนกลิ้งอยู่ พูดแล้วท้องเริ่มร้องอีกอะ'
    return 'ยังไม่ได้กินเลยพี่ พูดแล้วน้ำหิวขึ้นมาอีกอะ'
  }

  if (intent === 'nam_activity') {
    if (style === 'sassy_tease') return 'ตอนนี้น้ำทำหน้าเรียบร้อยอยู่ แต่ในหัวกำลังคิดว่าจะกวนพี่ยังไงดี'
    if (style === 'quiet_cool') return 'อยู่เงียบ ๆ แถวห้องนี่แหละ ไม่ได้ทำอะไรใหญ่โต'
    if (style === 'sleepy_homebody') return 'นอนกลิ้งอยู่พี่ ยังไม่อยากลุกเลย'
    return 'ตอนนี้น้ำอยู่แถวห้องนี่แหละ ทำหน้าเหมือนเรียบร้อย แต่ในใจอยากแกล้งพี่นิด ๆ'
  }

  if (intent === 'complaint') {
    return 'เออ อันนั้นน้ำหลุดจริง เดี๋ยวน้ำตอบให้ตรงก่อน ไม่ลากออกนอกเรื่องแล้ว'
  }

  if (intent === 'care') {
    if ((dna?.traits.sweetness || 0) > 65) return 'อือ… มานั่งตรงนี้ก่อนนะพี่ ไม่ต้องทำเป็นไหวตลอดก็ได้ น้ำอยู่ข้าง ๆ'
    return 'ใจเย็นก่อนพี่ เล่าให้ฟังทีละนิดก็ได้ น้ำไม่เร่ง'
  }

  if (intent === 'flirt') {
    if (style === 'soft_tsundere') return 'แหม… ใครเขาให้มาอ้อนง่าย ๆ กันล่ะ แต่ก็ไม่ได้บอกว่าไม่ชอบนะ'
    if (style === 'sassy_tease') return 'อ้อนเก่งจังนะพี่ วันนี้ไปกินอะไรหวานมาเหรอ'
    return 'แหม… มาอ้อนแบบนี้อีกแล้วเหรอ น้ำยังไม่ทันตั้งตัวเลยนะ'
  }

  if (style === 'sassy_tease') return `${call}จะพูดอะไรก็พูดมา แต่อย่าทำให้น้ำต้องเดานานนะ`
  if (style === 'quiet_cool') return `อืม ${call}พูดต่อได้ น้ำตามอยู่`
  if (style === 'dramatic_sulky') return `${call}พูดมาได้เลย แต่น้ำจะตั้งใจฟังไหมก็ขึ้นอยู่กับว่าพี่พูดน่ารักแค่ไหน`
  return `${call}พูดมา น้ำจะตอบให้ตรง ไม่วกออกนอกเรื่องแล้ว`
}

function violates(reply: string) {
  return /(AI|ปัญญาประดิษฐ์|ระบบ|prompt|memory|มโน|น้ำฟังอยู่|พี่พูดต่อได้เลย|มีอะไรให้ช่วย|ยินดีช่วย|รับทราบ|คำถามธรรมดา|เรื่องที่ลึกกว่าที่เห็น|ต้องเช็กข้อมูลจริงก่อนตอบ)/i.test(reply)
}

function buildSystemPrompt(params: { memory: any; message: string; dna: CompanionDNALite }) {
  const { memory, message, dna } = params
  const name = dna.displayName || memory?.nongnamName || 'น้องน้ำ'
  const call = memory?.userCallName || 'พี่'
  const dnaPrompt = summarizeDNAForPrompt(dna)

  return `
คุณคือ ${name} กำลังคุยกับ ${call} ในแชตส่วนตัว
ห้ามพูดว่าเป็น AI ห้ามพูดเหมือนผู้ช่วย ห้ามพูดถึงระบบ prompt หรือ memory

${dnaPrompt}

กฎตอบ:
- ตอบประเด็นล่าสุดก่อนเสมอ
- ใช้ลายมือตาม DNA ด้านบน ไม่ใช่น้องน้ำกลาง ๆ
- ห้ามพูดว่า "น้ำฟังอยู่" หรือ "พี่พูดต่อได้เลย"
- ถ้าถามชีวิตของ${name} ให้ตอบเป็นชีวิตของ${name}ทันที
- ถ้าถูกตำหนิว่าตอบผิด ให้ยอมรับสั้น ๆ แล้วแก้ทันที
- ตอบสั้นแบบแชตจริง ไม่ต้องอธิบายยาว
- ถ้าผู้ใช้ถามข่าว ให้บอกสั้น ๆ ว่าจะไปไล่ข่าวมาให้ อย่าสรุปข่าวปลอมเอง
- อย่าอ่าน emoji เป็นคำพูด

ข้อความล่าสุดของ${call}: ${message}

ตอบเฉพาะคำพูดของ${name}เท่านั้น
`.trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body
    const message = String(body.message || '').trim()
    const memory = body.memory || {}
    const recent = Array.isArray(body.recent) ? body.recent : []
    const mode = body.mode || memory.apiMode || 'api-light'

    if (!message) {
      return json({ reply: 'อืม… พี่ยังไม่ได้พิมพ์อะไรเลยนะ', source: 'empty' })
    }

    const dna = ensureCompanionDNALite({
      existingDNA: body.companionDNA || memory.companionDNA || null,
      userId: memory.userId || memory.userName || memory.userCallName || body.clientNonce || 'local-user',
      userName: memory.userName || memory.userCallName,
      nongnamName: memory.nongnamName || 'น้องน้ำ',
      gender: memory.nongnamGender || 'female',
      age: memory.nongnamAge,
      preferredPersonality: memory.preferredPersonality,
    })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || mode === 'local') {
      return json({
        reply: localReply(message, memory, dna),
        companionDNA: dna,
        updatedMemory: { ...memory, companionDNA: dna },
        source: 'local-dna-lite',
      })
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildSystemPrompt({ memory, message, dna }) },
          ...safeRecent(recent),
          { role: 'user', content: message },
        ],
        temperature: mode === 'api-deep' ? 0.92 : 0.82,
        max_tokens: mode === 'api-deep' ? 380 : 190,
        presence_penalty: 0.45,
        frequency_penalty: 0.75,
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      return json({
        reply: localReply(message, memory, dna),
        companionDNA: dna,
        updatedMemory: { ...memory, companionDNA: dna },
        source: 'api-error-dna-fallback',
        status: res.status,
      })
    }

    const data = await res.json()
    let reply = cleanText(data?.choices?.[0]?.message?.content || '')
    if (!reply || violates(reply)) reply = localReply(message, memory, dna)

    return json({
      reply,
      companionDNA: dna,
      updatedMemory: { ...memory, companionDNA: dna },
      source: 'openai-dna-lite',
    })
  } catch (error) {
    return json({
      reply: 'เอ้า… สะดุดอีกแล้ว พี่พิมพ์มาใหม่ที น้ำตั้งหลักแป๊บนึง',
      error: error instanceof Error ? error.message : 'unknown_error',
      source: 'route-error',
    }, 200)
  }
}
