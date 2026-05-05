#!/usr/bin/env node
/**
 * Minimal patch for current v8 app/page.tsx
 * - adds getClientTimePayload() using Asia/Seoul
 * - sends new client time fields to /api/chat
 * - receives visibleStatus from /api/chat
 * - displays visibleStatus under Nong Nam name
 *
 * Run from project root:
 *   node scripts/patch-current-page-minimal-time-status.js
 */

const fs = require("fs");
const path = require("path");

const pagePath = path.join(process.cwd(), "app", "page.tsx");
if (!fs.existsSync(pagePath)) {
  console.error("❌ ไม่พบ app/page.tsx — ต้องรันที่ root โปรเจกต์");
  process.exit(1);
}

let src = fs.readFileSync(pagePath, "utf8");
const backup = pagePath + ".bak-current-minimal-time-status";
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, src);
  console.log("✅ backup:", backup);
}

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

if (!src.includes("function getClientTimePayload")) {
  src = src.replace("function loadJSON", helper + "function loadJSON");
  console.log("✅ added getClientTimePayload()");
}

src = src.replace(
  'const [status, setStatus] = useState<"idle" | "thinking" | "speaking" | "recording">("idle");',
  'const [status, setStatus] = useState<"idle" | "thinking" | "speaking" | "recording">("idle");\n  const [visibleStatus, setVisibleStatus] = useState<any>(null);'
);

src = src.replace(
  'clientTimestamp: new Date().toISOString(),\n            clientNonce: `${Date.now()}-${Math.random().toString(36).slice(2)}`,',
  'clientNonce: `${Date.now()}-${Math.random().toString(36).slice(2)}`,\n            ...getClientTimePayload(),'
);

src = src.replace(
  'source = data?.source || "unknown";',
  'source = data?.source || "unknown";\n          if (data?.visibleStatus) setVisibleStatus(data.visibleStatus);'
);

src = src.replace(
  '<div><b>{mem.nongnamName}</b><small>● พร้อมคุยกับ{mem.userCallName}แล้ว</small></div>',
  '<div><b>{mem.nongnamName}</b><small>{visibleStatus?.displayText || `● พร้อมคุยกับ${mem.userCallName}แล้ว`}</small></div>'
);

fs.writeFileSync(pagePath, src);
console.log("✅ Done. Commit app/page.tsx แล้ว deploy ใหม่");
console.log("Rollback:");
console.log("  cp app/page.tsx.bak-current-minimal-time-status app/page.tsx");
