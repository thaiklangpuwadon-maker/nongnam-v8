import { NextRequest, NextResponse } from 'next/server'
import {
  buildSystemPrompt,
  cleanAssistantText,
  defaultEmotionalState,
  ensureCompanionDNA,
  fallbackHumanReply,
  looksRobotic,
  updateEmotionalMemory,
  updateEmotionalState,
  type AppMemoryInput,
  type ChatItem,
  type EmotionalMemory,
  type EmotionalState,
} from '../../lib/companionDNA'
import {
  humanLocalReply,
  isRoboticPhrase,
  runHumanWheel,
  type ClientTime,
  type HumanGraphState,
  type HumanWheelMemory,
} from '../../lib/humanWheel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  message?: string
  memory?: AppMemoryInput
  recent?: ChatItem[]
  mode?: 'local' | 'api-light' | 'api-deep' | 'api-search' | string
  eventHint?: string
  humanGraphState?: HumanGraphState
  previousLastSeenAt?: string
  clientTime?: ClientTime
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
  if (mode === 'api-deep') return 0.86
  if (mode === 'api-search') return 0.55
  return 0.82
}

function maxTokensFromMode(mode?: string) {
  if (mode === 'api-deep') return 480
  if (mode === 'api-search') return 360
  return 280
}

function composeSystemPrompt(basePrompt: string, humanContext: string) {
  return `${basePrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[HUMAN LIFE ENGINE CONTEXT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${humanContext}

[FINAL OUTPUT RULE]
ตอบเฉพาะข้อความที่จะส่งให้ผู้ใช้เห็นเท่านั้น ห้ามอธิบายระบบ ห้ามบอก responseMode ห้ามบอกว่ากำลังหมุนวงล้อ ห้ามใช้ JSON ห้ามใช้หัวข้อยาว ๆ ถ้าไม่จำเป็น
`.trim()
}

