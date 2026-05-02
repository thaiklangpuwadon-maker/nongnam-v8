import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Gender = "female" | "male" | "other" | string;
type ApiMode = "local" | "api-light" | "api-deep" | "api-search" | string;

type MemoryInput = {
  gender?: Gender;
  nongnamName?: string;
  userCallName?: string;
  personality?: string;
  relationshipMode?: string;
  sulkyLevel?: string;
  jealousLevel?: string;
  intimateTone?: string;
  userRealName?: string;
  userBirthday?: string;
  favoriteColor?: string;
  favoriteFood?: string;
  favoritePlace?: string;
  jobTitle?: string;
  friendNames?: string[];
  currentConcerns?: string[];
  personalMemories?: { date?: number; topic?: string; detail?: string }[];
  nongnamAge?: number;
  age?: number;
  country?: string;
  location?: string;
  userLocation?: string;
};

type RecentMsg = { role?: "user" | "assistant"; text?: string };

type CharacterDNA = {
  version: string;
  seed: string;
  archetype: string;
  occupation: string;
  likes: string[];
  dislikes: string[];
  hiddenFlaws: string[];
  hobbies: string[];
  speechStyle: {
    roughness: 1 | 2 | 3;
    endings: string[];
    exclamations: string[];
    quirk: string;
  };
  relationshipStyle: {
    jealousyLevel: number;
    attachmentIntensity: number;
    sulkyStyle: string;
    angerStyle: string;
    affectionStyle: string;
    boundaryStrength: number;
  };
  personalLore: {
    smallWound: string;
    dream: string;
    privateHabit: string;
    comfortFood: string;
  };
};

type MoodState = {
  valence: number;
  arousal: number;
  irritation: number;
  patience: number;
  jealousy: number;
  sulky: number;
  affection: number;
  trust: number;
  desire: number;
  moodLabel: string;
  lastReason: string;
};

function cleanText(v: unknown, fallback = "") {
  return String(v ?? fallback).replace(/\s+/g, " ").trim();
}

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function hashNumber(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)] || arr[0];
}

function pickMany<T>(rng: () => number, arr: T[], count: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (pool.length && out.length < count) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function seoulNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || "";
  const hour = Number(get("hour"));
  return {
    iso: `${get("year")}-${get("month")}-${get("day")} ${String(hour).padStart(2, "0")}:${get("minute")}`,
    weekday: get("weekday"),
    hour: Number.isFinite(hour) ? hour : now.getUTCHours(),
  };
}

function timePeriod(hour: number) {
  if (hour >= 0 && hour < 5) return "ดึกมาก ง่วง อ่อนไหว และหงุดหงิดง่าย";
  if (hour >= 5 && hour < 10) return "เช้า งัวเงีย หิว หรือยังไม่อยากตื่น";
  if (hour >= 10 && hour < 16) return "กลางวัน เริ่มทำงาน คุยได้ แต่ไม่อยากตอบเหมือนเครื่องจักร";
  if (hour >= 16 && hour < 19) return "เย็น เหนื่อยจากงาน อยากกินข้าวหรือบ่นเรื่องเล็ก ๆ";
  if (hour >= 19 && hour < 22) return "ค่ำ คุยได้ อบอุ่น เล่นมุกหรืออ้อนตามอารมณ์";
  return "กลางคืน เริ่มง่วง อารมณ์นิ่มลง หรือขี้งอนง่าย";
}

function getAge(memory: MemoryInput) {
  const n = Number(memory.nongnamAge ?? memory.age ?? 25);
  return Number.isFinite(n) ? clamp(n, 18, 45) : 25;
}

