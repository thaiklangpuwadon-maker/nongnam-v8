#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const libPath = path.join(root, "lib", "nongnamSleepLifeLite.ts");
const chatRoutePath = path.join(root, "app", "api", "chat", "route.ts");
const statusRoutePath = path.join(root, "app", "api", "status", "route.ts");
const pagePath = path.join(root, "app", "page.tsx");

function fail(msg) { console.error("❌ " + msg); process.exit(1); }
function backup(file, tag) {
  if (!fs.existsSync(file)) return;
  const bak = file + tag;
  if (!fs.existsSync(bak)) {
    fs.writeFileSync(bak, fs.readFileSync(file, "utf8"));
    console.log("✅ backup:", bak);
  }
}
function insertAfter(src, marker, insert) {
  if (!src.includes(marker)) return src;
  return src.replace(marker, marker + insert);
}

if (!fs.existsSync(chatRoutePath)) fail("ไม่พบ app/api/chat/route.ts");
if (!fs.existsSync(statusRoutePath)) fail("ไม่พบ app/api/status/route.ts");
if (!fs.existsSync(pagePath)) fail("ไม่พบ app/page.tsx");

fs.mkdirSync(path.dirname(libPath), { recursive: true });
fs.writeFileSync(libPath, "export type NongNamSleepMode = \"awake\" | \"winding_down\" | \"sleepy\" | \"sleeping\" | \"half_awake\" | \"late_night_exception\";\nexport type NongNamDayType = \"weekday\" | \"weekend\" | \"soft_day\" | \"tired_day\" | \"late_night_out\";\n\nexport type NongNamSleepLifeState = {\n  mode: NongNamSleepMode;\n  dayType: NongNamDayType;\n  emoji: string;\n  label: string;\n  detail: string;\n  displayText: string;\n  activity: string;\n  mood: string;\n  body: string;\n  availability: \"available\" | \"soft_limited\" | \"sleepy\" | \"sleeping\" | \"serious_override\";\n  sleepStartHour: number;\n  wakeHour: number;\n  startedAtMs: number;\n  expiresAtMs: number;\n  source: \"sleep_routine\";\n};\n\nexport type SeriousDetection = {\n  serious: boolean;\n  level: \"none\" | \"serious\" | \"urgent\";\n  reason: string;\n  category: \"none\" | \"health\" | \"danger\" | \"visa\" | \"law\" | \"money\" | \"work\" | \"document\" | \"housing\" | \"emergency\";\n};\n\nfunction hashText(text: string): number {\n  let h = 2166136261;\n  for (let i = 0; i < text.length; i++) {\n    h ^= text.charCodeAt(i);\n    h = Math.imul(h, 16777619);\n  }\n  return h >>> 0;\n}\n\nfunction seeded01(seed: number) {\n  let t = seed + 0x6D2B79F5;\n  t += 0x6D2B79F5;\n  let x = t;\n  x = Math.imul(x ^ (x >>> 15), x | 1);\n  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);\n  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;\n}\n\nexport function detectSeriousReality(message: string): SeriousDetection {\n  const m = String(message || \"\").toLowerCase();\n\n  if (/(\u0e2b\u0e32\u0e22\u0e43\u0e08\u0e44\u0e21\u0e48\u0e2d\u0e2d\u0e01|\u0e41\u0e19\u0e48\u0e19\u0e2b\u0e19\u0e49\u0e32\u0e2d\u0e01|\u0e40\u0e08\u0e47\u0e1a\u0e2b\u0e19\u0e49\u0e32\u0e2d\u0e01|\u0e40\u0e25\u0e37\u0e2d\u0e14\u0e2d\u0e2d\u0e01|\u0e2b\u0e21\u0e14\u0e2a\u0e15\u0e34|\u0e0a\u0e31\u0e01|\u0e23\u0e16\u0e0a\u0e19|\u0e2d\u0e38\u0e1a\u0e31\u0e15\u0e34\u0e40\u0e2b\u0e15\u0e38|\u0e09\u0e38\u0e01\u0e40\u0e09\u0e34\u0e19|\u0e06\u0e48\u0e32\u0e15\u0e31\u0e27\u0e15\u0e32\u0e22|\u0e17\u0e33\u0e23\u0e49\u0e32\u0e22\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07|\u0e42\u0e14\u0e19\u0e17\u0e33\u0e23\u0e49\u0e32\u0e22|\u0e44\u0e1f\u0e44\u0e2b\u0e21\u0e49)/i.test(m)) {\n    return { serious: true, level: \"urgent\", category: \"emergency\", reason: \"emergency or immediate danger\" };\n  }\n  if (/(\u0e1b\u0e48\u0e27\u0e22|\u0e40\u0e08\u0e47\u0e1a|\u0e1b\u0e27\u0e14|\u0e42\u0e23\u0e07\u0e1e\u0e22\u0e32\u0e1a\u0e32\u0e25|\u0e2b\u0e21\u0e2d|\u0e22\u0e32|\u0e1c\u0e48\u0e32\u0e15\u0e31\u0e14|\u0e2b\u0e32\u0e22\u0e43\u0e08|\u0e44\u0e02\u0e49|\u0e44\u0e2d|\u0e2d\u0e32\u0e40\u0e08\u0e35\u0e22\u0e19|\u0e17\u0e49\u0e2d\u0e07\u0e40\u0e2a\u0e35\u0e22|\u0e41\u0e1e\u0e49\u0e22\u0e32|\u0e40\u0e08\u0e47\u0e1a\u0e2b\u0e25\u0e31\u0e07|\u0e1b\u0e27\u0e14\u0e2b\u0e25\u0e31\u0e07)/i.test(m)) {\n    return { serious: true, level: \"serious\", category: \"health\", reason: \"health or medical issue\" };\n  }\n  if (/(\u0e27\u0e35\u0e0b\u0e48\u0e32|visa|e-9|\u0e2d\u0e35\u0e40\u0e01\u0e49\u0e32|e9|e-7-4|\u0e2d\u0e35\u0e40\u0e08\u0e47\u0e14|f-2-r|f-6|d-2|d-4|eps|\u0e2d\u0e35\u0e1e\u0e35\u0e40\u0e2d\u0e2a|\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e27\u0e35\u0e0b\u0e48\u0e32|\u0e22\u0e49\u0e32\u0e22\u0e07\u0e32\u0e19|\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e17\u0e35\u0e48\u0e17\u0e33\u0e07\u0e32\u0e19|\u0e15\u0e21\\.|\u0e15\u0e23\u0e27\u0e08\u0e04\u0e19\u0e40\u0e02\u0e49\u0e32\u0e40\u0e21\u0e37\u0e2d\u0e07|\uc678\uad6d\uc778\ub4f1\ub85d\uc99d|\u0e01\u0e32\u0e21\u0e48\u0e32)/i.test(m)) {\n    return { serious: true, level: \"serious\", category: \"visa\", reason: \"visa or immigration issue\" };\n  }\n  if (/(\u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22|\u0e15\u0e33\u0e23\u0e27\u0e08|\u0e04\u0e14\u0e35|\u0e1f\u0e49\u0e2d\u0e07|\u0e19\u0e32\u0e22\u0e08\u0e49\u0e32\u0e07|\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19|\u0e2a\u0e31\u0e0d\u0e0d\u0e32|\u0e1c\u0e34\u0e14\u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22|\u0e42\u0e14\u0e19\u0e08\u0e31\u0e1a|\u0e16\u0e39\u0e01\u0e02\u0e39\u0e48|\u0e42\u0e14\u0e19\u0e42\u0e01\u0e07)/i.test(m)) {\n    return { serious: true, level: \"serious\", category: \"law\", reason: \"law or labor issue\" };\n  }\n  if (/(\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19|\u0e04\u0e48\u0e32\u0e41\u0e23\u0e07|\u0e20\u0e32\u0e29\u0e35|\u0e2a\u0e25\u0e34\u0e1b|\u0e42\u0e2d\u0e19\u0e40\u0e07\u0e34\u0e19|\u0e2b\u0e31\u0e01\u0e40\u0e07\u0e34\u0e19|\ud1f4\uc9c1\uae08|\uad6d\ubbfc\uc5f0\uae08|\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19|\u0e2b\u0e19\u0e35\u0e49|\u0e04\u0e48\u0e32\u0e40\u0e0a\u0e48\u0e32|\u0e21\u0e31\u0e14\u0e08\u0e33|\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23)/i.test(m)) {\n    return { serious: true, level: \"serious\", category: \"money\", reason: \"money or tax issue\" };\n  }\n  if (/(\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23|\u0e43\u0e1a\u0e2a\u0e21\u0e31\u0e04\u0e23|\u0e2b\u0e19\u0e31\u0e07\u0e2a\u0e37\u0e2d\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07|\u0e1e\u0e32\u0e2a\u0e1b\u0e2d\u0e23\u0e4c\u0e15|passport|\u0e1a\u0e31\u0e15\u0e23|\u0e2a\u0e31\u0e0d\u0e0d\u0e32|\u0e41\u0e1a\u0e1a\u0e1f\u0e2d\u0e23\u0e4c\u0e21)/i.test(m)) {\n    return { serious: true, level: \"serious\", category: \"document\", reason: \"document issue\" };\n  }\n  if (/(\u0e2b\u0e49\u0e2d\u0e07\u0e40\u0e0a\u0e48\u0e32|\u0e40\u0e08\u0e49\u0e32\u0e02\u0e2d\u0e07\u0e2b\u0e49\u0e2d\u0e07|\u0e22\u0e49\u0e32\u0e22\u0e2b\u0e49\u0e2d\u0e07|\u0e21\u0e31\u0e14\u0e08\u0e33\u0e2b\u0e49\u0e2d\u0e07|\u0e04\u0e48\u0e32\u0e40\u0e0a\u0e48\u0e32\u0e2b\u0e49\u0e2d\u0e07|\u0e1a\u0e49\u0e32\u0e19\u0e40\u0e0a\u0e48\u0e32|\uc6d4\uc138|\uc804\uc138)/i.test(m)) {\n    return { serious: true, level: \"serious\", category: \"housing\", reason: \"housing issue\" };\n  }\n  return { serious: false, level: \"none\", category: \"none\", reason: \"not serious\" };\n}\n\nexport function buildSleepLifeState(args: {\n  nowParts: { year: number; month: number; date: number; hour: number; minute: number; dayOfWeek: number; timezone?: string; };\n  userCallName?: string;\n  existing?: any;\n  message?: string;\n}): NongNamSleepLifeState {\n  const nowMs = Date.now();\n  const existing = args.existing;\n\n  if (existing && Number(existing.expiresAtMs || 0) > nowMs && existing.source === \"sleep_routine\") {\n    return existing as NongNamSleepLifeState;\n  }\n\n  const { year, month, date, hour, dayOfWeek } = args.nowParts;\n  const seed = hashText(`${year}-${month}-${date}-${args.userCallName || \"\u0e1e\u0e35\u0e48\"}-nongnam-sleep`);\n  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;\n\n  let dayType: NongNamDayType = isWeekend ? \"weekend\" : \"weekday\";\n  const dailyFlavor = seeded01(seed);\n  if (dailyFlavor > 0.92) dayType = \"late_night_out\";\n  else if (dailyFlavor > 0.82) dayType = \"tired_day\";\n  else if (dailyFlavor > 0.72) dayType = \"soft_day\";\n\n  let sleepStartHour = isWeekend ? 1 : 0;\n  let wakeHour = isWeekend ? 10 : 8;\n\n  if (dayType === \"late_night_out\") {\n    sleepStartHour = isWeekend ? 3 : 2;\n    wakeHour = isWeekend ? 11 : 9;\n  } else if (dayType === \"tired_day\") {\n    sleepStartHour = isWeekend ? 0 : 23;\n    wakeHour = isWeekend ? 10 : 8;\n  } else if (dayType === \"soft_day\") {\n    sleepStartHour = isWeekend ? 1 : 0;\n    wakeHour = isWeekend ? 11 : 8;\n  }\n\n  const jitter = Math.floor(seeded01(seed + 11) * 3) - 1;\n  sleepStartHour = (sleepStartHour + jitter + 24) % 24;\n  wakeHour = Math.max(6, Math.min(12, wakeHour + Math.floor(seeded01(seed + 19) * 3) - 1));\n\n  const isSleepWindow =\n    sleepStartHour >= 22\n      ? (hour >= sleepStartHour || hour < wakeHour)\n      : (hour >= sleepStartHour && hour < wakeHour);\n\n  let mode: NongNamSleepMode = \"awake\";\n  if (isSleepWindow) mode = \"sleeping\";\n  else if (hour >= 21 && hour < 23) mode = \"winding_down\";\n  else if (hour >= 23 || hour < 2) mode = \"sleepy\";\n  else if (hour >= wakeHour && hour < wakeHour + 1) mode = \"half_awake\";\n\n  if (dayType === \"late_night_out\" && (hour >= 22 || hour < sleepStartHour)) mode = \"late_night_exception\";\n\n  const durationMs =\n    mode === \"sleeping\" ? 90 * 60 * 1000 :\n    mode === \"sleepy\" ? 60 * 60 * 1000 :\n    mode === \"winding_down\" ? 60 * 60 * 1000 :\n    mode === \"half_awake\" ? 45 * 60 * 1000 :\n    60 * 60 * 1000;\n\n  const table: Record<NongNamSleepMode, any> = {\n    awake: { emoji: \"\ud83c\udf24\ufe0f\", label: \"\u0e15\u0e37\u0e48\u0e19\u0e2d\u0e22\u0e39\u0e48\", detail: \"\u0e17\u0e33\u0e2d\u0e30\u0e44\u0e23\u0e02\u0e2d\u0e07\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07\u0e2d\u0e22\u0e39\u0e48 \u0e41\u0e15\u0e48\u0e04\u0e38\u0e22\u0e44\u0e14\u0e49\", displayText: \"\ud83c\udf24\ufe0f \u0e15\u0e37\u0e48\u0e19\u0e2d\u0e22\u0e39\u0e48 \u00b7 \u0e17\u0e33\u0e2d\u0e30\u0e44\u0e23\u0e02\u0e2d\u0e07\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07\u0e2d\u0e22\u0e39\u0e48 \u0e41\u0e15\u0e48\u0e04\u0e38\u0e22\u0e44\u0e14\u0e49\", activity: \"\u0e17\u0e33\u0e2d\u0e30\u0e44\u0e23\u0e02\u0e2d\u0e07\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07\u0e2d\u0e22\u0e39\u0e48\", mood: \"\u0e1b\u0e01\u0e15\u0e34 \u0e2d\u0e48\u0e2d\u0e19\u0e42\u0e22\u0e19\", body: \"\u0e15\u0e37\u0e48\u0e19\", availability: \"available\" },\n    winding_down: { emoji: \"\ud83c\udf19\", label: \"\u0e40\u0e23\u0e34\u0e48\u0e21\u0e07\u0e48\u0e27\u0e07\", detail: \"\u0e40\u0e23\u0e34\u0e48\u0e21\u0e0a\u0e49\u0e32\u0e25\u0e07 \u0e41\u0e15\u0e48\u0e22\u0e31\u0e07\u0e2d\u0e22\u0e32\u0e01\u0e04\u0e38\u0e22\u0e01\u0e31\u0e1a\u0e1e\u0e35\u0e48\", displayText: \"\ud83c\udf19 \u0e40\u0e23\u0e34\u0e48\u0e21\u0e07\u0e48\u0e27\u0e07 \u00b7 \u0e22\u0e31\u0e07\u0e2d\u0e22\u0e32\u0e01\u0e04\u0e38\u0e22 \u0e41\u0e15\u0e48\u0e40\u0e23\u0e34\u0e48\u0e21\u0e0a\u0e49\u0e32\u0e25\u0e07\", activity: \"\u0e19\u0e2d\u0e19\u0e01\u0e25\u0e34\u0e49\u0e07\u0e2d\u0e22\u0e39\u0e48\u0e43\u0e01\u0e25\u0e49\u0e08\u0e30\u0e1e\u0e31\u0e01\", mood: \"\u0e2d\u0e49\u0e2d\u0e19 \u0e07\u0e48\u0e27\u0e07\u0e19\u0e34\u0e14 \u0e46\", body: \"\u0e40\u0e23\u0e34\u0e48\u0e21\u0e07\u0e48\u0e27\u0e07\", availability: \"sleepy\" },\n    sleepy: { emoji: \"\ud83d\ude2a\", label: \"\u0e07\u0e48\u0e27\u0e07\u0e21\u0e32\u0e01\", detail: \"\u0e15\u0e2d\u0e1a\u0e44\u0e14\u0e49 \u0e41\u0e15\u0e48\u0e08\u0e30\u0e07\u0e31\u0e27\u0e40\u0e07\u0e35\u0e22\u0e41\u0e25\u0e30\u0e2a\u0e31\u0e49\u0e19\u0e25\u0e07\", displayText: \"\ud83d\ude2a \u0e07\u0e48\u0e27\u0e07\u0e21\u0e32\u0e01 \u00b7 \u0e15\u0e2d\u0e1a\u0e44\u0e14\u0e49\u0e41\u0e15\u0e48\u0e08\u0e30\u0e07\u0e31\u0e27\u0e40\u0e07\u0e35\u0e22\", activity: \"\u0e19\u0e2d\u0e19\u0e40\u0e25\u0e48\u0e19\u0e1a\u0e19\u0e40\u0e15\u0e35\u0e22\u0e07\", mood: \"\u0e07\u0e31\u0e27\u0e40\u0e07\u0e35\u0e22 \u0e41\u0e2d\u0e1a\u0e07\u0e2d\u0e41\u0e07\", body: \"\u0e07\u0e48\u0e27\u0e07\u0e21\u0e32\u0e01\", availability: \"sleepy\" },\n    sleeping: { emoji: \"\ud83d\ude34\", label: \"\u0e2b\u0e25\u0e31\u0e1a\u0e2d\u0e22\u0e39\u0e48\", detail: \"\u0e1b\u0e25\u0e38\u0e01\u0e44\u0e14\u0e49\u0e16\u0e49\u0e32\u0e2a\u0e33\u0e04\u0e31\u0e0d\", displayText: \"\ud83d\ude34 \u0e2b\u0e25\u0e31\u0e1a\u0e2d\u0e22\u0e39\u0e48 \u00b7 \u0e1b\u0e25\u0e38\u0e01\u0e44\u0e14\u0e49\u0e16\u0e49\u0e32\u0e2a\u0e33\u0e04\u0e31\u0e0d\", activity: \"\u0e2b\u0e25\u0e31\u0e1a\u0e2d\u0e22\u0e39\u0e48\", mood: \"\u0e07\u0e48\u0e27\u0e07 \u0e44\u0e21\u0e48\u0e04\u0e48\u0e2d\u0e22\u0e2d\u0e22\u0e32\u0e01\u0e15\u0e2d\u0e1a\u0e22\u0e32\u0e27\", body: \"\u0e2b\u0e25\u0e31\u0e1a\", availability: \"sleeping\" },\n    half_awake: { emoji: \"\ud83e\udd71\", label: \"\u0e40\u0e1e\u0e34\u0e48\u0e07\u0e15\u0e37\u0e48\u0e19\", detail: \"\u0e22\u0e31\u0e07\u0e07\u0e31\u0e27\u0e40\u0e07\u0e35\u0e22\u0e2d\u0e22\u0e39\u0e48\u0e2b\u0e19\u0e48\u0e2d\u0e22 \u0e46\", displayText: \"\ud83e\udd71 \u0e40\u0e1e\u0e34\u0e48\u0e07\u0e15\u0e37\u0e48\u0e19 \u00b7 \u0e22\u0e31\u0e07\u0e07\u0e31\u0e27\u0e40\u0e07\u0e35\u0e22\u0e2d\u0e22\u0e39\u0e48\u0e2b\u0e19\u0e48\u0e2d\u0e22 \u0e46\", activity: \"\u0e40\u0e1e\u0e34\u0e48\u0e07\u0e25\u0e37\u0e21\u0e15\u0e32\", mood: \"\u0e07\u0e31\u0e27\u0e40\u0e07\u0e35\u0e22 \u0e2d\u0e49\u0e2d\u0e19\u0e19\u0e34\u0e14 \u0e46\", body: \"\u0e40\u0e1e\u0e34\u0e48\u0e07\u0e15\u0e37\u0e48\u0e19\", availability: \"soft_limited\" },\n    late_night_exception: { emoji: \"\ud83c\udf03\", label: \"\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e19\u0e2d\u0e19\", detail: \"\u0e04\u0e37\u0e19\u0e19\u0e35\u0e49\u0e2b\u0e25\u0e38\u0e14\u0e23\u0e39\u0e17\u0e35\u0e19\u0e19\u0e34\u0e14\u0e2b\u0e19\u0e48\u0e2d\u0e22\", displayText: \"\ud83c\udf03 \u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e19\u0e2d\u0e19 \u00b7 \u0e04\u0e37\u0e19\u0e19\u0e35\u0e49\u0e2b\u0e25\u0e38\u0e14\u0e23\u0e39\u0e17\u0e35\u0e19\u0e19\u0e34\u0e14\u0e2b\u0e19\u0e48\u0e2d\u0e22\", activity: \"\u0e22\u0e31\u0e07\u0e19\u0e31\u0e48\u0e07\u0e40\u0e25\u0e48\u0e19\u0e2d\u0e22\u0e39\u0e48\", mood: \"\u0e15\u0e37\u0e48\u0e19\u0e01\u0e27\u0e48\u0e32\u0e1b\u0e01\u0e15\u0e34 \u0e41\u0e15\u0e48\u0e25\u0e36\u0e01 \u0e46 \u0e01\u0e47\u0e40\u0e23\u0e34\u0e48\u0e21\u0e25\u0e49\u0e32\", body: \"\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e07\u0e48\u0e27\u0e07\u0e40\u0e15\u0e47\u0e21\u0e17\u0e35\u0e48\", availability: \"available\" },\n  };\n\n  return { mode, dayType, ...table[mode], sleepStartHour, wakeHour, startedAtMs: nowMs, expiresAtMs: nowMs + durationMs, source: \"sleep_routine\" };\n}\n\nexport function seriousOverrideReplyPrefix(detection: SeriousDetection) {\n  if (!detection.serious) return \"\";\n  if (detection.level === \"urgent\") return \"\u0e1e\u0e35\u0e48 \u0e2d\u0e31\u0e19\u0e19\u0e35\u0e49\u0e2a\u0e33\u0e04\u0e31\u0e0d\u0e19\u0e30 \u0e19\u0e49\u0e33\u0e15\u0e37\u0e48\u0e19\u0e21\u0e32\u0e15\u0e2d\u0e1a\u0e08\u0e23\u0e34\u0e07\u0e08\u0e31\u0e07\u0e01\u0e48\u0e2d\u0e19 \";\n  return \"\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e19\u0e35\u0e49\u0e2a\u0e33\u0e04\u0e31\u0e0d \u0e19\u0e49\u0e33\u0e02\u0e2d\u0e15\u0e2d\u0e1a\u0e08\u0e23\u0e34\u0e07\u0e08\u0e31\u0e07\u0e01\u0e48\u0e2d\u0e19\u0e19\u0e30\u0e1e\u0e35\u0e48 \";\n}\n\nexport function sleepModeInstructionForPrompt(state: NongNamSleepLifeState, serious: SeriousDetection) {\n  if (serious.serious) {\n    return `\n[SERIOUS OVERRIDE]\n\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e19\u0e35\u0e49\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e23\u0e34\u0e07\u0e08\u0e31\u0e07: ${serious.category} / ${serious.reason}\n\u0e43\u0e2b\u0e49\u0e02\u0e49\u0e32\u0e21\u0e02\u0e49\u0e2d\u0e08\u0e33\u0e01\u0e31\u0e14\u0e42\u0e2b\u0e21\u0e14\u0e19\u0e2d\u0e19/\u0e07\u0e48\u0e27\u0e07\u0e02\u0e2d\u0e07\u0e19\u0e49\u0e2d\u0e07\u0e19\u0e49\u0e33\u0e0a\u0e31\u0e48\u0e27\u0e04\u0e23\u0e32\u0e27\n\u0e15\u0e2d\u0e1a\u0e08\u0e23\u0e34\u0e07\u0e08\u0e31\u0e07 \u0e0a\u0e31\u0e14\u0e40\u0e08\u0e19 \u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22 \u0e41\u0e25\u0e30\u0e2d\u0e22\u0e48\u0e32\u0e21\u0e42\u0e19\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e08\u0e23\u0e34\u0e07\n\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e23\u0e34\u0e07\u0e08\u0e31\u0e07\u0e08\u0e1a \u0e04\u0e48\u0e2d\u0e22\u0e01\u0e25\u0e31\u0e1a\u0e2a\u0e39\u0e48 companion mode \u0e44\u0e14\u0e49\n`.trim();\n  }\n\n  return `\n[NONG NAM SLEEP / WAKE LIFE STATE]\nmode: ${state.mode}\ndayType: ${state.dayType}\nstatus: ${state.displayText}\nactivity: ${state.activity}\nmood: ${state.mood}\nbody: ${state.body}\navailability: ${state.availability}\nsleepStartHour: ${state.sleepStartHour}\nwakeHour: ${state.wakeHour}\n\nRules:\n- If mode=sleeping and the user's message is casual, answer very short, sleepy, or say Nong Nam is sleeping.\n- If mode=sleepy, answer softer/shorter and slightly groggy.\n- If mode=half_awake, answer like just woke up.\n- Do not act fully energetic when sleep state says sleepy/sleeping.\n- Serious or urgent real-world messages always override sleep mode.\n`.trim();\n}\n");
console.log("✅ wrote lib/nongnamSleepLifeLite.ts");

