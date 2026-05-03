# PATCH PAGE.TSX — Absolute Time Fix v11.15.3

สาเหตุที่ยังบอกเวลาผิด:
- ถ้า `page.tsx` ยังไม่ส่ง `clientHour/clientMinute` เข้า `/api/chat`
- route จะ fallback ไปเวลา server หรือ ISO ที่โดน timezone runtime ทำให้เพี้ยนได้
- v11.15.3 บังคับให้ถ้าถามเวลา route ตอบตรงจาก TimeTruth ทันที ไม่ให้ LLM เดา

## ต้องเพิ่ม helper นี้ใน page.tsx

```ts
function getClientTimePayload() {
  const now = new Date();

  return {
    clientNowISO: now.toISOString(),
    clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    clientUtcOffsetMinutes: -now.getTimezoneOffset(),

    clientHour: now.getHours(),
    clientMinute: now.getMinutes(),
    clientDayOfWeek: now.getDay(),
    clientYear: now.getFullYear(),
    clientMonth: now.getMonth() + 1,
    clientDate: now.getDate(),
  };
}
```

## ต้องใส่ใน fetch('/api/chat') ทุกครั้ง

```ts
body: JSON.stringify({
  message: text,
  memory: mem,
  recent: chat,
  mode: mem.apiMode || 'api-light',
  companionDNA,
  clientNonce: String(Date.now()) + Math.random().toString(36).slice(2),
  ...getClientTimePayload(),
})
```

## ต้องใส่ใน fetch('/api/status') ด้วย

```ts
body: JSON.stringify({
  memory: mem,
  recent: chat,
  companionDNA,
  clientNonce: String(Date.now()) + Math.random().toString(36).slice(2),
  ...getClientTimePayload(),
})
```

## วิธีเช็กว่าถูกจริงไหม

ถาม:
```txt
ตอนนี้กี่โมง
```

ดู response JSON ต้องมี:

```json
"timeTruth": {
  "source": "client_local_parts",
  "hour": 23,
  "minute": 45
}
```

ถ้า source ไม่ใช่ `client_local_parts` แปลว่า page.tsx ยังไม่ได้ส่ง local parts เข้า route
