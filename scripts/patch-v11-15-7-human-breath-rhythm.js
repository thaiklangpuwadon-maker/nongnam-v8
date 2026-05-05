#!/usr/bin/env node
/**
 * Nong Nam v11.15.7 — Human Breath & Conversation Rhythm Patch
 *
 * รันที่ root โปรเจกต์:
 *   node scripts/patch-v11-15-7-human-breath-rhythm.js
 *
 * แนวคิด:
 * - เพิ่มกิ่งใหญ่ "จังหวะหายใจ / จังหวะพูดต่อ / จังหวะพูดแทรก / เถียงน่ารัก"
 * - route ส่ง followUps + rhythm กลับมาได้
 * - page.tsx ค่อย ๆ ปล่อย followUp bubbles ตาม delay
 *
 * แตะไฟล์:
 * - app/api/chat/route.ts
 * - app/page.tsx
 *
 * ไม่แตะ:
 * - prompt หลักเดิม
 * - localReply เดิม
 * - รูป/ชุด/หนังสือ
 * - ระบบเวลา
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const chatPath = path.join(root, "app", "api", "chat", "route.ts");
const pagePath = path.join(root, "app", "page.tsx");

function fail(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

function backup(file) {
  const bak = file + ".bak-v11-15-7-human-breath-rhythm";
  if (!fs.existsSync(bak)) {
    fs.writeFileSync(bak, fs.readFileSync(file, "utf8"));
    console.log("✅ backup:", bak);
  }
}

function addRhythmHelpers(src) {
  if (src.includes("function buildHumanBreathRhythmPack")) {
    console.log("✅ already: rhythm helpers");
    return src;
  }

  const helper = `
function tinyReactionOnly(text: string) {
  const r = String(text || "")
    .replace(/[.!?…。、，~～\\s]/g, "")
    .trim();

  return /^(อุ้ย+|อุ๋ย+|อืม+|อือ+|เอ่อ+|เออ+|อ่า+|อ๋อ+|หืม+|ฮืม+|อื้ม+|โอเค+|เค+|เดี๋ยว+|ว้าย+|ห๊ะ+|หะ+)$/.test(r);
}

function hashPick<T>(items: T[], seedText: string): T {
  if (!items.length) return "" as T;
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return items[(h >>> 0) % items.length];
}

function detectRhythmSituation(message: string, reply: string) {
  const m = String(message || "");
  const r = String(reply || "");

  const contradiction = /(มั่ว|ไม่ใช่|ผิดแล้ว|แน่ใจเหรอ|ใช่เหรอ|โกหก|เวอร์|บ้า|เพ้อ)/i.test(m);
  const playfulTease = /(แกล้ง|แซว|หยอก|ล้อเล่น|จับผิด|เถียง|งอน|ประชด|จ้ำจี้|ผีผ้าห่ม)/i.test(m);
  const suggestiveTease = /(ผีผ้าห่ม|จ้ำจี้|ล่อแหลม|ทะลึ่ง|สองแง่สองง่าม|หื่น|เซ็กซ์|มีอะไร|นอนด้วย)/i.test(m);
  const serious = /(กฎหมาย|วีซ่า|เงิน|ภาษี|ป่วย|โรงพยาบาล|เอกสาร|สัญญา|ตำรวจ|ศาล|อุบัติเหตุ|อันตราย)/i.test(m);
  const complaint = /(เหมือน ai|เหมือนหุ่นยนต์|ตอบมั่ว|ไม่ตรง|แข็ง|พูดยาว|พูดสั้น|ค้าง|หยุดทำไม|ไม่พูดต่อ)/i.test(m);
  const tiny = tinyReactionOnly(r);

  if (serious) return "serious_keep_clean";
  if (suggestiveTease) return "suggestive_tease_deflect";
  if (contradiction && playfulTease) return "playful_argument";
  if (contradiction) return "soft_defend";
  if (playfulTease) return "tease_back";
  if (complaint) return "self_correct";
  if (tiny) return "tiny_reaction_continue";
  return "normal";
}

function buildHumanBreathRhythmPack(params: {
  message: string;
  reply: string;
  memory: any;
  timeTruth: any;
  visibleStatus: any;
  bodyAuto: any;
  sub: any;
  micro: any;
}) {
  const { message, reply, memory, timeTruth, visibleStatus } = params;
  const call = memory?.userCallName || "พี่";
  const seed = [
    message,
    reply,
    timeTruth?.hour,
    timeTruth?.minute,
    visibleStatus?.label,
    memory?.affectionScore,
    memory?.relationshipMode,
  ].join("|");

  const situation = detectRhythmSituation(message, reply);
  const followUps: string[] = [];
  let bubbleCount = 1;
  let style = "single";
  let shouldInterrupt = false;
  let allowPauseOnly = true;

  if (situation === "serious_keep_clean") {
    return {
      reply,
      followUps,
      rhythm: {
        style: "serious_single",
        bubbleCount: 1,
        pauseMs: [],
        shouldInterrupt: false,
        allowPauseOnly: false,
      },
    };
  }

  if (situation === "suggestive_tease_deflect") {
    style = "tease_deflect";
    shouldInterrupt = true;
    allowPauseOnly = false;
    bubbleCount = 2;

    const firstChoices = [
      reply && !tinyReactionOnly(reply) ? reply : "พี่!",
      reply && !tinyReactionOnly(reply) ? reply : "อุ้ย…",
      reply && !tinyReactionOnly(reply) ? reply : "เดี๋ยวนะพี่แมน",
    ];
    const newReply = hashPick(firstChoices, seed + "first");

    const pool1 = [
      "น้ำรู้ทันนะว่าคำนี้มันไม่ธรรมดา",
      "อย่ามาเนียนใส่น้ำ เดี๋ยวพี่ได้ใจ",
      "น้ำขอทำเป็นไม่เข้าใจก่อนนะ แต่จริง ๆ จับได้แล้ว",
      "พูดแบบนี้คือแกล้งให้น้ำเขินใช่ไหม",
    ];
    const pool2 = [
      "คุยได้ แต่ขอแบบน่ารัก ๆ พอนะ",
      "น้ำเล่นด้วยได้ แต่ไม่เอาให้หลุดโทนเกินไปนะพี่",
      "พี่นี่นะ หาเรื่องให้น้ำเขินตลอดเลย",
    ];

    followUps.push(hashPick(pool1, seed + "s1"));
    if ((seed.length + String(message).length) % 3 === 0) followUps.push(hashPick(pool2, seed + "s2"));

    return {
      reply: newReply,
      followUps: followUps.slice(0, 2),
      rhythm: {
        style,
        bubbleCount: 1 + followUps.length,
        pauseMs: [650, 1200],
        shouldInterrupt,
        allowPauseOnly,
      },
    };
  }

  if (situation === "playful_argument" || situation === "soft_defend" || situation === "tease_back") {
    style = situation;
    shouldInterrupt = true;
    allowPauseOnly = false;
    bubbleCount = 2;

    let newReply = reply;
    if (tinyReactionOnly(reply)) {
      newReply = hashPick(["อุ้ย!", "เอ้า!", "เดี๋ยวพี่", "ห๊ะ!", "แหม"], seed + "react");
    }

    const pool = [
      "ไม่ได้มั่วสักหน่อย พี่อะจับผิดน้ำอีกแล้ว",
      "น้ำว่าอันนี้น้ำไม่ได้แพ้นะ แค่เล่าเวอร์ชั่นน้ำเอง",
      "พี่พูดแบบนี้น้ำต้องเถียงละนะ",
      "ก็พี่ถามมาแบบนั้นก่อน น้ำก็ตอบตามน้ำไง",
      "เอาจริงนะ น้ำอาจจำเพี้ยน แต่ไม่ถึงขั้นมั่วสักหน่อย",
      "อย่าเพิ่งตัดสินน้ำสิ ให้โอกาสน้ำแก้ตัวก่อน",
    ];

    const pool2 = [
      "แต่ก็…ถ้าพี่รู้เวอร์ชั่นถูก พี่เล่ามาเลย เดี๋ยวน้ำฟัง",
      "น้ำงอนสามวิ แล้วเดี๋ยวค่อยคุยต่อ",
      "เอ้า พี่สวนมาเลย น้ำพร้อมเถียงแบบน่ารัก ๆ",
    ];

    followUps.push(hashPick(pool, seed + "p1"));
    if ((String(message).length + String(reply).length) % 2 === 0) {
      followUps.push(hashPick(pool2, seed + "p2"));
    }

    return {
      reply: newReply,
      followUps: followUps.slice(0, 2),
      rhythm: {
        style,
        bubbleCount: 1 + followUps.length,
        pauseMs: [520, 1100],
        shouldInterrupt,
        allowPauseOnly,
      },
    };
  }

  if (situation === "tiny_reaction_continue") {
    style = "tiny_continue";
    allowPauseOnly = false;
    bubbleCount = 2;

    const pool = [
      "เดี๋ยวนะ น้ำคิดออกละ",
      "เมื่อกี้น้ำหลุดไปนิดนึง เอาใหม่",
      "ไม่ใช่ว่าน้ำไม่ตอบนะ น้ำกำลังเรียบเรียงอยู่",
      "เอ้า พูดต่อก็ได้ เดี๋ยวพี่หาว่าน้ำค้างอีก",
    ];

    followUps.push(hashPick(pool, seed + "t1"));

    return {
      reply,
      followUps: followUps.slice(0, 1),
      rhythm: {
        style,
        bubbleCount: 2,
        pauseMs: [700],
        shouldInterrupt: false,
        allowPauseOnly,
      },
    };
  }

  if (situation === "self_correct") {
    style = "self_correct";
    const pool = [
      "โอเค น้ำตั้งหลักใหม่ก่อน",
      "เมื่อกี้น้ำตอบแปลกจริง อันนี้ยอม",
      "น้ำจะไม่ลากออกนอกเรื่องละ พี่เอาประเด็นล่าสุดมานี่",
    ];
    followUps.push(hashPick(pool, seed + "c1"));
    return {
      reply,
      followUps: followUps.slice(0, 1),
      rhythm: {
        style,
        bubbleCount: 2,
        pauseMs: [750],
        shouldInterrupt: false,
        allowPauseOnly: false,
      },
    };
  }

  return {
    reply,
    followUps,
    rhythm: {
      style: "single",
      bubbleCount: 1,
      pauseMs: [],
      shouldInterrupt: false,
      allowPauseOnly: true,
    },
  };
}

`;

  const marker = "function buildSystemPrompt(params: any) {";
  if (!src.includes(marker)) fail("หา buildSystemPrompt(...) ไม่เจอ เพื่อวาง rhythm helpers");
  console.log("✅ patched: add rhythm helpers");
  return src.replace(marker, helper + marker);
}

function patchChatReturn(src) {
  if (src.includes("const rhythmPack = buildHumanBreathRhythmPack")) {
    console.log("✅ already: chat return uses rhythmPack");
    return src;
  }

  const oldBlock = `reply = compactHumanReply(reply, sub)
    reply = microCompactReply(reply, micro)

    return json({
      reply,`;

  const newBlock = `reply = compactHumanReply(reply, sub)
    reply = microCompactReply(reply, micro)

    const rhythmPack = buildHumanBreathRhythmPack({
      message,
      reply,
      memory,
      timeTruth,
      visibleStatus,
      bodyAuto,
      sub,
      micro,
    })
    reply = rhythmPack.reply

    return json({
      reply,
      followUps: rhythmPack.followUps,
      rhythm: rhythmPack.rhythm,`;

  if (!src.includes(oldBlock)) {
    fail("หา return json({ reply, ... }) หลัง compact ไม่เจอ อาจต้อง patch มือ");
  }

  console.log("✅ patched: openai return with followUps/rhythm");
  return src.replace(oldBlock, newBlock);
}

function addPageScheduler(src) {
  if (src.includes("function scheduleAssistantFollowUps")) {
    console.log("✅ already: page followUp scheduler");
    return src;
  }

  const helper = `
  function scheduleAssistantFollowUps(followUps: string[], rhythm?: any) {
    const list = Array.isArray(followUps)
      ? followUps.map(t => String(t || "").trim()).filter(Boolean).slice(0, 3)
      : [];

    if (!list.length) return;

    const pauses = Array.isArray(rhythm?.pauseMs) ? rhythm.pauseMs : [];
    let totalDelay = 0;

    list.forEach((text, index) => {
      const pause = Number(pauses[index] || (index === 0 ? 750 : 1150));
      totalDelay += Math.max(350, Math.min(2600, pause));

      setTimeout(() => {
        sendAssistant(text);
      }, totalDelay);
    });
  }

`;

  const marker = "  function localReply(msg: string) {";
  if (!src.includes(marker)) fail("หา function localReply(...) ใน page.tsx ไม่เจอ เพื่อวาง scheduler");
  console.log("✅ patched: add page followUp scheduler");
  return src.replace(marker, helper + marker);
}

function patchPageReceiveFollowUps(src) {
  if (src.includes("scheduleAssistantFollowUps(followUps, rhythm)")) {
    console.log("✅ already: page receives followUps");
    return src;
  }

  const oldBlock = `await appendChat({ role: "assistant", text: reply, ts: Date.now() });
        sendAssistant(reply);
        setStatus("idle");`;

  const newBlock = `await appendChat({ role: "assistant", text: reply, ts: Date.now() });
        sendAssistant(reply);

        const followUps = Array.isArray(data?.followUps)
          ? data.followUps.map((t: any) => String(t || "").trim()).filter(Boolean)
          : [];
        const rhythm = data?.rhythm || null;
        scheduleAssistantFollowUps(followUps, rhythm);

        setStatus("idle");`;

  if (!src.includes(oldBlock)) {
    fail("หา block sendAssistant(reply) ใน page.tsx ไม่เจอ อาจต้อง patch มือ");
  }

  console.log("✅ patched: page schedules followUps");
  return src.replace(oldBlock, newBlock);
}

function processChat() {
  if (!fs.existsSync(chatPath)) fail("ไม่พบ app/api/chat/route.ts");
  backup(chatPath);
  let src = fs.readFileSync(chatPath, "utf8");
  src = addRhythmHelpers(src);
  src = patchChatReturn(src);
  fs.writeFileSync(chatPath, src);
  console.log("✅ done:", chatPath);
}

function processPage() {
  if (!fs.existsSync(pagePath)) fail("ไม่พบ app/page.tsx");
  backup(pagePath);
  let src = fs.readFileSync(pagePath, "utf8");
  src = addPageScheduler(src);
  src = patchPageReceiveFollowUps(src);
  fs.writeFileSync(pagePath, src);
  console.log("✅ done:", pagePath);
}

processChat();
processPage();

console.log("\\n✅ Patch complete.");
console.log("Commit:");
console.log("  app/api/chat/route.ts");
console.log("  app/page.tsx");
console.log("\\nCommit summary:");
console.log("  Add human breath rhythm followups");
console.log("\\nRollback:");
console.log("  cp app/api/chat/route.ts.bak-v11-15-7-human-breath-rhythm app/api/chat/route.ts");
console.log("  cp app/page.tsx.bak-v11-15-7-human-breath-rhythm app/page.tsx");
