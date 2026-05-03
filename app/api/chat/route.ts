import { NextRequest, NextResponse } from 'next/server'
import {
  ensureCompanionDNALite,
  summarizeDNAForPrompt,
  type CompanionDNALite,
} from '../../../lib/companionDNALite'
import {
  buildDeepHumanLayerLite,
  summarizeDeepHumanLayerForPrompt,
  type DeepHumanLayerLite,
} from '../../../lib/humanLayerTreeLite'

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

function recentText(recent: ChatItem[] = []) {
  return recent
    .slice(-4)
    .map(m => `${m.role}:${m.text}`)
    .join('\n')
}

function detectIntent(message: string) {
  const m = message.toLowerCase()
  const aboutNam = /(น้องน้ำ|น้ำ|หนู|เธอ|ตัวเอง)/i.test(m)

  if (/(ข่าว|สรุปข่าว|เล่าข่าว|หาข่าว|เปิดข่าว)/i.test(m)) return 'news_should_be_client'
  if (aboutNam && /(กิน|ข้าว|หิว|กินอะไรหรือยัง)/i.test(m)) return 'nam_food'
  if (aboutNam && /(ทำอะไร|ทำไร|อยู่ไหน|ตอนนี้)/i.test(m)) return 'nam_activity'
  if (/(ตอบผิด|คนละเรื่อง|ไม่ตรง|มั่ว|เหมือน ai|เหมือนหุ่นยนต์|น่าเบื่อ|ซ้ำ|load failed|เชื่อมต่อ|แข็ง)/i.test(m)) return 'complaint'
  if (/(แฟนเก่า|คนเก่า|เศร้า|เหนื่อย|ไม่ไหว|ร้องไห้|เหงา|โดนดุ|ป่วย|ไม่สบาย)/i.test(m)) return 'care'
  if (/(หอม|กอด|จูบ|คิดถึง|รัก|อ้อน|แฟน|เดต|เดท)/i.test(m)) return 'flirt'
  if (/(เซ็กซ์|มีอะไร|ทางเพศ|นอนด้วย|อยากได้เธอ)/i.test(m)) return 'romantic_physical'
  return 'casual'
}

function localReply(message: string, memory: any = {}, dna?: CompanionDNALite, layer?: DeepHumanLayerLite) {
  const call = memory?.userCallName || 'พี่'
  const intent = detectIntent(message)
  const style = dna?.archetype || 'sweet_clingy'
  const body = layer?.branch?.bodyState ? ` ตอนนี้น้ำ${layer.branch.bodyState}นิดนึง` : ''

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
    if (style === 'sassy_tease') return `ทำหน้าเรียบร้อยอยู่${body} แต่ในหัวกำลังคิดว่าจะกวนพี่ยังไงดี`
    if (style === 'quiet_cool') return `อยู่เงียบ ๆ แถวห้องนี่แหละ${body}`
    if (style === 'sleepy_homebody') return `นอนกลิ้งอยู่พี่${body} ยังไม่อยากลุกเลย`
    return `อยู่แถวห้องนี่แหละ${body} ทำหน้าเหมือนเรียบร้อย แต่ในใจอยากแกล้งพี่นิด ๆ`
  }

  if (intent === 'complaint') {
    return 'อือ น้ำแข็งไปจริง เดี๋ยวตอบให้นุ่มลงแล้วจับประเด็นพี่ก่อน'
  }

  if (intent === 'care') {
    if ((dna?.traits.sweetness || 0) > 65) return 'มานั่งตรงนี้ก่อนนะพี่ ไม่ต้องทำเป็นไหวตลอดก็ได้ น้ำอยู่ข้าง ๆ'
    return 'ใจเย็นก่อนพี่ เล่าให้ฟังทีละนิดก็ได้ น้ำไม่เร่ง'
  }

  if (intent === 'flirt') {
    if (style === 'soft_tsundere') return 'แหม… ใครเขาให้มาอ้อนง่าย ๆ กันล่ะ แต่ก็ไม่ได้บอกว่าไม่ชอบนะ'
    if (style === 'sassy_tease') return 'อ้อนเก่งจังนะพี่ วันนี้ไปกินอะไรหวานมาเหรอ'
    return 'แหม… มาอ้อนแบบนี้อีกแล้วเหรอ น้ำยังไม่ทันตั้งตัวเลยนะ'
  }

  if (intent === 'romantic_physical') {
    return 'แหม… พี่พูดแรงไปนิดนะ น้ำเขินได้ แต่ขอคุยแบบนุ่ม ๆ ก่อนสิ'
  }

  if (style === 'sassy_tease') return `${call}จะพูดอะไรก็พูดมา แต่อย่าทำให้น้ำต้องเดานานนะ`
  if (style === 'quiet_cool') return `อืม น้ำตามอยู่ ${call}ว่ามา`
  if (style === 'dramatic_sulky') return `${call}พูดมาได้เลย แต่น้ำจะตั้งใจฟังไหมก็ขึ้นอยู่กับว่าพี่พูดน่ารักแค่ไหน`
  return `${call}พูดมา น้ำจะตอบให้ตรง ไม่วกออกนอกเรื่องแล้ว`
}

