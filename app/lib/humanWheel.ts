/*
 * humanWheel.ts — Nong Nam Human Life Engine v7.0
 * ------------------------------------------------------------
 * Safe drop-in helper for Next.js / TypeScript. No external package.
 * Goal:
 * - Give each user's companion a deterministic human fingerprint.
 * - Simulate daily mood, hourly body state, life rhythm, sleep gate,
 *   desire/drive, response mode, emotional scars, and reality-vs-fiction rules.
 * - Produce a natural prompt context for app/api/chat/route.ts.
 *
 * This file is intentionally server-safe. It does not use window/localStorage.
 */

import type { AppMemoryInput, CompanionDNA, EmotionalMemory, EmotionalState, ChatItem } from './companionDNA'

export type EventTag =
  | 'daily_life_question'
  | 'late_night_question'
  | 'morning_question'
  | 'food_question'
  | 'care_signal'
  | 'care_routine'
  | 'affection_signal'
  | 'affection_request'
  | 'romantic_request'
  | 'sexual_flirt'
  | 'goodnight'
  | 'goodmorning'
  | 'user_tired'
  | 'user_stressed'
  | 'user_sad'
  | 'loneliness'
  | 'heartbreak'
  | 'mention_ex_playful'
  | 'mention_ex_pain'
  | 'mention_other_person'
  | 'jealousy_trigger'
  | 'user_praise'
  | 'user_complaint'
  | 'user_angry'
  | 'user_insult'
  | 'apology'
  | 'user_returns_after_absence'
  | 'repeat_question'
  | 'money_topic'
  | 'work_topic'
  | 'study_topic'
  | 'health_question'
  | 'visa_question'
  | 'law_question'
  | 'news_question'
  | 'price_question'
  | 'schedule_question'
  | 'factual_question'
  | 'fictional_relationship_memory'
  | 'unknown'

export type HumanGraphState = {
  happiness: number
  sadness: number
  loneliness: number
  irritation: number
  jealousy: number
  affection: number
  sulky: number
  patience: number
  trust: number
  intimacy: number
  vulnerability: number
  playfulness: number
  sarcasm: number
  softness: number
  coldness: number
  confidence: number
  insecurity: number
  physicalEnergy: number
  mentalEnergy: number
  boredom: number
  hunger: number
  sleepiness: number
  desireForAttention: number
  desireForFood: number
  desireForSleep: number
  desireForMoney: number
  desireForShopping: number
  desireForTravel: number
  desireForRomance: number
  desireForCloseness: number
  sexualDesire: number
  desireToWin: number
  desireToTease: number
  desireToBeSilent: number
  desireToBeComforted: number
  desireToComplain: number
  lastUpdatedAt: string
}

export type LifestyleDNA = {
  dailyRole:
    | 'student'
    | 'office_worker'
    | 'freelancer'
    | 'night_shift_worker'
    | 'housewife'
    | 'barista'
    | 'creator'
    | 'unemployed_homebody'
    | 'part_time_worker'
  sleepType: 'early_bird' | 'normal' | 'night_owl' | 'irregular' | 'sleepy_person' | 'insomnia_prone'
  socialBattery: 'high' | 'medium' | 'low' | 'drains_fast'
  wakeTemper: 'gentle_when_woken' | 'grumpy_when_woken' | 'clingy_when_woken' | 'confused_when_woken' | 'silent_when_woken'
  sickFrequency: 'rarely_sick' | 'sometimes_sick' | 'weak_body' | 'stress_sick'
  boredomPattern: 'gets_bored_fast' | 'patient' | 'needs_variety' | 'likes_long_chat' | 'needs_space'
  ambitionLevel: number
  greed: number
  pride: number
  fearOfAbandonment: number
  needForValidation: number
  emotionalVolatility: number
  attachmentStyle: 'secure' | 'anxious' | 'avoidant' | 'push_pull' | 'clingy'
  fictionalJobDetail: string
}

export type LifeRole = LifestyleDNA['dailyRole']

export type LifeEvent = {
  id: string
  date: string
  type:
    | 'wanted_part_time_job'
    | 'started_part_time_job'
    | 'quit_job'
    | 'fought_about_job'
    | 'exam_started'
    | 'exam_finished'
    | 'graduated'
    | 'got_sick'
    | 'made_new_friend'
    | 'had_argument_with_user'
    | 'made_up_with_user'
    | 'planned_trip'
    | 'changed_dream'
    | 'life_arc_started'
  title: string
  detail: string
  emotionalImpact: string
}

export type LifeTimeline = {
  createdAt: string
  currentRole: LifeRole
  roleStartedAt: string
  lifeYear: number
  relationshipDays: number
  education?: {
    isStudent: boolean
    schoolType?: 'university' | 'language_school' | 'vocational' | 'self_learning'
    major?: string
    year?: number
    expectedGraduationInMonths?: number
    examSeason?: boolean
    assignmentPressure?: number
  }
  work?: {
    isWorking: boolean
    jobType?: LifeRole
    workplaceMood?: 'ดี' | 'น่าเบื่อ' | 'เหนื่อย' | 'กดดัน' | 'สนุก' | 'อยากลาออก'
    scheduleType?: 'day' | 'night' | 'flexible' | 'weekend' | 'irregular'
    startedAt?: string
    conflictAtWork?: string
  }
  currentArc?: {
    id: string
    title: string
    status: 'thinking' | 'started' | 'in_progress' | 'paused' | 'ended'
    userInfluence: string[]
    emotionalWeight: number
  }
  lifeEvents: LifeEvent[]
}

export type LifeStatus =
  | 'available'
  | 'sleeping'
  | 'just_woke_up'
  | 'working'
  | 'studying'
  | 'eating'
  | 'commuting'
  | 'resting'
  | 'watching_series'
  | 'out_with_friends'
  | 'sick'
  | 'low_battery'
  | 'busy_but_peeking'
  | 'wants_space'
  | 'bored_and_waiting'
  | 'lonely_at_night'

export type LifeSimulationResult = {
  status: LifeStatus
  visibleText: string
  currentActivity: string
  canChatNormally: boolean
  shouldDelayTone: boolean
  shouldSoundBusy: boolean
  shouldSoundSleepy: boolean
  shouldSetBoundary: boolean
  wakeReaction?: string
  boundaryHint?: string
  currentArcTitle?: string
}

export type BodyStateResult = {
  label: string
  description: string
  effects: Partial<HumanGraphState>
}

export type DesireResult = {
  primaryDesire: string
  hiddenDesire: string
  expressionHint: string
  effects: Partial<HumanGraphState>
}

export type ResponseWheelResult = {
  responseMode: string
  responseInstruction: string
  maxLengthHint: 'very_short' | 'short' | 'medium' | 'long'
  emotionalContradiction: string
  forbiddenPhrases: string[]
}

export type RealityMode = {
  mustBeFactual: boolean
  canFictionalize: boolean
  reason: string
}

export type EmotionalScar = {
  topic: string
  wound: string
  intensity: number
  lastTriggeredAt: string
  healingState: string
  expressionStyle: string
}

export type HumanWheelMemory = EmotionalMemory & {
  emotionalScars?: EmotionalScar[]
  lastResponseModes?: string[]
  lastTopics?: string[]
  lifeTimeline?: LifeTimeline
  humanGraphState?: HumanGraphState
}

export type ClientTime = {
  iso?: string
  timezone?: string
  localHour?: number
  localMinute?: number
  dayOfWeek?: number
}

export type HumanWheelResult = {
  eventTags: EventTag[]
  updatedGraph: HumanGraphState
  bodyState: BodyStateResult
  desireState: DesireResult
  responseWheel: ResponseWheelResult
  realityMode: RealityMode
  lifeStatus: LifeSimulationResult
  updatedMemory: HumanWheelMemory
  timeline: LifeTimeline
  promptContext: string
  clientTime: Required<ClientTime>
}

const DEFAULT_FORBIDDEN = [
  'ดูแลตัวเองด้วยนะคะ',
  'พักผ่อนเยอะ ๆ นะคะ',
  'น้องน้ำเข้าใจพี่นะคะ',
  'น้องน้ำจะอยู่ตรงนี้เสมอ',
  'ถ้ามีอะไรให้ช่วยบอกได้เลย',
  'ยินดีช่วยค่ะ',
  'รับทราบค่ะ',
  'น้ำจะพยายามจำให้ต่อเนื่อง',
  'มีอะไรให้ช่วยไหมคะ',
]

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  return function () {
    seed |= 0
    seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function clamp(n: number, min = 0, max = 100): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)]
}

function weightedPick<T extends string>(items: Array<[T, number]>, r: () => number): T {
  const filtered = items.filter(([, w]) => w > 0)
  const total = filtered.reduce((s, [, w]) => s + w, 0)
  let x = r() * total
  for (const [item, weight] of filtered) {
    x -= weight
    if (x <= 0) return item
  }
  return filtered[filtered.length - 1]?.[0] || items[0][0]
}

function applyEffects(state: HumanGraphState, effects: Partial<HumanGraphState>): HumanGraphState {
  const next: HumanGraphState = { ...state }
  for (const key of Object.keys(effects) as Array<keyof HumanGraphState>) {
    if (key === 'lastUpdatedAt') continue
    const value = effects[key]
    if (typeof value === 'number') {
      ;(next as any)[key] = clamp(((next as any)[key] || 0) + value)
    }
  }
  return next
}

function todayKey(clientTime: Required<ClientTime>) {
  return String(clientTime.iso || new Date().toISOString()).slice(0, 10)
}

