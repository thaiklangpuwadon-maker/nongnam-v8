/*
 * visibleStatusBranchLite.ts — Nong Nam v11.15 Visible Status Branch
 * ------------------------------------------------------------------
 * จุดประสงค์:
 * - แปลงกิ่งภายในทั้งหมดให้กลายเป็น "สถานะเล็ก ๆ ที่โชว์หน้าแชต"
 * - ไม่โชว์ตัวเลขระบบ ไม่โชว์ชื่อ branch
 * - โชว์เป็นภาษาคน เช่น 🌙 ง่วงนิด ๆ · นอนกลิ้งอยู่
 * - สถานะมีผลกับคำตอบจริง เพราะ route จะส่ง status นี้เข้า prompt ด้วย
 */

import type { CompanionDNALite } from './companionDNALite'
import type { DeepHumanLayerLite } from './humanLayerTreeLite'
import type { HumanSubBranchLite } from './humanSubBranchLite'
import type { HumanMicroBranchLite } from './humanMicroBranchLite'
import type { HumanLifeSceneBranchLite } from './humanLifeSceneBranchLite'
import type { HumanBodyAutonomyBranchLite } from './humanBodyAutonomyBranchLite'
import type { HumanCoreDesireKilesaBranchLite } from './humanCoreDesireKilesaBranchLite'

export type VisibleAvailability =
  | 'available'
  | 'soft_limited'
  | 'low_availability'
  | 'sleeping'
  | 'busy'
  | 'emotionally_available'
  | 'sulky'
  | 'romantic'

export type VisibleStatusLite = {
  version: 'v11.15-visible-status-lite'
  emoji: string
  label: string
  detail: string
  availability: VisibleAvailability
  canInterrupt: boolean
  interruptMood: string
  displayText: string
  shortText: string
  chipClass: string
  shouldShowWakeHint: boolean
  promptHint: string
}

