import { NextRequest, NextResponse } from 'next/server'
import {
  analyzeMessage,
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
} from '../../lib/companionDNA'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  message?: string
  memory?: AppMemoryInput
  recent?: ChatItem[]
  mode?: 'local' | 'api-light' | 'api-deep' | 'api-search' | string
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
    const event = analyzeMessage(message)
    const nextState = updateEmotionalState(baseState, event, dna, message)
    const nextEmotionalMemory = updateEmotionalMemory(appMemory.emotionalMemory || {}, event, message)
    const systemPrompt = buildSystemPrompt({
      dna,
      state: nextState,
      emotionalMemory: nextEmotionalMemory,
      appMemory,
      event,
    })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      const reply = fallbackHumanReply({ message, dna, state: nextState, event, appMemory })
      return json({
        reply,
        companionDNA: dna,
        emotionalState: nextState,
        emotionalMemory: nextEmotionalMemory,
        event,
        source: 'local-fallback-no-key',
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
        presence_penalty: 0.35,
        frequency_penalty: 0.35,
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const fallback = fallbackHumanReply({ message, dna, state: nextState, event, appMemory })
      return json({
        reply: fallback,
        companionDNA: dna,
        emotionalState: nextState,
        emotionalMemory: nextEmotionalMemory,
        event,
        source: 'local-fallback-api-error',
      })
    }

    const data = await res.json()
    let reply = cleanAssistantText(data?.choices?.[0]?.message?.content || '')

    if (!reply || looksRobotic(reply)) {
      reply = fallbackHumanReply({ message, dna, state: nextState, event, appMemory })
    }

    return json({
      reply,
      companionDNA: dna,
      emotionalState: nextState,
      emotionalMemory: nextEmotionalMemory,
      event,
      source: 'openai-human-core',
    })
  } catch (error) {
    return json({
      reply: 'เอ้า… ระบบสะดุดอีกแล้ว รอแป๊บนะ พิมพ์มาใหม่อีกทีได้ไหม',
      error: error instanceof Error ? error.message : 'unknown_error',
    }, 200)
  }
}