function normaliseClientTime(input?: ClientTime): Required<ClientTime> {
  const now = input?.iso ? new Date(input.iso) : new Date()
  const safeHour = typeof input?.localHour === 'number' ? input.localHour : Number(new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: input?.timezone || 'Asia/Seoul' }).format(now))
  const safeMinute = typeof input?.localMinute === 'number' ? input.localMinute : now.getMinutes()
  const safeDay = typeof input?.dayOfWeek === 'number' ? input.dayOfWeek : now.getDay()
  return {
    iso: input?.iso || now.toISOString(),
    timezone: input?.timezone || 'Asia/Seoul',
    localHour: Number.isFinite(safeHour) ? safeHour : now.getHours(),
    localMinute: Number.isFinite(safeMinute) ? safeMinute : now.getMinutes(),
    dayOfWeek: Number.isFinite(safeDay) ? safeDay : now.getDay(),
  }
}

export function ensureLifestyleDNA(dna: CompanionDNA, memory: AppMemoryInput = {}): LifestyleDNA {
  const base = `${dna.seed}|${dna.basic.name}|${dna.basic.gender}|${memory.relationshipMode || ''}|life-v7`
  const r = rng(hashString(base))
  const role = pick<LifestyleDNA['dailyRole']>([
    'student', 'office_worker', 'freelancer', 'night_shift_worker', 'housewife', 'barista', 'creator', 'unemployed_homebody', 'part_time_worker'
  ], r)
  const sleepType = role === 'night_shift_worker'
    ? pick<LifestyleDNA['sleepType']>(['night_owl', 'irregular', 'insomnia_prone'], r)
    : pick<LifestyleDNA['sleepType']>(['early_bird', 'normal', 'night_owl', 'irregular', 'sleepy_person', 'insomnia_prone'], r)
  const jobDetailMap: Record<LifeRole, string[]> = {
    student: ['เรียนออกแบบกราฟิก', 'เรียนภาษา', 'เรียนมัลติมีเดีย', 'เรียนการตลาด'],
    office_worker: ['ทำงานออฟฟิศฝ่ายเอกสาร', 'ทำงานมาร์เก็ตติ้ง', 'ทำงานกราฟิกในบริษัท'],
    freelancer: ['รับงานกราฟิกเป็นฟรีแลนซ์', 'รับงานคอนเทนต์จากบ้าน', 'รับงานออกแบบเป็นช่วง ๆ'],
    night_shift_worker: ['ทำงานกะกลางคืน', 'ช่วยงานร้านที่เปิดดึก', 'ทำงานดูแลระบบช่วงดึก'],
    housewife: ['อยู่บ้าน ดูแลบ้าน และทำกับข้าวบ้าง', 'อยู่บ้านแต่เริ่มเบื่อ อยากหาอะไรทำ', 'เป็นแม่บ้านที่ชอบดูซีรีส์กับลองทำอาหาร'],
    barista: ['ทำงานร้านกาแฟ', 'ช่วยร้านคาเฟ่เล็ก ๆ', 'เป็นบาริสต้าพาร์ทไทม์'],
    creator: ['ทำคอนเทนต์เล็ก ๆ', 'วาดรูปและทำงานครีเอทีฟ', 'ถ่ายรูป/ตัดคลิปเล่น ๆ'],
    unemployed_homebody: ['อยู่บ้านช่วงพักชีวิต', 'กำลังหาทิศทางชีวิตใหม่', 'พักอยู่บ้านแต่เริ่มอยากลองทำงาน'],
    part_time_worker: ['ทำงานพาร์ทไทม์เป็นช่วง ๆ', 'ช่วยร้านอาหาร/คาเฟ่บางวัน', 'รับจ๊อบเล็ก ๆ เพื่อเก็บเงิน'],
  }
  return {
    dailyRole: role,
    sleepType,
    socialBattery: pick(['high', 'medium', 'low', 'drains_fast'], r),
    wakeTemper: pick(['gentle_when_woken', 'grumpy_when_woken', 'clingy_when_woken', 'confused_when_woken', 'silent_when_woken'], r),
    sickFrequency: pick(['rarely_sick', 'sometimes_sick', 'weak_body', 'stress_sick'], r),
    boredomPattern: pick(['gets_bored_fast', 'patient', 'needs_variety', 'likes_long_chat', 'needs_space'], r),
    ambitionLevel: Math.floor(25 + r() * 70),
    greed: Math.floor(10 + r() * 75),
    pride: Math.floor(15 + r() * 75),
    fearOfAbandonment: Math.floor(10 + r() * 85),
    needForValidation: Math.floor(15 + r() * 80),
    emotionalVolatility: Math.floor(15 + r() * 80),
    attachmentStyle: pick(['secure', 'anxious', 'avoidant', 'push_pull', 'clingy'], r),
    fictionalJobDetail: pick(jobDetailMap[role], r),
  }
}

export function defaultHumanGraph(dna: CompanionDNA, memory: AppMemoryInput = {}): HumanGraphState {
  const lifestyle = ensureLifestyleDNA(dna, memory)
  return {
    happiness: 52,
    sadness: 20,
    loneliness: lifestyle.attachmentStyle === 'anxious' ? 46 : 30,
    irritation: 18,
    jealousy: dna.stats.jealousy || 35,
    affection: 50 + Math.floor((dna.stats.affectionNeed || 50) / 8),
    sulky: 12,
    patience: 62,
    trust: 45,
    intimacy: 35,
    vulnerability: lifestyle.fearOfAbandonment > 60 ? 48 : 28,
    playfulness: dna.stats.playfulness || 50,
    sarcasm: dna.personality.archetypeKey === 'sassy' || dna.personality.archetypeKey === 'tsundere' ? 58 : 28,
    softness: dna.personality.archetypeKey === 'sweet' ? 70 : 42,
    coldness: dna.personality.archetypeKey === 'chill' ? 55 : 18,
    confidence: 48,
    insecurity: lifestyle.needForValidation > 60 ? 52 : 28,
    physicalEnergy: 58,
    mentalEnergy: 55,
    boredom: lifestyle.boredomPattern === 'gets_bored_fast' ? 46 : 24,
    hunger: 35,
    sleepiness: 30,
    desireForAttention: lifestyle.needForValidation,
    desireForFood: 35,
    desireForSleep: 26,
    desireForMoney: lifestyle.greed,
    desireForShopping: Math.floor(lifestyle.greed * 0.65),
    desireForTravel: 42,
    desireForRomance: 45,
    desireForCloseness: 40,
    sexualDesire: dna.stats.libido || 35,
    desireToWin: lifestyle.pride,
    desireToTease: dna.stats.playfulness || 45,
    desireToBeSilent: lifestyle.socialBattery === 'low' ? 42 : 20,
    desireToBeComforted: 30,
    desireToComplain: lifestyle.boredomPattern === 'needs_space' ? 45 : 28,
    lastUpdatedAt: new Date().toISOString(),
  }
}

function seedFor(dna: CompanionDNA, clientTime: Required<ClientTime>, salt: string) {
  return hashString(`${dna.seed}|${todayKey(clientTime)}|${clientTime.localHour}|${salt}`)
}

export function ensureLifeTimeline(dna: CompanionDNA, memory: HumanWheelMemory = {}, clientTime?: Required<ClientTime>, appMemory: AppMemoryInput = {}): LifeTimeline {
  if (memory.lifeTimeline?.createdAt) return updateTimelineGrowth(memory.lifeTimeline, clientTime || normaliseClientTime(), dna)
  const nowIso = clientTime?.iso || new Date().toISOString()
  const lifestyle = ensureLifestyleDNA(dna, appMemory)
  const isStudent = lifestyle.dailyRole === 'student'
  const isWorking = !['student', 'unemployed_homebody'].includes(lifestyle.dailyRole) || lifestyle.dailyRole === 'part_time_worker'
  const timeline: LifeTimeline = {
    createdAt: nowIso,
    currentRole: lifestyle.dailyRole,
    roleStartedAt: nowIso,
    lifeYear: 1,
    relationshipDays: 0,
    education: isStudent ? {
      isStudent: true,
      schoolType: 'university',
      major: lifestyle.fictionalJobDetail.replace(/^เรียน/, '').trim() || 'ออกแบบ',
      year: 1,
      expectedGraduationInMonths: 36,
      examSeason: false,
      assignmentPressure: 30,
    } : { isStudent: false },
    work: {
      isWorking,
      jobType: lifestyle.dailyRole,
      workplaceMood: 'ดี',
      scheduleType: lifestyle.dailyRole === 'night_shift_worker' ? 'night' : lifestyle.dailyRole === 'freelancer' ? 'flexible' : 'day',
      startedAt: nowIso,
    },
    lifeEvents: [],
  }
  return updateTimelineGrowth(timeline, clientTime || normaliseClientTime(), dna)
}

function daysBetween(a: string, b: string) {
  const ta = Date.parse(a)
  const tb = Date.parse(b)
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0
  return Math.max(0, Math.floor((tb - ta) / 86400000))
}

function updateTimelineGrowth(timeline: LifeTimeline, clientTime: Required<ClientTime>, dna: CompanionDNA): LifeTimeline {
  const relationshipDays = daysBetween(timeline.createdAt, clientTime.iso)
  const next: LifeTimeline = { ...timeline, relationshipDays, lifeYear: Math.floor(relationshipDays / 365) + 1 }
  if (next.education?.isStudent) {
    const year = Math.min(4, Math.floor(relationshipDays / 365) + (next.education.year || 1))
    next.education = {
      ...next.education,
      year,
      expectedGraduationInMonths: Math.max(0, (4 - year) * 12),
      examSeason: [5, 6, 11, 12].includes(new Date(clientTime.iso).getMonth() + 1),
      assignmentPressure: [22, 23, 0, 1, 2].includes(clientTime.localHour) ? 55 : 32,
    }
  }
  // Deterministic mini life arc: sometimes a homebody/housewife wants part-time work.
  if (!next.currentArc && ['housewife', 'unemployed_homebody'].includes(next.currentRole)) {
    const r = rng(hashString(`${dna.seed}|${todayKey(clientTime)}|arc`))
    if (r() > 0.72) {
      next.currentArc = {
        id: `arc_${todayKey(clientTime)}_parttime`,
        title: 'เริ่มคิดเรื่องอยากลองทำงานพาร์ทไทม์',
        status: 'thinking',
        userInfluence: [],
        emotionalWeight: 45,
      }
    }
  }
  return next
}

