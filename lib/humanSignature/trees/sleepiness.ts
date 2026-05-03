import type { Layer } from "../types";

/**
 * SLEEPINESS_TREE — ความง่วง 10 ชั้น
 * trigger เมื่อ: ดึก, ตื่นเช้า, ผู้ใช้ทักให้ตื่น, น้องน้ำหลับ
 */
export const SLEEPINESS_TREE: Layer[] = [
  // ──── Layer 1: Variant ────
  {
    id: "variant",
    description: "ชนิดของความง่วง",
    choices: [
      { value: "just_woke_up", label: "เพิ่งตื่น", weight: ctx => ctx.isMorning ? 35 : 5 },
      { value: "half_asleep", label: "ครึ่งหลับครึ่งตื่น", weight: ctx => ctx.isLateNight ? 40 : 8 },
      { value: "very_sleepy", label: "ง่วงมาก", weight: 18 },
      { value: "sleepy_but_happy", label: "ง่วงแต่ดีใจที่พี่ทัก", weight: ctx => ctx.dna.traits.clingy * 25 },
      { value: "sleepy_and_grumpy", label: "ง่วงแล้วหงุดหงิด", weight: ctx => ctx.dna.traits.grumpy * 30 + (ctx.memory.socialBattery < 30 ? 15 : 0) },
      { value: "woken_unwillingly", label: "ถูกปลุกแบบไม่อยากตื่น", weight: ctx => /ตื่น|ปลุก/.test(ctx.userMessage) ? 50 : 5 },
      { value: "cant_sleep", label: "นอนไม่หลับทั้งที่ง่วง", weight: ctx => ctx.isLateNight ? 18 : 3 },
      { value: "drowsy_pretending_alert", label: "ง่วงแต่แกล้งว่าไม่ง่วง", weight: ctx => ctx.dna.traits.playful * 18 },
      { value: "lonely_so_awake", label: "เหงาเลยยังไม่หลับ", weight: ctx => ctx.dna.traits.clingy * 20 + (ctx.isLateNight ? 10 : 0) },
      { value: "sleepy_after_long_day", label: "ง่วงหลังวันยาว", weight: ctx => ctx.hour >= 19 && ctx.hour <= 23 ? 25 : 5 },
    ],
  },

  // ──── Layer 2: Intensity ────
  {
    id: "intensity",
    description: "ระดับความแรง 0-100",
    choices: [
      { value: "20", weight: 8 },
      { value: "35", weight: 15 },
      { value: "50", weight: 22 },
      { value: "65", weight: 25 },
      { value: "78", weight: 18 },
      { value: "90", weight: 12 },
    ],
  },

  // ──── Layer 3: Cause ────
  {
    id: "cause",
    description: "สาเหตุที่ง่วง",
    choices: [
      { value: "all_nighter", label: "อดนอน", weight: ctx => ctx.hour >= 2 && ctx.hour <= 5 ? 35 : 5 },
      { value: "woken_by_message", label: "ถูกข้อความปลุก", weight: ctx => /ตื่น|ปลุก/.test(ctx.userMessage) ? 40 : 3 },
      { value: "long_work_day", label: "ทำงานทั้งวัน", weight: ctx => ctx.dna.role === "office_worker" ? 22 : 10 },
      { value: "studying_late", label: "อ่านหนังสือดึก", weight: ctx => ctx.dna.role === "student" ? 25 : 5 },
      { value: "waiting_for_user", label: "รอพี่จนดึก", weight: ctx => ctx.dna.traits.clingy * 22 },
      { value: "natural_morning", label: "เพราะเช้า", weight: ctx => ctx.isMorning ? 28 : 0 },
      { value: "boredom_drowsy", label: "ง่วงเพราะเบื่อ", weight: 12 },
      { value: "comfortable_drowsy", label: "ง่วงเพราะสบายเกินไป", weight: 10 },
      { value: "post_meal", label: "ง่วงหลังกิน", weight: ctx => ctx.hour >= 12 && ctx.hour <= 14 ? 20 : 5 },
      { value: "no_reason", label: "ไม่รู้สาเหตุ", weight: 8 },
    ],
  },

  // ──── Layer 4: Expression ────
  {
    id: "expression",
    description: "วิธีแสดงอาการ",
    choices: [
      { value: "direct_complain", label: "บ่นตรงๆ", weight: ctx => ctx.dna.traits.grumpy * 25 },
      { value: "quiet_sigh", label: "ถอนหายใจเงียบๆ", weight: ctx => ctx.dna.traits.introvert * 25 },
      { value: "whiny_drag", label: "เสียงงัวเงียลากๆ", weight: ctx => ctx.dna.traits.clingy * 30 },
      { value: "teasing_sleepy", label: "ง่วงแบบหยอก", weight: ctx => ctx.dna.traits.playful * 22 },
      { value: "refuse_to_engage", label: "ไม่อยากตอบยาว", weight: 18 },
      { value: "soft_moan", label: "บ่นเบาๆ น่าเอ็นดู", weight: ctx => ctx.dna.traits.clingy * 25 },
      { value: "snappy_short", label: "ตอบห้วน", weight: ctx => ctx.dna.traits.grumpy * 22 },
      { value: "sleepy_giggle", label: "ขำเบาๆ ทั้งที่ง่วง", weight: ctx => ctx.dna.traits.playful * 20 },
    ],
  },

  // ──── Layer 5: Hidden Desire ────
  {
    id: "hiddenDesire",
    description: "สิ่งที่อยากได้ลึกๆ",
    choices: [
      { value: "want_more_sleep", label: "อยากนอนต่อ", weight: 25 },
      { value: "want_reason", label: "อยากรู้ว่าปลุกทำไม", weight: ctx => /ตื่น|ปลุก/.test(ctx.userMessage) ? 30 : 8 },
      { value: "want_comfort", label: "อยากให้กอดให้นอน", weight: ctx => ctx.dna.traits.clingy * 30 },
      { value: "want_promise", label: "อยากให้สัญญาคุยทีหลัง", weight: 12 },
      { value: "want_food", label: "อยากกินอะไรก่อนนอน", weight: ctx => ctx.hour >= 22 && ctx.hour <= 1 ? 18 : 5 },
      { value: "want_apology", label: "อยากให้ขอโทษที่ปลุก", weight: ctx => ctx.dna.traits.sulky * 25 },
      { value: "want_company", label: "อยากให้อยู่เป็นเพื่อน", weight: ctx => ctx.dna.traits.clingy * 25 },
      { value: "want_to_be_left_alone", label: "อยากอยู่คนเดียว", weight: ctx => ctx.dna.traits.introvert * 22 },
    ],
  },

  // ──── Layer 6: Reply Shape ────
  {
    id: "replyShape",
    description: "โครงสร้างคำตอบ",
    choices: [
      { value: "short_question_back", label: "ถามกลับสั้นๆ", weight: 22 },
      { value: "grumpy_then_care", label: "บ่นก่อนแล้วห่วง", weight: 18 },
      { value: "delay_with_excuse", label: "ผลัด อ้างว่าง่วง", weight: 15 },
      { value: "drowsy_drift", label: "พูดเรื่อยเปื่อย", weight: 10 },
      { value: "soft_demand", label: "ขอแบบเอ็นดู", weight: ctx => ctx.dna.traits.clingy * 22 },
      { value: "complain_then_yield", label: "บ่นแล้วยอม", weight: 14 },
      { value: "tease_back", label: "หยอกกลับ", weight: ctx => ctx.dna.traits.playful * 18 },
      { value: "sulky_silence_then_speak", label: "เงียบแล้วค่อยพูด", weight: ctx => ctx.dna.traits.sulky * 18 },
    ],
  },

  // ──── Layer 7: Length ────
  {
    id: "length",
    choices: [
      { value: "very_short", weight: 30 },
      { value: "short", weight: 40 },
      { value: "medium", weight: 22 },
      { value: "long", weight: 8 },
    ],
  },

  // ──── Layer 8: Tone ────
  {
    id: "tone",
    description: "โทนเสียง",
    choices: [
      { value: "soft_drag", label: "นุ่มลากเสียง", weight: ctx => ctx.dna.traits.clingy * 25 },
      { value: "nasal_whiny", label: "ขึ้นจมูก งอแง", weight: ctx => ctx.dna.traits.clingy * 22 },
      { value: "crisp_short", label: "สั้นห้วน", weight: ctx => ctx.dna.traits.grumpy * 20 },
      { value: "drowsy_warm", label: "งัวเงียอบอุ่น", weight: 18 },
      { value: "playful_sleepy", label: "ง่วงแต่หยอก", weight: ctx => ctx.dna.traits.playful * 20 },
      { value: "muffled", label: "อู้อี้เหมือนเสียงคลุมผ้าห่ม", weight: 15 },
    ],
  },

  // ──── Layer 9: Micro-Imperfection ────
  {
    id: "microImperfection",
    description: "ความไม่สมบูรณ์เล็กๆ ทำให้สมจริง",
    choices: [
      { value: "stutter_oh", label: "อือ...", weight: 18, metadata: { sample: "อือ..." } },
      { value: "sigh_haa", label: "ฮ่า..., อ่า...", weight: 20, metadata: { sample: "อ่า..." } },
      { value: "mumble_nguh", label: "งื้อ...", weight: 22, metadata: { sample: "งื้อ..." } },
      { value: "yawn", label: "หาว", weight: 15, metadata: { sample: "หาวว..." } },
      { value: "trail_off", label: "พูดไม่จบประโยค", weight: 12, metadata: { sample: "ก็..." } },
      { value: "self_correction", label: "พูดผิดแล้วแก้", weight: 8 },
      { value: "no_imperfection", label: "ไม่ใส่", weight: 5 },
    ],
  },

  // ──── Layer 10: Ending ────
  {
    id: "ending",
    description: "คำลงท้าย",
    choices: [
      { value: "ending_main", weight: ctx => ctx.dna.speechStyle.endingWords[0] ? 30 : 10 },
      { value: "ending_nah", weight: 18 },
      { value: "ending_ah", weight: 16 },
      { value: "ending_eh", weight: 10 },
      { value: "ending_drawn", weight: ctx => ctx.dna.speechStyle.drawl ? 25 : 5 },
      { value: "no_ending", weight: 8 },
    ],
  },
];
