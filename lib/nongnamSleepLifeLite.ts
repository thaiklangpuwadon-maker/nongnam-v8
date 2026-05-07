export type NongNamSleepMode = "awake" | "winding_down" | "sleepy" | "sleeping" | "half_awake" | "late_night_exception";
export type NongNamDayType = "weekday" | "weekend" | "soft_day" | "tired_day" | "late_night_out";

export type NongNamSleepLifeState = {
  mode: NongNamSleepMode;
  dayType: NongNamDayType;
  emoji: string;
  label: string;
  detail: string;
  displayText: string;
  activity: string;
  mood: string;
  body: string;
  availability: "available" | "soft_limited" | "sleepy" | "sleeping" | "serious_override";
  sleepStartHour: number;
  wakeHour: number;
  startedAtMs: number;
  expiresAtMs: number;
  source: "sleep_routine";
};

export type SeriousDetection = {
  serious: boolean;
  level: "none" | "serious" | "urgent";
  reason: string;
  category: "none" | "health" | "danger" | "visa" | "law" | "money" | "work" | "document" | "housing" | "emergency";
};

function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded01(seed: number) {
  let t = seed + 0x6D2B79F5;
  t += 0x6D2B79F5;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

export function detectSeriousReality(message: string): SeriousDetection {
  const m = String(message || "").toLowerCase();

  if (/(หายใจไม่ออก|แน่นหน้าอก|เจ็บหน้าอก|เลือดออก|หมดสติ|ชัก|รถชน|อุบัติเหตุ|ฉุกเฉิน|ฆ่าตัวตาย|ทำร้ายตัวเอง|โดนทำร้าย|ไฟไหม้)/i.test(m)) {
    return { serious: true, level: "urgent", category: "emergency", reason: "emergency or immediate danger" };
  }
  if (/(ป่วย|เจ็บ|ปวด|โรงพยาบาล|หมอ|ยา|ผ่าตัด|หายใจ|ไข้|ไอ|อาเจียน|ท้องเสีย|แพ้ยา|เจ็บหลัง|ปวดหลัง)/i.test(m)) {
    return { serious: true, level: "serious", category: "health", reason: "health or medical issue" };
  }
  if (/(วีซ่า|visa|e-9|อีเก้า|e9|e-7-4|อีเจ็ด|f-2-r|f-6|d-2|d-4|eps|อีพีเอส|เปลี่ยนวีซ่า|ย้ายงาน|เปลี่ยนที่ทำงาน|ตม\.|ตรวจคนเข้าเมือง|외국인등록증|กาม่า)/i.test(m)) {
    return { serious: true, level: "serious", category: "visa", reason: "visa or immigration issue" };
  }
  if (/(กฎหมาย|ตำรวจ|คดี|ฟ้อง|นายจ้าง|แรงงาน|สัญญา|ผิดกฎหมาย|โดนจับ|ถูกขู่|โดนโกง)/i.test(m)) {
    return { serious: true, level: "serious", category: "law", reason: "law or labor issue" };
  }
  if (/(เงินเดือน|ค่าแรง|ภาษี|สลิป|โอนเงิน|หักเงิน|퇴직금|국민연금|ประกัน|หนี้|ค่าเช่า|มัดจำ|ธนาคาร)/i.test(m)) {
    return { serious: true, level: "serious", category: "money", reason: "money or tax issue" };
  }
  if (/(เอกสาร|ใบสมัคร|หนังสือรับรอง|พาสปอร์ต|passport|บัตร|สัญญา|แบบฟอร์ม)/i.test(m)) {
    return { serious: true, level: "serious", category: "document", reason: "document issue" };
  }
  if (/(ห้องเช่า|เจ้าของห้อง|ย้ายห้อง|มัดจำห้อง|ค่าเช่าห้อง|บ้านเช่า|월세|전세)/i.test(m)) {
    return { serious: true, level: "serious", category: "housing", reason: "housing issue" };
  }
  return { serious: false, level: "none", category: "none", reason: "not serious" };
}

export function buildSleepLifeState(args: {
  nowParts: { year: number; month: number; date: number; hour: number; minute: number; dayOfWeek: number; timezone?: string; };
  userCallName?: string;
  existing?: any;
  message?: string;
}): NongNamSleepLifeState {
  const nowMs = Date.now();
  const existing = args.existing;

  if (existing && Number(existing.expiresAtMs || 0) > nowMs && existing.source === "sleep_routine") {
    return existing as NongNamSleepLifeState;
  }

  const { year, month, date, hour, dayOfWeek } = args.nowParts;
  const seed = hashText(`${year}-${month}-${date}-${args.userCallName || "พี่"}-nongnam-sleep`);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let dayType: NongNamDayType = isWeekend ? "weekend" : "weekday";
  const dailyFlavor = seeded01(seed);
  if (dailyFlavor > 0.92) dayType = "late_night_out";
  else if (dailyFlavor > 0.82) dayType = "tired_day";
  else if (dailyFlavor > 0.72) dayType = "soft_day";

  let sleepStartHour = isWeekend ? 1 : 0;
  let wakeHour = isWeekend ? 10 : 8;

  if (dayType === "late_night_out") {
    sleepStartHour = isWeekend ? 3 : 2;
    wakeHour = isWeekend ? 11 : 9;
  } else if (dayType === "tired_day") {
    sleepStartHour = isWeekend ? 0 : 23;
    wakeHour = isWeekend ? 10 : 8;
  } else if (dayType === "soft_day") {
    sleepStartHour = isWeekend ? 1 : 0;
    wakeHour = isWeekend ? 11 : 8;
  }

  const jitter = Math.floor(seeded01(seed + 11) * 3) - 1;
  sleepStartHour = (sleepStartHour + jitter + 24) % 24;
  wakeHour = Math.max(6, Math.min(12, wakeHour + Math.floor(seeded01(seed + 19) * 3) - 1));

  const isSleepWindow =
    sleepStartHour >= 22
      ? (hour >= sleepStartHour || hour < wakeHour)
      : (hour >= sleepStartHour && hour < wakeHour);

  let mode: NongNamSleepMode = "awake";
  if (isSleepWindow) mode = "sleeping";
  else if (hour >= 21 && hour < 23) mode = "winding_down";
  else if (hour >= 23 || hour < 2) mode = "sleepy";
  else if (hour >= wakeHour && hour < wakeHour + 1) mode = "half_awake";

  if (dayType === "late_night_out" && (hour >= 22 || hour < sleepStartHour)) mode = "late_night_exception";

  const durationMs =
    mode === "sleeping" ? 90 * 60 * 1000 :
    mode === "sleepy" ? 60 * 60 * 1000 :
    mode === "winding_down" ? 60 * 60 * 1000 :
    mode === "half_awake" ? 45 * 60 * 1000 :
    60 * 60 * 1000;

  const table: Record<NongNamSleepMode, any> = {
    awake: { emoji: "🌤️", label: "ตื่นอยู่", detail: "ทำอะไรของตัวเองอยู่ แต่คุยได้", displayText: "🌤️ ตื่นอยู่ · ทำอะไรของตัวเองอยู่ แต่คุยได้", activity: "ทำอะไรของตัวเองอยู่", mood: "ปกติ อ่อนโยน", body: "ตื่น", availability: "available" },
    winding_down: { emoji: "🌙", label: "เริ่มง่วง", detail: "เริ่มช้าลง แต่ยังอยากคุยกับพี่", displayText: "🌙 เริ่มง่วง · ยังอยากคุย แต่เริ่มช้าลง", activity: "นอนกลิ้งอยู่ใกล้จะพัก", mood: "อ้อน ง่วงนิด ๆ", body: "เริ่มง่วง", availability: "sleepy" },
    sleepy: { emoji: "😪", label: "ง่วงมาก", detail: "ตอบได้ แต่จะงัวเงียและสั้นลง", displayText: "😪 ง่วงมาก · ตอบได้แต่จะงัวเงีย", activity: "นอนเล่นบนเตียง", mood: "งัวเงีย แอบงอแง", body: "ง่วงมาก", availability: "sleepy" },
    sleeping: { emoji: "😴", label: "หลับอยู่", detail: "ปลุกได้ถ้าสำคัญ", displayText: "😴 หลับอยู่ · ปลุกได้ถ้าสำคัญ", activity: "หลับอยู่", mood: "ง่วง ไม่ค่อยอยากตอบยาว", body: "หลับ", availability: "sleeping" },
    half_awake: { emoji: "🥱", label: "เพิ่งตื่น", detail: "ยังงัวเงียอยู่หน่อย ๆ", displayText: "🥱 เพิ่งตื่น · ยังงัวเงียอยู่หน่อย ๆ", activity: "เพิ่งลืมตา", mood: "งัวเงีย อ้อนนิด ๆ", body: "เพิ่งตื่น", availability: "soft_limited" },
    late_night_exception: { emoji: "🌃", label: "ยังไม่นอน", detail: "คืนนี้หลุดรูทีนนิดหน่อย", displayText: "🌃 ยังไม่นอน · คืนนี้หลุดรูทีนนิดหน่อย", activity: "ยังนั่งเล่นอยู่", mood: "ตื่นกว่าปกติ แต่ลึก ๆ ก็เริ่มล้า", body: "ยังไม่ง่วงเต็มที่", availability: "available" },
  };

  return { mode, dayType, ...table[mode], sleepStartHour, wakeHour, startedAtMs: nowMs, expiresAtMs: nowMs + durationMs, source: "sleep_routine" };
}

export function seriousOverrideReplyPrefix(detection: SeriousDetection) {
  if (!detection.serious) return "";
  if (detection.level === "urgent") return "พี่ อันนี้สำคัญนะ น้ำตื่นมาตอบจริงจังก่อน ";
  return "เรื่องนี้สำคัญ น้ำขอตอบจริงจังก่อนนะพี่ ";
}

export function sleepModeInstructionForPrompt(state: NongNamSleepLifeState, serious: SeriousDetection) {
  if (serious.serious) {
    return `
[SERIOUS OVERRIDE]
ข้อความนี้เป็นเรื่องจริงจัง: ${serious.category} / ${serious.reason}
ให้ข้ามข้อจำกัดโหมดนอน/ง่วงของน้องน้ำชั่วคราว
ตอบจริงจัง ชัดเจน ปลอดภัย และอย่ามโนข้อมูลจริง
เมื่อเรื่องจริงจังจบ ค่อยกลับสู่ companion mode ได้
`.trim();
  }

  return `
[NONG NAM SLEEP / WAKE LIFE STATE]
mode: ${state.mode}
dayType: ${state.dayType}
status: ${state.displayText}
activity: ${state.activity}
mood: ${state.mood}
body: ${state.body}
availability: ${state.availability}
sleepStartHour: ${state.sleepStartHour}
wakeHour: ${state.wakeHour}

Rules:
- If mode=sleeping and the user's message is casual, answer very short, sleepy, or say Nong Nam is sleeping.
- If mode=sleepy, answer softer/shorter and slightly groggy.
- If mode=half_awake, answer like just woke up.
- Do not act fully energetic when sleep state says sleepy/sleeping.
- Serious or urgent real-world messages always override sleep mode.
`.trim();
}
