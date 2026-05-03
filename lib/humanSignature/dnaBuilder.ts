import type { CompanionDNA, Trait, Role } from "./types";
import { makeSeed, seededRandom } from "./engine";

/**
 * buildDNA — สร้าง DNA ของน้องน้ำเฉพาะตัวจาก fingerprint ของ user
 *
 * DNA = ลายมือนิสัย ที่ไม่เปลี่ยนตลอดอายุการใช้งาน
 * แต่ละ user จะได้น้องน้ำที่นิสัยไม่เหมือนกัน 100%
 */
export function buildDNA(input: {
  userCallName: string;
  nongnamName: string;
  relationshipMode: string;
  personalityStyle?: string;
  sulkyLevel?: string;
  jealousLevel?: string;
  affectionStyle?: string;
  gender?: "male" | "female";
}): CompanionDNA {
  // fingerprint = unique key ที่ deterministic
  const fingerprint = `${input.userCallName}|${input.nongnamName}|${input.relationshipMode}`;
  const seed = makeSeed([fingerprint]);
  const rand = seededRandom(seed);

  // ===== ตัดสินใจ traits ตาม personality + random =====
  const ps = (input.personalityStyle || "หวาน ออดอ้อน").toLowerCase();
  const sulkyLv = mapLevel(input.sulkyLevel);
  const jealousLv = mapLevel(input.jealousLevel);

  const traits: Record<Trait, number> = {
    clingy: ps.includes("อ้อน") || ps.includes("หวาน") ? 0.6 + rand() * 0.3 : 0.3 + rand() * 0.4,
    playful: ps.includes("เล่น") || ps.includes("หยอก") ? 0.6 + rand() * 0.3 : 0.3 + rand() * 0.4,
    grumpy: ps.includes("ดุ") || ps.includes("บ่น") ? 0.5 + rand() * 0.4 : 0.2 + rand() * 0.3,
    romantic: input.relationshipMode.includes("แฟน") || input.relationshipMode.includes("รัก") ? 0.6 + rand() * 0.3 : 0.3 + rand() * 0.3,
    introvert: ps.includes("อาย") ? 0.5 + rand() * 0.4 : 0.2 + rand() * 0.4,
    jealous: jealousLv,
    sulky: sulkyLv,
  };

  // ===== role =====
  const roleOptions: Role[] = ["student", "office_worker", "homebody", "freelancer", "night_shift"];
  const role = roleOptions[Math.floor(rand() * roleOptions.length)];

  // ===== speechStyle =====
  const isFemale = input.gender !== "male";
  const possibleEndings = isFemale
    ? [["ค่ะ", "นะ"], ["ค่ะ", "อะ"], ["นะ", "อะ", "ดิ"], ["จ้า", "นะ"], ["ค่ะ", "เลย"]]
    : [["ครับ", "นะ"], ["ครับ", "อะ"], ["นะ", "ดิ"], ["จ้า", "นะ"]];
  const endingWords = possibleEndings[Math.floor(rand() * possibleEndings.length)];

  // ===== baseAffection ตามความสัมพันธ์ =====
  const rel = input.relationshipMode.toLowerCase();
  let baseAffection = 30;
  if (/ผัว|เมีย|สามี|ภรรยา/.test(rel)) baseAffection = 75;
  else if (/แฟน|รัก/.test(rel)) baseAffection = 55;
  else if (/เพื่อน/.test(rel)) baseAffection = 25;
  else if (/ปรึกษา/.test(rel)) baseAffection = 15;

  return {
    fingerprint,
    traits,
    role,
    speechStyle: {
      endingWords,
      typosRate: 0.02 + rand() * 0.04,
      drawl: rand() > 0.5,
      callName: input.userCallName || "พี่",
      selfName: input.nongnamName || "น้องน้ำ",
    },
    baseAffection,
  };
}

function mapLevel(level?: string): number {
  if (!level) return 0.4;
  const l = level.toLowerCase();
  if (/น้อย|ต่ำ|low/.test(l)) return 0.2;
  if (/เยอะ|สูง|high/.test(l)) return 0.75;
  return 0.45;
}
