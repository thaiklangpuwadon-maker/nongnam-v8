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
  source: string;
  link: string;
  published: string;
  summary: string;
  category: string;
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

const APP_VERSION = "v6.3.1-news-speak-fix";
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
    const saved = loadJSON<Memory>(MEMORY_KEY, defaultMem);
    const merged = {
      ...defaultMem,
      ...saved,
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
    if (merged.setupDone) setScreen("chat");
    setReady(true);
  }, []);

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
    return /(ข่าว|ข่าววันนี้|ข่าวช่วงนี้|มีอะไรเกิดขึ้น|เกิดอะไรขึ้นบ้าง|ข่าวเด่น|ข่าวกระแส|สรุปข่าว|เล่าข่าว|ข่าวแรงงาน|แรงงานไทย|ข่าวเกาหลี|ข่าวไทยในเกาหลี|อัปเดตแรงงาน|สถานทูต|วีซ่า)/i.test(msg);
  }

  function newsIntroText(m: Memory = mem) {
    const call = m.userCallName || "พี่";
    const p = m.gender === "male" ? "ครับ" : "ค่ะ";
    const self = m.gender === "male" ? "ผม" : (m.relationshipMode.includes("เมีย") || m.affectionStyle.includes("เมีย") ? "เมีย" : (m.nongnamName || "น้องน้ำ"));
    return `${call} เดี๋ยว${self}ไล่ข่าวเด่นให้${p} จะเอาทั้งข่าวกระแส และข่าวที่เกี่ยวกับแรงงานไทย/คนไทยในเกาหลีมาไว้ก่อน ถ้าสนใจข่าวไหนกดสรุปข่าวนั้นได้เลย`;
  }

  async function loadNews(focus = "") {
    if (!mem.ownerMode && mem.gems < 3) {
      sendAssistant(`ข่าวต้องใช้พลังนิดนึง${polite}${mem.userCallName} ใช้ 3 เพชร แต่ตอนนี้เพชรไม่พอนะ`);
      return;
    }
    if (!mem.ownerMode) updateMem({ gems: Math.max(0, mem.gems - 3) });
    setScreen("news");
    setNewsLoading(true);
    setNewsFocus(focus);
    sendAssistant(newsIntroText(mem));
    try {
      const res = await fetch(`/api/news?q=${encodeURIComponent(focus || "แรงงานไทย เกาหลี ข่าวเด่น")}`);
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setNewsItems(items);
      if (items.length) {
        setTimeout(() => {
          sendAssistant(`เจอข่าวน่าสนใจ ${items.length} เรื่อง${polite}${mem.userCallName} กดสรุปข่าวที่สนใจได้เลย`);
        }, 350);
      } else {
        sendAssistant(`ยังไม่เจอข่าวที่ชัดพอ${polite}${mem.userCallName} ลองค้นคำอื่นไหม`);
      }
    } catch {
      sendAssistant(`ข่าวโหลดไม่สำเร็จ${polite}${mem.userCallName} ลองใหม่อีกทีนะ`);
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
    const msg = `${mem.userCallName} ${mem.nongnamName}สรุปข่าวนี้ให้ฟังนะ${p} หัวข้อคือ “${item.title}” ${source} ใจความสั้น ๆ คือ ${shortSummary || "รายละเอียดในพาดหัวยังไม่เยอะ ถ้าพี่สนใจเปิดต้นฉบับอ่านต่อได้เลย"}`;
    setScreen("chat");
    setStatus("speaking");
    sendAssistant(msg);
    notify("กำลังอ่านสรุปข่าวให้ฟัง");
    setTimeout(() => forceSpeak(msg), 350);
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
    const first = mem.gender === "female" ? "f_001" : "m_001";
    updateMem({
      setupDone: true,
      selectedOutfit: mem.selectedOutfit || first,
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

  function localReply(msg: string) {
    const name = mem.nongnamName || "น้องน้ำ";
    const user = mem.userCallName || "พี่";
    const style = mem.personalityStyle;
    const p = polite;
    const s = selfWord;

    if (isBookIntent(msg)) {
      setScreen("books");
      return bookInviteText(mem);
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
        ? `${user}กินข้าวหรือยังครับ ถ้ายังไม่กิน ผมเป็นห่วงนะ`
        : `${user}กินข้าวหรือยังคะ ถ้ายังไม่กิน ${name}จะงอนนิดนึงนะ ห่วงจริง ๆ`;
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

    // Book intent must be handled by the app, not by AI.
    // If user asks for reading/story/book, open bookshelf and invite them to choose.
    if (isBookIntent(msg)) {
      setStatus("idle");
      setScreen("books");
      const invite = bookInviteText(updatedMem);
      setTimeout(() => sendAssistant(invite), 150);
      return;
    }

    if (isNewsIntent(msg)) {
      setStatus("idle");
      setTimeout(() => loadNews(msg), 150);
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
        sendAssistant(data.reply || "อื้อค่ะพี่ น้ำฟังอยู่ แต่ขอตอบใหม่อีกทีนะ");
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
              {chat.slice(-3).map((m,i)=><div key={m.ts+i} className={`bubble ${m.role}`}>{m.text}</div>)}
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
            <p>{mem.userCallName} ข่าวแรงงานไทย/คนไทยในเกาหลีจะถูกดันขึ้นก่อน ส่วนข่าวกระแสจะคัดมาเท่าที่น่าสนใจ กด “สรุปข่าวนี้” เพื่อให้น้องน้ำเล่าสั้น ๆ ได้เลย</p>
            <div className="readerSpeed newsTabs">
              <span>เลือกหมวด</span>
              <button className="on" onClick={()=>loadNews("ข่าวเด่น เกาหลีใต้ แรงงานไทย คนไทยในเกาหลี")}>เด่น + แรงงานไทย</button>
              <button onClick={()=>loadNews("แรงงานต่างชาติ เกาหลีใต้ วีซ่า คนไทย")}>แรงงาน/วีซ่า</button>
              <button onClick={()=>loadNews("ข่าวเกาหลีใต้ ล่าสุด กระแส")}>เกาหลีกระแส</button>
            </div>
            {newsLoading && <div className="resumeBox">กำลังไล่ข่าวให้อยู่ รอแป๊บนึงนะ...</div>}
            {!newsLoading && !newsItems.length && <div className="resumeBox">ยังไม่มีข่าวในหน้านี้ กดหมวดด้านบนเพื่อค้นข่าวได้เลย</div>}
            <div className="newsList">
              {newsItems.map((n, i) => (
                <div className="newsItem" key={`${n.link}-${i}`}>
                  <div className="newsNumber">{i+1}</div>
                  <div className="newsBody">
                    <div className="newsMeta"><span>{n.category}</span><b>{n.source}</b></div>
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
              <button onClick={resetProfile}>รีเซ็ตข้อมูลตั้งค่า</button>
              <button onClick={()=>{setChat([]); localStorage.removeItem(CHAT_KEY); notify("ล้างแชตแล้ว");}}>ล้างประวัติแชต</button>

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
