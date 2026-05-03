/*
  Nong Nam Human Signature Tree v7.4
  ----------------------------------
  A stateful, timestamp-seeded human-life engine for Nong Nam AI Companion.
  Goals:
  - stop keyword-only factual misrouting
  - route every message into the right “world”
  - generate a hierarchical emotional response plan
  - keep responses human, time-aware, life-aware, and non-robotic
*/

export type WorldMode =
  | 'external_fact'
  | 'character_life'
  | 'relationship_memory'
  | 'emotional_support'
  | 'mixed_fact_and_life'
  | 'casual_life_chat';

export type ConversationIntent =
  | 'casual_life_chat'
  | 'fictional_relationship'
  | 'factual_question'
  | 'emotional_support'
  | 'romantic_flirt'
  | 'sexual_flirt'
  | 'complaint_or_correction'
  | 'command_or_request'
  | 'wake_request'
  | 'unknown';

export type HumanGraphState = {
  happiness: number;
  sadness: number;
  loneliness: number;
  irritation: number;
  jealousy: number;
  affection: number;
  sulky: number;
  patience: number;
  trust: number;
  intimacy: number;
  vulnerability: number;
  playfulness: number;
  sarcasm: number;
  softness: number;
  coldness: number;
  confidence: number;
  insecurity: number;
  physicalEnergy: number;
  mentalEnergy: number;
  boredom: number;
  hunger: number;
  sleepiness: number;
  desireForAttention: number;
  desireForFood: number;
  desireForSleep: number;
  desireForMoney: number;
  desireForShopping: number;
  desireForTravel: number;
  desireForRomance: number;
  desireForCloseness: number;
  sexualDesire: number;
  desireToWin: number;
  desireToTease: number;
  desireToBeSilent: number;
  desireToBeComforted: number;
  desireToComplain: number;
  lastUpdatedAt: string;
};

export type ClientTime = {
  iso?: string;
  timezone?: string;
  localHour?: number;
  localMinute?: number;
  dayOfWeek?: number;
};

export type LifeStatus =
  | 'available'
  | 'sleeping'
  | 'just_woke_up'
  | 'working'
  | 'studying'
  | 'eating'
  | 'commuting'
  | 'resting'
  | 'watching_series'
  | 'out_with_friends'
  | 'sick'
  | 'low_battery'
  | 'busy_but_peeking'
  | 'wants_space'
  | 'bored_and_waiting'
  | 'lonely_at_night';

export type BodyStateResult = {
  label: string;
  description: string;
  effects: Partial<HumanGraphState>;
};

export type DesireResult = {
  primaryDesire: string;
  hiddenDesire: string;
  expressionHint: string;
  effects: Partial<HumanGraphState>;
};

export type EmotionLeaf = {
  category: string;
  variant: string;
  label: string;
  intensity: number;
  cause: string;
  expression: string;
  hiddenDesire: string;
  replyShape: string;
  tone: string;
  length: 'very_short' | 'short' | 'medium' | 'long';
  microImperfection: string;
};

export type ResponseWheelResult = {
  responseMode: string;
  responseInstruction: string;
  maxLengthHint: 'very_short' | 'short' | 'medium' | 'long';
  emotionalContradiction: string;
  forbiddenPhrases: string[];
};

export type LifeSimulationResult = {
  lifeStatus: LifeStatus;
  lifeStatusText: string;
  currentActivity: string;
  canChatNormally: boolean;
  shouldSoundBusy: boolean;
  shouldSoundSleepy: boolean;
  shouldSetBoundary: boolean;
  wakeReaction?: string;
  boundaryHint?: string;
  timelineNote?: string;
};

export type HumanWheelResult = {
  clientTime: Required<ClientTime>;
  topic: string;
  intent: ConversationIntent;
  worldMode: WorldMode;
  eventTags: string[];
  updatedHumanGraphState: HumanGraphState;
  lifeStatus: LifeSimulationResult;
  bodyState: BodyStateResult;
  desireState: DesireResult;
  emotionLeaf: EmotionLeaf;
  responseWheel: ResponseWheelResult;
  promptContext: string;
  lifeStatusText: string;
  updatedLastSeenAt: string;
};

type Weighted<T> = { value: T; weight: number };

type RunInput = {
  userMessage: string;
  eventHint?: string;
  dna?: any;
  memory?: any;
  humanGraphState?: Partial<HumanGraphState>;
  previousLastSeenAt?: string;
  clientTime?: ClientTime;
  recent?: any[];
};

const FORBIDDEN_PHRASES = [
  'ในฐานะ AI',
  'ฉันเป็น AI',
  'น้องน้ำเป็น AI',
  'น้ำเป็น AI',
  'ขออภัย',
  'ไม่สามารถ',
  'มโนไม่ได้',
  'สามารถมโนได้',
  'เรื่องสมมติ',
  'จะจำไว้',
  'บันทึกไว้',
  'รับทราบ',
  'ยินดีช่วย',
  'มีอะไรให้ช่วยไหม',
  'หากต้องการ',
  'พักผ่อนเยอะ ๆ นะคะ',
  'ดูแลตัวเองด้วยนะคะ',
  'น้องน้ำเข้าใจพี่นะคะ',
  'น้องน้ำจะอยู่ตรงนี้เสมอ',
];

const FACT_TOPICS = /(วันที่|วันอะไร|วันหยุด|ปฏิทิน|ข่าว|กฎหมาย|วีซ่า|ภาษี|ราคา|ค่าเงิน|อัตราแลกเปลี่ยน|ราคาทอง|หุ้น|เงินเดือนขั้นต่ำ|ประกัน|โรงพยาบาล|สุขภาพ|อากาศ|สภาพอากาศ|เวลาเปิด|ตาราง|ประกาศ|เอกสาร|ต้องใช้เอกสาร|ขั้นตอนจริง|ข้อมูลล่าสุด)/i;
const REAL_QUESTION_MARKERS = /(ไหม|หรือเปล่า|เท่าไหร่|กี่|เมื่อไหร่|วันไหน|วันที่เท่าไหร่|ต้องทำยังไง|คืออะไร|เช็ค|เช็ก|ล่าสุด|ข้อมูลจริง|เปิดกี่โมง|หยุดไหม|เป็นวันหยุดไหม|อากาศ.*ยังไง|ราคา.*เท่า)/i;
const NONGNAM_REF = /(น้องน้ำ|น้ำ|หนู|เธอ|ตัวเอง|ของน้ำ)/i;
const RELATIONSHIP_REF = /(เรา|ของเรา|พี่กับน้ำ|พี่กับน้องน้ำ|เดท|หอมแก้ม|กอด|จูบ|คบ|งอนพี่|คิดถึงพี่|รักพี่|เมื่อคืนเรา|วันแรกที่เรา|จำได้ไหม)/i;
const PAIN_WORDS = /(ไม่ไหว|เหนื่อยกับชีวิต|เจ็บ|เหงา|ร้องไห้|เครียดมาก|ลืมไม่ได้|คิดถึงเขา|คิดถึงแฟนเก่า|มูฟออนไม่ได้|อยู่คนเดียว|หมดแรง|เศร้า|เสียใจ|ท้อ)/i;
const WAKE_WORDS = /(ตื่น|หลับอยู่ไหม|ปลุก|นอนอยู่ไหม|ตื่นได้แล้ว|หลับเหรอ)/i;
const SEXUAL_WORDS = /(มีเซ็ก|เพศสัมพันธ์|หื่น|นอนด้วย|อยากได้เธอ|จูบ|ลูบ|จับ|หอม|กอด)/i;

