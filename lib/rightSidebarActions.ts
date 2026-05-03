/*
 * rightSidebarActions.ts — Nong Nam v11.6 Restore Right Sidebar Buttons
 * ---------------------------------------------------------------------
 * ใช้กับปุ่มด้านขวาเดิม:
 * - ชุด
 * - หนังสือ
 * - ข่าว
 * - ล่าม
 * - + / -
 *
 * ไฟล์นี้ไม่แตะสมองแชต ใช้เป็นตัวกลางให้ page.tsx เรียก action ให้ถูก
 */

export type RightSidebarAction =
  | 'outfits'
  | 'books'
  | 'news'
  | 'interpreter'
  | 'plus'
  | 'minus'

export type RightSidebarResult = {
  action: RightSidebarAction
  screen?: 'chat' | 'outfits' | 'books' | 'news' | 'settings'
  externalUrl?: string
  assistantText?: string
}

export function resolveRightSidebarAction(action: RightSidebarAction): RightSidebarResult {
  if (action === 'outfits') {
    return {
      action,
      screen: 'outfits',
      assistantText: 'พี่จะเลือกชุดให้น้ำเหรอ… งั้นน้ำไปเปิดคลังชุดให้นะ'
    }
  }

  if (action === 'books') {
    return {
      action,
      screen: 'books',
      assistantText: 'ได้สิพี่ น้ำเปิดชั้นหนังสือให้ก่อนนะ'
    }
  }

  if (action === 'news') {
    return {
      action,
      screen: 'news',
      assistantText: 'ได้พี่ เดี๋ยวน้ำเปิดหน้าข่าวให้ก่อนนะ'
    }
  }

  if (action === 'interpreter') {
    return {
      action,
      externalUrl: 'https://nongnam-v2.vercel.app?from=nongnam-v8',
      assistantText: 'ได้พี่ เดี๋ยวน้ำเปิดโหมดล่ามให้นะ'
    }
  }

  if (action === 'plus') {
    return {
      action,
      assistantText: 'เพิ่มให้อีกนิดนะพี่'
    }
  }

  return {
    action,
    assistantText: 'ลดลงให้นิดนึงนะพี่'
  }
}

export function rightSidebarButtonList() {
  return [
    { action: 'outfits' as const, icon: '👗', label: 'ชุด' },
    { action: 'books' as const, icon: '📚', label: 'หนังสือ' },
    { action: 'news' as const, icon: '📰', label: 'ข่าว' },
    { action: 'interpreter' as const, icon: '🎙️', label: 'ล่าม' },
    { action: 'plus' as const, icon: '+', label: '+' },
    { action: 'minus' as const, icon: '-', label: '-' },
  ]
}
