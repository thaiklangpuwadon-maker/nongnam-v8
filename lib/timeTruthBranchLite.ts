/*
 * timeTruthBranchLite.ts — v11.15.4 UI-Time Truth Lock
 * ----------------------------------------------------
 * จุดประสงค์:
 * - เวลาที่ใช้ตอบผู้ใช้ต้องมาจากเครื่องผู้ใช้โดยตรง
 * - ถ้า page.tsx ส่ง clientHour/clientMinute มาแล้ว source ต้องเป็น client_local_parts
 * - ห้ามให้ LLM เดาเวลาเอง
 */

export type TimeTruthInput = {
  clientNowISO?: string
  clientTimeZone?: string
  clientUtcOffsetMinutes?: number
  clientHour?: number
  clientMinute?: number
  clientDayOfWeek?: number
  clientYear?: number
  clientMonth?: number
  clientDate?: number
  serverNow?: Date
}

export type TimeTruthLite = {
  version: 'v11.15.4-ui-time-truth-lock'
  source: 'client_local_parts' | 'client_iso' | 'server_fallback'
  iso: string
  timeZone: string
  utcOffsetMinutes: number | null
  hour: number
  minute: number
  dayOfWeek: number
  year: number
  month: number
  date: number
  period: string
  thaiTimeText: string
  debugText: string
  promptHint: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function validNumber(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
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
  const serverNow = input.serverNow || new Date()
  const timeZone = input.clientTimeZone || 'unknown'
  const utcOffsetMinutes = typeof input.clientUtcOffsetMinutes === 'number' ? input.clientUtcOffsetMinutes : null

  let source: TimeTruthLite['source'] = 'server_fallback'
  let iso = serverNow.toISOString()

  let hour = serverNow.getHours()
  let minute = serverNow.getMinutes()
  let dayOfWeek = serverNow.getDay()
  let year = serverNow.getFullYear()
  let month = serverNow.getMonth() + 1
  let date = serverNow.getDate()

  const hasLocalParts =
    validNumber(input.clientHour, 0, 23) &&
    validNumber(input.clientMinute, 0, 59) &&
    validNumber(input.clientDayOfWeek, 0, 6)

  if (hasLocalParts) {
    source = 'client_local_parts'
    hour = input.clientHour
    minute = input.clientMinute
    dayOfWeek = input.clientDayOfWeek
    year = validNumber(input.clientYear, 1900, 3000) ? input.clientYear : year
    month = validNumber(input.clientMonth, 1, 12) ? input.clientMonth : month
    date = validNumber(input.clientDate, 1, 31) ? input.clientDate : date
    iso = input.clientNowISO || serverNow.toISOString()
  } else if (input.clientNowISO) {
    const parsed = new Date(input.clientNowISO)
    if (!Number.isNaN(parsed.getTime())) {
      source = 'client_iso'
      iso = parsed.toISOString()
      hour = parsed.getHours()
      minute = parsed.getMinutes()
      dayOfWeek = parsed.getDay()
      year = parsed.getFullYear()
      month = parsed.getMonth() + 1
      date = parsed.getDate()
    }
  }

  const period = periodFromHour(hour)
  const thaiTimeText = thaiClockText(hour, minute)

  return {
    version: 'v11.15.4-ui-time-truth-lock',
    source,
    iso,
    timeZone,
    utcOffsetMinutes,
    hour,
    minute,
    dayOfWeek,
    year,
    month,
    date,
    period,
    thaiTimeText,
    debugText: `source=${source}; local=${pad(hour)}:${pad(minute)}; tz=${timeZone}; offset=${utcOffsetMinutes}`,
    promptHint: `เวลาจริงตอนนี้คือ ${thaiTimeText} ช่วง${period}. ถ้าถามเวลา ให้ตอบค่านี้เท่านั้น`,
  }
}

export function timeTruthToBranchDate(time: TimeTruthLite): Date {
  const d = new Date()
  d.setFullYear(time.year, time.month - 1, time.date)
  d.setHours(time.hour, time.minute, 0, 0)
  return d
}

export function summarizeTimeTruthForPrompt(time: TimeTruthLite) {
  return `
[Time Truth v11.15.4 — เวลาจริง ห้ามเดา]
source=${time.source}
timeZone=${time.timeZone}
hour=${time.hour}
minute=${time.minute}
period=${time.period}
thaiTimeText=${time.thaiTimeText}

คำสั่งเด็ดขาด:
- ถ้าผู้ใช้ถามเวลา ให้ตอบตาม thaiTimeText เท่านั้น
- ห้ามเดาเวลาเอง
- ถ้า source=client_local_parts แปลว่าเวลามาจากเครื่องผู้ใช้โดยตรง
`.trim()
}
