#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const pagePath = path.join(process.cwd(), "app", "page.tsx");
const chatRoutePath = path.join(process.cwd(), "app", "api", "chat", "route.ts");
const statusRoutePath = path.join(process.cwd(), "app", "api", "status", "route.ts");

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

if (!fs.existsSync(pagePath)) fail("ไม่พบ app/page.tsx — ต้องรันที่ root โปรเจกต์");
backup(pagePath, ".bak-phase2-kr-th-timezone");

let src = fs.readFileSync(pagePath, "utf8");

if (!src.includes('type UserCountry = "KR" | "TH";')) {
  const marker = 'type ApiMode = "local" | "api-light" | "api-deep" | "api-search";';
  if (!src.includes(marker)) fail("หา type ApiMode ไม่เจอ");
  src = src.replace(marker, marker + '\n\ntype UserCountry = "KR" | "TH";');
  console.log("✅ added UserCountry type");
}

if (!src.includes("userConfirmedTimezone: boolean;")) {
  src = src.replace(
    "apiMode: ApiMode;",
    'apiMode: ApiMode;\n  country: UserCountry;\n  timezone: "Asia/Seoul" | "Asia/Bangkok";\n  userConfirmedTimezone: boolean;'
  );
  console.log("✅ added Memory timezone fields");
}

if (!src.includes('country: "KR"')) {
  src = src.replace(
    'apiMode: "api-light"',
    'apiMode: "api-light",\n  country: "KR",\n  timezone: "Asia/Seoul",\n  userConfirmedTimezone: false'
  );
  console.log("✅ added default KR timezone");
}

