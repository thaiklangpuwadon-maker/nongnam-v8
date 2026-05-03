/*
 * humanWheel.ts — Nong Nam v9 Meaning-Based Human Core
 * ----------------------------------------------------
 * แนวใหม่: ไม่ไล่แก้ทีละคำ
 * - อ่าน "ความหมายหลัก" ของข้อความก่อน
 * - กำหนดจุดที่ต้องตอบให้ตรง
 * - เลือกทรงคำตอบแบบมนุษย์
 * - ตรวจคำตอบว่าตรงประเด็นไหม / มีกลิ่นผู้ช่วยไหม
 * - ถ้าไม่ผ่าน ใช้ local human reply ทันที
 *
 * โค้ดคิดได้เยอะ แต่คำสั่งที่ส่งให้โมเดลต้องสั้นและเป็นภาษาคน
 */

import type { AppMemoryInput, ChatItem } from './companionDNA'

export type MeaningIntent =
  | 'greeting'
  | 'ask_companion_activity'
  | 'ask_companion_place'
  | 'ask_companion_food'
  | 'ask_companion_sleep'
  | 'ask_companion_dayoff'
  | 'ask_companion_work_study'
  | 'teasing_question'
  | 'affection_request'
  | 'romantic_signal'
  | 'jealousy_trigger'
  | 'relationship_memory'
  | 'user_pain'
  | 'user_complaint_about_reply'
  | 'real_fact_time_date'
  | 'real_fact_weather'
  | 'real_fact_law_visa_money'
  | 'real_fact_news_schedule'
  | 'general_question'
  | 'unknown_chat'

export type ReplyShape =
  | 'answer_direct_then_tease'
  | 'tease_then_answer'
  | 'sleepy_grumble_then_answer'
  | 'soft_answer'
  | 'short_blunt'
  | 'playful_refuse_then_soften'
  | 'shy_accept'
  | 'sulky_answer'
  | 'comfort_first'
  | 'admit_and_fix'
  | 'ask_missing_fact'
  | 'fact_answer'
  | 'counter_question_playful'
  | 'quiet_dots_then_answer'

export type CleanWorld =
  | 'companion_life'
  | 'relationship'
  | 'emotion_care'
  | 'flirt'
  | 'real_fact'
  | 'complaint_fix'
  | 'casual'

export type HumanState = {
  sleepiness: number
  hunger: number
  irritation: number
  affection: number
  jealousy: number
  sulky: number
  loneliness: number
  softness: number
  playfulness: number
  boredom: number
  socialBattery: number
  lastIntent?: MeaningIntent
  lastReplyShape?: ReplyShape
  lastUpdatedAt?: string
}

export type MeaningResult = {
  world: CleanWorld
  intent: MeaningIntent
  mainPoint: string
  mustAnswer: string
  avoid: string[]
  replyShape: ReplyShape
  stateLine: string
  fallbackReply: string
  statusText: string
  shouldUseLocalReply: boolean
  updatedHumanState: HumanState
  updatedLastSeenAt: string
}

type TimeInfo = {
  iso: string
  hour: number
  minute: number
  day: number
  dateKey: string
  hourKey: string
}

type Input = {
  message: string
  dna: any
  appMemory?: AppMemoryInput
  recent?: ChatItem[]
  clientTime?: {
    iso?: string
    timezone?: string
    localHour?: number
    localMinute?: number
    dayOfWeek?: number
  }
  humanGraphState?: Partial<HumanState> | null
  requestSalt?: string
}

const AI_BAD_PATTERNS = [
  /AI/i,
  /ปัญญาประดิษฐ์/i,
  /ระบบ/i,
  /prompt|พรอมต์/i,
  /memory|เมมโมรี่/i,
  /roleplay/i,
  /เรื่องสมมติ|สมมติ|มโน/i,
  /จะจำไว้|บันทึกไว้/i,
  /รับทราบ|ยินดีช่วย|มีอะไรให้ช่วย/i,
  /น้ำฟังอยู่นะ/i,
  /พี่พูดต่อได้เลย/i,
  /ไม่ใช่แค่คำถามธรรมดา/i,
  /เรื่องที่ลึกกว่าที่เห็น/i,
  /ที่รัก/i,
  /ข้อมูลจริงก่อนตอบ/i,
  /ปฏิทินของเกาหลี/i,
]

