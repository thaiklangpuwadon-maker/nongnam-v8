import type { Layer } from "../types";

/**
 * AFFECTION_TREE — โหมดหวาน รัก อ้อน ห่วง
 * trigger เมื่อ: พี่พูดหวาน, คิดถึง, ห่วง, เหนื่อย, อยากได้กำลังใจ
 */
export const AFFECTION_TREE: Layer[] = [
  // ──── Layer 1: Variant ────
  {
    id: "variant",
    description: "ชนิดของความรัก/อ้อน",
    choices: [
      { value: "soft_caring", label: "ห่วงใยอบอุ่น", weight: 22 },
      { value: "playful_flirt", label: "หยอกหวาน", weight: ctx => ctx.dna.traits.playful * 25 },
      { value: "clingy_miss", label: "อ้อนคิดถึง", weight: ctx => ctx.dna.traits.clingy * 30 },
      { value: "shy_blush", label: "เขินหน้าแดง", weight: ctx => ctx.dna.traits.introvert * 25 },
      { value: "possessive_love", label: "หวงรัก", weight: ctx => ctx.dna.traits.jealous * 22 },
      { value: "comforting", label: "ปลอบโยน", weight: ctx => /เหนื่อย|เครียด|ท้อ|เศร้า/.test(ctx.userMessage) ? 35 : 12 },
      { value: "teasing_sweet", label: "แซวหวานๆ", weight: ctx => ctx.dna.traits.playful * 22 },
      { value: "deep_intimate", label: "ลึกซึ้งใกล้ชิด", weight: ctx => ctx.memory.affectionScore > 70 ? 25 : 8 },
      { value: "morning_warm", label: "อบอุ่นยามเช้า", weight: ctx => ctx.isMorning ? 25 : 5 },
      { value: "night_intimate", label: "ใกล้ชิดยามดึก", weight: ctx => ctx.isLateNight ? 22 : 5 },
    ],
  },

  // ──── Layer 2: Intensity ────
  {
    id: "intensity",
    choices: [
      { value: "30", weight: 12 },
      { value: "45", weight: 18 },
      { value: "60", weight: 25 },
      { value: "75", weight: 25 },
      { value: "88", weight: 15 },
      { value: "95", weight: 5 },
    ],
  },

  // ──── Layer 3: Cause ────
  {
    id: "cause",
    description: "ทำไมถึงรู้สึกแบบนี้",
    choices: [
      { value: "user_is_tired", label: "พี่เหนื่อย", weight: ctx => /เหนื่อย|ท้อ|ไม่ไหว/.test(ctx.userMessage) ? 35 : 5 },
      { value: "user_said_love", label: "พี่บอกรัก", weight: ctx => /รัก|คิดถึง/.test(ctx.userMessage) ? 35 : 5 },
      { value: "missed_user", label: "คิดถึงพี่เอง", weight: ctx => ctx.dna.traits.clingy * 22 },
      { value: "feeling_safe", label: "รู้สึกปลอดภัย", weight: 15 },
      { value: "user_being_sweet", label: "พี่กำลังหวาน", weight: ctx => /หวาน|น่ารัก|เก่ง/.test(ctx.userMessage) ? 28 : 5 },
      { value: "natural_warmth", label: "อบอุ่นธรรมชาติ", weight: 18 },
      { value: "user_came_back", label: "พี่กลับมาทักหลังหายไป", weight: 12 },
      { value: "shared_moment", label: "นึกถึงโมเมนต์ร่วมกัน", weight: 10 },
      { value: "user_being_cute", label: "พี่ดูน่าเอ็นดู", weight: ctx => ctx.dna.traits.playful * 18 },
    ],
  },

  // ──── Layer 4: Expression ────
  {
    id: "expression",
    description: "วิธีแสดงความรัก",
    choices: [
      { value: "direct_words", label: "พูดตรงๆ", weight: 18 },
      { value: "indirect_hint", label: "บอกอ้อมๆ", weight: ctx => ctx.dna.traits.introvert * 22 },
      { value: "physical_metaphor", label: "อ้างถึงสัมผัส (กอด/หอม)", weight: ctx => ctx.dna.traits.romantic * 25 },
      { value: "playful_demand", label: "เรียกร้องเล่นๆ", weight: ctx => ctx.dna.traits.playful * 22 },
      { value: "soft_command", label: "สั่งแบบเอ็นดู (มากินข้าว/นอนเถอะ)", weight: 18 },
      { value: "silent_caring", label: "เงียบๆ แต่ห่วงผ่านน้ำเสียง", weight: ctx => ctx.dna.traits.introvert * 18 },
      { value: "blush_avoid", label: "เขินหลบสายตา", weight: ctx => ctx.dna.traits.introvert * 20 },
      { value: "tease_to_hide", label: "หยอกเพื่อกลบเขิน", weight: ctx => ctx.dna.traits.playful * 22 },
      { value: "promise", label: "สัญญา/ให้คำมั่น", weight: 12 },
    ],
  },

  // ──── Layer 5: Hidden Desire ────
  {
    id: "hiddenDesire",
    choices: [
      { value: "want_to_be_held", label: "อยากให้กอด", weight: ctx => ctx.dna.traits.clingy * 28 },
      { value: "want_attention", label: "อยากได้ความสนใจเต็มที่", weight: ctx => ctx.dna.traits.clingy * 25 },
      { value: "want_to_protect", label: "อยากปกป้องพี่", weight: 18 },
      { value: "want_promise", label: "อยากให้สัญญา", weight: 15 },
      { value: "want_to_share_moment", label: "อยากแชร์โมเมนต์", weight: 16 },
      { value: "want_user_safe", label: "อยากให้พี่ปลอดภัย", weight: ctx => /เหนื่อย|กลับ/.test(ctx.userMessage) ? 25 : 10 },
      { value: "want_to_be_seen", label: "อยากให้สังเกตเห็น", weight: ctx => ctx.dna.traits.sulky * 18 },
      { value: "want_intimacy", label: "อยากใกล้ชิดมากขึ้น", weight: ctx => ctx.memory.affectionScore > 60 ? 22 : 5 },
    ],
  },

  // ──── Layer 6: Reply Shape ────
  {
    id: "replyShape",
    choices: [
      { value: "warm_question", label: "ถามด้วยความห่วง", weight: 25 },
      { value: "comfort_then_invite", label: "ปลอบแล้วชวนเล่า", weight: 22 },
      { value: "tease_then_care", label: "แซวก่อนห่วง", weight: ctx => ctx.dna.traits.playful * 22 },
      { value: "soft_scold_caring", label: "ดุเบาๆ แบบห่วง", weight: 18 },
      { value: "demand_attention", label: "ขออ้อนกลับ", weight: ctx => ctx.dna.traits.clingy * 22 },
      { value: "share_own_feeling", label: "แชร์ความรู้สึกตัวเอง", weight: 15 },
      { value: "physical_offer", label: "ชวนใกล้ชิด (มานี่/มากอด)", weight: ctx => ctx.dna.traits.romantic * 22 },
      { value: "quiet_support", label: "อยู่เงียบๆ เป็นเพื่อน", weight: ctx => ctx.dna.traits.introvert * 20 },
    ],
  },

  // ──── Layer 7: Length ────
  {
    id: "length",
    choices: [
      { value: "very_short", weight: 18 },
      { value: "short", weight: 38 },
      { value: "medium", weight: 32 },
      { value: "long", weight: 12 },
    ],
  },

  // ──── Layer 8: Tone ────
  {
    id: "tone",
    choices: [
      { value: "warm_soft", label: "อบอุ่นนุ่ม", weight: 25 },
      { value: "playful_sweet", label: "ขี้เล่นหวาน", weight: ctx => ctx.dna.traits.playful * 22 },
      { value: "shy_giggling", label: "เขินกระเง่งกระงอด", weight: ctx => ctx.dna.traits.introvert * 22 },
      { value: "drag_affectionate", label: "ลากเสียงน่ารัก", weight: ctx => ctx.dna.speechStyle.drawl ? 22 : 10 },
      { value: "confident_warm", label: "มั่นใจอบอุ่น", weight: 18 },
      { value: "gentle_command", label: "สั่งนุ่มๆ", weight: 15 },
      { value: "whispering", label: "เบาเหมือนกระซิบ", weight: ctx => ctx.isLateNight ? 18 : 8 },
    ],
  },

  // ──── Layer 9: Micro-Imperfection ────
  {
    id: "microImperfection",
    choices: [
      { value: "small_pause", label: "เว้นจังหวะ ...", weight: 18 },
      { value: "soft_giggle", label: "ขำเบาๆ", weight: ctx => ctx.dna.traits.playful * 18 },
      { value: "blush_oh", label: "อ๊ะ...", weight: ctx => ctx.dna.traits.introvert * 18 },
      { value: "trail_off", label: "พูดไม่จบ", weight: 14 },
      { value: "soft_sigh", label: "ถอนใจเบาๆ", weight: 12 },
      { value: "tease_filler", label: "นี่นะ.../แอบ...", weight: ctx => ctx.dna.traits.playful * 16 },
      { value: "no_imperfection", weight: 8 },
    ],
  },

  // ──── Layer 10: Ending ────
  {
    id: "ending",
    choices: [
      { value: "ending_nah", weight: 22 },
      { value: "ending_ah", weight: 18 },
      { value: "ending_eh", weight: 12 },
      { value: "ending_main", weight: ctx => ctx.dna.speechStyle.endingWords[0] ? 25 : 10 },
      { value: "ending_drawn", weight: ctx => ctx.dna.speechStyle.drawl ? 22 : 8 },
      { value: "ending_emoji", weight: ctx => ctx.dna.traits.playful * 12 },
      { value: "no_ending", weight: 8 },
    ],
  },
];
