/**
 * factExtractor.ts — แยกข้อมูลผู้ใช้จากข้อความแชต
 * ใช้ regex pattern matching (ไม่ต้องเรียก AI เพิ่ม ประหยัด token)
 *
 * จับได้:
 * - ชื่อจริง / ชื่อเล่น
 * - งาน / สถานที่ทำงาน
 * - เวลาเบรค / เลิกงาน / นอน
 * - อาหารที่ชอบ / สีที่ชอบ
 * - เพื่อน / คนสำคัญ
 * - เรื่องที่กังวล / สถานการณ์
 */

import type { Fact, FactCategory, Schedule } from "./memoryDB";

export type ExtractedData = {
  facts: Array<Omit<Fact, "id" | "createdAt" | "updatedAt">>;
  schedules: Array<Omit<Schedule, "id" | "createdAt">>;
  mentions: string[];   // ชื่อบุคคลที่ถูกพูดถึง (สำหรับ jealousy)
};

/* =========================================================
   TIME PARSER — ดึงเวลาจากข้อความ
   "พักเที่ยง" = 12:00
   "บ่ายสอง" = 14:00
   "5 โมงเย็น" = 17:00
   "พักเบรค 14:30" = 14:30
   ========================================================= */
function parseTimeToHHMM(text: string): string | null {
  // 1. รูปแบบ HH:MM
  const m1 = text.match(/(\d{1,2}):(\d{2})/);
  if (m1) {
    const h = parseInt(m1[1]);
    const mm = m1[2];
    if (h >= 0 && h <= 23 && parseInt(mm) <= 59) return `${String(h).padStart(2, "0")}:${mm}`;
  }

  // 2. คำไทย
  if (/เที่ยง(ตรง)?/.test(text)) return "12:00";
  if (/เที่ยงคืน/.test(text)) return "00:00";
  if (/(เช้าตรู่|ตี\s*5)/.test(text)) return "05:00";

  // ตี
  const tee = text.match(/ตี\s*(\d+)/);
  if (tee) {
    const h = parseInt(tee[1]);
    if (h >= 1 && h <= 5) return `0${h}:00`;
  }

  // โมงเช้า
  const morning = text.match(/(\d+)\s*โมง(เช้า)?/);
  if (morning) {
    const h = parseInt(morning[1]);
    if (/เช้า/.test(text)) return `${String(h).padStart(2, "0")}:00`;
  }

  // บ่าย / โมงเย็น
  if (/บ่าย\s*โมง/.test(text)) return "13:00";
  const afternoon = text.match(/บ่าย\s*(\d+)/);
  if (afternoon) {
    const h = parseInt(afternoon[1]);
    if (h >= 1 && h <= 6) return `${String(12 + h).padStart(2, "0")}:00`;
  }

  const evening = text.match(/(\d+)\s*โมง(เย็น|ค่ำ)?/);
  if (evening) {
    const h = parseInt(evening[1]);
    const isEvening = /เย็น|ค่ำ/.test(text) || h <= 6;
    if (isEvening && h <= 6) return `${String(12 + h).padStart(2, "0")}:00`;
    if (h >= 7 && h <= 11) return `${String(h).padStart(2, "0")}:00`;
  }

  // ทุ่ม
  const tum = text.match(/(\d+)\s*ทุ่ม/);
  if (tum) {
    const h = parseInt(tum[1]);
    if (h >= 1 && h <= 5) return `${String(18 + h).padStart(2, "0")}:00`;
  }

  return null;
}

/* =========================================================
   SCHEDULE PATTERNS — จับเวลากิจวัตร
   ========================================================= */
