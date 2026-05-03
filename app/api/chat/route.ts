import { NextRequest, NextResponse } from "next/server";
import { buildDNA } from "../../../lib/humanSignature/dnaBuilder";
import { buildRollContext, makeSeed, seededRandom, rollTree } from "../../../lib/humanSignature/engine";
import { routeToTree } from "../../../lib/humanSignature/categoryRouter";
import { buildHumanPrompt } from "../../../lib/humanSignature/promptBuilder";
import type { CompanionMemory } from "../../../lib/humanSignature/types";
import {
  buildHumanCore,
  buildNoRobotSystem,
  sanitizeHumanReply,
} from "../../../lib/nongnamHumanCore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClientPayload = {
  message: string;
  memory?: {
    gender?: "male" | "female";
    nongnamName?: string;
    userCallName?: string;
    relationshipMode?: string;
    personalityStyle?: string;
    sulkyLevel?: string;
    jealousLevel?: string;
    affectionStyle?: string;
    affectionScore?: number;
    facts?: Array<{ key: string; value: string }>;
    schedules?: Array<{ type: string; label: string; time: string }>;
    recentMentions?: string[];
    socialBattery?: number;
  };
  recent?: Array<{ role: string; text: string }>;
  clientTimestamp?: string;
  clientNonce?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ClientPayload;
    const message = String(body.message || "").trim();

    if (!message) {
      return NextResponse.json({
        reply: "อืม... พี่ยังไม่ได้พิมพ์อะไรเลยนะ",
        source: "validation-error",
      });
    }

    const m = body.memory || {};
    const core = buildHumanCore(message, m);

    // High-risk intents are answered locally so they never become robotic.
    if (core.forceLocal) {
      return NextResponse.json({
        reply: core.reply,
        source: "v11-human-local",
        intent: core.intent,
        world: core.world,
        mustAnswer: core.mustAnswer,
      });
    }

    const dna = buildDNA({
      userCallName: m.userCallName || "พี่",
      nongnamName: m.nongnamName || "น้องน้ำ",
      relationshipMode: m.relationshipMode || "แฟน/คนรัก",
      personalityStyle: m.personalityStyle,
      sulkyLevel: m.sulkyLevel,
      jealousLevel: m.jealousLevel,
      affectionStyle: m.affectionStyle,
      gender: m.gender,
    });

    const memory: CompanionMemory = {
      lastMood: undefined,
      lastTopic: undefined,
      socialBattery: m.socialBattery ?? 70,
      affectionScore: m.affectionScore ?? dna.baseAffection,
      recentMentions: m.recentMentions || [],
      facts: m.facts || [],
      schedules: m.schedules || [],
    };

    const timestamp = body.clientTimestamp ? new Date(body.clientTimestamp) : new Date();
    const ctx = buildRollContext(timestamp, dna, memory, message);
    const routed = routeToTree(ctx);

    const seed = makeSeed([
      dna.fingerprint,
      timestamp.toISOString(),
      body.clientNonce || Math.random().toString(36),
      message,
      memory.affectionScore,
      memory.socialBattery,
      ctx.hour,
      ctx.dayOfWeek,
    ]);
    const random = seededRandom(seed);
    const roll = rollTree(routed.layers, ctx, random);

    const treePrompt = buildHumanPrompt({
      treeName: routed.name,
      roll,
      ctx,
      dna,
      memory,
    });

    const systemPrompt = buildNoRobotSystem(m, core, treePrompt);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: core.reply,
        source: "v11-human-no-api-key",
        intent: core.intent,
        world: core.world,
      });
    }

    const recentMsgs = Array.isArray(body.recent)
      ? body.recent
          .slice(-6)
          .filter(r => !/(น้ำฟังอยู่|พี่พูดต่อได้เลย|มีอะไรให้ช่วย|รับทราบ|ยินดีช่วย|AI|prompt|มโน)/i.test(String(r.text || "")))
          .map(r => ({
            role: r.role === "assistant" ? "assistant" : "user",
            content: String(r.text || "").slice(0, 500),
          }))
      : [];

    const lengthLimit = roll.length === "very_short" ? 70
      : roll.length === "short" ? 130
      : roll.length === "medium" ? 220
      : 330;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMsgs,
          { role: "user", content: message },
        ],
        temperature: 0.88,
        max_tokens: lengthLimit,
        presence_penalty: 0.55,
        frequency_penalty: 0.85,
      }),
      cache: "no-store",
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json({
        reply: core.reply,
        source: "v11-human-openai-fallback",
        error: data?.error?.message,
        intent: core.intent,
        world: core.world,
      });
    }

    const raw = data?.choices?.[0]?.message?.content?.trim() || "";
    const reply = sanitizeHumanReply(raw, core.reply, core.banned);

    return NextResponse.json({
      reply,
      source: "v11-human-core",
      intent: core.intent,
      world: core.world,
      mustAnswer: core.mustAnswer,
      treeName: routed.name,
      seed: seed.toString(36),
      usage: data?.usage,
    });
  } catch (err: any) {
    return NextResponse.json({
      reply: "เอ้า… สะดุดอีกแล้ว พี่พิมพ์มาใหม่ที น้ำตั้งหลักแป๊บนึง",
      source: "v11-human-server-error",
      error: err?.message,
    });
  }
}
