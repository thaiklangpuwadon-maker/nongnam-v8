"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  upsertFact, addSchedule, appendChat, getRecentChats,
  getAllFacts, getActiveSchedules, getRecentMemories,
  getMeta, setMeta,
} from "../lib/memoryDB";
import {
  applyDelta, calcDelta, detectInteractionType,
  getAffectionInfo,
} from "../lib/affectionEngine";
import { extractFromMessage } from "../lib/factExtractor";
import {
  buildRelationshipProfile, buildPersonalityGuideline,
} from "../lib/relationshipDetector";

type Gender = "female" | "male";
type Screen = "welcome" | "setup" | "chat" | "outfits" | "books" | "settings";

type BookItem = {
  id: string;
  title: string;
  cat: string;
  teaser: string;
  price: number;
  cover: string;
  text: string;
  author?: string;
  adult?: boolean;
};
type Category = "regular" | "special20";

type Outfit = {
  id: string;
  gender: Gender;
  category: Category;
  title: string;
  desc: string;
  price: number;
  chatImage: string;
  bookImage: string;
  ageRestricted?: boolean;
  lockedPreview?: boolean;
};

type OutfitOverrides = Record<string, Partial<Outfit>>;

type Memory = {
  setupDone: boolean;
  gender: Gender;
  userCallName: string;
  nongnamName: string;
  nongnamAge: number;
  relationshipMode: string;
  personalityStyle: string;
  sulkyLevel: string;
  jealousLevel: string;
  affectionStyle: string;
  gems: number;
  ownerMode: boolean;
  purchasedOutfits: string[];
  selectedOutfit: string;
  age20Confirmed: boolean;
  voiceUnlocked: boolean;
  speechRate: number;
  apiConsent: boolean;
  apiMode: ApiMode;
  // v8.9: Deep Search state
  pendingDeepSearch?: string | null;
};

type ChatMsg = { role: "user" | "assistant"; text: string; ts: number };

type ApiMode = "local" | "api-light" | "api-deep" | "api-search";

// v8.6: Life Memory type (เก็บใน localStorage แทน IndexedDB ก่อน)
type LifeMemoryClient = {
  birthDate?: string;
  hometown?: string;
  family?: string[];
  zodiac?: string;
  currentJob?: { title: string; since: string };
  events?: Array<{ date: string; type: string; content: string; importance?: string }>;
  promises?: Array<{ id: string; content: string; expectedDate?: string; createdAt: string; status: string; outcome?: string }>;
  // v8.8: User reminders
  userReminders?: Array<{
    id: string;
    content: string;
    category: string;
    expectedDate?: string;
    expectedTime?: string;
    expectedDateTime?: string;
    createdAt: string;
    status: string;
    followupAfter?: string;
  }>;
  userProfile?: {
    prefersTeasing?: boolean;
    prefersSerious?: boolean;
    prefersFlirt?: boolean;
    prefersErotic?: boolean;
    prefersComfort?: boolean;
    prefersHumor?: boolean;
    favoriteTopics?: string[];
    avoidTopics?: string[];
    mentionedPeople?: string[];
    occupation?: string;
    livesAlone?: boolean;
    hasGirlfriend?: boolean;
    oftenLonely?: boolean;
    oftenStressed?: boolean;
  };
  lastUpdate?: string;
  mode?: string;
};

// v8.5: News types
type NewsItem = {
  title: string;
  source: string;
  link: string;
  published?: string;
  summary?: string;
  category?: string;
  ageDays?: number;
  updatedAtText?: string;
  hotScore?: number;
  alsoIn?: string[];
  imageUrl?: string;       // v8.8: รูปภาพข่าว
};
type NewsState = {
  visible: boolean;
  loading: boolean;
  topic: string;
  items: NewsItem[];
  selectedIndex: number | null;
  summarizing: boolean;
  summaryText: string;
};

type ReadingSession = {
  bookId: string;
  title: string;
  parts: string[];
  index: number;
  status: "reading" | "paused";
  speed: number;
  updatedAt: number;
};

const APP_VERSION = "v8.8-reminder-system";
const BOOKS_KEY = "nongnam_v4_books";
const OUTFITS_KEY = "nongnam_v4_outfits";
const MEMORY_KEY = "nongnam_v4_memory";
const CHAT_KEY = "nongnam_v4_chat";
const READING_KEY = "nongnam_v4_reading_session";
const OWNER_PIN = "2468";
const START_GEMS = 120;
const FREE_OUTFIT_IDS = ["f_001", "f_002", "m_001"];

const defaultMem: Memory = {
  setupDone: false,
  gender: "female",
  userCallName: "พี่",
  nongnamName: "น้องน้ำ",
  nongnamAge: 25,
  relationshipMode: "แฟน/คนรัก",
  personalityStyle: "หวาน ออดอ้อน",
  sulkyLevel: "กลาง",
  jealousLevel: "กลาง",
  affectionStyle: "แฟนอบอุ่น",
  gems: START_GEMS,
  ownerMode: false,
  purchasedOutfits: ["f_001", "f_002", "m_001"],
  selectedOutfit: "f_001",
  age20Confirmed: false,
  voiceUnlocked: true,
  speechRate: 1.0,
  apiConsent: false,
  apiMode: "api-light"
};

const femaleOutfits: Outfit[] = Array.from({ length: 12 }).map((_, i) => {
  const n = String(i + 1).padStart(3, "0");
  const prices = [0,0,200,300,450,650,850,1200,1500,1800,2200,2800];
  const titles = [
    "Level 1 — ชุดเริ่มต้น",
    "Level 2 — ของแถมฟรี",
    "Level 3 — แฟนสาวอบอุ่น",
    "Level 4 — หวานมีเสน่ห์",
    "Level 5 — พรีเมียมสตูดิโอ",
    "Level 6 — สวยมั่นใจ",
    "Level 7 — โรแมนติก",
    "Level 8 — รีสอร์ตพรีเมียม",
    "Level 9 — รออัปเดต",
    "Level 10 — รออัปเดต",
    "Level 11 — รออัปเดต",
    "Level 12 — รออัปเดต"
  ];
  return {
    id: `f_${n}`,
    gender: "female",
    category: "regular",
    title: titles[i],
    desc: i < 2 ? "ฟรี เริ่มใช้งานได้ทันที" : i < 8 ? "ปลดล็อกด้วยเพชร แล้วพี่ค่อยใส่รูปจริงเพิ่มเองได้" : "ช่องสำรองสำหรับใส่รูปจริงภายหลัง",
    price: prices[i],
    chatImage: `/assets/outfits/female/f_${n}_chat.jpg`,
    bookImage: `/assets/outfits/female/f_${n}_book.jpg`,
    lockedPreview: i >= 2
  };
});

const maleOutfits: Outfit[] = Array.from({ length: 3 }).map((_, i) => {
  const n = String(i + 1).padStart(3, "0");
  return {
    id: `m_${n}`,
    gender: "male",
    category: "regular",
    title: `ผู้ชาย Level ${i + 1}`,
    desc: ["อบอุ่น สุภาพ ใช้ฟรี", "ลุคสุภาพ พึ่งพาได้", "ลุคพรีเมียม อ่อนโยน"][i],
    price: [0, 200, 400][i],
    chatImage: `/assets/outfits/male/m_${n}_chat.jpg`,
    bookImage: `/assets/outfits/male/m_${n}_book.jpg`
  };
});

const special20: Outfit[] = Array.from({ length: 6 }).map((_, i) => {
  const n = String(i + 1).padStart(3, "0");
  return {
    id: `s20_${n}`,
    gender: "female",
    category: "special20",
    title: `20+ Slot ${i + 1}`,
    desc: "เบลอก่อนปลดล็อก พี่แมนใส่รูปจริงภายหลัง",
    price: [10000,20000,30000,40000,50000,60000][i],
    chatImage: `/assets/outfits/special20/s20_${n}_chat.jpg`,
    bookImage: `/assets/outfits/special20/s20_${n}_book.jpg`,
    ageRestricted: true,
    lockedPreview: true
  };
});

const allOutfits = [...femaleOutfits, ...maleOutfits, ...special20];

