#!/usr/bin/env node
/**
 * Nong Nam Phase 4A — Multi-Bubble Engine (Client-side, low risk)
 *
 * เป้าหมาย:
 * - ทำให้คำตอบของน้องน้ำแตกเป็นหลาย bubble เหมือนคนแชทจริง
 * - ไม่แตะ detectIntent / route / time truth / tree
 * - เป็น patch หน้า app/page.tsx เป็นหลัก
 *
 * รันที่ root โปรเจกต์:
 *   node scripts/patch-phase4a-multi-bubble-engine.js
 *
 * แตะ:
 * - app/page.tsx
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const pagePath = path.join(root, "app", "page.tsx");

function fail(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

function backup(file, tag) {
  if (!fs.existsSync(file)) return;
  const bak = file + tag;
  if (!fs.existsSync(bak)) {
    fs.writeFileSync(bak, fs.readFileSync(file, "utf8"));
    console.log("✅ backup:", bak);
  }
}

function insertAfterFunction(src, functionName, insertText) {
  const idx = src.indexOf("function " + functionName);
  if (idx < 0) return { src, ok: false };
  const start = src.indexOf("{", idx);
  if (start < 0) return { src, ok: false };

  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        return {
          src: src.slice(0, i + 1) + "\n\n" + insertText + src.slice(i + 1),
          ok: true,
        };
      }
    }
  }
  return { src, ok: false };
}

if (!fs.existsSync(pagePath)) fail("ไม่พบ app/page.tsx — ต้องรันที่ root โปรเจกต์");

backup(pagePath, ".bak-phase4a-multi-bubble");

let page = fs.readFileSync(pagePath, "utf8");

/* --------------------------------------------------
 * 1) Add Multi-Bubble helpers after sendAssistant()
 * -------------------------------------------------- */
const helpers = `
  function isRealityOrSeriousReply(text: string) {
    const t = String(text || "");
    return /(เรื่องนี้สำคัญ|อันนี้สำคัญ|ฉุกเฉิน|หายใจไม่ออก|เจ็บหน้าอก|วีซ่า|E-9|E-7|EPS|กฎหมาย|ภาษี|ค่าแรง|นายจ้าง|เอกสาร|ตอนนี้\\s*\\d{1,2}:\\d{2}|วันนี้คือ|เมื่อวานคือ|พรุ่งนี้คือ)/i.test(t);
  }

  function shouldUseMultiBubble(text: string) {
    const t = String(text || "").trim();
    if (!t) return false;
    if (t.length < 42) return false;
    if (isRealityOrSeriousReply(t)) return false;
    if (/^⚠️|OpenAI error|Memory engine error|เชื่อมต่อ/i.test(t)) return false;
    return true;
  }

  function compactBubblePiece(s: string) {
    return String(s || "")
      .replace(/\\s+/g, " ")
      .replace(/^[,，.。!?！？\\-–—\\s]+/, "")
      .replace(/[,，\\s]+$/, "")
      .trim();
  }

  function splitAssistantBubbles(text: string) {
    const raw = String(text || "").trim();
    if (!shouldUseMultiBubble(raw)) return [raw].filter(Boolean);

    let seeds = raw
      .split(/\\n+/)
      .map(compactBubblePiece)
      .filter(Boolean);

    if (seeds.length <= 1) {
      const marked = raw
        .replace(/(อือ+|อืม+|เออ+|อ๋อ+|แหม+|อุ้ย+|โห+|หืม+|โอ๊ย+|555+|ฮ่าๆ+)\\s*/gi, "$1|")
        .replace(/([.!?。！？…]+)\\s*/g, "$1|")
        .replace(/\\s+(แต่|แล้ว|คือ|ถ้า|เพราะ|เดี๋ยว|งั้น|เอาจริง|ไม่ใช่|ใช่ดิ|บอกแล้ว)\\s+/g, "|$1 ")
        .replace(/\\s+(นะพี่|อะพี่|แหละพี่|เลยพี่|ดิพี่)\\s*/g, "$1|");
      seeds = marked.split("|").map(compactBubblePiece).filter(Boolean);
    }

    const merged: string[] = [];
    for (const piece of seeds) {
      if (!piece) continue;
      const last = merged[merged.length - 1];
      if (last && (last.length < 12 || piece.length < 8) && (last.length + piece.length) < 70) {
        merged[merged.length - 1] = compactBubblePiece(last + " " + piece);
      } else {
        merged.push(piece);
      }
    }

    const finalParts: string[] = [];
    for (const m of merged) {
      if (m.length <= 95) {
        finalParts.push(m);
      } else {
        const chunks = m.match(/.{1,85}(?:\\s|$)/g)?.map(compactBubblePiece).filter(Boolean) || [m];
        finalParts.push(...chunks);
      }
    }

    const result = finalParts
      .map(compactBubblePiece)
      .filter(Boolean)
      .slice(0, 4);

    return result.length ? result : [raw];
  }

  function sendAssistantBubbles(text: string) {
    const parts = splitAssistantBubbles(text);

    if (parts.length <= 1) {
      sendAssistant(parts[0] || text);
      return;
    }

    parts.forEach((part, idx) => {
      const delay = idx === 0 ? 0 : 520 + idx * 760 + Math.floor(Math.random() * 260);
      window.setTimeout(() => {
        sendAssistant(part);
      }, delay);
    });
  }
`;

if (!page.includes("function splitAssistantBubbles")) {
  const r = insertAfterFunction(page, "sendAssistant", helpers);
  if (!r.ok) {
    fail("หา function sendAssistant ไม่เจอ จึงใส่ Multi-Bubble helper ไม่ได้");
  }
  page = r.src;
  console.log("✅ page: added Multi-Bubble helpers after sendAssistant()");
} else {
  console.log("✅ page: Multi-Bubble helpers already exist");
}

/* --------------------------------------------------
 * 2) Replace sendAssistant(reply) call sites
 * -------------------------------------------------- */
let replaced = 0;

const replacements = [
  ["sendAssistant(reply);", "sendAssistantBubbles(reply);"],
  ["sendAssistant(localReply(msg));", "sendAssistantBubbles(localReply(msg));"],
  ["sendAssistant(companionTimeReply(msg, updatedMem));", "sendAssistantBubbles(companionTimeReply(msg, updatedMem));"],
];

for (const [from, to] of replacements) {
  if (page.includes(from) && !page.includes(to)) {
    page = page.replaceAll(from, to);
    replaced++;
  }
}

console.log(`✅ page: replaced ${replaced} sendAssistant call group(s) with sendAssistantBubbles`);

/* --------------------------------------------------
 * 3) Version marker
 * -------------------------------------------------- */
page = page.replace(/const APP_VERSION = "([^"]+)";/, (m, v) => {
  if (v.includes("phase4a-multi-bubble")) return m;
  return `const APP_VERSION = "${v} + phase4a-multi-bubble";`;
});

fs.writeFileSync(pagePath, page);

console.log("\n✅ Phase 4A Multi-Bubble Engine patch complete.");
console.log("Commit:");
console.log("  app/page.tsx");
console.log("\nCommit summary:");
console.log("  Phase 4A add client-side multi-bubble engine");
console.log("\nTest:");
console.log("  เอ้าตอบสิ นอนกี่ทุ่ม");
console.log("  ทำไมมั่วแล้วอะ");
console.log("  น้องน้ำคิดถึงพี่ไหม");
console.log("\nRollback:");
console.log("  cp app/page.tsx.bak-phase4a-multi-bubble app/page.tsx");
