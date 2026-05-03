import type { Layer, Choice, RollContext, RollResult, CompanionDNA, CompanionMemory } from "./types";

/**
 * makeSeed — สร้างเลข seed จากหลายปัจจัย
 * เพื่อให้แต่ละ user × แต่ละช่วงเวลา × แต่ละข้อความ ได้ seed ไม่ซ้ำ
 */
export function makeSeed(parts: (string | number | undefined | null)[]): number {
  const text = parts.filter(v => v !== undefined && v !== null && v !== "").join("|");
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * seededRandom — mulberry32 PRNG
 * ผลลัพธ์เหมือนเดิมถ้า seed เดิม → debug ได้
 */
export function seededRandom(seed: number): () => number {
  let t = seed + 0x6D2B79F5;
  return function () {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * resolveWeight — แปลง weight ที่เป็น function ให้เป็นเลขจริงตาม context
 */
export function resolveWeight(
  weight: number | ((ctx: RollContext) => number),
  ctx: RollContext
): number {
  return typeof weight === "function" ? Math.max(0, weight(ctx)) : Math.max(0, weight);
}

/**
 * weightedPick — สุ่มจาก array แบบมีน้ำหนัก
 */
export function weightedPick<T>(
  items: { value: T; weight: number }[],
  random: () => number
): T {
  const valid = items.filter(i => i.weight > 0);
  if (valid.length === 0) {
    throw new Error("weightedPick: no valid choices");
  }
  const total = valid.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of valid) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return valid[valid.length - 1].value;
}

/**
 * rollLayer — สุ่ม 1 layer ตาม context
 */
export function rollLayer<T = string>(
  layer: Layer<T>,
  ctx: RollContext,
  random: () => number
): T {
  const resolved = layer.choices.map(choice => ({
    value: choice.value,
    weight: resolveWeight(choice.weight, ctx),
  }));
  return weightedPick(resolved, random);
}

/**
 * rollTree — เดินลง tree ครบทุก layer → ออกเป็น leaf
 */
export function rollTree(
  layers: Layer[],
  ctx: RollContext,
  random: () => number
): RollResult {
  const result: RollResult = {};
  for (const layer of layers) {
    try {
      result[layer.id] = String(rollLayer(layer, ctx, random));
    } catch {
      // fallback: เลือกอันแรก
      const first = layer.choices[0]?.value;
      if (first !== undefined) result[layer.id] = String(first);
    }
  }
  return result;
}

/**
 * buildRollContext — รวมข้อมูลทุกอย่างเป็น context สำหรับ rolling
 */
export function buildRollContext(
  timestamp: Date,
  dna: CompanionDNA,
  memory: CompanionMemory,
  userMessage: string
): RollContext {
  const hour = timestamp.getHours();
  return {
    timestamp,
    dayOfWeek: timestamp.getDay(),
    hour,
    isLateNight: hour >= 22 || hour <= 5,
    isMorning: hour >= 5 && hour <= 9,
    isAfternoon: hour >= 12 && hour <= 17,
    dna,
    memory,
    userMessage: userMessage || "",
    userMessageLower: (userMessage || "").toLowerCase(),
  };
}
