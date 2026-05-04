import { NextRequest, NextResponse } from "next/server";
import { buildDNA } from "../../../lib/humanSignature/dnaBuilder";
import { buildRollContext, makeSeed, seededRandom, rollTree } from "../../../lib/humanSignature/engine";
import { routeToTree } from "../../../lib/humanSignature/categoryRouter";
import type { CompanionMemory } from "../../../lib/humanSignature/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClientPayload = {
  memory?: any;
  recent?: Array<{ role: string; text: string }>;
  clientTimestampMs?: number;
  clientNowISO?: string;
  clientTimeZone?: string;
  clientUtcOffsetMinutes?: number;
  clientHour?: number;
  clientMinute?: number;
  clientSecond?: number;
  clientDayOfWeek?: number;
  clientYear?: number;
  clientMonth?: number;
  clientDate?: number;
  clientTimeText?: string;
  clientDateText?: string;
  clientDateTimeText?: string;
};

function hasClientLocalTime(p: ClientPayload) {
  return typeof p.clientHour === "number" && typeof p.clientMinute === "number" && typeof p.clientDayOfWeek === "number" && typeof p.clientYear === "number" && typeof p.clientMonth === "number" && typeof p.clientDate === "number";
}

function buildClientLocalDate(p: ClientPayload): Date {
  if (hasClientLocalTime(p)) {
    const d = new Date(Date.UTC(p.clientYear!, p.clientMonth! - 1, p.clientDate!, p.clientHour!, p.clientMinute!, p.clientSecond ?? 0));
    return new Proxy(d, {
      get(target, prop, receiver) {
        if (prop === "getHours") return () => p.clientHour!;
        if (prop === "getMinutes") return () => p.clientMinute!;
        if (prop === "getSeconds") return () => (p.clientSecond ?? 0);
        if (prop === "getDay") return () => p.clientDayOfWeek!;
        if (prop === "getDate") return () => p.clientDate!;
        if (prop === "getMonth") return () => p.clientMonth! - 1;
        if (prop === "getFullYear") return () => p.clientYear!;
        return Reflect.get(target, prop, receiver);
      }
    });
  }
  if (typeof p.clientTimestampMs === "number") return new Date(p.clientTimestampMs);
  return new Date();
}

function buildClientSeedStamp(p: ClientPayload) {
  return ["client-time-status-v8.2", p.clientTimestampMs, p.clientTimeZone, p.clientUtcOffsetMinutes, p.clientYear, p.clientMonth, p.clientDate, p.clientHour, p.clientMinute, p.clientSecond, p.clientDayOfWeek, p.clientTimeText, p.clientDateText].filter(v => v !== undefined && v !== null && v !== "").join("|");
}

function pickWeighted<T extends string>(items: Array<{ value: T; weight: number }>, r: number): T {
  const valid = items.filter(i => i.weight > 0);
  const total = valid.reduce((s, i) => s + i.weight, 0);
  let x = r * total;
  for (const item of valid) {
    x -= item.weight;
    if (x <= 0) return item.value;
  }
  return valid[valid.length - 1]?.value || items[0].value;
}

/**
 * buildVisibleStatus — v8.3
 * เปลี่ยนจาก logic แบบล็อกตายตัวว่า "กลางคืน = ง่วงเสมอ"
 * เป็น weighted status:
 * - เวลาเป็นแค่แรงโน้มถ่วง ไม่ใช่คำตัดสิน 100%
 * - ดึกมีโอกาสง่วง/หลับสูงขึ้น แต่ยังมีโอกาสตาสว่าง ทำงาน อ่านหนังสือ งอน หิว หรืออ้อน
 */