function extractSchedules(text: string): Array<Omit<Schedule, "id" | "createdAt">> {
  const out: Array<Omit<Schedule, "id" | "createdAt">> = [];
  const allWeek = [1, 2, 3, 4, 5, 6, 0];
  const weekday = [1, 2, 3, 4, 5];

  // เบรค / พัก
  const breakPatterns = [
    /(?:พัก|เบรค)(?:เที่ยง|กลางวัน)?\s*(?:ที่|เวลา|ตอน)?\s*([\d:โมงเช้าบ่ายเย็นเที่ยงค่ำทุ่มตี\s]+)/g,
    /([\d:โมงเช้าบ่ายเย็นเที่ยงค่ำทุ่มตี\s]+?)\s*(?:พัก|เบรค)(?:เที่ยง|กลางวัน)?/g,
  ];
  for (const p of breakPatterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      const time = parseTimeToHHMM(m[1] || m[0]);
      if (time) {
        const isLunch = /เที่ยง|กลางวัน/.test(m[0]);
        out.push({
          type: isLunch ? "lunch" : "break",
          label: isLunch ? "พักเที่ยง" : "เบรค",
          time,
          weekdays: weekday,
          active: true,
          source: m[0].slice(0, 100),
        });
      }
    }
  }

  // เลิกงาน
  const offWorkPatterns = [
    /เลิกงาน(?:ที่|เวลา|ตอน)?\s*([\d:โมงเช้าบ่ายเย็นเที่ยงค่ำทุ่มตี\s]+)/g,
    /([\d:โมงเช้าบ่ายเย็นเที่ยงค่ำทุ่มตี\s]+?)\s*เลิกงาน/g,
  ];
  for (const p of offWorkPatterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      const time = parseTimeToHHMM(m[1] || m[0]);
      if (time) {
        out.push({
          type: "off-work",
          label: "เลิกงาน",
          time,
          weekdays: weekday,
          active: true,
          source: m[0].slice(0, 100),
        });
      }
    }
  }

  // นอน
  const sleepPatterns = [
    /(?:นอน|เข้านอน|หลับ)(?:ที่|เวลา|ตอน)?\s*([\d:โมงเช้าบ่ายเย็นเที่ยงค่ำทุ่มตี\s]+)/g,
  ];
  for (const p of sleepPatterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      const time = parseTimeToHHMM(m[1]);
      if (time) {
        out.push({
          type: "sleep",
          label: "นอน",
          time,
          weekdays: allWeek,
          active: true,
          source: m[0].slice(0, 100),
        });
      }
    }
  }

  // ตื่น
  const wakePatterns = [
    /(?:ตื่น|ตื่นนอน)(?:ที่|เวลา|ตอน)?\s*([\d:โมงเช้าบ่ายเย็นเที่ยงค่ำทุ่มตี\s]+)/g,
  ];
  for (const p of wakePatterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      const time = parseTimeToHHMM(m[1]);
      if (time) {
        out.push({
          type: "wake",
          label: "ตื่นนอน",
          time,
          weekdays: weekday,
          active: true,
          source: m[0].slice(0, 100),
        });
      }
    }
  }

  return out;
}

/* =========================================================
   FACT EXTRACTORS — จับข้อมูลเฉพาะหมวด
   ========================================================= */

function extractIdentity(text: string): Array<Omit<Fact, "id" | "createdAt" | "updatedAt">> {
  const out: Array<Omit<Fact, "id" | "createdAt" | "updatedAt">> = [];

  // ชื่อจริง: "ฉันชื่อ X", "ผมชื่อ X", "เรียกฉันว่า X"
  const namePatterns = [
    /(?:ฉัน|ผม|เรา|ข้า|ดิ)?ชื่อ(?:เล่น|จริง)?\s+([\u0E00-\u0E7Fa-zA-Z]{2,15})/,
    /(?:เรียก|ทัก)(?:ฉัน|ผม|เรา|ข้า)?(?:ว่า)?\s+([\u0E00-\u0E7Fa-zA-Z]{2,15})/,
  ];
  for (const p of namePatterns) {
    const m = text.match(p);
    if (m && m[1] && !/น้องน้ำ|พี่|ที่รัก|ผัว|เมีย/.test(m[1])) {
      out.push({
        category: "identity", key: "real_name", value: m[1],
        confidence: 0.85, source: m[0].slice(0, 80),
      });
      break;
    }
  }

  // อายุ
  const ageMatch = text.match(/อายุ\s*(\d{1,2})/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age >= 1 && age <= 100) {
      out.push({
        category: "identity", key: "age", value: String(age),
        confidence: 0.9, source: ageMatch[0],
      });
    }
  }

  // วันเกิด
  const bdayMatch = text.match(/(?:เกิด|วันเกิด).{0,15}(\d{1,2})\s*(มกรา|กุมภา|มีนา|เมษา|พฤษภา|มิถุนา|กรกฎา|สิงหา|กันยา|ตุลา|พฤศจิกา|ธันวา)/);
  if (bdayMatch) {
    out.push({
      category: "identity", key: "birthday", value: `${bdayMatch[1]} ${bdayMatch[2]}`,
      confidence: 0.85, source: bdayMatch[0].slice(0, 80),
    });
  }

  return out;
}