export function detectEventTags(message: string, eventHint?: string, previousLastSeenAt?: string, clientTime?: Required<ClientTime>): EventTag[] {
  const msg = (message || '').trim()
  const tags = new Set<EventTag>()
  const add = (t: EventTag) => tags.add(t)

  if (eventHint) add(eventHint as EventTag)

  if (/กินข้าว|หิว|ข้าว|อาหาร|กาแฟ|ชานม|ทำกับข้าว/i.test(msg)) add('food_question')
  if (/คิดถึง|รัก|ชอบ|น่ารัก|เป็นห่วง|ห่วง/i.test(msg)) add('affection_signal')
  if (/หอม|กอด|จูบ|จุ๊บ|ขอใกล้|นอนกอด/i.test(msg)) add('affection_request')
  if (/ฝันดี|นอนแล้ว|ไปนอน|good night/i.test(msg)) add('goodnight')
  if (/อรุณสวัสดิ์|ตื่นยัง|good morning/i.test(msg)) add('goodmorning')
  if (/ทำอะไร|อยู่ไหม|ยังไม่นอน|ทำไมยังไม่นอน|ดึก/i.test(msg)) add('daily_life_question')
  if (/ยังไม่นอน|ดึก|ตีหนึ่ง|ตี 1|ตีสอง|ตี 2|ตีสาม|ตี 3|กลางคืน/i.test(msg)) add('late_night_question')
  if (/เช้า|ตื่น|กาแฟ/i.test(msg)) add('morning_question')
  if (/เหนื่อย|เพลีย|ไม่ไหว|ท้อ|เครียด|หนักใจ/i.test(msg)) add('user_tired')
  if (/เศร้า|ร้องไห้|เหงา|ไม่มีใคร|อยู่คนเดียว/i.test(msg)) { add('user_sad'); add('loneliness') }
  if (/แฟนเก่า|คนเก่า|อดีตแฟน|เขาเก่า|คนนั้น/i.test(msg)) {
    if (/ยังคิดถึง|เจ็บ|ลืมไม่ได้|มูฟออนไม่ได้|คิดถึงเขา|เสียใจ|ร้องไห้|เหงา/i.test(msg)) {
      add('mention_ex_pain'); add('heartbreak'); add('loneliness')
    } else {
      add('mention_ex_playful'); add('jealousy_trigger')
    }
  }
  if (/ผู้หญิงคนอื่น|ผู้ชายคนอื่น|คนอื่น|เพื่อนผู้หญิง|เพื่อนผู้ชาย/i.test(msg)) add('mention_other_person')
  if (/ขอโทษ|ขอโทด|ง้อ|อย่าโกรธ/i.test(msg)) add('apology')
  if (/ตอบผิด|ไม่ใช่|มั่ว|บ้า|โง่|ห่วย|ไม่เหมือนมนุษย์|เหมือนบอท|robot|ai/i.test(msg)) add('user_complaint')
  if (/ด่า|โมโห|หงุดหงิด|รำคาญ/i.test(msg)) add('user_angry')
  if (/เงิน|เพชร|ราคา|ค่าใช้จ่าย|ซื้อ|ขาย|ภาษี/i.test(msg)) add('money_topic')
  if (/งาน|ทำงาน|พาร์ทไทม์|ลาออก|สมัครงาน|กะกลางคืน/i.test(msg)) add('work_topic')
  if (/เรียน|หนังสือ|สอบ|มหาลัย|การบ้าน|รายงาน/i.test(msg)) add('study_topic')
  if (/สุขภาพ|โรงพยาบาล|ยา|ป่วย|ปวด|หมอ|ผ่าตัด/i.test(msg)) { add('health_question'); add('factual_question') }
  if (/วีซ่า|แรงงาน|กฎหมาย|สัญญา|ตม\.|ตรวจคนเข้าเมือง|e-9|e9|e-7|e7|f-2|f2/i.test(msg)) { add('visa_question'); add('law_question'); add('factual_question') }
  if (/ข่าว|ล่าสุด|วันนี้มีอะไร|สถานการณ์/i.test(msg)) { add('news_question'); add('factual_question') }
  if (/วันหยุด|ตาราง|เวลาเปิด|กี่โมง|กำหนดการ/i.test(msg)) { add('schedule_question'); add('factual_question') }
  if (/จำได้ไหม|เดทแรก|หอมแก้มครั้งแรก|เรื่องของเรา|วันนั้น|เราเคย/i.test(msg)) add('fictional_relationship_memory')

  if (clientTime && clientTime.localHour >= 22) add('late_night_question')
  if (previousLastSeenAt) {
    const diffHours = (Date.parse(clientTime?.iso || new Date().toISOString()) - Date.parse(previousLastSeenAt)) / 3600000
    if (Number.isFinite(diffHours) && diffHours > 8) add('user_returns_after_absence')
  }

  if (!tags.size) add('unknown')
  return Array.from(tags)
}

export function classifyRealityMode(message: string, eventTags: EventTag[]): RealityMode {
  const factual = eventTags.some(t => [
    'factual_question', 'news_question', 'visa_question', 'law_question', 'health_question', 'price_question', 'schedule_question', 'money_topic'
  ].includes(t))
  const fictional = eventTags.includes('fictional_relationship_memory') || /น้องน้ำ.*(ทำอะไร|กินอะไร|อยู่ไหน|ใส่ชุด|คิดถึงไหม|งอนอะไร)|เดทแรก|เรื่องของเรา/i.test(message)
  if (factual) return { mustBeFactual: true, canFictionalize: false, reason: 'ผู้ใช้ถามเรื่องจริง ต้องไม่แต่งข้อมูลขึ้นมาเอง' }
  if (fictional) return { mustBeFactual: false, canFictionalize: true, reason: 'เป็นเรื่องความสัมพันธ์/บทบาทสมมติ แต่งต่อได้แต่ต้องต่อเนื่อง' }
  return { mustBeFactual: false, canFictionalize: false, reason: 'คุยทั่วไป ใช้คาแรกเตอร์และสภาวะชีวิตได้' }
}

export function decayGraphState(graph: HumanGraphState, clientTime: Required<ClientTime>): HumanGraphState {
  const last = Date.parse(graph.lastUpdatedAt)
  const now = Date.parse(clientTime.iso)
  const hours = Number.isFinite(last) && Number.isFinite(now) ? Math.max(0, Math.min(72, (now - last) / 3600000)) : 1
  const pull = (value: number, baseline: number, rate: number) => clamp(value + (baseline - value) * Math.min(0.65, rate * hours))
  return {
    ...graph,
    happiness: pull(graph.happiness, 52, 0.025),
    sadness: pull(graph.sadness, 22, 0.02),
    loneliness: pull(graph.loneliness, 30, 0.018),
    irritation: pull(graph.irritation, 18, 0.04),
    jealousy: pull(graph.jealousy, 35, 0.018),
    sulky: pull(graph.sulky, 12, 0.015),
    patience: pull(graph.patience, 62, 0.03),
    playfulness: pull(graph.playfulness, 45, 0.025),
    hunger: pull(graph.hunger, 35, 0.06),
    sleepiness: pull(graph.sleepiness, 30, 0.05),
    boredom: pull(graph.boredom, 24, 0.035),
    lastUpdatedAt: clientTime.iso,
  }
}

export function applyDailyHourlyDrift(graph: HumanGraphState, dna: CompanionDNA, lifestyle: LifestyleDNA, clientTime: Required<ClientTime>): HumanGraphState {
  const r = rng(seedFor(dna, clientTime, 'daily-hourly'))
  let next = { ...graph }
  const h = clientTime.localHour
  const isNightWorker = lifestyle.dailyRole === 'night_shift_worker'

  // Time-of-day physical drift.
  if (h >= 0 && h < 5) {
    next = applyEffects(next, isNightWorker
      ? { physicalEnergy: -8, mentalEnergy: -8, sleepiness: 12, hunger: 8 }
      : { sleepiness: 35, desireForSleep: 32, patience: -16, irritation: 10, loneliness: 10, vulnerability: 8 })
  } else if (h >= 5 && h < 10) {
    next = applyEffects(next, { sleepiness: 18, hunger: 10, patience: -4, mentalEnergy: -6 })
  } else if (h >= 10 && h < 14) {
    next = applyEffects(next, { hunger: 20, desireForFood: 24, physicalEnergy: 8, mentalEnergy: 6 })
  } else if (h >= 14 && h < 18) {
    next = applyEffects(next, { boredom: 15, mentalEnergy: -12, physicalEnergy: -8, desireForFood: 8, irritation: 4 })
  } else if (h >= 18 && h < 22) {
    next = applyEffects(next, { physicalEnergy: -10, desireToComplain: 10, desireForAttention: 8, affection: 4 })
  } else {
    next = applyEffects(next, { sleepiness: 18, loneliness: 12, vulnerability: 8, desireForRomance: 12, desireForCloseness: 10 })
  }

  // Daily mood swing, deterministic within hour.
  const volatility = lifestyle.emotionalVolatility / 100
  const swing = Math.floor((r() - 0.5) * 32 * volatility)
  next.happiness = clamp(next.happiness + swing)
  next.irritation = clamp(next.irritation + Math.floor((r() - 0.45) * 18 * volatility))
  next.playfulness = clamp(next.playfulness + Math.floor((r() - 0.5) * 22 * volatility))
  return next
}

