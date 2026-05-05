#!/usr/bin/env node
/**
 * Nong Nam v11.15.8 — Follow-up Bubbles Only Patch
 *
 * ใช้หลังจากเวลาเกาหลีแก้สำเร็จแล้ว
 *
 * รันที่ root โปรเจกต์:
 *   node scripts/patch-v11-15-8-followup-bubbles-only.js
 *
 * แตะ:
 * - app/api/chat/route.ts
 * - app/page.tsx
 *
 * ไม่แตะ:
 * - ระบบเวลา
 * - visibleStatus
 * - prompt หลัก
 * - localReply เดิม
 * - รูป / ชุด / หนังสือ
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
  const bak = file + ".bak-v11-15-8-followup-bubbles";
  if (!fs.existsSync(bak)) {
    fs.writeFileSync(bak, fs.readFileSync(file, "utf8"));
    console.log("✅ backup:", bak);
  }
}

function addRhythmHelpers(src) {
  if (src.includes("function buildFollowUpBubblePack")) {
    console.log("✅ already: buildFollowUpBubblePack");
    return src;
  }

  const helper = `
function tinyReactionOnly(text: string) {
  const r = String(text || "")
    .replace(/[.!?…。、，~～\\s]/g, "")
    .trim();

  return /^(อุ้ย+|อุ๋ย+|อืม+|อือ+|เอ่อ+|เออ+|อ่า+|อ๋อ+|หืม+|ฮืม+|อื้ม+|โอเค+|เค+|เดี๋ยว+|ว้าย+|ห๊ะ+|หะ+|ก็+|ง่า+)$/.test(r);
}

function simpleHashPick<T>(items: T[], seedText: string): T {
  if (!items.length) return "" as T;
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return items[(h >>> 0) % items.length];
}

function detectFollowUpSituation(message: string, reply: string) {
  const m = String(message || "");
  const r = String(reply || "");

  const serious = /(กฎหมาย|วีซ่า|เงิน|ภาษี|ป่วย|โรงพยาบาล|เอกสาร|สัญญา|ตำรวจ|ศาล|อุบัติเหตุ|อันตราย|ยา|หมอ)/i.test(m);
  const directTime = /(กี่โมง|กี่ทุ่ม|เวลาเท่าไหร่|วันนี้วันที่|วันนี้วันอะไร|พรุ่งนี้วันอะไร|เมื่อวานวันอะไร)/i.test(m);
  const tease = /(แกล้ง|แซว|หยอก|จับผิด|เถียง|งอน|ประชด|มั่ว|ไม่ใช่|ผิดแล้ว|ใช่เหรอ|แน่ใจเหรอ|เวอร์|โม้|จ้ำจี้|ผีผ้าห่ม)/i.test(m);
  const suggestive = /(ผีผ้าห่ม|จ้ำจี้|ล่อแหลม|ทะลึ่ง|สองแง่สองง่าม|หื่น|นอนด้วย)/i.test(m);
  const complaint = /(พูดต่อ|ทำไมค้าง|ตอบค้าง|ต้องถามต่อ|เหมือน ai|เหมือนหุ่นยนต์|ตอบแข็ง|ไม่เป็นคน|ไม่ธรรมชาติ)/i.test(m);
  const tiny = tinyReactionOnly(r);

  if (serious || directTime) return "single_serious";
  if (suggestive) return "suggestive_tease";
  if (tease) return "playful_pushback";
  if (complaint) return "self_repair";
  if (tiny) return "tiny_continue";
  return "normal";
}

function buildFollowUpBubblePack(params: {
  message: string;
  reply: string;
  memory: any;
  timeTruth: any;
  visibleStatus: any;
}) {
  const { message, reply, memory, timeTruth, visibleStatus } = params;
  const call = memory?.userCallName || "พี่";
  const seed = [
    message,
    reply,
    timeTruth?.hour,
    timeTruth?.minute,
    visibleStatus?.displayText,
    memory?.affectionScore,
    memory?.relationshipMode,
  ].join("|");

  const situation = detectFollowUpSituation(message, reply);
  const followUps: string[] = [];
  let finalReply = reply;

  if (situation === "single_serious") {
    return {
      reply: finalReply,
      followUps,
      rhythm: { style: "single_serious", bubbleCount: 1, pauseMs: [] },
    };
  }

  if (situation === "suggestive_tease") {
    if (tinyReactionOnly(finalReply)) {
      finalReply = simpleHashPick(["พี่!", "อุ้ย…", "เดี๋ยวนะ", "แหม"], seed + "first");
    }

    followUps.push(simpleHashPick([
      "น้ำรู้ทันนะว่าคำนี้มันไม่ธรรมดา",
      "อย่ามาเนียนใส่น้ำ เดี๋ยวพี่ได้ใจ",
      "น้ำขอทำเป็นไม่เข้าใจก่อนนะ แต่จริง ๆ จับได้แล้ว",
      "พูดแบบนี้คือแกล้งให้น้ำเขินใช่ไหม",
    ], seed + "s1"));

    if ((String(message).length + String(reply).length) % 3 !== 1) {
      followUps.push(simpleHashPick([
        "คุยได้ แต่ขอแบบน่ารัก ๆ พอนะ",
        "น้ำเล่นด้วยได้ แต่ไม่เอาให้หลุดโทนเกินไปนะพี่",
        "พี่นี่นะ หาเรื่องให้น้ำเขินตลอดเลย",
      ], seed + "s2"));
    }

    return {
      reply: finalReply,
      followUps: followUps.slice(0, 2),
      rhythm: { style: "suggestive_tease", bubbleCount: 1 + followUps.length, pauseMs: [650, 1200] },
    };
  }

  if (situation === "playful_pushback") {
    if (tinyReactionOnly(finalReply)) {
      finalReply = simpleHashPick(["อุ้ย!", "เอ้า!", "เดี๋ยวพี่", "ห๊ะ!", "แหม"], seed + "first");
    }

    followUps.push(simpleHashPick([
      "ไม่ได้มั่วสักหน่อย พี่อะจับผิดน้ำอีกแล้ว",
      "น้ำว่าอันนี้น้ำไม่ได้แพ้นะ แค่เล่าเวอร์ชั่นน้ำเอง",
      "พี่พูดแบบนี้น้ำต้องเถียงละนะ",
      "ก็พี่ถามมาแบบนั้นก่อน น้ำก็ตอบตามน้ำไง",
      "เอาจริงนะ น้ำอาจจำเพี้ยน แต่ไม่ถึงขั้นมั่วสักหน่อย",
      "อย่าเพิ่งตัดสินน้ำสิ ให้โอกาสน้ำแก้ตัวก่อน",
    ], seed + "p1"));

    if ((String(message).length + String(reply).length) % 2 === 0) {
      followUps.push(simpleHashPick([
        "แต่ถ้าพี่รู้เวอร์ชั่นถูก พี่ก็เล่ามาเลย เดี๋ยวน้ำฟัง",
        "น้ำงอนสามวิ แล้วเดี๋ยวค่อยคุยต่อ",
        "เอ้า พี่สวนมาเลย น้ำพร้อมเถียงแบบน่ารัก ๆ",
      ], seed + "p2"));
    }

    return {
      reply: finalReply,
      followUps: followUps.slice(0, 2),
      rhythm: { style: "playful_pushback", bubbleCount: 1 + followUps.length, pauseMs: [520, 1100] },
    };
  }

  if (situation === "self_repair") {
    followUps.push(simpleHashPick([
      "โอเค น้ำตั้งหลักใหม่ก่อน",
      "เมื่อกี้น้ำค้างจริง อันนี้พี่จับได้",
      "เดี๋ยวน้ำไม่ปล่อยให้พี่ต้องสะกิดบ่อย ๆ แล้ว",
    ], seed + "c1"));

    return {
      reply: finalReply,
      followUps: followUps.slice(0, 1),
      rhythm: { style: "self_repair", bubbleCount: 2, pauseMs: [750] },
    };
  }

  if (situation === "tiny_continue") {
    followUps.push(simpleHashPick([
      "เดี๋ยวนะ น้ำคิดออกละ",
      "ไม่ใช่ว่าน้ำไม่ตอบนะ น้ำกำลังเรียบเรียงอยู่",
      "เอ้า พูดต่อก็ได้ เดี๋ยวพี่หาว่าน้ำค้างอีก",
      `${call}อย่าเพิ่งรีบจับผิด น้ำกำลังต่อคำอยู่`,
    ], seed + "t1"));

    return {
      reply: finalReply,
      followUps: followUps.slice(0, 1),
      rhythm: { style: "tiny_continue", bubbleCount: 2, pauseMs: [700] },
    };
  }

  return {
    reply: finalReply,
    followUps,
    rhythm: { style: "single", bubbleCount: 1, pauseMs: [] },
  };
}

`;

  const marker = "function buildSystemPrompt(params: any) {";
  if (!src.includes(marker)) {
    fail("หา function buildSystemPrompt(params: any) ไม่เจอใน app/api/chat/route.ts");
  }

  src = src.replace(marker, helper + marker);
  console.log("✅ patched: add follow-up helpers to route");
  return src;
}

function patchOpenAiReturn(src) {
  if (src.includes("const followPack = buildFollowUpBubblePack")) {
    console.log("✅ already: OpenAI return uses followPack");
    return src;
  }

  const oldBlock = `reply = compactHumanReply(reply, sub)
    reply = microCompactReply(reply, micro)

    return json({
      reply,`;

  const newBlock = `reply = compactHumanReply(reply, sub)
    reply = microCompactReply(reply, micro)

    const followPack = buildFollowUpBubblePack({
      message,
      reply,
      memory,
      timeTruth,
      visibleStatus,
    })
    reply = followPack.reply

    return json({
      reply,
      followUps: followPack.followUps,
      rhythm: followPack.rhythm,`;

  if (!src.includes(oldBlock)) {
    console.log("⚠️ ไม่เจอ OpenAI return block แบบเดิม ข้ามส่วนนี้");
    return src;
  }

  src = src.replace(oldBlock, newBlock);
  console.log("✅ patched: OpenAI return includes followUps");
  return src;
}

function patchLocalReturns(src) {
  if (src.includes("const localPack = buildFollowUpBubblePack")) {
    console.log("✅ already: local returns use localPack");
    return src;
  }

  const target = `if (!apiKey || mode === 'local') {
      return json({
        reply: localReply(message, memory, timeTruth, visibleStatus, dna, life, bodyAuto, sub, micro),`;

  const replacement = `if (!apiKey || mode === 'local') {
      const baseLocalReply = localReply(message, memory, timeTruth, visibleStatus, dna, life, bodyAuto, sub, micro)
      const localPack = buildFollowUpBubblePack({
        message,
        reply: baseLocalReply,
        memory,
        timeTruth,
        visibleStatus,
      })
      return json({
        reply: localPack.reply,
        followUps: localPack.followUps,
        rhythm: localPack.rhythm,`;

  if (!src.includes(target)) {
    console.log("⚠️ ไม่เจอ local return block แบบเดิม ข้ามส่วนนี้");
    return src;
  }

  src = src.replace(target, replacement);
  console.log("✅ patched: local return includes followUps");
  return src;
}

function addPageScheduler(src) {
  if (src.includes("function scheduleAssistantFollowUps")) {
    console.log("✅ already: page scheduler exists");
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
  if (!src.includes(marker)) {
    fail("หา function localReply(msg: string) ไม่เจอใน app/page.tsx");
  }

  src = src.replace(marker, helper + marker);
  console.log("✅ patched: add follow-up scheduler to page");
  return src;
}

function patchPageReceive(src) {
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
    fail("หา block sendAssistant(reply) ไม่เจอใน app/page.tsx");
  }

  src = src.replace(oldBlock, newBlock);
  console.log("✅ patched: page schedules followUps after reply");
  return src;
}

function patchChat() {
  if (!fs.existsSync(chatPath)) fail("ไม่พบ app/api/chat/route.ts");
  backup(chatPath);
  let src = fs.readFileSync(chatPath, "utf8");
  src = addRhythmHelpers(src);
  src = patchLocalReturns(src);
  src = patchOpenAiReturn(src);
  fs.writeFileSync(chatPath, src);
  console.log("✅ done:", chatPath);
}

function patchPage() {
  if (!fs.existsSync(pagePath)) fail("ไม่พบ app/page.tsx");
  backup(pagePath);
  let src = fs.readFileSync(pagePath, "utf8");
  src = addPageScheduler(src);
  src = patchPageReceive(src);
  fs.writeFileSync(pagePath, src);
  console.log("✅ done:", pagePath);
}

patchChat();
patchPage();

console.log("\n✅ Patch complete.");
console.log("Commit:");
console.log("  app/api/chat/route.ts");
console.log("  app/page.tsx");
console.log("\nCommit summary:");
console.log("  Add follow up bubble rhythm");
console.log("\nRollback:");
console.log("  cp app/api/chat/route.ts.bak-v11-15-8-followup-bubbles app/api/chat/route.ts");
console.log("  cp app/page.tsx.bak-v11-15-8-followup-bubbles app/page.tsx");
