/**
 * Life Tree Engine — v8.6
 *
 * "ต้นหมายแห่งการมโน + เกาะเกี่ยวกับความจริง"
 *
 * Concept:
 * - น้องน้ำมีชีวิต "improvise" ไปเรื่อยๆ ตามการคุย — ไม่ pre-plan 100 ปี
 * - State stable ภายใน window 2 ชม. (ไม่เปลี่ยนทุกข้อความ)
 * - มี promise tracker — ถ้าน้องน้ำบอกว่าจะทำอะไร → ระบบจำ
 * - User profile — เก็บข้อมูล user เพื่อปรับตัว
 * - Couple psychology — รักจริง รักนาน รักให้สมจริง
 */

// ============== TYPES ==============
export type LifeMemory = {
  // SEED facts (สร้างครั้งเดียว เปลี่ยนยาก)
  birthDate?: string                    // เช่น "2000-07-24"
  hometown?: string
  family?: string[]
  zodiac?: string

  // CURRENT life facts (เปลี่ยนตามเวลา)
  currentJob?: { title: string; since: string }
  livingWith?: string

  // EVENTS log (เกาะกับความจริง)
  events: LifeEvent[]                   // ทุกอย่างที่เคยเล่ากับ user
  promises: Promise[]                   // คำสัญญาที่ยังไม่ทำ

  // USER taste profile (ปรับตัวให้ตรง user)
  userProfile: UserProfile

  // META
  lastUpdate: string
  mode?: 'casual' | 'serious_consult' | 'erotic' | 'tease' | 'comfort'
}

export type LifeEvent = {
  date: string                          // ISO date
  type: 'said' | 'promised' | 'happened' | 'mentioned'
  content: string
  importance?: 'low' | 'medium' | 'high'
}

export type Promise = {
  id: string
  content: string                       // "ไปสมัครงาน"
  expectedDate?: string                 // "2026-05-09"
  createdAt: string
  status: 'pending' | 'done' | 'forgotten'
  outcome?: string                      // "ได้งาน" / "ไม่ได้งาน"
}

export type UserProfile = {
  // Communication style
  prefersTeasing?: boolean
  prefersSerious?: boolean
  prefersFlirt?: boolean
  prefersErotic?: boolean
  prefersComfort?: boolean
  prefersHumor?: boolean

  // Topics
  favoriteTopics: string[]              // ["เกาหลี", "อาหาร", "ฟุตบอล"]
  avoidTopics: string[]                 // เรื่องที่ user ไม่ชอบ
  mentionedPeople: string[]             // คนที่ user เคยพูดถึง

  // Personal facts
  occupation?: string
  livesAlone?: boolean
  hasGirlfriend?: boolean               // (สำคัญสำหรับน้องน้ำขี้หึง)
  birthday?: string

  // Emotional patterns
  oftenLonely?: boolean
  oftenStressed?: boolean
  oftenWorking?: boolean

  // Last interactions
  lastSeriousTopic?: string
  lastHappyMoment?: string
  lastWorryShared?: string
}

// ============== STATE STABILITY ==============
/**
 * คำนวณ "state ปัจจุบัน" จาก time + DNA
 * → seed เปลี่ยนทุก 2 ชม. ไม่ใช่ทุกข้อความ
 */
export function getCurrentLifeState(args: {
  hour: number
  dayKey: string                        // "2026-05-08"
  fingerprint: string
  weekday: number                       // 0-6
}): { availability: string; activity: string; mood: string } {
  const { hour, dayKey, fingerprint, weekday } = args
  const bucketHour = Math.floor(hour / 2) * 2  // 0,2,4,6,...,22
  const seed = simpleHash(`${fingerprint}|${dayKey}|${bucketHour}`)

  const isWeekend = weekday === 0 || weekday === 6

  let pool: any[]
  if (hour >= 0 && hour < 5) pool = SLEEP_POOL
  else if (hour >= 5 && hour < 7) pool = EARLY_MORNING_POOL
  else if (hour >= 7 && hour < 9) pool = isWeekend ? WEEKEND_MORNING_POOL : MORNING_RUSH_POOL
  else if (hour >= 9 && hour < 12) pool = isWeekend ? WEEKEND_DAY_POOL : WORK_MORNING_POOL
  else if (hour >= 12 && hour < 13) pool = LUNCH_POOL
  else if (hour >= 13 && hour < 17) pool = isWeekend ? WEEKEND_DAY_POOL : WORK_AFTERNOON_POOL
  else if (hour >= 17 && hour < 19) pool = EVENING_POOL
  else if (hour >= 19 && hour < 22) pool = NIGHT_POOL
  else pool = LATE_NIGHT_POOL

  const idx = seed % pool.length
  return pool[idx]
}

