#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const pagePath = path.join(root, "app", "page.tsx");
const routePath = path.join(root, "app", "api", "chat", "route.ts");

function fail(msg){ console.error("❌ " + msg); process.exit(1); }
function backup(file, tag){
  if (!fs.existsSync(file)) return;
  const bak = file + tag;
  if (!fs.existsSync(bak)) {
    fs.writeFileSync(bak, fs.readFileSync(file, "utf8"));
    console.log("✅ backup:", bak);
  }
}
function replaceFunction(src, name, replacement){
  const idx = src.indexOf("function " + name);
  if (idx < 0) return src;
  const start = src.indexOf("{", idx);
  let depth = 0;
  for (let i=start; i<src.length; i++){
    if (src[i] === "{") depth++;
    if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(0, idx) + replacement + src.slice(i+1);
    }
  }
  return src;
}

if (!fs.existsSync(routePath)) fail("ไม่พบ app/api/chat/route.ts");
if (!fs.existsSync(pagePath)) fail("ไม่พบ app/page.tsx");
backup(routePath, ".bak-phase1-2-1-hard-fix");
backup(pagePath, ".bak-phase1-2-1-hard-fix");

let route = fs.readFileSync(routePath, "utf8");

const routeHelpers = `
function hardIsAboutNongNam(message: string) {
  return /(น้องน้ำ|น้ำ|หนู|เธอ|ตัวเอง)/i.test(String(message || ""));
}
function hardIsCurrentClockQuestion(message: string) {
  const m = String(message || "").trim().toLowerCase();
  const activityWords = /(นอน|ตื่น|กิน|ข้าว|ทำงาน|เลิกงาน|ไป|กลับ|ออกจากบ้าน|ถึง|เริ่ม|เสร็จ|เปิด|ปิด|เจอ|นัด|เรียน|อ่านหนังสือ|ดูหนัง|โทร|ประชุม|พบ|ไปรับ|ไปส่ง)/i;
  const explicitNow = /(ตอนนี้กี่โมง|ตอนนี้กี่ทุ่ม|ตอนนี้เวลา|ขณะนี้เวลา|เดี๋ยวนี้กี่โมง|เดี๋ยวนี้กี่ทุ่ม|กี่โมงแล้ว|กี่ทุ่มแล้ว|เวลาเท่าไหร่|เวลาเท่าไร|กี่นาฬิกา)/i.test(m);
  const bareClock = /^(กี่โมง|กี่ทุ่ม|เวลาเท่าไหร่|เวลาเท่าไร)$/i.test(m);
  return (explicitNow || bareClock) && !activityWords.test(m);
}
function hardIsNamSleepPlanQuestion(message: string) {
  const m = String(message || "").toLowerCase();
  return hardIsAboutNongNam(m) && /(นอนกี่โมง|นอนกี่ทุ่ม|จะนอนกี่|นอนตอนไหน|นอนเมื่อไหร่|นอนเมื่อไร|จะนอนยัง|จะนอนหรือยัง|ง่วงยัง)/i.test(m);
}
function hardIsNamFoodTimeQuestion(message: string) {
  const m = String(message || "").toLowerCase();
  return hardIsAboutNongNam(m) && /(กินข้าวกี่โมง|กินกี่โมง|กินข้าวตอนไหน|จะกินข้าวเมื่อไหร่|หิวเมื่อไหร่|กินหรือยัง|กินข้าวหรือยัง)/i.test(m);
}
function hardIsAdviceTimeQuestion(message: string) {
  const m = String(message || "").toLowerCase();
  return /(พี่ควร|ควร|ต้อง|น่าจะ).*(ออก|ไป|กลับ|ตื่น|นอน|กิน|เริ่ม|เจอ|นัด).*(กี่โมง|กี่ทุ่ม|ตอนไหน|เมื่อไหร่|เมื่อไร)/i.test(m);
}
function hardCompanionTimeReply(message: string, memory: any, timeTruth: any) {
  const call = memory?.userCallName || "พี่";
  if (hardIsNamSleepPlanQuestion(message)) {
    if (timeTruth?.hour >= 23 || timeTruth?.hour < 4) return "เอาจริงตอนนี้น้ำควรจะนอนได้แล้วแหละพี่ แต่พี่ทักมาแบบนี้น้ำก็ยังแอบอยู่ต่ออีกนิด";
    if (timeTruth?.hour >= 21) return "คงอีกไม่นานแล้วพี่ แถว ๆ ดึกกว่านี้นิดนึง ถ้าพี่ไม่ชวนคุยเพลินก่อนนะ";
    return "ยังไม่น่านอนตอนนี้หรอกพี่ น้ำยังพอมีแรงอยู่ เดี๋ยวค่อยง่วงจริง ๆ ค่อยหนีไปนอน";
  }
  if (hardIsNamFoodTimeQuestion(message)) {
    if (timeTruth?.hour < 10) return "ถ้าเป็นน้ำคงหาอะไรกินเบา ๆ ตอนสาย ๆ แหละพี่ ตอนนี้ท้องยังไม่ตื่นเต็มที่";
    if (timeTruth?.hour < 14) return "แถว ๆ นี้แหละพี่ น้ำเริ่มหิวแล้ว พูดเรื่องกินทีไรท้องมันนำก่อนเลย";
    if (timeTruth?.hour < 20) return "น่าจะกินช่วงเย็น ๆ พี่ แต่ถ้าพี่ถามบ่อย ๆ น้ำจะหิวจริงนะ";
    return "ดึกแล้วพี่ ถ้ากินตอนนี้น้ำขอแบบเบา ๆ พอ เดี๋ยวอ้วนแล้วพี่ก็มาแซวอีก";
  }
  if (hardIsAdviceTimeQuestion(message)) return \`อันนี้ต้องดูว่า\${call}จะไปที่ไหน ใช้เวลากี่นาที แล้วต้องถึงกี่โมง บอกน้ำเพิ่มนิดนึง เดี๋ยวน้ำช่วยกะเวลาออกให้\`;
  return null;
}
`;