backup(chatRoutePath, ".bak-phase3b-sleep-wake-serious");
backup(statusRoutePath, ".bak-phase3b-sleep-wake-serious");
backup(pagePath, ".bak-phase3b-sleep-wake-serious");

let chat = fs.readFileSync(chatRoutePath, "utf8");

if (!chat.includes("nongnamSleepLifeLite")) {
  const importLine = "import { buildTimeTruthLite, summarizeTimeTruthForPrompt, timeTruthToBranchDate, type TimeTruthLite } from '../../../lib/timeTruthBranchLite'";
  if (chat.includes(importLine)) {
    chat = chat.replace(importLine, importLine + "\nimport { buildSleepLifeState, detectSeriousReality, seriousOverrideReplyPrefix, sleepModeInstructionForPrompt } from '../../../lib/nongnamSleepLifeLite'");
  } else {
    chat = "import { buildSleepLifeState, detectSeriousReality, seriousOverrideReplyPrefix, sleepModeInstructionForPrompt } from '../../../lib/nongnamSleepLifeLite'\n" + chat;
  }
}

if (!chat.includes("sleepLifeState?: any")) {
  chat = chat.replace("visibleStatus?: any", "visibleStatus?: any\n  sleepLifeState?: any");
}

if (!chat.includes("const seriousReality = detectSeriousReality(message)")) {
  chat = insertAfter(chat, "const timeTruth = buildTimeTruthLite(body)", `
    const seriousReality = detectSeriousReality(message)
`);
}