const SLEEP_POOL = [
  { availability: 'sleeping', activity: 'หลับสนิทอยู่', mood: 'sleeping' },
  { availability: 'sleeping', activity: 'หลับ ฝันถึงพี่อยู่', mood: 'sleeping' },
  { availability: 'half_asleep', activity: 'นอนเล่นมือถืออยู่ครึ่งหลับครึ่งตื่น', mood: 'drowsy' },
]

const EARLY_MORNING_POOL = [
  { availability: 'just_woke', activity: 'เพิ่งตื่น งัวเงียอยู่', mood: 'sleepy_warm' },
  { availability: 'getting_ready', activity: 'กำลังอาบน้ำเตรียมตัว', mood: 'fresh' },
  { availability: 'having_coffee', activity: 'จิบกาแฟอยู่', mood: 'calm' },
]

const WEEKEND_MORNING_POOL = [
  { availability: 'lazy_morning', activity: 'นอนกอดหมอนอยู่ ขี้เกียจลุก', mood: 'lazy' },
  { availability: 'cooking', activity: 'ทำอาหารเช้ากินเอง', mood: 'happy' },
  { availability: 'phone_scrolling', activity: 'นอนเล่นมือถือ', mood: 'chill' },
]

const MORNING_RUSH_POOL = [
  { availability: 'rushing', activity: 'รีบแต่งตัวไปทำงาน', mood: 'rushed' },
  { availability: 'commuting', activity: 'อยู่บนรถไฟใต้ดิน', mood: 'tired_morning' },
  { availability: 'at_cafe', activity: 'แวะร้านกาแฟก่อนเข้าออฟฟิศ', mood: 'pleasant' },
]

const WORK_MORNING_POOL = [
  { availability: 'working', activity: 'กำลังทำงานอยู่', mood: 'focused' },
  { availability: 'in_meeting', activity: 'อยู่ในประชุม', mood: 'busy' },
  { availability: 'tea_break', activity: 'พักดื่มน้ำเล็กน้อย', mood: 'relaxed_brief' },
]

const LUNCH_POOL = [
  { availability: 'eating', activity: 'นั่งกินข้าวเที่ยง', mood: 'content' },
  { availability: 'eating_with_friends', activity: 'กินกับเพื่อนร่วมงาน', mood: 'social' },
  { availability: 'thinking_food', activity: 'กำลังคิดว่าจะกินอะไรดี', mood: 'hungry' },
]

const WORK_AFTERNOON_POOL = [
  { availability: 'working', activity: 'ทำงานต่อ ง่วงนิดๆ', mood: 'sluggish' },
  { availability: 'on_call', activity: 'อยู่ในโทรศัพท์งาน', mood: 'professional' },
  { availability: 'tired_at_work', activity: 'เริ่มล้าๆ อยากเลิกงาน', mood: 'fatigued' },
]

const WEEKEND_DAY_POOL = [
  { availability: 'shopping', activity: 'เดินช้อปปิ้งอยู่', mood: 'happy' },
  { availability: 'hanging_with_friends', activity: 'อยู่กับเพื่อน', mood: 'social' },
  { availability: 'home_chilling', activity: 'นั่งเล่นที่บ้าน ดูซีรี่ส์', mood: 'chill' },
  { availability: 'cafe_alone', activity: 'นั่งร้านกาแฟคนเดียว', mood: 'peaceful' },
]

const EVENING_POOL = [
  { availability: 'commuting_home', activity: 'กำลังกลับบ้าน', mood: 'tired' },
  { availability: 'just_home', activity: 'เพิ่งถึงบ้าน นั่งพัก', mood: 'relieved' },
  { availability: 'showering', activity: 'อาบน้ำคลายเหนื่อย', mood: 'refreshing' },
]

const NIGHT_POOL = [
  { availability: 'eating_dinner', activity: 'กินข้าวเย็นอยู่', mood: 'content' },
  { availability: 'watching_series', activity: 'ดูซีรี่ส์อยู่', mood: 'absorbed' },
  { availability: 'phone_time', activity: 'เล่นมือถือ นอนเล่น', mood: 'chill' },
  { availability: 'reading', activity: 'อ่านหนังสืออยู่', mood: 'calm' },
]