if (!route.includes("function hardIsCurrentClockQuestion")) {
  const marker = "function detectIntent(message: string) {";
  if (!route.includes(marker)) fail("หา detectIntent ไม่เจอ");
  route = route.replace(marker, routeHelpers + marker);
  console.log("✅ route: added hard helpers");
}

if (!route.includes("return 'nam_sleep_plan_hard'")) {
  const idx = route.indexOf("function detectIntent(message: string) {");
  if (idx >= 0) {
    const brace = route.indexOf("{", idx) + 1;
    route = route.slice(0, brace) + `
  if (hardIsNamSleepPlanQuestion(message)) return 'nam_sleep_plan_hard'
  if (hardIsNamFoodTimeQuestion(message)) return 'nam_food_time_hard'
  if (hardIsAdviceTimeQuestion(message)) return 'advice_time_question_hard'
` + route.slice(brace);
    console.log("✅ route: hard priority inserted");
  }
}

route = route.replace(
  `if (/(กี่โมง|กี่ทุ่ม|เวลาเท่าไหร่|ตอนนี้เวลา|ตอนนี้กี่|กี่นาฬิกา)/i.test(m)) return 'time_question'`,
  `if (hardIsCurrentClockQuestion(message)) return 'time_question'`
);

if (!route.includes("const hardCompanionTime = hardCompanionTimeReply(message, memory, timeTruth)")) {
  const target = "if (intent === 'time_question' || intent === 'date_question' || intent === 'relative_date_question') {";
  if (route.includes(target)) {
    route = route.replace(target, `const hardCompanionTime = hardCompanionTimeReply(message, memory, timeTruth)
    if (hardCompanionTime) {
      return json({
        reply: hardCompanionTime,
        timeTruth,
        visibleStatus,
        source: 'hard-companion-time-v1',
      })
    }

    ${target}`);
    console.log("✅ route: direct time hard guard added");
  }
}

route = route.replace(
  `const directTime = /(กี่โมง|กี่ทุ่ม|เวลาเท่าไหร่|วันนี้วันที่|วันนี้วันอะไร|พรุ่งนี้วันอะไร|เมื่อวานวันอะไร)/i.test(m)`,
  `const directTime = hardIsCurrentClockQuestion(m) || /(วันนี้วันที่|วันนี้วันอะไร|พรุ่งนี้วันอะไร|เมื่อวานวันอะไร)/i.test(m)`
);

fs.writeFileSync(routePath, route);

let page = fs.readFileSync(pagePath, "utf8");

