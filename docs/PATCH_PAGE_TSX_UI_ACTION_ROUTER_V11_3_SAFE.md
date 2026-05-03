# PATCH_PAGE_TSX_UI_ACTION_ROUTER_V11_3_SAFE

เวอร์ชันนี้แก้จาก v11.2 ตามที่พี่แมนท้วง:

## หลักใหม่

### เรื่องชุด
ไม่เด้งเข้า `outfits` อัตโนมัติแล้ว  
เพราะถ้าคุยเล่นเรื่องชุด/มโนชุดนิดเดียว ระบบจะลากเข้าหน้าชุดมั่วเหมือนที่เคยเกิด

ตอนนี้ถ้าผู้ใช้พูดว่า:
```txt
เดี๋ยวพี่ซื้อชุดให้
ลองเปลี่ยนชุดไหม
ไปดูชุดกันไหม
```

น้องน้ำจะตอบประมาณ:
```txt
ถ้าพี่อยากเปลี่ยนชุดให้น้ำ กดเข้า “ชุด” ในคลังได้เลย เดี๋ยวน้ำลองให้ดู
```

แต่จะ **ไม่ setScreen('outfits')**

### เรื่องหนังสือ
ถ้าผู้ใช้ขออ่านจริง เช่น:
```txt
น้องน้ำอ่านหนังสือให้ฟังหน่อย
เปิดหนังสือให้ฟังหน่อย
อ่านนิทานให้ฟังหน่อย
```

ให้เปิดหน้า `books` ทันที

### เรื่องล่าม
ถ้าผู้ใช้พูด:
```txt
เข้าโหมดล่าม
เปิดล่าม
แปลเกาหลี
แอล่า
```

ให้เปิดเว็บล่ามอีกแอป เช่น:
```txt
https://nongnam-v2.vercel.app
```

---

# วิธีแก้ `app/page.tsx`

## 1) เพิ่ม import

ด้านบนไฟล์:

```ts
import { detectUIAction } from './lib/uiActionRouter';
```

## 2) หา function ส่งข้อความ

ค้นหา:

```txt
handleSend
sendMessage
fetch('/api/chat')
fetch("/api/chat")
```

หลังจากได้ตัวแปรข้อความ เช่น `text`, `msg`, หรือ `inputText` แล้ว ให้แทรกก่อน fetch `/api/chat`

> เปลี่ยนชื่อ `text` ให้ตรงกับตัวแปรข้อความจริงในไฟล์พี่

```ts
const action = detectUIAction(text);

if (action.type !== 'none') {
  const assistantMsg = {
    id: Date.now() + 1,
    role: 'assistant' as const,
    text: action.reply || 'ได้พี่ เดี๋ยวน้ำเปิดให้',
    ts: Date.now()
  };

  setChat(prev => [...prev, assistantMsg]);

  // เปิดเฉพาะ books/news เท่านั้น
  // outfit จะไม่มี action.screen แล้ว จึงไม่เด้งมั่ว
  if (action.screen) {
    setTimeout(() => {
      setScreen(action.screen as any);
    }, 350);
  }

  if (action.type === 'open_interpreter') {
    const interpreterUrl =
      (typeof window !== 'undefined' && localStorage.getItem('nongnam_interpreter_url')) ||
      'https://nongnam-v2.vercel.app';

    setTimeout(() => {
      window.open(interpreterUrl, '_blank', 'noopener,noreferrer');
    }, 350);
  }

  return;
}
```

## 3) ถ้า ChatMsg id เป็น string

เปลี่ยน:

```ts
id: Date.now() + 1,
```

เป็น:

```ts
id: String(Date.now() + 1),
```

## 4) ถ้า role ไม่ใช่ assistant

ถ้าไฟล์พี่ใช้ role เป็น `"bot"` ให้เปลี่ยน:

```ts
role: 'assistant' as const,
```

เป็น:

```ts
role: 'bot' as const,
```

## 5) เพิ่มปุ่มล่ามกลับมา

ค้นหาปุ่มข้าง ๆ ที่เป็น `ชุด`, `หนังสือ`, `ข่าว`

แล้วเพิ่มปุ่มนี้ไว้ใกล้ ๆ กัน:

```tsx
<button
  className="sideBtn"
  onClick={() => window.open('https://nongnam-v2.vercel.app', '_blank', 'noopener,noreferrer')}
  title="โหมดล่าม"
>
  🎙️
  <span>ล่าม</span>
</button>
```

ถ้า class ของปุ่มเดิมไม่ใช่ `sideBtn` ให้ copy class จากปุ่ม `หนังสือ` หรือ `ข่าว` มาใช้แทน

---

# Test

## ชุด
```txt
ไหนลองเข้าไปดูชุดสิ เดี๋ยวพี่จะซื้อชุดให้
```
Expected:
- ตอบให้กดเข้า “ชุด”
- ไม่เด้งเข้า outfits เอง

## หนังสือ
```txt
น้องน้ำอ่านหนังสือให้ฟังหน่อยสิ
```
Expected:
- ตอบว่าจะเปิดชั้นหนังสือ
- เด้งเข้า books

## ล่าม
```txt
เข้าโหมดล่าม
```
Expected:
- เปิดเว็บล่ามอีกแอป
