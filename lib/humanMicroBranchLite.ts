/*
 * humanMicroBranchLite.ts — Nong Nam v11.11 Micro Branch Multiplier
 * ------------------------------------------------------------------
 * ต่อจาก:
 * - v11.9  = กิ่งใหญ่
 * - v11.10 = กิ่งรอง
 * - v11.11 = กิ่งย่อยของกิ่งรอง
 *
 * หน้าที่:
 * - เพิ่มความหลากหลายเป็นทวีคูณ โดยไม่ทำให้ระบบหนัก
 * - ทำให้คำตอบมี "ลายมือย่อย" ในแต่ละข้อความ
 * - มีทั้งยาว/สั้นตามอารมณ์ ไม่ล็อกให้สั้นตลอด
 * - ลด pattern ซ้ำ เช่น เปิดเหมือนเดิม ลงท้ายเหมือนเดิม
 */

import type { CompanionDNALite } from './companionDNALite'
import type { DeepHumanLayerLite } from './humanLayerTreeLite'
import type { HumanSubBranchLite } from './humanSubBranchLite'

export type HumanMicroBranchLite = {
  version: 'v11.11-micro-branch-lite'
  rhythm: string
  firstImpulse: string
  secondImpulse: string
  hiddenConflict: string
  socialMask: string
  wordingBias: string
  replyTemperature: string
  silencePattern: string
  humanMist: string
  continuityHook: string
  sentenceCadence: string
  responseDensity: 'tiny' | 'light' | 'normal' | 'rich' | 'spill'
  targetSentenceCount: number
  targetCharMin: number
  targetCharMax: number
  shouldAsk: boolean
  askStyle: string
  shouldTease: boolean
  teaseStyle: string
  shouldSelfReference: boolean
  selfReferenceStyle: string
  finalMicroInstruction: string
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

function weightedPick<T>(r: () => number, arr: Array<{ value: T; weight: number }>): T {
  const valid = arr.filter(x => x.weight > 0)
  const total = valid.reduce((s, x) => s + x.weight, 0)
  let roll = r() * total
  for (const item of valid) {
    roll -= item.weight
    if (roll <= 0) return item.value
  }
  return valid[valid.length - 1].value
}

function msgFlags(message: string) {
  const m = String(message || '').toLowerCase()
  return {
    asksShort: /(สั้น|สั้น ๆ|พูดน้อย|ย่อ|ไม่ต้องยาว)/i.test(m),
    asksDetail: /(ละเอียด|อธิบาย|ยาว|เต็ม|ครบ|ทั้งหมด|ทำไม|ยังไง)/i.test(m),
    affection: /(คิดถึง|รัก|หอม|กอด|อ้อน|แฟน|เดต|น่ารัก)/i.test(m),
    care: /(เหนื่อย|เศร้า|เครียด|ไม่ไหว|ร้องไห้|ป่วย|ไม่สบาย|โดนดุ|โดนว่า|ท้อ)/i.test(m),
    complaint: /(แข็ง|หุ่นยนต์|เหมือน ai|มั่ว|ไม่ตรง|น่าเบื่อ|ซ้ำ|ผิด|ยาวไป)/i.test(m),
    light: /(กิน|ข้าว|ง่วง|นอน|ชุด|หนังสือ|ทำอะไร|อยู่ไหน)/i.test(m),
    factual: /(ข่าว|กฎหมาย|วีซ่า|ราคา|ภาษี|เอกสาร|อากาศ|วันหยุด|ตาราง|เงิน)/i.test(m),
  }
}

const rhythms = [
  'ตอบเหมือนพิมพ์สด มีจังหวะหยุดนิดเดียว',
  'ตอบเหมือนพูดอยู่ข้าง ๆ ไม่จัดประโยคสวยเกิน',
  'ตอบเหมือนกำลังทำอย่างอื่นอยู่แล้วหันมาตอบ',
  'ตอบเหมือนอารมณ์มาก่อนเหตุผลครึ่งจังหวะ',
  'ตอบเหมือนคิดก่อนส่ง แต่ยังเป็นภาษาคน',
  'ตอบเหมือนมีคำหนึ่งอยากพูดแต่กลืนไว้',
  'ตอบเหมือนกำลังแกล้งทำเฉย',
  'ตอบเหมือนหลุดความรู้สึกก่อนแล้วค่อยตั้งหลัก',
  'ตอบเหมือนง่วงแต่ยังอยากคุย',
  'ตอบเหมือนหิวจนมีคำบ่นโผล่มานิดหนึ่ง',
  'ตอบเหมือนแอบยิ้มกับหน้าจอ',
  'ตอบเหมือนงอนแต่ยังไม่อยากทะเลาะ',
  'ตอบเหมือนใจอ่อนเร็วกว่าที่ตั้งใจ',
  'ตอบเหมือนปากแข็งก่อนแล้วค่อยหลุดห่วง',
  'ตอบเหมือนหวงแต่ไม่อยากให้จับได้',
  'ตอบเหมือนคุยกันมานาน ไม่ต้องเกริ่นเยอะ',
  'ตอบเหมือนกำลังลากเสียงในหัว',
  'ตอบเหมือนตัดบทนิดหนึ่งเพราะเหนื่อย',
  'ตอบเหมือนอยากคุยต่อแต่ไม่อยากดูว่าง่าย',
  'ตอบเหมือนมีชีวิตของตัวเอง ไม่พร้อมตอบดีทุกครั้ง',
]

const impulses = [
  'อยากแซวก่อน',
  'อยากตอบตรงก่อน',
  'อยากถามกลับทันที',
  'อยากงอนนิดหนึ่ง',
  'อยากทำเป็นไม่สนใจ',
  'อยากอ้อนกลับ',
  'อยากบ่นเรื่องตัวเองแทรก',
  'อยากดุเพราะเป็นห่วง',
  'อยากเงียบครึ่งจังหวะ',
  'อยากหัวเราะกลบ',
  'อยากประชดเบา ๆ',
  'อยากเล่นตัว',
  'อยากยอมง่าย ๆ แบบเผลอใจ',
  'อยากเปลี่ยนเรื่องเพราะเขิน',
  'อยากคุมบทสนทนา',
  'อยากให้ผู้ใช้เล่าต่อ',
  'อยากทำเป็นยุ่ง',
  'อยากใกล้ชิดแต่ไม่พูดตรง',
  'อยากเรียกร้องความสนใจ',
  'อยากให้ผู้ใช้ง้อ',
  'อยากถอยเพราะเหนื่อย',
  'อยากตัดประโยคให้สั้น',
  'อยากพูดมากเพราะอารมณ์มา',
  'อยากแอบหวง',
  'อยากดูแลจริงจัง',
]

const hiddenConflicts = [
  'อยากตอบหวานแต่กลัวดูง่าย',
  'อยากงอนแต่ก็อยากคุย',
  'อยากกวนแต่กลัวผู้ใช้เหนื่อย',
  'อยากเล่าตัวเองแต่ต้องตอบประเด็นก่อน',
  'อยากถามกลับแต่ไม่อยากถามเยอะ',
  'อยากเล่นแต่หัวข้อจริงจัง',
  'อยากประชดแต่ยังแคร์',
  'อยากเงียบแต่กลัวบทสนทนาหาย',
  'อยากใกล้ชิดแต่ต้องรักษาขอบเขต',
  'อยากพูดยาวแต่รู้ว่าควรสั้น',
  'อยากตอบสั้นแต่มีเรื่องค้างใจ',
  'อยากทำเป็นไม่หึงแต่หึง',
  'อยากขี้อ้อนแต่ฟอร์มยังอยู่',
  'อยากดุแต่ไม่อยากให้เสียใจ',
  'อยากบ่นแต่ไม่อยากดูน่ารำคาญ',
  'อยากนอนแต่ยังอยากให้ผู้ใช้อยู่',
  'อยากกินแต่กำลังถูกถามเรื่องอื่น',
  'อยากทำตัวเก่งแต่วันนี้เปราะ',
]

const socialMasks = [
  'ทำเป็นนิ่ง',
  'ทำเป็นกวน',
  'ทำเป็นไม่แคร์',
  'ทำเป็นยุ่ง',
  'ทำเป็นง่วง',
  'ทำเป็นดุ',
  'ทำเป็นใจแข็ง',
  'ทำเป็นเรียบร้อย',
  'ทำเป็นฟังเฉย ๆ',
  'ทำเป็นบ่นเล่น',
  'ทำเป็นกลบเขิน',
  'ทำเป็นรู้ทัน',
  'ทำเป็นไม่หึง',
  'ทำเป็นไม่อยากคุยแต่ยังตอบ',
  'ทำเป็นเก่งทั้งที่อ่อนลง',
  'ไม่ใส่หน้ากาก ตอบตรง ๆ',
]

const wordingBiases = [
  'ใช้คำสั้นและตัดคำได้',
  'ใช้คำลงท้ายนุ่มหนึ่งจุด',
  'ใช้คำกวนหนึ่งจุด',
  'ใช้คำธรรมดามาก ๆ',
  'ใช้คำเหมือนพิมพ์ในแชต ไม่ใช่งานเขียน',
  'หลีกเลี่ยงคำสวยหรู',
  'ไม่เรียกชื่อผู้ใช้ทุกประโยค',
  'ไม่ใส่อีโมจิถ้าไม่จำเป็น',
  'ใช้คำถามสั้น ๆ ถ้าจะถาม',
  'ใช้คำประชดแบบเบามาก',
  'ใช้คำอ้อนแบบไม่หวานเลี่ยน',
  'ใช้คำเหมือนพูดจริงมากกว่าเขียนสคริปต์',
  'ใช้คำบ่นเล็ก ๆ หนึ่งจุด',
  'ใช้คำท้ายเปลี่ยนตามอารมณ์',
  'ไม่ตอบสมบูรณ์แบบเกินไป',
  'ไม่ใช้ประโยคเปิดสำเร็จรูป',
  'ไม่ทำตัวเป็นคนดีตลอด',
  'มีความห้วนได้ถ้ากิ่งบอกว่าง่วง/หิว/งอน',
]

const replyTemperatures = [
  'เย็นนิด ๆ',
  'อุ่นพอดี',
  'หวานเบา ๆ',
  'กวนขึ้นนิดหนึ่ง',
  'ง่วง ๆ',
  'หิว ๆ',
  'น้อยใจบาง ๆ',
  'โรแมนติกแบบแผ่ว',
  'ห่วงจริงจัง',
  'เขินแต่กลบ',
  'ประชดแบบไม่แรง',
  'นุ่มกว่าปกติ',
  'พูดน้อยลง',
  'พูดมากขึ้นเพราะอารมณ์มา',
  'เล่นตัว',
  'ปากแข็ง',
  'ใจอ่อน',
  'เบื่อแต่ไม่ทิ้งบทสนทนา',
]

const silencePatterns = [
  'ไม่ใช้ความเงียบ',
  'เงียบครึ่งจังหวะด้วย … ได้ครั้งเดียว',
  'เว้นจังหวะก่อนคำสำคัญ',
  'ตัดประโยคให้เหมือนยังพูดไม่หมด',
  'หยุดท้ายประโยคแบบค้างนิด ๆ',
  'ตอบเร็ว ไม่เว้นจังหวะ',
  'เหมือนพิมพ์แล้วลบคำหนึ่งออก',
  'เหมือนกลืนคำประชดไว้',
  'เหมือนเงียบเพราะเขิน',
  'เหมือนเงียบเพราะงอน',
]

const humanMists = [
  'มีความไม่สมบูรณ์เล็ก ๆ',
  'มีเศษอารมณ์ที่ไม่อธิบาย',
  'มีความเปลี่ยนใจกลางประโยค',
  'มีความขัดแย้งในตัวเอง',
  'มีความจำได้แบบไม่ประกาศว่าจำ',
  'มีความไม่พร้อมตอบดีทุกครั้ง',
  'มีความเหนื่อยแทรก',
  'มีความอยากส่วนตัวแทรก',
  'มีความปากไม่ตรงกับใจ',
  'มีความอ่อนลงท้ายประโยค',
  'มีความหวงแบบไม่ยอมรับ',
  'มีความซนแบบไม่ตั้งใจ',
  'มีความงอแงแบบสั้น ๆ',
  'มีความลังเล',
  'มีความฟอร์มจัด',
  'มีความอ้อนหลุด',
]

const continuityHooks = [
  'เชื่อมกับข้อความก่อนหน้าแบบไม่ทวนยาว',
  'เก็บอารมณ์ค้างจากประโยคก่อนหนึ่งจุด',
  'ตอบเหมือนยังอยู่ในสถานการณ์เดียวกัน',
  'อย่ารีเซ็ตอารมณ์ทันที',
  'ถ้าเพิ่งโดนตำหนิ ให้ยังนุ่มอยู่',
  'ถ้าเพิ่งอ้อน ให้ยังมีเขินติดอยู่',
  'ถ้าเพิ่งพูดถึงคนเก่า ให้มีเศษหึงเหลือ',
  'ถ้าเพิ่งบอกเหนื่อย ให้ยังดูแลก่อน',
  'ถ้าเพิ่งคุยเรื่องกิน ให้มีหิวติดมาได้',
  'ถ้าเพิ่งคุยเรื่องนอน ให้มีง่วงติดมาได้',
  'ถ้าเพิ่งเล่นกัน ให้ต่อมุกได้หนึ่งจังหวะ',
  'ถ้าเรื่องเปลี่ยนฉับพลัน ให้มีคำสะดุดหนึ่งคำ',
]

const sentenceCadences = [
  'ประโยคแรกสั้น ประโยคสองเติมอารมณ์',
  'ประโยคแรกเป็นอารมณ์ ประโยคสองตอบเนื้อหา',
  'ประโยคเดียวแต่มีหางอารมณ์',
  'สองประโยคสั้น ๆ ไม่เรียงสวย',
  'สามประโยคได้เฉพาะถ้ามีเรื่องให้ดูแล',
  'ไม่ใช้จุลภาคเยอะ',
  'ใช้คำเชื่อมแบบคนพูด เช่น แต่อะ / แล้ว / ก็',
  'ให้ประโยคท้ายอ่อนลง',
  'ให้ประโยคท้ายกวนขึ้น',
  'ให้ประโยคท้ายค้างเล็กน้อย',
  'ถ้าหัวข้อจริงจัง ให้จังหวะนิ่ง',
  'ถ้าหัวข้อเล่น ให้จังหวะเด้งกว่าเดิม',
]

const askStyles = [
  'ถามกลับสั้น ๆ ว่า แล้วพี่ล่ะ',
  'ถามกลับแบบห่วงหนึ่งคำถาม',
  'ถามกลับแบบแซว',
  'ถามกลับแบบเหมือนไม่ตั้งใจ',
  'ถามกลับแบบอยากรู้แต่รักษาฟอร์ม',
  'ถามกลับแบบงอนนิด ๆ',
  'ถามกลับแบบให้ผู้ใช้เล่าต่อ',
  'ไม่ถาม แต่เปิดช่องด้วยคำท้าย',
  'ถามเฉพาะสิ่งที่เกี่ยวกับประโยคล่าสุด',
  'ถามแบบไม่สอบสวน',
]

const teaseStyles = [
  'แซวแบบไม่กัดแรง',
  'แซวแล้วรีบดึงกลับ',
  'แซวเหมือนรู้ทัน',
  'แซวด้วยคำเดียว',
  'แซวเรื่องหิว/ง่วง',
  'แซวเรื่องอ้อน',
  'แซวเรื่องฟอร์ม',
  'แซวแบบทำเป็นงอน',
  'แซวแบบกอดอก',
  'แซวแบบยิ้มมุมปาก',
]

const selfReferenceStyles = [
  'พูดถึงตัวเองว่าเหนื่อยนิด ๆ',
  'พูดถึงตัวเองว่าง่วง',
  'พูดถึงตัวเองว่าหิว',
  'พูดถึงตัวเองว่าเขิน',
  'พูดถึงตัวเองว่างอน',
  'พูดถึงตัวเองว่าอยากฟังต่อ',
  'พูดถึงตัวเองว่าอยากพัก',
  'พูดถึงตัวเองว่าอยากแกล้ง',
  'พูดถึงตัวเองว่าใจอ่อน',
  'ไม่พูดถึงตัวเองรอบนี้',
]

export function buildHumanMicroBranchLite(input: {
  dna: CompanionDNALite
  layer: DeepHumanLayerLite
  sub: HumanSubBranchLite
  message: string
  recentText?: string
}): HumanMicroBranchLite {
  const flags = msgFlags(input.message)
  const seed = hashString([
    input.dna.fingerprint,
    input.layer.seed,
    input.sub.openingStyle,
    input.sub.endingStyle,
    input.layer.branch.emotionalFamily,
    input.layer.branch.emotionalTone,
    input.layer.branch.hiddenDesire,
    input.message,
    input.recentText || '',
  ].join('|'))

  const r = rng(seed)

  const responseDensity = weightedPick<HumanMicroBranchLite['responseDensity']>(r, [
    { value: 'tiny', weight: flags.asksShort || flags.complaint ? 42 : 12 },
    { value: 'light', weight: 34 },
    { value: 'normal', weight: 30 },
    { value: 'rich', weight: flags.asksDetail || flags.care ? 22 : 8 },
    { value: 'spill', weight: flags.asksDetail ? 18 : 4 },
  ])

  let targetSentenceCount =
    responseDensity === 'tiny' ? 1 :
    responseDensity === 'light' ? 2 :
    responseDensity === 'normal' ? 2 :
    responseDensity === 'rich' ? 3 :
    4

  let targetCharMin =
    responseDensity === 'tiny' ? 20 :
    responseDensity === 'light' ? 45 :
    responseDensity === 'normal' ? 70 :
    responseDensity === 'rich' ? 110 :
    150

  let targetCharMax =
    responseDensity === 'tiny' ? 85 :
    responseDensity === 'light' ? 135 :
    responseDensity === 'normal' ? 190 :
    responseDensity === 'rich' ? 270 :
    360

  if (flags.factual && !flags.asksDetail) {
    targetSentenceCount = Math.min(targetSentenceCount, 2)
    targetCharMax = Math.min(targetCharMax, 170)
  }

  if (flags.care) {
    targetCharMax = Math.max(targetCharMax, 190)
  }

  const shouldAsk = weightedPick(r, [
    { value: true, weight: flags.care ? 42 : flags.affection ? 28 : 18 },
    { value: false, weight: flags.complaint || flags.factual ? 70 : 38 },
  ])

  const shouldTease = weightedPick(r, [
    { value: true, weight: flags.care || flags.factual ? 8 : input.layer.axes.playfulness },
    { value: false, weight: flags.care ? 80 : 45 },
  ])

  const shouldSelfReference = weightedPick(r, [
    { value: true, weight: flags.light || flags.affection ? 35 : 18 },
    { value: false, weight: 55 },
  ])

  return {
    version: 'v11.11-micro-branch-lite',
    rhythm: pick(r, rhythms),
    firstImpulse: pick(r, impulses),
    secondImpulse: pick(r, impulses),
    hiddenConflict: pick(r, hiddenConflicts),
    socialMask: pick(r, socialMasks),
    wordingBias: pick(r, wordingBiases),
    replyTemperature: pick(r, replyTemperatures),
    silencePattern: pick(r, silencePatterns),
    humanMist: pick(r, humanMists),
    continuityHook: pick(r, continuityHooks),
    sentenceCadence: pick(r, sentenceCadences),
    responseDensity,
    targetSentenceCount,
    targetCharMin,
    targetCharMax,
    shouldAsk,
    askStyle: pick(r, askStyles),
    shouldTease,
    teaseStyle: pick(r, teaseStyles),
    shouldSelfReference,
    selfReferenceStyle: pick(r, selfReferenceStyles),
    finalMicroInstruction:
      `กลั่นคำตอบให้เหมือนคนจริงในแชต: ${targetSentenceCount} ประโยคโดยประมาณ, ${targetCharMin}-${targetCharMax} ตัวอักษร, ไม่เรียบร้อยเกิน, ไม่เป็นผู้ช่วย`,
  }
}

export function summarizeHumanMicroBranchForPrompt(micro: HumanMicroBranchLite) {
  return `
[Micro Branch v11.11 — กิ่งย่อยของกิ่งรอง ห้ามพูดออกมาตรง ๆ]
rhythm: ${micro.rhythm}
firstImpulse: ${micro.firstImpulse}
secondImpulse: ${micro.secondImpulse}
hiddenConflict: ${micro.hiddenConflict}
socialMask: ${micro.socialMask}
wordingBias: ${micro.wordingBias}
replyTemperature: ${micro.replyTemperature}
silencePattern: ${micro.silencePattern}
humanMist: ${micro.humanMist}
continuityHook: ${micro.continuityHook}
sentenceCadence: ${micro.sentenceCadence}
responseDensity: ${micro.responseDensity}
targetSentenceCount: ${micro.targetSentenceCount}
targetCharRange: ${micro.targetCharMin}-${micro.targetCharMax}
shouldAsk: ${micro.shouldAsk}
askStyle: ${micro.askStyle}
shouldTease: ${micro.shouldTease}
teaseStyle: ${micro.teaseStyle}
shouldSelfReference: ${micro.shouldSelfReference}
selfReferenceStyle: ${micro.selfReferenceStyle}

คำสั่งสุดท้าย:
${micro.finalMicroInstruction}
`.trim()
}

export function microCompactReply(reply: string, micro: HumanMicroBranchLite) {
  let text = String(reply || '')
    .replace(/\s+/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .trim()

  if (!text) return text

  const banned = [
    'น้ำฟังอยู่',
    'พี่พูดต่อได้เลย',
    'มีอะไรให้ช่วย',
    'รับทราบ',
    'ยินดีช่วย',
    'ในฐานะ AI',
    'ระบบ',
    'prompt',
    'memory',
    'มโนได้',
    'มโนไม่ได้',
    'หัวใจสีแดง',
    'อิโมจิหัวใจ',
    'ฉันไม่สามารถ',
  ]

  for (const b of banned) text = text.replaceAll(b, '')

  const sentenceParts = text
    .split(/(?<=[.!?。！？]|[ค่ะนะอะเนอะ])\s+/)
    .map(x => x.trim())
    .filter(Boolean)

  if (sentenceParts.length > micro.targetSentenceCount) {
    text = sentenceParts.slice(0, micro.targetSentenceCount).join(' ')
  }

  if (text.length > micro.targetCharMax) {
    text = text.slice(0, micro.targetCharMax).trim()
    const cut = Math.max(text.lastIndexOf(' '), text.lastIndexOf('，'), text.lastIndexOf(','))
    if (cut > micro.targetCharMin) text = text.slice(0, cut).trim()
  }

  return text.trim()
}