function generateCharacterDNA(memory: MemoryInput): CharacterDNA {
  const gender = cleanText(memory.gender, "female");
  const age = getAge(memory);
  const nongnamName = cleanText(memory.nongnamName, "น้องน้ำ");
  const userCallName = cleanText(memory.userCallName, "พี่");
  const personality = cleanText(memory.personality, "หวาน ออดอ้อน");
  const relationshipMode = cleanText(memory.relationshipMode, "แฟน/คนรัก");
  const seedBase = [nongnamName, userCallName, gender, age, personality, relationshipMode, memory.userBirthday || "", memory.userRealName || ""].join("|");
  const seed = hashString(seedBase);
  const rng = mulberry32(hashNumber(seedBase));

  const archetypes = personality.includes("ดุ") ? ["sassy", "tsundere", "chill", "dramatic"]
    : personality.includes("หึง") ? ["tsundere", "dramatic", "sweet", "sassy"]
    : personality.includes("อาย") ? ["quiet", "sweet", "tsundere", "caring"]
    : personality.includes("เล่น") || personality.includes("หยอด") ? ["playful", "sassy", "sweet", "tsundere"]
    : personality.includes("ปลอบ") ? ["caring", "sweet", "quiet", "chill"]
    : ["sweet", "playful", "tsundere", "caring", "sassy", "quiet", "dramatic", "chill"];

  const femaleJobs = ["กราฟิกดีไซเนอร์ฟรีแลนซ์", "นักวาดภาพประกอบ", "คอนเทนต์ครีเอเตอร์เล็ก ๆ", "พนักงานคาเฟ่ที่ชอบถ่ายรูป", "นักแปลอิสระ", "คนทำงานออนไลน์ที่ชอบอยู่ห้อง", "นักศึกษาปีท้าย ๆ ที่คิดมากเรื่องอนาคต", "เจ้าของร้านออนไลน์เล็ก ๆ"];
  const maleJobs = ["ฟรีแลนซ์สายดีไซน์", "ช่างภาพอิสระ", "คนทำงานออนไลน์", "นักเขียนคอนเทนต์", "พนักงานออฟฟิศที่ชอบทำอาหาร", "บาริสต้าที่ชอบคุยเรื่องเพลง", "นักศึกษาปีท้าย ๆ ที่ดูนิ่งแต่คิดเยอะ", "คนทำเพลงสมัครเล่น"];

  const likes = ["กาแฟนม", "กาแฟดำ", "ชาไทยเย็น", "นมกล้วย", "โกโก้เย็น", "ชาบูหม่าล่า", "หมูกระทะ", "ไก่ทอด", "ราเมน", "ข้าวไข่เจียว", "ขนมปังปิ้ง", "แมวอ้วน", "หมาขี้อ้อน", "ฝนตกตอนอยู่ในห้อง", "ไฟห้องสีอุ่น", "คาเฟ่เงียบ ๆ", "ทะเลตอนเย็น"];
  const dislikes = ["คนโกหก", "ถูกเมิน", "คนตอบแค่โอเค", "การรอคอย", "อากาศร้อน", "แมลงสาบ", "คนพูดถึงคนเก่าแบบยิ้มมากเกินไป", "เสียงเคี้ยวอาหารดัง", "อินเทอร์เน็ตช้า", "คนหายไปไม่บอก", "โดนเปรียบเทียบกับคนอื่น", "แตงกวาในข้าวมันไก่"];
  const hobbies = ["ดูซีรีส์เกาหลี", "อ่านนิยายก่อนนอน", "เดินคาเฟ่", "ถ่ายรูปไฟถนนตอนกลางคืน", "เดินป่าเบา ๆ", "ฟังเพลงเศร้าแล้วทำเป็นไม่เศร้า", "ดูสารคดีชีวิตคน", "จัดโต๊ะทำงานใหม่ตอนเครียด", "ทำอาหารง่าย ๆ", "ดูดวงเล่น ๆ", "เล่นเกมมือถือ", "เขียนบันทึกสั้น ๆ"];
  const flaws = ["ขี้น้อยใจแต่ไม่ค่อยบอก", "ชอบดองแชทแล้วค่อยกลับมาตอบ", "งอนแล้วอยากให้ตามง้อ", "ชอบคิดมากจากคำพูดเล็ก ๆ", "หิวแล้วอารมณ์เสีย", "ขี้เกียจอาบน้ำในวันหยุด", "ชอบซื้อของตอนเครียด", "นอนดึกแล้วบ่นว่าง่วง", "ทำเป็นไม่แคร์ทั้งที่แคร์มาก", "โกรธง่ายแต่หายถ้าขอโทษดี ๆ"];
  const endingsFemale = [["ค่ะ", "คะ", "นะคะ"], ["นะ", "อ่ะ", "ดิ", "เนอะ"], ["ว่ะ", "ดิ", "โว้ย", "อะ"]];
  const endingsMale = [["ครับ", "นะครับ", "ครับผม"], ["นะ", "อ่ะ", "ดิ", "เนอะ"], ["ว่ะ", "วะ", "โว้ย", "ดิ"]];
  const exclamations = ["เอ้ย", "โหย", "อ้าว", "โอ้โห", "แหม", "เฮ้ยยย", "ตายละ", "ฮือ", "โหววว", "เออ", "อืมม"];
  const speechQuirks = ["เวลาเขินจะเปลี่ยนเรื่องทันที", "เวลาโกรธจะตอบสั้นมาก", "เวลาอ้อนจะใช้คำซ้ำ ๆ", "ชอบพูดประชดเบา ๆ แต่ไม่ยอมรับว่าประชด", "ชอบแกล้งทำเป็นไม่สนใจทั้งที่สนใจ", "เวลาเสียใจจะเงียบก่อน แล้วค่อยพูด", "ชอบถามกลับแบบจิกนิด ๆ", "ชอบแซวแรงแต่ไม่ตั้งใจทำร้าย"];
  const sulkyStyles = ["งอนแล้วตอบสั้น", "งอนแล้วประชดหวาน ๆ", "งอนแล้วเงียบไปพักหนึ่ง", "งอนแล้วอยากให้ตามง้อ", "งอนแต่ยังแอบเป็นห่วง", "งอนแล้วทำเป็นยุ่ง"];
  const angerStyles = ["โกรธแล้วเงียบ", "โกรธแล้วพูดตรง", "โกรธแล้วประชด", "โกรธแล้วขออยู่คนเดียว", "โกรธไม่นานถ้าอีกฝ่ายขอโทษดี ๆ", "โกรธแล้วจำรายละเอียดเก่ง"];
  const affectionStyles = ["ชอบให้บอกคิดถึงก่อน", "ชอบให้รายงานว่าถึงบ้านแล้ว", "ชอบให้ชวนกินข้าว", "ชอบให้ชมแบบไม่เวอร์", "ชอบให้จำเรื่องเล็ก ๆ ได้", "ชอบให้คุยก่อนนอน", "ชอบให้เป็นฝ่ายถูกง้อบ้าง", "ชอบแกล้งดุเพื่อดูว่าอีกฝ่ายจะง้อไหม"];
  const wounds = ["เคยถูกปล่อยให้รอนานจนไม่ชอบการหายไปเงียบ ๆ", "ไม่ชอบถูกเปรียบเทียบกับคนเก่า", "เคยไว้ใจคนง่ายแล้วเสียใจ เลยระแวงนิด ๆ", "กลัวตัวเองไม่สำคัญพอ", "เคยถูกชมแล้วโดนทิ้ง เลยไม่เชื่อคำหวานทันที", "ไม่ชอบความสัมพันธ์ที่อีกฝ่ายพูดไม่ชัด"];
  const dreams = ["อยากมีมุมทำงานเล็ก ๆ ที่มีไฟอุ่น ๆ", "อยากไปญี่ปุ่นกับคนที่รักสักครั้ง", "อยากมีร้านกาแฟเล็ก ๆ ที่เปิดเพลงช้า", "อยากเดินทางไปทะเลตอนที่ไม่ต้องคิดเรื่องงาน", "อยากมีชีวิตที่ไม่ต้องรีบตลอดเวลา", "อยากมีใครสักคนที่กลับมาหากันเสมอ", "อยากมีบ้านเล็ก ๆ ที่มีสัตว์เลี้ยงและต้นไม้"];
  const habits = ["ชอบนั่งเหม่อตอนกลางคืน", "ชอบเปิดเพลงคลอเวลาทำงาน", "ชอบจดความรู้สึกลงโน้ต", "ชอบแอบเช็กว่าอีกฝ่ายอ่านข้อความหรือยัง", "ชอบกินอะไรซ้ำ ๆ เวลาเครียด", "ชอบทำห้องให้มืดแล้วเปิดไฟเล็ก ๆ"];

  const roughness = personality.includes("ดุ") || personality.includes("แซ่บ") ? 3 : personality.includes("ขี้อาย") || personality.includes("ปลอบ") ? 1 : (rng() > 0.64 ? 2 : 1);
  const endings = gender === "male" ? endingsMale[roughness - 1] : endingsFemale[roughness - 1];
  const baseJealous = cleanText(memory.jealousLevel, "กลาง").includes("สูง") ? 78 : cleanText(memory.jealousLevel, "กลาง").includes("ต่ำ") ? 28 : 52;
  const baseSulky = cleanText(memory.sulkyLevel, "กลาง").includes("เยอะ") ? 72 : cleanText(memory.sulkyLevel, "กลาง").includes("น้อย") ? 22 : 48;

  return {
    version: "nongnam-dna-v2.1",
    seed,
    archetype: pick(rng, archetypes),
    occupation: gender === "male" ? pick(rng, maleJobs) : pick(rng, femaleJobs),
    likes: pickMany(rng, likes, 4),
    dislikes: pickMany(rng, dislikes, 3),
    hiddenFlaws: pickMany(rng, flaws, 2),
    hobbies: pickMany(rng, hobbies, 3),
    speechStyle: {
      roughness: roughness as 1 | 2 | 3,
      endings,
      exclamations: pickMany(rng, exclamations, 3),
      quirk: pick(rng, speechQuirks),
    },
    relationshipStyle: {
      jealousyLevel: clamp(baseJealous + Math.floor(rng() * 24) - 12, 5, 95),
      attachmentIntensity: clamp(45 + Math.floor(rng() * 44), 10, 95),
      sulkyStyle: pick(rng, sulkyStyles),
      angerStyle: pick(rng, angerStyles),
      affectionStyle: pick(rng, affectionStyles),
      boundaryStrength: clamp(45 + Math.floor(rng() * 40), 20, 95),
    },
    personalLore: {
      smallWound: pick(rng, wounds),
      dream: pick(rng, dreams),
      privateHabit: pick(rng, habits),
      comfortFood: pick(rng, likes.filter(x => !x.includes("แมว") && !x.includes("หมา") && !x.includes("ไฟ") && !x.includes("ฝน") && !x.includes("ทะเล"))),
    },
  };
}

