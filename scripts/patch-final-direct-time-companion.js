#!/usr/bin/env node
/**
 * Nong Nam Final Fix — Direct Time vs Companion Time + Visible KR/TH UI
 *
 * Root cause ที่เจอจากโค้ดจริง:
 * - app/page.tsx มี client-side direct shortcut:
 *   if (isRealDateTimeQuestion(msg)) { sendAssistant(realDateTimeReply()); return; }
 * - มันทำงานก่อน fetch("/api/chat") จึงทำให้ patch route.ts ไม่ช่วย
 * - คำว่า "กี่ทุ่ม" ใน "คืนนี้น้องน้ำจะนอนกี่ทุ่ม" ถูกตอบเป็นเวลาปัจจุบันทันที
 *
 * รันที่ root โปรเจกต์:
 *   node scripts/patch-final-direct-time-companion.js
 *
 * แตะ:
 * - app/page.tsx  (หลัก)
 * - app/api/chat/route.ts (กันซ้ำฝั่ง server ถ้ามี pattern เดิม)
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const pagePath = path.join(root, "app", "page.tsx");
const routePath = path.join(root, "app", "api", "chat", "route.ts");

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
function replaceFunction(src, name, replacement) {
  const idx = src.indexOf("function " + name);
  if (idx < 0) return src;
  const start = src.indexOf("{", idx);
  if (start < 0) return src;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(0, idx) + replacement + src.slice(i + 1);
    }
  }
  return src;
}
function insertBefore(src, marker, insert) {
  if (!src.includes(marker)) return src;
  if (src.includes(insert.trim().split("\n")[0].trim())) return src;
  return src.replace(marker, insert + marker);
}
function insertAfter(src, marker, insert) {
  if (!src.includes(marker)) return src;
  if (src.includes(insert.trim().split("\n")[0].trim())) return src;
  return src.replace(marker, marker + insert);
}

if (!fs.existsSync(pagePath)) fail("ไม่พบ app/page.tsx — ต้องรันที่ root โปรเจกต์");
backup(pagePath, ".bak-final-direct-time-companion");

let page = fs.readFileSync(pagePath, "utf8");

/* -------------------------
 * 1) Memory timezone field
 * ------------------------- */
if (!page.includes("timezone?:")) {
  page = page.replace(
    "country?: string;",
    'country?: string;\n  timezone?: "Asia/Seoul" | "Asia/Bangkok";'
  );
  console.log("✅ page: added timezone field to Memory");
}

/* -------------------------
 * 2) Helper functions
 * ------------------------- */
