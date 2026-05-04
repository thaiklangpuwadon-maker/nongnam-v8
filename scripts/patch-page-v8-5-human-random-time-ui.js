#!/usr/bin/env node
/**
 * Nong Nam v8.5 Human Random + Time UI Patch
 *
 * Run at project root:
 *   node scripts/patch-page-v8-5-human-random-time-ui.js
 *
 * This patches app/page.tsx only.
 */

const fs = require("fs");
const path = require("path");

const pagePath = path.join(process.cwd(), "app", "page.tsx");

function fail(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

if (!fs.existsSync(pagePath)) {
  fail("ไม่พบ app/page.tsx — ต้องรันที่ root โปรเจกต์ nongnam-v8");
}

let src = fs.readFileSync(pagePath, "utf8");
const backup = pagePath + ".bak-v8-5";
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, src);
  console.log("✅ backup:", backup);
}

function patch(label, alreadyRegex, fn) {
  if (alreadyRegex && alreadyRegex.test(src)) {
    console.log("✅ already:", label);
    return;
  }
  const next = fn(src);
  if (next === src) console.log("⚠️ not patched:", label);
  else {
    src = next;
    console.log("✅ patched:", label);
  }
}

// 1) version
src = src.replace(/const APP_VERSION = "([^"]+)";/, (m, v) => {
  if (v.includes("v8.5-human-random-time-ui")) return m;
  return `const APP_VERSION = "${v} + v8.5-human-random-time-ui";`;
});

// 2) visibleStatus state
patch(
  "visibleStatus state",
  /const\s+\[visibleStatus,\s*setVisibleStatus\]/,
  s => s.replace(
    'const [status, setStatus] = useState<"idle" | "thinking" | "speaking" | "recording">("idle");',
    'const [status, setStatus] = useState<"idle" | "thinking" | "speaking" | "recording">("idle");\n  const [visibleStatus, setVisibleStatus] = useState<any>(null);'
  )
);

