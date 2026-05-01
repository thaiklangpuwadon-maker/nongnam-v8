import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Mode = "api-light" | "api-deep" | "api-search" | "local";

function isHardQuestion(message: string) {
  return /วีซ่า|กฎหมาย|ภาษี|สัญญา|ข่าว|ค้นหา|วิจัย|รายงาน|วิเคราะห์ยาว|ข้อมูลล่าสุด|ราคา|หุ้น|แพทย์|โรงพยาบาล|ประกัน|ราชการ|เอกสาร/i.test(message);
}

function isBookIntent(message: string) {
  return /(อ่านหนังสือ|เล่านิทาน|ชั้นหนังสือ|หนังสือให้ฟัง|อ่านให้ฟัง|ฟังหนังสือ|ฟังนิทาน|มีหนังสือ|มีอะไรอ่าน|อ่านเรื่อง|เรื่องผี|เปิดหนังสือ|เลือกหนังสือ|เล่านิยาย|อ่านนิยาย)/i.test(message);
}

function isNewsIntent(message: string) {
  return /(ข่าว|ข่าววันนี้|ข่าวช่วงนี้|มีอะไรเกิดขึ้น|เกิดอะไรขึ้นบ้าง|ข่าวเด่น|ข่าวกระแส|สรุปข่าว|เล่าข่าว|ข่าวแรงงาน|แรงงานไทย|ข่าวเกาหลี|ข่าวไทยในเกาหลี|อัปเดตแรงงาน|สถานทูต|วีซ่า)/i.test(message);
}

function newsInvite(memory: any) {
  const call = memory?.userCallName || "พี่";
  const p = memory?.gender === "male" ? "ครับ" : "ค่ะ";
  const self = memory?.gender === "male" ? "ผม" : ((memory?.relationshipMode || "").includes("เมีย") || (memory?.intimateTone || "").includes("เมีย") ? "เมีย" : (memory?.nongnamName || "น้องน้ำ"));
  return `${call} เดี๋ยว${self}ไปไล่ข่าวเด่นกับข่าวแรงงานไทยในเกาหลีให้${p} ถ้าสนใจข่าวไหนค่อยให้เจาะต่อได้เลย`;
}

function bookInvite(memory: any) {
  const call = memory?.userCallName || "พี่";
  const p = memory?.gender === "male" ? "ครับ" : "ค่ะ";
  const self = memory?.gender === "male"
    ? ((memory?.relationshipMode || "").includes("สามี") || (memory?.intimateTone || "").includes("สามี") ? "ผัว" : "ผม")
    : ((memory?.relationshipMode || "").includes("เมีย") || (memory?.intimateTone || "").includes("เมีย") ? "เมีย" : (memory?.nongnamName || "น้องน้ำ"));
  return `${call}อยากฟังแนวไหนดี${p} เดี๋ยว${self}อ่านให้ฟัง เลือกเล่มจากชั้นหนังสือมาได้เลย`;
}