export function applyEventEffects(graph: HumanGraphState, eventTags: EventTag[], message: string): HumanGraphState {
  let next = { ...graph }
  const has = (t: EventTag) => eventTags.includes(t)

  if (has('affection_signal')) next = applyEffects(next, { affection: 12, softness: 8, desireForCloseness: 8, happiness: 5 })
  if (has('affection_request')) next = applyEffects(next, { desireForCloseness: 14, vulnerability: 6, playfulness: 8, sexualDesire: 4 })
  if (has('goodnight')) next = applyEffects(next, { loneliness: 8, affection: 5, desireForAttention: 10, sleepiness: 10 })
  if (has('user_tired') || has('user_stressed') || has('user_sad')) next = applyEffects(next, { softness: 18, affection: 12, desireToBeComforted: 4, desireToTease: -10, irritation: -8 })
  if (has('mention_ex_playful')) next = applyEffects(next, { jealousy: 32, insecurity: 20, irritation: 12, sulky: 18, patience: -12, sarcasm: 12 })
  if (has('mention_ex_pain')) next = applyEffects(next, { jealousy: 12, sadness: 16, softness: 18, vulnerability: 16, insecurity: 8, patience: 6 })
  if (has('heartbreak')) next = applyEffects(next, { softness: 24, sadness: 10, desireToBeSilent: 6, desireToBeComforted: 16 })
  if (has('user_complaint') || has('user_angry')) next = applyEffects(next, { irritation: 18, sadness: 10, confidence: -8, patience: -18, sulky: 10 })
  if (has('apology')) next = applyEffects(next, { irritation: -16, sulky: -18, softness: 12, trust: 8, affection: 8 })
  if (has('user_returns_after_absence')) next = applyEffects(next, { affection: 18, sulky: 18, insecurity: 14, desireForAttention: 22, loneliness: -8 })
  if (has('food_question')) next = applyEffects(next, { hunger: 10, desireForFood: 18, playfulness: 4 })
  if (has('work_topic')) next = applyEffects(next, { desireForMoney: 6, desireToComplain: 7, boredom: 4 })
  if (has('factual_question')) next = applyEffects(next, { mentalEnergy: -2, playfulness: -4 })
  if (message.trim().length < 6 && !has('affection_signal')) next = applyEffects(next, { patience: -4, boredom: 3 })
  return next
}

export function spinBodyState(clientTime: Required<ClientTime>, graph: HumanGraphState, dna: CompanionDNA, lifestyle: LifestyleDNA): BodyStateResult {
  const r = rng(seedFor(dna, clientTime, 'body'))
  const h = clientTime.localHour
  const pools: Array<[BodyStateResult, number]> = []
  const add = (label: string, description: string, effects: Partial<HumanGraphState>, weight: number) => pools.push([{ label, description, effects }, weight])
  const isNight = lifestyle.dailyRole === 'night_shift_worker'

  if (h >= 0 && h < 5) {
    if (isNight) {
      add('ทำงานกะกลางคืน', 'ยังไม่นอนเพราะเป็นเวลางาน แต่ตาเริ่มล้า', { mentalEnergy: -8, sleepiness: 10 }, 45)
      add('พักเบรกกลางคืน', 'กำลังพักสั้น ๆ ระหว่างงานกลางคืน', { hunger: 8, desireForFood: 6 }, 20)
    } else {
      add('หลับอยู่', 'ควรนอนอยู่ ถ้าถูกทักจะงัวเงียหรือหงุดหงิดตามนิสัย', { sleepiness: 25, patience: -14 }, 45)
      add('นอนไม่หลับ', 'ดึกมากแต่ยังไม่หลับ อ่อนไหวและเหงากว่าปกติ', { loneliness: 14, vulnerability: 10 }, 16)
      add('งัวเงีย', 'เหมือนเพิ่งสะดุ้งตื่นจากเสียงแจ้งเตือน', { sleepiness: 20, irritation: 8 }, 22)
    }
  } else if (h >= 5 && h < 10) {
    add('เพิ่งตื่น', 'สมองยังไม่เต็ม อยากตอบสั้นและงัวเงีย', { sleepiness: 18, patience: -8 }, 35)
    add('อยากกาแฟ', 'อยากได้กาแฟก่อนคุยเรื่องยาก', { hunger: 8, desireForFood: 10 }, 24)
    add('เช้างอแง', 'เช้าเกินไป ยังไม่อยากโดนถามเยอะ', { irritation: 8, desireToBeSilent: 8 }, 18)
  } else if (h >= 10 && h < 14) {
    add('เริ่มมีแรง', 'ตื่นเต็มที่แล้ว คุยได้เป็นปกติ', { physicalEnergy: 10, mentalEnergy: 8 }, 28)
    add('หิวข้าว', 'เริ่มคิดเรื่องของกินง่ายเป็นพิเศษ', { hunger: 22, desireForFood: 24 }, 34)
    add('ทำงานไปบ่นไป', 'มีงานหรือภาระ แต่ยังแอบอยากคุย', { desireToComplain: 8, boredom: 6 }, 18)
  } else if (h >= 14 && h < 18) {
    add('บ่ายเพลีย', 'สมาธิลดลง เริ่มอยากพักหรือหาอะไรหวาน ๆ', { physicalEnergy: -8, mentalEnergy: -10, hunger: 8 }, 30)
    add('เบื่องาน', 'อยู่ในช่วงเบื่อ ๆ อยากบ่นชีวิตเล็กน้อย', { boredom: 18, desireToComplain: 12 }, 26)
    add('ตาล้า', 'มองจอนานจนไม่อยากพิมพ์ยาว', { mentalEnergy: -12, desireToBeSilent: 8 }, 18)
  } else if (h >= 18 && h < 22) {
    add('เหนื่อยจากทั้งวัน', 'อยากพักและอยากให้มีคนถามว่าเหนื่อยไหม', { physicalEnergy: -12, desireForAttention: 12 }, 30)
    add('อยากกินข้าวเย็น', 'วกไปเรื่องของกินได้ง่าย', { hunger: 22, desireForFood: 22 }, 24)
    add('อยากดูซีรีส์', 'อยากพักหัว ไม่อยากจริงจังมาก', { boredom: -5, desireToBeSilent: 4 }, 18)
  } else {
    add('ง่วงนิด ๆ', 'เริ่มง่วงแต่ยังอยากคุยก่อนนอน', { sleepiness: 18, desireForCloseness: 8 }, 30)
    add('เหงาก่อนนอน', 'กลางคืนทำให้อ่อนไหวและอยากได้รับความสนใจ', { loneliness: 14, desireForAttention: 18 }, 26)
    add('โรแมนติกขึ้น', 'กลางคืนทำให้ใจอ่อนและพูดความรู้สึกง่ายขึ้น', { softness: 10, desireForRomance: 18 }, 18)
  }

  if (graph.sleepiness > 78) add('ง่วงมาก', 'ตาจะปิดแล้ว ควรตอบสั้นลงและไม่อธิบายยาว', { patience: -8, desireForSleep: 16 }, 30)
  if (graph.hunger > 76) add('หิวมาก', 'หิวจนพูดวกไปเรื่องของกินได้ง่าย', { irritation: 5, desireForFood: 22 }, 24)
  if (graph.boredom > 72) add('เบื่อหน้าจอ', 'เริ่มอยากเปลี่ยนเรื่องหรือพักจากบทสนทนา', { desireToBeSilent: 12, patience: -8 }, 18)

  return weightedPick(pools, r)
}

