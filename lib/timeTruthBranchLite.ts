/*
 * timeTruthBranchLite.ts — Nong Nam v11.15.1 Time Truth Fix
 * ---------------------------------------------------------
 * ใช้แก้ปัญหาน้องน้ำตอบเวลา/ช่วงวันมั่ว เช่น บอกบ่ายสองทั้งที่ตอนนี้สองทุ่ม
 *
 * หลัก:
 * - เวลา "จริง" ต้องมาจาก client device ก่อนเสมอ
 * - ถ้า client ไม่ส่งมา ค่อย fallback เป็น server Date
 * - ห้ามให้ LLM เดาเวลาเอง
 * - เวลาใช้สุ่มกิ่งได้ แต่เวลาที่ตอบผู้ใช้ต้องเป็นค่าจริงจาก timeTruth เท่านั้น
 */

export type TimeTruthInput = {
  clientNowISO?: string
  clientTimeZone?: string
  clientUtcOffsetMinutes?: number
  serverNow?: Date
}

export type TimeTruthLite = {
  version: 'v11.15.1-time-truth-lite'
  source: 'client' | 'server_fallback'
  iso: string
  timeZone: string
  utcOffsetMinutes: number | null
  hour: number
  minute: number
  dayOfWeek: number
  period: string
  thaiTimeText: string
  promptHint: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function periodFromHour(hour: number) {
  if (hour >= 0 && hour < 4) return 'ดึกมาก'
  if (hour >= 4 && hour < 7) return 'เช้ามืด'
  if (hour >= 7 && hour < 11) return 'เช้า'
  if (hour >= 11 && hour < 13) return 'สาย'
  if (hour >= 13 && hour < 16) return 'บ่าย'
  if (hour >= 16 && hour < 18) return 'เย็น'
  if (hour >= 18 && hour < 22) return 'ค่ำ'
  return 'ดึก'
}

function thaiClockText(hour: number, minute: number) {
  const mm = pad(minute)

  if (hour === 0) return `เที่ยงคืน ${mm} นาที`
  if (hour > 0 && hour < 6) return `ตี ${hour} ${mm} นาที`
  if (hour === 6) return `หกโมงเช้า ${mm} นาที`
  if (hour > 6 && hour < 12) return `${hour} โมงเช้า ${mm} นาที`
  if (hour === 12) return `เที่ยง ${mm} นาที`
  if (hour > 12 && hour < 16) return `บ่าย ${hour - 12} โมง ${mm} นาที`
  if (hour >= 16 && hour < 18) return `${hour - 12} โมงเย็น ${mm} นาที`
  if (hour >= 18 && hour < 24) return `${hour - 12} ทุ่ม ${mm} นาที`
  return `${pad(hour)}:${mm}`
}

export function buildTimeTruthLite(input: TimeTruthInput = {}): TimeTruthLite {
  let source: TimeTruthLite['source'] = 'server_fallback'
  let d: Date

  if (input.clientNowISO) {
    const parsed = new Date(input.clientNowISO)
    if (!Number.isNaN(parsed.getTime())) {
      d = parsed
      source = 'client'
    } else {
      d = input.serverNow || new Date()
    }
  } else {
    d = input.serverNow || new Date()
  }

  // สำคัญ:
  // Date object ที่มาจาก ISO มี instant ถูกต้อง แต่ getHours() บน server อาจใช้ timezone server
  // ถ้า client ส่ง local parts มาไม่ได้ ให้ใช้ fallback นี้ก่อน
  // v11.15.2 ค่อยให้ page.tsx ส่ง local hour/minute ตรง ๆ เพิ่ม
  const hour = d.getHours()
  const minute = d.getMinutes()
  const dayOfWeek = d.getDay()
  const timeZone = input.clientTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'
  const utcOffsetMinutes = typeof input.clientUtcOffsetMinutes === 'number' ? input.clientUtcOffsetMinutes : null
  const period = periodFromHour(hour)
  const thaiTimeText = thaiClockText(hour, minute)

  return {
    version: 'v11.15.1-time-truth-lite',
    source,
    iso: d.toISOString(),
    timeZone,
    utcOffsetMinutes,
    hour,
    minute,
    dayOfWeek,
    period,
    thaiTimeText,
    promptHint:
      `เวลาจริงตอนนี้คือ ${thaiTimeText} ช่วง${period}. source=${source}. ห้ามเดาเวลาเอง ถ้าผู้ใช้ถามเวลาให้ตอบตามค่านี้เท่านั้น`,
  }
}

export function summarizeTimeTruthForPrompt(time: TimeTruthLite) {
  return `
[Time Truth v11.15.1 — เวลาจริง ห้ามเดา]
source=${time.source}
iso=${time.iso}
timeZone=${time.timeZone}
utcOffsetMinutes=${time.utcOffsetMinutes}
hour=${time.hour}
minute=${time.minute}
period=${time.period}
thaiTimeText=${time.thaiTimeText}

คำสั่ง:
- ถ้าผู้ใช้ถามว่า "ตอนนี้กี่โมง/กี่ทุ่ม/เวลาเท่าไหร่" ให้ตอบตาม thaiTimeText เท่านั้น
- ห้ามมโนเวลา ห้ามเดาเวลา ห้ามใช้เวลาจากอารมณ์
- การสุ่มกิ่งใช้อิงเวลาได้ แต่คำตอบเรื่องเวลาต้องใช้ Time Truth เท่านั้น
- ถ้า source=server_fallback ให้ตอบได้ แต่ไม่ต้องพูดเรื่อง server เว้นแต่ผู้ใช้ถามว่าทำไมเวลาเพี้ยน
`.trim()
}
