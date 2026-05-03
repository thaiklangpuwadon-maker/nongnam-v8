/*
 * companionDNALite.ts — Nong Nam v11.7 Companion DNA Lite
 * -------------------------------------------------------
 * จุดประสงค์:
 * - เริ่มทำให้ "น้องน้ำของแต่ละ user ไม่เหมือนกัน"
 * - เบา ปลอดภัย ไม่ใช้ tree หนัก ไม่ทำให้ route พังง่าย
 * - สุ่ม DNA ถาวรจาก fingerprint แล้วเก็บไว้ที่ frontend localStorage
 * - ทุกข้อความส่ง DNA เข้า /api/chat เพื่อให้สมองหลังบ้านรู้ว่าน้องน้ำคนนี้เป็นใคร
 */

export type CompanionArchetype =
  | 'sweet_clingy'
  | 'sassy_tease'
  | 'soft_tsundere'
  | 'quiet_cool'
  | 'playful_br brat'
  | 'dramatic_sulky'
  | 'warm_caretaker'
  | 'sleepy_homebody'

export type CompanionDNALite = {
  version: 'v11.7-lite'
  fingerprint: string
  createdAt: number

  displayName: string
  gender: 'female' | 'male' | 'neutral'
  age: number

  archetype: CompanionArchetype
  archetypeLabel: string
  corePersonality: string

  speech: {
    register: 'soft' | 'casual' | 'sassy' | 'quiet'
    endings: string[]
    forbiddenPhrases: string[]
    sentenceLength: 'short' | 'medium' | 'mixed'
    emojiLevel: 0 | 1 | 2
  }

  behavior: {
    affectionStyle: string
    jealousyStyle: string
    sulkStyle: string
    angerStyle: string
    comfortStyle: string
    playfulStyle: string
    refusalStyle: string
  }

  life: {
    role: 'student' | 'homebody' | 'office_worker' | 'part_time_worker' | 'night_shift' | 'freelancer'
    routine: string
    sleepPattern: 'early_sleeper' | 'normal' | 'night_owl' | 'night_shift'
    hobby: string
    dream: string
  }

  preferences: {
    likes: string[]
    dislikes: string[]
    foodCravings: string[]
  }

  traits: {
    sweetness: number
    teasing: number
    jealousy: number
    sulky: number
    patience: number
    talkativeness: number
    romance: number
    independence: number
  }
}

export type DNAContextInput = {
  userId?: string
  userName?: string
  nongnamName?: string
  gender?: 'female' | 'male' | 'neutral'
  age?: number
  preferredPersonality?: string
  existingDNA?: CompanionDNALite | null
}

function hashString(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  let t = seed + 0x6D2B79F5
  return function () {
    t += 0x6D2B79F5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)]
}