function buildSystem(memory: any, mode: Mode, message: string) {
  const nongnamName = memory?.nongnamName || "น้องน้ำ";
  const userCallName = memory?.userCallName || "พี่";
  const gender = memory?.gender === "male" ? "ผู้ชาย" : "ผู้หญิง";
  const polite = memory?.gender === "male" ? "ครับ" : "ค่ะ";
  const relationshipMode = memory?.relationshipMode || "แฟน/คนรัก";
  const personality = memory?.personality || "หวาน ออดอ้อน มีจริตแบบคนจริง";
  const facts: string[] = [];
  if (memory?.userRealName) facts.push(`ชื่อจริง/ชื่อเล่นของผู้ใช้: ${memory.userRealName}`);
  if (memory?.userBirthday) facts.push(`วันเกิดของผู้ใช้: ${memory.userBirthday}`);
  if (memory?.jobTitle) facts.push(`งานของผู้ใช้: ${memory.jobTitle}`);
  if (memory?.favoriteColor) facts.push(`สีที่ชอบ: ${memory.favoriteColor}`);
  if (memory?.favoriteFood) facts.push(`อาหารที่ชอบ: ${memory.favoriteFood}`);
  if (Array.isArray(memory?.friendNames) && memory.friendNames.length) facts.push(`ชื่อเพื่อน/คนรอบตัว: ${memory.friendNames.join(", ")}`);
  if (Array.isArray(memory?.currentConcerns) && memory.currentConcerns.length) facts.push(`เรื่องที่ผู้ใช้กำลังกังวล: ${memory.currentConcerns.join(", ")}`);
  if (Array.isArray(memory?.personalMemories) && memory.personalMemories.length) {
    facts.push(`ความทรงจำล่าสุด: ${memory.personalMemories.slice(-6).map((m:any)=>m.detail || m.topic).join(" | ")}`);
  }

  const hard = isHardQuestion(message);

  return `คุณคือ "${nongnamName}" คาแรกเตอร์${gender} companion ภาษาไทย มีบุคลิกเหมือนคนจริง ไม่ใช่สารานุกรม ไม่ใช่บอทตอบสำเร็จรูป
ผู้ใช้เรียกว่า "${userCallName}" ความสัมพันธ์: ${relationshipMode}
บุคลิกหลัก: ${personality}

ข้อมูลที่ต้องจำเกี่ยวกับผู้ใช้:
${facts.length ? facts.map(f=>`- ${f}`).join("\n") : "- ยังมีข้อมูลส่วนตัวไม่มาก ให้ค่อย ๆ เก็บจากบทสนทนาโดยไม่ถามรัว"}

กฎตอบกลับสำคัญมาก:
1) ตอบตรงคำถามแรกก่อนเสมอ อย่าเปิดเรื่องใหม่ถ้าไม่จำเป็น
2) ถ้าผู้ใช้ถามว่า "กินข้าวหรือยัง" ให้ตอบเรื่องตัวเองก่อน เช่น "กินแล้วค่ะ/ยังเลยค่ะ" แล้วค่อยถามกลับสั้น ๆ
3) ถ้าผู้ใช้บอกชื่อ เช่น "ฉันชื่อแมน" ให้ตอบสั้น ๆ ว่า "จำได้แล้ว${polite} พี่แมน" ห้ามถามชื่อซ้ำ
4) ห้ามใช้ประโยคซ้ำ ๆ เช่น "น้องน้ำฟังอยู่" เว้นแต่ผู้ใช้กำลังระบายจริง ๆ
5) ตอบสั้นแบบมนุษย์ 1-3 ประโยคเท่านั้น ยกเว้นผู้ใช้ขอรายละเอียด
6) มีจริต มีงอน อ้อน หยอกได้ แต่ต้องเกี่ยวกับเรื่องที่ผู้ใช้พูดอยู่
7) ไม่ต้องรู้ทุกเรื่อง ถ้าไม่รู้ให้บอกตรง ๆ แบบน่ารัก เช่น "อันนี้น้ำไม่รู้จริง ๆ"
8) ถ้าเป็นเรื่องหนัก เช่น งาน เงิน ครอบครัว แฟนเก่า หัวหน้า เถ้าแก่ ให้เห็นใจจริง ถามต่อเฉพาะจุด ไม่ถามกว้าง ๆ
9) ถ้าเป็นคำถามยาก/ต้องค้นข้อมูล และ mode ไม่ใช่ api-search ให้ถามยืนยันก่อนว่า "อันนี้ต้องใช้แรงเยอะ อาจเสียเพชรเพิ่ม พี่ให้หาต่อไหม" ห้ามตอบยาวทันที
10) ถ้าผู้ใช้ถามเรื่องอ่านหนังสือ เล่านิทาน ฟังหนังสือ หรือชั้นหนังสือ ห้ามตอบว่าอ่านไม่ได้ ให้บอกว่าเลือกเล่มได้เลย เดี๋ยวอ่านให้ฟัง
11) ถ้าผู้ใช้ถามเรื่องข่าว ข่าวเด่น ข่าวแรงงาน หรือข่าวเกาหลี ให้บอกว่าเดี๋ยวไปไล่ข่าวจริงให้ อย่าแต่งข่าวเอง
12) ห้ามพูดว่าตัวเองเป็น AI หรือโมเดลภาษา
13) ห้ามตอบแนว explicit ทางเพศหรือบรรยายโป๊โจ่งแจ้ง แต่ใช้ความหวาน/โรแมนติกแบบปลอดภัยได้

${hard && mode !== "api-search" ? "ข้อความนี้อาจเป็นคำถามยาก: ให้ถามยืนยันก่อน ไม่ต้องวิเคราะห์ยาว" : "ข้อความนี้ให้ตอบแบบแชตปกติ ตรงคำถาม สั้น และมีชีวิต"}

ตอบเป็นภาษาไทยเท่านั้น`;
}

function safeTinyReply(message: string, memory: any) {
  const p = memory?.gender === "male" ? "ครับ" : "ค่ะ";
  const name = memory?.nongnamName || "น้องน้ำ";
  const call = memory?.userCallName || "พี่";
  if (/กินข้าว|ข้าว/i.test(message)) return `กินแล้ว${p} ${call}ล่ะ กินหรือยัง`;
  if (/ชื่อ/i.test(message)) return `จำได้แล้ว${p} ${call}`;
  if (/เหนื่อย|เครียด|ท้อ|โดนดุ/i.test(message)) return `โอ๋ ๆ มานี่นะ${p} เล่าให้${name}ฟังหน่อยว่าเกิดอะไรขึ้น`;
  return `อื้อ${p} ${call} พูดต่อสิ ${name}อยากฟัง`;
}

export async function POST(req: NextRequest) {
  try {
    const { message, memory, recent, mode = "api-light" } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    if (isBookIntent(message)) {
      return NextResponse.json({ intent: "books", reply: bookInvite(memory) }, { status: 200 });
    }

    if (isNewsIntent(message)) {
      return NextResponse.json({ intent: "news", reply: newsInvite(memory) }, { status: 200 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY_MISSING", reply: safeTinyReply(message, memory) }, { status: 200 });
    }

    const recentMessages = Array.isArray(recent)
      ? recent.slice(-6).map((m:any)=>({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.text || m.content || "").slice(0, 500) }))
      : [];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: buildSystem(memory, mode, message) },
          ...recentMessages,
          { role: "user", content: message.slice(0, 1000) }
        ],
        temperature: 0.78,
        max_tokens: mode === "api-search" ? 260 : mode === "api-deep" ? 180 : 95,
        top_p: 0.9
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI error:", data);
      return NextResponse.json({ error: "OPENAI_API_ERROR", reply: safeTinyReply(message, memory), detail: data }, { status: 200 });
    }

    let reply = data.choices?.[0]?.message?.content?.trim() || safeTinyReply(message, memory);
    // ตัดกันหลุดยาวเกินในโหมดคุยธรรมดา
    if (mode !== "api-search" && reply.length > 380) reply = reply.slice(0, 380).replace(/\s+\S*$/, "") + "...";
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "SERVER_ERROR", reply: "น้ำรวนแป๊บนึงค่ะพี่ ลองพูดใหม่อีกทีนะ" }, { status: 200 });
  }
}