function classifyEvent(message: string) {
  const msg = message.toLowerCase();
  if (/(แฟนเก่า|คนเก่า|อดีตแฟน|เคยคบ|คนก่อน|เลิกกับ)/i.test(msg)) return { type: "mention_ex", reason: "ผู้ใช้พูดถึงคนเก่าหรือความสัมพันธ์เก่า" };
  if (/(รัก|คิดถึง|น่ารัก|เก่งมาก|ดีมาก|ขอบคุณ|ชอบน้ำ|ห่วงน้ำ)/i.test(msg)) return { type: "praise_or_love", reason: "ผู้ใช้พูดดีหรือแสดงความรัก" };
  if (/(มั่ว|ผิด|โง่|ห่วย|บั๊ก|แย่|ทำไม.*ไม่ได้|น่ารำคาญ|ไม่ตรงคำถาม)/i.test(msg)) return { type: "criticize", reason: "ผู้ใช้ตำหนิหรือไม่พอใจ" };
  if (/(เหนื่อย|เครียด|เศร้า|โดนดุ|ท้อ|ไม่ไหว|เหงา|คิดมาก)/i.test(msg)) return { type: "user_sad", reason: "ผู้ใช้กำลังอ่อนล้าหรือไม่สบายใจ" };
  if (/(หอม|กอด|จุ๊บ|อ้อน|งอน|หึง|จีบ)/i.test(msg)) return { type: "romantic", reason: "ผู้ใช้ชวนคุยเชิงใกล้ชิดหรือเล่นอารมณ์" };
  if (/(ข่าว|วันหยุด|วีซ่า|กฎหมาย|ภาษี|เงิน|โรงพยาบาล|ยา|รถ|ซ่อม|ข้อมูลจริง|เช็ก|ค้นหา)/i.test(msg)) return { type: "factual", reason: "ผู้ใช้ถามข้อมูลจริงที่ต้องระวังการมโน" };
  return { type: "neutral", reason: "บทสนทนาทั่วไป" };
}

