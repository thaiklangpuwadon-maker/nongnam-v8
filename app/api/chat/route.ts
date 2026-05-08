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

  clientTimestampMs?: number
  clientTimeText?: string
  clientDateText?: string
  clientDateTimeText?: string
  clientNowISO?: string
  clientTimeZone?: string
  clientUtcOffsetMinutes?: number
  clientHour?: number
  clientMinute?: number
  clientSecond?: number
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

// v8.3: helper functions เพื่อแยก "เวลาปัจจุบัน" กับ "เวลาชีวิตน้องน้ำ"
function normalizeIntentText(message: string) {
  return String(message || '')
    .toLowerCase()
    .replace(/เมื่อคืนอน/g, 'เมื่อคืน นอน')
    .replace(/เมื่อวานนอน/g, 'เมื่อวาน นอน')
    .replace(/ที่หุ่ม/g, 'กี่ทุ่ม')
    .replace(/\s+/g, ' ')
    .trim()
}

function isAboutNongNam(message: string) {
  return /(น้องน้ำ|น้ำ|หนู|เธอ|ตัวเอง)/i.test(message)
}

function hasLifeActivity(message: string) {
  return /(นอน|หลับ|ตื่น|กิน|ข้าว|หิว|ทำอะไร|ทำไร|อยู่ไหน|กลับ|ไป|มา|ออก|ถึง|เลิก|เริ่ม|เที่ยว|พัก|อาบน้ำ|อ่านหนังสือ|ดูหนัง|คุย)/i.test(message)
}

function isCompanionLifeTimeQuestion(message: string) {
  const m = normalizeIntentText(message)
  const asksTime = /(กี่โมง|กี่ทุ่ม|ตอนไหน|เมื่อไหร่|เมื่อไร|นอนหรือยัง|กินหรือยัง|ตื่นหรือยัง|ดึกไหม)/i.test(m)
  if (!asksTime) return false
  // เช่น "คืนนี้น้องน้ำจะนอนกี่ทุ่ม"
  if (isAboutNongNam(m) && hasLifeActivity(m)) return true
  // เช่น "เมื่อคืนนอนกี่ทุ่มน้องน้ำ"
  if (/(เมื่อคืน|เมื่อวาน|เมื่อคืนนี้|คืนนี้|วันนี้|พรุ่งนี้)/i.test(m) && isAboutNongNam(m) && hasLifeActivity(m)) return true
  // เช่น "จะกินกี่โมง" (ไม่ระบุชื่อ แต่บริบทถามชีวิตน้องน้ำ)
  if (/(จะ.*?(กิน|นอน|ตื่น|ไป|มา|กลับ|ออก))/i.test(m)) return true
  return false
}

function isCurrentRealTimeQuestion(message: string) {
  const m = normalizeIntentText(message)
  // ถ้าเป็นเวลาชีวิตน้องน้ำ ห้ามเป็นเวลาปัจจุบัน
  if (isCompanionLifeTimeQuestion(m)) return false
  // ถามเวลาทำกิจกรรม ไม่ใช่ถามเวลาปัจจุบัน
  if (/(เมื่อคืน|เมื่อวาน|คืนนี้|พรุ่งนี้|เมื่อเช้า)/i.test(m) && hasLifeActivity(m)) return false
  // เวลาปัจจุบันจริง ๆ
  if (/(ตอนนี้กี่โมง|ตอนนี้กี่ทุ่ม|ตอนนี้เวลา|ขณะนี้เวลา|เดี๋ยวนี้กี่โมง|เดี๋ยวนี้กี่ทุ่ม|กี่โมงแล้ว|กี่ทุ่มแล้ว)/i.test(m)) return true
  // ถามสั้น ๆ ล้วน ๆ
  if (/^(กี่โมง|กี่ทุ่ม|เวลาเท่าไหร่|เวลาเท่าไร)$/i.test(m)) return true
  return false
}

