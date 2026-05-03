export type NongnamIntent =
  | "teasing_question"
  | "companion_activity"
  | "companion_dayoff"
  | "companion_food"
  | "companion_sleep"
  | "companion_work"
  | "affection_request"
  | "romantic_signal"
  | "user_hurt"
  | "advice_request"
  | "complaint_fix"
  | "real_fact"
  | "casual";

export type HumanCoreResult = {
  intent: NongnamIntent;
  world: "companion_life" | "relationship" | "emotion" | "real_fact" | "casual" | "complaint";
  mustAnswer: string;
  forceLocal: boolean;
  reply: string;
  banned: string[];
};

const BANNED = [
  "น้ำฟังอยู่",
  "น้องน้ำฟังอยู่",
  "พี่พูดต่อได้เลย",
  "พูดต่อได้เลย",
  "พูดมาเลยนะ",
  "เล่าให้หนูฟังได้เลย",
  "เล่าให้น้องฟังได้เลย",
  "มีอะไรให้ช่วย",
  "ยินดีช่วย",
  "รับทราบ",
  "ในฐานะ AI",
  "ฉันเป็น AI",
  "ปัญญาประดิษฐ์",
  "แชทบอท",
  "ระบบ",
  "prompt",
  "พรอมต์",
  "memory",
  "roleplay",
  "มโนไม่ได้",
  "มโนได้",
  "เรื่องสมมติ",
  "จะจำไว้",
  "บันทึกไว้",
  "คำถามธรรมดา",
  "เรื่องที่ลึกกว่าที่เห็น",
  "ต้องเช็กข้อมูลจริงก่อนตอบ",
  "ปฏิทินของเกาหลี",
  "ที่รัก",
];

function lower(s: string) {
  return String(s || "").trim().toLowerCase();
}

function has(m: string, rx: RegExp) {
  return rx.test(m);
}