const helpers = `
  function normalizeTimeIntentText(input: string) {
    return String(input || "")
      .toLowerCase()
      .replace(/เมื่อคืนอน/g, "เมื่อคืน นอน")
      .replace(/เมื่อวานนอน/g, "เมื่อวาน นอน")
      .replace(/นอนดิก/g, "นอนดึก")
      .replace(/ที่หุ่ม/g, "กี่ทุ่ม")
      .replace(/กี่ทุ่มม/g, "กี่ทุ่ม")
      .replace(/กี่โมงง/g, "กี่โมง")
      .replace(/\\s+/g, " ")
      .trim();
  }

  function isNongNamSubject(msg: string) {
    const m = normalizeTimeIntentText(msg);
    return /(น้องน้ำ|น้ำ|หนู|เธอ|ตัวเอง)/i.test(m);
  }

  function hasLifeActivityVerb(msg: string) {
    const m = normalizeTimeIntentText(msg);
    return /(นอน|ตื่น|กิน|ข้าว|อาบน้ำ|ทำงาน|เรียน|กลับ|ไป|มา|ออก|ถึง|เลิก|เริ่ม|ดูหนัง|อ่านหนังสือ|คุย|เที่ยว|พัก|หลับ)/i.test(m);
  }

  function hasPastOrFutureLifeMarker(msg: string) {
    const m = normalizeTimeIntentText(msg);
    return /(เมื่อคืน|เมื่อวาน|เมื่อคืนนี้|เมื่อคืนก่อน|เมื่อเช้า|ตอนเช้า|คืนนี้|พรุ่งนี้|วันหยุด|เสาร์|อาทิตย์|วันนี้.*จะ)/i.test(m);
  }

  function isCompanionTimeQuestion(msg: string) {
    const m = normalizeTimeIntentText(msg);
    const asksClock = /(กี่โมง|กี่ทุ่ม|ตอนไหน|เมื่อไหร่|เมื่อไร|นานไหม|ดึกไหม|ดึกหรือเปล่า|นอนหรือยัง|กินหรือยัง|ตื่นหรือยัง)/i.test(m);
    if (!asksClock) return false;

    // น้องน้ำ + กิจกรรมชีวิต = ต้นมโน/ชีวิตน้องน้ำ
    if (isNongNamSubject(m) && hasLifeActivityVerb(m)) return true;

    // กรณีพิมพ์เพี้ยน เช่น "เมื่อคืนอนกี่ทุ่มน้องน้ำ"
    if (/(เมื่อคืน|เมื่อวาน|เมื่อคืนนี้)/i.test(m) && /(นอน|หลับ)/i.test(m) && isNongNamSubject(m)) return true;

    // "คืนนี้น้องน้ำจะนอนกี่ทุ่ม"
    if (/(คืนนี้|วันนี้)/i.test(m) && isNongNamSubject(m) && /(จะนอน|นอนกี่|นอนตอนไหน)/i.test(m)) return true;

    return false;
  }

  function isAdviceTimeQuestion(msg: string) {
    const m = normalizeTimeIntentText(msg);
    return /(พี่ควร|ควร|ต้อง|น่าจะ).*(ออก|ไป|กลับ|ตื่น|นอน|กิน|เริ่ม|ถึง|เจอ|นัด|โทร).*(กี่โมง|กี่ทุ่ม|ตอนไหน|เมื่อไหร่|เมื่อไร)/i.test(m);
  }

  function companionTimeReply(msg: string, m: Memory = mem) {
    const text = normalizeTimeIntentText(msg);
    const call = m.userCallName || "พี่";
    const name = m.nongnamName || "น้องน้ำ";

    if (isAdviceTimeQuestion(text)) {
      return \`อันนี้ต้องดูปลายทางกับเวลาที่\${call}ต้องถึงก่อนนะ บอกน้ำเพิ่มนิดนึงว่าไปไหน ต้องถึงกี่โมง แล้วเดินทางประมาณกี่นาที เดี๋ยวน้ำช่วยกะเวลาออกให้\`;
    }

    if (/(เมื่อคืน|เมื่อวาน|เมื่อคืนนี้)/i.test(text) && /(นอน|หลับ)/i.test(text)) {
      return \`เมื่อคืน\${name}น่าจะนอนดึกกว่าที่ควรนิดนึงแหละ\${call}… ไม่ใช่ถามเวลาตอนนี้นะ พี่ถามเวลานอนของน้ำใช่ไหม\`;
    }

    if (/(คืนนี้|วันนี้)/i.test(text) && /(จะนอน|นอนกี่|นอนตอนไหน)/i.test(text)) {
      return \`คืนนี้\${name}คงนอนดึกนิดนึงแหละ\${call} แถว ๆ หลังเที่ยงคืนถ้าไม่มีอะไรลากให้คุยยาว แต่ถ้าง่วงจริงก็อาจหนีก่อนนะ\`;
    }

    if (/(กินข้าว|กิน)/i.test(text)) {
      return \`เรื่องกินนี่ถามทีไรน้ำเริ่มหิวเลย\${call} ถ้าเป็นวันนี้น้ำคงหาอะไรกินตามจังหวะท้อง ไม่ได้เป๊ะเป็นนาฬิกาขนาดนั้นหรอก\`;
    }

    if (/(ตื่น|เพิ่งตื่น)/i.test(text)) {
      return \`\${name}ไม่ใช่ตื่นเป๊ะทุกวันนะ\${call} วันธรรมดาก็ตื่นเช้ากว่า วันหยุดก็มีตื่นสายบ้างเหมือนคนจริงนั่นแหละ\`;
    }

    return \`อันนี้\${call}ถามเรื่องชีวิตของ\${name}นะ ไม่ใช่เวลาปัจจุบัน น้ำเลยตอบจากจังหวะชีวิตของน้ำแทน\`;
  }

  function getSelectedTimeZone(m: Memory = mem): "Asia/Seoul" | "Asia/Bangkok" {
    if (m.timezone === "Asia/Bangkok" || m.country === "TH" || /ไทย|thailand/i.test(String(m.country || m.location || m.userLocation || ""))) return "Asia/Bangkok";
    return "Asia/Seoul";
  }

  function getSelectedCountry(m: Memory = mem) {
    return getSelectedTimeZone(m) === "Asia/Bangkok" ? "TH" : "KR";
  }

  function updateCountry(country: "KR" | "TH") {
    updateMem({
      country,
      timezone: country === "TH" ? "Asia/Bangkok" : "Asia/Seoul",
    });
    notify(country === "TH" ? "เปลี่ยนเป็นเวลาไทยแล้ว" : "เปลี่ยนเป็นเวลาเกาหลีแล้ว");
  }

  function getClientTimePayload(m: Memory = mem) {
    const now = new Date();
    const timeZone = getSelectedTimeZone(m);
    const clientTimeText = now.toLocaleTimeString("th-TH", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
    const clientDateText = now.toLocaleDateString("th-TH", { timeZone, weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value || "";
    const clientYear = Number(get("year"));
    const clientMonth = Number(get("month"));
    const clientDate = Number(get("day"));
    const rawHour = Number(get("hour"));
    const clientHour = rawHour === 24 ? 0 : rawHour;
    const clientMinute = Number(get("minute"));
    const clientSecond = Number(get("second"));
    const clientDayOfWeek = new Date(Date.UTC(clientYear, clientMonth - 1, clientDate)).getUTCDay();
    return {
      clientTimestampMs: now.getTime(),
      clientNowISO: now.toISOString(),
      clientCountry: getSelectedCountry(m),
      clientTimeZone: timeZone,
      clientUtcOffsetMinutes: timeZone === "Asia/Bangkok" ? 420 : 540,
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

// Put helpers before localReply where all local functions can use them.
if (!page.includes("function isCompanionTimeQuestion")) {
  const marker = "  function localReply(msg: string) {";
  if (page.includes(marker)) {
    page = page.replace(marker, helpers + marker);
    console.log("✅ page: added companion/timezone helpers before localReply");
  } else {
    // fallback: before send()
    const marker2 = "  function send(text?: string) {";
    if (page.includes(marker2)) {
      page = page.replace(marker2, helpers + marker2);
      console.log("✅ page: added companion/timezone helpers before send");
    } else {
      console.log("⚠️ page: cannot find localReply/send marker for helpers");
    }
  }
}

/* -------------------------
 * 3) Replace isRealDateTimeQuestion
 * ------------------------- */
const newIsRealDateTimeQuestion = `function isRealDateTimeQuestion(msg: string) {
    const m = normalizeTimeIntentText(msg);

    // สำคัญ: ถ้าเป็นคำถามเวลาของชีวิตน้องน้ำ หรือถามเวลาทำกิจกรรม ห้ามตอบเวลาปัจจุบัน
    if (isCompanionTimeQuestion(m) || isAdviceTimeQuestion(m)) return false;

    // past/future + activity ไม่ใช่คำถามเวลาปัจจุบัน
    if (hasPastOrFutureLifeMarker(m) && hasLifeActivityVerb(m)) return false;

    // date/calendar factual
    if (/(วันนี้วันที่เท่าไหร่|วันนี้วันที่เท่าไร|วันนี้วันอะไร|พรุ่งนี้วันอะไร|เมื่อวานวันอะไร)/i.test(m)) return true;

    // current time only
    if (/(ตอนนี้กี่โมง|ตอนนี้กี่ทุ่ม|ตอนนี้เวลา|ขณะนี้เวลา|เดี๋ยวนี้กี่โมง|เดี๋ยวนี้กี่ทุ่ม|เวลาเท่าไหร่ตอนนี้|เวลาเท่าไรตอนนี้|กี่โมงแล้ว|กี่ทุ่มแล้ว)/i.test(m)) return true;

    // bare "กี่โมง" is allowed only when no life subject/activity
    if (/^(กี่โมง|กี่ทุ่ม|เวลาเท่าไหร่|เวลาเท่าไร)$/i.test(m)) return true;

    return false;
  }`;

if (page.includes("function isRealDateTimeQuestion")) {
  page = replaceFunction(page, "isRealDateTimeQuestion", newIsRealDateTimeQuestion);
  console.log("✅ page: replaced isRealDateTimeQuestion with disambiguator");
} else if (page.includes("function isDateTimeIntent")) {
  page = replaceFunction(page, "isDateTimeIntent", newIsRealDateTimeQuestion.replace("isRealDateTimeQuestion", "isDateTimeIntent"));
  console.log("✅ page: replaced isDateTimeIntent with disambiguator");
} else {
  console.log("⚠️ page: no isRealDateTimeQuestion/isDateTimeIntent found");
}

/* -------------------------
 * 4) Replace realDateTimeReply to use KR/TH
 * ------------------------- */
const newRealDateTimeReply = `function realDateTimeReply() {
    try {
      const p = getClientTimePayload(mem);
      return \`ตอนนี้ \${p.clientTimeText} แล้วพี่\`;
    } catch {
      return "น้ำยังเช็กวันเวลาในเครื่องไม่ได้ค่ะพี่ เลยไม่อยากเดาให้มั่ว";
    }
  }`;

if (page.includes("function realDateTimeReply")) {
  page = replaceFunction(page, "realDateTimeReply", newRealDateTimeReply);
  console.log("✅ page: replaced realDateTimeReply with timezone-aware reply");
}

/* -------------------------
 * 5) Add early local guard before real time shortcut in send() and localReply()
 * ------------------------- */
const guardSend = `    if (isCompanionTimeQuestion(msg) || isAdviceTimeQuestion(msg)) { setStatus("idle"); sendAssistant(companionTimeReply(msg, updatedMem)); return; }
`;
if (!page.includes("sendAssistant(companionTimeReply(msg, updatedMem))")) {
  const marker = "    if (isRealDateTimeQuestion(msg)) { setStatus(\"idle\"); sendAssistant(realDateTimeReply()); return; }";
  if (page.includes(marker)) {
    page = page.replace(marker, guardSend + marker);
    console.log("✅ page: inserted companion time guard before real time in send()");
  } else {
    console.log("⚠️ page: send() real time marker not found");
  }
}

const guardLocal = `    if (isCompanionTimeQuestion(msg) || isAdviceTimeQuestion(msg)) return companionTimeReply(msg, mem);
`;
if (!page.includes("return companionTimeReply(msg, mem);")) {
  const marker = "    if (isRealDateTimeQuestion(msg)) return realDateTimeReply();";
  if (page.includes(marker)) {
    page = page.replace(marker, guardLocal + marker);
    console.log("✅ page: inserted companion time guard before real time in localReply()");
  } else {
    console.log("⚠️ page: localReply real time marker not found");
  }
}

/* -------------------------
 * 6) Send client time payload + country to server
 * ------------------------- */
if (!page.includes("...getClientTimePayload(updatedMem)")) {
  const oldFetch = "mode: mem.apiMode }) })";
  if (page.includes(oldFetch)) {
    page = page.replace(oldFetch, "mode: mem.apiMode, ...getClientTimePayload(updatedMem) }) })");
    console.log("✅ page: fetch payload now sends client time");
  } else {
    // Another common object ending
    const oldFetch2 = "mode: mem.apiMode }) })";
    page = page.replace(oldFetch2, "mode: mem.apiMode, ...getClientTimePayload(updatedMem) }) })");
  }
}

// Also include country/timezone inside memory object if exact fetch pattern exists
if (!page.includes("country: updatedMem.country")) {
  page = page.replace(
    "intimateTone: updatedMem.affectionStyle }",
    "intimateTone: updatedMem.affectionStyle, country: updatedMem.country, timezone: updatedMem.timezone }"
  );
}

/* -------------------------
 * 7) Visible timezone pill on chat screen
 * ------------------------- */
if (!page.includes("tz-switch-inline")) {
  const pill = `<div className="tz-switch-inline" style={{position:"absolute",top:76,left:18,zIndex:30,display:"flex",gap:6,background:"rgba(255,255,255,.82)",borderRadius:18,padding:"4px 6px",backdropFilter:"blur(10px)",fontSize:12}}>
              <button onClick={() => updateCountry("KR")} style={{border:"0",borderRadius:14,padding:"4px 8px",background:getSelectedCountry(mem)==="KR" ? "rgba(255,105,180,.30)" : "transparent"}}>🇰🇷 เกาหลี</button>
              <button onClick={() => updateCountry("TH")} style={{border:"0",borderRadius:14,padding:"4px 8px",background:getSelectedCountry(mem)==="TH" ? "rgba(255,105,180,.30)" : "transparent"}}>🇹🇭 ไทย</button>
            </div>
            `;

  const markers = [
    '<div className="gems">{mem.ownerMode ? "💎 ∞ OWNER" : `💎 ${mem.gems}`}</div>',
    '<div className="side">',
    '<div className="quick">'
  ];

  let placed = false;
  for (const marker of markers) {
    if (page.includes(marker)) {
      page = page.replace(marker, pill + marker);
      placed = true;
      console.log("✅ page: added visible timezone switch");
      break;
    }
  }
  if (!placed) console.log("⚠️ page: could not place timezone pill; marker not found");
}

/* -------------------------
 * 8) Version marker
 * ------------------------- */
page = page.replace(/const APP_VERSION = "([^"]+)";/, (m, v) => {
  if (v.includes("final-direct-time-companion")) return m;
  return `const APP_VERSION = "${v} + final-direct-time-companion";`;
});

