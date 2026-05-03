/*
 * timeTruthBranchLite.ts — Nong Nam v11.15.5 Force Client Timestamp
 * -----------------------------------------------------------------
 * หลักใหม่:
 * Browser เป็นเจ้าของเวลา
 * Server เป็นแค่คนรับเวลา
 * AI เป็นแค่คนใช้เวลา
 *
 * ห้ามใช้เวลา server เป็นหลัก ถ้า browser ส่งเวลาเข้ามาแล้ว
 */

export type TimeTruthInput = {
  // เวลาดิบจากเครื่องผู้ใช้
  clientTimestampMs?: number

  // เวลาเป็นข้อความที่ browser แปลงให้แล้ว
  clientTimeText?: string
  clientDateText?: string
  clientDateTimeText?: string

  // timezone เครื่องผู้ใช้
  clientTimeZone?: string
  clientUtcOffsetMinutes?: number

  // local parts จากเครื่องผู้ใช้
  clientHour?: number
  clientMinute?: number
  clientSecond?: number
  clientDayOfWeek?: number
  clientYear?: number
  clientMonth?: number
  clientDate?: number

  // fallback เท่านั้น
  clientNowISO?: string
  serverNow?: Date
}

export type TimeTruthLite = {
  version: 'v11.15.5-force-client-timestamp'
  source: 'client_text_and_parts' | 'client_local_parts' | 'client_timestamp' | 'client_iso' | 'server_fallback'

  timestampMs: number
  iso: string

  timeZone: string
  utcOffsetMinutes: number | null

  hour: number
  minute: number
  second: number
  dayOfWeek: number
  year: number
  month: number
  date: number

  period: string

  thaiTimeText: string
  thaiDateText: string
  thaiDateTimeText: string

  seedStamp: string
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

function fallbackDateText(year: number, month: number, date: number) {
  return `${date}/${month}/${year}`
}

function safeText(v: unknown) {
  return typeof v === 'string' && v.trim() ? v.trim() : ''
}

export function buildTimeTruthLite(input: TimeTruthInput = {}): TimeTruthLite {
  const serverNow = input.serverNow || new Date()
  const timeZone = input.clientTimeZone || 'unknown'
  const utcOffsetMinutes = typeof input.clientUtcOffsetMinutes === 'number' ? input.clientUtcOffsetMinutes : null

  let source: TimeTruthLite['source'] = 'server_fallback'

  let timestampMs = serverNow.getTime()
  let iso = serverNow.toISOString()

  let hour = serverNow.getHours()
  let minute = serverNow.getMinutes()
  let second = serverNow.getSeconds()
  let dayOfWeek = serverNow.getDay()
  let year = serverNow.getFullYear()
  let month = serverNow.getMonth() + 1
  let date = serverNow.getDate()

  const hasText = Boolean(safeText(input.clientTimeText))
  const hasLocalParts =
    validNumber(input.clientHour, 0, 23) &&
    validNumber(input.clientMinute, 0, 59) &&
    validNumber(input.clientDayOfWeek, 0, 6)

  const hasTimestamp = validNumber(input.clientTimestampMs, 0, Number.MAX_SAFE_INTEGER)

  if (hasText && hasLocalParts) {
    source = 'client_text_and_parts'
    timestampMs = hasTimestamp ? input.clientTimestampMs! : timestampMs
    iso = input.clientNowISO || (hasTimestamp ? new Date(input.clientTimestampMs!).toISOString() : iso)

    hour = input.clientHour!
    minute = input.clientMinute!
    second = validNumber(input.clientSecond, 0, 59) ? input.clientSecond : 0
    dayOfWeek = input.clientDayOfWeek!
    year = validNumber(input.clientYear, 1900, 3000) ? input.clientYear : year
    month = validNumber(input.clientMonth, 1, 12) ? input.clientMonth : month
    date = validNumber(input.clientDate, 1, 31) ? input.clientDate : date
  } else if (hasLocalParts) {
    source = 'client_local_parts'
    timestampMs = hasTimestamp ? input.clientTimestampMs! : timestampMs
    iso = input.clientNowISO || (hasTimestamp ? new Date(input.clientTimestampMs!).toISOString() : iso)

    hour = input.clientHour!
    minute = input.clientMinute!
    second = validNumber(input.clientSecond, 0, 59) ? input.clientSecond : 0
    dayOfWeek = input.clientDayOfWeek!
    year = validNumber(input.clientYear, 1900, 3000) ? input.clientYear : year
    month = validNumber(input.clientMonth, 1, 12) ? input.clientMonth : month
    date = validNumber(input.clientDate, 1, 31) ? input.clientDate : date
  } else if (hasTimestamp) {
    source = 'client_timestamp'
    timestampMs = input.clientTimestampMs!
    iso = input.clientNowISO || new Date(timestampMs).toISOString()

    // timestamp อย่างเดียวอาจกลายเป็น timezone server ตอน getHours()
    // ใช้เป็น fallback เท่านั้น ถ้าไม่มี local parts
    const d = new Date(timestampMs)
    hour = d.getHours()
    minute = d.getMinutes()
    second = d.getSeconds()
    dayOfWeek = d.getDay()
    year = d.getFullYear()
    month = d.getMonth() + 1
    date = d.getDate()
  } else if (input.clientNowISO) {
    const parsed = new Date(input.clientNowISO)
    if (!Number.isNaN(parsed.getTime())) {
      source = 'client_iso'
      timestampMs = parsed.getTime()
      iso = parsed.toISOString()
      hour = parsed.getHours()
      minute = parsed.getMinutes()
      second = parsed.getSeconds()
      dayOfWeek = parsed.getDay()
      year = parsed.getFullYear()
      month = parsed.getMonth() + 1
      date = parsed.getDate()
    }
  }

  const period = periodFromHour(hour)

  const thaiTimeText = safeText(input.clientTimeText) || thaiClockText(hour, minute)
  const thaiDateText = safeText(input.clientDateText) || fallbackDateText(year, month, date)
  const thaiDateTimeText =
    safeText(input.clientDateTimeText) ||
    `${thaiDateText} เวลา ${thaiTimeText}`

  const seedStamp = [
    timestampMs,
    timeZone,
    year,
    month,
    date,
    hour,
    minute,
    second,
    dayOfWeek,
  ].join('|')

  return {
    version: 'v11.15.5-force-client-timestamp',
    source,
    timestampMs,
    iso,
    timeZone,
    utcOffsetMinutes,
    hour,
    minute,
    second,
    dayOfWeek,
    year,
    month,
    date,
    period,
    thaiTimeText,
    thaiDateText,
    thaiDateTimeText,
    seedStamp,
    debugText: `source=${source}; time=${thaiTimeText}; date=${thaiDateText}; local=${pad(hour)}:${pad(minute)}:${pad(second)}; tz=${timeZone}; ts=${timestampMs}`,
    promptHint: `เวลาจริงจากเครื่องผู้ใช้คือ ${thaiDateTimeText}. ถ้าถามเวลา/วันนี้/เมื่อวาน/พรุ่งนี้ ให้ยึดค่านี้เท่านั้น`,
  }
}

export function timeTruthToBranchDate(time: TimeTruthLite): Date {
  // ใช้ local parts ที่ browser ส่งมาเพื่อหลอก branch เดิมให้เห็นเวลา local ถูกต้อง
  const d = new Date()
  d.setFullYear(time.year, time.month - 1, time.date)
  d.setHours(time.hour, time.minute, time.second, 0)
  return d
}

export function summarizeTimeTruthForPrompt(time: TimeTruthLite) {
  return `
[Time Truth v11.15.5 — เวลาจริงจากเครื่องผู้ใช้ ห้ามเดา]
source=${time.source}
timestampMs=${time.timestampMs}
timeZone=${time.timeZone}
utcOffsetMinutes=${time.utcOffsetMinutes}
hour=${time.hour}
minute=${time.minute}
second=${time.second}
dayOfWeek=${time.dayOfWeek}
date=${time.date}
month=${time.month}
year=${time.year}
period=${time.period}
thaiTimeText=${time.thaiTimeText}
thaiDateText=${time.thaiDateText}
thaiDateTimeText=${time.thaiDateTimeText}

คำสั่งเด็ดขาด:
- ถ้าผู้ใช้ถามเวลา ให้ตอบตาม thaiTimeText เท่านั้น
- ถ้าผู้ใช้ถามวันนี้ ให้ตอบตาม thaiDateText เท่านั้น
- ถ้าผู้ใช้ถามเมื่อวาน/พรุ่งนี้ ให้เทียบจาก year/month/date นี้เท่านั้น
- ห้ามใช้เวลา server, UTC, Vercel, หรืออเมริกาเป็นเวลาหลัก
- ห้ามเดาเวลาเอง
- source ที่ดีที่สุดคือ client_text_and_parts หรือ client_local_parts
`.trim()
}
