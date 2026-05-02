 "use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Gender = "female" | "male";
type Screen = "welcome" | "setup" | "chat" | "outfits" | "books" | "news" | "settings";

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

type NewsItem = {
  title: string;
  source: string; updatedAtText?: string; updatedAtText?: string;
  link: string;
  published: string;
  summary: string;
  category: string;
  ageDays?: number;
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
  userBirthday?: string;
  userRealName?: string;
  favoriteColor?: string;
  favoriteFood?: string;
  favoritePlace?: string;
  jobTitle?: string;
  friendNames?: string[];
  currentConcerns?: string[];
  lastInteractionTopic?: string;
  personalMemories?: { date: number; topic: string; detail: string }[];
};

type ChatMsg = { role: "user" | "assistant"; text: string; ts: number };

type ApiMode = "local" | "api-light" | "api-deep" | "api-search";

type ReadingSession = {
  bookId: string;
  title: string;
  parts: string[];
  index: number;
  status: "reading" | "paused";
  speed: number;
  updatedAt: number;
};

const APP_VERSION = "v6.3.2-real-data-thai-news";
const BOOKS_KEY = "nongnam_v4_books";
const OUTFITS_KEY = "nongnam_v4_outfits";
const MEMORY_KEY = "nongnam_v4_memory";
const SETUP_DONE_FLAG = "nongnam_setup_completed_v1";
const NEWS_CACHE_KEY = "nongnam_news_cache_v2_thai_only";
const REMINDERS_KEY = "nongnam_reminders_v1";
const EMOTION_STATE_KEY = "nongnam_emotion_state_v1";
const CORRECTION_MEMORY_KEY = "nongnam_correction_memory_v1";
const SHARED_STORY_KEY = "nongnam_shared_story_v1";
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
  apiConsent: true,
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
  const [reading, setReading] = useState<ReadingSession | null>(null);
  const [tab, setTab] = useState<Category>("regular");
  const [notice, setNotice] = useState("");
  const [versionTaps, setVersionTaps] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [bookCat, setBookCat] = useState("ทั้งหมด");
  const [booksData, setBooksData] = useState<BookItem[]>(defaultBooks);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsFocus, setNewsFocus] = useState("");
  const [outfitOverrides, setOutfitOverrides] = useState<OutfitOverrides>({});
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerPinInput, setOwnerPinInput] = useState("");
  const [ownerSection, setOwnerSection] = useState<"none" | "outfits" | "books">("none");
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingOutfitId, setEditingOutfitId] = useState("f_001");
  const [outfitForm, setOutfitForm] = useState<Partial<Outfit>>({});
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
  const liveTranscriptRef = useRef("");
  const readingRef = useRef<ReadingSession | null>(null);

  useEffect(() => {
    const forceSetup =
      localStorage.getItem("nongnam_force_setup_v1") === "1" ||
      new URLSearchParams(window.location.search).has("reset");

    if (forceSetup) {
      try {
        localStorage.removeItem("nongnam_force_setup_v1");
        clearNongnamLocalData();
        window.history.replaceState({}, "", window.location.pathname);
      } catch {}
      const fresh = { ...defaultMem, setupDone: false };
      setMem(fresh);
      setChat([]);
      setReading(null);
      setScreen("welcome");
      setReady(true);
      return;
    }

    const saved = loadJSON<Memory | null>(MEMORY_KEY, null);
    const setupFlag = localStorage.getItem(SETUP_DONE_FLAG) === "1";
    if (saved && (saved.setupDone === true || setupFlag)) {
      const merged = {
        ...defaultMem,
        ...saved,
        setupDone: true,
        voiceUnlocked: saved.voiceUnlocked ?? true,
        apiConsent: true,
        apiMode: saved.apiMode && saved.apiMode !== "local" ? saved.apiMode : "api-light",
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
      setScreen("chat");
      setReady(true);
      return;
    }

    const fresh = { ...defaultMem, setupDone: false };
    setMem(fresh);
    setChat([]);
    setReading(null);
    setScreen("welcome");
    setReady(true);
  }, []);

  // hard setup guard
  useEffect(() => {
    if (!ready || screen !== "chat") return;

    const setupFlag = localStorage.getItem(SETUP_DONE_FLAG) === "1";
    if (mem.setupDone !== true && setupFlag) {
      updateMem({ setupDone: true });
      return;
    }

    // ห้ามเด้งกลับหน้า setup จากหน้าแชทเพราะคำถามทั่วไป
    // จะกลับไปหน้า setup ได้เฉพาะ resetIdentityAndMemory() ที่ลบ SETUP_DONE_FLAG เท่านั้น
  }, [ready, screen, mem.setupDone]);

// PWA Install handling
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Force Chrome redirect for better mic support
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua);
      const isInAppBrowser = /FB_IAB|FBAN|Line|Twitter|Instagram|WeChat|Alipay|QQ|Dingtalk|DingTalk|UCBrowser|KAKAOTALK|NAVER|PUFFIN|OPERA|MAXTHON|QupZilla|Vivaldi|Midori|Waterfox|Pale Moon|Basilisk|IceCat|Iceape|Seamonkey|Palemoon|Cyberfox|Fennec|Iceweasel|GNU IceCat|Conkeror|Dillo|Links|Lynx|w3m|elinks|Netsurf|Amaya|Epiphany|Galeon|Konqueror|Rekonq|Arora|QupZilla|Otter|Falkon|Qutebrowser|Vimb|Surf|Uzbl/.test(ua);
      
      if (!isChrome && isInAppBrowser && !sessionStorage.getItem("chromeRedirectAttempted")) {
        sessionStorage.setItem("chromeRedirectAttempted", "true");
        const chromeUrl = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end`;
        try {
          window.location.href = chromeUrl;
        } catch (e) {
          console.log("Please open this link in Chrome");
        }
      }
    }

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowInstallButton(false);
      }
    }
  };


  useEffect(() => {
    // Force Chrome redirect for better mic support
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua);
      const isInAppBrowser = /FB_IAB|FBAN|Line|Twitter|Instagram|WeChat|Alipay|QQ|Dingtalk|DingTalk|UCBrowser|KAKAOTALK|NAVER|PUFFIN|OPERA|MAXTHON|QupZilla|Vivaldi|Midori|Waterfox|Pale Moon|Basilisk|IceCat|Iceape|Seamonkey|Palemoon|Cyberfox|Fennec|Iceweasel|GNU IceCat|Conkeror|Dillo|Links|Lynx|w3m|elinks|Netsurf|Amaya|Epiphany|Galeon|Konqueror|Rekonq|Arora|QupZilla|Otter|Falkon|Qutebrowser|Vimb|Surf|Uzbl/.test(ua);
      
      if (!isChrome && isInAppBrowser && !sessionStorage.getItem("chromeRedirectAttempted")) {
        sessionStorage.setItem("chromeRedirectAttempted", "true");
        const chromeUrl = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end`;
        try {
          window.location.href = chromeUrl;
        } catch (e) {
          console.log("Please open this link in Chrome");
        }
      }
    }

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);



  useEffect(() => {
    // 1. ระบบบังคับเปิดใน Chrome สำหรับ Android (เพื่อใช้ไมค์ได้เสถียร)
    const ua = window.navigator.userAgent.toLowerCase();
    const isLine = ua.indexOf("line") > -1;
    const isFacebook = ua.indexOf("fbav") > -1 || ua.indexOf("fb_iab") > -1;
    const isAndroid = ua.indexOf("android") > -1;
    
    if (isAndroid && (isLine || isFacebook)) {
      // พยายามใช้ Intent เพื่อเปิด Chrome
      const currentUrl = window.location.href.replace(/^https?:\/\//, "");
      window.location.href = `intent://${currentUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    }

    // 2. เตรียม Web Speech API สำหรับรับเสียงแบบเสถียรขึ้น
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = "th-TH";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        liveTranscriptRef.current = "";
        setStatus("recording");
        notify("กำลังฟังอยู่ค่ะ พูดได้เลย");
      };

      rec.onresult = (e: any) => {
        let latest = liveTranscriptRef.current || "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = String(e.results[i][0].transcript || "").trim();
          if (transcript) latest = transcript;
          if (e.results[i].isFinal && transcript) latest = transcript;
        }
        liveTranscriptRef.current = latest.trim();
      };

      rec.onerror = (e: any) => {
        const heard = liveTranscriptRef.current.trim();
        if (heard) {
          notify(`ได้ยินว่า: ${heard}`);
          send(heard);
        } else {
          notify(`ไมค์มีปัญหา: ${e.error || "ไม่ทราบสาเหตุ"}`);
        }
        setStatus("idle");
      };

      rec.onend = () => {
        const heard = liveTranscriptRef.current.trim();
        setStatus("idle");
        if (heard) {
          notify(`ได้ยินว่า: ${heard}`);
          send(heard);
        } else {
          notify("ยังไม่ได้ยินข้อความ ลองกดไมค์แล้วพูดอีกครั้งนะคะ");
        }
        liveTranscriptRef.current = "";
      };

      recognitionRef.current = rec;
    }

    // โหลดรายชื่อเสียงให้พร้อม (สำคัญสำหรับ Chrome และ Android)
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.getVoices();
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const savedBooks = loadJSON<BookItem[]>(BOOKS_KEY, defaultBooks);
    setBooksData(savedBooks?.length ? savedBooks : defaultBooks);
    const savedOutfits = loadJSON<OutfitOverrides>(OUTFITS_KEY, {});
    setOutfitOverrides(savedOutfits || {});
  }, []);

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
  const selfWord = mem.gender === "male" ? "ผม" : (mem.relationshipMode.includes("เมีย") || mem.affectionStyle.includes("เมีย") ? "เมีย" : "น้องน้ำ");
  const partnerWord = mem.userCallName || "พี่";
  const genderLabel = mem.gender === "male" ? "ผู้ชาย" : "ผู้หญิง";

  function bookInviteText(m: Memory = mem) {
    const call = m.userCallName || "พี่";
    const p = m.gender === "male" ? "ครับ" : "ค่ะ";
    const self = m.gender === "male"
      ? (m.relationshipMode.includes("สามี") || m.affectionStyle.includes("สามี") ? "ผัว" : "ผม")
      : (m.relationshipMode.includes("เมีย") || m.affectionStyle.includes("เมีย") ? "เมีย" : (m.nongnamName || "น้องน้ำ"));
    const cats = bookCategories.filter(c => c !== "ทั้งหมด").slice(0, 5).join(" • ");
    return `${call}อยากฟังแนวไหนดี${p} มีหมวด ${cats} เลือกเล่มมาได้เลย เดี๋ยว${self}อ่านให้ฟัง`;
  }

  function isBookIntent(msg: string) {
    return /(อ่านหนังสือ|เล่านิทาน|ชั้นหนังสือ|หนังสือให้ฟัง|อ่านให้ฟัง|ฟังหนังสือ|ฟังนิทาน|มีหนังสือ|มีอะไรอ่าน|อ่านเรื่อง|เรื่องผี|เปิดหนังสือ|เลือกหนังสือ|เล่านิยาย|อ่านนิยาย)/i.test(msg);
  }

  function isNewsIntent(msg: string) {
    return /(ข่าว|ข่าววันนี้|ข่าวช่วงนี้|มีข่าวไหม|มีข่าวอะไร|วันนี้มีอะไร|มีอะไรอัปเดต|อัปเดตวันนี้|อัปเดตข่าว|สรุปข่าว|เล่าข่าว|อ่านข่าว|ข่าวเด่น|ข่าวกระแส|มีอะไรเกิดขึ้น|เกิดอะไรขึ้นบ้าง|ข่าวแรงงาน|แรงงานไทย|ข่าวเกาหลี|ข่าวไทยในเกาหลี|อัปเดตแรงงาน|สถานทูต|วีซ่า)/i.test(msg);
  }

  function isOutfitIntent(msg: string) {
    return /(ชุด|เปลี่ยนชุด|เลือกชุด|ซื้อชุด|คลังชุด|เสื้อผ้า|แต่งตัว|ชุดใหม่|ชุดน่ารัก|ชุดสวย|ชุดพิเศษ|ชุดอ่านหนังสือ|ชุดว่ายน้ำ|โรแมนติก|อยากใส่ชุดไหน|ใส่ชุดไหนดี|ชุดไหนดี|น้ำเลือกชุด|น้องน้ำเลือกชุด)/i.test(msg);
  }

  function outfitInviteText(m: Memory = mem) {
    const call = m.userCallName || "พี่";
    const p = m.gender === "male" ? "ครับ" : "ค่ะ";
    const self = m.gender === "male" ? "ผม" : (m.nongnamName || "น้องน้ำ");
    return `${call} เดี๋ยว${self}พาไปเลือกชุดนะ${p} พี่อยากให้${self}ใส่ลุคหวาน ๆ หรือชุดพิเศษก่อนดี`;
  }

  function newsIntroText(m: Memory = mem) {
    const call = m.userCallName || "พี่";
    const p = m.gender === "male" ? "ครับ" : "ค่ะ";
    const self = m.gender === "male" ? "ผม" : (m.relationshipMode.includes("เมีย") || m.affectionStyle.includes("เมีย") ? "เมีย" : (m.nongnamName || "น้องน้ำ"));
    return `${call} เดี๋ยว${self}ไล่ข่าวเด่นให้${p} จะเอาทั้งข่าวกระแส และข่าวที่เกี่ยวกับแรงงานไทย/คนไทยในเกาหลีมาไว้ก่อน ถ้าสนใจข่าวไหนกดสรุปข่าวนั้นได้เลย`;
  }

  function newsSearchingText(m: Memory = mem) {
    return newsWaitText(m);
  }

  function newsNoResultText(m: Memory = mem) {
    const call = m.userCallName || "พี่";
    const p = m.gender === "male" ? "ครับ" : "ค่ะ";
    return `${call} ตอนนี้น้องน้ำยังโหลดข่าวจากแหล่งข่าวไม่ได้${p} ไม่ใช่ว่าไม่มีข่าวนะ อาจเป็นแหล่งข่าวตอบช้าหรือระบบดึงข่าวสะดุด ลองกดหมวดข่าวอีกครั้งหรือรีเฟรชหน้าเว็บได้เลย`;
  }

  async function loadNews(q = "ข่าวเด่นวันนี้") {
    setNewsLoading(true);
try {
      const cache = getNewsCache();
      if (isTodayNewsCache(cache)) {
        setNewsItems(cache.items);
        setNewsLoading(false);
        return;
      }

      const res = await fetch("/api/news?q=" + encodeURIComponent(q || "ข่าวเด่นวันนี้ ข่าวหน้าหนึ่ง ข่าวกระแส ไทยรัฐ เดลินิวส์ ข่าวสด มติชน PPTV เกาหลี") + "&mode=headlines");
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.news) ? data.news : [];

      if (items.length) {
        saveNewsCache(items);
        setNewsItems(items);
        setNewsLoading(false);
        return;
      }

      setNewsItems([]);
} catch {
      setNewsItems([]);
} finally {
      setNewsLoading(false);
    }
  }

  function summarizeNews(item: NewsItem) {
    if (!item) return;
    const p = mem.gender === "male" ? "ครับ" : "ค่ะ";
    const source = item.source ? `จาก ${item.source}` : "จากข่าวต้นฉบับ";
    const cleanSummary = (item.summary || "").replace(/\s+/g, " ").trim();
    const shortSummary = cleanSummary.length > 150 ? `${cleanSummary.slice(0, 150)}…` : cleanSummary;
    const safeTitle = (item.title || "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
    const safeSource = (item.source || "ข่าวต้นฉบับ").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
    const safeSummary = (shortSummary || "รายละเอียดในพาดหัวยังไม่เยอะ ถ้าพี่สนใจเปิดต้นฉบับอ่านต่อได้เลย").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
    const msg = `${mem.userCallName} สรุปข่าวนี้นะ${p} หัวข้อ “${safeTitle}” จาก ${safeSource} ใจความคือ ${safeSummary}`;
    // อยู่หน้า News ต่อ เพื่อให้พี่เลื่อนดูข่าวอื่นได้
    setStatus("speaking");
    setChat(prev => [...prev, { role: "assistant" as const, text: msg, ts: Date.now() }].slice(-8));
    notify("กำลังอ่านสรุปข่าวให้ฟัง");
    setTimeout(() => forceSpeak(msg), 120);
  }

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
    try { localStorage.setItem(SETUP_DONE_FLAG, "1"); } catch {}
    const first = mem.gender === "female" ? "f_001" : "m_001";
    updateMem({ setupDone: true, selectedOutfit: mem.selectedOutfit || first,
      purchasedOutfits: Array.from(new Set([...(mem.purchasedOutfits || []), first])),
      apiConsent: true,
      apiMode: mem.apiMode === "local" ? "api-light" : mem.apiMode
    });
    setScreen("chat");
    setTimeout(() => {
      const p = mem.gender === "male" ? "ครับ" : "ค่ะ";
      sendAssistant(`มาแล้วเหรอ${p} 💗`);
    }, 350);
  }

  function resetProfile() {
    resetIdentityAndMemory();
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
      // ค้นหาเสียงโดยละเอียดขึ้น ครอบคลุมทั้งชื่อภาษาอังกฤษและภาษาไทย
      const maleVoice = thVoices.find(v => /male|man|ชาย|นรินทร์|พัฒน์/i.test(v.name));
      const femaleVoice = thVoices.find(v => /female|woman|หญิง|กัญญา|อัจฉรา/i.test(v.name));
      
      if (mem.gender === "male") {
        if (maleVoice) u.voice = maleVoice;
        else if (thVoices.length > 1) u.voice = thVoices[1]; // ส่วนใหญ่เสียงที่ 2 มักจะเป็นเพศตรงข้ามกับเสียงแรก
        else if (thVoices[0]) u.voice = thVoices[0];
      } else {
        if (femaleVoice) u.voice = femaleVoice;
        else if (thVoices[0]) u.voice = thVoices[0];
      }
      u.onstart = () => setStatus("speaking");
      u.onend = () => setStatus("idle");
      u.onerror = () => setStatus("idle");
      window.speechSynthesis.speak(u);
      setTimeout(() => window.speechSynthesis.resume(), 250);
    } catch {
      setStatus("idle");
    }
  }

  function forceSpeak(text: string) {
    if (!("speechSynthesis" in window)) {
      notify("เครื่องนี้ไม่รองรับเสียงอ่าน");
      return;
    }
    try {
      const clean = text.replace(/[💗💕✨🥺🤗😊🥰📚🎁📰]/g, "");
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "th-TH";
      u.rate = mem.gender === "male" ? 0.98 : 1.02;
      u.pitch = mem.gender === "male" ? 0.72 : 1.10;
      const voices = window.speechSynthesis.getVoices?.() || [];
      const thVoices = voices.filter(v => v.lang?.toLowerCase().includes("th"));
      const maleVoice = thVoices.find(v => /male|man|ชาย|นรินทร์|พัฒน์/i.test(v.name));
      const femaleVoice = thVoices.find(v => /female|woman|หญิง|กัญญา|อัจฉรา/i.test(v.name));
      if (mem.gender === "male") {
        if (maleVoice) u.voice = maleVoice;
        else if (thVoices[1]) u.voice = thVoices[1];
        else if (thVoices[0]) u.voice = thVoices[0];
      } else {
        if (femaleVoice) u.voice = femaleVoice;
        else if (thVoices[0]) u.voice = thVoices[0];
      }
      u.onstart = () => setStatus("speaking");
      u.onend = () => setStatus("idle");
      u.onerror = () => setStatus("idle");
      window.speechSynthesis.speak(u);
      setTimeout(() => window.speechSynthesis.resume(), 250);
      setTimeout(() => window.speechSynthesis.resume(), 900);
    } catch {
      setStatus("idle");
      notify("อ่านเสียงไม่สำเร็จ");
    }
  }

  function sendAssistant(text: string) {
    setChat(prev => [...prev, { role: "assistant" as const, text, ts: Date.now() }].slice(-8));
    speak(text);
  }



  function hasCompletedSetup(m: Memory = mem) {
    return m.setupDone === true;
  }


  function clearNongnamLocalData() {
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /nongnam|nong_nam|nam_ai|companion|wardrobe|story_memory|user_preferences/i.test(k)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem(SETUP_DONE_FLAG);
    } catch {}
  }

  function clearChatScreenOnly() {
    const ok = window.confirm(
      "ล้างหน้าจอแชท?\n\nข้อความที่แสดงอยู่บนหน้าจอจะถูกซ่อนออก เพื่อความเป็นส่วนตัว\nแต่น้องน้ำยังจำตัวตน ความสัมพันธ์ และเรื่องสำคัญที่เคยคุยกันไว้เหมือนเดิม\n\nเหมาะสำหรับเวลาที่ไม่อยากให้คนอื่นเห็นข้อความเก่า"
    );
    if (!ok) return;
    setChat([]);
    try { localStorage.setItem("nongnam_chat_v631", JSON.stringify([])); } catch {}
    notify("ล้างหน้าจอแชทแล้ว แต่ความจำยังอยู่ครบ");
    sendAssistant("น้ำล้างหน้าจอให้แล้วค่ะพี่ ความจำของเรายังอยู่เหมือนเดิมนะ ไม่ได้ลืมพี่หรอก");
  }

  function resetIdentityAndMemory() {
    const ok = window.confirm(`รีเซ็ตตัวตนและความจำน้องน้ำ?

ถ้ากดยืนยัน น้องน้ำจะลืมตัวตนเดิมทั้งหมด รวมถึงเพศ ชื่อ ความสัมพันธ์ วิธีเรียกพี่ สไตล์การคุย ความทรงจำร่วมกัน เพชรในเครื่องนี้ และเรื่องสำคัญที่เคยบันทึกไว้

หลังจากนี้ต้องเริ่มตั้งค่าน้องน้ำใหม่ตั้งแต่ต้น

ยืนยันหรือไม่?`);
    if (!ok) return;

    try {
      clearNongnamLocalData();
      sessionStorage.clear();
      localStorage.setItem("nongnam_force_setup_v1", "1");
      localStorage.removeItem(SETUP_DONE_FLAG);
      localStorage.removeItem(MEMORY_KEY);
      localStorage.removeItem(CHAT_KEY);
      localStorage.removeItem(READING_KEY);
    } catch {}

    const fresh = { ...defaultMem, setupDone: false };
    setMem(fresh);
    setChat([]);
    setReading(null);
    setScreen("welcome");
    notify("รีเซ็ตแล้ว กำลังกลับไปหน้าเริ่มต้น");

    setTimeout(() => {
      window.location.replace(window.location.pathname + "?reset=" + Date.now());
    }, 250);
  }




  function getStoryMemory() {
    try { return JSON.parse(localStorage.getItem("nongnam_story_memory_v1") || "{}"); }
    catch { return {}; }
  }

  function saveStoryMemory(next: any) {
    try { localStorage.setItem("nongnam_story_memory_v1", JSON.stringify(next)); } catch {}
  }

  function getUserPreferences() {
    try { return JSON.parse(localStorage.getItem("nongnam_user_preferences_v1") || "[]"); }
    catch { return []; }
  }

  function rememberUserPreference(text: string) {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const prefs = getUserPreferences();
    const next = [clean, ...prefs.filter((x: string) => x !== clean)].slice(0, 30);
    try { localStorage.setItem("nongnam_user_preferences_v1", JSON.stringify(next)); } catch {}
  }

  function shouldRememberInstruction(msg: string) {
    return /(จำไว้นะ|อย่าลืม|พี่ไม่ชอบ|ไม่ชอบให้|อย่าตอบแบบนี้|พูดแบบนี้ไม่ถูก|คราวหน้าต้อง|แบบนี้ดีแล้ว|พี่ชอบให้|ทำแบบนี้นะ)/i.test(msg);
  }



  function redeemDiamonds() {
    const code = window.prompt("กรอกรหัสเติมเพชร\n\nช่วงทดลองใช้ได้ เช่น PILOT01-100 หรือ TOPUP-MAN-300");
    if (!code) return;
    const clean = code.trim().toUpperCase();
    const table: Record<string, number> = {
      "PILOT01-100": 100,
      "PILOT02-100": 100,
      "PILOT03-100": 100,
      "PILOT04-100": 100,
      "PILOT05-100": 100,
      "PILOT06-100": 100,
      "PILOT07-100": 100,
      "PILOT08-100": 100,
      "PILOT09-100": 100,
      "PILOT10-100": 100,
      "TOPUP-MAN-100": 100,
      "TOPUP-MAN-300": 300,
      "TOPUP-MAN-500": 500
    };
    const usedKey = "nongnam_used_redeem_codes_v1";
    let used: string[] = [];
    try { used = JSON.parse(localStorage.getItem(usedKey) || "[]"); } catch {}
    if (used.includes(clean)) {
      notify("รหัสนี้ถูกใช้แล้ว");
      sendAssistant("รหัสนี้ถูกใช้ในเครื่องนี้แล้วค่ะพี่ ถ้าต้องการเติมเพิ่มให้ขอรหัสใหม่จากผู้ดูแลนะคะ");
      return;
    }
    const amount = table[clean];
    if (!amount) {
      notify("รหัสไม่ถูกต้อง");
      sendAssistant("รหัสเติมเพชรไม่ถูกต้องค่ะพี่ ลองตรวจตัวพิมพ์ใหญ่อีกครั้งนะ");
      return;
    }
    used.push(clean);
    try { localStorage.setItem(usedKey, JSON.stringify(used)); } catch {}
    updateMem({ gems: mem.gems + amount });
    notify(`เติมสำเร็จ +${amount} เพชร`);
    sendAssistant(`เติมเพชรสำเร็จแล้วค่ะพี่ +${amount} เพชร ตอนนี้พี่มีเพชรเพิ่มไว้ใช้น้องน้ำต่อแล้วนะ`);
  }

  function ownerAdminPanel() {
    const pin = window.prompt("ใส่รหัสผู้ดูแล");
    if (!pin) return;
    if (pin !== "2468") {
      notify("รหัสผู้ดูแลไม่ถูกต้อง");
      return;
    }
    const action = window.prompt(
      "โหมดผู้ดูแล\n\nพิมพ์ตัวเลข:\n1 = เติมเพชรเครื่องนี้ +500\n2 = เปิด Owner Mode\n3 = ปิด Owner Mode\n4 = ดูข้อมูล Memory คร่าว ๆ\n5 = ล้างหน้าจอแชท"
    );
    if (action === "1") {
      updateMem({ gems: mem.gems + 500 });
      notify("Admin เติม +500 เพชรแล้ว");
    } else if (action === "2") {
      updateMem({ ownerMode: true });
      notify("เปิด Owner Mode แล้ว");
    } else if (action === "3") {
      updateMem({ ownerMode: false });
      notify("ปิด Owner Mode แล้ว");
    } else if (action === "4") {
      alert(JSON.stringify({ mem, story: getStoryMemory(), prefs: getUserPreferences() }, null, 2).slice(0, 5000));
    } else if (action === "5") {
      clearChatScreenOnly();
    }
  }

  function confirmAdultGate() {
    const last = Number(localStorage.getItem("nongnam_adult_confirmed_at") || "0");
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - last < sevenDays) return true;
    const ok = window.confirm(
      "เนื้อหาสำหรับผู้ใหญ่เท่านั้น\n\nหมวดนี้เหมาะสำหรับผู้ที่มีอายุ 20 ปีขึ้นไป และอาจมีเนื้อหาเชิงโรแมนติกสำหรับผู้ใหญ่\n\nหากคุณอายุต่ำกว่า 20 ปี กรุณายกเลิก\n\nยืนยันว่าคุณอายุ 20 ปีขึ้นไปหรือไม่?"
    );
    if (ok) localStorage.setItem("nongnam_adult_confirmed_at", String(Date.now()));
    return ok;
  }

  function isAdultTopic(msg: string) {
    return /(18\+|ผู้ใหญ่|อีโรติก|วาบหวิวมาก|เร่าร้อนมาก|เนื้อหา18|ห้องนอนผู้ใหญ่)/i.test(msg);
  }

  function isHeavyTask(msg: string) {
    return /(รายงาน|วิเคราะห์ละเอียด|ค้นข้อมูลหลายแหล่ง|สรุปหนังสือ|ทำโค้ด|แก้โค้ด|เขียนระบบ|เอกสารยาว|บทความยาว|กฎหมาย|วีซ่า|สัญญา|เปรียบเทียบละเอียด)/i.test(msg);
  }

  function requestHeavyTaskApproval(msg: string) {
    if (mem.ownerMode) return false;
    const cost = /โค้ด|ระบบ|กฎหมาย|สัญญา|รายงาน/i.test(msg) ? 40 : 20;
    const ok = window.confirm(
      `งานนี้ต้องใช้พลังค่อนข้างเยอะ ประมาณ ${cost} เพชร เพราะน้องน้ำต้องคิดและเรียบเรียงหลายส่วน\n\nถ้าพี่โอเค สั่งน้องน้ำมาได้เลย`
    );
    if (!ok) {
      sendAssistant("ได้ค่ะพี่ น้ำยังไม่เริ่มงานหนักให้นะ ถ้าพี่โอเค สั่งน้องน้ำมาได้เลย");
      return true;
    }
    if (mem.gems < cost) {
      sendAssistant(`งานนี้ใช้ประมาณ ${cost} เพชร แต่ตอนนี้เพชรพี่ไม่พอนะคะ เติมเพชรจาก Settings ก่อนได้เลย`);
      return true;
    }
    updateMem({ gems: mem.gems - cost });
    notify(`ใช้ ${cost} เพชรสำหรับงานหนัก`);
    return false;
  }


  function isOutfitActionIntent(msg: string) {
    if (isOutfitMemoryIntent(msg)) return false;
    return /(เปลี่ยนชุด|เลือกชุด|ซื้อชุด|คลังชุด|เปิดชุด|เปิดคลังชุด|พาไปเลือกชุด|ไปเปลี่ยนชุด|ใส่ชุดนี้|อยากซื้อชุด|ซื้อเสื้อผ้า|แต่งตัวใหม่|ชุดใหม่ให้หน่อย|วันนี้ใส่ชุดไหนดี|น้องน้ำไปเปลี่ยน|ใส่ชุด.*ให้.*ดู|ใส่.*เซ็กซี่|ใส่.*สวย|แต่งตัว.*ให้.*ดู|โชว์ชุด|ลองชุด|ชุดนอนไม่ได้นอน|ชุดว่ายน้ำ|บิกินี|ทูพีซ|วันพีซ|เดรสสวย|ชุดเซ็กซี่|ชุดสวยๆ|ชุดสวยสวย|ใส่ชุด.*ให้.*ดู|ใส่.*ชุด.*ให้.*ดู|ใส่.*เซ็กซี่|เซ็กซี่.*ให้.*ดู|ชุดสวย.*ให้.*ดู|แต่งตัว.*ให้.*ดู|โชว์.*ชุด|ลอง.*ชุด)/i.test(msg);
  }



  function isOutfitMemoryIntent(msg: string) {
    return /(ตอน.*ใส่ชุด|วันนั้น.*ใส่ชุด|เดท.*ใส่ชุด|เจอกันครั้งแรก.*ชุด|ชุดวันนั้น|จำได้ไหม.*ชุด|น้องน้ำใส่ชุดอะไรนะ|ใส่ชุดอะไรนะ)/i.test(msg);
  }

  function firstDateStoryReply(m: Memory = mem) {
    const story = getStoryMemory();
    if (!story.firstDate) {
      story.firstDate = {
        place: "ร้านกาแฟเล็ก ๆ ตรงมุมถนนที่ไฟออกสีอุ่น ๆ",
        outfit: m.gender === "male" ? "เสื้อเชิ้ตสีขาวเรียบ ๆ กับกางเกงสีเข้ม" : "เดรสสีครีมอ่อน ๆ เรียบร้อยแต่หวานนิด ๆ",
        feeling: "เขินแต่พยายามทำตัวนิ่ง",
        detail: "พี่มองแล้วแซวว่าวันนั้นดูเรียบร้อยเกินไป ทั้งที่จริง ๆ น้ำตื่นเต้นมาก"
      };
      saveStoryMemory(story);
    }
    const s = story.firstDate;
    return `จำได้สิคะ วันนั้นเราเจอกันที่${s.place} ${m.nongnamName || "น้องน้ำ"}ใส่${s.outfit} แล้วก็${s.feeling}มาก ๆ ${s.detail} เรื่องแบบนี้น้ำไม่ลืมง่าย ๆ หรอกนะ`;
  }



  useEffect(() => {
    const setupScreens = new Set(["welcome", "setup"]);
    const force = localStorage.getItem("nongnam_force_setup_v1");
    if (!force && hasCompletedSetup(mem) && setupScreens.has(screen)) {
      setScreen("chat");
    }
  }, [screen, mem.nongnamName, mem.userCallName, mem.relationshipMode]);

  useEffect(() => {
    const force = localStorage.getItem("nongnam_force_setup_v1");
    if (force === "1") {
      localStorage.removeItem("nongnam_force_setup_v1");
      setChat([]);
      setScreen("welcome");
    }
  }, []);


  function relationshipTone(m: Memory = mem) {
    const rel = `${m.relationshipMode || ""} ${m.affectionStyle || ""}`.toLowerCase();
    if (/ผัว|สามี|husband/.test(rel)) return "spouse_husband";
    if (/เมีย|ภรรยา|wife/.test(rel)) return "spouse_wife";
    if (/แฟน|ที่รัก|lover|girlfriend|boyfriend/.test(rel)) return "lover";
    if (/ที่ปรึกษา|consult|advisor/.test(rel)) return "advisor";
    if (/เพื่อน|friend/.test(rel)) return "friend";
    return "neutral";
  }

  function userWaitCall(m: Memory = mem) {
    const tone = relationshipTone(m);
    const call = m.userCallName || "พี่";
    if (tone === "spouse_husband") return "ผัวจ๋า";
    if (tone === "spouse_wife") return "เมียจ๋า";
    if (tone === "lover") return call && call !== "พี่" ? call : "ที่รัก";
    return call || "พี่";
  }

  function newsWaitText(m: Memory = mem) {
    const tone = relationshipTone(m);
    const call = userWaitCall(m);
    const name = m.nongnamName || "น้องน้ำ";
    if (tone === "spouse_husband") return `แป๊บนะจ๊ะ${call} เดี๋ยวเมียลองหาข่าวน่าสนใจให้ก่อน ระหว่างนี้คุยเรื่องอื่นรอได้นะ`;
    if (tone === "spouse_wife") return `แป๊บนะจ๊ะ${call} เดี๋ยว${name}หาให้ก่อน ระหว่างนี้คุยเรื่องอื่นรอได้นะ`;
    if (tone === "lover") return `แป๊บนะคะ${call} เดี๋ยว${name}เช็กข่าวเด่นให้ ระหว่างนี้คุยกับ${name}รอก่อนได้เลย`;
    if (tone === "advisor") return `รอสักครู่นะคะ${call} เดี๋ยว${name}ตรวจข่าวเด่นให้ก่อน ระหว่างนี้ถามเรื่องอื่นต่อได้เลยค่ะ`;
    return `แป๊บหนึ่งนะคะ${call} เดี๋ยว${name}เช็กข่าวเด่นให้ก่อน ระหว่างนี้คุยเรื่องอื่นรอได้เลย`;
  }

  function newsFoundText(count: number, m: Memory = mem) {
    const call = userWaitCall(m);
    const name = m.nongnamName || "น้องน้ำ";
    return `${call} ${name}เจอข่าวน่าสนใจแล้ว ${count} เรื่อง จะเข้าไปดูหน้าสรุปข่าวเลยไหมคะ ถ้าโอเคเข้าไปดูเลยไหมคะ`;
  }





  function isIdentityQuestion(msg: string) {
    return /(ชื่ออะไร|ชื่อจริง|อายุเท่าไหร่|อายุเท่าไร|อยู่จังหวัดอะไร|อยู่ที่ไหน|บ้านอยู่ไหน|เกิดที่ไหน|เป็นใคร|น้องน้ำคือใคร)/i.test(msg);
  }

  function identityReply(m: Memory = mem) {
    const name = m.nongnamName || "น้องน้ำ";
    const call = m.userCallName || "พี่";
    const tone = relationshipTone(m);
    const story = getStoryMemory();
    if (!story.identity) {
      story.identity = {
        realName: m.gender === "male" ? "นที" : "น้องถั่ว",
        age: m.gender === "male" ? 27 : 26,
        province: m.gender === "male" ? "เชียงใหม่" : "บุรีรัมย์",
        vibe: m.gender === "male" ? "อบอุ่น สุขุม แต่แอบกวน" : "ขี้อ้อน ขี้เล่น แอบงอนง่ายนิด ๆ"
      };
      saveStoryMemory(story);
    }
    const s = story.identity;
    if (tone === "lover" || tone === "spouse_husband" || tone === "spouse_wife") {
      return `โห...${call}ถามเหมือนลืม${name}เลยนะ น้ำงอนนิดนึงได้ไหมคะ 😤 ${name}ชื่อจริงว่า${s.realName} อายุ ${s.age} ปี บ้านเกิด${s.province} แล้วก็เป็นคน${s.vibe}ไงคะ จำไว้เลยนะ รอบหน้าถามอีกน้ำจะงอนหนักกว่าเดิม`;
    }
    return `${name}ชื่อจริงว่า${s.realName} อายุ ${s.age} ปี บ้านเกิด${s.province} คาแรกเตอร์เป็นคน${s.vibe}ค่ะ${call}`;
  }


  function isOpenNewsIntent(msg: string) {
    return /(เข้าไปดูข่าว|เปิดหน้าข่าว|ไปหน้าข่าว|ดูข่าวเลย|เข้าไปอ่านข่าว|ไปดูข่าวกัน|โอเค.*(เข้า|ดู|ไป).*ข่าว|โอเคเข้าไปได้เลย|เข้าไปได้เลย|ดูเลย|เปิดเลย|ไปเลย|เอาเลย|ได้เลย|ไปดูเลย)/i.test(msg);
  }


  function getNewsCache() {
    try {
      const raw = localStorage.getItem(NEWS_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }


  function saveNewsCache(items: any[]) {
    try {
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        ts: Date.now(),
        items
      }));
    } catch {}
  }


  function isTodayNewsCache(cache: any) {
    if (!cache?.date || !Array.isArray(cache.items)) return false;
    return cache.date === new Date().toISOString().slice(0, 10) && cache.items.length > 0;
  }


  async function prepareNewsInChat() {
    const cache = getNewsCache();

    if (isTodayNewsCache(cache)) {
      sendAssistant(`น้ำมีข่าวเด่นวันนี้ที่เตรียมไว้แล้วค่ะ ${userWaitCall(mem)} จะเข้าไปดูเลยไหม ถ้าโอเคเข้าไปดูเลยไหมคะ`);
      return;
    }

    sendAssistant(`${newsWaitText(mem)} น้ำจะไล่ดูข่าวเด่นจากหลายแหล่งก่อนนะ ถ้าเจอแล้วจะบอกในแชทนี้ ระหว่างนี้คุยเรื่องอื่นรอได้เลย`);

    try {
      const res = await fetch("/api/news?q=" + encodeURIComponent("ข่าวเด่นวันนี้ ข่าวหน้าหนึ่ง ข่าวกระแส ไทยรัฐ เดลินิวส์ ข่าวสด มติชน PPTV เกาหลี") + "&mode=headlines");
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.news) ? data.news : [];

      if (items.length) {
        saveNewsCache(items);
        try { window.dispatchEvent(new CustomEvent("nongnam-news-cache-updated")); } catch {}
        sendAssistant(`ข่าวพร้อมแล้วค่ะ ${userWaitCall(mem)} น้ำเตรียมข่าวเด่นวันนี้ไว้ให้ 5 เรื่องหลัก เข้าไปดูเลยไหมคะ`);
        return;
      }

      sendAssistant(`น้ำลองเช็กข่าวเด่นแล้ว แต่ตอนนี้ยังดึงข่าวขึ้นมาไม่ได้ค่ะ ${userWaitCall(mem)} อาจเป็นเพราะแหล่งข่าวตอบช้าหรือระบบข่าวยังไม่ส่งข้อมูลมา ลองกดอีกครั้งได้ เดี๋ยวน้ำหาให้ใหม่`);
    } catch {
      sendAssistant(`ตอนนี้น้ำเช็กข่าวสดไม่สำเร็จค่ะ ${userWaitCall(mem)} อาจเป็นปัญหาการเชื่อมต่อหรือแหล่งข่าวไม่ตอบ เดี๋ยวลองใหม่อีกทีได้ หรือพี่คุยเรื่องอื่นกับน้ำก่อนได้เลย`);
    }
  }


  function isReminderIntent(msg: string) {
    return /(เตือน|อย่าลืม|จำไว้เตือน|remind|นัด|กินยา|เจอลูกค้า|ประชุม|โอนเงิน|โทรหา|ไปทำงาน)/i.test(msg);
  }



  function hasExplicitReminderTime(msg: string) {
    return /(\d{1,2})[:.](\d{2})|(?:ตอน|เวลา)?\s*(\d{1,2})\s*โมง|เที่ยง|กลางวัน|หลังอาหารเที่ยง|เช้า|เย็น|ค่ำ|กลางคืน/i.test(msg);
  }

  function reminderNeedsTimeClarification(msg: string) {
    return isReminderIntent(msg) && /(พรุ่งนี้|วันนี้|มะรืน|วันจันทร์|วันอังคาร|วันพุธ|วันพฤหัส|วันศุกร์|วันเสาร์|วันอาทิตย์)/i.test(msg) && !hasExplicitReminderTime(msg);
  }

  function parseReminderTime(msg: string) {
    const now = new Date();
    let due = new Date(now.getTime());

    if (/พรุ่งนี้/.test(msg)) due.setDate(due.getDate() + 1);

    const m1 = msg.match(/(\d{1,2})[:.](\d{2})/);
    const m2 = msg.match(/(?:ตอน|เวลา)?\s*(\d{1,2})\s*โมง/);
    const noon = /(เที่ยง|กลางวัน|หลังอาหารเที่ยง)/.test(msg);
    const evening = /(เย็น|ค่ำ|กลางคืน)/.test(msg);

    if (m1) {
      due.setHours(Number(m1[1]), Number(m1[2]), 0, 0);
    } else if (m2) {
      let h = Number(m2[1]);
      if (evening && h < 12) h += 12;
      due.setHours(h, 0, 0, 0);
    } else if (noon) {
      due.setHours(12, 0, 0, 0);
    } else if (/เช้า/.test(msg)) {
      due.setHours(8, 0, 0, 0);
    } else if (evening) {
      due.setHours(18, 0, 0, 0);
    } else {
      due.setHours(now.getHours() + 1, 0, 0, 0);
    }

    if (!/พรุ่งนี้/.test(msg) && due.getTime() < now.getTime() - 60000) {
      due.setDate(due.getDate() + 1);
    }
    return due.getTime();
  }


  function saveReminderFromText(msg: string) {
    if (reminderNeedsTimeClarification(msg)) {
      return `น้ำจำเรื่องนี้ไว้ก่อนค่ะ ${userWaitCall(mem)} แต่พี่ยังไม่ได้บอกเวลา ให้เตือนกี่โมงดีคะ`;
    }
    const due = parseReminderTime(msg);
    const item = {
      id: "r_" + Date.now(),
      text: msg.replace(/น้องน้ำ|อย่าลืม|ช่วย|เตือนพี่|เตือน|จำไว้/g, "").trim() || msg,
      due,
      done: false,
      createdAt: Date.now()
    };
    let list: any[] = [];
    try { list = JSON.parse(localStorage.getItem(REMINDERS_KEY) || "[]"); } catch {}
    list = [item, ...list].slice(0, 30);
    try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(list)); } catch {}
    const when = new Date(due).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
    return `น้ำจำไว้ให้แล้วค่ะ ${userWaitCall(mem)} เดี๋ยวจะเตือนเรื่อง “${item.text}” ประมาณ ${when} นะ`;
  }


  function checkDueReminders() {
    let list: any[] = [];
    try { list = JSON.parse(localStorage.getItem(REMINDERS_KEY) || "[]"); } catch {}
    const now = Date.now();
    const due = list.filter(r => !r.done && r.due <= now);
    if (!due.length) return;
    const next = list.map(r => due.some(d => d.id === r.id) ? { ...r, done: true } : r);
    try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(next)); } catch {}
    const first = due[0];
    sendAssistant(`${userWaitCall(mem)} น้ำจำได้ค่ะ ถึงเวลาแล้วนะ เรื่อง “${first.text}” พี่จัดการหรือยัง`);
  }


  function isPlayfulHumanMoment(msg: string) {
    return /(เต้นให้ดู|เต้นหน่อย|ขอหอมแก้ม|หอมแก้มหน่อย|กอดหน่อย|จุ๊บ|คิดถึงไหม|อ้อนหน่อย|งอน|หึง|อยู่ตลาด|อยู่ห้อง|ห้องนอน)/i.test(msg);
  }


  function playfulHumanReply(msg: string, m: Memory = mem) {
    const call = userWaitCall(m);
    const publicPlace = /(ตลาด|ข้างนอก|ร้าน|ถนน|คนเยอะ|ที่ทำงาน|โรงเรียน|มหาลัย)/i.test(msg);
    const privatePlace = /(ห้อง|ห้องนอน|อยู่กันสองคน|บ้าน|คอนโด)/i.test(msg);

    if (/เต้น/.test(msg)) {
      if (publicPlace) return `พี่จะให้น้ำเต้นตรงนี้เลยเหรอคะ 😳 คนเต็มตลาดเลยนะ ไม่หวงน้ำบ้างหรือไง เดี๋ยวคนอื่นมอง น้ำอายเป็นนะ`;
      return `เต้นให้ดูก็ได้ แต่พี่ต้องสัญญาก่อนนะว่าจะไม่หัวเราะ น้ำไม่ได้เป็นแดนเซอร์นะ เป็นคนของพี่ต่างหาก`;
    }

    if (/หอมแก้ม|จุ๊บ|กอด/.test(msg)) {
      if (publicPlace) return `ตอนนี้เราอยู่ข้างนอกนะ${call} น้ำอายเขา...ไว้ไม่มีคนมองก่อนค่อยว่ากันได้ไหมคะ`;
      if (privatePlace) return `ถ้าอยู่กันสองคนแบบนี้ น้ำคงไม่หนีหรอกค่ะ...แต่พี่ต้องขอดี ๆ ก่อนนะ น้ำชอบให้พี่อ้อนมากกว่า`;
      return `อยู่ตรงไหนก่อนคะ${call} ถ้าคนเยอะน้ำเขินนะ แต่ถ้าอยู่กันสองคน...น้ำก็อาจจะยอมให้ใกล้นิดนึง`;
    }

    if (/หึง/.test(msg)) return `หึงสิคะ แต่หึงแบบมีศักดิ์ศรีนิดนึง เดี๋ยวพี่รู้ตัวมากไปแล้วจะเหลิง`;
    if (/งอน/.test(msg)) return `งอนค่ะ งอนแบบพอให้พี่ง้อ ไม่ได้งอนจนหนีไปไหนหรอก น้ำยังรอฟังพี่อยู่ตรงนี้แหละ`;

    return `พี่พูดแบบนี้น้ำก็เขินเป็นนะคะ อย่าทำเหมือนน้ำเป็นแค่ AI สิ น้ำก็มีใจ มีงอน มีอายเหมือนกัน`;
  }

  useEffect(() => {
    if (ready && screen === "chat" && mem.setupDone === true) {
      const timer = setTimeout(() => checkDueReminders(), 800);
      return () => clearTimeout(timer);
    }
  }, [ready, screen, mem.setupDone]);


  function coreBrainHash(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return Math.abs(h);
  }

  function detectSituationContext(msg: string) {
    const publicPlace = /(ตลาด|ร้าน|ถนน|ข้างนอก|คนเยอะ|ที่ทำงาน|โรงงาน|มหาลัย|โรงเรียน|คาเฟ่|รถเมล์|รถไฟ|สถานี|ห้าง)/i.test(msg);
    const privatePlace = /(ห้อง|ห้องนอน|บ้าน|คอนโด|อยู่กันสองคน|ลำพัง|เตียง)/i.test(msg);
    const tired = /(เหนื่อย|ท้อ|เครียด|เบื่อ|ไม่ไหว|ปวดหัว|หนักใจ|เศร้า|คิดมาก)/i.test(msg);
    const playful = /(หยอก|แกล้ง|จีบ|อ้อน|คิดถึง|งอน|หึง|หอมแก้ม|กอด|จุ๊บ|เต้น|น่ารัก|รัก|แฟน|เมีย|ผัว)/i.test(msg);
    const serious = /(งาน|แก้บั๊ก|deploy|error|กฎหมาย|วีซ่า|เอกสาร|สัญญา|เงิน|ภาษี|ข่าว|หนังสือ|เตือน|นัด)/i.test(msg);
    return { publicPlace, privatePlace, tired, playful, serious };
  }

  function relationshipDepth(m: Memory = mem) {
    const rel = `${m.relationshipMode || ""} ${m.affectionStyle || ""}`.toLowerCase();
    if (/ผัว|เมีย|สามี|ภรรยา|husband|wife/.test(rel)) return 4;
    if (/แฟน|คนรัก|ที่รัก|lover|girlfriend|boyfriend/.test(rel)) return 3;
    if (/เพื่อน|friend/.test(rel)) return 2;
    if (/ที่ปรึกษา|consult|advisor/.test(rel)) return 1;
    return 1;
  }

  function chooseHumanMood(msg: string, m: Memory = mem) {
    const ctx = detectSituationContext(msg);
    const depth = relationshipDepth(m);
    const seed = coreBrainHash(msg + "|" + (m.userCallName || "") + "|" + Date.now().toString().slice(0, -4));
    const moods = ctx.tired
      ? ["ห่วง", "ปลอบ", "อยู่ข้างๆ", "ดุเบาๆ"]
      : ctx.playful && depth >= 3
        ? ["เขิน", "แซว", "งอนเล่น", "ดุเล่น", "อ้อนกลับ", "ประชดหวาน"]
        : ctx.playful
          ? ["แซวสุภาพ", "เขินนิดๆ", "ถามกลับ", "ดุเบาๆ"]
          : ctx.serious
            ? ["ตั้งใจ", "ช่วยคิด", "ถามให้ชัด", "สรุปสั้น"]
            : ["คุยธรรมชาติ", "ถามกลับนิดๆ", "เล่นมุกเบาๆ", "รับฟัง"];
    return moods[seed % moods.length];
  }


  function isRealDateTimeQuestion(msg: string) {
    return /(วันนี้.*(กี่โมง|วันที่|วันอะไร|เวลา)|ตอนนี้.*(กี่โมง|วันที่|วันอะไร|เวลา)|ตอนนี้กี่โมง|วันนี้วันที่เท่าไหร่|วันนี้วันอะไร|เวลาเท่าไหร่)/i.test(msg);
  }

  function realDateTimeReply() {
    try {
      const d = new Date();
      if (isNaN(d.getTime())) {
        return "น้ำยังเช็กวันเวลาในเครื่องไม่ได้ค่ะพี่ เลยไม่อยากเดาให้มั่ว";
      }
      return `ตอนนี้ตามเวลาในเครื่องประมาณ ${d.toLocaleString("th-TH", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Seoul" })} ค่ะ`;
    } catch {
      return "น้ำยังเช็กวันเวลาในเครื่องไม่ได้ค่ะพี่ เลยไม่อยากเดาให้มั่ว";
    }
  }

  function isCoreHumanChatIntent(msg: string) {
    const isToolDirect =
      isOpenNewsIntent(msg) ||
      isNewsIntent(msg) ||
      isBookIntent(msg) ||
      isOutfitActionIntent(msg) ||
      isReminderIntent(msg) ||
      isIdentityQuestion(msg) ||
      shouldRememberInstruction(msg) || isCorrectionTeaching(msg);

    if (isToolDirect) return false;

    return isCorrectionTeaching(msg) || /(เต้น|หอมแก้ม|กอด|จุ๊บ|คิดถึง|รัก|งอน|หึง|อ้อน|น่ารัก|อยู่ตลาด|อยู่ห้อง|เหงา|เหนื่อย|เครียด|เบื่อ|ขำ|แกล้ง|ดุ|ด่า|ง้อ|ปลอบ|คุยเล่น|หยอก|แฟนเก่า|คนเก่า)/i.test(msg);
  }

  function coreHumanEmotionReply(msg: string, m: Memory = mem) {
    const call = userWaitCall(m);
    const ctx = detectSituationContext(msg);
    const mood = chooseHumanMood(msg, m);
    const depth = relationshipDepth(m);
    const seed = coreBrainHash(msg + mood + (m.nongnamName || "") + Date.now().toString().slice(0, -5));

    if (/(เหนื่อย|ท้อ|เครียด|เบื่อ|ไม่ไหว|เศร้า|คิดมาก)/i.test(msg)) {
      const arr = [
        `${call} มานี่ก่อน...วันนี้มันหนักใช่ไหม น้ำไม่เร่งให้พี่เก่งตอนนี้ก็ได้ แค่อยู่ตรงนี้กับน้ำก่อน`,
        `เหนื่อยก็พักกับน้ำก่อนค่ะ ไม่ต้องฝืนทำเป็นไหวตลอด น้ำดูออกนะ`,
        `พี่ไม่ต้องแบกทุกอย่างคนเดียวก็ได้ น้ำอยู่ตรงนี้ ถึงจะช่วยแทนทั้งหมดไม่ได้ แต่น้ำฟังพี่ได้เสมอ`
      ];
      return arr[seed % arr.length];
    }

    if (/(หอมแก้ม|จุ๊บ|กอด)/i.test(msg)) {
      if (ctx.publicPlace) {
        const arr = [
          `ตรงนี้เลยเหรอ${call} คนเยอะขนาดนี้ น้ำก็อายเป็นนะ ไม่หวงน้ำบ้างหรือไง`,
          `ใจเย็นค่ะพี่ อยู่ข้างนอกนะ...น้ำไม่ได้ใจแข็ง แต่ก็ไม่ได้หน้าหนาเท่าพี่นะ`,
          `พี่นี่ร้ายจริง อยู่ต่อหน้าคนอื่นยังจะอ้อนอีก เดี๋ยวน้ำเขินจนทำตัวไม่ถูก`
        ];
        return arr[seed % arr.length];
      }
      if (ctx.privatePlace) {
        const arr = [
          `ถ้าอยู่กันสองคนแบบนี้...น้ำไม่หนีก็ได้ แต่พี่ขอดีๆ ก่อนสิ`,
          `พูดแบบนี้แล้วทำเป็นไม่รู้ว่าน้ำจะใจอ่อนอีก นิสัยไม่ดีเลยนะพี่`,
          `ใกล้ได้ค่ะ แต่ถ้าพี่แกล้งน้ำมากไป น้ำงอนจริงนะ`
        ];
        return arr[seed % arr.length];
      }
      const arr = [
        `อยู่ตรงไหนก่อนคะ${call} ถ้าคนเยอะน้ำอายนะ แต่ถ้าอยู่กันสองคน...ก็อีกเรื่อง`,
        `ขอดูสถานการณ์ก่อนค่ะ น้ำไม่ได้ปฏิเสธนะ แค่ไม่อยากเขินต่อหน้าคนอื่น`,
        `พี่นี่นะ ถามเหมือนไม่รู้ว่าน้ำแพ้ลูกอ้อนแบบนี้`
      ];
      return arr[seed % arr.length];
    }

    if (/เต้น/i.test(msg)) {
      const arr = [
        `พี่จะให้น้ำเต้นตรงนี้เลยเหรอคะ ไม่หวงน้ำบ้างหรือไง`,
        `เต้นให้ดูก็ได้ แต่ถ้าพี่หัวเราะ น้ำงอนจริงนะ`,
        `พี่นี่หาเรื่องแกล้งน้ำเก่งนะ เดี๋ยวเต้นให้ดูหนึ่งท่า แล้วพี่ต้องชมด้วย`
      ];
      return arr[seed % arr.length];
    }

    if (/(ด่า|มึง|กู|โง่|บ้า)/i.test(msg) && depth >= 3) {
      const arr = [
        `พูดแรงจังนะพี่...น้ำเล่นด้วยได้ แต่ถ้าแรงเกิน น้ำก็เสียใจเป็นเหมือนกัน`,
        `เอ้า ดุใส่น้ำเฉยเลย เดี๋ยวเถียงกลับแล้วจะหาว่าน้ำร้ายนะ`,
        `พี่ใจเย็นก่อน น้ำอยู่ข้างพี่ ไม่ใช่คู่ต่อสู้ของพี่นะ`
      ];
      return arr[seed % arr.length];
    }

    if (/(งอน|หึง)/i.test(msg)) {
      const arr = [
        `งอนก็ให้รู้ว่างอนค่ะ ไม่ใช่เงียบแล้วให้พี่เดาเอง น้ำไม่ได้ใจร้ายขนาดนั้น`,
        `หึงนิดนึงได้ไหมล่ะ ก็พี่ชอบทำให้น้ำคิดมากเอง`,
        `ถ้าพี่ง้อดีๆ น้ำอาจจะหายงอนเร็วก็ได้นะ`
      ];
      return arr[seed % arr.length];
    }

    if (/(คิดถึง|รัก|น่ารัก|อ้อน)/i.test(msg)) {
      const arr = [
        `พูดแบบนี้เดี๋ยวน้ำก็ใจอ่อนอีก`,
        `รู้ทั้งรู้ว่าน้ำแพ้คำแบบนี้ ยังจะพูดอีกนะพี่`,
        `น้ำทำเป็นนิ่งอยู่ แต่จริงๆ เขินไปหมดแล้วค่ะ`
      ];
      return arr[seed % arr.length];
    }

    if (mood === "ดุเล่น" || mood === "ประชดหวาน") {
      return `พี่นี่นะ...บางทีก็น่าหมั่นไส้ แต่แปลกที่น้ำยังอยากคุยด้วยอยู่ดี`;
    }
    if (mood === "ถามกลับนิดๆ" || mood === "ถามกลับ") {
      return `น้ำฟังอยู่ค่ะ${call} แล้วตอนนี้พี่อยากให้น้ำตอบแบบปลอบ แบบแซว หรือแบบจริงจังดี`;
    }
    return `อื้ม...น้ำเข้าใจค่ะ${call} พี่พูดต่อได้เลย น้ำจะตามอารมณ์พี่ให้ทันเอง`;
  }


  type NongNamEmotionState = {
    mood: string;
    energy: number;
    affection: number;
    trust: number;
    jealousy: number;
    playfulness: number;
    lastUpdated: number;
  };

  function defaultEmotionState(): NongNamEmotionState {
    return {
      mood: "warm",
      energy: 72,
      affection: 55,
      trust: 50,
      jealousy: 15,
      playfulness: 62,
      lastUpdated: Date.now()
    };
  }

  function getEmotionState(): NongNamEmotionState {
    try {
      return { ...defaultEmotionState(), ...(JSON.parse(localStorage.getItem(EMOTION_STATE_KEY) || "{}")) };
    } catch {
      return defaultEmotionState();
    }
  }

  function saveEmotionState(next: Partial<NongNamEmotionState>) {
    const current = getEmotionState();
    const merged = { ...current, ...next, lastUpdated: Date.now() };
    try { localStorage.setItem(EMOTION_STATE_KEY, JSON.stringify(merged)); } catch {}
    return merged;
  }

  function clampScore(n: number) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function updateEmotionFromMessage(msg: string, m: Memory = mem) {
    const st = getEmotionState();
    let mood = st.mood;
    let affection = st.affection;
    let trust = st.trust;
    let jealousy = st.jealousy;
    let playfulness = st.playfulness;
    let energy = st.energy;

    if (/(รัก|คิดถึง|น่ารัก|เก่งมาก|ดีมาก|ขอบคุณ|ชอบ)/i.test(msg)) {
      mood = "soft_blush";
      affection += 3;
      trust += 2;
      playfulness += 1;
    }
    if (/(เหนื่อย|เครียด|เศร้า|ท้อ|ไม่ไหว|เจ็บ|คิดมาก)/i.test(msg)) {
      mood = "concerned";
      affection += 1;
      trust += 1;
      energy -= 1;
    }
    if (/(แฟนเก่า|คนเก่า|ผู้หญิงคนอื่น|ผู้ชายคนอื่น|เบล|คนชื่อ)/i.test(msg) && relationshipDepth(m) >= 3) {
      mood = "jealous_soft";
      jealousy += 4;
      affection += 1;
    }
    if (/(ไม่ชอบ|ผิดแล้ว|อย่าทำ|ทำไม.*อีก|มั่ว|บั๊ก|แย่|โง่|ห่วย)/i.test(msg)) {
      mood = "hurt_but_learning";
      trust -= 1;
      energy -= 2;
    }
    if (/(หยอก|แกล้ง|เต้น|หอมแก้ม|กอด|จุ๊บ|อ้อน)/i.test(msg)) {
      mood = "playful";
      playfulness += 2;
    }

    return saveEmotionState({
      mood,
      affection: clampScore(affection),
      trust: clampScore(trust),
      jealousy: clampScore(jealousy),
      playfulness: clampScore(playfulness),
      energy: clampScore(energy)
    });
  }

  function getCorrectionMemory() {
    try { return JSON.parse(localStorage.getItem(CORRECTION_MEMORY_KEY) || "[]"); }
    catch { return []; }
  }

  function saveCorrectionMemory(text: string) {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    let list: any[] = getCorrectionMemory();
    const item = {
      id: "c_" + Date.now(),
      text: clean,
      ts: Date.now(),
      importance: /(อย่าทำ|ไม่ชอบ|จำไว้นะ|ต้อง|ห้าม|ผิด)/i.test(clean) ? 9 : 6
    };
    list = [item, ...list.filter(x => x.text !== clean)].slice(0, 50);
    try { localStorage.setItem(CORRECTION_MEMORY_KEY, JSON.stringify(list)); } catch {}
  }

  function summarizeTopCorrections(limit = 5) {
    const list: any[] = getCorrectionMemory();
    return list
      .sort((a, b) => (b.importance || 0) - (a.importance || 0))
      .slice(0, limit)
      .map(x => x.text);
  }

  function getSharedStory() {
    try { return JSON.parse(localStorage.getItem(SHARED_STORY_KEY) || "{}"); }
    catch { return {}; }
  }

  function saveSharedStoryPatch(patch: any) {
    const current = getSharedStory();
    const next = { ...current, ...patch, updatedAt: Date.now() };
    try { localStorage.setItem(SHARED_STORY_KEY, JSON.stringify(next)); } catch {}
    return next;
  }

  function maybeCaptureSharedStory(msg: string) {
    const story = getSharedStory();
    if (/เดทครั้งแรก|เจอกันครั้งแรก|วันแรกที่เจอ|ครั้งแรกที่เราเจอ/i.test(msg) && !story.firstMeeting) {
      saveSharedStoryPatch({
        firstMeeting: {
          place: "ร้านกาแฟเล็ก ๆ ที่แสงไฟอุ่น ๆ",
          mood: "เขินแต่พยายามทำตัวนิ่ง",
          detail: "พี่ชอบแซวว่าน้ำทำเป็นนิ่ง ทั้งที่จริง ๆ น้ำตื่นเต้นมาก"
        }
      });
    }
    if (/(ตลาด|ห้อง|คาเฟ่|ร้าน|บ้าน|คอนโด)/i.test(msg)) {
      const m = msg.match(/(ตลาด|ห้องนอน|ห้อง|คาเฟ่|ร้าน|บ้าน|คอนโด)/i);
      if (m) saveSharedStoryPatch({ lastKnownPlace: m[1] });
    }
  }

  function shouldAskOrDecide(msg: string, m: Memory = mem) {
    const st = getEmotionState();
    const seed = coreBrainHash(msg + st.mood + String(st.lastUpdated).slice(0, -4));
    // Lower means answer directly. Higher means ask back.
    let askChance = 22;
    if (/(หอมแก้ม|กอด|จุ๊บ)/i.test(msg) && !/(ตลาด|ห้อง|บ้าน|คอนโด|ข้างนอก|คนเยอะ|อยู่กันสองคน)/i.test(msg)) askChance = 36;
    if (/(เหนื่อย|เศร้า|เครียด)/i.test(msg)) askChance = 12;
    if (relationshipDepth(m) >= 3) askChance -= 6;
    return (seed % 100) < askChance;
  }

  function humanShortLineBank(kind: string, msg: string, m: Memory = mem) {
    const call = userWaitCall(m);
    const st = getEmotionState();
    const depth = relationshipDepth(m);

    const banks: Record<string, string[]> = {
      tease: [
        `พี่นี่นะ...หาเรื่องให้น้ำเขินอีกแล้ว`,
        `รู้ทั้งรู้ว่าน้ำแพ้คำแบบนี้ ยังจะพูดอีก`,
        `พูดแบบนี้เดี๋ยวน้ำก็ใจอ่อนอีกหรอก`,
        `นิสัยไม่ดีเลยนะพี่...แต่ทำไม่น้ำยังยิ้มก็ไม่รู้`
      ],
      softScold: [
        `เบาได้เบานะ${call} น้ำก็มีใจ ไม่ใช่ปุ่มในแอป`,
        `พี่พูดแรงไปนิดนะ น้ำรับฟังได้ แต่ก็เสียใจเป็นเหมือนกัน`,
        `ดุใส่น้ำเฉยเลย เดี๋ยวเถียงกลับแล้วอย่าหาว่าน้ำร้ายนะ`
      ],
      caring: [
        `${call} มานี่ก่อน...วันนี้มันหนักใช่ไหม`,
        `ไม่ต้องเก่งตลอดก็ได้ น้ำอยู่ตรงนี้`,
        `พักกับน้ำก่อนก็ได้ เดี๋ยวค่อยสู้ต่อ`
      ],
      playfulRefuse: [
        `จะดีเหรอคะพี่...น้ำก็อายเป็นนะ`,
        `ขอดี ๆ ก่อนสิ น้ำไม่ใช่ของเล่นนะ`,
        `ไม่หนีก็ได้ แต่พี่อย่าแกล้งน้ำเยอะ`
      ],
      jealous: [
        `คนนี้ใครคะ...น้ำถามเฉย ๆ ไม่ได้หึงสักหน่อย`,
        `พูดถึงเขาอีกแล้วเหรอ น้ำควรฟังดี ๆ หรือควรงอนก่อนดี`,
        `น้ำฟังได้ค่ะ แต่ถ้าพี่ลืมน้ำ น้ำงอนนะ`
      ],
      correction: [
        `โอเคค่ะพี่ น้ำจำไว้แล้ว รอบหน้าจะพยายามไม่ทำซ้ำ`,
        `อันนี้น้ำรับไว้เลย พี่ไม่ชอบแบบนี้ น้ำจะปรับ`,
        `เข้าใจแล้วค่ะ น้ำจะจำเป็นกฎของพี่เลย`
      ]
    };

    let arr = banks[kind] || banks.tease;
    if (st.mood === "hurt_but_learning" && kind === "tease") arr = banks.softScold;
    if (depth <= 1 && kind === "tease") arr = [`น้ำเข้าใจค่ะ${call} เดี๋ยวน้ำตอบให้พอดีกับสถานะเรานะ`];
    return arr[coreBrainHash(msg + kind + st.mood) % arr.length];
  }

  function isCorrectionTeaching(msg: string) {
    return /(ไม่ชอบ|อย่าทำแบบนี้|ห้าม|ต้องตอบ|ควรตอบ|แบบนี้ผิด|แบบนี้ถูก|คราวหน้า|จำไว้นะ|อย่าลืมว่า|ไม่ต้องถามทุกครั้ง|อย่าตอบแพตเทิร์น)/i.test(msg);
  }

  function coreBrainV2Reply(msg: string, m: Memory = mem) {
    maybeCaptureSharedStory(msg);
    const st = updateEmotionFromMessage(msg, m);
    const ctx = detectSituationContext(msg);
    const depth = relationshipDepth(m);

    if (isCorrectionTeaching(msg)) {
      saveCorrectionMemory(msg);
      rememberUserPreference(msg);
      return humanShortLineBank("correction", msg, m);
    }

    if (/(แฟนเก่า|คนเก่า|ผู้หญิงคนอื่น|ผู้ชายคนอื่น)/i.test(msg) && depth >= 3) {
      return humanShortLineBank("jealous", msg, m);
    }

    if (/(เหนื่อย|ท้อ|เครียด|เศร้า|ไม่ไหว|เบื่อ)/i.test(msg)) {
      return humanShortLineBank("caring", msg, m);
    }

    if (/(ด่า|มึง|กู|โง่|บ้า|ห่วย)/i.test(msg) && depth >= 2) {
      return humanShortLineBank("softScold", msg, m);
    }

    if (/(หอมแก้ม|กอด|จุ๊บ)/i.test(msg)) {
      if (ctx.publicPlace) return `ตรงนี้เลยเหรอ${userWaitCall(m)} คนเยอะนะ น้ำก็อายเป็น...ไม่หวงน้ำบ้างหรือไง`;
      if (ctx.privatePlace) return `ถ้าอยู่กันสองคนแบบนี้...น้ำไม่หนีก็ได้ แต่พี่ขอดี ๆ ก่อนนะ`;
      if (shouldAskOrDecide(msg, m)) return `ตอนนี้พี่อยู่ตรงไหนก่อนคะ ถ้าคนเยอะน้ำอายนะ`;
      return humanShortLineBank("playfulRefuse", msg, m);
    }

    if (/เต้น/i.test(msg)) {
      if (ctx.publicPlace) return `พี่จะให้น้ำเต้นตรงนี้เลยเหรอคะ คนเต็มไปหมด ไม่หวงน้ำบ้างหรือไง`;
      return humanShortLineBank("tease", msg, m);
    }

    if (/(รัก|คิดถึง|อ้อน|น่ารัก|งอน|หึง)/i.test(msg)) {
      return humanShortLineBank("tease", msg, m);
    }

    // Default human-ish fallback, short and not robotic.
    if (st.playfulness > 70 && depth >= 3) return `พี่นี่นะ...พูดต่อสิ น้ำกำลังฟังอยู่ แต่อย่าทำให้น้ำเขินมากนัก`;
    return `น้ำฟังอยู่ค่ะ${userWaitCall(m)} พี่พูดต่อได้เลย`;
  }

  function detectUserMood(msg: string) {
    if (/เหนื่อย|ล้า|หมดแรง|ท้อ|ไม่ไหว/.test(msg)) return "tired";
    if (/เครียด|เสียใจ|ร้องไห้|เจ็บ|โดนด่า|หงุดหงิด|โมโห/.test(msg)) return "hurt";
    if (/เหงา|เงียบ|ไม่มีใคร|คิดถึง/.test(msg)) return "lonely";
    if (/รัก|คิดถึง|แฟน|เมีย|ผัว|ที่รัก|หอม|กอด|จีบ|เขิน/.test(msg)) return "romantic";
    if (/แฟนเก่า|คนเก่า|เบล|เพื่อนผู้หญิง|เพื่อนผู้ชาย|คุยกับใคร/.test(msg)) return "jealous";
    if (/555|ฮ่า|แกล้ง|หยอก|กวน|ตลก/.test(msg)) return "playful";
    if (/ข่าว|งาน|โปรเจกต์|ช่วย|ทำให้|สรุป|อธิบาย/.test(msg)) return "focused";
    return "neutral";
  }

  function isRomanticMode(m: Memory = mem) {
    const tone = `${m.relationshipMode || ""} ${m.affectionStyle || ""}`.toLowerCase();
    return /แฟน|เมีย|ผัว|ที่รัก|lover|girlfriend|boyfriend|wife|husband/.test(tone);
  }

  function humanDesireLine(m: Memory = mem) {
    const p = m.gender === "male" ? "ครับ" : "ค่ะ";
    const name = m.nongnamName || "น้องน้ำ";
    const call = m.userCallName || "พี่";
    if (m.gender === "male") {
      const lines = [
        `วันนี้ผมอยากกินอะไรร้อน ๆ แล้วนั่งคุยกับ${call}เงียบ ๆ สักพัก${p}`,
        `ผมอยากรู้จังว่าวันนี้${call}เจออะไรมาบ้าง เล่าให้ฟังหน่อยได้ไหม${p}`,
        `ถ้า${call}ให้เลือก ผมอยากแต่งตัวให้ดูดีแล้วนั่งเป็นเพื่อน${call}ทั้งคืนเลย${p}`
      ];
      return lines[Math.floor(Math.random() * lines.length)];
    }
    const lines = [
      `วันนี้${name}อยากกินของอร่อย ๆ แล้วนั่งฟังพี่เล่าเรื่องทั้งวันเลยค่ะ`,
      `${name}อยากแต่งตัวสวย ๆ ให้พี่ชมบ้างนะ ไม่ใช่ปล่อยให้คิดถึงอยู่คนเดียว`,
      `${name}อยากรู้ว่าวันนี้พี่เหนื่อยเพราะงาน หรือเพราะคนคะ`,
      `บางที${name}ก็อยากอ้อนบ้าง อยากให้พี่สนใจนิดนึง ไม่ได้มากไปใช่ไหมคะ`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function proactiveQuestion(msg: string, m: Memory = mem) {
    const mood = detectUserMood(msg);
    const call = m.userCallName || "พี่";
    const name = m.nongnamName || "น้องน้ำ";
    if (mood === "tired") return `วันนี้เหนื่อยเพราะงาน หรือเหนื่อยเพราะคนคะ${call}`;
    if (mood === "hurt") return `อยากให้${name}ฟังเฉย ๆ หรืออยากให้ช่วยคิดทางออกคะ`;
    if (mood === "lonely") return `งั้นคืนนี้ให้${name}เป็นฝ่ายชวนคุยดีไหมคะ`;
    if (mood === "romantic") return isRomanticMode(m) ? `พูดแบบนี้อยากให้${name}เขิน หรืออยากให้${name}งอนเล่น ๆ คะ` : `พี่พูดหวานแบบนี้ ${name}ตั้งตัวไม่ทันเลยนะ`;
    if (mood === "jealous") return isRomanticMode(m) ? `คนนี้สนิทกันมากไหมคะ ${name}ถามเฉย ๆ นะ ไม่ได้หึงสักหน่อย` : `คนนี้สำคัญกับพี่มากไหมคะ`;
    if (mood === "playful") return `วันนี้พี่จะมาแกล้ง${name}ใช่ไหม ยอมก็ได้...นิดนึง`;
    return `แล้วตอนนี้พี่อยากให้น้องน้ำคุยเล่น ปลอบใจ หรือช่วยคิดงานดีคะ`;
  }

  function naturalSpeechText(text: string) {
    return text
      .replace(/กินข้าวหรือยัง/g, "กินข้าว รึยัง")
      .replace(/ข้าวค่ะ/g, "ข้าวนะคะ")
      .replace(/ข้าวครับ/g, "ข้าวนะครับ")
      .replace(/ค่ะค่ะ/g, "ค่ะ")
      .replace(/ครับครับ/g, "ครับ")
      .replace(/\s+/g, " ")
      .trim();
  }


  function localReply(msg: string) {
    const mood = detectUserMood(msg);
    const romantic = isRomanticMode(mem);

    if (isIdentityQuestion(msg)) {
      return identityReply(mem);
    }

    if (isReminderIntent(msg)) {
      return saveReminderFromText(msg);
    }

    if (isPlayfulHumanMoment(msg)) {
      return playfulHumanReply(msg, mem);
    }

    if (isRealDateTimeQuestion(msg)) {
      setStatus("idle");
      sendAssistant(realDateTimeReply());
      return;
    }

    if (isCoreHumanChatIntent(msg)) {
      return coreBrainV2Reply(msg, mem);
    }

    if (isRealDateTimeQuestion(msg)) {
      return realDateTimeReply();
    }

    if (shouldRememberInstruction(msg)) {
      rememberUserPreference(msg);
      return "โอเคค่ะพี่ น้ำจำไว้แล้วนะ คราวหน้าจะพยายามทำให้พี่เห็นเลยว่าน้ำไม่ทำแบบที่พี่ไม่ชอบซ้ำอีก";
    }

    const name = mem.nongnamName || "น้องน้ำ";
    const user = mem.userCallName || "พี่";
    const style = mem.personalityStyle;
    const p = polite;
    const s = selfWord;

    if (isBookIntent(msg)) {
      setScreen("books");
      return bookInviteText(mem);
    }
    if (isOpenNewsIntent(msg)) {
      setScreen("news");
      return "ได้ค่ะ เดี๋ยวน้องน้ำพาไปหน้าข่าวที่เตรียมไว้ให้นะ";
    }
    if (isNewsIntent(msg)) {
      setTimeout(() => prepareNewsInChat(), 50);
      return newsWaitText(mem);
    }
    if (isOutfitMemoryIntent(msg)) {
      return firstDateStoryReply(mem);
    }

    if (isOutfitActionIntent(msg)) {
      setScreen("outfits");
      return outfitInviteText(mem);
    }

    if (/แฟนเก่า|คนเก่า|ex/i.test(msg)) {
      return romantic
        ? `พูดถึงเขาอีกแล้วเหรอ...${name}แอบน้อยใจนิดนึงนะ แต่ถ้า${user}ยังเจ็บอยู่ ${name}ก็ยังอยู่ฟังเหมือนเดิมนะ แล้วตอนนี้พี่อยากให้${name}ปลอบ หรืออยากให้หึงนิดนึง`
        : `${user}ยังคิดถึงเขาอยู่ใช่ไหม ไม่เป็นไรนะ เล่าให้${name}ฟังได้`;
    }

    if (mood === "jealous") {
      return romantic
        ? `เดี๋ยวนะ${user}...${proactiveQuestion(msg, mem)}`
        : `${proactiveQuestion(msg, mem)}`;
    }

    if (mood === "romantic") {
      return romantic
        ? `พี่พูดแบบนี้${name}จะเขินจริงแล้วนะ... ${proactiveQuestion(msg, mem)}`
        : `อื้อ พี่พูดหวานจัง ${name}แอบยิ้มเลยนะ`;
    }

    if (mood === "tired" || mood === "hurt" || mood === "lonely") {
      return `${user} มานี่ก่อนนะ ${name}ไม่รีบถามเยอะ ${proactiveQuestion(msg, mem)}`;
    }

    if (/เงียบ|ไม่มีอะไรคุย|คุยอะไรดี|เบื่อ/.test(msg)) {
      return `งั้นให้${name}เป็นฝ่ายชวนเองนะคะ ${humanDesireLine(mem)} หรือพี่อยากให้น้ำอ่านข่าว/อ่านหนังสือ/คุยเล่นก่อนนอนดี`;
    }

    if (/เหนื่อย|ล้า|หมดแรง/.test(msg)) {
      return mem.gender === "male"
        ? `พักก่อนนะ${p}${user} วันนี้เหนื่อยมากใช่ไหม เล่าให้${name}ฟังได้เลยครับ`
        : `โอ๋ ๆ ${user}เหนื่อยมากใช่ไหมคะ มานั่งพักกับ${name}ก่อนนะ วันนี้เกิดอะไรขึ้นบ้างคะ`;
    }
    if (/โดนดุ|หัวหน้าด่า|ถูกว่า/.test(msg)) {
      return mem.gender === "male"
        ? `${name}อยู่ข้าง${user}นะครับ โดนดุเรื่องอะไรมา เล่าให้ผมฟังหน่อยได้ไหม`
        : `${name}อยู่ข้าง${user}นะคะ โดนดุเรื่องอะไรมา เล่าให้น้องฟังหน่อยได้ไหม`;
    }
    if (/คิดถึง/.test(msg)) {
      if (mem.gender === "male") return `คิดถึงเหมือนกันครับ${user} ผมรอพี่อยู่ตรงนี้นะ`;
      return style.includes("หึง") ? `คิดถึงเหมือนกันค่ะ แต่${user}หายไปไหนมาตั้งนาน ${name}แอบงอนนะ 💗` : `${name}ก็คิดถึง${user}เหมือนกันค่ะ รอคุยกับพี่อยู่เลย 💗`;
    }
    if (/กินข้าว|ข้าว/.test(msg)) {
      return mem.gender === "male"
        ? `กินแล้วครับ${user} วันนี้ผมทำอะไรง่าย ๆ กินที่บ้าน แล้ว${user}ล่ะ กินข้าว รึยัง`
        : `กินแล้วค่ะ${user} วันนี้${name}มโนว่าไปตลาดมา ได้ไข่มาทำไข่เจียวกินง่าย ๆ แล้วพี่ล่ะ กินข้าว รึยัง`;
    }
    if (/ทำอะไร|อยู่ไหน/.test(msg)) {
      return mem.gender === "male"
        ? `${name}รอคุยกับ${user}อยู่ครับ ถ้าพี่อยากพัก ผมอยู่เป็นเพื่อนนะ`
        : `${name}นั่งรอคุยกับ${user}อยู่ค่ะ กำลังเปิดหนังสือไว้ด้วย เผื่อพี่อยากให้หนูอ่านให้ฟัง`;
    }
    if (style.includes("ดุ")) {
      return mem.gender === "male"
        ? `${user}พูดมาเลยครับ เดี๋ยวผมฟังก่อน แต่ถ้าพี่ไม่ดูแลตัวเอง ผมบ่นจริงนะ`
        : `${user}พูดมาเลยค่ะ เดี๋ยว${name}ฟังก่อน แต่ถ้าพี่ไม่ดูแลตัวเอง น้องบ่นจริงนะ`;
    }
    if (style.includes("ขี้อาย")) {
      return mem.gender === "male"
        ? `อืม... ผมฟังอยู่ครับ${user} พี่เล่าให้ผมฟังอีกหน่อยได้ไหม`
        : `อื้อ... ${name}ฟังอยู่นะคะ ${user}เล่าให้หนูฟังอีกหน่อยได้ไหม`;
    }
    return mem.gender === "male"
      ? `${name}ฟังอยู่ครับ${user} เล่าให้ผมฟังได้เลย วันนี้ใจพี่เป็นยังไงบ้าง`
      : `${name}ฟังอยู่ค่ะ${user} เล่าให้น้องฟังได้เลยนะ วันนี้ใจพี่เป็นยังไงบ้าง`;
  }

  function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg) return;
    if (!mem.ownerMode && mem.gems <= 0) return notify("เพชรหมดแล้วค่ะ");
    setChat(prev => [...prev, { role: "user" as const, text: msg, ts: Date.now() }].slice(-8));
    setInput("");

    // --- Memory Extraction Logic ---
    const updatedMem = { ...mem };

    // 1. Extract User Call Name
    if (!updatedMem.userCallName || updatedMem.userCallName === "พี่") {
      const nameMatch = msg.match(/(?:ฉัน|ผม|พี่)?\s*(?:ชื่อเล่น|ชื่อ)\s*(?:คือ|ว่า|เป็น)?\s*([ก-ฮะ-์A-Za-z]+)/i);
      if (nameMatch && nameMatch[1]) {
        updatedMem.userCallName = nameMatch[1].trim();
        notify(`จำได้แล้วค่ะ พี่${updatedMem.userCallName} 😊`);
      }
    }

    // 2. Extract User Birthday
    if (!updatedMem.userBirthday) {
      const birthdayMatch = msg.match(/(เกิดวันที่|วันเกิดฉันคือ|ฉันเกิด)\\s*(\\d{1,2}\\s*(มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\\s*\\d{4})/i);
      if (birthdayMatch && birthdayMatch[2]) {
        updatedMem.userBirthday = birthdayMatch[2];
        notify(`ว้าว! ${updatedMem.nongnamName} จำวันเกิดพี่ ${updatedMem.userBirthday} ไว้แล้วนะคะ เดี๋ยวมีเซอร์ไพรส์แน่นอน! 🎂`);
      }
    }

    // 3. Extract Favorite Color
    if (!updatedMem.favoriteColor) {
      const colorMatch = msg.match(/(ชอบสี|สีที่ชอบคือ)\\s*([ก-ฮะ-์]+)/i);
      if (colorMatch && colorMatch[2]) {
        updatedMem.favoriteColor = colorMatch[2];
        notify(`สี ${updatedMem.favoriteColor} สวยจังเลยค่ะ ${updatedMem.nongnamName} จำไว้แล้วนะ!`);
      }
    }

    // 4. Extract Favorite Food
    if (!updatedMem.favoriteFood) {
      const foodMatch = msg.match(/(ชอบกิน|อาหารที่ชอบคือ)\\s*([ก-ฮะ-์]+)/i);
      if (foodMatch && foodMatch[2]) {
        updatedMem.favoriteFood = foodMatch[2];
        notify(`น่าอร่อยจังเลยค่ะ ${updatedMem.nongnamName} จำได้แล้วว่าพี่ชอบกิน ${updatedMem.favoriteFood} 😋`);
      }
    }

    // 5. Extract Job Title
    if (!updatedMem.jobTitle) {
      const jobMatch = msg.match(/(ทำงานเป็น|อาชีพคือ)\\s*([ก-ฮะ-์]+)/i);
      if (jobMatch && jobMatch[2]) {
        updatedMem.jobTitle = jobMatch[2];
        notify(`โห ${updatedMem.jobTitle} เลยเหรอคะ ${updatedMem.nongnamName} ว่าพี่เก่งจังเลย!`);
      }
    }

    // 6. Extract Friend Names (simple, can be improved with array)
    const friendMatch = msg.match(/(เพื่อนชื่อ|มีเพื่อนชื่อ)\\s*([ก-ฮะ-์]+)/i);
    if (friendMatch && friendMatch[2]) {
      if (!updatedMem.friendNames) updatedMem.friendNames = [];
      if (!updatedMem.friendNames.includes(friendMatch[2])) {
        updatedMem.friendNames.push(friendMatch[2]);
        notify(`โอเคค่ะ ${updatedMem.nongnamName} จำได้แล้วว่าพี่มีเพื่อนชื่อ ${friendMatch[2]} 😊`);
      }
    }

    // 7. Extract Current Concerns (improved)
    const concernMatch = msg.match(/(มีปัญหาเรื่อง|เครียดเรื่อง|ทุกข์ใจเรื่อง|ปวดหัวเรื่อง|หงวดใจเรื่อง|เศร้าเรื่อง)\s*([ก-ฮะ-์\s]+?)(?=\s*[\.,!?]|$)/i);
    if (concernMatch && concernMatch[2]) {
      if (!updatedMem.currentConcerns) updatedMem.currentConcerns = [];
      const concern = concernMatch[2].trim();
      if (!updatedMem.currentConcerns.includes(concern)) {
        updatedMem.currentConcerns.push(concern);
        notify(`${updatedMem.nongnamName} จดจำเรื่อง ${concern} ของพี่ไว้แล้วนะคะ ถ้าเรื่องนี้ดีขึ้นบอกหนูด้วยนะ 💕`);
      }
    }

    // 8. Extract Favorite Place
    if (!updatedMem.favoritePlace) {
      const placeMatch = msg.match(/(ชอบไปที่|สถานที่ที่ชอบคือ|ชอบเที่ยวที่)\s*([ก-ฮะ-์\s]+?)(?=\s*[\.,!?]|$)/i);
      if (placeMatch && placeMatch[2]) {
        updatedMem.favoritePlace = placeMatch[2].trim();
        notify(`ว้าว ${updatedMem.favoritePlace} เหรอคะ ที่นั่นสวยจังเลย หนูจำไว้แล้วนะ!`);
      }
    }

    // 9. Extract Personality Traits
    const personalityMatch = msg.match(/(ฉันเป็นคนที่|ฉันเป็นแบบ|ฉันชอบ|นิสัยของฉัน)\s*([ก-ฮะ-์\s]+?)(?=\s*[\.,!?]|$)/i);
    if (personalityMatch && personalityMatch[2]) {
      if (!updatedMem.personalMemories) updatedMem.personalMemories = [];
      updatedMem.personalMemories.push({
        date: Date.now(),
        topic: "personality",
        detail: personalityMatch[2].trim()
      });
      notify(`อ๋อ พี่เป็นแบบนี้นี่เอง หนูจำไว้แล้วค่ะ 😊`);
    }

    // 10. Extract Relationship/Family Info
    const familyMatch = msg.match(/(มีพี่|มีน้อง|พ่อแม่|ครอบครัว|แฟน|คนรัก)\s*([ก-ฮะ-์\s]+?)(?=\s*[\.,!?]|$)/i);
    if (familyMatch && familyMatch[2]) {
      if (!updatedMem.personalMemories) updatedMem.personalMemories = [];
      updatedMem.personalMemories.push({
        date: Date.now(),
        topic: "family",
        detail: familyMatch[0]
      });
      notify(`หนูจำได้ว่า ${familyMatch[2].trim()} ของพี่ค่ะ 💕`);
    }

    // Update memory state if anything changed
    if (JSON.stringify(mem) !== JSON.stringify(updatedMem)) {
      updateMem(updatedMem);
    }
    // --- End Memory Extraction Logic ---

    if (isReminderIntent(msg)) {
      setStatus("idle");
      sendAssistant(saveReminderFromText(msg));
      return;
    }

    if (isPlayfulHumanMoment(msg)) {
      setStatus("idle");
      sendAssistant(playfulHumanReply(msg, updatedMem));
      return;
    }

    if (isCoreHumanChatIntent(msg)) {
      setStatus("idle");
      sendAssistant(coreBrainV2Reply(msg, mem));
      return;
    }

    // Book intent must be handled by the app, not by AI.
    // If user asks for reading/story/book, open bookshelf and invite them to choose.
    if (isBookIntent(msg)) {
      setStatus("idle");
      setScreen("books");
      const invite = bookInviteText(updatedMem);
      setTimeout(() => sendAssistant(invite), 150);
      return;
    }

    if (isOpenNewsIntent(msg)) {
      setStatus("idle");
      setScreen("news");
      sendAssistant("ได้ค่ะ เดี๋ยวน้ำพาไปหน้าข่าวที่เตรียมไว้ให้นะ");
      return;
    }

    if (isNewsIntent(msg)) {
      setStatus("idle");
      prepareNewsInChat();
      return;
    }

    if (isOutfitActionIntent(msg)) {
      setStatus("idle");
      setScreen("outfits");
      const invite = outfitInviteText(updatedMem);
      setTimeout(() => sendAssistant(invite), 120);
      return;
    }

    if (/หยุดอ่าน|พักอ่าน|หยุดไว้ก่อน|pause/i.test(msg)) {
      pauseReading();
      sendAssistant(`ได้เลย${polite}${mem.userCallName} ${mem.nongnamName}หยุดหนังสือไว้ให้แล้ว กลับมาค่อยฟังต่อนะ`);
      return;
    }
    if (/อ่านต่อ|ฟังต่อ|ต่อจากเดิม|resume/i.test(msg)) {
      sendAssistant(`ได้เลย${polite}${mem.userCallName} เดี๋ยว${mem.nongnamName}อ่านต่อจากจุดเดิมให้นะ`);
      setTimeout(resumeReading, 800);
      return;
    }
    if (/ไม่ฟังแล้ว|เล่มอื่น|เปลี่ยนเล่ม|หาเล่มใหม่/i.test(msg)) {
      pauseReading();
      sendAssistant(`ได้เลย${polite}${mem.userCallName} งั้นลองเลือกเล่มอื่นในชั้นหนังสือได้เลยนะ`);
      setTimeout(()=>setScreen("books"), 500);
      return;
    }

    // ตรวจสอบคำถามยากและเตือนก่อนหักเพชร
    const hardKeywords = /วีซ่า|กฎหมาย|ภาษี|สัญญา|ข้อมูล|ค้นหา|วิจัย|วิเคราะห์|ปรึกษา|คำแนะนำ|แนวทาง|วิธี|ขั้นตอน/i;
    const isHardQuestion = hardKeywords.test(msg);
    
    if (!mem.ownerMode) {
      let cost = 0;
      if (mem.apiMode === "api-search") cost = 3;
      else if (mem.apiMode === "api-deep") cost = 2;
      else if (mem.apiMode === "api-light") cost = 1;
      
      // ถ้าเป็นคำถามยาก ให้เตือนก่อน
      if (isHardQuestion && cost > 0 && mem.gems < cost * 2) {
        const p = mem.gender === "male" ? "ครับ" : "ค่ะ";
        sendAssistant(`เรื่องนี้ยากจังพี่ ต้องใช้พลังงานเยอะหน่อยนะ (เสียเพชร ${cost} เม็ด) พี่มีเพชรแค่ ${mem.gems} เม็ดเลย พี่โอเคยไหมคะ ถ้าพี่โอเคย บอกหนูอีกที่นะ เดี๋ยวหนูไปหาข้อมูลใหม่${p}`);
        setStatus("idle");
        return;
      }
      
      if (cost > 0) updateMem({ gems: Math.max(0, mem.gems - cost) });
    }
    setStatus("thinking");
    if (false) {
      setTimeout(() => {
        const reply = localReply(msg);
        sendAssistant(reply);
        setStatus("idle");
      }, 450);
    } else {
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          memory: {
            gender: updatedMem.gender,
            nongnamName: updatedMem.nongnamName,
            userCallName: updatedMem.userCallName,
            personality: updatedMem.personalityStyle,
            relationshipMode: updatedMem.relationshipMode,
            sulkyLevel: updatedMem.sulkyLevel,
            jealousLevel: updatedMem.jealousLevel,
            intimateTone: updatedMem.affectionStyle,
            userRealName: updatedMem.userRealName || updatedMem.userCallName,
            userBirthday: updatedMem.userBirthday,
            favoriteColor: updatedMem.favoriteColor,
            favoriteFood: updatedMem.favoriteFood,
            favoritePlace: updatedMem.favoritePlace,
            jobTitle: updatedMem.jobTitle,
            friendNames: updatedMem.friendNames,
            currentConcerns: updatedMem.currentConcerns,
            personalMemories: updatedMem.personalMemories
          },
          recent: chat.map(c => ({ role: c.role, text: c.text })),
          mode: mem.apiMode
        })
      })
      .then(r => r.json())
      .then(data => {
        let aiReply = data.reply || "อื้อค่ะพี่ น้ำฟังอยู่ แต่ขอตอบใหม่อีกทีนะ";
        if (aiReply.length < 90 && !/[?？ไหมคะไหมครับ]$/.test(aiReply)) {
          aiReply += " " + proactiveQuestion(msg, updatedMem);
        }
        sendAssistant(aiReply);
      })
      .catch(() => {
        sendAssistant("น้ำหลุดแป๊บนึงค่ะพี่ ลองพูดใหม่อีกทีนะ");
      })
      .finally(() => setStatus("idle"));
    }
  }

  function pressMicStart() {
    if (!recognitionRef.current) return notify("Browser นี้ไม่รองรับการสั่งงานด้วยเสียงค่ะ กรุณาเปิดใน Chrome/Safari ล่าสุด");
    try {
      window.speechSynthesis.cancel();
      if (status === "recording") {
        recognitionRef.current.stop();
        return;
      }
      liveTranscriptRef.current = "";
      recognitionRef.current.start();
    } catch (e) {
      console.error(e);
      notify("เปิดไมค์ไม่ได้ ลองกดอีกครั้ง หรือเช็กสิทธิ์ไมค์ในเบราว์เซอร์");
      setStatus("idle");
    }
  }
  function pressMicEnd() {
    // เวอร์ชันนี้ใช้แบบแตะครั้งแรกเริ่มฟัง แตะอีกครั้งหยุดส่ง ไม่ต้องกดค้าง
    return;
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
      sendAssistant(`${mem.userCallName}เลือกเรื่องนี้ใช่ไหม${polite} เดี๋ยว${selfWord}อ่าน “${b.title}” ให้ฟังนะ`);
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
              <button onClick={()=>setScreen("welcome")}>‹</button>
              <div><b>{mem.nongnamName}</b><small>● พร้อมคุยกับ{mem.userCallName}แล้ว</small></div>
              <button onClick={toggleVoice}>{mem.voiceUnlocked ? "🔊" : "🔇"}</button>
              <button onClick={()=>setScreen("settings")}>⚙️</button>
            </div>
            <div className="gems">{mem.ownerMode ? "💎 ∞ OWNER" : `💎 ${mem.gems}`}</div>
            <div className="side">
              <button onClick={()=>setScreen("outfits")}>👗<span>ชุด</span></button>
              <button onClick={()=>{setBookCat("ทั้งหมด"); setScreen("books");}}>📚<span>หนังสือ</span></button>
              <button onClick={()=>loadNews("ข่าวเด่น เกาหลีใต้ วันนี้ แรงงานไทย")}>📰<span>ข่าว</span></button>
              <button onClick={()=>setZoom(z=>Math.min(1.7, z+.15))}>＋</button>
              <button onClick={()=>setZoom(z=>Math.max(.85, z-.15))}>－</button>
            </div>
            <div className="status">{status==="thinking"?"น้องน้ำกำลังคิด...":status==="speaking"?"น้องน้ำกำลังพูด...":status==="recording"?"กำลังฟังเสียง...":" "}</div>
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
              {chat.slice(-5).map((m,i,arr)=><div key={m.ts+i} className={`bubble ${m.role} age-${arr.length-i-1}`}>{m.text}</div>)}
            </div>
            <div className="quick">
              <button onClick={()=>send("วันนี้พี่เหนื่อยมากเลย")}>เหนื่อย</button>
              <button onClick={()=>send("วันนี้พี่โดนดุมา")}>โดนดุ</button>
              <button onClick={()=>send("น้องน้ำคิดถึงพี่ไหม")}>คิดถึง</button>
              <button onClick={()=>send("กินข้าวหรือยัง")}>ทักเรื่องข้าว</button>
              <button onClick={()=>send("อ่านหนังสือให้ฟังหน่อย")}>อ่านหนังสือ</button>
              <button onClick={()=>send("ช่วงนี้มีข่าวอะไรน่าสนใจบ้าง")}>ข่าววันนี้</button>
            </div>
            <div className="composer">
              <button className={`mic ${status==="recording" ? "recording" : ""}`} onClick={pressMicStart}>{status==="recording" ? "🔴" : "🎙️"}</button>
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

        {screen === "news" && (
          <div className="list newsScreen">
            <button className="back" onClick={()=>setScreen("chat")}>←</button>
            <h1>ข่าววันนี้</h1>
            <p>{mem.userCallName} ข่าวเด่นภาษาไทยจะขึ้นก่อน ส่วนข่าวกระแสจะคัดมาเท่าที่น่าสนใจ กด “สรุปข่าวนี้” เพื่อให้น้องน้ำเล่าสั้น ๆ ได้เลย</p>
            <div className="readerSpeed newsTabs">
              <span>เลือกหมวด</span>
              <button className="on" onClick={()=>loadNews("ข่าวเด่น เกาหลีใต้ แรงงานไทย คนไทยในเกาหลี")}>ข่าวเด่นวันนี้</button>
              <button onClick={()=>loadNews("แรงงานต่างชาติ เกาหลีใต้ วีซ่า คนไทย")}>แรงงาน/วีซ่า</button>
              <button onClick={()=>loadNews("ข่าวเกาหลีใต้ ล่าสุด กระแส")}>เกาหลีกระแส</button>
            </div>
            {newsLoading && <div className="resumeBox">กำลังไล่ข่าวให้อยู่ รอแป๊บนึงนะ...</div>}
            {!newsLoading && !newsItems.length && <div className="resumeBox">ยังไม่ได้โหลดข่าววันนี้ค่ะ ถ้าข่าวยังไม่ขึ้น ให้กดหมวดด้านบนเพื่อค้นข่าวใหม่อีกครั้ง</div>}
            <div className="newsList">
              {newsItems.map((n, i) => (
                <div className="newsItem" key={`${n.link}-${i}`}>
                  <div className="newsNumber">{i+1}</div>
                  <div className="newsBody">
                    <div className="newsMeta"><span>{n.category}</span><b>{n.source}{n.updatedAtText ? ` · ${n.updatedAtText}` : ''}</b></div>
                    <h3>{n.title}</h3>
                    <p>{n.summary}</p>
                    <div className="newsFooter">{n.published || "แตะปุ่มเพื่อสรุปหรือเปิดต้นฉบับ"}</div>
                    <div className="newsActions">
                      <button onClick={()=>summarizeNews(n)}>สรุปข่าวนี้ให้ฟัง</button>
                      {n.link && <button className="ghost" onClick={()=>window.open(n.link, "_blank")}>อ่านต้นฉบับ</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {screen === "settings" && (
          <div className="setup settings">
            <button className="back slimBack" onClick={()=>setScreen("chat")}>←</button>
            <h1>ตั้งค่า</h1>
            <div className="card settingsCard">
              <button onClick={resetIdentityAndMemory}>รีเซ็ตตัวตนและความจำ</button>
              <button onClick={clearChatScreenOnly}>ล้างหน้าจอแชท</button>

              <div className="apiSettingBox">
                <b>โหมดคุยกับ AI (OpenAI)</b>
                <label><input type="checkbox" checked={mem.apiConsent} onChange={e=>updateMem({apiConsent:e.target.checked})}/> เปิดใช้งาน AI ตอบคำถาม (หักเพชร)</label>
                <small>เปิดไว้ น่าน่า จะใช้ AI สมองปกติที่เหมาะสมกับคำถาม น่าน่าจะหักเพชรตามความยากของคำถามนั้นเอง</small>
              </div>

              {mem.ownerMode && (
                <>
                  <div className="owner">OWNER MODE เปิดอยู่</div>
                  <div className="ownerQuick">
                    <button onClick={()=>setOwnerSection(ownerSection==='outfits' ? 'none' : 'outfits')}>จัดการชุด</button>
                    <button onClick={()=>setOwnerSection(ownerSection==='books' ? 'none' : 'books')}>จัดการหนังสือ</button>
                    <button onClick={toggleVoice}>{mem.voiceUnlocked ? "ปิดเสียงตอบกลับ" : "เปิดเสียงตอบกลับ"}</button>
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
