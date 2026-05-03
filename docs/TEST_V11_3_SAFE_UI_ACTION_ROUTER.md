# TEST V11.3 Safe UI Action Router

## 1. Outfit should NOT auto open
User:
เดี๋ยวพี่ซื้อชุดให้

Expected:
- Reply tells user to press “ชุด”
- No automatic setScreen('outfits')

## 2. Outfit fantasy should NOT auto open
User:
สมมุติน้องน้ำใส่ชุดไปทะเลนะ

Expected:
- Ideally goes to normal chat / no UI action
- If caught by outfit keyword, only suggest button, no auto open

## 3. Book should open
User:
น้องน้ำอ่านหนังสือให้ฟังหน่อย

Expected:
- screen = books

## 4. Interpreter should open
User:
เข้าโหมดล่าม

Expected:
- Opens https://nongnam-v2.vercel.app

## 5. News should open
User:
เปิดข่าววันนี้ให้หน่อย

Expected:
- screen = news