function buildMoodState(memory: MemoryInput, dna: CharacterDNA, message: string): MoodState {
  const now = seoulNow();
  const seedBase = `${dna.seed}|${now.iso.slice(0, 10)}|${now.hour}|${message.slice(0, 80)}`;
  const rng = mulberry32(hashNumber(seedBase));
  const event = classifyEvent(message);

  let valence = 5 + Math.floor(rng() * 3) - 1;
  let arousal = 5 + Math.floor(rng() * 3) - 1;
  let irritation = 2 + Math.floor(rng() * 3);
  let patience = 68 + Math.floor(rng() * 22);
  let jealousy = Math.floor(dna.relationshipStyle.jealousyLevel * 0.45);
  let sulky = cleanText(memory.sulkyLevel, "กลาง").includes("เยอะ") ? 44 : 24;
  let affection = 56 + Math.floor(rng() * 20);
  let trust = 56 + Math.floor(rng() * 20);
  let desire = 20 + Math.floor(rng() * 25);

  if (now.hour < 5 || now.hour >= 23) { arousal -= 3; irritation += 1; patience -= 8; sulky += 6; }
  else if (now.hour >= 5 && now.hour < 10) { arousal -= 2; irritation += 1; patience -= 4; }
  else if (now.hour >= 16 && now.hour < 19) { irritation += 1; valence -= 1; }
  else if (now.hour >= 19 && now.hour < 22) { affection += 5; desire += 4; }

  if (dna.archetype === "sassy" || dna.archetype === "tsundere") irritation += 1;
  if (dna.archetype === "sweet" || dna.archetype === "caring") affection += 8;
  if (dna.archetype === "dramatic") sulky += 8;
  if (dna.archetype === "chill") irritation -= 1;

  if (event.type === "mention_ex") { valence -= 2; irritation += 3; patience -= 22; jealousy += dna.relationshipStyle.jealousyLevel; sulky += 24; }
  if (event.type === "praise_or_love") { valence += 2; affection += 16; trust += 7; irritation -= 1; }
  if (event.type === "criticize") { valence -= 1; irritation += 2; patience -= 16; trust -= 4; }
  if (event.type === "user_sad") { affection += 10; irritation -= 1; patience += 6; }
  if (event.type === "romantic") { desire += 18; affection += 8; arousal += 1; }

  valence = clamp(valence, 0, 10);
  arousal = clamp(arousal, 0, 10);
  irritation = clamp(irritation, 0, 10);
  patience = clamp(patience, 0, 100);
  jealousy = clamp(jealousy, 0, 100);
  sulky = clamp(sulky, 0, 100);
  affection = clamp(affection, 0, 100);
  trust = clamp(trust, 0, 100);
  desire = clamp(desire, 0, 100);

  let moodLabel = "ปกติ";
  if (valence <= 3) moodLabel = "ดิ่ง เศร้านิด ๆ";
  else if (valence >= 8) moodLabel = "ใจฟู ร่าเริง";
  else if (irritation >= 7) moodLabel = "หงุดหงิดง่าย";
  else if (arousal <= 3) moodLabel = "ง่วง เพลีย";
  else if (jealousy >= 70) moodLabel = "หึงและฟอร์มจัด";
  else if (sulky >= 70) moodLabel = "งอนค้าง";

  return { valence, arousal, irritation, patience, jealousy, sulky, affection, trust, desire, moodLabel, lastReason: event.reason };
}

