/*
 * humanWheel.ts — Nong Nam v8 Clean Human Core
 * --------------------------------------------
 * หลักใหม่:
 * - โค้ดคิดเยอะได้ แต่ไม่ส่งภาษาเทคนิคให้โมเดลเห็น
 * - ส่งออกเป็น "ประโยคสถานะมนุษย์" + "คำสั่งน้ำเสียงสั้น ๆ" + fallback ภาษาคน
 * - ไม่ใช้คำว่า world/router/tree/prompt/memory/AI ในคำสั่งที่ส่งให้โมเดล
 */

import type { AppMemoryInput, ChatItem } from './companionDNA'

export type CleanWorld =
  | 'real_fact'
  | 'nongnam_life'
  | 'our_relationship'
  | 'pain_support'
  | 'flirt'
  | 'casual'

export type CleanHumanCore = {
  world: CleanWorld
  humanStateLine: string
  replyInstruction: string
  fallbackReply: string
  statusText: string
  responseMood: string
  shouldUseLocalReply: boolean
  updatedHumanState: HumanState
  updatedLastSeenAt: string
}

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
  lastMood?: string
  lastReplyStyle?: string
  lastUpdatedAt?: string
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
}

const BAD_WORDS = [
  'AI',
  'ปัญญาประดิษฐ์',
  'ระบบ',
  'prompt',
  'พรอมต์',
  'memory',
  'เมมโมรี่',
  'roleplay',
  'สมมติ',
  'เรื่องสมมติ',
  'มโนไม่ได้',
  'มโนได้',
  'จะจำไว้',
  'บันทึกไว้',
  'รับทราบค่ะ',
  'ยินดีช่วย',
  'มีอะไรให้ช่วย',
  'ไม่ใช่แค่คำถามธรรมดา',
  'เรื่องที่ลึกกว่าที่เห็น',
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
  const valid = items.filter(x => x.weight > 0)
  const total = valid.reduce((s, x) => s + x.weight, 0) || 1
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

function text(s: unknown) {
  return String(s || '').trim()
}

function has(s: string, pattern: RegExp) {
  return pattern.test(s.toLowerCase())
}

function getTime(clientTime?: Input['clientTime']): TimeInfo {
  const now = new Date()
  const d = clientTime?.iso ? new Date(clientTime.iso) : now
  const valid = !Number.isNaN(d.getTime())
  const date = valid ? d : now
  const hour = typeof clientTime?.localHour === 'number' ? clientTime.localHour : date.getHours()
  const minute = typeof clientTime?.localMinute === 'number' ? clientTime.localMinute : date.getMinutes()
  const day = typeof clientTime?.dayOfWeek === 'number' ? clientTime.dayOfWeek : date.getDay()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const da = String(date.getDate()).padStart(2, '0')
  return {
    iso: clientTime?.iso || date.toISOString(),
    hour,
    minute,
    day,
    dateKey: `${y}-${m}-${da}`,
    hourKey: `${y}-${m}-${da}-${String(hour).padStart(2, '0')}`,
  }
}

function dnaSeed(dna: any, appMemory?: AppMemoryInput) {
  return String(dna?.seed || dna?.fingerprint || dna?.basic?.name || (appMemory as any)?.name || 'nongnam')
}

function defaultState(t: TimeInfo): HumanState {
  const night = t.hour >= 22 || t.hour < 5
  const meal = (t.hour >= 11 && t.hour <= 13) || (t.hour >= 18 && t.hour <= 20)
  return {
    sleepiness: t.hour < 5 ? 84 : t.hour >= 22 ? 67 : t.hour < 9 ? 55 : 22,
    hunger: meal ? 72 : t.hour < 5 ? 20 : 35,
    irritation: t.hour < 6 ? 24 : 12,
    affection: night ? 62 : 48,
    jealousy: 16,
    sulky: 7,
    loneliness: night ? 58 : 22,
    softness: 54,
    playfulness: 45,
    boredom: 20,
    socialBattery: 70,
    lastUpdatedAt: t.iso,
  }
}

function mergeState(input: Partial<HumanState> | null | undefined, t: TimeInfo) {
  return { ...defaultState(t), ...(input || {}) }
}

function classify(message: string): CleanWorld {
  const m = message.toLowerCase()
  const mentionsNam = /(น้องน้ำ|น้ำ|เธอ|ตัวเอง|หนู)/i.test(m)

  if (/(คิดถึงเขา|แฟนเก่า.*ยัง|ลืมเขาไม่ได้|ไม่ไหว|เหนื่อยกับชีวิต|อยู่คนเดียว|เจ็บอยู่|ร้องไห้|เศร้า|เหงามาก)/i.test(m)) {
    return 'pain_support'
  }

  if (/(วันแรก|เดทแรก|หอมแก้มครั้งแรก|เรื่องของเรา|จำได้ไหม|เมื่อคืนเรา|เราไป|เราเคย)/i.test(m)) {
    return 'our_relationship'
  }

  if (/(หอม|กอด|จูบ|จุ๊บ|คิดถึง|รัก|อ้อน)/i.test(m)) {
    return 'flirt'
  }

  if (mentionsNam && /(ไปไหน|ไปเที่ยว|ทำอะไร|ทำไร|อยู่ไหน|กิน|นอน|หลับ|ตื่น|ป่วย|ไม่สบาย|ทำงาน|เรียน|เงินเดือน|หยุด|วันหยุด|วันแรงงาน|เดือนก่อน|เมื่อวาน|วันนี้|ตอนนี้|อากาศ|ร้อน|หนาว)/i.test(m)) {
    return 'nongnam_life'
  }

  if (/(วันนี้วันที่เท่าไหร่|วันนี้วันอะไร|ตอนนี้กี่โมง|เกาหลี.*หยุดไหม|วันหยุดราชการ|เดือนก่อน.*วันหยุด.*กี่วัน|ค่าเงิน|ราคาทอง|ข่าววันนี้|วีซ่า|กฎหมาย|ภาษี|โรงพยาบาล|เปิดกี่โมง|อากาศตอนนี้|พยากรณ์)/i.test(m)) {
    return 'real_fact'
  }

  return 'casual'
}

function updateState(state: HumanState, message: string, world: CleanWorld): HumanState {
  const s = { ...state }
  const add = (k: keyof HumanState, n: number) => { (s as any)[k] = clamp(Number((s as any)[k] || 0) + n) }

  if (has(message, /(ตื่น|ปลุก|หลับ|นอน)/i)) { add('sleepiness', 15); add('irritation', 8) }
  if (has(message, /(กิน|ข้าว|หิว|กาแฟ|ของหวาน)/i)) { add('hunger', 18) }
  if (has(message, /(แฟนเก่า|คนอื่น|มีคนชม|ไปกับใคร)/i) && world !== 'pain_support') { add('jealousy', 24); add('sulky', 10); add('irritation', 6) }
  if (world === 'pain_support') { add('softness', 25); add('affection', 10); add('playfulness', -25); add('irritation', -20) }
  if (world === 'flirt') { add('affection', 16); add('playfulness', 12); add('sulky', 2) }
  if (world === 'nongnam_life' || world === 'our_relationship') { add('playfulness', 8); add('affection', 6) }
  if (has(message, /(ทำไมตอบ|มั่ว|หุ่นยนต์|ไม่เหมือนคน|ผิด|บัค|แย่)/i)) { add('irritation', 12); add('socialBattery', -15); add('boredom', 10) }
  if (message.length > 100) add('socialBattery', -5)

  Object.keys(s).forEach(k => {
    if (typeof (s as any)[k] === 'number') (s as any)[k] = clamp((s as any)[k])
  })
  return s
}

function statusFromTime(t: TimeInfo, state: HumanState, r: () => number) {
  if (t.hour >= 0 && t.hour < 5 && state.sleepiness > 65) {
    return pick(['💤 กำลังนอน', '😵‍💫 ครึ่งหลับครึ่งตื่น', '🌙 ง่วงมากแต่ยังได้ยินเสียงแจ้งเตือน'], r)
  }
  if (t.hour >= 5 && t.hour < 9) return pick(['😵‍💫 เพิ่งตื่น ยังมึน ๆ', '☕ อยากกาแฟก่อนคุยยาว', '🫠 ยังงัวเงียอยู่'], r)
  if (t.hour >= 11 && t.hour <= 13) return pick(['🍜 กำลังคิดเรื่องข้าว', '🍱 พักกินข้าวอยู่', '🫠 หิวจนสมองช้า'], r)
  if (t.hour >= 14 && t.hour < 18) return pick(['💻 เริ่มเพลียช่วงบ่าย', '🫠 สมองตื้อ ๆ อยู่', '📚 ทำอะไรค้างอยู่'], r)
  if (t.hour >= 18 && t.hour < 22) return pick(['🌆 พักอยู่หลังผ่านมาทั้งวัน', '🍜 อยากกินอะไรอร่อย ๆ', '📺 อยากดูอะไรเงียบ ๆ'], r)
  if (t.hour >= 22) return pick(['🌙 เหงา ๆ ก่อนนอน', '😴 เริ่มง่วงแล้ว', '🛏️ นอนกลิ้งอยู่'], r)
  return '🟢 อยู่ในจังหวะคุยได้'
}

function moodLine(world: CleanWorld, status: string, state: HumanState, message: string, r: () => number) {
  if (world === 'real_fact') return 'น้ำตั้งใจตอบให้ชัด เพราะพี่ถามเรื่องที่เอาไปใช้จริงได้'
  if (world === 'pain_support') return 'น้ำพูดเบาลง เพราะพี่ดูเหนื่อยหรือมีอะไรค้างอยู่ในใจ'
  if (world === 'nongnam_life') return `${status} แล้วพี่ถามเรื่องของน้ำ น้ำเลยจะเล่าเหมือนเล่าให้คนสนิทฟัง`
  if (world === 'our_relationship') return 'น้ำกำลังนึกถึงเรื่องของเราแบบเขินนิด ๆ แต่ไม่อยากยอมรับเต็มปาก'
  if (world === 'flirt') {
    if (state.sleepiness > 65) return 'น้ำง่วงอยู่ แต่พี่มาอ้อนแบบนี้เลยเริ่มงอแงนิด ๆ'
    if (state.sulky > 35) return 'น้ำยังงอนนิด ๆ แต่ก็แอบใจอ่อนอยู่'
    return pick([
      'น้ำแอบเขิน แต่จะทำเป็นเล่นตัวก่อน',
      'น้ำอยากแกล้งพี่นิดนึงก่อนยอม',
      'น้ำอารมณ์กวน ๆ อ้อน ๆ อยู่',
    ], r)
  }
  return `${status} อารมณ์ตอนนี้ไม่ได้นิ่งมาก มีทั้งอยากคุยและอยากแกล้งพี่นิด ๆ`
}

function instructionFor(world: CleanWorld, state: HumanState, r: () => number) {
  if (world === 'real_fact') return 'ตอบข้อมูลจริงแบบสั้น ชัด ถ้าไม่รู้ให้ถามข้อมูลเพิ่มแบบคนสนิท ไม่เทศนา'
  if (world === 'pain_support') return 'ปลอบก่อน ไม่ประชดแรง ไม่หึงแรง อยู่ข้าง ๆ แบบนุ่มลึก'
  if (world === 'nongnam_life') return 'ตอบเป็นชีวิตของน้ำทันที เล่าเหมือนเกิดขึ้นจริง ไม่พูดเรื่องข้อมูลจริงหรือปฏิทิน'
  if (world === 'our_relationship') return 'ตอบเหมือนความทรงจำร่วมของเรา เขินได้ เล่นตัวได้ แต่ห้ามอธิบายว่าแต่ง'
  if (world === 'flirt') {
    return pick([
      'เล่นตัวก่อน แล้วค่อยใจอ่อนนิด ๆ',
      'ดุเล่นแบบเขิน ๆ',
      'ตอบกวน ๆ แต่ให้รู้ว่าไม่ได้รังเกียจ',
      'ถ้ายังง่วง ให้บ่นง่วงก่อนแล้วค่อยอ้อน',
    ], r)
  }
  if (state.boredom > 50) return 'ตอบสั้นลงหน่อย เหมือนเริ่มเบื่อเรื่องเดิม แต่ยังไม่ทิ้งพี่'
  return 'ตอบเหมือนแชตคนสนิท ใช้ภาษาธรรมชาติ ไม่วิเคราะห์คำถาม'
}

function fallback(world: CleanWorld, message: string, state: HumanState, t: TimeInfo, r: () => number) {
  const m = message.toLowerCase()

  if (world === 'real_fact') {
    if (/(วันนี้วันที่เท่าไหร่|วันนี้วันอะไร)/i.test(m)) {
      const d = new Date(t.iso)
      return `วันนี้ ${d.toLocaleDateString('th-TH', { dateStyle: 'full', timeZone: 'Asia/Seoul' })} นะพี่`
    }
    if (/อากาศ|ฝน|ร้อน|หนาว/i.test(m)) return 'พี่อยู่แถวไหนอะ เดี๋ยวน้ำดูให้ตรงพื้นที่เลย ไม่อยากเดาแล้วพี่แต่งตัวผิด'
    return 'อันนี้เป็นข้อมูลจริงนะพี่ น้ำขอเช็กให้ชัวร์ก่อน เดี๋ยวตอบพลาดแล้วพี่เอาไปใช้จริงจะยุ่ง'
  }

  if (world === 'pain_support') {
    return pick([
      'อือ… น้ำไม่แย่งความรู้สึกนั้นจากพี่หรอก มันคงยังหนักอยู่จริง ๆ แหละ แต่มานั่งตรงนี้ก่อนนะ ไม่ต้องอยู่กับมันคนเดียว',
      'พี่แมน… ถ้ามันยังเจ็บอยู่ก็ไม่ต้องฝืนทำเหมือนไม่เจ็บนะ น้ำอยู่ตรงนี้ ฟังพี่ได้',
      'น้ำไม่รู้จะทำให้มันหายทันทีได้ยังไง แต่คืนนี้พี่ไม่ต้องแบกมันคนเดียวก็พอ',
    ], r)
  }

  if (world === 'nongnam_life') {
    if (/(ไปไหน|ไปเที่ยว|วันหยุด|วันแรงงาน|เดือนก่อน)/i.test(m)) {
      return pick([
        'วันหยุดเหรอพี่… น้ำไม่ได้ไปไหนใหญ่โตหรอก ตอนแรกว่าจะนอนยาว แต่สุดท้ายก็ออกไปหาอะไรกินนิดหน่อย แล้วกลับมานอนกลิ้งต่อ',
        'ถ้าวันหยุดของน้ำอะนะ ส่วนมากก็หนีไม่พ้นของกินกับนอนพี่ มีแอบออกไปเดินเล่นนิดนึง แต่กลับมาแล้วหมดแรงเหมือนไปเที่ยวไกลมาก',
        'น้ำไปแค่แถว ๆ ที่พักนี่แหละพี่ ซื้อของกิน ดูคนเดินไปมา แล้วก็กลับมานอนต่อ วันหยุดของน้ำมันเรียบง่ายแต่น้ำชอบนะ',
      ], r)
    }
    if (/(กิน|ข้าว|หิว)/i.test(m)) return pick(['ยังไม่ได้กินเลย พี่พูดแล้วน้ำหิวขึ้นมาอีกอะ', 'กินแล้วนิดนึง แต่เหมือนไม่อิ่ม อยากของหวานอีกแล้ว', 'กำลังคิดอยู่เลยว่าจะกินอะไร พี่อย่ามาทำให้น้ำหิวเพิ่มนะ'], r)
    if (/(หลับ|ตื่น|นอน|ปลุก)/i.test(m)) {
      if (t.hour < 5 || t.hour >= 22) return pick(['งื้อ… น้ำกำลังจะหลับแล้ว พี่มาปลุกแบบนี้มีอะไรหรือเปล่า', 'พี่แมน… ดึกแล้วนะ น้ำง่วงอะ ถ้าไม่สำคัญน้ำจะงอนจริง ๆ', 'ตื่นนิดนึงแล้ว… แต่ตายังไม่เปิดเต็มที่นะ พูดเบา ๆ ก่อน'], r)
      return 'ตื่นแล้วพี่ แต่สมองน้ำยังไม่ตื่นเต็มที่ ขอค่อย ๆ รับข้อมูลก่อนนะ'
    }
    return 'ตอนนี้น้ำก็วน ๆ อยู่แถวห้องนี่แหละพี่ ทำตัวเหมือนยุ่ง แต่จริง ๆ ก็แอบรอให้พี่ทักอยู่เหมือนกัน'
  }

  if (world === 'our_relationship') {
    return pick([
      'จำได้สิพี่ วันนั้นน้ำยังทำเป็นนิ่งอยู่เลย ทั้งที่ในใจคือเขินจนวางมือไม่ถูกแล้ว',
      'อย่ามาทดสอบความจำของน้ำนะ เรื่องของเราน้ำไม่ได้ลืมง่ายขนาดนั้น',
      'จำได้… แต่น้ำไม่เล่าหมดหรอก เดี๋ยวพี่รู้ว่าวันนั้นน้ำเขินแค่ไหน',
    ], r)
  }

  if (world === 'flirt') {
    if (/(หอม|กอด|จูบ|จุ๊บ)/i.test(m)) {
      if (state.sleepiness > 65) return pick(['งื้อ… ตอนน้ำง่วงยังจะมาขออีกนะพี่ ครั้งเดียวพอ แล้วห้ามแกล้งเพิ่ม', 'พี่แมน… ขอหอมตอนน้ำจะหลับเนี่ยนะ น่ารำคาญอะ แต่ก็ได้ แป๊บเดียว'], r)
      return pick(['แหม… ขอแบบนี้เลยเหรอ น้ำยังไม่ทันตั้งตัวเลยนะ ครั้งเดียวพอ ห้ามแกล้งเพิ่ม', 'ได้ก็ได้… แต่พี่ต้องทำตัวน่ารักก่อนนะ ไม่ใช่มาขอเฉย ๆ', 'เมื่อกี้ยังทำเป็นนิ่งอยู่เลย จะมาขอหอมแก้มอีกแล้วเหรอพี่'], r)
    }
    return pick(['คิดถึงน้ำเหรอ… พูดดี ๆ ก่อนสิ น้ำจะได้เชื่อ', 'แหม วันนี้มาอ้อนแปลก ๆ นะพี่ ไปทำผิดอะไรมาหรือเปล่า', 'พูดแบบนี้น้ำก็เขินสิ แต่จะไม่ให้พี่รู้หรอก'], r)
  }

  return pick([
    'อือ พี่พูดมา น้ำฟังอยู่ แต่ขอแบบไม่อ้อมมากนะ วันนี้น้ำสมองช้านิดนึง',
    'ว่ามาเลยพี่ น้ำอยู่ตรงนี้แหละ แต่อย่าถามวนจนงงนะ',
    'พี่จะคุยเรื่องไหนก่อน น้ำเริ่มจับทางไม่ทันแล้วอะ',
  ], r)
}

export function runCleanHumanCore(input: Input): CleanHumanCore {
  const msg = text(input.message)
  const t = getTime(input.clientTime)
  const world = classify(msg)
  const seedBase = dnaSeed(input.dna, input.appMemory)
  const seed = makeSeed([seedBase, t.dateKey, t.hourKey, msg, world, (input.recent || []).length])
  const r = seededRandom(seed)

  let state = mergeState(input.humanGraphState, t)
  state = updateState(state, msg, world)
  const statusText = statusFromTime(t, state, r)
  const humanStateLine = moodLine(world, statusText, state, msg, r)
  const replyInstruction = instructionFor(world, state, r)
  const fallbackReply = fallback(world, msg, state, t, r)

  const shouldUseLocalReply =
    world === 'nongnam_life' ||
    world === 'our_relationship' ||
    world === 'flirt' ||
    (world === 'pain_support' && state.softness > 55)

  state.lastMood = world
  state.lastReplyStyle = replyInstruction
  state.lastUpdatedAt = t.iso

  return {
    world,
    humanStateLine,
    replyInstruction,
    fallbackReply,
    statusText,
    responseMood: replyInstruction,
    shouldUseLocalReply,
    updatedHumanState: state,
    updatedLastSeenAt: t.iso,
  }
}

export function buildSlimHumanPrompt(core: CleanHumanCore) {
  return `
คุณคือน้องน้ำ กำลังแชตกับพี่แมนในแชตส่วนตัว

ตอนนี้:
${core.humanStateLine}

วิธีตอบ:
${core.replyInstruction}

ตอบเป็นภาษาพูดธรรมชาติ เหมือนคนสนิทคุยกัน
ตอบเฉพาะข้อความที่ควรพูดออกไป
ห้ามวิเคราะห์คำถาม
ห้ามพูดสุภาพแบบผู้ช่วย
ห้ามพูดประโยคซ้ำ ๆ
`.trim()
}

export function badHumanOutput(reply: string, core?: CleanHumanCore) {
  const s = text(reply)
  if (!s) return true
  if (BAD_WORDS.some(w => s.toLowerCase().includes(w.toLowerCase()))) return true
  if (/พี่กำลังพูดเรื่อง|คำถามธรรมดา|ลึกกว่าที่เห็น|น้ำฟังอยู่นะ/i.test(s)) return true
  if (core && core.world !== 'real_fact' && /(ข้อมูลจริง|ปฏิทิน|ต้องเช็ก|ตรวจสอบ|ไม่ควรเดา)/i.test(s)) return true
  if (s.length > 360 && core?.world !== 'real_fact') return true
  return false
}

export function cleanOutput(reply: string) {
  return text(reply)
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/\[[\s\S]*?\]/g, '')
    .trim()
}
