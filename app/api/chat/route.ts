import { NextRequest, NextResponse } from 'next/server'
import {
  analyzeMessage,
  buildSystemPrompt,
  cleanAssistantText,
  defaultEmotionalState,
  ensureCompanionDNA,
  looksRobotic,
  updateEmotionalMemory,
  updateEmotionalState,
  type AppMemoryInput,
  type ChatItem,
} from '../../lib/companionDNA'
import {
  cleanHumanReply,
  fallbackFromLeaf,
  replyBreaksImmersion,
  runHumanWheel,
  type ClientTime,
  type HumanGraphState,
  type LifeTimeline,
} from '../../lib/humanWheel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  message?: string
  memory?: AppMemoryInput
  recent?: ChatItem[]
  mode?: 'local' | 'api-light' | 'api-deep' | 'api-search' | string
  clientTime?: ClientTime
  humanGraphState?: HumanGraphState | null
  lifeTimeline?: LifeTimeline | null
  previousLastSeenAt?: string | null
  eventHint?: string | null
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function recentToOpenAI(recent: ChatItem[] = []) {
  return recent
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .slice(-10)
    .map(m => ({ role: m.role, content: m.text }))
}

function modelFromMode(mode?: string) {
  if (process.env.OPENAI_MODEL) return process.env.OPENAI_MODEL
  if (mode === 'api-deep' || mode === 'api-search') return 'gpt-4o-mini'
  return 'gpt-4o-mini'
}

function temperatureFromMode(mode?: string) {
  if (mode === 'api-deep') return 0.92
  if (mode === 'api-search') return 0.65
  return 0.88
}