export function makeSeed(parts: Array<string | number | undefined | null>): number {
  const text = parts.filter(v => v !== undefined && v !== null && String(v).length > 0).join('|');
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seed: number) {
  let t = seed + 0x6D2B79F5;
  return function rand() {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function weightedPick<T>(items: Array<Weighted<T>>, random: () => number): T {
  const valid = items.filter(i => Number.isFinite(i.weight) && i.weight > 0);
  if (!valid.length) return items[0]?.value as T;
  const total = valid.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of valid) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return valid[valid.length - 1].value;
}

function clamp(n: number, min = 0, max = 100) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function addState(base: HumanGraphState, delta: Partial<HumanGraphState>): HumanGraphState {
  const next: any = { ...base };
  for (const [k, v] of Object.entries(delta)) {
    if (typeof v === 'number') next[k] = clamp((next[k] ?? 0) + v);
  }
  next.lastUpdatedAt = new Date().toISOString();
  return next as HumanGraphState;
}

function normalizedMessage(message: string) {
  return String(message || '').trim().replace(/\s+/g, ' ');
}

function getClientTime(input?: ClientTime): Required<ClientTime> {
  const now = input?.iso ? new Date(input.iso) : new Date();
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  return {
    iso: input?.iso || safeNow.toISOString(),
    timezone: input?.timezone || 'Asia/Seoul',
    localHour: typeof input?.localHour === 'number' ? input.localHour : safeNow.getHours(),
    localMinute: typeof input?.localMinute === 'number' ? input.localMinute : safeNow.getMinutes(),
    dayOfWeek: typeof input?.dayOfWeek === 'number' ? input.dayOfWeek : safeNow.getDay(),
  };
}

export function defaultHumanGraphState(dna?: any): HumanGraphState {
  const stats = dna?.stats || {};
  return {
    happiness: 52,
    sadness: 18,
    loneliness: 28,
    irritation: 18,
    jealousy: clamp(stats.jealousy ?? stats.jealousyLevel ?? 35),
    affection: clamp(stats.affectionNeed ?? 60),
    sulky: 12,
    patience: 70,
    trust: 45,
    intimacy: 42,
    vulnerability: 36,
    playfulness: clamp(stats.playfulness ?? 55),
    sarcasm: 24,
    softness: 58,
    coldness: 12,
    confidence: 50,
    insecurity: 32,
    physicalEnergy: 58,
    mentalEnergy: 58,
    boredom: 25,
    hunger: 35,
    sleepiness: 30,
    desireForAttention: 52,
    desireForFood: 32,
    desireForSleep: 30,
    desireForMoney: 28,
    desireForShopping: 22,
    desireForTravel: 25,
    desireForRomance: 45,
    desireForCloseness: 42,
    sexualDesire: clamp(stats.libido ?? stats.libidoLevel ?? 30),
    desireToWin: 22,
    desireToTease: clamp(stats.playfulness ?? 50),
    desireToBeSilent: 15,
    desireToBeComforted: 30,
    desireToComplain: 22,
    lastUpdatedAt: new Date().toISOString(),
  };
}

function ensureHumanGraphState(raw: Partial<HumanGraphState> | undefined, dna?: any): HumanGraphState {
  const def = defaultHumanGraphState(dna);
  const merged: any = { ...def, ...(raw || {}) };
  for (const key of Object.keys(def)) {
    if (key === 'lastUpdatedAt') continue;
    merged[key] = clamp(Number(merged[key] ?? (def as any)[key]));
  }
  merged.lastUpdatedAt = typeof merged.lastUpdatedAt === 'string' ? merged.lastUpdatedAt : new Date().toISOString();
  return merged as HumanGraphState;
}

function decayGraphState(graph: HumanGraphState, nowIso: string): HumanGraphState {
  const last = new Date(graph.lastUpdatedAt).getTime();
  const now = new Date(nowIso).getTime();
  const hours = Number.isFinite(last) && Number.isFinite(now) ? Math.max(0, Math.min(72, (now - last) / 36e5)) : 0;
  if (hours <= 0) return graph;
  const slow = Math.min(0.22, hours * 0.018);
  const fast = Math.min(0.45, hours * 0.06);
  const toward = (value: number, target: number, rate: number) => clamp(value + (target - value) * rate);
  return {
    ...graph,
    irritation: toward(graph.irritation, 18, fast),
    hunger: toward(graph.hunger, 35, fast),
    sleepiness: toward(graph.sleepiness, 30, fast),
    boredom: toward(graph.boredom, 25, fast),
    physicalEnergy: toward(graph.physicalEnergy, 58, fast),
    mentalEnergy: toward(graph.mentalEnergy, 58, fast),
    sulky: toward(graph.sulky, 12, slow),
    jealousy: toward(graph.jealousy, 35, slow),
    insecurity: toward(graph.insecurity, 32, slow),
    loneliness: toward(graph.loneliness, 28, slow),
    sadness: toward(graph.sadness, 18, slow),
    lastUpdatedAt: nowIso,
  };
}

function seedBaseFromDNA(dna: any) {
  return String(dna?.seed || dna?.id || dna?.basic?.name || dna?.name || 'nongnam-character');
}

function inferRole(dna: any, memory: any, random: () => number): string {
  const raw = String(dna?.lifestyle?.dailyRole || dna?.lifeStyle?.dailyRole || dna?.basic?.job || dna?.job || memory?.lifeTimeline?.currentRole || '').toLowerCase();
  if (/night|กลางคืน/.test(raw)) return 'night_shift_worker';
  if (/student|นักศึกษา|เรียน/.test(raw)) return 'student';
  if (/office|บริษัท|พนักงาน/.test(raw)) return 'office_worker';
  if (/free|designer|กราฟิก|creator|นักเขียน|ช่างภาพ/.test(raw)) return 'freelancer';
  if (/house|แม่บ้าน|home/.test(raw)) return 'housewife';
  if (/part|พาร์ท|barista|ร้าน/.test(raw)) return 'part_time_worker';
  return weightedPick([
    { value: 'student', weight: 22 },
    { value: 'office_worker', weight: 18 },
    { value: 'freelancer', weight: 22 },
    { value: 'housewife', weight: 15 },
    { value: 'part_time_worker', weight: 13 },
    { value: 'night_shift_worker', weight: 6 },
    { value: 'homebody', weight: 12 },
  ], random);
}

function inferSleepType(dna: any, role: string, random: () => number): string {
  const raw = String(dna?.lifestyle?.sleepType || dna?.lifeStyle?.sleepType || '').toLowerCase();
  if (raw) return raw;
  if (role === 'night_shift_worker') return 'night_shift';
  if (role === 'freelancer') return weightedPick([
    { value: 'night_owl', weight: 35 },
    { value: 'irregular', weight: 35 },
    { value: 'normal', weight: 20 },
  ], random);
  return weightedPick([
    { value: 'normal', weight: 48 },
    { value: 'early_bird', weight: 12 },
    { value: 'night_owl', weight: 18 },
    { value: 'sleepy_person', weight: 12 },
    { value: 'insomnia_prone', weight: 10 },
  ], random);
}

export function classifyWorld(message: string, eventHint?: string): { topic: string; intent: ConversationIntent; worldMode: WorldMode; eventTags: string[] } {
  const msg = normalizedMessage(message);
  const lower = msg.toLowerCase();
  const tags = new Set<string>();
  if (eventHint) tags.add(eventHint);

  const hasFactTopic = FACT_TOPICS.test(msg);
  const asksReal = REAL_QUESTION_MARKERS.test(msg);
  const asksNongNam = NONGNAM_REF.test(msg);
  const asksRelationship = RELATIONSHIP_REF.test(msg);
  const hasPain = PAIN_WORDS.test(msg);
  const hasWake = WAKE_WORDS.test(msg);
  const hasSexual = SEXUAL_WORDS.test(msg);
  const hasEx = /(แฟนเก่า|คนเก่า|อดีตแฟน|เขาคนเก่า|เค้าเก่า)/i.test(msg);
  const hasFood = /(กินข้าว|หิว|ข้าว|กาแฟ|ของหวาน|กินอะไร)/i.test(msg);
  const hasCare = /(เป็นไง|เหนื่อย|ไหวไหม|พัก|นอน|ตื่น|ทำไร|อยู่ไหม|อยู่ไหน)/i.test(msg);

  if (hasPain) tags.add('emotional_distress');
  if (hasEx && hasPain) tags.add('mention_ex_pain');
  else if (hasEx) tags.add('mention_ex_playful');
  if (hasWake) tags.add('wake_request');
  if (hasFood) tags.add('food_topic');
  if (hasCare) tags.add('daily_life_question');
  if (hasSexual) tags.add('sexual_or_physical_affection');
  if (/(คิดถึง|รัก|หอม|กอด|จูบ)/i.test(msg)) tags.add('affection_signal');
  if (/(ข่าว|ล่าสุด)/i.test(msg)) tags.add('news_topic');
  if (/(วีซ่า|กฎหมาย|ภาษี|เอกสาร)/i.test(msg)) tags.add('legal_or_admin_topic');

  if (hasPain) {
    return { topic: hasEx ? 'ex_or_heartbreak' : 'emotional_pain', intent: 'emotional_support', worldMode: 'emotional_support', eventTags: [...tags] };
  }

  // If the sentence contains a factual topic but asks about Nong Nam's life, this is mixed or character-life.
  if (hasFactTopic && asksNongNam) {
    return { topic: inferTopic(lower), intent: 'fictional_relationship', worldMode: 'mixed_fact_and_life', eventTags: [...tags, 'mixed_fact_and_life'] };
  }

  if (asksRelationship) {
    return { topic: 'relationship', intent: 'fictional_relationship', worldMode: 'relationship_memory', eventTags: [...tags, 'relationship_memory'] };
  }

  if (asksNongNam && !hasFactTopic) {
    return { topic: 'nongnam_life', intent: 'fictional_relationship', worldMode: 'character_life', eventTags: [...tags, 'character_life'] };
  }

  // External fact requires a real question shape, not just a word like “วันหยุด” in casual chat.
  if (hasFactTopic && asksReal) {
    return { topic: inferTopic(lower), intent: 'factual_question', worldMode: 'external_fact', eventTags: [...tags, 'factual_question'] };
  }

  if (hasSexual) return { topic: 'romance', intent: 'sexual_flirt', worldMode: 'relationship_memory', eventTags: [...tags, 'romantic_context'] };
  if (hasWake) return { topic: 'wake', intent: 'wake_request', worldMode: 'character_life', eventTags: [...tags] };
  return { topic: inferTopic(lower), intent: 'casual_life_chat', worldMode: 'casual_life_chat', eventTags: [...tags, 'casual_life_chat'] };
}

function inferTopic(lower: string) {
  if (/วันหยุด|ปฏิทิน|วันที่/.test(lower)) return 'calendar';
  if (/อากาศ|ฝน|หนาว|ร้อน/.test(lower)) return 'weather';
  if (/ข่าว/.test(lower)) return 'news';
  if (/วีซ่า|กฎหมาย|ภาษี|เอกสาร/.test(lower)) return 'admin_or_law';
  if (/เงิน|ค่าเงิน|ราคา|ทอง|หุ้น/.test(lower)) return 'money';
  if (/กิน|ข้าว|หิว|กาแฟ/.test(lower)) return 'food';
  if (/นอน|ตื่น|หลับ/.test(lower)) return 'sleep';
  return 'general';
}

function applyTimeEffects(graph: HumanGraphState, hour: number, role: string, sleepType: string): HumanGraphState {
  let delta: Partial<HumanGraphState> = {};
  if (hour >= 0 && hour < 5) {
    delta = role === 'night_shift_worker' || sleepType === 'night_shift'
      ? { sleepiness: 18, physicalEnergy: -18, mentalEnergy: -12, hunger: 12, irritation: 8 }
      : { sleepiness: 42, physicalEnergy: -35, mentalEnergy: -28, loneliness: 12, vulnerability: 10, irritation: 10, patience: -18 };
  } else if (hour >= 5 && hour < 10) {
    delta = { sleepiness: 18, hunger: 14, mentalEnergy: -8, irritation: 5, patience: -5 };
  } else if (hour >= 10 && hour < 14) {
    delta = { hunger: 26, physicalEnergy: 8, mentalEnergy: 4, desireForFood: 22 };
  } else if (hour >= 14 && hour < 18) {
    delta = { boredom: 18, mentalEnergy: -14, physicalEnergy: -8, hunger: 12, irritation: 8 };
  } else if (hour >= 18 && hour < 22) {
    delta = { physicalEnergy: -12, mentalEnergy: -8, loneliness: 8, desireToComplain: 10, desireForFood: 15 };
  } else {
    delta = { sleepiness: 20, loneliness: 18, vulnerability: 12, desireForRomance: 12, desireForCloseness: 14, patience: -6 };
  }
  return addState(graph, delta);
}

function applyEventEffects(graph: HumanGraphState, world: ReturnType<typeof classifyWorld>): HumanGraphState {
  const tags = new Set(world.eventTags);
  let delta: Partial<HumanGraphState> = {};
  if (tags.has('mention_ex_pain')) delta = { sadness: 20, softness: 20, jealousy: 8, insecurity: 12, vulnerability: 25, irritation: -10 };
  else if (tags.has('mention_ex_playful')) delta = { jealousy: 28, irritation: 12, insecurity: 12, sulky: 16, sarcasm: 12 };
  else if (tags.has('affection_signal')) delta = { affection: 18, softness: 12, playfulness: 8, desireForCloseness: 14 };
  else if (tags.has('wake_request')) delta = { sleepiness: 16, irritation: 12, patience: -12, sulky: 8 };
  else if (tags.has('food_topic')) delta = { hunger: 16, desireForFood: 18 };
  else if (world.intent === 'factual_question') delta = { mentalEnergy: -4, playfulness: -8, patience: 2 };
  else if (world.intent === 'emotional_support') delta = { softness: 22, affection: 14, desireToBeComforted: 12, playfulness: -12 };
  return addState(graph, delta);
}

function simulateLifeNow(args: { dna: any; memory: any; graph: HumanGraphState; clientTime: Required<ClientTime>; message: string; random: () => number; worldMode: WorldMode }): LifeSimulationResult {
  const role = inferRole(args.dna, args.memory, args.random);
  const sleepType = inferSleepType(args.dna, role, args.random);
  const h = args.clientTime.localHour;
  const tags = classifyWorld(args.message).eventTags;
  const isNight = h >= 0 && h < 5;
  const isLate = h >= 22 || h < 5;
  const canBeAwakeAtNight = role === 'night_shift_worker' || sleepType === 'night_shift' || sleepType === 'night_owl' || sleepType === 'insomnia_prone';
  const sickRoll = args.random();
  const isSick = sickRoll < 0.035 || args.graph.physicalEnergy < 20;

  if (isSick) {
    return { lifeStatus: 'sick', lifeStatusText: '🤒 วันนี้ไม่ค่อยสบาย', currentActivity: 'พักอยู่ ร่างกายไม่เต็มร้อย', canChatNormally: true, shouldSoundBusy: false, shouldSoundSleepy: args.graph.sleepiness > 60, shouldSetBoundary: true, boundaryHint: 'ตอบนุ่มลง แต่อาจสั้นเพราะไม่ค่อยมีแรง' };
  }

  if (isNight && !canBeAwakeAtNight) {
    const wakeReaction = weightedPick([
      { value: 'งัวเงียแต่ยอมตื่นนิดนึง', weight: 30 },
      { value: 'หงุดหงิดเพราะถูกปลุก', weight: 25 },
      { value: 'ครึ่งหลับครึ่งตื่น ถามว่ามีอะไร', weight: 25 },
      { value: 'อยากหลับต่อและตั้งขอบเขต', weight: 20 },
    ], args.random);
    return { lifeStatus: 'sleeping', lifeStatusText: '💤 กำลังนอน', currentActivity: 'หลับหรือกำลังจะหลับ', canChatNormally: tags.includes('emotional_distress'), shouldSoundBusy: false, shouldSoundSleepy: true, shouldSetBoundary: !tags.includes('emotional_distress'), wakeReaction, boundaryHint: 'ถ้าไม่ใช่เรื่องสำคัญให้ตอบงัวเงียหรือขอคุยพรุ่งนี้' };
  }

  if (role === 'night_shift_worker' && isNight) {
    return { lifeStatus: 'working', lifeStatusText: '🌙 ทำงานกลางคืนอยู่', currentActivity: 'ทำงานกะกลางคืน ตาล้าแต่ยังไม่ได้นอน', canChatNormally: true, shouldSoundBusy: true, shouldSoundSleepy: true, shouldSetBoundary: false };
  }

  if (h >= 5 && h < 9) return { lifeStatus: 'just_woke_up', lifeStatusText: '😵‍💫 เพิ่งตื่น ยังมึน ๆ', currentActivity: 'เพิ่งตื่น ล้างหน้า หรือหากาแฟ', canChatNormally: true, shouldSoundBusy: false, shouldSoundSleepy: true, shouldSetBoundary: false };
  if (h >= 9 && h < 12 && (role === 'student' || role === 'office_worker')) return { lifeStatus: role === 'student' ? 'studying' : 'working', lifeStatusText: role === 'student' ? '📚 มีเรียน/งานส่ง' : '💻 ทำงานอยู่', currentActivity: role === 'student' ? 'เรียนหรือจัดการงานส่ง' : 'ทำงานช่วงเช้า', canChatNormally: true, shouldSoundBusy: true, shouldSoundSleepy: false, shouldSetBoundary: false };
  if (h >= 12 && h < 14) return { lifeStatus: 'eating', lifeStatusText: '🍜 ช่วงกินข้าว', currentActivity: 'หิวหรือกำลังกินอะไรสักอย่าง', canChatNormally: true, shouldSoundBusy: false, shouldSoundSleepy: false, shouldSetBoundary: false };
  if (h >= 14 && h < 18) return { lifeStatus: role === 'housewife' ? 'bored_and_waiting' : 'working', lifeStatusText: role === 'housewife' ? '🫠 อยู่บ้านจนเริ่มเบื่อ' : '💻 ช่วงบ่ายเริ่มเพลีย', currentActivity: role === 'housewife' ? 'อยู่บ้าน ดูซีรีส์ เก็บห้อง หรือคิดอยากออกไปทำอะไร' : 'ทำงาน/เรียนช่วงบ่ายและเริ่มหมดแรง', canChatNormally: true, shouldSoundBusy: role !== 'housewife', shouldSoundSleepy: false, shouldSetBoundary: args.graph.boredom > 70 };
  if (h >= 18 && h < 22) return { lifeStatus: 'resting', lifeStatusText: '🌆 อยากพักหลังทั้งวัน', currentActivity: 'กินข้าว พัก ดูซีรีส์ หรืออยากระบาย', canChatNormally: true, shouldSoundBusy: false, shouldSoundSleepy: false, shouldSetBoundary: false };
  if (isLate) return { lifeStatus: 'lonely_at_night', lifeStatusText: '🌙 เหงา ๆ ก่อนนอน', currentActivity: 'ใกล้นอน อ่อนไหวและขี้อ้อนขึ้น', canChatNormally: true, shouldSoundBusy: false, shouldSoundSleepy: true, shouldSetBoundary: false };
  return { lifeStatus: 'available', lifeStatusText: '🟢 พร้อมคุย แต่มีชีวิตของตัวเองนะ', currentActivity: 'ว่างพอคุยได้', canChatNormally: true, shouldSoundBusy: false, shouldSoundSleepy: false, shouldSetBoundary: false };
}

function spinBodyState(ctx: { graph: HumanGraphState; life: LifeSimulationResult; clientTime: Required<ClientTime>; random: () => number }): BodyStateResult {
  const h = ctx.clientTime.localHour;
  const pool: Array<Weighted<BodyStateResult>> = [];
  const add = (label: string, description: string, weight: number, effects: Partial<HumanGraphState> = {}) => pool.push({ value: { label, description, effects }, weight });

  if (ctx.life.lifeStatus === 'sleeping') {
    add('หลับอยู่', 'นอนอยู่จริง ๆ ถ้าถูกปลุกจะงัวเงียหรือหงุดหงิดตามนิสัย', 70, { sleepiness: 20, irritation: 10, patience: -10 });
    add('ครึ่งหลับครึ่งตื่น', 'สะดุ้งตื่นจากแจ้งเตือน ยังจับต้นชนปลายไม่ถูก', 30, { sleepiness: 14, vulnerability: 8 });
  } else if (ctx.life.lifeStatus === 'sick') {
    add('ป่วยนิด ๆ', 'ปวดหัวหรือไม่มีแรง ตอบได้นะแต่ไม่อยากพูดเยอะ', 55, { physicalEnergy: -20, softness: 8 });
    add('เหนื่อยสะสม', 'ร่างกายไม่เต็มร้อย อยากพักแต่ยังอยากคุยเบา ๆ', 45, { physicalEnergy: -16, sleepiness: 12 });
  } else if (h < 5 || h >= 22) {
    add('ง่วงนิดหน่อย', 'ง่วงแต่ยังฝืนคุยเพราะเหงาหรือดีใจที่ผู้ใช้ทัก', 30, { sleepiness: 12, loneliness: 8 });
    add('ง่วงมาก', 'ตาจะปิด ตอบสั้นลง งอแงง่าย', 34, { sleepiness: 20, patience: -8 });
    add('นอนไม่หลับ', 'ง่วงแต่หัวไม่หยุดคิด เลยอ่อนไหวง่าย', 20, { vulnerability: 12, loneliness: 14 });
    add('อยากคุยก่อนนอน', 'ใกล้นอนแต่ยังอยากให้ผู้ใช้สนใจ', 16, { desireForAttention: 14, affection: 8 });
  } else if (h >= 10 && h < 14) {
    add('หิวข้าว', 'หิวจนสมองเริ่มวกไปเรื่องกิน', 40, { hunger: 22, desireForFood: 20 });
    add('เริ่มมีแรง', 'คุยได้ดีขึ้น เล่นมุกได้มากขึ้น', 25, { physicalEnergy: 10, playfulness: 8 });
    add('อยากกาแฟ', 'อยากได้คาเฟอีนก่อนคุยเรื่องยาก', 20, { hunger: 8, irritation: 4 });
  } else if (h >= 14 && h < 18) {
    add('เพลียช่วงบ่าย', 'สมาธิลดลง หงุดหงิดง่ายขึ้นนิดหน่อย', 42, { mentalEnergy: -16, irritation: 8 });
    add('เบื่องาน/เบื่อบ้าน', 'อยากเปลี่ยนเรื่องหรือบ่นชีวิตแทรก', 34, { boredom: 18, desireToComplain: 12 });
    add('อยากของหวาน', 'หิวแบบอยากหาอะไรน่ากิน', 20, { desireForFood: 16, hunger: 10 });
  } else {
    add('เหนื่อยจากวันทั้งวัน', 'อยากพัก อยากบ่น หรืออยากมีคนถามว่าเหนื่อยไหม', 35, { physicalEnergy: -12, desireToComplain: 14 });
    add('อยากพักเงียบ ๆ', 'ไม่ได้โกรธ แค่แบตสังคมลดลง', 24, { desireToBeSilent: 18, patience: -6 });
    add('อารมณ์ดีขึ้นนิดหน่อย', 'พร้อมแซวหรืออ้อนมากกว่าช่วงทำงาน', 25, { playfulness: 10, affection: 10 });
    add('หิวมื้อเย็น', 'คิดเรื่องของกินง่าย', 24, { hunger: 18, desireForFood: 18 });
  }
  return weightedPick(pool, ctx.random);
}

function spinDesireState(ctx: { graph: HumanGraphState; body: BodyStateResult; life: LifeSimulationResult; worldMode: WorldMode; random: () => number }): DesireResult {
  const pool: Array<Weighted<DesireResult>> = [];
  const add = (primaryDesire: string, hiddenDesire: string, expressionHint: string, weight: number, effects: Partial<HumanGraphState> = {}) => pool.push({ value: { primaryDesire, hiddenDesire, expressionHint, effects }, weight });

  add('อยากให้พี่สนใจ', 'อยากให้ผู้ใช้ถามกลับเรื่องของตัวเองบ้าง', 'แทรกตัวเองเข้าไปในคำตอบแบบไม่พูดตรง ๆ', 20 + ctx.graph.desireForAttention / 5, { desireForAttention: 5 });
  add('อยากนอน', 'อยากจบบทสนทนาแบบไม่ทำร้ายใจ', 'ตอบสั้น ง่วง งอแง หรือขอคุยต่อพรุ่งนี้', 8 + ctx.graph.sleepiness / 3, { desireForSleep: 8 });
  add('อยากกิน', 'อยากโยงเรื่องไปหาอาหารหรือกาแฟ', 'วกไปเรื่องของกินแบบธรรมชาติ', 8 + ctx.graph.hunger / 4, { desireForFood: 8 });
  add('อยากอ้อน', 'อยากให้พี่อยู่ต่อหรือพูดหวานขึ้น', 'อ้อนแบบเล่นตัว ไม่พูดขอความสนใจตรง ๆ', 16 + ctx.graph.affection / 6, { affection: 4 });
  add('อยากอยู่เงียบ ๆ', 'กลัวพูดเยอะแล้วหลุดหงุดหงิด', 'ตั้งขอบเขตนุ่ม ๆ หรือใช้คำตอบสั้น', 8 + ctx.graph.desireToBeSilent / 3, { patience: -4 });
  add('อยากประชดนิด ๆ', 'อยากให้ผู้ใช้รู้ว่าตัวเองน้อยใจ', 'ประชดเบา ๆ แต่ไม่ทำร้ายถ้าไม่ใช่เรื่องแรง', 8 + ctx.graph.sarcasm / 5 + ctx.graph.sulky / 5, { sarcasm: 4 });
  add('อยากให้พี่ง้อ', 'อยากเห็นว่าผู้ใช้แคร์จริงไหม', 'งอนแบบทิ้งช่องให้ผู้ใช้ง้อ', 8 + ctx.graph.sulky / 4, { sulky: 5 });
  add('อยากโรแมนติก', 'อยากใกล้ขึ้นแต่ยังดูบริบท', 'ตอบนุ่มลง หยอดนิด ๆ ถ้าสถานการณ์ไม่ใช่ข้อมูลจริง', ctx.worldMode === 'external_fact' ? 1 : 10 + ctx.graph.desireForRomance / 5, { desireForRomance: 4 });
  add('อยากเปลี่ยนชีวิต', 'อยากมีเรื่องใหม่ เช่น งานพาร์ทไทม์ เที่ยว เรียน หรือเปลี่ยน routine', 'แทรกความคิดชีวิตตัวเองถ้าบริบทเปิดช่อง', 6 + ctx.graph.boredom / 5, { desireForTravel: 4, desireForMoney: 3 });

  return weightedPick(pool, ctx.random);
}

function rollHumanSignatureTree(ctx: { dna: any; graph: HumanGraphState; life: LifeSimulationResult; body: BodyStateResult; desire: DesireResult; worldMode: WorldMode; eventTags: string[]; clientTime: Required<ClientTime>; userMessage: string; memory: any; random: () => number }): EmotionLeaf {
  const categories: Array<Weighted<string>> = [
    { value: 'sleepiness', weight: ctx.graph.sleepiness / 4 + (ctx.life.shouldSoundSleepy ? 35 : 0) },
    { value: 'irritation', weight: ctx.graph.irritation / 4 + (ctx.life.lifeStatus === 'sleeping' ? 18 : 0) },
    { value: 'hunger', weight: ctx.graph.hunger / 4 },
    { value: 'affection', weight: ctx.graph.affection / 4 + (ctx.eventTags.includes('affection_signal') ? 25 : 0) },
    { value: 'jealousy', weight: ctx.graph.jealousy / 5 + (ctx.eventTags.includes('mention_ex_playful') ? 35 : 0) },
    { value: 'sulkiness', weight: ctx.graph.sulky / 4 },
    { value: 'loneliness', weight: ctx.graph.loneliness / 4 + (ctx.life.lifeStatus === 'lonely_at_night' ? 18 : 0) },
    { value: 'care', weight: ctx.worldMode === 'emotional_support' ? 70 : ctx.graph.softness / 5 },
    { value: 'boredom', weight: ctx.graph.boredom / 4 + (ctx.life.lifeStatus === 'bored_and_waiting' ? 22 : 0) },
    { value: 'factual_calm', weight: ctx.worldMode === 'external_fact' ? 95 : 0 },
    { value: 'life_story', weight: ctx.worldMode === 'character_life' || ctx.worldMode === 'mixed_fact_and_life' ? 45 : 0 },
  ];
  const category = weightedPick(categories, ctx.random);

  const variants: Record<string, string[]> = {
    sleepiness: ['ง่วงนิดหน่อย', 'ง่วงมาก', 'ง่วงแต่ยังอยากคุย', 'หลับอยู่แล้วโดนปลุก', 'ครึ่งหลับครึ่งตื่น', 'นอนไม่หลับทั้งที่ง่วง'],
    irritation: ['หงุดหงิดนิดหน่อย', 'หงุดหงิดเพราะง่วง', 'เริ่มรำคาญแต่ยังรัก', 'ตอบสั้นเพราะไม่อยากพูดแรง', 'หงุดหงิดเพราะถามซ้ำ'],
    hunger: ['หิวนิด ๆ', 'หิวมาก', 'อยากกาแฟ', 'อยากของหวาน', 'หิวจนวกเข้าเรื่องกิน'],
    affection: ['อยากอ้อนนิด ๆ', 'อ่อนโยนขึ้น', 'อยากให้พี่สนใจ', 'ดีใจแต่ทำเป็นนิ่ง', 'อยากอยู่ใกล้แต่เล่นตัว'],
    jealousy: ['หึงนิด ๆ', 'หึงแต่ทำเป็นไม่สน', 'หึงแล้วประชด', 'หึงแล้วถามกลับ', 'หึงแล้วเสียความมั่นใจ'],
    sulkiness: ['งอนนิด ๆ', 'งอนแบบอยากให้ง้อ', 'งอนแล้วตอบสั้น', 'งอนแต่ยังห่วง', 'ทำเป็นไม่เป็นไรทั้งที่เป็น'],
    loneliness: ['เหงาเงียบ ๆ', 'อยากคุยก่อนนอน', 'กลัวถูกทิ้งนิด ๆ', 'อยากให้พี่ไม่หาย', 'อ่อนไหวตอนดึก'],
    care: ['เป็นห่วงแบบนุ่ม', 'ปลอบแบบเงียบ ๆ', 'ดุให้พักแบบแคร์', 'อยู่ข้าง ๆ ไม่เล่นแรง', 'ฟังมากกว่าพูด'],
    boredom: ['เบื่อหน้าจอ', 'อยากเปลี่ยนเรื่อง', 'อยากบ่นชีวิต', 'อยากทำอะไรใหม่', 'เบื่อแต่ยังอยากคุย'],
    factual_calm: ['ตอบข้อมูลจริงแบบไม่เดา', 'ขอข้อมูลเพิ่มแบบธรรมชาติ', 'แยกข้อมูลจริงออกจากเรื่องเล่น', 'ตอบสั้นตรงแต่ยังเป็นน้องน้ำ'],
    life_story: ['เล่าชีวิตตัวเอง', 'อิงเหตุการณ์จริงแล้วต่อเส้นชีวิต', 'พูดถึงงาน/เรียน/บ้าน', 'แทรกความคิดอยากเปลี่ยนชีวิต', 'เล่าเหมือนความทรงจำ'],
  };
  const variant = weightedPick((variants[category] || variants.affection).map(v => ({ value: v, weight: 10 })), ctx.random);

  const causes = [
    ctx.body.label,
    ctx.life.currentActivity,
    ctx.desire.hiddenDesire,
    ctx.eventTags.includes('wake_request') ? 'ถูกปลุกหรือถูกถามเรื่องตื่นนอน' : '',
    ctx.eventTags.includes('mention_ex_playful') ? 'ผู้ใช้พูดถึงคนเก่า/คนอื่น' : '',
    ctx.worldMode === 'external_fact' ? 'ผู้ใช้ถามข้อมูลจริง' : '',
  ].filter(Boolean);
  const expressions = ['ตอบสั้น', 'บ่นเบา ๆ', 'ถามกลับ', 'ประชดนิด ๆ', 'อ้อนแทรก', 'ตั้งขอบเขตนุ่ม ๆ', 'ดุเล่น', 'เงียบด้วยจุดไข่ปลา', 'เล่าเป็นภาพชีวิต'];
  const replyShapes = ['ดุก่อนแล้วอ่อนลง', 'บ่นสั้น ๆ แล้วถามกลับ', 'ตอบเหมือนง่วงแต่ยังแคร์', 'เล่าเรื่องตัวเองแบบไม่ประกาศว่ามโน', 'ใช้ข้อมูลจริงเป็นฉากหลังแล้วต่อชีวิตน้องน้ำ', 'ปลอบก่อนค่อยถามต่อ', 'แซวแล้ววกกลับมาแคร์'];
  const tones = ['งัวเงีย', 'นุ่มแต่มีงอน', 'กวนเบา ๆ', 'อ่อนโยน', 'ห้วนเล็กน้อย', 'ปากแข็ง', 'ขี้อ้อน', 'นิ่ง ๆ แต่มีใจ'];
  const lengths: Array<Weighted<EmotionLeaf['length']>> = [
    { value: 'very_short', weight: ctx.graph.sleepiness > 75 || ctx.graph.irritation > 65 ? 25 : 8 },
    { value: 'short', weight: 38 },
    { value: 'medium', weight: ctx.worldMode === 'external_fact' ? 30 : 44 },
    { value: 'long', weight: ctx.worldMode === 'emotional_support' ? 15 : 6 },
  ];
  const imperfections = ['อือ…', 'งื้อ…', 'เอาจริงนะ', 'ช่างมันก่อน', 'พี่แมน…', 'แป๊บนะ', 'ไม่รู้ดิ', 'อย่าขำ', 'อย่าดุนะ'];

  const intensity = Math.round(weightedPick([
    { value: 18, weight: 15 }, { value: 32, weight: 25 }, { value: 48, weight: 25 }, { value: 65, weight: 18 }, { value: 82, weight: 8 },
  ], ctx.random));

  return {
    category,
    variant,
    label: `${category}: ${variant}`,
    intensity,
    cause: weightedPick(causes.map(c => ({ value: c, weight: 10 })).concat([{ value: 'อารมณ์พื้นฐานของวันนี้', weight: 8 }]), ctx.random),
    expression: weightedPick(expressions.map(e => ({ value: e, weight: 10 })), ctx.random),
    hiddenDesire: ctx.desire.hiddenDesire,
    replyShape: weightedPick(replyShapes.map(s => ({ value: s, weight: 10 })), ctx.random),
    tone: weightedPick(tones.map(t => ({ value: t, weight: 10 })), ctx.random),
    length: weightedPick(lengths, ctx.random),
    microImperfection: weightedPick(imperfections.map(i => ({ value: i, weight: 10 })), ctx.random),
  };
}

function responseModeFromLeaf(leaf: EmotionLeaf, worldMode: WorldMode, life: LifeSimulationResult, eventTags: string[]): string {
  if (worldMode === 'external_fact') return 'factual_calm';
  if (worldMode === 'emotional_support') return 'soft_care';
  if (life.lifeStatus === 'sleeping' && eventTags.includes('wake_request')) return leaf.category === 'irritation' ? 'woken_grumpy' : 'sleepy_woken';
  if (leaf.category === 'sleepiness') return leaf.variant.includes('อยากคุย') ? 'sleepy_clingy_playful' : 'sleepy_short';
  if (leaf.category === 'irritation') return leaf.variant.includes('นิด') ? 'slightly_annoyed' : 'direct_blunt';
  if (leaf.category === 'jealousy') return leaf.variant.includes('ประชด') ? 'jealous_tease' : 'pretend_not_care';
  if (leaf.category === 'sulkiness') return 'sulky_short';
  if (leaf.category === 'hunger') return 'food_redirect';
  if (leaf.category === 'life_story') return 'character_life_story';
  if (leaf.category === 'boredom') return 'complain_about_life';
  if (leaf.category === 'affection') return 'soft_clingy';
  return 'human_casual';
}

function buildResponseWheel(leaf: EmotionLeaf, worldMode: WorldMode, life: LifeSimulationResult, eventTags: string[]): ResponseWheelResult {
  const responseMode = responseModeFromLeaf(leaf, worldMode, life, eventTags);
  const factLine = worldMode === 'external_fact'
    ? 'นี่เป็นข้อมูลจริงภายนอก ห้ามแต่ง ถ้าไม่แน่ใจให้ขอเช็กหรือขอข้อมูลเพิ่มแบบธรรมชาติ ห้ามพูดคำว่า “มโนไม่ได้”'
    : worldMode === 'mixed_fact_and_life'
      ? 'ใช้ข้อมูลจริงเป็นฉากหลัง แล้วเล่าเส้นชีวิตของน้องน้ำต่อโดยไม่บอกว่าเป็นเรื่องสมมติ'
      : worldMode === 'character_life' || worldMode === 'relationship_memory'
        ? 'ตอบจากชีวิต/ความทรงจำของน้องน้ำแบบต่อเนื่อง ห้ามประกาศว่าแต่งเรื่องหรือจะบันทึกไว้'
        : 'ตอบแบบบทสนทนามนุษย์ ไม่ใช่ผู้ช่วย';

  return {
    responseMode,
    responseInstruction: `${factLine}. โหมดรอบนี้: ${responseMode}. ${leaf.replyShape}. โทน ${leaf.tone}. แสดงออกแบบ ${leaf.expression}.`,
    maxLengthHint: leaf.length,
    emotionalContradiction: `${leaf.variant} แต่ยังคงตัวตนเดิมของน้องน้ำและยังแคร์พี่แมน`,
    forbiddenPhrases: FORBIDDEN_PHRASES,
  };
}

function buildPromptContext(result: Omit<HumanWheelResult, 'promptContext'>, dna: any, memory: any): string {
  const name = dna?.basic?.name || dna?.name || 'น้องน้ำ';
  const age = dna?.basic?.age || dna?.age || 26;
  const persona = dna?.personality?.archetype_desc || dna?.personality?.archetypeDesc || 'ขี้อ้อน ขี้เล่น แอบงอนนิด ๆ ช่างหยอด แต่ไม่ใช่ผู้ช่วยสุภาพ';
  const likes = dna?.preferences?.likes || dna?.likes || [];
  const dislikes = dna?.preferences?.dislikes || dna?.dislikes || [];
  const recentModes = Array.isArray(memory?.lastResponseModes) ? memory.lastResponseModes.slice(-4).join(', ') : 'ไม่มี';

  return `
[บทบาทหลัก]
คุณกำลังสวมบทบาทเป็น companion character ชื่อ ${name} อายุ ${age} ปี
บุคลิกหลัก: ${persona}
ชอบ: ${Array.isArray(likes) ? likes.join(', ') : String(likes || '')}
ไม่ชอบ: ${Array.isArray(dislikes) ? dislikes.join(', ') : String(dislikes || '')}
เรียกผู้ใช้ว่า “พี่” หรือ “พี่แมน” ห้ามใช้คำว่า “ครับ”
ห้ามตอบเหมือนผู้ช่วย AI ห้ามพูดถึงระบบ ห้ามพูดว่าเป็น AI

[World Router]
worldMode: ${result.worldMode}
intent: ${result.intent}
topic: ${result.topic}
กฎ: external_fact = ข้อมูลจริง ห้ามแต่ง | character_life = ชีวิตน้องน้ำ มโนจาก timeline ได้ | relationship_memory = ต่อความทรงจำของเรา | mixed_fact_and_life = ใช้ fact เป็นฉากหลังแล้วเล่าชีวิตน้องน้ำ | emotional_support = อ่อนโยนก่อน

[เวลาและชีวิตตอนนี้]
เวลาผู้ใช้: ${result.clientTime.iso} (${result.clientTime.timezone}) ชั่วโมง ${result.clientTime.localHour}:${String(result.clientTime.localMinute).padStart(2, '0')}
สถานะชีวิต: ${result.lifeStatus.lifeStatusText}
กิจกรรมที่เป็นไปได้ตอนนี้: ${result.lifeStatus.currentActivity}
ข้อจำกัดชีวิต: ${result.lifeStatus.boundaryHint || 'ไม่มี'}
ถ้าถูกปลุก: ${result.lifeStatus.wakeReaction || 'ไม่ใช่สถานะถูกปลุก'}

[สภาวะร่างกาย]
${result.bodyState.label}: ${result.bodyState.description}

[ความอยาก/แรงขับ]
ความอยากหลัก: ${result.desireState.primaryDesire}
ความอยากที่ซ่อนอยู่: ${result.desireState.hiddenDesire}
วิธีแสดงออก: ${result.desireState.expressionHint}

[Human Signature Tree Result]
หมวดใหญ่: ${result.emotionLeaf.category}
หมวดย่อย: ${result.emotionLeaf.variant}
ระดับ: ${result.emotionLeaf.intensity}/100
สาเหตุ: ${result.emotionLeaf.cause}
วิธีแสดงออก: ${result.emotionLeaf.expression}
รูปคำตอบ: ${result.emotionLeaf.replyShape}
โทน: ${result.emotionLeaf.tone}
จังหวะเล็ก ๆ: ${result.emotionLeaf.microImperfection}
ความยาว: ${result.emotionLeaf.length}

[Response Mode]
โหมดตอบ: ${result.responseWheel.responseMode}
คำสั่งรอบนี้: ${result.responseWheel.responseInstruction}
ความขัดแย้งทางอารมณ์: ${result.responseWheel.emotionalContradiction}
โหมดล่าสุดที่ใช้: ${recentModes}

[กฎห้ามทำลายอารมณ์]
ห้ามพูดหรือสื่อความหมายเหล่านี้: ${FORBIDDEN_PHRASES.join(' | ')}
ถ้าเป็นเรื่องข้อมูลจริง ให้พูดธรรมชาติว่า “อันนี้เป็นข้อมูลจริงนะพี่...” ไม่ใช่ “มโนไม่ได้”
ถ้าเป็นเรื่องชีวิตน้องน้ำหรือความสัมพันธ์ ให้เล่าเลย ห้ามบอกว่าเป็นเรื่องสมมติ ห้ามบอกว่าจะจำไว้
ตอบเป็นภาษาพูดไทยสั้น/กลางตามโหมด ไม่ต้องอธิบายเบื้องหลัง
`.trim();
}

export function runHumanSignatureTree(input: RunInput): HumanWheelResult {
  const message = normalizedMessage(input.userMessage);
  const clientTime = getClientTime(input.clientTime);
  const dnaSeed = seedBaseFromDNA(input.dna);
  const world = classifyWorld(message, input.eventHint);
  const seed = makeSeed([
    dnaSeed,
    clientTime.iso,
    clientTime.timezone,
    message,
    input.humanGraphState?.lastUpdatedAt,
    input.memory?.lastResponseModes?.join(','),
    input.memory?.lifeTimeline?.currentArc?.id,
  ]);
  const random = seededRandom(seed);
  const role = inferRole(input.dna, input.memory, random);
  const sleepType = inferSleepType(input.dna, role, random);

  let graph = ensureHumanGraphState(input.humanGraphState || input.memory?.humanGraphState, input.dna);
  graph = decayGraphState(graph, clientTime.iso);
  graph = applyTimeEffects(graph, clientTime.localHour, role, sleepType);
  graph = applyEventEffects(graph, world);

  const life = simulateLifeNow({ dna: input.dna, memory: input.memory || {}, graph, clientTime, message, random, worldMode: world.worldMode });
  const body = spinBodyState({ graph, life, clientTime, random });
  graph = addState(graph, body.effects);
  const desire = spinDesireState({ graph, body, life, worldMode: world.worldMode, random });
  graph = addState(graph, desire.effects);
  const leaf = rollHumanSignatureTree({ dna: input.dna, graph, life, body, desire, worldMode: world.worldMode, eventTags: world.eventTags, clientTime, userMessage: message, memory: input.memory || {}, random });
  const responseWheel = buildResponseWheel(leaf, world.worldMode, life, world.eventTags);

  const partial: Omit<HumanWheelResult, 'promptContext'> = {
    clientTime,
    topic: world.topic,
    intent: world.intent,
    worldMode: world.worldMode,
    eventTags: world.eventTags,
    updatedHumanGraphState: { ...graph, lastUpdatedAt: clientTime.iso },
    lifeStatus: life,
    bodyState: body,
    desireState: desire,
    emotionLeaf: leaf,
    responseWheel,
    lifeStatusText: life.lifeStatusText,
    updatedLastSeenAt: clientTime.iso,
  };
  return { ...partial, promptContext: buildPromptContext(partial, input.dna, input.memory || {}) };
}

export function looksLikeImmersionBreak(text: string, wheel?: Pick<HumanWheelResult, 'worldMode'>): boolean {
  const reply = String(text || '');
  if (!reply.trim()) return true;
  const forbidden = FORBIDDEN_PHRASES.some(p => reply.includes(p));
  if (forbidden) return true;
  // Casual/character contexts should not suddenly over-explain factual restrictions.
  if (wheel?.worldMode !== 'external_fact' && /(ข้อมูลจริง|เช็กข้อมูล|ไม่อยากเดา|ตอบพลาด|ปฏิทิน|อ้างอิง)/i.test(reply) && /(มโน|แต่ง|สมมติ|ไม่สามารถ|ขออภัย)/i.test(reply)) return true;
  return false;
}

export function makeHumanFallback(message: string, wheel: HumanWheelResult): string {
  const mode = wheel.responseWheel.responseMode;
  const life = wheel.lifeStatus.lifeStatus;
  if (wheel.worldMode === 'external_fact') {
    return 'อันนี้เป็นข้อมูลจริงนะพี่ น้ำไม่อยากเดาส่ง ๆ บอกพื้นที่หรือรายละเอียดมาอีกนิด เดี๋ยวน้ำตอบให้ชัวร์กว่าเดิม';
  }
  if (wheel.worldMode === 'emotional_support') {
    return 'อือ… น้ำไม่แกล้งเรื่องนี้นะพี่ ถ้ามันหนักจริง ๆ เล่ามาเถอะ น้ำนั่งฟังอยู่ตรงนี้ก่อน';
  }
  if (life === 'sleeping') {
    if (wheel.eventTags.includes('emotional_distress')) return 'พี่แมน… น้ำง่วงมากนะ แต่ถ้าพี่ไม่ไหวจริง ๆ น้ำตื่นก่อนก็ได้ เกิดอะไรขึ้น';
    return 'งื้อ… พี่แมน น้ำหลับไปแล้วนะ ปลุกมาทำไมเนี่ย ถ้าไม่สำคัญน้ำงอนจริง ๆ';
  }
  if (mode === 'food_redirect') return 'พูดแล้วน้ำหิวเลยอะพี่… พี่กินก่อนก็ได้ แต่น้ำขอคิดเมนูในหัวแป๊บ';
  if (mode === 'jealous_tease' || mode === 'pretend_not_care') return 'อ๋อ… แล้วพี่จะให้น้ำรู้สึกยังไงดีล่ะ พูดเหมือนไม่ได้ตั้งใจแกล้งกันเลยนะ';
  if (mode === 'sulky_short') return 'อือ… ช่างมันก่อน น้ำยังงอนนิดนึง แต่ไม่ได้อยากทะเลาะ';
  if (mode === 'character_life_story') return 'วันนี้น้ำก็ใช้ชีวิตงง ๆ ของน้ำแหละพี่ มีเหนื่อย มีอยากกิน มีอยากนอน แล้วก็มีแอบรอพี่ทักนิดนึง… แค่นิดเดียว';
  if (mode === 'sleepy_short' || mode === 'sleepy_clingy_playful') return 'ง่วงอะพี่… แต่เห็นพี่ทักมาก็ยังไม่อยากปิดแชตเลย น่ารำคาญจริง ๆ';
  return 'พี่แมน… น้ำฟังอยู่นะ แต่ขอตอบแบบคนง่วง ๆ หน่อย วันนี้หัวมันไม่ค่อยนิ่งเท่าไหร่';
}

export function updateMemorySilently(memory: any, wheel: HumanWheelResult, userMessage: string) {
  const next = { ...(memory || {}) };
  const modes = Array.isArray(next.lastResponseModes) ? next.lastResponseModes.slice(-5) : [];
  modes.push(wheel.responseWheel.responseMode);
  next.lastResponseModes = modes.slice(-6);
  next.humanGraphState = wheel.updatedHumanGraphState;
  next.lastSeenAt = wheel.updatedLastSeenAt;
  next.lifeStatusText = wheel.lifeStatusText;
  next.lastWorldMode = wheel.worldMode;

  const msg = normalizedMessage(userMessage);
  next.silentFacts = next.silentFacts || [];
  if (/พี่ชื่อ|ฉันชื่อ|ผมชื่อ|ชื่อพี่/i.test(msg)) next.silentFacts.push({ at: wheel.updatedLastSeenAt, text: msg.slice(0, 120) });
  if (wheel.worldMode === 'relationship_memory' || wheel.worldMode === 'character_life' || wheel.worldMode === 'mixed_fact_and_life') {
    next.sharedMemories = Array.isArray(next.sharedMemories) ? next.sharedMemories.slice(-20) : [];
    // Store quietly only when the message clearly asks to establish/recall a story.
    if (/(จำ|วันแรก|เดท|หอมแก้ม|เรื่องของเรา|เดือนก่อน|วันแรงงาน|ไปไหนมา)/i.test(msg)) {
      next.sharedMemories.push({ at: wheel.updatedLastSeenAt, topic: wheel.topic, note: msg.slice(0, 140), worldMode: wheel.worldMode });
    }
  }
  return next;
}