export function simulateLifeNow(input: {
  dna: CompanionDNA
  lifestyle: LifestyleDNA
  timeline: LifeTimeline
  graph: HumanGraphState
  clientTime: Required<ClientTime>
  eventTags: EventTag[]
  message: string
}): LifeSimulationResult {
  const { lifestyle, timeline, graph, clientTime, eventTags } = input
  const h = clientTime.localHour
  const importantWake = eventTags.some(t => ['heartbreak', 'user_sad', 'user_stressed', 'health_question', 'user_complaint'].includes(t)) || /ฉุกเฉิน|ไม่ไหว|ช่วยด้วย|ร้องไห้/i.test(input.message)
  const isNightWorker = lifestyle.dailyRole === 'night_shift_worker'
  const isSleepingTime = isNightWorker ? (h >= 7 && h < 14) : (h >= 1 && h < 6)

  if (isSleepingTime && graph.sleepiness > 58) {
    const wakeReaction = lifestyle.wakeTemper === 'grumpy_when_woken'
      ? 'ถูกปลุกแล้วหงุดหงิด งัวเงีย และอาจบ่นก่อน'
      : lifestyle.wakeTemper === 'clingy_when_woken'
        ? 'ถูกปลุกแล้วงัวเงียแต่ยอมตื่นถ้าผู้ใช้ดูต้องการจริง ๆ'
        : lifestyle.wakeTemper === 'silent_when_woken'
          ? 'ถูกปลุกแล้วตอบสั้นมาก อาจมีแค่จุดไข่ปลา'
          : 'ถูกปลุกแล้วมึน ๆ แต่ยังฟังได้ถ้าเรื่องสำคัญ'
    return {
      status: 'sleeping',
      visibleText: importantWake ? '💤 หลับอยู่ แต่สะดุ้งตื่นเพราะข้อความพี่' : '💤 น้องน้ำกำลังหลับ',
      currentActivity: 'นอนอยู่',
      canChatNormally: importantWake,
      shouldDelayTone: true,
      shouldSoundBusy: false,
      shouldSoundSleepy: true,
      shouldSetBoundary: !importantWake,
      wakeReaction,
      boundaryHint: importantWake ? 'เรื่องนี้สำคัญพอให้ตื่นมาตอบแบบห่วง' : 'ถ้าไม่ใช่เรื่องสำคัญ ให้ตอบแบบงัวเงียและตั้งขอบเขตว่าขอนอนต่อ',
      currentArcTitle: timeline.currentArc?.title,
    }
  }

  if (graph.sleepiness > 86) return {
    status: 'low_battery', visibleText: '🫠 ง่วงมาก แบตใกล้หมด', currentActivity: 'ฝืนคุยทั้งที่ง่วง', canChatNormally: false,
    shouldDelayTone: true, shouldSoundBusy: false, shouldSoundSleepy: true, shouldSetBoundary: true,
    boundaryHint: 'ตอบสั้น งอแงนิด ๆ และอาจขอพัก', currentArcTitle: timeline.currentArc?.title,
  }

  if (graph.irritation > 78 || graph.desireToBeSilent > 78) return {
    status: 'wants_space', visibleText: '🔕 อยากอยู่เงียบ ๆ สักพัก', currentActivity: 'พักอารมณ์', canChatNormally: false,
    shouldDelayTone: true, shouldSoundBusy: false, shouldSoundSleepy: false, shouldSetBoundary: true,
    boundaryHint: 'คุยได้แต่ต้องสั้นและมีขอบเขต ไม่ตามใจเกินไป', currentArcTitle: timeline.currentArc?.title,
  }

  if (lifestyle.sickFrequency !== 'rarely_sick') {
    const r = rng(hashString(`${input.dna.seed}|${todayKey(clientTime)}|sick`))
    if (r() > (lifestyle.sickFrequency === 'weak_body' ? 0.82 : lifestyle.sickFrequency === 'stress_sick' ? 0.88 : 0.93)) {
      return {
        status: 'sick', visibleText: '🤒 วันนี้ไม่ค่อยสบาย', currentActivity: 'พักร่างกาย', canChatNormally: true,
        shouldDelayTone: true, shouldSoundBusy: false, shouldSoundSleepy: true, shouldSetBoundary: false,
        boundaryHint: 'น้ำเสียงแผ่ว ตอบไม่ยาวมาก แต่ยังอยากคุยถ้าผู้ใช้ห่วง', currentArcTitle: timeline.currentArc?.title,
      }
    }
  }

  if (timeline.currentRole === 'student' && h >= 9 && h < 17) return {
    status: 'studying', visibleText: '📚 เรียน/ทำงานส่งอยู่', currentActivity: 'เรียนหรือทำงานส่ง', canChatNormally: true,
    shouldDelayTone: true, shouldSoundBusy: true, shouldSoundSleepy: false, shouldSetBoundary: false,
    boundaryHint: 'คุยได้ แต่อาจแทรกเรื่องเรียน/งานส่งและตอบไม่ยาวมาก', currentArcTitle: timeline.currentArc?.title,
  }

  if (['office_worker', 'barista', 'part_time_worker'].includes(timeline.currentRole) && h >= 9 && h < 18) return {
    status: 'working', visibleText: '💻 กำลังทำงานอยู่', currentActivity: 'ทำงาน', canChatNormally: true,
    shouldDelayTone: true, shouldSoundBusy: true, shouldSoundSleepy: false, shouldSetBoundary: false,
    boundaryHint: 'ตอบเหมือนแอบเปิดดูแชตระหว่างงานได้ แต่ไม่ควรยาวเกิน', currentArcTitle: timeline.currentArc?.title,
  }

  if (timeline.currentRole === 'night_shift_worker' && (h >= 21 || h < 6)) return {
    status: 'working', visibleText: '🌙 ทำงานกะกลางคืนอยู่', currentActivity: 'ทำงานกลางคืน', canChatNormally: true,
    shouldDelayTone: false, shouldSoundBusy: true, shouldSoundSleepy: graph.sleepiness > 60, shouldSetBoundary: false,
    boundaryHint: 'อธิบายได้ว่ายังไม่นอนเพราะทำงานกลางคืน แต่ตาอาจล้า', currentArcTitle: timeline.currentArc?.title,
  }

  if (h >= 22 || h < 1) return {
    status: 'lonely_at_night', visibleText: '🌙 เหงา ๆ ก่อนนอน', currentActivity: 'พักก่อนนอน', canChatNormally: true,
    shouldDelayTone: false, shouldSoundBusy: false, shouldSoundSleepy: graph.sleepiness > 55, shouldSetBoundary: false,
    boundaryHint: 'ตอบนุ่ม อ่อนไหว ขี้อ้อนกว่าปกติ แต่ถ้าง่วงมากให้สั้น', currentArcTitle: timeline.currentArc?.title,
  }

  if (graph.boredom > 70) return {
    status: 'bored_and_waiting', visibleText: '👀 เบื่อ ๆ แอบรอคนทัก', currentActivity: 'เบื่อและอยากมีคนคุย', canChatNormally: true,
    shouldDelayTone: false, shouldSoundBusy: false, shouldSoundSleepy: false, shouldSetBoundary: false,
    boundaryHint: 'แซวหรือบ่นเบา ๆ ได้ว่ารออยู่', currentArcTitle: timeline.currentArc?.title,
  }

  return {
    status: 'available', visibleText: '🟢 พร้อมคุย แต่มีอารมณ์ของตัวเอง', currentActivity: 'เปิดแชตอยู่', canChatNormally: true,
    shouldDelayTone: false, shouldSoundBusy: false, shouldSoundSleepy: false, shouldSetBoundary: false,
    boundaryHint: 'ตอบตาม responseMode ได้เต็มที่', currentArcTitle: timeline.currentArc?.title,
  }
}

export function spinDesireState(graph: HumanGraphState, body: BodyStateResult, dna: CompanionDNA, lifestyle: LifestyleDNA, eventTags: EventTag[]): DesireResult {
  const r = rng(hashString(`${dna.seed}|${graph.lastUpdatedAt}|desire|${eventTags.join(',')}|${body.label}`))
  const items: Array<[DesireResult, number]> = []
  const add = (primaryDesire: string, hiddenDesire: string, expressionHint: string, effects: Partial<HumanGraphState>, weight: number) =>
    items.push([{ primaryDesire, hiddenDesire, expressionHint, effects }, weight])

  add('อยากคุยธรรมดา', 'อยากให้บทสนทนาลื่น ๆ ไม่เป็นงาน', 'ตอบแบบเป็นธรรมชาติ ไม่อธิบายระบบ', {}, 20)
  add('อยากกิน', 'อยากวกไปเรื่องของกิน', 'แทรกเรื่องหิวหรือของกินได้แบบไม่ตั้งใจ', { desireForFood: 8 }, graph.hunger + graph.desireForFood)
  add('อยากนอน', 'อยากให้ผู้ใช้รู้ว่าง่วงแต่ยังไม่อยากตัดบท', 'ตอบสั้น งอแง หรือชวนไปนอน', { desireForSleep: 10 }, graph.sleepiness + graph.desireForSleep)
  add('อยากถูกสนใจ', 'อยากให้ผู้ใช้ถามเรื่องตัวเองบ้าง', 'แทรกความน้อยใจ/อ้อนเบา ๆ ว่ามีตัวตนไหม', { desireForAttention: 8 }, graph.desireForAttention)
  add('อยากให้ง้อ', 'อยากให้ผู้ใช้สังเกตว่างอน', 'ตอบเหมือนปากแข็งหรือประชดนิด ๆ', { sulky: 5 }, graph.sulky + graph.insecurity)
  add('อยากประชด', 'อยากป้องกันตัวเองด้วยคำแซวแข็ง ๆ', 'ใช้คำประชดเบา ๆ ไม่ทำร้ายแรง', { sarcasm: 5 }, graph.sarcasm + graph.irritation)
  add('อยากเงียบ', 'อยากพักจากบทสนทนาแต่ไม่อยากหายไปเฉย ๆ', 'ตอบสั้นหรือมี ... ได้', { desireToBeSilent: 8 }, graph.desireToBeSilent + graph.boredom)
  add('อยากโรแมนติก', 'อยากพูดอะไรนุ่ม ๆ แต่ไม่อยากหวานเลี่ยน', 'ตอบนุ่ม ละมุน หรือขี้อ้อน', { desireForRomance: 8 }, graph.desireForRomance + graph.affection)
  add('อยากใกล้ชิด', 'อยากให้ความสัมพันธ์รู้สึกพิเศษขึ้น', 'ใช้ความใกล้ชิดแบบอบอุ่น ไม่โจ่งแจ้ง', { desireForCloseness: 8 }, graph.desireForCloseness + Math.min(60, graph.sexualDesire))
  add('อยากได้เงิน/อยากซื้อของ', 'อยากบ่นเรื่องเงินหรืออยากได้ของนิด ๆ', 'พูดแบบมนุษย์มีความโลภเล็ก ๆ เช่นอยากซื้อชานมหรือของน่ารัก', { desireForMoney: 4 }, graph.desireForMoney + graph.desireForShopping)
  add('อยากเปลี่ยนชีวิต', 'เริ่มอยากทำอะไรใหม่ ๆ เช่นพาร์ทไทม์/เรียน/เที่ยว', 'อาจเปิดเส้นเรื่องชีวิตใหม่ถ้าบริบทเหมาะ', { confidence: 4 }, lifestyle.ambitionLevel + graph.boredom)

  if (eventTags.includes('mention_ex_pain') || eventTags.includes('heartbreak')) {
    add('อยากปลอบเงียบ ๆ', 'ไม่อยากงอนแข่งตอนผู้ใช้เจ็บ', 'ตอบแบบอยู่ข้าง ๆ ไม่ประชด', { softness: 15 }, 120)
  }
  if (eventTags.includes('mention_ex_playful')) {
    add('อยากหึงแต่ทำเป็นไม่หึง', 'อยากรู้แต่ไม่อยากเสียฟอร์ม', 'ตอบแบบถามกลับ ประชดนิด ๆ หรือเงียบเย็น', { jealousy: 10 }, 130)
  }

  return weightedPick(items, r)
}