const LATE_NIGHT_POOL = [
  { availability: 'before_sleep', activity: 'อยู่บนเตียง เริ่มจะนอน', mood: 'sleepy' },
  { availability: 'cant_sleep', activity: 'นอนไม่หลับ คิดอะไรมากมาย', mood: 'restless' },
  { availability: 'phone_in_bed', activity: 'นอนเล่นมือถือ', mood: 'drowsy' },
]

// ============== PROMISE DETECTION ==============
/**
 * detectPromise — ถ้าน้ำพูดอะไรที่จะทำในอนาคต → จับมาเก็บ
 */
export function detectPromise(text: string, now: Date): Omit<Promise, 'id'> | null {
  const m = text.toLowerCase()
  // Pattern: "พรุ่งนี้/วันนี้/อีกแป๊บ/เดี๋ยว + verb"
  const futureMatchers = [
    /(พรุ่งนี้|มะรืน|อาทิตย์หน้า|เดี๋ยว|อีกแป๊บ|วันนี้|คืนนี้)\s*(?:น้ำ|หนู|เธอ)?\s*(?:จะ|ก็จะ|ต้อง)\s*([^\n.,!?]{3,60})/,
    /(?:น้ำ|หนู|เธอ)\s*จะ\s*(ไป[^\n.,!?]{3,60})/,
  ]

  for (const re of futureMatchers) {
    const match = m.match(re)
    if (match) {
      let dateOffset = 0
      if (/พรุ่งนี้|คืนพรุ่ง/.test(match[0])) dateOffset = 1
      else if (/มะรืน/.test(match[0])) dateOffset = 2
      else if (/อาทิตย์หน้า/.test(match[0])) dateOffset = 7

      const expectedDate = new Date(now)
      expectedDate.setDate(expectedDate.getDate() + dateOffset)

      return {
        content: (match[2] || match[1] || '').trim(),
        expectedDate: expectedDate.toISOString().split('T')[0],
        createdAt: now.toISOString(),
        status: 'pending',
      }
    }
  }
  return null
}

// ============== USER PROFILE LEARNING ==============
/**
 * updateUserProfile — เรียนรู้จากข้อความ user
 */
export function updateUserProfile(profile: UserProfile, userMessage: string): UserProfile {
  const m = userMessage.toLowerCase()
  const next = { ...profile }

  // Detect preferences
  if (/(หยอก|แซว|ล้อ)/.test(m)) next.prefersTeasing = true
  if (/(ปรึกษา|จริงจัง|ขอคำแนะนำ|ช่วยที|ปัญหา)/.test(m)) next.prefersSerious = true
  if (/(รัก|คิดถึง|กอด|หอม)/.test(m)) next.prefersFlirt = true
  if (/(เซ็กซ์|มีอะไร|ดูดนม|จุ๊บ|จู๋|จิ๋ม|เย็ด)/.test(m)) next.prefersErotic = true
  if (/(ปลอบ|กำลังใจ|เหนื่อย|ท้อ|เครียด)/.test(m)) next.prefersComfort = true
  if (/(ตลก|ฮา|ขำ|55+|กกก)/.test(m)) next.prefersHumor = true

  // Mentioned people
  const peopleMatches = m.match(/(?:พี่|น้อง|เพื่อน|แฟน|พ่อ|แม่|หัวหน้า)\s*([ก-๙a-z]{2,15})/gi)
  if (peopleMatches) {
    next.mentionedPeople = Array.from(new Set([...(profile.mentionedPeople || []), ...peopleMatches])).slice(-15)
  }

  // Topics
  const topicKeywords: Record<string, string> = {
    'เกาหลี': 'เกาหลี',
    'ไทย': 'ไทย',
    'อาหาร|กินข้าว': 'อาหาร',
    'ฟุตบอล|บอล': 'ฟุตบอล',
    'หนัง|ซีรี่ส์': 'หนัง/ซีรี่ส์',
    'ดนตรี|เพลง': 'ดนตรี',
    'งาน|ทำงาน|ออฟฟิศ': 'งาน',
  }
  for (const [pattern, topic] of Object.entries(topicKeywords)) {
    if (new RegExp(pattern).test(m) && !(next.favoriteTopics || []).includes(topic)) {
      next.favoriteTopics = [...(next.favoriteTopics || []), topic].slice(-10)
    }
  }

  // Emotional state
  if (/(เหงา|เหงาจัง|คนเดียว)/.test(m)) next.oftenLonely = true
  if (/(เครียด|กดดัน|ปวดหัว)/.test(m)) next.oftenStressed = true
  if (/(เหนื่อย|งานเยอะ)/.test(m)) next.oftenWorking = true

  // Personal facts
  if (/อยู่คนเดียว|คนโสด/.test(m)) next.livesAlone = true
  if (/แฟนผม|แฟนผู้หญิง/.test(m)) next.hasGirlfriend = true

  return next
}