function hourPeriod(hour: number) {
  if (hour >= 0 && hour < 4) return 'late_night'
  if (hour >= 4 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 14) return 'noon'
  if (hour >= 14 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

function detectMessage(message: string) {
  const m = String(message || '').toLowerCase()
  return {
    wake: /(ตื่น|ปลุก|ตื่นได้แล้ว|หลับอยู่ไหม|นอนอยู่ไหม)/i.test(m),
    asksStatus: /(ทำอะไร|ทำไร|อยู่ไหน|ตอนนี้|สถานะ|ว่างไหม|คุยได้ไหม|นอนหรือยัง)/i.test(m),
    care: /(เหนื่อย|เศร้า|เครียด|ไม่ไหว|ร้องไห้|ป่วย|ไม่สบาย)/i.test(m),
    affection: /(คิดถึง|รัก|กอด|หอม|อ้อน|แฟน|เดต|เดท)/i.test(m),
    complaint: /(แข็ง|ยาว|มั่ว|ไม่ตรง|หุ่นยนต์|เหมือน ai|น่าเบื่อ|ซ้ำ)/i.test(m),
  }
}

function chooseStatus(input: {
  dna: CompanionDNALite
  layer: DeepHumanLayerLite
  sub: HumanSubBranchLite
  micro: HumanMicroBranchLite
  life: HumanLifeSceneBranchLite
  bodyAuto: HumanBodyAutonomyBranchLite
  core: HumanCoreDesireKilesaBranchLite
  message: string
  now?: Date
}): Omit<VisibleStatusLite, 'version' | 'displayText' | 'shortText' | 'chipClass' | 'promptHint'> {
  const now = input.now || new Date()
  const hour = now.getHours()
  const period = hourPeriod(hour)
  const flags = detectMessage(input.message)

  const sleepPattern = input.dna.life.sleepPattern
  const body = input.bodyAuto.body
  const life = input.life.scene
  const core = input.core
  const layer = input.layer

  const veryTired = body.energyLevel < 28 || body.dominantState.includes('ง่วง') || body.dominantState.includes('หลับ') || layer.axes.tiredness > 82
  const hungry = body.dominantState.includes('หิว') || body.secondaryState.includes('ท้อง') || layer.axes.hunger > 76
  const sickish = body.secondaryState.includes('ปวด') || body.secondaryState.includes('ไม่สบาย') || body.secondaryState.includes('ตัวอุ่น')
  const annoyed = body.sensoryIrritation > 76 || input.bodyAuto.autonomy.moodResistance > 75
  const sulky = core.dominant === 'pride' || core.dominant === 'anger' || input.bodyAuto.autonomy.expressionMode.includes('งอน')
  const romantic = core.dominant === 'love' || core.dominant === 'attachment' || layer.axes.affection > 78
  const caring = core.dominant === 'care' || flags.care

  const likelySleeping =
    !flags.wake &&
    (
      (sleepPattern !== 'night_shift' && (period === 'late_night' || period === 'dawn') && veryTired) ||
      life.availability === 'sleepy_available' && body.energyLevel < 20
    )

  if (likelySleeping) {
    return {
      emoji: '😴',
      label: 'หลับอยู่',
      detail: 'ปลุกได้ถ้าสำคัญ',
      availability: 'sleeping',
      canInterrupt: true,
      interruptMood: annoyed ? 'งัวเงียและหงุดหงิดนิด ๆ ถ้าถูกปลุกเล่น ๆ' : 'งัวเงีย แต่ยังใจอ่อนได้ถ้าเรื่องสำคัญ',
      shouldShowWakeHint: true,
    }
  }

  if (flags.wake && veryTired) {
    return {
      emoji: '🌙',
      label: 'เพิ่งโดนปลุก',
      detail: 'ยังงัวเงียอยู่',
      availability: 'soft_limited',
      canInterrupt: true,
      interruptMood: 'ตอบได้ แต่มีสิทธิ์งอแงหรือบ่นว่าถูกปลุก',
      shouldShowWakeHint: false,
    }
  }

  if (sickish) {
    return {
      emoji: '🤒',
      label: 'ไม่ค่อยสบาย',
      detail: 'เสียงอ่อนกว่าปกติ',
      availability: 'low_availability',
      canInterrupt: true,
      interruptMood: 'ไม่พร้อมเล่นเยอะ อยากให้พูดดี ๆ',
      shouldShowWakeHint: false,
    }
  }

  if (hungry) {
    return {
      emoji: '🍚',
      label: 'หิวข้าว',
      detail: 'สมองเริ่มไปอยู่กับของกิน',
      availability: 'soft_limited',
      canInterrupt: true,
      interruptMood: 'ตอบได้ แต่อาจงอแงเรื่องกิน',
      shouldShowWakeHint: false,
    }
  }

  if (veryTired) {
    return {
      emoji: '🌙',
      label: 'ง่วงนิด ๆ',
      detail: 'นอนกลิ้งอยู่ แต่ยังตอบได้',
      availability: 'soft_limited',
      canInterrupt: true,
      interruptMood: 'ห้วนขึ้นนิด แต่ไม่ได้ไม่อยากคุย',
      shouldShowWakeHint: false,
    }
  }

  if (life.availability === 'busy_but_replying' || life.availability === 'distracted') {
    return {
      emoji: '💼',
      label: 'ยุ่งนิดนึง',
      detail: 'กำลังทำอะไรค้างไว้',
      availability: 'busy',
      canInterrupt: true,
      interruptMood: 'ตอบได้ แต่ไม่ควรถามยาวเกิน',
      shouldShowWakeHint: false,
    }
  }

  if (sulky) {
    return {
      emoji: '😤',
      label: 'งอนนิด ๆ',
      detail: 'พูดดี ๆ ก่อน',
      availability: 'sulky',
      canInterrupt: true,
      interruptMood: 'ตอบได้ แต่มีฟอร์มและอาจเถียงเบา ๆ',
      shouldShowWakeHint: false,
    }
  }

  if (romantic && !flags.complaint) {
    return {
      emoji: '💕',
      label: 'อยากอ้อน',
      detail: 'แต่ยังทำเป็นนิ่ง',
      availability: 'romantic',
      canInterrupt: true,
      interruptMood: 'ใจอ่อนง่ายขึ้น แต่ยังเล่นตัวได้',
      shouldShowWakeHint: false,
    }
  }

  if (caring) {
    return {
      emoji: '🫶',
      label: 'พร้อมฟัง',
      detail: 'วันนี้โหมดดูแลมาเอง',
      availability: 'emotionally_available',
      canInterrupt: true,
      interruptMood: 'พร้อมคุยเรื่องหนักแบบไม่แกล้งเยอะ',
      shouldShowWakeHint: false,
    }
  }

  if (life.activity.includes('อ่าน') || life.unfinishedThing.includes('หนังสือ')) {
    return {
      emoji: '📚',
      label: 'อ่านอะไรค้างอยู่',
      detail: 'แต่อ่านไม่ค่อยรู้เรื่องแล้ว',
      availability: 'available',
      canInterrupt: true,
      interruptMood: 'ถูกชวนคุยได้ อาจวกเข้าเรื่องหนังสือ',
      shouldShowWakeHint: false,
    }
  }

  if (life.availability === 'half_here') {
    return {
      emoji: '💭',
      label: 'เหม่อ ๆ',
      detail: 'ใจลอยแต่ยังคุยได้',
      availability: 'soft_limited',
      canInterrupt: true,
      interruptMood: 'ตอบได้ แต่อาจมีจังหวะช้า ๆ',
      shouldShowWakeHint: false,
    }
  }

  return {
    emoji: '🟢',
    label: 'คุยได้',
    detail: 'อารมณ์พอไหวอยู่',
    availability: 'available',
    canInterrupt: true,
    interruptMood: 'ตอบได้ตามปกติ มีแกล้งบ้างตามอารมณ์',
    shouldShowWakeHint: false,
  }
}

export function buildVisibleStatusLite(input: {
  dna: CompanionDNALite
  layer: DeepHumanLayerLite
  sub: HumanSubBranchLite
  micro: HumanMicroBranchLite
  life: HumanLifeSceneBranchLite
  bodyAuto: HumanBodyAutonomyBranchLite
  core: HumanCoreDesireKilesaBranchLite
  message: string
  now?: Date
}): VisibleStatusLite {
  const base = chooseStatus(input)
  const displayText = `${base.emoji} ${base.label} · ${base.detail}`
  const shortText = `${base.emoji} ${base.label}`

  const chipClass =
    base.availability === 'sleeping' ? 'status-sleeping' :
    base.availability === 'low_availability' ? 'status-low' :
    base.availability === 'busy' ? 'status-busy' :
    base.availability === 'sulky' ? 'status-sulky' :
    base.availability === 'romantic' ? 'status-romantic' :
    base.availability === 'emotionally_available' ? 'status-care' :
    'status-normal'

  return {
    version: 'v11.15-visible-status-lite',
    ...base,
    displayText,
    shortText,
    chipClass,
    promptHint:
      `สถานะที่ผู้ใช้เห็นคือ "${displayText}". ให้คำตอบสอดคล้องกับสถานะนี้จริง ๆ แต่ห้ามอธิบายว่าเป็นระบบสถานะ`,
  }
}

export function summarizeVisibleStatusForPrompt(status: VisibleStatusLite) {
  return `
[Visible Status v11.15 — สถานะที่โชว์หน้าแชต]
displayText=${status.displayText}
availability=${status.availability}
canInterrupt=${status.canInterrupt}
interruptMood=${status.interruptMood}
wakeHint=${status.shouldShowWakeHint}

คำสั่ง:
- ผู้ใช้เห็นสถานะนี้บนหน้าแชต
- คำตอบต้องสอดคล้องกับสถานะ เช่น ถ้าหลับ/ง่วง ให้เสียงงัวเงียหรือห้วนขึ้น
- ถ้าสถานะหิว ให้วกเรื่องกินได้นิดเดียว
- ถ้าสถานะยุ่ง ให้ตอบสั้นแต่ยังแคร์
- ถ้าสถานะงอน ให้มีฟอร์ม/ประชดเบา ๆ ได้
- ถ้าสถานะอยากอ้อน ให้ใจอ่อนหรือเล่นตัวแบบนุ่ม ๆ ได้
- ห้ามพูดว่า “สถานะระบบบอกว่า…”
`.trim()
}