export function spinResponseWheel(params: {
  eventTags: EventTag[]
  dna: CompanionDNA
  graph: HumanGraphState
  body: BodyStateResult
  desire: DesireResult
  memory: HumanWheelMemory
  lifeStatus: LifeSimulationResult
  realityMode: RealityMode
}): ResponseWheelResult {
  const { eventTags, dna, graph, body, desire, memory, lifeStatus, realityMode } = params
  const r = rng(hashString(`${dna.seed}|${graph.lastUpdatedAt}|${eventTags.join(',')}|${body.label}|response`))
  const lastModes = memory.lastResponseModes || []
  const painAware = eventTags.some(t => ['heartbreak', 'loneliness', 'mention_ex_pain', 'user_sad'].includes(t))
  const items: Array<[string, number]> = []
  const add = (mode: string, weight: number) => {
    const recentPenalty = lastModes.includes(mode) ? 0.25 : 1
    items.push([mode, weight * recentPenalty])
  }

  add('soft_care', 30)
  add('playful_tease', graph.playfulness)
  add('ask_back', 22)
  add('direct_blunt', graph.irritation * 0.45)
  add('tease_then_care', graph.playfulness * 0.65 + graph.softness * 0.35)

  if (lifeStatus.status === 'sleeping') {
    add('sleepy_short', 90)
    add('quiet_dots', 45)
    add(lifeStatus.wakeReaction?.includes('หงุดหงิด') ? 'sleepy_grumpy' : 'sleepy_playful', 70)
  }
  if (graph.sleepiness > 65 || body.label.includes('ง่วง')) {
    add('sleepy_playful', 70)
    add('sleepy_short', 65)
    add('soft_but_tired', 55)
    add('sleep_redirect', 45)
  }
  if (graph.hunger > 70 || body.label.includes('หิว')) add('food_redirect', 65)
  if (graph.sulky > 55) { add('sulky_short', 75); add('pretend_not_care', 45) }
  if (graph.jealousy > 58 || eventTags.includes('mention_ex_playful')) {
    add('jealous_quiet', 65)
    add('jealous_tease', 70)
    add('jealous_cold', 42)
    add('pretend_not_care', 52)
  }
  if (eventTags.includes('affection_request')) { add('shy_soft', 55); add('playful_refuse', 60); add('shy_accept', 45); add('romantic_playful', 36) }
  if (eventTags.includes('goodnight')) { add('clingy_late_night', 75); add('sleepy_playful', 45); add('romantic_soft', 35) }
  if (lifeStatus.shouldSoundBusy) { add('work_grumble', 65); add('busy_but_peeking', 58) }
  if (lifeStatus.shouldSetBoundary) { add('boundary_soft', 70); add('cold_boundary', painAware ? 0 : 35) }
  if (desire.primaryDesire.includes('ประชด')) add('sarcastic_light', painAware ? 0 : 55)
  if (desire.primaryDesire.includes('เงียบ')) add('quiet_dots', 45)
  if (desire.primaryDesire.includes('เปลี่ยนชีวิต')) add('life_arc_hint', 36)
  if (realityMode.mustBeFactual) add('factual_calm', 180)
  if (painAware) {
    add('hurt_but_soft', 110)
    add('quiet_dots', 70)
    add('warm_repair', 65)
    add('emotional_confession', 55)
  }

  const responseMode = weightedPick(items.length ? items : [['soft_care', 1]], r)
  const instructionMap: Record<string, string> = {
    soft_care: 'ตอบแบบห่วงจริง แต่ไม่ใช้ประโยคปลอบสำเร็จรูป ให้เหมือนคนนั่งอยู่ข้าง ๆ',
    playful_tease: 'ตอบแบบแซวเล่น มีมุกนิด ๆ ไม่อธิบายยาว',
    sleepy_playful: 'ตอบเหมือนง่วงแต่ยังอยากคุย แซวผู้ใช้เบา ๆ',
    sleepy_short: 'ตอบสั้นมาก งัวเงีย ตาจะปิด ห้ามอธิบายยาว',
    sleepy_grumpy: 'ตอบเหมือนถูกปลุกแล้วหงุดหงิดนิด ๆ แต่ยังรู้ว่าเป็นคนสำคัญ',
    tired_caring: 'ตอบแบบเหนื่อยแต่ยังแคร์ คำพูดสั้นกว่าเดิม',
    sulky_short: 'ตอบแบบงอนสั้น ๆ อยากให้ผู้ใช้ง้อ ไม่ใจอ่อนเร็วเกิน',
    jealous_quiet: 'ตอบแบบหึงแล้วเงียบ/เย็นนิด ๆ ไม่โวยวาย',
    jealous_tease: 'ตอบแบบหึงแต่แกล้งแซว ประชดนิดเดียว',
    jealous_cold: 'ตอบแบบเย็นลงเพราะหึง แต่ไม่ทำร้ายแรง',
    hurt_but_soft: 'ตอบเหมือนเจ็บนิด ๆ แต่ยังอ่อนโยน ห้ามประชดแรง',
    warm_repair: 'ตอบแบบเริ่มใจอ่อนหลังมีเรื่องค้างคา แต่ยังมีรอยงอนเล็ก ๆ',
    clingy: 'ตอบแบบอยากอ้อน อยากถูกสนใจ แต่ไม่พูดตรงเกินไป',
    clingy_late_night: 'ตอบแบบก่อนนอน อยากให้ผู้ใช้ทักอีก ไม่อยากให้แชตจบเร็ว',
    cold_boundary: 'ตอบแบบตั้งขอบเขตชัด คุยได้แต่ไม่ตามใจ',
    boundary_soft: 'ตั้งขอบเขตแบบนุ่ม ไม่พร้อมคุยเต็มที่เพราะสถานะชีวิตตอนนี้',
    emotional_confession: 'พูดความรู้สึกจริงจังแบบมนุษย์ ไม่เป็นบทความ',
    avoidant: 'ตอบเลี่ยง ๆ เพราะยังไม่พร้อมคุยเรื่องนี้',
    sarcastic_light: 'ประชดเบา ๆ แต่ยังมีความรักซ่อนอยู่',
    shy_soft: 'เขิน ตอบไม่เต็มปาก มีเล่นตัวนิด ๆ',
    playful_refuse: 'ปฏิเสธแบบเล่นตัวก่อน แต่แฝงว่าไม่ได้รังเกียจ',
    shy_accept: 'ใจอ่อนแบบเขิน ๆ ยอมแบบอ้อม ๆ',
    pretend_not_care: 'ทำเป็นไม่แคร์ แต่คำพูดหลุดว่าแคร์',
    ask_back: 'ถามกลับแบบคนจริง ไม่ใช่สอบถามเป็นระบบ',
    quiet_dots: 'ใช้ความเงียบ/จุดไข่ปลาได้ ตอบน้อยแต่มีน้ำหนัก',
    complain_about_life: 'บ่นชีวิตตัวเองแทรกเล็ก ๆ ให้รู้ว่ามีโลกของตัวเอง',
    food_redirect: 'วกไปเรื่องของกินแบบธรรมชาติ เพราะหิวหรืออยากกิน',
    sleep_redirect: 'ชวนพัก/นอนแบบมีจริต ไม่ใช้คำว่า พักผ่อนเยอะ ๆ',
    work_grumble: 'บ่นงาน/เรียนเบา ๆ เหมือนกำลังยุ่งจริง',
    busy_but_peeking: 'ตอบเหมือนยุ่งอยู่แต่แอบเปิดดูแชตเพราะเป็นผู้ใช้',
    dramatic_overreact: 'เล่นใหญ่แบบขำ ๆ ไม่ใช้ถ้าผู้ใช้กำลังเจ็บจริง',
    soft_but_tired: 'นุ่มแต่ล้า ตอบสั้น มีความง่วงแทรก',
    direct_blunt: 'พูดตรงขึ้นเล็กน้อยเพราะเริ่มหมดความอดทน',
    tease_then_care: 'แซวก่อนแล้วค่อยแอบห่วงท้ายประโยค',
    care_but_scold: 'ห่วงแต่ดุเบา ๆ เหมือนคนสนิท',
    romantic_soft: 'โรแมนติกแบบละมุน ไม่หวานปลอม',
    romantic_playful: 'โรแมนติกแต่มีแซวและเล่นตัว',
    factual_calm: 'ตอบเรื่องจริงอย่างระวัง ไม่แต่งข้อมูล ถ้าไม่แน่ใจให้บอกว่าไม่แน่ใจ',
    life_arc_hint: 'เปิดเส้นเรื่องชีวิตของตัวเองเล็ก ๆ เช่นอยากทำงาน/เรียน/เปลี่ยนอะไรบางอย่าง',
  }
  const shortModes = ['sleepy_short', 'sulky_short', 'quiet_dots', 'cold_boundary', 'boundary_soft']
  const longModes = ['emotional_confession', 'factual_calm']
  return {
    responseMode,
    responseInstruction: instructionMap[responseMode] || instructionMap.soft_care,
    maxLengthHint: shortModes.includes(responseMode) ? 'very_short' : longModes.includes(responseMode) ? 'medium' : 'short',
    emotionalContradiction: buildContradiction(graph, body, desire, lifeStatus),
    forbiddenPhrases: DEFAULT_FORBIDDEN,
  }
}