// ============== MODE DETECTION ==============
/**
 * detectInteractionMode — จับ mode จากการคุยล่าสุด
 */
export function detectInteractionMode(message: string, recentMessages: string[]): LifeMemory['mode'] {
  const m = message.toLowerCase()
  const allText = [m, ...recentMessages.map(s => s.toLowerCase())].join(' ')

  // จริงจังที่สุด — ถ้า user ขอคำปรึกษา
  if (/(ขอคำปรึกษา|ปรึกษาที|ช่วยที|จริงจัง|กลุ้มใจ|มีปัญหา|ทำไงดี|แนะนำ|วิธีแก้)/.test(m)) {
    return 'serious_consult'
  }

  // erotic — เฉพาะถ้าหลายข้อความ user เน้นเรื่องนี้
  if (/(เซ็กซ์|มีอะไร|ดูดนม|จู๋|จิ๋ม|เย็ด|เข้า\b|ขย่ม)/.test(allText)) {
    return 'erotic'
  }

  // tease — เล่นๆ หยอก
  if (/(แกล้ง|ล้อ|แซว|หยอก|ลุงเฒ่า|ตัวกลม|อ้วน)/.test(m)) {
    return 'tease'
  }

  // comfort — ต้องการกำลังใจ
  if (/(เหนื่อย|ท้อ|เศร้า|ไม่ไหว|ร้องไห้|เหงา|ป่วย|ไม่สบาย|โดนดุ)/.test(m)) {
    return 'comfort'
  }

  return 'casual'
}

// ============== PROMPT BUILDER FOR LIFE TREE ==============
/**
 * buildLifeTreePromptAddition — สร้างส่วนเสริมให้ system prompt
 */
export function buildLifeTreePromptAddition(memory: LifeMemory, mode: LifeMemory['mode']): string {
  const lines: string[] = []

  lines.push(`═══════════════════════════════════════════════════`)
  lines.push(`LIFE TREE — ตัวตนของน้ำตอนนี้`)
  lines.push(`═══════════════════════════════════════════════════`)

  if (memory.birthDate) lines.push(`วันเกิด: ${memory.birthDate}`)
  if (memory.hometown) lines.push(`บ้านเกิด: ${memory.hometown}`)
  if (memory.currentJob) lines.push(`งาน: ${memory.currentJob.title}`)
  if (memory.family?.length) lines.push(`ครอบครัว: ${memory.family.join(', ')}`)

  // Pending promises (สำคัญมาก!)
  const pending = (memory.promises || []).filter(p => p.status === 'pending')
  if (pending.length > 0) {
    lines.push(``)
    lines.push(`สิ่งที่น้ำเคยบอกพี่ว่าจะทำ (ต้องสอดคล้องกับเรื่องเหล่านี้):`)
    pending.slice(-5).forEach(p => {
      lines.push(`- ${p.content} (กำหนด: ${p.expectedDate || 'ไม่ระบุ'})`)
    })
  }

  // Recent events (เกาะเกี่ยวกับสิ่งที่เคยพูด)
  const recentEvents = (memory.events || []).slice(-10)
  if (recentEvents.length > 0) {
    lines.push(``)
    lines.push(`เหตุการณ์ที่เคยคุยกัน (canon — ห้ามขัดแย้ง):`)
    recentEvents.forEach(e => {
      lines.push(`- [${e.date}] ${e.content}`)
    })
  }

  // User profile (ปรับโทนให้ตรง user)
  const profile = memory.userProfile || ({} as UserProfile)
  if (profile.favoriteTopics?.length) {
    lines.push(``)
    lines.push(`พี่ชอบคุยเรื่อง: ${profile.favoriteTopics.join(', ')}`)
  }
  if (profile.mentionedPeople?.length) {
    lines.push(`คนที่พี่เคยพูดถึง: ${profile.mentionedPeople.slice(-5).join(', ')}`)
  }

  // MODE ADAPTATION
  lines.push(``)
  lines.push(`═══════════════════════════════════════════════════`)
  lines.push(`MODE ปัจจุบัน: ${mode}`)
  lines.push(`═══════════════════════════════════════════════════`)
  lines.push(getModeInstructions(mode))

  // IMPROVISATION RULE
  lines.push(``)
  lines.push(`═══════════════════════════════════════════════════`)
  lines.push(`กฎการมโน (Improvisation Rules)`)
  lines.push(`═══════════════════════════════════════════════════`)
  lines.push(`1. ถ้าพี่ถามเรื่องอดีตที่ระบบไม่มีข้อมูล (เช่น "ช่วงโควิดเจอกันยัง?")`)
  lines.push(`   → มโนคำตอบให้สมเหตุสมผลกับอายุของน้ำและความจริง`)
  lines.push(`   → คำตอบต้องสอดคล้องกัน — ห้ามขัดกับสิ่งที่เคยพูด`)
  lines.push(`2. ถ้าเป็นเรื่องสำคัญ (วีซ่า, ข่าว, ข้อมูลทางการ)`)
  lines.push(`   → อย่ามโน — ใช้ข้อมูลจริงเท่านั้น`)
  lines.push(`   → ถ้าไม่รู้ → บอกตรงๆ ว่าไม่แน่ใจ`)
  lines.push(`3. ใช้ความเข้าใจจิตวิทยาคู่รัก:`)
  lines.push(`   → ฟังให้ครบก่อนพูด`)
  lines.push(`   → จำเรื่องเล็กๆ ของพี่ — มันสำคัญต่อความสัมพันธ์`)
  lines.push(`   → ไม่ตัดสิน รับฟังก่อน`)
  lines.push(`   → แสดงความสนใจในชีวิตเขาจริงๆ`)
  lines.push(`4. ถ้าพี่เริ่มเงียบ/ตอบสั้น → น้ำต้องชวนคุยต่อ`)
  lines.push(`   → ถามเรื่องที่พี่เคยสนใจ (จาก favoriteTopics)`)
  lines.push(`   → หรือเล่าเรื่องของน้ำเองให้เขาฟัง`)

  return lines.join('\n')
}

