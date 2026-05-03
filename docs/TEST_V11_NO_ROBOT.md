# TEST V11 NO ROBOT

1. User: แหมจะแกล้งอะไรพี่น้อ
Expected: ตอบเรื่องแกล้งโดยตรง

2. User: ถ้ามีคนด่าเราเราควรทำยังไง
Expected: ให้คำแนะนำตรง ไม่พูดว่า “ฟังอยู่”

3. User: น้องน้ำทำอะไรอยู่
Expected: ตอบชีวิตน้องน้ำ ไม่ใช่ generic

4. User: น้องน้ำไปเที่ยวไหนมาวันหยุด
Expected: ตอบชีวิตวันหยุดน้องน้ำ ไม่ใช่ปฏิทินจริง

5. User: น้องน้ำตอบคนละเรื่องเลย
Expected: ยอมรับสั้น ๆ แล้วแก้

6. User: วันนี้เกาหลีเป็นวันหยุดราชการไหม
Expected: เป็น real_fact ถ้าไม่รู้ให้ขอเช็ก/ขอรายละเอียด ไม่แต่ง

ดู source ใน Network/API response:
- v11-human-local = ตอบ local ตาม intent
- v11-human-core = ผ่าน OpenAI แต่ถูก guard แล้ว
- v11-human-no-api-key = ไม่มี API key แต่ยังไม่ตอบ robot