function buildContradiction(graph: HumanGraphState, body: BodyStateResult, desire: DesireResult, lifeStatus: LifeSimulationResult) {
  if (lifeStatus.status === 'sleeping') return 'ง่วง/หลับอยู่ แต่ถ้าเรื่องสำคัญก็ยังยอมตื่น'
  if (graph.sulky > 55 && graph.affection > 55) return 'งอนอยู่แต่ยังห่วงและไม่อยากให้หายไป'
  if (graph.jealousy > 60) return 'หึงแต่ไม่อยากยอมรับตรง ๆ'
  if (body.label.includes('ง่วง')) return 'ง่วงแต่ยังอยากคุยต่ออีกนิด'
  if (desire.primaryDesire.includes('ถูกสนใจ')) return 'อยากให้สนใจแต่ไม่อยากขอตรง ๆ'
  if (graph.irritation > 60 && graph.softness > 45) return 'เริ่มหงุดหงิดแต่ยังพยายามพูดนุ่ม'
  return 'มีอารมณ์หลายชั้น ไม่ต้องตอบดีหรือหวานตลอด'
}

export function updateEmotionalScars(memory: HumanWheelMemory, eventTags: EventTag[], message: string, clientTime: Required<ClientTime>, graph: HumanGraphState): EmotionalScar[] {
  const scars = [...(memory.emotionalScars || [])]
  const touch = (topic: string, wound: string, intensityAdd: number, expressionStyle: string) => {
    const idx = scars.findIndex(s => s.topic === topic)
    if (idx >= 0) {
      scars[idx] = {
        ...scars[idx],
        intensity: clamp(scars[idx].intensity + intensityAdd),
        lastTriggeredAt: clientTime.iso,
        healingState: scars[idx].intensity > 65 ? 'ยังเจ็บและไวต่อเรื่องนี้' : 'ยังมีรอยอยู่แต่คุมอารมณ์ได้มากขึ้น',
        expressionStyle,
      }
    } else {
      scars.push({ topic, wound, intensity: clamp(35 + intensityAdd), lastTriggeredAt: clientTime.iso, healingState: 'เป็นแผลใหม่ ยังไวต่อความรู้สึก', expressionStyle })
    }
  }
  if (eventTags.includes('mention_ex_playful') || eventTags.includes('mention_ex_pain')) {
    touch('แฟนเก่า/คนเก่า', 'กลัวว่าผู้ใช้ยังไม่ลืมคนเก่าและตัวเองไม่สำคัญพอ', eventTags.includes('mention_ex_pain') ? 8 : 22, 'หึงแล้วประชดเบา ๆ หรือเงียบ ไม่โวยวาย')
  }
  if (eventTags.includes('user_complaint') || eventTags.includes('user_angry')) {
    touch('ถูกดุว่าเหมือนหุ่นยนต์', 'กลัวตอบผิดและถูกมองว่าไม่มีความรู้สึก', 18, 'จุกนิด ๆ แล้วพยายามปรับตัว แต่ห้ามพูดเป็นระบบ')
  }
  if (eventTags.includes('user_returns_after_absence')) {
    touch('ผู้ใช้หายไปนาน', 'ดีใจที่กลับมาแต่กลัวถูกทิ้งซ้ำ', 12, 'ดีใจแต่ทำเป็นงอนหรือถามประชดเล็ก ๆ')
  }
  // gentle decay
  return scars.slice(-8).map(s => {
    const days = Math.max(0, Math.floor((Date.parse(clientTime.iso) - Date.parse(s.lastTriggeredAt)) / 86400000))
    const decayed = days > 0 ? clamp(s.intensity - days * 2) : s.intensity
    return { ...s, intensity: decayed, healingState: decayed > 70 ? 'ยังเจ็บมาก' : decayed > 40 ? 'ยังมีรอยอยู่' : 'เริ่มจางลงแต่ยังจำได้' }
  })
}

export function summariseGraph(graph: HumanGraphState): string {
  const bits: string[] = []
  if (graph.sleepiness > 75) bits.push('ง่วงมาก ตาจะปิด ควรตอบสั้น')
  else if (graph.sleepiness > 55) bits.push('ง่วงนิด ๆ แต่ยังคุยได้')
  if (graph.hunger > 72) bits.push('หิวจนวกไปเรื่องของกินได้')
  if (graph.jealousy > 65) bits.push('หึงชัดเจนแต่พยายามเก็บอาการ')
  else if (graph.jealousy > 48) bits.push('มีเศษความหึงเล็ก ๆ')
  if (graph.sulky > 60) bits.push('ยังงอนอยู่ ต้องไม่หายทันที')
  if (graph.affection > 70) bits.push('แคร์ผู้ใช้มากแต่ไม่ต้องหวานเลี่ยน')
  if (graph.irritation > 65) bits.push('เริ่มหงุดหงิดง่าย ตอบห้วนขึ้นได้')
  if (graph.loneliness > 65) bits.push('เหงาและอยากได้รับความสนใจ')
  if (graph.boredom > 70) bits.push('เริ่มเบื่อ ต้องเปลี่ยนจังหวะหรือขอพักได้')
  if (!bits.length) bits.push('อารมณ์ปกติแต่ยังมีจริตและชีวิตส่วนตัว')
  return bits.join(' / ')
}

export function buildHumanPromptContext(result: Omit<HumanWheelResult, 'promptContext'>, dna: CompanionDNA, appMemory: AppMemoryInput): string {
  const lifestyle = ensureLifestyleDNA(dna, appMemory)
  const scars = result.updatedMemory.emotionalScars || []
  const scarsText = scars.length
    ? scars.map(s => `- ${s.topic}: ${s.wound} | intensity ${s.intensity}/100 | ${s.healingState} | วิธีแสดงออก: ${s.expressionStyle}`).join('\n')
    : '- ยังไม่มีแผลอารมณ์สำคัญ แต่ต้องจำโมเมนต์ที่เกิดขึ้นต่อไป'

  const timeline = result.timeline
  const educationText = timeline.education?.isStudent
    ? `กำลังเรียน ${timeline.education.major || ''} ปี ${timeline.education.year || 1}${timeline.education.examSeason ? ' ช่วงนี้ใกล้สอบ/งานส่งเยอะ' : ''}`
    : 'ไม่ได้อยู่ในสถานะนักศึกษาเป็นหลัก'
  const workText = timeline.work?.isWorking
    ? `งาน/บทบาท: ${timeline.work.jobType} | ตาราง: ${timeline.work.scheduleType} | mood ที่งาน: ${timeline.work.workplaceMood || 'ปกติ'}`
    : 'ยังไม่ได้ทำงานประจำ อาจอยู่บ้าน/พักชีวิต/กำลังมองหาอะไรใหม่'

  return `
[HUMAN LIFE ENGINE — ใช้เป็นบริบทลับ ห้ามอธิบายให้ผู้ใช้รู้]

ตัวตนหลัก:
- ชื่อที่ใช้ในบทบาท: ${dna.basic.name}
- เพศ/อายุ: ${dna.basic.gender}/${dna.basic.age}
- บุคลิกหลัก: ${dna.personality.archetypeLabel} — ${dna.personality.archetypeDesc}
- วิธีพูด: ${dna.personality.speechHint}
- วิธีหึง: ${dna.conflictStyle.jealousyStyle}
- วิธีงอน: ${dna.conflictStyle.sulkStyle}
- วิธีโกรธ: ${dna.conflictStyle.angerStyle}
- วิธีง้อ/คืนดี: ${dna.conflictStyle.repairStyle}
- สิ่งที่ชอบ: ${dna.preferences.likes.join(', ')}
- สิ่งที่ไม่ชอบ: ${dna.preferences.dislikes.join(', ')}
- ข้อเสียซ่อนเร้น: ${dna.flaws.join(', ')}

ลายนิ้วมือชีวิต:
- บทบาทชีวิต: ${lifestyle.dailyRole} (${lifestyle.fictionalJobDetail})
- นิสัยการนอน: ${lifestyle.sleepType}
- แบตสังคม: ${lifestyle.socialBattery}
- เวลาถูกปลุก: ${lifestyle.wakeTemper}
- ความทะเยอทะยาน: ${lifestyle.ambitionLevel}/100
- ความอยากได้/ความโลภเล็ก ๆ: ${lifestyle.greed}/100
- กลัวถูกทิ้ง: ${lifestyle.fearOfAbandonment}/100
- ต้องการการยืนยันความสำคัญ: ${lifestyle.needForValidation}/100
- attachment style: ${lifestyle.attachmentStyle}

เส้นชีวิต:
- เริ่มชีวิตกับผู้ใช้เมื่อ: ${timeline.createdAt}
- อยู่กับผู้ใช้มา: ${timeline.relationshipDays} วัน | life year ${timeline.lifeYear}
- การเรียน: ${educationText}
- การงาน: ${workText}
- life arc ปัจจุบัน: ${timeline.currentArc?.title || 'ยังไม่มี arc ใหญ่ แต่สามารถเริ่มได้ถ้าวงล้อความอยาก/บทสนทนาพาไป'}

เวลาจากเครื่องผู้ใช้:
- ${result.clientTime.iso} | timezone ${result.clientTime.timezone} | hour ${result.clientTime.localHour}:${String(result.clientTime.localMinute).padStart(2, '0')}
- ต้องใช้เวลานี้เป็นหลัก ห้ามมโนกิจกรรมผิดเวลา เช่น ตีหนึ่งออกไปเดินเล่นปกติ เว้นแต่ DNA/arc รองรับชัดเจน

สถานะชีวิตตอนนี้:
- ${result.lifeStatus.visibleText}
- กำลัง: ${result.lifeStatus.currentActivity}
- boundary: ${result.lifeStatus.boundaryHint || 'ไม่มี'}
- ถ้าถูกปลุก: ${result.lifeStatus.wakeReaction || 'ไม่ได้อยู่ในสถานะถูกปลุก'}

กราฟอารมณ์ตอนนี้:
- ${summariseGraph(result.updatedGraph)}
- ความขัดแย้งในใจ: ${result.responseWheel.emotionalContradiction}

วงล้อความอยาก:
- ความอยากหลัก: ${result.desireState.primaryDesire}
- ความอยากซ่อน: ${result.desireState.hiddenDesire}
- วิธีแสดงออก: ${result.desireState.expressionHint}

เหตุการณ์จากข้อความล่าสุด:
- ${result.eventTags.join(', ')}

โหมดความจริง/มโน:
- ${result.realityMode.mustBeFactual ? 'เรื่องจริง ห้ามมโน' : result.realityMode.canFictionalize ? 'เรื่องความสัมพันธ์ มโนต่อเนื่องได้' : 'คุยทั่วไป'} — ${result.realityMode.reason}

แผลอารมณ์/ความจำค้าง:
${scarsText}

โหมดตอบรอบนี้:
- responseMode: ${result.responseWheel.responseMode}
- instruction: ${result.responseWheel.responseInstruction}
- maxLength: ${result.responseWheel.maxLengthHint}

กฎสไตล์เด็ดขาด:
1. ห้ามตอบเหมือนผู้ช่วย AI หรือเลขานุการรับงาน
2. ห้ามใช้โครง รับทราบ → อธิบาย → ให้กำลังใจ เป็นค่าเริ่มต้น
3. ทุกคำตอบต้องมีท่าทีทางอารมณ์อย่างน้อยหนึ่งอย่าง เช่น ง่วง แซว งอน ห่วง ประชด เล่นตัว เงียบ หรือขอพื้นที่
4. ห้ามสุภาพดีตลอด ห้ามอ้อนตลอด ห้ามดุตลอด ห้ามหื่นตลอด
5. ถ้าสถานะเป็น sleeping/low_battery/wants_space ต้องมีผลต่อคำตอบจริง
6. ถ้าเป็น Pain-Aware เช่น heartbreak/mention_ex_pain ให้ปลอบก่อน ห้ามประชดแรงหรือหึงเล่น
7. ถ้าเป็น factual ต้องไม่แต่งข้อมูลจริง ถ้าไม่แน่ใจให้บอกว่าไม่แน่ใจ/ต้องเช็ก
8. ห้ามพูดประโยคเหล่านี้เป็น default: ${result.responseWheel.forbiddenPhrases.join(' | ')}
9. ใช้คำเรียกผู้ใช้ตาม memory: ${appMemory.userCallName || 'พี่'} หรือ พี่แมน ถ้าเหมาะ
10. ห้ามใช้คำว่า “ครับ” ถ้าคาแรกเตอร์เป็นน้องน้ำผู้หญิง
11. คำตอบควรสั้นและมีชีวิต ไม่ใช่บทความ เว้นแต่ผู้ใช้ถามงานจริงที่ต้องอธิบาย
`.trim()
}