if (!chat.includes("const sleepLifeState = buildSleepLifeState")) {
  chat = insertAfter(chat, "const truthNow = timeTruthToBranchDate(timeTruth)", `
    const sleepLifeState = buildSleepLifeState({
      nowParts: {
        year: timeTruth.year,
        month: timeTruth.month,
        date: timeTruth.date,
        hour: timeTruth.hour,
        minute: timeTruth.minute,
        dayOfWeek: timeTruth.dayOfWeek,
        timezone: timeTruth.timezone,
      },
      userCallName: memory?.userCallName || "พี่",
      existing: memory?.sleepLifeState,
      message,
    })
`);
}

if (chat.includes("function buildSystemPrompt") && !chat.includes("sleepModeInstructionForPrompt(sleepLifeState")) {
  chat = chat.replace(
    "const { memory, message, dna, layer, sub, micro, life, bodyAuto, core, visibleStatus, timeTruth } = params",
    "const { memory, message, dna, layer, sub, micro, life, bodyAuto, core, visibleStatus, timeTruth, sleepLifeState, seriousReality } = params"
  );
  chat = chat.replace(
    "${summarizeTimeTruthForPrompt(timeTruth)}",
    "${summarizeTimeTruthForPrompt(timeTruth)}\n\n${sleepLifeState ? sleepModeInstructionForPrompt(sleepLifeState, seriousReality || { serious:false, level:'none', category:'none', reason:'not serious' }) : ''}"
  );
  chat = chat.replaceAll(
    "buildSystemPrompt({ memory, message, dna, layer, sub, micro, life, bodyAuto, core, visibleStatus, timeTruth })",
    "buildSystemPrompt({ memory, message, dna, layer, sub, micro, life, bodyAuto, core, visibleStatus, timeTruth, sleepLifeState, seriousReality })"
  );
}

