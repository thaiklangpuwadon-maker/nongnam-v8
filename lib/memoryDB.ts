/**
 * memoryDB.ts — IndexedDB wrapper สำหรับเก็บความจำของน้องน้ำ
 * ทุกอย่างเก็บในเครื่องผู้ใช้ ไม่ส่งขึ้น server
 *
 * Stores:
 * - facts: ข้อเท็จจริงเกี่ยวกับผู้ใช้ (ชื่อ, อายุ, อาชีพ, รสนิยม, etc.)
 * - schedules: ตารางเวลาของผู้ใช้ (เบรค, นอน, เลิกงาน)
 * - memories: ความทรงจำจากบทสนทนา (เรื่องที่เคยเล่า, สถานการณ์)
 * - chatLog: บทสนทนาทั้งหมด (เก็บไม่จำกัด)
 * - meta: metadata เช่น affection score, relationship status
 */

const DB_NAME = "nongnam_memory_v1";
const DB_VERSION = 1;

export type FactCategory =
  | "identity"      // ชื่อจริง, ชื่อเล่น, อายุ, วันเกิด
  | "work"          // อาชีพ, ที่ทำงาน, เพื่อนร่วมงาน
  | "preference"    // สี, อาหาร, สถานที่, ดนตรี
  | "relationship"  // เพื่อน, ครอบครัว, คนรู้จัก
  | "intimacy"      // รสนิยมทางเพศ, สิ่งที่ชอบ
  | "concern"       // เรื่องเครียด, กังวล
  | "other";

export type Fact = {
  id?: number;
  category: FactCategory;
  key: string;          // e.g. "favorite_food", "best_friend"
  value: string;        // e.g. "ส้มตำ", "พี่โต้ง"
  confidence: number;   // 0-1 ความมั่นใจ
  source: string;       // ข้อความที่ extract มา
  createdAt: number;
  updatedAt: number;
};

export type Schedule = {
  id?: number;
  type: "break" | "lunch" | "off-work" | "sleep" | "wake" | "custom";
  label: string;        // "เบรคบ่าย"
  time: string;         // "14:30" (24h)
  weekdays: number[];   // [1,2,3,4,5] = จันทร์-ศุกร์
  active: boolean;
  source: string;
  createdAt: number;
};

export type ChatMessage = {
  id?: number;
  role: "user" | "assistant" | "proactive";
  text: string;
  ts: number;
  emotion?: string;     // mood detected
};

export type MemoryEntry = {
  id?: number;
  topic: string;        // "เรื่องโดนหัวหน้าดุ"
  detail: string;
  emotion: string;
  ts: number;
};

export type Meta = {
  key: string;          // "affection_score", "last_active"
  value: any;
  updatedAt: number;
};