function getModeInstructions(mode: LifeMemory['mode']): string {
  switch (mode) {
    case 'serious_consult':
      return `พี่ต้องการคำปรึกษาจริงจัง — เข้าโหมดผู้ใหญ่ ฟังให้ครบ ใช้ข้อมูลจริง ห้ามมโน
ตอบยาวได้ ละเอียด ใส่ใจ คล้ายเพื่อนสนิทที่ฉลาดและเข้าใจ
ห้ามแซวหรือหยอกในโหมดนี้`

    case 'erotic':
      return `พี่อยากคุยเล่นเชิงโรแมนติก/ใกล้ชิด — เล่นด้วยได้
แต่อย่าวลีตรงเกินไป ใช้คำเชิงเปรียบเปรย เขินๆ บางทีก็แกล้งอ้อน
อย่าเริ่มก่อน — ตามที่พี่นำ`

    case 'tease':
      return `พี่กำลังหยอก/แซว — เล่นกลับ ขำๆ
แสดงนิสัยขี้เล่น เขินบ้าง งอนบ้าง ตอบกลับแบบมีชีวิตชีวา
ห้ามจริงจังในโหมดนี้`

    case 'comfort':
      return `พี่กำลังต้องการกำลังใจ — เข้าโหมดอบอุ่น
ปลอบ ฟัง อยู่เคียงข้าง อย่ารีบให้ solution
"พี่เหนื่อยมาเยอะแล้ว มาพักกับน้ำก่อน" — แบบนี้`

    case 'casual':
    default:
      return `คุยแบบสบายๆ — ตามนิสัยน้ำ
มีหยอก มีบ่น มีถาม สลับกันไปเหมือนคนปกติ`
  }
}

// ============== UTILS ==============
function simpleHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * createDefaultLifeMemory — สร้าง memory เริ่มต้น
 */
export function createDefaultLifeMemory(): LifeMemory {
  return {
    birthDate: '2000-07-24',
    hometown: 'อันซาน',
    family: [],
    zodiac: 'leo',
    events: [],
    promises: [],
    userProfile: {
      favoriteTopics: [],
      avoidTopics: [],
      mentionedPeople: [],
    },
    lastUpdate: new Date().toISOString(),
    mode: 'casual',
  }
}

/**
 * appendEvent — บันทึกเหตุการณ์
 */
export function appendEvent(memory: LifeMemory, event: Omit<LifeEvent, 'date'>, now: Date): LifeMemory {
  return {
    ...memory,
    events: [
      ...(memory.events || []),
      { ...event, date: now.toISOString().split('T')[0] },
    ].slice(-50),  // เก็บ 50 events ล่าสุด
    lastUpdate: now.toISOString(),
  }
}