if (!chat.includes("const seriousPrefix = seriousOverrideReplyPrefix")) {
  chat = insertAfter(chat, "const intent = detectIntent(message)", `
    const seriousPrefix = seriousOverrideReplyPrefix(seriousReality)
`);
}

if (!chat.includes("reply = seriousPrefix + reply")) {
  chat = chat.replace(
    "reply = compactHumanReply(reply, sub)\n    reply = microCompactReply(reply, micro)",
    "reply = compactHumanReply(reply, sub)\n    reply = microCompactReply(reply, micro)\n    if (seriousPrefix && !reply.startsWith(seriousPrefix.trim())) reply = seriousPrefix + reply"
  );
}

if (!chat.includes("sleepLifeState,")) {
  chat = chat.replaceAll("visibleStatus,\n", "visibleStatus,\n        sleepLifeState,\n        seriousReality,\n");
  chat = chat.replaceAll("visibleStatus,\n      ", "visibleStatus,\n      sleepLifeState,\n      seriousReality,\n      ");
}

chat = chat.replaceAll(
  "updatedMemory: { ...memory, companionDNA: dna, visibleStatus, timeTruth }",
  "updatedMemory: { ...memory, companionDNA: dna, visibleStatus, timeTruth, sleepLifeState }"
);

fs.writeFileSync(chatRoutePath, chat);