const timeHelpers = `function getTimezoneFromMemory(mem?: Partial<Memory>) {
  if (mem?.country === "TH") return "Asia/Bangkok";
  return "Asia/Seoul";
}

function getCountryFromTimezone(timezone: string): UserCountry {
  return timezone === "Asia/Bangkok" ? "TH" : "KR";
}

function getClientTimePayload(mem?: Partial<Memory>) {
  const now = new Date();
  const timeZone = getTimezoneFromMemory(mem);
  const offsetMinutes = timeZone === "Asia/Bangkok" ? 420 : 540;

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
  const clientDayOfWeek = new Date(Date.UTC(clientYear, clientMonth - 1, clientDate)).getUTCDay();

  return {
    clientTimestampMs: now.getTime(),
    clientNowISO: now.toISOString(),
    clientCountry: getCountryFromTimezone(timeZone),
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

if (src.includes("function getClientTimePayload")) {
  src = replaceFunction(src, "getClientTimePayload", timeHelpers);
  console.log("✅ replaced getClientTimePayload");
} else {
  src = src.replace("function loadJSON", timeHelpers + "\n\nfunction loadJSON");
  console.log("✅ added getClientTimePayload");
}

src = src.replaceAll("...getClientTimePayload(),", "...getClientTimePayload(mem),");

const oldMerged = `const merged = {
      ...defaultMem,
      ...saved,
      voiceUnlocked: saved.voiceUnlocked ?? true,
      purchasedOutfits: Array.from(new Set([...(saved.purchasedOutfits || []), ...FREE_OUTFIT_IDS]))
    };`;
const newMerged = `const merged = {
      ...defaultMem,
      ...saved,
      voiceUnlocked: saved.voiceUnlocked ?? true,
      country: (saved as any).country || defaultMem.country,
      timezone: (saved as any).timezone || ((saved as any).country === "TH" ? "Asia/Bangkok" : defaultMem.timezone),
      userConfirmedTimezone: (saved as any).userConfirmedTimezone ?? false,
      purchasedOutfits: Array.from(new Set([...(saved.purchasedOutfits || []), ...FREE_OUTFIT_IDS]))
    };`;
if (src.includes(oldMerged)) src = src.replace(oldMerged, newMerged);

if (!src.includes("function updateCountry(country: UserCountry)")) {
  const marker = `function updateMem(patch: Partial<Memory>) {
    setMem(prev => ({ ...prev, ...patch }));
  }`;
  src = src.replace(marker, marker + `

  function updateCountry(country: UserCountry) {
    updateMem({
      country,
      timezone: country === "TH" ? "Asia/Bangkok" : "Asia/Seoul",
      userConfirmedTimezone: true,
    });
  }`);
  console.log("✅ added updateCountry");
}

if (!src.includes("ประเทศที่ใช้งานหลัก")) {
  const marker = `<label>ให้น้องน้ำเรียกคุณว่า</label><input value={mem.userCallName} onChange={e=>updateMem({userCallName:e.target.value})}/>`;
  const insert = `<label>ประเทศที่ใช้งานหลัก</label>
              <select value={mem.country || "KR"} onChange={e=>updateCountry(e.target.value as UserCountry)}>
                <option value="KR">🇰🇷 เกาหลีใต้</option>
                <option value="TH">🇹🇭 ไทย</option>
              </select>
              <small>น้ำจะใช้เวลาประเทศนี้ในการตอบเวลา วันที่ และเตือนนัด</small>
              `;
  if (src.includes(marker)) {
    src = src.replace(marker, insert + marker);
    console.log("✅ added setup country selector");
  }
}

if (!src.includes("โซนเวลาของพี่")) {
  const marker = `<div className="card settingsCard">`;
  const insert = `<div className="apiSettingBox">
                <b>โซนเวลาของพี่</b>
                <label>ถ้าพี่บินกลับไทยหรือกลับเกาหลี เปลี่ยนตรงนี้ได้เลย</label>
                <select value={mem.country || "KR"} onChange={e=>updateCountry(e.target.value as UserCountry)}>
                  <option value="KR">🇰🇷 เกาหลีใต้ — Asia/Seoul</option>
                  <option value="TH">🇹🇭 ไทย — Asia/Bangkok</option>
                </select>
                <small>น้ำจะถือว่าอยู่ประเทศเดียวกับพี่ เวลาตอบเวลา วันที่ และนัดเตือน</small>
              </div>
              `;
  if (src.includes(marker)) {
    src = src.replace(marker, marker + "\n              " + insert);
    console.log("✅ added settings timezone selector");
  }
}

src = src.replace(/const APP_VERSION = "([^"]+)";/, (m, v) => {
  if (v.includes("phase2-kr-th-timezone")) return m;
  return `const APP_VERSION = "${v} + phase2-kr-th-timezone";`;
});

fs.writeFileSync(pagePath, src);
console.log("✅ done: app/page.tsx");

function patchRouteRespectClientTimezone(filePath) {
  if (!fs.existsSync(filePath)) return;
  backup(filePath, ".bak-phase2-kr-th-timezone");
  let route = fs.readFileSync(filePath, "utf8");
  const old = `function mergeWithForcedSeoulTime<T extends Record<string, any>>(body: T): T {
  // แอปนี้ใช้เกาหลีเป็นหลัก จึงให้ Asia/Seoul ชนะเสมอ
  // กันกรณี page.tsx ส่งแค่ clientTimestamp ISO ที่กลายเป็น UTC
  return {
    ...body,
    ...buildForcedSeoulClientPayload(),
  };
}`;
  const replacement = `function mergeWithForcedSeoulTime<T extends Record<string, any>>(body: T): T {
  const hasClientTime =
    typeof body?.clientHour === "number" &&
    typeof body?.clientMinute === "number" &&
    typeof body?.clientYear === "number" &&
    typeof body?.clientMonth === "number" &&
    typeof body?.clientDate === "number" &&
    typeof body?.clientTimeZone === "string" &&
    body.clientTimeZone.length > 0;

  if (hasClientTime) return body;

  return {
    ...body,
    ...buildForcedSeoulClientPayload(),
  };
}`;
  if (route.includes(old)) {
    route = route.replace(old, replacement);
    fs.writeFileSync(filePath, route);
    console.log("✅ patched route to respect client timezone:", filePath);
  }
}
patchRouteRespectClientTimezone(chatRoutePath);
patchRouteRespectClientTimezone(statusRoutePath);

console.log("\n✅ Phase 2 patch complete.");
console.log("Commit: app/page.tsx plus route files if patched");
console.log("Commit summary: Phase 2 add KR TH timezone setting");
