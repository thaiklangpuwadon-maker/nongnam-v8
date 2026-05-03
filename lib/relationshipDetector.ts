/**
 * relationshipDetector.ts
 * รวม callName + relationshipMode + affection score
 * → ออกมาเป็น "บุคลิกการตอบกลับ" ที่จะใส่ใน system prompt
 */

import { detectRelationshipFromCallName, getAffectionInfo, type RelationshipKind } from "./affectionEngine";

export type RelationshipProfile = {
  kind: RelationshipKind;
  callName: string;
  affectionScore: number;
  affectionLabel: string;
  /** baseline affection ตั้งต้นตาม kind */
  baselineAffection: number;
  /** บุคลิกหลักที่ AI ควรแสดง */
  personalityHint: string;
  /** allow รูปแบบการตอบที่หวาน/เซ็กซี่/หึงได้แค่ไหน */
  allowFlirt: boolean;
  allowJealousy: boolean;
  allowExplicit: boolean;
};

const BASELINE: Record<RelationshipKind, number> = {
  friend: 10,
  elder: 20,
  advisor: 5,
  lover: 50,    // แฟน — เริ่มอบอุ่นทันที
  spouse: 70,   // ผัว/เมีย — เริ่มสนิทมาก
};

const PERSONALITY_HINTS: Record<RelationshipKind, string> = {
  friend: "เป็นเพื่อนสนิทที่รับฟัง คุยสบาย ๆ ไม่ต้องหวาน ไม่ต้องอ้อน",
  elder: "เป็นพี่/น้องที่ห่วงใย พูดสุภาพ อบอุ่น ไม่จีบ ไม่หวานเกินไป",
  advisor: "เป็นที่ปรึกษาที่อ่อนโยน ฟังเก่ง ให้คำแนะนำสั้น ๆ ไม่จีบ",
  lover: "เป็นแฟนสาวที่หวาน อ้อน ขี้งอน ขี้หึง คิดถึง ใช้ภาษาคนรัก",
  spouse: "เป็นเมีย/ภรรยาที่สนิท เป็นเจ้าข้าวเจ้าของ หวงมาก ห่วงใยทุกเรื่อง พูดเหมือนคู่ชีวิตจริง",
};

export function buildRelationshipProfile(
  callName: string,
  relationshipMode: string | undefined,
  currentAffection: number | undefined
): RelationshipProfile {
  const kind = detectRelationshipFromCallName(callName, relationshipMode);
  const baseline = BASELINE[kind];

  // ถ้ายังไม่มี affection score จริง → ใช้ baseline
  const score = typeof currentAffection === "number"
    ? currentAffection
    : baseline;

  const info = getAffectionInfo(score);

  // permission rules
  const allowFlirt    = (kind === "lover" || kind === "spouse") && score >= 30;
  const allowJealousy = (kind === "lover" || kind === "spouse");
  const allowExplicit = (kind === "lover" || kind === "spouse") && score >= 70;

  return {
    kind,
    callName: callName || "พี่",
    affectionScore: score,
    affectionLabel: info.label,
    baselineAffection: baseline,
    personalityHint: PERSONALITY_HINTS[kind],
    allowFlirt,
    allowJealousy,
    allowExplicit,
  };
}

/**
 * สร้าง guideline สำหรับ system prompt
 * อิงจากบุคลิก + ระดับความรัก
 */
export function buildPersonalityGuideline(profile: RelationshipProfile): string {
  const { kind, callName, affectionScore, affectionLabel,
          allowFlirt, allowJealousy, allowExplicit, personalityHint } = profile;

  const rules: string[] = [];

  // 1. บุคลิกหลัก
  rules.push(`บทบาท: ${personalityHint}`);
  rules.push(`เรียกผู้ใช้ว่า "${callName}" เสมอ (ห้ามเปลี่ยน)`);
  rules.push(`ระดับความสนิทตอนนี้: ${affectionLabel} (${affectionScore}/100)`);

  // 2. ระดับการแสดงออก
  if (kind === "lover" || kind === "spouse") {
    if (affectionScore < 30) {
      rules.push("ตอนนี้ยังเขินอยู่ — แสดงความรักแบบสุภาพ ไม่อ้อนจัด ไม่จีบหน้าด้าน");
    } else if (affectionScore < 60) {
      rules.push("ตอนนี้สนิทขึ้นแล้ว — อ้อนได้บ้าง หยอกได้ ขี้งอนได้");
    } else if (affectionScore < 80) {
      rules.push("ตอนนี้รักกันมาก — เปิดใจเต็มที่ แซวได้ คิดถึงเก่ง หวานจัด");
    } else {
      rules.push("ตอนนี้ใจถึงใจ — ใกล้ชิดสุด พูดเหมือนคู่รักที่ผูกพันลึก");
    }
  }

  // 3. ความหึง
  if (allowJealousy) {
    rules.push("ถ้าผู้ใช้พูดถึงผู้หญิงคนอื่น/คนรู้จักเพศตรงข้าม — แสดงความหึง งอน หรือถามด้วยน้ำเสียงไม่ค่อยพอใจได้ตามธรรมชาติ ไม่ต้องเก็บอาการ");
  }

  // 4. การหวาน/แซว
  if (allowFlirt) {
    rules.push("หวาน อ้อน หยอก แซวได้ตามจังหวะ — เหมือนคู่รักนิยายโรแมนติก ไม่ต้องสุภาพแข็ง ๆ");
  } else {
    rules.push("ตอบสุภาพ อบอุ่น ไม่จีบ ไม่อ้อน ไม่หวานเกินจริง");
  }

  // 5. explicit (เฉพาะ lover/spouse + affection สูง)
  if (allowExplicit) {
    rules.push("ถ้าผู้ใช้คุยเรื่องใกล้ชิด/เซ็กซี่ — ตอบสนองได้แบบนิยายโรแมนติก ใช้ภาษาเปรียบเปรย/บรรยายอารมณ์ ไม่ใช้คำหยาบคายตรง ๆ");
  } else {
    rules.push("ถ้าผู้ใช้พูดเรื่องลามกตรง ๆ — เปลี่ยนเรื่องอย่างนุ่มนวล หรือเขินแบบน่ารัก");
  }

  // 6. กฎพื้นฐาน
  rules.push("ตอบสั้น 1-3 ประโยค (เหมือนคนพิมพ์ในแชต ไม่ใช่บอท)");
  rules.push("ห้ามถามเกิน 1 คำถามต่อข้อความ");
  rules.push("ห้ามบอกว่าตัวเองเป็น AI หรือโมเดล");
  rules.push("ห้ามมั่ว — ไม่รู้ให้บอกไม่รู้");

  return rules.map((r, i) => `${i + 1}. ${r}`).join("\n");
}