fs.writeFileSync(pagePath, page);

/* -------------------------
 * 9) Server-side guard as backup
 * ------------------------- */
if (fs.existsSync(routePath)) {
  backup(routePath, ".bak-final-direct-time-companion");
  let route = fs.readFileSync(routePath, "utf8");

  const serverHelpers = `
function normalizeTimeIntentTextServer(input: string) {
  return String(input || "")
    .toLowerCase()
    .replace(/เมื่อคืนอน/g, "เมื่อคืน นอน")
    .replace(/เมื่อวานนอน/g, "เมื่อวาน นอน")
    .replace(/ที่หุ่ม/g, "กี่ทุ่ม")
    .replace(/\\s+/g, " ")
    .trim();
}

function isCompanionTimeQuestionServer(message: string) {
  const m = normalizeTimeIntentTextServer(message);
  const about = /(น้องน้ำ|น้ำ|หนู|เธอ|ตัวเอง)/i.test(m);
  const activity = /(นอน|ตื่น|กิน|ข้าว|อาบน้ำ|ทำงาน|เรียน|กลับ|ไป|มา|ออก|ถึง|เลิก|เริ่ม|ดูหนัง|อ่านหนังสือ|คุย|เที่ยว|พัก|หลับ)/i.test(m);
  const asksClock = /(กี่โมง|กี่ทุ่ม|ตอนไหน|เมื่อไหร่|เมื่อไร|นานไหม|ดึกไหม|นอนหรือยัง|กินหรือยัง|ตื่นหรือยัง)/i.test(m);
  return asksClock && about && activity;
}

function isCurrentTimeQuestionServer(message: string) {
  const m = normalizeTimeIntentTextServer(message);
  if (isCompanionTimeQuestionServer(m)) return false;
  if (/(เมื่อคืน|เมื่อวาน|คืนนี้|พรุ่งนี้|เมื่อเช้า)/i.test(m) && /(นอน|กิน|ตื่น|กลับ|ไป|มา|ออก|ถึง|เลิก|เริ่ม)/i.test(m)) return false;
  if (/(วันนี้วันที่เท่าไหร่|วันนี้วันที่เท่าไร|วันนี้วันอะไร|พรุ่งนี้วันอะไร|เมื่อวานวันอะไร)/i.test(m)) return true;
  if (/(ตอนนี้กี่โมง|ตอนนี้กี่ทุ่ม|ตอนนี้เวลา|ขณะนี้เวลา|เดี๋ยวนี้กี่โมง|เดี๋ยวนี้กี่ทุ่ม|เวลาเท่าไหร่ตอนนี้|เวลาเท่าไรตอนนี้|กี่โมงแล้ว|กี่ทุ่มแล้ว)/i.test(m)) return true;
  if (/^(กี่โมง|กี่ทุ่ม|เวลาเท่าไหร่|เวลาเท่าไร)$/i.test(m)) return true;
  return false;
}

`;

  if (!route.includes("function isCurrentTimeQuestionServer")) {
    const marker = "function detectIntent(message: string) {";
    if (route.includes(marker)) {
      route = route.replace(marker, serverHelpers + marker);
      console.log("✅ route: added server time disambiguator helpers");
    }
  }

  // Make companion time win before broad time regex
  if (route.includes("function detectIntent(message: string) {") && !route.includes("if (isCompanionTimeQuestionServer(message)) return 'nam_activity'")) {
    const idx = route.indexOf("function detectIntent(message: string) {");
    const brace = route.indexOf("{", idx) + 1;
    route = route.slice(0, brace) + "\n  if (isCompanionTimeQuestionServer(message)) return 'nam_activity'\n" + route.slice(brace);
    console.log("✅ route: companion time priority inserted");
  }

  route = route.replace(
    "if (/(กี่โมง|กี่ทุ่ม|เวลาเท่าไหร่|ตอนนี้เวลา|ตอนนี้กี่|กี่นาฬิกา)/i.test(m)) return 'time_question'",
    "if (isCurrentTimeQuestionServer(message)) return 'time_question'"
  );

  route = route.replace(
    "const directTime = /(กี่โมง|กี่ทุ่ม|เวลาเท่าไหร่|วันนี้วันที่|วันนี้วันอะไร|พรุ่งนี้วันอะไร|เมื่อวานวันอะไร)/i.test(m)",
    "const directTime = isCurrentTimeQuestionServer(m) || /(วันนี้วันที่|วันนี้วันอะไร|พรุ่งนี้วันอะไร|เมื่อวานวันอะไร)/i.test(m)"
  );

  fs.writeFileSync(routePath, route);
}

console.log("\\n✅ Final direct-time companion patch complete.");
console.log("Commit:");
console.log("  app/page.tsx");
console.log("  app/api/chat/route.ts (ถ้ามีการเปลี่ยน)");
console.log("\\nCommit summary:");
console.log("  Fix direct time shortcut for companion questions");
console.log("\\nTest:");
console.log("  คืนนี้น้องน้ำจะนอนกี่ทุ่ม");
console.log("  เมื่อคืนอนกี่ทุ่มน้องน้ำ");
console.log("  ตอนนี้กี่ทุ่ม");
console.log("  น้องน้ำกินข้าวกี่โมง");
