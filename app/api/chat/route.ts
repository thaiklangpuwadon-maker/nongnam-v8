import { NextRequest, NextResponse } from 'next/server'
import {
  cleanAssistantText,
  ensureCompanionDNA,
  type AppMemoryInput,
  type ChatItem,
} from '../../lib/companionDNA'
import {
  badHumanOutput,
  buildSlimHumanPrompt,
  cleanOutput,
  runCleanHumanCore,
  type HumanState,
} from '../../lib/humanWheel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  message?: string
  memory?: AppMemoryInput
  recent?: ChatItem[]
  mode?: 'local' | 'api-light' | 'api-deep' | 'api-search' | string
  clientTime?: {
    iso?: string
    timezone?: string
    localHour?: number
    localMinute?: number
    dayOfWeek?: number
  }
  humanGraphState?: Partial<HumanState> | null
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function safeRecent(recent: ChatItem[] = []) {
  const bad = /(AI|ปัญญาประดิษฐ์|ระบบ|prompt|memory|มโนไม่ได้|เรื่องสมมติ|จะจำไว้|ปฏิทินของเกาหลี|ต้องเช็กข้อมูลจริง|ไม่ควรเดาเอง|น้ำฟังอยู่นะ|ลึกกว่าที่เห็น|คำถามธรรมดา|มีอะไรให้ช่วย|รับทราบ|ยินดีช่วย)/i
  return recent
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .filter(m => !bad.test(m.text))
    .slice(-6)
    .map(m => ({ role: m.role, content: m.text }))
}

function modelFromMode(mode?: string) {
  if (process.env.OPENAI_MODEL) return process.env.OPENAI_MODEL
  return 'gpt-4o-mini'
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body
    const message = String(body.message || '').trim()
    const appMemory = (body.memory || {}) as AppMemoryInput
    const recent = Array.isArray(body.recent) ? body.recent : []
    const mode = body.mode || 'api-light'

    if (!message) {
      return json({ reply: 'อืม… พี่ยังไม่ได้พิมพ์อะไรเลยนะ', meta: { ok: false } }, 200)
    }

    const dna = ensureCompanionDNA(appMemory)

    const core = runCleanHumanCore({
      message,
      dna,
      appMemory,
      recent,
      clientTime: body.clientTime,
      humanGraphState: body.humanGraphState,
    })

    // สำหรับโลกที่เคยพังบ่อย ให้ใช้คำตอบ local ทันที ไม่ให้โมเดลตีความเอง
    if (core.shouldUseLocalReply || mode === 'local') {
      return json({
        reply: core.fallbackReply,
        companionDNA: dna,
        updatedHumanGraphState: core.updatedHumanState,
        updatedLastSeenAt: core.updatedLastSeenAt,
        lifeStatusText: core.statusText,
        world: core.world,
        source: 'v8-clean-human-local',
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return json({
        reply: core.fallbackReply,
        companionDNA: dna,
        updatedHumanGraphState: core.updatedHumanState,
        updatedLastSeenAt: core.updatedLastSeenAt,
        lifeStatusText: core.statusText,
        world: core.world,
        source: 'v8-clean-human-no-key',
      })
    }

    const messages = [
      { role: 'system', content: buildSlimHumanPrompt(core) },
      ...safeRecent(recent),
      { role: 'user', content: message },
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelFromMode(mode),
        messages,
        temperature: mode === 'api-deep' ? 0.9 : 0.82,
        max_tokens: mode === 'api-deep' ? 360 : 180,
        presence_penalty: 0.35,
        frequency_penalty: 0.65,
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      return json({
        reply: core.fallbackReply,
        companionDNA: dna,
        updatedHumanGraphState: core.updatedHumanState,
        updatedLastSeenAt: core.updatedLastSeenAt,
        lifeStatusText: core.statusText,
        world: core.world,
        source: 'v8-clean-human-api-fallback',
      })
    }

    const data = await res.json()
    let reply = cleanOutput(cleanAssistantText(data?.choices?.[0]?.message?.content || ''))

    if (badHumanOutput(reply, core)) {
      reply = core.fallbackReply
    }

    return json({
      reply,
      companionDNA: dna,
      updatedHumanGraphState: core.updatedHumanState,
      updatedLastSeenAt: core.updatedLastSeenAt,
      lifeStatusText: core.statusText,
      world: core.world,
      source: 'v8-clean-human-openai',
    })
  } catch (error) {
    return json({
      reply: 'เอ้า… สะดุดอีกแล้ว พี่พิมพ์มาใหม่ที น้ำตั้งหลักแป๊บนึง',
      error: error instanceof Error ? error.message : 'unknown_error',
    }, 200)
  }
}
