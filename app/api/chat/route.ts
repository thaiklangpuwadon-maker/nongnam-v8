import { NextRequest, NextResponse } from 'next/server'
import {
  cleanAssistantText,
  ensureCompanionDNA,
  type AppMemoryInput,
  type ChatItem,
} from '../../lib/companionDNA'
import {
  buildHumanPrompt,
  cleanOutput,
  isBadOutput,
  runMeaningHumanCore,
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

function makeRequestSalt() {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return c.randomUUID()
  return `${Date.now()}-${Math.random()}`
}

function safeRecent(recent: ChatItem[] = []) {
  const bad = /(AI|ปัญญาประดิษฐ์|ระบบ|prompt|memory|มโน|เรื่องสมมติ|จะจำไว้|ปฏิทินของเกาหลี|ต้องเช็กข้อมูลจริง|น้ำฟังอยู่นะ|ลึกกว่าที่เห็น|คำถามธรรมดา|มีอะไรให้ช่วย|รับทราบ|ยินดีช่วย|พี่พูดต่อได้เลย|ที่รัก)/i
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
    const requestSalt = makeRequestSalt()

    const result = runMeaningHumanCore({
      message,
      dna,
      appMemory,
      recent,
      clientTime: body.clientTime,
      humanGraphState: body.humanGraphState,
      requestSalt,
    })

    if (result.shouldUseLocalReply || mode === 'local') {
      return json({
        reply: result.fallbackReply,
        companionDNA: dna,
        updatedHumanGraphState: result.updatedHumanState,
        updatedLastSeenAt: result.updatedLastSeenAt,
        lifeStatusText: result.statusText,
        intent: result.intent,
        world: result.world,
        source: 'v9-meaning-local',
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return json({
        reply: result.fallbackReply,
        companionDNA: dna,
        updatedHumanGraphState: result.updatedHumanState,
        updatedLastSeenAt: result.updatedLastSeenAt,
        lifeStatusText: result.statusText,
        intent: result.intent,
        world: result.world,
        source: 'v9-meaning-no-key',
      })
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelFromMode(mode),
        messages: [
          { role: 'system', content: buildHumanPrompt(result) },
          ...safeRecent(recent),
          { role: 'user', content: message },
        ],
        temperature: mode === 'api-deep' ? 0.9 : 0.82,
        max_tokens: mode === 'api-deep' ? 360 : 180,
        presence_penalty: 0.35,
        frequency_penalty: 0.65,
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      return json({
        reply: result.fallbackReply,
        companionDNA: dna,
        updatedHumanGraphState: result.updatedHumanState,
        updatedLastSeenAt: result.updatedLastSeenAt,
        lifeStatusText: result.statusText,
        intent: result.intent,
        world: result.world,
        source: 'v9-meaning-api-fallback',
      })
    }

    const data = await res.json()
    let reply = cleanOutput(cleanAssistantText(data?.choices?.[0]?.message?.content || ''))

    if (isBadOutput(reply, result)) {
      reply = result.fallbackReply
    }

    return json({
      reply,
      companionDNA: dna,
      updatedHumanGraphState: result.updatedHumanState,
      updatedLastSeenAt: result.updatedLastSeenAt,
      lifeStatusText: result.statusText,
      intent: result.intent,
      world: result.world,
      source: 'v9-meaning-openai',
    })
  } catch (error) {
    return json({
      reply: 'เอ้า… สะดุดอีกแล้ว พี่พิมพ์มาใหม่ที น้ำตั้งหลักแป๊บนึง',
      error: error instanceof Error ? error.message : 'unknown_error',
    }, 200)
  }
}
