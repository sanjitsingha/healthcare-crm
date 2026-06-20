import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAutomations, logAutomationRuns } from '@/lib/automations/engine'

// Server-side automation runner. Called by:
//   • client pages after a mutation (fire-and-forget) — see lib/automations/trigger.js
//   • server routes (public API, webhooks) which import runAutomations directly
//
// Body: { orgId, target, event, entityId, prev?, dryRun? }

const TABLE_FOR_TARGET = {
  lead: 'leads',
  patient: 'patients',
  appointment: 'appointments',
  consultation: 'consultations',
  task: 'tasks',
}

export async function POST(req) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
    }

    let body = {}
    try { body = await req.json() } catch { /* empty */ }
    const { orgId, target, event, entityId, prev = null, dryRun = false } = body || {}

    if (!orgId || !target || !event || !entityId) {
      return NextResponse.json({ ok: false, error: 'Missing orgId, target, event, or entityId' }, { status: 400 })
    }
    const table = TABLE_FOR_TARGET[target]
    if (!table) {
      return NextResponse.json({ ok: false, error: `Unknown target "${target}"` }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Load org (rules + settings) and the authoritative, fresh entity.
    const [{ data: org, error: orgErr }, { data: entity, error: entErr }] = await Promise.all([
      supabase.from('organizations').select('id, settings').eq('id', orgId).maybeSingle(),
      supabase.from(table).select('*').eq('id', entityId).maybeSingle(),
    ])
    if (orgErr) return NextResponse.json({ ok: false, error: orgErr.message }, { status: 500 })
    if (!org) return NextResponse.json({ ok: false, error: 'Organization not found' }, { status: 404 })
    if (entErr) return NextResponse.json({ ok: false, error: entErr.message }, { status: 500 })
    if (!entity) return NextResponse.json({ ok: false, error: 'Entity not found' }, { status: 404 })

    const outcome = await runAutomations({ supabase, org, target, event, entity, prev, dryRun })

    // Persist a log row per matched rule (skip for dry runs).
    if (!dryRun) {
      await logAutomationRuns(supabase, { orgId, entityType: target, entityId, outcome })
    }

    return NextResponse.json({ ok: true, ...outcome })
  } catch (err) {
    console.error('[automations/run] unexpected error:', err.message)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
