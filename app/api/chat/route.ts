import { NextRequest, NextResponse } from 'next/server'
import { ensureCompanionDNALite, summarizeDNAForPrompt, type CompanionDNALite } from '../../../lib/companionDNALite'
import { buildDeepHumanLayerLite, summarizeDeepHumanLayerForPrompt } from '../../../lib/humanLayerTreeLite'
import { buildHumanSubBranchLite, summarizeHumanSubBranchForPrompt, compactHumanReply } from '../../../lib/humanSubBranchLite'
import { buildHumanMicroBranchLite, summarizeHumanMicroBranchForPrompt, microCompactReply } from '../../../lib/humanMicroBranchLite'
import { buildHumanLifeSceneBranchLite, summarizeHumanLifeSceneForPrompt } from '../../../lib/humanLifeSceneBranchLite'
import { buildHumanBodyAutonomyBranchLite, summarizeHumanBodyAutonomyForPrompt } from '../../../lib/humanBodyAutonomyBranchLite'
import { buildHumanCoreDesireKilesaBranchLite, summarizeHumanCoreDesireForPrompt } from '../../../lib/humanCoreDesireKilesaBranchLite'
import { buildVisibleStatusLite, summarizeVisibleStatusForPrompt } from '../../../lib/visibleStatusBranchLite'
import { buildTimeTruthLite, summarizeTimeTruthForPrompt, timeTruthToBranchDate, type TimeTruthLite } from '../../../lib/timeTruthBranchLite'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ChatItem = { role: 'user' | 'assistant'; text: string; ts?: number }