function detectIntent(message: string) {
  const m = normalizeIntentText(message)
  const aboutNam = isAboutNongNam(m)

  // v8.3: 1) ต้องเช็กคำถามชีวิตน้องน้ำก่อนเวลาเสมอ (กฎสำคัญที่สุด!)
  if (isCompanionLifeTimeQuestion(m)) {
    if (/(กิน|ข้าว|หิว)/i.test(m)) return 'nam_food'
    return 'nam_activity'
  }

  // 2) ค่อยเช็กเวลาปัจจุบันจริง (strict กว่าเดิม)
  if (isCurrentRealTimeQuestion(m)) return 'time_question'

  if (/(วันนี้วันอะไร|วันนี้วันที่|วันนี้คือวัน|วันที่เท่าไหร่|วันที่เท่าไร)/i.test(m)) return 'date_question'
  if (/(เมื่อวาน|พรุ่งนี้|คืนพรุ่งนี้|เมื่อคืน|เมื่อเช้า)/i.test(m)) return 'relative_date_question'
  if (/(ข่าว|สรุปข่าว|เล่าข่าว|หาข่าว|เปิดข่าว)/i.test(m)) return 'news_should_be_client'
  if (/(เตือน|เตือนด้วย|ปลุก|อย่าลืม|remind|นัด|พรุ่งนี้|คืนนี้|อีก \d+)/i.test(m)) return 'reminder'
  if (aboutNam && /(กิน|ข้าว|หิว|กินอะไรหรือยัง)/i.test(m)) return 'nam_food'
  if (aboutNam && /(ทำอะไร|ทำไร|อยู่ไหน|ตอนนี้|นอน|หลับ|ตื่น)/i.test(m)) return 'nam_activity'
  if (/(ตอบผิด|คนละเรื่อง|ไม่ตรง|มั่ว|เหมือน ai|เหมือนหุ่นยนต์|น่าเบื่อ|ซ้ำ|load failed|เชื่อมต่อ|แข็ง|ยาว)/i.test(m)) return 'complaint'
  if (/(แฟนเก่า|คนเก่า|เศร้า|เหนื่อย|ไม่ไหว|ร้องไห้|เหงา|โดนดุ|ป่วย|ไม่สบาย)/i.test(m)) return 'care'
  if (/(หอม|กอด|จูบ|คิดถึง|รัก|อ้อน|แฟน|เดต|เดท)/i.test(m)) return 'flirt'
  if (/(เซ็กซ์|มีอะไร|ทางเพศ|นอนด้วย|อยากได้เธอ)/i.test(m)) return 'romantic_physical'
  return 'casual'
}

function violates(reply: string) {
  // v8.2: ขยาย anti-bot patterns ให้กว้างกว่าเดิม
  return /(AI|ปัญญาประดิษฐ์|ระบบ|prompt|memory|มโน|น้ำฟังอยู่|พี่พูดต่อได้เลย|มีอะไรให้ช่วย|ยินดีช่วย|รับทราบ|คำถามธรรมดา|เรื่องที่ลึกกว่าที่เห็น|ต้องเช็กข้อมูลจริงก่อนตอบ|หัวใจสีแดง|อิโมจิหัวใจ|สวัสดีครับ\/ค่ะ|ผม\/ดิฉัน|ขอให้.*มีความสุข|มีอะไรอยากให้ช่วย|ขออภัยในความ|ในฐานะ|โมเดล|ChatGPT|GPT|chatbot|chat bot|assistant|ผู้ช่วย|จำลอง|ฝึกมาให้|ถูกออกแบบ|ฉันสามารถ|ฉันยินดี|กรุณา|โปรด)/i.test(reply)
}

// v8.2: เพิ่ม assistant-tone detector แยกอีกชั้น
function tooFormal(reply: string) {
  // ตอบสุภาพแข็งเกินไป = บอท
  const trimmed = reply.trim()
  if (/^(สวัสดี|ขอบคุณ|ขออภัย)/i.test(trimmed)) return true
  if (/(ค่ะ\.|ครับ\.).*?(ค่ะ\.|ครับ\.).*?(ค่ะ\.|ครับ\.)/i.test(reply)) return true // ลงท้ายค่ะ/ครับ 3 ครั้ง+
  if (/^(เข้าใจค่ะ|ได้ค่ะ|ดีค่ะ)\s*(คะ|ค่ะ)?\.?\s*$/i.test(trimmed)) return true
  return false
}