function extractWork(text: string): Array<Omit<Fact, "id" | "createdAt" | "updatedAt">> {
  const out: Array<Omit<Fact, "id" | "createdAt" | "updatedAt">> = [];

  // อาชีพ
  const jobs = [
    "หมอ", "พยาบาล", "ครู", "อาจารย์", "วิศวกร", "โปรแกรมเมอร์",
    "ทหาร", "ตำรวจ", "พนักงานบริษัท", "พนักงาน", "เจ้าของกิจการ",
    "คนขับรถ", "พ่อครัว", "แม่ครัว", "นักศึกษา", "ฟรีแลนซ์",
    "พนักงานโรงงาน", "ช่าง",
  ];
  for (const j of jobs) {
    if (new RegExp(`(เป็น|ทำงาน|อาชีพ)\\s*${j}`).test(text)) {
      out.push({
        category: "work", key: "job", value: j,
        confidence: 0.8, source: text.slice(0, 80),
      });
      break;
    }
  }

  // หัวหน้าดุ
  if (/(?:โดน|ถูก)?\s*(?:หัวหน้า|เจ้านาย|บอส)\s*(?:ดุ|ด่า|ว่า)/.test(text)) {
    out.push({
      category: "concern", key: "scolded_by_boss",
      value: "เคยโดนหัวหน้าดุ",
      confidence: 0.9, source: text.slice(0, 100),
    });
  }

  return out;
}

function extractPreference(text: string): Array<Omit<Fact, "id" | "createdAt" | "updatedAt">> {
  const out: Array<Omit<Fact, "id" | "createdAt" | "updatedAt">> = [];

  // อาหารที่ชอบ
  const foodMatch = text.match(/(?:ชอบ(?:กิน)?|กินบ่อย|ของโปรด)\s+([\u0E00-\u0E7F]{2,20}?)(?:\s|$|\.|,|มาก|จัง|จัง|จริง)/);
  if (foodMatch && foodMatch[1] && !/พี่|น้อง|คน/.test(foodMatch[1])) {
    out.push({
      category: "preference", key: "favorite_food", value: foodMatch[1],
      confidence: 0.65, source: foodMatch[0].slice(0, 80),
    });
  }

  // สีที่ชอบ
  const colorMatch = text.match(/ชอบสี\s*([\u0E00-\u0E7F]{2,15})/);
  if (colorMatch) {
    out.push({
      category: "preference", key: "favorite_color", value: colorMatch[1],
      confidence: 0.85, source: colorMatch[0],
    });
  }

  return out;
}

function extractMentions(text: string): string[] {
  // จับชื่อบุคคล: "พี่ X", "น้อง X", "คุณ X" — สำหรับ jealousy detection
  const out = new Set<string>();
  const patterns = [
    /(?:พี่|น้อง|คุณ|เพื่อน)\s+([\u0E00-\u0E7Fa-zA-Z]{2,12})/g,
    /([\u0E00-\u0E7Fa-zA-Z]{2,12})\s+(?:เป็น|ทำ|พูดว่า|บอก)/g,
  ];
  // กรองคำสรรพนามทั่วไป
  const stopwords = new Set([
    "น้องน้ำ", "ฉัน", "ผม", "เรา", "พี่", "น้อง", "คุณ",
    "วันนี้", "ตอนนี้", "เดี๋ยว", "เมื่อไหร่",
  ]);
  for (const p of patterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      const name = m[1];
      if (name && !stopwords.has(name)) out.add(name);
    }
  }
  return Array.from(out).slice(0, 5);
}

/* =========================================================
   MAIN EXPORT
   ========================================================= */
export function extractFromMessage(text: string): ExtractedData {
  const t = text.trim();
  if (!t || t.length < 3) {
    return { facts: [], schedules: [], mentions: [] };
  }
  return {
    facts: [
      ...extractIdentity(t),
      ...extractWork(t),
      ...extractPreference(t),
    ],
    schedules: extractSchedules(t),
    mentions: extractMentions(t),
  };
}