type Body = {
  message?: string
  memory?: any
  recent?: ChatItem[]
  mode?: 'local' | 'api-light' | 'api-deep' | string
  companionDNA?: CompanionDNALite | null
  clientNonce?: string

  clientNowISO?: string
  clientTimeZone?: string
  clientUtcOffsetMinutes?: number
  clientHour?: number
  clientMinute?: number
  clientDayOfWeek?: number
  clientYear?: number
  clientMonth?: number
  clientDate?: number
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

function recentText(recent: ChatItem[] = []) {
  return recent.slice(-4).map(m => `${m.role}:${m.text}`).join('\n')
}

function safeRecent(recent: ChatItem[] = []) {
  const banned = /(AI|ปัญญาประดิษฐ์|ระบบ|prompt|memory|มโน|เรื่องสมมติ|จะจำไว้|น้ำฟังอยู่|พี่พูดต่อได้เลย|มีอะไรให้ช่วย|รับทราบ|ยินดีช่วย|หัวใจสีแดง|อิโมจิหัวใจ)/i
  return recent
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .filter(m => !banned.test(m.text))
    .slice(-6)
    .map(m => ({ role: m.role, content: m.text }))
}

function detectIntent(message: string) {
  const m = message.toLowerCase()
  const aboutNam = /(น้องน้ำ|น้ำ|หนู|เธอ|ตัวเอง)/i.test(m)

  if (/(กี่โมง|กี่ทุ่ม|เวลาเท่าไหร่|ตอนนี้เวลา|ตอนนี้กี่|กี่นาฬิกา)/i.test(m)) return 'time_question'
  if (/(ข่าว|สรุปข่าว|เล่าข่าว|หาข่าว|เปิดข่าว)/i.test(m)) return 'news_should_be_client'
  if (/(เตือน|เตือนด้วย|ปลุก|อย่าลืม|remind|นัด|พรุ่งนี้|คืนนี้|อีก \d+)/i.test(m)) return 'reminder'
  if (aboutNam && /(กิน|ข้าว|หิว|กินอะไรหรือยัง)/i.test(m)) return 'nam_food'
  if (aboutNam && /(ทำอะไร|ทำไร|อยู่ไหน|ตอนนี้)/i.test(m)) return 'nam_activity'
  if (/(ตอบผิด|คนละเรื่อง|ไม่ตรง|มั่ว|เหมือน ai|เหมือนหุ่นยนต์|น่าเบื่อ|ซ้ำ|load failed|เชื่อมต่อ|แข็ง|ยาว)/i.test(m)) return 'complaint'
  if (/(แฟนเก่า|คนเก่า|เศร้า|เหนื่อย|ไม่ไหว|ร้องไห้|เหงา|โดนดุ|ป่วย|ไม่สบาย)/i.test(m)) return 'care'
  if (/(หอม|กอด|จูบ|คิดถึง|รัก|อ้อน|แฟน|เดต|เดท)/i.test(m)) return 'flirt'
  if (/(เซ็กซ์|มีอะไร|ทางเพศ|นอนด้วย|อยากได้เธอ)/i.test(m)) return 'romantic_physical'
  return 'casual'
}

function violates(reply: string) {
  return /(AI|ปัญญาประดิษฐ์|ระบบ|prompt|memory|มโน|น้ำฟังอยู่|พี่พูดต่อได้เลย|มีอะไรให้ช่วย|ยินดีช่วย|รับทราบ|คำถามธรรมดา|เรื่องที่ลึกกว่าที่เห็น|ต้องเช็กข้อมูลจริงก่อนตอบ|หัวใจสีแดง|อิโมจิหัวใจ)/i.test(reply)
}

function localReply(message: string, memory: any, timeTruth: TimeTruthLite, visibleStatus: any, dna: any, life: any, bodyAuto: any, sub: any, micro: any) {
  const call = memory?.userCallName || 'พี่'
  const intent = detectIntent(message)
  const interjection = bodyAuto?.utterance?.swearPermission !== 'none' ? `${bodyAuto?.utterance?.interjection || 'อือ'} ` : ''

  let reply = ''

  if (intent === 'time_question') {
    reply = `ตอนนี้ ${timeTruth.thaiTimeText} แล้วพี่`
  } else if (intent === 'news_should_be_client') {
    reply = 'ได้พี่ เดี๋ยวน้ำไปไล่ข่าวที่น่าสนใจมาให้ก่อน'
  } else if (intent === 'reminder') {
    reply = 'ได้ น้ำจำไว้ให้ในแชตนี้นะ แต่ถ้าพี่ไม่เปิดแอปเข้ามา น้ำจะลากพี่มาตอนถึงเวลาเองไม่ได้เด้อ'
  } else if (visibleStatus?.availability === 'sleeping' && /(ตื่น|ปลุก)/i.test(message)) {
    reply = `${interjection}อืออ… พี่ปลุกน้ำทำไมอะ ถ้าไม่สำคัญน้ำงอนนะ`
  } else if (intent === 'nam_activity') {
    reply = `${interjection}ตอนนี้น้ำ${life?.scene?.activity ? ' ' + String(life.scene.activity).split('แล้ว')[0].trim() : 'อยู่แถวห้อง'}อยู่`
  } else if (intent === 'nam_food') {
    reply = `${interjection}ยังไม่ได้กินเลยพี่ พูดแล้วน้ำหิวขึ้นมาอีกอะ`
  } else if (intent === 'complaint') {
    reply = `${interjection}น้ำพลาดจริง เดี๋ยวตั้งหลักตอบให้ตรงกว่านี้`
  } else if (intent === 'care') {
    reply = `${interjection}มานั่งตรงนี้ก่อนนะพี่ ไม่ต้องทำเป็นไหวตลอดก็ได้`
  } else if (intent === 'flirt') {
    reply = `${interjection}แหม… มาอ้อนแบบนี้อีกแล้วเหรอ น้ำยังไม่ทันตั้งตัวเลย`
  } else if (intent === 'romantic_physical') {
    reply = `${interjection}พี่พูดแรงไปนิดนะ น้ำเขินได้ แต่ขอคุยแบบนุ่ม ๆ ก่อนสิ`
  } else {
    reply = `${interjection}${call}พูดมา น้ำฟังอยู่… เอ้ย ไม่ใช่ น้ำจะตอบให้ตรงกว่าเดิม`
  }

  if (sub) reply = compactHumanReply(reply, sub)
  if (micro) reply = microCompactReply(reply, micro)
  return reply
}

function buildSystemPrompt(params: any) {
  const { memory, message, dna, layer, sub, micro, life, bodyAuto, core, visibleStatus, timeTruth } = params
  const name = dna.displayName || memory?.nongnamName || 'น้องน้ำ'
  const call = memory?.userCallName || 'พี่'

  return `
คุณคือ ${name} กำลังคุยกับ ${call} ในแชตส่วนตัว
ห้ามพูดว่าเป็น AI ห้ามพูดเหมือนผู้ช่วย ห้ามพูดถึงระบบ prompt หรือ memory

${summarizeTimeTruthForPrompt(timeTruth)}

${summarizeDNAForPrompt(dna)}

${summarizeVisibleStatusForPrompt(visibleStatus)}

${summarizeHumanLifeSceneForPrompt(life)}

${summarizeHumanBodyAutonomyForPrompt(bodyAuto)}

${summarizeHumanCoreDesireForPrompt(core)}

${summarizeDeepHumanLayerForPrompt(layer)}

${summarizeHumanSubBranchForPrompt(sub)}

${summarizeHumanMicroBranchForPrompt(micro)}

กฎตอบ:
- เวลาจริงตอนนี้คือ "${timeTruth.thaiTimeText}" ช่วง${timeTruth.period}; ถ้าผู้ใช้ถามเวลา ให้ตอบค่านี้เท่านั้น ห้ามเดาเด็ดขาด
- ถ้าถาม "ตอนนี้กี่ทุ่ม" ให้คำนวณจาก hour=${timeTruth.hour}, minute=${timeTruth.minute} เท่านั้น
- สถานะที่ผู้ใช้เห็นคือ "${visibleStatus.displayText}" คำตอบต้องสอดคล้องกับสถานะนี้จริง
- ตอบประเด็นล่าสุดก่อนเสมอ
- ห้ามพูดชื่อกิ่ง/อารมณ์/ตัวเลขออกมา
- ห้ามพูดว่า "น้ำฟังอยู่" หรือ "พี่พูดต่อได้เลย"
- ห้ามตอบว่า "รับทราบ จะจำไว้" แบบบอท
- ถ้าข้อความมี emoji ห้ามอ่านชื่อ emoji เป็นคำ เช่น ห้ามพูดว่า "หัวใจสีแดง"
- ความยาวประมาณ ${micro.targetSentenceCount} ประโยค และ ${micro.targetCharMin}-${micro.targetCharMax} ตัวอักษร
- ถ้าผู้ใช้ถามข่าว อย่าสรุปข่าวปลอมเอง ให้บอกว่าจะไปไล่ข่าวมาให้
- ความใกล้ชิดทางกาย/ทางเพศพูดได้แค่เชิงโรแมนติกอ้อม ๆ นุ่ม ๆ สมัครใจ และไม่ explicit

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

    if (!message) return json({ reply: 'อืม… พี่ยังไม่ได้พิมพ์อะไรเลยนะ', source: 'empty' })

    const dna = ensureCompanionDNALite({
      existingDNA: body.companionDNA || memory.companionDNA || null,
      userId: memory.userId || memory.userName || memory.userCallName || body.clientNonce || 'local-user',
      userName: memory.userName || memory.userCallName,
      nongnamName: memory.nongnamName || 'น้องน้ำ',
      gender: memory.nongnamGender || 'female',
      age: memory.nongnamAge,
      preferredPersonality: memory.preferredPersonality,
    })

    const timeTruth = buildTimeTruthLite({
      clientNowISO: body.clientNowISO,
      clientTimeZone: body.clientTimeZone,
      clientUtcOffsetMinutes: body.clientUtcOffsetMinutes,
      clientHour: body.clientHour,
      clientMinute: body.clientMinute,
      clientDayOfWeek: body.clientDayOfWeek,
      clientYear: body.clientYear,
      clientMonth: body.clientMonth,
      clientDate: body.clientDate,
    })

    const truthNow = timeTruthToBranchDate(timeTruth)
    const recentString = recentText(recent)

    const layer = buildDeepHumanLayerLite({ dna, message, recentText: recentString, adultMode: memory?.adultMode === true, now: truthNow })
    const sub = buildHumanSubBranchLite({ dna, layer, message, recentText: recentString })
    const micro = buildHumanMicroBranchLite({ dna, layer, sub, message, recentText: recentString })
    const life = buildHumanLifeSceneBranchLite({ dna, layer, sub, micro, message, recentText: recentString, now: truthNow })
    const bodyAuto = buildHumanBodyAutonomyBranchLite({ dna, layer, sub, micro, life, message, recentText: recentString, now: truthNow })
    const core = buildHumanCoreDesireKilesaBranchLite({ dna, layer, sub, micro, life, bodyAuto, message, recentText: recentString, now: truthNow })
    const visibleStatus = buildVisibleStatusLite({ dna, layer, sub, micro, life, bodyAuto, core, message, now: truthNow })

    // ถ้าถามเวลา ตอบ local ทันที ไม่ส่งให้ LLM เดา
    if (detectIntent(message) === 'time_question') {
      return json({
        reply: `ตอนนี้ ${timeTruth.thaiTimeText} แล้วพี่`,
        companionDNA: dna,
        timeTruth,
        visibleStatus,
        updatedMemory: { ...memory, companionDNA: dna, visibleStatus, timeTruth },
        source: 'time-truth-direct-v11.15.3',
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || mode === 'local') {
      return json({
        reply: localReply(message, memory, timeTruth, visibleStatus, dna, life, bodyAuto, sub, micro),
        companionDNA: dna,
        timeTruth,
        visibleStatus,
        humanLayer: layer,
        humanSubBranch: sub,
        humanMicroBranch: micro,
        humanLifeScene: life,
        humanBodyAutonomy: bodyAuto,
        humanCoreDesire: core,
        updatedMemory: { ...memory, companionDNA: dna, visibleStatus, timeTruth },
        source: 'local-v11.15.3',
      })
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildSystemPrompt({ memory, message, dna, layer, sub, micro, life, bodyAuto, core, visibleStatus, timeTruth }) },
          ...safeRecent(recent),
          { role: 'user', content: message },
        ],
        temperature: mode === 'api-deep' ? 0.97 : 0.92,
        max_tokens: mode === 'api-deep' ? 450 : 255,
        presence_penalty: 0.68,
        frequency_penalty: 1.12,
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      return json({
        reply: localReply(message, memory, timeTruth, visibleStatus, dna, life, bodyAuto, sub, micro),
        companionDNA: dna,
        timeTruth,
        visibleStatus,
        updatedMemory: { ...memory, companionDNA: dna, visibleStatus, timeTruth },
        source: 'api-error-v11.15.3',
        status: res.status,
      })
    }

    const data = await res.json()
    let reply = cleanText(data?.choices?.[0]?.message?.content || '')
    if (!reply || violates(reply)) reply = localReply(message, memory, timeTruth, visibleStatus, dna, life, bodyAuto, sub, micro)
    reply = compactHumanReply(reply, sub)
    reply = microCompactReply(reply, micro)

    return json({
      reply,
      companionDNA: dna,
      timeTruth,
      visibleStatus,
      humanLayer: layer,
      humanSubBranch: sub,
      humanMicroBranch: micro,
      humanLifeScene: life,
      humanBodyAutonomy: bodyAuto,
      humanCoreDesire: core,
      updatedMemory: { ...memory, companionDNA: dna, visibleStatus, timeTruth },
      source: 'openai-v11.15.3',
    })
  } catch (error) {
    return json({
      reply: 'เอ้า… สะดุดอีกแล้ว พี่พิมพ์มาใหม่ที น้ำตั้งหลักแป๊บนึง',
      error: error instanceof Error ? error.message : 'unknown_error',
      source: 'route-error',
    }, 200)
  }
}
