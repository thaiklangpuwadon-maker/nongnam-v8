#!/usr/bin/env node
/**
 * Nong Nam — Minimal Page Time + VisibleStatus Patch
 * --------------------------------------------------
 * ใช้กับไฟล์ app/page.tsx ตัวเดิมที่พี่กำลังใช้และรู้สึกว่า "พูดเหมือนคนกว่า"
 *
 * คำสั่ง:
 *   node scripts/patch-page-minimal-time-status.js
 *
 * สิ่งที่แก้:
 * 1) เพิ่ม getClientTimePayload() แบบบังคับ Asia/Seoul
 * 2) เปลี่ยน v8Payload จาก clientTimestamp เก่า เป็น ...getClientTimePayload()
 * 3) เพิ่ม visibleStatus state
 * 4) รับ visibleStatus จาก /api/chat response
 * 5) แสดง visibleStatus.displayText ใต้ชื่อ
 *
 * สิ่งที่ไม่แตะ:
 * - localReply
 * - init greeting
 * - prompt
 * - route
 * - บุคลิก
 * - ต้นไม้
 */

const fs = require("fs");
const path = require("path");

const pagePath = path.join(process.cwd(), "app", "page.tsx");

function stop(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

if (!fs.existsSync(pagePath)) {
  stop("ไม่พบ app/page.tsx — ต้องรันคำสั่งนี้ที่ root โปรเจกต์ nongnam-v8");
}

let src = fs.readFileSync(pagePath, "utf8");

const backup = pagePath + ".bak-minimal-time-status";
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
  if (next === src) {
    console.log("⚠️ not patched:", label);
  } else {
    src = next;
    console.log("✅ patched:", label);
  }
}

/* 1) เพิ่ม getClientTimePayload() ถ้ายังไม่มี */
const helper = `
/**
 * getClientTimePayload — minimal fixed version
 * บังคับใช้เวลาเกาหลี Asia/Seoul
 * ส่ง field ให้ตรงกับ app/api/chat/route.ts เวอร์ชันใหม่
 */
function getClientTimePayload() {
  const now = new Date();
  const timeZone = "Asia/Seoul";

  const clientTimeText = now.toLocaleTimeString("th-TH", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const clientDateText = now.toLocaleDateString("th-TH", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find(p => p.type === type)?.value || "";

  const clientYear = Number(get("year"));
  const clientMonth = Number(get("month"));
  const clientDate = Number(get("day"));
  const rawHour = Number(get("hour"));
  const clientHour = rawHour === 24 ? 0 : rawHour;
  const clientMinute = Number(get("minute"));
  const clientSecond = Number(get("second"));

  const seoulDateForDay = new Date(Date.UTC(clientYear, clientMonth - 1, clientDate));
  const clientDayOfWeek = seoulDateForDay.getUTCDay();

  return {
    clientTimestampMs: now.getTime(),
    clientNowISO: now.toISOString(),

    clientTimeZone: timeZone,
    clientUtcOffsetMinutes: 540,

    clientHour,
    clientMinute,
    clientSecond,
    clientDayOfWeek,
    clientYear,
    clientMonth,
    clientDate,

    clientTimeText,
    clientDateText,
    clientDateTimeText: \`\${clientDateText} เวลา \${clientTimeText}\`,
  };
}

`;

patch(
  "getClientTimePayload helper",
  /function\s+getClientTimePayload\s*\(/,
  s => {
    const marker = "function loadJSON";
    if (!s.includes(marker)) return s;
    return s.replace(marker, helper + marker);
  }
);

/* 2) เพิ่ม visibleStatus state */
patch(
  "visibleStatus state",
  /const\s+\[visibleStatus,\s*setVisibleStatus\]/,
  s => s.replace(
    'const [status, setStatus] = useState<"idle" | "thinking" | "speaking" | "recording">("idle");',
    'const [status, setStatus] = useState<"idle" | "thinking" | "speaking" | "recording">("idle");\n  const [visibleStatus, setVisibleStatus] = useState<any>(null);'
  )
);

/* 3) เปลี่ยน payload จาก clientTimestamp เก่า เป็น getClientTimePayload */
const oldPayload = `clientTimestamp: new Date().toISOString(),
            clientNonce: \`\${Date.now()}-\${Math.random().toString(36).slice(2)}\`,`;

const newPayload = `clientNonce: \`\${Date.now()}-\${Math.random().toString(36).slice(2)}\`,
            ...getClientTimePayload(),`;

if (src.includes(oldPayload)) {
  src = src.replace(oldPayload, newPayload);
  console.log("✅ patched: replace old clientTimestamp payload");
} else if (src.includes("...getClientTimePayload()")) {
  console.log("✅ already: payload has ...getClientTimePayload()");
} else {
  console.log("⚠️ not patched: old clientTimestamp payload pattern not found");
  console.log("   ให้เช็กใน v8Payload เองว่ามี ...getClientTimePayload() แล้วหรือยัง");
}

/* 4) รับ visibleStatus จาก /api/chat response */
patch(
  "setVisibleStatus from /api/chat",
  /setVisibleStatus\(data\.visibleStatus\)/,
  s => s.replace(
    'source = data?.source || "unknown";',
    'source = data?.source || "unknown";\n          if (data?.visibleStatus) setVisibleStatus(data.visibleStatus);'
  )
);

/* 5) แสดง visibleStatus ใต้ชื่อ */
const oldTopbar = '<div><b>{mem.nongnamName}</b><small>● พร้อมคุยกับ{mem.userCallName}แล้ว</small></div>';
const newTopbar = '<div><b>{mem.nongnamName}</b><small>{visibleStatus?.displayText || `● พร้อมคุยกับ${mem.userCallName}แล้ว`}</small></div>';

if (src.includes(oldTopbar)) {
  src = src.replace(oldTopbar, newTopbar);
  console.log("✅ patched: topbar visibleStatus");
} else if (src.includes("visibleStatus?.displayText")) {
  console.log("✅ already: topbar uses visibleStatus");
} else {
  console.log("⚠️ not patched: topbar exact pattern not found");
  console.log("   หา <small>● พร้อมคุยกับ... แล้วเปลี่ยนเป็น visibleStatus?.displayText เอง");
}

/* 6) เพิ่ม version เฉพาะบอกสถานะ ไม่กระทบ logic */
src = src.replace(/const APP_VERSION = "([^"]+)";/, (m, v) => {
  if (v.includes("minimal-time-status")) return m;
  return `const APP_VERSION = "${v} + minimal-time-status";`;
});

fs.writeFileSync(pagePath, src);

console.log("\n✅ Done: minimal patch applied to app/page.tsx");
console.log("ต่อไป commit app/page.tsx แล้ว deploy ใหม่");
console.log("ถ้าต้อง rollback:");
console.log("  cp app/page.tsx.bak-minimal-time-status app/page.tsx");