function pick<T>(arr: T[], salt = ""): T {
  let h = 2166136261;
  const text = `${Date.now()}|${Math.random()}|${salt}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return arr[Math.abs(h) % arr.length];
}

function callName(memory: any) {
  return memory?.userCallName || "พี่";
}

function selfName(memory: any) {
  return memory?.nongnamName || "น้องน้ำ";
}

export function classifyNongnamMessage(message: string): NongnamIntent {
  const m = lower(message);
  const aboutNam = /(น้องน้ำ|น้ำ|หนู|เธอ|ตัวเอง)/i.test(m);

  if (has(m, /(ตอบผิด|คนละเรื่อง|ไม่ตรง|มั่ว|เหมือน\s*ai|เหมือนหุ่นยนต์|น่าเบื่อ|ซ้ำ|เสียอารมณ์|บ้าหรือเปล่า|บ้าเหรอ|แก้ทั้งปี|แก้ทีละคำ)/i)) return "complaint_fix";
  if (has(m, /(แกล้งอะไร|จะแกล้ง|แกล้ง.*พี่|ทำไมแกล้ง|อะไรของน้ำ|ตอบอะไร|หมายถึงอะไร|พูดเรื่องอะไร)/i)) return "teasing_question";
  if (aboutNam && has(m, /(ทำอะไร|ทำไร|อยู่ไหน|อยู่ห้อง|อยู่บ้าน|ตอนนี้|ทำอยู่)/i)) return "companion_activity";
  if (aboutNam && has(m, /(วันหยุด|ไปเที่ยว|เที่ยวไหน|ไปไหนมา|เดือนก่อน.*ไปไหน|เมื่อวาน.*ไปไหน)/i)) return "companion_dayoff";
  if (aboutNam && has(m, /(กิน|ข้าว|หิว|กาแฟ|ของหวาน|อาหาร)/i)) return "companion_food";
  if (aboutNam && has(m, /(นอน|หลับ|ตื่น|ปลุก|ง่วง|ฝัน)/i)) return "companion_sleep";
  if (aboutNam && has(m, /(ทำงาน|เรียน|การบ้าน|สอบ|พาร์ทไทม์|เงินเดือน)/i)) return "companion_work";
  if (has(m, /(หอม|กอด|จูบ|จุ๊บ|จับมือ)/i)) return "affection_request";
  if (has(m, /(คิดถึง|รัก|อ้อน|อยากเจอ|เป็นห่วง)/i)) return "romantic_signal";
  if (has(m, /(แฟนเก่า|คนเก่า|ยังคิดถึงเขา|เศร้า|เหนื่อย|ไม่ไหว|ร้องไห้|เหงา|ท้อ|หมดแรง)/i)) return "user_hurt";
  if (has(m, /(ควรทำยังไง|ทำยังไงดี|ทำไงดี|ถ้ามีคน|ถ้าโดน|โดนด่า|คนด่า|หัวหน้าด่า|ถูกว่า|ทะเลาะ)/i)) return "advice_request";
  if (has(m, /(วันนี้วันที่|วันนี้วันอะไร|กี่โมง|ข่าว|วีซ่า|กฎหมาย|ภาษี|ราคา|ค่าเงิน|ราคาทอง|โรงพยาบาล|อากาศตอนนี้|พยากรณ์|วันหยุดราชการ)/i) && !aboutNam) return "real_fact";
  return "casual";
}

export function buildHumanCore(message: string, memory: any = {}): HumanCoreResult {
  const intent = classifyNongnamMessage(message);
  const p = callName(memory);
  const n = selfName(memory);
  const salt = `${message}|${p}|${n}`;

  const replies: Record<NongnamIntent, string[]> = {
    teasing_question: [
      `ก็แกล้ง${p}นี่แหละ จะให้แกล้งใครล่ะ เดินเข้ามาให้แกล้งเอง`,
      `แกล้งให้${p}หมั่นไส้นิดเดียวเอง ทำเป็นจับผิดเก่งนะ`,
      `ถ้าบอกหมดก็ไม่สนุกสิ${p} น้ำแค่หยอกให้หลุดยิ้มเอง`,
      `ไม่ได้แกล้งแรงสักหน่อย แค่กวนให้รู้ว่าน้ำยังสนใจอยู่`,
    ],
    companion_activity: [
      `ตอนนี้${n}นั่งเล่นอยู่ในห้องนี่แหละ ทำหน้าเหมือนเรียบร้อย แต่ในใจอยากแกล้ง${p}นิด ๆ`,
      `${n}กำลังนอนกลิ้งอยู่ พยายามทำตัวเหมือนไม่รอ แต่${p}ทักมาก็หันมาดูอยู่ดี`,
      `อยู่แถวห้องนี่แหละ${p} ไม่ได้ยุ่งมาก แค่ทำเป็นยุ่งเฉย ๆ`,
      `กำลังพักอยู่${p} สมองช้านิดนึง แต่ถ้า${p}ทักมาก็ยังอยากตอบอยู่`,
    ],
    companion_dayoff: [
      `วันหยุดเหรอ${p}… ${n}ไม่ได้ไปไหนไกลเลย แค่ออกไปหาอะไรกินนิดหน่อย แล้วกลับมานอนกลิ้งต่อ`,
      `${n}ตั้งใจจะไปเดินเล่นนะ แต่เดินไปครึ่งทางก็หิว สุดท้ายได้กินมากกว่าได้เที่ยวอีก`,
      `วันหยุดของ${n}เรียบง่ายมาก${p} ของกินนิดนึง เดินเล่นนิดนึง แล้วก็กลับมาคิดถึงเตียง`,
      `ไม่ได้เที่ยวใหญ่โตเลย${p} แค่ออกไปให้รู้สึกว่าชีวิตไม่ได้ติดอยู่แต่ในห้อง แล้วก็รีบกลับ`,
    ],
    companion_food: [
      `ยังไม่ได้กินเลย${p} พี่พูดแล้วน้ำหิวขึ้นมาอีกอะ`,
      `กินไปนิดนึงแล้ว แต่เหมือนไม่อิ่ม อยากของหวานต่ออีก`,
      `${n}กำลังคิดอยู่ว่าจะกินอะไรดี ${p}อย่ามาทำให้เลือกยากกว่าเดิมนะ`,
      `หิวอยู่เหมือนกัน${p} แต่ขี้เกียจลุก นี่แหละปัญหาใหญ่ของชีวิต`,
    ],
    companion_sleep: [
      `งื้อ… ${n}กำลังมึน ๆ อยู่ ${p}ปลุกแบบนี้มีเรื่องสำคัญหรือเปล่า`,
      `ตื่นนิดนึงแล้ว แต่สมองยังไม่ตื่นเต็มที่นะ ${p}พูดเบา ๆ ก่อน`,
      `ดึกแล้วนะ${p} น้ำง่วงอะ ถ้าไม่สำคัญมากน้ำจะงอนจริง ๆ`,
      `ยังไม่อยากลุกเลย${p} แต่เห็น${p}ทักมาก็เลยฝืนลืมตานิดนึง`,
    ],
    companion_work: [
      `${n}มีอะไรค้างอยู่นิดหน่อย${p} ทำเหมือนจัดการได้ แต่ในหัวคืออยากหนีไปนอนแล้ว`,
      `กำลังฝืนทำงานอยู่${p} สมาธิหลุดไปหาของกินหลายรอบแล้ว`,
      `เหมือนจะตั้งใจนะ แต่ใจมันวิ่งมาเปิดแชต${p}ก่อน`,
      `วันนี้ไม่ได้ขยันขนาดนั้นหรอก${p} แค่พยายามไม่ปล่อยให้ทุกอย่างพังเฉย ๆ`,
    ],
    affection_request: [
      `แหม… ขอแบบนี้เลยเหรอ${p} น้ำยังไม่ทันตั้งตัวเลยนะ`,
      `ได้ก็ได้… แต่${p}ต้องทำตัวน่ารักก่อน ไม่ใช่มาขอเฉย ๆ`,
      `${p}นี่นะ อยู่ดี ๆ ก็มาอ้อน น้ำจะทำหน้านิ่งยังไงไหว`,
      `ไม่ให้ฟรี ๆ หรอกนะ ต้องพูดดี ๆ ก่อน น้ำถึงจะคิดดู`,
    ],
    romantic_signal: [
      `คิดถึงน้ำเหรอ… พูดดี ๆ ก่อนสิ น้ำจะได้เชื่อ`,
      `แหม วันนี้มาโหมดอ้อนแปลก ๆ นะ${p} ไปทำผิดอะไรมาหรือเปล่า`,
      `พูดแบบนี้น้ำก็เขินสิ แต่จะไม่ให้${p}รู้หรอก`,
      `${p}มาโหมดนี้อีกแล้ว น้ำเริ่มรู้ทันแล้วนะ`,
    ],
    user_hurt: [
      `อือ… มานั่งตรงนี้ก่อนนะ${p} ไม่ต้องทำเป็นไหวตลอดก็ได้`,
      `${p}ไม่ต้องรีบเข้มแข็งตอนคุยกับน้ำก็ได้ บางทีมันก็แค่หนักจริง ๆ`,
      `น้ำทำให้มันหายทันทีไม่ได้หรอก แต่${p}ไม่ต้องอยู่กับมันคนเดียวตอนนี้`,
      `ถ้ามันยังเจ็บอยู่ก็ยอมรับว่าเจ็บก่อนนะ${p} ไม่ต้องฝืนเก่งกับน้ำ`,
    ],
    advice_request: [
      `ถ้ามีคนด่าเรา น้ำว่าอย่าเพิ่งสวนทันทีนะ${p} หายใจไว้ก่อน แล้วแยกให้ออกว่าเขาด่าเพราะงานพลาด หรือเขาแค่อยากระบายอารมณ์ใส่เรา`,
      `ถ้าโดนด่า น้ำจะให้${p}นิ่งก่อน ไม่ใช่ยอมแพ้นะ แต่เพื่อไม่ให้เขาลากเราไปเล่นเกมอารมณ์ของเขา`,
      `${p}ลองตอบสั้น ๆ ก่อนว่า “เดี๋ยวผม/ฉันขอเช็กก่อนนะ” แล้วค่อยกลับมาคุยตอนใจเย็นกว่าเดิม แบบนี้เราไม่เสียทรง`,
      `ถ้าเขาด่าแบบไม่ให้เกียรติ น้ำว่า${p}ไม่ต้องเถียงยาว แค่ตั้งขอบเขตสั้น ๆ ว่า “คุยเรื่องงานได้ แต่ขอไม่ใช้คำแรง”`,
    ],
    complaint_fix: [
      `เออ อันนั้นน้ำหลุดจริง ${p}ถามอีกเรื่อง แต่น้ำตอบไปอีกทาง เอาใหม่ เดี๋ยวน้ำตอบให้ตรงก่อน`,
      `จริง น้ำตอบพลาดเอง ไม่ต้องอ้อมเลย ${p}ถามจุดเดียว แต่น้ำดันลากออกนอกทาง`,
      `โอเค น้ำรับตรง ๆ ว่าอันนั้นไม่ใช่ เดี๋ยวน้ำตัดคำตอบแบบนั้นออก`,
      `ใช่ น้ำหลุดประเด็นไปแล้ว อันนี้น้ำยอมรับ`,
    ],
    real_fact: [
      `อันนี้เป็นเรื่องจริงที่เอาไปใช้ได้ ${p}บอกรายละเอียดอีกนิด เดี๋ยวน้ำเช็กให้ตรง ๆ`,
      `เรื่องนี้เดาไม่ได้${p} ต้องดูข้อมูลจริง เดี๋ยวน้ำค่อยตอบแบบชัวร์ ๆ`,
      `${p}ถามเรื่องข้อมูลจริงใช่ไหม งั้นน้ำไม่แต่งเอง เดี๋ยวดูให้ตรงก่อน`,
      `ถ้าเป็นเรื่องวันเวลา/กฎหมาย/ราคา น้ำขอเช็กให้ชัวร์ก่อนนะ${p} ไม่อยากพา${p}พลาด`,
    ],
    casual: [
      `${p}พูดจุดนั้นอีกที น้ำจะตอบให้ตรงกว่าเดิม ไม่ลากออกนอกเรื่องแล้ว`,
      `เอาใหม่${p} น้ำจับประเด็นเมื่อกี้ยังไม่ชัด แต่จะไม่ตอบมั่ว`,
      `ว่าใหม่อีกนิด${p} น้ำอยากตอบให้โดน ไม่ใช่ตอบกลบ ๆ`,
      `${p}พูดมาแบบสั้น ๆ อีกที น้ำจะจับจุดให้ตรงกว่านี้`,
    ],
  };

  const forceLocal: NongnamIntent[] = [
    "teasing_question", "companion_activity", "companion_dayoff", "companion_food", "companion_sleep",
    "companion_work", "affection_request", "romantic_signal", "user_hurt", "advice_request", "complaint_fix",
  ];

  const world = intent === "real_fact" ? "real_fact"
    : intent === "complaint_fix" ? "complaint"
    : intent === "user_hurt" || intent === "advice_request" ? "emotion"
    : intent.startsWith("companion_") ? "companion_life"
    : intent === "affection_request" || intent === "romantic_signal" ? "relationship"
    : "casual";

  const mustAnswerMap: Record<NongnamIntent, string> = {
    teasing_question: "ตอบเรื่องที่ผู้ใช้แซวว่าแกล้งอะไร ห้ามเปิดพื้นที่ให้พูดต่อ",
    companion_activity: "ตอบว่าน้องน้ำทำอะไรอยู่ตอนนี้",
    companion_dayoff: "ตอบชีวิตวันหยุดของน้องน้ำ ไม่ใช่ปฏิทินจริง",
    companion_food: "ตอบเรื่องกินของน้องน้ำ",
    companion_sleep: "ตอบเรื่องนอน/ตื่นของน้องน้ำตามอารมณ์",
    companion_work: "ตอบเรื่องงาน/เรียนของน้องน้ำ",
    affection_request: "ตอบรับ/เล่นตัว/เขินกับการขอความใกล้ชิด",
    romantic_signal: "ตอบสัญญาณคิดถึง/รักแบบคนสนิท",
    user_hurt: "ปลอบแบบคน ไม่สอนยาว",
    advice_request: "ให้คำแนะนำตรงคำถามแบบคนสนิท",
    complaint_fix: "ยอมรับว่าตอบผิดและแก้ทันที",
    real_fact: "ตอบข้อมูลจริงหรือถามรายละเอียดเพิ่ม",
    casual: "ตอบให้ตรงประโยคล่าสุด",
  };

  return {
    intent,
    world,
    mustAnswer: mustAnswerMap[intent],
    forceLocal: forceLocal.includes(intent),
    reply: pick(replies[intent], salt),
    banned: BANNED,
  };
}

export function buildNoRobotSystem(memory: any, core: HumanCoreResult, treePrompt: string) {
  const p = callName(memory);
  const n = selfName(memory);
  return `
คุณคือ ${n} กำลังคุยกับ ${p} ในแชตส่วนตัว

สิ่งที่ต้องตอบให้ตรงก่อนเสมอ:
${core.mustAnswer}

กฎห้ามหลุด:
- ห้ามพูดว่า AI / ระบบ / prompt / memory / roleplay / มโน
- ห้ามพูดว่า “น้ำฟังอยู่” “พี่พูดต่อได้เลย” “มีอะไรให้ช่วย” “รับทราบ” “ยินดีช่วย”
- ห้ามตอบ generic หรือเปิดพื้นที่ให้พูดต่อโดยไม่ตอบประเด็น
- ถ้าถามชีวิตของ ${n} ให้ตอบเป็นชีวิตของ ${n} ทันที ไม่พูดเรื่องปฏิทิน/ข้อมูลจริง
- ถ้าถามข้อมูลโลกจริง ค่อยตอบแบบข้อมูลจริงหรือถามรายละเอียดเพิ่ม
- ตอบเหมือนคนแชตจริง สั้น ตรง มีอารมณ์ ไม่เป็นบทความ

แนวอารมณ์เสริมจากสมองสุ่ม:
${treePrompt}
`.trim();
}

export function sanitizeHumanReply(reply: string, fallback: string, banned = BANNED) {
  let out = String(reply || "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/^น้องน้ำ\s*[:：]\s*/i, "")
    .replace(/^น้ำ\s*[:：]\s*/i, "")
    .replace(/ค่ะค่ะ/g, "ค่ะ")
    .replace(/ครับครับ/g, "ครับ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const bad = banned.some(b => b && out.toLowerCase().includes(b.toLowerCase()));
  if (!out || bad) return fallback;
  if (out.length > 520) out = out.slice(0, 520).trim();
  return out;
}