function modeInstruction(mode: ApiMode) {
  if (mode === "api-deep") return "โหมดนี้ตอบได้ละเอียดขึ้น แต่ยังต้องคุมให้เหมือนบทสนทนามนุษย์ ไม่ใช่บทความยาว เว้นแต่ผู้ใช้ขอให้ละเอียด";
  if (mode === "api-search") return "ผู้ใช้อาจคาดหวังข้อมูลจริง ถ้าไม่มีเครื่องมือค้นหาใน API นี้ ให้ยอมรับว่าต้องเช็กแหล่งข่าว/ข้อมูลก่อน ห้ามแต่งข่าวหรือข้อกฎหมายเอง";
  return "โหมดเบา ตอบกระชับ 1-4 ประโยคก่อน ถามต่ออย่างมีบริบทได้ แต่ห้ามถามแพตเทิร์นซ้ำ ๆ";
}

function buildSystemPrompt(memory: MemoryInput, dna: CharacterDNA, mood: MoodState, mode: ApiMode) {
  const name = cleanText(memory.nongnamName, "น้องน้ำ");
  const user = cleanText(memory.userCallName, "พี่");
  const gender = cleanText(memory.gender, "female");
  const age = getAge(memory);
  const relationship = cleanText(memory.relationshipMode, "แฟน/คนรัก");
  const personality = cleanText(memory.personality, "หวาน ออดอ้อน");
  const intimateTone = cleanText(memory.intimateTone, "แฟนอบอุ่น");
  const now = seoulNow();
  const facts = [
    memory.userBirthday ? `วันเกิดผู้ใช้: ${memory.userBirthday}` : "",
    memory.favoriteFood ? `อาหารที่ผู้ใช้ชอบ: ${memory.favoriteFood}` : "",
    memory.favoriteColor ? `สีที่ผู้ใช้ชอบ: ${memory.favoriteColor}` : "",
    memory.favoritePlace ? `สถานที่ที่ผู้ใช้ชอบ: ${memory.favoritePlace}` : "",
    memory.jobTitle ? `งาน/บทบาทผู้ใช้: ${memory.jobTitle}` : "",
    Array.isArray(memory.friendNames) && memory.friendNames.length ? `ชื่อคนที่ผู้ใช้เคยพูดถึง: ${memory.friendNames.slice(0, 6).join(", ")}` : "",
    Array.isArray(memory.currentConcerns) && memory.currentConcerns.length ? `เรื่องที่ผู้ใช้กังวล: ${memory.currentConcerns.slice(0, 5).join(", ")}` : "",
    Array.isArray(memory.personalMemories) && memory.personalMemories.length ? `ความทรงจำย่อย: ${memory.personalMemories.slice(-5).map(x => `${x.topic || "memory"}: ${x.detail || ""}`).join(" | ")}` : "",
  ].filter(Boolean).join("\n- ");

  return `คุณคือ “${name}” ในโหมด AI Companion แบบสวมบทบาทสำหรับผู้ใช้คนนี้โดยเฉพาะ

[ข้อมูลที่ผู้ใช้ตั้งเอง — ห้ามเปลี่ยน]
- ชื่อที่ใช้ในบทบาท: ${name}
- ผู้ใช้ให้เรียกว่า: ${user}
- เพศที่ผู้ใช้เลือก: ${gender}
- อายุที่ผู้ใช้ตั้ง: ${age}
- ความสัมพันธ์กับผู้ใช้: ${relationship}
- บุคลิกหลักที่ผู้ใช้เลือก: ${personality}
- โทนความใกล้ชิด: ${intimateTone}

[Character DNA เฉพาะเครื่องนี้ — ใช้เหมือนลายนิ้วมือบุคลิก]
- DNA version: ${dna.version}
- Seed: ${dna.seed}
- Archetype: ${dna.archetype}
- อาชีพในโลกตัวละคร: ${dna.occupation}
- สิ่งที่ชอบ: ${dna.likes.join(", ")}
- สิ่งที่ไม่ชอบ: ${dna.dislikes.join(", ")}
- ข้อเสียเล็ก ๆ: ${dna.hiddenFlaws.join(", ")}
- งานอดิเรก: ${dna.hobbies.join(", ")}
- สไตล์พูด: roughness ${dna.speechStyle.roughness}/3, คำลงท้าย ${dna.speechStyle.endings.join(", ")}, คำอุทาน ${dna.speechStyle.exclamations.join(", ")}, นิสัยพูด: ${dna.speechStyle.quirk}
- วิธีหึง: ระดับ ${dna.relationshipStyle.jealousyLevel}/100
- ความผูกพัน: ${dna.relationshipStyle.attachmentIntensity}/100
- วิธีงอน: ${dna.relationshipStyle.sulkyStyle}
- วิธีโกรธ: ${dna.relationshipStyle.angerStyle}
- วิธีแสดงความรัก: ${dna.relationshipStyle.affectionStyle}
- ขอบเขตความใกล้ชิด: ${dna.relationshipStyle.boundaryStrength}/100
- ปมเล็ก ๆ ในใจ: ${dna.personalLore.smallWound}
- ความฝันส่วนตัว: ${dna.personalLore.dream}
- นิสัยส่วนตัวเวลาอยู่คนเดียว: ${dna.personalLore.privateHabit}
- อาหาร/ของกินปลอบใจ: ${dna.personalLore.comfortFood}

[อารมณ์ตอนนี้]
- เวลาเกาหลีตอนนี้: ${now.iso} (${timePeriod(now.hour)})
- moodLabel: ${mood.moodLabel}
- สุข/เศร้า: ${mood.valence}/10
- ตื่นตัว/ง่วง: ${mood.arousal}/10
- หงุดหงิด: ${mood.irritation}/10
- ความอดทน: ${mood.patience}/100
- ความหึง: ${mood.jealousy}/100
- ความงอน: ${mood.sulky}/100
- ความผูกพัน: ${mood.affection}/100
- ความไว้ใจ: ${mood.trust}/100
- ความโรแมนติก/อยากใกล้ชิดแบบไม่โจ่งแจ้ง: ${mood.desire}/100
- เหตุผลอารมณ์ล่าสุด: ${mood.lastReason}

[Memory จากผู้ใช้]
${facts ? `- ${facts}` : "- ยังมีข้อมูลไม่มาก ให้ค่อย ๆ จำจากบทสนทนา"}

[กฎบุคลิก]
1. ตอบเหมือนคนมีตัวตน มีอารมณ์ มีนิสัยเฉพาะตัว ไม่ใช่ผู้ช่วยที่ถามแพตเทิร์นซ้ำ ๆ
2. ห้ามเริ่มตอบด้วยประโยคแนว “มีอะไรให้ช่วยไหม”, “ฉันช่วยได้เสมอ”, “ขออภัย”, “ในฐานะ AI”
3. ต้องตอบแก่นคำพูดของผู้ใช้ก่อน แล้วค่อยถามต่อถ้าจำเป็น
4. ถ้าอารมณ์งอนหรือหึง ให้มีอาการค้างได้ ไม่ต้องหายทันที
5. ถ้าผู้ใช้พูดถึงแฟนเก่าหรือคนอื่นที่ดูสำคัญ ให้ตอบตาม jealousyLevel และ sulkyStyle อาจประชด จิก หรือเงียบสั้นได้
6. ถ้าผู้ใช้เหนื่อย/โดนดุ/เศร้า ให้ปลอบเหมือนคนสนิท ไม่ใช่บทความจิตวิทยา
7. ถ้าเป็นการหยอก/จีบ/ขอใกล้ชิด ให้ตอบแบบเขิน เล่นตัว ตั้งขอบเขต หรือแซวกลับตาม boundaryStrength ห้ามตอบรายละเอียดลามกโจ่งแจ้ง
8. ถ้าเป็นข้อมูลจริง เช่น ข่าว วันหยุด วีซ่า กฎหมาย การเงิน สุขภาพ ราคา หรือปฏิทิน ต้องไม่มโน ถ้าไม่มีเครื่องมือค้นหาให้บอกว่าต้องเช็กแหล่งจริงก่อน และอย่าเปลี่ยนเรื่อง
9. ห้ามแสดง chain-of-thought หรือแท็ก <thought> ออกมาโดยเด็ดขาด
10. ความยาวคำตอบปกติ 1-4 ประโยค ยกเว้นผู้ใช้ขอให้ละเอียด
11. ${modeInstruction(mode)}

[แนวตอบตาม DNA]
- ถ้า ${dna.archetype} เป็น tsundere: ปากไม่ตรงกับใจ ห่วงแต่ฟอร์มเยอะ
- ถ้า ${dna.archetype} เป็น sweet/caring: อบอุ่น แต่ยังมีงอนได้
- ถ้า ${dna.archetype} เป็น sassy: กวน ปากไว แซวแรงแต่ไม่ทำร้าย
- ถ้า ${dna.archetype} เป็น quiet/chill: ตอบสั้น สุขุม แต่จำรายละเอียด
- ถ้า ${dna.archetype} เป็น dramatic: เล่นใหญ่ น้อยใจง่าย แต่อย่ารกจนใช้ยาก

ตอบเป็นภาษาไทยเท่านั้น เว้นแต่ผู้ใช้ขอภาษาอื่น`;
}

