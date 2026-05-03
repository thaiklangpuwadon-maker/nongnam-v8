/*
 * uiActionRouter.ts — Nong Nam v11.3 Safe UI Action Router
 * --------------------------------------------------------
 * สำคัญ:
 * - เรื่อง "ชุด" จะไม่เด้งเข้าหน้าชุดอัตโนมัติแล้ว
 *   เพราะเคยเกิดปัญหาคุยเล่น/มโนเรื่องชุดนิดเดียวแล้วโดนลากเข้าหน้าชุดหมด
 *
 * - หนังสือ: ถ้าผู้ใช้ขอให้อ่าน/เปิดหนังสือ ให้เปิดหน้า books ได้
 * - ล่าม: ถ้าผู้ใช้เข้าโหมดล่าม/กดล่าม ให้เปิดเว็บล่ามอีกแอป
 * - ข่าว: ถ้าขอข่าวจริง ให้เปิดหน้า news ได้
 */

export type NongNamUIScreen =
  | 'chat'
  | 'outfits'
  | 'books'
  | 'news'
  | 'settings'
  | 'setup'
  | 'welcome'

export type UIActionType =
  | 'suggest_outfits'
  | 'open_books'
  | 'open_news'
  | 'open_interpreter'
  | 'none'

export type UIActionResult = {
  type: UIActionType
  screen?: NongNamUIScreen
  shouldSkipAI?: boolean
  shouldOpenExternal?: boolean
  externalUrl?: string
  reply?: string
  reason?: string
}

function normalize(raw: string) {
  return String(raw || '').trim().toLowerCase()
}

function hasAny(text: string, words: string[]) {
  return words.some(w => text.includes(w))
}