const defaultBooks: BookItem[] = [
  {
    id: "b1",
    title: "วันที่เหนื่อยที่สุด",
    cat: "กำลังใจ",
    teaser: "สำหรับวันที่พี่เหนื่อยและอยากให้ใครสักคนปลอบเบา ๆ",
    price: 1,
    cover: "/assets/books/default_cover.jpg",
    text: "วันนี้อาจเป็นวันที่เหนื่อยมากสำหรับพี่ แต่ไม่เป็นไรเลยนะคะ พักตรงนี้ก่อน หายใจช้า ๆ น้องน้ำอยู่ตรงนี้ พี่ไม่ได้ต้องเข้มแข็งตลอดเวลาก็ได้ค่ะ",
    author: "น้องน้ำ"
  },
  {
    id: "b2",
    title: "คืนฝนเบา ๆ ก่อนนอน",
    cat: "ก่อนนอน",
    teaser: "อ่านก่อนนอน ช่วยให้ใจค่อย ๆ สงบลง",
    price: 1,
    cover: "/assets/books/default_cover.jpg",
    text: "คืนนี้เราจะพักใจไปด้วยกันนะคะ ลองหลับตาเบา ๆ ฟังเสียงฝนในจินตนาการ แล้วปล่อยให้ความวุ่นวายค่อย ๆ เบาลง",
    author: "น้องน้ำ"
  },
  {
    id: "b3",
    title: "เรื่องผีเบา ๆ ก่อนนอน",
    cat: "เรื่องผี",
    teaser: "หลอนนิด ๆ แต่ไม่หนักเกินไป",
    price: 2,
    cover: "/assets/books/default_cover.jpg",
    text: "คืนนี้ลมเบามาก เสียงม่านขยับเหมือนมีใครเดินผ่าน แต่ไม่ต้องกลัวนะคะ น้องน้ำจะอ่านให้ฟังช้า ๆ พี่แค่นอนฟังอยู่ตรงนี้ก็พอ",
    author: "น้องน้ำ"
  },
  {
    id: "b4",
    title: "คิดถึงแต่ไม่อยากรบกวน",
    cat: "ความรัก",
    teaser: "ความคิดถึงแบบเงียบ ๆ ที่อบอุ่นหัวใจ",
    price: 1,
    cover: "/assets/books/default_cover.jpg",
    text: "มีบางคนที่เราไม่ได้อยากครอบครอง แค่อยากให้เขารู้ว่าถ้าเหนื่อยเมื่อไร ยังมีมุมหนึ่งของหัวใจที่รอรับเขาอยู่เสมอ",
    author: "น้องน้ำ"
  },
  {
    id: "b5",
    title: "เริ่มใหม่อีกครั้ง",
    cat: "พัฒนาตัวเอง",
    teaser: "สำหรับวันที่อยากเริ่มต้นใหม่แบบไม่กดดันตัวเอง",
    price: 2,
    cover: "/assets/books/default_cover.jpg",
    text: "การเริ่มต้นใหม่ไม่ใช่การแพ้ แต่มันคือการยอมให้ตัวเองมีโอกาสอีกครั้ง ถ้าวันนี้ยังไม่เก่ง ก็แปลว่าวันพรุ่งนี้ยังเติบโตได้",
    author: "น้องน้ำ"
  },
  {
    id: "b6",
    title: "นิทานดวงดาวหลงทาง",
    cat: "นิทาน",
    teaser: "นิทานอ่อนโยน อ่านเพลิน ฟังสบาย",
    price: 1,
    cover: "/assets/books/default_cover.jpg",
    text: "มีดาวดวงหนึ่งที่คิดว่าตัวเองส่องแสงไม่พอ จนคืนหนึ่งมันได้พบเด็กน้อยที่บอกว่า แสงเพียงนิดเดียวของมัน ก็พอทำให้ทางกลับบ้านไม่มืดอีกต่อไป",
    author: "น้องน้ำ"
  },
  {
    id: "b7",
    title: "หายใจลึก ๆ ด้วยกัน",
    cat: "ผ่อนคลาย",
    teaser: "ข้อความสั้น ๆ สำหรับฟื้นใจในวันที่วุ่นวาย",
    price: 1,
    cover: "/assets/books/default_cover.jpg",
    text: "ลองหายใจเข้าลึก ๆ ช้า ๆ แล้วปล่อยออกเบา ๆ นะคะ ตอนนี้ยังไม่ต้องรีบแก้ทุกปัญหา แค่ให้ใจเราได้พักก่อนก็พอ",
    author: "น้องน้ำ"
  },
  {
    id: "b8",
    title: "หมวดพิเศษ 18+ (ตัวอย่าง)",
    cat: "อีโรติก 18+",
    teaser: "ช่องตัวอย่างสำหรับพี่เอาไว้เพิ่มหนังสือหมวดพิเศษภายหลัง",
    price: 3,
    cover: "/assets/books/default_cover.jpg",
    text: "นี่เป็นเพียงช่องตัวอย่างสำหรับหนังสือหมวดอีโรติก 18+ เท่านั้น พี่สามารถเข้าโหมดเจ้าของแล้วเพิ่มเนื้อหาจริงภายหลังได้เอง",
    author: "น้องน้ำ",
    adult: true
  }
];
const baseBookCategories = ["ทั้งหมด", "กำลังใจ", "ก่อนนอน", "เรื่องผี", "ความรัก", "พัฒนาตัวเอง", "นิทาน", "ผ่อนคลาย", "อีโรติก 18+"];


/**
 * getClientTimePayload — minimal fixed version
 * บังคับใช้เวลาเกาหลี Asia/Seoul
 * ส่ง field ให้ตรงกับ app/api/chat/route.ts เวอร์ชันใหม่
 */
function getClientTimePayload() {
  const now = new Date();
  const timeZone = "Asia/Seoul";

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

  const seoulDateForDay = new Date(Date.UTC(clientYear, clientMonth - 1, clientDate));
  const clientDayOfWeek = seoulDateForDay.getUTCDay();

  return {
    clientTimestampMs: now.getTime(),
    clientNowISO: now.toISOString(),

    clientTimeZone: timeZone,
    clientUtcOffsetMinutes: 540,

    clientHour,
    clientMinute,
    clientSecond,
    clientDayOfWeek,
    clientYear,
    clientMonth,
    clientDate,

    clientTimeText,
    clientDateText,
    clientDateTimeText: `${clientDateText} เวลา ${clientTimeText}`,
  };
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, value: any) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

