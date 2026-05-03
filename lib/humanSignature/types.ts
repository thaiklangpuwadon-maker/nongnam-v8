/**
 * Human Signature Tree Engine — Type Definitions
 *
 * ระบบสุ่มแบบ tree หลายชั้น เพื่อให้ AI ตอบเหมือนมนุษย์จริง
 * ไม่ใช่บอทที่ตอบ pattern ซ้ำ ๆ
 */

export type Trait =
  | "clingy"      // ขี้อ้อน
  | "playful"     // ขี้เล่น
  | "grumpy"      // ขี้หงุดหงิด
  | "romantic"    // โรแมนติก
  | "introvert"   // เก็บตัว
  | "jealous"     // ขี้หึง
  | "sulky";      // ขี้งอน

export type Role =
  | "student"
  | "office_worker"
  | "night_shift"
  | "homebody"
  | "freelancer";

export interface CompanionDNA {
  fingerprint: string;          // unique key per user
  traits: Record<Trait, number>; // 0-1 ของแต่ละ trait
  role: Role;
  speechStyle: {
    endingWords: string[];      // ["นะ", "อะ", "ดิ"]
    typosRate: number;          // 0-0.1
    drawl: boolean;             // ลากเสียง
    callName: string;           // วิธีเรียก user
    selfName: string;           // ชื่อตัวเอง
  };
  baseAffection: number;        // 0-100 baseline ตามความสัมพันธ์
}

export interface CompanionMemory {
  lastMood?: string;
  lastTopic?: string;
  socialBattery: number;        // 0-100
  affectionScore: number;       // 0-100 ปัจจุบัน
  recentMentions: string[];     // คนที่พูดถึง (สำหรับหึง)
  facts: Array<{ key: string; value: string }>;
  schedules: Array<{ type: string; label: string; time: string }>;
  currentLifeArc?: string;
}

export interface RollContext {
  timestamp: Date;
  dayOfWeek: number;            // 0=อาทิตย์
  hour: number;                 // 0-23
  isLateNight: boolean;         // 22-5
  isMorning: boolean;           // 5-9
  isAfternoon: boolean;         // 12-17
  dna: CompanionDNA;
  memory: CompanionMemory;
  userMessage: string;
  userMessageLower: string;
}

export interface Choice<T = string> {
  value: T;
  label?: string;               // คำอธิบายไทย
  weight: number | ((ctx: RollContext) => number);
  metadata?: Record<string, unknown>;
}

export interface Layer<T = string> {
  id: string;
  description?: string;
  choices: Choice<T>[];
}

export type RollResult = Record<string, string>;

export interface SignatureLeaf {
  treeName: string;
  category: string;
  variant: string;
  intensity: number;
  cause: string;
  expression: string;
  hiddenDesire: string;
  replyShape: string;
  length: "very_short" | "short" | "medium" | "long";
  tone: string;
  microImperfection: string;
  endingWord: string;
}
