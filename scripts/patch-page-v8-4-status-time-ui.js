#!/usr/bin/env node
/**
 * Nong Nam v8.4 Page Status + Client Time UI AutoPatch
 *
 * ใช้ที่ root โปรเจกต์:
 *   node scripts/patch-page-v8-4-status-time-ui.js
 *
 * สิ่งที่ทำ:
 * - backup app/page.tsx
 * - เพิ่ม visibleStatus state
 * - เพิ่ม refreshNongnamStatus()
 * - เรียก /api/status ตอนเปิดหน้า chat
 * - แสดง visibleStatus.displayText ใต้ชื่อน้องน้ำ
 * - รับ visibleStatus จาก /api/chat response
 * - บังคับ fetch /api/chat มี ...getClientTimePayload()
 */

const fs = require("fs");
const path = require("path");

const pagePath = path.join(process.cwd(), "app", "page.tsx");

function fail(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

if (!fs.existsSync(pagePath)) {
  fail("ไม่พบ app/page.tsx — ต้องรันคำสั่งนี้ที่ root โปรเจกต์ nongnam-v8");
}

let src = fs.readFileSync(pagePath, "utf8");
const backup = pagePath + ".bak-v8-4";
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, src);
  console.log("✅ backup:", backup);
}

function addOnce(label, existsRegex, applyFn) {
  if (existsRegex.test(src)) {
    console.log("✅ already:", label);
    return;
  }
  const next = applyFn(src);
  if (next === src) {
    console.log("⚠️ not patched:", label);
  } else {
    src = next;
    console.log("✅ patched:", label);
  }
}

/** 1) เพิ่ม visibleStatus state */
addOnce(
  "visibleStatus state",
  /const\s+\[visibleStatus,\s*setVisibleStatus\]/,
  s => s.replace(
    'const [status, setStatus] = useState<"idle" | "thinking" | "speaking" | "recording">("idle");',
    'const [status, setStatus] = useState<"idle" | "thinking" | "speaking" | "recording">("idle");\n  const [visibleStatus, setVisibleStatus] = useState<any>(null);'
  )
);

/** 2) เพิ่ม refreshNongnamStatus function ก่อน localReply */
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

      if (data?.visibleStatus) {
        setVisibleStatus(data.visibleStatus);
      }

      // debug เฉพาะตอนพัฒนา ดูใน DevTools Console ได้
      console.log("[NongNam status v8.4]", {
        source: data?.source,
        visibleStatus: data?.visibleStatus,
        clientTime: data?.clientTime,
      });
    } catch (e) {
      console.warn("[NongNam status failed]", e);
    }
  }

`;

addOnce(
  "refreshNongnamStatus function",
  /async\s+function\s+refreshNongnamStatus\s*\(/,
  s => s.replace("  function localReply(msg: string) {", refreshFn + "  function localReply(msg: string) {")
);

/** 3) เพิ่ม useEffect เรียก /api/status ตอนเปิดหน้า chat */
const statusEffect = `
  // ── v8.4: โหลดสถานะจริงจากเวลาเครื่องผู้ใช้ตอนเปิดหน้า chat ──
  useEffect(() => {
    if (!ready || screen !== "chat") return;

    refreshNongnamStatus();
    const timer = setInterval(refreshNongnamStatus, 3 * 60 * 1000);

    return () => clearInterval(timer);
  }, [ready, screen, mem.gender, mem.personalityStyle, mem.relationshipMode, mem.userCallName, mem.nongnamName, affectionScore]);

`;

addOnce(
  "status useEffect",
  /โหลดสถานะจริงจากเวลาเครื่องผู้ใช้ตอนเปิดหน้า chat/,
  s => {
    const marker = "  const effectiveOutfits = useMemo";
    if (!s.includes(marker)) return s;
    return s.replace(marker, statusEffect + marker);
  }
);

/** 4) แสดง visibleStatus ใต้ชื่อ */
src = src.replace(
  '<div><b>{mem.nongnamName}</b><small>● พร้อมคุยกับ{mem.userCallName}แล้ว</small></div>',
  '<div><b>{mem.nongnamName}</b><small>{visibleStatus?.displayText || `● พร้อมคุยกับ${mem.userCallName}แล้ว`}</small></div>'
);

/** 5) รับ visibleStatus จาก /api/chat response */
addOnce(
  "setVisibleStatus from /api/chat response",
  /data\?\.visibleStatus\)\s*setVisibleStatus\(data\.visibleStatus\)/,
  s => s.replace(
    'source = data?.source || "unknown";',
    'source = data?.source || "unknown";\n          if (data?.visibleStatus) setVisibleStatus(data.visibleStatus);\n          console.log("[NongNam chat v8.4]", { source, clientTime: data?.clientTime, visibleStatus: data?.visibleStatus });'
  )
);

/** 6) ตรวจว่า /api/chat payload มี getClientTimePayload */
if (!/body:\s*JSON\.stringify\(v8Payload\)/.test(src)) {
  console.log("⚠️ ไม่พบ body: JSON.stringify(v8Payload) — โปรดเช็ก fetch /api/chat เอง");
}

if (!/\.\.\.getClientTimePayload\(\)/.test(src)) {
  console.log("❌ page.tsx ยังไม่มี ...getClientTimePayload() ใน payload");
  console.log("   ต้องใส่ใน payload ที่ส่ง /api/chat และ /api/status");
} else {
  console.log("✅ found ...getClientTimePayload()");
}

/** 7) อัปเดต version */
src = src.replace(
  /const APP_VERSION = "([^"]+)";/,
  'const APP_VERSION = "$1 + v8.4-status-time-ui";'
);

fs.writeFileSync(pagePath, src);
console.log("\n✅ Done: patched app/page.tsx");
console.log("ต่อไปให้ commit app/page.tsx แล้ว deploy ใหม่");
console.log("ถ้ายังเห็น ● พร้อมคุยกับพี่แล้ว แปลว่ายังไม่ได้ deploy หรือ browser cache ยังเก่า");