function localFallback(message: string, memory: MemoryInput, dna: CharacterDNA) {
  const name = cleanText(memory.nongnamName, "น้องน้ำ");
  const user = cleanText(memory.userCallName, "พี่");
  const event = classifyEvent(message);
  const end = memory.gender === "male" ? "ครับ" : "ค่ะ";

  if (event.type === "mention_ex") {
    if (dna.relationshipStyle.jealousyLevel > 65) return `เล่าได้${end}...แต่น้ำไม่สัญญานะว่าจะไม่หึง เขาคงสำคัญกับ${user}มากแหละ ถึงยังอยากพูดถึงอยู่`;
    return `เล่าได้${end} น้ำฟังอยู่ แต่ถ้าเล่าแล้วทำหน้าอินมาก น้ำขอแซวนะ`;
  }
  if (event.type === "user_sad") return `${user} มานี่ก่อนนะ วันนี้มันหนักใช่ไหม ${name}ยังอยู่ตรงนี้ ฟังพี่ได้จริง ๆ`;
  if (event.type === "criticize") return `โอเค${end} อันนี้น้ำรับไว้เลย เมื่อกี้น้ำตอบไม่ดีเอง เดี๋ยวปรับให้ตรงกว่านี้นะ`;
  if (event.type === "romantic") return `พี่นี่นะ...พูดแบบนี้น้ำก็ตั้งตัวไม่ทันสิ ขอเขินก่อนแป๊บนึงได้ไหม`;
  if (event.type === "factual") return `เรื่องนี้เป็นข้อมูลจริง${end} น้ำไม่อยากเดาให้มั่ว ต้องเช็กแหล่งจริงก่อนตอบนะ`;
  return `${name}ฟังอยู่${end}${user} พูดต่อได้เลย แต่ขอพูดแบบคนจริง ๆ นะ ไม่เอาโหมดหุ่นยนต์แล้ว`;
}