function violates(reply: string) {
  return /(AI|ปัญญาประดิษฐ์|ระบบ|prompt|memory|มโน|น้ำฟังอยู่|พี่พูดต่อได้เลย|มีอะไรให้ช่วย|ยินดีช่วย|รับทราบ|คำถามธรรมดา|เรื่องที่ลึกกว่าที่เห็น|ต้องเช็กข้อมูลจริงก่อนตอบ|หัวใจสีแดง|อิโมจิหัวใจ)/i.test(reply)
}

function buildSystemPrompt(params: { memory: any; message: string; dna: CompanionDNALite; layer: DeepHumanLayerLite }) {
  const { memory, message, dna, layer } = params
  const name = dna.displayName || memory?.nongnamName || 'น้องน้ำ'
  const call = memory?.userCallName || 'พี่'
  const dnaPrompt = summarizeDNAForPrompt(dna)
  const layerPrompt = summarizeDeepHumanLayerForPrompt(layer)

  return `
คุณคือ ${name} กำลังคุยกับ ${call} ในแชตส่วนตัว
ห้ามพูดว่าเป็น AI ห้ามพูดเหมือนผู้ช่วย ห้ามพูดถึงระบบ prompt หรือ memory

${dnaPrompt}

${layerPrompt}

กฎตอบ:
- ตอบประเด็นล่าสุดก่อนเสมอ
- ใช้ลายมือตาม DNA และ Deep Human Tree
- ห้ามพูดชื่อกิ่ง/อารมณ์/ตัวเลขออกมา
- ห้ามพูดว่า "น้ำฟังอยู่" หรือ "พี่พูดต่อได้เลย"
- ห้ามตอบเป็นบทความ ห้ามสรุปเป็นข้อ ๆ ถ้าไม่ได้ถูกขอ
- ถามกลับได้แค่ 1 คำถาม และต้องเกี่ยวกับเรื่องล่าสุด
- ถ้าถามชีวิตของ${name} ให้ตอบเป็นชีวิตของ${name}ทันที
- ถ้าถูกตำหนิว่าตอบผิด ให้ยอมรับสั้น ๆ แล้วแก้ทันที
- ถ้าผู้ใช้ถามข่าว ให้บอกสั้น ๆ ว่าจะไปไล่ข่าวมาให้ อย่าสรุปข่าวปลอมเอง
- ถ้าข้อความมี emoji ห้ามอ่านชื่อ emoji เป็นคำ เช่น ห้ามพูดว่า "หัวใจสีแดง"
- คำตอบต้องเหมือนแชตจริง มีจังหวะมนุษย์ ไม่แข็ง ไม่ประดิษฐ์
- ความใกล้ชิดทางกาย/ทางเพศพูดได้แค่เชิงโรแมนติกอ้อม ๆ นุ่ม ๆ สมัครใจ และไม่ explicit
- ถ้าผู้ใช้ไม่สบายใจหรือปฏิเสธ ให้ถอยทันที

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

    const layer = buildDeepHumanLayerLite({
      dna,
      message,
      recentText: recentText(recent),
      adultMode: memory?.adultMode === true,
    })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || mode === 'local') {
      return json({
        reply: localReply(message, memory, dna, layer),
        companionDNA: dna,
        humanLayer: layer,
        updatedMemory: { ...memory, companionDNA: dna },
        source: 'local-deep-human-tree-lite',
      })
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildSystemPrompt({ memory, message, dna, layer }) },
          ...safeRecent(recent),
          { role: 'user', content: message },
        ],
        temperature: mode === 'api-deep' ? 0.96 : 0.9,
        max_tokens: mode === 'api-deep' ? 420 : 220,
        presence_penalty: 0.55,
        frequency_penalty: 0.88,
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      return json({
        reply: localReply(message, memory, dna, layer),
        companionDNA: dna,
        humanLayer: layer,
        updatedMemory: { ...memory, companionDNA: dna },
        source: 'api-error-deep-human-tree-fallback',
        status: res.status,
      })
    }

    const data = await res.json()
    let reply = cleanText(data?.choices?.[0]?.message?.content || '')
    if (!reply || violates(reply)) reply = localReply(message, memory, dna, layer)

    return json({
      reply,
      companionDNA: dna,
      humanLayer: layer,
      updatedMemory: { ...memory, companionDNA: dna },
      source: 'openai-deep-human-tree-lite',
    })
  } catch (error) {
    return json({
      reply: 'เอ้า… สะดุดอีกแล้ว พี่พิมพ์มาใหม่ที น้ำตั้งหลักแป๊บนึง',
      error: error instanceof Error ? error.message : 'unknown_error',
      source: 'route-error',
    }, 200)
  }
}