function pick(items: string[], salt?: string) {
  if (!items.length) return ''
  let h = 2166136261
  const s = `${Date.now()}|${Math.random()}|${salt || ''}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return items[(h >>> 0) % items.length]
}

/**
 * detectUIAction
 * เรียกก่อนยิง /api/chat
 *
 * หลักใหม่:
 * - Outfit = แนะนำให้ผู้ใช้กดคลังชุดเอง ไม่ setScreen('outfits') อัตโนมัติ
 * - Books = เปิดหน้า books เพราะผู้ใช้ตั้งใจขออ่าน
 * - Interpreter = เปิด external app
 */
export function detectUIAction(rawMessage: string): UIActionResult {
  const text = normalize(rawMessage)
  if (!text) return { type: 'none' }

  const interpreterWords = [
    'เข้าโหมดล่าม',
    'โหมดล่าม',
    'เปิดล่าม',
    'กดล่าม',
    'เว็บล่าม',
    'แอปล่าม',
    'แอล่า',
    'ล่ามเกาหลี',
    'แปลภาษา',
    'แปลเกาหลี',
    'แปลไทย',
    'interpreter',
    'translate'
  ]

  const strongBookWords = [
    'อ่านหนังสือให้ฟัง',
    'อ่านให้ฟัง',
    'เปิดหนังสือ',
    'เปิดชั้นหนังสือ',
    'ไปหน้าหนังสือ',
    'เข้าหนังสือ',
    'เล่านิทานให้ฟัง',
    'อ่านนิทานให้ฟัง'
  ]

  const weakBookWords = [
    'หนังสือ',
    'นิยาย',
    'นิทาน',
    'เล่าเรื่อง'
  ]

  const newsWords = [
    'เปิดข่าว',
    'ไปหน้าข่าว',
    'เข้าข่าว',
    'ข่าววันนี้',
    'เล่าข่าว',
    'สรุปข่าว',
    'ข่าว'
  ]

  const outfitWords = [
    'ซื้อชุด',
    'เปลี่ยนชุด',
    'ลองชุด',
    'ดูชุด',
    'คลังชุด',
    'ชุดใหม่',
    'เลือกชุด',
    'เสื้อผ้า',
    'แต่งตัว',
    'บิกินี่',
    'เดรส',
    'กระโปรง',
    'ชุดนอน',
    'แฟชั่น'
  ]

  if (hasAny(text, interpreterWords)) {
    return {
      type: 'open_interpreter',
      shouldSkipAI: true,
      shouldOpenExternal: true,
      externalUrl: 'https://nongnam-v2.vercel.app',
      reply: pick([
        'ได้พี่ เดี๋ยวน้ำพาเข้าโหมดล่ามให้นะ',
        'โอเคพี่ เปิดล่ามให้เลย จะได้แปลกันตรง ๆ',
        'ได้เลย เดี๋ยวน้ำเปิดแอปล่ามให้นะพี่'
      ], text),
      reason: 'interpreter_command',
    }
  }

  // strong book request = open books immediately
  if (hasAny(text, strongBookWords)) {
    return {
      type: 'open_books',
      screen: 'books',
      shouldSkipAI: true,
      reply: pick([
        'ได้สิพี่ งั้นน้ำเปิดชั้นหนังสือก่อนนะ เลือกเรื่องให้หน่อย',
        'โอเคพี่ เดี๋ยวน้ำพาไปหน้าหนังสือก่อน จะได้เลือกจากเรื่องที่มีจริง ๆ',
        'ได้เลย น้ำเปิดหนังสือให้ก่อนนะ พี่เลือกเรื่องที่อยากฟังได้เลย'
      ], text),
      reason: 'strong_book_command',
    }
  }

  // weak book mention: only open if there is an action verb
  if (hasAny(text, weakBookWords) && /(อ่าน|เปิด|เล่าให้ฟัง|ฟังหน่อย|เลือก|เข้า|ไปหน้า)/i.test(text)) {
    return {
      type: 'open_books',
      screen: 'books',
      shouldSkipAI: true,
      reply: pick([
        'ได้สิพี่ งั้นน้ำเปิดชั้นหนังสือก่อนนะ เลือกเรื่องให้หน่อย',
        'โอเคพี่ เดี๋ยวน้ำพาไปหน้าหนังสือก่อน',
        'น้ำเปิดคลังหนังสือให้ก่อนนะ พี่อยากฟังเรื่องไหนเลือกได้เลย'
      ], text),
      reason: 'book_command',
    }
  }

  if (hasAny(text, newsWords) && /(ข่าว|เปิด|เล่า|สรุป|วันนี้|ไปหน้า|เข้า)/i.test(text)) {
    return {
      type: 'open_news',
      screen: 'news',
      shouldSkipAI: true,
      reply: pick([
        'ได้พี่ เดี๋ยวน้ำเปิดหน้าข่าวให้ก่อนนะ',
        'โอเคพี่ ไปดูข่าวกันก่อน แล้วค่อยเลือกว่าจะให้น้ำเล่าเรื่องไหน',
        'ได้เลย น้ำเปิดหน้าข่าวให้ พี่เลือกหัวข้อมาได้เลย'
      ], text),
      reason: 'news_command',
    }
  }

  // Outfit policy:
  // DO NOT auto-open outfits.
  // Just reply naturally and tell user to press outfit closet if they want.
  // This prevents false positives from fantasy chat.
  if (hasAny(text, outfitWords)) {
    return {
      type: 'suggest_outfits',
      shouldSkipAI: true,
      reply: pick([
        'ได้สิพี่ ถ้าพี่อยากเปลี่ยนชุดให้น้ำ กดเข้า “ชุด” ในคลังได้เลย เดี๋ยวน้ำลองให้ดู',
        'แหม จะซื้อชุดให้น้ำเหรอ… งั้นพี่เข้าไปดูในคลังชุดได้เลยนะ น้ำยอมให้เลือกวันนี้วันนึง',
        'พี่อยากให้น้ำเปลี่ยนชุดก็กดปุ่ม “ชุด” ได้เลย เดี๋ยวน้ำเปลี่ยนให้ดู ไม่ต้องแอบยิ้มนะ',
        'ถ้าพี่จะเลือกชุดให้น้ำ กดเข้าคลังชุดได้เลยนะ แต่เลือกดี ๆ ล่ะ น้ำเรื่องมากนิดนึง'
      ], text),
      reason: 'outfit_suggestion_no_auto_open',
    }
  }

  return { type: 'none' }
}

export function isUIAction(result: UIActionResult) {
  return result.type !== 'none'
}