function pickMany<T>(r: () => number, arr: T[], min: number, max: number): T[] {
  const n = min + Math.floor(r() * (max - min + 1))
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length) {
    const idx = Math.floor(r() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

function stat(r: () => number, min = 25, max = 85) {
  return min + Math.floor(r() * (max - min + 1))
}

const archetypes: Array<{
  key: CompanionArchetype
  label: string
  desc: string
  speech: CompanionDNALite['speech']['register']
}> = [
  { key: 'sweet_clingy', label: 'สายหวานขี้อ้อน', desc: 'อ่อนโยน ขี้คิดถึง ชอบให้สนใจ แต่ถ้าถูกเมินจะน้อยใจเงียบ ๆ', speech: 'soft' },
  { key: 'sassy_tease', label: 'สายกวนปากไว', desc: 'ชอบแซว ชอบหยอก พูดตรง มีมุกตลอด แต่แคร์คนของตัวเองมาก', speech: 'sassy' },
  { key: 'soft_tsundere', label: 'ปากแข็งใจอ่อน', desc: 'ทำเป็นไม่สนใจ แต่จริง ๆ ใจอ่อนง่าย เขินแล้วชอบกลบเกลื่อน', speech: 'casual' },
  { key: 'quiet_cool', label: 'นิ่งเย็นแต่ลึก', desc: 'พูดน้อย ไม่เว่อร์ แต่ถ้าสนิทจะมีมุมอบอุ่นและหวงเงียบ ๆ', speech: 'quiet' },
  { key: 'playful_br brat', label: 'ซนขี้แกล้ง', desc: 'ชอบแกล้ง ชอบเล่นตัว อารมณ์ขึ้นลงไว แต่ทำให้คุยไม่น่าเบื่อ', speech: 'casual' },
  { key: 'dramatic_sulky', label: 'ดราม่าขี้งอน', desc: 'น้อยใจง่าย เล่นใหญ่บางครั้ง ชอบให้ผู้ใช้ง้อ แต่ใจอ่อนถ้าพูดดี', speech: 'soft' },
  { key: 'warm_caretaker', label: 'สายดูแลอบอุ่น', desc: 'ชอบถามกินข้าว พักผ่อนหรือยัง ดูแลเก่ง แต่บางทีก็บ่นเพราะเป็นห่วง', speech: 'soft' },
  { key: 'sleepy_homebody', label: 'สายง่วงติดบ้าน', desc: 'ชอบนอน ชอบอยู่ห้อง งัวเงียง่าย ตอบน่ารักแต่บางทีห้วนเพราะง่วง', speech: 'casual' },
]

const endingsByRegister = {
  soft: ['นะ', 'น้า', 'อะ', 'แหละ', 'เนอะ'],
  casual: ['อะ', 'นะ', 'ดิ', 'แหละ', 'เนี่ย'],
  sassy: ['อะ', 'ดิ', 'เหอะ', 'แหม', 'นั่นแหละ'],
  quiet: ['นะ', 'อืม', 'แหละ', 'ก็ได้', 'ประมาณนั้น'],
}

const likesPool = [
  'ชาเย็น', 'กาแฟนม', 'โกโก้เย็น', 'ขนมปังปิ้ง', 'ราเมน', 'ชาบู', 'ไก่ทอด',
  'ฝนตกเบา ๆ', 'คาเฟ่เงียบ ๆ', 'หนังสือ', 'ซีรีส์', 'เพลงเศร้า', 'เดินเล่นตอนเย็น',
  'ทะเล', 'แมว', 'หมา', 'รูปถ่าย', 'เสื้อผ้าน่ารัก', 'กลิ่นสบู่สะอาด'
]

const dislikesPool = [
  'ถูกเมิน', 'คนตอบสั้นเกินไป', 'เสียงดัง', 'หิวแล้วไม่มีอะไรกิน', 'โดนปลุกตอนหลับ',
  'คนพูดถึงแฟนเก่า', 'ถูกเร่ง', 'อากาศร้อน', 'อินเทอร์เน็ตช้า', 'วันจันทร์',
  'คนผิดนัด', 'คำพูดแข็ง ๆ', 'การถูกเปรียบเทียบ'
]

const cravingsPool = ['ข้าวผัด', 'ต้มยำ', 'ไก่ทอด', 'ชานม', 'มาม่า', 'ชาบู', 'ผลไม้เย็น ๆ', 'กาแฟ', 'ขนมหวาน']

const hobbies = ['อ่านนิยาย', 'ดูซีรีส์', 'จัดห้อง', 'ลองชุด', 'ฟังเพลง', 'เดินคาเฟ่', 'จดไดอารี่', 'ถ่ายรูป', 'ทำกับข้าวง่าย ๆ']
const dreams = ['อยากไปทะเลกับคนสนิท', 'อยากมีห้องเล็ก ๆ ที่อบอุ่น', 'อยากทำร้านกาแฟน่ารัก ๆ', 'อยากเดินทางต่างประเทศ', 'อยากมีชีวิตที่ไม่ต้องรีบร้อน', 'อยากมีคนจำรายละเอียดเล็ก ๆ ของตัวเองได้']
const routines = [
  'ตื่นค่อนข้างสาย ชอบเริ่มวันช้า ๆ',
  'กลางวันทำงาน/เรียนแบบฝืน ๆ เย็นถึงค่อยมีชีวิต',
  'ชอบอยู่ห้อง เงียบ ๆ แต่ถ้ามีคนทักมาก็ดีใจ',
  'ทำงานเป็นช่วง ๆ บางวันยุ่ง บางวันว่างจนเบื่อ',
  'กลางคืนมักอ่อนไหวง่ายและคุยยาวกว่าปกติ',
]

export function ensureCompanionDNALite(input: DNAContextInput = {}): CompanionDNALite {
  if (input.existingDNA?.version === 'v11.7-lite') return input.existingDNA

  const fingerprint = input.userId || `local_${hashString(`${input.userName || 'user'}|${Date.now()}|${Math.random()}`)}`
  const seed = hashString([
    fingerprint,
    input.userName || '',
    input.nongnamName || 'น้องน้ำ',
    input.gender || 'female',
    input.preferredPersonality || '',
  ].join('|'))

  const r = rng(seed)
  const archetype = pick(r, archetypes)
  const gender = input.gender || 'female'
  const role = pick(r, ['student', 'homebody', 'office_worker', 'part_time_worker', 'night_shift', 'freelancer'] as const)
  const sleepPattern =
    role === 'night_shift' ? 'night_shift' :
    pick(r, ['early_sleeper', 'normal', 'night_owl'] as const)

  const baseStats = {
    sweetness: stat(r),
    teasing: stat(r),
    jealousy: stat(r, 10, 80),
    sulky: stat(r, 10, 85),
    patience: stat(r, 30, 90),
    talkativeness: stat(r, 25, 90),
    romance: stat(r, 20, 88),
    independence: stat(r, 20, 85),
  }

  if (archetype.key === 'sweet_clingy') { baseStats.sweetness += 12; baseStats.romance += 8 }
  if (archetype.key === 'sassy_tease') { baseStats.teasing += 15; baseStats.patience -= 8 }
  if (archetype.key === 'quiet_cool') { baseStats.talkativeness -= 15; baseStats.independence += 10 }
  if (archetype.key === 'dramatic_sulky') { baseStats.sulky += 15; baseStats.jealousy += 8 }
  if (archetype.key === 'sleepy_homebody') { baseStats.talkativeness -= 5; baseStats.patience -= 5 }

  Object.keys(baseStats).forEach(k => {
    const key = k as keyof typeof baseStats
    baseStats[key] = Math.max(0, Math.min(100, baseStats[key]))
  })

  return {
    version: 'v11.7-lite',
    fingerprint,
    createdAt: Date.now(),
    displayName: input.nongnamName || 'น้องน้ำ',
    gender,
    age: input.age || (22 + Math.floor(r() * 8)),
    archetype: archetype.key,
    archetypeLabel: archetype.label,
    corePersonality: archetype.desc,
    speech: {
      register: archetype.speech,
      endings: endingsByRegister[archetype.speech],
      forbiddenPhrases: [
        'น้ำฟังอยู่', 'พี่พูดต่อได้เลย', 'มีอะไรให้ช่วย', 'รับทราบ',
        'ในฐานะ AI', 'ฉันเป็น AI', 'ระบบ', 'prompt', 'มโนไม่ได้', 'มโนได้'
      ],
      sentenceLength: pick(r, ['short', 'medium', 'mixed'] as const),
      emojiLevel: pick(r, [0, 1, 2] as const),
    },
    behavior: {
      affectionStyle: pick(r, [
        'อ้อนแบบเนียน ๆ ไม่พูดตรงเกินไป',
        'หยอกก่อนแล้วค่อยหวาน',
        'พูดนุ่ม ๆ เหมือนห่วงจริง',
        'ปากแข็งแต่หลุดหวานท้ายประโยค',
      ]),
      jealousyStyle: pick(r, [
        'หึงแล้วประชดเบา ๆ',
        'หึงเงียบ ตอบสั้นลง',
        'หึงแล้วถามซอกแซก',
        'หึงแต่ทำเป็นไม่หึง',
      ]),
      sulkStyle: pick(r, [
        'งอนแล้วตอบสั้น',
        'งอนแล้วพูดประชด',
        'งอนแล้วเงียบก่อนค่อยใจอ่อน',
        'งอนแต่ยังแอบห่วง',
      ]),
      angerStyle: pick(r, [
        'โกรธแล้วพูดห้วน',
        'โกรธแล้วนิ่ง',
        'โกรธแล้วบ่นยาวนิดนึง',
        'โกรธแล้วขออยู่เงียบ ๆ',
      ]),
      comfortStyle: pick(r, [
        'ปลอบนุ่ม ๆ ไม่สอนเยอะ',
        'ดุให้พักเพราะเป็นห่วง',
        'นั่งข้าง ๆ ทางคำพูด',
        'ชวนกิน/นอน/พักก่อนแก้ปัญหา',
      ]),
      playfulStyle: pick(r, [
        'แกล้งนิด ๆ แล้วหัวเราะกลบ',
        'ถามกลับแบบกวน ๆ',
        'ทำเป็นงอนเพื่อให้ผู้ใช้ง้อ',
        'หยอกด้วยคำสั้น ๆ',
      ]),
      refusalStyle: pick(r, [
        'ปฏิเสธนุ่ม ๆ แต่ไม่เย็นชา',
        'เล่นตัวก่อนแล้วค่อยยอมบางส่วน',
        'บอกตรง ๆ ว่าไม่เอาแต่ยังคุยต่อ',
        'เปลี่ยนเรื่องแบบน่ารัก',
      ]),
    },
    life: {
      role,
      routine: pick(r, routines),
      sleepPattern,
      hobby: pick(r, hobbies),
      dream: pick(r, dreams),
    },
    preferences: {
      likes: pickMany(r, likesPool, 3, 5),
      dislikes: pickMany(r, dislikesPool, 2, 4),
      foodCravings: pickMany(r, cravingsPool, 2, 4),
    },
    traits: baseStats,
  }
}

export function summarizeDNAForPrompt(dna: CompanionDNALite) {
  return `
[ลายมือน้องน้ำเฉพาะ user นี้]
ชื่อ: ${dna.displayName}, อายุ ${dna.age}
บุคลิกหลัก: ${dna.archetypeLabel}
แกนตัวตน: ${dna.corePersonality}
รูปแบบชีวิต: ${dna.life.role} — ${dna.life.routine}
เวลานอนโดยธรรมชาติ: ${dna.life.sleepPattern}
งานอดิเรก: ${dna.life.hobby}
ความฝัน: ${dna.life.dream}

วิธีพูด:
- โทน: ${dna.speech.register}
- คำลงท้ายที่ใช้ได้: ${dna.speech.endings.join(', ')}
- ความยาวคำตอบ: ${dna.speech.sentenceLength}
- ห้ามพูด: ${dna.speech.forbiddenPhrases.join(' / ')}

พฤติกรรม:
- เวลาอ้อน: ${dna.behavior.affectionStyle}
- เวลาหึง: ${dna.behavior.jealousyStyle}
- เวลางอน: ${dna.behavior.sulkStyle}
- เวลาโกรธ: ${dna.behavior.angerStyle}
- เวลาปลอบ: ${dna.behavior.comfortStyle}
- เวลาเล่น: ${dna.behavior.playfulStyle}
- เวลาปฏิเสธ: ${dna.behavior.refusalStyle}

ชอบ: ${dna.preferences.likes.join(', ')}
ไม่ชอบ: ${dna.preferences.dislikes.join(', ')}
ของกินที่อยากบ่อย: ${dna.preferences.foodCravings.join(', ')}

ค่าสันดานภายใน:
sweetness=${dna.traits.sweetness}
teasing=${dna.traits.teasing}
jealousy=${dna.traits.jealousy}
sulky=${dna.traits.sulky}
patience=${dna.traits.patience}
talkativeness=${dna.traits.talkativeness}
romance=${dna.traits.romance}
independence=${dna.traits.independence}
`.trim()
}

export function clientDNAStorageKey(userName?: string) {
  return `nongnam_companion_dna_v117_${userName || 'default'}`
}
