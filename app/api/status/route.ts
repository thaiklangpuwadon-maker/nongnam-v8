import { NextRequest, NextResponse } from 'next/server'
import {
  ensureCompanionDNALite,
  type CompanionDNALite,
} from '../../../lib/companionDNALite'
import { buildDeepHumanLayerLite } from '../../../lib/humanLayerTreeLite'
import { buildHumanSubBranchLite } from '../../../lib/humanSubBranchLite'
import { buildHumanMicroBranchLite } from '../../../lib/humanMicroBranchLite'
import { buildHumanLifeSceneBranchLite } from '../../../lib/humanLifeSceneBranchLite'
import { buildHumanBodyAutonomyBranchLite } from '../../../lib/humanBodyAutonomyBranchLite'
import { buildHumanCoreDesireKilesaBranchLite } from '../../../lib/humanCoreDesireKilesaBranchLite'
import { buildVisibleStatusLite } from '../../../lib/visibleStatusBranchLite'
import {
  buildTimeTruthLite,
  timeTruthToBranchDate,
} from '../../../lib/timeTruthBranchLite'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ChatItem = { role: 'user' | 'assistant'; text: string; ts?: number }

type Body = {
  memory?: any
  recent?: ChatItem[]
  companionDNA?: CompanionDNALite | null
  clientNonce?: string
  clientNowISO?: string
  clientTimeZone?: string
  clientUtcOffsetMinutes?: number
  clientHour?: number
  clientMinute?: number
  clientDayOfWeek?: number
  clientYear?: number
  clientMonth?: number
  clientDate?: number
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

function recentText(recent: ChatItem[] = []) {
  return recent
    .slice(-4)
    .map(m => `${m.role}:${m.text}`)
    .join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body
    const memory = body.memory || {}
    const recent = Array.isArray(body.recent) ? body.recent : []
    const statusMessage = '__open_chat_status_check__'

    const dna = ensureCompanionDNALite({
      existingDNA: body.companionDNA || memory.companionDNA || null,
      userId: memory.userId || memory.userName || memory.userCallName || body.clientNonce || 'local-user',
      userName: memory.userName || memory.userCallName,
      nongnamName: memory.nongnamName || 'น้องน้ำ',
      gender: memory.nongnamGender || 'female',
      age: memory.nongnamAge,
      preferredPersonality: memory.preferredPersonality,
    })

    const timeTruth = buildTimeTruthLite({
      clientNowISO: body.clientNowISO,
      clientTimeZone: body.clientTimeZone,
      clientUtcOffsetMinutes: body.clientUtcOffsetMinutes,
      clientHour: body.clientHour,
      clientMinute: body.clientMinute,
      clientDayOfWeek: body.clientDayOfWeek,
      clientYear: body.clientYear,
      clientMonth: body.clientMonth,
      clientDate: body.clientDate,
    })

    const truthNow = timeTruthToBranchDate(timeTruth)
    const recentString = recentText(recent)

    const layer = buildDeepHumanLayerLite({
      dna,
      message: statusMessage,
      recentText: recentString,
      adultMode: memory?.adultMode === true,
      now: truthNow,
    })

    const sub = buildHumanSubBranchLite({
      dna,
      layer,
      message: statusMessage,
      recentText: recentString,
    })

    const micro = buildHumanMicroBranchLite({
      dna,
      layer,
      sub,
      message: statusMessage,
      recentText: recentString,
    })

    const life = buildHumanLifeSceneBranchLite({
      dna,
      layer,
      sub,
      micro,
      message: statusMessage,
      recentText: recentString,
      now: truthNow,
    })

    const bodyAuto = buildHumanBodyAutonomyBranchLite({
      dna,
      layer,
      sub,
      micro,
      life,
      message: statusMessage,
      recentText: recentString,
      now: truthNow,
    })

    const core = buildHumanCoreDesireKilesaBranchLite({
      dna,
      layer,
      sub,
      micro,
      life,
      bodyAuto,
      message: statusMessage,
      recentText: recentString,
      now: truthNow,
    })

    const visibleStatus = buildVisibleStatusLite({
      dna,
      layer,
      sub,
      micro,
      life,
      bodyAuto,
      core,
      message: statusMessage,
      now: truthNow,
    })

    return json({
      ok: true,
      companionDNA: dna,
      timeTruth,
      visibleStatus,
      updatedMemory: { ...memory, companionDNA: dna, visibleStatus, timeTruth },
      source: 'open-status-v11.15.2b',
    })
  } catch (error) {
    return json({
      ok: false,
      visibleStatus: {
        emoji: '💭',
        label: 'ตั้งหลักอยู่',
        detail: 'สถานะยังโหลดไม่ครบ',
        displayText: '💭 ตั้งหลักอยู่ · สถานะยังโหลดไม่ครบ',
        availability: 'soft_limited',
      },
      error: error instanceof Error ? error.message : 'unknown_error',
      source: 'open-status-error',
    }, 200)
  }
}