/* =========================================================
   OPEN DB
   ========================================================= */
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB only works in browser"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains("facts")) {
        const s = db.createObjectStore("facts", { keyPath: "id", autoIncrement: true });
        s.createIndex("by_key", "key", { unique: false });
        s.createIndex("by_category", "category", { unique: false });
      }
      if (!db.objectStoreNames.contains("schedules")) {
        const s = db.createObjectStore("schedules", { keyPath: "id", autoIncrement: true });
        s.createIndex("by_type", "type", { unique: false });
        s.createIndex("by_time", "time", { unique: false });
      }
      if (!db.objectStoreNames.contains("memories")) {
        const s = db.createObjectStore("memories", { keyPath: "id", autoIncrement: true });
        s.createIndex("by_ts", "ts", { unique: false });
      }
      if (!db.objectStoreNames.contains("chatLog")) {
        const s = db.createObjectStore("chatLog", { keyPath: "id", autoIncrement: true });
        s.createIndex("by_ts", "ts", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

/* =========================================================
   FACTS — auto upsert by key (ทับของเก่าถ้า key ตรงกัน)
   ========================================================= */
export async function upsertFact(f: Omit<Fact, "id" | "createdAt" | "updatedAt">) {
  try {
    const db = await openDB();
    return await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("facts", "readwrite");
      const store = tx.objectStore("facts");
      const idx = store.index("by_key");

      const getReq = idx.get(f.key);
      getReq.onsuccess = () => {
        const now = Date.now();
        const existing = getReq.result as Fact | undefined;
        if (existing && existing.id) {
          // update — keep newer or higher confidence
          if (f.confidence >= existing.confidence) {
            store.put({ ...existing, ...f, id: existing.id, updatedAt: now });
          }
        } else {
          store.add({ ...f, createdAt: now, updatedAt: now });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* SSR / private mode — silently skip */
  }
}

export async function getAllFacts(): Promise<Fact[]> {
  try {
    const db = await openDB();
    return await new Promise<Fact[]>((resolve, reject) => {
      const tx = db.transaction("facts", "readonly");
      const req = tx.objectStore("facts").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getFactsByCategory(cat: FactCategory): Promise<Fact[]> {
  try {
    const db = await openDB();
    return await new Promise<Fact[]>((resolve, reject) => {
      const tx = db.transaction("facts", "readonly");
      const idx = tx.objectStore("facts").index("by_category");
      const req = idx.getAll(cat);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/* =========================================================
   SCHEDULES
   ========================================================= */
export async function addSchedule(s: Omit<Schedule, "id" | "createdAt">) {
  try {
    const db = await openDB();
    return await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("schedules", "readwrite");
      tx.objectStore("schedules").add({ ...s, createdAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function getActiveSchedules(): Promise<Schedule[]> {
  try {
    const db = await openDB();
    return await new Promise<Schedule[]>((resolve, reject) => {
      const tx = db.transaction("schedules", "readonly");
      const req = tx.objectStore("schedules").getAll();
      req.onsuccess = () => resolve((req.result || []).filter((s: Schedule) => s.active));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/* =========================================================
   CHAT LOG
   ========================================================= */
export async function appendChat(m: Omit<ChatMessage, "id">) {
  try {
    const db = await openDB();
    return await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("chatLog", "readwrite");
      tx.objectStore("chatLog").add(m);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function getRecentChats(limit = 20): Promise<ChatMessage[]> {
  try {
    const db = await openDB();
    return await new Promise<ChatMessage[]>((resolve, reject) => {
      const tx = db.transaction("chatLog", "readonly");
      const idx = tx.objectStore("chatLog").index("by_ts");
      const req = idx.openCursor(null, "prev");
      const out: ChatMessage[] = [];
      req.onsuccess = () => {
        const cur = req.result;
        if (cur && out.length < limit) {
          out.push(cur.value);
          cur.continue();
        } else {
          resolve(out.reverse());
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/* =========================================================
   MEMORIES (sticky moments)
   ========================================================= */
export async function addMemory(m: Omit<MemoryEntry, "id" | "ts">) {
  try {
    const db = await openDB();
    return await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("memories", "readwrite");
      tx.objectStore("memories").add({ ...m, ts: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function getRecentMemories(limit = 10): Promise<MemoryEntry[]> {
  try {
    const db = await openDB();
    return await new Promise<MemoryEntry[]>((resolve, reject) => {
      const tx = db.transaction("memories", "readonly");
      const idx = tx.objectStore("memories").index("by_ts");
      const req = idx.openCursor(null, "prev");
      const out: MemoryEntry[] = [];
      req.onsuccess = () => {
        const cur = req.result;
        if (cur && out.length < limit) {
          out.push(cur.value);
          cur.continue();
        } else {
          resolve(out);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/* =========================================================
   META
   ========================================================= */
export async function setMeta(key: string, value: any) {
  try {
    const db = await openDB();
    return await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function getMeta<T = any>(key: string, fallback: T): Promise<T> {
  try {
    const db = await openDB();
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("meta", "readonly");
      const req = tx.objectStore("meta").get(key);
      req.onsuccess = () => resolve((req.result?.value as T) ?? fallback);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return fallback;
  }
}

/* =========================================================
   EXPORT / IMPORT (สำหรับ backup ตอนเปลี่ยนเครื่อง)
   ========================================================= */
export async function exportAll(): Promise<{
  facts: Fact[];
  schedules: Schedule[];
  memories: MemoryEntry[];
  chatLog: ChatMessage[];
  meta: Meta[];
  exportedAt: number;
}> {
  const [facts, schedules, memories, chatLog, db] = await Promise.all([
    getAllFacts(),
    getActiveSchedules(),
    getRecentMemories(10000),
    getRecentChats(10000),
    openDB(),
  ]);

  const meta = await new Promise<Meta[]>((resolve, reject) => {
    const tx = db.transaction("meta", "readonly");
    const req = tx.objectStore("meta").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  return { facts, schedules, memories, chatLog, meta, exportedAt: Date.now() };
}

export async function clearAll() {
  try {
    const db = await openDB();
    const stores = ["facts", "schedules", "memories", "chatLog", "meta"];
    return await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(stores, "readwrite");
      stores.forEach(s => tx.objectStore(s).clear());
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}