// 3) client debug helper
const debugFn = `
  function debugClientTime(label = "debug") {
    const t = getClientTimePayload();
    console.log("[NongNam client time " + label + "]", t);
    return t;
  }

`;
patch(
  "debugClientTime helper",
  /function\s+debugClientTime\s*\(/,
  s => s.replace("  function notify(t: string) {", debugFn + "  function notify(t: string) {")
);

// 4) refresh status function
const refreshFn = `
  async function refreshNongnamStatus() {
    if (!ready || screen !== "chat") return;

    try {
      const payload = {
        memory: {
          gender: mem.gender,
          nongnamName: mem.nongnamName,
          userCallName: mem.userCallName,
          relationshipMode: mem.relationshipMode,
          personalityStyle: mem.personalityStyle,
          sulkyLevel: mem.sulkyLevel,
          jealousLevel: mem.jealousLevel,
          affectionStyle: mem.affectionStyle,
          affectionScore,
          socialBattery: 70,
        },
        recent: chat.slice(-6).map(c => ({ role: c.role, text: c.text })),
        ...getClientTimePayload(),
      };

      const r = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json();

      if (data?.visibleStatus) setVisibleStatus(data.visibleStatus);

      console.log("[NongNam /api/status v8.5]", {
        source: data?.source,
        visibleStatus: data?.visibleStatus,
        clientTime: data?.clientTime,
      });
    } catch (e) {
      console.warn("[NongNam /api/status failed]", e);
    }
  }

`;
patch(
  "refreshNongnamStatus function",
  /async\s+function\s+refreshNongnamStatus\s*\(/,
  s => s.replace("  function localReply(msg: string) {", refreshFn + "  function localReply(msg: string) {")
);

// 5) status useEffect
const statusEffect = `
  // ── v8.5: โหลดสถานะจริงจากเวลาเครื่องผู้ใช้เมื่อเข้า chat ──
  useEffect(() => {
    if (!ready || screen !== "chat") return;

    refreshNongnamStatus();
    const timer = setInterval(refreshNongnamStatus, 3 * 60 * 1000);

    return () => clearInterval(timer);
  }, [ready, screen, mem.gender, mem.personalityStyle, mem.relationshipMode, mem.userCallName, mem.nongnamName, affectionScore]);

`;
patch(
  "status useEffect",
  /โหลดสถานะจริงจากเวลาเครื่องผู้ใช้เมื่อเข้า chat/,
  s => {
    const marker = "  const effectiveOutfits = useMemo";
    if (!s.includes(marker)) return s;
    return s.replace(marker, statusEffect + marker);
  }
);

// 6) replace static topbar status
src = src.replace(
  '<div><b>{mem.nongnamName}</b><small>● พร้อมคุยกับ{mem.userCallName}แล้ว</small></div>',
  '<div><b>{mem.nongnamName}</b><small>{visibleStatus?.displayText || `● พร้อมคุยกับ${mem.userCallName}แล้ว`}</small></div>'
);

// 7) fix init greeting literal string
src = src.replace(
  'const realMsg = isInitGreeting\n      ? "ทักทาย${user}แบบเป็นธรรมชาติเป็นครั้งแรก ใช้ข้อมูลที่จำได้ ถ้ามี"\n      : msg;',
  'const realMsg = isInitGreeting\n      ? `ทักทาย${mem.userCallName}แบบเป็นธรรมชาติเป็นครั้งแรก ใช้ข้อมูลที่จำได้ ถ้ามี ห้ามพูดเหมือนผู้ช่วย ห้ามพูดว่าสวัสดีแบบทางการ ให้เหมือนคนรักที่เพิ่งเห็นพี่เปิดแชตเข้ามา`\n      : msg;'
);

// 8) Add clientNonce/mode to v8Payload if possible
src = src.replace(
  'recent: chat.slice(-6).map(c => ({ role: c.role, text: c.text })),\n            // ── v8.1: ส่งเวลาเครื่อง browser ครบทุก field (แก้ปัญหา UTC) ──\n            ...getClientTimePayload(),',
  'recent: chat.slice(-6).map(c => ({ role: c.role, text: c.text })),\n            mode: mem.apiMode || "api-light",\n            clientNonce: String(Date.now()) + Math.random().toString(36).slice(2),\n            // ── v8.5: ส่งเวลาเครื่อง browser ครบทุก field ให้ทั้ง Time Truth และ Random Tree ──\n            ...getClientTimePayload(),'
);

// 9) receive visibleStatus and log client time
patch(
  "setVisibleStatus after /api/chat",
  /setVisibleStatus\(data\.visibleStatus\)/,
  s => s.replace(
    'source = data?.source || "unknown";',
    'source = data?.source || "unknown";\n          if (data?.visibleStatus) setVisibleStatus(data.visibleStatus);\n          console.log("[NongNam /api/chat v8.5]", { source, clientTime: data?.clientTime, visibleStatus: data?.visibleStatus, treeName: data?.treeName, roll: data?.roll });'
  )
);

// 10) improve robotic local fallback endings
src = src.replace(
  'return mem.gender === "male"\n      ? `${name}ฟังอยู่ครับ${user} เล่าให้ผมฟังได้เลย วันนี้ใจพี่เป็นยังไงบ้าง`\n      : `${name}ฟังอยู่ค่ะ${user} เล่าให้น้องฟังได้เลยนะ วันนี้ใจพี่เป็นยังไงบ้าง`;',
  'const localChoices = mem.gender === "male"\n      ? [`อืม ${user} ว่ามาเลย ผมอยู่ตรงนี้`, `มาแล้วครับ ${user} เมื่อกี้ผมเหมือนใจลอยไปหน่อย`, `${user}พูดมา เดี๋ยวผมฟังแบบไม่ขัดก่อน`]\n      : [`อื้อ ${user} ว่ามาเลย น้ำอยู่ตรงนี้`, `มาแล้วค่ะ เมื่อกี้น้ำเหมือนใจลอยไปนิดนึง`, `${user}พูดมาเลย เดี๋ยวน้ำฟังก่อน ไม่แทรกละ`];\n    return localChoices[Math.floor(Date.now() / 7000) % localChoices.length];'
);

// 11) quick check warning
if (!src.includes("...getClientTimePayload()")) {
  console.log("❌ ยังไม่เจอ ...getClientTimePayload() ใน page.tsx");
} else {
  console.log("✅ found ...getClientTimePayload()");
}
if (!src.includes("visibleStatus?.displayText")) {
  console.log("❌ ยังไม่เจอ visibleStatus?.displayText ใน topbar");
} else {
  console.log("✅ found visibleStatus display in UI");
}

fs.writeFileSync(pagePath, src);
console.log("\n✅ Done. Patched app/page.tsx");
console.log("ต้อง commit app/page.tsx แล้ว deploy ใหม่");
console.log("หลัง deploy ให้เปิด DevTools Console ดู [NongNam /api/chat v8.5] และ [NongNam /api/status v8.5]");