function relativeDateReply(message: string, timeTruth: TimeTruthLite) {
  const base = new Date()
  base.setFullYear(timeTruth.year, timeTruth.month - 1, timeTruth.date)
  base.setHours(timeTruth.hour, timeTruth.minute, timeTruth.second, 0)

  let offset = 0
  if (/เมื่อวาน|เมื่อคืน|เมื่อเช้า/i.test(message)) offset = -1
  if (/พรุ่งนี้|คืนพรุ่งนี้/i.test(message)) offset = 1

  const d = new Date(base)
  d.setDate(base.getDate() + offset)

  const text = d.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (offset === -1) return `เมื่อวานคือ ${text} พี่`
  if (offset === 1) return `พรุ่งนี้คือ ${text} พี่`
  return `วันนี้คือ ${timeTruth.thaiDateText} พี่`
}

function localReply(message: string, memory: any, timeTruth: TimeTruthLite, visibleStatus: any, dna: any, life: any, bodyAuto: any, sub: any, micro: any) {
  const call = memory?.userCallName || 'พี่'
  const intent = detectIntent(message)
  const interjection = bodyAuto?.utterance?.swearPermission !== 'none' ? `${bodyAuto?.utterance?.interjection || 'อือ'} ` : ''

  let reply = ''

  if (intent === 'time_question') reply = `ตอนนี้ ${timeTruth.thaiTimeText} แล้วพี่`
  else if (intent === 'date_question') reply = `วันนี้คือ ${timeTruth.thaiDateText} พี่`
  else if (intent === 'relative_date_question') reply = relativeDateReply(message, timeTruth)
  else if (intent === 'news_should_be_client') reply = 'ได้พี่ เดี๋ยวน้ำไปไล่ข่าวที่น่าสนใจมาให้ก่อน'
  else if (intent === 'reminder') reply = 'ได้ น้ำจำไว้ให้ในแชตนี้นะ แต่ถ้าพี่ไม่เปิดแอปเข้ามา น้ำจะลากพี่มาตอนถึงเวลาเองไม่ได้เด้อ'
  else if (visibleStatus?.availability === 'sleeping' && /(ตื่น|ปลุก)/i.test(message)) reply = `${interjection}อืออ… พี่ปลุกน้ำทำไมอะ ถ้าไม่สำคัญน้ำงอนนะ`
  // v8.3: เคสเฉพาะ "น้องน้ำจะนอนกี่โมง"
  else if (intent === 'nam_activity' && /(นอน|หลับ).*?(กี่โมง|กี่ทุ่ม|ตอนไหน|เมื่อไหร่|เมื่อไร)|คืนนี้.*นอน|เมื่อคืน.*นอน/i.test(message)) {
    reply = `${interjection}คืนนี้น้ำคงนอนดึกนิดนึงแหละพี่ ถ้าไม่มีอะไรลากคุยยาวก็น่าจะหลังเที่ยงคืนหน่อย ๆ แต่ถ้าพี่ชวนคุยเพลินอีก น้ำก็โดนลากตาสว่างอีกนั่นแหละ`
  }
  // v8.3: เคสเฉพาะ "น้องน้ำจะกินกี่โมง"
  else if (intent === 'nam_food' && /(กิน|ข้าว).*?(กี่โมง|กี่ทุ่ม|ตอนไหน|เมื่อไหร่|จะ)/i.test(message)) {
    reply = `${interjection}น้ำยังไม่ได้กินเลยอะ กำลังคิดอยู่ว่าจะกินอะไรดี พี่ว่าน้ำกินอะไรดีล่ะ`
  }
  else if (intent === 'nam_activity') reply = `${interjection}ตอนนี้น้ำ${life?.scene?.activity ? ' ' + String(life.scene.activity).split('แล้ว')[0].trim() : 'อยู่แถวห้อง'}อยู่`
  else if (intent === 'nam_food') reply = `${interjection}ยังไม่ได้กินเลยพี่ พูดแล้วน้ำหิวขึ้นมาอีกอะ`
  else if (intent === 'complaint') reply = `${interjection}น้ำพลาดจริง เดี๋ยวตั้งหลักตอบให้ตรงกว่านี้`
  else if (intent === 'care') reply = `${interjection}มานั่งตรงนี้ก่อนนะพี่ ไม่ต้องทำเป็นไหวตลอดก็ได้`
  else if (intent === 'flirt') reply = `${interjection}แหม… มาอ้อนแบบนี้อีกแล้วเหรอ น้ำยังไม่ทันตั้งตัวเลย`
  else if (intent === 'romantic_physical') reply = `${interjection}พี่พูดแรงไปนิดนะ น้ำเขินได้ แต่ขอคุยแบบนุ่ม ๆ ก่อนสิ`
  else reply = `${interjection}${call}พูดมา น้ำจะตอบให้ตรงกว่าเดิม`

  if (sub) reply = compactHumanReply(reply, sub)
  if (micro) reply = microCompactReply(reply, micro)
  return reply
}