function stripForbiddenDefault(reply: string) {
  let out = reply || ''
  const replacements: Array<[RegExp, string]> = [
    [/พักผ่อนเยอะ ๆ นะคะ/g, 'ไปนอนเถอะ เดี๋ยวน้ำก็ไปเหมือนกัน'],
    [/ดูแลตัวเองด้วยนะคะ/g, 'อย่าฝืนตัวเองมากนักล่ะ'],
    [/น้องน้ำเข้าใจพี่นะคะ/g, 'น้ำฟังอยู่นะ'],
    [/ถ้ามีอะไรให้ช่วยบอกได้เลย/g, 'พูดต่อได้ น้ำยังฟังอยู่'],
    [/น้ำจะพยายามจำให้ต่อเนื่อง/g, 'น้ำจะจำให้มันต่อกัน ไม่เปลี่ยนไปเปลี่ยนมา'],
    [/รับทราบค่ะ/g, 'อือ ได้'],
    [/ยินดีช่วยค่ะ/g, 'ได้ เดี๋ยวน้ำดูให้'],
  ]
  for (const [re, replacement] of replacements) out = out.replace(re, replacement)
  return out.trim()
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
    const baseState: EmotionalState = appMemory.emotionalState || defaultEmotionalState(dna, appMemory)
    const legacyEvent = (() => {
      try {
        // Keep the old emotional core alive for backward compatibility.
        // buildSystemPrompt still benefits from this event analysis.
        const mod = require('../../lib/companionDNA')
        return mod.analyzeMessage(message)
      } catch {
        return { intent: 'normal_chat', isFactual: false, isPersonal: true, emotionalShift: [], userTone: 'neutral', directive: 'คุยธรรมชาติ' }
      }
    })()
    const nextState = updateEmotionalState(baseState, legacyEvent, dna, message)
    const legacyMemory = updateEmotionalMemory(appMemory.emotionalMemory || {}, legacyEvent, message)

    const wheel = runHumanWheel({
      userMessage: message,
      eventHint: body.eventHint,
      dna,
      appMemory: { ...appMemory, emotionalState: nextState, emotionalMemory: legacyMemory },
      emotionalState: nextState,
      emotionalMemory: legacyMemory as EmotionalMemory | HumanWheelMemory,
      humanGraphState: body.humanGraphState || (legacyMemory as HumanWheelMemory).humanGraphState,
      previousLastSeenAt: body.previousLastSeenAt || legacyMemory.lastSeenAt,
      clientTime: body.clientTime,
      recent,
    })

    const basePrompt = buildSystemPrompt({
      dna,
      state: nextState,
      emotionalMemory: wheel.updatedMemory,
      appMemory,
      event: legacyEvent,
    })
    const systemPrompt = composeSystemPrompt(basePrompt, wheel.promptContext)

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || mode === 'local') {
      const reply = humanLocalReply({ message, dna, wheel, appMemory })
      return json({
        reply,
        companionDNA: dna,
        emotionalState: nextState,
        emotionalMemory: wheel.updatedMemory,
        updatedHumanGraphState: wheel.updatedGraph,
        updatedLastSeenAt: wheel.clientTime.iso,
        event: legacyEvent,
        eventTags: wheel.eventTags,
        responseModeUsed: wheel.responseWheel.responseMode,
        bodyStateUsed: wheel.bodyState.label,
        desireUsed: wheel.desireState.primaryDesire,
        lifeStatusText: wheel.lifeStatus.visibleText,
        lifeStatus: wheel.lifeStatus.status,
        realityMode: wheel.realityMode,
        source: 'local-human-life-no-key',
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
        max_tokens: maxTokensFromMode(mode),
        presence_penalty: 0.55,
        frequency_penalty: 0.65,
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const fallback = humanLocalReply({ message, dna, wheel, appMemory }) || fallbackHumanReply({ message, dna, state: nextState, event: legacyEvent, appMemory })
      return json({
        reply: fallback,
        companionDNA: dna,
        emotionalState: nextState,
        emotionalMemory: wheel.updatedMemory,
        updatedHumanGraphState: wheel.updatedGraph,
        updatedLastSeenAt: wheel.clientTime.iso,
        event: legacyEvent,
        eventTags: wheel.eventTags,
        responseModeUsed: wheel.responseWheel.responseMode,
        bodyStateUsed: wheel.bodyState.label,
        desireUsed: wheel.desireState.primaryDesire,
        lifeStatusText: wheel.lifeStatus.visibleText,
        lifeStatus: wheel.lifeStatus.status,
        realityMode: wheel.realityMode,
        source: 'local-human-life-api-error',
      })
    }

    const data = await res.json()
    let reply = cleanAssistantText(data?.choices?.[0]?.message?.content || '')
    reply = stripForbiddenDefault(reply)

    if (!reply || looksRobotic(reply) || isRoboticPhrase(reply)) {
      reply = humanLocalReply({ message, dna, wheel, appMemory })
    }

    return json({
      reply,
      companionDNA: dna,
      emotionalState: nextState,
      emotionalMemory: wheel.updatedMemory,
      updatedHumanGraphState: wheel.updatedGraph,
      updatedLastSeenAt: wheel.clientTime.iso,
      event: legacyEvent,
      eventTags: wheel.eventTags,
      responseModeUsed: wheel.responseWheel.responseMode,
      bodyStateUsed: wheel.bodyState.label,
      desireUsed: wheel.desireState.primaryDesire,
      lifeStatusText: wheel.lifeStatus.visibleText,
      lifeStatus: wheel.lifeStatus.status,
      realityMode: wheel.realityMode,
      source: 'openai-human-life-core',
    })
  } catch (error) {
    return json({
      reply: 'เอ้า… ระบบสะดุดอีกแล้ว รอแป๊บนะ พิมพ์มาใหม่อีกทีได้ไหม',
      error: error instanceof Error ? error.message : 'unknown_error',
    }, 200)
  }
}
