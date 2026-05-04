import { NextRequest, NextResponse } from "next/server";
import { buildDNA } from "../../../lib/humanSignature/dnaBuilder";
import { buildRollContext, makeSeed, seededRandom, rollTree } from "../../../lib/humanSignature/engine";
import { routeToTree } from "../../../lib/humanSignature/categoryRouter";
import { buildHumanPrompt } from "../../../lib/humanSignature/promptBuilder";
import type { CompanionMemory } from "../../../lib/humanSignature/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClientPayload = {
  message: string;
  memory?: {
    gender?: "male" | "female";
    nongnamName?: string;
    userCallName?: string;
    relationshipMode?: string;
    personalityStyle?: string;
    sulkyLevel?: string;
    jealousLevel?: string;
    affectionStyle?: string;
    affectionScore?: number;
    facts?: Array<{ key: string; value: string }>;
    schedules?: Array<{ type: string; label: string; time: string }>;
    recentMentions?: string[];
    socialBattery?: number;
  };
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

  clientTimestamp?: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function hasClientLocalTime(p: ClientPayload) {
  return (
    typeof p.clientHour === "number" &&
    typeof p.clientMinute === "number" &&
    typeof p.clientDayOfWeek === "number" &&
    typeof p.clientYear === "number" &&
    typeof p.clientMonth === "number" &&
    typeof p.clientDate === "number"
  );
}

function buildClientSeedStamp(p: ClientPayload) {
  return [
    "client-time-v8.2",
    p.clientTimestampMs,
    p.clientTimeZone,
    p.clientUtcOffsetMinutes,
    p.clientYear,
    p.clientMonth,
    p.clientDate,
    p.clientHour,
    p.clientMinute,
    p.clientSecond,
    p.clientDayOfWeek,
    p.clientTimeText,
    p.clientDateText,
  ].filter(v => v !== undefined && v !== null && v !== "").join("|");
}