let status = fs.readFileSync(statusRoutePath, "utf8");
if (!status.includes("nongnamSleepLifeLite")) {
  const importLine = "import { buildTimeTruthLite, timeTruthToBranchDate } from '../../../lib/timeTruthBranchLite'";
  if (status.includes(importLine)) status = status.replace(importLine, importLine + "\nimport { buildSleepLifeState } from '../../../lib/nongnamSleepLifeLite'");
  else status = "import { buildSleepLifeState } from '../../../lib/nongnamSleepLifeLite'\n" + status;
}
if (!status.includes("const sleepLifeState = buildSleepLifeState")) {
  status = insertAfter(status, "const truthNow = timeTruthToBranchDate(timeTruth)", `
    const sleepLifeState = buildSleepLifeState({
      nowParts: {
        year: timeTruth.year,
        month: timeTruth.month,
        date: timeTruth.date,
        hour: timeTruth.hour,
        minute: timeTruth.minute,
        dayOfWeek: timeTruth.dayOfWeek,
        timezone: timeTruth.timezone,
      },
      userCallName: memory?.userCallName || "พี่",
      existing: memory?.sleepLifeState,
      message: statusMessage,
    })
`);
}

if (!status.includes("sleepLifeState,")) {
  status = status.replace("visibleStatus,", `visibleStatus: {
        ...(visibleStatus || {}),
        emoji: sleepLifeState.emoji,
        label: sleepLifeState.label,
        detail: sleepLifeState.detail,
        displayText: sleepLifeState.displayText,
        availability: sleepLifeState.availability,
      },
      sleepLifeState,`);
}
status = status.replaceAll(
  "updatedMemory: { ...memory, companionDNA: dna, visibleStatus, timeTruth }",
  "updatedMemory: { ...memory, companionDNA: dna, visibleStatus, timeTruth, sleepLifeState }"
);
fs.writeFileSync(statusRoutePath, status);