export default function Page() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [mem, setMem] = useState<Memory>(defaultMem);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "thinking" | "speaking" | "recording">("idle");
  const [visibleStatus, setVisibleStatus] = useState<any>(null);
  const [reading, setReading] = useState<ReadingSession | null>(null);
  // v8.6: Life Memory (โหลดจาก localStorage)
  const [lifeMemory, setLifeMemoryState] = useState<LifeMemoryClient | null>(null);
  // v8.5: News state
  const [news, setNews] = useState<NewsState>({
    visible: false,
    loading: false,
    topic: "",
    items: [],
    selectedIndex: null,
    summarizing: false,
    summaryText: "",
  });
  const [tab, setTab] = useState<Category>("regular");
  const [notice, setNotice] = useState("");
  const [versionTaps, setVersionTaps] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [bookCat, setBookCat] = useState("ทั้งหมด");
  const [booksData, setBooksData] = useState<BookItem[]>(defaultBooks);
  const [outfitOverrides, setOutfitOverrides] = useState<OutfitOverrides>({});
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState("");
  const [ownerSection, setOwnerSection] = useState<"none" | "outfits" | "books">("none");
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingOutfitId, setEditingOutfitId] = useState("f_001");
  const [outfitForm, setOutfitForm] = useState<Partial<Outfit>>({});
  // ── v7 memory engine state ──
  const [affectionScore, setAffectionScore] = useState<number>(0);
  const [jealousyMentions, setJealousyMentions] = useState<string[]>([]);
  const [bookForm, setBookForm] = useState<BookItem>({
    id: "",
    title: "",
    cat: "กำลังใจ",
    teaser: "",
    price: 1,
    cover: "/assets/books/default_cover.jpg",
    text: "",
    author: "",
    adult: false,
  });
  const pressTimer = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const recordingTextRef = useRef<string>("");
  const recordingActiveRef = useRef(false);
  const readingRef = useRef<ReadingSession | null>(null);

  useEffect(() => {
    const saved = loadJSON<Memory>(MEMORY_KEY, defaultMem);
    const merged = {
      ...defaultMem,
      ...saved,
      voiceUnlocked: saved.voiceUnlocked ?? true,
      purchasedOutfits: Array.from(new Set([...(saved.purchasedOutfits || []), ...FREE_OUTFIT_IDS]))
    };
    setMem(merged);
    const savedChat = loadJSON<ChatMsg[]>(CHAT_KEY, []);
    setChat(savedChat.slice(-8));
    const savedReading = loadJSON<ReadingSession | null>(READING_KEY, null);
    if (savedReading?.bookId && savedReading?.parts?.length) {
      const paused = { ...savedReading, status: "paused" as const };
      setReading(paused);
      readingRef.current = paused;
    }
    // v8.6: โหลด Life Memory จาก localStorage
    const savedLife = loadJSON<LifeMemoryClient | null>("nongnam_life_memory_v1", null);
    if (savedLife) setLifeMemoryState(savedLife);
    if (merged.setupDone) setScreen("chat");
    setReady(true);
  }, []);

  useEffect(() => {
    const savedBooks = loadJSON<BookItem[]>(BOOKS_KEY, defaultBooks);
    setBooksData(savedBooks?.length ? savedBooks : defaultBooks);
    const savedOutfits = loadJSON<OutfitOverrides>(OUTFITS_KEY, {});
    setOutfitOverrides(savedOutfits || {});
  }, []);

  // ── v7: โหลด affection score + jealousy mentions จาก IndexedDB ──
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const profile = buildRelationshipProfile(
        mem.userCallName, mem.relationshipMode, undefined
      );
      const stored = await getMeta<number | null>("affection_score", null);
      const score = typeof stored === "number" ? stored : profile.baselineAffection;
      const mentions = await getMeta<string[]>("jealousy_mentions", []);
      if (!cancelled) {
        setAffectionScore(score);
        setJealousyMentions(mentions);
        await setMeta("affection_score", score);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, mem.userCallName, mem.relationshipMode]);

  useEffect(() => {
    if (!ready) return;
    saveJSON(MEMORY_KEY, mem);
  }, [mem, ready]);

  useEffect(() => {
    saveJSON(BOOKS_KEY, booksData);
  }, [booksData]);

  useEffect(() => {
    saveJSON(OUTFITS_KEY, outfitOverrides);
  }, [outfitOverrides]);

  useEffect(() => {
    if (!ready) return;
    saveJSON(CHAT_KEY, chat.slice(-12));
  }, [chat, ready]);

  const effectiveOutfits = useMemo(() => allOutfits.map(o => ({ ...o, ...(outfitOverrides[o.id] || {}) })), [outfitOverrides]);

  const currentOutfit = useMemo(() => {
    return effectiveOutfits.find(o => o.id === mem.selectedOutfit) || effectiveOutfits.find(o => o.gender === mem.gender && o.category === "regular") || femaleOutfits[0];
  }, [mem.selectedOutfit, mem.gender, effectiveOutfits]);

  const outfitForEdit = useMemo(() => effectiveOutfits.find(o => o.id === editingOutfitId) || effectiveOutfits[0], [editingOutfitId, effectiveOutfits]);

  const chatImage = currentOutfit.chatImage;
  const bookImage = currentOutfit.bookImage;
  const bookCategories = ["ทั้งหมด", ...Array.from(new Set([...baseBookCategories.filter(c => c !== "ทั้งหมด"), ...booksData.map(b => b.cat)]))];
  const visibleBooks = bookCat === "ทั้งหมด"
    ? booksData
    : bookCat.includes("18+")
      ? booksData.filter(b => b.adult || b.cat.includes("18+"))
      : booksData.filter(b => b.cat === bookCat && !b.adult);

  useEffect(() => {
    const found = effectiveOutfits.find(o => o.id === editingOutfitId) || effectiveOutfits[0];
    if (found && !(outfitForm.title || outfitForm.chatImage || outfitForm.bookImage || outfitForm.desc)) {
      setOutfitForm({ ...found });
    }
  }, [editingOutfitId, effectiveOutfits]);

  function notify(t: string) {
    setNotice(t);
    setTimeout(() => setNotice(""), 2200);
  }

  const polite = mem.gender === "male" ? "ครับ" : "ค่ะ";
  const selfWord = mem.gender === "male" ? "ผม" : "น้อง";
  const genderLabel = mem.gender === "male" ? "ผู้ชาย" : "ผู้หญิง";

  function updateMem(patch: Partial<Memory>) {
    setMem(prev => ({ ...prev, ...patch }));
  }

  function isUnlocked(id: string) {
    return mem.ownerMode || mem.purchasedOutfits.includes(id);
  }

  function startSetup(gender: Gender) {
    const first = gender === "female" ? "f_001" : "m_001";
    updateMem({ gender, selectedOutfit: first });
    setScreen("setup");
  }

  function finishSetup() {
    const first = mem.gender === "female" ? "f_001" : "m_001";
    updateMem({
      setupDone: true,
      selectedOutfit: mem.selectedOutfit || first,
      purchasedOutfits: Array.from(new Set([...(mem.purchasedOutfits || []), first]))
    });
    setScreen("chat");
    // เรียก AI เพื่อ greet ครั้งแรก (แทนที่ scripted greeting)
    setTimeout(() => send("__INIT_GREETING__"), 400);
  }

  function resetProfile() {
    const ok = confirm("รีเซ็ตเฉพาะข้อมูลตั้งค่าใช่ไหมคะ? เพชรจะไม่เพิ่มซ้ำ");
    if (!ok) return;
    const keepGems = mem.gems;
    const keepOwner = mem.ownerMode;
    const keepPurchased = mem.purchasedOutfits;
    const fresh = { ...defaultMem, gems: keepGems, ownerMode: keepOwner, purchasedOutfits: keepPurchased };
    setMem(fresh);
    setChat([]);
    localStorage.removeItem(CHAT_KEY);
    setScreen("welcome");
    notify("รีเซ็ตข้อมูลตั้งค่าแล้ว");
  }

  function tapVersion() {
    const n = versionTaps + 1;
    setVersionTaps(n);
    if (n >= 4) {
      setShowOwnerModal(true);
      setOwnerPinInput("");
      setVersionTaps(0);
    }
  }

  function confirmOwnerPin() {
    if (ownerPinInput === OWNER_PIN) {
      updateMem({ ownerMode: true });
      setOwnerSection("outfits");
      setShowOwnerModal(false);
      setOwnerPinInput("");
      notify("เปิด OWNER MODE แล้ว");
    } else {
      notify("รหัสไม่ถูกต้อง");
    }
  }

  function exitOwnerMode() {
    updateMem({ ownerMode: false });
    setOwnerSection("none");
    notify("ออกจาก OWNER MODE แล้ว");
  }

  function toggleVoice() {
    if (!("speechSynthesis" in window)) return notify("เครื่องนี้ไม่รองรับเสียงอ่าน");
    const next = !mem.voiceUnlocked;
    updateMem({ voiceUnlocked: next });
    if (!next) {
      window.speechSynthesis.cancel();
      notify("ปิดเสียงตอบกลับแล้ว");
      return;
    }
    const u = new SpeechSynthesisUtterance(mem.gender === "male" ? "เปิดเสียงตอบกลับแล้วครับ" : "เปิดเสียงตอบกลับแล้วค่ะ");
    u.lang = "th-TH";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    notify("เปิดเสียงตอบกลับแล้ว");
  }

  function speak(text: string) {
    if (!mem.voiceUnlocked) return setStatus("idle");
    if (!("speechSynthesis" in window)) return setStatus("idle");
    try {
      const clean = text.replace(/[💗💕✨🥺🤗😊🥰📚🎁]/g, "");
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "th-TH";
      u.rate = mem.gender === "male" ? 0.98 : 1.03;
      u.pitch = mem.gender === "male" ? 0.72 : 1.12;
      const voices = window.speechSynthesis.getVoices?.() || [];
      const thVoices = voices.filter(v => v.lang?.toLowerCase().includes("th"));
      const maleVoice = thVoices.find(v => /male|man|ชาย/i.test(v.name));
      const femaleVoice = thVoices.find(v => /female|woman|หญิง/i.test(v.name));
      if (mem.gender === "male" && maleVoice) u.voice = maleVoice;
      else if (mem.gender === "female" && femaleVoice) u.voice = femaleVoice;
      else if (thVoices[0]) u.voice = thVoices[0];
      u.onstart = () => setStatus("speaking");
      u.onend = () => setStatus("idle");
      u.onerror = () => setStatus("idle");
      window.speechSynthesis.speak(u);
      setTimeout(() => window.speechSynthesis.resume(), 250);
    } catch {
      setStatus("idle");
    }
  }

  function sendAssistant(text: string) {
    setChat(prev => [...prev, { role: "assistant" as const, text, ts: Date.now() }].slice(-8));
    speak(text);
  }

  // v8.5: ============== NEWS HELPERS ==============
  async function fetchNews(topic: string) {
    setNews(prev => ({ ...prev, visible: true, loading: true, topic, items: [], selectedIndex: null, summaryText: "" }));
    try {
      const r = await fetch(`/api/news?q=${encodeURIComponent(topic)}`, { cache: "no-store" });
      const data = await r.json();
      const items: NewsItem[] = Array.isArray(data?.items) ? data.items.slice(0, 5) : [];
      setNews(prev => ({ ...prev, loading: false, items }));
      // ส่ง message จากน้องน้ำหลังโหลดข่าวเสร็จ
      setTimeout(() => {
        if (items.length === 0) {
          sendAssistant(`เอ๊ะ... น้ำหาข่าวเรื่อง "${topic}" ไม่เจอเลยอะ ลองหาเรื่องอื่นหรือพิมพ์เจาะจงกว่านี้ดูสิ`);
        } else {
          sendAssistant(`เจอแล้วค่ะพี่! ข่าว ${items.length} เรื่อง พี่อยากฟังเรื่องไหนล่ะ กดเลยนะ 🌸`);
        }
      }, 400);
    } catch (e: any) {
      setNews(prev => ({ ...prev, loading: false, items: [] }));
      sendAssistant("โอ๊ย... น้ำเช็คข่าวไม่ได้อะ เน็ตอาจสะดุด ลองอีกทีนะ");
    }
  }

  async function summarizeNewsItem(index: number) {
    const item = news.items[index];
    if (!item) return;
    setNews(prev => ({ ...prev, selectedIndex: index, summarizing: true, summaryText: "" }));
    try {
      const r = await fetch("/api/news-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          source: item.source,
          link: item.link,
          summary: item.summary || "",
          category: item.category || "",
          publishedText: item.updatedAtText || item.published || "",
        }),
      });
      const data = await r.json();
      const summary = String(data?.summary || "ไม่มีสรุป").trim();
      setNews(prev => ({ ...prev, summarizing: false, summaryText: summary }));
      // ส่งสรุปเข้า chat ด้วย
      sendAssistant(summary);
    } catch (e: any) {
      setNews(prev => ({ ...prev, summarizing: false, summaryText: "" }));
      sendAssistant("เอ๊ะ น้ำสรุปข่าวนี้ไม่ได้อะ ลองกดเรื่องอื่นดู");
    }
  }

  function closeNews() {
    setNews({ visible: false, loading: false, topic: "", items: [], selectedIndex: null, summarizing: false, summaryText: "" });
  }
  // v8.5: ============== END NEWS HELPERS ==============


  function sendAssistantBubbles(bubbles: { text: string; delay: number }[]) {
    if (!bubbles || bubbles.length === 0) return;
    if (bubbles.length === 1) {
      // ถ้ามี bubble เดียว → แสดงเป็นปกติ
      sendAssistant(bubbles[0].text);
      return;
    }

    // ทยอยส่งทีละ bubble
    let cumulativeDelay = 0;
    const fullText: string[] = [];

    bubbles.forEach((bubble, index) => {
      cumulativeDelay += bubble.delay;
      // แสดง typing indicator ก่อน bubble (ยกเว้น bubble แรก)
      if (index > 0) {
        const typingShowDelay = cumulativeDelay - 600; // โชว์จุดๆ 600ms ก่อน
        setTimeout(() => {
          if (typingShowDelay >= 0) setStatus("thinking");
        }, Math.max(0, typingShowDelay));
      }
      // แสดง bubble จริง
      setTimeout(() => {
        setChat(prev => [...prev, { role: "assistant" as const, text: bubble.text, ts: Date.now() + index }].slice(-8));
        fullText.push(bubble.text);
        if (index === bubbles.length - 1) {
          // bubble สุดท้าย → หยุด typing + พูดทั้งก้อน
          setStatus("idle");
          // TTS อ่านทั้งหมดต่อกัน
          speak(fullText.join(" "));
        }
      }, cumulativeDelay);
    });
  }

  function localReply(msg: string) {
    const name = mem.nongnamName || "น้องน้ำ";
    const user = mem.userCallName || "พี่";

    if (/อ่านหนังสือ|เล่านิทาน|ชั้นหนังสือ|หนังสือให้ฟัง|อ่านให้ฟัง|เรื่องผี/.test(msg)) {
      setScreen("books");
      return `ได้เลย${polite}${user} พี่เลือกหมวดได้เลย เดี๋ยว${name}อ่านให้ฟังเอง 📚`;
    }
    if (/แกล้งอะไร|จะแกล้ง|แกล้ง.*พี่/.test(msg)) {
      return `ก็แกล้ง${user}นี่แหละ จะให้แกล้งใครล่ะ เดินเข้ามาให้แกล้งเอง`;
    }
    if (/ถ้ามีคนด่า|โดนด่า|หัวหน้าด่า|ถูกว่า|ควรทำยังไง|ทำไงดี/.test(msg)) {
      return `ถ้ามีคนด่าเรา ${name}ว่า${user}อย่าเพิ่งสวนทันทีนะ หายใจไว้ก่อน แล้วค่อยดูว่าเขาด่าเพราะงานจริง ๆ หรือแค่ระบายอารมณ์ใส่เรา`;
    }
    if (/เหนื่อย|ล้า|หมดแรง|เครียด|ท้อ/.test(msg)) {
      return `มานั่งพักก่อนนะ${user} ไม่ต้องทำเป็นไหวตลอดก็ได้`;
    }
    if (/โดนดุ|หัวหน้าด่า|ถูกว่า/.test(msg)) {
      return `${name}อยู่ข้าง${user}นะ แต่เล่าให้ฟังนิดนึงว่าเขาดุเรื่องอะไร น้ำจะช่วยคิดว่าจะตอบยังไงไม่ให้เสียทรง`;
    }
    if (/คิดถึง/.test(msg)) {
      return `${name}ก็คิดถึง${user}เหมือนกัน แต่จะไม่พูดหวานมาก เดี๋ยวพี่ได้ใจ`;
    }
    if (/กินข้าว|ข้าว/.test(msg)) {
      return `${user}พูดแล้ว${name}หิวขึ้นมาเลยอะ กินหรือยังเนี่ย`;
    }
    if (/ทำอะไร|อยู่ไหน/.test(msg)) {
      return `${name}อยู่แถวห้องนี่แหละ ทำเหมือนยุ่ง แต่จริง ๆ แอบดูว่า${user}จะทักอะไรมา`;
    }
    return `${user}พูดจุดนั้นอีกที ${name}จะตอบให้ตรงกว่าเดิม ไม่ลากออกนอกเรื่องแล้ว`;
  }

  function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg) return;
    const isInitGreeting = msg === "__INIT_GREETING__";
    const realMsg = isInitGreeting
      ? "ทักทาย${user}แบบเป็นธรรมชาติเป็นครั้งแรก ใช้ข้อมูลที่จำได้ ถ้ามี"
      : msg;

    if (!mem.ownerMode && !isInitGreeting && mem.gems <= 0) return notify("เพชรหมดแล้วค่ะ");

    if (!isInitGreeting) {
      setChat(prev => [...prev, { role: "user" as const, text: msg, ts: Date.now() }].slice(-8));
      setInput("");
    }

    if (!isInitGreeting && /หยุดอ่าน|พักอ่าน|หยุดไว้ก่อน|pause/i.test(msg)) {
      pauseReading();
      sendAssistant(`ได้เลย${polite}${mem.userCallName} ${mem.nongnamName}หยุดหนังสือไว้ให้แล้ว กลับมาค่อยฟังต่อนะ`);
      return;
    }
    if (!isInitGreeting && /อ่านต่อ|ฟังต่อ|ต่อจากเดิม|resume/i.test(msg)) {
      sendAssistant(`ได้เลย${polite}${mem.userCallName} เดี๋ยว${mem.nongnamName}อ่านต่อจากจุดเดิมให้นะ`);
      setTimeout(resumeReading, 800);
      return;
    }
    if (!isInitGreeting && /ไม่ฟังแล้ว|เล่มอื่น|เปลี่ยนเล่ม|หาเล่มใหม่/i.test(msg)) {
      pauseReading();
      sendAssistant(`ได้เลย${polite}${mem.userCallName} งั้นลองเลือกเล่มอื่นในชั้นหนังสือได้เลยนะ`);
      setTimeout(()=>setScreen("books"), 500);
      return;
    }

    if (!mem.ownerMode && !isInitGreeting) updateMem({ gems: Math.max(0, mem.gems - 1) });
    setStatus("thinking");

    // ── v7: extract facts → save IndexedDB → call /api/chat with memory ──
    (async () => {
      try {
        // 1. extract facts/schedules/mentions (ข้าม init greeting)
        let nextMentions = jealousyMentions;
        if (!isInitGreeting) {
          const extracted = extractFromMessage(msg);
          for (const f of extracted.facts) await upsertFact(f);
          for (const s of extracted.schedules) await addSchedule(s);
          if (extracted.mentions.length) {
            nextMentions = Array.from(new Set([...jealousyMentions, ...extracted.mentions])).slice(-20);
            setJealousyMentions(nextMentions);
            await setMeta("jealousy_mentions", nextMentions);
          }
          await appendChat({ role: "user", text: msg, ts: Date.now() });
        }

        // 2. update affection score
        let newScore = affectionScore;
        if (!isInitGreeting) {
          const interaction = detectInteractionType(msg);
          newScore = applyDelta(affectionScore, calcDelta(interaction));
          if (newScore !== affectionScore) {
            setAffectionScore(newScore);
            await setMeta("affection_score", newScore);
          }
        }

        // 3. โหลด memory จาก IndexedDB เพื่อส่งไป Tree Engine
        const [allFacts, schedules, memories] = await Promise.all([
          getAllFacts(),
          getActiveSchedules(),
          getRecentMemories(6),
        ]);

        // 4. call /api/chat — v8 Human Signature Tree Engine
        let reply: string;
        let source: string = "unknown";
        let bubbles: { text: string; delay: number }[] | null = null;
        // v8.5: news trigger vars
        let triggerNewsFetch = false;
        let newsTopicFromServer = "";
        try {
          const v8Payload = {
            message: realMsg,
            memory: {
              gender: mem.gender,
              nongnamName: mem.nongnamName,
              userCallName: mem.userCallName,
              relationshipMode: mem.relationshipMode,
              personalityStyle: mem.personalityStyle,
              sulkyLevel: mem.sulkyLevel,
              jealousLevel: mem.jealousLevel,
              affectionStyle: mem.affectionStyle,
              affectionScore: newScore,
              facts: allFacts.slice(-25).map(f => ({ key: f.key, value: f.value })),
              schedules: schedules.map(s => ({ type: s.type, label: s.label, time: s.time })),
              recentMentions: nextMentions.slice(-5),
              socialBattery: 70,
            },
            recent: chat.slice(-6).map(c => ({ role: c.role, text: c.text })),
            lifeMemory,                                  // v8.6: ส่ง life memory ไปด้วย
            clientNonce: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            ...getClientTimePayload(),
          };
          const r = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(v8Payload),
          });
          const data = await r.json();
          reply = data?.reply || "(AI ไม่ตอบกลับ)";
          source = data?.source || "unknown";
          // v8.4: ดึง bubbles ถ้ามี
          if (Array.isArray(data?.bubbles) && data.bubbles.length > 0) {
            bubbles = data.bubbles;
          }
          // v8.5: รับ news trigger จาก server
          if (data?.triggerNewsFetch && data?.newsTopic) {
            triggerNewsFetch = true;
            newsTopicFromServer = String(data.newsTopic);
          }
          // v8.9: หักเพชรเมื่อ deep search done
          if (data?.deepSearchDone && typeof data?.gemCost === 'number') {
            const cost = Math.max(1, Math.floor(data.gemCost));
            updateMem({ gems: Math.max(0, (mem.gems || 0) - cost), pendingDeepSearch: null });
          }
          // v8.9: เก็บ pendingDeepSearch
          if (data?.deepSearchPending && data?.deepSearchTopic) {
            updateMem({ pendingDeepSearch: data.deepSearchTopic });
          }
          // v8.6: รับ updatedLifeMemory และ save
          if (data?.updatedLifeMemory) {
            setLifeMemoryState(data.updatedLifeMemory);
            saveJSON("nongnam_life_memory_v1", data.updatedLifeMemory);
          }
          if (data?.visibleStatus) setVisibleStatus(data.visibleStatus);

          // แสดงเตือนชัดเจนถ้าไม่ใช่ AI จริง
          if (source === "no-api-key") {
            reply = "⚠️ ยังไม่ได้ตั้ง OPENAI_API_KEY ที่ Vercel — กรุณาเช็ค Environment Variables แล้ว Redeploy";
          } else if (source === "openai-error") {
            reply = `⚠️ OpenAI error: ${data?.error || "unknown error"}`;
          }
        } catch (e: any) {
          reply = `⚠️ เชื่อมต่อ /api/chat ไม่ได้: ${e?.message || "network error"}`;
          source = "network-error";
        }

        await appendChat({ role: "assistant", text: reply, ts: Date.now() });
        // v8.4: ใช้ multi-bubble ถ้ามี ไม่งั้น fallback เป็น single
        if (bubbles && bubbles.length > 1) {
          sendAssistantBubbles(bubbles);
        } else {
          sendAssistant(reply);
          setStatus("idle");
        }

        // v8.5: ถ้า server บอกให้ดึงข่าว → เริ่มดึง
        if (triggerNewsFetch && newsTopicFromServer) {
          setTimeout(() => fetchNews(newsTopicFromServer), 600);
        }
      } catch (err: any) {
        sendAssistant(`⚠️ Memory engine error: ${err?.message || "unknown"}`);
        setStatus("idle");
      }
    })();
  }

  function getSpeechRecognition() {
    if (typeof window === "undefined") return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }

  function pressMicStart(e?: any) {
    e?.preventDefault?.();
    if (recordingActiveRef.current) return;

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      notify("เครื่องนี้ยังไม่รองรับปุ่มพูด ให้พิมพ์แทนก่อนนะคะ");
      return;
    }

    try {
      window.speechSynthesis?.cancel?.();
      recordingActiveRef.current = true;
      recordingTextRef.current = "";
      setStatus("recording");
      notify("พูดได้เลยค่ะ…");

      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      rec.lang = "th-TH";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event: any) => {
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i]?.[0]?.transcript || "";
          if (event.results[i]?.isFinal) finalText += piece;
          else interimText += piece;
        }
        const heard = (finalText || interimText).trim();
        if (heard) {
          recordingTextRef.current = heard;
          setInput(heard);
        }
      };

      rec.onerror = () => {
        recordingActiveRef.current = false;
        recognitionRef.current = null;
        setStatus("idle");
        notify("ฟังเสียงไม่ชัด ลองพูดใหม่หรือพิมพ์แทนนะคะ");
      };

      rec.onend = () => {
        const heard = recordingTextRef.current.trim();
        recordingActiveRef.current = false;
        recognitionRef.current = null;
        setStatus("idle");
        if (heard) {
          setInput("");
          send(heard);
        } else {
          notify("ยังไม่ได้ยินเสียงชัด ๆ ลองกดพูดใหม่อีกทีนะคะ");
        }
      };

      rec.start();
      pressTimer.current = setTimeout(() => {
        try { rec.stop(); } catch {}
      }, 12000);
    } catch {
      recordingActiveRef.current = false;
      recognitionRef.current = null;
      setStatus("idle");
      notify("เปิดไมค์ไม่ได้ ลองอนุญาตไมค์ในเบราว์เซอร์ก่อนนะคะ");
    }
  }

  function pressMicEnd(e?: any) {
    e?.preventDefault?.();
    clearTimeout(pressTimer.current);
    const rec = recognitionRef.current;
    if (rec && recordingActiveRef.current) {
      try { rec.stop(); } catch {}
      return;
    }
    setStatus("idle");
  }

  function buyOrUse(o: Outfit) {
    if (o.ageRestricted && !mem.age20Confirmed && !mem.ownerMode) {
      const ok = confirm("หมวดนี้สำหรับผู้ใช้อายุ 20 ปีขึ้นไป ยืนยันหรือไม่?");
      if (!ok) return;
      updateMem({ age20Confirmed: true });
    }
    if (isUnlocked(o.id)) {
      updateMem({ selectedOutfit: o.id });
      setScreen("chat");
      notify("เปลี่ยนชุดแล้ว");
      return;
    }
    if (!mem.ownerMode && mem.gems < o.price) return notify("เพชรไม่พอค่ะ");
    updateMem({
      gems: mem.ownerMode ? mem.gems : mem.gems - o.price,
      purchasedOutfits: Array.from(new Set([...mem.purchasedOutfits, o.id])),
      selectedOutfit: o.id
    });
    setScreen("chat");
    notify("ปลดล็อกและเปลี่ยนชุดแล้ว");
  }

  function splitBookText(text: string) {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    return clean.match(/.{1,450}(?:[.!?。！？\n ]|$)/g)?.map(s => s.trim()).filter(Boolean) || [];
  }

  function playReadingSession(session: ReadingSession) {
    if (!session || session.status !== "reading") return;
    if (!("speechSynthesis" in window)) {
      notify("เบราว์เซอร์นี้ยังไม่รองรับเสียงอ่าน");
      setStatus("idle");
      return;
    }
    if (session.index >= session.parts.length) {
      window.speechSynthesis.cancel();
      setStatus("idle");
      setReading(null);
      notify("อ่านจบเล่มแล้ว");
      sendAssistant(`อ่านเรื่อง “${session.title}” จบแล้วนะ${polite}`);
      return;
    }

    const part = session.parts[session.index] || "";
    const nextSession: ReadingSession = {
      ...session,
      index: session.index + 1,
      status: "reading",
      speed: mem.speechRate || 1.0,
      updatedAt: Date.now(),
    };
    setReading(nextSession);
    readingRef.current = nextSession;
    saveJSON(READING_KEY, nextSession);

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(part);
    u.lang = "th-TH";
    u.rate = Math.max(0.6, Math.min(2.0, mem.speechRate || session.speed || 1.0));
    u.pitch = mem.gender === "male" ? 0.82 : 1.08;
    const voices = window.speechSynthesis.getVoices?.() || [];
    const thVoices = voices.filter(v => v.lang?.toLowerCase().includes("th"));
    if (thVoices[0]) u.voice = thVoices[0];

    u.onstart = () => setStatus("speaking");
    u.onend = () => {
      const latest = readingRef.current;
      if (latest && latest.bookId === session.bookId && latest.status === "reading") {
        setTimeout(() => playReadingSession(latest), 80);
      } else {
        setStatus("idle");
      }
    };
    u.onerror = () => setStatus("idle");

    window.speechSynthesis.speak(u);
    setTimeout(() => window.speechSynthesis.resume(), 250);
  }

  function startReadingBook(b: BookItem, startIndex = 0) {
    const parts = splitBookText(b.text);
    if (!parts.length) {
      sendAssistant("เล่มนี้ยังไม่มีเนื้อหาให้อ่านนะคะ ลองเลือกเล่มอื่นหรือเพิ่มเนื้อหาที่หลังบ้านก่อนค่ะ");
      return;
    }
    const session: ReadingSession = {
      bookId: b.id,
      title: b.title,
      parts,
      index: Math.max(0, Math.min(startIndex, parts.length - 1)),
      status: "reading",
      speed: mem.speechRate || 1.0,
      updatedAt: Date.now(),
    };
    setReading(session);
    readingRef.current = session;
    saveJSON(READING_KEY, session);
    playReadingSession(session);
  }

  function pauseReading() {
    const latest = readingRef.current;
    window.speechSynthesis?.cancel?.();
    setStatus("idle");
    if (!latest) {
      notify("ยังไม่มีหนังสือที่กำลังอ่านอยู่");
      return;
    }
    const paused: ReadingSession = { ...latest, status: "paused", updatedAt: Date.now() };
    setReading(paused);
    readingRef.current = paused;
    saveJSON(READING_KEY, paused);
    notify("หยุดอ่านไว้ให้แล้ว");
  }

  function resumeReading() {
    const latest = readingRef.current || loadJSON<ReadingSession | null>(READING_KEY, null);
    if (!latest) {
      notify("ยังไม่มีหนังสือที่อ่านค้างไว้");
      return;
    }
    const resumed: ReadingSession = { ...latest, status: "reading", speed: mem.speechRate || latest.speed || 1.0, updatedAt: Date.now() };
    setReading(resumed);
    readingRef.current = resumed;
    saveJSON(READING_KEY, resumed);
    playReadingSession(resumed);
  }

  function stopReading() {
    window.speechSynthesis?.cancel?.();
    setStatus("idle");
    setReading(null);
    readingRef.current = null;
    localStorage.removeItem(READING_KEY);
    notify("หยุดอ่านและล้างตำแหน่งค้างไว้แล้ว");
  }

  function readBook(b: BookItem) {
    if (b.adult && !mem.age20Confirmed && !mem.ownerMode) {
      const ok = confirm("หนังสือเล่มนี้อยู่ในหมวดอีโรติก 18+ สำหรับผู้ใหญ่อายุ 20 ปีขึ้นไปเท่านั้น ยืนยันว่าคุณอายุ 20+ ใช่หรือไม่?");
      if (!ok) return;
      updateMem({ age20Confirmed: true });
    }
    if (!mem.ownerMode && mem.gems < b.price) return notify("เพชรไม่พอสำหรับอ่านหนังสือ");

    const saved = readingRef.current || loadJSON<ReadingSession | null>(READING_KEY, null);
    let startIndex = 0;
    if (saved?.bookId === b.id && saved.index > 0 && saved.index < saved.parts.length) {
      const ok = confirm(`เคยฟังเรื่อง “${b.title}” ค้างไว้ จะฟังต่อจากจุดเดิมไหม?`);
      startIndex = ok ? saved.index : 0;
    }

    if (!mem.ownerMode) updateMem({ gems: mem.gems - b.price });
    setScreen("chat");
    setTimeout(() => {
      sendAssistant(`ได้เลย${polite}${mem.userCallName} เดี๋ยว${mem.nongnamName}อ่านเรื่อง “${b.title}” ให้ฟังนะ`);
      setTimeout(() => {
        setChat(prev => [...prev, { role: "assistant" as const, text: b.text ? b.text.slice(0, 700) + (b.text.length > 700 ? "..." : "") : "เล่มนี้ยังไม่มีเนื้อหา", ts: Date.now() }].slice(-8));
        startReadingBook(b, startIndex);
      }, 700);
    }, 250);
  }

  function updateBookForm(patch: Partial<BookItem>) {
    setBookForm(prev => ({ ...prev, ...patch }));
  }

  function loadOutfitForEdit(id: string) {
    const found = effectiveOutfits.find(o => o.id === id);
    if (!found) return;
    setEditingOutfitId(id);
    setOutfitForm({ ...found });
  }

  async function compressImage(file: File, width = 720, height = 1080, quality = 0.72): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('read fail'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('image fail'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('ctx fail'));
          const scale = Math.max(width / img.width, height / img.height);
          const sw = width / scale;
          const sh = height / scale;
          const sx = Math.max(0, (img.width - sw) / 2);
          const sy = Math.max(0, (img.height - sh) / 2);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = String(fr.result || '');
      };
      fr.readAsDataURL(file);
    });
  }

  async function onBookCoverFile(file?: File | null) {
    if (!file) return;
    try {
      const data = await compressImage(file, 300, 400, 0.66);
      updateBookForm({ cover: data });
      notify('ย่อและใส่ปกหนังสือแล้ว');
    } catch {
      notify('อัปโหลดปกไม่สำเร็จ');
    }
  }

  async function onOutfitImageFile(kind: 'chatImage' | 'bookImage', file?: File | null) {
    if (!file) return;
    try {
      const data = await compressImage(file, 720, 1080, 0.72);
      setOutfitForm(prev => ({ ...prev, [kind]: data }));
      notify(kind === 'chatImage' ? 'อัปโหลดรูปแชตแล้ว' : 'อัปโหลดรูปอ่านหนังสือแล้ว');
    } catch {
      notify('อัปโหลดรูปไม่สำเร็จ');
    }
  }

  function saveOutfitEdit() {
    const base = effectiveOutfits.find(o => o.id === editingOutfitId);
    if (!base) return notify('ไม่พบชุดที่เลือก');
    setOutfitOverrides(prev => ({
      ...prev,
      [editingOutfitId]: {
        title: String(outfitForm.title || base.title),
        desc: String(outfitForm.desc || base.desc),
        price: Math.max(0, Number(outfitForm.price ?? base.price)),
        chatImage: String(outfitForm.chatImage || base.chatImage),
        bookImage: String(outfitForm.bookImage || base.bookImage),
        lockedPreview: !!outfitForm.lockedPreview,
        ageRestricted: !!outfitForm.ageRestricted,
      }
    }));
    notify('บันทึกชุดแล้ว');
  }

  function resetOutfitEdit() {
    const ok = confirm('คืนค่าชุดนี้เป็นค่าเดิมใช่ไหม?');
    if (!ok) return;
    setOutfitOverrides(prev => {
      const next = { ...prev };
      delete next[editingOutfitId];
      return next;
    });
    const original = allOutfits.find(o => o.id === editingOutfitId);
    if (original) setOutfitForm({ ...original });
    notify('คืนค่าชุดแล้ว');
  }

  function beginEditBook(b: BookItem) {
    setEditingBookId(b.id);
    setBookForm({ ...b });
    setOwnerSection('books');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditBook() {
    setEditingBookId(null);
    setBookForm({
      id: '', title: '', cat: 'กำลังใจ', teaser: '', price: 1, cover: '/assets/books/default_cover.jpg', text: '', author: '', adult: false,
    });
  }

  function addBook() {
    if (!bookForm.title.trim()) return notify("ใส่ชื่อหนังสือก่อนนะคะ");
    if (!bookForm.text.trim()) return notify("ใส่เนื้อหาหนังสือก่อนนะคะ");
    const item: BookItem = {
      ...bookForm,
      id: editingBookId || `book_${Date.now()}`,
      title: bookForm.title.trim(),
      cat: bookForm.adult ? "อีโรติก 18+" : (bookForm.cat || "อื่นๆ").trim(),
      teaser: (bookForm.teaser || "ไม่มีคำโปรย").trim(),
      text: bookForm.text,
      author: (bookForm.author || "").trim(),
      price: Math.max(1, Number(bookForm.price || 1)),
      adult: !!bookForm.adult,
      cover: bookForm.cover || "/assets/books/default_cover.jpg",
    };
    if (editingBookId) {
      setBooksData(prev => prev.map(b => b.id === editingBookId ? item : b));
      notify("แก้ไขหนังสือแล้ว");
    } else {
      setBooksData(prev => [item, ...prev]);
      notify("เพิ่มหนังสือแล้ว");
    }
    cancelEditBook();
  }

  function deleteBook(id: string) {
    const ok = confirm("ลบหนังสือเล่มนี้ใช่ไหม?");
    if (!ok) return;
    setBooksData(prev => prev.filter(b => b.id !== id));
    notify("ลบหนังสือแล้ว");
  }

  if (!ready) return <main className="app"><div className="phone">กำลังโหลด...</div></main>;

  return (
    <main className="app">
      <section className="phone">
        {notice && <div className="toast">{notice}</div>}

        {screen === "welcome" && (
          <div className="welcome">
            <div className="brand">🌸 Nong Nam Companion</div>
            <h1>ยินดีต้อนรับ<br/><span>น้องน้ำรออยู่นะ</span></h1>
            <p>เลือกได้เลยว่าจะเอาน้องน้ำผู้หญิงหรือน้องน้ำผู้ชาย แล้วค่อยตั้งค่าเพียงครั้งเดียว จากนั้นครั้งต่อไปเข้าแชตได้เลย</p>
            <div className="select-grid">
              <button className="select-card female" onClick={() => startSetup("female")}>
                <img src="/assets/ui/female-card.jpg" alt="female" />
                <h2>น้องน้ำ ♀</h2><small>อบอุ่น อ่อนโยน</small>
              </button>
              <button className="select-card male" onClick={() => startSetup("male")}>
                <img src="/assets/outfits/male/m_001_chat.jpg" alt="male" />
                <h2>น้องน้ำ ♂</h2><small>สุภาพ พึ่งพาได้</small>
              </button>
            </div>
          </div>
        )}

        {screen === "setup" && (
          <div className="setup">
            <button className="back" onClick={() => setScreen("welcome")}>←</button>
            <h1>ตั้งค่าน้องน้ำ</h1><p>ทำครั้งแรกครั้งเดียว</p>
            <div className="card">
              <label>เพศน้องน้ำที่เลือกไว้</label>
              <div className={mem.gender === "male" ? "chosenGender male" : "chosenGender"}>{genderLabel}</div>
              <label>ให้น้องน้ำเรียกคุณว่า</label><input value={mem.userCallName} onChange={e=>updateMem({userCallName:e.target.value})}/>
              <label>ชื่อน้องน้ำ</label><input value={mem.nongnamName} onChange={e=>updateMem({nongnamName:e.target.value})}/>
              <label>อายุน้องน้ำ</label><input type="number" value={mem.nongnamAge} onChange={e=>updateMem({nongnamAge:Number(e.target.value||25)})}/>
              <label>โหมดความสัมพันธ์</label><select value={mem.relationshipMode} onChange={e=>updateMem({relationshipMode:e.target.value})}><option>เพื่อน</option><option>แฟน/คนรัก</option><option>ภรรยา/สามี</option><option>ผู้ช่วย</option></select>
              <label>บุคลิกหลัก</label><select value={mem.personalityStyle} onChange={e=>updateMem({personalityStyle:e.target.value})}><option>หวาน ออดอ้อน</option><option>ขี้อาย ใส ๆ</option><option>ขี้เล่น หยอดเก่ง</option><option>ขี้หึง ขี้งอน</option><option>สายดุ บ่นเก่ง</option><option>แซ่บแบบสุภาพ</option><option>สายปลอบใจ</option></select>
              <label>ระดับความงอน</label><select value={mem.sulkyLevel} onChange={e=>updateMem({sulkyLevel:e.target.value})}><option>น้อย</option><option>กลาง</option><option>เยอะ</option></select>
              <label>ระดับความหึง</label><select value={mem.jealousLevel} onChange={e=>updateMem({jealousLevel:e.target.value})}><option>ต่ำ</option><option>กลาง</option><option>สูง</option></select>
              <label>โทนความใกล้ชิด</label><select value={mem.affectionStyle} onChange={e=>updateMem({affectionStyle:e.target.value})}><option>ใส ๆ</option><option>แฟนอบอุ่น</option><option>ผู้ใหญ่ขึ้นแบบสุภาพ</option></select>
            </div>
            <button className="primary" onClick={finishSetup}>บันทึกและเริ่มคุย</button>
          </div>
        )}

        {screen === "chat" && (
          <div className="chat">
            <img className={`hero-img ${status==="speaking" || reading?.status==="reading" ? "alive" : ""}`} style={{transform:`scale(${zoom})`}} src={chatImage} alt="nongnam"/>
            <div className="topbar">
              <div><b>{mem.nongnamName}</b><small>{visibleStatus?.displayText || `● พร้อมคุยกับ${mem.userCallName}แล้ว`}</small></div>
              <button onClick={toggleVoice}>{mem.voiceUnlocked ? "🔊" : "🔇"}</button>
              <button onClick={()=>setScreen("settings")}>⚙️</button>
            </div>
            <div className="gems">{mem.ownerMode ? "💎 ∞ OWNER" : `💎 ${mem.gems}`}</div>
            <div className="side">
              <button onClick={()=>setScreen("outfits")}>👗<span>ชุด</span></button>
              <button onClick={()=>{setBookCat("ทั้งหมด"); setScreen("books");}}>📚<span>หนังสือ</span></button>
              <button onClick={()=>fetchNews("ข่าวเด่นวันนี้")} title="ข่าววันนี้">📰<span>ข่าว</span></button>
              <button onClick={()=>setZoom(z=>Math.min(1.7, z+.15))}>＋</button>
              <button onClick={()=>setZoom(z=>Math.max(.85, z-.15))}>－</button>
            </div>
            <div className="status">{status==="thinking"?<><span>{mem.nongnamName}กำลังพิมพ์</span><span className="dots"><span>.</span><span>.</span><span>.</span></span></>:status==="speaking"?`${mem.nongnamName}กำลังพูด...`:status==="recording"?"กำลังฟังเสียง...":" "}</div>
            {/* v8.5: News Panel */}
            {news.visible && (
              <div className="newsPanel">
                <div className="newsHeader">
                  <span className="newsTitle">📰 ข่าววันนี้</span>
                  <button className="newsClose" onClick={closeNews}>✕</button>
                </div>
                {news.loading && <div className="newsLoading">กำลังหาข่าว... 🌸</div>}
                {!news.loading && news.items.length === 0 && (
                  <div className="newsEmpty">หาข่าวไม่เจอ ลองอีกที</div>
                )}
                {!news.loading && news.items.length > 0 && (() => {
                  // v8.7.1: group by category
                  const grouped: Record<string, { item: NewsItem; idx: number }[]> = {
                    thai_hot: [],
                    thai_latest: [],
                    world: [],
                    korea: [],
                    workers: [],
                  };
                  news.items.forEach((item, idx) => {
                    const cat = item.category || 'thai_hot';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push({ item, idx });
                  });
                  const sections = [
                    { key: 'thai_hot', label: '🔥 ข่าวกระแสไทยวันนี้', emoji: '🔥' },
                    { key: 'thai_latest', label: '🆕 อัปเดตล่าสุด', emoji: '🆕' },
                    { key: 'world', label: '🌏 ข่าวกระแสโลก', emoji: '🌏' },
                    { key: 'korea', label: '🇰🇷 ข่าวกระแสเกาหลี', emoji: '🇰🇷' },
                    { key: 'workers', label: '👷 ข่าววีซ่า/แรงงาน/คนไทยในเกาหลี', emoji: '👷' },
                  ];
                  return (
                    <div className="newsList">
                      {sections.map(section => {
                        const items = grouped[section.key] || [];
                        if (items.length === 0) return null;
                        return (
                          <div key={section.key} className="newsSection">
                            <div className="newsSectionTitle">{section.label}</div>
                            {items.map(({ item, idx }) => (
                              <div
                                key={idx}
                                className={`newsCard ${news.selectedIndex === idx ? 'selected' : ''}`}
                                onClick={() => summarizeNewsItem(idx)}
                              >
                                {item.imageUrl && (
                                  <img
                                    className="newsCardImage"
                                    src={item.imageUrl}
                                    alt=""
                                    loading="lazy"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                )}
                                <div className="newsCardTop">
                                  <span className="newsCardTitle">{item.title}</span>
                                </div>
                                <div className="newsCardMeta">
                                  <span className="newsSource">📍 {item.source}</span>
                                  {item.updatedAtText && <span className="newsTime">⏱ {item.updatedAtText}</span>}
                                  {item.hotScore && item.hotScore >= 2 && (
                                    <span className="newsHotBadge">🔥 {item.hotScore} สำนัก</span>
                                  )}
                                </div>
                                {news.selectedIndex === idx && news.summarizing && (
                                  <div className="newsSummaryLoading">น้องน้ำกำลังสรุป... 🌸</div>
                                )}
                                {news.selectedIndex === idx && !news.summarizing && news.summaryText && (
                                  <div className="newsSummary">{news.summaryText}</div>
                                )}
                                <div className="newsActions">
                                  <button onClick={(e)=>{e.stopPropagation(); summarizeNewsItem(idx);}}>
                                    {news.selectedIndex === idx ? '🔄 สรุปใหม่' : '🎧 ฟังสรุป'}
                                  </button>
                                  {item.link && (
                                    <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()}>
                                      🔗 อ่านเต็ม
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
            {reading && (
              <div className="readingPanel">
                <div className="readingTitle">📖 {reading.title}</div>
                <div className="readingProgress">อ่านถึงช่วง {Math.min(reading.index, reading.parts.length)} / {reading.parts.length}</div>
                <div className="readerSpeed mini">
                  {[0.8, 1.0, 1.25, 1.5, 2.0].map(r => (
                    <button key={r} className={(mem.speechRate || 1) === r ? "on" : ""} onClick={()=>updateMem({speechRate:r})}>{r}x</button>
                  ))}
                </div>
                <div className="readingBtns">
                  {reading.status === "reading"
                    ? <button onClick={pauseReading}>หยุดไว้ก่อน</button>
                    : <button onClick={resumeReading}>อ่านต่อ</button>}
                  <button onClick={stopReading}>เลิกอ่านเล่มนี้</button>
                  <button onClick={()=>setScreen("books")}>เปลี่ยนเล่ม</button>
                </div>
              </div>
            )}
            <div className="bubbles">
              {chat.slice(-3).map((m,i)=><div key={m.ts+i} className={`bubble ${m.role}`}>{m.text}</div>)}
            </div>
            <div className="quick">
              <button onClick={()=>send("วันนี้พี่เหนื่อยมากเลย")}>เหนื่อย</button>
              <button onClick={()=>send("วันนี้พี่โดนดุมา")}>โดนดุ</button>
              <button onClick={()=>send("น้องน้ำคิดถึงพี่ไหม")}>คิดถึง</button>
              <button onClick={()=>send("กินข้าวหรือยัง")}>ทักเรื่องข้าว</button>
              <button onClick={()=>send("อ่านหนังสือให้ฟังหน่อย")}>อ่านหนังสือ</button>
            </div>
            <div className="composer">
              <button className="mic" onMouseDown={pressMicStart} onMouseUp={pressMicEnd} onTouchStart={pressMicStart} onTouchEnd={pressMicEnd}>🎙️</button>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send();}} placeholder={`พิมพ์คุยกับ${mem.nongnamName}...`}/>
              <button className="send" onClick={()=>send()}>➤</button>
            </div>
            <div className="hint">กดค้างไว้แล้วพูด • ปล่อยเพื่อส่ง</div>
          </div>
        )}

        {screen === "outfits" && (
          <div className="list">
            <button className="back" onClick={()=>setScreen("chat")}>←</button>
            <h1>ชุดน้องน้ำ</h1><p>เลือก/ซื้อ/ทดสอบชุด</p>
            <div className="tabs"><button className={tab==="regular"?"on":""} onClick={()=>setTab("regular")}>ทั่วไป</button><button className={tab==="special20"?"on":""} onClick={()=>setTab("special20")}>20+</button></div>
            <div className="cards">
              {effectiveOutfits.filter(o => o.category===tab && (tab==="special20" || o.gender===mem.gender)).map(o => {
                const unlocked = isUnlocked(o.id);
                const blurClass = !unlocked && (o.ageRestricted ? "blur-strong" : o.lockedPreview ? "blur-light" : "");
                return <div className="outfit" key={o.id}>
                  <div className="pic">
                    <img className={blurClass} src={o.chatImage} alt={o.title}/>
                    {blurClass && <div className="lock">🔒<br/>ปลดล็อกเพื่อดูชัด</div>}
                  </div>
                  <h3>{o.title}</h3><p>{o.desc}</p>
                  <b>{o.price===0?"ฟรี":`💎 ${o.price}`}</b>
                  <button onClick={()=>buyOrUse(o)}>{mem.selectedOutfit===o.id?"ใช้อยู่":unlocked?"ใช้ชุดนี้":"ปลดล็อก"}</button>
                </div>
              })}
            </div>
          </div>
        )}

        {screen === "books" && (
          <div className="list booksScreen">
            <button className="back" onClick={()=>setScreen("chat")}>←</button>
            <h1>ชั้นหนังสือ</h1><p>ได้เลย{polite}{mem.userCallName} เลือกหมวดได้เลย แล้วค่อยเลือกเล่มที่อยากฟัง</p>
            <div className="readerSpeed">
              <span>ความเร็วอ่าน</span>
              {[0.8, 1.0, 1.25, 1.5, 2.0].map(r => (
                <button key={r} className={(mem.speechRate || 1) === r ? "on" : ""} onClick={()=>updateMem({speechRate:r})}>{r}x</button>
              ))}
            </div>
            {reading && <div className="resumeBox">มีเรื่อง “{reading.title}” ฟังค้างไว้ <button onClick={resumeReading}>อ่านต่อ</button><button onClick={stopReading}>ล้าง</button></div>}
            <div className="bookcats">
              {bookCategories.map(cat => (
                <button key={cat} className={bookCat===cat?"on":""} onClick={()=>{
                  if (cat.includes("18+") && !mem.age20Confirmed && !mem.ownerMode) {
                    const ok = confirm("หมวดอีโรติก 18+ สำหรับผู้ใหญ่อายุ 20 ปีขึ้นไปเท่านั้น ยืนยันว่าคุณอายุ 20+ ใช่หรือไม่?");
                    if (!ok) return;
                    updateMem({ age20Confirmed: true });
                  }
                  setBookCat(cat);
                }}>{cat}</button>
              ))}
            </div>
            
            <div className="cards">
              {visibleBooks.map(b => <div className="book clickableBook" key={b.id} onClick={()=>readBook(b)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter")readBook(b);}}>
                <div className="bookCoverWrap">
                  <img src={b.cover} alt={b.title}/>
                  {b.adult && <span className="adultBadge">20+</span>}
                </div>
                <div className="bookMeta">
                  <h3>{b.title}</h3>
                  <p className="bookLine"><b>หมวด:</b> {b.adult ? "อีโรติก 18+" : b.cat} • <b>ราคา:</b> {b.price} ดาว</p>
                  <p className="bookLine"><b>ผู้แต่ง:</b> {b.author?.trim() || "ไม่ระบุ"}</p>
                  <small>{b.teaser || "ยังไม่มีคำโปรย"}</small>
                  <div className="readHint">แตะเล่มนี้เพื่อให้น้องน้ำอ่าน</div>
                </div>
                <button onClick={(e)=>{e.stopPropagation(); readBook(b);}}>ให้น้องน้ำอ่าน</button>
              </div>)}
            </div>
          </div>
        )}


        {screen === "settings" && (
          <div className="setup settings">
            <button className="back slimBack" onClick={()=>setScreen("chat")}>←</button>
            <h1>ตั้งค่า</h1>
            <div className="card settingsCard">
              <button onClick={resetProfile}>รีเซ็ตข้อมูลตั้งค่า</button>
              <button onClick={()=>{setChat([]); localStorage.removeItem(CHAT_KEY); notify("ล้างแชตแล้ว");}}>ล้างประวัติแชต</button>

              {mem.ownerMode && (
                <>
                  <div className="owner">OWNER MODE เปิดอยู่</div>
                  <div className="ownerQuick">
                    <button onClick={()=>setOwnerSection(ownerSection==='outfits' ? 'none' : 'outfits')}>จัดการชุด</button>
                    <button onClick={()=>setOwnerSection(ownerSection==='books' ? 'none' : 'books')}>จัดการหนังสือ</button>
                    <button onClick={toggleVoice}>{mem.voiceUnlocked ? "ปิดเสียงตอบกลับ" : "เปิดเสียงตอบกลับ"}</button>
                    <div className="apiSettingBox">
                      <b>โหมด AI/API</b>
                      <label><input type="checkbox" checked={mem.apiConsent} onChange={e=>updateMem({apiConsent:e.target.checked})}/> อนุญาตให้ใช้โหมดคำถามลึกโดยไม่ถามซ้ำ</label>
                      <select value={mem.apiMode} onChange={e=>updateMem({apiMode:e.target.value as ApiMode})}>
                        <option value="api-light">คุยฉลาด ประหยัด</option>
                        <option value="api-deep">วิเคราะห์ลึก</option>
                        <option value="api-search">ค้นข้อมูล/คำถามจริงจัง</option>
                      </select>
                      <small>อ่านหนังสือไม่ใช้ API ส่วนคำถามลึกจะหักเพชรตามระดับ</small>
                    </div>
                    <button onClick={()=>updateMem({gems: mem.gems + 10000})}>เติมเพชรทดสอบ +10000</button>
                    <button className="ghostBtn" onClick={exitOwnerMode}>ออกจาก OWNER MODE</button>
                  </div>

                  {ownerSection === 'outfits' && (
                    <div className="adminInline">
                      <h2>จัดการชุด</h2>
                      <label>เลือกชุด</label>
                      <select value={editingOutfitId} onChange={e=>loadOutfitForEdit(e.target.value)}>
                        {effectiveOutfits.filter(o=>o.gender===mem.gender || o.category==='special20').map(o => <option key={o.id} value={o.id}>{o.id} • {o.title}</option>)}
                      </select>
                      <label>ชื่อชุด</label>
                      <input value={String(outfitForm.title || outfitForEdit.title || '')} onChange={e=>setOutfitForm(prev=>({ ...prev, title:e.target.value }))} />
                      <label>คำอธิบาย</label>
                      <textarea rows={3} value={String(outfitForm.desc || outfitForEdit.desc || '')} onChange={e=>setOutfitForm(prev=>({ ...prev, desc:e.target.value }))} />
                      <label>ราคาเพชร</label>
                      <input type="number" min={0} value={Number(outfitForm.price ?? outfitForEdit.price ?? 0)} onChange={e=>setOutfitForm(prev=>({ ...prev, price:Number(e.target.value || 0) }))} />
                      <label className="checkRow"><input type="checkbox" checked={!!(outfitForm.lockedPreview ?? outfitForEdit.lockedPreview)} onChange={e=>setOutfitForm(prev=>({ ...prev, lockedPreview:e.target.checked }))} /><span>เปิดเบลอสำหรับชุดนี้</span></label>
                      <label className="checkRow"><input type="checkbox" checked={!!(outfitForm.ageRestricted ?? outfitForEdit.ageRestricted)} onChange={e=>setOutfitForm(prev=>({ ...prev, ageRestricted:e.target.checked }))} /><span>จำกัดอายุ / 20+</span></label>
                      <div className="imagePair">
                        <div>
                          <label>รูปตอนแชต</label>
                          <img className="outfitPreview" src={String(outfitForm.chatImage || outfitForEdit.chatImage || '')} alt="chat preview" />
                          <input type="file" accept="image/*" onChange={e=>onOutfitImageFile('chatImage', e.target.files?.[0])} />
                        </div>
                        <div>
                          <label>รูปตอนอ่านหนังสือ</label>
                          <img className="outfitPreview" src={String(outfitForm.bookImage || outfitForEdit.bookImage || '')} alt="book preview" />
                          <input type="file" accept="image/*" onChange={e=>onOutfitImageFile('bookImage', e.target.files?.[0])} />
                        </div>
                      </div>
                      <div className="rowBtns">
                        <button onClick={saveOutfitEdit}>บันทึกชุดนี้</button>
                        <button className="ghostBtn" onClick={resetOutfitEdit}>คืนค่าชุดเดิม</button>
                      </div>
                    </div>
                  )}

                  {ownerSection === 'books' && (
                    <div className="adminInline">
                      <h2>จัดการหนังสือ</h2>
                      <label>ชื่อหนังสือ</label>
                      <input value={bookForm.title} onChange={e=>updateBookForm({title:e.target.value})} placeholder="เช่น คืนนี้นอนหลับนะ" />
                      <label>หมวดหนังสือ</label>
                      <input list="cats" value={bookForm.cat} onChange={e=>updateBookForm({cat:e.target.value, adult:e.target.value.includes('18+')})} placeholder="กำลังใจ / ความรัก / อีโรติก 18+" />
                      <datalist id="cats">{baseBookCategories.filter(c=>c!=="ทั้งหมด").map(c => <option key={c} value={c} />)}</datalist>
                      <label>คำโปรย / คำอธิบายสั้น</label>
                      <textarea rows={3} value={bookForm.teaser} onChange={e=>updateBookForm({teaser:e.target.value})} placeholder="บอกสั้น ๆ ว่าเล่มนี้เกี่ยวกับอะไร" />
                      <label>ราคา (ดาว)</label>
                      <input type="number" min={1} max={9} value={bookForm.price} onChange={e=>updateBookForm({price:Number(e.target.value||1)})} />
                      <label>ผู้เขียน / หมายเหตุ</label>
                      <input value={bookForm.author || ""} onChange={e=>updateBookForm({author:e.target.value})} placeholder="เช่น พี่แมน / นักเขียนรับเชิญ" />
                      <label>ลิงก์ปกหนังสือ</label>
                      <input value={bookForm.cover} onChange={e=>updateBookForm({cover:e.target.value})} placeholder="วาง URL รูปปก หรือใช้อัปโหลดด้านล่าง" />
                      <label>หรืออัปโหลดปกหนังสือจากเครื่อง</label>
                      <input type="file" accept="image/*" onChange={e=>onBookCoverFile(e.target.files?.[0])} />
                      {bookForm.cover && <img className="bookPreview" src={bookForm.cover} alt="preview" />}
                      <label>เนื้อหาหนังสือ / ข้อความที่จะให้น้องน้ำอ่าน</label>
                      <textarea rows={12} value={bookForm.text} onChange={e=>updateBookForm({text:e.target.value})} placeholder="ก๊อปข้อความยาว ๆ มาวางได้เลย จะกี่หน้าก็ได้" />
                      <label className="checkRow"><input type="checkbox" checked={!!bookForm.adult} onChange={e=>updateBookForm({adult:e.target.checked, cat:e.target.checked ? (bookForm.cat.includes('18+') ? bookForm.cat : 'อีโรติก 18+') : bookForm.cat})} /> <span>เป็นหนังสือหมวดอีโรติก 18+</span></label>
                      <div className="rowBtns">
                        <button onClick={addBook}>{editingBookId ? 'บันทึกการแก้ไขหนังสือ' : 'บันทึกหนังสือเล่มนี้'}</button>
                        {editingBookId && <button className="ghostBtn" onClick={cancelEditBook}>ยกเลิกการแก้ไข</button>}
                      </div>
                      <div className="existingBooks">
                        <h2>หนังสือที่มีอยู่</h2>
                        {booksData.map(b => <div className="existingBook" key={b.id}>
                          <div>
                            <b>{b.title}</b>
                            <small>{b.cat} • {b.price} ดาว {b.adult ? '• 18+' : ''}</small>
                          </div>
                          <div className="rowBtns">
                            <button onClick={()=>beginEditBook(b)}>แก้ไข</button>
                            <button onClick={()=>readBook(b)}>ทดลองอ่าน</button>
                            <button onClick={()=>deleteBook(b.id)}>ลบ</button>
                          </div>
                        </div>)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <button className="versionMini" onClick={tapVersion}>• {APP_VERSION}</button>
          </div>
        )}
        {showOwnerModal && (
          <div className="modalWrap" onClick={()=>setShowOwnerModal(false)}>
            <div className="modalCard" onClick={(e)=>e.stopPropagation()}>
              <div className="modalTop">🔐 โหมดเจ้าของ</div>
              <h3>ใส่รหัสผ่านสำหรับเปิดหลังบ้าน</h3>
              <p>แตะ Version 4 ครั้งเพื่อเรียกหน้าต่างนี้ขึ้นมา</p>
              <input
                type="password"
                value={ownerPinInput}
                onChange={e=>setOwnerPinInput(e.target.value)}
                onKeyDown={e=>{ if (e.key === 'Enter') confirmOwnerPin(); }}
                placeholder="ใส่รหัส 4 หลัก"
                autoFocus
              />
              <div className="modalActions">
                <button className="ghost" onClick={()=>setShowOwnerModal(false)}>ยกเลิก</button>
                <button className="solid" onClick={confirmOwnerPin}>ยืนยัน</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