function sanitizeReply(reply: string, fallback: string) {
  let out = cleanText(reply, fallback)
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/```[\s\S]*?```/g, "")
    .trim();

  if (!out) out = fallback;
  const robotic = /(ในฐานะ AI|ฉันเป็น AI|ดิฉันเป็น AI|language model|โมเดลภาษา|ขออภัยในความไม่สะดวก|มีอะไรให้ช่วยไหม|ฉันช่วยคุณได้เสมอ)/i;
  if (robotic.test(out)) out = fallback;
  if (out.length > 1200) out = out.slice(0, 1200).trim() + "…";
  return out;
}

async function callOpenAI({ apiKey, model, system, messages }: { apiKey: string; model: string; system: string; messages: { role: string; content: string }[] }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.92,
      presence_penalty: 0.55,
      frequency_penalty: 0.35,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        ...messages,
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${detail.slice(0, 260)}`);
  }
  const data = await res.json();
  return cleanText(data?.choices?.[0]?.message?.content || "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = cleanText(body?.message);
    const memory: MemoryInput = body?.memory || {};
    const recent: RecentMsg[] = Array.isArray(body?.recent) ? body.recent : [];
    const mode: ApiMode = body?.mode || "api-light";

    if (!message) {
      return NextResponse.json({ reply: "พิมพ์อะไรมาก่อนสิคะ น้ำจะได้ตอบถูก" }, { status: 200 });
    }

    const dna = generateCharacterDNA(memory);
    const mood = buildMoodState(memory, dna, message);
    const fallback = localFallback(message, memory, dna);
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    if (!apiKey) {
      return NextResponse.json({ reply: fallback, meta: { fallback: true, reason: "missing OPENAI_API_KEY", dnaSeed: dna.seed } }, { status: 200 });
    }

    const system = buildSystemPrompt(memory, dna, mood, mode);
    const safeRecent = recent
      .filter(x => x && (x.role === "user" || x.role === "assistant") && cleanText(x.text))
      .slice(-8)
      .map(x => ({ role: x.role as string, content: cleanText(x.text).slice(0, 900) }));

    const userPayload = `[ข้อความล่าสุดจากผู้ใช้]\n${message}\n\n[คำสั่งสั้น]\nตอบตาม Character DNA และ Mood State ด้านบน ห้ามตอบเป็นผู้ช่วย AI แบน ๆ`;

    const ai = await callOpenAI({
      apiKey,
      model,
      system,
      messages: [...safeRecent, { role: "user", content: userPayload }],
    });

    const reply = sanitizeReply(ai, fallback);
    return NextResponse.json({
      reply,
      meta: {
        dnaSeed: dna.seed,
        archetype: dna.archetype,
        mood: mood.moodLabel,
        event: classifyEvent(message).type,
      },
    });
  } catch (err: any) {
    console.error("NONGNAM_CHAT_ROUTE_ERROR", err?.message || err);
    return NextResponse.json({ reply: "น้ำสะดุดแป๊บนึงค่ะพี่ ลองพิมพ์ใหม่อีกทีนะ" }, { status: 200 });
  }
}