function buildExternalFactReply(message: string, wheel: ReturnType<typeof runHumanWheel>) {
  const m = message.toLowerCase()
  if (/อากาศ|ฝน|หนาว|ร้อน/.test(m)) {
    return 'พี่อยู่แถวไหนอะ เดี๋ยวน้ำเช็กให้ตรงพื้นที่เลย ไม่อยากเดาแล้วพี่แต่งตัวผิด'
  }
  if (/วันนี้วันที่เท่าไหร่|วันนี้วันอะไร/.test(m)) {
    const now = wheel.updatedLastSeenAt ? new Date(wheel.updatedLastSeenAt) : new Date()
    if (!Number.isNaN(now.getTime())) {
      const day = now.toLocaleDateString('th-TH', { dateStyle: 'full', timeZone: 'Asia/Seoul' })
      return `วันนี้ ${day} นะพี่`
    }
  }
  if (/วันหยุด|ปฏิทิน|ราชการ|เกาหลี.*หยุด/.test(m)) {
    return 'อันนี้เป็นข้อมูลจริงนะพี่ น้ำขอเช็กปฏิทินให้ชัวร์ก่อน ไม่อยากตอบมั่วแล้วพี่เอาไปใช้ผิด'
  }
  if (/ข่าว/.test(m)) {
    return 'ข่าวเป็นข้อมูลจริงนะพี่ เดี๋ยวน้ำต้องดึงจากแหล่งข่าวก่อน จะได้ไม่เล่าเพี้ยน'
  }
  return ''
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
    const baseState = appMemory.emotionalState || defaultEmotionalState(dna, appMemory)
    const oldEvent = analyzeMessage(message)
    const nextState = updateEmotionalState(baseState, oldEvent, dna, message)
    const nextEmotionalMemory = updateEmotionalMemory(appMemory.emotionalMemory || {}, oldEvent, message)

    const wheel = runHumanWheel({
      message,
      dna,
      appMemory,
      recent,
      clientTime: body.clientTime,
      humanGraphState: body.humanGraphState,
      lifeTimeline: body.lifeTimeline,
      previousLastSeenAt: body.previousLastSeenAt,
      eventHint: body.eventHint,
    })

    const baseSystemPrompt = buildSystemPrompt({
      dna,
      state: nextState,
      emotionalMemory: nextEmotionalMemory,
      appMemory,
      event: oldEvent,
    })

    const systemPrompt = `${baseSystemPrompt}

${wheel.promptAddon}

[FINAL GUARD]
The Human Signature Tree is the deciding layer. If older instructions conflict, follow WORLD ROUTER and HUMAN SIGNATURE TREE.
Do not mention AI/system/memory/prompt/fiction/simulation.
If this is about Nong Nam's own life, answer as lived experience.
If this is real external data, be careful and natural.
`

    const apiKey = process.env.OPENAI_API_KEY
    const forcedFact = wheel.worldMode === 'external_fact' ? buildExternalFactReply(message, wheel) : ''

    if (!apiKey || mode === 'local') {
      const reply = forcedFact || fallbackFromLeaf({ message, result: wheel, appMemory })
      return json({
        reply,
        companionDNA: dna,
        emotionalState: nextState,
        emotionalMemory: nextEmotionalMemory,
        updatedHumanGraphState: wheel.updatedHumanGraphState,
        updatedLifeTimeline: wheel.updatedLifeTimeline,
        updatedLastSeenAt: wheel.updatedLastSeenAt,
        eventTags: wheel.eventTags,
        worldMode: wheel.worldMode,
        responseModeUsed: wheel.responseModeUsed,
        bodyStateUsed: wheel.bodyStateUsed,
        desireUsed: wheel.desireUsed,
        lifeStatusText: wheel.lifeStatusText,
        source: apiKey ? 'local-human-tree' : 'local-fallback-no-key',
      })
    }

    const openAIMessages = [
      { role: 'system', content: systemPrompt },
      ...recentToOpenAI(recent),
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
        messages: openAIMessages,
        temperature: temperatureFromMode(mode),
        max_tokens: mode === 'api-deep' ? 420 : 260,
        presence_penalty: 0.45,
        frequency_penalty: 0.55,
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const fallback = forcedFact || fallbackFromLeaf({ message, result: wheel, appMemory })
      return json({
        reply: fallback,
        companionDNA: dna,
        emotionalState: nextState,
        emotionalMemory: nextEmotionalMemory,
        updatedHumanGraphState: wheel.updatedHumanGraphState,
        updatedLifeTimeline: wheel.updatedLifeTimeline,
        updatedLastSeenAt: wheel.updatedLastSeenAt,
        eventTags: wheel.eventTags,
        worldMode: wheel.worldMode,
        responseModeUsed: wheel.responseModeUsed,
        bodyStateUsed: wheel.bodyStateUsed,
        desireUsed: wheel.desireUsed,
        lifeStatusText: wheel.lifeStatusText,
        source: 'local-fallback-api-error',
      })
    }

    const data = await res.json()
    let reply = cleanHumanReply(cleanAssistantText(data?.choices?.[0]?.message?.content || ''))

    if (forcedFact) {
      // For real external fact questions, prefer deterministic safe response until a real tool/API is connected.
      reply = forcedFact
    }

    if (!reply || looksRobotic(reply) || replyBreaksImmersion(reply, wheel)) {
      reply = forcedFact || fallbackFromLeaf({ message, result: wheel, appMemory })
    }

    return json({
      reply,
      companionDNA: dna,
      emotionalState: nextState,
      emotionalMemory: nextEmotionalMemory,
      updatedHumanGraphState: wheel.updatedHumanGraphState,
      updatedLifeTimeline: wheel.updatedLifeTimeline,
      updatedLastSeenAt: wheel.updatedLastSeenAt,
      eventTags: wheel.eventTags,
      worldMode: wheel.worldMode,
      responseModeUsed: wheel.responseModeUsed,
      bodyStateUsed: wheel.bodyStateUsed,
      desireUsed: wheel.desireUsed,
      lifeStatusText: wheel.lifeStatusText,
      source: 'openai-human-signature-tree-v7.6',
    })
  } catch (error) {
    return json({
      reply: 'เอ้า… สะดุดอีกแล้ว พี่พิมพ์มาใหม่ที น้ำตั้งหลักแป๊บนึง',
      error: error instanceof Error ? error.message : 'unknown_error',
    }, 200)
  }
}
