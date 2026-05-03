import type { RollContext, Layer } from "./types";
import { SLEEPINESS_TREE } from "./trees/sleepiness";
import { AFFECTION_TREE } from "./trees/affection";
import { IRRITATION_TREE } from "./trees/irritation";

export type TreeName = "sleepiness" | "affection" | "irritation";

export interface RoutedTree {
  name: TreeName;
  layers: Layer[];
}

/**
 * routeToTree — เลือก tree ที่เหมาะกับบริบท
 *
 * Phase A: 3 trees หลัก
 * Phase B จะเพิ่ม: jealousy, hunger, sadness, loneliness, etc.
 */
export function routeToTree(ctx: RollContext): RoutedTree {
  const msg = ctx.userMessageLower;
  const hour = ctx.hour;

  // ===== กฎเลือก tree =====

  // 1. คำที่บ่งชัดว่าเป็นเรื่องนอน/ตื่น
  if (/ตื่น|ปลุก|หลับ|ง่วง|นอน|ฝัน|sleep|wake/.test(msg)) {
    return { name: "sleepiness", layers: SLEEPINESS_TREE };
  }

  // 2. คำที่ trigger หงุดหงิด/หึง/งอน
  if (/แฟนเก่า|คนเก่า|ผู้หญิงคนอื่น|ผู้ชายคนอื่น|งอน|หึง|รำคาญ|ทำไมไม่|โง่|งี่เง่า/.test(msg)) {
    return { name: "irritation", layers: IRRITATION_TREE };
  }

  // 3. คำที่ trigger ความหวาน/รัก/อ้อน/ห่วง
  if (/รัก|คิดถึง|หวาน|กอด|จุ๊บ|หอม|ที่รัก|ผัว|เมีย|แฟน|honey|ฟังดี ๆ|อ้อน/.test(msg)) {
    return { name: "affection", layers: AFFECTION_TREE };
  }

  // 4. ผู้ใช้เหนื่อย/เครียด → affection
  if (/เหนื่อย|ท้อ|เครียด|เศร้า|ไม่ไหว|ปวดหัว|ลำบาก|เบื่อ/.test(msg)) {
    return { name: "affection", layers: AFFECTION_TREE };
  }

  // 5. กลางดึก หรือเช้ามืด → bias to sleepiness
  if (ctx.isLateNight || ctx.isMorning) {
    return { name: "sleepiness", layers: SLEEPINESS_TREE };
  }

  // 6. default — ใช้ affection (โทนอบอุ่น)
  return { name: "affection", layers: AFFECTION_TREE };
}
