/**
 * affectionEngine.ts — ระบบคะแนนความรัก 0-100
 * ค่อย ๆ เพิ่ม/ลด ตามการโต้ตอบ (ไม่กระโดดทีเดียว)
 *
 * Levels:
 *   0-20  Indifferent  - ปกติ ห่างเหิน
 *   21-40 Cool         - เริ่มรู้จัก เริ่มสบายใจ
 *   41-60 Warm         - สนิทขึ้น อ้อนได้บ้าง
 *   61-80 Hot          - คนรัก หยอกได้ แซวได้
 *   81-100 Burning     - ใกล้ชิดสุด เปิดใจเต็มที่
 */

export type AffectionLevel =
  | "indifferent"
  | "cool"
  | "warm"
  | "hot"
  | "burning";

export type AffectionInfo = {
  score: number;
  level: AffectionLevel;
  label: string;
  emoji: string;
  description: string;
};

export function getAffectionInfo(score: number): AffectionInfo {
  const s = Math.max(0, Math.min(100, score));
  if (s <= 20) return {
    score: s, level: "indifferent",
    label: "เริ่มรู้จัก", emoji: "😊",
    description: "ยังเขินอยู่ คุยปกติไม่อ้อน",
  };
  if (s <= 40) return {
    score: s, level: "cool",
    label: "เริ่มสนิท", emoji: "🌸",
    description: "เริ่มหวานนิด ๆ คุยสบายขึ้น",
  };
  if (s <= 60) return {
    score: s, level: "warm",
    label: "อบอุ่น", emoji: "💗",
    description: "อ้อนได้บ้าง หยอกได้ ขี้งอน",
  };
  if (s <= 80) return {
    score: s, level: "hot",
    label: "คนรัก", emoji: "🔥",
    description: "เปิดใจเต็มที่ แซวได้ เซ็กซี่ได้",
  };
  return {
    score: s, level: "burning",
    label: "ใจถึงใจ", emoji: "💖",
    description: "ใกล้ชิดสุด ทำได้ทุกอย่าง",
  };
}

/* =========================================================
   DELTA CALCULATION — ตามประเภทการโต้ตอบ
   ========================================================= */
export type InteractionType =
  | "casual"        // คุยปกติ +1
  | "warm"          // คุยอบอุ่น +2
  | "intimate"      // คุยใกล้ชิด/หวาน +3
  | "explicit"      // คุยลามก +4 (ต้องอยู่ลำดับหลัง)
  | "neglect"       // หายไปนาน -1 ต่อวัน
  | "hurt"          // พูดร้าย -5
  | "gift";         // ซื้อชุด/ของขวัญ +10

const DELTAS: Record<InteractionType, number> = {
  casual: 1,
  warm: 2,
  intimate: 3,
  explicit: 4,
  neglect: -1,
  hurt: -5,
  gift: 10,
};

export function calcDelta(type: InteractionType): number {
  return DELTAS[type] ?? 0;
}

/* =========================================================
   AUTO-DETECT INTERACTION TYPE FROM MESSAGE
   เพื่อให้ score ขึ้นเองโดยไม่ต้องกดอะไร
   ========================================================= */

const WARM_PATTERNS = [
  /ขอบคุณ/, /ดีจัง/, /รัก/, /ห่วง/, /เป็นห่วง/,
  /กินข้าว/, /หลับฝันดี/, /ราตรีสวัสดิ์/,
  /คิดถึง/, /อยากเจอ/, /อยู่เป็นเพื่อน/,
];

const INTIMATE_PATTERNS = [
  /ที่รัก/, /หวานใจ/, /แฟน/, /ผัว/, /เมีย/, /สามี/, /ภรรยา/,
  /หอม/, /กอด/, /จู๋จี๋/, /หวาน/, /ขี้อ้อน/, /อ้อน/,
];

const EXPLICIT_PATTERNS = [
  /เสียว/, /ลามก/, /กาม/, /จุ๊บ/, /จูบ/, /อึ๊บ/,
  /อยากกิน/, /อยากกอด/, /นอนด้วย/, /อยากได้/,
  /อก/, /ก้น/, /หน้าอก/, /เซ็กซ์/,
];

const HURT_PATTERNS = [
  /หุบปาก/, /ไอ่บ้า/, /อีบ้า/, /ไป(ตาย|ไกล)/, /ไม่อยาก(เห็น|คุย)/,
  /โง่/, /เลวร้าย/, /น่ารังเกียจ/,
];

export function detectInteractionType(message: string): InteractionType {
  const t = message.toLowerCase();
  if (HURT_PATTERNS.some(p => p.test(t))) return "hurt";
  if (EXPLICIT_PATTERNS.some(p => p.test(t))) return "explicit";
  if (INTIMATE_PATTERNS.some(p => p.test(t))) return "intimate";
  if (WARM_PATTERNS.some(p => p.test(t))) return "warm";
  return "casual";
}

/* =========================================================
   APPLY DELTA — clamp to 0-100
   ========================================================= */
export function applyDelta(currentScore: number, delta: number): number {
  return Math.max(0, Math.min(100, currentScore + delta));
}

/* =========================================================
   RELATIONSHIP STATUS — ดูจากคำเรียก + ระดับความรัก
   ========================================================= */
export type RelationshipKind =
  | "friend"      // เพื่อน
  | "elder"       // พี่/น้อง (ไม่โรแมนติก)
  | "lover"       // แฟน/คนรัก
  | "spouse"      // ผัว/เมีย
  | "advisor";    // ที่ปรึกษา

/**
 * ตรวจสถานะความสัมพันธ์จากคำเรียก
 * พี่บอกชัดเจนว่า:
 *   "ที่รัก" = แฟน/lover
 *   "ผัว/พ่อบ้าน" = สามี/spouse
 *   "พี่" = พี่/elder (อาจเป็นแฟนก็ได้ ดูจาก relationshipMode ประกอบ)
 */
export function detectRelationshipFromCallName(
  callName: string,
  explicitMode?: string
): RelationshipKind {
  const name = (callName || "").toLowerCase().trim();

  // explicit mode มาก่อน
  if (explicitMode) {
    const m = explicitMode.toLowerCase();
    if (m.includes("ที่ปรึกษา") || m.includes("advisor")) return "advisor";
    if (m.includes("เพื่อน") || m.includes("friend")) return "friend";
    if (m.includes("แฟน") || m.includes("คนรัก") || m.includes("lover")) return "lover";
    if (m.includes("ผัว") || m.includes("เมีย") || m.includes("สามี") || m.includes("ภรรยา"))
      return "spouse";
  }

  // จากคำเรียก
  if (/(ผัว|พ่อบ้าน|ตัวเอง|ปาป๊า|สามี)/.test(name)) return "spouse";
  if (/(เมีย|ภรรยา|มาม๊า|ที่รัก)/.test(name)) return "spouse";
  if (/(ที่รัก|honey|baby|ดาร์ลิ่ง|ลูก|คนเก่ง|คนดี)/.test(name)) return "lover";
  if (/(พี่|พี่ชาย|พี่สาว|น้อง)/.test(name)) return "elder";
  if (/(เพื่อน|friend)/.test(name)) return "friend";

  return "elder"; // default — ปลอดภัยสุด
}