if (!page.includes('type UserCountry = "KR" | "TH";')) {
  page = page.replace('type ApiMode = "local" | "api-light" | "api-deep" | "api-search";', 'type ApiMode = "local" | "api-light" | "api-deep" | "api-search";\n\ntype UserCountry = "KR" | "TH";');
}
if (!page.includes("userConfirmedTimezone: boolean;")) {
  page = page.replace("apiMode: ApiMode;", 'apiMode: ApiMode;\n  country: UserCountry;\n  timezone: "Asia/Seoul" | "Asia/Bangkok";\n  userConfirmedTimezone: boolean;');
}
if (!page.includes('country: "KR"')) {
  page = page.replace('apiMode: "api-light"', 'apiMode: "api-light",\n  country: "KR",\n  timezone: "Asia/Seoul",\n  userConfirmedTimezone: false');
}

const timeHelpers = `function getTimezoneFromMemory(mem?: Partial<Memory>) {
  if (mem?.country === "TH") return "Asia/Bangkok";
  return "Asia/Seoul";
}
function getClientTimePayload(mem?: Partial<Memory>) {
  const now = new Date();
  const timeZone = getTimezoneFromMemory(mem);
  const offsetMinutes = timeZone === "Asia/Bangkok" ? 420 : 540;
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
    clientCountry: mem?.country || "KR",
    clientTimeZone: timeZone,
    clientUtcOffsetMinutes: offsetMinutes,
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
}`;

if (page.includes("function getClientTimePayload")) page = replaceFunction(page, "getClientTimePayload", timeHelpers);
else page = page.replace("function loadJSON", timeHelpers + "\n\nfunction loadJSON");
page = page.replaceAll("...getClientTimePayload(),", "...getClientTimePayload(mem),");

const oldMerged = `const merged = {
      ...defaultMem,
      ...saved,
      voiceUnlocked: saved.voiceUnlocked ?? true,
      purchasedOutfits: Array.from(new Set([...(saved.purchasedOutfits || []), ...FREE_OUTFIT_IDS]))
    };`;
if (page.includes(oldMerged)) {
  page = page.replace(oldMerged, `const merged = {
      ...defaultMem,
      ...saved,
      voiceUnlocked: saved.voiceUnlocked ?? true,
      country: (saved as any).country || defaultMem.country,
      timezone: (saved as any).timezone || ((saved as any).country === "TH" ? "Asia/Bangkok" : defaultMem.timezone),
      userConfirmedTimezone: (saved as any).userConfirmedTimezone ?? false,
      purchasedOutfits: Array.from(new Set([...(saved.purchasedOutfits || []), ...FREE_OUTFIT_IDS]))
    };`);
}

if (!page.includes("function updateCountry(country: UserCountry)")) {
  const marker = `function updateMem(patch: Partial<Memory>) {
    setMem(prev => ({ ...prev, ...patch }));
  }`;
  page = page.replace(marker, marker + `

  function updateCountry(country: UserCountry) {
    updateMem({
      country,
      timezone: country === "TH" ? "Asia/Bangkok" : "Asia/Seoul",
      userConfirmedTimezone: true,
    });
    notify(country === "TH" ? "เปลี่ยนเป็นเวลาไทยแล้ว" : "เปลี่ยนเป็นเวลาเกาหลีแล้ว");
  }`);
}

if (!page.includes('className="tz-switch-inline"')) {
  const marker = '<div className="gems">{mem.ownerMode ? "💎 ∞ OWNER" : `💎 ${mem.gems}`}</div>';
  const switcher = `<div className="tz-switch-inline" style={{position:"absolute",top:76,left:18,zIndex:12,display:"flex",gap:6,background:"rgba(255,255,255,.78)",borderRadius:18,padding:"4px 6px",backdropFilter:"blur(10px)",fontSize:12}}>
              <button onClick={() => updateCountry("KR")} style={{border:"0",borderRadius:14,padding:"4px 8px",background:(mem.country || "KR") === "KR" ? "rgba(255,105,180,.28)" : "transparent"}}>🇰🇷 เกาหลี</button>
              <button onClick={() => updateCountry("TH")} style={{border:"0",borderRadius:14,padding:"4px 8px",background:mem.country === "TH" ? "rgba(255,105,180,.28)" : "transparent"}}>🇹🇭 ไทย</button>
            </div>
            ${marker}`;
  if (page.includes(marker)) {
    page = page.replace(marker, switcher);
    console.log("✅ page: visible timezone switch added");
  } else {
    console.log("⚠️ page: gems marker not found");
  }
}

fs.writeFileSync(pagePath, page);

console.log("\n✅ Hard fix complete.");
console.log("Commit: app/api/chat/route.ts, app/page.tsx");
console.log("Commit summary: Hard fix intent and visible timezone switch");