function buildVisibleStatus(ctx: any, roll: any, randomValue = 0.5) {
  const hour = Number(ctx?.hour ?? 12);
  const category = String(roll?.category || roll?.emotion || roll?.mood || "").toLowerCase();
  const variant = String(roll?.variant || roll?.state || "").toLowerCase();

  const isGrumpy = category.includes("irrit") || variant.includes("grumpy") || variant.includes("sulky");
  const isAffection = category.includes("affection") || category.includes("love") || variant.includes("clingy");
  const isHunger = category.includes("hunger") || variant.includes("hungry");
  const isBored = category.includes("bored") || variant.includes("bored");

  const candidates: Array<{ value: string; weight: number }> = [
    { value: "available", weight: 28 },
    { value: "soft_busy", weight: 10 },
    { value: "playful", weight: 10 },
    { value: "romantic", weight: isAffection ? 22 : 8 },
    { value: "sulky", weight: isGrumpy ? 28 : 6 },
    { value: "hungry", weight: isHunger ? 28 : (hour >= 11 && hour < 14 ? 22 : hour >= 18 && hour < 21 ? 18 : 5) },
    { value: "bored", weight: isBored ? 22 : 6 },
    { value: "reading", weight: 7 },
    { value: "working_late", weight: hour >= 22 || hour < 3 ? 14 : 4 },
    { value: "sleepy", weight: hour >= 22 || hour < 5 ? 24 : hour >= 5 && hour < 8 ? 18 : 4 },
    { value: "sleeping", weight: hour >= 1 && hour < 5 ? 18 : hour >= 23 || hour < 1 ? 8 : 1 },
    { value: "just_woke", weight: hour >= 5 && hour < 8 ? 24 : 2 },
  ];

  const chosen = pickWeighted(candidates, randomValue);

  switch (chosen) {
    case "sleeping":
      return {
        emoji: "😴",
        label: "หลับอยู่",
        detail: "แต่ถ้าพี่ปลุกจริง ๆ ก็อาจงัวเงียมาตอบ",
        displayText: "😴 หลับอยู่ · ปลุกได้ถ้าสำคัญ",
        availability: "sleeping",
        chipClass: "status-sleeping",
      };
    case "sleepy":
      return {
        emoji: "🌙",
        label: "ง่วงนิด ๆ",
        detail: "ยังคุยได้ แต่อาจพูดช้าหรืออ้อนกว่าเดิม",
        displayText: "🌙 ง่วงนิด ๆ · ยังพอคุยได้",
        availability: "sleepy",
        chipClass: "status-sleeping",
      };
    case "just_woke":
      return {
        emoji: "🌤️",
        label: "เพิ่งตื่น",
        detail: "สมองยังงัวเงีย แต่เริ่มรับรู้แล้ว",
        displayText: "🌤️ เพิ่งตื่น · งัวเงียนิดหน่อย",
        availability: "soft_limited",
        chipClass: "status-low",
      };
    case "hungry":
      return {
        emoji: "🍚",
        label: "เริ่มหิว",
        detail: "ใจเริ่มไปอยู่กับของกิน",
        displayText: "🍚 เริ่มหิว · คุยได้แต่อาจอ้อนของกิน",
        availability: "available",
        chipClass: "status-hungry",
      };
    case "sulky":
      return {
        emoji: "😗",
        label: "งอนนิด ๆ",
        detail: "ยังคุยได้ แต่อาจมีเถียงเบา ๆ",
        displayText: "😗 งอนนิด ๆ · ต้องง้อนิดนึง",
        availability: "available",
        chipClass: "status-sulky",
      };
    case "romantic":
      return {
        emoji: "💕",
        label: "อ้อนอยู่",
        detail: "อยากคุยใกล้ ๆ มากกว่าคุยแบบทางการ",
        displayText: "💕 อ้อนอยู่ · อยากคุยกับพี่",
        availability: "available",
        chipClass: "status-romantic",
      };
    case "working_late":
      return {
        emoji: "🖥️",
        label: "ยังไม่นอน",
        detail: "เหมือนติดอะไรอยู่ เลยยังไม่ยอมหลับ",
        displayText: "🖥️ ยังไม่นอน · แวะคุยได้",
        availability: "available",
        chipClass: "status-busy",
      };
    case "reading":
      return {
        emoji: "📚",
        label: "อ่านอะไรอยู่",
        detail: "อยู่โหมดเงียบ ๆ แต่คุยได้",
        displayText: "📚 อ่านอะไรอยู่ · เรียกได้เลย",
        availability: "available",
        chipClass: "status-care",
      };
    case "bored":
      return {
        emoji: "🫠",
        label: "เบื่อนิด ๆ",
        detail: "อยากให้พี่ชวนคุยอะไรแปลก ๆ",
        displayText: "🫠 เบื่อนิด ๆ · ชวนคุยหน่อย",
        availability: "available",
        chipClass: "status-low",
      };
    case "playful":
      return {
        emoji: "😼",
        label: "ขี้เล่น",
        detail: "พร้อมแซว พร้อมหยอก",
        displayText: "😼 ขี้เล่น · ระวังโดนแซว",
        availability: "available",
        chipClass: "status-care",
      };
    case "soft_busy":
      return {
        emoji: "💭",
        label: "คิดอะไรอยู่",
        detail: "ไม่ได้หายไป แค่ใจลอยนิดหน่อย",
        displayText: "💭 คิดอะไรอยู่ · เรียกได้",
        availability: "available",
        chipClass: "status-busy",
      };
    default:
      return {
        emoji: "🟢",
        label: "คุยได้",
        detail: "อยู่ใกล้ ๆ พร้อมคุย",
        displayText: "🟢 คุยได้ · อยู่ใกล้ ๆ พี่แล้ว",
        availability: "available",
        chipClass: "status-care",
      };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ClientPayload;
    const m = body.memory || {};

    const dna = buildDNA({
      userCallName: m.userCallName || "พี่",
      nongnamName: m.nongnamName || "น้องน้ำ",
      relationshipMode: m.relationshipMode || "แฟน/คนรัก",
      personalityStyle: m.personalityStyle,
      sulkyLevel: m.sulkyLevel,
      jealousLevel: m.jealousLevel,
      affectionStyle: m.affectionStyle,
      gender: m.gender,
    });

    const memory: CompanionMemory = {
      lastMood: undefined,
      lastTopic: undefined,
      socialBattery: m.socialBattery ?? 70,
      affectionScore: m.affectionScore ?? dna.baseAffection,
      recentMentions: m.recentMentions || [],
      facts: m.facts || [],
      schedules: m.schedules || [],
    };

    const message = "__OPEN_STATUS__";
    const timestamp = buildClientLocalDate(body);
    const ctx = buildRollContext(timestamp, dna, memory, message);
    const routed = routeToTree(ctx);

    const clientSeedStamp = buildClientSeedStamp(body);
    const seed = makeSeed([dna.fingerprint, clientSeedStamp || timestamp.toISOString(), message, memory.affectionScore, memory.socialBattery, ctx.hour, ctx.dayOfWeek]);

    const random = seededRandom(seed);
    const roll = rollTree(routed.layers, ctx, random);
    const statusRandom = random();
    const visibleStatus = buildVisibleStatus(ctx, roll, statusRandom);

    return NextResponse.json({
      ok: true,
      source: "status-v8.2-client-time-seed",
      visibleStatus,
      treeName: routed.name,
      roll,
      clientTime: {
        connected: hasClientLocalTime(body),
        hour: body.clientHour,
        minute: body.clientMinute,
        second: body.clientSecond,
        timeZone: body.clientTimeZone,
        text: body.clientTimeText,
        date: body.clientDateText,
        seedStamp: clientSeedStamp,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      source: "status-error",
      visibleStatus: {
        emoji: "💭",
        label: "ตั้งหลักอยู่",
        detail: "สถานะยังโหลดไม่ครบ",
        displayText: "💭 ตั้งหลักอยู่ · สถานะยังโหลดไม่ครบ",
        availability: "soft_limited",
        chipClass: "status-low",
      },
      error: err?.message || "unknown",
    });
  }
}