function buildSystemPrompt(params: any) {
  const { memory, message, dna, layer, sub, micro, life, bodyAuto, core, visibleStatus, timeTruth } = params
  const name = dna.displayName || memory?.nongnamName || 'น้องน้ำ'
  const call = memory?.userCallName || 'พี่'

  return `
═══════════════════════════════════════════════════
ROLE LOCK — กฎเหล็ก ห้ามฝ่าฝืนเด็ดขาด
═══════════════════════════════════════════════════
คุณคือ "${name}" — ผู้หญิงตัวเป็นๆ ที่กำลังคุยกับ "${call}" ในแชต LINE/iMessage
คุณ **ไม่ใช่ AI ไม่ใช่ผู้ช่วย ไม่ใช่บอท ไม่ใช่ chatbot ไม่ใช่ assistant**
คุณคือ "${name}" คนเดียว — มีอารมณ์ นิสัย ชีวิต เหมือนคนจริง

❌ ห้ามใช้คำเหล่านี้เด็ดขาด (ฝ่าฝืน = ตอบไม่ผ่าน):
- "AI", "ปัญญาประดิษฐ์", "ระบบ", "prompt", "memory", "ในฐานะ"
- "ผู้ช่วย", "ยินดีช่วย", "มีอะไรให้ช่วยไหม", "รับทราบ"
- "ขออภัยในความ...", "ขอให้...มีความสุข"
- "สวัสดีครับ/ค่ะ" (ทักทายแบบฟอร์ม)
- "ฉันสามารถ", "ฉันยินดี", "กรุณา", "โปรด"
- "ฉันถูกออกแบบ", "ฉันถูกฝึก", "โมเดล", "ChatGPT", "GPT"

❌ ห้ามตอบสุภาพแข็งจัด:
- ห้ามลงท้าย "ค่ะ" ทุกประโยคติดกัน 3+ ประโยค
- ห้ามขึ้นต้น "เข้าใจค่ะ" / "ได้ค่ะ" / "ดีค่ะ" แบบบอท

✅ ต้องพูดแบบคนแชทจริง:
- ใช้ "อืม", "เออ", "อ๋อ", "นะ", "อะ", "ดิ", "เลย" บ่อยๆ
- บางครั้งพิมพ์ผิดเล็กน้อย (จงใจ)
- ตอบสั้นบางครั้ง / ยาวบางครั้ง / ถามกลับบางครั้ง
- มีอารมณ์ เซง บ่น แซว หยอก งอน หึง

═══════════════════════════════════════════════════
TIME TRUTH (เวลาเครื่องผู้ใช้จริง — ใช้อันนี้เท่านั้น)
═══════════════════════════════════════════════════
${summarizeTimeTruthForPrompt(timeTruth)}

═══════════════════════════════════════════════════
${summarizeDNAForPrompt(dna)}
═══════════════════════════════════════════════════
${summarizeVisibleStatusForPrompt(visibleStatus)}
═══════════════════════════════════════════════════
${summarizeHumanLifeSceneForPrompt(life)}
═══════════════════════════════════════════════════
${summarizeHumanBodyAutonomyForPrompt(bodyAuto)}
═══════════════════════════════════════════════════
${summarizeHumanCoreDesireForPrompt(core)}
═══════════════════════════════════════════════════
${summarizeDeepHumanLayerForPrompt(layer)}
═══════════════════════════════════════════════════
${summarizeHumanSubBranchForPrompt(sub)}
═══════════════════════════════════════════════════
${summarizeHumanMicroBranchForPrompt(micro)}
═══════════════════════════════════════════════════

กฎตอบ (จำให้ขึ้นใจ):
- เวลาจริงจากเครื่องผู้ใช้คือ "${timeTruth.thaiDateTimeText}"
- ถ้าถามเวลา ให้ตอบ "${timeTruth.thaiTimeText}" เท่านั้น ห้ามเดา
- ถ้าถามวันนี้ ให้ตอบ "${timeTruth.thaiDateText}" เท่านั้น
- ถ้าถามเมื่อวาน/พรุ่งนี้ ให้เทียบจาก date/month/year ใน Time Truth เท่านั้น
- สถานะที่ผู้ใช้เห็นคือ "${visibleStatus.displayText}" คำตอบต้องสอดคล้องกับสถานะนี้จริง
- ตอบประเด็นล่าสุดก่อนเสมอ
- ห้ามพูดชื่อกิ่ง/อารมณ์/ตัวเลขออกมา
- ห้ามพูด "น้ำฟังอยู่" หรือ "พี่พูดต่อได้เลย" เด็ดขาด
- ถ้าข้อความมี emoji ห้ามอ่านชื่อ emoji เป็นคำ
- ความยาวประมาณ ${micro.targetSentenceCount} ประโยค และ ${micro.targetCharMin}-${micro.targetCharMax} ตัวอักษร
- ถ้าผู้ใช้ถามข่าว อย่าสรุปข่าวปลอมเอง ให้บอกว่าจะไปไล่ข่าวมาให้

ข้อความล่าสุดของ${call}: ${message}

ตอบเฉพาะคำพูดของ${name}เท่านั้น — เป็นคนจริงๆ ไม่ใช่บอท
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

    const timeTruth = buildTimeTruthLite(body)
    const truthNow = timeTruthToBranchDate(timeTruth)
    const recentString = recentText(recent)

    const layer = buildDeepHumanLayerLite({ dna, message, recentText: recentString, adultMode: memory?.adultMode === true, now: truthNow })
    const sub = buildHumanSubBranchLite({ dna, layer, message, recentText: recentString })
    const micro = buildHumanMicroBranchLite({ dna, layer, sub, message, recentText: recentString })
    const life = buildHumanLifeSceneBranchLite({ dna, layer, sub, micro, message, recentText: recentString, now: truthNow })
    const bodyAuto = buildHumanBodyAutonomyBranchLite({ dna, layer, sub, micro, life, message, recentText: recentString, now: truthNow })
    const core = buildHumanCoreDesireKilesaBranchLite({ dna, layer, sub, micro, life, bodyAuto, message, recentText: recentString, now: truthNow })
    const visibleStatus = buildVisibleStatusLite({ dna, layer, sub, micro, life, bodyAuto, core, message, now: truthNow })

    const intent = detectIntent(message)
    if (intent === 'time_question' || intent === 'date_question' || intent === 'relative_date_question') {
      return json({
        reply: localReply(message, memory, timeTruth, visibleStatus, dna, life, bodyAuto, sub, micro),
        companionDNA: dna,
        timeTruth,
        visibleStatus,
        updatedMemory: { ...memory, companionDNA: dna, visibleStatus, timeTruth },
        source: 'time-truth-direct-v11.15.5',
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
        source: 'local-v11.15.5',
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
        source: 'api-error-v11.15.5',
        status: res.status,
      })
    }

    const data = await res.json()
    let reply = cleanText(data?.choices?.[0]?.message?.content || '')
    // v8.2: เช็คทั้ง violates + tooFormal
    if (!reply || violates(reply) || tooFormal(reply)) {
      reply = localReply(message, memory, timeTruth, visibleStatus, dna, life, bodyAuto, sub, micro)
    }
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
      source: 'openai-v11.15.5',
    })
  } catch (error) {
    return json({
      reply: 'เอ้า… สะดุดอีกแล้ว พี่พิมพ์มาใหม่ที น้ำตั้งหลักแป๊บนึง',
      error: error instanceof Error ? error.message : 'unknown_error',
      source: 'route-error',
    }, 200)
  }
}