function buildClientLocalDate(p: ClientPayload): Date {
  if (hasClientLocalTime(p)) {
    const d = new Date(Date.UTC(
      p.clientYear!,
      p.clientMonth! - 1,
      p.clientDate!,
      p.clientHour!,
      p.clientMinute!,
      p.clientSecond ?? 0
    ));

    return new Proxy(d, {
      get(target, prop, receiver) {
        if (prop === "getHours") return () => p.clientHour!;
        if (prop === "getMinutes") return () => p.clientMinute!;
        if (prop === "getSeconds") return () => (p.clientSecond ?? 0);
        if (prop === "getDay") return () => p.clientDayOfWeek!;
        if (prop === "getDate") return () => p.clientDate!;
        if (prop === "getMonth") return () => p.clientMonth! - 1;
        if (prop === "getFullYear") return () => p.clientYear!;
        if (prop === "toISOString") return () => buildClientSeedStamp(p);
        return Reflect.get(target, prop, receiver);
      }
    });
  }

  if (p.clientTimestamp) {
    const d = new Date(p.clientTimestamp);
    if (!isNaN(d.getTime())) return d;
  }

  if (typeof p.clientTimestampMs === "number") {
    const d = new Date(p.clientTimestampMs);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

function isTimeQuestion(message: string) {
  return /(กี่โมง|กี่ทุ่ม|กี่นาฬิกา|เวลา.*เท่าไหร่|เวลา.*แล้ว|ตอนนี้.*โมง|ตอนนี้.*ทุ่ม|ตอนนี้.*เวลา|ตอนนี้กี่|ตอนนี้.*นาฬิกา|now.*time|what.*time)/i.test(message);
}

function isDateQuestion(message: string) {
  return /(วันนี้วันอะไร|วันนี้วันที่เท่าไหร่|วันนี้วันที่|วันที่เท่าไหร่|วันนี้คือวัน|พรุ่งนี้วันอะไร|เมื่อวานวันอะไร|เมื่อวานคือวัน|พรุ่งนี้คือวัน)/i.test(message);
}

function formatThaiTimeFromClient(p: ClientPayload) {
  const hh = p.clientHour!;
  const mm = p.clientMinute!;
  const mmText = pad2(mm);

  if (hh === 0) return `ตอนนี้เที่ยงคืน ${mmText} นาทีแล้วค่ะพี่`;
  if (hh > 0 && hh < 6) return `ตอนนี้ตี ${hh} ${mmText} นาทีแล้วค่ะพี่`;
  if (hh === 6) return `ตอนนี้หกโมงเช้า ${mmText} นาทีแล้วค่ะพี่`;
  if (hh > 6 && hh < 12) return `ตอนนี้ ${hh} โมงเช้า ${mmText} นาทีแล้วค่ะพี่`;
  if (hh === 12) return `ตอนนี้เที่ยง ${mmText} นาทีแล้วค่ะพี่`;
  if (hh > 12 && hh < 16) return `ตอนนี้บ่าย ${hh - 12} โมง ${mmText} นาทีแล้วค่ะพี่`;
  if (hh >= 16 && hh < 18) return `ตอนนี้ ${hh - 12} โมงเย็น ${mmText} นาทีแล้วค่ะพี่`;
  return `ตอนนี้ ${hh - 12} ทุ่ม ${mmText} นาทีแล้วค่ะพี่`;
}

function relativeDateReply(message: string, p: ClientPayload) {
  if (!hasClientLocalTime(p)) {
    return "น้ำยังอ่านวันที่จากเครื่องพี่ไม่เจออะ ลองรีเฟรชหน้าเว็บก่อนนะคะ";
  }

  const base = new Date(p.clientYear!, p.clientMonth! - 1, p.clientDate!, p.clientHour!, p.clientMinute!, p.clientSecond ?? 0);
  let offset = 0;
  if (/เมื่อวาน|เมื่อคืน|เมื่อเช้า/i.test(message)) offset = -1;
  if (/พรุ่งนี้|คืนพรุ่งนี้/i.test(message)) offset = 1;

  const d = new Date(base);
  d.setDate(base.getDate() + offset);

  const text = d.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (offset === -1) return `เมื่อวานคือ ${text} ค่ะพี่`;
  if (offset === 1) return `พรุ่งนี้คือ ${text} ค่ะพี่`;
  return p.clientDateText ? `วันนี้คือ ${p.clientDateText} ค่ะพี่` : `วันนี้คือ ${text} ค่ะพี่`;
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
    const message = String(body.message || "").trim();

    if (!message) {
      return NextResponse.json({
        reply: "อืม... พี่ยังไม่ได้พิมพ์อะไรเลยนะ",
        source: "validation-error",
      });
    }

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

    const timestamp = buildClientLocalDate(body);
    const ctx = buildRollContext(timestamp, dna, memory, message);
    const hasClientTime = hasClientLocalTime(body);

    if (isTimeQuestion(message)) {
      if (!hasClientTime) {
        return NextResponse.json({
          reply: "เอ๊ะ... น้ำเช็คเวลาในเครื่องพี่ไม่เจออะ ลองรีเฟรชหน้าเว็บก่อนนะคะ ระบบเวลาอาจยังไม่เชื่อม",
          source: "time-not-connected",
          warning: "client time not sent — page.tsx must include getClientTimePayload()",
          debugClientTime: {
            clientHour: body.clientHour,
            clientMinute: body.clientMinute,
            clientTimeText: body.clientTimeText,
            clientTimeZone: body.clientTimeZone,
          },
        });
      }

      return NextResponse.json({
        reply: formatThaiTimeFromClient(body),
        source: "time-truth-direct-v8.2",
        clientTime: {
          hour: body.clientHour,
          minute: body.clientMinute,
          second: body.clientSecond,
          timeZone: body.clientTimeZone,
          text: body.clientTimeText,
          date: body.clientDateText,
          seedStamp: buildClientSeedStamp(body),
        },
      });
    }

    if (isDateQuestion(message)) {
      return NextResponse.json({
        reply: relativeDateReply(message, body),
        source: "date-truth-direct-v8.2",
        clientTime: {
          date: body.clientDateText,
          dateTime: body.clientDateTimeText,
          timeZone: body.clientTimeZone,
          seedStamp: buildClientSeedStamp(body),
        },
      });
    }

    const routed = routeToTree(ctx);

    const clientSeedStamp = buildClientSeedStamp(body);
    const seed = makeSeed([
      dna.fingerprint,
      clientSeedStamp || timestamp.toISOString(),
      message,
      memory.affectionScore,
      memory.socialBattery,
      ctx.hour,
      ctx.dayOfWeek,
    ]);

    const random = seededRandom(seed);
    const roll = rollTree(routed.layers, ctx, random);
    const statusRandom = random();
    const visibleStatus = buildVisibleStatus(ctx, roll, statusRandom);

    let systemPrompt = buildHumanPrompt({
      treeName: routed.name,
      roll,
      ctx,
      dna,
      memory,
    });

    if (hasClientTime) {
      systemPrompt += `\n\n[CLIENT TIME TRUTH + TREE SEED]
เวลาจริงจากเครื่องของ${dna.speechStyle.callName}: ${body.clientDateTimeText || `${body.clientDateText || ""} เวลา ${body.clientTimeText || ""}`}
Time Zone: ${body.clientTimeZone || "unknown"}
Client Seed Stamp: ${clientSeedStamp}
ctx.hour=${ctx.hour}
ctx.dayOfWeek=${ctx.dayOfWeek}
ห้ามใช้เวลา server, UTC, Vercel หรือเวลาอเมริกาเด็ดขาด
ถ้าจะอ้างเวลา/สภาพร่างกาย/ง่วง/หิว/กำลังทำอะไร ให้ยึดเวลานี้และ ctx นี้เท่านั้น`;
    } else {
      systemPrompt += `\n\n[CLIENT TIME WARNING]
เวลาจากเครื่องผู้ใช้ยังไม่ถูกส่งเข้าระบบ ห้ามเดาเวลาจาก server`;
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: "⚠️ ยังไม่ได้ตั้ง OPENAI_API_KEY ที่ Vercel Environment Variables",
        source: "no-api-key",
        treeName: routed.name,
        roll,
        visibleStatus,
      });
    }

    const recentMsgs = Array.isArray(body.recent)
      ? body.recent.slice(-6).map(r => ({
          role: r.role === "assistant" ? "assistant" : "user",
          content: String(r.text || "").slice(0, 500),
        }))
      : [];

    const lengthLimit = roll.length === "very_short" ? 60
      : roll.length === "short" ? 120
      : roll.length === "medium" ? 200
      : 320;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMsgs,
          { role: "user", content: message },
        ],
        temperature: 0.95,
        max_tokens: lengthLimit,
        presence_penalty: 0.5,
        frequency_penalty: 0.7,
      }),
      cache: "no-store",
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json({
        reply: `⚠️ OpenAI error: ${data?.error?.message || "unknown"}`,
        source: "openai-error",
        error: data?.error?.message,
        treeName: routed.name,
        roll,
        visibleStatus,
      });
    }

    let reply = data?.choices?.[0]?.message?.content?.trim() || "";
    reply = sanitizeReply(reply);

    return NextResponse.json({
      reply,
      source: "human-tree-v8.2-client-time-seed",
      treeName: routed.name,
      roll,
      visibleStatus,
      seed: seed.toString(36),
      clientTime: hasClientTime ? {
        hour: body.clientHour,
        minute: body.clientMinute,
        second: body.clientSecond,
        timeZone: body.clientTimeZone,
        text: body.clientTimeText,
        date: body.clientDateText,
        seedStamp: clientSeedStamp,
      } : null,
      usage: data?.usage,
    });
  } catch (err: any) {
    return NextResponse.json({
      reply: `⚠️ Server error: ${err?.message || "unknown"}`,
      source: "server-error",
      error: err?.message,
    });
  }
}

function sanitizeReply(text: string): string {
  return text
    .replace(/^น้องน้ำ\s*[:：]\s*/i, "")
    .replace(/^น้ำ\s*[:：]\s*/i, "")
    .replace(/มีอะไรให้ช่วยไหม[คะ?]*/g, "")
    .replace(/ยินดีช่วย[คะ.]*/g, "")
    .replace(/ในฐานะ\s*AI/gi, "")
    .replace(/ค่ะค่ะ/g, "ค่ะ")
    .replace(/ครับครับ/g, "ครับ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
