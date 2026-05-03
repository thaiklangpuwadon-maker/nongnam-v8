#!/usr/bin/env node
/**
 * patch-page-v11-15-4.js
 * ----------------------
 * สคริปต์ช่วยแทรกโค้ด TimePayload + /api/status + visibleStatus ลงใน app/page.tsx
 *
 * วิธีใช้:
 *   node scripts/patch-page-v11-15-4.js
 *
 * สคริปต์นี้จะ:
 * - backup app/page.tsx เป็น app/page.tsx.bak-v11-15-4
 * - เพิ่ม getClientTimePayload()
 * - เพิ่ม marker comment สำหรับ visibleStatus
 *
 * หมายเหตุ:
 * เพราะ page.tsx ของแต่ละโปรเจกต์ไม่เหมือนกัน 100%
 * สคริปต์นี้จะแทรก helper ให้ก่อน และสร้าง TODO marker ชัด ๆ
 * ส่วนการผูก state/fetch ต้องดูโค้ดจริงอีกที
 */

const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'app', 'page.tsx');
if (!fs.existsSync(pagePath)) {
  console.error('ไม่พบ app/page.tsx');
  process.exit(1);
}

let src = fs.readFileSync(pagePath, 'utf8');
const backupPath = pagePath + '.bak-v11-15-4';

if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, src);
  console.log('Backup:', backupPath);
}

const helper = `
/* === Nong Nam v11.15.4 Time Payload Helper === */
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
/* === End Nong Nam v11.15.4 Time Payload Helper === */
`;

if (!src.includes('function getClientTimePayload()')) {
  const useClientIdx = src.indexOf("'use client'");
  const useClientIdx2 = src.indexOf('"use client"');
  const insertAfter = useClientIdx >= 0 ? src.indexOf('\n', useClientIdx) + 1 : (useClientIdx2 >= 0 ? src.indexOf('\n', useClientIdx2) + 1 : 0);
  src = src.slice(0, insertAfter) + '\n' + helper + '\n' + src.slice(insertAfter);
  console.log('Added getClientTimePayload()');
} else {
  console.log('getClientTimePayload() already exists');
}

const todo = `
{/* 
  TODO Nong Nam v11.15.4:
  1) เพิ่ม state:
     const [visibleStatus, setVisibleStatus] = useState<any>(mem?.visibleStatus || null);

  2) ตอนเปิดหน้า ให้เรียก /api/status:
     await fetch('/api/status', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         memory: mem,
         recent: chat,
         companionDNA,
         clientNonce: String(Date.now()) + Math.random().toString(36).slice(2),
         ...getClientTimePayload(),
       }),
     })

  3) ใน fetch('/api/chat') ทุกครั้ง ต้องใส่:
     ...getClientTimePayload()

  4) ใต้ชื่อน้องน้ำ ให้แสดง:
     {visibleStatus ? (
       <div className={\`nn-status-chip \${visibleStatus.chipClass || ''}\`}>
         {visibleStatus.displayText}
       </div>
     ) : (
       <div className="online-status">● พร้อมคุยกับพี่แล้ว</div>
     )}
*/} 
`;

if (!src.includes('TODO Nong Nam v11.15.4')) {
  const returnIdx = src.lastIndexOf('return (');
  if (returnIdx >= 0) {
    const insertAt = src.indexOf('\n', returnIdx) + 1;
    src = src.slice(0, insertAt) + todo + src.slice(insertAt);
    console.log('Added TODO marker near return');
  } else {
    src += '\n' + todo;
    console.log('Added TODO marker at end');
  }
}

fs.writeFileSync(pagePath, src);
console.log('Done. Open app/page.tsx and finish TODO section if needed.');