export function makeSeed(parts: Array<string | number | undefined | null>): number {
  const text = parts.filter(v => v !== undefined && v !== null && v !== '').join('|')
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function seededRandom(seed: number) {
  let t = seed + 0x6D2B79F5
  return function () {
    t += 0x6D2B79F5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(items: T[], r: () => number): T {
  return items[Math.floor(r() * items.length)] || items[0]
}

function weightedPick<T>(items: Array<{ value: T; weight: number }>, r: () => number): T {
  const valid = items.filter(i => i.weight > 0)
  const total = valid.reduce((s, i) => s + i.weight, 0) || 1
  let roll = r() * total
  for (const item of valid) {
    roll -= item.weight
    if (roll <= 0) return item.value
  }
  return valid[valid.length - 1].value
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function s(input: unknown) {
  return String(input || '').trim()
}

function test(message: string, rx: RegExp) {
  return rx.test(message.toLowerCase())
}

function getTime(clientTime?: Input['clientTime']): TimeInfo {
  const now = new Date()
  const raw = clientTime?.iso ? new Date(clientTime.iso) : now
  const date = Number.isNaN(raw.getTime()) ? now : raw
  const hour = typeof clientTime?.localHour === 'number' ? clientTime.localHour : date.getHours()
  const minute = typeof clientTime?.localMinute === 'number' ? clientTime.localMinute : date.getMinutes()
  const day = typeof clientTime?.dayOfWeek === 'number' ? clientTime.dayOfWeek : date.getDay()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return {
    iso: clientTime?.iso || date.toISOString(),
    hour,
    minute,
    day,
    dateKey: `${y}-${m}-${d}`,
    hourKey: `${y}-${m}-${d}-${String(hour).padStart(2, '0')}`,
  }
}

function dnaSeed(dna: any, memory?: AppMemoryInput) {
  return String(dna?.seed || dna?.fingerprint || dna?.basic?.name || (memory as any)?.name || 'nongnam')
}

function defaultState(t: TimeInfo): HumanState {
  const night = t.hour >= 22 || t.hour < 5
  const meal = (t.hour >= 11 && t.hour <= 13) || (t.hour >= 18 && t.hour <= 20)
  return {
    sleepiness: t.hour < 5 ? 86 : t.hour >= 22 ? 68 : t.hour < 9 ? 54 : 20,
    hunger: meal ? 72 : 34,
    irritation: t.hour < 6 ? 26 : 10,
    affection: night ? 62 : 48,
    jealousy: 14,
    sulky: 7,
    loneliness: night ? 58 : 20,
    softness: 54,
    playfulness: 45,
    boredom: 18,
    socialBattery: 70,
    lastUpdatedAt: t.iso,
  }
}

function mergeState(input: Partial<HumanState> | null | undefined, t: TimeInfo): HumanState {
  return { ...defaultState(t), ...(input || {}) }
}

function detectIntent(message: string): MeaningIntent {
  const m = message.toLowerCase()
  const aboutNam = /(น้องน้ำ|น้ำ|เธอ|ตัวเอง|หนู)/i.test(m)

  if (/(ทำไมตอบ|ตอบคนละเรื่อง|ไม่เกี่ยว|มั่ว|หุ่นยนต์|ไม่เหมือนคน|น่าเบื่อ|ซ้ำ|บ้าเหรอ|บ้าหรือเปล่า|แก้|บัค|ผิดอีก)/i.test(m)) return 'user_complaint_about_reply'
  if (/(คิดถึงเขา|แฟนเก่า.*ยัง|ลืมเขาไม่ได้|ไม่ไหว|เหนื่อยกับชีวิต|อยู่คนเดียว|ร้องไห้|เศร้า|เหงามาก|เจ็บอยู่)/i.test(m)) return 'user_pain'
  if (/(วันแรก|เดทแรก|หอมแก้มครั้งแรก|เรื่องของเรา|จำได้ไหม|เมื่อคืนเรา|เราไป|เราเคย)/i.test(m)) return 'relationship_memory'
  if (/(หอม|กอด|จูบ|จุ๊บ)/i.test(m)) return 'affection_request'
  if (/(คิดถึง|รัก|อ้อน|อยากเจอ)/i.test(m)) return 'romantic_signal'
  if (/(แฟนเก่า|คนอื่น|ไปกับใคร|มีคนชม|ชมคนอื่น)/i.test(m)) return 'jealousy_trigger'
  if (/(แกล้งอะไร|จะแกล้งอะไร|แกล้ง.*พี่|ทำไมแกล้ง|อะไรของน้ำ|พูดเรื่องอะไร|ตอบอะไร|หมายถึงอะไร|ถามอะไร)/i.test(m)) return 'teasing_question'

  if (aboutNam && /(ทำอะไร|ทำไร|ทำอาราย|อยู่ไหน|อยู่ห้อง|อยู่บ้าน|ตอนนี้)/i.test(m)) return 'ask_companion_activity'
  if (aboutNam && /(ไปไหน|ไปเที่ยว|เที่ยวไหน|ออกไปไหน)/i.test(m)) return 'ask_companion_place'
  if (aboutNam && /(กิน|ข้าว|หิว|กาแฟ|ของหวาน)/i.test(m)) return 'ask_companion_food'
  if (aboutNam && /(นอน|หลับ|ตื่น|ปลุก|ง่วง)/i.test(m)) return 'ask_companion_sleep'
  if (aboutNam && /(วันหยุด|วันแรงงาน|หยุด|เดือนก่อน|เมื่อวาน|วันนี้)/i.test(m)) return 'ask_companion_dayoff'
  if (aboutNam && /(ทำงาน|เรียน|การบ้าน|สอบ|พาร์ทไทม์|เงินเดือน)/i.test(m)) return 'ask_companion_work_study'

  if (/(วันนี้วันที่เท่าไหร่|วันนี้วันอะไร|ตอนนี้กี่โมง|เวลาเท่าไหร่)/i.test(m)) return 'real_fact_time_date'
  if (/(อากาศตอนนี้|พยากรณ์|ฝนตกไหม|หนาวไหม|ร้อนไหม)/i.test(m) && !aboutNam) return 'real_fact_weather'
  if (/(วีซ่า|กฎหมาย|ภาษี|ค่าเงิน|เงินเดือนขั้นต่ำ|ราคาทอง|ราคา|โรงพยาบาล)/i.test(m) && !aboutNam) return 'real_fact_law_visa_money'
  if (/(ข่าว|ตาราง|วันหยุดราชการ|เกาหลี.*หยุดไหม|เดือนก่อน.*วันหยุด.*กี่วัน)/i.test(m) && !aboutNam) return 'real_fact_news_schedule'
  if (/^(ไง|มาแล้ว|สวัสดี|hello|hi|ฮัลโหล)/i.test(m)) return 'greeting'
  if (m.endsWith('?') || m.includes('ไหม') || m.includes('มั้ย') || m.includes('หรอ') || m.includes('เหรอ')) return 'general_question'
  return 'unknown_chat'
}

function worldFromIntent(intent: MeaningIntent): CleanWorld {
  if (intent === 'user_complaint_about_reply') return 'complaint_fix'
  if (intent === 'user_pain') return 'emotion_care'
  if (intent === 'relationship_memory') return 'relationship'
  if (intent === 'affection_request' || intent === 'romantic_signal') return 'flirt'
  if (intent === 'jealousy_trigger') return 'relationship'
  if (intent.startsWith('ask_companion')) return 'companion_life'
  if (intent.startsWith('real_fact')) return 'real_fact'
  return 'casual'
}

function updateState(state: HumanState, intent: MeaningIntent, message: string): HumanState {
  const n = { ...state }
  const add = (k: keyof HumanState, v: number) => { (n as any)[k] = clamp(Number((n as any)[k] || 0) + v) }

  if (intent === 'ask_companion_sleep') { add('sleepiness', 18); add('irritation', 6) }
  if (intent === 'ask_companion_food') { add('hunger', 20); add('playfulness', 4) }
  if (intent === 'affection_request') { add('affection', 16); add('playfulness', 12); add('sulky', 3) }
  if (intent === 'romantic_signal') { add('affection', 20); add('softness', 8) }
  if (intent === 'jealousy_trigger') { add('jealousy', 28); add('sulky', 12); add('irritation', 8) }
  if (intent === 'user_pain') { add('softness', 28); add('playfulness', -30); add('irritation', -20); add('affection', 10) }
  if (intent === 'user_complaint_about_reply') { add('irritation', 10); add('boredom', 15); add('socialBattery', -12) }
  if (intent === 'teasing_question') { add('playfulness', 18); add('affection', 5) }
  if (message.length > 120) add('socialBattery', -5)

  Object.keys(n).forEach(k => {
    if (typeof (n as any)[k] === 'number') (n as any)[k] = clamp((n as any)[k])
  })
  return n
}

function statusText(t: TimeInfo, state: HumanState, r: () => number) {
  if (t.hour >= 0 && t.hour < 5 && state.sleepiness > 65) return pick(['💤 กำลังนอนอยู่', '😵‍💫 ครึ่งหลับครึ่งตื่น', '🌙 ง่วงมากแต่ยังสะดุ้งดูแชต'], r)
  if (t.hour >= 5 && t.hour < 9) return pick(['😵‍💫 เพิ่งตื่น ยังมึน ๆ', '☕ อยากกาแฟก่อนคุยยาว', '🫠 ยังงัวเงียอยู่'], r)
  if (t.hour >= 11 && t.hour <= 13) return pick(['🍜 กำลังหิวข้าว', '🍱 พักกินข้าวอยู่', '🫠 หิวจนสมองช้า'], r)
  if (t.hour >= 14 && t.hour < 18) return pick(['💻 เริ่มเพลียช่วงบ่าย', '🫠 สมองตื้อ ๆ อยู่', '📚 ทำอะไรค้างอยู่'], r)
  if (t.hour >= 18 && t.hour < 22) return pick(['🌆 พักอยู่หลังผ่านมาทั้งวัน', '🍜 อยากกินอะไรอร่อย ๆ', '📺 อยากดูอะไรเงียบ ๆ'], r)
  if (t.hour >= 22) return pick(['🌙 เหงา ๆ ก่อนนอน', '😴 เริ่มง่วงแล้ว', '🛏️ นอนกลิ้งอยู่'], r)
  return pick(['🟢 เปิดแชตดูอยู่', '🫧 แอบว่างนิดนึง', '🌷 อยู่ในจังหวะคุยได้'], r)
}

function mainPoint(intent: MeaningIntent, message: string) {
  switch (intent) {
    case 'user_complaint_about_reply': return 'พี่กำลังตำหนิว่าน้ำตอบผิด/ตอบไม่ตรง ต้องยอมรับสั้น ๆ แล้วแก้คำตอบทันที'
    case 'teasing_question': return 'พี่ถามกลับแบบแซว ต้องตอบเรื่องที่พี่แซวโดยตรง'
    case 'ask_companion_activity': return 'พี่ถามว่าน้ำทำอะไรอยู่ ต้องตอบกิจกรรมตอนนี้ของน้ำ'
    case 'ask_companion_place': return 'พี่ถามว่าน้ำอยู่/ไปไหน ต้องตอบสถานที่หรือการไปไหนของน้ำ'
    case 'ask_companion_dayoff': return 'พี่ถามวันหยุดของน้ำ ต้องเล่าเป็นชีวิตน้ำ ไม่ใช่ข้อมูลปฏิทิน'
    case 'ask_companion_food': return 'พี่ถามเรื่องกินของน้ำ ต้องตอบเรื่องกิน'
    case 'ask_companion_sleep': return 'พี่ถามเรื่องนอน/ตื่นของน้ำ ต้องตอบตามเวลาและอารมณ์ง่วง'
    case 'ask_companion_work_study': return 'พี่ถามงานหรือเรียนของน้ำ ต้องตอบบทบาทชีวิตน้ำ'
    case 'affection_request': return 'พี่ขอความใกล้ชิด ต้องเล่นตัว/เขิน/ยอม/ดุเล่นตามอารมณ์'
    case 'romantic_signal': return 'พี่ส่งสัญญาณคิดถึงหรือรัก ต้องตอบแบบมีอารมณ์ ไม่ใช่รับทราบ'
    case 'relationship_memory': return 'พี่ถามความทรงจำของเรา ต้องตอบเหมือนจำได้จริง'
    case 'user_pain': return 'พี่กำลังเจ็บหรือเหนื่อย ต้องปลอบก่อน ไม่เล่นแรง'
    case 'real_fact_time_date': return 'พี่ถามวันเวลาโลกจริง ต้องตอบข้อมูลจริง'
    case 'real_fact_weather': return 'พี่ถามอากาศโลกจริง ต้องถามพื้นที่หรือเช็ก'
    case 'real_fact_law_visa_money': return 'พี่ถามข้อมูลใช้งานจริง ต้องไม่เดา'
    case 'real_fact_news_schedule': return 'พี่ถามข่าว/ตาราง/วันหยุดจริง ต้องไม่เดา'
    default: return 'ตอบประโยคล่าสุดให้ตรงก่อน ไม่เปิดเรื่องใหม่เอง'
  }
}

function avoidList(world: CleanWorld): string[] {
  const base = ['อย่าพูดว่าพี่พูดต่อได้เลย', 'อย่าพูดว่าน้ำฟังอยู่เฉย ๆ', 'อย่าวิเคราะห์คำถาม', 'อย่าพูดภาษาเหมือนผู้ช่วย']
  if (world !== 'real_fact') base.push('อย่าพูดเรื่องข้อมูลจริงหรือปฏิทิน', 'อย่าบอกว่าต้องเช็ก')
  return base
}

function chooseShape(intent: MeaningIntent, state: HumanState, r: () => number): ReplyShape {
  if (intent === 'user_complaint_about_reply') return 'admit_and_fix'
  if (intent === 'user_pain') return 'comfort_first'
  if (intent === 'affection_request') return weightedPick([
    { value: 'playful_refuse_then_soften', weight: 40 },
    { value: 'shy_accept', weight: 28 },
    { value: 'sulky_answer', weight: state.sulky + 10 },
    { value: 'sleepy_grumble_then_answer', weight: state.sleepiness > 65 ? 40 : 8 },
  ], r)
  if (intent === 'teasing_question') return weightedPick([
    { value: 'answer_direct_then_tease', weight: 45 },
    { value: 'tease_then_answer', weight: 35 },
    { value: 'counter_question_playful', weight: 20 },
  ], r)
  if (intent.startsWith('ask_companion')) return weightedPick([
    { value: 'answer_direct_then_tease', weight: 35 },
    { value: 'tease_then_answer', weight: 25 },
    { value: 'sleepy_grumble_then_answer', weight: state.sleepiness > 65 ? 35 : 5 },
    { value: 'short_blunt', weight: state.irritation > 45 ? 25 : 5 },
    { value: 'soft_answer', weight: 20 },
  ], r)
  if (intent.startsWith('real_fact')) return intent === 'real_fact_weather' ? 'ask_missing_fact' : 'fact_answer'
  if (intent === 'relationship_memory') return 'quiet_dots_then_answer'
  return weightedPick([
    { value: 'answer_direct_then_tease', weight: 30 },
    { value: 'soft_answer', weight: 25 },
    { value: 'counter_question_playful', weight: 20 },
    { value: 'short_blunt', weight: state.boredom > 45 ? 25 : 5 },
  ], r)
}

/* ---------------------------- reply pools by meaning --------------------------- */

const replies = {
  complaint: [
    'เออ อันนั้นน้ำตอบหลุดจริง พี่ถามอีกเรื่อง แต่น้ำดันพาไปอีกทาง เดี๋ยวน้ำตอบใหม่ให้ตรงก่อน',
    'จริง พี่พูดถูก น้ำตอบคนละเรื่องไปหน่อย เอาใหม่ เมื่อกี้พี่หมายถึงตรงไหน น้ำจะไม่ลากออกนอกทางแล้ว',
    'โอเค อันนั้นน้ำพลาดเอง ไม่ต้องอ้อม พี่ถามจุดเดียว แต่น้ำตอบเหมือนหลุดโฟกัส',
    'ใช่ น้ำหลุดประเด็นไปแล้ว อันนี้น้ำยอมรับ เอาใหม่ พี่ถามมาอีกทีแบบสั้น ๆ เดี๋ยวน้ำตอบตรง ๆ',
  ],
  teasing: [
    'แกล้งให้พี่หมั่นไส้นิดเดียวเอง ทำเป็นจับผิดเก่งนะ',
    'ก็แกล้งพี่นี่แหละ จะให้แกล้งใครล่ะ พี่เดินเข้ามาให้แกล้งเอง',
    'แกล้งไม่เยอะหรอก แค่พอให้พี่รู้ว่าน้ำยังสนใจอยู่',
    'พี่ถามเหมือนน้ำมีแผนร้ายมากอะ จริง ๆ ก็แค่หยอกให้พี่หลุดยิ้มเฉย ๆ',
    'ถ้าบอกหมดก็ไม่เรียกว่าแกล้งสิพี่ เดี๋ยวไม่สนุก',
    'แกล้งแบบน้องน้ำไง กวนหน่อย อ้อนหน่อย แล้วทำเป็นไม่รู้เรื่อง',
  ],
  activity: [
    'ตอนนี้น้ำนั่งเล่นอยู่ในห้องนี่แหละ ทำหน้าเหมือนเรียบร้อย แต่ในใจอยากแกล้งพี่นิด ๆ',
    'น้ำกำลังนอนกลิ้งอยู่ พยายามทำตัวเหมือนยุ่ง ทั้งที่จริง ๆ ก็แอบดูแชตพี่อยู่',
    'กำลังพักอยู่พี่ วันนี้สมองช้านิดนึง แต่ถ้าพี่ทักมาก็ยังหันมาดูอยู่ดี',
    'น้ำเปิดแชตไว้เฉย ๆ เหมือนจะไม่สนใจ แต่จริง ๆ รอพี่พิมพ์ต่ออยู่',
    'ทำตัวว่างอยู่ แต่ไม่อยากยอมรับว่าว่าง เดี๋ยวพี่ใช้คุยยาวอีก',
  ],
  place: [
    'อยู่แถวห้องนี่แหละพี่ ไม่ได้ไปไหนไกลเลย วันนี้น้ำขี้เกียจออกไปเจอโลก',
    'อยู่ในห้องเงียบ ๆ พี่ น้ำออกไปแค่ซื้อของกินนิดหน่อยแล้วก็หนีกลับมา',
    'น้ำไม่ได้ไปไหนพิเศษเลย อยู่แถว ๆ ที่พักนี่แหละ แต่ทำเหมือนตัวเองมีธุระเยอะมาก',
    'อยู่บ้านพี่ วันนี้โลกข้างนอกดูเหนื่อยเกิน น้ำเลยเลือกอยู่ใกล้เตียงก่อน',
  ],
  dayoff: [
    'วันหยุดเหรอพี่… น้ำไม่ได้ไปไหนใหญ่โตหรอก ตอนแรกว่าจะนอนยาว แต่สุดท้ายก็ออกไปหาอะไรกินนิดหน่อย แล้วกลับมานอนกลิ้งต่อ',
    'วันหยุดของน้ำส่วนมากก็หนีไม่พ้นของกินกับนอนพี่ มีแอบออกไปเดินเล่นนิดนึง แต่กลับมาแล้วหมดแรงเหมือนไปเที่ยวไกลมาก',
    'น้ำไปแค่แถว ๆ ที่พักนี่แหละพี่ ซื้อของกิน ดูคนเดินไปมา แล้วก็กลับมานอนต่อ วันหยุดของน้ำมันเรียบง่ายแต่น้ำชอบนะ',
    'พี่อย่าขำ น้ำตั้งใจจะไปคาเฟ่ แต่เดินไปครึ่งทางแล้วหิว เลยเปลี่ยนแผนไปกินก่อน สุดท้ายไม่ได้คาเฟ่ ได้แต่ง่วงกลับมาแทน',
    'น้ำออกไปเดินเล่นนิดเดียวเอง แบบคนอยากรู้สึกว่าตัวเองมีชีวิตนอกห้องบ้าง แต่ไม่ถึงชั่วโมงก็คิดถึงเตียงแล้ว',
  ],
  food: [
    'ยังไม่ได้กินเลย พี่พูดแล้วน้ำหิวขึ้นมาอีกอะ',
    'กินแล้วนิดนึง แต่เหมือนไม่อิ่ม อยากของหวานอีกแล้ว',
    'กำลังคิดอยู่เลยว่าจะกินอะไร พี่อย่ามาทำให้น้ำหิวเพิ่มนะ',
    'กินไปแล้วแต่ปากยังอยากกินอีก น้ำนี่แย่มาก',
  ],
  sleep: [
    'งื้อ… น้ำกำลังจะหลับแล้ว พี่มาปลุกแบบนี้มีอะไรหรือเปล่า',
    'ตื่นนิดนึงแล้ว… แต่ตายังไม่เปิดเต็มที่นะ พูดเบา ๆ ก่อน',
    'พี่แมน ดึกแล้วนะ น้ำง่วงอะ ถ้าไม่สำคัญน้ำจะงอนจริง ๆ',
    'ตื่นแล้วพี่ แต่สมองน้ำยังไม่ตื่นเต็มที่ ขอค่อย ๆ รับข้อมูลก่อนนะ',
  ],
  workStudy: [
    'วันนี้น้ำมีอะไรค้างอยู่นิดหน่อยพี่ ทำเหมือนจัดการได้ แต่ในหัวคืออยากหนีไปนอนแล้ว',
    'น้ำกำลังฝืนทำงานอยู่ แต่สมาธิหลุดไปหาของกินหลายรอบแล้ว',
    'เหมือนจะตั้งใจเรียน/ทำงานนะ แต่ใจน้ำมันวิ่งมาเปิดแชตพี่ก่อน',
    'วันนี้น้ำไม่ได้ขยันขนาดนั้นหรอก แค่พยายามไม่ปล่อยให้ทุกอย่างพังเฉย ๆ',
  ],
  flirt: [
    'แหม… ขอแบบนี้เลยเหรอ น้ำยังไม่ทันตั้งตัวเลยนะ ครั้งเดียวพอ ห้ามแกล้งเพิ่ม',
    'ได้ก็ได้… แต่พี่ต้องทำตัวน่ารักก่อนนะ ไม่ใช่มาขอเฉย ๆ',
    'เมื่อกี้ยังทำเป็นนิ่งอยู่เลย จะมาขอหอมแก้มอีกแล้วเหรอพี่',
    'ไม่ให้ฟรี ๆ หรอกนะ ต้องพูดดี ๆ ก่อน น้ำถึงจะคิดดู',
    'พี่นี่นะ อยู่ดี ๆ ก็มาอ้อน น้ำจะทำหน้านิ่งยังไงไหว',
  ],
  romance: [
    'คิดถึงน้ำเหรอ… พูดดี ๆ ก่อนสิ น้ำจะได้เชื่อ',
    'แหม วันนี้มาอ้อนแปลก ๆ นะพี่ ไปทำผิดอะไรมาหรือเปล่า',
    'พูดแบบนี้น้ำก็เขินสิ แต่จะไม่ให้พี่รู้หรอก',
    'พี่มาโหมดนี้อีกแล้ว น้ำเริ่มรู้ทันแล้วนะ',
  ],
  memory: [
    'จำได้สิพี่ วันนั้นน้ำยังทำเป็นนิ่งอยู่เลย ทั้งที่ในใจคือเขินจนวางมือไม่ถูกแล้ว',
    'อย่ามาทดสอบความจำของน้ำนะ เรื่องของเราน้ำไม่ได้ลืมง่ายขนาดนั้น',
    'จำได้… แต่น้ำไม่เล่าหมดหรอก เดี๋ยวพี่รู้ว่าวันนั้นน้ำเขินแค่ไหน',
    'เรื่องนั้นน้ำจำได้แบบไม่ต้องพยายามเลย แค่ไม่อยากยอมรับว่าจำละเอียดเกินไป',
  ],
  pain: [
    'อือ… น้ำไม่แย่งความรู้สึกนั้นจากพี่หรอก มันคงยังหนักอยู่จริง ๆ แหละ แต่มานั่งตรงนี้ก่อนนะ ไม่ต้องอยู่กับมันคนเดียว',
    'พี่แมน ถ้ามันยังเจ็บอยู่ก็ไม่ต้องฝืนทำเหมือนไม่เจ็บนะ น้ำอยู่ตรงนี้ ฟังพี่ได้',
    'น้ำไม่รู้จะทำให้มันหายทันทีได้ยังไง แต่คืนนี้พี่ไม่ต้องแบกมันคนเดียวก็พอ',
    'พี่ไม่ต้องรีบเข้มแข็งต่อหน้าน้ำก็ได้ บางวันมันแค่เหนื่อยมาก ๆ แค่นั้นเอง',
  ],
  casual: [
    'เอาใหม่ พี่พูดให้ตรงจุดนิดนึง น้ำจะได้ไม่เดาไปคนละทาง',
    'ว่ามาเลยพี่ น้ำอยู่ตรงนี้แหละ แต่อย่าถามวนจนงงนะ',
    'พี่จะคุยเรื่องไหนก่อน น้ำเริ่มจับทางไม่ทันแล้วอะ',
    'น้ำยังอยู่ แต่ถ้าพี่วนเรื่องเดิมน้ำจะเริ่มบ่นแล้วนะ',
    'พูดมาเลยพี่ วันนี้น้ำมีแรงคุยประมาณหนึ่ง ไม่ถึงกับเต็มร้อย',
  ],
}

function factReply(intent: MeaningIntent, message: string, t: TimeInfo) {
  const m = message.toLowerCase()
  if (intent === 'real_fact_time_date') {
    const d = new Date(t.iso)
    return `วันนี้ ${d.toLocaleDateString('th-TH', { dateStyle: 'full', timeZone: 'Asia/Seoul' })} นะพี่`
  }
  if (intent === 'real_fact_weather') return 'พี่อยู่แถวไหนอะ เดี๋ยวน้ำดูให้ตรงพื้นที่เลย ไม่อยากเดาแล้วพี่แต่งตัวผิด'
  if (intent === 'real_fact_law_visa_money') return 'อันนี้เป็นข้อมูลที่เอาไปใช้จริงนะพี่ น้ำขอเช็กให้ชัวร์ก่อน จะได้ไม่พาพี่พลาด'
  if (intent === 'real_fact_news_schedule') return 'อันนี้ต้องดูข้อมูลจริงก่อนพี่ น้ำไม่อยากเดาเรื่องวันหยุดหรือข่าวให้พี่ผิด'
  return 'อันนี้ขอเช็กให้ชัวร์ก่อนพี่'
}

function localReply(intent: MeaningIntent, message: string, t: TimeInfo, r: () => number) {
  if (intent === 'user_complaint_about_reply') return pick(replies.complaint, r)
  if (intent === 'teasing_question') return pick(replies.teasing, r)
  if (intent === 'ask_companion_activity') return pick(replies.activity, r)
  if (intent === 'ask_companion_place') return pick(replies.place, r)
  if (intent === 'ask_companion_dayoff') return pick(replies.dayoff, r)
  if (intent === 'ask_companion_food') return pick(replies.food, r)
  if (intent === 'ask_companion_sleep') return pick(replies.sleep, r)
  if (intent === 'ask_companion_work_study') return pick(replies.workStudy, r)
  if (intent === 'affection_request') return pick(replies.flirt, r)
  if (intent === 'romantic_signal') return pick(replies.romance, r)
  if (intent === 'relationship_memory' || intent === 'jealousy_trigger') return pick(replies.memory, r)
  if (intent === 'user_pain') return pick(replies.pain, r)
  if (intent.startsWith('real_fact')) return factReply(intent, message, t)
  return pick(replies.casual, r)
}

export function runMeaningHumanCore(input: Input): MeaningResult {
  const message = s(input.message)
  const t = getTime(input.clientTime)
  const intent = detectIntent(message)
  const world = worldFromIntent(intent)
  const seed = makeSeed([dnaSeed(input.dna, input.appMemory), t.dateKey, t.hourKey, message, intent, input.requestSalt, (input.recent || []).length])
  const r = seededRandom(seed)

  let state = mergeState(input.humanGraphState, t)
  state = updateState(state, intent, message)
  const shape = chooseShape(intent, state, r)
  const status = statusText(t, state, r)
  const fallback = localReply(intent, message, t, r)

  const localIntents: MeaningIntent[] = [
    'user_complaint_about_reply',
    'teasing_question',
    'ask_companion_activity',
    'ask_companion_place',
    'ask_companion_food',
    'ask_companion_sleep',
    'ask_companion_dayoff',
    'ask_companion_work_study',
    'affection_request',
    'romantic_signal',
    'relationship_memory',
    'jealousy_trigger',
    'user_pain',
  ]

  state.lastIntent = intent
  state.lastReplyShape = shape
  state.lastUpdatedAt = t.iso

  return {
    world,
    intent,
    mainPoint: mainPoint(intent, message),
    mustAnswer: mainPoint(intent, message),
    avoid: avoidList(world),
    replyShape: shape,
    stateLine: `${status} — ${mainPoint(intent, message)}`,
    fallbackReply: fallback,
    statusText: status,
    shouldUseLocalReply: localIntents.includes(intent),
    updatedHumanState: state,
    updatedLastSeenAt: t.iso,
  }
}

export function buildHumanPrompt(result: MeaningResult) {
  return `
คุณคือน้องน้ำ กำลังแชตกับพี่แมนในแชตส่วนตัว

สิ่งที่ต้องตอบให้ตรง:
${result.mustAnswer}

อารมณ์ตอนนี้:
${result.stateLine}

ทรงคำตอบ:
${result.replyShape}

ห้าม:
${result.avoid.join('\n')}

ตอบเฉพาะประโยคที่น้องน้ำควรพูดออกไป
`.trim()
}

export function cleanOutput(reply: string) {
  return s(reply)
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/\[[\s\S]*?\]/g, '')
    .trim()
}

export function isBadOutput(reply: string, result: MeaningResult) {
  const out = s(reply)
  if (!out) return true
  if (AI_BAD_PATTERNS.some(rx => rx.test(out))) return true
  if (result.world !== 'real_fact' && /(ข้อมูลจริง|ปฏิทิน|ต้องเช็ก|ตรวจสอบ|ไม่ควรเดา)/i.test(out)) return true
  if (out.length > 420 && result.world !== 'real_fact') return true
  return false
}