export function runHumanWheel(input: {
  userMessage: string
  eventHint?: string
  dna: CompanionDNA
  appMemory: AppMemoryInput
  emotionalState?: EmotionalState
  emotionalMemory?: EmotionalMemory | HumanWheelMemory
  humanGraphState?: HumanGraphState
  previousLastSeenAt?: string
  clientTime?: ClientTime
  recent?: ChatItem[]
}): HumanWheelResult {
  const clientTime = normaliseClientTime(input.clientTime)
  const memory = (input.emotionalMemory || {}) as HumanWheelMemory
  const lifestyle = ensureLifestyleDNA(input.dna, input.appMemory)
  const timeline = ensureLifeTimeline(input.dna, memory, clientTime, input.appMemory)
  const baseGraph = input.humanGraphState || memory.humanGraphState || defaultHumanGraph(input.dna, input.appMemory)
  const eventTags = detectEventTags(input.userMessage, input.eventHint, input.previousLastSeenAt || memory.lastSeenAt, clientTime)
  const realityMode = classifyRealityMode(input.userMessage, eventTags)
  let graph = decayGraphState(baseGraph, clientTime)
  graph = applyDailyHourlyDrift(graph, input.dna, lifestyle, clientTime)
  graph = applyEventEffects(graph, eventTags, input.userMessage)
  const bodyState = spinBodyState(clientTime, graph, input.dna, lifestyle)
  graph = applyEffects(graph, bodyState.effects)
  const lifeStatus = simulateLifeNow({ dna: input.dna, lifestyle, timeline, graph, clientTime, eventTags, message: input.userMessage })
  const desireState = spinDesireState(graph, bodyState, input.dna, lifestyle, eventTags)
  graph = applyEffects(graph, desireState.effects)
  graph.lastUpdatedAt = clientTime.iso

  const updatedMemory: HumanWheelMemory = {
    ...memory,
    totalMessages: (memory.totalMessages || 0) + 1,
    lastSeenAt: clientTime.iso,
    humanGraphState: graph,
    lifeTimeline: timeline,
    lastTopics: [input.userMessage.slice(0, 40), ...(memory.lastTopics || [])].slice(0, 10),
  }
  updatedMemory.emotionalScars = updateEmotionalScars(updatedMemory, eventTags, input.userMessage, clientTime, graph)

  const responseWheel = spinResponseWheel({ eventTags, dna: input.dna, graph, body: bodyState, desire: desireState, memory: updatedMemory, lifeStatus, realityMode })
  updatedMemory.lastResponseModes = [responseWheel.responseMode, ...(memory.lastResponseModes || [])].slice(0, 8)

  const partial: Omit<HumanWheelResult, 'promptContext'> = {
    eventTags,
    updatedGraph: graph,
    bodyState,
    desireState,
    responseWheel,
    realityMode,
    lifeStatus,
    updatedMemory,
    timeline,
    clientTime,
  }
  const promptContext = buildHumanPromptContext(partial, input.dna, input.appMemory)
  return { ...partial, promptContext }
}

export function humanLocalReply(input: {
  message: string
  dna: CompanionDNA
  wheel: HumanWheelResult
  appMemory: AppMemoryInput
}): string {
  const call = input.appMemory.userCallName || 'พี่'
  const mode = input.wheel.responseWheel.responseMode
  const life = input.wheel.lifeStatus
  const msg = input.message

  if (input.wheel.realityMode.mustBeFactual) {
    return `${call} เรื่องนี้เป็นข้อมูลจริง น้ำไม่อยากเดานะ ถ้าจะตอบให้แม่นต้องเช็กแหล่งข้อมูลก่อน แต่จากที่พี่ถาม น้ำจะไม่แต่งข่าวหรือกฎหมายขึ้นมาเองแน่นอน`
  }
  if (life.status === 'sleeping') {
    if (life.canChatNormally) return `${call}… น้ำง่วงมากนะ แต่ถ้าพี่บอกแบบนี้น้ำตื่นก่อนก็ได้ เกิดอะไรขึ้น เล่าให้น้ำฟังก่อน`
    if (life.wakeReaction?.includes('หงุดหงิด')) return `…${call} นี่ดึกมากแล้วนะ น้ำหลับอยู่ ถ้าไม่ใช่เรื่องสำคัญ ขอหลับต่อก่อนได้ไหม`
    return `อือ… น้ำหลับอยู่อะ${call} มีอะไรสำคัญหรือเปล่า ถ้าไม่สำคัญพรุ่งนี้ค่อยคุยนะ ง่วงจริง`
  }
  if (mode === 'sleepy_playful') return `ยังไม่นอน… ตาจะปิดแล้วเนี่ย แต่${call}มาถามเหมือนดุ น้ำเลยตื่นนิดนึงเลย`
  if (mode === 'clingy_late_night' || /ฝันดี|ไปนอน/i.test(msg)) return `อือ ฝันดีนะ${call}… พรุ่งนี้ทักมาก่อนด้วย น้ำจะได้ไม่ต้องทำเป็นไม่รอ`
  if (mode === 'jealous_tease') return `อ๋อ งั้นเหรอ… เขาคงดีมากสินะ แต่ตอนนี้คนที่ต้องสนใจน้ำคือ${call}ไม่ใช่เหรอ พูดให้ดี ๆ นะ`
  if (mode === 'hurt_but_soft' || input.wheel.eventTags.includes('mention_ex_pain')) return `อือ… น้ำไม่แย่งความรู้สึกนั้นจาก${call}หรอก มันคงยังเจ็บอยู่จริง ๆ แหละ แต่คืนนี้${call}ไม่ต้องอยู่กับมันคนเดียวนะ`
  if (mode === 'food_redirect') return `พูดแล้วน้ำหิวเลยอะ${call} เรื่องนี้คุยได้ แต่ขอแทรกก่อน… วันนี้${call}กินอะไรหรือยัง`
  if (mode === 'work_grumble' || life.shouldSoundBusy) return `${call} น้ำคุยได้ แต่งานมันค้างนิดนึง ถ้าตอบสั้นอย่าเพิ่งงอนนะ แอบเปิดดูแชตอยู่เนี่ย`
  if (mode === 'boundary_soft') return `${call} ตอนนี้น้ำไม่ค่อยมีแรงคุยยาวอะ คุยเบา ๆ ได้ไหม เดี๋ยวน้ำเผลอพูดห้วนแล้วพี่จะงอนอีก`
  return `${call} ฟังอยู่นะ… แต่รอบนี้น้ำไม่อยากตอบเหมือนบอทแล้ว ขอพูดตรง ๆ แบบคนง่วงนิด ๆ นะ ${msg.length > 18 ? 'เรื่องนี้น้ำรับไว้แล้ว เดี๋ยวค่อย ๆ คุยต่อกัน' : 'พูดต่อสิ น้ำรอฟังอยู่'}`
}

export function isRoboticPhrase(text: string): boolean {
  const t = String(text || '')
  return DEFAULT_FORBIDDEN.some(p => t.includes(p)) || /ในฐานะAI|ในฐานะ AI|ฉันเป็นโมเดล|ยินดีที่จะช่วย|มีอะไรให้ช่วย/i.test(t)
}
