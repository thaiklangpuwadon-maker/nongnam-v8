import { NextRequest, NextResponse } from 'next/server'
import {
  analyzeMessage,
  cleanAssistantText,
  defaultEmotionalState,
  ensureCompanionDNA,
  fallbackHumanReply,
  looksRobotic,
  updateEmotionalMemory,
  updateEmotionalState,
  type AppMemoryInput,
  type ChatItem,
} from '../../lib/companionDNA'
import {
  looksLikeImmersionBreak,
  makeHumanFallback,
  runHumanSignatureTree,
  updateMemorySilently,
  type ClientTime,
  type HumanGraphState,
} from '../../lib/humanWheel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  message?: string
  memory?: AppMemoryInput & Record<string, any>
  recent?: ChatItem[]
  mode?: 'local' | 'api-light' | 'api-deep' | 'api-search' | string
  eventHint?: string
  humanGraphState?: Partial<HumanGraphState>
  previousLastSeenAt?: string
  clientTime?: ClientTime
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function recentToOpenAI(recent: ChatItem[] = []) {
  return recent
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .slice(-8)
    .map(m => ({ role: m.role, content: m.text }))
}

function modelFromMode(mode?: string) {
  if (process.env.OPENAI_MODEL) return process.env.OPENAI_MODEL
  if (mode === 'api-deep' || mode === 'api-search') return 'gpt-4o-mini'
  return 'gpt-4o-mini'
}

function temperatureFromWheel(mode?: string, responseMode?: string) {
  if (responseMode === 'factual_calm') return 0.45
  if (mode === 'api-deep') return 0.86
  if (mode === 'api-search') return 0.55
  return 0.82
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body
    const message = String(body.message || '').trim()
    const appMemory = (body.memory || {}) as AppMemoryInput & Record<string, any>
    const recent = Array.isArray(body.recent) ? body.recent : []
    const mode = body.mode || 'api-light'

    if (!message) {
      return json({ reply: 'อือ… พี่ยังไม่ได้พิมพ์อะไรเลยนะ', meta: { ok: false } }, 200)
    }

    const dna = ensureCompanionDNA(appMemory)

    // Keep the previous engine alive for compatibility with page.tsx state.
    const baseState = appMemory.emotionalState || defaultEmotionalState(dna, appMemory)
    const event = analyzeMessage(message)
    const nextState = updateEmotionalState(baseState, event, dna, message)
    const nextEmotionalMemory = updateEmotionalMemory(appMemory.emotionalMemory || {}, event, message)

    const wheel = runHumanSignatureTree({
      userMessage: message,
      eventHint: body.eventHint,
      dna,
      memory: { ...appMemory, emotionalMemory: nextEmotionalMemory },
      humanGraphState: body.humanGraphState || appMemory.humanGraphState,
      previousLastSeenAt: body.previousLastSeenAt || appMemory.lastSeenAt,
      clientTime: body.clientTime,
      recent,
    })

    const silentMemory = updateMemorySilently({ ...appMemory, emotionalMemory: nextEmotionalMemory }, wheel, message)

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      const reply = makeHumanFallback(message, wheel)
      return json({
        reply,
        companionDNA: dna,
        emotionalState: nextState,
        emotionalMemory: nextEmotionalMemory,
        humanGraphState: wheel.updatedHumanGraphState,
        updatedHumanGraphState: wheel.updatedHumanGraphState,
        updatedMemory: silentMemory,
        event,
        eventTags: wheel.eventTags,
        worldMode: wheel.worldMode,
        responseModeUsed: wheel.responseWheel.responseMode,
        bodyStateUsed: wheel.bodyState.label,
        desireUsed: wheel.desireState.primaryDesire,
        lifeStatusText: wheel.lifeStatusText,
        updatedLastSeenAt: wheel.updatedLastSeenAt,
        source: 'local-human-signature-no-key',
      })
    }

    const systemPrompt = wheel.promptContext
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
        temperature: temperatureFromWheel(mode, wheel.responseWheel.responseMode),
        max_tokens: wheel.responseWheel.maxLengthHint === 'very_short' ? 90 : wheel.responseWheel.maxLengthHint === 'short' ? 140 : mode === 'api-deep' ? 420 : 240,
        presence_penalty: 0.42,
        frequency_penalty: 0.55,
      }),
      cache: 'no-store',
    })

    let reply = ''
    if (res.ok) {
      const data = await res.json()
      reply = cleanAssistantText(data?.choices?.[0]?.message?.content || '')
    }

    if (!reply || looksRobotic(reply) || looksLikeImmersionBreak(reply, wheel)) {
      reply = makeHumanFallback(message, wheel)
    }

    // One more safety pass. Do not let immersion-breaking words escape.
    if (looksLikeImmersionBreak(reply, wheel)) {
      const oldFallback = fallbackHumanReply({ message, dna, state: nextState, event, appMemory })
      reply = looksLikeImmersionBreak(oldFallback, wheel) ? makeHumanFallback(message, wheel) : oldFallback
    }

    return json({
      reply,
      companionDNA: dna,
      emotionalState: nextState,
      emotionalMemory: nextEmotionalMemory,
      humanGraphState: wheel.updatedHumanGraphState,
      updatedHumanGraphState: wheel.updatedHumanGraphState,
      updatedMemory: silentMemory,
      event,
      eventTags: wheel.eventTags,
      worldMode: wheel.worldMode,
      responseModeUsed: wheel.responseWheel.responseMode,
      bodyStateUsed: wheel.bodyState.label,
      desireUsed: wheel.desireState.primaryDesire,
      lifeStatusText: wheel.lifeStatusText,
      updatedLastSeenAt: wheel.updatedLastSeenAt,
      source: 'openai-human-signature-tree-v7-4',
    })
  } catch (error) {
    return json({
      reply: 'เอ้า… สะดุดอีกแล้วพี่แมน แป๊บนะ พิมพ์มาใหม่อีกรอบได้ไหม',
      error: error instanceof Error ? error.message : 'unknown_error',
      source: 'route-catch',
    }, 200)
  }
}