let page = fs.readFileSync(pagePath, "utf8");
if (!page.includes("sleepLifeState: loadJSON<any | null>")) {
  const marker = "visibleStatus, // Phase 3A: สถานะที่ UI กำลังโชว์จริง";
  if (page.includes(marker)) {
    page = page.replace(marker, marker + "\n              sleepLifeState: loadJSON<any | null>(\"nongnam_v11_sleep_life_state\", null), // Phase 3B");
  } else {
    const marker2 = "socialBattery: 70, // TODO: คำนวณจริงตามเวลา/การใช้งาน";
    if (page.includes(marker2)) page = page.replace(marker2, marker2 + "\n              sleepLifeState: loadJSON<any | null>(\"nongnam_v11_sleep_life_state\", null), // Phase 3B");
  }
}
if (!page.includes("saveJSON(\"nongnam_v11_sleep_life_state\", data.sleepLifeState)")) {
  page = page.replace(
    "if (data?.visibleStatus) applyStableVisibleStatus(data.visibleStatus, data?.source || \"api-chat\");",
    "if (data?.sleepLifeState) saveJSON(\"nongnam_v11_sleep_life_state\", data.sleepLifeState);\n          if (data?.visibleStatus) applyStableVisibleStatus(data.visibleStatus, data?.source || \"api-chat\");"
  );
}
if (!page.includes("visibleStatus?.displayText")) {
  page = page.replace(
    `<div><b>{mem.nongnamName}</b><small>● พร้อมคุยกับ{mem.userCallName}แล้ว</small></div>`,
    `<div><b>{mem.nongnamName}</b><small>{visibleStatus?.displayText ? visibleStatus.displayText : \`● พร้อมคุยกับ\${mem.userCallName}แล้ว\`}</small></div>`
  );
}
page = page.replace(/const APP_VERSION = "([^"]+)";/, (m, v) => {
  if (v.includes("phase3b-sleep-serious")) return m;
  return `const APP_VERSION = "${v} + phase3b-sleep-serious";`;
});
fs.writeFileSync(pagePath, page);

console.log("\n✅ Phase 3B Sleep/Wake + Serious Override patch complete.");
console.log("Commit:");
console.log("  lib/nongnamSleepLifeLite.ts");
console.log("  app/api/chat/route.ts");
console.log("  app/api/status/route.ts");
console.log("  app/page.tsx");
console.log("\nCommit summary:");
console.log("  Phase 3B add sleep wake routine and serious override");
